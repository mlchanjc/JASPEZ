import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProficiencyMeter } from "@/components/ProficiencyMeter";
import { grammarLessonKey } from "@/data/grammarRegistry";
import type { PatternDrillQuestion, GrammarLesson } from "@/data/types";
import {
  generateLessonCloze,
  generateLessonPatternDrill,
  lessonAllowedPos,
  lexiconCount,
} from "@/lib/conjugator";
import { lessonExamples } from "@/lib/grammar";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

type Props = {
  lesson: GrammarLesson;
  onBack: () => void;
};

function normalizeInput(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[\s・･？?。、]/g, "");
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
  const insets = useSafeAreaInsets();

  const key = grammarLessonKey(lesson.level, lesson.id);
  const accent = levelAccent[lesson.level];
  const prof = getGrammarProficiency(key);

  const allowedPos = useMemo(() => lessonAllowedPos(lesson), [lesson]);
  const examples = useMemo(() => lessonExamples(lesson), [lesson]);
  const hasMachine = allowedPos.length > 0;
  const firstCloze = useMemo(() => generateLessonCloze(lesson, 0), [lesson]);
  const hasCloze = firstCloze !== null;

  const defaultMode: "machine" | "cloze" | "study" = hasMachine ? "machine" : hasCloze ? "cloze" : "study";
  const [mode, setMode] = useState<"machine" | "cloze" | "study">(defaultMode);
  const [inputMode, setInputMode] = useState<"tiles" | "type">("tiles");

  // Pattern machine state
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [drill, setDrill] = useState<PatternDrillQuestion | null>(() =>
    hasMachine ? generateLessonPatternDrill(lesson, []) : null,
  );
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);

  // Real-example Cloze state
  const [exampleIdx, setExampleIdx] = useState(0);
  const [clozePicked, setClozePicked] = useState<string | null>(null);

  const poolSize = useMemo(
    () => (allowedPos.length > 0 ? lexiconCount("ALL", allowedPos) : 0),
    [allowedPos],
  );

  const activeCloze = useMemo(() => {
    if (!hasCloze) return null;
    for (let offset = 0; offset < examples.length; offset += 1) {
      const q = generateLessonCloze(lesson, exampleIdx + offset);
      if (q) return q;
    }
    return null;
  }, [examples.length, exampleIdx, hasCloze, lesson]);

  useEffect(() => {
    const nextDefault = hasMachine ? "machine" : hasCloze ? "cloze" : "study";
    setMode(nextDefault);
    setRecentIds([]);
    setPicked(null);
    setTyped("");
    setStreak(0);
    setTotal(0);
    setDrill(hasMachine ? generateLessonPatternDrill(lesson, []) : null);
    setExampleIdx(0);
    setClozePicked(null);
  }, [hasCloze, hasMachine, lesson]);

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
      markGrammarLearned(key);
      clearGhostGrammar(key);
    } else {
      setStreak(0);
      addGhostGrammar(key);
    }
    recordGrammarAttempt(key, ok);
  };

  const nextDrill = () => {
    const nextRecent = drill ? [...recentIds.slice(-16), drill.id] : recentIds;
    setRecentIds(nextRecent);
    setPicked(null);
    setTyped("");
    setDrill(generateLessonPatternDrill(lesson, nextRecent));
  };

  const submitCloze = (choice: string) => {
    if (!activeCloze || clozePicked !== null) return;
    const ok = choice === activeCloze.answer;
    setClozePicked(choice);
    if (ok) {
      markGrammarLearned(key);
      clearGhostGrammar(key);
    } else {
      addGhostGrammar(key);
    }
    recordGrammarAttempt(key, ok);
  };

  const nextCloze = () => {
    setExampleIdx((n) => (n + 1) % Math.max(1, examples.length));
    setClozePicked(null);
  };

  const showDrillSheet = mode === "machine" && drill && picked !== null;
  const showClozeSheet = mode === "cloze" && activeCloze && clozePicked !== null;
  const hasBottomSheet = Boolean(showDrillSheet || showClozeSheet);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: hasBottomSheet ? 24 : 36 }]}
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
              <Text style={styles.levelPillText}>
                {lesson.level} 文法 {lesson.id}
              </Text>
            </View>
          </View>

          <Text style={styles.patternTitle}>{lesson.title}</Text>
          {lesson.pattern ? (
            <View style={styles.formulaBanner}>
              <Text style={styles.formulaLabel}>文法接續（國文法）</Text>
              <Text style={styles.formulaValue}>{lesson.pattern}</Text>
            </View>
          ) : null}

          {/* Sub-mode Switcher */}
          <View style={styles.subTabs}>
            {hasMachine && (
              <Pressable
                onPress={() => setMode("machine")}
                style={[styles.subTab, mode === "machine" && { backgroundColor: accent }]}
              >
                <Text style={[styles.subTabText, mode === "machine" && { color: "#fff" }]}>⚡ 活用練功</Text>
              </Pressable>
            )}
            {hasCloze && (
              <Pressable
                onPress={() => setMode("cloze")}
                style={[styles.subTab, mode === "cloze" && { backgroundColor: accent }]}
              >
                <Text style={[styles.subTabText, mode === "cloze" && { color: "#fff" }]}>📝 例句填空</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setMode("study")}
              style={[styles.subTab, mode === "study" && { backgroundColor: accent }]}
            >
              <Text style={[styles.subTabText, mode === "study" && { color: "#fff" }]}>📖 課文筆記</Text>
            </Pressable>
          </View>
        </View>

        {/* MODE 1: UNLIMITED 4-POS PATTERN MACHINE */}
        {mode === "machine" && drill && (
          <View style={styles.card}>
            <View style={styles.machineTop}>
              <View style={styles.posBadge}>
                <Text style={styles.posBadgeText}>{drill.posLabel}</Text>
              </View>
              <Text style={styles.poolInfo}>
                詞庫 {poolSize} 詞 · 連對 {streak}（共 {total} 題）
              </Text>
            </View>

            <View style={styles.wordHero}>
              {prefs.showFurigana && <Text style={styles.wordRt}>{drill.rt}</Text>}
              <Text style={styles.wordDict}>{drill.dict}</Text>
              {drill.meaning ? <Text style={styles.wordMeaning}>{drill.meaning}</Text> : null}
            </View>

            <Text style={styles.promptBanner}>{drill.promptLabel}</Text>

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
                  placeholder="輸入活用結果…"
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
          </View>
        )}

        {/* MODE 2: EXAMPLE CLOZE */}
        {mode === "cloze" && activeCloze && (
          <View style={styles.card}>
            <View style={styles.machineTop}>
              <Text style={styles.poolInfo}>
                例句 {(exampleIdx % examples.length) + 1} / {examples.length}
              </Text>
              {examples.length > 1 && (
                <Pressable onPress={nextCloze} style={styles.cycleBtn}>
                  <Text style={styles.cycleBtnText}>換一句 ↻</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.clozeSentence}>
              {activeCloze.before}
              <Text
                style={[
                  styles.clozeBlankText,
                  {
                    color:
                      clozePicked === null
                        ? accent
                        : clozePicked === activeCloze.answer
                          ? theme.matchaDark
                          : theme.error,
                  },
                ]}
              >
                {clozePicked === null ? " 【　　】 " : ` 【${clozePicked}】 `}
              </Text>
              {activeCloze.after}
            </Text>

            {prefs.showFurigana && activeCloze.reading ? (
              <Text style={styles.clozeReading}>
                {clozePicked !== null ? activeCloze.reading : "（作答後顯示假名讀音）"}
              </Text>
            ) : null}

            {activeCloze.zh ? <Text style={styles.translation}>{activeCloze.zh}</Text> : null}

            <View style={styles.tilesGrid}>
              {activeCloze.choices.map((opt) => {
                const isAns = opt === activeCloze.answer;
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
          </View>
        )}

        {/* MODE 3: LESSON NOTES, EXAMPLES & PERSONAL NOTE */}
        {mode === "study" && (
          <View style={styles.studyWrap}>
            {lesson.connection.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>國文法接續規則</Text>
                {lesson.connection.map((line, i) => (
                  <Text key={i} style={styles.connItem}>
                    • {line}
                  </Text>
                ))}
              </View>
            )}

            {lesson.sections.map((sec, idx) => (
              <View key={`${sec.heading}-${idx}`} style={styles.card}>
                <Text style={styles.sectionTitle}>{sec.heading}</Text>
                {sec.pattern ? (
                  <View style={styles.subFormula}>
                    <Text style={styles.subFormulaText}>{sec.pattern}</Text>
                  </View>
                ) : null}
                {(sec.notes ?? []).map((note, nIdx) => (
                  <Text key={nIdx} style={styles.nuanceText}>
                    {note}
                  </Text>
                ))}
                {(sec.examples ?? []).map((ex, eIdx) => (
                  <View key={eIdx} style={styles.exampleItem}>
                    <Text style={styles.exampleJa}>{ex.ja}</Text>
                    {prefs.showFurigana && ex.reading ? (
                      <Text style={styles.exampleReading}>{ex.reading}</Text>
                    ) : null}
                    {ex.zh ? <Text style={styles.exampleZh}>{ex.zh}</Text> : null}
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>熟練度與個人筆記</Text>
              <ProficiencyMeter value={prof} />
              <View style={styles.profBtns}>
                {PROFICIENCY_LEVELS.map((label, idx) => (
                  <Pressable
                    key={label}
                    onPress={() => setGrammarProficiency(key, idx)}
                    style={[
                      styles.profBtn,
                      prof === idx && { backgroundColor: theme.indigo, borderColor: theme.indigo },
                    ]}
                  >
                    <Text style={[styles.profBtnText, prof === idx && { color: "#fff" }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={grammarNotes[key] ?? ""}
                onChangeText={(text) => setGrammarNote(key, text)}
                placeholder="記錄自己的記憶重點或例句…"
                placeholderTextColor={theme.inkMuted}
                style={styles.noteInput}
                multiline
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* PINNED ZERO-SCROLL FEEDBACK BAR (Pattern Machine) */}
      {showDrillSheet && (
        <View
          style={[
            styles.feedbackDock,
            {
              paddingBottom: Math.max(insets.bottom, 14),
              backgroundColor: isCorrect ? "#ECFDF5" : "#FFF1F2",
              borderTopColor: isCorrect ? theme.success : theme.error,
            },
          ]}
        >
          <View style={styles.dockTop}>
            <Text style={[styles.dockTitle, { color: isCorrect ? theme.matchaDark : theme.error }]}>
              {isCorrect ? `✓ 正確！${drill.dict} → ${drill.answer}` : `✕ 正解：${drill.accepted.join(" ／ ")}`}
            </Text>
            <Text style={styles.dockBody} numberOfLines={2}>
              {drill.rule}
            </Text>
          </View>
          <Pressable
            onPress={nextDrill}
            style={[styles.dockBtn, { backgroundColor: isCorrect ? theme.success : theme.error }]}
          >
            <Text style={styles.dockBtnText}>下一題 →</Text>
          </Pressable>
        </View>
      )}

      {/* PINNED ZERO-SCROLL FEEDBACK BAR (Cloze) */}
      {showClozeSheet && (
        <View
          style={[
            styles.feedbackDock,
            {
              paddingBottom: Math.max(insets.bottom, 14),
              backgroundColor: clozePicked === activeCloze.answer ? "#ECFDF5" : "#FFF1F2",
              borderTopColor: clozePicked === activeCloze.answer ? theme.success : theme.error,
            },
          ]}
        >
          <View style={styles.dockTop}>
            <Text
              style={[
                styles.dockTitle,
                { color: clozePicked === activeCloze.answer ? theme.matchaDark : theme.error },
              ]}
            >
              {clozePicked === activeCloze.answer ? "✓ 答對了！" : `✕ 正解：${activeCloze.answer}`}
            </Text>
            <Text style={styles.dockBody} numberOfLines={2}>
              {activeCloze.fullJa}
            </Text>
          </View>
          <Pressable
            onPress={nextCloze}
            style={[
              styles.dockBtn,
              { backgroundColor: clozePicked === activeCloze.answer ? theme.success : theme.error },
            ]}
          >
            <Text style={styles.dockBtnText}>下一個例句 →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroller: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, gap: 12 },
  lessonHeader: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 15,
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backChip: {
    backgroundColor: theme.surface,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  backChipText: { fontSize: 12, fontWeight: "800", color: theme.ink },
  levelPill: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 99 },
  levelPillText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  patternTitle: { fontSize: 17, fontWeight: "900", color: theme.ink, lineHeight: 24 },
  formulaBanner: {
    backgroundColor: theme.indigoSoft,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 2,
  },
  formulaLabel: { fontSize: 10, fontWeight: "800", color: theme.indigo },
  formulaValue: { fontSize: 13, fontWeight: "900", color: theme.ink, lineHeight: 19 },
  subTabs: {
    flexDirection: "row",
    backgroundColor: theme.paper,
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  subTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  subTabText: { fontSize: 12, fontWeight: "900", color: theme.inkSoft },
  studyWrap: { gap: 12 },
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
  machineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  posBadge: { backgroundColor: theme.goldSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  posBadgeText: { fontSize: 12, fontWeight: "900", color: theme.goldDark },
  poolInfo: { fontSize: 12, fontWeight: "700", color: theme.inkMuted },
  wordHero: { alignItems: "center", paddingVertical: 4, gap: 2 },
  wordRt: { fontSize: 13, fontWeight: "700", color: theme.inkSoft },
  wordDict: { fontSize: 32, fontWeight: "900", color: theme.ink },
  wordMeaning: { fontSize: 14, fontWeight: "700", color: theme.inkSoft, textAlign: "center" },
  promptBanner: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
    color: theme.indigo,
    backgroundColor: theme.indigoSoft,
    paddingVertical: 7,
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
    paddingVertical: 12,
    fontSize: 15,
    color: theme.ink,
    fontWeight: "600",
  },
  submitBtn: { paddingHorizontal: 18, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  cycleBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  cycleBtnText: { fontSize: 12, fontWeight: "800", color: theme.indigo },
  clozeSentence: { fontSize: 18, lineHeight: 28, fontWeight: "800", color: theme.ink },
  clozeBlankText: { fontWeight: "900" },
  clozeReading: { fontSize: 12, color: theme.inkMuted, lineHeight: 18 },
  translation: { fontSize: 14, color: theme.inkSoft, fontWeight: "600", lineHeight: 21 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: theme.ink },
  connItem: { fontSize: 13, color: theme.indigo, fontWeight: "700", lineHeight: 20 },
  subFormula: { backgroundColor: theme.surface, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.paperBorder },
  subFormulaText: { fontSize: 13, fontWeight: "800", color: theme.indigo },
  nuanceText: { fontSize: 13, color: theme.inkSoft, lineHeight: 21 },
  exampleItem: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  exampleJa: { fontSize: 15, fontWeight: "800", color: theme.ink, lineHeight: 22 },
  exampleReading: { fontSize: 12, color: theme.indigo, lineHeight: 18 },
  exampleZh: { fontSize: 13, color: theme.inkSoft, lineHeight: 19 },
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
  feedbackDock: {
    borderTopWidth: 2,
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 10,
    shadowColor: "#161B2E",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  dockTop: { gap: 3 },
  dockTitle: { fontSize: 15, fontWeight: "900" },
  dockBody: { fontSize: 12, color: theme.ink, lineHeight: 18, fontWeight: "600" },
  dockBtn: {
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dockBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
