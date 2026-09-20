import fs from 'fs';
import { validateSpreadsheetBuffer } from './src/lib/importer/spectora/validation';
import { parseSpectoraWorkbook } from './src/lib/importer/spectora/parser';

const files = [
  'fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx',
  'fixtures/failures/invalid-generic-spreadsheet.xlsx'
];

for (const file of files) {
  console.log('\n=======================================');
  console.log('Testing file:', file);
  if (!fs.existsSync(file)) {
    console.log('File does not exist:', file);
    continue;
  }
  const buf = fs.readFileSync(file);
  const val = validateSpreadsheetBuffer(buf);
  console.log('Validation result:', {
    isValid: val.isValid,
    errors: val.errors,
    warnings: val.warnings,
    detectedHeaders: val.detectedHeaders
  });

  if (val.isValid && val.workbook) {
    try {
      const parsed = parseSpectoraWorkbook(val.workbook, { filename: file });
      console.log('Parsed successfully:', {
        name: parsed.name,
        sectionsCount: parsed.sections.length,
        itemsCount: parsed.metrics?.itemsCount,
        commentsCount: parsed.metrics?.commentsCount,
        issuesCount: parsed.issues.length
      });
    } catch (e: any) {
      console.error('Parse failed:', e.message);
    }
  }
}
