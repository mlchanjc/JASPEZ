import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ClassicalForm, LevelId, PatternDrillQuestion } from "@/data/types";
import { generateClassicalVerbDrill, lexiconCount } from "@/lib/conjugator";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

const FORM_TABS: { id: ClassicalForm; label: string }[] = [
  { id: "mizen_nai", label: "未然形＋ない" },
  { id: "renyou_tai", label: "連用形＋たい" },
  { id: "renyou_te", label: "連用音便＋て" },
  { id: "renyou_ta", label: "連用音便＋た" },
  { id: "katei_ba", label: "假定形＋ば" },
  { id: "meirei", label: "命令形" },
];

type Props = {
  levelFilter: LevelId | "ALL";
};

export function ConjugationDrill({ levelFilter }: Props) {
  const { prefs } = useProgress();
  const [form, setForm] = useState<ClassicalForm>("katei_ba");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [question, setQuestion] = useState<PatternDrillQuestion | null>(() =>
    generateClassicalVerbDrill("katei_ba", levelFilter, []),
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const verbPoolCount = useMemo(() => lexiconCount(levelFilter, ["V"]), [levelFilter]);

  useEffect(() => {
    setRecentIds([]);
    setPicked(null);
    setQuestion(generateClassicalVerbDrill(form, levelFilter, []));
  }, [form, levelFilter]);

  if (!question) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>這個級別暫無動詞題庫</Text>
        <Text style={styles.emptyBody}>請切換至 N5、N4、N3 或「全部」開始國文法活用練習。</Text>
      </View>
    );
  }

  const isCorrect = picked === question.answer;
  const accent = levelAccent[question.level];

  const choose = (opt: string) => {
    if (picked !== null) return;
    setPicked(opt);
    setTotalCount((n) => n + 1);
    if (opt === question.answer) setCorrectCount((n) => n + 1);
  };

  const nextVerb = () => {
    const nextRecent = [...recentIds.slice(-16), question.id];
    setRecentIds(nextRecent);
    setPicked(null);
    setQuestion(generateClassicalVerbDrill(form, levelFilter, nextRecent));
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroller} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.heading}>國文法・六大活用特訓</Text>
              <Text style={styles.sub}>依學校國文法分類 · 本級共 {verbPoolCount} 個動詞</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>
                {correctCount} / {totalCount}
              </Text>
            </View>
          </View>

          <View style={styles.formGrid}>
            {FORM_TABS.map((tab) => {
              const selected = tab.id === form;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setForm(tab.id)}
                  style={[styles.formChip, selected && styles.formChipActive]}
                >
                  <Text style={[styles.formChipText, selected && styles.formChipTextActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.drillCard}>
          <View style={styles.badges}>
            <View style={[styles.levelBadge, { backgroundColor: accent }]}>
              <Text style={styles.levelBadgeText}>{question.level}</Text>
            </View>
            <View style={styles.groupBadge}>
              <Text style={styles.groupText}>{question.posLabel}</Text>
            </View>
          </View>

          <View style={styles.verbBlock}>
            {prefs.showFurigana && <Text style={styles.rt}>{question.rt}</Text>}
            <Text style={styles.dict}>{question.dict}</Text>
            <Text style={styles.meaning}>{question.meaning}</Text>
          </View>

          <Text style={styles.prompt}>{question.promptLabel}</Text>

          <View style={styles.choicesGrid}>
            {question.choices.map((opt) => {
              let bg = theme.white;
              let border = theme.paperBorder;
              let bottom = "#CBD5E1";
              let color = theme.ink;
              if (picked !== null) {
                if (opt === question.answer) {
                  bg = theme.successSoft;
                  border = theme.success;
                  bottom = theme.matchaDark;
                  color = theme.matchaDark;
                } else if (opt === picked) {
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
                  style={[styles.choiceBtn, { backgroundColor: bg, borderColor: border, borderBottomColor: bottom }]}
                >
                  <Text style={[styles.choiceText, { color }]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* PINNED ZERO-SCROLL FEEDBACK BAR */}
      {picked !== null && (
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
              {isCorrect ? `✓ 正確！${question.dict} → ${question.answer}` : `✕ 正解：${question.dict} → ${question.answer}`}
            </Text>
            <Text style={styles.dockBody} numberOfLines={2}>
              {question.rule}
            </Text>
          </View>
          <Pressable
            onPress={nextVerb}
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  heading: { fontSize: 16, fontWeight: "900", color: theme.ink },
  sub: { fontSize: 12, color: theme.inkSoft, marginTop: 2, fontWeight: "600" },
  scorePill: {
    backgroundColor: theme.indigoSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  scoreText: { fontSize: 13, fontWeight: "900", color: theme.indigo },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  formChip: {
    width: "31.5%",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    alignItems: "center",
  },
  formChipActive: { backgroundColor: theme.indigo, borderColor: theme.indigo },
  formChipText: { fontSize: 11, fontWeight: "800", color: theme.inkSoft },
  formChipTextActive: { color: "#fff" },
  drillCard: {
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 18,
    gap: 14,
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
  verbBlock: { alignItems: "center", gap: 2 },
  rt: { fontSize: 13, fontWeight: "700", color: theme.inkSoft },
  dict: { fontSize: 32, fontWeight: "900", color: theme.ink },
  meaning: { fontSize: 14, fontWeight: "700", color: theme.inkSoft, marginTop: 2, textAlign: "center" },
  prompt: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.indigo,
    backgroundColor: theme.indigoSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  choicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  choiceBtn: {
    width: "48%",
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    alignItems: "center",
  },
  choiceText: { fontSize: 16, fontWeight: "800" },
  feedbackDock: {
    borderTopWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  dockTop: { gap: 3 },
  dockTitle: { fontSize: 15, fontWeight: "900" },
  dockBody: { fontSize: 12, color: theme.ink, lineHeight: 18, fontWeight: "600" },
  dockBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  dockBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  emptyCard: {
    margin: 20,
    padding: 24,
    borderRadius: 24,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    gap: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: theme.ink },
  emptyBody: { fontSize: 13, color: theme.inkSoft },
});
