import { AnimatedFeedbackDock, TactilePress } from "@/components/Motion";
import { TactileChoiceButton } from "@/components/TactileChoiceButton";
import type { ChoiceVisualState } from "@/components/TactileChoiceButton";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { ProficiencyMeter } from "@/components/ProficiencyMeter";
import { RubyText } from "@/components/RubyText";
import { LEVELS, lessons, manifests } from "@/data/registry";
import type { LevelId, VocabWord } from "@/data/types";
import { isCorrectAnswer } from "@/lib/answers";
import { attemptStats, proficiencyLabel } from "@/lib/proficiency";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

type ReviewItem = {
  key: string;
  level: LevelId;
  topicId: string;
  word: VocabWord;
  proficiency: number; // 1 = 初識, 2 = 熟悉, 3 = 記住
};

type ReviewRound = {
  target: ReviewItem;
  options: VocabWord[];
};

type ReviewOutcome = {
  correct: boolean;
  before: number;
  after: number;
  recentCorrect: number;
  recentTotal: number;
};

// Lower proficiency has significantly higher chance of appearing:
// 初識 (1) -> weight 6, 熟悉 (2) -> weight 3, 記住 (3) -> weight 1
const PROFICIENCY_WEIGHT: Record<number, number> = {
  1: 6,
  2: 3,
  3: 1,
};

function hasJapaneseKana(value?: string | null): boolean {
  if (!value) return false;
  const s = value.trim();
  return /[\u3040-\u30ff]/.test(s) && !/[A-Za-z]/.test(s);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWeightedItem(items: ReviewItem[], avoidKey: string | null): ReviewItem | null {
  if (items.length === 0) return null;
  const candidates = items.length > 1 && avoidKey ? items.filter((item) => item.key !== avoidKey) : items;
  const pool = candidates.length > 0 ? candidates : items;
  const totalWeight = pool.reduce((sum, item) => sum + (PROFICIENCY_WEIGHT[item.proficiency] ?? 1), 0);
  let r = Math.random() * totalWeight;
  for (const item of pool) {
    r -= PROFICIENCY_WEIGHT[item.proficiency] ?? 1;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1] ?? null;
}

function makeRound(
  eligible: ReviewItem[],
  allWordsByLevel: Record<LevelId, VocabWord[]>,
  allWordsFlat: VocabWord[],
  avoidKey: string | null,
): ReviewRound | null {
  const target = pickWeightedItem(eligible, avoidKey);
  if (!target) return null;

  const sameLevel = allWordsByLevel[target.level] ?? [];
  const sourcePool = sameLevel.length >= 4 ? sameLevel : allWordsFlat;
  const distractors: VocabWord[] = [];
  const usedWords = new Set<string>([target.word.word]);
  for (const candidate of shuffle(sourcePool)) {
    if (usedWords.has(candidate.word)) continue;
    if (candidate.meaning === target.word.meaning) continue;
    usedWords.add(candidate.word);
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }

  return {
    target,
    options: shuffle([target.word, ...distractors]),
  };
}

export default function VocabReviewScreen() {
  const { attempts, getProficiency, recordAttempt, markLearned, prefs, setPref } = useProgress();
  const { t, levelAccent } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [inputMode, setInputMode] = useState<"tiles" | "type">("tiles");
  const [pickedWord, setPickedWord] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const { allWordsByLevel, allWordsFlat, eligible, counts } = useMemo(() => {
    const byLevel: Record<LevelId, VocabWord[]> = { N5: [], N4: [], N3: [], N2: [], N1: [] };
    const flat: VocabWord[] = [];
    const elig: ReviewItem[] = [];
    const tierCounts = { 1: 0, 2: 0, 3: 0 };

    for (const level of LEVELS) {
      for (const topic of manifests[level].topics) {
        const lesson = lessons[level][topic.id];
        if (!lesson) continue;
        lesson.words.forEach((word, index) => {
          byLevel[level].push(word);
          flat.push(word);
          const key = wordKey(level, topic.id, index);
          const stats = attemptStats(attempts[key]);
          // Strictly exclude 未記 (level 0): only include 初識 (1), 熟悉 (2), 記住 (3)
          if (stats.level >= 1) {
            elig.push({ key, level, topicId: topic.id, word, proficiency: stats.level });
            if (stats.level === 1 || stats.level === 2 || stats.level === 3) {
              tierCounts[stats.level] += 1;
            }
          }
        });
      }
    }

    return { allWordsByLevel: byLevel, allWordsFlat: flat, eligible: elig, counts: tierCounts };
  }, [attempts]);

  const [round, setRound] = useState<ReviewRound | null>(() =>
    makeRound(eligible, allWordsByLevel, allWordsFlat, null),
  );

  // If user opens before progress finishes hydrating, initialize once eligible becomes non-empty
  const activeRound = useMemo(() => {
    if (round) return round;
    if (eligible.length === 0) return null;
    return makeRound(eligible, allWordsByLevel, allWordsFlat, null);
  }, [round, eligible, allWordsByLevel, allWordsFlat]);

  const kanaOnly = prefs.kanaOnly;

  const submitChoice = (wordText: string) => {
    if (!activeRound || outcome) return;
    const correct = wordText === activeRound.target.word.word;
    const before = getProficiency(activeRound.target.key);
    const recorded = recordAttempt(activeRound.target.key, correct);
    if (correct) markLearned(activeRound.target.key);
    setPickedWord(wordText);
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

  const submitTyped = () => {
    if (!activeRound || outcome || !typed.trim()) return;
    const correct = isCorrectAnswer(activeRound.target.word, typed);
    const before = getProficiency(activeRound.target.key);
    const recorded = recordAttempt(activeRound.target.key, correct);
    if (correct) markLearned(activeRound.target.key);
    setPickedWord(typed.trim());
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

  const nextRound = () => {
    setRound(makeRound(eligible, allWordsByLevel, allWordsFlat, activeRound?.target.key ?? null));
    setPickedWord(null);
    setTyped("");
    setOutcome(null);
  };

  const targetAccent = activeRound ? levelAccent[activeRound.target.level] : t.accentPrimary;
  const displayProf = activeRound ? (outcome ? outcome.after : getProficiency(activeRound.target.key)) : 1;

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <View style={styles.navRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Text style={styles.backText}>← 返回</Text>
            </Pressable>
            <View style={styles.navRight}>
              <Pressable
                onPress={() => setPref("kanaOnly", !kanaOnly)}
                style={[styles.miniBtn, kanaOnly && styles.miniBtnOn]}
              >
                <Text style={[styles.miniBtnText, kanaOnly && styles.miniBtnTextOn]}>
                  只看假名 {kanaOnly ? "開" : "關"}
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>已學單字總複習</Text>
            <Text style={styles.scoreMeta}>
              連對 {streak} · {correctCount}/{totalCount}
            </Text>
          </View>
          <Text style={styles.tierSummary}>
            題庫 {eligible.length} 詞（初識 {counts[1]} · 熟悉 {counts[2]} · 記住 {counts[3]}）· 熟練度越低出題機率越高
          </Text>
        </View>

        {!activeRound ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>尚無可複習的已學單字</Text>
              <Text style={styles.emptyBody}>
                先到單字課程練習並將單字提升至「初識」以上（非未記狀態），即可在此進行加權總複習測驗。
              </Text>
              <Pressable onPress={() => router.back()} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>前往單字課程 →</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modeRow}>
                <Text style={styles.modeLabel}>測驗方式</Text>
                <View style={styles.segmented}>
                  <Pressable
                    onPress={() => setInputMode("tiles")}
                    style={[styles.segBtn, inputMode === "tiles" && styles.segBtnActive]}
                  >
                    <Text style={[styles.segText, inputMode === "tiles" && styles.segTextActive]}>選詞</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setInputMode("type")}
                    style={[styles.segBtn, inputMode === "type" && styles.segBtnActive]}
                  >
                    <Text style={[styles.segText, inputMode === "type" && styles.segTextActive]}>手打</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.drillCard}>
                <View style={styles.metaRow}>
                  <Text style={[styles.levelTag, { color: targetAccent }]}>
                    {activeRound.target.level} · {activeRound.target.topicId}
                  </Text>
                  {activeRound.target.word.verbType ? (
                    <Text style={styles.verbTag}>{activeRound.target.word.verbType}</Text>
                  ) : null}
                </View>

                <Text style={styles.meaning}>{activeRound.target.word.meaning}</Text>
                <ProficiencyMeter value={displayProf} />

                {inputMode === "tiles" ? (
                  <View style={styles.options}>
                    {activeRound.options.map((opt) => {
                      const revealed = outcome !== null;
                      const isAns = opt.word === activeRound.target.word.word;
                      const isPick = opt.word === pickedWord;

                      let wordColor = t.ink;
                      let choiceState: ChoiceVisualState = "idle";

                      if (revealed) {
                        if (isAns) {
                          wordColor = t.matchaDark;
                          choiceState = "correct";
                        } else if (isPick) {
                          wordColor = t.error;
                          choiceState = "wrong";
                        } else {
                          wordColor = t.inkMuted;
                          choiceState = "muted";
                        }
                      }

                      return (
                        <TactileChoiceButton
                          key={opt.word}
                          fullWidth
                          disabled={revealed}
                          state={choiceState}
                          onPress={() => submitChoice(opt.word)}
                        >
                          {kanaOnly ? (
                            <Text style={[styles.optionWord, { color: wordColor, textAlign: "center" }]}>
                              {hasJapaneseKana(opt.reading) ? opt.reading : opt.word}
                            </Text>
                          ) : (
                            <RubyText
                              jp={opt.word}
                              reading={opt.reading}
                              showRuby={hasJapaneseKana(opt.reading) && opt.reading !== opt.word}
                              fontSize={18}
                              rtFontSize={10}
                              color={wordColor}
                              align="center"
                            />
                          )}
                        </TactileChoiceButton>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <TextInput
                      value={typed}
                      onChangeText={setTyped}
                      placeholder="輸入漢字或平假名..."
                      placeholderTextColor={t.inkMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!outcome}
                      onSubmitEditing={submitTyped}
                      style={styles.input}
                    />
                    <Pressable
                      onPress={submitTyped}
                      disabled={Boolean(outcome) || !typed.trim()}
                      style={[styles.submitBtn, !(typed.trim() && !outcome) && styles.submitBtnDisabled]}
                    >
                      <Text style={[styles.submitText, !(typed.trim() && !outcome) && styles.submitTextDisabled]}>
                        送出答案
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </ScrollView>

            {outcome ? (
              <View
                style={[
                  styles.feedbackDock,
                  {
                    backgroundColor: outcome.correct ? t.successSoft : t.errorSoft,
                    borderTopColor: outcome.correct ? t.success : t.error,
                    paddingBottom: Math.max(insets.bottom, 12) + 8,
                  },
                ]}
              >
                <View style={styles.dockTop}>
                  <Text style={[styles.dockTitle, { color: outcome.correct ? t.matchaDark : t.error }]}>
                    {outcome.correct ? "✓ 正確" : "✕ 正解"} · {activeRound.target.word.word}
                    {hasJapaneseKana(activeRound.target.word.reading) &&
                    activeRound.target.word.reading !== activeRound.target.word.word
                      ? `（${activeRound.target.word.reading}）`
                      : ""}
                  </Text>
                  <Text style={styles.dockBody} numberOfLines={2}>
                    熟練度 {proficiencyLabel(outcome.before)} → {proficiencyLabel(outcome.after)} · 最近{" "}
                    {outcome.recentCorrect}/{outcome.recentTotal} 正確
                  </Text>
                </View>
                <Pressable
                  onPress={nextRound}
                  style={[styles.dockBtn, { backgroundColor: outcome.correct ? t.success : t.error }]}
                >
                  <Text style={styles.dockBtnText}>下一題 →</Text>
                </Pressable>
              </View>
            ) : null}
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.paper },
    safe: { flex: 1 },
    flex: { flex: 1 },
    top: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: t.paperBorder,
    },
    navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    navRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    backBtn: {
      backgroundColor: t.white,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    backText: { color: t.ink, fontSize: 12.5, fontWeight: "700" },
    miniBtn: {
      backgroundColor: t.white,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    miniBtnOn: {
      backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink,
      borderColor: t.preset === "ios" ? t.accentPrimary : t.ink,
    },
    miniBtnText: { color: t.inkSoft, fontSize: 11.5, fontWeight: "700" },
    miniBtnTextOn: { color: t.preset === "ios" ? "#FFFFFF" : t.paper },
    titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
    title: { fontFamily: t.serif, fontSize: 22, fontWeight: "700", color: t.ink },
    scoreMeta: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    tierSummary: { fontSize: 11.5, color: t.inkSoft, lineHeight: 17 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 12 },
    modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    modeLabel: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    segmented: {
      flexDirection: "row",
      backgroundColor: t.surface,
      borderRadius: t.controlRadius,
      padding: 2,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    segBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Math.max(4, t.controlRadius - 2) },
    segBtnActive: { backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink },
    segText: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    segTextActive: { color: t.preset === "ios" ? "#FFFFFF" : t.paper },
    drillCard: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      borderWidth: t.cardBorderWidth,
      borderColor: t.paperBorder,
      padding: 18,
      gap: 12,
      alignItems: "center",
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
    options: { width: "100%", gap: 8, marginTop: 4 },
    option: {
      borderRadius: t.controlRadius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
    },
    optionWord: { fontFamily: t.serif, fontSize: 18, fontWeight: "700" },
    optionReading: { marginTop: 2, fontSize: 12.5, fontWeight: "600" },
    inputGroup: { width: "100%", gap: 10, marginTop: 6 },
    input: {
      backgroundColor: t.surface,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 17,
      fontWeight: "600",
      color: t.ink,
      textAlign: "center",
    },
    submitBtn: {
      backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink,
      borderRadius: t.controlRadius,
      alignItems: "center",
      paddingVertical: 13,
    },
    submitBtnDisabled: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.paperBorder },
    submitText: { color: t.preset === "ios" ? "#FFFFFF" : t.paper, fontWeight: "700", fontSize: 14 },
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
    dockBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: t.controlRadius },
    dockBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    emptyWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 18 },
    emptyCard: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      borderWidth: t.cardBorderWidth,
      borderColor: t.paperBorder,
      padding: 24,
      alignItems: "center",
      gap: 10,
    },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: t.ink },
    emptyBody: { fontSize: 13, color: t.inkSoft, textAlign: "center", lineHeight: 21 },
    emptyBtn: {
      marginTop: 6,
      backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: t.controlRadius,
    },
    emptyBtnText: { color: t.preset === "ios" ? "#FFFFFF" : t.paper, fontSize: 13, fontWeight: "700" },
  });
}
