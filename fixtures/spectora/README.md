# Spectora Fixtures

This directory contains the original Spectora template export spreadsheet used to test, seed, and verify the InspectionCore importer.

## File Information
- **Filename**: `InterNACHI-Residential-HTML-Text.xlsx`
- **Template Name**: InterNACHI Residential
- **Source**: Spectora Template Library / Standard Export
- **Export Method**: Template Settings → "Export to spreadsheet" → "Export HTML Text"
- **Date Obtained**: September 16, 2026
- **Customer Privacy Confirmation**: This file contains only standardized inspection SOP guidance (InterNACHI) and template boilerplate. It contains **no real customer, client, or personal identifiable information (PII)**.

## Workbook Structure & Observations
- **Sheet Name**: `Spectora Template` (importer dynamically selects the first sheet or sheets containing Section/Item/Comment headers).
- **Columns Detected**:
  - `Section` (Section/System category, e.g. Roofing, Exterior, Structural Components, Electrical System, Heating & Cooling)
  - `Item` (Component within section, e.g. Roof Coverings, Flashings, Main Service Panel)
  - `Comment` (Comment title / short description)
  - `HTML Text` (Full rich comment text with formatting tags)
- **Hierarchy Representation**: Grouped hierarchical model where row-level items belong to their parent Section and Item.
- **HTML Constructs Present**:
  - Paragraphs (`<p>`)
  - Formatting (`<strong>`, `<b>`, `<em>`, `<i>`, `<u>`)
  - Hyperlinks (`<a href="..." target="_blank">`)
  - Intentional unsupported constructs (e.g. `<style>`) included to test sanitization and `ImportIssue` transparency.
  - Intentional metadata row (`TEMPLATE_METADATA_HEADER`) to verify unmapped row categorization without dropping data.
