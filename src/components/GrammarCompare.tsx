import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ARENA_BANK, ARENA_GROUPS } from "@/data/arenaBank";
import type { ArenaGroupMeta } from "@/data/arenaBank";
import { CONFUSABLE_PAIRS } from "@/data/grammar";
import { findGrammarLesson } from "@/data/grammarRegistry";
import { lessonExamples } from "@/lib/grammar";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

type ArenaQuestion = {
  id: string;
  before: string;
  after: string;
  fullJa: string;
  reading: string;
  zh: string;
  correctLabel: string;
  surface: string;
  choices: string[];
  tip: string;
};

function buildPool(group: ArenaGroupMeta): ArenaQuestion[] {
  const list: ArenaQuestion[] = [];
  const seenJa = new Set<string>();

  ARENA_BANK.forEach((item, idx) => {
    if (item.groupId !== group.id) return;
    const fullJa = `${item.before}${item.surface}${item.after}`;
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
      surface: item.surface,
      choices: group.choices,
      tip: item.tip,
    });
  });

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
        surface: hit,
        choices: group.choices,
        tip: member.tip,
      });
    });
  }

  return list;
}

export function GrammarCompare() {
  const { prefs } = useProgress();
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
        <View style={styles.topCard}>
          <View style={styles.topHead}>
            <View style={styles.topHeadLeft}>
              <Text style={styles.heading}>易混實戰擂台</Text>
              <Text style={styles.sub} numberOfLines={2}>
                本組 {pool.length} 題 · 連勝 {streak}（{correctTotal}/{answeredTotal}）
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

        {subMode === "arena" && question && (
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <Text style={[styles.levelCode, { color: accent }]}>{activeGroup.level}</Text>
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
                    color: picked === null ? t.vermillion : isCorrect ? t.matchaDark : t.error,
                  },
                ]}
              >
                {picked === null ? " 【　　】 " : ` 【${question.surface}】 `}
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
                let bg = t.surface;
                let border = t.paperBorder;
                let color = t.ink;
                if (picked !== null) {
                  if (isAns) {
                    bg = t.successSoft;
                    border = t.success;
                    color = t.matchaDark;
                  } else if (isPick) {
                    bg = t.errorSoft;
                    border = t.error;
                    color = t.error;
                  } else {
                    bg = t.paper;
                    color = t.inkMuted;
                  }
                }
                return (
                  <Pressable
                    key={opt}
                    disabled={picked !== null}
                    onPress={() => choose(opt)}
                    style={[styles.tile, { backgroundColor: bg, borderColor: border }]}
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

      {subMode === "arena" && question && picked !== null && (
        <View
          style={[
            styles.feedbackDock,
            {
              backgroundColor: isCorrect ? t.successSoft : t.errorSoft,
              borderTopColor: isCorrect ? t.success : t.error,
            },
          ]}
        >
          <View style={styles.dockTop}>
            <Text style={[styles.dockTitle, { color: isCorrect ? t.matchaDark : t.error }]}>
              {isCorrect ? `✓ 正確 · 「${question.correctLabel}」` : `✕ 正解 · 「${question.correctLabel}」`}
              {question.surface !== question.correctLabel ? `（${question.surface}）` : ""}
            </Text>
            <Text style={styles.dockBody} numberOfLines={2}>
              {question.tip}
            </Text>
          </View>
          <Pressable
            onPress={nextQuestion}
            style={[styles.dockBtn, { backgroundColor: isCorrect ? t.success : t.error }]}
          >
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
      borderRadius: 8,
      padding: 14,
      gap: 10,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    topHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
    topHeadLeft: { flex: 1, minWidth: 0 },
    heading: { fontSize: 15, fontWeight: "700", color: t.ink },
    sub: { fontSize: 11.5, color: t.inkSoft, marginTop: 2 },
    segmented: {
      flexDirection: "row",
      backgroundColor: t.surface,
      borderRadius: 6,
      padding: 2,
      borderWidth: 1,
      borderColor: t.paperBorder,
      flexShrink: 0,
    },
    segBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
    segBtnActive: { backgroundColor: t.ink },
    segText: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    segTextActive: { color: t.paper },
    groupRow: { gap: 6, paddingVertical: 2 },
    groupChip: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 4,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    groupChipActive: { backgroundColor: t.ink, borderColor: t.ink },
    groupChipText: { fontSize: 11.5, fontWeight: "700", color: t.inkSoft },
    groupChipTextActive: { color: t.paper },
    card: {
      backgroundColor: t.white,
      borderRadius: 10,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    levelCode: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
    groupLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: t.inkSoft },
    sentence: { fontFamily: t.serif, fontSize: 20, fontWeight: "700", color: t.ink, lineHeight: 32 },
    blankText: { fontWeight: "800" },
    reading: { fontSize: 12.5, color: t.inkSoft },
    zh: { fontSize: 13.5, color: t.inkSoft, lineHeight: 20, paddingTop: 4, borderTopWidth: 1, borderTopColor: t.paperBorder },
    choicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    tile: {
      width: "48.5%",
      borderRadius: 8,
      borderWidth: 1,
      paddingVertical: 13,
      paddingHorizontal: 10,
      alignItems: "center",
    },
    tileText: { fontSize: 15, fontWeight: "700", textAlign: "center" },
    headText: { flex: 1, minWidth: 0 },
    pairTitle: { fontFamily: t.serif, fontSize: 16, fontWeight: "700", color: t.ink },
    pairSub: { fontSize: 12, color: t.inkSoft, marginTop: 2 },
    columns: { gap: 10 },
    sideBox: {
      backgroundColor: t.surface,
      borderRadius: 8,
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
    dockBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 6 },
    dockBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  });
}
