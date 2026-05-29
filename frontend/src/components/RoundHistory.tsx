"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/apiClient";
import { useGameStore } from "@/stores/gameStore";

interface HistoryEntry {
  roundId: string;
  roundIndex: number;
  crashPoint: string;
  crashPointScaled: string;
}

const mono = { fontFamily: "var(--font-mono), 'Space Mono', 'Courier New', monospace" };

function badgeStyle(scaled: string): React.CSSProperties {
  const n = parseInt(scaled);
  if (n < 150) return { background: "#ef4444", color: "#000000" };
  if (n < 200) return { background: "#f97316", color: "#000000" };
  if (n < 300) return { background: "#5200ff", color: "#ffffff" };
  return { background: "#3cffd0", color: "#000000" };
}

export function RoundHistory() {
  const { round } = useGameStore();

  const { data: history } = useQuery<HistoryEntry[]>({
    queryKey: ["round-history", round.roundIndex],
    queryFn: () => apiGet<HistoryEntry[]>("/games/rounds/history?limit=20"),
    refetchInterval: 5000,
  });

  const items = history ?? [];

  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#1a1a1a] p-4">
      <h3 style={mono} className="text-[10px] tracking-[1.8px] uppercase text-[#949494] mb-3">
        Round History
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && (
          <span style={mono} className="text-[10px] tracking-[1px] uppercase text-[#949494]/40">
            No history yet
          </span>
        )}
        {items.map((item) => (
          <span
            key={item.roundId}
            style={{ ...mono, ...badgeStyle(item.crashPointScaled) }}
            className="px-3 py-1 rounded-[20px] text-[11px] font-bold tracking-[0.8px]"
          >
            {item.crashPoint}
          </span>
        ))}
      </div>
    </div>
  );
}
