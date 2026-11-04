/**
 * WhatsApp API Service
 * Sends WhatsApp messages via Vercel serverless function
 * to avoid CORS issues in production
 */

// Use Vercel serverless function endpoint
const WHATSAPP_API_ENDPOINT = '/api/whatsapp';

export type WhatsAppMessageType = 'text' | 'image' | 'video' | 'audio' | 'pdf';

export interface WhatsAppMessage {
  number: string; // Phone number (e.g., '94771234567')
  type: WhatsAppMessageType;
  message?: string; // Text content or media caption
  mediaUrl?: string; // Public URL for media files
}

/**
 * Send a WhatsApp message via Vercel serverless function
 * @param params WhatsApp message parameters
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const sendWhatsAppMessage = async (params: WhatsAppMessage): Promise<boolean> => {
  try {
    // Validate mandatory parameters
    if (!params.number || !params.type) {
      console.error('WhatsApp API: Missing mandatory parameters (number or type)');
      return false;
    }

    // Send request to Vercel serverless function
    const response = await fetch(WHATSAPP_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: params.number,
        type: params.type,
        message: params.message,
        mediaUrl: params.mediaUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`WhatsApp API: HTTP error ${response.status}`, errorData);
      return false;
    }

    const result = await response.json().catch(() => ({ success: true }));
    console.log('WhatsApp API: Message sent successfully', result);
    return true;
  } catch (error) {
    console.error('WhatsApp API: Error sending message', error);
    return false;
  }
};

/**
 * Send a text message via WhatsApp
 * @param number Recipient's phone number
 * @param message Text message content
 * @returns Promise<boolean>
 */
export const sendWhatsAppText = async (number: string, message: string): Promise<boolean> => {
  return sendWhatsAppMessage({
    number,
    type: 'text',
    message,
  });
};

/**
 * Format phone number to ensure it starts with country code (94 for Sri Lanka)
 * @param phone Phone number in various formats
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 0, replace with country code 94
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.substring(1);
  }

  // If doesn't start with country code, add 94
  if (!cleaned.startsWith('94')) {
    cleaned = '94' + cleaned;
  }

  return cleaned;
};

/**
 * Send task assignment notification via WhatsApp with image
 * @param employeeName Employee's full name
 * @param employeePhone Employee's phone number
 * @param taskTitle Task title
 * @param taskDescription Task description
 * @param dueDate Task due date (optional)
 * @param priority Task priority
 * @param taskLink Direct link to open the task (optional)
 * @returns Promise<boolean>
 */
const getPriorityEmoji = (priority?: string) => {
  if (!priority) return '';
  switch (priority) {
    case 'urgent':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    default:
      return '🟢';
  }
};

export const sendTaskAssignmentNotification = async (
  employeeName: string,
  employeePhone: string,
  taskTitle: string,
  taskDescription: string,
  dueDate?: string,
  priority?: string,
  taskLink?: string
): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(employeePhone);

  let caption = `*🎯 New Task Assigned - Design Asia Group*\n\n`;
  caption += `Hello *${employeeName}*,\n\n`;
  caption += `You have been assigned a new task:\n\n`;
  caption += `*Task:* ${taskTitle}\n`;

  if (taskDescription) {
    caption += `*Description:* ${taskDescription}\n`;
  }

  if (priority) {
    const priorityEmoji = getPriorityEmoji(priority);
    caption += `*Priority:* ${priorityEmoji} ${priority.toUpperCase()}\n`;
  }

  if (dueDate) {
    caption += `*Due Date:* ${dueDate}\n`;
  }

  if (taskLink) {
    caption += `*Task Link:* ${taskLink}\n`;
  }

  caption += `\nPlease log in to the system to view full details and start working on this task.\n\n`;
  caption += `🌐 *Design Asia Group Task Management System*`;

  return sendWhatsAppMessage({
    number: formattedPhone,
    type: 'image',
    message: caption,
    mediaUrl: 'https://i.ibb.co/XZSTNnJk/GHDev-2025-11-17-12-34-42.jpg'
  });
};

interface TaskApprovalRequestParams {
  adminName?: string;
  adminPhone: string;
  taskTitle: string;
  taskDescription?: string;
  employeeName: string;
  dueDate?: string;
  priority?: string;
  taskLink: string;
  proofUrl: string;
}

export const sendTaskApprovalRequestNotification = async ({
  adminName,
  adminPhone,
  taskTitle,
  taskDescription,
  employeeName,
  dueDate,
  priority,
  taskLink,
  proofUrl,
}: TaskApprovalRequestParams): Promise<boolean> => {
  if (!proofUrl) {
    console.warn('Attempted to send task approval notification without proof URL.');
  }

  const formattedPhone = formatPhoneNumber(adminPhone);

  let caption = `*✅ Task Proof Submitted - Approval Needed*\n\n`;
  caption += `Hello${adminName ? ` *${adminName}*` : ''},\n\n`;
  caption += `*${employeeName}* submitted proof for:\n`;
  caption += `*Task:* ${taskTitle}\n`;

  if (taskDescription) {
    caption += `*Description:* ${taskDescription}\n`;
  }

  if (priority) {
    const priorityEmoji = getPriorityEmoji(priority);
    caption += `*Priority:* ${priorityEmoji} ${priority.toUpperCase()}\n`;
  }

  if (dueDate) {
    caption += `*Due Date:* ${dueDate}\n`;
  }

  caption += `\n📎 Proof image attached above.\n`;
  caption += `🔗 Review & approve/reject: ${taskLink}\n\n`;
  caption += `Please open the link to approve or reject the task.`;

  return sendWhatsAppMessage({
    number: formattedPhone,
    type: 'image',
    message: caption,
    mediaUrl: proofUrl,
  });
};

interface TaskCommentNotificationParams {
  recipientName: string;
  recipientPhone: string;
  commenterName: string;
  taskTitle: string;
  comment: string;
  taskLink: string;
  isMention?: boolean;
}

export const sendTaskCommentNotification = async ({
  recipientName,
  recipientPhone,
  commenterName,
  taskTitle,
  comment,
  taskLink,
  isMention = false,
}: TaskCommentNotificationParams): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(recipientPhone);

  let caption = `*💬 Task Comment ${isMention ? 'Mention' : 'Update'}*\n\n`;
  caption += `Hello${recipientName ? ` *${recipientName}*` : ''},\n\n`;
  caption += `*${commenterName}* commented on *${taskTitle}*:\n`;
  caption += `_${comment}_\n\n`;

  if (isMention) {
    caption += `You were mentioned in this comment.\n\n`;
  }

  caption += `🔗 View task: ${taskLink}\n`;

  return sendWhatsAppMessage({
    number: formattedPhone,
    type: 'text',
    message: caption,
  });
};

/**
 * Send new user registration notification via WhatsApp
 * @param fullName User's full name
 * @param phone User's phone number
 * @param email User's email (username)
 * @param password Temporary password
 * @param role User's role
 * @returns Promise<boolean>
 */
export const sendNewUserCredentials = async (
  fullName: string,
  phone: string,
  email: string,
  password: string,
  role: string
): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(phone);

  let caption = `*🎉 Welcome to Design Asia Group! 🎉*\n\n`;
  caption += `Hello *${fullName}*,\n\n`;
  caption += `Your account has been successfully created in the Design Asia Group Task Management System.\n\n`;
  caption += `*🔐 Your Login Credentials:*\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*System:* https://designasiaetm.site\n`;
  caption += `*Username/Email:* ${email}\n`;
  caption += `*Password:* ${password}\n`;
  caption += `*Role:* ${role.charAt(0).toUpperCase() + role.slice(1)}\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  caption += `*🌐 System Access:*\n`;
  caption += `Please visit our task management portal and log in with the credentials above.\n\n`;
  caption += `*⚠️ Security Notice:*\n`;
  caption += `For your security, please change your password after your first login.\n\n`;
  caption += `*📞 Need Help?*\n`;
  caption += `If you have any questions or need assistance, please contact your administrator.\n\n`;
  caption += `*Design Asia Group (Pvt) Ltd*\n`;
  caption += `_Building Tomorrow, Today_ ✨`;

  return sendWhatsAppMessage({
    number: formattedPhone,
    type: 'image',
    message: caption,
    mediaUrl: 'https://i.ibb.co/XZSTNnJk/GHDev-2025-11-17-12-34-42.jpg'
  });
};

/**
 * Send bulk WhatsApp messages to multiple recipients
 * @param messages Array of WhatsApp messages
 * @returns Promise<{ success: number, failed: number }>
 */
export const sendBulkWhatsAppMessages = async (
  messages: WhatsAppMessage[]
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  // Send messages sequentially with a small delay to avoid rate limiting
  for (const message of messages) {
    const result = await sendWhatsAppMessage(message);
    if (result) {
      success++;
    } else {
      failed++;
    }

    // Add a small delay between messages (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { success, failed };
};

/**
 * Generate a static map URL using OpenStreetMap tiles
 * Uses multiple fallback services for reliability
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @param zoom Zoom level (default 15)
 * @returns Static map image URL
 */
export const generateStaticMapUrl = (
  latitude: number,
  longitude: number,
  zoom: number = 15
): string => {
  // Using osm-static-maps service (reliable, free)
  // Format: https://staticmap.thisplace.me/staticmap?center={lat},{lng}&zoom={z}&size={w}x{h}&markers={lat},{lng}
  const width = 600;
  const height = 400;

  // Primary: Use staticmap.openstreetmap.de (reliable OSM static map service)
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&markers=${latitude},${longitude},lightblue`;
};

/**
 * Get a fallback image URL in case static map generation fails
 */
export const getFallbackMapImage = (): string => {
  // Use the company logo as fallback
  return 'https://i.ibb.co/XZSTNnJk/GHDev-2025-11-17-12-34-42.jpg';
};


/**
 * Generate Google Maps link for the location
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Google Maps URL
 */
export const generateGoogleMapsLink = (
  latitude: number,
  longitude: number
): string => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

interface EmployeeSelfTaskNotificationParams {
  adminName?: string;
  adminPhone: string;
  employeeName: string;
  taskTitle: string;
  taskDescription?: string;
  priority?: string;
  taskLink: string;
  createdAt: string; // ISO timestamp
  latitude: number;
  longitude: number;
  locationName?: string; // Reverse geocoded address (optional)
}

/**
 * Send notification to admin when an employee creates a task for themselves
 * Includes task details, timestamp, and employee's current location with map
 * @param params Notification parameters
 * @returns Promise<boolean>
 */
export const sendEmployeeSelfTaskNotification = async ({
  adminName,
  adminPhone,
  employeeName,
  taskTitle,
  taskDescription,
  priority,
  taskLink,
  createdAt,
  latitude,
  longitude,
  locationName,
}: EmployeeSelfTaskNotificationParams): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(adminPhone);

  // Format the creation timestamp
  const createdDate = new Date(createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Generate map link
  const mapsLink = generateGoogleMapsLink(latitude, longitude);

  let caption = `*📋 Employee Self-Task Created*\n\n`;
  caption += `Hello${adminName ? ` *${adminName}*` : ''},\n\n`;
  caption += `*${employeeName}* has created and assigned a task to themselves.\n\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*📝 Task Details*\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*Title:* ${taskTitle}\n`;

  if (taskDescription) {
    caption += `*Description:* ${taskDescription}\n`;
  }

  if (priority) {
    const priorityEmoji = getPriorityEmoji(priority);
    caption += `*Priority:* ${priorityEmoji} ${priority.toUpperCase()}\n`;
  }

  caption += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*🕐 Creation Time*\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*Date:* ${formattedDate}\n`;
  caption += `*Time:* ${formattedTime}\n`;

  caption += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*📍 Employee Location*\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;

  if (locationName) {
    caption += `*Address:* ${locationName}\n`;
  }

  // Check if valid coordinates are available
  const hasValidLocation = latitude !== 0 && longitude !== 0;

  if (hasValidLocation) {
    caption += `*Coordinates:* ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n`;
    caption += `*View on Maps:* ${mapsLink}\n`;
  } else {
    caption += `*Location:* Unable to capture (permission denied or unavailable)\n`;
  }

  caption += `\n🔗 *View Task:* ${taskLink}\n\n`;
  caption += `_This is an automated notification from Design Asia Group Task Management System._`;

  // Generate static map URL for the image, or use fallback
  const mapImageUrl = hasValidLocation
    ? generateStaticMapUrl(latitude, longitude)
    : getFallbackMapImage();

  console.log('Sending self-task notification:', {
    phone: formattedPhone,
    employeeName,
    taskTitle,
    hasValidLocation,
    latitude,
    longitude,
    mapImageUrl,
  });

  return sendWhatsAppMessage({
    number: formattedPhone,
    type: 'image',
    message: caption,
    mediaUrl: mapImageUrl,
  });
};

interface SupervisorTaskCompletionParams {
  supervisorName?: string;
  supervisorPhone: string;
  employeeName: string;
  taskTitle: string;
  taskDescription?: string;
  taskLink: string;
  proofUrl?: string;
}

/**
 * Send notification to supervisor when a team member completes a task
 */
export const sendSupervisorTaskCompletionNotification = async ({
  supervisorName,
  supervisorPhone,
  employeeName,
  taskTitle,
  taskDescription,
  taskLink,
  proofUrl,
}: SupervisorTaskCompletionParams): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(supervisorPhone);

  let caption = `*✅ Task Completed - Team Update*\n\n`;
  caption += `Hello${supervisorName ? ` *${supervisorName}*` : ''},\n\n`;
  caption += `*${employeeName}* has finished a task in your team.\n\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*📝 Task Details*\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*Title:* ${taskTitle}\n`;

  if (taskDescription) {
    caption += `*Description:* ${taskDescription}\n`;
  }

  caption += `\n🔗 *Review Task:* ${taskLink}\n\n`;
  caption += `_Design Asia Group Task Management System_`;

  return sendWhatsAppMessage({
    number: formattedPhone,
    type: proofUrl ? 'image' : 'text',
    message: caption,
    mediaUrl: proofUrl || undefined,
  });
};

/**
 * Upload an image to the external image uploading API: https://img.geekhirusha.com/upload.php
 * @param imageBlob The compressed image blob to upload
 * @returns The public URL of the uploaded image, or null on failure
 */
export const uploadImageToGeekHirusha = async (imageBlob: Blob): Promise<string | null> => {
  try {
    const formData = new FormData();
    // Resilient to whatever key name the upload.php script expects
    formData.append('file', imageBlob, 'clarification_image.jpg');
    formData.append('image', imageBlob, 'clarification_image.jpg');
    formData.append('img', imageBlob, 'clarification_image.jpg');

    const response = await fetch('https://img.geekhirusha.com/upload.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error(`Image Upload API: HTTP error ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Image Upload API Response:', data);
      
      // Handle typical JSON response structures
      if (data.url) return data.url;
      if (data.image_url) return data.image_url;
      if (data.link) return data.link;
      if (data.file_url) return data.file_url;
      if (data.data?.url) return data.data.url;
      if (data.data?.link) return data.data.link;
      if (data.imageUrl) return data.imageUrl;
      if (data.filePath) return data.filePath;
    } else {
      // Handle plain text response containing the URL
      const text = await response.text();
      const trimmedText = text.trim();
      if (trimmedText.startsWith('http://') || trimmedText.startsWith('https://')) {
        return trimmedText;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Image Upload API: Error uploading image', error);
    return null;
  }
};

interface TaskClarificationParams {
  senderName: string;
  recipientName?: string;
  recipientPhone: string;
  taskTitle: string;
  taskCode?: string | null;
  type: 'text' | 'image' | 'voice';
  message: string;
  mediaUrl?: string | null;
  taskLink: string;
}

/**
 * Send task clarification request notification to supervisor/admin via WhatsApp
 */
export const sendTaskClarificationRequestNotification = async ({
  senderName,
  recipientName,
  recipientPhone,
  taskTitle,
  taskCode,
  type,
  message,
  mediaUrl,
  taskLink,
}: TaskClarificationParams): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(recipientPhone);

  let typeEmoji = '💬';
  let typeLabel = 'Text Message';
  if (type === 'image') {
    typeEmoji = '🖼️';
    typeLabel = 'Image Sharing';
  } else if (type === 'voice') {
    typeEmoji = '🎤';
    typeLabel = 'Voice Note';
  }

  let caption = `*❓ Task Clarification Requested - Design Asia Group*\n\n`;
  caption += `Hello${recipientName ? ` *${recipientName}*` : ''},\n\n`;
  caption += `Employee *${senderName}* has requested clarification on a task.\n\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*📝 Task Details*\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*Task:* ${taskTitle}\n`;
  if (taskCode) {
    caption += `*Task ID:* ${taskCode}\n`;
  }
  caption += `*Type:* ${typeEmoji} ${typeLabel}\n\n`;
  
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `*✉️ Clarification Request*\n`;
  caption += `━━━━━━━━━━━━━━━━━━━━\n`;
  caption += `"${message}"\n\n`;

  if (type === 'voice' && mediaUrl) {
    caption += `🎤 *Play Voice Message:* ${mediaUrl}\n\n`;
  } else if (type === 'image' && mediaUrl) {
    caption += `📎 *Proof image attached above.*\n\n`;
  }

  caption += `🔗 *Review & Respond:* ${taskLink}\n\n`;
  caption += `_Design Asia Group Task Management System_`;

  // Determine message type for API
  // If it is an image, we send as 'image' with mediaUrl.
  // Otherwise, we send as 'text' (or 'audio' if type is voice, but 'text' with audio link is safer/more descriptive).
  return sendWhatsAppMessage({
    number: formattedPhone,
    type: type === 'image' && mediaUrl ? 'image' : 'text',
    message: caption,
    mediaUrl: type === 'image' && mediaUrl ? mediaUrl : undefined,
  });
};
