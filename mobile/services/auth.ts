import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./api";
import { User } from "../types";
import { MOCK_USER } from "../constants/mockData";

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(
  email: string,
  pass: string
): Promise<{ user: User | null; token: string | null; error: string | null }> {
  // If backend is running, try real endpoint
  const res = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: pass }),
  });

  if (res.data) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data.user));
    return { user: res.data.user, token: res.data.token, error: null };
  }

  // Fallback to offline / mock login for demo & offline usage
  if (email && pass.length >= 4) {
    const mockUser: User = {
      ...MOCK_USER,
      email: email,
    };
    const mockToken = `token-mock-${Date.now()}`;
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, mockToken);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
    return { user: mockUser, token: mockToken, error: null };
  }

  return {
    user: null,
    token: null,
    error: res.error || "Invalid login credentials. Please try again.",
  };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const json = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return json ? JSON.parse(json) : MOCK_USER; // Default fallback to inspector
  } catch (error) {
    return MOCK_USER;
  }
}

export async function logout(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error("Logout storage clear error:", error);
  }
}
