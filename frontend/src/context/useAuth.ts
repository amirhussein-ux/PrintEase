import { useContext } from "react";
import { AuthContext } from "./authContextCore";
import type { AuthContextType } from "./authContextCore";

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx as AuthContextType;
};