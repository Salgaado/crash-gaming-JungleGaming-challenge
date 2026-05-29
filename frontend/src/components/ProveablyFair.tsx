"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiGet } from "@/services/apiClient";
import { useGameStore } from "@/stores/gameStore";

interface FairRound {
  roundId: string;
  roundIndex: number;
  crashPointScaled: string;
  crashPoint: string;
  crashedAt: string | null;
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
}

const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

// HMAC-SHA256 using Web Crypto API (matches Node.js createHmac behavior with UTF-8 encoding)
async function computeCrashPoint(serverSeed: string, clientSeed: string): Promise<number> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(serverSeed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(clientSeed));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const h = parseInt(hex.slice(0, 8), 16);
  const e = 2 ** 32;
  if (h < e * 0.04) return 100;
  const m = Math.floor((100 * e) / (e - h));
  return m < 100 ? 100 : m;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function trunc(hash: string, n = 18) {
  return `${hash.slice(0, n)}…`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      style={mono}
      className="ml-1 text-[9px] tracking-[1px] uppercase text-[#949494] hover:text-[#3cffd0] transition-colors cursor-pointer"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

// Manual verification tool
function VerifyTool() {
  const [seed, setSeed] = useState("");
  const [client, setClient] = useState("");
  const [result, setResult] = useState<{ crashPoint: string; hashOk: boolean | null; hash: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const run = async () => {
    if (!seed || !client) return;
    setChecking(true);
    try {
      const cp = await computeCrashPoint(seed, client);
      const hash = await sha256Hex(seed);
      setResult({
        crashPoint: `${(cp / 100).toFixed(2)}x`,
        hashOk: null,
        hash,
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mt-6 border-t border-white/[0.06] pt-5">
      <p style={mono} className="text-[10px] tracking-[1.8px] uppercase text-[#949494] mb-3">
        Verify Manually
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="Server seed (hex)"
          style={mono}
          className="flex-1 px-3 py-2 bg-[#131313] border border-white/20 rounded-[4px] text-white text-[11px] placeholder-[#949494]/50 focus:outline-none focus:border-[#3cffd0] transition-colors"
        />
        <input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Client seed (round #)"
          style={mono}
          className="w-40 px-3 py-2 bg-[#131313] border border-white/20 rounded-[4px] text-white text-[11px] placeholder-[#949494]/50 focus:outline-none focus:border-[#3cffd0] transition-colors"
        />
        <button
          onClick={run}
          disabled={!seed || !client || checking}
          style={mono}
          className="px-5 py-2 bg-[#3cffd0] hover:bg-white disabled:opacity-30 text-black text-[10px] font-bold tracking-[1.5px] uppercase rounded-[24px] transition-colors cursor-pointer"
        >
          {checking ? "..." : "Verify"}
        </button>
      </div>
      {result && (
        <div className="flex gap-6 items-center">
          <span style={mono} className="text-[10px] tracking-[1px] uppercase text-[#949494]">
            Crash Point:{" "}
            <span className="text-[#3cffd0] font-bold">{result.crashPoint}</span>
          </span>
          <span style={mono} className="text-[10px] tracking-[1px] uppercase text-[#949494]">
            SHA-256 Hash:{" "}
            <span className="text-white">{trunc(result.hash, 20)}</span>
            <CopyButton value={result.hash} />
          </span>
        </div>
      )}
    </div>
  );
}

const COLS = ["#", "Client Seed", "Server Hash", "Server Seed", "Crash", "Verified"];

export function ProveablyFair() {
  const { round } = useGameStore();
  const [verifyStatus, setVerifyStatus] = useState<Record<string, boolean | "pending">>({});

  const { data: history } = useQuery<FairRound[]>({
    queryKey: ["fair-history", round.roundIndex],
    queryFn: () => apiGet<FairRound[]>("/games/rounds/history?limit=20"),
    refetchInterval: 10000,
  });

  const items = history ?? [];

  // Run in-browser verification for all rounds
  useEffect(() => {
    if (!items.length) return;
    const pending: Record<string, "pending"> = {};
    items.forEach((r) => { pending[r.roundId] = "pending"; });
    setVerifyStatus(pending);

    items.forEach(async (r) => {
      try {
        const computed = await computeCrashPoint(r.serverSeed, r.clientSeed);
        const hashOk = (await sha256Hex(r.serverSeed)) === r.serverSeedHash;
        const ok = computed === parseInt(r.crashPointScaled) && hashOk;
        setVerifyStatus((prev) => ({ ...prev, [r.roundId]: ok }));
      } catch {
        setVerifyStatus((prev) => ({ ...prev, [r.roundId]: false }));
      }
    });
  }, [history]);

  return (
    <div>
      {/* Algorithm note */}
      <p style={mono} className="text-[10px] leading-relaxed tracking-[0.5px] text-[#949494]/70 mb-4">
        Crash point = HMAC-SHA256(serverSeed, clientSeed) · Client seed = round index ·
        SHA-256(serverSeed) = serverSeedHash shown before crash
      </p>

      {items.length === 0 && (
        <p style={mono} className="text-[10px] tracking-[1.5px] uppercase text-[#949494]/40 py-6 text-center">
          No settled rounds yet
        </p>
      )}

      {items.length > 0 && (
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
              {items.map((r) => {
                const v = verifyStatus[r.roundId];
                const crashN = parseInt(r.crashPointScaled);
                const crashColor =
                  crashN < 150 ? "#ef4444" :
                  crashN < 200 ? "#f97316" :
                  crashN < 300 ? "#a78bfa" : "#3cffd0";

                return (
                  <tr
                    key={r.roundId}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100"
                  >
                    <td style={mono} className="py-3 pr-5 text-[11px] text-white font-bold">
                      #{r.roundIndex}
                    </td>
                    <td style={mono} className="py-3 pr-5 text-[11px] text-[#949494]">
                      {r.clientSeed}
                    </td>
                    <td style={mono} className="py-3 pr-5 text-[11px] text-[#3cffd0]">
                      <span title={r.serverSeedHash}>{trunc(r.serverSeedHash)}</span>
                      <CopyButton value={r.serverSeedHash} />
                    </td>
                    <td style={mono} className="py-3 pr-5 text-[11px] text-white">
                      <span title={r.serverSeed}>{trunc(r.serverSeed)}</span>
                      <CopyButton value={r.serverSeed} />
                    </td>
                    <td style={{ ...mono, color: crashColor }} className="py-3 pr-5 text-[11px] font-bold">
                      {r.crashPoint}
                    </td>
                    <td className="py-3">
                      {v === "pending" ? (
                        <span style={mono} className="text-[10px] text-[#949494] animate-pulse">…</span>
                      ) : v === true ? (
                        <span style={mono} className="text-[11px] text-[#3cffd0] font-bold">✓</span>
                      ) : (
                        <span style={mono} className="text-[11px] text-[#ef4444] font-bold">✗</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <VerifyTool />
    </div>
  );
}
