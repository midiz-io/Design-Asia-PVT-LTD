# Requirements Update - 2026-09-10

This update addresses the two requirements specified in the audio messages provided.

## Requirement 1: Progress Percentage for "In Progress" Jobs
- **Description:** When setting the status of a job to "In Progress" (before creating a task/job for QS), there should be an option to set the progress percentage (e.g., 25%, 50%, 60%, 70%).
- **Implementation:**
  - Added a new `progress_percentage` field to the database migration to support storing this value.
  - Updated the **Jobs** UI form to display a new dropdown for "Progress Percentage (%)" when the selected status is "In Progress".
  - The job card in the jobs list now displays the progress percentage within the "In Progress" badge (e.g., `In Progress (60%)`).

## Requirement 2: Finance Department Quotation Value Access
- **Description:** The Finance Department requests advance payments and requires access to view the quotation value. However, the quotation value should remain hidden from unauthorized users and not require the QS code (`QS26`) for the finance team.
- **Implementation:**
  - Updated the Quotation Value field in the **Jobs** UI so that it is visible and accessible without the unlock code if the current user is a Finance user (`isFinanceUser`).
  - Unauthorized users still see the locked state requiring the `QS26` code.

## File Changes
1. **`src/pages/Jobs.tsx`**: Updated UI to handle progress percentage and quotation value visibility for the Finance department.
2. **`supabase/migrations/20260910000000_add_progress_percentage_to_jobs.sql`**: Added `progress_percentage` column.

**Note:** Please ensure that the Supabase migration `20260910000000_add_progress_percentage_to_jobs.sql` is run on your database to apply the schema change.
