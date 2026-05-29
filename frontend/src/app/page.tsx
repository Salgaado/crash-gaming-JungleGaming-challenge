"use client";

import { useAuth } from "react-oidc-context";
import { GamePage } from "@/components/GamePage";

const display = { fontFamily: "var(--font-bebas), Impact, 'Arial Black', sans-serif" };
const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

export default function Home() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#131313]">
        <span style={mono} className="text-[11px] tracking-[1.8px] uppercase text-[#949494] animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#131313] px-6">
        <div className="text-center max-w-lg">
          {/* Hero headline */}
          <h1
            style={display}
            className="text-[108px] leading-[0.88] text-white uppercase mb-6 select-none"
          >
            Crash<br />Game
          </h1>

          {/* Eyebrow */}
          <p style={mono} className="text-[11px] tracking-[1.9px] uppercase text-[#949494] mb-10">
            Jungle Gaming · Fictional credits only
          </p>

          {/* Mint CTA */}
          <button
            onClick={() => auth.signinRedirect()}
            style={mono}
            className="px-10 py-3.5 bg-[#3cffd0] hover:bg-white text-black text-[11px] font-bold tracking-[1.5px] uppercase rounded-[24px] transition-colors duration-150 cursor-pointer"
          >
            Login with Keycloak
          </button>

          {/* Footer note */}
          <p style={mono} className="mt-8 text-[10px] tracking-[1.5px] uppercase text-[#949494]/40">
            Provably fair · Open source
          </p>
        </div>
      </div>
    );
  }

  return <GamePage />;
}
