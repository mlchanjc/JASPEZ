import { StyleSheet, Text, View } from "react-native";
import type { LevelId } from "@/data/types";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { levelAccent, theme } from "@/theme";
import { ProgressBar } from "./ProgressBar";

const proficiencyColor = [theme.inkSoft, theme.gold, theme.indigo, theme.matcha];

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
    <View style={[styles.panel, { borderColor: accent }]}>
      <View style={styles.head}>
        <Text style={[styles.level, { color: accent }]}>{level}</Text>
        <Text style={styles.meta}>
          {lessons} 課 · {total} 單字
        </Text>
      </View>
      <View style={styles.learnedRow}>
        <Text style={styles.learnedLabel}>已學 {learnedCount}</Text>
        <Text style={styles.learnedPercent}>{Math.round(percent * 100)}%</Text>
      </View>
      <ProgressBar percent={percent} color={accent} height={8} />
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
    borderWidth: 2,
    padding: 16,
    gap: 10,
  },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  level: { fontSize: 22, fontWeight: "900" },
  meta: { color: theme.inkSoft, fontWeight: "700" },
  learnedRow: { flexDirection: "row", justifyContent: "space-between" },
  learnedLabel: { color: theme.ink, fontWeight: "800" },
  learnedPercent: { color: theme.inkSoft, fontWeight: "700" },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "900" },
  statLabel: { color: theme.inkSoft, fontSize: 12, fontWeight: "700" },
});
