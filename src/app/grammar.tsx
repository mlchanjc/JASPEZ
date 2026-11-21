import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabs } from "@/components/BottomTabs";
import { ConjugationDrill } from "@/components/ConjugationDrill";
import { GrammarCompare } from "@/components/GrammarCompare";
import { GrammarLessonMachine } from "@/components/GrammarLessonMachine";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { ProficiencyMeter } from "@/components/ProficiencyMeter";
import { findGrammarLesson, grammarLessonKey, grammarLessonsByLevel } from "@/data/grammarRegistry";
import type { LevelId, GrammarLesson } from "@/data/types";
import { lessonAllowedPos } from "@/lib/conjugator";
import { lessonExamples } from "@/lib/grammar";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

type GrammarTab = "lessons" | "drill" | "compare";

const LEVEL_FILTERS: LevelId[] = ["N5", "N4", "N3", "N2"];

export default function GrammarScreen() {
  const { currentLevel, prefs, setPref, ghostGrammar, grammarLearned, getGrammarProficiency } = useProgress();
  const [tab, setTab] = useState<GrammarTab>("lessons");
  const [levelFilter, setLevelFilter] = useState<LevelId>(
    currentLevel === "N1" ? "N5" : currentLevel,
  );
  const [search, setSearch] = useState("");
  const [selectedRef, setSelectedRef] = useState<{ level: LevelId; id: string } | null>(null);

  // Intercept Android hardware / nav-bar back button so closing a lesson returns to the lesson list
  useEffect(() => {
    if (!selectedRef) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelectedRef(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedRef]);

  const activeAccent = levelAccent[levelFilter];

  const lessonsList = useMemo(() => {
    const base = grammarLessonsByLevel[levelFilter];
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.point.toLowerCase().includes(q) ||
        item.gloss.toLowerCase().includes(q) ||
        item.pattern.toLowerCase().includes(q) ||
        item.id.includes(q),
    );
  }, [levelFilter, search]);

  const selectedLesson: GrammarLesson | null = useMemo(
    () => (selectedRef ? findGrammarLesson(selectedRef.level, selectedRef.id) ?? null : null),
    [selectedRef],
  );

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <View style={styles.navRow}>
            <Pressable
              onPress={() => {
                if (selectedLesson) setSelectedRef(null);
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
            <Text style={styles.title}>
              {selectedLesson ? `${selectedLesson.level} 文法 ${selectedLesson.id}` : "文法練功機"}
            </Text>
            <Pressable
              onPress={() => setPref("showFurigana", !prefs.showFurigana)}
              style={[styles.miniToggle, prefs.showFurigana && styles.miniToggleOn]}
            >
              <Text style={[styles.miniToggleText, prefs.showFurigana && styles.miniToggleTextOn]}>
                假名讀音 {prefs.showFurigana ? "開" : "關"}
              </Text>
            </Pressable>
          </View>

          {!selectedLesson && tab !== "compare" && (
            <View style={styles.levelRow}>
              {LEVEL_FILTERS.map((lvl) => {
                const selected = lvl === levelFilter;
                const chipColor = levelAccent[lvl];
                const count = grammarLessonsByLevel[lvl].length;
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
                      {lvl} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!selectedLesson && tab === "lessons" && (
            <View style={styles.searchWrap}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`搜尋 ${levelFilter} 文法（例如：ば、11、假定、中止形）`}
                placeholderTextColor={theme.inkMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </View>

        <View style={styles.body}>
          {selectedLesson ? (
            <GrammarLessonMachine lesson={selectedLesson} onBack={() => setSelectedRef(null)} onNavigateLesson={(lvl, id) => { if (findGrammarLesson(lvl, id)) setSelectedRef({ level: lvl, id }); }} />
          ) : tab === "lessons" ? (
            <FlatList
              data={lessonsList}
              keyExtractor={(item) => grammarLessonKey(item.level, item.id)}
              contentContainerStyle={styles.lessonList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>找不到符合的文法課</Text>
                  <Text style={styles.emptyBody}>試試切換上方級別或清除搜尋字詞。</Text>
                </View>
              }
              renderItem={({ item }) => {
                const key = grammarLessonKey(item.level, item.id);
                const accent = levelAccent[item.level];
                const learned = grammarLearned.has(key);
                const isGhost = ghostGrammar.includes(key);
                const prof = getGrammarProficiency(key);
                const posList = lessonAllowedPos(item);
                const exCount = lessonExamples(item).length;

                return (
                  <Pressable
                    onPress={() => setSelectedRef({ level: item.level, id: item.id })}
                    style={styles.lessonCard}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.codeBadge, { backgroundColor: accent }]}>
                        <Text style={styles.codeBadgeText}>
                          {item.level} · {item.id}
                        </Text>
                      </View>
                      {posList.length > 0 && (
                        <View style={styles.posRow}>
                          {posList.map((p) => (
                            <View key={p} style={styles.posChip}>
                              <Text style={styles.posChipText}>{p}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {exCount > 0 && <Text style={styles.exBadge}>{exCount} 例句</Text>}
                      {isGhost ? (
                        <Text style={styles.ghostFlag}>⚡ 錯題</Text>
                      ) : learned ? (
                        <Text style={styles.learnedFlag}>✓ 已學</Text>
                      ) : null}
                    </View>

                    <Text style={styles.cardPattern}>{item.title}</Text>
                    {item.pattern ? (
                      <View style={styles.formulaPill}>
                        <Text style={styles.formulaPillText} numberOfLines={2}>
                          {item.pattern}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.cardFoot}>
                      <ProficiencyMeter value={prof} />
                      <Text style={[styles.enterLabel, { color: accent }]}>
                        {posList.length > 0 ? "⚡ 活用練功 →" : "閱讀練習 →"}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
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
              { id: "compare", label: "易混擂台", color: activeAccent },
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
  top: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10, gap: 10 },
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
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 24, fontWeight: "900", color: theme.ink },
  miniToggle: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  miniToggleOn: { backgroundColor: theme.indigo, borderColor: theme.indigo },
  miniToggleText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  miniToggleTextOn: { color: "#fff" },
  levelRow: { flexDirection: "row", gap: 6 },
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
  searchWrap: {
    backgroundColor: theme.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  searchInput: { fontSize: 14, color: theme.ink, fontWeight: "600" },
  body: { flex: 1 },
  lessonList: { paddingHorizontal: 18, paddingBottom: 32, gap: 11 },
  lessonCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 15,
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
  codeBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
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
  exBadge: { fontSize: 11, fontWeight: "700", color: theme.inkMuted },
  learnedFlag: { marginLeft: "auto", fontSize: 11, fontWeight: "900", color: theme.matchaDark },
  ghostFlag: { marginLeft: "auto", fontSize: 11, fontWeight: "900", color: theme.goldDark },
  cardPattern: { fontSize: 16, fontWeight: "900", color: theme.ink, lineHeight: 22 },
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
    paddingTop: 2,
  },
  enterLabel: { fontSize: 13, fontWeight: "900" },
  emptyCard: {
    backgroundColor: theme.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: theme.ink },
  emptyBody: { fontSize: 13, color: theme.inkSoft },
});
