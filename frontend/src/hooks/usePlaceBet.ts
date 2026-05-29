"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { apiPost } from "@/services/apiClient";
import { useGameStore } from "@/stores/gameStore";
import { toast } from "sonner";

export function usePlaceBet() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();
  const store = useGameStore();

  return useMutation({
    mutationFn: (amountCents: string) =>
      apiPost<{ betId: string }>("/games/bet", { amountCents }, token),
    onSuccess: (data) => {
      store.setBet(data.betId);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Bet placed!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
