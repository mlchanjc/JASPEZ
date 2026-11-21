import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ConjugationForm, ConjugationQuestion, LevelId } from "@/data/types";
import { generateConjugationQuestion, verbCountForLevel } from "@/lib/conjugator";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

const FORM_TABS: { id: ConjugationForm; label: string; prompt: string }[] = [
  { id: "te", label: "て形", prompt: "選出正確的「て形」" },
  { id: "nai", label: "ない形", prompt: "選出正確的「ない形（否定）」" },
  { id: "potential", label: "可能形", prompt: "選出正確的「可能形（能夠）」" },
  { id: "ta", label: "た形", prompt: "選出正確的「た形（過去）」" },
];

type Props = {
  levelFilter: LevelId | "ALL";
};

export function ConjugationDrill({ levelFilter }: Props) {
  const { prefs } = useProgress();
  const [form, setForm] = useState<ConjugationForm>("te");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [question, setQuestion] = useState<ConjugationQuestion | null>(() =>
    generateConjugationQuestion("te", levelFilter, []),
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const verbPoolCount = useMemo(() => verbCountForLevel(levelFilter), [levelFilter]);

  useEffect(() => {
    setRecentIds([]);
    setPicked(null);
    setQuestion(generateConjugationQuestion(form, levelFilter, []));
  }, [form, levelFilter]);

  if (!question) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>這個級別暫無動詞題庫</Text>
        <Text style={styles.emptyBody}>請切換至 N5、N4、N3 或「全部」開始動態活用練習。</Text>
      </View>
    );
  }

  const activeTab = FORM_TABS.find((t) => t.id === form) ?? FORM_TABS[0];
  const isCorrect = picked === question.answer;
  const accent = levelAccent[question.level];

  const choose = (opt: string) => {
    if (picked !== null) return;
    setPicked(opt);
    setTotalCount((n) => n + 1);
    if (opt === question.answer) setCorrectCount((n) => n + 1);
  };

  const nextVerb = () => {
    const nextRecent = [...recentIds.slice(-14), question.id];
    setRecentIds(nextRecent);
    setPicked(null);
    setQuestion(generateConjugationQuestion(form, levelFilter, nextRecent));
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topCard}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.heading}>動態動詞變化快刷</Text>
            <Text style={styles.sub}>即時由單字庫生成 · 本級共 {verbPoolCount} 個動詞</Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>
              {correctCount} / {totalCount}
            </Text>
          </View>
        </View>

        <View style={styles.formRow}>
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
            <Text style={styles.groupText}>{question.group}</Text>
          </View>
        </View>

        <View style={styles.verbBlock}>
          {prefs.showFurigana && <Text style={styles.rt}>{question.rt}</Text>}
          <Text style={styles.dict}>{question.dict}</Text>
          <Text style={styles.meaning}>{question.meaning}</Text>
        </View>

        <Text style={styles.prompt}>{activeTab.prompt}</Text>

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

        {picked !== null && (
          <View
            style={[
              styles.ruleBox,
              {
                backgroundColor: isCorrect ? theme.successSoft : theme.errorSoft,
                borderColor: isCorrect ? theme.success : theme.error,
              },
            ]}
          >
            <Text style={[styles.ruleTitle, { color: isCorrect ? theme.matchaDark : theme.error }]}>
              {isCorrect ? `正確！${question.dict} → ${question.answer}` : `正解：${question.dict} → ${question.answer}`}
            </Text>
            <Text style={styles.ruleBody}>{question.rule}</Text>
            <Pressable onPress={nextVerb} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>隨機下一題 →</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  topCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  heading: { fontSize: 17, fontWeight: "900", color: theme.ink },
  sub: { fontSize: 12, color: theme.inkSoft, marginTop: 2, fontWeight: "600" },
  scorePill: {
    backgroundColor: theme.indigoSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  scoreText: { fontSize: 13, fontWeight: "900", color: theme.indigo },
  formRow: { flexDirection: "row", gap: 6 },
  formChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    alignItems: "center",
  },
  formChipActive: { backgroundColor: theme.indigo, borderColor: theme.indigo },
  formChipText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  formChipTextActive: { color: "#fff" },
  drillCard: {
    backgroundColor: theme.white,
    borderRadius: 26,
    padding: 20,
    gap: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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
  dict: { fontSize: 34, fontWeight: "900", color: theme.ink },
  meaning: { fontSize: 15, fontWeight: "700", color: theme.inkSoft, marginTop: 2, textAlign: "center" },
  prompt: { fontSize: 13, fontWeight: "800", color: theme.indigo },
  choicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  choiceBtn: {
    width: "48%",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    alignItems: "center",
  },
  choiceText: { fontSize: 16, fontWeight: "800" },
  ruleBox: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  ruleTitle: { fontSize: 14, fontWeight: "900" },
  ruleBody: { fontSize: 13, color: theme.ink, lineHeight: 19 },
  nextBtn: {
    marginTop: 4,
    backgroundColor: theme.ink,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
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
