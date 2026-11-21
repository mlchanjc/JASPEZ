import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabs } from "@/components/BottomTabs";
import { ConjugationDrill } from "@/components/ConjugationDrill";
import { GrammarCompare } from "@/components/GrammarCompare";
import { GrammarLessonMachine } from "@/components/GrammarLessonMachine";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { ProficiencyMeter } from "@/components/ProficiencyMeter";
import { GRAMMAR_POINTS } from "@/data/grammar";
import type { GrammarPoint, LevelId } from "@/data/types";
import { grammarByLevel } from "@/lib/grammar";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

type GrammarTab = "lessons" | "drill" | "compare";

const FILTER_LEVELS: (LevelId | "ALL")[] = ["ALL", "N5", "N4", "N3"];

export default function GrammarScreen() {
  const { currentLevel, prefs, setPref, ghostGrammar, grammarLearned, getGrammarProficiency } = useProgress();
  const [tab, setTab] = useState<GrammarTab>("lessons");
  const [levelFilter, setLevelFilter] = useState<LevelId | "ALL">(
    currentLevel === "N5" || currentLevel === "N4" || currentLevel === "N3" ? currentLevel : "ALL",
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const activeAccent = levelFilter === "ALL" ? theme.indigo : levelAccent[levelFilter];
  const lessonsList = useMemo(() => grammarByLevel(levelFilter), [levelFilter]);
  const selectedLesson: GrammarPoint | null = useMemo(
    () => (selectedLessonId ? GRAMMAR_POINTS.find((g) => g.id === selectedLessonId) ?? null : null),
    [selectedLessonId],
  );

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <View style={styles.navRow}>
            <Pressable
              onPress={() => {
                if (selectedLesson) setSelectedLessonId(null);
                else router.back();
              }}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Text style={styles.back}>← 返回</Text>
            </Pressable>
            {ghostGrammar.length > 0 && (
              <View style={styles.ghostPill}>
                <Text style={styles.ghostPillText}>⚡ 錯題 {ghostGrammar.length}</Text>
              </View>
            )}
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>{selectedLesson ? selectedLesson.sigureCode : "時雨文法練功機"}</Text>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setPref("showFurigana", !prefs.showFurigana)}
                style={[styles.miniToggle, prefs.showFurigana && styles.miniToggleOn]}
              >
                <Text style={[styles.miniToggleText, prefs.showFurigana && styles.miniToggleTextOn]}>
                  振假名 {prefs.showFurigana ? "開" : "關"}
                </Text>
              </Pressable>

              {selectedLesson && (
                <Pressable
                  onPress={() => setPref("register", prefs.register === "polite" ? "casual" : "polite")}
                  style={styles.registerToggle}
                >
                  <Text style={styles.registerToggleText}>
                    {prefs.register === "polite" ? "敬體 です" : "常體 だ"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {!selectedLesson && tab !== "compare" && (
            <View style={styles.levelRow}>
              {FILTER_LEVELS.map((lvl) => {
                const selected = lvl === levelFilter;
                const chipColor = lvl === "ALL" ? theme.ink : levelAccent[lvl];
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => setLevelFilter(lvl)}
                    style={[
                      styles.levelChip,
                      selected && { backgroundColor: chipColor, borderColor: chipColor },
                    ]}
                  >
                    <Text style={[styles.levelChipText, selected && { color: "#fff" }]}>
                      {lvl === "ALL" ? "全部" : lvl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.body}>
          {selectedLesson ? (
            <GrammarLessonMachine lesson={selectedLesson} onBack={() => setSelectedLessonId(null)} />
          ) : tab === "lessons" ? (
            <ScrollView contentContainerStyle={styles.lessonList} showsVerticalScrollIndicator={false}>
              {lessonsList.map((item) => {
                const accent = levelAccent[item.level];
                const learned = grammarLearned.has(item.id);
                const isGhost = ghostGrammar.includes(item.id);
                const prof = getGrammarProficiency(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedLessonId(item.id)}
                    style={styles.lessonCard}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.codeBadge, { backgroundColor: accent }]}>
                        <Text style={styles.codeBadgeText}>{item.sigureCode}</Text>
                      </View>
                      <View style={styles.posRow}>
                        {item.allowedPos.map((p) => (
                          <View key={p} style={styles.posChip}>
                            <Text style={styles.posChipText}>{p}</Text>
                          </View>
                        ))}
                      </View>
                      {isGhost ? (
                        <Text style={styles.ghostFlag}>⚡ 錯題</Text>
                      ) : learned ? (
                        <Text style={styles.learnedFlag}>✓ 已學</Text>
                      ) : null}
                    </View>

                    <Text style={styles.cardPattern}>{item.pattern}</Text>
                    <Text style={styles.cardMeaning}>{item.meaning}</Text>

                    <View style={styles.formulaPill}>
                      <Text style={styles.formulaPillText}>{item.formation}</Text>
                    </View>

                    <View style={styles.cardFoot}>
                      <ProficiencyMeter value={prof} />
                      <Text style={[styles.enterLabel, { color: accent }]}>開始練功 →</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : tab === "drill" ? (
            <ConjugationDrill levelFilter={levelFilter} />
          ) : (
            <GrammarCompare />
          )}
        </View>

        {!selectedLesson && (
          <BottomTabs
            value={tab}
            onChange={(next) => setTab(next as GrammarTab)}
            tabs={[
              { id: "lessons", label: "文法課堂", color: activeAccent },
              { id: "drill", label: "六大活用", color: activeAccent },
              { id: "compare", label: "易混辨析", color: activeAccent },
            ]}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  safe: { flex: 1 },
  top: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, gap: 10 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    backgroundColor: theme.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  back: { color: theme.ink, fontWeight: "800", fontSize: 13 },
  ghostPill: {
    backgroundColor: theme.goldSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
  },
  ghostPillText: { fontSize: 12, fontWeight: "900", color: theme.goldDark },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  title: { fontSize: 24, fontWeight: "900", color: theme.ink },
  toggleRow: { flexDirection: "row", gap: 6 },
  miniToggle: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  miniToggleOn: {
    backgroundColor: theme.indigo,
    borderColor: theme.indigo,
  },
  miniToggleText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  miniToggleTextOn: { color: "#fff" },
  registerToggle: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.vermillionSoft,
    borderWidth: 1.5,
    borderColor: "rgba(255, 90, 95, 0.25)",
  },
  registerToggleText: { fontSize: 12, fontWeight: "900", color: theme.vermillion },
  levelRow: { flexDirection: "row", gap: 8 },
  levelChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    alignItems: "center",
  },
  levelChipText: { fontSize: 12, fontWeight: "900", color: theme.inkSoft },
  body: { flex: 1 },
  lessonList: { paddingHorizontal: 18, paddingBottom: 32, gap: 12 },
  lessonCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  codeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  codeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  posRow: { flexDirection: "row", gap: 4 },
  posChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  posChipText: { fontSize: 10, fontWeight: "900", color: theme.inkSoft },
  learnedFlag: { marginLeft: "auto", fontSize: 11, fontWeight: "900", color: theme.matchaDark },
  ghostFlag: { marginLeft: "auto", fontSize: 11, fontWeight: "900", color: theme.goldDark },
  cardPattern: { fontSize: 18, fontWeight: "900", color: theme.ink },
  cardMeaning: { fontSize: 13, fontWeight: "700", color: theme.inkSoft },
  formulaPill: {
    backgroundColor: theme.indigoSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formulaPillText: { fontSize: 12, fontWeight: "800", color: theme.indigo, lineHeight: 18 },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  enterLabel: { fontSize: 13, fontWeight: "900" },
});
