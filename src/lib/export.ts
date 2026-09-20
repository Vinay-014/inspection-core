import * as XLSX from 'xlsx';
import { Template } from '../types';

/**
 * Export full template hierarchy as structured JSON
 */
export function exportTemplateAsJson(template: Template) {
  const exportData = {
    exported_at: new Date().toISOString(),
    engine: 'InspectionCore Spectora Engine v1.0',
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      source_filename: template.source_filename,
      source_type: template.source_type,
      preservation_score: template.preservation_score,
      total_sections: template.sections?.length || template.total_sections,
      total_items: template.total_items,
      total_comments: template.total_comments,
      sections: (template.sections || []).map(sec => ({
        id: sec.id,
        name: sec.name,
        position: sec.position,
        source_row: sec.source_row,
        items: (sec.items || []).map(item => ({
          id: item.id,
          name: item.name,
          position: item.position,
          source_row: item.source_row,
          comments: (item.comments || []).map(cmt => ({
            id: cmt.id,
            position: cmt.position,
            content_html: cmt.content_html,
            source_content_html: cmt.source_content_html,
            has_unsupported_tags: cmt.has_unsupported_tags,
            unsupported_tags: cmt.unsupported_tags
          }))
        }))
      }))
    }
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = template.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${safeName}-inspectioncore-export.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export full template hierarchy back to Spectora-compatible spreadsheet (.xlsx)
 */
export function exportTemplateAsSpectoraXlsx(template: Template) {
  const rows: Array<Record<string, any>> = [];

  const sections = template.sections || [];
  for (const section of sections) {
    const items = section.items || [];
    if (items.length === 0) {
      rows.push({
        'Section': section.name,
        'Item': '',
        'Comment': '',
        'HTML Text': ''
      });
      continue;
    }

    for (const item of items) {
      const comments = item.comments || [];
      if (comments.length === 0) {
        rows.push({
          'Section': section.name,
          'Item': item.name,
          'Comment': '',
          'HTML Text': ''
        });
        continue;
      }

      for (const comment of comments) {
        rows.push({
          'Section': section.name,
          'Item': item.name,
          'Comment': item.name,
          'HTML Text': comment.content_html || comment.source_content_html || ''
        });
      }
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Section', 'Item', 'Comment', 'HTML Text']
  });

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 25 }, // Section
    { wch: 30 }, // Item
    { wch: 30 }, // Comment
    { wch: 70 }  // HTML Text
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection Template');

  const safeName = template.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `${safeName}-Spectora-Export.xlsx`);
}
