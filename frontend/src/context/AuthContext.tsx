import React, { createContext, useState, useEffect, useContext } from "react";
import type { ReactNode } from "react";
import api from "../lib/api";

// ----- Types -----
export interface User {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  role: "owner" | "customer" | "guest" | "employee";
  employeeRole?: string;
  address?: string;
  phone?: string;
  avatarUrl?: string;
  avatarFileId?: string;
  storeId?: string;
  store?: string;
  fullName?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: { firstName: string; lastName: string; email: string; password: string; confirmPassword?: string; role: string }) => Promise<User>;
  logout: () => void;
  continueAsGuest: () => Promise<User>;
  updateUser: (data: FormData | { firstName?: string; lastName?: string; address?: string; phone?: string; avatar?: File | string | null }) => Promise<User>;
}

// ----- Context -----
const AuthContext = createContext<AuthContextType | null>(null);

// ----- Provider -----
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  });

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    setLoading(false);
  }, [token]);

  // ----- Methods -----
  const login = async (email: string, password: string): Promise<User> => {
  const res = await api.post("/auth/login", { email, password });
  const userData: User = res.data.user;
    const userToken: string = res.data.token;

    setUser(userData);
    setToken(userToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userToken);

    return userData;
  };

  const signup = async (data: { firstName: string; lastName: string; email: string; password: string; confirmPassword?: string; role: string }): Promise<User> => {
    const res = await api.post("/auth/register", data);
    const userData: User = res.data.user;
    const userToken: string = res.data.token;

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

  const continueAsGuest = async (): Promise<User> => {
    const res = await api.post("/auth/guest");
    const userData: User = res.data.user;
    const userToken: string = res.data.token;

    setUser(userData);
    setToken(userToken);
    sessionStorage.setItem("user", JSON.stringify(userData));
    sessionStorage.setItem("token", userToken);

    return userData;
  };

  const updateUser: AuthContextType["updateUser"] = async (data) => {
    let form: FormData;
    if (data instanceof FormData) {
      form = data;
    } else {
      form = new FormData();
      if (data.firstName !== undefined) form.append('firstName', data.firstName);
      if (data.lastName !== undefined) form.append('lastName', data.lastName);
      if (data.address !== undefined) form.append('address', data.address);
      if (data.phone !== undefined) form.append('phone', data.phone);
      if (data.avatar instanceof File) form.append('avatar', data.avatar);
      else if (data.avatar === '') form.append('avatar', '');
    }

    const res = await api.put('/auth/profile', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    const updated: User = res.data.user;
    if (!updated) throw new Error('Failed updating profile');
    setUser(updated);
    // persist in storage matching where token currently is
    if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(updated));
    if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(updated));
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, continueAsGuest, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ----- Hook -----
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
