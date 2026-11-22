import { Platform } from "react-native";
import type { LevelId } from "@/data/types";
import { useProgress } from "@/state/progress";
import type { ThemePreset } from "@/state/progress";

const SERIF_FONT = Platform.select({
  ios: "Hiragino Mincho ProN",
  android: "serif",
  default: "Georgia, serif",
});

export type AppTheme = {
  preset: ThemePreset;
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
  // Structural style tokens so each preset feels genuinely distinct
  cardRadius: number;
  controlRadius: number;
  cardBorderWidth: number;
  useShadow: boolean;
  barHeight: number;
  topRuleHeight: number;
  accentPrimary: string;
};

// 1. Japanese Editorial / Stationery (Muji / Hobonichi)
export const editorialLight: AppTheme = {
  preset: "editorial",
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
  cardRadius: 8,
  controlRadius: 6,
  cardBorderWidth: 1,
  useShadow: false,
  barHeight: 4,
  topRuleHeight: 2,
  accentPrimary: "#C83E2B",
};

export const editorialDark: AppTheme = {
  preset: "editorial",
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
  cardRadius: 8,
  controlRadius: 6,
  cardBorderWidth: 1,
  useShadow: false,
  barHeight: 4,
  topRuleHeight: 2,
  accentPrimary: "#E05A47",
};

// 2. Clean iOS Minimalist (Things 3 / Apple Books)
export const iosLight: AppTheme = {
  preset: "ios",
  paper: "#F3F4F8",
  paperDeep: "#E7E9F0",
  paperBorder: "#E5E7EB",
  ink: "#111827",
  inkSoft: "#4B5563",
  inkMuted: "#9CA3AF",
  vermillion: "#2563EB",
  vermillionDark: "#1D4ED8",
  vermillionSoft: "rgba(37, 99, 235, 0.10)",
  indigo: "#2563EB",
  indigoDark: "#1D4ED8",
  indigoSoft: "rgba(37, 99, 235, 0.10)",
  gold: "#D97706",
  goldDark: "#B45309",
  goldSoft: "rgba(217, 119, 6, 0.10)",
  matcha: "#059669",
  matchaDark: "#047857",
  matchaSoft: "rgba(5, 150, 105, 0.10)",
  white: "#FFFFFF",
  surface: "#F8F9FB",
  success: "#059669",
  successSoft: "#ECFDF5",
  error: "#DC2626",
  errorSoft: "#FEF2F2",
  choiceBottom: "#D1D5DB",
  serif: undefined,
  cardRadius: 16,
  controlRadius: 10,
  cardBorderWidth: 0,
  useShadow: true,
  barHeight: 6,
  topRuleHeight: 0,
  accentPrimary: "#2563EB",
};

export const iosDark: AppTheme = {
  preset: "ios",
  paper: "#0B0D12",
  paperDeep: "#050608",
  paperBorder: "#232733",
  ink: "#F9FAFB",
  inkSoft: "#9CA3AF",
  inkMuted: "#6B7280",
  vermillion: "#3B82F6",
  vermillionDark: "#60A5FA",
  vermillionSoft: "rgba(59, 130, 246, 0.16)",
  indigo: "#60A5FA",
  indigoDark: "#93C5FD",
  indigoSoft: "rgba(96, 165, 250, 0.14)",
  gold: "#FBBF24",
  goldDark: "#FCD34D",
  goldSoft: "rgba(251, 191, 36, 0.14)",
  matcha: "#34D399",
  matchaDark: "#6EE7B7",
  matchaSoft: "rgba(52, 211, 153, 0.14)",
  white: "#151821",
  surface: "#1E222E",
  success: "#34D399",
  successSoft: "rgba(52, 211, 153, 0.15)",
  error: "#F87171",
  errorSoft: "rgba(248, 113, 113, 0.15)",
  choiceBottom: "#2D3343",
  serif: undefined,
  cardRadius: 16,
  controlRadius: 10,
  cardBorderWidth: 1,
  useShadow: false,
  barHeight: 6,
  topRuleHeight: 0,
  accentPrimary: "#3B82F6",
};

// 3. Sleek Dark-Ink Modern (Linear / Bunpro)
export const darkInkLight: AppTheme = {
  preset: "darkInk",
  paper: "#F8F9FA",
  paperDeep: "#ECEEF2",
  paperBorder: "#DFE3EA",
  ink: "#0F172A",
  inkSoft: "#475569",
  inkMuted: "#94A3B8",
  vermillion: "#0F172A",
  vermillionDark: "#1E293B",
  vermillionSoft: "rgba(15, 23, 42, 0.08)",
  indigo: "#0284C7",
  indigoDark: "#0369A1",
  indigoSoft: "rgba(2, 132, 199, 0.10)",
  gold: "#D97706",
  goldDark: "#B45309",
  goldSoft: "rgba(217, 119, 6, 0.11)",
  matcha: "#10B981",
  matchaDark: "#047857",
  matchaSoft: "rgba(16, 185, 129, 0.11)",
  white: "#FFFFFF",
  surface: "#F1F5F9",
  success: "#10B981",
  successSoft: "#ECFDF5",
  error: "#E11D48",
  errorSoft: "#FFF1F2",
  choiceBottom: "#CBD5E1",
  serif: undefined,
  cardRadius: 12,
  controlRadius: 8,
  cardBorderWidth: 1,
  useShadow: false,
  barHeight: 4,
  topRuleHeight: 0,
  accentPrimary: "#0F172A",
};

export const darkInkDark: AppTheme = {
  preset: "darkInk",
  paper: "#0E1015",
  paperDeep: "#08090C",
  paperBorder: "#242936",
  ink: "#F3F4F6",
  inkSoft: "#8B93A7",
  inkMuted: "#5E667A",
  vermillion: "#F3F4F6",
  vermillionDark: "#FFFFFF",
  vermillionSoft: "rgba(243, 244, 246, 0.10)",
  indigo: "#60A5FA",
  indigoDark: "#93C5FD",
  indigoSoft: "rgba(96, 165, 250, 0.14)",
  gold: "#FBBF24",
  goldDark: "#FDE68A",
  goldSoft: "rgba(251, 191, 36, 0.14)",
  matcha: "#34D399",
  matchaDark: "#6EE7B7",
  matchaSoft: "rgba(52, 211, 153, 0.14)",
  white: "#161922",
  surface: "#1C202B",
  success: "#10B981",
  successSoft: "rgba(16, 185, 129, 0.15)",
  error: "#FB7185",
  errorSoft: "rgba(251, 113, 133, 0.15)",
  choiceBottom: "#2A3040",
  serif: undefined,
  cardRadius: 12,
  controlRadius: 8,
  cardBorderWidth: 1,
  useShadow: false,
  barHeight: 4,
  topRuleHeight: 0,
  accentPrimary: "#34D399",
};

const PRESET_MAP: Record<ThemePreset, { light: AppTheme; dark: AppTheme }> = {
  editorial: { light: editorialLight, dark: editorialDark },
  ios: { light: iosLight, dark: iosDark },
  darkInk: { light: darkInkLight, dark: darkInkDark },
};

const LEVEL_ACCENTS: Record<ThemePreset, { light: Record<LevelId, string>; dark: Record<LevelId, string> }> = {
  editorial: {
    light: { N5: "#2E6F4E", N4: "#2C3E58", N3: "#A67C37", N2: "#6B4268", N1: "#C83E2B" },
    dark: { N5: "#57A67D", N4: "#89A9D4", N3: "#D4A857", N2: "#B88CB4", N1: "#E05A47" },
  },
  ios: {
    light: { N5: "#059669", N4: "#2563EB", N3: "#D97706", N2: "#7C3AED", N1: "#DC2626" },
    dark: { N5: "#34D399", N4: "#60A5FA", N3: "#FBBF24", N2: "#A78BFA", N1: "#F87171" },
  },
  darkInk: {
    light: { N5: "#059669", N4: "#0284C7", N3: "#D97706", N2: "#6366F1", N1: "#E11D48" },
    dark: { N5: "#34D399", N4: "#60A5FA", N3: "#FBBF24", N2: "#A78BFA", N1: "#FB7185" },
  },
};

export type ThemePresetInfo = {
  id: ThemePreset;
  name: string;
  enName: string;
  desc: string;
  recommendedDark: boolean;
  previewLight: AppTheme;
  previewDark: AppTheme;
};

export const THEME_PRESETS: ThemePresetInfo[] = [
  {
    id: "editorial",
    name: "日系文具",
    enName: "Japanese Editorial",
    desc: "溫潤和紙與墨色、明朝體標題、1px 細框線與朱紅印記。",
    recommendedDark: false,
    previewLight: editorialLight,
    previewDark: editorialDark,
  },
  {
    id: "ios",
    name: "極簡 iOS",
    enName: "Clean iOS Minimalist",
    desc: "純淨留白畫布、柔和立體卡片、無襯線字體與單一鈷藍重點。",
    recommendedDark: false,
    previewLight: iosLight,
    previewDark: iosDark,
  },
  {
    id: "darkInk",
    name: "俐落現代",
    enName: "Sleek Dark-Ink",
    desc: "高對比深炭與單色介面、俐落 1px 邊框，色彩專注於進度與對錯。",
    recommendedDark: true,
    previewLight: darkInkLight,
    previewDark: darkInkDark,
  },
];

export function useAppTheme() {
  const { prefs } = useProgress();
  const isDark = Boolean(prefs.darkMode);
  const preset: ThemePreset = prefs.themePreset ?? "editorial";
  const pair = PRESET_MAP[preset] ?? PRESET_MAP.editorial;
  const levels = LEVEL_ACCENTS[preset] ?? LEVEL_ACCENTS.editorial;

  return {
    t: isDark ? pair.dark : pair.light,
    isDark,
    preset,
    levelAccent: isDark ? levels.dark : levels.light,
  };
}

// Backward-compatible default exports
export const theme = editorialLight;
export const levelAccent = LEVEL_ACCENTS.editorial.light;
