import * as XLSX from 'xlsx';
import { findHeaderRow } from './parser';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  workbook?: XLSX.WorkBook;
  detectedHeaders?: string[];
  sheetNames?: string[];
}

export function validateSpreadsheetBuffer(buffer: Buffer | ArrayBuffer): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const u8 = buffer instanceof Buffer ? buffer : new Uint8Array(buffer);

  // Check minimum size
  if (u8.length < 50) {
    return {
      isValid: false,
      errors: ['Could not read spreadsheet file. The file is too small or empty to be a valid Excel spreadsheet.'],
      warnings: []
    };
  }

  // Check Excel signature:
  // .xlsx starts with PK (0x50, 0x4B, 0x03, 0x04 or 0x05, 0x06 or 0x07, 0x08)
  // .xls starts with OLE signature (0xD0, 0xCF, 0x11, 0xE0)
  const isZip = u8[0] === 0x50 && u8[1] === 0x4B;
  const isOle = u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0;

  if (!isZip && !isOle) {
    return {
      isValid: false,
      errors: [
        'Could not read spreadsheet file. The uploaded file is not a valid Microsoft Excel (.xlsx / .xls) spreadsheet format.'
      ],
      warnings: []
    };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (err: any) {
    return {
      isValid: false,
      errors: [
        `Could not read spreadsheet file. Please ensure this is a valid Microsoft Excel (.xlsx / .xls) file. Technical reason: ${err.message || 'Corrupted binary format'}`
      ],
      warnings: []
    };
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      isValid: false,
      errors: ['The workbook does not contain any readable worksheets.'],
      warnings: []
    };
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return {
      isValid: false,
      errors: [`The first sheet "${sheetName}" is empty or inaccessible.`],
      warnings: []
    };
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (rows.length === 0) {
    return {
      isValid: false,
      errors: ['The spreadsheet contains no data rows.'],
      warnings: []
    };
  }

  const headerInfo = findHeaderRow(rows);
  if (!headerInfo) {
    const firstRowSample = rows[0] ? rows[0].slice(0, 8).join(', ') : 'None';
    return {
      isValid: false,
      errors: [
        `Required Spectora column headers were not found in the first 50 rows.`,
        `Found headers/content in first row: [${firstRowSample}].`,
        `Expected headers: Section (or System), Item (or Component), and Comment (or Defect / HTML Text).`,
        `How to fix: Verify this file was exported via Spectora: Template Settings → "Export to spreadsheet" or "Export HTML Text".`
      ],
      warnings: []
    };
  }

  const detectedHeaders = rows[headerInfo.headerIndex]?.map(String) || [];

  if (rows.length - headerInfo.headerIndex - 1 <= 0) {
    warnings.push('The sheet contains headers but no inspection rows below the header row.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    workbook,
    detectedHeaders,
    sheetNames: workbook.SheetNames
  };
}

/**
 * Validates a parsed template data structure strictly before database persistence.
 * Prevents malformed, incomplete, or corrupted structures from creating partial records in the database.
 */
export function validateParsedTemplate(parsed: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid template data: expected an object but received null or non-object.']
    };
  }

  // 1. Template name validation
  if (!parsed.name || typeof parsed.name !== 'string' || !parsed.name.trim()) {
    errors.push('Template name is required and must be a non-empty string.');
  } else if (parsed.name.length > 255) {
    errors.push(`Template name exceeds maximum allowed length of 255 characters (current: ${parsed.name.length}).`);
  }

  // 2. Sections array validation
  if (!Array.isArray(parsed.sections)) {
    errors.push('Template sections must be an array.');
    return { isValid: false, errors };
  }

  if (parsed.sections.length === 0) {
    errors.push('Template must contain at least one valid inspection section (system).');
  }

  // 3. Hierarchical validation of sections, items, and comments
  parsed.sections.forEach((section: any, secIdx: number) => {
    const secPrefix = `Section[${secIdx}]`;

    if (!section || typeof section !== 'object') {
      errors.push(`${secPrefix}: must be a valid object.`);
      return;
    }

    if (!section.name || typeof section.name !== 'string' || !section.name.trim()) {
      errors.push(`${secPrefix}: missing required section name.`);
    }

    if (typeof section.position !== 'number' || !Number.isInteger(section.position) || section.position < 1) {
      errors.push(`${secPrefix} ("${section.name || 'Unnamed'}"): position must be a positive integer >= 1 (got: ${section.position}).`);
    }

    if (!Array.isArray(section.items)) {
      errors.push(`${secPrefix} ("${section.name || 'Unnamed'}"): items must be an array.`);
      return;
    }

    section.items.forEach((item: any, itmIdx: number) => {
      const itmPrefix = `${secPrefix} -> Item[${itmIdx}]`;

      if (!item || typeof item !== 'object') {
        errors.push(`${itmPrefix}: must be a valid object.`);
        return;
      }

      if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
        errors.push(`${itmPrefix}: missing required item name in section "${section.name}".`);
      }

      if (typeof item.position !== 'number' || !Number.isInteger(item.position) || item.position < 1) {
        errors.push(`${itmPrefix} ("${item.name || 'Unnamed'}"): position must be a positive integer >= 1 (got: ${item.position}).`);
      }

      if (!Array.isArray(item.comments)) {
        errors.push(`${itmPrefix} ("${item.name || 'Unnamed'}"): comments must be an array.`);
        return;
      }

      item.comments.forEach((comment: any, cmtIdx: number) => {
        const cmtPrefix = `${itmPrefix} -> Comment[${cmtIdx}]`;

        if (!comment || typeof comment !== 'object') {
          errors.push(`${cmtPrefix}: must be a valid object.`);
          return;
        }

        if (comment.content_html !== undefined && typeof comment.content_html !== 'string') {
          errors.push(`${cmtPrefix}: content_html must be a string.`);
        }

        if (typeof comment.position !== 'number' || !Number.isInteger(comment.position) || comment.position < 1) {
          errors.push(`${cmtPrefix}: position must be a positive integer >= 1 (got: ${comment.position}).`);
        }
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

