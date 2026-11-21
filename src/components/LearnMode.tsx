import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { proficiencyLabel } from "@/lib/proficiency";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";
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
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const kanaOnly = prefs.kanaOnly;
  const setKanaOnly = (updater: boolean | ((v: boolean) => boolean)) =>
    setPref("kanaOnly", typeof updater === "function" ? updater(prefs.kanaOnly) : updater);

  const key = wordKey(level, topicId, round.prompt.index);
  const proficiency = outcome ? outcome.after : getProficiency(key);
  const accent = levelAccent[level];

  const choose = (index: number) => {
    if (outcome) return;
    const correct = index === round.prompt.index;
    const before = getProficiency(key);
    const recorded = recordAttempt(key, correct);
    setPicked(index);
    setTotalCount((n) => n + 1);
    if (correct) {
      setCorrectCount((n) => n + 1);
      setStreak((n) => n + 1);
    } else {
      setStreak(0);
    }
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
    <View style={styles.container}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View style={styles.topLeft}>
              <Text style={styles.heading}>單字選詞特訓</Text>
              <Text style={styles.sub}>
                連對 🔥{streak} · 正確 {correctCount}/{totalCount}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: kanaOnly }}
              onPress={() => setKanaOnly((value) => !value)}
              style={[styles.miniToggle, kanaOnly && styles.miniToggleOn]}
            >
              <Text style={[styles.miniToggleText, kanaOnly && styles.miniToggleTextOn]}>
                只看假名 {kanaOnly ? "開" : "關"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.drillCard}>
          <View style={styles.badges}>
            <View style={[styles.levelBadge, { backgroundColor: accent }]}>
              <Text style={styles.levelBadgeText}>{level}</Text>
            </View>
            {round.prompt.word.verbType ? (
              <View style={styles.groupBadge}>
                <Text style={styles.groupText}>{round.prompt.word.verbType}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.promptBanner}>選出對應的日文單字</Text>
          <Text style={styles.meaning}>{round.prompt.word.meaning}</Text>
          <ProficiencyMeter value={proficiency} />

          <View style={styles.options}>
            {round.options.map((option) => {
              const selected = picked === option.index;
              const revealed = outcome != null;
              const isAnswer = option.index === round.prompt.index;

              let bg = theme.white;
              let border = theme.paperBorder;
              let bottom = "#CBD5E1";
              let wordColor = theme.ink;
              let rtColor = theme.indigo;

              if (revealed) {
                if (isAnswer) {
                  bg = theme.successSoft;
                  border = theme.success;
                  bottom = theme.matchaDark;
                  wordColor = theme.matchaDark;
                  rtColor = theme.matchaDark;
                } else if (selected) {
                  bg = theme.errorSoft;
                  border = theme.error;
                  bottom = theme.error;
                  wordColor = theme.error;
                  rtColor = theme.error;
                } else {
                  bg = theme.surface;
                  wordColor = theme.inkMuted;
                  rtColor = theme.inkMuted;
                }
              }

              return (
                <Pressable
                  key={option.index}
                  disabled={revealed}
                  onPress={() => choose(option.index)}
                  style={[styles.option, { backgroundColor: bg, borderColor: border, borderBottomColor: bottom }]}
                >
                  {kanaOnly ? (
                    <Text style={[styles.optionWord, { color: wordColor }]}>{option.word.reading || option.word.word}</Text>
                  ) : (
                    <>
                      <Text style={[styles.optionWord, { color: wordColor }]}>{option.word.word}</Text>
                      {option.word.reading ? (
                        <Text style={[styles.optionReading, { color: rtColor }]}>{option.word.reading}</Text>
                      ) : null}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* PINNED ZERO-SCROLL FEEDBACK BAR */}
      {outcome ? (
        <View
          style={[
            styles.feedbackDock,
            {
              backgroundColor: outcome.correct ? "#ECFDF5" : "#FFF1F2",
              borderTopColor: outcome.correct ? theme.success : theme.error,
            },
          ]}
        >
          <View style={styles.dockTop}>
            <Text style={[styles.dockTitle, { color: outcome.correct ? theme.matchaDark : theme.error }]}>
              {outcome.correct
                ? `✓ 答對了！${round.prompt.word.word}${round.prompt.word.reading ? `（${round.prompt.word.reading}）` : ""}`
                : `✕ 正解：${round.prompt.word.word}${round.prompt.word.reading ? `（${round.prompt.word.reading}）` : ""}`}
            </Text>
            <Text style={styles.dockBody} numberOfLines={2}>
              熟練度 {proficiencyLabel(outcome.before)} → {proficiencyLabel(outcome.after)} · 最近{" "}
              {outcome.recentCorrect}/{outcome.recentTotal} 正確
            </Text>
          </View>
          <Pressable
            onPress={next}
            style={[styles.dockBtn, { backgroundColor: outcome.correct ? theme.success : theme.error }]}
          >
            <Text style={styles.dockBtnText}>下一題 →</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 24, gap: 12 },
  topCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  topLeft: { flex: 1, minWidth: 0 },
  heading: { fontSize: 16, fontWeight: "900", color: theme.ink },
  sub: { fontSize: 12, color: theme.inkSoft, marginTop: 2, fontWeight: "700" },
  miniToggle: {
    backgroundColor: theme.surface,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  miniToggleOn: { backgroundColor: theme.indigo, borderColor: theme.indigo },
  miniToggleText: { color: theme.inkSoft, fontSize: 11, fontWeight: "800" },
  miniToggleTextOn: { color: "#fff" },
  drillCard: {
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 18,
    gap: 12,
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
  options: { width: "100%", gap: 9, marginTop: 4 },
  option: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderBottomWidth: 3.5,
  },
  optionWord: { fontSize: 18, fontWeight: "900" },
  optionReading: { marginTop: 2, fontSize: 13, fontWeight: "700" },
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
});
