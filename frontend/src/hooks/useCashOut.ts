"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { apiPost } from "@/services/apiClient";
import { useGameStore } from "@/stores/gameStore";
import { toast } from "sonner";

export function useCashOut() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();
  const store = useGameStore();

  return useMutation({
    mutationFn: () =>
      apiPost<{ payoutCents: string; multiplier: string }>("/games/bet/cashout", {}, token),
    onSuccess: (data) => {
      store.clearBet();
      qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(`Cashed out at ${data.multiplier} — ${(Number(data.payoutCents) / 100).toFixed(2)} credits!`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
