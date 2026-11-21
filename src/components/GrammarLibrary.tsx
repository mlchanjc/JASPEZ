import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FuriganaSentence } from "@/components/FuriganaSentence";
import { ProficiencyMeter } from "@/components/ProficiencyMeter";
import type { LevelId } from "@/data/types";
import { grammarByLevel } from "@/lib/grammar";
import { PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";

type Props = {
  levelFilter: LevelId | "ALL";
};

export function GrammarLibrary({ levelFilter }: Props) {
  const { prefs, grammarNotes, setGrammarNote, getGrammarProficiency, setGrammarProficiency, grammarLearned } =
    useProgress();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo(() => {
    const base = grammarByLevel(levelFilter);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (item) =>
        item.pattern.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.formation.toLowerCase().includes(q),
    );
  }, [levelFilter, query]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.searchCard}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜尋文型、中文意思或接續（例如：しまう、目的）"
          placeholderTextColor={theme.inkMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>找不到符合的文法</Text>
          <Text style={styles.emptyBody}>試試切換上方級別篩選，或清除搜尋關鍵字。</Text>
        </View>
      ) : (
        items.map((item) => {
          const variant = item[prefs.register];
          const accent = levelAccent[item.level];
          const prof = getGrammarProficiency(item.id);
          const isLearned = grammarLearned.has(item.id);
          const isExpanded = expandedId === item.id;

          return (
            <View key={item.id} style={styles.card}>
              <Pressable onPress={() => setExpandedId(isExpanded ? null : item.id)} style={styles.cardHead}>
                <View style={styles.titleRow}>
                  <View style={[styles.levelPill, { backgroundColor: accent }]}>
                    <Text style={styles.levelPillText}>{item.level}</Text>
                  </View>
                  <Text style={styles.pattern}>{item.pattern}</Text>
                  {isLearned && (
                    <View style={styles.learnedChip}>
                      <Text style={styles.learnedChipText}>已學</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meaning}>{item.meaning}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.formulaBox}>
                    <Text style={styles.formulaText}>接續：{item.formation}</Text>
                  </View>
                </View>
                <ProficiencyMeter value={prof} />
              </Pressable>

              <View style={styles.exampleBox}>
                <FuriganaSentence
                  tokens={variant.tokens}
                  showFurigana={prefs.showFurigana}
                  blankText={variant.answer}
                  blankStatus="filled"
                  accentColor={accent}
                />
                <Text style={styles.exampleTranslation}>{variant.translation}</Text>
              </View>

              {isExpanded && (
                <View style={styles.expandSection}>
                  <Text style={styles.nuanceText}>{item.nuance}</Text>

                  <View style={styles.manualRow}>
                    <Text style={styles.subLabel}>手動調整熟練度</Text>
                    <View style={styles.profBtns}>
                      {PROFICIENCY_LEVELS.map((label, idx) => (
                        <Pressable
                          key={label}
                          onPress={() => setGrammarProficiency(item.id, idx)}
                          style={[styles.profBtn, prof === idx && { backgroundColor: theme.indigo, borderColor: theme.indigo }]}
                        >
                          <Text style={[styles.profBtnText, prof === idx && { color: "#fff" }]}>{label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.noteWrap}>
                    <Text style={styles.subLabel}>個人記憶筆記（自動儲存）</Text>
                    <TextInput
                      value={grammarNotes[item.id] ?? ""}
                      onChangeText={(text) => setGrammarNote(item.id, text)}
                      placeholder="寫下自己的例句或記憶口訣…"
                      placeholderTextColor={theme.inkMuted}
                      style={styles.noteInput}
                      multiline
                    />
                  </View>
                </View>
              )}

              <Pressable onPress={() => setExpandedId(isExpanded ? null : item.id)} style={styles.expandToggle}>
                <Text style={styles.expandToggleText}>{isExpanded ? "收合解說與筆記 ▲" : "展開解說・筆記・熟練度 ▼"}</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  searchCard: {
    backgroundColor: theme.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { fontSize: 14, color: theme.ink, fontWeight: "600" },
  card: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    shadowColor: "#1E2430",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHead: { gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  levelPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  levelPillText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  pattern: { fontSize: 20, fontWeight: "900", color: theme.ink },
  learnedChip: {
    marginLeft: "auto",
    backgroundColor: theme.matchaSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  learnedChipText: { fontSize: 11, fontWeight: "800", color: theme.matcha },
  meaning: { fontSize: 15, fontWeight: "700", color: theme.inkSoft },
  metaRow: { flexDirection: "row", flexWrap: "wrap" },
  formulaBox: {
    backgroundColor: theme.indigoSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  formulaText: { fontSize: 12, fontWeight: "800", color: theme.indigo },
  exampleBox: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(30, 36, 48, 0.06)",
  },
  exampleTranslation: { fontSize: 13, color: theme.inkSoft, fontWeight: "600" },
  expandSection: {
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(30, 36, 48, 0.08)",
  },
  nuanceText: { fontSize: 13, color: theme.ink, lineHeight: 20, fontWeight: "500" },
  manualRow: { gap: 6 },
  subLabel: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  profBtns: { flexDirection: "row", gap: 6 },
  profBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    backgroundColor: theme.surface,
    alignItems: "center",
  },
  profBtnText: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  noteWrap: { gap: 6 },
  noteInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.ink,
    minHeight: 56,
    textAlignVertical: "top",
  },
  expandToggle: { alignItems: "center", paddingTop: 2 },
  expandToggleText: { fontSize: 12, fontWeight: "800", color: theme.indigo },
  emptyCard: {
    backgroundColor: theme.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    gap: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: theme.ink },
  emptyBody: { fontSize: 13, color: theme.inkSoft },
});
