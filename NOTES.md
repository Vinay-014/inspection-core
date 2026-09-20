# InspectionCore — Engineering Design & Compliance Notes

## Executive Summary
InspectionCore is an end-to-end inspection template management platform and import engine designed to ingest Spectora spreadsheet exports (`.xlsx` / `.xls`), preserve hierarchical section/item/observation structures, sanitize and preserve rich HTML formatting, and store the resulting data in a normalized relational database (Supabase / PostgreSQL).

---

## 1. Architecture & Technology Stack

### System Layout
The system is constructed as a modern, decoupled full-stack TypeScript application:
- **Client Application**: Built with React 19 and Vite 6, using Tailwind CSS v4 and Motion (`motion/react`) for smooth, desktop-grade transitions. Icons are supplied by Lucide React.
- **Backend API Server**: Node.js with Express 4.x, utilizing Multer with in-memory buffering (30MB maximum payload limit) to ingest spreadsheets without writing temporary files to disk.
- **Data Ingestion & Preservation Engine**: SheetJS (`xlsx`) for binary Excel matrix parsing, DOMPurify for strict tag whitelisting, and Node.js native `crypto` for SHA-256 fingerprint verification.
- **Database & Relational Persistence**: PostgreSQL hosted on Supabase, connected via Node-Postgres (`pg`) connection pooling with parameterized SQL queries and transactional wrappers (`withTransaction`).
- **Testing & Verification**: Vitest 5.x for unit and database integration testing, TypeScript compiler (`tsc --noEmit`) for static analysis, and esbuild for backend production bundling.

---

## 2. Normalized Relational Data Model

Rather than storing imported templates as opaque JSON blobs, InspectionCore enforces a strict, 3-level normalized relational schema:

```sql
-- 1. Templates Table: Root template metadata & preservation metrics
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  source_type VARCHAR(64) DEFAULT 'spectora_xlsx',
  source_filename VARCHAR(255),
  source_template_name VARCHAR(255),
  parent_template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  copied_from_template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'active',
  total_sections INT DEFAULT 0,
  total_items INT DEFAULT 0,
  total_comments INT DEFAULT 0,
  preservation_score NUMERIC(5,2) DEFAULT 100.0,
  imported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Sections Table: High-level systems (Roofing, Electrical, Plumbing, HVAC)
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INT NOT NULL,
  source_identifier TEXT,
  source_row INT,
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Items Table: Inspection components under each section (Roof Coverings, Main Panel)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INT NOT NULL,
  source_identifier TEXT,
  source_row INT,
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Comments Table: Observations, pre-written defect descriptions, disclaimers
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL,
  source_content_html TEXT,
  position INT NOT NULL,
  source_identifier TEXT,
  source_row INT,
  has_unsupported_tags BOOLEAN DEFAULT FALSE,
  unsupported_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Import Issues Table: Audit log for unmapped rows and sanitized markup
CREATE TABLE import_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  severity VARCHAR(16) NOT NULL,
  category VARCHAR(64) NOT NULL,
  source_location TEXT,
  source_row INT,
  original_content TEXT,
  message TEXT NOT NULL,
  resolution_status VARCHAR(32) DEFAULT 'UNRESOLVED',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Relational Design Decisions
- **Cascading Deletes (`ON DELETE CASCADE`)**: Deleting a template automatically cleans up all associated sections, items, comments, and audit issues, leaving zero orphaned records.
- **Position Tracking**: Explicit integer columns (`sections.position`, `items.position`, `comments.position`) store sequential 1-indexed ordering, preserving the inspector's workflow order regardless of primary key generation sequence.
- **Dual-Column HTML Preservation**: `content_html` stores DOMPurify-sanitized markup safe for browser rendering, while `source_content_html` retains the exact byte-for-byte original string from the spreadsheet.

---

## 3. Import Mapping Strategy

The Spectora parser implements a state machine that dynamically scans row data and builds the relational tree:

| Source Column Signature | Relational Entity | Mapping Behavior & Rules |
|---|---|---|
| `Section` / `Section Name` / `System` | `sections` | Initiates a new section entity. Advances sequential position. Clears active item pointer. |
| `Item` / `Item Name` / `Component` | `items` | Initiates a new component entity under the active section. Advances sequential item position. |
| `Comment` / `Comment Name` / `Defect` | `comments.source_identifier` | Used as observation headline or fallback narrative if HTML Text is blank. |
| `HTML Text` / `Content` / `Text` | `comments.content_html` | Sanitized through DOMPurify whitelist. Paragraphs, bold, italics, links, and lists are preserved. |

### Dynamic Header Offset Handling
Spectora exports often contain metadata or blank disclaimer rows at the top of the worksheet. The parser examines up to 50 rows, locating the row where at least two key column headers appear. Rows prior to this offset are flagged as `SOURCE_METADATA_ONLY` if they contain text, and data ingestion begins strictly on rows below the header.

---

## 4. Preservation Strategy & Zero Silent Drop Guarantee

When home inspectors switch platforms, silent loss of custom clauses can cause severe legal liability. The preservation strategy enforces:
1. **Never Silently Drop Content**: Every single row in the workbook is classified. Rows that cannot be mapped into the 3-level taxonomy generate an `import_issues` record storing the row index and raw text.
2. **Sequential Integrity**: Positions are preserved monotonically (1, 2, 3...) matching the physical layout of the Excel file.
3. **HTML Sanitization Without Loss**:
   - Preserved tags: `<p>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<s>`, `<ul>`, `<ol>`, `<li>`, `<h1>`-`<h6>`, `<a>`, `<table>`, `<blockquote>`.
   - Stripped tags: `<script>`, `<iframe>`, `<object>` are neutralized to protect user security.
   - Flagged markup: `<style>` blocks are removed from HTML rendering and flagged with row numbers in the audit log.
4. **SHA-256 Cryptographic Text Verification**:
   - The engine normalizes whitespace and calculates a SHA-256 digest of source observation text versus parsed entities.
   - Matching hashes guarantee that no observation narrative was mangled or lost during translation.

---

## 5. Customer Problem & Chosen Improvement: Pre-Commit Trust Engine

### The Problem
Inspectors dread migrating because automated tools frequently alter disclaimers, drop sub-items, or fail silently.

### The Chosen Solution: Interactive Dry-Run & Preservation Audit
InspectionCore introduces a multi-step Pre-Commit Trust wizard:
1. **Dry-Run Preview**: Ingesting a spreadsheet parses the hierarchy entirely in memory without writing to the database.
2. **Structural Metrics**: Inspectors see exact counts of Systems, Components, and Defect Narratives alongside detected column headers.
3. **Clear Distinction**:
   - **Naturally Absent from Export**: Photos, client addresses, and pricing are highlighted as information not included in Spectora's export format.
   - **Sanitized or Noticed Markup**: Lists stripped style tags or unmapped rows with source row numbers.
4. **Inspector Control**: The user commits only when satisfied with the fidelity report.

---

## 6. Difficult Case vs. Real Failure Case Handling

### The Difficult Case: Complex HTML, Non-Zero Row Offset, and Inline Style Blocks
- **Fixture**: `fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx`
  - Row 1 contains template metadata title (`InterNACHI Residential Standard Template v4`).
  - Row 2 contains column headers (`Section`, `Item`, `Comment`, `HTML Text`).
  - Observations contain complex HTML, including nested `<strong>` and `<em>` tags, anchor tags (`<a href="...">`), and an embedded `<style>` block in the "Gas Fireplace Operation" defect narrative.
- **Handling**:
  - The dynamic header scanner skips Row 1 and correctly sets Row 2 as the header offset.
  - Paragraph formatting, bold, italics, and links are preserved verbatim.
  - The `<style>` block is neutralized for UI safety, and logged in `import_issues` with category `UNSUPPORTED_HTML` and source row index.

### The Real Failure Case: Schema-Mismatched Spreadsheet Rejection
- **Fixture**: `fixtures/failures/invalid-generic-spreadsheet.xlsx`
  - A valid Microsoft Excel workbook containing an internal company payroll table (`Employee ID`, `Employee Name`, `Department`, `Salary`).
- **Handling**:
  - The spreadsheet validator confirms valid binary Excel signatures (`PK` zip magic bytes).
  - The header scanner evaluates rows 1–50 and detects no Spectora column matches.
  - The parser halts and issues an honest, actionable validation error:
    ```
    - Required Spectora column headers were not found in the first 50 rows.
    - Found headers/content in first row: [Employee ID, Employee Name, Department, Salary, Quarterly Bonus].
    - Expected headers: Section (or System), Item (or Component), and Comment (or Defect / HTML Text).
    - How to fix: Verify this file was exported via Spectora: Template Settings → "Export to spreadsheet" or "Export HTML Text".
    ```
  - **Zero Database Side Effects**: The transaction is never initiated, and zero rows are inserted into PostgreSQL.

### Defense-in-Depth Structure Validation: `validateParsedTemplate`
To prevent broken, corrupted, or malformed JSON payloads from entering the database:
- Both `POST /api/templates/import` and `saveImportedTemplate` execute `validateParsedTemplate`.
- Verifies non-empty template name, non-empty sections array, positive integer positions, and valid item/comment arrays.
- Malformed payloads are rejected with HTTP 422 before touching the database.

---

## 7. Deliberately Excluded Features & Scope Rationale

1. **Multi-Tenant RBAC & Authentication Walls**:
   - *Rationale*: Adding mandatory login screens would hinder immediate reviewer evaluation. The PostgreSQL schema was designed with Row Level Security (RLS) enabled and open review policies ready for enterprise auth integration.
2. **Direct Binary PDF Report Compilation**:
   - *Rationale*: Generating formatted inspection PDFs requires heavy headless browser dependencies (Puppeteer/Chromium) that balloon Docker image sizes and memory footprints. The system outputs clean, sanitized HTML that can be fed into any downstream document compiler.
3. **Cloud Object Storage for Inspection Photos**:
   - *Rationale*: Spectora template exports define boilerplate checklists and observation wording; they do not contain binary photos. An external S3/GCS pipeline was excluded to prevent unneeded external cloud dependencies.
4. **Real-Time Multi-Cursor Collaborative WebSockets**:
   - *Rationale*: Template editing is an administrative configuration workflow, not a collaborative document editing tool. Standard transactional REST endpoints with atomic deep-cloning ensure consistency without WebSocket complexity.

---

## 8. AI Coding Tools & Workflow Used

Development was conducted collaboratively with **Google AI Studio** and the **Google DeepMind Antigravity IDE**:

1. **Domain Modeling & Schema Formulations**: Used Google Gemini models via AI Studio to analyze the Spectora spreadsheet format, formulate the normalized relational database schema, and design the Pre-Commit Trust Engine.
2. **Iterative Pair Programming**: Utilized the Antigravity IDE for autonomous command execution, TypeScript file modification, and regression testing.
3. **Deterministic Parser Decision**: Explicitly selected a deterministic TypeScript parser over generative model extraction to guarantee 100% reproducible imports, zero token latency, zero hallucinations, and zero cloud API failure modes during customer spreadsheet ingestion.
4. **Structured Prompt Preservation**: All engineering prompts, agent system instructions, and failure testing specifications developed during this project are preserved in [`docs/prompts/`](./docs/prompts/).

---

## 9. Limitations

1. **Active Sheet Processing**: The importer processes the first sheet matching the Spectora column signature. Multi-tab workbooks with disconnected ancillary tables will ingest the inspection schema from the primary tab and ignore unrelated tabs.
2. **Executable Script Sanitization**: Arbitrary `<script>` and `<iframe>` elements are stripped by DOMPurify for security. Whenever stripped, an auditable warning is recorded in the template's issue log.
3. **Local Filesystem Hyperlinks**: Hyperlinks referencing local workstation paths (`file:///C:/...`) cannot be resolved over the web and are flagged during import audit.

---

## 10. Verification Summary & Test Breakdown

All 14 automated tests pass with 100% success rate (`npm test`):
- **Unit Tests (`tests/importer.test.ts` — 12 tests)**:
  1. Spreadsheet loading: reads committed fixture.
  2. Header detection: identifies Section, Item, Comment, HTML Text.
  3. Row classification & hierarchy: extracts sections, items, comments.
  4. Ordering preservation: maintains sequential 1-indexed positions.
  5. HTML handling: preserves formatting, strips scripts.
  6. Unsupported content detection: captures style tags as `ImportIssue`s.
  7. Malformed workbook rejection: rejects corrupted binaries.
  8. Missing header rejection: rejects sheets without required headers.
  9. Preservation fingerprint: validates deterministic SHA-256 hashing.
  10. Real failure fixture: rejects valid Excel with non-Spectora schema.
  11. Structure validation: rejects malformed sections/positions before persistence.
  12. Structure validation: accepts clean parsed templates.
- **Integration Tests (`tests/integration.test.ts` — 2 tests)**:
  1. Database retrieval: fetches seeded template with full relational hierarchy.
  2. Duplication independence: deep-clones template, mutates duplicate, asserts original is completely unchanged.

---

## 11. Approximate Engineering Time Breakdown

| Phase | Activities | Approx. Time |
|---|---|---|
| **Phase 1: Domain Analysis & Schema** | Spectora export analysis, relational schema design, foreign key cascading | ~45 min |
| **Phase 2: Parser & Preservation** | Dynamic header discovery, DOMPurify whitelist, SHA-256 fingerprinting | ~75 min |
| **Phase 3: Database & Transactions** | PostgreSQL pooled client, batch inserts, deep duplication transaction | ~60 min |
| **Phase 4: Desktop UI & Editor** | Landing page, hierarchy tree, split-pane HTML editor, import modal | ~90 min |
| **Phase 5: Negative Testing & Hardening** | Failure fixtures, structure validator, Vitest test suite expansion | ~50 min |
| **Total Engineering Time** | | **~5.3 hours** |
