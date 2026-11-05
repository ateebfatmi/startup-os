"use client";

import type { ReactNode } from "react";

export function ClerkProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useUser() {
  return { isLoaded: true, user: null };
}

const demoClerk = { signOut: async () => {} };
export function useClerk() {
  return demoClerk;
}

function NoClerkUI() {
  return null;
}

export {
  NoClerkUI as AuthenticateWithRedirectCallback,
  NoClerkUI as ClerkLoaded,
  NoClerkUI as ClerkLoading,
  NoClerkUI as SignIn,
  NoClerkUI as SignUp,
};
