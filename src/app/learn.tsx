import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabs } from "@/components/BottomTabs";
import { LevelSummary } from "@/components/LevelSummary";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { ProgressBar } from "@/components/ProgressBar";
import { LEVELS, manifests } from "@/data/registry";
import type { LevelId } from "@/data/types";
import { levelSummary, topicCompletion } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

export default function LearnScreen() {
  const { currentLevel, setCurrentLevel, learned, attempts, setPref } = useProgress();
  const { t, isDark, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [level, setLevel] = useState<LevelId>(currentLevel);
  const [search, setSearch] = useState("");
  const allTopics = manifests[level].topics;
  const summary = useMemo(() => levelSummary(level, learned, attempts), [level, learned, attempts]);

  const topics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTopics;
    return allTopics.filter((item) => item.title.toLowerCase().includes(q) || item.id.includes(q));
  }, [allTopics, search]);

  const chooseLevel = (next: LevelId) => {
    setLevel(next);
    setCurrentLevel(next);
    setSearch("");
  };

  const accent = levelAccent[level];

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Text style={styles.back}>← 返回</Text>
            </Pressable>
            <View style={styles.topRight}>
              <Pressable onPress={() => setPref("darkMode", !isDark)} style={styles.themeBtn}>
                <Text style={styles.themeBtnText}>{isDark ? "昼" : "夜"}</Text>
              </Pressable>
              <Link href="/grammar" asChild>
                <Pressable style={styles.grammarShortcut}>
                  <Text style={styles.grammarShortcutText}>文法練功 →</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>單字課程</Text>
            <Text style={styles.countMeta}>
              {allTopics.length} 課 · {summary.total} 詞
            </Text>
          </View>

          {allTopics.length > 0 && (
            <View style={styles.searchWrap}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`搜尋 ${level} 單字課（例如：動詞、名詞、05）`}
                placeholderTextColor={t.inkMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </View>

        <View style={styles.summary}>
          <LevelSummary level={level} {...summary} />
        </View>

        <ScrollView
          style={styles.topicScroller}
          contentContainerStyle={styles.topics}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {allTopics.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{level} 課程準備中</Text>
              <Text style={styles.emptyBody}>這一級的單字課程尚未開放，請先切換至 N5–N3 練習。</Text>
            </View>
          ) : topics.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>找不到符合的單字課</Text>
              <Text style={styles.emptyBody}>試試切換下方級別或清除搜尋字詞。</Text>
            </View>
          ) : (
            topics.map((topic) => {
              const percent = topicCompletion(level, topic.id, learned);
              const pctInt = Math.round(percent * 100);
              return (
                <Link
                  key={topic.id}
                  href={{ pathname: "/topic/[level]/[id]", params: { level, id: topic.id } }}
                  asChild
                >
                  <Pressable style={styles.topic}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.codeText, { color: accent }]}>
                        {level} · {topic.id}
                      </Text>
                      <Text style={styles.wordCountText}>{topic.wordCount} 詞</Text>
                      <Text style={styles.topicPercent}>{pctInt}%</Text>
                    </View>

                    <Text style={styles.topicTitle}>{topic.title}</Text>

                    <View style={styles.cardFoot}>
                      <View style={styles.barWrap}>
                        <ProgressBar percent={percent} color={accent} height={3} />
                      </View>
                      <Text style={[styles.enterLabel, { color: accent }]}>
                        {pctInt >= 100 ? "✓ 複習 →" : "開始 →"}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })
          )}
        </ScrollView>

        <BottomTabs
          value={level}
          onChange={(next) => chooseLevel(next as LevelId)}
          tabs={[...LEVELS].reverse().map((item) => ({ id: item, label: item, color: levelAccent[item] }))}
        />
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.paper },
    safe: { flex: 1 },
    top: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10, gap: 10 },
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    backBtn: {
      backgroundColor: t.white,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    back: { color: t.ink, fontWeight: "700", fontSize: 12.5 },
    themeBtn: {
      backgroundColor: t.white,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    themeBtnText: { color: t.inkSoft, fontWeight: "700", fontSize: 12.5 },
    grammarShortcut: {
      borderWidth: 1,
      borderColor: t.ink,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 4,
    },
    grammarShortcutText: { color: t.ink, fontSize: 12, fontWeight: "700" },
    titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
    title: { fontFamily: t.serif, fontSize: 25, fontWeight: "700", color: t.ink },
    countMeta: { fontSize: 12, fontWeight: "600", color: t.inkSoft },
    searchWrap: {
      backgroundColor: t.white,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.paperBorder,
      paddingHorizontal: 12,
    },
    searchInput: { height: 38, fontSize: 13.5, color: t.ink },
    summary: { paddingHorizontal: 18, paddingBottom: 10 },
    topicScroller: { flex: 1 },
    topics: { paddingHorizontal: 18, paddingBottom: 32, gap: 10 },
    topic: {
      backgroundColor: t.white,
      borderRadius: 8,
      padding: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    codeText: { fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6 },
    wordCountText: { color: t.inkMuted, fontSize: 11.5, fontWeight: "600" },
    topicPercent: { fontSize: 11.5, fontWeight: "700", color: t.inkSoft, marginLeft: "auto" },
    topicTitle: { fontSize: 15, fontWeight: "700", color: t.ink, lineHeight: 21 },
    cardFoot: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 2 },
    barWrap: { flex: 1, minWidth: 0 },
    enterLabel: { fontSize: 12, fontWeight: "700" },
    empty: {
      marginTop: 14,
      padding: 26,
      borderRadius: 8,
      backgroundColor: t.white,
      borderWidth: 1,
      borderColor: t.paperBorder,
      alignItems: "center",
      gap: 6,
    },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: t.ink },
    emptyBody: { color: t.inkSoft, textAlign: "center", lineHeight: 20, fontSize: 13 },
  });
}
