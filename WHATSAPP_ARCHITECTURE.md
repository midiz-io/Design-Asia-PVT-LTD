# WhatsApp Integration Architecture

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     VERCEL DEPLOYMENT                        │
│                                                              │
│  ┌────────────────────┐                                     │
│  │   React Frontend   │                                     │
│  │   (Static Site)    │                                     │
│  │                    │                                     │
│  │  - Tasks.tsx       │                                     │
│  │  - UserMgmt.tsx    │                                     │
│  │  - whatsapp.ts     │                                     │
│  └─────────┬──────────┘                                     │
│            │                                                 │
│            │ POST /api/whatsapp                             │
│            │ {                                               │
│            │   number: "94771234567",                       │
│            │   type: "text",                                │
│            │   message: "Task assigned..."                  │
│            │ }                                               │
│            ↓                                                 │
│  ┌────────────────────┐                                     │
│  │  Serverless Func   │                                     │
│  │  /api/whatsapp.ts  │                                     │
│  │                    │                                     │
│  │  - Receives POST   │                                     │
│  │  - Validates data  │                                     │
│  │  - Calls external  │                                     │
│  │    WhatsApp API    │                                     │
│  └─────────┬──────────┘                                     │
│            │                                                 │
└────────────┼─────────────────────────────────────────────────┘
             │
             │ GET http://api.geekhirusha.com/designasia.php
             │ ?number=94771234567
             │ &type=text
             │ &message=Task%20assigned...
             ↓
    ┌────────────────────┐
    │  WhatsApp API      │
    │  (External)        │
    │                    │
    │  - Processes msg   │
    │  - Sends WhatsApp  │
    └─────────┬──────────┘
              │
              ↓
    ┌────────────────────┐
    │  Employee Phone    │
    │  📱 WhatsApp       │
    │                    │
    │  Notification      │
    │  Received! ✅      │
    └────────────────────┘
```

---

## 🏗️ Component Breakdown

### 1. Frontend Components

#### **Tasks.tsx**
```typescript
// When task is created with assigned employees
const assignedEmployees = employees.filter(emp => assignedIds.includes(emp.id));

for (const employee of assignedEmployees) {
  if (employee.phone) {
    await sendTaskAssignmentNotification(
      employee.full_name,
      employee.phone,
      taskData.title,
      taskData.description,
      taskData.due_date,
      taskData.priority
    );
  }
}
```

#### **UserManagement.tsx**
```typescript
// When new user is registered
if (newUserFormData.phone) {
  await sendNewUserCredentials(
    newUserFormData.full_name,
    newUserFormData.phone,
    newUserFormData.email,
    newUserFormData.password,
    newUserFormData.role
  );
}
```

---

### 2. Utility Layer

#### **src/utils/whatsapp.ts**
```typescript
const WHATSAPP_API_ENDPOINT = '/api/whatsapp';

export const sendWhatsAppMessage = async (params: WhatsAppMessage) => {
  const response = await fetch(WHATSAPP_API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  return response.ok;
};
```

**Helper Functions:**
- `sendWhatsAppText()` - Send simple text message
- `formatPhoneNumber()` - Format to international format
- `sendTaskAssignmentNotification()` - Build task notification
- `sendNewUserCredentials()` - Build user credentials message
- `sendBulkWhatsAppMessages()` - Send to multiple recipients

---

### 3. Backend Layer (NEW!)

#### **api/whatsapp.ts**
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validate request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract parameters
  const { number, type, message, mediaUrl } = req.body;

  // Call external WhatsApp API
  const url = new URL('http://api.geekhirusha.com/designasia.php');
  url.searchParams.append('number', number);
  url.searchParams.append('type', type);
  if (message) url.searchParams.append('message', message);
  if (mediaUrl) url.searchParams.append('mediaUrl', mediaUrl);

  // Forward request
  const response = await fetch(url.toString());
  const result = await response.json();

  return res.status(200).json({ success: true, data: result });
}
```

---

## 🔒 Security Layers (Future Enhancement)

```
┌─────────────────────────────────────────────────────┐
│                 Security Options                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. JWT Token Verification                          │
│     ┌──────────────────────────────────┐            │
│     │  req.headers.authorization       │            │
│     │  ↓                                │            │
│     │  Verify with Supabase            │            │
│     │  ↓                                │            │
│     │  Allow/Deny                      │            │
│     └──────────────────────────────────┘            │
│                                                      │
│  2. Rate Limiting                                   │
│     ┌──────────────────────────────────┐            │
│     │  Track IP/User requests          │            │
│     │  ↓                                │            │
│     │  Max 10 requests per minute      │            │
│     │  ↓                                │            │
│     │  Block if exceeded               │            │
│     └──────────────────────────────────┘            │
│                                                      │
│  3. Input Validation                                │
│     ┌──────────────────────────────────┐            │
│     │  Sanitize phone number           │            │
│     │  Validate message length         │            │
│     │  Check for malicious content     │            │
│     └──────────────────────────────────┘            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Execution Flow

### Task Assignment Flow

```
User Action: Create Task with Assigned Employees
    ↓
Tasks.tsx: handleCreateTask()
    ↓
1. Insert task to database
    ↓
2. Insert task_assignees
    ↓
3. Loop through assigned employees
    ↓
4. For each employee with phone:
    ↓
   sendTaskAssignmentNotification()
    ↓
   src/utils/whatsapp.ts: sendWhatsAppMessage()
    ↓
   POST /api/whatsapp
    ↓
   api/whatsapp.ts: handler()
    ↓
   GET http://api.geekhirusha.com/designasia.php
    ↓
   WhatsApp API sends message
    ↓
   Employee receives notification ✅
```

### User Registration Flow

```
User Action: Add New User
    ↓
UserManagement.tsx: handleAddUser()
    ↓
1. Create auth user (signUp)
    ↓
2. Create profile (RPC)
    ↓
3. Assign role (RPC)
    ↓
4. If phone number exists:
    ↓
   sendNewUserCredentials()
    ↓
   src/utils/whatsapp.ts: sendWhatsAppMessage()
    ↓
   POST /api/whatsapp
    ↓
   api/whatsapp.ts: handler()
    ↓
   GET http://api.geekhirusha.com/designasia.php
    ↓
   WhatsApp API sends message
    ↓
   New user receives credentials ✅
```

---

## 🌐 Environment Comparison

### Development (Local)
```
http://localhost:3000
    ↓
http://localhost:3000/api/whatsapp (Vercel Dev Server)
    ↓
http://api.geekhirusha.com/designasia.php
    ↓
WhatsApp ✅
```

### Production (Vercel)
```
https://your-domain.vercel.app
    ↓
https://your-domain.vercel.app/api/whatsapp (Serverless Function)
    ↓
http://api.geekhirusha.com/designasia.php
    ↓
WhatsApp ✅
```

---

## 🔧 Configuration Files

### vercel.json
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",     ← API routes
      "destination": "/api/$1"    ← Serverless functions
    },
    {
      "source": "/(.*)",          ← All other routes
      "destination": "/index.html" ← React app
    }
  ]
}
```

### package.json
```json
{
  "devDependencies": {
    "@vercel/node": "^3.x.x"  ← TypeScript types
  }
}
```

---

## 📱 Message Formats

### Task Assignment Message
```
*🎯 New Task Assigned - Design Asia Group*

Hello *John Doe*,

You have been assigned a new task:

*Task:* Complete wireframes for mobile app
*Description:* Create high-fidelity wireframes
*Priority:* 🔴 HIGH
*Due Date:* 2025-11-20

Please log in to the system to view full details.

🌐 *Design Asia Group Task Management System*
```

### User Registration Message
```
*🎉 Welcome to Design Asia Group! 🎉*

Hello *Jane Smith*,

Your account has been successfully created.

*🔐 Your Login Credentials:*
━━━━━━━━━━━━━━━━━━━━
*Username/Email:* jane.smith@designasia.com
*Password:* SecurePass123!
*Role:* Employee
━━━━━━━━━━━━━━━━━━━━

*🌐 System Access:*
Please visit our portal and log in.

*⚠️ Security Notice:*
Change your password after first login.

*Design Asia Group (Pvt) Ltd*
_Building Tomorrow, Today_ ✨
```

---

## 🚀 Deployment Process

```
Local Development
    ↓
git add .
    ↓
git commit -m "Fix WhatsApp for Vercel"
    ↓
git push origin main
    ↓
Vercel Webhook Triggered
    ↓
┌─────────────────────────┐
│   Vercel Build Process  │
│                         │
│  1. Clone repository    │
│  2. Install deps        │
│  3. Build React app     │
│  4. Deploy static files │
│  5. Create serverless   │
│     functions from /api │
└─────────────────────────┘
    ↓
Production Deployment ✅
    ↓
Test WhatsApp Integration
    ↓
Monitor Function Logs
```

---

## 📈 Monitoring & Debugging

### Vercel Dashboard
```
Project Dashboard
    ↓
Functions Tab
    ↓
whatsapp Function
    ↓
┌──────────────────────────┐
│  Invocation Count: 245   │
│  Success Rate: 98.7%     │
│  Avg Duration: 1.2s      │
│  Errors: 3               │
└──────────────────────────┘
    ↓
View Logs
    ↓
┌──────────────────────────┐
│ [POST] /api/whatsapp     │
│ Status: 200              │
│ Duration: 1245ms         │
│ Request: {...}           │
│ Response: {...}          │
└──────────────────────────┘
```

### Browser Console
```javascript
// Success
WhatsApp API: Message sent successfully
{success: true, data: {status: "sent"}}

// Error
WhatsApp API: HTTP error 500
{error: "Internal server error", message: "..."}
```

---

## ✅ Success Metrics

### Technical Indicators
- ✅ No CORS errors in browser console
- ✅ 200 status from `/api/whatsapp`
- ✅ Serverless function executes successfully
- ✅ External API responds with success

### Business Indicators
- ✅ Employees receive task notifications
- ✅ New users receive login credentials
- ✅ Messages properly formatted
- ✅ Phone numbers correctly parsed

---

## 🎯 Key Takeaways

1. **Vercel is serverless** - Client-side can't make external API calls
2. **Solution: Backend proxy** - Serverless function handles external calls
3. **Simple implementation** - Just POST to `/api/whatsapp` instead of external URL
4. **Automatic deployment** - Vercel detects `/api` folder and creates functions
5. **Production-ready** - Works seamlessly with zero configuration

---

This architecture ensures WhatsApp integration works perfectly on Vercel! 🚀
