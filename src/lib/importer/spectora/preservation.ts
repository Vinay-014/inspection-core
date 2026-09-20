import crypto from 'crypto';

export interface PreservationAudit {
  sourceRowsCount: number;
  recognizedRowsCount: number;
  unmappedRowsCount: number;
  sectionsCount: number;
  itemsCount: number;
  commentsCount: number;
  unsupportedHtmlCount: number;
  preservationScore: number;
  sourceContentSha256: string;
  parsedContentSha256: string;
  sourceMissingCategories: Array<{
    category: string;
    description: string;
    reason: string;
  }>;
  importerUnsupportedCategories: Array<{
    construct: string;
    detectedCount: number;
    actionTaken: string;
  }>;
}

export function computeSha256(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

export function normalizeTextForFingerprint(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ') // Strip HTML tags to compare textual content
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function buildPreservationAudit(params: {
  sourceRowsCount: number;
  recognizedRowsCount: number;
  unmappedRowsCount: number;
  sectionsCount: number;
  itemsCount: number;
  commentsCount: number;
  unsupportedHtmlCount: number;
  sourceNormalizedText: string;
  parsedNormalizedText: string;
  unsupportedTagsMap: Record<string, number>;
}): PreservationAudit {
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

  // Compute preservation score (percentage of content faithfully captured)
  const rowScore = sourceRowsCount > 0 ? (recognizedRowsCount / sourceRowsCount) * 100 : 100;
  const preservationScore = Math.min(100, Math.max(0, Math.round(rowScore * 10) / 10));

  const sourceSha = computeSha256(sourceNormalizedText);
  const parsedSha = computeSha256(parsedNormalizedText);

  // Clearly differentiate information absent from the source export vs unsupported by importer
  const sourceMissingCategories = [
    {
      category: 'Inspection Photos & Media',
      description: 'Photos, videos, and thermal imaging files',
      reason: 'Spectora HTML-Text template exports do not include binary media or photo attachments. Only template text/HTML is exported.'
    },
    {
      category: 'Client & Inspection Scheduling',
      description: 'Customer names, addresses, inspection fees, and calendar dates',
      reason: 'This is a reusable master template export, not an active or completed inspection job.'
    },
    {
      category: 'Service Pricing & Payment Status',
      description: 'Service line items, tax rates, and invoice payment statuses',
      reason: 'Spectora financial and billing data are isolated in business settings, not template spreadsheets.'
    }
  ];

  const importerUnsupportedCategories = Object.entries(unsupportedTagsMap).map(([tag, count]) => ({
    construct: `<${tag}> HTML element`,
    detectedCount: count,
    actionTaken: 'Sanitized safely to prevent stylesheet/script injection while preserving text and recording in Import Issues.'
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
