import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LevelId } from "@/data/types";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";
import { ProgressBar } from "./ProgressBar";

type Props = {
  level: LevelId;
  lessons: number;
  total: number;
  learnedCount: number;
  percent: number;
  proficiencyCounts: number[];
};

export function LevelSummary({ level, lessons, total, learnedCount, percent, proficiencyCounts }: Props) {
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const accent = levelAccent[level];
  const proficiencyColor = [t.inkMuted, t.gold, t.indigo, t.matcha];

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={[styles.levelCode, { color: accent }]}>{level}</Text>
          <Text style={styles.meta}>
            {lessons} 課 · {total} 單字
          </Text>
        </View>
        <Text style={styles.pctText}>{Math.round(percent * 100)}%</Text>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.learnedLabel}>
          已學 {learnedCount} / {total}
        </Text>
        <View style={styles.barWrap}>
          <ProgressBar percent={percent} color={accent} height={4} />
        </View>
      </View>

      <View style={styles.stats}>
        {PROFICIENCY_LEVELS.map((label, index) => (
          <View key={label} style={[styles.stat, index > 0 && styles.statBorder]}>
            <Text style={[styles.statValue, { color: proficiencyColor[index] }]}>{proficiencyCounts[index] ?? 0}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    panel: {
      backgroundColor: t.white,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.paperBorder,
      padding: 14,
      gap: 10,
    },
    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    headLeft: { flexDirection: "row", alignItems: "baseline", gap: 10, flex: 1, minWidth: 0 },
    levelCode: { fontSize: 16, fontWeight: "800", letterSpacing: 0.6 },
    meta: { color: t.inkSoft, fontSize: 12.5, fontWeight: "600" },
    pctText: { fontSize: 13, fontWeight: "700", color: t.ink },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    learnedLabel: { color: t.inkSoft, fontSize: 11.5, fontWeight: "600" },
    barWrap: { flex: 1, minWidth: 0 },
    stats: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: t.paperBorder,
      paddingTop: 10,
    },
    stat: { flex: 1, alignItems: "center", gap: 1 },
    statBorder: { borderLeftWidth: 1, borderLeftColor: t.paperBorder },
    statValue: { fontSize: 15, fontWeight: "700" },
    statLabel: { color: t.inkMuted, fontSize: 10.5, fontWeight: "600" },
  });
}
