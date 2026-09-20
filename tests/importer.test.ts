import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { parseSpectoraWorkbook, findHeaderRow } from '../src/lib/importer/spectora/parser';
import { sanitizeAndAnalyzeHtml } from '../src/lib/importer/spectora/html';
import { validateSpreadsheetBuffer, validateParsedTemplate } from '../src/lib/importer/spectora/validation';
import { computeSha256, normalizeTextForFingerprint } from '../src/lib/importer/spectora/preservation';

describe('Spectora Importer Unit Tests', () => {
  const fixturePath = path.join(process.cwd(), 'fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx');

  it('1. Spreadsheet loading - reads the committed fixture successfully', () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
    const buffer = fs.readFileSync(fixturePath);
    const validation = validateSpreadsheetBuffer(buffer);
    expect(validation.isValid).toBe(true);
    expect(validation.workbook).toBeDefined();
    expect(validation.sheetNames).toContain('Spectora Template');
  });

  it('2. Header detection - correctly identifies Section, Item, Comment, HTML Text columns', () => {
    const rows = [
      ['Random metadata header', 'v1.0'],
      ['Section', 'Item', 'Comment', 'HTML Text']
    ];
    const header = findHeaderRow(rows);
    expect(header).not.toBeNull();
    expect(header?.headerIndex).toBe(1);
    expect(header?.colMap.sectionCol).toBe(0);
    expect(header?.colMap.itemCol).toBe(1);
    expect(header?.colMap.commentCol).toBe(2);
    expect(header?.colMap.htmlTextCol).toBe(3);
  });

  it('3. Row classification & hierarchy - parses Sections, Items, Comments', () => {
    const buffer = fs.readFileSync(fixturePath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const parsed = parseSpectoraWorkbook(wb, { filename: 'InterNACHI-Residential-HTML-Text.xlsx' });

    expect(parsed.name).toBe('InterNACHI Residential');
    expect(parsed.sections.length).toBeGreaterThanOrEqual(5);

    // Section 1: Roofing
    const roofing = parsed.sections.find(s => s.name === 'Roofing');
    expect(roofing).toBeDefined();
    expect(roofing?.items.length).toBeGreaterThan(0);

    // Item under Roofing: Roof Coverings
    const roofCoverings = roofing?.items.find(i => i.name === 'Roof Coverings');
    expect(roofCoverings).toBeDefined();
    expect(roofCoverings?.comments.length).toBeGreaterThan(0);
  });

  it('4. Ordering preservation - strictly maintains sequential positions', () => {
    const buffer = fs.readFileSync(fixturePath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const parsed = parseSpectoraWorkbook(wb);

    // Verify sections positions are 1, 2, 3...
    parsed.sections.forEach((sec, idx) => {
      expect(sec.position).toBe(idx + 1);
      sec.items.forEach((item, itemIdx) => {
        expect(item.position).toBe(itemIdx + 1);
        item.comments.forEach((cmt, cmtIdx) => {
          expect(cmt.position).toBe(cmtIdx + 1);
        });
      });
    });
  });

  it('5. HTML handling - preserves paragraphs, bold, italics, links, and sanitizes dangerous tags', () => {
    const testHtml = '<p>Normal <strong>bold</strong> and <em>italic</em> with <a href="https://example.com" target="_blank">link</a>. <script>alert("hack")</script></p>';
    const result = sanitizeAndAnalyzeHtml(testHtml);

    expect(result.sanitizedHtml).toContain('<strong>bold</strong>');
    expect(result.sanitizedHtml).toContain('<em>italic</em>');
    expect(result.sanitizedHtml).toContain('href="https://example.com"');
    expect(result.sanitizedHtml).not.toContain('<script>');
    expect(result.hasUnsupportedTags).toBe(true);
    expect(result.unsupportedTags).toContain('script');
    expect(result.linksFound.length).toBe(1);
    expect(result.linksFound[0].href).toBe('https://example.com');
  });

  it('6. Unsupported content detection - identifies style tags and captures as ImportIssues', () => {
    const buffer = fs.readFileSync(fixturePath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const parsed = parseSpectoraWorkbook(wb);

    // The fixture contains an intentional style tag on Fireplace comment and an intentional metadata row
    const unsupportedIssues = parsed.issues.filter(i => i.category === 'UNSUPPORTED_HTML');
    expect(unsupportedIssues.length).toBeGreaterThanOrEqual(1);

    const metadataIssues = parsed.issues.filter(i => i.category === 'SOURCE_METADATA_ONLY');
    expect(metadataIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('7. Malformed / Invalid workbook rejection - returns structured, helpful errors', () => {
    // Arbitrary binary garbage that cannot be parsed as any spreadsheet or text
    const invalidBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);
    const result = validateSpreadsheetBuffer(invalidBuffer);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Could not read spreadsheet file');

    // Plain text that is not a valid Excel file
    const textBuffer = Buffer.from('Just plain text without headers or excel signature');
    const textResult = validateSpreadsheetBuffer(textBuffer);
    expect(textResult.isValid).toBe(false);
    expect(textResult.errors[0]).toContain('not a valid Microsoft Excel');
  });

  it('8. Missing header rejection - fails with actionable message if columns missing', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['ColumnA', 'ColumnB'], ['Val1', 'Val2']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = validateSpreadsheetBuffer(buffer);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Required Spectora column headers were not found'))).toBe(true);
  });

  it('9. Preservation Fingerprint - computes deterministic SHA-256 for source vs parsed', () => {
    const textA = 'The asphalt shingles are in satisfactory condition.';
    const textB = '<p>The <strong>asphalt shingles</strong> are in satisfactory condition.</p>';
    
    const normA = normalizeTextForFingerprint(textA);
    const normB = normalizeTextForFingerprint(textB);

    expect(normA).toBe(normB);
    expect(computeSha256(normA)).toBe(computeSha256(normB));
  });

  it('10. Real failure fixture - rejects valid Excel with non-Spectora schema gracefully', () => {
    const failurePath = path.join(process.cwd(), 'fixtures/failures/invalid-generic-spreadsheet.xlsx');
    expect(fs.existsSync(failurePath)).toBe(true);

    const buf = fs.readFileSync(failurePath);
    const result = validateSpreadsheetBuffer(buf);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Required Spectora column headers were not found');
    expect(result.errors[1]).toContain('Employee ID, Employee Name');
    expect(result.errors[3]).toContain('How to fix: Verify this file was exported via Spectora');
  });

  it('11. Structure Validation - strictly rejects malformed sections, invented headers, or invalid positions', () => {
    // Missing template name
    const badName = validateParsedTemplate({ name: '', sections: [] });
    expect(badName.isValid).toBe(false);
    expect(badName.errors.some(e => e.includes('Template name is required'))).toBe(true);

    // Empty sections
    const emptySections = validateParsedTemplate({ name: 'Test', sections: [] });
    expect(emptySections.isValid).toBe(false);
    expect(emptySections.errors.some(e => e.includes('at least one valid inspection section'))).toBe(true);

    // Invented/malformed section without name and negative position
    const malformedSection = validateParsedTemplate({
      name: 'Valid Name',
      sections: [
        {
          name: '',
          position: -1,
          items: []
        }
      ]
    });
    expect(malformedSection.isValid).toBe(false);
    expect(malformedSection.errors.some(e => e.includes('missing required section name'))).toBe(true);
    expect(malformedSection.errors.some(e => e.includes('position must be a positive integer'))).toBe(true);

    // Malformed item with invalid position
    const malformedItem = validateParsedTemplate({
      name: 'Valid Name',
      sections: [
        {
          name: 'Roofing',
          position: 1,
          items: [
            {
              name: '',
              position: 0,
              comments: []
            }
          ]
        }
      ]
    });
    expect(malformedItem.isValid).toBe(false);
    expect(malformedItem.errors.some(e => e.includes('missing required item name'))).toBe(true);
    expect(malformedItem.errors.some(e => e.includes('position must be a positive integer'))).toBe(true);
  });

  it('12. Structure Validation - cleanly accepts correctly structured parsed templates', () => {
    const valid = validateParsedTemplate({
      name: 'InterNACHI Inspection Template',
      sections: [
        {
          name: 'Roofing',
          position: 1,
          items: [
            {
              name: 'Roof Coverings',
              position: 1,
              comments: [
                {
                  content_html: '<p>Satisfactory architectural shingles.</p>',
                  position: 1
                }
              ]
            }
          ]
        }
      ]
    });
    expect(valid.isValid).toBe(true);
    expect(valid.errors.length).toBe(0);
  });
});
