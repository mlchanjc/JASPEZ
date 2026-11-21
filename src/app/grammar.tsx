import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabs } from "@/components/BottomTabs";
import { ConjugationDrill } from "@/components/ConjugationDrill";
import { GrammarCompare } from "@/components/GrammarCompare";
import { GrammarLibrary } from "@/components/GrammarLibrary";
import { GrammarQuizMode } from "@/components/GrammarQuizMode";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import type { LevelId } from "@/data/types";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

type GrammarTab = "quiz" | "library" | "compare" | "drill";

const FILTER_LEVELS: (LevelId | "ALL")[] = ["ALL", "N5", "N4", "N3"];

export default function GrammarScreen() {
  const { currentLevel, prefs, setPref, ghostGrammar } = useProgress();
  const [tab, setTab] = useState<GrammarTab>("quiz");
  const [levelFilter, setLevelFilter] = useState<LevelId | "ALL">(
    currentLevel === "N5" || currentLevel === "N4" || currentLevel === "N3" ? currentLevel : "ALL",
  );

  const activeAccent = levelFilter === "ALL" ? theme.indigo : levelAccent[levelFilter];

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <View style={styles.navRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Text style={styles.back}>← 返回</Text>
            </Pressable>
            {ghostGrammar.length > 0 && (
              <View style={styles.ghostPill}>
                <Text style={styles.ghostPillText}>⚡ 錯題 {ghostGrammar.length}</Text>
              </View>
            )}
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>文法特訓</Text>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setPref("showFurigana", !prefs.showFurigana)}
                style={[styles.miniToggle, prefs.showFurigana && styles.miniToggleOn]}
              >
                <Text style={[styles.miniToggleText, prefs.showFurigana && styles.miniToggleTextOn]}>
                  振假名 {prefs.showFurigana ? "開" : "關"}
                </Text>
              </Pressable>

              {(tab === "quiz" || tab === "library") && (
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

          {tab !== "compare" && (
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
          {tab === "quiz" ? (
            <GrammarQuizMode levelFilter={levelFilter} />
          ) : tab === "library" ? (
            <GrammarLibrary levelFilter={levelFilter} />
          ) : tab === "compare" ? (
            <GrammarCompare />
          ) : (
            <ConjugationDrill levelFilter={levelFilter} />
          )}
        </View>

        <BottomTabs
          value={tab}
          onChange={(next) => setTab(next as GrammarTab)}
          tabs={[
            { id: "quiz", label: "填空", color: activeAccent },
            { id: "library", label: "文法庫", color: activeAccent },
            { id: "compare", label: "辨析", color: activeAccent },
            { id: "drill", label: "活用", color: activeAccent },
          ]}
        />
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
  title: { fontSize: 26, fontWeight: "900", color: theme.ink },
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
});
