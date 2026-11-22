import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { isCorrectAnswer } from "@/lib/answers";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";
import { ProgressBar } from "./ProgressBar";

type Prompt = { word: VocabWord; index: number };

function hasJapaneseKana(value?: string | null): boolean {
  if (!value) return false;
  const s = value.trim();
  return /[\u3040-\u30ff]/.test(s) && !/[A-Za-z]/.test(s);
}

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
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
          <View style={styles.hankoStamp}>
            <Text style={styles.hankoText}>完</Text>
          </View>
          <Text style={styles.doneTitle}>本課測驗完成</Text>
          <Text style={styles.doneBody}>
            本次答對 {correctCount} / {prompts.length} 題，答對的單字已自動記進學習進度。
          </Text>
          <Pressable onPress={restart} style={styles.restartBtn}>
            <Text style={styles.restartBtnText}>再練習一次 →</Text>
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
        <View style={styles.topBar}>
          <View style={styles.sessionHead}>
            <Text style={styles.heading}>手打測驗</Text>
            <Text style={styles.scoreText}>
              {answered} / {prompts.length}
            </Text>
          </View>
          <View style={styles.barWrap}>
            <ProgressBar percent={prompts.length === 0 ? 0 : answered / prompts.length} color={accent} height={4} />
          </View>
        </View>

        <Animated.View style={[styles.drillCard, { transform: [{ translateX: shake }] }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.levelTag, { color: accent }]}>{level}</Text>
            {prompt.word.verbType ? <Text style={styles.verbTag}>{prompt.word.verbType}</Text> : null}
          </View>

          <Text style={styles.promptLabel}>輸入對應的漢字或平假名</Text>
          <Text style={styles.meaning}>{prompt.word.meaning}</Text>

          <View style={styles.inputGroup}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="輸入漢字或假名..."
              placeholderTextColor={t.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!feedback}
              onSubmitEditing={submit}
              style={styles.input}
            />
            <Pressable
              style={[styles.submit, !(input.trim() && !feedback) && styles.submitDisabled]}
              onPress={submit}
              disabled={Boolean(feedback) || !input.trim()}
            >
              <Text style={[styles.submitText, !(input.trim() && !feedback) && styles.submitTextDisabled]}>
                送出答案
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {feedback ? (
        <View
          style={[
            styles.feedbackDock,
            {
              backgroundColor: feedback === "success" ? t.successSoft : t.errorSoft,
              borderTopColor: feedback === "success" ? t.success : t.error,
            },
          ]}
        >
          <View style={styles.dockTop}>
            <Text style={[styles.dockTitle, { color: feedback === "success" ? t.matchaDark : t.error }]}>
              {feedback === "success" ? `✓ 正確 · ${prompt.word.word}` : `✕ 正解 · ${prompt.word.word}`}
            </Text>
            {hasJapaneseKana(prompt.word.reading) ? (
              <Text style={styles.dockBody} numberOfLines={2}>
                讀音：{prompt.word.reading}
                {prompt.word.accent ? ` ${prompt.word.accent}` : ""}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={continueQuiz}
            style={[styles.dockBtn, { backgroundColor: feedback === "success" ? t.success : t.error }]}
          >
            <Text style={styles.dockBtnText}>下一題 →</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    scroller: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 14 },
    topBar: { gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: t.paperBorder },
    sessionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    heading: { fontSize: 15, fontWeight: "700", color: t.ink },
    scoreText: { fontSize: 12.5, fontWeight: "700", color: t.inkSoft },
    barWrap: { flex: 1, minWidth: 0 },
    drillCard: {
      backgroundColor: t.white,
      borderRadius: 10,
      padding: 20,
      gap: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    levelTag: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
    verbTag: {
      fontSize: 11,
      fontWeight: "700",
      color: t.goldDark,
      backgroundColor: t.goldSoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    promptLabel: { fontSize: 12, fontWeight: "600", color: t.inkMuted, letterSpacing: 0.6 },
    meaning: { fontSize: 26, fontWeight: "700", color: t.ink, textAlign: "center", lineHeight: 34 },
    inputGroup: { width: "100%", gap: 10, marginTop: 6 },
    input: {
      backgroundColor: t.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.paperBorder,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 17,
      fontWeight: "600",
      color: t.ink,
      textAlign: "center",
    },
    submit: {
      backgroundColor: t.ink,
      borderRadius: 8,
      alignItems: "center",
      paddingVertical: 13,
    },
    submitDisabled: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.paperBorder },
    submitText: { color: t.paper, fontWeight: "700", fontSize: 14 },
    submitTextDisabled: { color: t.inkMuted },
    feedbackDock: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderTopWidth: 1.5,
    },
    dockTop: { flex: 1, minWidth: 0, gap: 3 },
    dockTitle: { fontSize: 13.5, fontWeight: "700" },
    dockBody: { fontSize: 11.5, color: t.inkSoft, fontWeight: "600" },
    dockBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 6 },
    dockBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    doneWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 18 },
    doneCard: {
      backgroundColor: t.white,
      borderRadius: 10,
      padding: 28,
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    hankoStamp: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: t.vermillion,
      alignItems: "center",
      justifyContent: "center",
    },
    hankoText: { fontFamily: t.serif, fontSize: 28, fontWeight: "700", color: t.vermillion },
    doneTitle: { fontFamily: t.serif, fontSize: 21, fontWeight: "700", color: t.ink },
    doneBody: { color: t.inkSoft, textAlign: "center", fontSize: 13.5, lineHeight: 21 },
    restartBtn: {
      marginTop: 6,
      backgroundColor: t.ink,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 6,
    },
    restartBtnText: { color: t.paper, fontWeight: "700", fontSize: 13.5 },
  });
}
