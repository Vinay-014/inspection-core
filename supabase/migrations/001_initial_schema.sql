-- 001_initial_schema.sql
-- InspectionCore Database Schema for Spectora Template Importer and Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT DEFAULT 'spectora_xlsx',
  source_filename TEXT,
  source_template_name TEXT,
  imported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  parent_template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  copied_from_template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  total_sections INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  preservation_score NUMERIC DEFAULT 100
);

-- Sections Table
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  source_identifier TEXT,
  source_row INTEGER,
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items Table
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  source_identifier TEXT,
  source_row INTEGER,
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL,
  source_content_html TEXT,
  position INTEGER NOT NULL,
  source_identifier TEXT,
  source_row INTEGER,
  has_unsupported_tags BOOLEAN DEFAULT false,
  unsupported_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Import Issues Table
CREATE TABLE IF NOT EXISTS import_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'WARNING',
  category TEXT NOT NULL DEFAULT 'OTHER',
  source_location TEXT,
  source_row INTEGER,
  original_content TEXT,
  message TEXT NOT NULL,
  resolution_status TEXT DEFAULT 'UNRESOLVED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sections_template_id ON sections(template_id);
CREATE INDEX IF NOT EXISTS idx_sections_position ON sections(template_id, position);
CREATE INDEX IF NOT EXISTS idx_items_section_id ON items(section_id);
CREATE INDEX IF NOT EXISTS idx_items_position ON items(section_id, position);
CREATE INDEX IF NOT EXISTS idx_comments_item_id ON comments(item_id);
CREATE INDEX IF NOT EXISTS idx_comments_position ON comments(item_id, position);
CREATE INDEX IF NOT EXISTS idx_import_issues_template ON import_issues(template_id);

-- Enable RLS and add public access policies for review access
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_issues ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_public_access') THEN
    CREATE POLICY templates_public_access ON templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sections' AND policyname = 'sections_public_access') THEN
    CREATE POLICY sections_public_access ON sections FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'items' AND policyname = 'items_public_access') THEN
    CREATE POLICY items_public_access ON items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'comments_public_access') THEN
    CREATE POLICY comments_public_access ON comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'import_issues' AND policyname = 'import_issues_public_access') THEN
    CREATE POLICY import_issues_public_access ON import_issues FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
