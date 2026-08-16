"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { getCurrentUser, logout as logoutUser, saveAuth } from "@/lib/auth";

import type { LoginResponse, User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  login: (data: LoginResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  function login(data: LoginResponse) {
    saveAuth(data);
    setUser(data.user);
  }

  function logout() {
    logoutUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
