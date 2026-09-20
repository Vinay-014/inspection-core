export interface Template {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  source_filename: string | null;
  source_template_name: string | null;
  imported_at: string;
  created_at: string;
  updated_at: string;
  parent_template_id: string | null;
  copied_from_template_id: string | null;
  status: string;
  total_sections: number;
  total_items: number;
  total_comments: number;
  preservation_score: number;
  sections?: Section[];
  issues?: ImportIssue[];
}

export interface Section {
  id: string;
  template_id: string;
  name: string;
  position: number;
  source_identifier: string | null;
  source_row: number | null;
  source_name: string | null;
  created_at: string;
  updated_at: string;
  items?: Item[];
}

export interface Item {
  id: string;
  section_id: string;
  name: string;
  position: number;
  source_identifier: string | null;
  source_row: number | null;
  source_name: string | null;
  created_at: string;
  updated_at: string;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  item_id: string;
  content_html: string;
  source_content_html: string | null;
  position: number;
  source_identifier: string | null;
  source_row: number | null;
  has_unsupported_tags: boolean;
  unsupported_tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ImportIssue {
  id: string;
  template_id: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category: string;
  source_location: string | null;
  source_row: number | null;
  original_content: string | null;
  message: string;
  resolution_status: 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED';
  created_at: string;
}

export interface ParsePreviewData {
  name: string;
  description?: string;
  source_type: string;
  source_filename: string;
  sections: Array<{
    name: string;
    position: number;
    source_row?: number;
    items: Array<{
      name: string;
      position: number;
      source_row?: number;
      comments: Array<{
        content_html: string;
        source_content_html: string;
        position: number;
        source_row?: number;
        has_unsupported_tags: boolean;
        unsupported_tags: string[];
      }>;
    }>;
  }>;
  issues: Array<{
    severity: 'ERROR' | 'WARNING' | 'INFO';
    category: string;
    source_location?: string;
    source_row?: number;
    original_content?: string;
    message: string;
    resolution_status: 'UNRESOLVED';
  }>;
  metrics: {
    totalSourceRows: number;
    recognizedRows: number;
    unmappedRows: number;
    sectionsCount: number;
    itemsCount: number;
    commentsCount: number;
    unsupportedHtmlCount: number;
    preservationScore: number;
    sourceSha256: string;
    parsedSha256: string;
  };
}

export type SelectedNodeType =
  | { type: 'template' }
  | { type: 'section'; sectionId: string }
  | { type: 'item'; sectionId: string; itemId: string }
  | { type: 'comment'; sectionId: string; itemId: string; commentId: string };
