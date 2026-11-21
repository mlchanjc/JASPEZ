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
  isGhost: boolean;
};

type Props = {
  levelFilter: LevelId | "ALL";
};

function buildInitialQueue(items: GrammarPoint[], ghostIds: readonly string[]): QueueEntry[] {
  const allowed = new Set(items.map((item) => item.id));
  const ghosts = ghostIds.filter((id) => allowed.has(id)).map((id) => ({ id, isGhost: true }));
  const ghostSet = new Set(ghosts.map((g) => g.id));
  const regular = items.filter((item) => !ghostSet.has(item.id)).map((item) => ({ id: item.id, isGhost: false }));
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

  if (pool.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>{levelFilter} 文法還在準備</Text>
        <Text style={styles.emptyBody}>目前收錄 N5、N4、N3 核心文法，可切換級別或選擇「全部」開始練習。</Text>
      </View>
    );
  }

  if (!currentCard || !currentEntry) {
    const accuracy = sessionDone > 0 ? Math.round((sessionCorrect / sessionDone) * 100) : 100;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.doneCard}>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>印</Text>
          </View>
          <Text style={styles.doneTitle}>這組文法練完了</Text>
          <Text style={styles.doneMeta}>
            本次完成 {sessionDone} 題 · 正確率 {accuracy}%
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
            <Text style={styles.primaryBtnText}>再練一輪</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const variant = currentCard[prefs.register];
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
      const insertAt = Math.min(2, rest.length);
      const nextQueue = [...rest];
      nextQueue.splice(insertAt, 0, { id: head.id, isGhost: true });
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
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Progress bar card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHead}>
          <Text style={styles.progressLabel}>
            待練 {queue.length} 題{currentEntry.isGhost ? " · 錯題回顧中" : ""}
          </Text>
          <Text style={styles.progressPct}>
            {sessionDone > 0 ? `正確率 ${Math.round((sessionCorrect / sessionDone) * 100)}%` : `${currentCard.level}`}
          </Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar percent={progressPct} color={accent} height={8} />
        </View>
      </View>

      {/* Main Quiz Card */}
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
              <Text style={styles.ghostBadgeText}>錯題再練</Text>
            </View>
          )}
        </View>

        <Text style={styles.tapTip}>點擊虛線底線的單字可查看意思</Text>

        <FuriganaSentence
          key={`${currentCard.id}-${prefs.register}`}
          tokens={variant.tokens}
          showFurigana={prefs.showFurigana}
          blankText={answered ? picked : undefined}
          blankStatus={answered ? (isCorrect ? "correct" : "wrong") : "idle"}
          accentColor={accent}
        />

        <Text style={styles.translation}>{variant.translation}</Text>

        {/* Input Mode Switcher */}
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>作答方式</Text>
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
            {variant.choices.map((choice) => {
              const isAnswer = choice === variant.answer;
              const isPicked = choice === picked;
              let tileBg = theme.surface;
              let tileBorder = theme.paperBorder;
              let textColor = theme.ink;
              if (answered) {
                if (isAnswer) {
                  tileBg = theme.successSoft;
                  tileBorder = theme.success;
                  textColor = theme.success;
                } else if (isPicked) {
                  tileBg = theme.errorSoft;
                  tileBorder = theme.error;
                  textColor = theme.error;
                } else {
                  textColor = theme.inkMuted;
                }
              }
              return (
                <Pressable
                  key={choice}
                  disabled={answered}
                  onPress={() => submitAnswer(choice)}
                  style={[styles.tile, { backgroundColor: tileBg, borderColor: tileBorder }]}
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
              placeholder={`輸入日文（例如：${variant.answer.slice(0, 2)}…）`}
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
              <Text style={[styles.feedbackTitle, { color: isCorrect ? theme.success : theme.error }]}>
                {isCorrect ? `答對了 · ${currentCard.pattern}` : `正解：${variant.answer}`}
              </Text>
              <View style={styles.formulaChip}>
                <Text style={styles.formulaChipText}>{currentCard.formation}</Text>
              </View>
            </View>
            <Text style={styles.feedbackBody}>{hintText}</Text>

            <View style={styles.actionRow}>
              <Pressable onPress={() => advance("again")} style={styles.againBtn}>
                <Text style={styles.againBtnText}>再練一次</Text>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  progressCard: {
    backgroundColor: theme.white,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontSize: 13, fontWeight: "700", color: theme.inkSoft },
  progressPct: { fontSize: 13, fontWeight: "800", color: theme.indigo },
  barWrap: { flex: 1, minWidth: 0 },
  card: {
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    shadowColor: "#1E2430",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelBadgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  tagBadgeText: { fontSize: 12, fontWeight: "700", color: theme.inkSoft },
  ghostBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: theme.goldSoft,
  },
  ghostBadgeText: { fontSize: 12, fontWeight: "800", color: "#8A6520" },
  tapTip: { fontSize: 11, color: theme.inkMuted, fontWeight: "600", marginBottom: -4 },
  translation: { fontSize: 15, color: theme.inkSoft, lineHeight: 22, fontWeight: "600" },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(30, 36, 48, 0.08)",
  },
  modeLabel: { fontSize: 12, fontWeight: "700", color: theme.inkSoft },
  segmented: {
    flexDirection: "row",
    backgroundColor: theme.paper,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  segBtnActive: { backgroundColor: theme.white },
  segText: { fontSize: 12, fontWeight: "700", color: theme.inkSoft },
  segTextActive: { color: theme.ink },
  tilesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
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
    paddingVertical: 11,
    fontSize: 15,
    color: theme.ink,
    fontWeight: "600",
  },
  submitBtn: {
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  feedback: {
    borderRadius: 16,
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
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    alignItems: "center",
  },
  againBtnText: { fontSize: 13, fontWeight: "800", color: theme.inkSoft },
  nextBtn: {
    flex: 1.4,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  nextBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  emptyCard: {
    margin: 20,
    padding: 24,
    borderRadius: 24,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    gap: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: theme.ink },
  emptyBody: { fontSize: 14, color: theme.inkSoft, lineHeight: 21 },
  doneCard: {
    backgroundColor: theme.white,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  stamp: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: theme.vermillion,
    backgroundColor: theme.vermillionSoft,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-10deg" }],
  },
  stampText: { fontSize: 30, fontWeight: "900", color: theme.vermillion },
  doneTitle: { fontSize: 22, fontWeight: "900", color: theme.ink },
  doneMeta: { fontSize: 14, color: theme.inkSoft, fontWeight: "700" },
  primaryBtn: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: theme.vermillion,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
