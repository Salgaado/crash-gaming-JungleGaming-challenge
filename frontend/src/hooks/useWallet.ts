"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { apiGet, apiPost } from "@/services/apiClient";
import { toast } from "sonner";

interface WalletData {
  walletId: string;
  playerId: string;
  balanceCents: string;
  balance: string;
}

export function useWallet() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();

  const walletQuery = useQuery<WalletData>({
    queryKey: ["wallet"],
    queryFn: () => apiGet<WalletData>("/wallets/me", token),
    enabled: !!token,
    retry: false,
  });

  const createWalletMutation = useMutation({
    mutationFn: () => apiPost<WalletData>("/wallets", {}, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Wallet created with 1000.00 credits!");
    },
    onError: (err: Error) => {
      if (!err.message.includes("already")) toast.error(err.message);
    },
  });

  return { walletQuery, createWalletMutation };
}
