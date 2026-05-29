"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { apiGet } from "@/services/apiClient";

interface BetHistoryEntry {
  betId: string;
  roundId: string;
  roundIndex: number;
  amountCents: string;
  status: string;
  cashoutMultiplier: string | null;
  payoutCents: string | null;
  crashPoint: string;
  createdAt: string;
}

const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CASHED_OUT:             { label: "CASHED OUT", color: "#3cffd0" },
  CASHOUT_PENDING_CREDIT: { label: "CASHED OUT", color: "#3cffd0" },
  LOST:                   { label: "LOST",        color: "#ef4444" },
  PENDING:                { label: "ACTIVE",      color: "#f59e0b" },
  PENDING_DEBIT:          { label: "PROCESSING",  color: "#f59e0b" },
  REJECTED:               { label: "REJECTED",    color: "#949494" },
};

const COLS = ["Round", "Amount", "Status", "Cash Mult", "P&L", "Crash At", "Time"];

export function BetHistory() {
  const auth = useAuth();
  const token = auth.user?.access_token;

  const { data, isLoading } = useQuery<BetHistoryEntry[]>({
    queryKey: ["bet-history"],
    queryFn: () => apiGet<BetHistoryEntry[]>("/games/bets/me?limit=20", token),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const bets = data ?? [];

  if (isLoading) {
    return (
      <p style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494] py-6 text-center">
        Loading...
      </p>
    );
  }

  if (bets.length === 0) {
    return (
      <p style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494]/40 py-8 text-center">
        No bets yet — place your first bet above
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {COLS.map((h) => (
              <th
                key={h}
                style={mono}
                className="text-left text-[9px] tracking-[1.5px] uppercase text-[#949494] pb-3 pr-5 font-normal"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => {
            const s = STATUS_MAP[bet.status] ?? { label: bet.status, color: "#949494" };
            const amount = parseInt(bet.amountCents) / 100;
            const payout = bet.payoutCents ? parseInt(bet.payoutCents) / 100 : null;
            const pnl = payout !== null ? payout - amount : null;
            const pnlColor = pnl === null ? "#949494" : pnl > 0 ? "#3cffd0" : "#ef4444";

            return (
              <tr
                key={bet.betId}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100"
              >
                <td style={mono} className="py-3 pr-5 text-[11px] text-white font-bold">
                  #{bet.roundIndex}
                </td>
                <td style={mono} className="py-3 pr-5 text-[11px] text-white">
                  {amount.toFixed(2)}
                </td>
                <td style={{ ...mono, color: s.color }} className="py-3 pr-5 text-[9px] tracking-[0.8px] uppercase font-bold">
                  {s.label}
                </td>
                <td style={{ ...mono, color: bet.cashoutMultiplier ? "#3cffd0" : "#949494" }} className="py-3 pr-5 text-[11px]">
                  {bet.cashoutMultiplier ?? "—"}
                </td>
                <td style={{ ...mono, color: pnlColor }} className="py-3 pr-5 text-[11px] font-bold">
                  {pnl !== null ? `${pnl > 0 ? "+" : ""}${pnl.toFixed(2)}` : "—"}
                </td>
                <td style={mono} className="py-3 pr-5 text-[11px] text-[#949494]">
                  {bet.crashPoint}
                </td>
                <td style={mono} className="py-3 text-[10px] text-[#949494]">
                  {new Date(bet.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
