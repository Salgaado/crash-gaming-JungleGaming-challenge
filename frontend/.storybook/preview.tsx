import type { Preview } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "react-oidc-context";
import React, { useRef } from "react";
import "../src/app/globals.css";

export const mockUser = {
  profile: { sub: "mock-player-id-0000", preferred_username: "player" },
  access_token: "mock-access-token",
  id_token: "mock-id-token",
  token_type: "Bearer" as const,
  scope: "openid",
  expires_in: 3600,
  expired: false,
  scopes: ["openid"],
  toStorageString: () => "{}",
};

const mockAuthValue = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  isSigningIn: false,
  isSigningOut: false,
  activeNavigator: undefined,
  error: undefined,
  signinRedirect: () => Promise.resolve(),
  signoutRedirect: () => Promise.resolve(),
  removeUser: () => Promise.resolve(),
  revokeTokens: () => Promise.resolve(),
  signinSilent: () => Promise.resolve(null),
  clearStaleState: () => Promise.resolve(),
  signinPopup: () => Promise.resolve(null as never),
  signoutPopup: () => Promise.resolve(),
  signinCallback: () => Promise.resolve(null as never),
  signoutCallback: () => Promise.resolve(),
  startSilentRenew: () => {},
  stopSilentRenew: () => {},
  events: {} as never,
  settings: {} as never,
  metadataService: {} as never,
};

type MockQuery = { key: unknown[]; data: unknown };

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const qcRef = useRef<QueryClient | null>(null);
      if (!qcRef.current) {
        qcRef.current = new QueryClient({
          defaultOptions: {
            queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
            mutations: { retry: false },
          },
        });
        const queries: MockQuery[] = context.parameters?.mockQueries ?? [];
        queries.forEach(({ key, data }) => {
          qcRef.current!.setQueryData(key, data);
        });
      }
      return (
        <AuthContext.Provider value={mockAuthValue as never}>
          <QueryClientProvider client={qcRef.current}>
            <div style={{ background: "#131313", padding: "24px", minHeight: "240px" }}>
              <Story />
            </div>
          </QueryClientProvider>
        </AuthContext.Provider>
      );
    },
  ],
  parameters: {
    backgrounds: {
      default: "canvas",
      values: [{ name: "canvas", value: "#131313" }],
    },
    layout: "fullscreen",
  },
};

export default preview;
