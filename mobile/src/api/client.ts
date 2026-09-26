import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/auth';

const getBaseUrl = () => {
  // In a browser the backend runs on the same computer as the page: http://localhost:8081 -> http://localhost:8000.
  // (EXPO_PUBLIC_API_URL holds the laptop's Wi-Fi address for phones, which a PC browser may not be able to reach.)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return process.env.EXPO_PUBLIC_WEB_API_URL?.replace(/\/+$/, '') || `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  // Expo Go on a phone: the laptop running Metro is also running the backend on port 8000.
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  const host = hostUri ? String(hostUri).split(':')[0] : null;
  if (host && host !== 'localhost' && host !== '127.0.0.1' && Platform.OS !== 'web') {
    return `http://${host}:8000`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getBaseUrl();

/** Error from the API. `status` is 0 when the server could not be reached (offline / timeout). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function isNetworkError(err: unknown): boolean {
  return err instanceof ApiError ? err.status === 0 : err instanceof TypeError;
}

/** Evidence and report links from the API are relative ("/evidence/12/file?sig=…"). */
export function fileUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return /^(https?:|data:|file:|blob:)/.test(url) ? url : `${API_BASE_URL}${url}`;
}

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
  timeoutMs?: number;
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, timeoutMs = 15000, headers, ...customConfig } = options;

  const authToken = token !== undefined ? token : useAuthStore.getState().token;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  if (customConfig.body && !(customConfig.body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: requestHeaders,
    signal: controller.signal,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (error: any) {
    clearTimeout(id);
    if (error?.name === 'AbortError') {
      throw new ApiError('Network request timed out. Make sure the backend is running.', 0);
    }
    throw new ApiError(`Cannot reach the server at ${API_BASE_URL}.`, 0);
  }
  clearTimeout(id);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      const detail = errorJson?.message ?? errorJson?.detail;
      if (detail) {
        errorMessage = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
    } catch {
      // Fallback to HTTP status message
    }
    // Expired / invalid session: drop it so the auth guard sends the user back to login.
    if (response.status === 401 && authToken && authToken === useAuthStore.getState().token) {
      useAuthStore.getState().logout();
    }
    throw new ApiError(errorMessage, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
