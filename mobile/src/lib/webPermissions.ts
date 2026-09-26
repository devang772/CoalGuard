/**
 * Camera / microphone permission in a browser (Expo web on a PC).
 * The browser only shows its "Allow" prompt from getUserMedia, and only on a secure page
 * (http://localhost or https) — on http://<wifi-ip>:8081 the camera and microphone are always blocked.
 */
export type WebPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function webMediaProblem(): string | null {
  if (typeof window === 'undefined') return null;
  if (!window.isSecureContext) {
    return `This browser blocks the camera and microphone on ${window.location.origin}. Open the app at ` +
      `http://localhost:${window.location.port || '8081'} instead (or use HTTPS).`;
  }
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser has no camera / microphone support.';
  return null;
}

export async function webPermissionStatus(kind: 'camera' | 'microphone'): Promise<WebPermission> {
  if (webMediaProblem()) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: kind as PermissionName });
    return status.state as WebPermission;
  } catch {
    return 'prompt';   // Firefox / Safari can't query camera permission; asking will show the prompt
  }
}

/** Shows the browser's prompt. Returns 'denied' if the user (or an earlier "Block") refused. */
export async function requestWebMedia(kind: 'camera' | 'microphone'): Promise<WebPermission> {
  if (webMediaProblem()) return 'unsupported';
  try {
    const stream = await navigator.mediaDevices.getUserMedia(kind === 'camera' ? { video: true } : { audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (err: any) {
    return err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'unsupported';
  }
}

export const BLOCKED_HELP =
  'The browser has blocked it for this site. Click the camera / lock icon at the left of the address bar → ' +
  'Site settings → set Camera and Microphone to "Allow", then reload the page.';
