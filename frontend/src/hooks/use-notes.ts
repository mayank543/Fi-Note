"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  getGuestNotes,
  createGuestNote,
  updateGuestNote,
  deleteGuestNote,
} from "@/lib/guest";
import type { AuthMode, Filter, Note, NotesResponse } from "@/lib/constants";

const LIMIT = 12;

function buildNotesEndpoint(
  authMode: AuthMode,
  filter: Filter,
  page: number,
  query: string,
  signal?: AbortSignal,
): Promise<NotesResponse> {
  if (authMode === "guest") {
    let filtered = getGuestNotes();
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      );
    }
    if (filter.type === "trash") {
      filtered = filtered.filter((n) => n.is_trashed);
    } else {
      filtered = filtered.filter((n) => !n.is_trashed);
    }
    if (filter.type === "label" && filter.id) {
      filtered = filtered.filter((n) =>
        n.labels.some((l) => l.id === filter.id),
      );
    }
    const total = filtered.length;
    const paged = filtered.slice(
      (page - 1) * LIMIT,
      page * LIMIT,
    );
    return Promise.resolve({
      data: paged as unknown as Note[],
      meta: {
        total,
        page,
        limit: LIMIT,
        totalPages: Math.ceil(total / LIMIT) || 1,
      },
    });
  }

  const endpoint = query.trim() ? "/search" : "/notes";
  const params = new URLSearchParams({
    page: page.toString(),
    limit: LIMIT.toString(),
    ...(query.trim() && { q: query.trim() }),
  });
  if (filter.type === "trash") params.append("trash", "true");
  if (filter.type === "label" && filter.id) params.append("labelId", filter.id);

  return api.get(`${endpoint}?${params.toString()}`, { signal }).then((res) => res.data);
}

export function useNotesQuery(
  authMode: AuthMode,
  filter: Filter,
  page: number,
  query: string,
) {
  return useQuery({
    queryKey: ["notes", authMode, filter, page, query],
    queryFn: ({ signal }) => buildNotesEndpoint(authMode, filter, page, query, signal),
    enabled: authMode !== "loading" && authMode !== "none",
    staleTime: 30_000,
  });
}

export function useCreateNote(authMode: AuthMode) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { title: string; content: string; color?: string }) => {
      if (authMode === "guest") {
        return createGuestNote(payload);
      }
      const res = await api.post("/notes", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useUpdateNote(authMode: AuthMode) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; title: string; content: string; color?: string }) => {
      if (authMode === "guest") {
        return updateGuestNote(id, payload);
      }
      const res = await api.put(`/notes/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteNote(authMode: AuthMode) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, permanent }: { id: string; permanent: boolean }) => {
      if (authMode === "guest") {
        deleteGuestNote(id, permanent);
        return;
      }
      await api.delete(`/notes/${id}${permanent ? "?permanent=true" : ""}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useToggleLabel(authMode: AuthMode) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, labelId, isAttached }: { noteId: string; labelId: string; isAttached: boolean }) => {
      if (authMode === "guest") {
        const notes = getGuestNotes();
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;
        const updatedLabels = isAttached
          ? note.labels.filter((l) => l.id !== labelId)
          : [...note.labels, { id: labelId, name: "" }];
        updateGuestNote(noteId, { labels: updatedLabels });
        return;
      }

      if (isAttached) {
        await api.delete(`/notes/${noteId}/labels/${labelId}`);
      } else {
        await api.post(`/notes/${noteId}/labels`, { labelId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
