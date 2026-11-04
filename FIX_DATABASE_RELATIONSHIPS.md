# Database Relationship Fixes

## Issues Fixed

The application was showing "Could not find a relationship" errors because:

1. **Tasks Page**: `profiles:created_by(full_name, email)` - trying to join profiles table using created_by
2. **Locations Page**: `profiles (full_name, email)` - trying to join profiles table using user_id  
3. **PettyCash Page**: `profiles (full_name)` - trying to join profiles table using employee_id
4. **Inventory Page**: `profiles:employee_id (full_name)` - trying to join profiles table using employee_id

## Solutions Applied

### 1. Database Migration
Created `supabase/migrations/20250114080000_fix_relationships.sql` that:
- Adds explicit foreign key constraints to all tables
- Ensures proper relationships between auth.users and public tables
- Refreshes schema cache
- Maintains RLS security policies

### 2. Frontend Query Fixes
Modified the following files to use separate queries instead of complex joins:

#### `src/pages/Tasks.tsx`
- Split the complex join query into separate queries
- First get tasks, then get profiles, then get assignees
- Combine data manually in JavaScript

#### `src/pages/Locations.tsx`  
- Split the join query into separate queries
- First get locations, then get profiles for user_ids
- Combine data manually

#### `src/pages/PettyCash.tsx`
- Split the join query into separate queries  
- First get transactions, then get categories and profiles
- Combine data manually

#### `src/pages/Inventory.tsx`
- Split the join query into separate queries
- First get movements, then get items, locations, and profiles
- Combine data manually

## How to Apply the Fix

### Option 1: Reset Database (Recommended)
```bash
npx supabase db reset
```

### Option 2: Apply Migration Manually
```bash
npx supabase db push
```

### Option 3: Run Migration SQL Directly
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250114080000_fix_relationships.sql`
4. Execute the SQL

## Expected Results

After applying these fixes:
- ✅ Tasks page will load without "Could not find a relationship between 'tasks' and 'created_by'" error
- ✅ Locations page will load without "Could not find a relationship between 'employee_locations' and 'profiles'" error  
- ✅ PettyCash page will load without "Could not find a relationship between 'petty_cash_transactions' and 'profiles'" error
- ✅ Inventory page will load without relationship errors
- ✅ All admin pages will function properly
- ✅ Data will still be displayed correctly with proper relationships

## Performance Notes

The new approach uses multiple smaller queries instead of complex joins:
- **Pros**: More reliable, works with any database setup, easier to debug
- **Cons**: Slightly more network requests, but negligible performance impact for this use case

The queries are optimized to:
- Minimize data transfer
- Use efficient filtering with `.in()` for batch lookups
- Maintain the same data structure for the frontend components
