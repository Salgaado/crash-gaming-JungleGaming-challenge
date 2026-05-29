"use client";

import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useRouter } from "next/navigation";

const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

export default function CallbackPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading) return;
    // Redirect whether authenticated or not — on error the home page shows login
    router.replace("/");
  }, [auth.isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#131313]">
      <span
        style={mono}
        className="text-[11px] tracking-[1.8px] uppercase text-[#949494] animate-pulse"
      >
        {auth.error ? "Auth error — redirecting..." : "Authenticating..."}
      </span>
    </div>
  );
}
