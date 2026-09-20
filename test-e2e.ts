import fs from 'fs';
import path from 'path';
import { validateSpreadsheetBuffer } from './src/lib/importer/spectora/validation';
import { parseSpectoraWorkbook } from './src/lib/importer/spectora/parser';

const filePath = path.join(process.cwd(), 'fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx');
const filename = 'InterNACHI-Residential-HTML-Text.xlsx';

console.log('=== Simulating /api/templates/preview ===');
const buffer = fs.readFileSync(filePath);
console.log('Buffer size:', buffer.length);

console.log('\n--- Step 1: validateSpreadsheetBuffer ---');
const validation = validateSpreadsheetBuffer(buffer);
console.log('isValid:', validation.isValid);
console.log('errors:', JSON.stringify(validation.errors, null, 2));
console.log('warnings:', JSON.stringify(validation.warnings, null, 2));
console.log('detectedHeaders (first 5):', validation.detectedHeaders?.slice(0,5));
console.log('sheetNames:', validation.sheetNames);

if (!validation.isValid) {
  console.error('\nVALIDATION FAILED — this is the bug!');
  process.exit(1);
}

console.log('\n--- Step 2: parseSpectoraWorkbook ---');
try {
  const parsed = parseSpectoraWorkbook(validation.workbook!, { filename });
  console.log('Template name:', parsed.name);
  console.log('Sections:', parsed.sections.length);
  console.log('Total items:', parsed.sections.reduce((a, s) => a + s.items.length, 0));
  console.log('Issues:', parsed.issues.length);
  console.log('Metrics:', JSON.stringify(parsed.metrics, null, 2));
  console.log('\nFull SUCCESS - no validation error should appear');
} catch (err: any) {
  console.error('Parse error:', err.message);
  process.exit(1);
}
