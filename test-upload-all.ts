import dns from 'dns';
dns.setDefaultResultOrder('verbatim');
import fs from 'fs';
import { validateSpreadsheetBuffer } from './src/lib/importer/spectora/validation';
import { parseSpectoraWorkbook } from './src/lib/importer/spectora/parser';
import { saveImportedTemplate, getTemplateWithHierarchy } from './src/lib/importer/service';
import { pool } from './src/lib/db';

async function testFile(filePath: string) {
  console.log('\n=======================================');
  console.log('Testing File:', filePath);
  const buf = fs.readFileSync(filePath);

  console.log('1. Validating buffer...');
  const valResult = validateSpreadsheetBuffer(buf);
  console.log('Validation:', {
    isValid: valResult.isValid,
    errors: valResult.errors,
    warnings: valResult.warnings,
    detectedHeaders: valResult.detectedHeaders
  });

  if (!valResult.isValid || !valResult.workbook) {
    console.error('Validation failed!');
    return;
  }

  console.log('2. Parsing workbook...');
  try {
    const parsed = parseSpectoraWorkbook(valResult.workbook, { filename: filePath });
    console.log('Parsed:', {
      name: parsed.name,
      sectionsCount: parsed.sections.length,
      metrics: parsed.metrics,
      issuesCount: parsed.issues.length
    });

    console.log('3. Testing saveImportedTemplate to DB...');
    const saved = await saveImportedTemplate(parsed);
    console.log('Saved to DB with ID:', saved.id);

    console.log('4. Retrieving hierarchy from DB...');
    const retrieved = await getTemplateWithHierarchy(saved.id);
    console.log('Retrieved from DB:', {
      id: retrieved?.id,
      name: retrieved?.name,
      sections: retrieved?.sections?.length,
      total_items: retrieved?.total_items,
      total_comments: retrieved?.total_comments
    });
  } catch (err: any) {
    console.error('Error during parse or save:', err);
  }
}

async function run() {
  try {
    const defaultFixture = 'fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx';
    if (fs.existsSync(defaultFixture)) {
      await testFile(defaultFixture);
    }
  } finally {
    await pool.end();
  }
}

run();
