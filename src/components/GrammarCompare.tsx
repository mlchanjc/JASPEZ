import { AnimatedFeedbackDock, QuestionTransition, TactilePress } from "@/components/Motion";
import { TactileChoiceButton } from "@/components/TactileChoiceButton";
import type { ChoiceVisualState } from "@/components/TactileChoiceButton";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { alignClozeRuby, RubyText } from "@/components/RubyText";
import { ARENA_BANK, ARENA_GROUPS } from "@/data/arenaBank";
import type { ArenaGroupId, ArenaGroupMeta, ArenaItem } from "@/data/arenaBank";
import { ARENA_GUIDES } from "@/data/arenaGuides";
import type { LevelId } from "@/data/types";
import { attemptStats } from "@/lib/proficiency";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

type RenderedQuestion = {
  item: ArenaItem;
  group: ArenaGroupMeta;
  shuffledChoices: string[];
};

type AnswerOutcome = "correct" | "alt" | "wrong";
type ViewState = "hub" | "drill" | "summary";
type LevelFilter = "ALL" | LevelId;
type QuizLength = 10 | 20 | 30 | 0; // 0 = unlimited

type SessionRecord = {
  groupId: ArenaGroupId;
  outcome: AnswerOutcome;
};

const LEVEL_SECTIONS: { level: LevelId; title: string; subtitle: string }[] = [
  { level: "N5", title: "N5 · 基礎助詞與移動", subtitle: "助詞核心、移動場所與名詞修飾" },
  { level: "N4", title: "N4 · 條件・補助・授受・態", subtitle: "假定、補助動詞、樣態傳聞、授受與受身使役" },
  { level: "N3", title: "N3 · 推論・因果・逆接・時間・限定", subtitle: "高頻易混句型深度辨析" },
];

const QUIZ_LENGTHS: { value: QuizLength; label: string }[] = [
  { value: 10, label: "10題" },
  { value: 20, label: "20題" },
  { value: 30, label: "30題" },
  { value: 0, label: "無限" },
];

const GROUP_MAP: Readonly<Record<ArenaGroupId, ArenaGroupMeta>> = Object.fromEntries(
  ARENA_GROUPS.map((g) => [g.id, g]),
) as Record<ArenaGroupId, ArenaGroupMeta>;

const PURE_KANA_RE = /^[\u3040-\u309f\u30a0-\u30ffー]+$/;
const KANA_PUNCT_RE = /[\u3040-\u309f\u30a0-\u30ffー、。？！「」]/;

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Masks the answer slot inside `item.reading` before submission so learners
 * can read kanji pronunciation without leaking the target grammar form.
 */
export function maskReadingForBlank(item: ArenaItem): string {
  const rd = item.reading;
  if (!rd) return "";
  const surface = item.surface ?? item.answer;
  const fullLen = Math.max(1, item.before.length + surface.length + item.after.length);
  const expectedPos = Math.round((item.before.length / fullLen) * rd.length);

  // Extract trailing kana/punct of `before` and leading kana/punct of `after`
  let beforeTail = "";
  for (let i = item.before.length - 1; i >= 0; i -= 1) {
    if (KANA_PUNCT_RE.test(item.before[i])) beforeTail = item.before[i] + beforeTail;
    else break;
  }
  let afterHead = "";
  for (let i = 0; i < item.after.length; i += 1) {
    if (KANA_PUNCT_RE.test(item.after[i])) afterHead += item.after[i];
    else break;
  }

  // Case 1: Pure kana surface (particles, のに, わけだ, ことにする, だけ, etc.)
  if (PURE_KANA_RE.test(surface)) {
    const matches: { idx: number; score: number }[] = [];
    let pos = rd.indexOf(surface);
    while (pos !== -1) {
      let score = Math.abs(pos - expectedPos);
      if (beforeTail && rd.slice(Math.max(0, pos - beforeTail.length), pos) === beforeTail) {
        score -= 20;
      }
      if (afterHead && rd.slice(pos + surface.length, pos + surface.length + afterHead.length) === afterHead) {
        score -= 20;
      }
      matches.push({ idx: pos, score });
      pos = rd.indexOf(surface, pos + 1);
    }
    if (matches.length > 0) {
      matches.sort((a, b) => a.score - b.score);
      const best = matches[0].idx;
      return `${rd.slice(0, best)}【　　】${rd.slice(best + surface.length)}`;
    }
  }

  // Case 2: Inflected surface containing kanji (e.g., 忘れたばかりに, 十分おきに, 出かけたようだ)
  // Find right boundary from afterHead (or end of sentence if after === "。")
  let rightIdx = rd.length;
  if (item.after === "。" && rd.endsWith("。")) {
    rightIdx = rd.length - 1;
  } else if (afterHead) {
    const expectedRight = Math.round(((item.before.length + surface.length) / fullLen) * rd.length);
    let bestRight = -1;
    let bestDist = Infinity;
    let p = rd.indexOf(afterHead);
    while (p !== -1) {
      const d = Math.abs(p - expectedRight);
      if (d < bestDist) {
        bestDist = d;
        bestRight = p;
      }
      p = rd.indexOf(afterHead, p + 1);
    }
    if (bestRight !== -1) rightIdx = bestRight;
  }

  // Find left boundary from beforeTail (last kana/punct before the blank)
  let leftIdx = -1;
  if (beforeTail) {
    const searchSlice = rd.slice(0, rightIdx);
    let bestLeft = -1;
    let bestDist = Infinity;
    let p = searchSlice.indexOf(beforeTail);
    while (p !== -1) {
      const endOfTail = p + beforeTail.length;
      if (endOfTail < rightIdx) {
        const d = Math.abs(endOfTail - expectedPos);
        if (d < bestDist) {
          bestDist = d;
          bestLeft = endOfTail;
        }
      }
      p = searchSlice.indexOf(beforeTail, p + 1);
    }
    if (bestLeft !== -1) leftIdx = bestLeft;
  }

  if (leftIdx >= 0 && leftIdx < rightIdx) {
    return `${rd.slice(0, leftIdx)}【　　】${rd.slice(rightIdx)}`;
  }

  // Safe fallback: never leak the answer
  return "（作答後顯示完整假名讀音）";
}

/**
 * Weighted sampling by immutable item.id mastery across 1 or more selected groups:
 * - Unseen or low accuracy (level 0-1) -> higher weight (5-6)
 * - Familiar (level 2) -> weight 3
 * - Mastered (level 3) -> weight 1
 * Always shuffles choices at runtime via Fisher-Yates.
 */
function pickWeightedQuestion(
  pool: ArenaItem[],
  arenaAttempts: Readonly<Record<string, number[]>>,
  avoidIds: ReadonlySet<string>,
): RenderedQuestion | null {
  if (pool.length === 0) return null;
  const unseenInSession = pool.filter((x) => !avoidIds.has(x.id));
  const source = unseenInSession.length > 0 ? unseenInSession : pool;

  // Stratify uniformly by (groupId, grammarKey) so core-tier sessions stay 1.00x answer-balanced
  const buckets = new Map<string, ArenaItem[]>();
  for (const item of source) {
    const bKey = `${item.groupId}::${item.grammarKey}`;
    const arr = buckets.get(bKey);
    if (arr) arr.push(item);
    else buckets.set(bKey, [item]);
  }
  const bucketList = Array.from(buckets.values());
  const chosenBucket = bucketList[Math.floor(Math.random() * bucketList.length)] ?? source;

  const weights = chosenBucket.map((item) => {
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
  let picked = chosenBucket[chosenBucket.length - 1];
  for (let i = 0; i < chosenBucket.length; i += 1) {
    r -= weights[i];
    if (r <= 0) {
      picked = chosenBucket[i];
      break;
    }
  }

  const group = GROUP_MAP[picked.groupId] ?? ARENA_GROUPS[0];
  const rawChoices = picked.choices && picked.choices.length > 0 ? picked.choices : group.choices;
  return {
    item: picked,
    group,
    shuffledChoices: shuffle(rawChoices),
  };
}

function stripLevelPrefix(label: string): string {
  return label.replace(/^N[1-5]\s+/, "");
}

export function GrammarCompare() {
  const { prefs, arenaAttempts, recordArenaAttempt } = useProgress();
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Top-level mode: Arena (hub / drill / summary) vs Quick Reference Guide
  const [subMode, setSubMode] = useState<"arena" | "guide">("arena");
  const [view, setView] = useState<ViewState>("hub");

  // Two-tier pack toggle: false = 標準級別 (core only), true = 含進階擴充 (core + extended)
  const [includeExtended, setIncludeExtended] = useState(false);

  // Hub navigation & multi-select state
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<ArenaGroupId[]>([]);
  const [quizLength, setQuizLength] = useState<QuizLength>(20);
  const [guideLevelFilter, setGuideLevelFilter] = useState<LevelFilter>("ALL");
  const [guideSearch, setGuideSearch] = useState("");

  // Active drill state
  const [activeGroupIds, setActiveGroupIds] = useState<ArenaGroupId[]>([ARENA_GROUPS[0].id]);
  const [isMixedSession, setIsMixedSession] = useState(false);
  const [targetCount, setTargetCount] = useState<QuizLength>(0);
  const [showZh, setShowZh] = useState(true);
  const [peekZh, setPeekZh] = useState(false);
  const [showPreReading, setShowPreReading] = useState(true);

  const [rendered, setRendered] = useState<RenderedQuestion | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [answeredTotal, setAnsweredTotal] = useState(0);
  const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);

  // Active bank filtered by two-tier pack toggle
  const tierBank = useMemo(
    () => (includeExtended ? ARENA_BANK : ARENA_BANK.filter((item) => item.tier !== "extended")),
    [includeExtended],
  );

  const itemsByGroup = useMemo(() => {
    const map = Object.fromEntries(ARENA_GROUPS.map((g) => [g.id, [] as ArenaItem[]])) as Record<
      ArenaGroupId,
      ArenaItem[]
    >;
    for (const it of tierBank) {
      map[it.groupId]?.push(it);
    }
    return map;
  }, [tierBank]);

  const coreCountTotal = useMemo(
    () => ARENA_BANK.filter((item) => item.tier !== "extended").length,
    [],
  );

  // Per-group mastery stats (reflects active tier)
  const groupStats = useMemo(() => {
    const stats = {} as Record<ArenaGroupId, { total: number; attempted: number; mastered: number }>;
    for (const g of ARENA_GROUPS) {
      const items = itemsByGroup[g.id] ?? [];
      let attempted = 0;
      let mastered = 0;
      for (const it of items) {
        const hist = arenaAttempts[it.id];
        if (hist && hist.length > 0) {
          attempted += 1;
          if (attemptStats(hist).level >= 2) mastered += 1;
        }
      }
      stats[g.id] = { total: items.length, attempted, mastered };
    }
    return stats;
  }, [itemsByGroup, arenaAttempts]);

  const totalMastered = useMemo(
    () => Object.values(groupStats).reduce((sum, s) => sum + s.mastered, 0),
    [groupStats],
  );

  // Filtered sections for Hub
  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return LEVEL_SECTIONS.filter((sec) => levelFilter === "ALL" || sec.level === levelFilter)
      .map((sec) => {
        const groups = ARENA_GROUPS.filter((g) => {
          if (g.level !== sec.level) return false;
          if (!q) return true;
          return (
            g.label.toLowerCase().includes(q) ||
            g.grammarKeys.some((k) => k.toLowerCase().includes(q))
          );
        });
        const totalItems = groups.reduce((sum, g) => sum + (itemsByGroup[g.id]?.length ?? 0), 0);
        return { ...sec, groups, totalItems };
      })
      .filter((sec) => sec.groups.length > 0);
  }, [levelFilter, searchQuery, itemsByGroup]);

  // Filtered Quick Reference Guides (all 21 groups)
  const filteredGuides = useMemo(() => {
    const q = guideSearch.trim().toLowerCase();
    return ARENA_GUIDES.filter((g) => {
      if (guideLevelFilter !== "ALL" && g.level !== guideLevelFilter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.entries.some(
          (e) =>
            e.key.toLowerCase().includes(q) ||
            e.connection.toLowerCase().includes(q) ||
            e.rule.toLowerCase().includes(q),
        )
      );
    });
  }, [guideLevelFilter, guideSearch]);

  // Active drill pool
  const activePool = useMemo(() => {
    const set = new Set<ArenaGroupId>(activeGroupIds);
    return tierBank.filter((item) => set.has(item.groupId));
  }, [activeGroupIds, tierBank]);

  const selectedQuestionCount = useMemo(
    () => selectedGroups.reduce((sum, id) => sum + (itemsByGroup[id]?.length ?? 0), 0),
    [selectedGroups, itemsByGroup],
  );

  const toggleGroupSelection = (id: ArenaGroupId) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleLevelSelection = (level: LevelId) => {
    const levelIds = ARENA_GROUPS.filter((g) => g.level === level).map((g) => g.id);
    const allSelected = levelIds.every((id) => selectedGroups.includes(id));
    if (allSelected) {
      setSelectedGroups((prev) => prev.filter((id) => !levelIds.includes(id)));
    } else {
      setSelectedGroups((prev) => Array.from(new Set([...prev, ...levelIds])));
    }
  };

  const startSession = (groupIds: ArenaGroupId[], mixed: boolean, limit: QuizLength) => {
    if (groupIds.length === 0) return;
    const idSet = new Set<ArenaGroupId>(groupIds);
    const pool = tierBank.filter((item) => idSet.has(item.groupId));
    const first = pickWeightedQuestion(pool, arenaAttempts, new Set());
    if (!first) return;

    setActiveGroupIds(groupIds);
    setIsMixedSession(mixed);
    setTargetCount(limit);
    setRendered(first);
    setSeenIds(new Set([first.item.id]));
    setPicked(null);
    setOutcome(null);
    setPeekZh(false);
    setStreak(0);
    setBestStreak(0);
    setCorrectTotal(0);
    setAnsweredTotal(0);
    setSessionRecords([]);
    setView("drill");
  };

  const handleCardPress = (id: ArenaGroupId) => {
    if (multiSelectMode) {
      toggleGroupSelection(id);
    } else {
      startSession([id], false, 0);
    }
  };

  const choose = (choiceText: string) => {
    if (!rendered || picked !== null) return;
    const { item } = rendered;
    setPicked(choiceText);
    setAnsweredTotal((n) => n + 1);

    let nextOutcome: AnswerOutcome;
    if (choiceText === item.answer) {
      nextOutcome = "correct";
      setCorrectTotal((n) => n + 1);
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      recordArenaAttempt(item.id, true);
    } else if (item.altAnswers && item.altAnswers[choiceText]) {
      // Soft-accept near-synonym: preserve streak, leave mastery weight unchanged
      nextOutcome = "alt";
      setCorrectTotal((n) => n + 1);
    } else {
      nextOutcome = "wrong";
      setStreak(0);
      recordArenaAttempt(item.id, false);
    }
    setOutcome(nextOutcome);
    setSessionRecords((prev) => [...prev, { groupId: item.groupId, outcome: nextOutcome }]);
  };

  const nextQuestion = () => {
    if (targetCount > 0 && answeredTotal >= targetCount) {
      setView("summary");
      return;
    }
    const next = pickWeightedQuestion(activePool, arenaAttempts, seenIds);
    setPicked(null);
    setOutcome(null);
    setPeekZh(false);
    if (next) {
      setRendered(next);
      setSeenIds((prev) => {
        const copy = new Set(prev);
        copy.add(next.item.id);
        return copy;
      });
    }
  };

  const item = rendered?.item ?? null;
  const activeGroup = rendered?.group ?? ARENA_GROUPS[0];
  const accent = levelAccent[activeGroup.level];
  const displaySurface = item ? (item.surface ?? item.answer) : "";

  const rubySegments = useMemo(() => {
    if (!item) return [];
    return alignClozeRuby({
      before: item.before,
      surface: displaySurface,
      after: item.after,
      reading: item.reading,
      revealed: picked !== null,
    });
  }, [item, displaySurface, picked]);

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

  const summaryBreakdown = useMemo(() => {
    const map = new Map<ArenaGroupId, { correct: number; total: number }>();
    for (const rec of sessionRecords) {
      const cur = map.get(rec.groupId) ?? { correct: 0, total: 0 };
      cur.total += 1;
      if (rec.outcome === "correct" || rec.outcome === "alt") cur.correct += 1;
      map.set(rec.groupId, cur);
    }
    return Array.from(map.entries()).map(([gid, stat]) => ({
      group: GROUP_MAP[gid],
      ...stat,
    }));
  }, [sessionRecords]);

  const isLastFixedQuestion = targetCount > 0 && answeredTotal >= targetCount;
  const effectiveShowZh = showZh || peekZh || picked !== null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.scrollContent,
          subMode === "arena" && view === "hub" && multiSelectMode && styles.scrollContentWithDock,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topCard}>
          <View style={styles.topHead}>
            <View style={styles.topHeadLeft}>
              <Text style={styles.heading}>易混實戰擂台</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {ARENA_GROUPS.length} 組主題 · {tierBank.length.toLocaleString()} 題 · 已熟練 {totalMastered} 題
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

          {/* Hub Toolbar: Two-Tier Pack Selector + Level Filter + Multi-Select + Search */}
          {subMode === "arena" && view === "hub" && (
            <>
              <View style={styles.tierRow}>
                <Pressable
                  onPress={() => setIncludeExtended(false)}
                  style={[styles.tierBtn, !includeExtended && styles.tierBtnActive]}
                >
                  <Text style={[styles.tierBtnTitle, !includeExtended && styles.tierBtnTitleActive]}>
                    標準級別
                  </Text>
                  <Text style={[styles.tierBtnSub, !includeExtended && styles.tierBtnSubActive]}>
                    嚴選級別詞彙 · {coreCountTotal.toLocaleString()} 題
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setIncludeExtended(true)}
                  style={[styles.tierBtn, includeExtended && styles.tierBtnActive]}
                >
                  <Text style={[styles.tierBtnTitle, includeExtended && styles.tierBtnTitleActive]}>
                    含進階擴充包
                  </Text>
                  <Text style={[styles.tierBtnSub, includeExtended && styles.tierBtnSubActive]}>
                    長句與新聞職場 · {ARENA_BANK.length.toLocaleString()} 題
                  </Text>
                </Pressable>
              </View>

              <View style={styles.filterRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.levelPills}
                >
                  {(["ALL", "N5", "N4", "N3"] as LevelFilter[]).map((lv) => {
                    const active = levelFilter === lv;
                    const count =
                      lv === "ALL"
                        ? ARENA_GROUPS.length
                        : ARENA_GROUPS.filter((g) => g.level === lv).length;
                    return (
                      <Pressable
                        key={lv}
                        onPress={() => setLevelFilter(lv)}
                        style={[styles.levelPill, active && styles.levelPillActive]}
                      >
                        <Text style={[styles.levelPillText, active && styles.levelPillTextActive]}>
                          {lv === "ALL" ? `全部 (${count})` : `${lv} (${count})`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Pressable
                  onPress={() => {
                    setMultiSelectMode((prev) => {
                      if (prev) setSelectedGroups([]);
                      return !prev;
                    });
                  }}
                  style={[styles.multiToggleBtn, multiSelectMode && styles.multiToggleBtnActive]}
                >
                  <Text
                    style={[
                      styles.multiToggleText,
                      multiSelectMode && styles.multiToggleTextActive,
                    ]}
                  >
                    {multiSelectMode ? "✕ 取消自選" : "⊞ 自選混合"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.searchWrap}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="搜尋主題或文法（例：わけ、受身、のに、ばかり）"
                  placeholderTextColor={t.inkMuted}
                  style={styles.searchInput}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} style={styles.searchClear}>
                    <Text style={styles.searchClearText}>✕</Text>
                  </Pressable>
                )}
              </View>

              {multiSelectMode && (
                <Text style={styles.multiHint}>
                  點選下方多個主題卡片，即可跨主題隨機出題測驗。
                </Text>
              )}
            </>
          )}

          {/* Guide Toolbar: Level Filter + Search across all 21 groups */}
          {subMode === "guide" && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.levelPills}
              >
                {(["ALL", "N5", "N4", "N3"] as LevelFilter[]).map((lv) => {
                  const active = guideLevelFilter === lv;
                  const count =
                    lv === "ALL"
                      ? ARENA_GUIDES.length
                      : ARENA_GUIDES.filter((g) => g.level === lv).length;
                  return (
                    <Pressable
                      key={lv}
                      onPress={() => setGuideLevelFilter(lv)}
                      style={[styles.levelPill, active && styles.levelPillActive]}
                    >
                      <Text style={[styles.levelPillText, active && styles.levelPillTextActive]}>
                        {lv === "ALL" ? `全部 (${count})` : `${lv} (${count})`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.searchWrap}>
                <TextInput
                  value={guideSearch}
                  onChangeText={setGuideSearch}
                  placeholder="搜尋速查文法或接續（例：わけ、受身、たびに、しか）"
                  placeholderTextColor={t.inkMuted}
                  style={styles.searchInput}
                  clearButtonMode="while-editing"
                />
                {guideSearch.length > 0 && (
                  <Pressable onPress={() => setGuideSearch("")} style={styles.searchClear}>
                    <Text style={styles.searchClearText}>✕</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}

          {/* Drill Toolbar: Back + Pre-Answer Furigana Toggle + Chinese Toggle */}
          {subMode === "arena" && view === "drill" && (
            <View style={styles.drillToolbar}>
              <Pressable onPress={() => setView("hub")} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← 主題列表</Text>
              </Pressable>

              <View style={styles.drillToolbarRight}>
                <Pressable
                  onPress={() => setShowPreReading((prev) => !prev)}
                  style={[styles.togglePill, !showPreReading && styles.togglePillOff]}
                >
                  <Text style={[styles.togglePillText, !showPreReading && styles.togglePillTextOff]}>
                    {showPreReading ? "假名：開" : "假名：關"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowZh((prev) => !prev);
                    setPeekZh(false);
                  }}
                  style={[styles.togglePill, !showZh && styles.togglePillOff]}
                >
                  <Text style={[styles.togglePillText, !showZh && styles.togglePillTextOff]}>
                    {showZh ? "中文：開" : "中文：關"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* === HUB VIEW: Level-Organized Topic Directory === */}
        {subMode === "arena" && view === "hub" && (
          <>
            {filteredSections.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>找不到符合「{searchQuery}」的主題</Text>
                <Text style={styles.emptySub}>試試搜尋文法關鍵字，或切換回「全部」級別。</Text>
              </View>
            ) : (
              filteredSections.map((sec) => {
                const secAccent = levelAccent[sec.level];
                const allInLevelSelected =
                  multiSelectMode &&
                  sec.groups.every((g) => selectedGroups.includes(g.id));
                return (
                  <View key={sec.level} style={styles.sectionBlock}>
                    <View style={styles.sectionHead}>
                      <View style={styles.sectionHeadLeft}>
                        <View style={[styles.sectionDot, { backgroundColor: secAccent }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sectionTitle}>{sec.title}</Text>
                          <Text style={styles.sectionSub}>
                            {sec.groups.length} 組 · {sec.totalItems.toLocaleString()} 題 · {sec.subtitle}
                          </Text>
                        </View>
                      </View>
                      {multiSelectMode && (
                        <Pressable
                          onPress={() => toggleLevelSelection(sec.level)}
                          style={[
                            styles.selectLevelBtn,
                            allInLevelSelected && styles.selectLevelBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.selectLevelText,
                              allInLevelSelected && styles.selectLevelTextActive,
                            ]}
                          >
                            {allInLevelSelected ? "取消全選" : `全選 ${sec.level}`}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={styles.topicList}>
                      {sec.groups.map((g) => {
                        const stat = groupStats[g.id];
                        const pct = stat.total > 0 ? Math.round((stat.mastered / stat.total) * 100) : 0;
                        const isChecked = selectedGroups.includes(g.id);
                        return (
                          <Pressable
                            key={g.id}
                            onPress={() => handleCardPress(g.id)}
                            style={[
                              styles.topicCard,
                              multiSelectMode && isChecked && styles.topicCardSelected,
                            ]}
                          >
                            <View style={styles.topicCardTop}>
                              <View style={styles.topicTitleRow}>
                                {multiSelectMode && (
                                  <View
                                    style={[
                                      styles.checkbox,
                                      isChecked && {
                                        backgroundColor: secAccent,
                                        borderColor: secAccent,
                                      },
                                    ]}
                                  >
                                    {isChecked && <Text style={styles.checkboxMark}>✓</Text>}
                                  </View>
                                )}
                                <View style={[styles.levelTag, { borderColor: secAccent }]}>
                                  <Text style={[styles.levelTagText, { color: secAccent }]}>
                                    {g.level}
                                  </Text>
                                </View>
                                <Text style={styles.topicTitle} numberOfLines={1}>
                                  {stripLevelPrefix(g.label)}
                                </Text>
                              </View>

                              <Text style={styles.topicCount}>
                                {stat.total} 題{!multiSelectMode ? " ›" : ""}
                              </Text>
                            </View>

                            <View style={styles.keyChipsRow}>
                              {g.grammarKeys.map((k) => (
                                <View key={k} style={styles.keyChip}>
                                  <Text style={styles.keyChipText}>{k}</Text>
                                </View>
                              ))}
                            </View>

                            <View style={styles.progressRow}>
                              <View style={styles.progressTrack}>
                                <View
                                  style={[
                                    styles.progressFill,
                                    {
                                      width: `${Math.min(100, pct)}%`,
                                      backgroundColor: secAccent,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={styles.progressText}>
                                已練 {stat.attempted} · 熟練 {pct}%
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* === DRILL VIEW: Single Topic or Multi-Topic Random Test === */}
        {subMode === "arena" && view === "drill" && rendered && item && (
          <QuestionTransition triggerKey={item.id} style={styles.card}>
            {/* Session status strip */}
            <View style={styles.sessionBar}>
              <View style={styles.badgeRow}>
                <View style={[styles.levelTag, { borderColor: accent }]}>
                  <Text style={[styles.levelTagText, { color: accent }]}>
                    {item.jlptTag ?? activeGroup.level}
                  </Text>
                </View>
                <Text style={styles.groupLabel} numberOfLines={1}>
                  {stripLevelPrefix(activeGroup.label)}
                </Text>
                {item.tier === "extended" && (
                  <View style={styles.extendedBadge}>
                    <Text style={styles.extendedBadgeText}>進階擴充</Text>
                  </View>
                )}
                {isMixedSession && (
                  <View style={styles.mixedBadge}>
                    <Text style={styles.mixedBadgeText}>
                      混合 {activeGroupIds.length} 組
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.sessionMeta}>
                {targetCount > 0
                  ? `第 ${Math.min(answeredTotal + (picked === null ? 1 : 0), targetCount)}/${targetCount} 題 · 連勝 ${streak}`
                  : `連勝 ${streak} · ${correctTotal}/${answeredTotal}`}
              </Text>
            </View>

            {targetCount > 0 && (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, Math.round((answeredTotal / targetCount) * 100))}%`,
                      backgroundColor: t.accentPrimary,
                    },
                  ]}
                />
              </View>
            )}

            <RubyText
              segments={rubySegments}
              showRuby={showPreReading || picked !== null}
              fontSize={20}
              rtFontSize={10.5}
              blankColor={
                picked === null
                  ? t.vermillion
                  : outcome === "correct"
                    ? t.matchaDark
                    : outcome === "alt"
                      ? t.goldDark
                      : t.error
              }
            />

            {item.zh ? (
              effectiveShowZh ? (
                <Text style={styles.zh}>{item.zh}</Text>
              ) : (
                <Pressable onPress={() => setPeekZh(true)} style={styles.zhHiddenBox}>
                  <Text style={styles.zhHiddenText}>中文翻譯已隱藏 · 點擊偷看本題提示</Text>
                </Pressable>
              )
            ) : null}

            <View style={styles.choicesGrid}>
              {rendered.shuffledChoices.map((opt) => {
                const isAns = opt === item.answer;
                const isAlt = Boolean(item.altAnswers?.[opt]);
                const isPick = opt === picked;
                let color = t.ink;
                let choiceState: ChoiceVisualState = "idle";
                if (picked !== null) {
                  if (isAns) {
                    color = t.matchaDark;
                    choiceState = "correct";
                  } else if (isPick && isAlt) {
                    color = t.goldDark;
                    choiceState = "alt";
                  } else if (isPick) {
                    color = t.error;
                    choiceState = "wrong";
                  } else {
                    color = t.inkMuted;
                    choiceState = "muted";
                  }
                }
                const fullWidth = rendered.shuffledChoices.some((c) => c.length >= 8);
                return (
                  <TactileChoiceButton
                    key={opt}
                    fullWidth={fullWidth}
                    disabled={picked !== null}
                    state={choiceState}
                    onPress={() => choose(opt)}
                  >
                    <Text style={[styles.tileText, { color }]}>{opt}</Text>
                  </TactileChoiceButton>
                );
              })}
            </View>
          </QuestionTransition>
        )}

        {/* === SUMMARY VIEW: Fixed-Length Mixed Test Results === */}
        {subMode === "arena" && view === "summary" && (
          <View style={styles.card}>
            <Text style={styles.summaryEyebrow}>混合測驗完成</Text>
            <Text style={styles.summaryScore}>
              {correctTotal} / {answeredTotal} 題正確（
              {answeredTotal > 0 ? Math.round((correctTotal / answeredTotal) * 100) : 0}%）
            </Text>
            <Text style={styles.summarySub}>
              涵蓋 {activeGroupIds.length} 個主題 · 最高連勝 {bestStreak} 題 ·{" "}
              {includeExtended ? "含進階擴充包" : "標準級別"}
            </Text>

            <View style={styles.breakdownList}>
              {summaryBreakdown.map((row) => {
                const rowAcc = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
                const rowColor = levelAccent[row.group.level];
                return (
                  <View key={row.group.id} style={styles.breakdownRow}>
                    <View style={styles.breakdownLeft}>
                      <Text style={[styles.levelCode, { color: rowColor }]}>
                        {row.group.level}
                      </Text>
                      <Text style={styles.breakdownTitle} numberOfLines={1}>
                        {stripLevelPrefix(row.group.label)}
                      </Text>
                    </View>
                    <Text style={styles.breakdownStat}>
                      {row.correct}/{row.total}（{rowAcc}%）
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.summaryActions}>
              <Pressable
                onPress={() => startSession(activeGroupIds, isMixedSession, targetCount)}
                style={[styles.primaryBtn, { flex: 1 }]}
              >
                <Text style={styles.primaryBtnText}>再測一次</Text>
              </Pressable>
              <Pressable
                onPress={() => setView("hub")}
                style={[styles.secondaryBtn, { flex: 1 }]}
              >
                <Text style={styles.secondaryBtnText}>返回主題列表</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* === QUICK GUIDE VIEW (All 21 Arena Groups) === */}
        {subMode === "guide" &&
          (filteredGuides.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>找不到符合「{guideSearch}」的文法速查</Text>
              <Text style={styles.emptySub}>試試搜尋其他關鍵字，或切換回「全部」級別。</Text>
            </View>
          ) : (
            filteredGuides.map((guide) => {
              const gAccent = levelAccent[guide.level];
              return (
                <View key={guide.groupId} style={styles.card}>
                  <View style={styles.guideHeaderRow}>
                    <View style={styles.guideHeaderLeft}>
                      <View style={[styles.levelTag, { borderColor: gAccent }]}>
                        <Text style={[styles.levelTagText, { color: gAccent }]}>
                          {guide.level}
                        </Text>
                      </View>
                      <Text style={styles.pairTitle} numberOfLines={2}>
                        {guide.title}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setSubMode("arena");
                        startSession([guide.groupId], false, 0);
                      }}
                      style={[styles.practiceChipBtn, { borderColor: gAccent }]}
                    >
                      <Text style={[styles.practiceChipText, { color: gAccent }]}>練習 →</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.pairSub}>{guide.summary}</Text>
                  <View style={styles.columns}>
                    {guide.entries.map((entry) => (
                      <View key={entry.key} style={styles.sideBox}>
                        <View style={styles.guideEntryHead}>
                          <Text style={[styles.sideLabel, { color: gAccent }]}>{entry.key}</Text>
                          <Text style={styles.guideConn} numberOfLines={2}>
                            {entry.connection}
                          </Text>
                        </View>
                        <Text style={styles.sideRule}>{entry.rule}</Text>
                        <Text style={styles.sideExample}>{entry.example}</Text>
                        <Text style={styles.sideTrans}>{entry.translation}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          ))}
      </ScrollView>

      {/* Sticky Multi-Topic Launch Bar */}
      {subMode === "arena" && view === "hub" && multiSelectMode && (
        <View style={styles.multiDock}>
          <View style={styles.multiDockTop}>
            <Text style={styles.multiDockSummary}>
              已選 {selectedGroups.length} 組（共 {selectedQuestionCount.toLocaleString()} 題）
            </Text>
            <View style={styles.lengthPills}>
              {QUIZ_LENGTHS.map((opt) => {
                const active = quizLength === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => setQuizLength(opt.value)}
                    style={[styles.lengthPill, active && styles.lengthPillActive]}
                  >
                    <Text style={[styles.lengthPillText, active && styles.lengthPillTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.multiDockActions}>
            <Pressable
              onPress={() => setSelectedGroups([])}
              disabled={selectedGroups.length === 0}
              style={[
                styles.secondaryBtn,
                selectedGroups.length === 0 && styles.btnDisabled,
              ]}
            >
              <Text style={styles.secondaryBtnText}>清除</Text>
            </Pressable>
            <Pressable
              disabled={selectedGroups.length === 0}
              onPress={() => startSession(selectedGroups, true, quizLength)}
              style={[
                styles.primaryBtn,
                { flex: 1 },
                selectedGroups.length === 0 && styles.btnDisabled,
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {selectedGroups.length === 0
                  ? "請先勾選至少 1 個主題"
                  : `開始隨機混合測驗 →`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Drill Feedback Dock */}
      {subMode === "arena" && view === "drill" && item && picked !== null && outcome !== null && (
        <AnimatedFeedbackDock style={[styles.feedbackDock, { backgroundColor: dockBg, borderTopColor: dockBorder }]}>
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
          <TactilePress onPress={nextQuestion} style={[styles.dockBtn, { backgroundColor: dockBorder }]}>
            <Text style={styles.dockBtnText}>
              {isLastFixedQuestion ? "查看結果 →" : "下一題 →"}
            </Text>
          </TactilePress>
        </AnimatedFeedbackDock>
      )}
    </View>
  );
}

function makeStyles(t: AppTheme) {
  const activeBg = t.preset === "ios" ? t.accentPrimary : t.ink;
  const activeFg = t.preset === "ios" ? "#FFFFFF" : t.paper;

  return StyleSheet.create({
    container: { flex: 1 },
    scroller: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, gap: 14 },
    scrollContentWithDock: { paddingBottom: 140 },
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
    heading: { fontSize: 16, fontWeight: "700", color: t.ink },
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
    segBtnActive: { backgroundColor: activeBg },
    segText: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    segTextActive: { color: activeFg },

    // Two-tier pack toggle
    tierRow: { flexDirection: "row", gap: 8 },
    tierBtn: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
      gap: 2,
    },
    tierBtnActive: {
      backgroundColor: t.indigoSoft,
      borderColor: t.indigo,
    },
    tierBtnTitle: { fontSize: 12.5, fontWeight: "800", color: t.inkSoft },
    tierBtnTitleActive: { color: t.indigo },
    tierBtnSub: { fontSize: 10.5, color: t.inkMuted },
    tierBtnSubActive: { color: t.indigoDark },

    // Hub filter & search
    filterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    levelPills: { gap: 6, paddingVertical: 2 },
    levelPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    levelPillActive: { backgroundColor: activeBg, borderColor: activeBg },
    levelPillText: { fontSize: 11.5, fontWeight: "700", color: t.inkSoft },
    levelPillTextActive: { color: activeFg },
    multiToggleBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.accentPrimary,
      flexShrink: 0,
    },
    multiToggleBtnActive: { backgroundColor: t.accentPrimary },
    multiToggleText: { fontSize: 11.5, fontWeight: "700", color: t.accentPrimary },
    multiToggleTextActive: { color: "#FFFFFF" },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.surface,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
      paddingHorizontal: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: t.ink,
      paddingVertical: 8,
    },
    searchClear: { paddingLeft: 8, paddingVertical: 4 },
    searchClearText: { fontSize: 13, color: t.inkMuted, fontWeight: "700" },
    multiHint: { fontSize: 11.5, color: t.accentPrimary, fontWeight: "600" },

    // Sections & Topic Cards
    sectionBlock: { gap: 8 },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingHorizontal: 2,
    },
    sectionHeadLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    sectionDot: { width: 4, height: 28, borderRadius: 2 },
    sectionTitle: { fontSize: 14, fontWeight: "800", color: t.ink },
    sectionSub: { fontSize: 11, color: t.inkSoft, marginTop: 1 },
    selectLevelBtn: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
      backgroundColor: t.white,
    },
    selectLevelBtnActive: { backgroundColor: activeBg, borderColor: activeBg },
    selectLevelText: { fontSize: 11, fontWeight: "700", color: t.inkSoft },
    selectLevelTextActive: { color: activeFg },

    topicList: { gap: 8 },
    topicCard: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      padding: 13,
      gap: 8,
      borderWidth: t.cardBorderWidth,
      borderColor: t.paperBorder,
    },
    topicCardSelected: {
      borderColor: t.accentPrimary,
      backgroundColor: t.vermillionSoft,
    },
    topicCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    topicTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
    checkbox: {
      width: 19,
      height: 19,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: t.inkMuted,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.white,
    },
    checkboxMark: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", lineHeight: 14 },
    levelTag: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
      borderWidth: 1,
    },
    levelTagText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4 },
    topicTitle: { flex: 1, fontSize: 14.5, fontWeight: "700", color: t.ink },
    topicCount: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    keyChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
    keyChip: {
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 4,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    keyChipText: { fontSize: 11, fontWeight: "600", color: t.inkSoft },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    progressTrack: {
      flex: 1,
      height: t.barHeight,
      borderRadius: t.barHeight,
      backgroundColor: t.paperDeep,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: t.barHeight },
    progressText: { fontSize: 10.5, color: t.inkMuted, fontWeight: "600" },

    emptyCard: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      padding: 24,
      alignItems: "center",
      gap: 6,
      borderWidth: t.cardBorderWidth,
      borderColor: t.paperBorder,
    },
    emptyTitle: { fontSize: 14, fontWeight: "700", color: t.ink },
    emptySub: { fontSize: 12, color: t.inkSoft },

    // Drill Toolbar & Question Card
    drillToolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    backBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    backBtnText: { fontSize: 12, fontWeight: "700", color: t.ink },
    drillToolbarRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    togglePill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: t.controlRadius,
      backgroundColor: t.indigoSoft,
      borderWidth: 1,
      borderColor: t.indigo,
    },
    togglePillOff: {
      backgroundColor: t.surface,
      borderColor: t.paperBorder,
    },
    togglePillText: { fontSize: 11.5, fontWeight: "700", color: t.indigo },
    togglePillTextOff: { color: t.inkSoft },

    card: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      padding: 16,
      gap: 12,
      borderWidth: t.cardBorderWidth,
      borderColor: t.paperBorder,
    },
    sessionBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
    },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0, flexWrap: "wrap" },
    levelCode: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
    groupLabel: { fontSize: 12.5, fontWeight: "700", color: t.inkSoft, flexShrink: 1 },
    extendedBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: t.indigoSoft,
    },
    extendedBadgeText: { fontSize: 10, fontWeight: "700", color: t.indigo },
    mixedBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: t.goldSoft,
    },
    mixedBadgeText: { fontSize: 10, fontWeight: "700", color: t.goldDark },
    sessionMeta: { fontSize: 11.5, fontWeight: "700", color: t.inkSoft },
    sentence: { fontFamily: t.serif, fontSize: 19, fontWeight: "700", color: t.ink, lineHeight: 31 },
    blankText: { fontWeight: "800" },
    reading: { fontSize: 12.5, color: t.inkSoft, lineHeight: 19 },
    zh: {
      fontSize: 13.5,
      color: t.inkSoft,
      lineHeight: 20,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: t.paperBorder,
    },
    zhHiddenBox: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: t.paperBorder,
      alignItems: "center",
    },
    zhHiddenText: { fontSize: 12, fontWeight: "600", color: t.inkMuted },
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

    // Multi-Select Bottom Dock
    multiDock: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.white,
      borderTopWidth: 1.5,
      borderTopColor: t.paperBorder,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 14,
      gap: 8,
    },
    multiDockTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
    },
    multiDockSummary: { fontSize: 12.5, fontWeight: "700", color: t.ink },
    lengthPills: { flexDirection: "row", gap: 4 },
    lengthPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    lengthPillActive: { backgroundColor: activeBg, borderColor: activeBg },
    lengthPillText: { fontSize: 11, fontWeight: "700", color: t.inkSoft },
    lengthPillTextActive: { color: activeFg },
    multiDockActions: { flexDirection: "row", gap: 8 },
    primaryBtn: {
      backgroundColor: t.accentPrimary,
      borderRadius: t.controlRadius,
      paddingVertical: 11,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtnText: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "700" },
    secondaryBtn: {
      backgroundColor: t.surface,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
      paddingVertical: 11,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryBtnText: { color: t.ink, fontSize: 13, fontWeight: "700" },
    btnDisabled: { opacity: 0.45 },

    // Summary View
    summaryEyebrow: { fontSize: 12, fontWeight: "800", color: t.accentPrimary, letterSpacing: 0.5 },
    summaryScore: { fontFamily: t.serif, fontSize: 22, fontWeight: "700", color: t.ink },
    summarySub: { fontSize: 12.5, color: t.inkSoft },
    breakdownList: { gap: 6, marginTop: 4 },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: t.surface,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    breakdownLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
    breakdownTitle: { fontSize: 13, fontWeight: "700", color: t.ink, flex: 1 },
    breakdownStat: { fontSize: 12.5, fontWeight: "700", color: t.inkSoft },
    summaryActions: { flexDirection: "row", gap: 8, marginTop: 6 },

    // Guide & Feedback Dock
    guideHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
    },
    guideHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
    practiceChipBtn: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      backgroundColor: t.surface,
      flexShrink: 0,
    },
    practiceChipText: { fontSize: 11.5, fontWeight: "700" },
    guideEntryHead: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
    },
    guideConn: { fontSize: 11, color: t.inkMuted, fontWeight: "600", flexShrink: 1 },
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
