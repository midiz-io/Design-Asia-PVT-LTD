import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

const {
  PUSH_SERVER_PORT = 4000,
  PUSH_SERVER_HOST = '0.0.0.0',
  PUSH_VAPID_SUBJECT = 'mailto:notifications@example.com',
  PUSH_VAPID_PUBLIC_KEY,
  PUSH_VAPID_PRIVATE_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV,
} = process.env;

if (!PUSH_VAPID_PUBLIC_KEY || !PUSH_VAPID_PRIVATE_KEY) {
  console.warn('[push-server] VAPID keys are missing. Set PUSH_VAPID_PUBLIC_KEY and PUSH_VAPID_PRIVATE_KEY.');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[push-server] Supabase service credentials are missing. API requests will fail.');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

webpush.setVapidDetails(
  PUSH_VAPID_SUBJECT || 'mailto:notifications@example.com',
  PUSH_VAPID_PUBLIC_KEY || '',
  PUSH_VAPID_PRIVATE_KEY || ''
);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const HEALTH_STATUS = {
  status: 'ok',
  environment: NODE_ENV || 'development',
  timestamp: () => new Date().toISOString(),
};

const loadSubscriptionsForTarget = async (target) => {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  switch (target.type) {
    case 'broadcast': {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, push_subscription')
        .not('push_subscription', 'is', null);
      if (error) throw error;
      return data;
    }
    case 'role': {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, push_subscription')
        .eq('role', target.role)
        .not('push_subscription', 'is', null);
      if (error) throw error;
      return data;
    }
    case 'user': {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, push_subscription')
        .eq('id', target.userId)
        .not('push_subscription', 'is', null);
      if (error) throw error;
      return data;
    }
    case 'users': {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, push_subscription')
        .in('id', target.userIds)
        .not('push_subscription', 'is', null);
      if (error) throw error;
      return data;
    }
    default:
      return [];
  }
};

const sendWebPush = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error('[push-server] Failed to send notification', error);
    if (error.statusCode === 404 || error.statusCode === 410) {
      return { success: false, remove: true };
    }
    return { success: false };
  }
};

const removeSubscription = async (profileId) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ push_subscription: null })
    .eq('id', profileId);
  if (error) {
    console.error('[push-server] Failed to remove stale subscription', error);
  }
};

app.get('/api/push/health', (_req, res) => {
  res.json({ ...HEALTH_STATUS, timestamp: HEALTH_STATUS.timestamp() });
});

app.post('/api/push/send', async (req, res) => {
  if (!PUSH_VAPID_PUBLIC_KEY || !PUSH_VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not configured' });
  }

  const { target, notification } = req.body || {};
  if (!target || !notification || !notification.title || !notification.body) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const recipients = await loadSubscriptionsForTarget(target);
    if (!recipients?.length) {
      return res.json({ success: true, delivered: 0, removed: 0 });
    }

    let delivered = 0;
    let removed = 0;

    const payload = {
      ...notification,
      timestamp: notification.timestamp || Date.now(),
    };

    await Promise.all(
      recipients.map(async ({ id, push_subscription: subscription }) => {
        const result = await sendWebPush(subscription, payload);
        if (result.success) {
          delivered += 1;
        } else if (result.remove) {
          removed += 1;
          await removeSubscription(id);
        }
      })
    );

    res.json({ success: true, delivered, removed });
  } catch (error) {
    console.error('[push-server] Failed to process push request', error);
    res.status(500).json({ error: 'Failed to process push request' });
  }
});

const server = app.listen(PUSH_SERVER_PORT, PUSH_SERVER_HOST, () => {
  console.log(
    `[push-server] Listening on http://${PUSH_SERVER_HOST}:${PUSH_SERVER_PORT} (env: ${NODE_ENV || 'development'})`
  );
});

const shutdownSignals = ['SIGINT', 'SIGTERM'];
shutdownSignals.forEach((signal) => {
  process.on(signal, () => {
    console.log(`[push-server] Received ${signal}. Shutting down...`);
    server.close(() => {
      console.log('[push-server] Server closed');
      process.exit(0);
    });
  });
});
