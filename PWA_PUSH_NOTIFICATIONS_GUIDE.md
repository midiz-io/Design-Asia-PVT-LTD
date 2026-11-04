# PWA Web Push Notifications Implementation Guide

## Overview

This implementation provides a comprehensive PWA Web Push Notification system for TrackFlow Vision with role-based notifications for Admin, Manager, Supervisor, and Employee users.

## Features

### ✅ Core Features
- **Role-based Notifications**: Different notification types for Admin, Manager, Supervisor, and Employee roles
- **Push Subscription Management**: Subscribe/unsubscribe from push notifications
- **Permission Handling**: Request and manage notification permissions
- **Service Worker Integration**: Enhanced service worker with push notification support
- **Database Integration**: Store push subscriptions and notification preferences
- **Real-time Notifications**: Instant notifications via Supabase realtime subscriptions
- **Notification Management**: Send notifications to specific users, roles, or system-wide

### ✅ User Roles & Capabilities

#### Admin
- Send notifications to all users
- Send role-specific notifications
- Send system-wide announcements
- Manage notification settings
- Access to notification management tools

#### Manager
- Send notifications to employees and supervisors
- Send role-specific notifications (excluding admin)
- Access to notification management tools
- Manage team notifications

#### Supervisor
- Receive notifications from managers and admins
- Send notifications to assigned employees
- View notification history
- Manage notification preferences

#### Employee
- Receive notifications from supervisors, managers, and admins
- View notification history
- Manage personal notification preferences
- Test notification functionality

## Technical Implementation

### 1. Service Worker (`public/sw.js`)
- Enhanced push event handling
- Role-based notification styling
- Notification click handling
- Background sync support

### 2. Push Notification Service (`src/utils/pushNotifications.ts`)
- Singleton service for push notification management
- Role-based notification methods
- Bulk notification sending
- Database integration for subscriptions

### 3. Notification Context (`src/contexts/NotificationContext.tsx`)
- React context for notification state management
- Integration with push notification service
- Real-time notification updates
- Permission management

### 4. UI Components
- **NotificationSettings**: User notification preferences
- **NotificationManager**: Admin/Manager notification sending interface
- **NotificationTester**: Comprehensive testing tool
- **NotificationCenter**: Main notification management page

### 5. Database Schema
- Push subscription storage in profiles table
- Notification preferences management
- Role-based notification settings
- Notification history tracking

## Setup Instructions

### 1. VAPID Keys Setup
```bash
# Generate VAPID keys (replace with your actual keys)
# You can use: npx web-push generate-vapid-keys
```

Update the VAPID public key in `src/utils/pushNotifications.ts`:
```typescript
this.vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE';
```

### 2. Database Migration
Run the migration to add push notification support:
```sql
-- The migration file is already created at:
-- supabase/migrations/20250115000000_add_push_subscription_support.sql
```

### 3. Environment Variables
Add to your environment configuration:
```env
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## Usage Examples

### 1. Basic Notification Sending
```typescript
import { useNotifications } from '@/contexts/NotificationContext';

const { sendAdminNotification, sendToRole, sendSystemNotification } = useNotifications();

// Send admin notification
await sendAdminNotification({
  title: 'New Task Assigned',
  body: 'You have been assigned a new task',
  data: {
    notificationId: 'task-123',
    url: '/tasks/123',
    type: 'info'
  }
});

// Send to specific role
await sendToRole('employee', {
  title: 'System Maintenance',
  body: 'Scheduled maintenance tonight at 10 PM',
  data: {
    notificationId: 'maintenance-123',
    url: '/dashboard',
    type: 'warning'
  }
});

// Send system-wide notification
await sendSystemNotification({
  title: 'Emergency Alert',
  body: 'Please evacuate the building immediately',
  data: {
    notificationId: 'emergency-123',
    url: '/dashboard',
    type: 'error',
    requireInteraction: true
  }
});
```

### 2. Permission Management
```typescript
import { useNotifications } from '@/contexts/NotificationContext';

const { 
  requestNotificationPermission, 
  subscribeToPush, 
  unsubscribeFromPush,
  isPushSupported,
  isPushSubscribed 
} = useNotifications();

// Check if push notifications are supported
if (isPushSupported) {
  // Request permission
  const permission = await requestNotificationPermission();
  
  if (permission === 'granted') {
    // Subscribe to push notifications
    await subscribeToPush();
  }
}
```

### 3. Testing Notifications
Use the built-in NotificationTester component to test all notification types:
- Browser support verification
- Permission request testing
- Push subscription testing
- Role-based notification testing
- System notification testing

## Notification Types

### 1. Task Notifications
- Task assigned
- Task completed
- Task overdue
- Task updated

### 2. Job Notifications
- Job created
- Job updated
- Job completed
- Job cancelled

### 3. System Notifications
- System announcements
- Emergency alerts
- Maintenance notifications
- Security alerts

### 4. User Notifications
- User mentions
- Approval requests
- Permission changes
- Profile updates

## Configuration Options

### Notification Preferences
Users can configure:
- Push notification enabled/disabled
- Email notification preferences
- Notification types (task, job, system, etc.)
- Quiet hours settings
- Sound and vibration preferences

### Role-based Settings
- Admin: Full notification control
- Manager: Team and employee notifications
- Supervisor: Employee notifications
- Employee: Personal notifications only

## Troubleshooting

### Common Issues

1. **Notifications not showing**
   - Check browser notification permissions
   - Verify service worker is registered
   - Check console for errors

2. **Push subscription failing**
   - Verify VAPID keys are correct
   - Check database connection
   - Ensure HTTPS is enabled

3. **Role-based notifications not working**
   - Verify user roles in database
   - Check permission context
   - Verify notification service initialization

### Debug Tools
- Use NotificationTester component for comprehensive testing
- Check browser developer tools console
- Monitor network requests for subscription updates
- Verify database records for push subscriptions

## Security Considerations

1. **VAPID Keys**: Keep private keys secure
2. **User Permissions**: Respect user notification preferences
3. **Data Privacy**: Don't store sensitive data in notification payloads
4. **Rate Limiting**: Implement rate limiting for notification sending
5. **Content Filtering**: Sanitize notification content

## Performance Optimization

1. **Batch Notifications**: Group similar notifications
2. **Debouncing**: Prevent notification spam
3. **Caching**: Cache notification preferences
4. **Lazy Loading**: Load notification components on demand
5. **Background Sync**: Use service worker for offline notifications

## Future Enhancements

1. **Rich Notifications**: Add images, actions, and interactive elements
2. **Notification Scheduling**: Schedule notifications for specific times
3. **Notification Templates**: Pre-defined notification templates
4. **Analytics**: Track notification engagement and effectiveness
5. **Multi-language Support**: Localized notification content
6. **Push Service Integration**: Integrate with Firebase Cloud Messaging or similar services

## Support

For issues or questions regarding the notification system:
1. Check the troubleshooting section
2. Use the NotificationTester component
3. Review browser console logs
4. Check database migration status
5. Verify service worker registration

## API Reference

### PushNotificationService Methods
- `requestPermission()`: Request notification permission
- `subscribeToPush()`: Subscribe to push notifications
- `unsubscribeFromPush()`: Unsubscribe from push notifications
- `sendAdminNotification()`: Send admin-specific notification
- `sendManagerNotification()`: Send manager-specific notification
- `sendSupervisorNotification()`: Send supervisor-specific notification
- `sendEmployeeNotification()`: Send employee-specific notification
- `sendToRole()`: Send notification to specific role
- `sendToUser()`: Send notification to specific user
- `sendSystemNotification()`: Send system-wide notification

### NotificationContext Hooks
- `useNotifications()`: Main notification context hook
- All PushNotificationService methods available through context
- Real-time notification updates
- Permission and subscription state management
