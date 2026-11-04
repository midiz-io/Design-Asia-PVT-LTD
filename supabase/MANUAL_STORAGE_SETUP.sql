-- Manual Storage Setup Instructions
-- Run this SQL in the Supabase SQL Editor (with elevated permissions)
-- or configure via the Supabase Dashboard

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================
-- These policies control access to the 'files' storage bucket

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'files');

-- Allow authenticated users to view/download files
CREATE POLICY "Users can view files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'files');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'files');

-- ============================================================================
-- PERFORMANCE INDEXES (Optional but recommended)
-- ============================================================================

-- Index for bucket filtering
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id 
ON storage.objects(bucket_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_created_at 
ON storage.objects(created_at);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant necessary schema access
GRANT USAGE ON SCHEMA storage TO authenticated;

-- Grant bucket access
GRANT SELECT ON storage.buckets TO authenticated;

-- ============================================================================
-- CLEANUP FUNCTION (Optional)
-- ============================================================================
-- Function to delete old files that are no longer referenced

CREATE OR REPLACE FUNCTION public.cleanup_old_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete files older than 1 year that are not referenced in any table
  DELETE FROM storage.objects 
  WHERE bucket_id = 'files' 
    AND created_at < NOW() - INTERVAL '1 year'
    AND name NOT IN (
      -- Extract filename from receipt URLs
      SELECT DISTINCT 
        regexp_replace(receipt_url, '^.*/([^/]+)$', '\1') 
      FROM petty_cash_transactions 
      WHERE receipt_url IS NOT NULL
      UNION
      -- Extract filename from proof URLs
      SELECT DISTINCT 
        regexp_replace(proof_url, '^.*/([^/]+)$', '\1') 
      FROM tasks 
      WHERE proof_url IS NOT NULL
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_files() TO authenticated;

-- To run cleanup manually: SELECT public.cleanup_old_files();
-- To schedule (if pg_cron is available): 
-- SELECT cron.schedule('cleanup-old-files', '0 2 * * 0', 'SELECT public.cleanup_old_files();');

-- ============================================================================
-- ALTERNATIVE: Dashboard Configuration
-- ============================================================================
-- If you prefer to use the Supabase Dashboard:
--
-- 1. Go to Storage > Policies
-- 2. Select the 'files' bucket
-- 3. Click "New Policy"
-- 4. Create three policies:
--    a. INSERT policy for authenticated users
--    b. SELECT policy for authenticated users  
--    c. DELETE policy for authenticated users
--
-- All policies should use: bucket_id = 'files' as the condition
