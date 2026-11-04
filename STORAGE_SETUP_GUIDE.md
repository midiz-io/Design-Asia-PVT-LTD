# Storage Setup Guide

## Fix "Files storage bucket not found" Error

If you're getting the error "Files storage bucket not found", follow these steps:

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
2. **Navigate to Storage**
3. **Click "New Bucket"**
4. **Configure the bucket:**
   - **Name:** `files`
   - **Public:** ✅ Yes
   - **File size limit:** `10 MB`
   - **Allowed MIME types:** 
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/vnd.ms-excel`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `text/plain`
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/gif`
5. **Click "Create Bucket"**

### Option 2: SQL Editor

1. **Go to Supabase Dashboard > SQL Editor**
2. **Copy and paste this SQL:**
   ```sql
   -- Create the files bucket
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
   ```
3. **Click "Run"**

### Option 3: Set Storage Policies

After creating the bucket, you need to set up storage policies:

1. **Go to Storage > Policies**
2. **Select the `files` bucket**
3. **Create these 3 policies:**

   **Policy 1: Upload Files**
   - **Policy name:** `Users can upload files`
   - **Operation:** `INSERT`
   - **Target roles:** `authenticated`
   - **Policy definition:** `bucket_id = 'files'`

   **Policy 2: View Files**
   - **Policy name:** `Users can view files`
   - **Operation:** `SELECT`
   - **Target roles:** `authenticated`
   - **Policy definition:** `bucket_id = 'files'`

   **Policy 3: Delete Files**
   - **Policy name:** `Users can delete files`
   - **Operation:** `DELETE`
   - **Target roles:** `authenticated`
   - **Policy definition:** `bucket_id = 'files'`

### Test the Setup

After completing the setup, try uploading a file in the task creation form. It should work without errors!

## Troubleshooting

- **Still getting errors?** Check the browser console for detailed error messages
- **Permission denied?** Make sure you're logged in as an authenticated user
- **Bucket exists but upload fails?** Check that the storage policies are correctly configured
