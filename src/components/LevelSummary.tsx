import { StyleSheet, Text, View } from "react-native";
import type { LevelId } from "@/data/types";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { levelAccent, theme } from "@/theme";
import { ProgressBar } from "./ProgressBar";

const proficiencyColor = [theme.inkMuted, theme.gold, theme.indigo, theme.matcha];

type Props = {
  level: LevelId;
  lessons: number;
  total: number;
  learnedCount: number;
  percent: number;
  proficiencyCounts: number[];
};

export function LevelSummary({ level, lessons, total, learnedCount, percent, proficiencyCounts }: Props) {
  const accent = levelAccent[level];

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <View style={[styles.levelBadge, { backgroundColor: accent }]}>
            <Text style={styles.levelBadgeText}>{level}</Text>
          </View>
          <Text style={styles.meta}>
            {lessons} 課 · {total} 單字
          </Text>
        </View>
        <View style={[styles.pctPill, { backgroundColor: `${accent}18` }]}>
          <Text style={[styles.pctText, { color: accent }]}>{Math.round(percent * 100)}%</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.learnedLabel}>已學 {learnedCount} / {total}</Text>
        <View style={styles.barWrap}>
          <ProgressBar percent={percent} color={accent} height={9} />
        </View>
      </View>

      <View style={styles.stats}>
        {PROFICIENCY_LEVELS.map((label, index) => (
          <View key={label} style={styles.stat}>
            <Text style={[styles.statValue, { color: proficiencyColor[index] }]}>{proficiencyCounts[index] ?? 0}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.white,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    padding: 15,
    gap: 10,
    shadowColor: "#161B2E",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  headLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelBadgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  meta: { color: theme.inkSoft, fontSize: 13, fontWeight: "700" },
  pctPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  pctText: { fontSize: 12, fontWeight: "900" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  learnedLabel: { color: theme.ink, fontSize: 12, fontWeight: "800" },
  barWrap: { flex: 1, minWidth: 0 },
  stats: { flexDirection: "row", gap: 6 },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingVertical: 7,
  },
  statValue: { fontSize: 16, fontWeight: "900" },
  statLabel: { color: theme.inkSoft, fontSize: 11, fontWeight: "700" },
});
