"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  getGuestLabels,
  createGuestLabel,
  updateGuestLabel,
} from "@/lib/guest";
import type { AuthMode, Label } from "@/lib/constants";

export function useLabelsQuery(authMode: AuthMode) {
  return useQuery({
    queryKey: ["labels", authMode],
    queryFn: async (): Promise<Label[]> => {
      if (authMode === "guest") {
        return getGuestLabels();
      }
      const res = await api.get("/labels");
      return res.data || [];
    },
    enabled: authMode !== "loading" && authMode !== "none",
    staleTime: 30_000,
  });
}

export function useCreateLabel(authMode: AuthMode) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (authMode === "guest") {
        return createGuestLabel(name);
      }
      const res = await api.post("/labels", { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });
}

export function useUpdateLabel(authMode: AuthMode) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (authMode === "guest") {
        return updateGuestLabel(id, name);
      }
      const res = await api.put(`/labels/${id}`, { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });
}
