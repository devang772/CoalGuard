import AsyncStorage from "@react-native-async-storage/async-storage";

// Default API URL fallback to local machine IP / localhost
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.100:8000/api/v1";

export const TOKEN_STORAGE_KEY = "@coalguard_auth_token";
export const USER_STORAGE_KEY = "@coalguard_user";

export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error("Error reading auth token:", error);
    return null;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const token = await getAuthToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const status = response.status;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errorData.message || `API error: HTTP ${status}`,
        status,
      };
    }

    const data: T = await response.json();
    return { data, error: null, status };
  } catch (error: any) {
    console.warn("API network request failed (Offline Mode Active):", error.message);
    return {
      data: null,
      error: error.message || "Network request failed. Offline mode active.",
      status: 0,
    };
  }
}
