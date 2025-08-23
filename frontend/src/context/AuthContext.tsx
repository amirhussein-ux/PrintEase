import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../lib/api";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: { name: string; email: string; password: string; role: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Safe parsing for user
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser);
    } catch (err) {
      console.warn("Failed to parse user from localStorage:", err);
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState<boolean>(true);

  // Attach token automatically to API requests
  useEffect(() => {
    if (!token) return;
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, [token]);

  // Load latest profile if token exists
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/auth/profile");
        if (res.data?.user) {
          setUser(res.data.user);
          try {
            localStorage.setItem("user", JSON.stringify(res.data.user));
          } catch (err) {
            console.warn("Failed to save user to localStorage:", err);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        // Do NOT clear user/token — keep login persisted
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post("/auth/login", { email, password });
    const userData: User = res.data.user;
    const userToken: string = res.data.token;

    if (!userData || !userToken) throw new Error("Invalid login response");

    setUser(userData);
    setToken(userToken);

    try {
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", userToken);
    } catch (err) {
      console.warn("Failed to save login data to localStorage:", err);
    }

    return userData;
  };

  const signup = async (data: { name: string; email: string; password: string; role: string }): Promise<User> => {
    const res = await api.post("/auth/register", data);
    const userData: User = res.data.user;
    const userToken: string = res.data.token;

    if (!userData || !userToken) throw new Error("Invalid signup response");

    setUser(userData);
    setToken(userToken);

    try {
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", userToken);
    } catch (err) {
      console.warn("Failed to save signup data to localStorage:", err);
    }

    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
