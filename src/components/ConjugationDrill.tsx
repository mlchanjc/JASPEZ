import { QuestionTransition } from "@/components/Motion";
import { TactileChoiceButton } from "@/components/TactileChoiceButton";
import type { ChoiceVisualState } from "@/components/TactileChoiceButton";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ClassicalForm, LevelId, PatternDrillQuestion } from "@/data/types";
import { generateClassicalVerbDrill, lexiconCount } from "@/lib/conjugator";
import { RubyText } from "@/components/RubyText";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

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
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
            <View style={styles.topLeft}>
              <Text style={styles.heading}>國文法 · 六大活用</Text>
              <Text style={styles.sub}>依學校國文法分類 · 本級共 {verbPoolCount} 個動詞</Text>
            </View>
            <Text style={styles.scoreText}>
              {correctCount} / {totalCount}
            </Text>
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

        <QuestionTransition triggerKey={`${question.dict}-${form}-${recentIds.length}`} style={styles.drillCard}>
          <View style={styles.badges}>
            <Text style={[styles.levelText, { color: accent }]}>{question.level}</Text>
            <Text style={styles.groupText}>{question.posLabel}</Text>
          </View>

          <View style={styles.verbBlock}>
            <RubyText
              jp={question.dict}
              reading={question.rt}
              showRuby={prefs.showFurigana}
              fontSize={30}
              rtFontSize={11.5}
              align="center"
            />
            <Text style={styles.meaning}>{question.meaning}</Text>
          </View>

          <View style={styles.promptRule}>
            <Text style={styles.prompt}>{question.promptLabel}</Text>
          </View>

          <View style={styles.choicesGrid}>
            {question.choices.map((opt) => {
              let color = t.ink;
              let choiceState: ChoiceVisualState = "idle";
              if (picked !== null) {
                if (opt === question.answer) {
                  color = t.matchaDark;
                  choiceState = "correct";
                } else if (opt === picked) {
                  color = t.error;
                  choiceState = "wrong";
                } else {
                  color = t.inkMuted;
                  choiceState = "muted";
                }
              }
              return (
                <TactileChoiceButton
                  key={opt}
                  disabled={picked !== null}
                  state={choiceState}
                  onPress={() => choose(opt)}
                >
                  <Text style={[styles.choiceText, { color }]}>{opt}</Text>
                </TactileChoiceButton>
              );
            })}
          </View>
        </QuestionTransition>
      </ScrollView>

      {picked !== null && (
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
              {isCorrect ? `✓ 正確 · ${question.dict} → ${question.answer}` : `✕ 正解 · ${question.dict} → ${question.answer}`}
            </Text>
            <Text style={styles.dockBody} numberOfLines={2}>
              {question.rule}
            </Text>
          </View>
          <Pressable
            onPress={nextVerb}
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
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    topLeft: { flex: 1, minWidth: 0 },
    heading: { fontSize: 15, fontWeight: "700", color: t.ink },
    sub: { fontSize: 11.5, color: t.inkSoft, marginTop: 2 },
    scoreText: { fontSize: 13, fontWeight: "700", color: t.ink },
    formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    formChip: {
      width: "31.5%",
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 6,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
      alignItems: "center",
    },
    formChipActive: { backgroundColor: t.ink, borderColor: t.ink },
    formChipText: { fontSize: 11, fontWeight: "700", color: t.inkSoft },
    formChipTextActive: { color: t.paper },
    drillCard: {
      backgroundColor: t.white,
      borderRadius: 10,
      padding: 18,
      gap: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    badges: { flexDirection: "row", alignItems: "center", gap: 10 },
    levelText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
    groupText: {
      fontSize: 11.5,
      fontWeight: "700",
      color: t.goldDark,
      backgroundColor: t.goldSoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    verbBlock: { alignItems: "center", gap: 2 },
    rt: { fontSize: 13, fontWeight: "600", color: t.inkSoft },
    dict: { fontFamily: t.serif, fontSize: 32, fontWeight: "700", color: t.ink },
    meaning: { fontSize: 14, fontWeight: "600", color: t.inkSoft, marginTop: 2, textAlign: "center" },
    promptRule: {
      borderLeftWidth: 2,
      borderLeftColor: t.vermillion,
      paddingLeft: 10,
      paddingVertical: 2,
    },
    prompt: { fontSize: 13, fontWeight: "700", color: t.ink },
    choicesGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 8 },
    choiceBtn: {
      width: "48.5%",
      borderRadius: 8,
      borderWidth: 1,
      paddingVertical: 14,
      paddingHorizontal: 10,
      alignItems: "center",
    },
    choiceText: { fontSize: 15, fontWeight: "700", textAlign: "center" },
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
    emptyCard: {
      margin: 18,
      backgroundColor: t.white,
      borderRadius: 8,
      padding: 24,
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: t.ink },
    emptyBody: { fontSize: 13, color: t.inkSoft, textAlign: "center", lineHeight: 20 },
  });
}
