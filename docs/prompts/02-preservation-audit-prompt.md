# Reusable Prompt: Pre-Commit Trust & Preservation Engine

Use this prompt to implement or audit the pre-commit simulation, HTML sanitization, and cryptographic text fidelity verification.

---

```markdown
## Goal
Implement a customer-facing "Pre-Commit Trust & Preservation Engine" for an inspection template migration workflow. The goal is to provide inspectors with 100% confidence that their four-year customized inspection library has been ingested without dropped words, broken markup, or lost sections.

## Customer Problem
Inspectors dread switching software because legacy importers silently drop comments, rewrite text, discard bullet points, or fail to notify them of omitted columns. The migration workflow must build immediate trust.

## Required Capabilities

### 1. In-Memory Simulation Dry-Run
- When a user uploads a `.xlsx` or `.xls` file, invoke the preview endpoint (`POST /api/templates/preview`).
- Parse the spreadsheet entirely in memory. Do NOT touch the database until the user explicitly reviews and commits the import.

### 2. Multi-Step Review Wizard
- **Step 1: Upload**: Drag-and-drop zone with format hints and immediate file signature verification.
- **Step 2: Hierarchy Preview**: Editable template title, detected column chips, metrics breakdown (Systems, Components, Observations), and an interactive tree of extracted hierarchy.
- **Step 3: Fidelity & Triage Audit**:
  - Clear distinction between:
    a) "Information Naturally Absent from Export" (photos, client invoice amounts, address fields).
    b) "Handled or Sanitized Markup" (stripped style tags, neutralized scripts, unmapped metadata rows).
  - Preservation guarantees: 100% Relational, 100% Sequential ordering, Raw text score.

### 3. Cryptographic Text Fingerprinting (SHA-256)
- Compute a normalized SHA-256 hash of the source observation text:
  1. Strip non-semantic layout whitespace (`\s+` -> `' '`).
  2. Strip HTML markup tags (`<[^>]+>` -> `''`) for text-only baseline comparison.
  3. Hash using Node.js `crypto.createHash('sha256')`.
- Compute the corresponding hash on the parsed observation entities.
- If hashes match, report 100% text fidelity. If slight formatting differences exist, calculate the preservation percentage and expose exact row differences.

### 4. Post-Import Issues Drawer
- Persist all flagged items as `import_issues` records linked to the template via foreign key (`ON DELETE CASCADE`).
- Provide an accessible slide-over drawer allowing inspectors to view original row snippets, understand why a tag was flagged, and mark issues as "RESOLVED" or "DISMISSED".
```
