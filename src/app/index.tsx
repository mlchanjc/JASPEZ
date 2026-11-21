import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { PressableScale } from "@/components/PressableScale";
import { ProgressBar } from "@/components/ProgressBar";
import { LEVELS } from "@/data/registry";
import { lexiconCount } from "@/lib/conjugator";
import { grammarLevelSummary } from "@/lib/grammar";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { levelSummary } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

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
    prefs,
    setPref,
  } = useProgress();
  const { t, isDark, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [boardTab, setBoardTab] = useState<"vocab" | "grammar">("vocab");
  const insets = useSafeAreaInsets();
  const buttonBottom = insets.bottom + 16;

  const proficiencyColor = [t.inkMuted, t.gold, t.indigo, t.matcha];

  const vocabSummaries = useMemo(
    () => LEVELS.map((level) => ({ level, ...levelSummary(level, learned, attempts) })),
    [learned, attempts],
  );

  const grammarSummaries = useMemo(
    () => LEVELS.map((level) => ({ level, ...grammarLevelSummary(level, grammarLearned, grammarAttempts) })),
    [grammarLearned, grammarAttempts],
  );

  const totalLexicon = useMemo(() => lexiconCount("ALL"), []);

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
  const activeList = boardTab === "vocab" ? vocabSummaries : grammarSummaries;

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: buttonBottom + 84 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Editorial Masthead */}
          <View style={styles.masthead}>
            <View style={styles.mastheadTop}>
              <Text style={styles.kicker}>JASPEZ · 目標 {currentLevel}</Text>
              <View style={styles.topControls}>
                <Pressable
                  onPress={() => setPref("darkMode", !isDark)}
                  style={styles.themeToggle}
                  accessibilityLabel="切換深淺色模式"
                >
                  <Text style={styles.themeToggleText}>{isDark ? "昼 Light" : "夜 Dark"}</Text>
                </Pressable>
                <View style={styles.streakStamp}>
                  <Text style={styles.streakText}>連續 {streak} 日</Text>
                </View>
              </View>
            </View>
            <Text style={styles.title}>今日の勉強</Text>
            <Text style={styles.subtitle}>
              N5–N3 單字、國文法課堂與 {totalLexicon} 詞即時活用練功
            </Text>
          </View>

          {/* 3-Column Hairline Metrics Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{learnedCount}</Text>
              <Text style={styles.statLabel}>已學單字</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={styles.statValue}>{grammarLearnedCount}</Text>
              <Text style={styles.statLabel}>已學文法</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={[styles.statValue, ghostGrammar.length > 0 && { color: t.vermillion }]}>
                {ghostGrammar.length}
              </Text>
              <Text style={styles.statLabel}>待複習錯題</Text>
            </View>
          </View>

          {/* Ghost Review Callout */}
          {ghostGrammar.length > 0 && (
            <Link href="/grammar" asChild>
              <Pressable style={styles.ghostBanner}>
                <View style={styles.ghostRule} />
                <View style={styles.ghostBody}>
                  <Text style={styles.ghostTitle}>尚有 {ghostGrammar.length} 個文法錯題待複習</Text>
                  <Text style={styles.ghostSub}>系統已自動換新例句，點擊立即練習</Text>
                </View>
                <Text style={styles.ghostArrow}>前往 →</Text>
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
                總計 {activeTotals.learned} / {activeTotals.total} · {activeTotals.proficiency[3]} 記住 ·{" "}
                {activeTotals.proficiency[2]} 熟悉 · {activeTotals.proficiency[1]} 初識
              </Text>
            </View>

            <View style={styles.levelList}>
              {activeList.map((item, idx) => {
                const isPlaceholder = item.total === 0;
                const accent = levelAccent[item.level];
                const metaText = isPlaceholder
                  ? "即將推出"
                  : boardTab === "vocab"
                    ? `${(item as (typeof vocabSummaries)[number]).lessons} 課 · ${item.learnedCount} / ${item.total}`
                    : `${item.learnedCount} / ${item.total} 句型`;

                return (
                  <View
                    key={item.level}
                    style={[
                      styles.levelBlock,
                      idx > 0 && styles.levelBlockBorder,
                      isPlaceholder && styles.levelBlockMuted,
                    ]}
                  >
                    <View style={styles.levelHead}>
                      <Text style={[styles.levelCode, { color: accent }]}>{item.level}</Text>
                      <Text style={styles.levelMeta}>{metaText}</Text>
                      {!isPlaceholder && (
                        <Text style={styles.percent}>{Math.round(item.percent * 100)}%</Text>
                      )}
                    </View>
                    {!isPlaceholder && (
                      <>
                        <View style={styles.barWrap}>
                          <ProgressBar percent={item.percent} color={accent} height={4} />
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
          </View>
        </ScrollView>

        {/* Pinned Editorial Dual Action Bar */}
        <View style={[styles.ctaBar, { bottom: buttonBottom }]}>
          <Link href="/learn" asChild>
            <PressableScale
              accessibilityLabel="開始學單字"
              style={StyleSheet.flatten([styles.ctaBtn, styles.ctaSecondary])}
            >
              <Text style={styles.ctaSecondaryText}>單字課程</Text>
            </PressableScale>
          </Link>
          <Link href="/grammar" asChild>
            <PressableScale
              accessibilityLabel="文法特訓"
              style={StyleSheet.flatten([styles.ctaBtn, styles.ctaPrimary])}
            >
              <Text style={styles.ctaPrimaryText}>文法練功 →</Text>
            </PressableScale>
          </Link>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.paper },
    safe: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 14, gap: 18 },
    masthead: {
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: t.paperBorder,
      gap: 6,
    },
    mastheadTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    kicker: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.4,
      color: t.inkMuted,
    },
    topControls: { flexDirection: "row", alignItems: "center", gap: 8 },
    themeToggle: {
      borderWidth: 1,
      borderColor: t.paperBorder,
      backgroundColor: t.white,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    themeToggleText: { fontSize: 11.5, fontWeight: "700", color: t.inkSoft },
    streakStamp: {
      borderWidth: 1,
      borderColor: t.vermillion,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 4,
    },
    streakText: { fontSize: 11.5, fontWeight: "700", color: t.vermillion },
    title: {
      fontFamily: t.serif,
      fontSize: 30,
      fontWeight: "700",
      color: t.ink,
      letterSpacing: 0.5,
      marginTop: 4,
    },
    subtitle: { fontSize: 13, color: t.inkSoft, lineHeight: 20 },
    statsStrip: {
      flexDirection: "row",
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: t.paperBorder,
    },
    statCell: { flex: 1, gap: 2 },
    statBorder: { borderLeftWidth: 1, borderLeftColor: t.paperBorder, paddingLeft: 14 },
    statValue: { fontSize: 22, fontWeight: "700", color: t.ink },
    statLabel: { fontSize: 11.5, color: t.inkSoft, fontWeight: "600" },
    ghostBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: t.white,
      borderWidth: 1,
      borderColor: t.paperBorder,
      borderRadius: 8,
      padding: 14,
    },
    ghostRule: { width: 3, alignSelf: "stretch", backgroundColor: t.vermillion, borderRadius: 2 },
    ghostBody: { flex: 1, minWidth: 0, gap: 2 },
    ghostTitle: { fontSize: 14, fontWeight: "700", color: t.ink },
    ghostSub: { fontSize: 12, color: t.inkSoft },
    ghostArrow: { fontSize: 12.5, fontWeight: "700", color: t.vermillion },
    card: {
      backgroundColor: t.white,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.paperBorder,
      padding: 16,
      gap: 14,
    },
    cardHead: { gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: t.paperBorder },
    cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    section: { fontSize: 15, fontWeight: "700", color: t.ink, letterSpacing: 0.4 },
    segmented: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: t.paperBorder,
      borderRadius: 6,
      padding: 2,
      backgroundColor: t.surface,
    },
    segBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 },
    segBtnActive: { backgroundColor: t.ink },
    segText: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    segTextActive: { color: t.paper },
    overall: { fontSize: 12, color: t.inkSoft, lineHeight: 18 },
    levelList: { gap: 0 },
    levelBlock: { paddingVertical: 12, gap: 8 },
    levelBlockBorder: { borderTopWidth: 1, borderTopColor: t.paperBorder },
    levelBlockMuted: { opacity: 0.45 },
    levelHead: { flexDirection: "row", alignItems: "center", gap: 10 },
    levelCode: { width: 30, fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
    levelMeta: { flex: 1, fontSize: 13, color: t.inkSoft, fontWeight: "600" },
    percent: { fontSize: 12.5, fontWeight: "700", color: t.ink },
    barWrap: { flex: 1, minWidth: 0 },
    breakdown: { flexDirection: "row", gap: 6, paddingTop: 2 },
    breakItem: { flex: 1, alignItems: "center", gap: 1 },
    breakValue: { fontSize: 13.5, fontWeight: "700" },
    breakLabel: { fontSize: 10.5, color: t.inkMuted, fontWeight: "600" },
    ctaBar: {
      position: "absolute",
      left: 20,
      right: 20,
      flexDirection: "row",
      gap: 10,
    },
    ctaBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 8,
      borderWidth: 1,
    },
    ctaSecondary: { backgroundColor: t.white, borderColor: t.ink },
    ctaPrimary: { backgroundColor: t.ink, borderColor: t.ink },
    ctaSecondaryText: { color: t.ink, fontSize: 14, fontWeight: "700", letterSpacing: 0.4 },
    ctaPrimaryText: { color: t.paper, fontSize: 14, fontWeight: "700", letterSpacing: 0.4 },
  });
}
