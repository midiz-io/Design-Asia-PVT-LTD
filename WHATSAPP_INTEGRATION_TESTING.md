# WhatsApp Integration Testing Guide

## Overview
WhatsApp notifications have been integrated at two key points in the Design Asia Group system:
1. **Task Assignment**: Notify all assigned employees when a new task is created
2. **New User Registration**: Send login credentials via WhatsApp when a new user is added

## API Details
- **Endpoint**: http://api.geekhirusha.com/designasia.php
- **Method**: GET with query parameters
- **Required Parameters**:
  - `number`: Phone number (e.g., 94771234567)
  - `type`: Message type (text/image/video/audio/pdf)
- **Optional Parameters**:
  - `message`: Text content or media caption
  - `mediaUrl`: Public URL for media files

## Test Scenarios

### Test 1: Task Assignment WhatsApp Notification

**Prerequisites:**
- Have at least one user with a phone number in the system
- Ensure the phone number is in international format (94XXXXXXXXX for Sri Lanka)

**Steps:**
1. Log in as an admin or manager
2. Navigate to the Tasks page
3. Click "Create Task" button
4. Fill in task details:
   - Title: "Test WhatsApp Notification"
   - Description: "Testing WhatsApp integration"
   - Priority: High
   - Due Date: Select a future date
5. Select at least one employee who has a phone number
6. Click "Create Task"

**Expected Results:**
- Task is created successfully
- Success alert appears
- WhatsApp message is sent to all assigned employees with:
  - Task title
  - Task description
  - Priority level with emoji
  - Due date
  - Welcome message and instructions

**Verification:**
- Check browser console for: "WhatsApp API: Message sent successfully"
- Check assigned employee's WhatsApp for the notification message
- Message should be formatted with bold text and emojis

**Sample WhatsApp Message Format:**
```
*🎯 New Task Assigned - Design Asia Group*

Hello *[Employee Name]*,

You have been assigned a new task:

*Task:* Test WhatsApp Notification
*Description:* Testing WhatsApp integration
*Priority:* 🔴 HIGH
*Due Date:* [Date]

Please log in to the system to view full details and start working on this task.

🌐 *Design Asia Group Task Management System*
```

---

### Test 2: New User Registration WhatsApp Notification

**Prerequisites:**
- Have admin access
- Prepare a test phone number that can receive WhatsApp messages

**Steps:**
1. Log in as an admin
2. Navigate to the User Management page
3. Click "Add User" button
4. Fill in new user details:
   - Full Name: "Test User"
   - Email: "testuser@example.com"
   - Password: "TestPass123!"
   - Phone: "0771234567" (or full format: 94771234567)
   - Department: "IT"
   - Role: Employee
5. Click "Create User"

**Expected Results:**
- User is created successfully
- Success alert appears
- WhatsApp message is sent to the new user with:
  - Welcome message
  - Login credentials (email and password)
  - Role information
  - Security notice to change password
  - Contact information

**Verification:**
- Check browser console for: "WhatsApp credentials sent successfully"
- Check the provided phone number's WhatsApp for the credentials message
- Verify all credentials are correct and formatted properly

**Sample WhatsApp Message Format:**
```
*🎉 Welcome to Design Asia Group! 🎉*

Hello *Test User*,

Your account has been successfully created in the Design Asia Group Task Management System.

*🔐 Your Login Credentials:*
━━━━━━━━━━━━━━━━━━━━
*Username/Email:* testuser@example.com
*Password:* TestPass123!
*Role:* Employee
━━━━━━━━━━━━━━━━━━━━

*🌐 System Access:*
Please visit our task management portal and log in with the credentials above.

*⚠️ Security Notice:*
For your security, please change your password after your first login.

*📞 Need Help?*
If you have any questions or need assistance, please contact your administrator.

*Design Asia Group (Pvt) Ltd*
_Building Tomorrow, Today_ ✨
```

---

## Phone Number Format Handling

The system automatically formats phone numbers to ensure compatibility:

### Supported Input Formats:
- `0771234567` → Auto-converted to `94771234567`
- `94771234567` → Used as-is
- `+94771234567` → Cleaned to `94771234567`
- `077-123-4567` → Cleaned and converted to `94771234567`

### Format Logic:
1. Remove all non-digit characters
2. If starts with `0`, replace with `94` (Sri Lanka code)
3. If doesn't start with country code, prepend `94`

---

## Error Handling

### Console Logs to Monitor:
- **Success**: "WhatsApp API: Message sent successfully"
- **Error**: "WhatsApp API: Missing mandatory parameters"
- **Error**: "WhatsApp API: HTTP error [status code]"
- **Error**: "Failed to send WhatsApp to [employee name]"
- **Error**: "Failed to send WhatsApp credentials"

### Common Issues:

1. **No WhatsApp sent despite success alert**
   - Check if user has a phone number in their profile
   - Check browser console for WhatsApp-related errors
   - Verify API endpoint is accessible

2. **Phone number format issues**
   - Ensure phone numbers are stored in profiles
   - System auto-formats, but verify input is numeric

3. **API rate limiting**
   - System adds 500ms delay between bulk messages
   - For large task assignments, messages are sent sequentially

---

## Testing Checklist

- [ ] Test task assignment with single employee (with phone)
- [ ] Test task assignment with multiple employees (with phones)
- [ ] Test task assignment with employee without phone (should skip gracefully)
- [ ] Test new user registration with phone number
- [ ] Test new user registration without phone number (should skip gracefully)
- [ ] Verify message formatting and readability on WhatsApp
- [ ] Check console logs for errors
- [ ] Verify phone number auto-formatting works
- [ ] Test with different priority levels (urgent, high, medium, low)
- [ ] Test with long task descriptions
- [ ] Verify both flows work in production environment

---

## Implementation Details

### Files Modified:
1. **src/utils/whatsapp.ts** (NEW)
   - Core WhatsApp API service
   - Phone number formatting
   - Task assignment and user registration helpers

2. **src/pages/Tasks.tsx**
   - Added phone field to Profile interface
   - Updated fetchEmployees to include phone
   - Added WhatsApp notification after task assignment
   - Import: `sendTaskAssignmentNotification`

3. **src/pages/UserManagement.tsx**
   - Added WhatsApp notification after user creation
   - Import: `sendNewUserCredentials`

### Key Functions:
- `sendWhatsAppMessage()`: Core API caller
- `sendWhatsAppText()`: Text message helper
- `formatPhoneNumber()`: Phone format standardization
- `sendTaskAssignmentNotification()`: Task notification builder
- `sendNewUserCredentials()`: User credentials message builder
- `sendBulkWhatsAppMessages()`: Bulk send with rate limiting

---

## Notes

- WhatsApp notifications are **non-blocking** - if they fail, the main operation (task creation/user registration) still succeeds
- Messages are sent **asynchronously** to avoid UI delays
- Phone numbers are **automatically formatted** to Sri Lankan format (94XXXXXXXXX)
- All messages use **WhatsApp formatting** (bold with asterisks, emojis)
- Failed WhatsApp sends are logged to console but don't show user errors
- For bulk task assignments, there's a 500ms delay between messages to avoid rate limiting

---

## Production Deployment Checklist

Before deploying to production:

1. [ ] Verify WhatsApp API endpoint is accessible from production server
2. [ ] Test with real phone numbers
3. [ ] Confirm message templates are approved (if using WhatsApp Business API)
4. [ ] Monitor API usage and rate limits
5. [ ] Set up error monitoring/logging
6. [ ] Document any API keys or authentication if added later
7. [ ] Test with various phone number formats
8. [ ] Verify messages appear correctly on different WhatsApp clients (Android/iOS/Web)

---

## Future Enhancements

Consider adding:
- Message delivery status tracking
- Read receipt tracking
- Configurable message templates
- Support for media attachments (images, PDFs)
- WhatsApp message history/logs in database
- Retry logic for failed sends
- Batch processing for large assignments
- Admin settings to enable/disable WhatsApp notifications
- Custom message templates per organization
