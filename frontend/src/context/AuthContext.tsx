import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../lib/api";
import { AuthContext } from "./authContextCore";
import type { User } from "./authContextCore";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.warn("Failed to parse stored user:", err);
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  });

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setLoading(false);
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post("/auth/login", { email, password });
    const userData: User = res.data.user;
    const userToken: string = res.data.token;

    if (!userData || !userToken) throw new Error("Invalid login response");

    setUser(userData);
    setToken(userToken);

    // persist normal users
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userToken);

    return userData;
  };

  const signup = async (data: { firstName: string; lastName: string; email: string; password: string; confirmPassword?: string; role: string }): Promise<User> => {
    // forward confirmPassword to backend so server-side validation can return specific errors (e.g. minlength)
    const res = await api.post("/auth/register", data);
    const userData: User = res.data.user;
    const userToken: string = res.data.token;

    if (!userData || !userToken) throw new Error("Invalid signup response");

    setUser(userData);
    setToken(userToken);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userToken);

    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
  };

  // ✅ Real guest login using backend
  const continueAsGuest = async (): Promise<User> => {
    const res = await api.post("/auth/guest");
    const userData: User = res.data.user;
    const userToken: string = res.data.token;

    setUser(userData);
    setToken(userToken);

    // store in sessionStorage (cleared when tab/browser closes)
    sessionStorage.setItem("user", JSON.stringify(userData));
    sessionStorage.setItem("token", userToken);

    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

// Note: useAuth hook is exported from ./useAuth.ts
