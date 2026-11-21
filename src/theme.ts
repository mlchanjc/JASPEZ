import type { LevelId } from "@/data/types";

export const theme = {
  // Modern playful light canvas & tactile cards
  paper: "#F4F6FB",
  paperDeep: "#E6EBF5",
  paperBorder: "#E2E8F0",
  ink: "#161B2E",
  inkSoft: "#5A647A",
  inkMuted: "#8F9BB3",
  // Vibrant playful brand accents
  vermillion: "#FF5A5F",
  vermillionDark: "#D93B41",
  vermillionSoft: "rgba(255, 90, 95, 0.12)",
  indigo: "#4F46E5",
  indigoDark: "#3730A3",
  indigoSoft: "rgba(79, 70, 229, 0.10)",
  gold: "#F59E0B",
  goldDark: "#B45309",
  goldSoft: "rgba(245, 158, 11, 0.14)",
  matcha: "#10B981",
  matchaDark: "#047857",
  matchaSoft: "rgba(16, 185, 129, 0.13)",
  white: "#FFFFFF",
  surface: "#F8FAFC",
  success: "#10B981",
  successSoft: "rgba(16, 185, 129, 0.13)",
  error: "#F43F5E",
  errorSoft: "rgba(244, 63, 94, 0.12)",
};

export const levelAccent: Record<LevelId, string> = {
  N5: "#10B981", // Fresh Mint
  N4: "#0EA5E9", // Playful Sky
  N3: "#F59E0B", // Sunny Amber
  N2: "#8B5CF6", // Vivid Violet
  N1: "#FF5A5F", // Coral Red
};
