import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { proficiencyLabel } from "@/lib/proficiency";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { theme } from "@/theme";
import { ProficiencyMeter } from "./ProficiencyMeter";

type Choice = { word: VocabWord; index: number };

type Round = {
  prompt: Choice;
  options: Choice[];
};

type Outcome = {
  correct: boolean;
  before: number;
  after: number;
  recentCorrect: number;
  recentTotal: number;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let cursor = copy.length - 1; cursor > 0; cursor -= 1) {
    const swap = Math.floor(Math.random() * (cursor + 1));
    [copy[cursor], copy[swap]] = [copy[swap], copy[cursor]];
  }
  return copy;
}

function makeRound(words: VocabWord[], avoid: number | null): Round {
  const choices = words.map((word, index) => ({ word, index }));
  const pool = avoid == null ? choices : choices.filter((item) => item.index !== avoid);
  const source = pool.length > 0 ? pool : choices;
  const prompt = source[Math.floor(Math.random() * source.length)];
  const distractors = shuffle(choices.filter((item) => item.index !== prompt.index)).slice(0, 3);
  return { prompt, options: shuffle([prompt, ...distractors]) };
}

export function LearnMode({ level, topicId, words }: { level: LevelId; topicId: string; words: VocabWord[] }) {
  const { getProficiency, recordAttempt, prefs, setPref } = useProgress();
  const [round, setRound] = useState(() => makeRound(words, null));
  const [picked, setPicked] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const kanaOnly = prefs.kanaOnly;
  const setKanaOnly = (updater: boolean | ((v: boolean) => boolean)) => setPref("kanaOnly", typeof updater === "function" ? updater(prefs.kanaOnly) : updater);
  const key = wordKey(level, topicId, round.prompt.index);
  const proficiency = outcome ? outcome.after : getProficiency(key);

  const choose = (index: number) => {
    if (outcome) return;
    const correct = index === round.prompt.index;
    const before = getProficiency(key);
    const recorded = recordAttempt(key, correct);
    setPicked(index);
    setOutcome({
      correct,
      before,
      after: recorded.level,
      recentCorrect: recorded.correct,
      recentTotal: recorded.total,
    });
  };

  const next = () => {
    setRound(makeRound(words, round.prompt.index));
    setPicked(null);
    setOutcome(null);
  };

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.promptLabel}>選出正確的日文</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: kanaOnly }}
          onPress={() => setKanaOnly((value) => !value)}
          style={[styles.toggle, kanaOnly && styles.toggleOn]}
        >
          <Text style={[styles.toggleLabel, kanaOnly && styles.toggleLabelOn]}>只看假名</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.meaning}>{round.prompt.word.meaning}</Text>
        <ProficiencyMeter value={proficiency} />
      </View>
      <View style={styles.options}>
        {round.options.map((option) => {
          const selected = picked === option.index;
          const revealed = outcome != null;
          const isAnswer = option.index === round.prompt.index;
          const tone = revealed && isAnswer ? styles.optionRight : revealed && selected ? styles.optionWrong : null;
          return (
            <Pressable
              key={option.index}
              disabled={revealed}
              onPress={() => choose(option.index)}
              style={[styles.option, tone]}
            >
              {kanaOnly ? (
                <Text style={styles.optionWord}>{option.word.reading}</Text>
              ) : (
                <>
                  <Text style={styles.optionWord}>{option.word.word}</Text>
                  <Text style={styles.optionReading}>{option.word.reading}</Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
      {outcome ? (
        <View style={[styles.result, outcome.correct ? styles.resultRight : styles.resultWrong]}>
          <View style={styles.resultCopy}>
            <Text style={styles.resultTitle}>{outcome.correct ? "答對了" : "再看一次"}</Text>
            <Text style={styles.resultBody}>
              {round.prompt.word.word}　{round.prompt.word.reading}
            </Text>
            <Text style={styles.resultBody}>
              最近 {outcome.recentCorrect}/{outcome.recentTotal} 正確
            </Text>
            <Text style={styles.resultBody}>
              熟練度 {proficiencyLabel(outcome.before)} → {proficiencyLabel(outcome.after)}
            </Text>
          </View>
          <Pressable onPress={next} style={styles.nextButton}>
            <Text style={styles.next}>下一題</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20, paddingBottom: 28, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  promptLabel: { color: theme.inkSoft, letterSpacing: 2, fontWeight: "700" },
  toggle: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: theme.indigo,
    backgroundColor: "transparent",
  },
  toggleOn: { backgroundColor: theme.indigo },
  toggleLabel: { color: theme.indigo, fontSize: 13, fontWeight: "800" },
  toggleLabelOn: { color: "#fff" },
  card: {
    backgroundColor: theme.white,
    borderRadius: 28,
    padding: 24,
    gap: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(198, 161, 91, 0.45)",
  },
  meaning: { fontSize: 32, fontWeight: "800", color: theme.ink, textAlign: "center" },
  options: { gap: 10 },
  option: {
    backgroundColor: theme.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionRight: { borderColor: theme.success, backgroundColor: "rgba(46, 155, 98, 0.12)" },
  optionWrong: { borderColor: theme.error, backgroundColor: "rgba(214, 69, 69, 0.12)" },
  optionWord: { fontSize: 18, fontWeight: "800", color: theme.ink },
  optionReading: { marginTop: 2, color: theme.indigo },
  result: { flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 16, gap: 12 },
  resultRight: { backgroundColor: theme.success },
  resultWrong: { backgroundColor: theme.error },
  resultCopy: { flex: 1, gap: 4 },
  resultTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  resultBody: { color: "#fff", fontSize: 16 },
  nextButton: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  next: { color: "#fff", fontWeight: "800" },
});
