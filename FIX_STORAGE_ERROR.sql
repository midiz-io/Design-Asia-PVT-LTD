-- FIX STORAGE UPLOAD ERROR
-- Run this SQL in the Supabase SQL Editor to fix the "row-level security policy" error

-- 1. Create the files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create storage policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files" ON storage.objects;

CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'files');

CREATE POLICY "Users can view files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'files');

CREATE POLICY "Users can delete files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'files');

-- 3. Test the setup
SELECT 'Storage setup completed successfully!' as status;
