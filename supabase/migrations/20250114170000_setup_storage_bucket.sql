-- Setup storage bucket for file uploads
-- Note: Storage policies must be configured via Supabase Dashboard or SQL Editor
-- This migration only creates the bucket structure

-- Create the files bucket if it doesn't exist
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

-- Note: Storage policies need to be created manually via Supabase Dashboard:
-- 1. Go to Storage > Policies
-- 2. Select the 'files' bucket
-- 3. Create these policies:
--    - INSERT: "Users can upload files" (authenticated users, bucket_id = 'files')
--    - SELECT: "Users can view files" (authenticated users, bucket_id = 'files')  
--    - DELETE: "Users can delete files" (authenticated users, bucket_id = 'files')
