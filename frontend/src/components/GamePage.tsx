"use client";

import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useWallet } from "@/hooks/useWallet";
import { CrashChart } from "./CrashChart";
import { BetControls } from "./BetControls";
import { BetsList } from "./BetsList";
import { RoundHistory } from "./RoundHistory";
import { HistoryPanel } from "./HistoryPanel";

const display = { fontFamily: "var(--font-bebas), Impact, 'Arial Black', sans-serif" };
const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

export function GamePage() {
  const auth = useAuth();
  const username = (auth.user?.profile?.preferred_username as string) ?? "Player";
  const { walletQuery, createWalletMutation } = useWallet();

  useGameSocket();

  useEffect(() => {
    if (walletQuery.isError && !walletQuery.isFetching) {
      createWalletMutation.mutate();
    }
  }, [walletQuery.isError]);

  const wallet = walletQuery.data;

  return (
    <div className="min-h-screen bg-[#131313] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.08] px-6 py-4 flex justify-between items-center">
        <h1 style={display} className="text-[32px] leading-none tracking-[2px] text-white uppercase">
          Crash
        </h1>
        <div className="flex items-center gap-6">
          <span style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494]">
            {username}
          </span>
          {wallet && (
            <span
              style={mono}
              className="text-[10px] tracking-[1.2px] uppercase font-bold text-black bg-[#3cffd0] px-3 py-1.5 rounded-[20px]"
            >
              {parseFloat(wallet.balance).toFixed(2)} cr
            </span>
          )}
          <button
            onClick={() => auth.signoutRedirect()}
            style={mono}
            className="text-[10px] tracking-[1.5px] uppercase text-[#949494] hover:text-[#3860be] transition-colors duration-150 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Chart + History */}
        <div className="lg:col-span-2 space-y-4">
          <CrashChart />
          <RoundHistory />
        </div>

        {/* Right — Controls + Bets */}
        <div className="space-y-4">
          <BetControls balanceCents={wallet?.balanceCents} />
          <BetsList />
        </div>
      </main>

      {/* History Panel — full width */}
      <section className="max-w-6xl w-full mx-auto px-6 pb-6">
        <HistoryPanel />
      </section>

      {/* Footer */}
      <footer className="py-5 text-center">
        <span style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494]/25">
          Technical challenge · Fictional credits only
        </span>
      </footer>
    </div>
  );
}
