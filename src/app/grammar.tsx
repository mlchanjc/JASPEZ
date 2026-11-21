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
import type { GrammarLesson, LevelId } from "@/data/types";
import { lessonAllowedPos } from "@/lib/conjugator";
import { lessonExamples } from "@/lib/grammar";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

type GrammarTab = "lessons" | "drill" | "compare";

const LEVEL_FILTERS: LevelId[] = ["N5", "N4", "N3", "N2"];

export default function GrammarScreen() {
  const { currentLevel, prefs, setPref, ghostGrammar, grammarLearned, getGrammarProficiency } = useProgress();
  const { t, isDark, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState<GrammarTab>("lessons");
  const [levelFilter, setLevelFilter] = useState<LevelId>(currentLevel === "N1" ? "N5" : currentLevel);
  const [search, setSearch] = useState("");
  const [selectedRef, setSelectedRef] = useState<{ level: LevelId; id: string } | null>(null);

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
            <View style={styles.navRight}>
              {ghostGrammar.length > 0 && (
                <View style={styles.ghostStamp}>
                  <Text style={styles.ghostStampText}>錯題 {ghostGrammar.length}</Text>
                </View>
              )}
              <Pressable onPress={() => setPref("darkMode", !isDark)} style={styles.miniBtn}>
                <Text style={styles.miniBtnText}>{isDark ? "昼" : "夜"}</Text>
              </Pressable>
              <Pressable
                onPress={() => setPref("showFurigana", !prefs.showFurigana)}
                style={[styles.miniBtn, prefs.showFurigana && styles.miniBtnOn]}
              >
                <Text style={[styles.miniBtnText, prefs.showFurigana && styles.miniBtnTextOn]}>
                  假名 {prefs.showFurigana ? "開" : "關"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.title}>
            {selectedLesson ? `${selectedLesson.level} 文法 ${selectedLesson.id}` : "文法練功"}
          </Text>

          {!selectedLesson && tab !== "compare" && (
            <View style={styles.levelRow}>
              {LEVEL_FILTERS.map((lvl) => {
                const selected = lvl === levelFilter;
                const count = grammarLessonsByLevel[lvl].length;
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => setLevelFilter(lvl)}
                    style={[styles.levelChip, selected && styles.levelChipActive]}
                  >
                    <Text style={[styles.levelChipText, selected && styles.levelChipTextActive]}>
                      {lvl} · {count}
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
                placeholderTextColor={t.inkMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </View>

        <View style={styles.body}>
          {selectedLesson ? (
            <GrammarLessonMachine
              lesson={selectedLesson}
              onBack={() => setSelectedRef(null)}
              onNavigateLesson={(lvl, id) => {
                if (findGrammarLesson(lvl, id)) setSelectedRef({ level: lvl, id });
              }}
            />
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
                      <Text style={[styles.codeText, { color: accent }]}>
                        {item.level} · {item.id}
                      </Text>
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
                        <Text style={styles.ghostFlag}>待複習</Text>
                      ) : learned ? (
                        <Text style={styles.learnedFlag}>✓ 已學</Text>
                      ) : null}
                    </View>

                    <Text style={styles.cardPattern}>{item.title}</Text>
                    {item.pattern ? (
                      <View style={[styles.formulaBar, { borderLeftColor: accent }]}>
                        <Text style={styles.formulaText} numberOfLines={2}>
                          {item.pattern}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.cardFoot}>
                      <ProficiencyMeter value={prof} />
                      <Text style={[styles.enterLabel, { color: accent }]}>
                        {posList.length > 0 ? "活用練習 →" : "閱讀筆記 →"}
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

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.paper },
    safe: { flex: 1 },
    top: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.paperBorder,
    },
    navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    navRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    backBtn: {
      backgroundColor: t.white,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    back: { color: t.ink, fontWeight: "700", fontSize: 12.5 },
    ghostStamp: {
      borderWidth: 1,
      borderColor: t.vermillion,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    ghostStampText: { color: t.vermillion, fontSize: 11, fontWeight: "700" },
    miniBtn: {
      backgroundColor: t.white,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    miniBtnOn: { backgroundColor: t.ink, borderColor: t.ink },
    miniBtnText: { color: t.inkSoft, fontSize: 11.5, fontWeight: "700" },
    miniBtnTextOn: { color: t.paper },
    title: { fontFamily: t.serif, fontSize: 24, fontWeight: "700", color: t.ink },
    levelRow: { flexDirection: "row", gap: 6 },
    levelChip: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 7,
      borderRadius: 6,
      backgroundColor: t.white,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    levelChipActive: { backgroundColor: t.ink, borderColor: t.ink },
    levelChipText: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    levelChipTextActive: { color: t.paper },
    searchWrap: {
      backgroundColor: t.white,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.paperBorder,
      paddingHorizontal: 12,
    },
    searchInput: { height: 38, fontSize: 13.5, color: t.ink },
    body: { flex: 1 },
    lessonList: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32, gap: 10 },
    lessonCard: {
      backgroundColor: t.white,
      borderRadius: 8,
      padding: 15,
      gap: 9,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    codeText: { fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6 },
    posRow: { flexDirection: "row", gap: 4 },
    posChip: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    posChipText: { fontSize: 10.5, fontWeight: "700", color: t.inkSoft },
    exBadge: { fontSize: 11, fontWeight: "600", color: t.inkMuted },
    ghostFlag: { fontSize: 11, fontWeight: "700", color: t.vermillion, marginLeft: "auto" },
    learnedFlag: { fontSize: 11, fontWeight: "700", color: t.matcha, marginLeft: "auto" },
    cardPattern: { fontFamily: t.serif, fontSize: 16, fontWeight: "700", color: t.ink, lineHeight: 23 },
    formulaBar: {
      paddingLeft: 10,
      borderLeftWidth: 2,
      paddingVertical: 2,
    },
    formulaText: { fontSize: 12.5, fontWeight: "600", color: t.inkSoft, lineHeight: 19 },
    cardFoot: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: t.paperBorder,
    },
    enterLabel: { fontSize: 12, fontWeight: "700" },
    emptyCard: {
      marginTop: 16,
      backgroundColor: t.white,
      borderRadius: 8,
      padding: 24,
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: t.ink },
    emptyBody: { fontSize: 13, color: t.inkSoft, textAlign: "center" },
  });
}
