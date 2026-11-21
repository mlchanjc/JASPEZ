import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  const topics = manifests[level].topics;
  const summary = useMemo(() => levelSummary(level, learned, attempts), [level, learned, attempts]);

  const chooseLevel = (next: LevelId) => {
    setLevel(next);
    setCurrentLevel(next);
  };

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.back}>← 返回</Text>
            </Pressable>
            <Link href="/grammar" asChild>
              <Pressable style={styles.grammarShortcut}>
                <Text style={styles.grammarShortcutText}>文法特訓 →</Text>
              </Pressable>
            </Link>
          </View>
          <Text style={styles.title}>單字課程</Text>
        </View>
        <View style={styles.summary}>
          <LevelSummary level={level} {...summary} />
        </View>
        <ScrollView style={styles.topicScroller} contentContainerStyle={styles.topics} showsVerticalScrollIndicator={false}>
          {topics.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{level} 還在準備</Text>
              <Text style={styles.emptyBody}>這一級的單字還沒放進來。</Text>
            </View>
          ) : (
            topics.map((topic) => {
              const percent = topicCompletion(level, topic.id, learned);
              return (
                <Link
                  key={topic.id}
                  href={{ pathname: "/topic/[level]/[id]", params: { level, id: topic.id } }}
                  asChild
                >
                  <Pressable style={styles.topic}>
                    <View style={styles.topicHead}>
                      <Text style={styles.topicTitle}>{topic.title}</Text>
                      <Text style={styles.topicPercent}>{Math.round(percent * 100)}%</Text>
                    </View>
                    <Text style={styles.topicCount}>{topic.wordCount} 個單字</Text>
                    <View style={styles.barWrap}>
                      <ProgressBar percent={percent} color={levelAccent[level]} height={8} />
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
  top: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: theme.indigo, fontWeight: "800", fontSize: 14 },
  grammarShortcut: {
    backgroundColor: theme.indigoSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  grammarShortcutText: { color: theme.indigo, fontSize: 12, fontWeight: "800" },
  title: { marginTop: 8, fontSize: 28, fontWeight: "900", color: theme.ink },
  summary: { paddingHorizontal: 20, paddingBottom: 12 },
  topicScroller: { flex: 1 },
  topics: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  topic: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    shadowColor: "#1E2430",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topicHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  topicTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: theme.ink },
  topicCount: { color: theme.inkSoft, fontSize: 13, fontWeight: "600" },
  topicPercent: { color: theme.indigo, fontSize: 13, fontWeight: "800" },
  barWrap: { flex: 1, minWidth: 0 },
  empty: {
    marginTop: 24,
    padding: 24,
    borderRadius: 22,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: theme.ink },
  emptyBody: { marginTop: 6, color: theme.inkSoft },
});
