"use client";

import { useState } from "react";
import { BetHistory } from "./BetHistory";
import { ProveablyFair } from "./ProveablyFair";

type Tab = "bets" | "fair";

const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

const TABS: { key: Tab; label: string }[] = [
  { key: "bets", label: "My Bets" },
  { key: "fair", label: "Provably Fair" },
];

export function HistoryPanel() {
  const [tab, setTab] = useState<Tab>("bets");

  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#1a1a1a] overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-white/[0.08]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={mono}
            className={`px-6 py-4 text-[10px] tracking-[1.8px] uppercase font-bold transition-colors duration-150 cursor-pointer relative ${
              tab === key ? "text-[#3cffd0]" : "text-[#949494] hover:text-white"
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3cffd0]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {tab === "bets" ? <BetHistory /> : <ProveablyFair />}
      </div>
    </div>
  );
}
