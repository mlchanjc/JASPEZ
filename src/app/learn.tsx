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
import { levelAccent, theme } from "@/theme";

export default function LearnScreen() {
  const { currentLevel, setCurrentLevel, learned, attempts } = useProgress();
  const [level, setLevel] = useState<LevelId>(currentLevel);
  const [search, setSearch] = useState("");
  const allTopics = manifests[level].topics;
  const summary = useMemo(() => levelSummary(level, learned, attempts), [level, learned, attempts]);

  const topics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTopics;
    return allTopics.filter((t) => t.title.toLowerCase().includes(q) || t.id.includes(q));
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
            <Link href="/grammar" asChild>
              <Pressable style={styles.grammarShortcut}>
                <Text style={styles.grammarShortcutText}>✨ 文法特訓 →</Text>
              </Pressable>
            </Link>
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>單字課程</Text>
            <View style={[styles.countPill, { backgroundColor: `${accent}18` }]}>
              <Text style={[styles.countPillText, { color: accent }]}>
                {allTopics.length} 課 · {summary.total} 詞
              </Text>
            </View>
          </View>
          {allTopics.length > 0 && (
            <View style={styles.searchWrap}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`搜尋 ${level} 單字課（例如：動詞、名詞、05）`}
                placeholderTextColor={theme.inkMuted}
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
              <Text style={styles.emptyEmoji}>🚧</Text>
              <Text style={styles.emptyTitle}>{level} 還在準備</Text>
              <Text style={styles.emptyBody}>這一級的單字課程尚未開放，先挑戰 N5–N3 吧！</Text>
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
                      <View style={[styles.codeBadge, { backgroundColor: accent }]}>
                        <Text style={styles.codeBadgeText}>
                          {level} · {topic.id}
                        </Text>
                      </View>
                      <View style={styles.wordCountChip}>
                        <Text style={styles.wordCountChipText}>{topic.wordCount} 詞</Text>
                      </View>
                      <View style={[styles.pctPill, { backgroundColor: `${accent}18` }]}>
                        <Text style={[styles.topicPercent, { color: accent }]}>{pctInt}%</Text>
                      </View>
                    </View>

                    <Text style={styles.topicTitle}>{topic.title}</Text>

                    <View style={styles.cardFoot}>
                      <View style={styles.barWrap}>
                        <ProgressBar percent={percent} color={accent} height={8} />
                      </View>
                      <Text style={[styles.enterLabel, { color: accent }]}>
                        {pctInt >= 100 ? "✓ 複習 →" : "開始學習 →"}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  safe: { flex: 1 },
  top: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10, gap: 10 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    backgroundColor: theme.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  back: { color: theme.ink, fontWeight: "800", fontSize: 13 },
  grammarShortcut: {
    backgroundColor: theme.indigoSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  grammarShortcutText: { color: theme.indigo, fontSize: 12, fontWeight: "900" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 26, fontWeight: "900", color: theme.ink },
  countPill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99 },
  countPillText: { fontSize: 12, fontWeight: "900" },
  searchWrap: {
    backgroundColor: theme.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    paddingHorizontal: 12,
  },
  searchInput: { height: 40, fontSize: 14, color: theme.ink, fontWeight: "600" },
  summary: { paddingHorizontal: 18, paddingBottom: 10 },
  topicScroller: { flex: 1 },
  topics: { paddingHorizontal: 18, paddingBottom: 32, gap: 11 },
  topic: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 15,
    gap: 9,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  codeBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  codeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  wordCountChip: {
    backgroundColor: theme.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  wordCountChipText: { color: theme.inkSoft, fontSize: 11, fontWeight: "800" },
  pctPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, marginLeft: "auto" },
  topicPercent: { fontSize: 11, fontWeight: "900" },
  topicTitle: { fontSize: 16, fontWeight: "900", color: theme.ink, lineHeight: 22 },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: 12 },
  barWrap: { flex: 1, minWidth: 0 },
  enterLabel: { fontSize: 12, fontWeight: "900" },
  empty: {
    marginTop: 14,
    padding: 26,
    borderRadius: 24,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    alignItems: "center",
    gap: 6,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: theme.ink },
  emptyBody: { color: theme.inkSoft, textAlign: "center", lineHeight: 20, fontSize: 13 },
});
