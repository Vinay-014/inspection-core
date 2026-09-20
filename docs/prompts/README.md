# AI Engineering Workflows & Agent Instructions

This directory preserves the engineering prompts, agent instructions, and test generation workflows developed during the construction and verification of **InspectionCore**.

These specifications have been synthesized and professionally re-optimized from the development transcripts, enabling reproducible evaluation, automated agent-driven audits, and future template importer extensions.

---

## Index of Prompts and Agent Instructions

| Document | Purpose & Scope |
|---|---|
| [**`01-spectora-parser-prompt.md`**](./01-spectora-parser-prompt.md) | Prompts for designing the deterministic spreadsheet parser, dynamic header offset discovery, and relational hierarchy state machine (`Section` $\to$ `Item` $\to$ `Comment`). |
| [**`02-preservation-audit-prompt.md`**](./02-preservation-audit-prompt.md) | Prompts for implementing the **Pre-Commit Trust Engine**, SHA-256 cryptographic text fingerprinting, DOMPurify HTML sanitization, and fidelity issue classification. |
| [**`03-agent-system-instructions.md`**](./03-agent-system-instructions.md) | Comprehensive agent role, tool guidelines, and non-negotiable constraints for autonomous agents testing, modifying, or extending InspectionCore. |
| [**`04-failure-testing-guide.md`**](./04-failure-testing-guide.md) | Prompts and test patterns for constructing real failure fixtures (corrupt binaries, schema mismatches, malformed payloads) to guarantee zero partial database writes. |

---

## Architectural Principles Enforced by These Prompts

1. **Deterministic Parsing Over Generative Extraction**:
   - Extraction of inspection checklists, defect narratives, and hierarchical systems is performed using deterministic column mapping rather than stochastic LLM extraction. This guarantees 100% reproducibility, zero token latency, zero hallucinations, and zero cloud API dependency during ingestion.

2. **Never Silently Drop Content**:
   - Every row in the uploaded workbook must either map to an inspection entity (`Section`, `Item`, `Comment`) or produce an auditable `ImportIssue` with row number, category, and explanation.

3. **Strict Structural Validation Before Persistence**:
   - Ingested structures are validated at both the route handler and service layer (`validateParsedTemplate`). If any part of the hierarchy violates structural integrity, database persistence is aborted with an actionable 422 error, preventing corrupt or orphaned records.

4. **Independent Duplication Isolation**:
   - Duplicating a template deep-copies all relational descendants inside a single atomic PostgreSQL transaction. Any subsequent mutation to a cloned template is mathematically isolated from the parent.
