import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { parseSpectoraWorkbook } from '../src/lib/importer/spectora/parser';
import { saveImportedTemplate, listTemplates } from '../src/lib/importer/service';
import { pool } from '../src/lib/db';

async function seed() {
  console.log('--- Starting InspectionCore Database Seeder ---');
  const fixturePath = path.join(process.cwd(), 'fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx');

  if (!fs.existsSync(fixturePath)) {
    console.error(`Fixture not found at ${fixturePath}. Run npm run generate-fixture first.`);
    process.exit(1);
  }

  try {
    // Check if seed template already exists
    const existing = await listTemplates();
    const alreadySeeded = existing.find(t => t.name === 'InterNACHI Residential' || t.source_filename === 'InterNACHI-Residential-HTML-Text.xlsx');

    if (alreadySeeded) {
      console.log(`[Seed Idempotency] Seed template already exists (ID: ${alreadySeeded.id}, Name: "${alreadySeeded.name}"). Skipping duplicate insertion.`);
      console.log('Seeding completed successfully (already initialized).');
      process.exit(0);
    }

    console.log(`Reading fixture: ${fixturePath}`);
    const buffer = fs.readFileSync(fixturePath);
    const wb = XLSX.read(buffer, { type: 'buffer' });

    console.log('Parsing Spectora workbook...');
    const parsed = parseSpectoraWorkbook(wb, { filename: 'InterNACHI-Residential-HTML-Text.xlsx' });

    console.log(`Parsed: ${parsed.sections.length} sections, ${parsed.metrics.itemsCount} items, ${parsed.metrics.commentsCount} comments.`);
    console.log('Persisting to Supabase PostgreSQL database transactionally...');
    const template = await saveImportedTemplate(parsed);

    console.log(`Successfully seeded template! ID: ${template.id}, Name: "${template.name}".`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
