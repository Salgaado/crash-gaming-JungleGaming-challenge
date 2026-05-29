"use client";

import { useGameStore } from "@/stores/gameStore";
import { useAuth } from "react-oidc-context";

const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING_DEBIT:         { label: "Processing", color: "#f59e0b" },
  PENDING:               { label: "Active",      color: "#3cffd0" },
  CASHOUT_PENDING_CREDIT:{ label: "Cashed out",  color: "#3cffd0" },
  CASHED_OUT:            { label: "Cashed out",  color: "#3cffd0" },
  LOST:                  { label: "Lost",        color: "#ef4444" },
  REJECTED:              { label: "Rejected",    color: "#949494" },
};

export function BetsList() {
  const { round } = useGameStore();
  const auth = useAuth();
  const myId = (auth.user?.profile?.sub as string) ?? "";

  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#1a1a1a] p-4">
      <h3 style={mono} className="text-[10px] tracking-[1.8px] uppercase text-[#949494] mb-3">
        Bets ({round.bets.length})
      </h3>

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {round.bets.length === 0 && (
          <p style={mono} className="text-[10px] tracking-[1px] uppercase text-[#949494]/40 py-2">
            No bets yet
          </p>
        )}

        {round.bets.map((bet) => {
          const isMe = bet.playerId === myId;
          const s = STATUS_MAP[bet.status] ?? { label: bet.status, color: "#949494" };

          return (
            <div
              key={bet.betId}
              className={`flex justify-between items-center px-3 py-2 rounded-[12px] border ${
                isMe
                  ? "bg-[#131313] border-[#3cffd0]/30"
                  : "bg-[#131313] border-white/[0.05]"
              }`}
            >
              {/* Left: player + amount */}
              <div className="flex items-center gap-2">
                {isMe ? (
                  <span
                    style={mono}
                    className="text-[9px] tracking-[1.2px] uppercase text-black bg-[#3cffd0] px-2 py-0.5 rounded-[10px] font-bold"
                  >
                    You
                  </span>
                ) : (
                  <span style={mono} className="text-[10px] text-[#949494] truncate max-w-[68px]">
                    {bet.playerId.slice(0, 8)}
                  </span>
                )}
                <span style={mono} className="text-[11px] text-white font-bold">
                  {(parseInt(bet.amountCents) / 100).toFixed(2)}
                </span>
              </div>

              {/* Right: cashout multiplier + status */}
              <div className="flex items-center gap-2">
                {bet.cashoutMultiplier && (
                  <span style={{ ...mono, color: "#3cffd0" }} className="text-[11px] font-bold">
                    {bet.cashoutMultiplier}
                  </span>
                )}
                <span style={{ ...mono, color: s.color }} className="text-[10px] tracking-[0.8px] uppercase">
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
