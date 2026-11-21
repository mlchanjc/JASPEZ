import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabs } from "@/components/BottomTabs";
import { LearnMode } from "@/components/LearnMode";
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
      <SafeAreaView style={styles.missing}>
        <Text style={styles.missingText}>找不到這個級別。</Text>
      </SafeAreaView>
    );
  }

  const lesson = lessons[level][id];
  const topic = manifests[level].topics.find((item) => item.id === id);
  if (!lesson || !topic) {
    return (
      <SafeAreaView style={styles.missing}>
        <Text style={styles.missingText}>找不到這一課。</Text>
      </SafeAreaView>
    );
  }

  const accent = levelAccent[level];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>返回</Text>
        </Pressable>
        <Text style={styles.title}>{topic.title}</Text>
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
          { id: "quiz", label: "測驗", color: accent },
          { id: "learn", label: "學習", color: accent },
          { id: "list", label: "單字", color: accent },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  top: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 },
  back: { color: theme.indigo, fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "800", color: theme.ink },
  body: { flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.paper },
  missingText: { color: theme.ink, fontSize: 18 },
});
