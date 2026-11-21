import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabs } from "@/components/BottomTabs";
import { LearnMode } from "@/components/LearnMode";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { QuizMode } from "@/components/QuizMode";
import { VocabList } from "@/components/VocabList";
import { lessons, manifests } from "@/data/registry";
import { isLevelId } from "@/lib/vocab";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

export default function TopicScreen() {
  const params = useLocalSearchParams<{ level: string; id: string }>();
  const level = String(params.level ?? "");
  const id = String(params.id ?? "");
  const [mode, setMode] = useState<"list" | "learn" | "quiz">("list");
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

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
            <Text style={[styles.levelMeta, { color: accent }]}>
              {level} · {id}（{lesson.words.length} 詞）
            </Text>
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

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.paper },
    safe: { flex: 1 },
    top: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: t.paperBorder,
    },
    navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    backBtn: {
      backgroundColor: t.white,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    back: { color: t.ink, fontWeight: "700", fontSize: 12.5 },
    levelMeta: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
    title: { fontFamily: t.serif, fontSize: 19, fontWeight: "700", color: t.ink, lineHeight: 26 },
    body: { flex: 1 },
    missing: { flex: 1, alignItems: "center", justifyContent: "center" },
    missingText: { color: t.ink, fontSize: 16, fontWeight: "700" },
  });
}
