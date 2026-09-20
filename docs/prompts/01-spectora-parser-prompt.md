# Reusable Prompt: Deterministic Spectora Parser Engineering

Use this prompt to build, verify, or adapt the deterministic parser engine for Spectora spreadsheet exports.

---

```markdown
## Goal
Build a deterministic, production-ready spreadsheet ingestion engine for Microsoft Excel workbooks (.xlsx and .xls) exported from Spectora ("Export HTML Text" format). The importer must faithfully reconstruct the 3-level inspection hierarchy:
1. Systems (Sections)
2. Components (Items)
3. Pre-written Defect Narratives & Boilerplate Observations (Comments)

## Context & Constraints
- An inspection company moving off Spectora has tuned their template for four years. They cannot tolerate dropped sections, reworded narratives, altered bullet formatting, or truncated clauses.
- Do NOT use a generative model for raw extraction. Ingestion must be 100% deterministic, instant, zero-cost, and offline-capable.
- Input workbooks may contain leading metadata rows, disclaimers, or varying sheet names. Scan the first 50 rows dynamically to identify table column headers.
- Column headers can vary slightly across versions:
  - Section: "Section", "Section Name", "System"
  - Item: "Item", "Item Name", "Component"
  - Comment: "Comment", "Comment Name", "Defect", "Observation"
  - Content: "HTML Text", "Content", "HTML Content", "Text"

## Hierarchy State Machine Rules
1. Maintain active pointers: `currentSection`, `currentItem`.
2. When a row introduces a new Section name:
   - Finalize previous items/comments.
   - Increment 1-indexed sequential section position.
   - Reset current item pointer.
3. When a row introduces a new Item name under the active section:
   - Finalize previous comments.
   - Increment 1-indexed sequential item position.
4. When a row contains observation text in Comment or HTML Text:
   - Extract raw HTML string.
   - Preserve formatting (paragraphs, bold, italic, underline, lists, tables).
   - Sanitize dangerous executable tags (<script>, <iframe>) using DOMPurify.
   - If unsupported markup is encountered (e.g. <style>), log an ImportIssue with the exact row number and original content.
5. Blank rows or purely structural spacers must be handled without advancing positions or creating phantom records.

## Required Outputs
The parser must return a structured `ParsedTemplate` object containing:
- `name`: Cleaned template name derived from file or sheet
- `sections`: Array of `ParsedSection`, each containing `ParsedItem`s and `ParsedComment`s
- `issues`: Array of `ImportIssue`s (`category`, `severity`, `source_row`, `message`)
- `metrics`: Total source rows, recognized rows, unmapped rows, and preservation score percentage
```
