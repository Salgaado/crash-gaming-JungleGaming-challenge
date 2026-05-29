"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "react-oidc-context";
import { useState } from "react";

const oidcConfig = {
  authority: process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8080/realms/crash-game",
  client_id: "crash-game-client",
  redirect_uri:
    typeof window !== "undefined"
      ? `${window.location.origin}/callback`
      : "http://localhost:3000/callback",
  post_logout_redirect_uri:
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  response_type: "code",
  scope: "openid profile email",
  // Disabled to prevent iframe-based session check which blocks on mobile
  // browsers (Safari, Chrome iOS) that restrict cross-origin iframes/cookies.
  monitorSession: false,
  automaticSilentRenew: false,
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5000, retry: 1 } },
      }),
  );

  return (
    <AuthProvider
      {...oidcConfig}
      onSigninCallback={() => {
        // Clean code/state params from URL after successful callback
        window.history.replaceState({}, document.title, "/");
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthProvider>
  );
}
