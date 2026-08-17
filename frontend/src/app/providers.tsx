"use client";

import { AuthProvider } from "@/lib/auth-context";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
