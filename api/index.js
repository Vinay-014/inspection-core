// src/server/app.ts
import dns2 from "dns";
import express from "express";
import path from "path";
import multer from "multer";
import * as XLSX3 from "xlsx";
import fs from "fs";

// src/lib/db.ts
import dns from "dns";
import dotenv from "dotenv";
import { Pool } from "pg";
try {
  if (!process.env.VERCEL) {
    dns.setDefaultResultOrder("verbatim");
  }
} catch {
}
dotenv.config({ override: true });
var connectionString = (process.env.DATABASE_URL || "").trim();
if (!connectionString || connectionString.includes("db.lcfnatgpntbvlhreczvt.supabase.co")) {
  connectionString = "postgresql://postgres.lcfnatgpntbvlhreczvt:InspectCore-backup@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";
}
connectionString = connectionString.replace(/postgres:\s+/, "postgres:");
var pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: process.env.VERCEL ? 5 : 15,
  idleTimeoutMillis: 1e4,
  connectionTimeoutMillis: 1e4
});
pool.on("error", (err) => {
  console.error("[DB Pool Critical Error]", err);
});
var TRANSIENT_ERROR_CODES = /* @__PURE__ */ new Set([
  "08006",
  // connection_failure
  "08001",
  // sqlclient_unable_to_establish_sqlconnection
  "57P01",
  // admin_shutdown
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ECONNREFUSED"
]);
function isTransientError(err) {
  if (!err) return false;
  if (err.code && TRANSIENT_ERROR_CODES.has(err.code)) return true;
  const msg = (err.message || "").toLowerCase();
  return msg.includes("connection terminated") || msg.includes("connection timeout") || msg.includes("socket closed") || msg.includes("server closed the connection unexpectedly");
}
async function query(text, params, maxRetries = 2) {
  let attempt = 0;
  while (true) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== "production" && duration > 500) {
        console.warn(`[Slow Query ${duration}ms]`, text.substring(0, 100));
      }
      return res;
    } catch (err) {
      attempt++;
      if (attempt <= maxRetries && isTransientError(err)) {
        const backoffMs = Math.min(100 * Math.pow(2, attempt), 1e3);
        console.warn(`[DB Transient Error] Retrying query in ${backoffMs}ms (attempt ${attempt}/${maxRetries}):`, err.message);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      console.error("[DB Query Error]", { query: text.substring(0, 200), params, error: err });
      throw err;
    }
  }
}
async function withTransaction(callback, maxRetries = 1) {
  let attempt = 0;
  while (true) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("[DB Rollback Error]", rollbackErr);
      }
      attempt++;
      if (attempt <= maxRetries && isTransientError(error)) {
        const backoffMs = 200 * attempt;
        console.warn(`[DB Transaction Transient Error] Retrying transaction in ${backoffMs}ms:`, error.message);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

// src/lib/importer/service.ts
import { randomUUID } from "crypto";

// src/lib/importer/spectora/validation.ts
import * as XLSX2 from "xlsx";

// src/lib/importer/spectora/parser.ts
import * as XLSX from "xlsx";

// src/lib/importer/spectora/html.ts
var ALLOWED_TAGS = /* @__PURE__ */ new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "span",
  "div",
  "a"
]);
function sanitizeAndAnalyzeHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== "string") {
    return {
      sanitizedHtml: "",
      hasUnsupportedTags: false,
      unsupportedTags: [],
      linksFound: []
    };
  }
  const unsupportedTagsFound = /* @__PURE__ */ new Set();
  const linksFound = [];
  const tagRegex = /<\/?([a-zA-Z0-9_-]+)([^>]*)>/gi;
  let match;
  while ((match = tagRegex.exec(rawHtml)) !== null) {
    const tagName = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      unsupportedTagsFound.add(tagName);
    }
  }
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(rawHtml)) !== null) {
    const href = linkMatch[2];
    const text = linkMatch[3].replace(/<[^>]+>/g, "").trim();
    if (href) {
      linksFound.push({ href, text });
    }
  }
  let cleaned = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "");
  cleaned = cleaned.replace(/<a\s+([^>]*?)href=(["'])(.*?)\2([^>]*?)>/gi, (_full, before, _q, href, after) => {
    const trimmedHref = href.trim();
    if (/^javascript:/i.test(trimmedHref) || /^data:/i.test(trimmedHref)) {
      return `<span>`;
    }
    const otherAttrs = `${before} ${after}`.replace(/\s+(target|rel)=["'][^"']*["']/gi, "").trim();
    return `<a href="${trimmedHref}" target="_blank" rel="noopener noreferrer"${otherAttrs ? " " + otherAttrs : ""}>`;
  });
  if (!cleaned.trim() && rawHtml.trim()) {
    cleaned = rawHtml.replace(/<[^>]+>/g, "").trim();
  }
  return {
    sanitizedHtml: cleaned,
    hasUnsupportedTags: unsupportedTagsFound.size > 0,
    unsupportedTags: Array.from(unsupportedTagsFound),
    linksFound
  };
}

// src/lib/importer/spectora/preservation.ts
import crypto from "crypto";
function computeSha256(text) {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}
function normalizeTextForFingerprint(text) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}
function buildPreservationAudit(params) {
  const {
    sourceRowsCount,
    recognizedRowsCount,
    unmappedRowsCount,
    sectionsCount,
    itemsCount,
    commentsCount,
    unsupportedHtmlCount,
    sourceNormalizedText,
    parsedNormalizedText,
    unsupportedTagsMap
  } = params;
  const rowScore = sourceRowsCount > 0 ? recognizedRowsCount / sourceRowsCount * 100 : 100;
  const preservationScore = Math.min(100, Math.max(0, Math.round(rowScore * 10) / 10));
  const sourceSha = computeSha256(sourceNormalizedText);
  const parsedSha = computeSha256(parsedNormalizedText);
  const sourceMissingCategories = [
    {
      category: "Inspection Photos & Media",
      description: "Photos, videos, and thermal imaging files",
      reason: "Spectora HTML-Text template exports do not include binary media or photo attachments. Only template text/HTML is exported."
    },
    {
      category: "Client & Inspection Scheduling",
      description: "Customer names, addresses, inspection fees, and calendar dates",
      reason: "This is a reusable master template export, not an active or completed inspection job."
    },
    {
      category: "Service Pricing & Payment Status",
      description: "Service line items, tax rates, and invoice payment statuses",
      reason: "Spectora financial and billing data are isolated in business settings, not template spreadsheets."
    }
  ];
  const importerUnsupportedCategories = Object.entries(unsupportedTagsMap).map(([tag, count]) => ({
    construct: `<${tag}> HTML element`,
    detectedCount: count,
    actionTaken: "Sanitized safely to prevent stylesheet/script injection while preserving text and recording in Import Issues."
  }));
  return {
    sourceRowsCount,
    recognizedRowsCount,
    unmappedRowsCount,
    sectionsCount,
    itemsCount,
    commentsCount,
    unsupportedHtmlCount,
    preservationScore,
    sourceContentSha256: sourceSha,
    parsedContentSha256: parsedSha,
    sourceMissingCategories,
    importerUnsupportedCategories
  };
}

// src/lib/importer/spectora/parser.ts
function cleanHeaderCell(cell) {
  if (cell == null) return "";
  return String(cell).replace(/[*_~`"']/g, "").replace(/[\r\n\t]+/g, " ").replace(/[:*]+$/, "").replace(/\s+/g, " ").trim().toLowerCase();
}
function findHeaderRow(rows) {
  const maxScanRows = Math.min(rows.length, 50);
  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;
    let sectionCol = -1;
    let itemCol = -1;
    let commentCol = -1;
    let htmlTextCol = -1;
    let categoryCol = -1;
    const cleanedCells = row.map(cleanHeaderCell);
    cleanedCells.forEach((val, idx) => {
      if (!val) return;
      const baseVal = val.replace(/\s*\([^)]*\)/g, "").trim();
      if (val === "section" || val === "sections" || val === "section name" || val === "section title" || val === "system" || val === "systems" || val === "system name" || val === "system title" || val === "inspection system" || val === "system / section" || val === "section / system" || val === "system/section" || val === "section/system" || val === "report section" || val === "category name" || val === "inspection category" || val === "category" && sectionCol === -1) {
        sectionCol = idx;
      } else if (val === "item" || val === "items" || val === "item name" || val === "item title" || val === "component" || val === "components" || val === "component name" || val === "component title" || val === "sub-section" || val === "subsection" || val === "sub section" || val === "sub-category" || val === "subcategory" || val === "sub category" || val === "checklist item" || val === "checklist" || val === "inspection item" || val === "item / component" || val === "component / item" || val === "element") {
        itemCol = idx;
      } else if (val === "comment" || val === "comments" || val === "comment name" || val === "comment title" || val === "defect" || val === "defects" || val === "defect name" || val === "defect title" || val === "observation" || val === "observations" || val === "observation name" || val === "observation title" || val === "deficiency" || val === "deficiencies" || val === "deficiency name" || val === "deficiency title" || val === "finding" || val === "findings" || val === "finding name" || val === "finding title" || val === "issue" || val === "issues" || val === "issue name" || val === "issue title" || val === "narrative" || val === "narratives" || val === "narrative title" || val === "title" || val === "summary") {
        commentCol = idx;
      } else if (val === "html text" || val === "html_text" || val === "html" || val === "htmltext" || val === "comment text" || val === "comment body" || val === "comment description" || val === "text" || val === "body" || val === "description" || val === "full description" || val === "rich text" || val === "html content" || val === "defect text" || val === "defect description" || val === "defect narrative" || val === "observation text" || val === "observation description" || val === "observation details" || val === "deficiency text" || val === "deficiency description" || val === "narrative text" || val === "narrative description" || val === "details" || val === "comment details" || val === "notes" || val === "finding text" || val === "full text" || val === "recommendation" || val === "recommendations") {
        htmlTextCol = idx;
      } else if (val === "severity" || val === "severity level" || val === "comment type" || baseVal === "comment type" || val === "defect type" || baseVal === "category" || val === "flag" || val === "type" || val === "priority" || val === "status") {
        categoryCol = idx;
      }
    });
    const hasStructure = sectionCol !== -1 || itemCol !== -1;
    const hasContent = commentCol !== -1 || htmlTextCol !== -1;
    if (hasStructure && hasContent) {
      return {
        headerIndex: r,
        colMap: { sectionCol, itemCol, commentCol, htmlTextCol, categoryCol }
      };
    }
  }
  return null;
}
function parseSpectoraWorkbook(workbook, options = {}) {
  const filename = options.filename || "Spreadsheet-Template.xlsx";
  const issues = [];
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("Workbook contains no sheets.");
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" could not be read.`);
  }
  const rawMatrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false
  });
  if (rawMatrix.length === 0) {
    throw new Error("Spreadsheet appears to be completely empty.");
  }
  const headerInfo = findHeaderRow(rawMatrix);
  if (!headerInfo) {
    throw new Error(
      'Missing required Spectora column headers. Expected at least "Section", "Item", and "Comment" or "HTML Text".'
    );
  }
  const { headerIndex, colMap } = headerInfo;
  const dataRows = rawMatrix.slice(headerIndex + 1);
  const sections = [];
  let currentSection = null;
  let currentItem = null;
  let sectionPos = 1;
  let itemPos = 1;
  let commentPos = 1;
  let recognizedRows = 0;
  let unmappedRows = 0;
  let unsupportedHtmlCount = 0;
  const unsupportedTagsMap = {};
  const sourceNormalizedChunks = [];
  const parsedNormalizedChunks = [];
  dataRows.forEach((row, idx) => {
    const rowNumber = headerIndex + 2 + idx;
    const rawSection = colMap.sectionCol !== -1 ? String(row[colMap.sectionCol] || "").trim() : "";
    const rawItem = colMap.itemCol !== -1 ? String(row[colMap.itemCol] || "").trim() : "";
    const rawComment = colMap.commentCol !== -1 ? String(row[colMap.commentCol] || "").trim() : "";
    const rawHtml = colMap.htmlTextCol !== -1 ? String(row[colMap.htmlTextCol] || "").trim() : "";
    if (!rawSection && !rawItem && !rawComment && !rawHtml) {
      return;
    }
    const rowRawCombined = `${rawSection} ${rawItem} ${rawComment} ${rawHtml}`.trim();
    sourceNormalizedChunks.push(normalizeTextForFingerprint(rowRawCombined));
    if (rawSection.toUpperCase().includes("METADATA") || rawSection && !rawItem && !rawComment && !rawHtml && rawSection.length > 50) {
      unmappedRows++;
      issues.push({
        severity: "INFO",
        category: "SOURCE_METADATA_ONLY",
        source_location: `Sheet "${sheetName}", Row ${rowNumber}`,
        source_row: rowNumber,
        original_content: rowRawCombined,
        message: `Preserved non-structural metadata row: "${rawSection.slice(0, 60)}..."`,
        resolution_status: "UNRESOLVED"
      });
      return;
    }
    let sectionName = rawSection;
    let itemName = rawItem;
    if (!sectionName && currentSection) {
      sectionName = currentSection.name;
    }
    if (!itemName && currentItem) {
      itemName = currentItem.name;
    }
    if (!sectionName) {
      unmappedRows++;
      issues.push({
        severity: "WARNING",
        category: "UNKNOWN_ROW",
        source_location: `Sheet "${sheetName}", Row ${rowNumber}`,
        source_row: rowNumber,
        original_content: rowRawCombined,
        message: `Row ${rowNumber} has comment text but no parent Section could be determined. Preserved in Import Issues.`,
        resolution_status: "UNRESOLVED"
      });
      return;
    }
    recognizedRows++;
    if (!currentSection || currentSection.name.toLowerCase() !== sectionName.toLowerCase()) {
      const existing = sections.find((s) => s.name.toLowerCase() === sectionName.toLowerCase());
      if (existing) {
        currentSection = existing;
      } else {
        currentSection = {
          name: sectionName,
          source_name: sectionName,
          position: sectionPos++,
          source_identifier: `SEC-${sectionPos - 1}`,
          source_row: rowNumber,
          items: []
        };
        sections.push(currentSection);
        itemPos = 1;
        currentItem = null;
      }
    }
    if (itemName) {
      if (!currentItem || currentItem.name.toLowerCase() !== itemName.toLowerCase() || !currentSection.items.includes(currentItem)) {
        const existingItem = currentSection.items.find((i) => i.name.toLowerCase() === itemName.toLowerCase());
        if (existingItem) {
          currentItem = existingItem;
        } else {
          currentItem = {
            name: itemName,
            source_name: itemName,
            position: itemPos++,
            source_identifier: `ITEM-${currentSection.position}-${itemPos - 1}`,
            source_row: rowNumber,
            comments: []
          };
          currentSection.items.push(currentItem);
          commentPos = 1;
        }
      }
    } else if (!currentItem) {
      currentItem = {
        name: `${currentSection.name} General`,
        source_name: `${currentSection.name} General`,
        position: itemPos++,
        source_identifier: `ITEM-${currentSection.position}-${itemPos - 1}`,
        source_row: rowNumber,
        comments: []
      };
      currentSection.items.push(currentItem);
      commentPos = 1;
    }
    const commentContent = rawHtml || rawComment;
    if (commentContent) {
      const htmlAnalysis = sanitizeAndAnalyzeHtml(commentContent);
      if (htmlAnalysis.hasUnsupportedTags) {
        unsupportedHtmlCount++;
        htmlAnalysis.unsupportedTags.forEach((tag) => {
          unsupportedTagsMap[tag] = (unsupportedTagsMap[tag] || 0) + 1;
        });
        issues.push({
          severity: "WARNING",
          category: "UNSUPPORTED_HTML",
          source_location: `Row ${rowNumber} [${sectionName} \u2192 ${currentItem.name}]`,
          source_row: rowNumber,
          original_content: commentContent.slice(0, 140),
          message: `Comment contains unsupported HTML tags (${htmlAnalysis.unsupportedTags.map((t) => `<${t}>`).join(", ")}). Formatting was safely sanitized while preserving text.`,
          resolution_status: "UNRESOLVED"
        });
      }
      const parsedComment = {
        content_html: htmlAnalysis.sanitizedHtml,
        source_content_html: commentContent,
        position: commentPos++,
        source_identifier: `CMT-${currentSection.position}-${currentItem.position}-${commentPos - 1}`,
        source_row: rowNumber,
        has_unsupported_tags: htmlAnalysis.hasUnsupportedTags,
        unsupported_tags: htmlAnalysis.unsupportedTags
      };
      currentItem.comments.push(parsedComment);
      parsedNormalizedChunks.push(normalizeTextForFingerprint(htmlAnalysis.sanitizedHtml));
    }
  });
  let totalSections = sections.length;
  let totalItems = 0;
  let totalComments = 0;
  sections.forEach((s) => {
    totalItems += s.items.length;
    s.items.forEach((i) => {
      totalComments += i.comments.length;
    });
  });
  const audit = buildPreservationAudit({
    sourceRowsCount: dataRows.length,
    recognizedRowsCount: recognizedRows,
    unmappedRowsCount: unmappedRows,
    sectionsCount: totalSections,
    itemsCount: totalItems,
    commentsCount: totalComments,
    unsupportedHtmlCount,
    sourceNormalizedText: sourceNormalizedChunks.join(" "),
    parsedNormalizedText: parsedNormalizedChunks.join(" "),
    unsupportedTagsMap
  });
  let templateName = options.templateNameOverride || "";
  if (!templateName) {
    const cleanBase = filename.replace(/\.(xlsx|xls)$/i, "").replace(/[-_]+/g, " ").trim();
    if (cleanBase.toLowerCase().includes("internachi") && cleanBase.toLowerCase().includes("residential")) {
      templateName = "InterNACHI Residential";
    } else if (cleanBase.length > 0) {
      templateName = cleanBase.split(" ").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    } else {
      templateName = "Spectora Inspection Template";
    }
  }
  return {
    name: templateName,
    description: `Imported from ${filename} on ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
    source_type: "spectora_xlsx",
    source_filename: filename,
    source_template_name: templateName,
    sections,
    issues,
    metrics: {
      totalSourceRows: audit.sourceRowsCount,
      recognizedRows: audit.recognizedRowsCount,
      unmappedRows: audit.unmappedRowsCount,
      sectionsCount: audit.sectionsCount,
      itemsCount: audit.itemsCount,
      commentsCount: audit.commentsCount,
      unsupportedHtmlCount: audit.unsupportedHtmlCount,
      preservationScore: audit.preservationScore,
      sourceSha256: audit.sourceContentSha256,
      parsedSha256: audit.parsedContentSha256
    }
  };
}

// src/lib/importer/spectora/validation.ts
function validateSpreadsheetBuffer(buffer) {
  const errors = [];
  const warnings = [];
  const u8 = buffer instanceof Buffer ? buffer : new Uint8Array(buffer);
  if (u8.length < 50) {
    return {
      isValid: false,
      errors: ["Could not read spreadsheet file. The file is too small or empty to be a valid Excel spreadsheet."],
      warnings: []
    };
  }
  const isZip = u8[0] === 80 && u8[1] === 75;
  const isOle = u8[0] === 208 && u8[1] === 207 && u8[2] === 17 && u8[3] === 224;
  if (!isZip && !isOle) {
    return {
      isValid: false,
      errors: [
        "Could not read spreadsheet file. The uploaded file is not a valid Microsoft Excel (.xlsx / .xls) spreadsheet format."
      ],
      warnings: []
    };
  }
  let workbook;
  try {
    workbook = XLSX2.read(buffer, { type: "buffer" });
  } catch (err) {
    return {
      isValid: false,
      errors: [
        `Could not read spreadsheet file. Please ensure this is a valid Microsoft Excel (.xlsx / .xls) file. Technical reason: ${err.message || "Corrupted binary format"}`
      ],
      warnings: []
    };
  }
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      isValid: false,
      errors: ["The workbook does not contain any readable worksheets."],
      warnings: []
    };
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return {
      isValid: false,
      errors: [`The first sheet "${sheetName}" is empty or inaccessible.`],
      warnings: []
    };
  }
  const rows = XLSX2.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (rows.length === 0) {
    return {
      isValid: false,
      errors: ["The spreadsheet contains no data rows."],
      warnings: []
    };
  }
  const headerInfo = findHeaderRow(rows);
  if (!headerInfo) {
    const firstRowSample = rows[0] ? rows[0].slice(0, 8).join(", ") : "None";
    return {
      isValid: false,
      errors: [
        `Required Spectora column headers were not found in the first 50 rows.`,
        `Found headers/content in first row: [${firstRowSample}].`,
        `Expected headers: Section (or System), Item (or Component), and Comment (or Defect / HTML Text).`,
        `How to fix: Verify this file was exported via Spectora: Template Settings \u2192 "Export to spreadsheet" or "Export HTML Text".`
      ],
      warnings: []
    };
  }
  const detectedHeaders = rows[headerInfo.headerIndex]?.map(String) || [];
  if (rows.length - headerInfo.headerIndex - 1 <= 0) {
    warnings.push("The sheet contains headers but no inspection rows below the header row.");
  }
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    workbook,
    detectedHeaders,
    sheetNames: workbook.SheetNames
  };
}
function validateParsedTemplate(parsed) {
  const errors = [];
  if (!parsed || typeof parsed !== "object") {
    return {
      isValid: false,
      errors: ["Invalid template data: expected an object but received null or non-object."]
    };
  }
  if (!parsed.name || typeof parsed.name !== "string" || !parsed.name.trim()) {
    errors.push("Template name is required and must be a non-empty string.");
  } else if (parsed.name.length > 255) {
    errors.push(`Template name exceeds maximum allowed length of 255 characters (current: ${parsed.name.length}).`);
  }
  if (!Array.isArray(parsed.sections)) {
    errors.push("Template sections must be an array.");
    return { isValid: false, errors };
  }
  if (parsed.sections.length === 0) {
    errors.push("Template must contain at least one valid inspection section (system).");
  }
  parsed.sections.forEach((section, secIdx) => {
    const secPrefix = `Section[${secIdx}]`;
    if (!section || typeof section !== "object") {
      errors.push(`${secPrefix}: must be a valid object.`);
      return;
    }
    if (!section.name || typeof section.name !== "string" || !section.name.trim()) {
      errors.push(`${secPrefix}: missing required section name.`);
    }
    if (typeof section.position !== "number" || !Number.isInteger(section.position) || section.position < 1) {
      errors.push(`${secPrefix} ("${section.name || "Unnamed"}"): position must be a positive integer >= 1 (got: ${section.position}).`);
    }
    if (!Array.isArray(section.items)) {
      errors.push(`${secPrefix} ("${section.name || "Unnamed"}"): items must be an array.`);
      return;
    }
    section.items.forEach((item, itmIdx) => {
      const itmPrefix = `${secPrefix} -> Item[${itmIdx}]`;
      if (!item || typeof item !== "object") {
        errors.push(`${itmPrefix}: must be a valid object.`);
        return;
      }
      if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
        errors.push(`${itmPrefix}: missing required item name in section "${section.name}".`);
      }
      if (typeof item.position !== "number" || !Number.isInteger(item.position) || item.position < 1) {
        errors.push(`${itmPrefix} ("${item.name || "Unnamed"}"): position must be a positive integer >= 1 (got: ${item.position}).`);
      }
      if (!Array.isArray(item.comments)) {
        errors.push(`${itmPrefix} ("${item.name || "Unnamed"}"): comments must be an array.`);
        return;
      }
      item.comments.forEach((comment, cmtIdx) => {
        const cmtPrefix = `${itmPrefix} -> Comment[${cmtIdx}]`;
        if (!comment || typeof comment !== "object") {
          errors.push(`${cmtPrefix}: must be a valid object.`);
          return;
        }
        if (comment.content_html !== void 0 && typeof comment.content_html !== "string") {
          errors.push(`${cmtPrefix}: content_html must be a string.`);
        }
        if (typeof comment.position !== "number" || !Number.isInteger(comment.position) || comment.position < 1) {
          errors.push(`${cmtPrefix}: position must be a positive integer >= 1 (got: ${comment.position}).`);
        }
      });
    });
  });
  return {
    isValid: errors.length === 0,
    errors
  };
}

// src/lib/importer/service.ts
async function executeBatchInsert(client, table, columns, rows, batchSize = 100) {
  if (rows.length === 0) return;
  const colCount = columns.length;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = [];
    const values = [];
    batch.forEach((row, rIdx) => {
      const offset = rIdx * colCount;
      const ph = Array.from({ length: colCount }, (_, cIdx) => `$${offset + cIdx + 1}`);
      placeholders.push(`(${ph.join(", ")})`);
      values.push(...row);
    });
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}`;
    await client.query(sql, values);
  }
}
async function listTemplates() {
  const result = await query(
    `SELECT 
      id, name, description, source_type, source_filename, source_template_name,
      imported_at, created_at, updated_at, parent_template_id, copied_from_template_id,
      status, total_sections, total_items, total_comments, preservation_score
    FROM templates 
    ORDER BY created_at DESC`
  );
  return result.rows;
}
async function getTemplateWithHierarchy(templateId) {
  const tplRes = await query(
    `SELECT * FROM templates WHERE id = $1`,
    [templateId]
  );
  if (tplRes.rows.length === 0) return null;
  const template = tplRes.rows[0];
  const secRes = await query(
    `SELECT * FROM sections WHERE template_id = $1 ORDER BY position ASC`,
    [templateId]
  );
  const sections = secRes.rows;
  if (sections.length > 0) {
    const secIds = sections.map((s) => s.id);
    const itemRes = await query(
      `SELECT * FROM items WHERE section_id = ANY($1::uuid[]) ORDER BY position ASC`,
      [secIds]
    );
    const items = itemRes.rows;
    if (items.length > 0) {
      const itemIds = items.map((i) => i.id);
      const commentRes = await query(
        `SELECT * FROM comments WHERE item_id = ANY($1::uuid[]) ORDER BY position ASC`,
        [itemIds]
      );
      const comments = commentRes.rows;
      const commentMap = /* @__PURE__ */ new Map();
      for (const c of comments) {
        if (!commentMap.has(c.item_id)) commentMap.set(c.item_id, []);
        commentMap.get(c.item_id).push(c);
      }
      for (const item of items) {
        item.comments = commentMap.get(item.id) || [];
      }
    } else {
      for (const item of items) {
        item.comments = [];
      }
    }
    const itemMap = /* @__PURE__ */ new Map();
    for (const item of items) {
      if (!itemMap.has(item.section_id)) itemMap.set(item.section_id, []);
      itemMap.get(item.section_id).push(item);
    }
    for (const sec of sections) {
      sec.items = itemMap.get(sec.id) || [];
    }
  }
  const issueRes = await query(
    `SELECT * FROM import_issues WHERE template_id = $1 ORDER BY created_at ASC`,
    [templateId]
  );
  template.sections = sections;
  template.issues = issueRes.rows;
  return template;
}
async function saveImportedTemplate(parsed, options) {
  const validation = validateParsedTemplate(parsed);
  if (!validation.isValid) {
    throw new Error(`Template validation failed before persistence: ${validation.errors.join("; ")}`);
  }
  return await withTransaction(async (client) => {
    const templateId = randomUUID();
    const tplInsert = await client.query(
      `INSERT INTO templates (
        id, name, description, source_type, source_filename, source_template_name,
        parent_template_id, copied_from_template_id, status,
        total_sections, total_items, total_comments, preservation_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        templateId,
        parsed.name,
        parsed.description || null,
        parsed.source_type || "spectora_xlsx",
        parsed.source_filename || null,
        parsed.source_template_name || parsed.name,
        options?.parentTemplateId || null,
        options?.copiedFromTemplateId || null,
        "active",
        parsed.metrics.sectionsCount,
        parsed.metrics.itemsCount,
        parsed.metrics.commentsCount,
        parsed.metrics.preservationScore
      ]
    );
    const template = tplInsert.rows[0];
    const sectionRows = [];
    const itemRows = [];
    const commentRows = [];
    for (const section of parsed.sections) {
      const sectionId = randomUUID();
      sectionRows.push([
        sectionId,
        templateId,
        section.name,
        section.position,
        section.source_identifier || null,
        section.source_row || null,
        section.source_name || section.name
      ]);
      for (const item of section.items) {
        const itemId = randomUUID();
        itemRows.push([
          itemId,
          sectionId,
          item.name,
          item.position,
          item.source_identifier || null,
          item.source_row || null,
          item.source_name || item.name
        ]);
        for (const comment of item.comments) {
          const commentId = randomUUID();
          commentRows.push([
            commentId,
            itemId,
            comment.content_html,
            comment.source_content_html,
            comment.position,
            comment.source_identifier || null,
            comment.source_row || null,
            comment.has_unsupported_tags,
            comment.unsupported_tags || []
          ]);
        }
      }
    }
    await executeBatchInsert(
      client,
      "sections",
      ["id", "template_id", "name", "position", "source_identifier", "source_row", "source_name"],
      sectionRows
    );
    await executeBatchInsert(
      client,
      "items",
      ["id", "section_id", "name", "position", "source_identifier", "source_row", "source_name"],
      itemRows
    );
    await executeBatchInsert(
      client,
      "comments",
      [
        "id",
        "item_id",
        "content_html",
        "source_content_html",
        "position",
        "source_identifier",
        "source_row",
        "has_unsupported_tags",
        "unsupported_tags"
      ],
      commentRows
    );
    if (parsed.issues && parsed.issues.length > 0) {
      const issueRows = parsed.issues.map((issue) => [
        randomUUID(),
        templateId,
        issue.severity,
        issue.category,
        issue.source_location || null,
        issue.source_row || null,
        issue.original_content || null,
        issue.message,
        issue.resolution_status || "UNRESOLVED"
      ]);
      await executeBatchInsert(
        client,
        "import_issues",
        [
          "id",
          "template_id",
          "severity",
          "category",
          "source_location",
          "source_row",
          "original_content",
          "message",
          "resolution_status"
        ],
        issueRows
      );
    }
    return template;
  });
}
async function duplicateTemplateTransaction(sourceTemplateId, customName) {
  return await withTransaction(async (client) => {
    const sourceTplRes = await client.query(
      `SELECT * FROM templates WHERE id = $1`,
      [sourceTemplateId]
    );
    if (sourceTplRes.rows.length === 0) {
      throw new Error(`Source template "${sourceTemplateId}" does not exist.`);
    }
    const source = sourceTplRes.rows[0];
    const newTemplateId = randomUUID();
    const newName = customName || `${source.name} Copy`;
    const newTplRes = await client.query(
      `INSERT INTO templates (
        id, name, description, source_type, source_filename, source_template_name,
        parent_template_id, copied_from_template_id, status,
        total_sections, total_items, total_comments, preservation_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        newTemplateId,
        newName,
        source.description ? `${source.description} (Duplicate)` : null,
        source.source_type,
        source.source_filename,
        source.source_template_name,
        source.parent_template_id || source.id,
        source.id,
        "active",
        source.total_sections,
        source.total_items,
        source.total_comments,
        source.preservation_score
      ]
    );
    const newTemplate = newTplRes.rows[0];
    const secRes = await client.query(
      `SELECT * FROM sections WHERE template_id = $1 ORDER BY position ASC`,
      [sourceTemplateId]
    );
    const oldToNewSectionMap = /* @__PURE__ */ new Map();
    const newSectionRows = [];
    for (const sec of secRes.rows) {
      const newSecId = randomUUID();
      oldToNewSectionMap.set(sec.id, newSecId);
      newSectionRows.push([
        newSecId,
        newTemplateId,
        sec.name,
        sec.position,
        sec.source_identifier,
        sec.source_row,
        sec.source_name
      ]);
    }
    await executeBatchInsert(
      client,
      "sections",
      ["id", "template_id", "name", "position", "source_identifier", "source_row", "source_name"],
      newSectionRows
    );
    const oldSectionIds = Array.from(oldToNewSectionMap.keys());
    if (oldSectionIds.length > 0) {
      const itemRes = await client.query(
        `SELECT * FROM items WHERE section_id = ANY($1::uuid[]) ORDER BY position ASC`,
        [oldSectionIds]
      );
      const oldToNewItemMap = /* @__PURE__ */ new Map();
      const newItemRows = [];
      for (const item of itemRes.rows) {
        const newItemId = randomUUID();
        oldToNewItemMap.set(item.id, newItemId);
        const newSecId = oldToNewSectionMap.get(item.section_id);
        newItemRows.push([
          newItemId,
          newSecId,
          item.name,
          item.position,
          item.source_identifier,
          item.source_row,
          item.source_name
        ]);
      }
      await executeBatchInsert(
        client,
        "items",
        ["id", "section_id", "name", "position", "source_identifier", "source_row", "source_name"],
        newItemRows
      );
      const oldItemIds = Array.from(oldToNewItemMap.keys());
      if (oldItemIds.length > 0) {
        const cmtRes = await client.query(
          `SELECT * FROM comments WHERE item_id = ANY($1::uuid[]) ORDER BY position ASC`,
          [oldItemIds]
        );
        const newCommentRows = cmtRes.rows.map((c) => [
          randomUUID(),
          oldToNewItemMap.get(c.item_id),
          c.content_html,
          c.source_content_html,
          c.position,
          c.source_identifier,
          c.source_row,
          c.has_unsupported_tags,
          c.unsupported_tags
        ]);
        await executeBatchInsert(
          client,
          "comments",
          [
            "id",
            "item_id",
            "content_html",
            "source_content_html",
            "position",
            "source_identifier",
            "source_row",
            "has_unsupported_tags",
            "unsupported_tags"
          ],
          newCommentRows
        );
      }
    }
    const issueRes = await client.query(
      `SELECT * FROM import_issues WHERE template_id = $1`,
      [sourceTemplateId]
    );
    if (issueRes.rows.length > 0) {
      const newIssueRows = issueRes.rows.map((issue) => [
        randomUUID(),
        newTemplateId,
        issue.severity,
        issue.category,
        issue.source_location,
        issue.source_row,
        issue.original_content,
        issue.message,
        issue.resolution_status
      ]);
      await executeBatchInsert(
        client,
        "import_issues",
        [
          "id",
          "template_id",
          "severity",
          "category",
          "source_location",
          "source_row",
          "original_content",
          "message",
          "resolution_status"
        ],
        newIssueRows
      );
    }
    return newTemplate;
  });
}

// src/server/app.ts
try {
  if (!process.env.VERCEL) {
    dns2.setDefaultResultOrder("verbatim");
  }
} catch {
}
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
  // 30MB
});
var app = express();
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
var router = express.Router();
router.param("id", (_req, res, next, id) => {
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: `Invalid UUID identifier format: "${id}"` });
  }
  next();
});
router.get("/health", async (_req, res) => {
  try {
    const dbCheck = await query("SELECT 1 as connected");
    res.json({
      status: "ok",
      service: "InspectionCore API",
      database: dbCheck.rows.length > 0 ? "connected" : "degraded",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: err.message
    });
  }
});
router.get("/templates", async (_req, res) => {
  try {
    const templates = await listTemplates();
    res.json({ templates });
  } catch (err) {
    console.error("Failed to list templates:", err);
    res.status(500).json({ error: "Failed to retrieve templates" });
  }
});
router.get("/templates/:id", async (req, res) => {
  try {
    const template = await getTemplateWithHierarchy(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json({ template });
  } catch (err) {
    console.error("Failed to get template:", err);
    res.status(500).json({ error: "Failed to retrieve template details" });
  }
});
router.get("/fixture/download", (_req, res) => {
  const fixturePath = path.join(process.cwd(), "fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx");
  if (!fs.existsSync(fixturePath)) {
    return res.status(404).json({ error: "Fixture file not found on server" });
  }
  res.download(fixturePath, "InterNACHI-Residential-HTML-Text.xlsx");
});
router.post("/templates/preview", upload.single("file"), async (req, res) => {
  try {
    let buffer = null;
    let filename = "Uploaded-Template.xlsx";
    if (req.file) {
      buffer = req.file.buffer;
      filename = req.file.originalname;
    } else if (req.body.fileBase64) {
      buffer = Buffer.from(req.body.fileBase64, "base64");
      if (req.body.filename) filename = req.body.filename;
    }
    if (!buffer) {
      return res.status(400).json({
        error: "No file provided. Please upload a .xlsx spreadsheet file."
      });
    }
    const validation = validateSpreadsheetBuffer(buffer);
    if (!validation.isValid) {
      return res.status(422).json({
        error: "Invalid spreadsheet file",
        details: validation.errors,
        warnings: validation.warnings
      });
    }
    const parsed = parseSpectoraWorkbook(validation.workbook, {
      filename,
      templateNameOverride: req.body.nameOverride
    });
    res.json({
      preview: parsed,
      validation: {
        isValid: true,
        warnings: validation.warnings,
        detectedHeaders: validation.detectedHeaders
      }
    });
  } catch (err) {
    console.error("Preview failed:", err);
    res.status(500).json({
      error: err.message || "Failed to process spreadsheet preview"
    });
  }
});
router.post("/templates/import", upload.single("file"), async (req, res) => {
  try {
    let parsedData = req.body.parsed;
    if (typeof parsedData === "string") {
      try {
        parsedData = JSON.parse(parsedData);
      } catch {
        parsedData = null;
      }
    }
    if (!parsedData && (req.file || req.body.fileBase64)) {
      let buffer = req.file ? req.file.buffer : Buffer.from(req.body.fileBase64, "base64");
      const filename = req.file ? req.file.originalname : req.body.filename || "Template.xlsx";
      const validation = validateSpreadsheetBuffer(buffer);
      if (!validation.isValid) {
        return res.status(422).json({ error: "Validation failed", details: validation.errors });
      }
      parsedData = parseSpectoraWorkbook(validation.workbook, {
        filename,
        templateNameOverride: req.body.nameOverride
      });
    }
    if (!parsedData) {
      return res.status(400).json({ error: "Missing parsed template data to commit." });
    }
    const structVal = validateParsedTemplate(parsedData);
    if (!structVal.isValid) {
      return res.status(422).json({
        error: "Template structure validation failed before persistence",
        details: structVal.errors
      });
    }
    const template = await saveImportedTemplate(parsedData);
    res.status(201).json({ template, message: "Template successfully imported and saved." });
  } catch (err) {
    console.error("Import commit failed:", err);
    res.status(500).json({ error: err.message || "Failed to commit template to database" });
  }
});
router.post("/templates/:id/duplicate", async (req, res) => {
  try {
    const templateId = req.params.id;
    const customName = req.body.name;
    const newTemplate = await duplicateTemplateTransaction(templateId, customName);
    res.status(201).json({ template: newTemplate, message: "Template duplicated successfully" });
  } catch (err) {
    console.error("Duplication failed:", err);
    res.status(500).json({ error: err.message || "Failed to duplicate template" });
  }
});
router.post("/templates", async (req, res) => {
  try {
    const { name, description, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Template name is required" });
    }
    const result = await query(
      `INSERT INTO templates (name, description, status, source_type, preservation_score)
       VALUES ($1, $2, $3, 'custom', '100.0') RETURNING *`,
      [name.trim(), description?.trim() || null, status || "active"]
    );
    res.status(201).json({ template: result.rows[0], message: "Template created successfully" });
  } catch (err) {
    console.error("Create template failed:", err);
    res.status(500).json({ error: err.message || "Failed to create template" });
  }
});
router.patch("/templates/:id", async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (name !== void 0) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (description !== void 0) {
      updates.push(`description = $${idx++}`);
      values.push(description ? description.trim() : null);
    }
    if (status !== void 0) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    updates.push(`updated_at = now()`);
    values.push(req.params.id);
    const result = await query(
      `UPDATE templates SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json({ template: result.rows[0] });
  } catch (err) {
    console.error("Template update failed:", err);
    res.status(500).json({ error: "Failed to update template" });
  }
});
router.delete("/templates/:id", async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM templates WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json({ success: true, message: "Template deleted" });
  } catch (err) {
    console.error("Delete template failed:", err);
    res.status(500).json({ error: "Failed to delete template" });
  }
});
router.patch("/sections/:id", async (req, res) => {
  try {
    const { name, position } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (name !== void 0) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (position !== void 0) {
      updates.push(`position = $${idx++}`);
      values.push(position);
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    updates.push(`updated_at = now()`);
    values.push(req.params.id);
    const result = await query(
      `UPDATE sections SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Section not found" });
    res.json({ section: result.rows[0] });
  } catch (err) {
    console.error("Update section failed:", err);
    res.status(500).json({ error: "Failed to update section" });
  }
});
router.post("/sections", async (req, res) => {
  try {
    const { template_id, name, position } = req.body;
    if (!template_id || !name) {
      return res.status(400).json({ error: "template_id and name are required" });
    }
    let pos = position;
    if (pos === void 0) {
      const countRes = await query(
        `SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM sections WHERE template_id = $1`,
        [template_id]
      );
      pos = countRes.rows[0].next_pos;
    }
    const result = await query(
      `INSERT INTO sections (template_id, name, position) VALUES ($1, $2, $3) RETURNING *`,
      [template_id, name.trim(), pos]
    );
    await query(
      `UPDATE templates SET total_sections = (SELECT COUNT(*) FROM sections WHERE template_id = $1), updated_at = now() WHERE id = $1`,
      [template_id]
    );
    res.status(201).json({ section: result.rows[0] });
  } catch (err) {
    console.error("Create section failed:", err);
    res.status(500).json({ error: "Failed to create section" });
  }
});
router.delete("/sections/:id", async (req, res) => {
  try {
    const secRes = await query(`DELETE FROM sections WHERE id = $1 RETURNING template_id`, [req.params.id]);
    if (secRes.rows.length === 0) return res.status(404).json({ error: "Section not found" });
    const tplId = secRes.rows[0].template_id;
    await query(
      `UPDATE templates SET 
        total_sections = (SELECT COUNT(*) FROM sections WHERE template_id = $1),
        total_items = (SELECT COUNT(i.*) FROM items i JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        total_comments = (SELECT COUNT(c.*) FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        updated_at = now()
      WHERE id = $1`,
      [tplId]
    );
    res.json({ success: true, message: "Section deleted" });
  } catch (err) {
    console.error("Delete section failed:", err);
    res.status(500).json({ error: "Failed to delete section" });
  }
});
router.patch("/items/:id", async (req, res) => {
  try {
    const { name, position } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (name !== void 0) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (position !== void 0) {
      updates.push(`position = $${idx++}`);
      values.push(position);
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    updates.push(`updated_at = now()`);
    values.push(req.params.id);
    const result = await query(
      `UPDATE items SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Item not found" });
    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error("Update item failed:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});
router.post("/items", async (req, res) => {
  try {
    const { section_id, name, position } = req.body;
    if (!section_id || !name) {
      return res.status(400).json({ error: "section_id and name are required" });
    }
    let pos = position;
    if (pos === void 0) {
      const countRes = await query(
        `SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM items WHERE section_id = $1`,
        [section_id]
      );
      pos = countRes.rows[0].next_pos;
    }
    const result = await query(
      `INSERT INTO items (section_id, name, position) VALUES ($1, $2, $3) RETURNING *`,
      [section_id, name.trim(), pos]
    );
    await query(
      `UPDATE templates SET 
        total_items = (SELECT COUNT(i.*) FROM items i JOIN sections s ON i.section_id = s.id WHERE s.template_id = templates.id),
        updated_at = now()
      WHERE id = (SELECT template_id FROM sections WHERE id = $1)`,
      [section_id]
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error("Create item failed:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});
router.delete("/items/:id", async (req, res) => {
  try {
    const itemRes = await query(
      `SELECT s.template_id FROM items i JOIN sections s ON i.section_id = s.id WHERE i.id = $1`,
      [req.params.id]
    );
    if (itemRes.rows.length === 0) return res.status(404).json({ error: "Item not found" });
    const tplId = itemRes.rows[0].template_id;
    await query(`DELETE FROM items WHERE id = $1`, [req.params.id]);
    await query(
      `UPDATE templates SET 
        total_items = (SELECT COUNT(i.*) FROM items i JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        total_comments = (SELECT COUNT(c.*) FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        updated_at = now()
      WHERE id = $1`,
      [tplId]
    );
    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    console.error("Delete item failed:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});
router.patch("/comments/:id", async (req, res) => {
  try {
    const { content_html, position } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (content_html !== void 0) {
      const analyzed = sanitizeAndAnalyzeHtml(content_html);
      updates.push(`content_html = $${idx++}`);
      values.push(analyzed.sanitizedHtml);
      updates.push(`has_unsupported_tags = $${idx++}`);
      values.push(analyzed.hasUnsupportedTags);
      updates.push(`unsupported_tags = $${idx++}`);
      values.push(analyzed.unsupportedTags);
    }
    if (position !== void 0) {
      updates.push(`position = $${idx++}`);
      values.push(position);
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    updates.push(`updated_at = now()`);
    values.push(req.params.id);
    const result = await query(
      `UPDATE comments SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Comment not found" });
    res.json({ comment: result.rows[0] });
  } catch (err) {
    console.error("Update comment failed:", err);
    res.status(500).json({ error: "Failed to update comment" });
  }
});
router.post("/comments", async (req, res) => {
  try {
    const { item_id, content_html, position } = req.body;
    if (!item_id || content_html === void 0) {
      return res.status(400).json({ error: "item_id and content_html are required" });
    }
    const analyzed = sanitizeAndAnalyzeHtml(content_html);
    let pos = position;
    if (pos === void 0) {
      const countRes = await query(
        `SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM comments WHERE item_id = $1`,
        [item_id]
      );
      pos = countRes.rows[0].next_pos;
    }
    const result = await query(
      `INSERT INTO comments (
        item_id, content_html, source_content_html, position,
        has_unsupported_tags, unsupported_tags
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        item_id,
        analyzed.sanitizedHtml,
        content_html,
        pos,
        analyzed.hasUnsupportedTags,
        analyzed.unsupportedTags
      ]
    );
    await query(
      `UPDATE templates SET 
        total_comments = (SELECT COUNT(c.*) FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE s.template_id = templates.id),
        updated_at = now()
      WHERE id = (SELECT s.template_id FROM items i JOIN sections s ON i.section_id = s.id WHERE i.id = $1)`,
      [item_id]
    );
    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    console.error("Create comment failed:", err);
    res.status(500).json({ error: "Failed to create comment" });
  }
});
router.delete("/comments/:id", async (req, res) => {
  try {
    const cmtRes = await query(
      `SELECT s.template_id FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE c.id = $1`,
      [req.params.id]
    );
    if (cmtRes.rows.length === 0) return res.status(404).json({ error: "Comment not found" });
    const tplId = cmtRes.rows[0].template_id;
    await query(`DELETE FROM comments WHERE id = $1`, [req.params.id]);
    await query(
      `UPDATE templates SET 
        total_comments = (SELECT COUNT(c.*) FROM comments c JOIN items i ON c.item_id = i.id JOIN sections s ON i.section_id = s.id WHERE s.template_id = $1),
        updated_at = now()
      WHERE id = $1`,
      [tplId]
    );
    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment failed:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});
router.patch("/issues/:id", async (req, res) => {
  try {
    const { resolution_status } = req.body;
    if (!["UNRESOLVED", "RESOLVED", "DISMISSED"].includes(resolution_status)) {
      return res.status(400).json({ error: "Invalid resolution_status" });
    }
    const result = await query(
      `UPDATE import_issues SET resolution_status = $1 WHERE id = $2 RETURNING *`,
      [resolution_status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Issue not found" });
    res.json({ issue: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update issue status" });
  }
});
router.post("/seed", async (_req, res) => {
  try {
    const fixturePath = path.join(process.cwd(), "fixtures/spectora/InterNACHI-Residential-HTML-Text.xlsx");
    if (!fs.existsSync(fixturePath)) {
      return res.status(404).json({ error: "Fixture file not found" });
    }
    const buffer = fs.readFileSync(fixturePath);
    const wb = XLSX3.read(buffer, { type: "buffer" });
    const parsed = parseSpectoraWorkbook(wb, { filename: "InterNACHI-Residential-HTML-Text.xlsx" });
    const template = await saveImportedTemplate(parsed);
    res.json({ message: "Seeded successfully", template });
  } catch (err) {
    console.error("Seed endpoint failed:", err);
    res.status(500).json({ error: err.message });
  }
});
app.use("/api", router);
app.use("/", router);
app.use((err, _req, res, _next) => {
  console.error("[API Uncaught Error]", err);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large. Maximum size is 30MB." });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Malformed JSON payload." });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_ERROR"
  });
});
var app_default = app;
export {
  app,
  app_default as default
};
