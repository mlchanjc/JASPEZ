import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabs } from "@/components/BottomTabs";
import { LearnMode } from "@/components/LearnMode";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { QuizMode } from "@/components/QuizMode";
import { VocabList } from "@/components/VocabList";
import { lessons, manifests } from "@/data/registry";
import { isLevelId } from "@/lib/vocab";
import { levelAccent, theme } from "@/theme";

export default function TopicScreen() {
  const params = useLocalSearchParams<{ level: string; id: string }>();
  const level = String(params.level ?? "");
  const id = String(params.id ?? "");
  const [mode, setMode] = useState<"list" | "learn" | "quiz">("list");

  if (!isLevelId(level)) {
    return (
      <View style={styles.screen}>
        <PaperBackdrop />
        <SafeAreaView style={styles.missing}>
          <Text style={styles.missingText}>找不到這個級別。</Text>
        </SafeAreaView>
      </View>
    );
  }

  const lesson = lessons[level][id];
  const topic = manifests[level].topics.find((item) => item.id === id);
  if (!lesson || !topic) {
    return (
      <View style={styles.screen}>
        <PaperBackdrop />
        <SafeAreaView style={styles.missing}>
          <Text style={styles.missingText}>找不到這一課。</Text>
        </SafeAreaView>
      </View>
    );
  }

  const accent = levelAccent[level];

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <View style={styles.navRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Text style={styles.back}>← 所有單字課</Text>
            </Pressable>
            <View style={styles.navBadges}>
              <View style={[styles.levelPill, { backgroundColor: accent }]}>
                <Text style={styles.levelPillText}>
                  {level} 單字 {id}
                </Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{lesson.words.length} 詞</Text>
              </View>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {topic.title}
          </Text>
        </View>

        <View style={styles.body}>
          {mode === "list" ? (
            <VocabList level={level} topicId={id} words={lesson.words} />
          ) : mode === "learn" ? (
            <LearnMode level={level} topicId={id} words={lesson.words} />
          ) : (
            <QuizMode level={level} topicId={id} words={lesson.words} />
          )}
        </View>

        <BottomTabs
          value={mode}
          onChange={(next) => setMode(next as "list" | "learn" | "quiz")}
          tabs={[
            { id: "list", label: "單字表", color: accent },
            { id: "learn", label: "選詞練功", color: accent },
            { id: "quiz", label: "手打測驗", color: accent },
          ]}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  safe: { flex: 1 },
  top: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10, gap: 8 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  backBtn: {
    backgroundColor: theme.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  back: { color: theme.ink, fontWeight: "800", fontSize: 13 },
  navBadges: { flexDirection: "row", alignItems: "center", gap: 6 },
  levelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelPillText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  countPill: {
    backgroundColor: theme.white,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  countPillText: { color: theme.inkSoft, fontSize: 11, fontWeight: "800" },
  title: { fontSize: 20, fontWeight: "900", color: theme.ink, lineHeight: 26 },
  body: { flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  missingText: { color: theme.ink, fontSize: 18, fontWeight: "800" },
});
