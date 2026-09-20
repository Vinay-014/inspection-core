# Failure Testing Guide & Prompt Specification

Use this guide to construct and verify failure cases in InspectionCore.

---

```markdown
## Objective
Verify that unexpected, invalid, or malformed inputs produce honest, actionable validation errors and NEVER produce broken, partial, or orphaned database records.

## Real Failure Scenarios Tested in InspectionCore

### 1. Valid Excel File with Incompatible Schema (e.g. Payroll/Accounting Spreadsheet)
- **Fixture**: `fixtures/failures/invalid-generic-spreadsheet.xlsx`
- **Expected Behavior**:
  - The binary file format is valid Excel, so binary decompression succeeds.
  - The dynamic header scanner inspects the first 50 rows and discovers headers like `["Employee ID", "Employee Name", "Department", "Salary"]`.
  - Because required Spectora columns (`Section`, `Item`, `Comment`) are missing, the validation engine rejects the upload with HTTP 422.
  - **Honest Feedback**:
    - "Required Spectora column headers were not found in the first 50 rows."
    - "Found headers/content in first row: [Employee ID, Employee Name, Department, Salary, Quarterly Bonus]."
    - "Expected headers: Section (or System), Item (or Component), and Comment (or Defect / HTML Text)."
    - "How to fix: Verify this file was exported via Spectora: Template Settings → 'Export to spreadsheet' or 'Export HTML Text'."
  - **Database Effect**: Zero rows inserted into `templates`, `sections`, `items`, or `comments`.

### 2. Binary Non-Excel or Corrupt Data
- **Input**: Random binary stream, plain text file renamed to `.xlsx`, or truncated ZIP archive.
- **Expected Behavior**:
  - Magic byte verification fails (missing `PK` ZIP signature or `0xD0CF11E0` OLE signature).
  - Immediate rejection before invoking SheetJS parser:
    `"Could not read spreadsheet file. The uploaded file is not a valid Microsoft Excel (.xlsx / .xls) spreadsheet format."`
  - Rejection occurs in < 5 milliseconds.

### 3. Malformed Payload Prior to Database Persistence
- **Input**: Synthetically altered `parsed` JSON payload sent directly to `POST /api/templates/import`:
  - Section with missing or blank `name`
  - Section or Item with negative or non-integer `position` (e.g. `-1` or `0`)
  - Missing `sections` array
- **Expected Behavior**:
  - Evaluated by `validateParsedTemplate` before `saveImportedTemplate` enters transaction.
  - Returns HTTP 422 with detailed array of specific schema violations.
  - Zero database records created.

### 4. Generation Script for Failure Fixture
To re-generate the invalid payroll fixture:
```bash
npx tsx scripts/create-failure-fixture.ts
```
```
