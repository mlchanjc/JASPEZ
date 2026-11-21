import type { LevelId } from "@/data/types";

export const theme = {
  paper: "#F6EFE2",
  paperDeep: "#E7D7BE",
  paperBorder: "rgba(198, 161, 91, 0.32)",
  ink: "#1E2430",
  inkSoft: "#5C5348",
  inkMuted: "#8A7F72",
  vermillion: "#D4533E",
  vermillionSoft: "rgba(212, 83, 62, 0.10)",
  indigo: "#243E6A",
  indigoSoft: "rgba(36, 62, 106, 0.09)",
  gold: "#C6A15B",
  goldSoft: "rgba(198, 161, 91, 0.16)",
  matcha: "#6E8B54",
  matchaSoft: "rgba(110, 139, 84, 0.14)",
  white: "#FFF9F1",
  surface: "#FBF5EA",
  success: "#2E9B62",
  successSoft: "rgba(46, 155, 98, 0.12)",
  error: "#D64545",
  errorSoft: "rgba(214, 69, 69, 0.11)",
};

export const levelAccent: Record<LevelId, string> = {
  N5: "#6E8B54",
  N4: "#3D7EA6",
  N3: "#C6A15B",
  N2: "#7A5EA7",
  N1: "#D4533E",
};
