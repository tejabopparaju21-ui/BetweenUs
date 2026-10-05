import { CallSession } from '../types';

/**
 * Unique Device Session ID for Calling in BetweenUs
 * Scoped to sessionStorage so different browser tabs/windows or devices
 * are strictly distinguishable even in demo mode or shared accounts.
 */
export function getCallDeviceSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let id = sessionStorage.getItem('betweenus_call_session_id');
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem('betweenus_call_session_id', id);
    }
    return id;
  } catch (_) {
    return 'fallback_session_' + Math.random().toString(36).slice(2, 7);
  }
}

/**
 * Checks whether an incoming or cached call session is stale/expired.
 * Prevents old calls from ringing or appearing as connected ("auto-lifting").
 */
export function isCallStale(call: CallSession | null | undefined): boolean {
  if (!call) return true;
  if (call.status === 'declined' || call.status === 'ended' || call.status === 'missed') {
    return true;
  }

  const now = Date.now();
  const started = new Date(call.startedAt).getTime();

  // If ringing for more than 45 seconds without an answer, it has timed out
  if (call.status === 'ringing' && now - started > 45000) {
    return true;
  }

  // If connected for more than 12 hours or corrupted, treat as stale
  if (call.status === 'connected' && call.connectedAt) {
    const connected = new Date(call.connectedAt).getTime();
    if (now - connected > 12 * 3600 * 1000) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves whether the current device is the CALLER or RECIPIENT.
 * In a private 2-person couple app:
 * - The device that clicked "Start Call" is ALWAYS the CALLER (Outgoing screen).
 * - The other device that received the call is ALWAYS the RECIPIENT (Incoming screen with Accept/Lift button).
 */
export function resolveCallRole(
  activeCall: CallSession | null,
  currentUserId: string,
  mySessionId: string
): { isCaller: boolean; isRecipient: boolean } {
  if (!activeCall) return { isCaller: false, isRecipient: false };

  // 1. Primary check: Device Session ID (100% accurate across devices and tabs)
  if (activeCall.callerDeviceId) {
    const isCaller = activeCall.callerDeviceId === mySessionId;
    return {
      isCaller,
      isRecipient: !isCaller,
    };
  }

  // 2. Secondary check: User ID comparison
  if (activeCall.callerId && activeCall.callerId === currentUserId) {
    return {
      isCaller: true,
      isRecipient: false,
    };
  }

  // 3. Fallback: If not caller, must be recipient
  return {
    isCaller: false,
    isRecipient: true,
  };
}
