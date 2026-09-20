/**
 * HTML Sanitization and Rich Text Preservation Strategy
 * 
 * Supported tags:
 * - paragraphs: <p>, <br>
 * - formatting: <strong>, <b>, <em>, <i>, <u>, <s>, <strike>
 * - lists: <ul>, <ol>, <li>
 * - headings: <h1>, <h2>, <h3>, <h4>, <h5>, <h6>
 * - blocks: <blockquote>, <span>, <div>
 * - links: <a href="..." target="_blank" rel="noopener noreferrer">
 * 
 * Dangerous / Unsupported tags:
 * - <script>, <style>, <iframe>, <object>, <embed>, <form>, <input>, <button>, <svg>, <canvas>
 * - Inline event handlers: onclick, onerror, onload, etc.
 * - Unsafe URLs: javascript:, data:text/html, etc.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'span', 'div', 'a'
]);

const UNSAFE_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form',
  'input', 'button', 'svg', 'canvas', 'link', 'meta'
]);

export interface HtmlAnalysisResult {
  sanitizedHtml: string;
  hasUnsupportedTags: boolean;
  unsupportedTags: string[];
  linksFound: Array<{ href: string; text: string }>;
}

export function sanitizeAndAnalyzeHtml(rawHtml: string | null | undefined): HtmlAnalysisResult {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {
      sanitizedHtml: '',
      hasUnsupportedTags: false,
      unsupportedTags: [],
      linksFound: []
    };
  }

  const unsupportedTagsFound = new Set<string>();
  const linksFound: Array<{ href: string; text: string }> = [];

  // 1. Detect any tags in the HTML
  const tagRegex = /<\/?([a-zA-Z0-9_-]+)([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(rawHtml)) !== null) {
    const tagName = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      unsupportedTagsFound.add(tagName);
    }
  }

  // 2. Extract links
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(rawHtml)) !== null) {
    const href = linkMatch[2];
    const text = linkMatch[3].replace(/<[^>]+>/g, '').trim();
    if (href) {
      linksFound.push({ href, text });
    }
  }

  // 3. Clean and sanitize HTML string
  // Remove dangerous script/style blocks entirely including contents
  let cleaned = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Strip event handler attributes (e.g. onclick, onload, onerror)
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');

  // Ensure anchor tags are secure
  cleaned = cleaned.replace(/<a\s+([^>]*?)href=(["'])(.*?)\2([^>]*?)>/gi, (_full, before, _q, href, after) => {
    const trimmedHref = href.trim();
    // Block javascript: or unsafe URI schemes
    if (/^javascript:/i.test(trimmedHref) || /^data:/i.test(trimmedHref)) {
      return `<span>`;
    }
    // Clean target and rel
    const otherAttrs = `${before} ${after}`.replace(/\s+(target|rel)=["'][^"']*["']/gi, '').trim();
    return `<a href="${trimmedHref}" target="_blank" rel="noopener noreferrer"${otherAttrs ? ' ' + otherAttrs : ''}>`;
  });

  // Ensure non-empty text
  if (!cleaned.trim() && rawHtml.trim()) {
    cleaned = rawHtml.replace(/<[^>]+>/g, '').trim();
  }

  return {
    sanitizedHtml: cleaned,
    hasUnsupportedTags: unsupportedTagsFound.size > 0,
    unsupportedTags: Array.from(unsupportedTagsFound),
    linksFound
  };
}
