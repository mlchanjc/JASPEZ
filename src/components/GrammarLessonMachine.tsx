import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FuriganaSentence } from "@/components/FuriganaSentence";
import { ProficiencyMeter } from "@/components/ProficiencyMeter";
import type { GrammarPoint, PatternDrillQuestion } from "@/data/types";
import { generatePatternDrill, lexiconCount } from "@/lib/conjugator";
import { isCorrectGrammarAnswer } from "@/lib/grammar";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

type Props = {
  lesson: GrammarPoint;
  onBack: () => void;
};

function normalizeInput(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[\s・･？?。、]/g, "");
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function GrammarLessonMachine({ lesson, onBack }: Props) {
  const {
    prefs,
    grammarNotes,
    setGrammarNote,
    getGrammarProficiency,
    setGrammarProficiency,
    markGrammarLearned,
    recordGrammarAttempt,
    addGhostGrammar,
    clearGhostGrammar,
  } = useProgress();

  const [mode, setMode] = useState<"machine" | "cloze" | "rule">("machine");
  const [inputMode, setInputMode] = useState<"tiles" | "type">("tiles");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [drill, setDrill] = useState<PatternDrillQuestion | null>(() =>
    generatePatternDrill(lesson.patternRuleId, lesson.allowedPos, lesson.level, []),
  );
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);

  // Cloze state
  const [exampleIdx, setExampleIdx] = useState(0);
  const [clozePicked, setClozePicked] = useState<string | null>(null);
  const [clozeCorrect, setClozeCorrect] = useState(false);

  const poolSize = useMemo(() => lexiconCount("ALL", lesson.allowedPos), [lesson.allowedPos]);
  const accent = levelAccent[lesson.level];
  const prof = getGrammarProficiency(lesson.id);

  useEffect(() => {
    setRecentIds([]);
    setPicked(null);
    setTyped("");
    setDrill(generatePatternDrill(lesson.patternRuleId, lesson.allowedPos, lesson.level, []));
    setExampleIdx(0);
    setClozePicked(null);
  }, [lesson.id]);

  const currentExample = lesson.examples[exampleIdx % lesson.examples.length];
  const variant = currentExample[prefs.register];
  const clozeChoices = useMemo(() => shuffle(variant.choices), [currentExample.id, prefs.register]);

  const submitDrill = (raw: string) => {
    if (!drill || picked !== null) return;
    const cleaned = raw.trim();
    if (!cleaned) return;
    const ok = drill.accepted.some((a) => normalizeInput(a) === normalizeInput(cleaned));
    setPicked(cleaned);
    setIsCorrect(ok);
    setTotal((n) => n + 1);
    if (ok) {
      setStreak((n) => n + 1);
      markGrammarLearned(lesson.id);
      clearGhostGrammar(lesson.id);
    } else {
      setStreak(0);
      addGhostGrammar(lesson.id);
    }
    recordGrammarAttempt(lesson.id, ok);
  };

  const nextDrill = () => {
    const nextRecent = drill ? [...recentIds.slice(-16), drill.id] : recentIds;
    setRecentIds(nextRecent);
    setPicked(null);
    setTyped("");
    setDrill(generatePatternDrill(lesson.patternRuleId, lesson.allowedPos, "ALL", nextRecent));
  };

  const submitCloze = (choice: string) => {
    if (clozePicked !== null) return;
    const ok = isCorrectGrammarAnswer(variant, choice);
    setClozePicked(choice);
    setClozeCorrect(ok);
    if (ok) {
      markGrammarLearned(lesson.id);
      clearGhostGrammar(lesson.id);
    } else {
      addGhostGrammar(lesson.id);
    }
    recordGrammarAttempt(lesson.id, ok);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Lesson Header Card */}
      <View style={styles.lessonHeader}>
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backChip}>
            <Text style={styles.backChipText}>← 所有文法課</Text>
          </Pressable>
          <View style={[styles.levelPill, { backgroundColor: accent }]}>
            <Text style={styles.levelPillText}>{lesson.sigureCode}</Text>
          </View>
        </View>
        <Text style={styles.patternTitle}>{lesson.pattern}</Text>
        <Text style={styles.patternMeaning}>{lesson.meaning}</Text>
        <View style={styles.formulaBanner}>
          <Text style={styles.formulaLabel}>文法接續（國文法）</Text>
          <Text style={styles.formulaValue}>{lesson.formation}</Text>
        </View>

        {/* Sub-mode Switcher */}
        <View style={styles.subTabs}>
          <Pressable
            onPress={() => setMode("machine")}
            style={[styles.subTab, mode === "machine" && { backgroundColor: accent }]}
          >
            <Text style={[styles.subTabText, mode === "machine" && { color: "#fff" }]}>⚡ 活用練功機</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("cloze")}
            style={[styles.subTab, mode === "cloze" && { backgroundColor: accent }]}
          >
            <Text style={[styles.subTabText, mode === "cloze" && { color: "#fff" }]}>📝 例句填空</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("rule")}
            style={[styles.subTab, mode === "rule" && { backgroundColor: accent }]}
          >
            <Text style={[styles.subTabText, mode === "rule" && { color: "#fff" }]}>📖 規則筆記</Text>
          </Pressable>
        </View>
      </View>

      {/* MODE 1: UNLIMITED PATTERN PRACTICE MACHINE */}
      {mode === "machine" && drill && (
        <View style={styles.card}>
          <View style={styles.machineTop}>
            <View style={styles.posBadge}>
              <Text style={styles.posBadgeText}>{drill.posLabel}</Text>
            </View>
            <Text style={styles.poolInfo}>
              可用詞庫 {poolSize} 詞 · 連對 {streak}（共 {total} 題）
            </Text>
          </View>

          <View style={styles.wordHero}>
            {prefs.showFurigana && <Text style={styles.wordRt}>{drill.rt}</Text>}
            <Text style={styles.wordDict}>{drill.dict}</Text>
            <Text style={styles.wordMeaning}>{drill.meaning}</Text>
          </View>

          <Text style={styles.promptBanner}>{drill.promptLabel}</Text>

          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>練習方式</Text>
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
              {drill.choices.map((opt) => {
                const isAns = opt === drill.answer;
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
                    onPress={() => submitDrill(opt)}
                    style={[styles.tile, { backgroundColor: bg, borderColor: border, borderBottomColor: bottom }]}
                  >
                    <Text style={[styles.tileText, { color }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.typeRow}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                editable={picked === null}
                placeholder="輸入活用後的結果…"
                placeholderTextColor={theme.inkMuted}
                onSubmitEditing={() => submitDrill(typed)}
                style={styles.textInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                disabled={picked !== null}
                onPress={() => submitDrill(typed)}
                style={[styles.submitBtn, { backgroundColor: picked !== null ? theme.inkMuted : theme.indigo }]}
              >
                <Text style={styles.submitBtnText}>送出</Text>
              </Pressable>
            </View>
          )}

          {picked !== null && (
            <View
              style={[
                styles.feedback,
                {
                  backgroundColor: isCorrect ? theme.successSoft : theme.errorSoft,
                  borderColor: isCorrect ? theme.success : theme.error,
                },
              ]}
            >
              <Text style={[styles.feedbackTitle, { color: isCorrect ? theme.matchaDark : theme.error }]}>
                {isCorrect
                  ? `正確！${drill.dict} → ${drill.answer}`
                  : `正解：${drill.accepted.join(" ／ ")}`}
              </Text>
              <Text style={styles.feedbackBody}>{drill.rule}</Text>
              <Pressable onPress={nextDrill} style={[styles.nextBtn, { backgroundColor: accent }]}>
                <Text style={styles.nextBtnText}>隨機抽下一詞 →</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* MODE 2: CONTEXT CLOZE */}
      {mode === "cloze" && (
        <View style={styles.card}>
          <View style={styles.machineTop}>
            <Text style={styles.poolInfo}>
              例句情境 {(exampleIdx % lesson.examples.length) + 1} / {lesson.examples.length}
            </Text>
            {lesson.examples.length > 1 && (
              <Pressable
                onPress={() => {
                  setExampleIdx((n) => (n + 1) % lesson.examples.length);
                  setClozePicked(null);
                }}
                style={styles.cycleBtn}
              >
                <Text style={styles.cycleBtnText}>換一題情境 ↻</Text>
              </Pressable>
            )}
          </View>

          <FuriganaSentence
            key={`${currentExample.id}-${prefs.register}`}
            tokens={variant.tokens}
            showFurigana={prefs.showFurigana}
            blankText={clozePicked ?? undefined}
            blankStatus={clozePicked === null ? "idle" : clozeCorrect ? "correct" : "wrong"}
            accentColor={accent}
          />
          <Text style={styles.translation}>{variant.translation}</Text>

          <View style={styles.tilesGrid}>
            {clozeChoices.map((opt) => {
              const isAns = opt === variant.answer;
              const isPick = opt === clozePicked;
              let bg = theme.white;
              let border = theme.paperBorder;
              let bottom = "#CBD5E1";
              let color = theme.ink;
              if (clozePicked !== null) {
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
                  disabled={clozePicked !== null}
                  onPress={() => submitCloze(opt)}
                  style={[styles.tile, { backgroundColor: bg, borderColor: border, borderBottomColor: bottom }]}
                >
                  <Text style={[styles.tileText, { color }]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>

          {clozePicked !== null && (
            <View
              style={[
                styles.feedback,
                {
                  backgroundColor: clozeCorrect ? theme.successSoft : theme.errorSoft,
                  borderColor: clozeCorrect ? theme.success : theme.error,
                },
              ]}
            >
              <Text style={[styles.feedbackTitle, { color: clozeCorrect ? theme.matchaDark : theme.error }]}>
                {clozeCorrect ? "答對了！" : `正解：${variant.answer}`}
              </Text>
              <Text style={styles.feedbackBody}>
                {!clozeCorrect && variant.wrongHints[clozePicked]
                  ? variant.wrongHints[clozePicked]
                  : lesson.nuance}
              </Text>
              <Pressable
                onPress={() => {
                  setExampleIdx((n) => (n + 1) % lesson.examples.length);
                  setClozePicked(null);
                }}
                style={[styles.nextBtn, { backgroundColor: accent }]}
              >
                <Text style={styles.nextBtnText}>下一個例句 →</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* MODE 3: RULE & PERSONAL NOTES */}
      {mode === "rule" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>語感與文法重點</Text>
          <Text style={styles.nuanceText}>{lesson.nuance}</Text>

          <View style={styles.profWrap}>
            <Text style={styles.sectionTitle}>熟練度</Text>
            <ProficiencyMeter value={prof} />
            <View style={styles.profBtns}>
              {PROFICIENCY_LEVELS.map((label, idx) => (
                <Pressable
                  key={label}
                  onPress={() => setGrammarProficiency(lesson.id, idx)}
                  style={[
                    styles.profBtn,
                    prof === idx && { backgroundColor: theme.indigo, borderColor: theme.indigo },
                  ]}
                >
                  <Text style={[styles.profBtnText, prof === idx && { color: "#fff" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.noteWrap}>
            <Text style={styles.sectionTitle}>個人筆記（自動儲存）</Text>
            <TextInput
              value={grammarNotes[lesson.id] ?? ""}
              onChangeText={(text) => setGrammarNote(lesson.id, text)}
              placeholder="記錄時雨課堂重點或自己的造句…"
              placeholderTextColor={theme.inkMuted}
              style={styles.noteInput}
              multiline
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  lessonHeader: {
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backChip: {
    backgroundColor: theme.surface,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  backChipText: { fontSize: 12, fontWeight: "800", color: theme.ink },
  levelPill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99 },
  levelPillText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  patternTitle: { fontSize: 22, fontWeight: "900", color: theme.ink },
  patternMeaning: { fontSize: 14, fontWeight: "700", color: theme.inkSoft },
  formulaBanner: {
    backgroundColor: theme.indigoSoft,
    borderRadius: 14,
    padding: 12,
    gap: 3,
  },
  formulaLabel: { fontSize: 11, fontWeight: "800", color: theme.indigo },
  formulaValue: { fontSize: 14, fontWeight: "900", color: theme.ink, lineHeight: 20 },
  subTabs: {
    flexDirection: "row",
    backgroundColor: theme.paper,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  subTab: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  subTabText: { fontSize: 12, fontWeight: "900", color: theme.inkSoft },
  card: {
    backgroundColor: theme.white,
    borderRadius: 26,
    padding: 20,
    gap: 15,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  machineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  posBadge: { backgroundColor: theme.goldSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  posBadgeText: { fontSize: 12, fontWeight: "900", color: theme.goldDark },
  poolInfo: { fontSize: 12, fontWeight: "700", color: theme.inkMuted },
  wordHero: { alignItems: "center", paddingVertical: 8, gap: 2 },
  wordRt: { fontSize: 13, fontWeight: "700", color: theme.inkSoft },
  wordDict: { fontSize: 34, fontWeight: "900", color: theme.ink },
  wordMeaning: { fontSize: 14, fontWeight: "700", color: theme.inkSoft, marginTop: 2, textAlign: "center" },
  promptBanner: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
    color: theme.indigo,
    backgroundColor: theme.indigoSoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modeLabel: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  segmented: { flexDirection: "row", backgroundColor: theme.paper, borderRadius: 11, padding: 3, gap: 2 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
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
  submitBtn: { paddingHorizontal: 18, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  feedback: { borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 8 },
  feedbackTitle: { fontSize: 15, fontWeight: "900" },
  feedbackBody: { fontSize: 13, color: theme.ink, lineHeight: 20 },
  nextBtn: { marginTop: 4, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  nextBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  cycleBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  cycleBtnText: { fontSize: 12, fontWeight: "800", color: theme.indigo },
  translation: { fontSize: 15, color: theme.inkSoft, fontWeight: "600", lineHeight: 22 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: theme.ink },
  nuanceText: { fontSize: 14, color: theme.inkSoft, lineHeight: 22 },
  profWrap: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.paperBorder },
  profBtns: { flexDirection: "row", gap: 6 },
  profBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    backgroundColor: theme.surface,
    alignItems: "center",
  },
  profBtnText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  noteWrap: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.paperBorder },
  noteInput: {
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.ink,
    minHeight: 72,
    textAlignVertical: "top",
  },
});
