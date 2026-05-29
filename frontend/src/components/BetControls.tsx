"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { useCashOut } from "@/hooks/useCashOut";
import { multiplierColor } from "@/lib/multiplierColor";
import { AutoCashout } from "./AutoCashout";

function formatMultiplier(scaled: bigint): string {
  const whole = scaled / 100n;
  const frac = scaled % 100n;
  return `${whole}.${frac.toString().padStart(2, "0")}x`;
}

const display = { fontFamily: "var(--font-bebas), Impact, 'Arial Black', sans-serif" };
const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

export function BetControls({ balanceCents }: { balanceCents?: string }) {
  const { round, myBetId } = useGameStore();
  const [amount, setAmount] = useState("10.00");
  const [countdown, setCountdown] = useState(0);
  const placeBet = usePlaceBet();
  const cashOut = useCashOut();

  const isBetting = round.status === "BETTING_OPEN";
  const isRunning = round.status === "RUNNING";
  const isCrashed = round.status === "CRASHED";
  const hasPendingBet = !!myBetId;

  const amountNum = parseFloat(amount) || 0;
  const amountCents = Math.round(amountNum * 100);
  const isValidAmount = amountCents >= 100 && amountCents <= 100000;
  const balance = balanceCents ? parseInt(balanceCents) / 100 : 0;
  const hasEnoughBalance = amountCents <= parseInt(balanceCents ?? "0");

  useEffect(() => {
    if (!isBetting || !round.bettingClosesAt) return;
    const update = () => {
      const ms = new Date(round.bettingClosesAt!).getTime() - Date.now();
      setCountdown(Math.max(0, Math.ceil(ms / 1000)));
    };
    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [isBetting, round.bettingClosesAt]);

  const handleBet = () => {
    if (!isValidAmount || !hasEnoughBalance) return;
    placeBet.mutate(amountCents.toString());
  };

  const potential = hasPendingBet && isRunning
    ? ((amountCents * Number(round.multiplierScaled)) / 100 / 100).toFixed(2)
    : null;

  const statusLabel = isBetting
    ? `BETTING · ${countdown}S`
    : isRunning
    ? "RUNNING"
    : isCrashed
    ? "CRASHED"
    : "WAITING";

  const statusColor = isCrashed ? "#ef4444" : isRunning ? "#3cffd0" : isBetting ? "#3cffd0" : "#949494";

  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#1a1a1a] p-5 space-y-4">

      {/* Balance */}
      <div className="flex justify-between items-center">
        <span style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494]">
          Balance
        </span>
        <span style={mono} className="text-sm font-bold text-white">
          {balance.toFixed(2)}
        </span>
      </div>

      <div className="border-t border-white/[0.06]" />

      {/* Status */}
      <div className="flex justify-between items-center">
        <span style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494]">
          Status
        </span>
        <span style={{ ...mono, color: statusColor }} className="text-[10px] tracking-[1.5px] uppercase font-bold">
          {statusLabel}
        </span>
      </div>

      {/* Live multiplier */}
      {isRunning && (
        <div className="flex justify-between items-center">
          <span style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494]">
            Multiplier
          </span>
          <span style={{ ...display, color: multiplierColor(round.multiplierScaled) }} className="text-[36px] leading-none">
            {formatMultiplier(round.multiplierScaled)}
          </span>
        </div>
      )}

      {/* Bet Amount */}
      <div className="space-y-2">
        <label style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494] block">
          Bet Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          max="1000"
          step="0.01"
          disabled={!isBetting || hasPendingBet}
          style={mono}
          className="w-full px-3 py-2.5 bg-[#131313] border border-white/20 rounded-[4px] text-white text-sm disabled:opacity-40 focus:outline-none focus:border-[#3cffd0] transition-colors duration-150"
        />
        {amountNum > 0 && !isValidAmount && (
          <p style={mono} className="text-[10px] tracking-[1px] uppercase text-[#ef4444]">
            Amount: 1.00 – 1000.00
          </p>
        )}
        {isValidAmount && !hasEnoughBalance && (
          <p style={mono} className="text-[10px] tracking-[1px] uppercase text-[#ef4444]">
            Insufficient funds
          </p>
        )}
      </div>

      {/* Auto Cashout */}
      <div className="border-t border-white/[0.06] pt-4">
        <AutoCashout />
      </div>

      {/* Place Bet */}
      {!hasPendingBet && (
        <button
          onClick={handleBet}
          disabled={!isBetting || !isValidAmount || !hasEnoughBalance || placeBet.isPending}
          style={mono}
          className="w-full py-3 bg-[#3cffd0] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-black text-[11px] font-bold tracking-[1.5px] uppercase rounded-[24px] transition-colors duration-150 cursor-pointer"
        >
          {placeBet.isPending ? "PLACING..." : "PLACE BET"}
        </button>
      )}

      {/* Cash Out */}
      {hasPendingBet && isRunning && (
        <button
          onClick={() => cashOut.mutate()}
          disabled={cashOut.isPending}
          style={mono}
          className="w-full py-3 border border-[#3cffd0] hover:bg-[#3cffd0] hover:text-black disabled:opacity-40 text-[#3cffd0] text-[11px] font-bold tracking-[1.5px] uppercase rounded-[24px] transition-colors duration-150 cursor-pointer"
        >
          {cashOut.isPending
            ? "CASHING OUT..."
            : `CASH OUT${potential ? ` · ${potential}` : ""}`}
        </button>
      )}

      {/* Waiting */}
      {hasPendingBet && !isRunning && (
        <div
          style={mono}
          className="w-full py-3 text-center border border-white/[0.08] text-[#949494] text-[10px] tracking-[1.5px] uppercase rounded-[24px]"
        >
          Waiting for round...
        </div>
      )}
    </div>
  );
}
