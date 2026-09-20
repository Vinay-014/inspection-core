export type IssueSeverity = 'ERROR' | 'WARNING' | 'INFO';

export type IssueCategory =
  | 'UNSUPPORTED_HTML'
  | 'UNKNOWN_ROW'
  | 'MISSING_REQUIRED_STRUCTURE'
  | 'EMPTY_CONTENT'
  | 'MALFORMED_HTML'
  | 'UNRECOGNIZED_FORMAT'
  | 'SOURCE_METADATA_ONLY'
  | 'OTHER';

export interface ImportIssue {
  id?: string;
  template_id?: string;
  severity: IssueSeverity;
  category: IssueCategory;
  source_location?: string;
  source_row?: number;
  original_content?: string;
  message: string;
  resolution_status?: 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED';
  created_at?: string;
}

export interface ParsedComment {
  id?: string;
  item_id?: string;
  content_html: string;
  source_content_html: string;
  position: number;
  source_identifier?: string;
  source_row?: number;
  has_unsupported_tags: boolean;
  unsupported_tags: string[];
}

export interface ParsedItem {
  id?: string;
  section_id?: string;
  name: string;
  source_name: string;
  position: number;
  source_identifier?: string;
  source_row?: number;
  comments: ParsedComment[];
}

export interface ParsedSection {
  id?: string;
  template_id?: string;
  name: string;
  source_name: string;
  position: number;
  source_identifier?: string;
  source_row?: number;
  items: ParsedItem[];
}

export interface ParsedTemplate {
  name: string;
  description?: string;
  source_type: string;
  source_filename: string;
  source_template_name?: string;
  sections: ParsedSection[];
  issues: ImportIssue[];
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

export interface TemplateEntity {
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
  sections?: SectionEntity[];
  issues?: ImportIssue[];
}

export interface SectionEntity {
  id: string;
  template_id: string;
  name: string;
  position: number;
  source_identifier: string | null;
  source_row: number | null;
  source_name: string | null;
  created_at: string;
  updated_at: string;
  items?: ItemEntity[];
}

export interface ItemEntity {
  id: string;
  section_id: string;
  name: string;
  position: number;
  source_identifier: string | null;
  source_row: number | null;
  source_name: string | null;
  created_at: string;
  updated_at: string;
  comments?: CommentEntity[];
}

export interface CommentEntity {
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
