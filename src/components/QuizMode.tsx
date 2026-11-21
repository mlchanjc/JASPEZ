import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { isCorrectAnswer } from "@/lib/answers";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { theme } from "@/theme";
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
  const prompts = useMemo(() => shuffle(words), [level, topicId, words]);
  const [cursor, setCursor] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const sheet = useRef(new Animated.Value(180)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const prompt = prompts[cursor];

  useEffect(() => {
    if (!feedback) return;
    sheet.setValue(180);
    Animated.spring(sheet, { toValue: 0, useNativeDriver: true, friction: 7, tension: 70 }).start();
    if (feedback === "error") {
      Animated.sequence([
        Animated.timing(shake, { toValue: -10, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 10, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 8, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [feedback, sheet, shake]);

  if (!prompt) {
    return (
      <View style={styles.done}>
        <Text style={styles.doneMark}>印</Text>
        <Text style={styles.doneTitle}>這課練完了</Text>
        <Text style={styles.doneBody}>答對的單字已記進進度。</Text>
      </View>
    );
  }

  const submit = () => {
    if (feedback) return;
    if (isCorrectAnswer(prompt.word, input)) {
      markLearned(wordKey(level, topicId, prompt.index));
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
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.session}>
        <ProgressBar percent={prompts.length === 0 ? 0 : answered / prompts.length} color={theme.indigo} />
        <Text style={styles.sessionLabel}>
          {answered}/{prompts.length}
        </Text>
      </View>
      <Animated.View style={[styles.card, { transform: [{ translateX: shake }] }]}>
        <Text style={styles.promptLabel}>中文意思</Text>
        <Text style={styles.meaning}>{prompt.word.meaning}</Text>
      </Animated.View>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="輸入漢字或假名"
        placeholderTextColor="#A89884"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!feedback}
        onSubmitEditing={submit}
        style={styles.input}
      />
      <Pressable style={styles.submit} onPress={submit} disabled={Boolean(feedback)}>
        <Text style={styles.submitText}>送出</Text>
      </Pressable>
      {feedback ? (
        <Animated.View
          style={[
            styles.banner,
            feedback === "success" ? styles.bannerOk : styles.bannerBad,
            { transform: [{ translateY: sheet }] },
          ]}
        >
          <Text style={styles.bannerTitle}>{feedback === "success" ? "答對了" : "再看一次"}</Text>
          {feedback === "error" ? (
            <Text style={styles.bannerBody}>
              {prompt.word.word}　{prompt.word.reading}
            </Text>
          ) : (
            <Text style={styles.bannerBody}>{prompt.word.word}</Text>
          )}
          <Pressable onPress={continueQuiz}>
            <Text style={styles.bannerNext}>下一題</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, padding: 20 },
  session: { gap: 6 },
  sessionLabel: { alignSelf: "flex-end", color: theme.inkSoft, fontSize: 12 },
  card: {
    marginTop: 24,
    backgroundColor: theme.white,
    borderRadius: 28,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderWidth: 2,
    borderColor: "rgba(198, 161, 91, 0.45)",
  },
  promptLabel: { color: theme.inkSoft, letterSpacing: 2 },
  meaning: { marginTop: 12, fontSize: 32, fontWeight: "800", color: theme.ink, textAlign: "center" },
  input: {
    marginTop: 20,
    backgroundColor: theme.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: theme.ink,
  },
  submit: {
    marginTop: 12,
    backgroundColor: theme.indigo,
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 14,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 24,
    padding: 18,
  },
  bannerOk: { backgroundColor: theme.success },
  bannerBad: { backgroundColor: theme.error },
  bannerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  bannerBody: { color: "#fff", marginTop: 6, fontSize: 18 },
  bannerNext: { marginTop: 12, color: "#fff", fontWeight: "800" },
  done: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  doneMark: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: theme.vermillion,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 82,
    color: theme.vermillion,
    fontSize: 36,
    fontWeight: "900",
  },
  doneTitle: { marginTop: 16, fontSize: 24, fontWeight: "800", color: theme.ink },
  doneBody: { marginTop: 6, color: theme.inkSoft },
});
