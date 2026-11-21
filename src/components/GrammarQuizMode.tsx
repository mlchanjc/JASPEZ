import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FuriganaSentence } from "@/components/FuriganaSentence";
import { ProgressBar } from "@/components/ProgressBar";
import { GRAMMAR_POINTS } from "@/data/grammar";
import type { GrammarPoint, LevelId } from "@/data/types";
import { grammarByLevel, isCorrectGrammarAnswer } from "@/lib/grammar";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

type QueueEntry = {
  id: string;
  exampleIdx: number;
  isGhost: boolean;
};

type Props = {
  levelFilter: LevelId | "ALL";
};

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildInitialQueue(items: GrammarPoint[], ghostIds: readonly string[]): QueueEntry[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ghosts = ghostIds
    .filter((id) => byId.has(id))
    .map((id) => {
      const point = byId.get(id)!;
      return { id, exampleIdx: Math.floor(Math.random() * point.examples.length), isGhost: true };
    });
  const ghostSet = new Set(ghosts.map((g) => g.id));
  const regular = shuffle(items.filter((item) => !ghostSet.has(item.id))).map((item) => ({
    id: item.id,
    exampleIdx: Math.floor(Math.random() * item.examples.length),
    isGhost: false,
  }));
  return [...ghosts, ...regular];
}

export function GrammarQuizMode({ levelFilter }: Props) {
  const {
    prefs,
    ghostGrammar,
    markGrammarLearned,
    recordGrammarAttempt,
    addGhostGrammar,
    clearGhostGrammar,
  } = useProgress();

  const pool = useMemo(() => grammarByLevel(levelFilter), [levelFilter]);
  const [queue, setQueue] = useState<QueueEntry[]>(() => buildInitialQueue(pool, ghostGrammar));
  const [inputMode, setInputMode] = useState<"tiles" | "type">("tiles");
  const [typed, setTyped] = useState("");
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  useEffect(() => {
    setQueue(buildInitialQueue(pool, ghostGrammar));
    setAnswered(false);
    setPicked("");
    setTyped("");
    setSessionDone(0);
    setSessionCorrect(0);
  }, [levelFilter, pool.length]);

  const currentEntry = queue[0];
  const currentCard = useMemo(
    () => (currentEntry ? GRAMMAR_POINTS.find((item) => item.id === currentEntry.id) ?? null : null),
    [currentEntry],
  );

  const currentExample = useMemo(() => {
    if (!currentCard || !currentEntry) return null;
    return currentCard.examples[currentEntry.exampleIdx % currentCard.examples.length];
  }, [currentCard, currentEntry]);

  const variant = currentExample ? currentExample[prefs.register] : null;

  const shuffledChoices = useMemo(() => {
    if (!variant) return [];
    return shuffle(variant.choices);
  }, [currentExample?.id, prefs.register, sessionDone]);

  if (pool.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>🚧</Text>
        <Text style={styles.emptyTitle}>{levelFilter} 文法準備中</Text>
        <Text style={styles.emptyBody}>目前開放 N5、N4、N3 多情境題庫，可切換級別或選擇「全部」開始練習。</Text>
      </View>
    );
  }

  if (!currentCard || !currentEntry || !currentExample || !variant) {
    const accuracy = sessionDone > 0 ? Math.round((sessionCorrect / sessionDone) * 100) : 100;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.doneCard}>
          <View style={styles.doneBadge}>
            <Text style={styles.doneEmoji}>🎉</Text>
          </View>
          <Text style={styles.doneTitle}>本輪文法通關！</Text>
          <Text style={styles.doneMeta}>
            完成 {sessionDone} 題 · 正確率 {accuracy}%
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              setQueue(buildInitialQueue(pool, ghostGrammar));
              setSessionDone(0);
              setSessionCorrect(0);
              setAnswered(false);
              setPicked("");
              setTyped("");
            }}
          >
            <Text style={styles.primaryBtnText}>換新例句再練一輪</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const accent = levelAccent[currentCard.level];
  const totalSpan = Math.max(1, sessionDone + queue.length);
  const progressPct = sessionDone / totalSpan;

  const submitAnswer = (raw: string) => {
    if (answered) return;
    const cleaned = raw.trim();
    if (!cleaned) return;

    const ok = isCorrectGrammarAnswer(variant, cleaned);
    setAnswered(true);
    setPicked(cleaned);
    setIsCorrect(ok);
    setSessionDone((n) => n + 1);
    if (ok) {
      setSessionCorrect((n) => n + 1);
      markGrammarLearned(currentCard.id);
    } else {
      addGhostGrammar(currentCard.id);
    }
    recordGrammarAttempt(currentCard.id, ok);
  };

  const advance = (mode: "again" | "next") => {
    const [head, ...rest] = queue;
    if (!head) return;
    if (mode === "again") {
      addGhostGrammar(head.id);
      // Rotate to a DIFFERENT example sentence so Ghost Review never feels repetitive
      const nextExampleIdx = (head.exampleIdx + 1) % currentCard.examples.length;
      const insertAt = Math.min(2, rest.length);
      const nextQueue = [...rest];
      nextQueue.splice(insertAt, 0, { id: head.id, exampleIdx: nextExampleIdx, isGhost: true });
      setQueue(nextQueue);
    } else {
      if (isCorrect) clearGhostGrammar(head.id);
      setQueue(rest);
    }
    setAnswered(false);
    setPicked("");
    setTyped("");
  };

  const hintText =
    !isCorrect && variant.wrongHints[picked] ? variant.wrongHints[picked] : currentCard.nuance;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Compact Session Progress */}
      <View style={styles.progressRow}>
        <View style={styles.barWrap}>
          <ProgressBar percent={progressPct} color={accent} height={10} />
        </View>
        <Text style={styles.progressCount}>
          {sessionDone}/{totalSpan}
        </Text>
      </View>

      {/* Main Playful Quiz Card */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={[styles.levelBadge, { backgroundColor: accent }]}>
            <Text style={styles.levelBadgeText}>{currentCard.level}</Text>
          </View>
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>{currentCard.tag}</Text>
          </View>
          {currentEntry.isGhost && (
            <View style={styles.ghostBadge}>
              <Text style={styles.ghostBadgeText}>錯題新例句</Text>
            </View>
          )}
          <Text style={styles.scenarioCount}>
            情境 {(currentEntry.exampleIdx % currentCard.examples.length) + 1}/{currentCard.examples.length}
          </Text>
        </View>

        <FuriganaSentence
          key={`${currentExample.id}-${prefs.register}`}
          tokens={variant.tokens}
          showFurigana={prefs.showFurigana}
          blankText={answered ? picked : undefined}
          blankStatus={answered ? (isCorrect ? "correct" : "wrong") : "idle"}
          accentColor={accent}
        />

        <Text style={styles.translation}>{variant.translation}</Text>

        {/* Input Mode Switcher */}
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>作答模式</Text>
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

        {inputMode === "tiles" ? (
          <View style={styles.tilesGrid}>
            {shuffledChoices.map((choice) => {
              const isAnswer = choice === variant.answer;
              const isPicked = choice === picked;
              let tileBg = theme.white;
              let tileBorder = theme.paperBorder;
              let tileBottom = "#CBD5E1";
              let textColor = theme.ink;
              if (answered) {
                if (isAnswer) {
                  tileBg = theme.successSoft;
                  tileBorder = theme.success;
                  tileBottom = theme.matchaDark;
                  textColor = theme.matchaDark;
                } else if (isPicked) {
                  tileBg = theme.errorSoft;
                  tileBorder = theme.error;
                  tileBottom = theme.error;
                  textColor = theme.error;
                } else {
                  tileBg = theme.surface;
                  textColor = theme.inkMuted;
                }
              }
              return (
                <Pressable
                  key={choice}
                  disabled={answered}
                  onPress={() => submitAnswer(choice)}
                  style={[
                    styles.tile,
                    { backgroundColor: tileBg, borderColor: tileBorder, borderBottomColor: tileBottom },
                  ]}
                >
                  <Text style={[styles.tileText, { color: textColor }]}>{choice}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.typeRow}>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              editable={!answered}
              placeholder="輸入日文填空…"
              placeholderTextColor={theme.inkMuted}
              onSubmitEditing={() => submitAnswer(typed)}
              style={styles.textInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              disabled={answered}
              onPress={() => submitAnswer(typed)}
              style={[styles.submitBtn, { backgroundColor: answered ? theme.inkMuted : theme.indigo }]}
            >
              <Text style={styles.submitBtnText}>送出</Text>
            </Pressable>
          </View>
        )}

        {answered && (
          <View
            style={[
              styles.feedback,
              {
                backgroundColor: isCorrect ? theme.successSoft : theme.errorSoft,
                borderColor: isCorrect ? theme.success : theme.error,
              },
            ]}
          >
            <View style={styles.feedbackHead}>
              <Text style={[styles.feedbackTitle, { color: isCorrect ? theme.matchaDark : theme.error }]}>
                {isCorrect ? `太棒了！${currentCard.pattern}` : `正解：${variant.answer}`}
              </Text>
              <View style={styles.formulaChip}>
                <Text style={styles.formulaChipText}>{currentCard.formation}</Text>
              </View>
            </View>
            <Text style={styles.feedbackBody}>{hintText}</Text>

            <View style={styles.actionRow}>
              <Pressable onPress={() => advance("again")} style={styles.againBtn}>
                <Text style={styles.againBtnText}>換例句再練</Text>
              </Pressable>
              <Pressable onPress={() => advance("next")} style={[styles.nextBtn, { backgroundColor: accent }]}>
                <Text style={styles.nextBtnText}>下一題 →</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barWrap: { flex: 1, minWidth: 0 },
  progressCount: { fontSize: 13, fontWeight: "900", color: theme.inkSoft },
  card: {
    backgroundColor: theme.white,
    borderRadius: 26,
    padding: 20,
    gap: 15,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelBadgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: theme.indigoSoft,
  },
  tagBadgeText: { fontSize: 12, fontWeight: "800", color: theme.indigo },
  ghostBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: theme.goldSoft,
  },
  ghostBadgeText: { fontSize: 12, fontWeight: "800", color: theme.goldDark },
  scenarioCount: { marginLeft: "auto", fontSize: 11, fontWeight: "800", color: theme.inkMuted },
  translation: { fontSize: 15, color: theme.inkSoft, lineHeight: 22, fontWeight: "600" },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.paperBorder,
  },
  modeLabel: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  segmented: {
    flexDirection: "row",
    backgroundColor: theme.paper,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segBtn: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 9 },
  segBtnActive: { backgroundColor: theme.white },
  segText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  segTextActive: { color: theme.indigo },
  tilesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  typeRow: { flexDirection: "row", gap: 8 },
  textInput: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.ink,
    fontWeight: "600",
  },
  submitBtn: {
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  feedback: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  feedbackHead: { gap: 6 },
  feedbackTitle: { fontSize: 15, fontWeight: "900" },
  formulaChip: {
    alignSelf: "flex-start",
    backgroundColor: theme.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  formulaChipText: { fontSize: 12, fontWeight: "800", color: theme.indigo },
  feedbackBody: { fontSize: 13, color: theme.ink, lineHeight: 20, fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: 10, paddingTop: 4 },
  againBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    alignItems: "center",
  },
  againBtnText: { fontSize: 13, fontWeight: "800", color: theme.inkSoft },
  nextBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  nextBtnText: { fontSize: 14, fontWeight: "900", color: "#fff" },
  emptyCard: {
    margin: 20,
    padding: 26,
    borderRadius: 26,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: theme.ink },
  emptyBody: { fontSize: 14, color: theme.inkSoft, lineHeight: 21, textAlign: "center" },
  doneCard: {
    backgroundColor: theme.white,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  doneBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.matchaSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  doneEmoji: { fontSize: 34 },
  doneTitle: { fontSize: 22, fontWeight: "900", color: theme.ink },
  doneMeta: { fontSize: 14, color: theme.inkSoft, fontWeight: "700" },
  primaryBtn: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: theme.indigo,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
