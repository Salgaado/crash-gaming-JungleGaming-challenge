"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "@/stores/gameStore";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4001";

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const store = useGameStore();
  const qc = useQueryClient();

  useEffect(() => {
    const socket = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("round:betting-opened", (data) => {
      store.setRound({
        roundId: data.roundId,
        roundIndex: data.roundIndex,
        status: "BETTING_OPEN",
        serverSeedHash: data.serverSeedHash,
        bettingClosesAt: data.bettingClosesAt,
        multiplierScaled: 100n,
        bets: [],
      });
      store.clearBet();
    });

    socket.on("round:started", (data) => {
      store.setRound({
        status: "RUNNING",
        startedAt: data.startedAt,
        multiplierScaled: 100n,
      });
    });

    socket.on("round:snapshot", (data) => {
      store.setMultiplier(BigInt(data.multiplierScaled), data.elapsedMs);
    });

    socket.on("round:crashed", (data) => {
      store.setRound({ status: "CRASHED" });
      store.recordCrash(data.crashPointScaled);
      store.clearBet();
    });

    socket.on("bet:placed", (data) => {
      store.addBet({
        betId: data.betId,
        playerId: data.playerId,
        amountCents: data.amountCents,
        status: "PENDING_DEBIT",
        cashoutMultiplier: null,
        payoutCents: null,
      });
    });

    socket.on("bet:rejected", (data) => {
      store.updateBet(data.betId, { status: "REJECTED" });
    });

    socket.on("bet:cashed-out", (data) => {
      store.updateBet(data.betId, {
        status: "CASHED_OUT",
        cashoutMultiplier: data.multiplier,
        payoutCents: data.payoutCents,
      });
    });

    socket.on("wallet:updated", () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
