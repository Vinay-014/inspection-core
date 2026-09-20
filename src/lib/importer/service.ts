import { randomUUID } from 'crypto';
import { withTransaction, query } from '../db';
import { ParsedTemplate, TemplateEntity } from './spectora/types';
import { validateParsedTemplate } from './spectora/validation';

/**
 * Executes high-performance chunked batch inserts, avoiding N+1 database roundtrips
 * while strictly adhering to PostgreSQL parameter count boundaries.
 */
async function executeBatchInsert(
  client: any,
  table: string,
  columns: string[],
  rows: any[][],
  batchSize = 100
): Promise<void> {
  if (rows.length === 0) return;
  const colCount = columns.length;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders: string[] = [];
    const values: any[] = [];

    batch.forEach((row, rIdx) => {
      const offset = rIdx * colCount;
      const ph = Array.from({ length: colCount }, (_, cIdx) => `$${offset + cIdx + 1}`);
      placeholders.push(`(${ph.join(', ')})`);
      values.push(...row);
    });

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`;
    await client.query(sql, values);
  }
}

export async function listTemplates(): Promise<TemplateEntity[]> {
  const result = await query<TemplateEntity>(
    `SELECT 
      id, name, description, source_type, source_filename, source_template_name,
      imported_at, created_at, updated_at, parent_template_id, copied_from_template_id,
      status, total_sections, total_items, total_comments, preservation_score
    FROM templates 
    ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function getTemplateWithHierarchy(templateId: string): Promise<TemplateEntity | null> {
  const tplRes = await query<TemplateEntity>(
    `SELECT * FROM templates WHERE id = $1`,
    [templateId]
  );
  if (tplRes.rows.length === 0) return null;
  const template = tplRes.rows[0];

  const secRes = await query(
    `SELECT * FROM sections WHERE template_id = $1 ORDER BY position ASC`,
    [templateId]
  );
  const sections = secRes.rows;

  if (sections.length > 0) {
    const secIds = sections.map(s => s.id);
    const itemRes = await query(
      `SELECT * FROM items WHERE section_id = ANY($1::uuid[]) ORDER BY position ASC`,
      [secIds]
    );
    const items = itemRes.rows;

    if (items.length > 0) {
      const itemIds = items.map(i => i.id);
      const commentRes = await query(
        `SELECT * FROM comments WHERE item_id = ANY($1::uuid[]) ORDER BY position ASC`,
        [itemIds]
      );
      const comments = commentRes.rows;

      // Group comments into items
      const commentMap = new Map<string, any[]>();
      for (const c of comments) {
        if (!commentMap.has(c.item_id)) commentMap.set(c.item_id, []);
        commentMap.get(c.item_id)!.push(c);
      }
      for (const item of items) {
        item.comments = commentMap.get(item.id) || [];
      }
    } else {
      for (const item of items) {
        item.comments = [];
      }
    }

    // Group items into sections
    const itemMap = new Map<string, any[]>();
    for (const item of items) {
      if (!itemMap.has(item.section_id)) itemMap.set(item.section_id, []);
      itemMap.get(item.section_id)!.push(item);
    }
    for (const sec of sections) {
      sec.items = itemMap.get(sec.id) || [];
    }
  }

  const issueRes = await query(
    `SELECT * FROM import_issues WHERE template_id = $1 ORDER BY created_at ASC`,
    [templateId]
  );

  template.sections = sections;
  template.issues = issueRes.rows;
  return template;
}

export async function saveImportedTemplate(
  parsed: ParsedTemplate,
  options?: { copiedFromTemplateId?: string; parentTemplateId?: string }
): Promise<TemplateEntity> {
  // Validate parsed template data structure strictly before database persistence
  const validation = validateParsedTemplate(parsed);
  if (!validation.isValid) {
    throw new Error(`Template validation failed before persistence: ${validation.errors.join('; ')}`);
  }

  return await withTransaction(async (client) => {
    const templateId = randomUUID();

    // 1. Insert Template
    const tplInsert = await client.query(
      `INSERT INTO templates (
        id, name, description, source_type, source_filename, source_template_name,
        parent_template_id, copied_from_template_id, status,
        total_sections, total_items, total_comments, preservation_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        templateId,
        parsed.name,
        parsed.description || null,
        parsed.source_type || 'spectora_xlsx',
        parsed.source_filename || null,
        parsed.source_template_name || parsed.name,
        options?.parentTemplateId || null,
        options?.copiedFromTemplateId || null,
        'active',
        parsed.metrics.sectionsCount,
        parsed.metrics.itemsCount,
        parsed.metrics.commentsCount,
        parsed.metrics.preservationScore
      ]
    );

    const template = tplInsert.rows[0];

    // 2. Prepare Section, Item, Comment batch payloads in memory
    const sectionRows: any[][] = [];
    const itemRows: any[][] = [];
    const commentRows: any[][] = [];

    for (const section of parsed.sections) {
      const sectionId = randomUUID();
      sectionRows.push([
        sectionId,
        templateId,
        section.name,
        section.position,
        section.source_identifier || null,
        section.source_row || null,
        section.source_name || section.name
      ]);

      for (const item of section.items) {
        const itemId = randomUUID();
        itemRows.push([
          itemId,
          sectionId,
          item.name,
          item.position,
          item.source_identifier || null,
          item.source_row || null,
          item.source_name || item.name
        ]);

        for (const comment of item.comments) {
          const commentId = randomUUID();
          commentRows.push([
            commentId,
            itemId,
            comment.content_html,
            comment.source_content_html,
            comment.position,
            comment.source_identifier || null,
            comment.source_row || null,
            comment.has_unsupported_tags,
            comment.unsupported_tags || []
          ]);
        }
      }
    }

    // Execute atomic batch inserts
    await executeBatchInsert(
      client,
      'sections',
      ['id', 'template_id', 'name', 'position', 'source_identifier', 'source_row', 'source_name'],
      sectionRows
    );

    await executeBatchInsert(
      client,
      'items',
      ['id', 'section_id', 'name', 'position', 'source_identifier', 'source_row', 'source_name'],
      itemRows
    );

    await executeBatchInsert(
      client,
      'comments',
      [
        'id',
        'item_id',
        'content_html',
        'source_content_html',
        'position',
        'source_identifier',
        'source_row',
        'has_unsupported_tags',
        'unsupported_tags'
      ],
      commentRows
    );

    // 3. Batch insert Import Issues
    if (parsed.issues && parsed.issues.length > 0) {
      const issueRows = parsed.issues.map((issue) => [
        randomUUID(),
        templateId,
        issue.severity,
        issue.category,
        issue.source_location || null,
        issue.source_row || null,
        issue.original_content || null,
        issue.message,
        issue.resolution_status || 'UNRESOLVED'
      ]);

      await executeBatchInsert(
        client,
        'import_issues',
        [
          'id',
          'template_id',
          'severity',
          'category',
          'source_location',
          'source_row',
          'original_content',
          'message',
          'resolution_status'
        ],
        issueRows
      );
    }

    return template;
  });
}

/**
 * Fast atomic duplicate template transaction with batch copying.
 * Guarantees completely independent database records with zero N+1 latency.
 */
export async function duplicateTemplateTransaction(
  sourceTemplateId: string,
  customName?: string
): Promise<TemplateEntity> {
  return await withTransaction(async (client) => {
    // 1. Fetch source template
    const sourceTplRes = await client.query(
      `SELECT * FROM templates WHERE id = $1`,
      [sourceTemplateId]
    );
    if (sourceTplRes.rows.length === 0) {
      throw new Error(`Source template "${sourceTemplateId}" does not exist.`);
    }
    const source = sourceTplRes.rows[0];
    const newTemplateId = randomUUID();
    const newName = customName || `${source.name} Copy`;

    // 2. Insert new template record
    const newTplRes = await client.query(
      `INSERT INTO templates (
        id, name, description, source_type, source_filename, source_template_name,
        parent_template_id, copied_from_template_id, status,
        total_sections, total_items, total_comments, preservation_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        newTemplateId,
        newName,
        source.description ? `${source.description} (Duplicate)` : null,
        source.source_type,
        source.source_filename,
        source.source_template_name,
        source.parent_template_id || source.id,
        source.id,
        'active',
        source.total_sections,
        source.total_items,
        source.total_comments,
        source.preservation_score
      ]
    );
    const newTemplate = newTplRes.rows[0];

    // 3. Fetch source sections and build mapping
    const secRes = await client.query(
      `SELECT * FROM sections WHERE template_id = $1 ORDER BY position ASC`,
      [sourceTemplateId]
    );

    const oldToNewSectionMap = new Map<string, string>();
    const newSectionRows: any[][] = [];

    for (const sec of secRes.rows) {
      const newSecId = randomUUID();
      oldToNewSectionMap.set(sec.id, newSecId);
      newSectionRows.push([
        newSecId,
        newTemplateId,
        sec.name,
        sec.position,
        sec.source_identifier,
        sec.source_row,
        sec.source_name
      ]);
    }

    await executeBatchInsert(
      client,
      'sections',
      ['id', 'template_id', 'name', 'position', 'source_identifier', 'source_row', 'source_name'],
      newSectionRows
    );

    // 4. Fetch source items and build mapping
    const oldSectionIds = Array.from(oldToNewSectionMap.keys());
    if (oldSectionIds.length > 0) {
      const itemRes = await client.query(
        `SELECT * FROM items WHERE section_id = ANY($1::uuid[]) ORDER BY position ASC`,
        [oldSectionIds]
      );

      const oldToNewItemMap = new Map<string, string>();
      const newItemRows: any[][] = [];

      for (const item of itemRes.rows) {
        const newItemId = randomUUID();
        oldToNewItemMap.set(item.id, newItemId);
        const newSecId = oldToNewSectionMap.get(item.section_id)!;
        newItemRows.push([
          newItemId,
          newSecId,
          item.name,
          item.position,
          item.source_identifier,
          item.source_row,
          item.source_name
        ]);
      }

      await executeBatchInsert(
        client,
        'items',
        ['id', 'section_id', 'name', 'position', 'source_identifier', 'source_row', 'source_name'],
        newItemRows
      );

      // 5. Fetch source comments and batch insert
      const oldItemIds = Array.from(oldToNewItemMap.keys());
      if (oldItemIds.length > 0) {
        const cmtRes = await client.query(
          `SELECT * FROM comments WHERE item_id = ANY($1::uuid[]) ORDER BY position ASC`,
          [oldItemIds]
        );

        const newCommentRows = cmtRes.rows.map((c) => [
          randomUUID(),
          oldToNewItemMap.get(c.item_id)!,
          c.content_html,
          c.source_content_html,
          c.position,
          c.source_identifier,
          c.source_row,
          c.has_unsupported_tags,
          c.unsupported_tags
        ]);

        await executeBatchInsert(
          client,
          'comments',
          [
            'id',
            'item_id',
            'content_html',
            'source_content_html',
            'position',
            'source_identifier',
            'source_row',
            'has_unsupported_tags',
            'unsupported_tags'
          ],
          newCommentRows
        );
      }
    }

    // 6. Batch clone issues
    const issueRes = await client.query(
      `SELECT * FROM import_issues WHERE template_id = $1`,
      [sourceTemplateId]
    );

    if (issueRes.rows.length > 0) {
      const newIssueRows = issueRes.rows.map((issue) => [
        randomUUID(),
        newTemplateId,
        issue.severity,
        issue.category,
        issue.source_location,
        issue.source_row,
        issue.original_content,
        issue.message,
        issue.resolution_status
      ]);

      await executeBatchInsert(
        client,
        'import_issues',
        [
          'id',
          'template_id',
          'severity',
          'category',
          'source_location',
          'source_row',
          'original_content',
          'message',
          'resolution_status'
        ],
        newIssueRows
      );
    }

    return newTemplate;
  });
}

