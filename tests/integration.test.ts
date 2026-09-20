import dns from 'dns';
try {
  dns.setDefaultResultOrder('verbatim');
} catch {}
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { listTemplates, getTemplateWithHierarchy, duplicateTemplateTransaction, saveImportedTemplate } from '../src/lib/importer/service';
import { parseSpectoraWorkbook } from '../src/lib/importer/spectora/parser';
import { query, pool } from '../src/lib/db';

describe('Supabase Integration & Duplication Independence Tests', () => {
  let createdCopyId: string | null = null;

  beforeAll(async () => {
    const templates = await listTemplates();
    const existing = templates.find(t => t.name === 'InterNACHI Residential');
    if (!existing) {
      const fixturePath = path.join(process.cwd(), 'fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx');
      if (fs.existsSync(fixturePath)) {
        const buffer = fs.readFileSync(fixturePath);
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const parsed = parseSpectoraWorkbook(wb, { filename: 'InterNACHI-Residential-HTML-Text.xlsx' });
        await saveImportedTemplate(parsed);
      }
    }
  }, 30000);

  afterAll(async () => {
    if (createdCopyId) {
      await query(`DELETE FROM templates WHERE id = $1`, [createdCopyId]);
    }
    await pool.end();
  });

  it('1. Database retrieval - fetches seeded template with full hierarchy', async () => {
    const templates = await listTemplates();
    expect(templates.length).toBeGreaterThan(0);

    const seeded = templates.find(t => t.name === 'InterNACHI Residential');
    expect(seeded).toBeDefined();

    const full = await getTemplateWithHierarchy(seeded!.id);
    expect(full).not.toBeNull();
    expect(full?.sections).toBeDefined();
    expect(full!.sections!.length).toBeGreaterThanOrEqual(5);

    const firstSection = full!.sections![0];
    expect(firstSection.items).toBeDefined();
    expect(firstSection.items!.length).toBeGreaterThan(0);

    const firstItem = firstSection.items![0];
    expect(firstItem.comments).toBeDefined();
    expect(firstItem.comments!.length).toBeGreaterThan(0);
  });

  it('2. Duplication independence - modifying duplicate does NOT modify original', async () => {
    const templates = await listTemplates();
    const original = templates.find(t => t.name === 'InterNACHI Residential');
    expect(original).toBeDefined();

    const originalFullBefore = await getTemplateWithHierarchy(original!.id);
    const originalSectionNameBefore = originalFullBefore!.sections![0].name;
    const originalCommentHtmlBefore = originalFullBefore!.sections![0].items![0].comments![0].content_html;

    // Duplicate
    const copy = await duplicateTemplateTransaction(original!.id, 'InterNACHI Residential Test Copy');
    createdCopyId = copy.id;
    expect(copy.id).not.toBe(original!.id);

    const copyFull = await getTemplateWithHierarchy(copy.id);
    expect(copyFull!.sections!.length).toBe(originalFullBefore!.sections!.length);

    // Modify the duplicate
    const copySectionId = copyFull!.sections![0].id;
    const copyCommentId = copyFull!.sections![0].items![0].comments![0].id;

    await query(
      `UPDATE sections SET name = $1, updated_at = now() WHERE id = $2`,
      ['MODIFIED SECTION NAME IN DUPLICATE', copySectionId]
    );

    await query(
      `UPDATE comments SET content_html = $1, updated_at = now() WHERE id = $2`,
      ['<p>MODIFIED COMMENT IN DUPLICATE ONLY</p>', copyCommentId]
    );

    // Verify duplicate was updated
    const copyFullAfter = await getTemplateWithHierarchy(copy.id);
    expect(copyFullAfter!.sections![0].name).toBe('MODIFIED SECTION NAME IN DUPLICATE');
    expect(copyFullAfter!.sections![0].items![0].comments![0].content_html).toBe('<p>MODIFIED COMMENT IN DUPLICATE ONLY</p>');

    // CRITICAL: Verify original remains completely unchanged
    const originalFullAfter = await getTemplateWithHierarchy(original!.id);
    expect(originalFullAfter!.sections![0].name).toBe(originalSectionNameBefore);
    expect(originalFullAfter!.sections![0].items![0].comments![0].content_html).toBe(originalCommentHtmlBefore);
  }, 20000);
});
