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
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>返回</Text>
          </Pressable>
          <Text style={styles.title}>選擇級別</Text>
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
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.topicCount}>{topic.wordCount} words</Text>
                  <ProgressBar percent={percent} color={levelAccent[level]} height={8} />
                  <Text style={styles.topicPercent}>{Math.round(percent * 100)}%</Text>
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
  top: { paddingHorizontal: 20, paddingTop: 8 },
  back: { color: theme.indigo, fontWeight: "700" },
  title: { marginTop: 8, fontSize: 28, fontWeight: "800", color: theme.ink },
  summary: { paddingHorizontal: 20, paddingBottom: 12 },
  topicScroller: { flex: 1 },
  topics: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  topic: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 16,
    gap: 8,
    shadowColor: "#1E2430",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topicTitle: { fontSize: 16, fontWeight: "800", color: theme.ink },
  topicCount: { color: theme.inkSoft },
  topicPercent: { alignSelf: "flex-end", color: theme.inkSoft, fontSize: 12 },
  empty: { marginTop: 24, padding: 24, borderRadius: 22, backgroundColor: theme.white },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: theme.ink },
  emptyBody: { marginTop: 6, color: theme.inkSoft },
});
