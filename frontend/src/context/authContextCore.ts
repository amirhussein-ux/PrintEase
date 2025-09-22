import { createContext } from "react";
import type { ReactNode } from "react";

export interface User {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  role: "owner" | "customer" | "guest";
  address?: string;
  phone?: string;
  avatarFileId?: string | null;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: { firstName: string; lastName: string; email: string; password: string; confirmPassword: string; role: string }) => Promise<User>;
  logout: () => void;
  continueAsGuest: () => Promise<User>;
  updateUser: (data: FormData | { firstName?: string; lastName?: string; address?: string; phone?: string; avatar?: File | string | null }) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProviderProps = ({} as { children: ReactNode });
