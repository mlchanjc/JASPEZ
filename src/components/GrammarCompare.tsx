import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ARENA_BANK, ARENA_GROUPS } from "@/data/arenaBank";
import type { ArenaGroupMeta } from "@/data/arenaBank";
import { CONFUSABLE_PAIRS } from "@/data/grammar";
import { findGrammarLesson } from "@/data/grammarRegistry";
import { lessonExamples } from "@/lib/grammar";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

type ArenaQuestion = {
  id: string;
  before: string;
  after: string;
  fullJa: string;
  reading: string;
  zh: string;
  correctLabel: string;
  choices: string[];
  tip: string;
};

function buildPool(group: ArenaGroupMeta): ArenaQuestion[] {
  const list: ArenaQuestion[] = [];
  const seenJa = new Set<string>();

  // 1. Add curated AI question bank entries for this group
  ARENA_BANK.forEach((item, idx) => {
    if (item.groupId !== group.id) return;
    const fullJa = `${item.before}${item.answer}${item.after}`;
    if (seenJa.has(fullJa)) return;
    seenJa.add(fullJa);
    list.push({
      id: `bank:${group.id}:${idx}`,
      before: item.before,
      after: item.after,
      fullJa,
      reading: item.reading,
      zh: item.zh,
      correctLabel: item.answer,
      choices: group.choices,
      tip: item.tip,
    });
  });

  // 2. Merge matching real bundled lesson examples (deduped)
  for (const member of group.lessonRefs) {
    const lesson = findGrammarLesson(member.level, member.lessonId);
    if (!lesson) continue;
    const examples = lessonExamples(lesson);
    examples.forEach((ex, idx) => {
      const ja = ex.ja.trim();
      if (!ja || seenJa.has(ja)) return;
      let hit = "";
      let pos = -1;
      for (const tok of member.tokens) {
        if (tok.length === 1) {
          const re = new RegExp(`${tok}(?=[、。！？\\s]|$)`);
          const m = re.exec(ja);
          if (m) {
            hit = tok;
            pos = m.index;
            break;
          }
        } else {
          const i = ja.indexOf(tok);
          if (i >= 0) {
            hit = tok;
            pos = i;
            break;
          }
        }
      }
      if (!hit || pos < 0) return;

      seenJa.add(ja);
      list.push({
        id: `lesson:${group.id}:${member.lessonId}:${idx}`,
        before: ja.slice(0, pos),
        after: ja.slice(pos + hit.length),
        fullJa: ja,
        reading: (ex.reading ?? "").trim(),
        zh: (ex.zh ?? "").trim(),
        correctLabel: member.choiceLabel,
        choices: group.choices,
        tip: member.tip,
      });
    });
  }

  return list;
}

export function GrammarCompare() {
  const { prefs } = useProgress();
  const [subMode, setSubMode] = useState<"arena" | "guide">("arena");
  const [groupId, setGroupId] = useState<string>(ARENA_GROUPS[0].id);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [answeredTotal, setAnsweredTotal] = useState(0);

  const activeGroup = ARENA_GROUPS.find((g) => g.id === groupId) ?? ARENA_GROUPS[0];
  const pool = useMemo(() => {
    const built = buildPool(activeGroup);
    for (let i = built.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [built[i], built[j]] = [built[j], built[i]];
    }
    return built;
  }, [activeGroup]);

  const question = pool.length > 0 ? pool[cursor % pool.length] : null;
  const isCorrect = question !== null && picked === question.correctLabel;
  const accent = levelAccent[activeGroup.level];

  const selectGroup = (id: string) => {
    setGroupId(id);
    setCursor(0);
    setPicked(null);
  };

  const choose = (label: string) => {
    if (!question || picked !== null) return;
    setPicked(label);
    setAnsweredTotal((n) => n + 1);
    if (label === question.correctLabel) {
      setCorrectTotal((n) => n + 1);
      setStreak((n) => n + 1);
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    setCursor((n) => n + 1);
    setPicked(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroller} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Mode & Stats Header (overflow-safe flex layout) */}
        <View style={styles.topCard}>
          <View style={styles.topHead}>
            <View style={styles.topHeadLeft}>
              <Text style={styles.heading}>易混實戰擂台</Text>
              <Text style={styles.sub} numberOfLines={2}>
                本組 {pool.length} 題 · 連勝 🔥{streak}（{correctTotal}/{answeredTotal}）
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
                const col = levelAccent[g.level];
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => selectGroup(g.id)}
                    style={[styles.groupChip, selected && { backgroundColor: col, borderColor: col }]}
                  >
                    <Text style={[styles.groupChipText, selected && { color: "#fff" }]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* MODE A: DYNAMIC CONFUSABLE ARENA */}
        {subMode === "arena" && question && (
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <View style={[styles.levelBadge, { backgroundColor: accent }]}>
                <Text style={styles.levelBadgeText}>{activeGroup.level}</Text>
              </View>
              <Text style={styles.groupLabel} numberOfLines={1}>
                {activeGroup.label} · 選出最適合的文法
              </Text>
            </View>

            <Text style={styles.sentence}>
              {question.before}
              <Text
                style={[
                  styles.blankText,
                  {
                    color: picked === null ? accent : isCorrect ? theme.matchaDark : theme.error,
                  },
                ]}
              >
                {picked === null ? " 【　　】 " : ` 【${picked}】 `}
              </Text>
              {question.after}
            </Text>

            {prefs.showFurigana && question.reading ? (
              <Text style={styles.reading}>
                {picked !== null ? question.reading : "（作答後顯示假名讀音）"}
              </Text>
            ) : null}

            {question.zh ? <Text style={styles.zh}>{question.zh}</Text> : null}

            <View style={styles.choicesGrid}>
              {question.choices.map((opt) => {
                const isAns = opt === question.correctLabel;
                const isPick = opt === picked;
                let bg = theme.white;
                let border = theme.paperBorder;
                let bottom = "#CBD5E1";
                let color = theme.ink;
                if (picked !== null) {
                  if (isAns) {
                    bg = theme.successSoft;
                    border = theme.success;
                    bottom = theme.matchaDark;
                    color = theme.matchaDark;
                  } else if (isPick) {
                    bg = theme.errorSoft;
                    border = theme.error;
                    bottom = theme.error;
                    color = theme.error;
                  } else {
                    bg = theme.surface;
                    color = theme.inkMuted;
                  }
                }
                return (
                  <Pressable
                    key={opt}
                    disabled={picked !== null}
                    onPress={() => choose(opt)}
                    style={[styles.tile, { backgroundColor: bg, borderColor: border, borderBottomColor: bottom }]}
                  >
                    <Text style={[styles.tileText, { color }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* MODE B: QUICK REFERENCE CHEAT-SHEETS */}
        {subMode === "guide" &&
          CONFUSABLE_PAIRS.map((pair) => (
            <View key={pair.id} style={styles.card}>
              <View style={styles.badgeRow}>
                <View style={[styles.levelBadge, { backgroundColor: levelAccent[pair.level] }]}>
                  <Text style={styles.levelBadgeText}>{pair.level}</Text>
                </View>
                <View style={styles.headText}>
                  <Text style={styles.pairTitle}>{pair.title}</Text>
                  <Text style={styles.pairSub}>{pair.subtitle}</Text>
                </View>
              </View>
              <View style={styles.columns}>
                <View style={[styles.sideBox, { backgroundColor: theme.indigoSoft }]}>
                  <Text style={[styles.sideLabel, { color: theme.indigo }]}>{pair.left.label}</Text>
                  <Text style={styles.sideRule}>{pair.left.rule}</Text>
                  <Text style={styles.sideExample}>{pair.left.example}</Text>
                  <Text style={styles.sideTrans}>{pair.left.translation}</Text>
                </View>
                <View style={[styles.sideBox, { backgroundColor: theme.goldSoft }]}>
                  <Text style={[styles.sideLabel, { color: theme.goldDark }]}>{pair.right.label}</Text>
                  <Text style={styles.sideRule}>{pair.right.rule}</Text>
                  <Text style={styles.sideExample}>{pair.right.example}</Text>
                  <Text style={styles.sideTrans}>{pair.right.translation}</Text>
                </View>
              </View>
            </View>
          ))}
      </ScrollView>

      {/* PINNED ZERO-SCROLL FEEDBACK BAR */}
      {subMode === "arena" && question && picked !== null && (
        <View
          style={[
            styles.feedbackDock,
            {
              backgroundColor: isCorrect ? "#ECFDF5" : "#FFF1F2",
              borderTopColor: isCorrect ? theme.success : theme.error,
            },
          ]}
        >
          <View style={styles.dockTop}>
            <Text style={[styles.dockTitle, { color: isCorrect ? theme.matchaDark : theme.error }]}>
              {isCorrect ? `✓ 答對了！「${question.correctLabel}」` : `✕ 正解：「${question.correctLabel}」`}
            </Text>
            <Text style={styles.dockBody} numberOfLines={2}>
              {question.tip}
            </Text>
          </View>
          <Pressable
            onPress={nextQuestion}
            style={[styles.dockBtn, { backgroundColor: isCorrect ? theme.success : theme.error }]}
          >
            <Text style={styles.dockBtnText}>下一題 →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroller: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 24, gap: 12 },
  topCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 15,
    gap: 10,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  topHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  topHeadLeft: {
    flex: 1,
    minWidth: 0,
  },
  heading: { fontSize: 16, fontWeight: "900", color: theme.ink },
  sub: { fontSize: 12, color: theme.inkSoft, marginTop: 2, fontWeight: "700" },
  segmented: {
    flexDirection: "row",
    backgroundColor: theme.paper,
    borderRadius: 11,
    padding: 3,
    gap: 2,
    flexShrink: 0,
  },
  segBtn: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8 },
  segBtnActive: { backgroundColor: theme.white },
  segText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  segTextActive: { color: theme.indigo },
  groupRow: { flexDirection: "row", gap: 6, paddingRight: 4 },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  groupChipText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  card: {
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  groupLabel: { flex: 1, fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  sentence: { fontSize: 19, lineHeight: 30, fontWeight: "800", color: theme.ink },
  blankText: { fontWeight: "900" },
  reading: { fontSize: 12, color: theme.inkMuted, lineHeight: 18 },
  zh: { fontSize: 14, color: theme.inkSoft, fontWeight: "600", lineHeight: 21 },
  choicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { fontSize: 15, fontWeight: "900", textAlign: "center" },
  headText: { flex: 1 },
  pairTitle: { fontSize: 16, fontWeight: "900", color: theme.ink },
  pairSub: { fontSize: 12, color: theme.inkSoft, fontWeight: "600" },
  columns: { flexDirection: "row", gap: 10 },
  sideBox: { flex: 1, borderRadius: 14, padding: 11, gap: 5 },
  sideLabel: { fontSize: 13, fontWeight: "900" },
  sideRule: { fontSize: 12, color: theme.ink, lineHeight: 17 },
  sideExample: { fontSize: 12, fontWeight: "800", color: theme.ink, paddingTop: 3 },
  sideTrans: { fontSize: 11, color: theme.inkSoft },
  feedbackDock: {
    borderTopWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  dockTop: { gap: 3 },
  dockTitle: { fontSize: 15, fontWeight: "900" },
  dockBody: { fontSize: 12, color: theme.ink, lineHeight: 18, fontWeight: "600" },
  dockBtn: { paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  dockBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
