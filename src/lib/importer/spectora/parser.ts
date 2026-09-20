import * as XLSX from 'xlsx';
import {
  ImportIssue,
  ParsedComment,
  ParsedItem,
  ParsedSection,
  ParsedTemplate
} from './types';
import { sanitizeAndAnalyzeHtml } from './html';
import { buildPreservationAudit, normalizeTextForFingerprint } from './preservation';

export interface ParseOptions {
  filename?: string;
  templateNameOverride?: string;
}

interface ColumnMap {
  sectionCol: number;
  itemCol: number;
  commentCol: number;
  htmlTextCol: number;
  categoryCol: number;
}

function cleanHeaderCell(cell: any): string {
  if (cell == null) return '';
  return String(cell)
    .replace(/[*_~`"']/g, '') // strip markdown markers and quotes
    .replace(/[\r\n\t]+/g, ' ') // normalize whitespace
    .replace(/[:*]+$/, '') // strip trailing colons or asterisks
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function findHeaderRow(rows: any[][]): { headerIndex: number; colMap: ColumnMap } | null {
  const maxScanRows = Math.min(rows.length, 50);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let sectionCol = -1;
    let itemCol = -1;
    let commentCol = -1;
    let htmlTextCol = -1;
    let categoryCol = -1;

    const cleanedCells = row.map(cleanHeaderCell);

    cleanedCells.forEach((val, idx) => {
      if (!val) return;
      const baseVal = val.replace(/\s*\([^)]*\)/g, '').trim();

      // 1. SECTION / SYSTEM
      if (
        val === 'section' ||
        val === 'sections' ||
        val === 'section name' ||
        val === 'section title' ||
        val === 'system' ||
        val === 'systems' ||
        val === 'system name' ||
        val === 'system title' ||
        val === 'inspection system' ||
        val === 'system / section' ||
        val === 'section / system' ||
        val === 'system/section' ||
        val === 'section/system' ||
        val === 'report section' ||
        val === 'category name' ||
        val === 'inspection category' ||
        (val === 'category' && sectionCol === -1)
      ) {
        sectionCol = idx;
      }
      // 2. ITEM / COMPONENT
      else if (
        val === 'item' ||
        val === 'items' ||
        val === 'item name' ||
        val === 'item title' ||
        val === 'component' ||
        val === 'components' ||
        val === 'component name' ||
        val === 'component title' ||
        val === 'sub-section' ||
        val === 'subsection' ||
        val === 'sub section' ||
        val === 'sub-category' ||
        val === 'subcategory' ||
        val === 'sub category' ||
        val === 'checklist item' ||
        val === 'checklist' ||
        val === 'inspection item' ||
        val === 'item / component' ||
        val === 'component / item' ||
        val === 'element'
      ) {
        itemCol = idx;
      }
      // 3. COMMENT / OBSERVATION / DEFECT TITLE
      else if (
        val === 'comment' ||
        val === 'comments' ||
        val === 'comment name' ||
        val === 'comment title' ||
        val === 'defect' ||
        val === 'defects' ||
        val === 'defect name' ||
        val === 'defect title' ||
        val === 'observation' ||
        val === 'observations' ||
        val === 'observation name' ||
        val === 'observation title' ||
        val === 'deficiency' ||
        val === 'deficiencies' ||
        val === 'deficiency name' ||
        val === 'deficiency title' ||
        val === 'finding' ||
        val === 'findings' ||
        val === 'finding name' ||
        val === 'finding title' ||
        val === 'issue' ||
        val === 'issues' ||
        val === 'issue name' ||
        val === 'issue title' ||
        val === 'narrative' ||
        val === 'narratives' ||
        val === 'narrative title' ||
        val === 'title' ||
        val === 'summary'
      ) {
        commentCol = idx;
      }
      // 4. HTML TEXT / OBSERVATION BODY / COMMENT TEXT
      else if (
        val === 'html text' ||
        val === 'html_text' ||
        val === 'html' ||
        val === 'htmltext' ||
        val === 'comment text' ||
        val === 'comment body' ||
        val === 'comment description' ||
        val === 'text' ||
        val === 'body' ||
        val === 'description' ||
        val === 'full description' ||
        val === 'rich text' ||
        val === 'html content' ||
        val === 'defect text' ||
        val === 'defect description' ||
        val === 'defect narrative' ||
        val === 'observation text' ||
        val === 'observation description' ||
        val === 'observation details' ||
        val === 'deficiency text' ||
        val === 'deficiency description' ||
        val === 'narrative text' ||
        val === 'narrative description' ||
        val === 'details' ||
        val === 'comment details' ||
        val === 'notes' ||
        val === 'finding text' ||
        val === 'full text' ||
        val === 'recommendation' ||
        val === 'recommendations'
      ) {
        htmlTextCol = idx;
      }
      // 5. SEVERITY / CATEGORY
      else if (
        val === 'severity' ||
        val === 'severity level' ||
        val === 'comment type' ||
        baseVal === 'comment type' ||
        val === 'defect type' ||
        baseVal === 'category' ||
        val === 'flag' ||
        val === 'type' ||
        val === 'priority' ||
        val === 'status'
      ) {
        categoryCol = idx;
      }
    });

    // Flexible criteria: Requires at least (Section OR Item) AND at least (Comment OR HtmlText)
    const hasStructure = sectionCol !== -1 || itemCol !== -1;
    const hasContent = commentCol !== -1 || htmlTextCol !== -1;

    if (hasStructure && hasContent) {
      return {
        headerIndex: r,
        colMap: { sectionCol, itemCol, commentCol, htmlTextCol, categoryCol }
      };
    }
  }
  return null;
}

export function parseSpectoraWorkbook(
  workbook: XLSX.WorkBook,
  options: ParseOptions = {}
): ParsedTemplate {
  const filename = options.filename || 'Spreadsheet-Template.xlsx';
  const issues: ImportIssue[] = [];

  // Determine sheet
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Workbook contains no sheets.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" could not be read.`);
  }

  // Convert to raw row matrix
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false
  });

  if (rawMatrix.length === 0) {
    throw new Error('Spreadsheet appears to be completely empty.');
  }

  const headerInfo = findHeaderRow(rawMatrix);
  if (!headerInfo) {
    throw new Error(
      'Missing required Spectora column headers. Expected at least "Section", "Item", and "Comment" or "HTML Text".'
    );
  }

  const { headerIndex, colMap } = headerInfo;
  const dataRows = rawMatrix.slice(headerIndex + 1);

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let currentItem: ParsedItem | null = null;

  let sectionPos = 1;
  let itemPos = 1;
  let commentPos = 1;

  let recognizedRows = 0;
  let unmappedRows = 0;
  let unsupportedHtmlCount = 0;
  const unsupportedTagsMap: Record<string, number> = {};

  const sourceNormalizedChunks: string[] = [];
  const parsedNormalizedChunks: string[] = [];

  // Parse each row
  dataRows.forEach((row, idx) => {
    const rowNumber = headerIndex + 2 + idx; // 1-indexed spreadsheet row
    const rawSection = colMap.sectionCol !== -1 ? String(row[colMap.sectionCol] || '').trim() : '';
    const rawItem = colMap.itemCol !== -1 ? String(row[colMap.itemCol] || '').trim() : '';
    const rawComment = colMap.commentCol !== -1 ? String(row[colMap.commentCol] || '').trim() : '';
    const rawHtml = colMap.htmlTextCol !== -1 ? String(row[colMap.htmlTextCol] || '').trim() : '';

    // Check if row is completely empty
    if (!rawSection && !rawItem && !rawComment && !rawHtml) {
      return;
    }

    // Capture source text for preservation fingerprinting
    const rowRawCombined = `${rawSection} ${rawItem} ${rawComment} ${rawHtml}`.trim();
    sourceNormalizedChunks.push(normalizeTextForFingerprint(rowRawCombined));

    // Detect metadata or non-standard row
    if (rawSection.toUpperCase().includes('METADATA') || (rawSection && !rawItem && !rawComment && !rawHtml && rawSection.length > 50)) {
      unmappedRows++;
      issues.push({
        severity: 'INFO',
        category: 'SOURCE_METADATA_ONLY',
        source_location: `Sheet "${sheetName}", Row ${rowNumber}`,
        source_row: rowNumber,
        original_content: rowRawCombined,
        message: `Preserved non-structural metadata row: "${rawSection.slice(0, 60)}..."`,
        resolution_status: 'UNRESOLVED'
      });
      return;
    }

    // If row has no section and no item, but has comment/HTML text, inherit current section/item
    let sectionName = rawSection;
    let itemName = rawItem;

    if (!sectionName && currentSection) {
      sectionName = currentSection.name;
    }

    if (!itemName && currentItem) {
      itemName = currentItem.name;
    }

    // If still no section name, classify as unmapped issue
    if (!sectionName) {
      unmappedRows++;
      issues.push({
        severity: 'WARNING',
        category: 'UNKNOWN_ROW',
        source_location: `Sheet "${sheetName}", Row ${rowNumber}`,
        source_row: rowNumber,
        original_content: rowRawCombined,
        message: `Row ${rowNumber} has comment text but no parent Section could be determined. Preserved in Import Issues.`,
        resolution_status: 'UNRESOLVED'
      });
      return;
    }

    recognizedRows++;

    // 1. Handle Section
    if (!currentSection || currentSection.name.toLowerCase() !== sectionName.toLowerCase()) {
      // Look for existing section with this name (e.g. if repeated blocks occur)
      const existing = sections.find(s => s.name.toLowerCase() === sectionName.toLowerCase());
      if (existing) {
        currentSection = existing;
      } else {
        currentSection = {
          name: sectionName,
          source_name: sectionName,
          position: sectionPos++,
          source_identifier: `SEC-${sectionPos - 1}`,
          source_row: rowNumber,
          items: []
        };
        sections.push(currentSection);
        itemPos = 1; // Reset item position for new section
        currentItem = null;
      }
    }

    // 2. Handle Item
    if (itemName) {
      if (!currentItem || currentItem.name.toLowerCase() !== itemName.toLowerCase() || !currentSection.items.includes(currentItem)) {
        const existingItem = currentSection.items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        if (existingItem) {
          currentItem = existingItem;
        } else {
          currentItem = {
            name: itemName,
            source_name: itemName,
            position: itemPos++,
            source_identifier: `ITEM-${currentSection.position}-${itemPos - 1}`,
            source_row: rowNumber,
            comments: []
          };
          currentSection.items.push(currentItem);
          commentPos = 1; // Reset comment position for new item
        }
      }
    } else if (!currentItem) {
      // Create a default item under section if none specified
      currentItem = {
        name: `${currentSection.name} General`,
        source_name: `${currentSection.name} General`,
        position: itemPos++,
        source_identifier: `ITEM-${currentSection.position}-${itemPos - 1}`,
        source_row: rowNumber,
        comments: []
      };
      currentSection.items.push(currentItem);
      commentPos = 1;
    }

    // 3. Handle Comment / HTML Text
    const commentContent = rawHtml || rawComment;
    if (commentContent) {
      const htmlAnalysis = sanitizeAndAnalyzeHtml(commentContent);
      if (htmlAnalysis.hasUnsupportedTags) {
        unsupportedHtmlCount++;
        htmlAnalysis.unsupportedTags.forEach(tag => {
          unsupportedTagsMap[tag] = (unsupportedTagsMap[tag] || 0) + 1;
        });

        issues.push({
          severity: 'WARNING',
          category: 'UNSUPPORTED_HTML',
          source_location: `Row ${rowNumber} [${sectionName} → ${currentItem.name}]`,
          source_row: rowNumber,
          original_content: commentContent.slice(0, 140),
          message: `Comment contains unsupported HTML tags (${htmlAnalysis.unsupportedTags.map(t => `<${t}>`).join(', ')}). Formatting was safely sanitized while preserving text.`,
          resolution_status: 'UNRESOLVED'
        });
      }

      const parsedComment: ParsedComment = {
        content_html: htmlAnalysis.sanitizedHtml,
        source_content_html: commentContent,
        position: commentPos++,
        source_identifier: `CMT-${currentSection.position}-${currentItem.position}-${commentPos - 1}`,
        source_row: rowNumber,
        has_unsupported_tags: htmlAnalysis.hasUnsupportedTags,
        unsupported_tags: htmlAnalysis.unsupportedTags
      };

      currentItem.comments.push(parsedComment);
      parsedNormalizedChunks.push(normalizeTextForFingerprint(htmlAnalysis.sanitizedHtml));
    }
  });

  // Calculate totals
  let totalSections = sections.length;
  let totalItems = 0;
  let totalComments = 0;
  sections.forEach(s => {
    totalItems += s.items.length;
    s.items.forEach(i => {
      totalComments += i.comments.length;
    });
  });

  // Build preservation metrics
  const audit = buildPreservationAudit({
    sourceRowsCount: dataRows.length,
    recognizedRowsCount: recognizedRows,
    unmappedRowsCount: unmappedRows,
    sectionsCount: totalSections,
    itemsCount: totalItems,
    commentsCount: totalComments,
    unsupportedHtmlCount,
    sourceNormalizedText: sourceNormalizedChunks.join(' '),
    parsedNormalizedText: parsedNormalizedChunks.join(' '),
    unsupportedTagsMap
  });

  // Detect template name from filename or override
  let templateName = options.templateNameOverride || '';
  if (!templateName) {
    const cleanBase = filename
      .replace(/\.(xlsx|xls)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (cleanBase.toLowerCase().includes('internachi') && cleanBase.toLowerCase().includes('residential')) {
      templateName = 'InterNACHI Residential';
    } else if (cleanBase.length > 0) {
      templateName = cleanBase
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    } else {
      templateName = 'Spectora Inspection Template';
    }
  }

  return {
    name: templateName,
    description: `Imported from ${filename} on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
    source_type: 'spectora_xlsx',
    source_filename: filename,
    source_template_name: templateName,
    sections,
    issues,
    metrics: {
      totalSourceRows: audit.sourceRowsCount,
      recognizedRows: audit.recognizedRowsCount,
      unmappedRows: audit.unmappedRowsCount,
      sectionsCount: audit.sectionsCount,
      itemsCount: audit.itemsCount,
      commentsCount: audit.commentsCount,
      unsupportedHtmlCount: audit.unsupportedHtmlCount,
      preservationScore: audit.preservationScore,
      sourceSha256: audit.sourceContentSha256,
      parsedSha256: audit.parsedContentSha256
    }
  };
}
