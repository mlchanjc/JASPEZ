import { Platform } from "react-native";
import type { LevelId } from "@/data/types";
import { useProgress } from "@/state/progress";

const SERIF_FONT = Platform.select({
  ios: "Hiragino Mincho ProN",
  android: "serif",
  default: "Georgia, serif",
});

export type AppTheme = {
  paper: string;
  paperDeep: string;
  paperBorder: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  vermillion: string;
  vermillionDark: string;
  vermillionSoft: string;
  indigo: string;
  indigoDark: string;
  indigoSoft: string;
  gold: string;
  goldDark: string;
  goldSoft: string;
  matcha: string;
  matchaDark: string;
  matchaSoft: string;
  white: string;
  surface: string;
  success: string;
  successSoft: string;
  error: string;
  errorSoft: string;
  choiceBottom: string;
  serif: string | undefined;
};

/**
 * Japanese Editorial / Stationery — Washi Light Mode (Muji / Hobonichi)
 */
export const lightTheme: AppTheme = {
  paper: "#F7F5F0",
  paperDeep: "#EDE9E0",
  paperBorder: "#DFDAD0",
  ink: "#1A1918",
  inkSoft: "#5E5952",
  inkMuted: "#8F8980",
  vermillion: "#C83E2B",
  vermillionDark: "#9E2E1E",
  vermillionSoft: "rgba(200, 62, 43, 0.09)",
  indigo: "#2C3E58",
  indigoDark: "#1D2A3D",
  indigoSoft: "rgba(44, 62, 88, 0.08)",
  gold: "#A67C37",
  goldDark: "#7A5922",
  goldSoft: "rgba(166, 124, 55, 0.11)",
  matcha: "#2E6F4E",
  matchaDark: "#1F5138",
  matchaSoft: "rgba(46, 111, 78, 0.10)",
  white: "#FFFDF9",
  surface: "#F1EEE7",
  success: "#2E6F4E",
  successSoft: "#EDF5F0",
  error: "#B83227",
  errorSoft: "#FDF0EE",
  choiceBottom: "#D5CFC4",
  serif: SERIF_FONT,
};

/**
 * Japanese Editorial / Stationery — Sumi Nocturne Dark Mode
 */
export const darkTheme: AppTheme = {
  paper: "#141312",
  paperDeep: "#0D0C0B",
  paperBorder: "#2C2925",
  ink: "#F2EFE9",
  inkSoft: "#ABA49A",
  inkMuted: "#756F67",
  vermillion: "#E05A47",
  vermillionDark: "#F07A68",
  vermillionSoft: "rgba(224, 90, 71, 0.16)",
  indigo: "#89A9D4",
  indigoDark: "#AEC7E8",
  indigoSoft: "rgba(137, 169, 212, 0.13)",
  gold: "#D4A857",
  goldDark: "#E6C17A",
  goldSoft: "rgba(212, 168, 87, 0.15)",
  matcha: "#57A67D",
  matchaDark: "#7EC49F",
  matchaSoft: "rgba(87, 166, 125, 0.14)",
  white: "#1C1A18",
  surface: "#24211E",
  success: "#57A67D",
  successSoft: "rgba(87, 166, 125, 0.15)",
  error: "#E05A47",
  errorSoft: "rgba(224, 90, 71, 0.16)",
  choiceBottom: "#35312C",
  serif: SERIF_FONT,
};

export const lightLevelAccent: Record<LevelId, string> = {
  N5: "#2E6F4E", // Matcha
  N4: "#2C3E58", // Ai-iro Indigo
  N3: "#A67C37", // Antique Ochre
  N2: "#6B4268", // Sumire Plum
  N1: "#C83E2B", // Hanko Vermillion
};

export const darkLevelAccent: Record<LevelId, string> = {
  N5: "#57A67D",
  N4: "#89A9D4",
  N3: "#D4A857",
  N2: "#B88CB4",
  N1: "#E05A47",
};

export function getLevelAccent(isDark: boolean): Record<LevelId, string> {
  return isDark ? darkLevelAccent : lightLevelAccent;
}

export function useAppTheme() {
  const { prefs } = useProgress();
  const isDark = Boolean(prefs.darkMode);
  return {
    t: isDark ? darkTheme : lightTheme,
    isDark,
    levelAccent: isDark ? darkLevelAccent : lightLevelAccent,
  };
}

// Backward-compatible default exports
export const theme = lightTheme;
export const levelAccent = lightLevelAccent;
