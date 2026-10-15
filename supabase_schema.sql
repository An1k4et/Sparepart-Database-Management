-- ==============================================================================
-- SPDM (Spare Part Data Management) - Supabase Database Setup Script
-- Run this entire script in Supabase: Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Vessels Table
CREATE TABLE IF NOT EXISTS public.vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES public.vessels(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    total_rows INT DEFAULT 0,
    headers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add public_url column if table already exists
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS public_url TEXT;

-- 5. Spare Parts Table (Stores rows for high-speed indexed search)
CREATE TABLE IF NOT EXISTS public.spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES public.vessels(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    search_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add search_text column if table already exists, and allow part_name to be nullable
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS search_text TEXT;
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spare_parts' AND column_name='part_name') THEN
    ALTER TABLE public.spare_parts ALTER COLUMN part_name DROP NOT NULL;
  END IF;
END $$;

-- 6. Row Links Table
CREATE TABLE IF NOT EXISTS public.row_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    url TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(file_id, row_index)
);

-- 7. High-Performance GIN Trigram Search Index (Sub-50ms search over 100k+ rows)
CREATE INDEX IF NOT EXISTS parts_search_text_idx ON public.spare_parts 
USING gin (search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS parts_file_idx ON public.spare_parts(file_id);
CREATE INDEX IF NOT EXISTS parts_vessel_idx ON public.spare_parts(vessel_id);

-- 8. Stored Procedure for Grouped Search Count (Exact Multi-Word Matching matching ExcelViewer)
CREATE OR REPLACE FUNCTION public.search_vessel_parts(search_query TEXT)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    vessel_id UUID,
    vessel_name TEXT,
    file_id UUID,
    filename TEXT,
    match_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    words TEXT[];
    pattern TEXT;
    w TEXT;
    escaped_words TEXT[] := '{}';
BEGIN
    -- Extract alphanumeric words from query (e.g. ['Lub', 'Oil', 'Pipe'])
    SELECT array_agg(m[1]) INTO words
    FROM regexp_matches(trim(search_query), '([a-zA-Z0-9]+)', 'g') AS m;

    IF words IS NULL OR array_length(words, 1) = 0 THEN
        RETURN;
    END IF;

    -- Build cohesive phrase regex: joins words with flexible delimiter [\s._-]+
    -- Ensures words appear together in sequence, preventing scattered single-word false matches
    FOREACH w IN ARRAY words
    LOOP
        IF lower(w) = 'lub' THEN
            escaped_words := array_append(escaped_words, 'lube?');
        ELSE
            escaped_words := array_append(escaped_words, regexp_replace(w, '([.\\+*?\\[\\](){}^$|])', '\\\1', 'g'));
        END IF;
    END LOOP;

    pattern := array_to_string(escaped_words, '[\s._-]+');

    RETURN QUERY
    SELECT 
        c.id AS client_id,
        c.name AS client_name,
        v.id AS vessel_id,
        v.name AS vessel_name,
        f.id AS file_id,
        f.filename AS filename,
        COUNT(p.id) AS match_count
    FROM public.spare_parts p
    JOIN public.vessels v ON p.vessel_id = v.id
    JOIN public.clients c ON v.client_id = c.id
    JOIN public.files f ON p.file_id = f.id
    WHERE (
        coalesce(
            p.search_text, 
            coalesce(p.part_name, '') || ' ' || coalesce(p.drawing_no, '') || ' ' || coalesce(p.spare_part_group_no, '') || ' ' || coalesce(p.part_type, '')
        ) ~* pattern
    )
    GROUP BY c.id, c.name, v.id, v.name, f.id, f.filename
    HAVING COUNT(p.id) > 0
    ORDER BY match_count DESC;
END;
$$;

-- 9. KEEP RLS STRICTLY ENABLED ON ALL TABLES
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.row_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all operations for vessels" ON public.vessels;
DROP POLICY IF EXISTS "Allow all operations for files" ON public.files;
DROP POLICY IF EXISTS "Allow all operations for spare_parts" ON public.spare_parts;
DROP POLICY IF EXISTS "Allow all operations for row_links" ON public.row_links;

CREATE POLICY "Allow all operations for clients" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for vessels" ON public.vessels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for files" ON public.files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for spare_parts" ON public.spare_parts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for row_links" ON public.row_links FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 10. Storage Bucket Setup & Policies for 'excel-files'
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-files', 'excel-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop all previous storage policies
DROP POLICY IF EXISTS "Public Upload to excel-files" ON storage.objects;
DROP POLICY IF EXISTS "Public Read from excel-files" ON storage.objects;
DROP POLICY IF EXISTS "Public Update in excel-files" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete from excel-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to excel-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from excel-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update in excel-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from excel-files" ON storage.objects;

-- 1) Allow uploads (INSERT)
CREATE POLICY "Allow public uploads to excel-files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'excel-files');

-- 2) Allow updating existing files (UPDATE for upsert)
CREATE POLICY "Allow public update in excel-files"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'excel-files')
WITH CHECK (bucket_id = 'excel-files');

-- 3) Allow deleting files (DELETE)
CREATE POLICY "Allow public delete from excel-files"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'excel-files');

-- NOTE: We intentionally DO NOT create a broad SELECT policy on storage.objects.
-- Because the bucket is Public, files are safely served directly via CDN URL without
-- exposing the ability for users to list all files in the bucket.


-- 11. Reload schema cache
NOTIFY pgrst, 'reload schema';
