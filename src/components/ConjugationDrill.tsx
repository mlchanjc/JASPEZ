import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CONJUGATION_VERBS } from "@/data/grammar";
import type { ConjugationForm } from "@/data/types";
import { useProgress } from "@/state/progress";
import { theme } from "@/theme";

const FORM_TABS: { id: ConjugationForm; label: string; prompt: string }[] = [
  { id: "te", label: "て形", prompt: "請選出正確的「て形」" },
  { id: "nai", label: "ない形", prompt: "請選出正確的「ない形（否定）」" },
  { id: "potential", label: "可能形", prompt: "請選出正確的「可能形（能夠）」" },
  { id: "ta", label: "た形", prompt: "請選出正確的「た形（過去）」" },
];

export function ConjugationDrill() {
  const { prefs } = useProgress();
  const [form, setForm] = useState<ConjugationForm>("te");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const verb = CONJUGATION_VERBS[index % CONJUGATION_VERBS.length];
  const target = verb.forms[form];
  const activeTab = FORM_TABS.find((t) => t.id === form) ?? FORM_TABS[0];
  const isCorrect = picked === target.answer;

  const choose = (opt: string) => {
    if (picked !== null) return;
    setPicked(opt);
    setTotalCount((n) => n + 1);
    if (opt === target.answer) setCorrectCount((n) => n + 1);
  };

  const nextVerb = () => {
    setIndex((n) => n + 1);
    setPicked(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topCard}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.heading}>動詞變化快刷</Text>
            <Text style={styles.sub}>把基本活用練成反射動作</Text>
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
                onPress={() => {
                  setForm(tab.id);
                  setPicked(null);
                }}
                style={[styles.formChip, selected && styles.formChipActive]}
              >
                <Text style={[styles.formChipText, selected && styles.formChipTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.drillCard}>
        <View style={styles.groupBadge}>
          <Text style={styles.groupText}>{verb.group}</Text>
        </View>

        <View style={styles.verbBlock}>
          {prefs.showFurigana && <Text style={styles.rt}>{verb.rt}</Text>}
          <Text style={styles.dict}>{verb.dict}</Text>
          <Text style={styles.meaning}>{verb.meaning}</Text>
        </View>

        <Text style={styles.prompt}>{activeTab.prompt}</Text>

        <View style={styles.choicesGrid}>
          {target.choices.map((opt) => {
            let bg = theme.surface;
            let border = theme.paperBorder;
            let color = theme.ink;
            if (picked !== null) {
              if (opt === target.answer) {
                bg = theme.successSoft;
                border = theme.success;
                color = theme.success;
              } else if (opt === picked) {
                bg = theme.errorSoft;
                border = theme.error;
                color = theme.error;
              } else {
                color = theme.inkMuted;
              }
            }
            return (
              <Pressable
                key={opt}
                disabled={picked !== null}
                onPress={() => choose(opt)}
                style={[styles.choiceBtn, { backgroundColor: bg, borderColor: border }]}
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
            <Text style={[styles.ruleTitle, { color: isCorrect ? theme.success : theme.error }]}>
              {isCorrect ? `正確！${verb.dict} → ${target.answer}` : `正解：${verb.dict} → ${target.answer}`}
            </Text>
            <Text style={styles.ruleBody}>{target.rule}</Text>
            <Pressable onPress={nextVerb} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>下一個動詞 →</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  topCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { fontSize: 17, fontWeight: "900", color: theme.ink },
  sub: { fontSize: 12, color: theme.inkSoft, marginTop: 2 },
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
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    alignItems: "center",
  },
  formChipActive: { backgroundColor: theme.indigo, borderColor: theme.indigo },
  formChipText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  formChipTextActive: { color: "#fff" },
  drillCard: {
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  groupBadge: {
    backgroundColor: theme.goldSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  groupText: { fontSize: 12, fontWeight: "800", color: "#8A6520" },
  verbBlock: { alignItems: "center", gap: 2 },
  rt: { fontSize: 13, fontWeight: "700", color: theme.inkSoft },
  dict: { fontSize: 34, fontWeight: "900", color: theme.ink },
  meaning: { fontSize: 15, fontWeight: "700", color: theme.inkSoft, marginTop: 2 },
  prompt: { fontSize: 13, fontWeight: "800", color: theme.indigo },
  choicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  choiceBtn: {
    width: "48%",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  choiceText: { fontSize: 16, fontWeight: "800" },
  ruleBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  ruleTitle: { fontSize: 14, fontWeight: "900" },
  ruleBody: { fontSize: 13, color: theme.ink, lineHeight: 19 },
  nextBtn: {
    marginTop: 4,
    backgroundColor: theme.ink,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
