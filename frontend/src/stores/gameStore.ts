import { create } from "zustand";

export interface BetInfo {
  betId: string;
  playerId: string;
  amountCents: string;
  status: string;
  cashoutMultiplier: string | null;
  payoutCents: string | null;
}

export interface RoundState {
  roundId: string | null;
  roundIndex: number | null;
  status: "BETTING_OPEN" | "RUNNING" | "CRASHED" | "SETTLED" | "WAITING";
  serverSeedHash: string | null;
  multiplierScaled: bigint;
  elapsedMs: number;
  startedAt: string | null;
  bettingClosesAt: string | null;
  bets: BetInfo[];
  lastCrashPoints: string[]; // last ~20 crash points
}

interface GameStore {
  round: RoundState;
  myBetId: string | null;
  setRound: (partial: Partial<RoundState>) => void;
  setBet: (betId: string) => void;
  clearBet: () => void;
  addBet: (bet: BetInfo) => void;
  updateBet: (betId: string, partial: Partial<BetInfo>) => void;
  setMultiplier: (scaled: bigint, elapsedMs: number) => void;
  recordCrash: (crashPoint: string) => void;
}

const DEFAULT_ROUND: RoundState = {
  roundId: null,
  roundIndex: null,
  status: "WAITING",
  serverSeedHash: null,
  multiplierScaled: 100n,
  elapsedMs: 0,
  startedAt: null,
  bettingClosesAt: null,
  bets: [],
  lastCrashPoints: [],
};

export const useGameStore = create<GameStore>((set) => ({
  round: DEFAULT_ROUND,
  myBetId: null,

  setRound: (partial) =>
    set((state) => ({ round: { ...state.round, ...partial } })),

  setBet: (betId) => set({ myBetId: betId }),
  clearBet: () => set({ myBetId: null }),

  addBet: (bet) =>
    set((state) => ({
      round: { ...state.round, bets: [...state.round.bets, bet] },
    })),

  updateBet: (betId, partial) =>
    set((state) => ({
      round: {
        ...state.round,
        bets: state.round.bets.map((b) =>
          b.betId === betId ? { ...b, ...partial } : b,
        ),
      },
    })),

  setMultiplier: (scaled, elapsedMs) =>
    set((state) => ({
      round: { ...state.round, multiplierScaled: scaled, elapsedMs },
    })),

  recordCrash: (crashPoint) =>
    set((state) => ({
      round: {
        ...state.round,
        lastCrashPoints: [crashPoint, ...state.round.lastCrashPoints].slice(0, 20),
      },
    })),
}));
