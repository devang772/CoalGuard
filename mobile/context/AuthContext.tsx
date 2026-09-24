import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";
import { getCurrentUser, login, logout } from "../services/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (email: string, pass: string) => Promise<{ success: boolean; error: string | null }>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed loading auth user:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const loginUser = async (email: string, pass: string) => {
    setIsLoading(true);
    const res = await login(email, pass);
    setIsLoading(false);
    if (res.user) {
      setUser(res.user);
      return { success: true, error: null };
    }
    return { success: false, error: res.error || "Login failed" };
  };

  const logoutUser = async () => {
    setIsLoading(true);
    await logout();
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
