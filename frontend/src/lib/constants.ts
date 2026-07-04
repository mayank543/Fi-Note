export interface Label {
  id: string;
  name: string;
}

export interface Collaborator {
  user: {
    email: string;
  };
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  labels: Label[];
  shared_with: Collaborator[];
}

export interface EditorSourceRect {
  width: number;
  height: number;
  top: number;
  left: number;
}

export type AuthMode = "loading" | "authenticated" | "guest" | "none";

export interface Filter {
  type: "all" | "trash" | "label";
  id?: string;
}

export interface NotesResponse {
  data: Note[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const EDITOR_EXPAND_MS = 380;

export const COLOR_PALETTE = [
  { id: "default", name: "Default", light: "#ffffff", dark: "#202124" },
  { id: "slate", name: "Slate", light: "#f1f5f9", dark: "#2d2e31" },
  { id: "sand", name: "Sand", light: "#fafaf9", dark: "#3c3d3f" },
  { id: "red", name: "Red", light: "#fee2e2", dark: "#442726" },
  { id: "amber", name: "Amber", light: "#fef3c7", dark: "#41331c" },
  { id: "emerald", name: "Emerald", light: "#dcfce7", dark: "#1e3a1f" },
  { id: "cyan", name: "Cyan", light: "#cffafe", dark: "#1a3b44" },
  { id: "indigo", name: "Indigo", light: "#e0e7ff", dark: "#262a4d" },
  { id: "rose", name: "Rose", light: "#ffe4e6", dark: "#422230" },
];

export function resolveHex(colorValue: string | undefined, dark: boolean) {
  if (!colorValue) return dark ? "#202124" : "#ffffff";
  const found = COLOR_PALETTE.find(c => c.id === colorValue || c.light === colorValue || c.dark === colorValue);
  return found ? (dark ? found.dark : found.light) : colorValue;
}
