# TrackFlow Vision - Setup Instructions

## 📋 Overview

This document provides complete setup instructions for the TrackFlow Vision application, including database migrations and storage configuration.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Supabase (Local Development)

```bash
npx supabase start
```

### 3. Run Database Migrations

**Important:** If you encounter storage-related permission errors during migration, follow the workaround below.

```bash
npx supabase db reset
```

### 4. Configure Storage (Required for File Uploads)

Since storage configuration requires elevated permissions, it must be done manually:

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard → **Storage**
2. Create a new bucket named `files` with these settings:
   - **Public**: Yes
   - **File size limit**: 10485760 (10MB)
   - **Allowed MIME types**: 
     - image/jpeg
     - image/png
     - image/gif
     - image/webp
     - application/pdf
     - text/plain
     - application/msword
     - application/vnd.openxmlformats-officedocument.wordprocessingml.document
     - application/vnd.ms-excel
     - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

3. Go to **Storage** → **Policies** → Select `files` bucket
4. Create three policies:

   **Policy 1: Allow Upload**
   ```sql
   CREATE POLICY "Users can upload files" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'files');
   ```

   **Policy 2: Allow View**
   ```sql
   CREATE POLICY "Users can view files" ON storage.objects
   FOR SELECT TO authenticated
   USING (bucket_id = 'files');
   ```

   **Policy 3: Allow Delete**
   ```sql
   CREATE POLICY "Users can delete files" ON storage.objects
   FOR DELETE TO authenticated
   USING (bucket_id = 'files');
   ```

#### Option B: Via SQL Editor

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy and paste the entire contents of `supabase/MANUAL_STORAGE_SETUP.sql`
3. Click **Run**

## 🔧 Troubleshooting

### Migration Permission Errors

If you see errors like `must be owner of table objects`, this is a known Supabase limitation where migrations cannot create storage policies.

**Solution:** 
1. The migrations will still run successfully for all database tables
2. Configure storage manually using the instructions above
3. The application will work perfectly once storage is configured

### Common Issues

**Issue:** File upload not working
- **Cause:** Storage policies not configured
- **Fix:** Follow the storage configuration steps above

**Issue:** Database reset fails
- **Cause:** Cached migration files
- **Fix:** Try stopping and restarting Supabase:
  ```bash
  npx supabase stop
  npx supabase start
  npx supabase db reset
  ```

## 🎯 Features Implemented

### ✅ Completed Features

1. **Role-Based Dashboards**
   - Employee Dashboard
   - Manager Dashboard  
   - Supervisor Dashboard
   - Admin Dashboard

2. **File Upload System**
   - Drag & drop interface
   - Multiple file types support
   - Progress tracking
   - Receipt upload for expenses

3. **Advanced Petty Cash**
   - Multi-level approval workflows
   - Budget tracking with alerts
   - Category management
   - Visual analytics

4. **Real-Time Notifications**
   - Live notification system
   - Browser notifications
   - Notification center dropdown
   - Action-based routing

5. **Enhanced Features**
   - Task management with attachments
   - Location tracking
   - Inventory management
   - User management
   - Reports & Analytics

## 📱 User Roles

The application supports 4 user roles:

- **Admin**: Full system access and configuration
- **Manager**: Team oversight and approval workflows
- **Supervisor**: Field operations management
- **Employee**: Task execution and expense submission

## 🔐 Default Users

After running migrations, you can create test users with different roles in the Supabase Dashboard.

## 🌐 Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📚 Additional Resources

- `supabase/MANUAL_STORAGE_SETUP.sql` - Complete storage configuration SQL
- Database schema in `supabase/migrations/`
- Component documentation in source files

## 💡 Tips

1. Always configure storage policies before testing file uploads
2. Use the Supabase Dashboard for easier policy management
3. Check browser console for detailed error messages
4. Enable browser notifications for the best experience

## 🆘 Support

If you encounter issues:

1. Check that all migrations ran successfully (except storage-related ones)
2. Verify storage bucket and policies are configured
3. Clear browser cache and local storage
4. Check Supabase logs in the dashboard

---

**Happy Coding! 🚀**
