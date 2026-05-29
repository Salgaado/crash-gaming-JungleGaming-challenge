"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useCashOut } from "@/hooks/useCashOut";
import { multiplierColor } from "@/lib/multiplierColor";

const PRESETS = [1.5, 2, 3, 5, 10, 20];

const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };
const display = { fontFamily: "var(--font-bebas), Impact, 'Arial Black', sans-serif" };

function formatTarget(v: number) {
  return v % 1 === 0 ? `${v}x` : `${v.toFixed(1)}x`;
}

export function AutoCashout() {
  const { round, myBetId } = useGameStore();
  const cashOut = useCashOut();

  const [enabled, setEnabled] = useState(false);
  const [target, setTarget] = useState("2.00");
  const triggered = useRef(false);

  const isRunning = round.status === "RUNNING";
  const hasPendingBet = !!myBetId;
  const locked = isRunning && hasPendingBet; // can't change settings mid-round

  // Reset trigger each new round
  useEffect(() => {
    triggered.current = false;
  }, [round.roundId]);

  // Fire auto-cashout when multiplier crosses the target
  useEffect(() => {
    if (!enabled || !isRunning || !hasPendingBet || triggered.current || cashOut.isPending) return;
    const targetNum = parseFloat(target);
    if (!targetNum || targetNum < 1.01) return;
    const targetScaled = BigInt(Math.round(targetNum * 100));
    if (round.multiplierScaled >= targetScaled) {
      triggered.current = true;
      cashOut.mutate();
    }
  }, [round.multiplierScaled, enabled, isRunning, hasPendingBet]);

  const targetNum = parseFloat(target);
  const isValidTarget = !isNaN(targetNum) && targetNum >= 1.01;
  const targetScaled = isValidTarget ? BigInt(Math.round(targetNum * 100)) : null;
  const accentColor = targetScaled ? multiplierColor(targetScaled) : "#949494";

  const isPreset = (v: number) => parseFloat(target) === v;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <span style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494]">
          Auto Cashout
        </span>
        <button
          onClick={() => setEnabled((v) => !v)}
          style={mono}
          className={`px-3 py-1 text-[9px] tracking-[1.2px] uppercase font-bold rounded-[20px] border transition-colors duration-150 cursor-pointer ${
            enabled
              ? "bg-[#3cffd0] border-[#3cffd0] text-black"
              : "bg-transparent border-white/20 text-[#949494] hover:border-white/40 hover:text-white"
          }`}
        >
          {enabled ? "ON" : "OFF"}
        </button>
      </div>

      {enabled && (
        <>
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((v) => {
              const presetScaled = BigInt(Math.round(v * 100));
              const presetColor = multiplierColor(presetScaled);
              const active = isPreset(v);
              return (
                <button
                  key={v}
                  onClick={() => setTarget(v.toFixed(2))}
                  disabled={locked}
                  style={{
                    ...mono,
                    borderColor: active ? presetColor : undefined,
                    color: active ? (v < 3 ? "#000000" : "#ffffff") : undefined,
                    background: active ? presetColor : undefined,
                  }}
                  className={`px-3 py-1.5 rounded-[20px] text-[10px] font-bold tracking-[0.8px] border transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? ""
                      : "bg-transparent border-white/15 text-[#949494] hover:border-white/40 hover:text-white"
                  }`}
                >
                  {formatTarget(v)}
                </button>
              );
            })}
          </div>

          {/* Custom input */}
          <div className="space-y-1.5">
            <label style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494] block">
              Custom target
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={locked}
                min="1.01"
                step="0.01"
                placeholder="1.25"
                style={mono}
                className="flex-1 px-3 py-2 bg-[#131313] border border-white/20 rounded-[4px] text-white text-sm disabled:opacity-40 focus:outline-none focus:border-[#3cffd0] transition-colors duration-150"
              />
              <span
                style={{ ...display, color: isValidTarget ? accentColor : "#949494" }}
                className="text-[28px] leading-none min-w-[52px] text-right"
              >
                {isValidTarget ? `${targetNum.toFixed(2)}x` : "—"}
              </span>
            </div>
            {target && !isValidTarget && (
              <p style={mono} className="text-[10px] tracking-[1px] uppercase text-[#ef4444]">
                Min 1.01x
              </p>
            )}
          </div>

          {/* Active indicator */}
          {locked && isValidTarget && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[12px] border"
              style={{ borderColor: `${accentColor}40`, background: `${accentColor}10` }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: accentColor }}
              />
              <span style={{ ...mono, color: accentColor }} className="text-[10px] tracking-[1px] uppercase font-bold">
                Cashing out at {targetNum.toFixed(2)}x
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
