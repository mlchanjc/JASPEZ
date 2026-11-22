import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { proficiencyLabel } from "@/lib/proficiency";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";
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

function hasJapaneseKana(value?: string | null): boolean {
  if (!value) return false;
  const s = value.trim();
  return /[\u3040-\u30ff]/.test(s) && !/[A-Za-z]/.test(s);
}

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
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Text style={styles.heading}>單字選詞</Text>
            <Text style={styles.sub}>
              連對 {streak} · 正確 {correctCount}/{totalCount}
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

        <View style={styles.drillCard}>
          <View style={styles.metaRow}>
            <Text style={[styles.levelTag, { color: accent }]}>{level}</Text>
            {round.prompt.word.verbType ? <Text style={styles.verbTag}>{round.prompt.word.verbType}</Text> : null}
          </View>

          <Text style={styles.meaning}>{round.prompt.word.meaning}</Text>
          <ProficiencyMeter value={proficiency} />

          <View style={styles.options}>
            {round.options.map((option) => {
              const selected = picked === option.index;
              const revealed = outcome != null;
              const isAnswer = option.index === round.prompt.index;

              let bg = t.surface;
              let border = t.paperBorder;
              let wordColor = t.ink;
              let rtColor = t.indigo;

              if (revealed) {
                if (isAnswer) {
                  bg = t.successSoft;
                  border = t.success;
                  wordColor = t.matchaDark;
                  rtColor = t.matchaDark;
                } else if (selected) {
                  bg = t.errorSoft;
                  border = t.error;
                  wordColor = t.error;
                  rtColor = t.error;
                } else {
                  bg = t.paper;
                  wordColor = t.inkMuted;
                  rtColor = t.inkMuted;
                }
              }

              return (
                <Pressable
                  key={option.index}
                  disabled={revealed}
                  onPress={() => choose(option.index)}
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                >
                  {kanaOnly ? (
                    <Text style={[styles.optionWord, { color: wordColor }]}>
                      {hasJapaneseKana(option.word.reading) ? option.word.reading : option.word.word}
                    </Text>
                  ) : (
                    <>
                      <Text style={[styles.optionWord, { color: wordColor }]}>{option.word.word}</Text>
                      {hasJapaneseKana(option.word.reading) && option.word.reading !== option.word.word ? (
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

      {outcome ? (
        <View
          style={[
            styles.feedbackDock,
            {
              backgroundColor: outcome.correct ? t.successSoft : t.errorSoft,
              borderTopColor: outcome.correct ? t.success : t.error,
            },
          ]}
        >
          <View style={styles.dockTop}>
            <Text style={[styles.dockTitle, { color: outcome.correct ? t.matchaDark : t.error }]}>
              {outcome.correct
                ? `✓ 正確 · ${round.prompt.word.word}${hasJapaneseKana(round.prompt.word.reading) && round.prompt.word.reading !== round.prompt.word.word ? `（${round.prompt.word.reading}）` : ""}`
                : `✕ 正解 · ${round.prompt.word.word}${hasJapaneseKana(round.prompt.word.reading) && round.prompt.word.reading !== round.prompt.word.word ? `（${round.prompt.word.reading}）` : ""}`}
            </Text>
            <Text style={styles.dockBody} numberOfLines={2}>
              熟練度 {proficiencyLabel(outcome.before)} → {proficiencyLabel(outcome.after)} · 最近{" "}
              {outcome.recentCorrect}/{outcome.recentTotal} 正確
            </Text>
          </View>
          <Pressable
            onPress={next}
            style={[styles.dockBtn, { backgroundColor: outcome.correct ? t.success : t.error }]}
          >
            <Text style={styles.dockBtnText}>下一題 →</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    fill: { flex: 1 },
    content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 12 },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.paperBorder,
    },
    topLeft: { flex: 1, minWidth: 0 },
    heading: { fontSize: 15, fontWeight: "700", color: t.ink },
    sub: { fontSize: 12, color: t.inkSoft, marginTop: 2, fontWeight: "600" },
    miniToggle: {
      backgroundColor: t.white,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    miniToggleOn: { backgroundColor: t.ink, borderColor: t.ink },
    miniToggleText: { color: t.inkSoft, fontSize: 11.5, fontWeight: "700" },
    miniToggleTextOn: { color: t.paper },
    drillCard: {
      backgroundColor: t.white,
      borderRadius: 10,
      padding: 18,
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
    meaning: { fontSize: 26, fontWeight: "700", color: t.ink, textAlign: "center", lineHeight: 34 },
    options: { width: "100%", gap: 8, marginTop: 6 },
    option: {
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
    },
    optionWord: { fontFamily: t.serif, fontSize: 18, fontWeight: "700" },
    optionReading: { marginTop: 2, fontSize: 12.5, fontWeight: "600" },
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
  });
}
