import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ARENA_BANK, ARENA_GROUPS } from "@/data/arenaBank";
import type { ArenaGroupId, ArenaItem } from "@/data/arenaBank";
import { CONFUSABLE_PAIRS } from "@/data/grammar";
import { attemptStats } from "@/lib/proficiency";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

type RenderedQuestion = {
  item: ArenaItem;
  shuffledChoices: string[];
};

type AnswerOutcome = "correct" | "alt" | "wrong";

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Weighted sampling by immutable item.id mastery:
 * - Unseen or low accuracy (level 0-1) -> higher weight (5-6)
 * - Familiar (level 2) -> weight 3
 * - Mastered (level 3) -> weight 1
 */
function pickWeightedQuestion(
  pool: ArenaItem[],
  arenaAttempts: Readonly<Record<string, number[]>>,
  groupChoices: string[],
  avoidId: string | null,
): RenderedQuestion | null {
  if (pool.length === 0) return null;
  const candidates = pool.length > 1 && avoidId ? pool.filter((x) => x.id !== avoidId) : pool;
  const source = candidates.length > 0 ? candidates : pool;

  const weights = source.map((item) => {
    const hist = arenaAttempts[item.id];
    if (!hist || hist.length === 0) return 5;
    const lvl = attemptStats(hist).level;
    if (lvl === 0) return 6;
    if (lvl === 1) return 5;
    if (lvl === 2) return 3;
    return 1;
  });

  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  let picked = source[source.length - 1];
  for (let i = 0; i < source.length; i += 1) {
    r -= weights[i];
    if (r <= 0) {
      picked = source[i];
      break;
    }
  }

  const rawChoices = picked.choices && picked.choices.length > 0 ? picked.choices : groupChoices;
  return {
    item: picked,
    shuffledChoices: shuffle(rawChoices),
  };
}

export function GrammarCompare() {
  const { prefs, arenaAttempts, recordArenaAttempt } = useProgress();
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [subMode, setSubMode] = useState<"arena" | "guide">("arena");
  const [groupId, setGroupId] = useState<ArenaGroupId>(ARENA_GROUPS[0].id);
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const [streak, setStreak] = useState(0);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [answeredTotal, setAnsweredTotal] = useState(0);

  const activeGroup = ARENA_GROUPS.find((g) => g.id === groupId) ?? ARENA_GROUPS[0];
  const groupPool = useMemo(
    () => ARENA_BANK.filter((item) => item.groupId === activeGroup.id),
    [activeGroup.id],
  );

  const [rendered, setRendered] = useState<RenderedQuestion | null>(() =>
    pickWeightedQuestion(groupPool, arenaAttempts, activeGroup.choices, null),
  );

  // Keep rendered question synced when switching group
  const activeQuestion = useMemo(() => {
    if (rendered && rendered.item.groupId === activeGroup.id) return rendered;
    return pickWeightedQuestion(groupPool, arenaAttempts, activeGroup.choices, null);
  }, [rendered, activeGroup, groupPool, arenaAttempts]);

  const accent = levelAccent[activeGroup.level];

  const selectGroup = (id: ArenaGroupId) => {
    const nextGroup = ARENA_GROUPS.find((g) => g.id === id) ?? ARENA_GROUPS[0];
    const nextPool = ARENA_BANK.filter((item) => item.groupId === id);
    setGroupId(id);
    setPicked(null);
    setOutcome(null);
    setRendered(pickWeightedQuestion(nextPool, arenaAttempts, nextGroup.choices, null));
  };

  const choose = (choiceText: string) => {
    if (!activeQuestion || picked !== null) return;
    const { item } = activeQuestion;
    setPicked(choiceText);
    setAnsweredTotal((n) => n + 1);

    if (choiceText === item.answer) {
      setOutcome("correct");
      setCorrectTotal((n) => n + 1);
      setStreak((n) => n + 1);
      recordArenaAttempt(item.id, true);
    } else if (item.altAnswers && item.altAnswers[choiceText]) {
      // Soft-accept near-synonym: preserve streak, leave mastery weight unchanged
      setOutcome("alt");
      setCorrectTotal((n) => n + 1);
    } else {
      setOutcome("wrong");
      setStreak(0);
      recordArenaAttempt(item.id, false);
    }
  };

  const nextQuestion = () => {
    const prevId = activeQuestion?.item.id ?? null;
    setPicked(null);
    setOutcome(null);
    setRendered(pickWeightedQuestion(groupPool, arenaAttempts, activeGroup.choices, prevId));
  };

  const item = activeQuestion?.item ?? null;
  const displaySurface = item ? (item.surface ?? item.answer) : "";

  const feedbackText = useMemo(() => {
    if (!item || !picked || !outcome) return "";
    if (outcome === "alt" && item.altAnswers?.[picked]) {
      return item.altAnswers[picked];
    }
    if (outcome === "wrong" && item.distractorNotes?.[picked]) {
      return item.distractorNotes[picked];
    }
    return item.tip;
  }, [item, picked, outcome]);

  const dockBg =
    outcome === "correct"
      ? t.successSoft
      : outcome === "alt"
        ? t.goldSoft
        : t.errorSoft;
  const dockBorder =
    outcome === "correct"
      ? t.success
      : outcome === "alt"
        ? t.gold
        : t.error;
  const dockTitleColor =
    outcome === "correct"
      ? t.matchaDark
      : outcome === "alt"
        ? t.goldDark
        : t.error;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroller} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topHead}>
            <View style={styles.topHeadLeft}>
              <Text style={styles.heading}>易混實戰擂台</Text>
              <Text style={styles.sub} numberOfLines={2}>
                本組 {groupPool.length} 題 · 連勝 {streak}（{correctTotal}/{answeredTotal}）
              </Text>
            </View>
            <View style={styles.segmented}>
              <Pressable
                onPress={() => setSubMode("arena")}
                style={[styles.segBtn, subMode === "arena" && styles.segBtnActive]}
              >
                <Text style={[styles.segText, subMode === "arena" && styles.segTextActive]}>實戰</Text>
              </Pressable>
              <Pressable
                onPress={() => setSubMode("guide")}
                style={[styles.segBtn, subMode === "guide" && styles.segBtnActive]}
              >
                <Text style={[styles.segText, subMode === "guide" && styles.segTextActive]}>速查</Text>
              </Pressable>
            </View>
          </View>

          {subMode === "arena" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRow}>
              {ARENA_GROUPS.map((g) => {
                const selected = g.id === groupId;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => selectGroup(g.id)}
                    style={[styles.groupChip, selected && styles.groupChipActive]}
                  >
                    <Text style={[styles.groupChipText, selected && styles.groupChipTextActive]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {subMode === "arena" && activeQuestion && item && (
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <Text style={[styles.levelCode, { color: accent }]}>
                {item.jlptTag ?? activeGroup.level}
              </Text>
              <Text style={styles.groupLabel} numberOfLines={1}>
                {activeGroup.label} · 選出最適合的文法
              </Text>
            </View>

            <Text style={styles.sentence}>
              {item.before}
              <Text
                style={[
                  styles.blankText,
                  {
                    color:
                      picked === null
                        ? t.vermillion
                        : outcome === "correct"
                          ? t.matchaDark
                          : outcome === "alt"
                            ? t.goldDark
                            : t.error,
                  },
                ]}
              >
                {picked === null ? " 【　　】 " : ` 【${displaySurface}】 `}
              </Text>
              {item.after}
            </Text>

            {prefs.showFurigana && item.reading ? (
              <Text style={styles.reading}>
                {picked !== null ? item.reading : "（作答後顯示假名讀音）"}
              </Text>
            ) : null}

            {item.zh ? <Text style={styles.zh}>{item.zh}</Text> : null}

            <View style={styles.choicesGrid}>
              {activeQuestion.shuffledChoices.map((opt) => {
                const isAns = opt === item.answer;
                const isAlt = Boolean(item.altAnswers?.[opt]);
                const isPick = opt === picked;
                let bg = t.surface;
                let border = t.paperBorder;
                let color = t.ink;
                if (picked !== null) {
                  if (isAns) {
                    bg = t.successSoft;
                    border = t.success;
                    color = t.matchaDark;
                  } else if (isPick && isAlt) {
                    bg = t.goldSoft;
                    border = t.gold;
                    color = t.goldDark;
                  } else if (isPick) {
                    bg = t.errorSoft;
                    border = t.error;
                    color = t.error;
                  } else {
                    bg = t.paper;
                    color = t.inkMuted;
                  }
                }
                const fullWidth = activeQuestion.shuffledChoices.some((c) => c.length >= 8);
                return (
                  <Pressable
                    key={opt}
                    disabled={picked !== null}
                    onPress={() => choose(opt)}
                    style={[
                      styles.tile,
                      fullWidth && styles.tileFull,
                      { backgroundColor: bg, borderColor: border },
                    ]}
                  >
                    <Text style={[styles.tileText, { color }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {subMode === "guide" &&
          CONFUSABLE_PAIRS.map((pair) => (
            <View key={pair.id} style={styles.card}>
              <View style={styles.badgeRow}>
                <Text style={[styles.levelCode, { color: levelAccent[pair.level] }]}>{pair.level}</Text>
                <View style={styles.headText}>
                  <Text style={styles.pairTitle}>{pair.title}</Text>
                  <Text style={styles.pairSub}>{pair.subtitle}</Text>
                </View>
              </View>
              <View style={styles.columns}>
                <View style={styles.sideBox}>
                  <Text style={[styles.sideLabel, { color: t.indigo }]}>{pair.left.label}</Text>
                  <Text style={styles.sideRule}>{pair.left.rule}</Text>
                  <Text style={styles.sideExample}>{pair.left.example}</Text>
                  <Text style={styles.sideTrans}>{pair.left.translation}</Text>
                </View>
                <View style={styles.sideBox}>
                  <Text style={[styles.sideLabel, { color: t.vermillion }]}>{pair.right.label}</Text>
                  <Text style={styles.sideRule}>{pair.right.rule}</Text>
                  <Text style={styles.sideExample}>{pair.right.example}</Text>
                  <Text style={styles.sideTrans}>{pair.right.translation}</Text>
                </View>
              </View>
            </View>
          ))}
      </ScrollView>

      {subMode === "arena" && item && picked !== null && outcome !== null && (
        <View style={[styles.feedbackDock, { backgroundColor: dockBg, borderTopColor: dockBorder }]}>
          <View style={styles.dockTop}>
            <Text style={[styles.dockTitle, { color: dockTitleColor }]}>
              {outcome === "correct"
                ? `✓ 正確 · ${item.grammarKey}`
                : outcome === "alt"
                  ? `△ 也通順（更偏向「${item.grammarKey}」）`
                  : `✕ 正解 · ${item.grammarKey}`}
              {displaySurface !== item.grammarKey ? `（${displaySurface}）` : ""}
            </Text>
            <Text style={styles.dockBody} numberOfLines={3}>
              {feedbackText}
            </Text>
          </View>
          <Pressable onPress={nextQuestion} style={[styles.dockBtn, { backgroundColor: dockBorder }]}>
            <Text style={styles.dockBtnText}>下一題 →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    scroller: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 12 },
    topCard: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      padding: 14,
      gap: 10,
      borderWidth: t.cardBorderWidth,
      borderColor: t.paperBorder,
    },
    topHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
    topHeadLeft: { flex: 1, minWidth: 0 },
    heading: { fontSize: 15, fontWeight: "700", color: t.ink },
    sub: { fontSize: 11.5, color: t.inkSoft, marginTop: 2 },
    segmented: {
      flexDirection: "row",
      backgroundColor: t.surface,
      borderRadius: t.controlRadius,
      padding: 2,
      borderWidth: 1,
      borderColor: t.paperBorder,
      flexShrink: 0,
    },
    segBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Math.max(4, t.controlRadius - 2) },
    segBtnActive: { backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink },
    segText: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    segTextActive: { color: t.preset === "ios" ? "#FFFFFF" : t.paper },
    groupRow: { gap: 6, paddingVertical: 2 },
    groupChip: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    groupChipActive: {
      backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink,
      borderColor: t.preset === "ios" ? t.accentPrimary : t.ink,
    },
    groupChipText: { fontSize: 11.5, fontWeight: "700", color: t.inkSoft },
    groupChipTextActive: { color: t.preset === "ios" ? "#FFFFFF" : t.paper },
    card: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      padding: 16,
      gap: 12,
      borderWidth: t.cardBorderWidth,
      borderColor: t.paperBorder,
    },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    levelCode: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
    groupLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: t.inkSoft },
    sentence: { fontFamily: t.serif, fontSize: 19, fontWeight: "700", color: t.ink, lineHeight: 31 },
    blankText: { fontWeight: "800" },
    reading: { fontSize: 12.5, color: t.inkSoft },
    zh: {
      fontSize: 13.5,
      color: t.inkSoft,
      lineHeight: 20,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: t.paperBorder,
    },
    choicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    tile: {
      width: "48.5%",
      borderRadius: t.controlRadius,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: "center",
    },
    tileFull: { width: "100%" },
    tileText: { fontSize: 14.5, fontWeight: "700", textAlign: "center" },
    headText: { flex: 1, minWidth: 0 },
    pairTitle: { fontFamily: t.serif, fontSize: 16, fontWeight: "700", color: t.ink },
    pairSub: { fontSize: 12, color: t.inkSoft, marginTop: 2 },
    columns: { gap: 10 },
    sideBox: {
      backgroundColor: t.surface,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
      padding: 12,
      gap: 4,
    },
    sideLabel: { fontSize: 13, fontWeight: "800" },
    sideRule: { fontSize: 12.5, color: t.ink, lineHeight: 19 },
    sideExample: { fontFamily: t.serif, fontSize: 14, fontWeight: "700", color: t.ink, marginTop: 4 },
    sideTrans: { fontSize: 12, color: t.inkSoft },
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
    dockBody: { fontSize: 11.5, color: t.inkSoft, lineHeight: 17 },
    dockBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: t.controlRadius },
    dockBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  });
}
