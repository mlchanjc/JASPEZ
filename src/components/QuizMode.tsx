import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { isCorrectAnswer } from "@/lib/answers";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";
import { ProgressBar } from "./ProgressBar";

type Prompt = { word: VocabWord; index: number };

function shuffle(words: VocabWord[]) {
  const items: Prompt[] = words.map((word, index) => ({ word, index }));
  for (let cursor = items.length - 1; cursor > 0; cursor -= 1) {
    const swap = Math.floor(Math.random() * (cursor + 1));
    [items[cursor], items[swap]] = [items[swap], items[cursor]];
  }
  return items;
}

export function QuizMode({ level, topicId, words }: { level: LevelId; topicId: string; words: VocabWord[] }) {
  const { markLearned } = useProgress();
  const [seed, setSeed] = useState(0);
  const prompts = useMemo(() => shuffle(words), [level, topicId, words, seed]);
  const [cursor, setCursor] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const prompt = prompts[cursor];
  const accent = levelAccent[level];

  useEffect(() => {
    if (feedback !== "error") return;
    Animated.sequence([
      Animated.timing(shake, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [feedback, shake]);

  const restart = () => {
    setSeed((n) => n + 1);
    setCursor(0);
    setAnswered(0);
    setCorrectCount(0);
    setInput("");
    setFeedback(null);
  };

  if (!prompt) {
    return (
      <View style={styles.doneWrap}>
        <View style={styles.doneCard}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>這課測驗完成了！</Text>
          <Text style={styles.doneBody}>
            本次答對 {correctCount} / {prompts.length} 題，答對的單字已自動記進學習進度。
          </Text>
          <Pressable onPress={restart} style={[styles.restartBtn, { backgroundColor: accent }]}>
            <Text style={styles.restartBtnText}>再挑戰一次 →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const submit = () => {
    if (feedback || !input.trim()) return;
    if (isCorrectAnswer(prompt.word, input)) {
      markLearned(wordKey(level, topicId, prompt.index));
      setCorrectCount((n) => n + 1);
      setFeedback("success");
      return;
    }
    setFeedback("error");
  };

  const continueQuiz = () => {
    setFeedback(null);
    setInput("");
    setAnswered((count) => count + 1);
    setCursor((index) => index + 1);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topCard}>
          <View style={styles.sessionHead}>
            <Text style={styles.heading}>單字手打測驗</Text>
            <View style={[styles.scorePill, { backgroundColor: `${accent}18` }]}>
              <Text style={[styles.scoreText, { color: accent }]}>
                {answered} / {prompts.length}
              </Text>
            </View>
          </View>
          <View style={styles.barWrap}>
            <ProgressBar percent={prompts.length === 0 ? 0 : answered / prompts.length} color={accent} height={8} />
          </View>
        </View>

        <Animated.View style={[styles.drillCard, { transform: [{ translateX: shake }] }]}>
          <View style={styles.badges}>
            <View style={[styles.levelBadge, { backgroundColor: accent }]}>
              <Text style={styles.levelBadgeText}>{level}</Text>
            </View>
            {prompt.word.verbType ? (
              <View style={styles.groupBadge}>
                <Text style={styles.groupText}>{prompt.word.verbType}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.promptBanner}>請輸入對應的漢字或平假名</Text>
          <Text style={styles.meaning}>{prompt.word.meaning}</Text>

          <View style={styles.inputGroup}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="輸入漢字或假名..."
              placeholderTextColor={theme.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!feedback}
              onSubmitEditing={submit}
              style={styles.input}
            />
            <Pressable
              style={[
                styles.submit,
                { backgroundColor: input.trim() && !feedback ? accent : "#CBD5E1" },
              ]}
              onPress={submit}
              disabled={Boolean(feedback) || !input.trim()}
            >
              <Text style={styles.submitText}>送出答案</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* PINNED ZERO-SCROLL FEEDBACK BAR */}
      {feedback ? (
        <View
          style={[
            styles.feedbackDock,
            {
              backgroundColor: feedback === "success" ? "#ECFDF5" : "#FFF1F2",
              borderTopColor: feedback === "success" ? theme.success : theme.error,
            },
          ]}
        >
          <View style={styles.dockTop}>
            <Text style={[styles.dockTitle, { color: feedback === "success" ? theme.matchaDark : theme.error }]}>
              {feedback === "success"
                ? `✓ 正確！${prompt.word.word}`
                : `✕ 正解：${prompt.word.word}`}
            </Text>
            {prompt.word.reading ? (
              <Text style={styles.dockBody} numberOfLines={2}>
                讀音：{prompt.word.reading}
                {prompt.word.accent ? ` ${prompt.word.accent}` : ""}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={continueQuiz}
            style={[styles.dockBtn, { backgroundColor: feedback === "success" ? theme.success : theme.error }]}
          >
            <Text style={styles.dockBtnText}>下一題 →</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroller: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 24, gap: 12 },
  topCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 15,
    gap: 10,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  sessionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  heading: { fontSize: 16, fontWeight: "900", color: theme.ink },
  scorePill: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 99 },
  scoreText: { fontSize: 12, fontWeight: "900" },
  barWrap: { flex: 1, minWidth: 0 },
  drillCard: {
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  badges: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelBadgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  groupBadge: {
    backgroundColor: theme.goldSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  groupText: { fontSize: 12, fontWeight: "800", color: theme.goldDark },
  promptBanner: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.indigo,
    backgroundColor: theme.indigoSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  meaning: { fontSize: 28, fontWeight: "900", color: theme.ink, textAlign: "center", lineHeight: 36 },
  inputGroup: { width: "100%", gap: 10, marginTop: 4 },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "700",
    color: theme.ink,
    textAlign: "center",
  },
  submit: {
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
  },
  submitText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  feedbackDock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 2,
  },
  dockTop: { flex: 1, minWidth: 0, gap: 3 },
  dockTitle: { fontSize: 14, fontWeight: "900" },
  dockBody: { fontSize: 12, color: theme.inkSoft, fontWeight: "700" },
  dockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  dockBtnText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  doneWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 18 },
  doneCard: {
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  doneEmoji: { fontSize: 44 },
  doneTitle: { fontSize: 22, fontWeight: "900", color: theme.ink },
  doneBody: { color: theme.inkSoft, textAlign: "center", fontSize: 14, lineHeight: 22 },
  restartBtn: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  restartBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
