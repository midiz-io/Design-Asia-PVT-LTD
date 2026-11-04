/**
 * Vercel Serverless Function for WhatsApp API
 * This function acts as a proxy to send WhatsApp messages
 * and avoid CORS issues when calling from client-side
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface WhatsAppRequest {
  number: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'pdf';
  message?: string;
  mediaUrl?: string;
}

const WHATSAPP_API_BASE = 'http://api.geekhirusha.com/designasia.php';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { number, type, message, mediaUrl }: WhatsAppRequest = req.body;

    // Validate mandatory parameters
    if (!number || !type) {
      return res.status(400).json({ 
        error: 'Missing mandatory parameters',
        required: ['number', 'type']
      });
    }

    // Build URL with query parameters
    const url = new URL(WHATSAPP_API_BASE);
    url.searchParams.append('number', number);
    url.searchParams.append('type', type);

    if (message) {
      url.searchParams.append('message', message);
    }

    if (mediaUrl) {
      url.searchParams.append('mediaUrl', mediaUrl);
    }

    // Call WhatsApp API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      console.error(`WhatsApp API error: ${response.status}`);
      return res.status(response.status).json({ 
        error: 'WhatsApp API request failed',
        status: response.status
      });
    }

    // Safely parse response (handle cases where external API returns plain text instead of JSON)
    const text = await response.text();
    let result: any = null;
    try {
      result = JSON.parse(text);
    } catch (e) {
      // If parsing fails, treat the plain text as the message status
      result = { status: text.trim() };
    }
    
    return res.status(200).json({ 
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
