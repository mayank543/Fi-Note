export interface GuestNote {
  id: string;
  title: string;
  content: string;
  color?: string;
  created_at: string;
  updated_at: string;
  labels: { id: string; name: string }[];
  is_trashed: boolean;
}

export interface GuestLabel {
  id: string;
  name: string;
}

const NOTES_KEY = "guest_notes";
const LABELS_KEY = "guest_labels";

function id(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function get<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function set<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getGuestNotes(): GuestNote[] {
  return get<GuestNote>(NOTES_KEY);
}

export function createGuestNote(note: {
  title: string;
  content: string;
  color?: string;
}): GuestNote {
  const notes = getGuestNotes();
  const n: GuestNote = {
    id: id(),
    ...note,
    color: note.color || "default",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    labels: [],
    is_trashed: false,
  };
  notes.push(n);
  set(NOTES_KEY, notes);
  return n;
}

export function updateGuestNote(
  id: string,
  data: Partial<GuestNote>,
): GuestNote | null {
  const notes = getGuestNotes();
  const i = notes.findIndex((n) => n.id === id);
  if (i === -1) return null;
  notes[i] = { ...notes[i], ...data, updated_at: new Date().toISOString() };
  set(NOTES_KEY, notes);
  return notes[i];
}

export function deleteGuestNote(id: string, permanent: boolean): void {
  let notes = getGuestNotes();
  if (permanent) {
    notes = notes.filter((n) => n.id !== id);
  } else {
    const i = notes.findIndex((n) => n.id === id);
    if (i !== -1) {
      notes[i].is_trashed = true;
      notes[i].updated_at = new Date().toISOString();
    }
  }
  set(NOTES_KEY, notes);
}

export function getGuestLabels(): GuestLabel[] {
  return get<GuestLabel>(LABELS_KEY);
}

export function createGuestLabel(name: string): GuestLabel {
  const labels = getGuestLabels();
  const l: GuestLabel = { id: id(), name };
  labels.push(l);
  set(LABELS_KEY, labels);
  return l;
}

export function updateGuestLabel(id: string, name: string): GuestLabel | null {
  const labels = getGuestLabels();
  const i = labels.findIndex((l) => l.id === id);
  if (i === -1) return null;
  labels[i].name = name;
  set(LABELS_KEY, labels);
  return labels[i];
}

export function deleteGuestLabel(id: string): void {
  set(LABELS_KEY, getGuestLabels().filter((l) => l.id !== id));
}

export function isGuest(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("guest_mode") === "true";
}

export function enableGuest(): void {
  localStorage.setItem("guest_mode", "true");
}

export function disableGuest(): void {
  localStorage.removeItem("guest_mode");
}
