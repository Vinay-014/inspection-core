# InspectionCore

> **Enterprise Property Inspection Template Platform & Spectora XLSX Importer**

InspectionCore is a full-stack, production-grade template management and migration system built for residential and commercial property inspection companies migrating off Spectora. When an inspection company spends four years perfecting hundreds of standardized checklists, defect descriptions, and statutory disclaimers, they cannot afford silent data loss, mangled markup, or broken hierarchies.

InspectionCore delivers **100% faithful spreadsheet ingestion**, strict relational persistence (PostgreSQL / Supabase), an intuitive desktop inspector workspace, atomic template deep duplication, and a transparent **Pre-Commit Trust Engine** that audits every observation before saving.

---

## 1. Architecture & Technology Stack

```
                     ┌──────────────────────────────────────────────────────────┐
                     │               Client Layer (React 19 + Vite)             │
                     │  - Professional Inspector Landing Page & Workspace       │
                     │  - 3-Level Hierarchy Tree Explorer (System > Item > Def) │
                     │  - Split-Pane WYSIWYG & Raw HTML Observation Editor      │
                     │  - Multi-Step Pre-Commit Trust & Preservation Modal      │
                     │  - Interactive Fidelity Issues Drawer & Tracker          │
                     └────────────────────────────┬─────────────────────────────┘
                                                  │ HTTP REST / JSON & Multipart
                                                  ▼
                     ┌──────────────────────────────────────────────────────────┐
                     │               Server API Engine (Express 4.x)            │
                     │  - Route-level UUID Parameter Regex Validation           │
                     │  - Security Headers (nosniff, SAMEORIGIN, XSS protection)│
                     │  - Memory-Buffered Ingestion Pipeline (Multer 30MB)      │
                     │  - Strict Pre-Persistence Structural Validator           │
                     └─────────────┬──────────────────────────────┬─────────────┘
                                   │                              │
         ┌─────────────────────────▼──────────────┐    ┌──────────▼──────────────────────────┐
         │ Ingestion & Preservation Engine        │    │ Relational Persistence Layer        │
         │ - SheetJS Excel Matrix Parser          │    │ - PostgreSQL / Supabase             │
         │ - Dynamic Header & Row Offset Scanner  │    │ - Connection Pool w/ Retries ('pg') │
         │ - DOMPurify Tag Whitelist Sanitizer    │    │ - Atomic Multi-Table Transactions   │
         │ - Cryptographic SHA-256 Fingerprinting │    │ - Chunked High-Performance Inserts  │
         └────────────────────────────────────────┘    └─────────────────────────────────────┘
```

### Core Technologies
- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion (`motion/react`), Lucide React.
- **Backend API**: Node.js (v18+/v20+/v24+), Express 4.x, Multer (memory buffering).
- **Ingestion & Processing**: SheetJS (`xlsx`), DOMPurify (`dompurify`), Node.js native `crypto`.
- **Database**: PostgreSQL 15+ / Supabase with Node-Postgres (`pg`) connection pooling and transactions.
- **Quality & Verification**: Vitest 5.x, TypeScript compiler (`tsc`), esbuild.

---

## 2. Relational Data Model

InspectionCore replaces opaque single-blob storage with a fully normalized, relational schema featuring foreign keys, cascading deletes, position ordering, and audit tracking.

```sql
templates (Inspection Template)
├── id: UUID (Primary Key)
├── name: VARCHAR(255)
├── description: TEXT
├── source_type: VARCHAR(64)          -- 'spectora_xlsx' | 'custom' | 'cloned'
├── source_filename: VARCHAR(255)     -- e.g. 'InterNACHI-Residential-HTML-Text.xlsx'
├── source_template_name: VARCHAR(255)
├── parent_template_id: UUID          -- Self-reference for versioning
├── copied_from_template_id: UUID     -- Reference to source template if duplicated
├── status: VARCHAR(32)               -- 'active' | 'archived' | 'draft'
├── total_sections: INT
├── total_items: INT
├── total_comments: INT
├── preservation_score: NUMERIC(5,2)  -- Calculated text fidelity percentage
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ
    │
    ├── sections (Systems / Major Categories, e.g. Roofing, Electrical, Plumbing)
    │   ├── id: UUID (Primary Key)
    │   ├── template_id: UUID (Foreign Key -> templates.id ON DELETE CASCADE)
    │   ├── name: VARCHAR(255)
    │   ├── position: INT              -- 1-indexed sequential ordering
    │   ├── source_identifier: TEXT
    │   ├── source_row: INT
    │   ├── source_name: TEXT
    │   └── created_at, updated_at
    │       │
    │       └── items (Components under System, e.g. Roof Coverings, Gutters, Service Panel)
    │           ├── id: UUID (Primary Key)
    │           ├── section_id: UUID (Foreign Key -> sections.id ON DELETE CASCADE)
    │           ├── name: VARCHAR(255)
    │           ├── position: INT      -- 1-indexed sequential ordering
    │           ├── source_identifier: TEXT
    │           ├── source_row: INT
    │           ├── source_name: TEXT
    │           └── created_at, updated_at
    │               │
    │               └── comments (Observation Narratives, Defect Descriptions, Disclaimers)
    │                   ├── id: UUID (Primary Key)
    │                   ├── item_id: UUID (Foreign Key -> items.id ON DELETE CASCADE)
    │                   ├── content_html: TEXT              -- Sanitized safe HTML
    │                   ├── source_content_html: TEXT       -- Exact verbatim source markup
    │                   ├── position: INT                   -- 1-indexed sequential ordering
    │                   ├── source_identifier: TEXT
    │                   ├── source_row: INT
    │                   ├── has_unsupported_tags: BOOLEAN
    │                   ├── unsupported_tags: TEXT[]        -- e.g. ['style', 'script']
    │                   └── created_at, updated_at
    │
    └── import_issues (Audit Log for Discrepancies & Sanitized Content)
        ├── id: UUID (Primary Key)
        ├── template_id: UUID (Foreign Key -> templates.id ON DELETE CASCADE)
        ├── severity: VARCHAR(16)      -- 'INFO' | 'WARNING' | 'ERROR'
        ├── category: VARCHAR(64)      -- 'UNSUPPORTED_HTML' | 'SOURCE_METADATA_ONLY' | 'MALFORMED_ROW'
        ├── source_location: TEXT
        ├── source_row: INT
        ├── original_content: TEXT
        ├── message: TEXT
        ├── resolution_status: VARCHAR(32) -- 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED'
        └── created_at, updated_at
```

---

## 3. Import Mapping Strategy

The importer dynamically parses Spectora spreadsheet workbooks without hardcoding column indexes:

| Spectora Column Header | Accepted Aliases | Relational Target | Mapping & Transformation Logic |
|---|---|---|---|
| **Section** | `Section`, `Section Name`, `System`, `Category` | `sections.name` | Creates a new Section entity. Resets item counter. Increments sequential 1-indexed position. |
| **Item** | `Item`, `Item Name`, `Component`, `Sub-category` | `items.name` | Creates a new Item linked to the active Section. Resets comment counter. |
| **Comment** | `Comment`, `Comment Name`, `Defect`, `Observation Title` | `comments.source_identifier` | Used as the observation label/title or fallback narrative descriptor if HTML Text is absent. |
| **HTML Text** | `HTML Text`, `Content`, `HTML Content`, `Text`, `Narrative` | `comments.content_html` | Ingests rich HTML markup. Sanitizes dangerous tags via DOMPurify whitelist. Preserves `<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a>`, `<table>`. |

### Dynamic Header Offset Discovery
Spectora exports often include arbitrary metadata rows or disclaimers at the top of the sheet. The parser scans the first 50 rows dynamically, identifying the header row where at least two required column families (`Section`, `Item`, `Comment`) are present, establishing the offset for data rows below.

---

## 4. Preservation Strategy: Never Silently Drop Content

Inspectors spend years refining observation wording and legal disclaimers. InspectionCore guarantees **zero silent data loss**:

1. **Sequential 1-Indexed Position Preservation**:
   - `sections.position`, `items.position`, and `comments.position` strictly preserve the exact top-to-bottom order found in the source spreadsheet.
2. **Dual-Column Markup Storage**:
   - Both `content_html` (sanitized safe version for browser rendering) and `source_content_html` (verbatim raw export content) are preserved in the database.
3. **DOMPurify Whitelisting**:
   - Standard rich-text tags (`<p>`, `<br>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<s>`, `<ul>`, `<ol>`, `<li>`, `<h1>`-`<h6>`, `<a>`, `<table>`, `<blockquote>`) are preserved.
   - Hazardous elements (`<script>`, `<iframe>`, `<object>`) are stripped for security.
4. **Transparent Discrepancy Logging**:
   - Whenever an unsupported tag (such as an inline `<style>` block) or unmapped row is encountered, the system creates an `import_issues` record storing the row number and original content.
5. **Cryptographic SHA-256 Text Fingerprinting**:
   - The engine strips non-semantic layout whitespace and generates SHA-256 digests of the source text versus the parsed hierarchy text, confirming identical text content.

---

## 5. Customer Problem & Chosen Improvement: Pre-Commit Trust Engine

### The Problem
When inspection firms migrate software, their greatest anxiety is **silent corruption**: did the importer silently drop comments? Did it truncate long disclaimers? Did it lose an entire section?

### The Chosen Improvement: Pre-Commit Trust & Simulation Engine
Rather than blindly importing an uploaded file into the database, InspectionCore provides a transparent 3-step interactive migration wizard:
1. **Upload & Binary Verification**: Validates file integrity, worksheet headers, and structure in memory in under 100ms.
2. **Structural Hierarchy Preview**: Displays extracted metrics (Systems, Components, Observations), matched columns, and an interactive tree preview of the full inspection taxonomy.
3. **Fidelity & Triage Audit**:
   - **Naturally Absent Information**: Clarifies that binary inspection photos, customer billing rates, and street addresses are not part of Spectora's template export.
   - **Handled Markup & Sanitization**: Lists exact row numbers for any stripped style tags or unmapped metadata rows.
   - **Fidelity Scorecard**: Visual confirmation of 100% Relational mapping, 100% Sequential ordering, and text preservation score.

---

## 6. Difficult Case vs. Real Failure Case Handling

### The Difficult Case: HTML Formatting, Non-Zero Row Offsets & Embedded Style Markup
- **Challenge**: The committed fixture `fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx` contains multiple edge cases:
  - Row 1 contains a non-standard title string (`"InterNACHI Residential Standard Template v4"`).
  - Row 2 contains the actual table headers.
  - The "Gas Fireplace Operation" comment contains an embedded `<style>` block with custom font sizing.
- **Handling**:
  - The dynamic header scanner skips Row 1 and identifies Row 2 as the header offset.
  - The parser normalizes paragraph structures, preserves bold and italic markup, sanitizes the `<style>` block to prevent CSS leakage, and flags the row in `import_issues` as `UNSUPPORTED_HTML` for inspector review.

### The Real Failure Case: Non-Spectora Schema Rejection
- **Fixture**: `fixtures/failures/invalid-generic-spreadsheet.xlsx`
  - A genuine, valid Microsoft Excel file containing an internal payroll sheet (`["Employee ID", "Employee Name", "Department", "Salary"]`).
- **Handling**:
  - The binary decompressor accepts the valid Excel signature.
  - The header validator scans the first 50 rows and finds no Spectora column signatures.
  - **Honest Actionable Error**:
    ```
    - Required Spectora column headers were not found in the first 50 rows.
    - Found headers/content in first row: [Employee ID, Employee Name, Department, Salary, Quarterly Bonus].
    - Expected headers: Section (or System), Item (or Component), and Comment (or Defect / HTML Text).
    - How to fix: Verify this file was exported via Spectora: Template Settings → "Export to spreadsheet" or "Export HTML Text".
    ```
  - **Zero Database Side Effects**: No partial records are created in `templates`, `sections`, `items`, or `comments`. Tested and verified in `tests/importer.test.ts` (test #10).

---

## 7. Deliberately Excluded Features & Why

| Excluded Feature | Engineering Rationale |
|---|---|
| **Multi-Tenant User Login / RBAC Walls** | The core requirement is template ingestion fidelity, relational hierarchy preservation, and inspector workflow usability. Adding an auth wall blocks immediate evaluation. Tables include RLS protection ready for future auth integration. |
| **Direct Binary PDF Report Compiler** | Generating completed inspection report PDFs requires heavyweight headless browser dependencies (Puppeteer/Chromium) that balloon bundle size and memory usage. InspectionCore outputs clean, sanitized HTML ready for any downstream print renderer. |
| **Cloud Object Storage for Inspection Photos** | Spreadsheet template exports define boilerplate checklists and defect language; they do not contain binary photos. An external S3/GCS pipeline was excluded to prevent unneeded external cloud dependencies. |
| **Real-Time Collaborative Multi-Cursor WebSockets** | Template editing is an administrative configuration workflow rather than a simultaneous multi-author document. Standard transactional REST endpoints with atomic deep-cloning ensure data consistency without WebSocket complexity. |

*(For full rationale and architecture trade-offs, see [NOTES.md](./NOTES.md).)*

---

## 8. AI Coding Tools & Engineering Workflow Used

This application was developed using **Google AI Studio** and the **Google DeepMind Antigravity IDE**:

- **Model Guidance & Architecture Planning**: Used Google Gemini models via AI Studio to analyze the Spectora spreadsheet format, formulate the normalized relational database schema, and design the Pre-Commit Trust Engine.
- **Pair Programming & Autonomous Task Execution**: Leveraged the Antigravity IDE agentic environment for iterative file edits, database transaction implementations, and automated test authoring.
- **Deterministic Importer Decision**: Explicitly selected a deterministic TypeScript parser over generative model extraction to guarantee 100% reproducible imports, zero token latency, zero hallucinations, and zero cloud API failure modes during customer spreadsheet ingestion.
- **Structured Prompt Preservation**: All engineering prompts, agent system instructions, and failure testing specifications developed during this project are preserved in [`docs/prompts/`](./docs/prompts/).

---

## 9. Limitations

1. **Active Sheet Processing**: The importer processes the first sheet matching the Spectora column signature. Multi-tab workbooks with disconnected ancillary tables will ingest the inspection schema from the primary tab and ignore unrelated tabs.
2. **Executable Script Sanitization**: Arbitrary `<script>` and `<iframe>` elements are stripped by DOMPurify for security. Whenever stripped, an auditable warning is recorded in the template's issue log.
3. **Local Filesystem Hyperlinks**: Hyperlinks referencing local workstation paths (`file:///C:/...`) cannot be resolved over the web and are flagged during import audit.

---

## 10. Setup, Run & Deployment Instructions

### Prerequisites
- Node.js 18+ (tested on Node.js 20 & 24)
- npm or bun
- PostgreSQL database (or free Supabase project)

### 1. Clone & Install
```bash
git clone <repository-url>
cd inspectioncore
npm install
```

### 2. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Edit `.env` to include your Supabase / PostgreSQL connection string:
```ini
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
PORT=3000
```

### 3. Run Database Migrations & Baseline Seed
```bash
# Run PostgreSQL relational schema migrations
npm run migrate

# (Optional) Seed the baseline InterNACHI Residential template
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser to launch the desktop inspector workspace.

### 5. Run Verification Suite (Tests, Lint, Build)
```bash
# Run unit & Supabase integration tests
npm test

# Run TypeScript typecheck
npm run lint

# Build production bundle (Vite + esbuild)
npm run build

# Start production server
npm start
```

### 6. Production Deployment
- **Container / Server (Render, Railway, Fly.io, AWS ECS)**:
  Run `npm run build` followed by `npm start` (`node dist/server.cjs`). The server handles both the API endpoints and serves the compiled static Vite frontend from `dist/`.
- **Database (Supabase / Managed PostgreSQL)**:
  Apply `supabase/migrations/20260914000000_initial_schema.sql` via Supabase SQL Editor or `npm run migrate`. Ensure direct or pooled connection strings have SSL enabled (`sslmode=require`).
