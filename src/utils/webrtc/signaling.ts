import { supabase } from '@/integrations/supabase/client';

export type SignalType = 'offer' | 'answer' | 'candidate' | 'leave';

export interface SignalMessage {
  type: SignalType;
  senderId: string;
  payload?: any;
}

export interface SignalingOptions {
  roomId: string;
  onMessage: (msg: SignalMessage) => void;
}

export function createSignalingChannel({ roomId, onMessage }: SignalingOptions) {
  const channel = supabase.channel(`webrtc:${roomId}`, {
    config: { broadcast: { self: false }, presence: { key: supabase.auth.getUser().then(r => r.data.user?.id || Math.random().toString(36).slice(2)) } as any },
  });

  channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
    onMessage(payload as SignalMessage);
  });

  async function subscribe() {
    await channel.subscribe();
  }

  async function send(msg: SignalMessage) {
    await channel.send({ type: 'broadcast', event: 'signal', payload: msg });
  }

  async function trackPresence(meta?: Record<string, any>) {
    await channel.track(meta || {});
  }

  function getPresenceState() {
    return channel.presenceState();
  }

  async function close() {
    await channel.unsubscribe();
  }

  return { subscribe, send, trackPresence, getPresenceState, close };
}

export function defaultRtcConfig(): RTCConfiguration {
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const turnUser = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
  ];

  if (turnUrl && turnUser && turnCred) {
    iceServers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }

  return { iceServers, iceCandidatePoolSize: 8 };
}


