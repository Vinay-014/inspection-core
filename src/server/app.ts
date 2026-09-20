import dns from 'dns';
try {
  dns.setDefaultResultOrder('verbatim');
} catch {
  // Ignore
}
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { query } from '../lib/db';
import {
  listTemplates,
  getTemplateWithHierarchy,
  saveImportedTemplate,
  duplicateTemplateTransaction
} from '../lib/importer/service';
import { validateSpreadsheetBuffer, validateParsedTemplate } from '../lib/importer/spectora/validation';
import { parseSpectoraWorkbook } from '../lib/importer/spectora/parser';
import { sanitizeAndAnalyzeHtml } from '../lib/importer/spectora/html';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

export const app = express();

// Security headers & content protections
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Enterprise UUID route parameter validation
app.param('id', (_req, res, next, id) => {
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: `Invalid UUID identifier format: "${id}"` });
  }
  next();
});

// --- API ROUTES ---

// Health Check
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const dbCheck = await query('SELECT 1 as connected');
    res.json({
      status: 'ok',
      service: 'InspectionCore API',
      database: dbCheck.rows.length > 0 ? 'connected' : 'degraded',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// List all templates
app.get('/api/templates', async (_req: Request, res: Response) => {
  try {
    const templates = await listTemplates();
    res.json({ templates });
  } catch (err: any) {
    console.error('Failed to list templates:', err);
    res.status(500).json({ error: 'Failed to retrieve templates' });
  }
});

// Get template details with full hierarchy
app.get('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const template = await getTemplateWithHierarchy(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ template });
  } catch (err: any) {
    console.error('Failed to get template:', err);
    res.status(500).json({ error: 'Failed to retrieve template details' });
  }
});

// Download committed fixture
app.get('/api/fixture/download', (_req: Request, res: Response) => {
  const fixturePath = path.join(process.cwd(), 'fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx');
  if (!fs.existsSync(fixturePath)) {
    return res.status(404).json({ error: 'Fixture file not found on server' });
  }
  res.download(fixturePath, 'InterNACHI-Residential-HTML-Text.xlsx');
});

// Preview spreadsheet import before committing
app.post('/api/templates/preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let buffer: Buffer | null = null;
    let filename = 'Uploaded-Template.xlsx';

    if (req.file) {
      buffer = req.file.buffer;
      filename = req.file.originalname;
    } else if (req.body.fileBase64) {
      buffer = Buffer.from(req.body.fileBase64, 'base64');
      if (req.body.filename) filename = req.body.filename;
    }

    if (!buffer) {
      return res.status(400).json({
        error: 'No file provided. Please upload a .xlsx spreadsheet file.'
      });
    }

    // 1. Validate
    const validation = validateSpreadsheetBuffer(buffer);
    if (!validation.isValid) {
      return res.status(422).json({
        error: 'Invalid spreadsheet file',
        details: validation.errors,
        warnings: validation.warnings
      });
    }

    // 2. Parse
    const parsed = parseSpectoraWorkbook(validation.workbook!, {
      filename,
      templateNameOverride: req.body.nameOverride
    });

    res.json({
      preview: parsed,
      validation: {
        isValid: true,
        warnings: validation.warnings,
        detectedHeaders: validation.detectedHeaders
      }
    });
  } catch (err: any) {
    console.error('Preview failed:', err);
    res.status(500).json({
      error: err.message || 'Failed to process spreadsheet preview'
    });
  }
});

// Commit template import to database
app.post('/api/templates/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let parsedData = req.body.parsed;

    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch {
        parsedData = null;
      }
    }

    // If raw file uploaded directly without preview
    if (!parsedData && (req.file || req.body.fileBase64)) {
      let buffer = req.file ? req.file.buffer : Buffer.from(req.body.fileBase64, 'base64');
      const filename = req.file ? req.file.originalname : (req.body.filename || 'Template.xlsx');

      const validation = validateSpreadsheetBuffer(buffer);
      if (!validation.isValid) {
        return res.status(422).json({ error: 'Validation failed', details: validation.errors });
      }
      parsedData = parseSpectoraWorkbook(validation.workbook!, {
        filename,
        templateNameOverride: req.body.nameOverride
      });
    }

    if (!parsedData) {
      return res.status(400).json({ error: 'Missing parsed template data to commit.' });
    }

    // Strictly validate parsed hierarchy structure before persistence
    const structVal = validateParsedTemplate(parsedData);
    if (!structVal.isValid) {
      return res.status(422).json({
        error: 'Template structure validation failed before persistence',
        details: structVal.errors
      });
    }

    const template = await saveImportedTemplate(parsedData);
    res.status(201).json({ template, message: 'Template successfully imported and saved.' });
  } catch (err: any) {
    console.error('Import commit failed:', err);
    res.status(500).json({ error: err.message || 'Failed to commit template to database' });
  }
});

// Duplicate a template atomically
app.post('/api/templates/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const customName = req.body.name;
    const newTemplate = await duplicateTemplateTransaction(templateId, customName);
    res.status(201).json({ template: newTemplate, message: 'Template duplicated successfully' });
  } catch (err: any) {
    console.error('Duplication failed:', err);
    res.status(500).json({ error: err.message || 'Failed to duplicate template' });
  }
});

// Create a new blank or custom template
app.post('/api/templates', async (req: Request, res: Response) => {
  try {
    const { name, description, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const result = await query(
      `INSERT INTO templates (name, description, status, source_type, preservation_score)
       VALUES ($1, $2, $3, 'custom', '100.0') RETURNING *`,
      [name.trim(), description?.trim() || null, status || 'active']
    );

    res.status(201).json({ template: result.rows[0], message: 'Template created successfully' });
  } catch (err: any) {
    console.error('Create template failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create template' });
  }
});

// Update Template info
app.patch('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, status } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description ? description.trim() : null);
    }
    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = now()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE templates SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: result.rows[0] });
  } catch (err: any) {
    console.error('Template update failed:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete Template
app.delete('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `DELETE FROM templates WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ success: true, message: 'Template deleted' });
  } catch (err: any) {
    console.error('Delete template failed:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Update Section
app.patch('/api/sections/:id', async (req: Request, res: Response) => {
  try {
    const { name, position } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (position !== undefined) {
      updates.push(`position = $${idx++}`);
      values.push(position);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = now()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE sections SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Section not found' });
    res.json({ section: result.rows[0] });
  } catch (err: any) {
    console.error('Update section failed:', err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Add Section
app.post('/api/sections', async (req: Request, res: Response) => {
  try {
    const { template_id, name, position } = req.body;
    if (!template_id || !name) {
      return res.status(400).json({ error: 'template_id and name are required' });
    }

    let pos = position;
    if (pos === undefined) {
      const countRes = await query(
        `SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM sections WHERE template_id = $1`,
        [template_id]
      );
      pos = countRes.rows[0].next_pos;
    }

    const result = await query(
      `INSERT INTO sections (template_id, name, position) VALUES ($1, $2, $3) RETURNING *`,
      [template_id, name.trim(), pos]
    );

    // Update total_sections on template
    await query(
      `UPDATE templates SET total_sections = (SELECT COUNT(*) FROM sections WHERE template_id = $1), updated_at = now() WHERE id = $1`,
      [template_id]
    );

    res.status(201).json({ section: result.rows[0] });
  } catch (err: any) {
    console.error('Create section failed:', err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// Delete Section
app.delete('/api/sections/:id', async (req: Request, res: Response) => {
  try {
    const secRes = await query(`DELETE FROM sections WHERE id = $1 RETURNING template_id`, [req.params.id]);
    if (secRes.rows.length === 0) return res.status(404).json({ error: 'Section not found' });
    const tplId = secRes.rows[0].template_id;

    // Recalculate totals
    await query(
      `UPDATE templates SET 
        total_sections = (SELECT COUNT(*) FROM sections WHERE template_id = $1),
        total_items = (SELECT COUNT(i.*) FROM items i JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        total_comments = (SELECT COUNT(c.*) FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        updated_at = now()
      WHERE id = $1`,
      [tplId]
    );

    res.json({ success: true, message: 'Section deleted' });
  } catch (err: any) {
    console.error('Delete section failed:', err);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// Update Item
app.patch('/api/items/:id', async (req: Request, res: Response) => {
  try {
    const { name, position } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (position !== undefined) {
      updates.push(`position = $${idx++}`);
      values.push(position);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = now()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE items SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: result.rows[0] });
  } catch (err: any) {
    console.error('Update item failed:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Add Item
app.post('/api/items', async (req: Request, res: Response) => {
  try {
    const { section_id, name, position } = req.body;
    if (!section_id || !name) {
      return res.status(400).json({ error: 'section_id and name are required' });
    }

    let pos = position;
    if (pos === undefined) {
      const countRes = await query(
        `SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM items WHERE section_id = $1`,
        [section_id]
      );
      pos = countRes.rows[0].next_pos;
    }

    const result = await query(
      `INSERT INTO items (section_id, name, position) VALUES ($1, $2, $3) RETURNING *`,
      [section_id, name.trim(), pos]
    );

    // Update template total_items count
    await query(
      `UPDATE templates SET 
        total_items = (SELECT COUNT(i.*) FROM items i JOIN sections s ON i.section_id = s.id WHERE s.template_id = templates.id),
        updated_at = now()
      WHERE id = (SELECT template_id FROM sections WHERE id = $1)`,
      [section_id]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (err: any) {
    console.error('Create item failed:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Delete Item
app.delete('/api/items/:id', async (req: Request, res: Response) => {
  try {
    const itemRes = await query(
      `SELECT s.template_id FROM items i JOIN sections s ON i.section_id = s.id WHERE i.id = $1`,
      [req.params.id]
    );
    if (itemRes.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    const tplId = itemRes.rows[0].template_id;

    await query(`DELETE FROM items WHERE id = $1`, [req.params.id]);

    await query(
      `UPDATE templates SET 
        total_items = (SELECT COUNT(i.*) FROM items i JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        total_comments = (SELECT COUNT(c.*) FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        updated_at = now()
      WHERE id = $1`,
      [tplId]
    );

    res.json({ success: true, message: 'Item deleted' });
  } catch (err: any) {
    console.error('Delete item failed:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Update Comment
app.patch('/api/comments/:id', async (req: Request, res: Response) => {
  try {
    const { content_html, position } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (content_html !== undefined) {
      const analyzed = sanitizeAndAnalyzeHtml(content_html);
      updates.push(`content_html = $${idx++}`);
      values.push(analyzed.sanitizedHtml);

      updates.push(`has_unsupported_tags = $${idx++}`);
      values.push(analyzed.hasUnsupportedTags);

      updates.push(`unsupported_tags = $${idx++}`);
      values.push(analyzed.unsupportedTags);
    }

    if (position !== undefined) {
      updates.push(`position = $${idx++}`);
      values.push(position);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = now()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE comments SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json({ comment: result.rows[0] });
  } catch (err: any) {
    console.error('Update comment failed:', err);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Add Comment
app.post('/api/comments', async (req: Request, res: Response) => {
  try {
    const { item_id, content_html, position } = req.body;
    if (!item_id || content_html === undefined) {
      return res.status(400).json({ error: 'item_id and content_html are required' });
    }

    const analyzed = sanitizeAndAnalyzeHtml(content_html);

    let pos = position;
    if (pos === undefined) {
      const countRes = await query(
        `SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM comments WHERE item_id = $1`,
        [item_id]
      );
      pos = countRes.rows[0].next_pos;
    }

    const result = await query(
      `INSERT INTO comments (
        item_id, content_html, source_content_html, position,
        has_unsupported_tags, unsupported_tags
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        item_id,
        analyzed.sanitizedHtml,
        content_html,
        pos,
        analyzed.hasUnsupportedTags,
        analyzed.unsupportedTags
      ]
    );

    // Update total comments on template
    await query(
      `UPDATE templates SET 
        total_comments = (SELECT COUNT(c.*) FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE s.template_id = templates.id),
        updated_at = now()
      WHERE id = (SELECT s.template_id FROM items i JOIN sections s ON i.section_id = s.id WHERE i.id = $1)`,
      [item_id]
    );

    res.status(201).json({ comment: result.rows[0] });
  } catch (err: any) {
    console.error('Create comment failed:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete Comment
app.delete('/api/comments/:id', async (req: Request, res: Response) => {
  try {
    const cmtRes = await query(
      `SELECT s.template_id FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE c.id = $1`,
      [req.params.id]
    );
    if (cmtRes.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    const tplId = cmtRes.rows[0].template_id;

    await query(`DELETE FROM comments WHERE id = $1`, [req.params.id]);

    await query(
      `UPDATE templates SET 
        total_comments = (SELECT COUNT(c.*) FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        updated_at = now()
      WHERE id = $1`,
      [tplId]
    );

    res.json({ success: true, message: 'Comment deleted' });
  } catch (err: any) {
    console.error('Delete comment failed:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Resolve or dismiss Import Issue
app.patch('/api/issues/:id', async (req: Request, res: Response) => {
  try {
    const { resolution_status } = req.body;
    if (!['UNRESOLVED', 'RESOLVED', 'DISMISSED'].includes(resolution_status)) {
      return res.status(400).json({ error: 'Invalid resolution_status' });
    }

    const result = await query(
      `UPDATE import_issues SET resolution_status = $1 WHERE id = $2 RETURNING *`,
      [resolution_status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json({ issue: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update issue status' });
  }
});

// Trigger Re-seed
app.post('/api/seed', async (_req: Request, res: Response) => {
  try {
    const fixturePath = path.join(process.cwd(), 'fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx');
    if (!fs.existsSync(fixturePath)) {
      return res.status(404).json({ error: 'Fixture file not found' });
    }
    const buffer = fs.readFileSync(fixturePath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const parsed = parseSpectoraWorkbook(wb, { filename: 'InterNACHI-Residential-HTML-Text.xlsx' });
    const template = await saveImportedTemplate(parsed);
    res.json({ message: 'Seeded successfully', template });
  } catch (err: any) {
    console.error('Seed endpoint failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Global API Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Uncaught Error]', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Maximum size is 30MB.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

export default app;
