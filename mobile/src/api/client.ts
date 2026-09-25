import { Platform } from 'react-native';
import { useAuthStore } from '../store/auth';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getBaseUrl();

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
  timeoutMs?: number;
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, timeoutMs = 5000, headers, ...customConfig } = options;

  const authToken = token !== undefined ? token : useAuthStore.getState().token;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (!(customConfig.body instanceof FormData)) {
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

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    clearTimeout(id);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.detail) {
          errorMessage = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fallback to HTTP status message
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Network request timed out. Make sure backend is running.');
    }
    throw error;
  }
}

