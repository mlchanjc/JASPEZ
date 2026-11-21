import { Link } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { PressableScale } from "@/components/PressableScale";
import { ProgressBar } from "@/components/ProgressBar";
import { LEVELS } from "@/data/registry";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { levelSummary } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

const proficiencyColor = [theme.inkSoft, theme.gold, theme.indigo, theme.matcha];

export default function DashboardScreen() {
  const { streak, learnedCount, learned, attempts, currentLevel } = useProgress();
  const insets = useSafeAreaInsets();
  const buttonBottom = insets.bottom + 16;
  const summaries = useMemo(
    () => LEVELS.map((level) => ({ level, ...levelSummary(level, learned, attempts) })),
    [learned, attempts],
  );
  const totals = summaries.reduce(
    (sum, item) => ({
      words: sum.words + item.total,
      learned: sum.learned + item.learnedCount,
      proficiency: item.proficiencyCounts.map((count, index) => count + (sum.proficiency[index] ?? 0)),
    }),
    { words: 0, learned: 0, proficiency: [0, 0, 0, 0] },
  );

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: buttonBottom + 88 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.kicker}>JASPEZ</Text>
          <Text style={styles.title}>今日の単語</Text>
          <Text style={styles.subtitle}>把單字練成習慣，像蓋一枚印章。</Text>

          <View style={styles.headerRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>連續天數</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{learnedCount}</Text>
              <Text style={styles.statLabel}>已學單字</Text>
            </View>
            <View style={styles.seal}>
              <Text style={styles.sealText}>{currentLevel}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.section}>各級進度</Text>
              <Text style={styles.overall}>
                {totals.learned}/{totals.words} 已學 · {totals.proficiency[3]} 記住 · {totals.proficiency[2]} 熟悉 ·{" "}
                {totals.proficiency[1]} 初識
              </Text>
            </View>
            {summaries.map((item) => (
              <View key={item.level} style={styles.levelBlock}>
                <View style={styles.levelHead}>
                  <Text style={[styles.levelName, { color: levelAccent[item.level] }]}>{item.level}</Text>
                  <Text style={styles.levelMeta}>
                    {item.lessons} 課 · {item.learnedCount}/{item.total}
                  </Text>
                  <Text style={styles.percent}>{Math.round(item.percent * 100)}%</Text>
                </View>
                <ProgressBar percent={item.percent} color={levelAccent[item.level]} height={8} />
                <View style={styles.breakdown}>
                  {PROFICIENCY_LEVELS.map((label, index) => (
                    <View key={label} style={styles.breakItem}>
                      <Text style={[styles.breakValue, { color: proficiencyColor[index] }]}>
                        {item.proficiencyCounts[index] ?? 0}
                      </Text>
                      <Text style={styles.breakLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <Link href="/learn" asChild>
          <PressableScale
            accessibilityLabel="Start Learning"
            style={StyleSheet.flatten([styles.startButton, { bottom: buttonBottom }])}
          >
            <Text style={styles.startText}>Start Learning</Text>
          </PressableScale>
        </Link>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  safe: { flex: 1 },
  content: { padding: 24 },
  kicker: { color: theme.vermillion, fontWeight: "800", letterSpacing: 3, fontSize: 13 },
  title: { marginTop: 6, fontSize: 36, fontWeight: "800", color: theme.ink },
  subtitle: { marginTop: 6, color: theme.inkSoft, fontSize: 15 },
  headerRow: { flexDirection: "row", gap: 12, marginTop: 24, alignItems: "stretch" },
  stat: {
    flex: 1,
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 16,
    shadowColor: "#1E2430",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: theme.indigo },
  statLabel: { marginTop: 4, color: theme.inkSoft, fontSize: 13 },
  seal: {
    width: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: theme.vermillion,
    backgroundColor: "rgba(212, 83, 62, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
  },
  sealText: { color: theme.vermillion, fontWeight: "900", fontSize: 22 },
  card: {
    marginTop: 22,
    backgroundColor: theme.white,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    shadowColor: "#1E2430",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardHead: { gap: 8, paddingBottom: 16 },
  section: { fontSize: 18, fontWeight: "800", color: theme.ink },
  overall: { color: theme.inkSoft, fontSize: 13, fontWeight: "700", lineHeight: 20 },
  levelBlock: {
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(30, 36, 48, 0.08)",
  },
  levelHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  levelName: { width: 36, fontWeight: "900" },
  levelMeta: { flex: 1, color: theme.inkSoft, fontSize: 13, fontWeight: "700" },
  percent: { color: theme.inkSoft, fontSize: 13, fontWeight: "800" },
  breakdown: { flexDirection: "row", paddingTop: 4 },
  breakItem: { flex: 1, alignItems: "center", gap: 4 },
  breakValue: { fontSize: 15, fontWeight: "900" },
  breakLabel: { color: theme.inkSoft, fontSize: 11, fontWeight: "700" },
  startButton: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 16,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.vermillion,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.vermillion,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  startText: { color: "#fff", fontSize: 18, fontWeight: "800" },
});
