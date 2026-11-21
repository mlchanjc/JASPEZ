import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { PressableScale } from "@/components/PressableScale";
import { ProgressBar } from "@/components/ProgressBar";
import { LEVELS } from "@/data/registry";
import { grammarLevelSummary } from "@/lib/grammar";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { levelSummary } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

const proficiencyColor = [theme.inkSoft, theme.gold, theme.indigo, theme.matcha];

export default function DashboardScreen() {
  const {
    streak,
    learnedCount,
    learned,
    attempts,
    currentLevel,
    grammarLearnedCount,
    grammarLearned,
    grammarAttempts,
    ghostGrammar,
  } = useProgress();
  const [boardTab, setBoardTab] = useState<"vocab" | "grammar">("vocab");
  const insets = useSafeAreaInsets();
  const buttonBottom = insets.bottom + 16;

  const vocabSummaries = useMemo(
    () => LEVELS.map((level) => ({ level, ...levelSummary(level, learned, attempts) })),
    [learned, attempts],
  );

  const grammarSummaries = useMemo(
    () => LEVELS.map((level) => ({ level, ...grammarLevelSummary(level, grammarLearned, grammarAttempts) })),
    [grammarLearned, grammarAttempts],
  );

  const vocabTotals = vocabSummaries.reduce(
    (sum, item) => ({
      total: sum.total + item.total,
      learned: sum.learned + item.learnedCount,
      proficiency: item.proficiencyCounts.map((count, index) => count + (sum.proficiency[index] ?? 0)),
    }),
    { total: 0, learned: 0, proficiency: [0, 0, 0, 0] },
  );

  const grammarTotals = grammarSummaries.reduce(
    (sum, item) => ({
      total: sum.total + item.total,
      learned: sum.learned + item.learnedCount,
      proficiency: item.proficiencyCounts.map((count, index) => count + (sum.proficiency[index] ?? 0)),
    }),
    { total: 0, learned: 0, proficiency: [0, 0, 0, 0] },
  );

  const activeTotals = boardTab === "vocab" ? vocabTotals : grammarTotals;

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: buttonBottom + 96 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Header with Rotated Seal */}
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.kicker}>JASPEZ · 單字 × 文法</Text>
              <Text style={styles.title}>今日の勉強</Text>
              <Text style={styles.subtitle}>把單字與句型練成習慣，像蓋一枚印章。</Text>
            </View>
            <View style={styles.seal}>
              <Text style={styles.sealSub}>目標</Text>
              <Text style={styles.sealText}>{currentLevel}</Text>
            </View>
          </View>

          {/* 3-Metric Strip */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.vermillion }]}>{streak}</Text>
              <Text style={styles.statLabel}>連續天數</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{learnedCount}</Text>
              <Text style={styles.statLabel}>已學單字</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.matcha }]}>{grammarLearnedCount}</Text>
              <Text style={styles.statLabel}>已學文法</Text>
            </View>
          </View>

          {/* Ghost Review Callout (if any missed grammar points) */}
          {ghostGrammar.length > 0 && (
            <Link href="/grammar" asChild>
              <Pressable style={styles.ghostBanner}>
                <View style={styles.ghostBannerText}>
                  <Text style={styles.ghostTitle}>有 {ghostGrammar.length} 個文法錯題待複習</Text>
                  <Text style={styles.ghostSub}>趁記憶還在，點擊進入錯題再練</Text>
                </View>
                <Text style={styles.ghostArrow}>前往 →</Text>
              </Pressable>
            </Link>
          )}

          {/* Dual Progress Card */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.section}>各級進度</Text>
                <View style={styles.segmented}>
                  <Pressable
                    onPress={() => setBoardTab("vocab")}
                    style={[styles.segBtn, boardTab === "vocab" && styles.segBtnActive]}
                  >
                    <Text style={[styles.segText, boardTab === "vocab" && styles.segTextActive]}>單字</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setBoardTab("grammar")}
                    style={[styles.segBtn, boardTab === "grammar" && styles.segBtnActive]}
                  >
                    <Text style={[styles.segText, boardTab === "grammar" && styles.segTextActive]}>文法</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.overall}>
                {activeTotals.learned}/{activeTotals.total} 已學 · {activeTotals.proficiency[3]} 記住 ·{" "}
                {activeTotals.proficiency[2]} 熟悉 · {activeTotals.proficiency[1]} 初識
              </Text>
            </View>

            {boardTab === "vocab"
              ? vocabSummaries.map((item) => (
                  <View key={item.level} style={styles.levelBlock}>
                    <View style={styles.levelHead}>
                      <Text style={[styles.levelName, { color: levelAccent[item.level] }]}>{item.level}</Text>
                      <Text style={styles.levelMeta}>
                        {item.lessons} 課 · {item.learnedCount}/{item.total}
                      </Text>
                      <Text style={styles.percent}>{Math.round(item.percent * 100)}%</Text>
                    </View>
                    <View style={styles.barWrap}>
                      <ProgressBar percent={item.percent} color={levelAccent[item.level]} height={8} />
                    </View>
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
                ))
              : grammarSummaries.map((item) => (
                  <View key={item.level} style={styles.levelBlock}>
                    <View style={styles.levelHead}>
                      <Text style={[styles.levelName, { color: levelAccent[item.level] }]}>{item.level}</Text>
                      <Text style={styles.levelMeta}>
                        {item.total > 0 ? `${item.learnedCount}/${item.total} 句型` : "還在準備"}
                      </Text>
                      <Text style={styles.percent}>{Math.round(item.percent * 100)}%</Text>
                    </View>
                    <View style={styles.barWrap}>
                      <ProgressBar percent={item.percent} color={levelAccent[item.level]} height={8} />
                    </View>
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

        {/* Pinned Dual Action Bar */}
        <View style={[styles.ctaBar, { bottom: buttonBottom }]}>
          <Link href="/learn" asChild>
            <PressableScale
              accessibilityLabel="開始學單字"
              style={StyleSheet.flatten([styles.ctaBtn, styles.ctaVocab])}
            >
              <Text style={styles.ctaText}>學單字</Text>
            </PressableScale>
          </Link>
          <Link href="/grammar" asChild>
            <PressableScale
              accessibilityLabel="文法特訓"
              style={StyleSheet.flatten([styles.ctaBtn, styles.ctaGrammar])}
            >
              <Text style={styles.ctaText}>練文法</Text>
            </PressableScale>
          </Link>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  safe: { flex: 1 },
  content: { padding: 24 },
  heroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroLeft: { flex: 1 },
  kicker: { color: theme.vermillion, fontWeight: "800", letterSpacing: 2, fontSize: 12 },
  title: { marginTop: 4, fontSize: 34, fontWeight: "900", color: theme.ink },
  subtitle: { marginTop: 6, color: theme.inkSoft, fontSize: 14, lineHeight: 20 },
  seal: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: theme.vermillion,
    backgroundColor: theme.vermillionSoft,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
  },
  sealSub: { color: theme.vermillion, fontSize: 10, fontWeight: "800" },
  sealText: { color: theme.vermillion, fontWeight: "900", fontSize: 22, lineHeight: 26 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  stat: {
    flex: 1,
    backgroundColor: theme.white,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.paperBorder,
    shadowColor: "#1E2430",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  statValue: { fontSize: 26, fontWeight: "900", color: theme.indigo },
  statLabel: { marginTop: 3, color: theme.inkSoft, fontSize: 12, fontWeight: "700" },
  ghostBanner: {
    marginTop: 14,
    backgroundColor: theme.goldSoft,
    borderWidth: 1.5,
    borderColor: theme.gold,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  ghostBannerText: { flex: 1, gap: 2 },
  ghostTitle: { fontSize: 14, fontWeight: "900", color: "#7B5816" },
  ghostSub: { fontSize: 12, color: theme.inkSoft, fontWeight: "600" },
  ghostArrow: { fontSize: 13, fontWeight: "900", color: theme.vermillion },
  card: {
    marginTop: 18,
    backgroundColor: theme.white,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    shadowColor: "#1E2430",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  cardHead: { gap: 8, paddingBottom: 14 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { fontSize: 18, fontWeight: "900", color: theme.ink },
  segmented: {
    flexDirection: "row",
    backgroundColor: theme.paper,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9 },
  segBtnActive: { backgroundColor: theme.white },
  segText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  segTextActive: { color: theme.ink },
  overall: { color: theme.inkSoft, fontSize: 12, fontWeight: "700", lineHeight: 19 },
  levelBlock: {
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(30, 36, 48, 0.08)",
  },
  levelHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  levelName: { width: 36, fontWeight: "900", fontSize: 15 },
  levelMeta: { flex: 1, color: theme.inkSoft, fontSize: 13, fontWeight: "700" },
  percent: { color: theme.inkSoft, fontSize: 13, fontWeight: "800" },
  barWrap: { flex: 1, minWidth: 0 },
  breakdown: { flexDirection: "row", paddingTop: 2 },
  breakItem: { flex: 1, alignItems: "center", gap: 3 },
  breakValue: { fontSize: 14, fontWeight: "900" },
  breakLabel: { color: theme.inkSoft, fontSize: 11, fontWeight: "700" },
  ctaBar: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
  },
  ctaBtn: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaVocab: {
    backgroundColor: theme.vermillion,
    shadowColor: theme.vermillion,
  },
  ctaGrammar: {
    backgroundColor: theme.indigo,
    shadowColor: theme.indigo,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "900" },
});
