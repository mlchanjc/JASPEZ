import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { PressableScale } from "@/components/PressableScale";
import { ProgressBar } from "@/components/ProgressBar";
import { LEVELS } from "@/data/registry";
import { verbCountForLevel } from "@/lib/conjugator";
import { grammarLevelSummary } from "@/lib/grammar";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { levelSummary } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

const proficiencyColor = [theme.inkMuted, theme.gold, theme.indigo, theme.matcha];

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

  const totalVerbs = useMemo(() => verbCountForLevel("ALL"), []);

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
          {/* Modern Playful Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.brandPill}>
                <Text style={styles.brandPillText}>JASPEZ · 離線日語特訓</Text>
              </View>
              <View style={[styles.levelPill, { backgroundColor: levelAccent[currentLevel] }]}>
                <Text style={styles.levelPillText}>目標 {currentLevel}</Text>
              </View>
            </View>
            <Text style={styles.title}>今日の勉強</Text>
            <Text style={styles.subtitle}>
              N5–N3 單字、多情境文法與 {totalVerbs} 動詞即時活用
            </Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>🔥 {streak}</Text>
                <Text style={styles.heroStatLabel}>連續天數</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{learnedCount}</Text>
                <Text style={styles.heroStatLabel}>已學單字</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{grammarLearnedCount}</Text>
                <Text style={styles.heroStatLabel}>已學文法</Text>
              </View>
            </View>
          </View>

          {/* Ghost Review Callout */}
          {ghostGrammar.length > 0 && (
            <Link href="/grammar" asChild>
              <Pressable style={styles.ghostBanner}>
                <View style={styles.ghostIcon}>
                  <Text style={styles.ghostEmoji}>⚡</Text>
                </View>
                <View style={styles.ghostBannerText}>
                  <Text style={styles.ghostTitle}>有 {ghostGrammar.length} 個文法錯題待複習</Text>
                  <Text style={styles.ghostSub}>系統已自動換新例句，點擊立即挑戰</Text>
                </View>
                <Text style={styles.ghostArrow}>GO →</Text>
              </Pressable>
            </Link>
          )}

          {/* Dual Progress Board */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.section}>各級學習進度</Text>
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
                總計 {activeTotals.learned}/{activeTotals.total} 已學 · {activeTotals.proficiency[3]} 記住 ·{" "}
                {activeTotals.proficiency[2]} 熟悉 · {activeTotals.proficiency[1]} 初識
              </Text>
            </View>

            {boardTab === "vocab"
              ? vocabSummaries.map((item) => {
                  const isPlaceholder = item.total === 0;
                  return (
                    <View key={item.level} style={[styles.levelBlock, isPlaceholder && styles.levelBlockMuted]}>
                      <View style={styles.levelHead}>
                        <View style={[styles.levelDot, { backgroundColor: levelAccent[item.level] }]}>
                          <Text style={styles.levelDotText}>{item.level}</Text>
                        </View>
                        <Text style={styles.levelMeta}>
                          {isPlaceholder ? "即將推出" : `${item.lessons} 課 · ${item.learnedCount}/${item.total}`}
                        </Text>
                        {!isPlaceholder && (
                          <Text style={styles.percent}>{Math.round(item.percent * 100)}%</Text>
                        )}
                      </View>
                      {!isPlaceholder && (
                        <>
                          <View style={styles.barWrap}>
                            <ProgressBar percent={item.percent} color={levelAccent[item.level]} height={9} />
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
                        </>
                      )}
                    </View>
                  );
                })
              : grammarSummaries.map((item) => {
                  const isPlaceholder = item.total === 0;
                  return (
                    <View key={item.level} style={[styles.levelBlock, isPlaceholder && styles.levelBlockMuted]}>
                      <View style={styles.levelHead}>
                        <View style={[styles.levelDot, { backgroundColor: levelAccent[item.level] }]}>
                          <Text style={styles.levelDotText}>{item.level}</Text>
                        </View>
                        <Text style={styles.levelMeta}>
                          {isPlaceholder ? "即將推出" : `${item.learnedCount}/${item.total} 句型（多情境題庫）`}
                        </Text>
                        {!isPlaceholder && (
                          <Text style={styles.percent}>{Math.round(item.percent * 100)}%</Text>
                        )}
                      </View>
                      {!isPlaceholder && (
                        <>
                          <View style={styles.barWrap}>
                            <ProgressBar percent={item.percent} color={levelAccent[item.level]} height={9} />
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
                        </>
                      )}
                    </View>
                  );
                })}
          </View>
        </ScrollView>

        {/* Pinned Tactile Dual Action Bar */}
        <View style={[styles.ctaBar, { bottom: buttonBottom }]}>
          <Link href="/learn" asChild>
            <PressableScale
              accessibilityLabel="開始學單字"
              style={StyleSheet.flatten([styles.ctaBtn, styles.ctaVocab])}
            >
              <Text style={styles.ctaText}>📚 學單字</Text>
            </PressableScale>
          </Link>
          <Link href="/grammar" asChild>
            <PressableScale
              accessibilityLabel="文法特訓"
              style={StyleSheet.flatten([styles.ctaBtn, styles.ctaGrammar])}
            >
              <Text style={styles.ctaText}>✨ 練文法</Text>
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
  content: { padding: 20, gap: 16 },
  heroCard: {
    backgroundColor: theme.ink,
    borderRadius: 28,
    padding: 20,
    gap: 8,
    shadowColor: "#161B2E",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  brandPill: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  brandPillText: { color: "#E2E8F0", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  levelPill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99 },
  levelPillText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  title: { marginTop: 4, fontSize: 32, fontWeight: "900", color: "#fff" },
  subtitle: { color: "#CBD5E1", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  heroStats: {
    marginTop: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatValue: { fontSize: 20, fontWeight: "900", color: "#fff" },
  heroStatLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8" },
  heroDivider: { width: 1, height: 28, backgroundColor: "rgba(255, 255, 255, 0.14)" },
  ghostBanner: {
    backgroundColor: theme.white,
    borderWidth: 2,
    borderColor: theme.gold,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ghostIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostEmoji: { fontSize: 20 },
  ghostBannerText: { flex: 1, gap: 2 },
  ghostTitle: { fontSize: 14, fontWeight: "900", color: theme.ink },
  ghostSub: { fontSize: 12, color: theme.inkSoft, fontWeight: "600" },
  ghostArrow: { fontSize: 13, fontWeight: "900", color: theme.goldDark },
  card: {
    backgroundColor: theme.white,
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  segTextActive: { color: theme.indigo },
  overall: { color: theme.inkSoft, fontSize: 12, fontWeight: "700", lineHeight: 19 },
  levelBlock: {
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.paperBorder,
  },
  levelBlockMuted: {
    paddingVertical: 11,
    opacity: 0.65,
  },
  levelHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelDot: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelDotText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  levelMeta: { flex: 1, color: theme.inkSoft, fontSize: 13, fontWeight: "700" },
  percent: { color: theme.ink, fontSize: 13, fontWeight: "900" },
  barWrap: { flex: 1, minWidth: 0 },
  breakdown: { flexDirection: "row", paddingTop: 2 },
  breakItem: { flex: 1, alignItems: "center", gap: 2 },
  breakValue: { fontSize: 14, fontWeight: "900" },
  breakLabel: { color: theme.inkMuted, fontSize: 11, fontWeight: "700" },
  ctaBar: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
  },
  ctaBtn: {
    flex: 1,
    height: 58,
    borderRadius: 20,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaVocab: {
    backgroundColor: theme.vermillion,
    borderBottomColor: theme.vermillionDark,
    shadowColor: theme.vermillion,
  },
  ctaGrammar: {
    backgroundColor: theme.indigo,
    borderBottomColor: theme.indigoDark,
    shadowColor: theme.indigo,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
