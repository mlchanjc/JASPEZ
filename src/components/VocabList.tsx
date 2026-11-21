import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { attemptStats, PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { levelAccent, theme } from "@/theme";
import { ProficiencyMeter } from "./ProficiencyMeter";

function hasNote(word: VocabWord) {
  return Boolean(word.extraInfo && word.extraInfo.trim());
}

export function VocabList({ level, topicId, words }: { level: LevelId; topicId: string; words: VocabWord[] }) {
  const { attempts, learned, setProficiency } = useProgress();
  const { width } = useWindowDimensions();
  const singleColumn = width < 720;
  const [search, setSearch] = useState("");
  const [note, setNote] = useState<VocabWord | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const accent = levelAccent[level];
  const indexedWords = useMemo(() => {
    const all = words.map((word, index) => ({ word, index }));
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      ({ word }) =>
        (word.word ?? "").toLowerCase().includes(q) ||
        (word.reading ?? "").toLowerCase().includes(q) ||
        (word.meaning ?? "").toLowerCase().includes(q),
    );
  }, [search, words]);

  const selectedWord = selected == null ? null : words[selected];
  const selectedKey = selected == null ? "" : wordKey(level, topicId, selected);
  const selectedStats = attemptStats(selected == null ? undefined : attempts[selectedKey]);

  return (
    <>
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBox}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="搜尋本課單字、假名或中文意思"
            placeholderTextColor={theme.inkMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {indexedWords.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>找不到符合的單字</Text>
            <Text style={styles.emptyBody}>試試清除搜尋關鍵字查看本課全部單字。</Text>
          </View>
        ) : (
          indexedWords.map(({ word, index }) => {
            const key = wordKey(level, topicId, index);
            const stats = attemptStats(attempts[key]);
            const isLearned = learned.has(key);

            return (
              <View
                key={`${word.word}-${word.reading}-${index}`}
                style={[styles.card, singleColumn && styles.cardSingle]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${word.word} 詳情`}
                  onPress={() => setSelected(index)}
                  style={styles.cardPress}
                />
                <View style={styles.cardTop} pointerEvents="box-none">
                  <View style={styles.badges} pointerEvents="none">
                    {word.verbType ? (
                      <View style={styles.verbChip}>
                        <Text style={styles.verbChipText}>{word.verbType}</Text>
                      </View>
                    ) : null}
                    {word.accent ? (
                      <View style={styles.accentChip}>
                        <Text style={styles.accentChipText}>{word.accent}</Text>
                      </View>
                    ) : null}
                    {isLearned ? <Text style={styles.learnedFlag}>✓ 已學</Text> : null}
                  </View>
                  {hasNote(word) ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${word.word} 補充`}
                      onPress={() => setNote(word)}
                      style={styles.noteButton}
                    >
                      <Text style={styles.noteLabel}>📌 補充</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.row} pointerEvents="none">
                  <View style={styles.japanese}>
                    <Text style={styles.word}>{word.word}</Text>
                    {word.reading ? <Text style={styles.reading}>{word.reading}</Text> : null}
                  </View>
                  <Text style={styles.meaning}>{word.meaning}</Text>
                </View>

                <View style={styles.cardFoot} pointerEvents="none">
                  <ProficiencyMeter value={stats.level} />
                  <Text style={[styles.detailCue, { color: accent }]}>詳情 →</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={selectedWord != null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <Pressable accessibilityLabel="關閉單字" style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selectedWord ? (
            <View style={styles.dialog}>
              <View style={styles.dialogTop}>
                <View style={styles.badges}>
                  <View style={[styles.modalLevelBadge, { backgroundColor: accent }]}>
                    <Text style={styles.modalLevelText}>{level}</Text>
                  </View>
                  {selectedWord.verbType ? (
                    <View style={styles.verbChip}>
                      <Text style={styles.verbChipText}>{selectedWord.verbType}</Text>
                    </View>
                  ) : null}
                  {selectedWord.accent ? (
                    <View style={styles.accentChip}>
                      <Text style={styles.accentChipText}>{selectedWord.accent}</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.closePill}>
                  <Text style={styles.closePillText}>✕ 關閉</Text>
                </Pressable>
              </View>

              <View style={styles.dialogHero}>
                {selectedWord.reading ? <Text style={styles.dialogReading}>{selectedWord.reading}</Text> : null}
                <Text style={styles.dialogWord}>{selectedWord.word}</Text>
                <Text style={styles.dialogMeaning}>{selectedWord.meaning}</Text>
              </View>

              <View style={styles.statBlock}>
                <View style={styles.statHead}>
                  <Text style={styles.statLabel}>熟練度</Text>
                  <Text style={styles.statDetail}>
                    最近 {selectedStats.correct}/{selectedStats.total} 正確 ·{" "}
                    {learned.has(selectedKey) ? "✓ 測驗已答對" : "測驗尚未答對"}
                  </Text>
                </View>
                <ProficiencyMeter value={selectedStats.level} />
                <View style={styles.levels}>
                  {PROFICIENCY_LEVELS.map((label, proficiencyLevel) => {
                    const active = selectedStats.level === proficiencyLevel;
                    return (
                      <Pressable
                        key={label}
                        accessibilityRole="button"
                        onPress={() => setProficiency(selectedKey, proficiencyLevel)}
                        style={[styles.levelButton, active && styles.levelButtonOn]}
                      >
                        <Text style={[styles.levelText, active && styles.levelTextOn]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {hasNote(selectedWord) ? (
                <ScrollView style={styles.noteScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.noteCallout}>
                    <Text style={styles.noteCalloutBadge}>📌 補充說明</Text>
                    <Text style={styles.dialogBody}>{selectedWord.extraInfo}</Text>
                  </View>
                </ScrollView>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={note != null} transparent animationType="fade" onRequestClose={() => setNote(null)}>
        <View style={styles.backdrop}>
          <Pressable accessibilityLabel="關閉補充" style={StyleSheet.absoluteFill} onPress={() => setNote(null)} />
          <View style={styles.dialog}>
            <View style={styles.dialogTop}>
              <Text style={styles.noteCalloutBadge}>📌 單字補充</Text>
              <Pressable accessibilityRole="button" onPress={() => setNote(null)} style={styles.closePill}>
                <Text style={styles.closePillText}>✕ 關閉</Text>
              </Pressable>
            </View>
            <Text style={styles.dialogWord}>{note?.word}</Text>
            {note?.reading ? (
              <Text style={styles.dialogReading}>
                {note.reading}
                {note.accent ? `  ${note.accent}` : ""}
              </Text>
            ) : null}
            <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.dialogBody}>{note?.extraInfo}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  searchBarWrap: { paddingHorizontal: 18, paddingBottom: 8 },
  searchBox: {
    backgroundColor: theme.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    paddingHorizontal: 12,
  },
  searchInput: { height: 40, fontSize: 14, color: theme.ink, fontWeight: "600" },
  list: { flex: 1 },
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 32,
  },
  card: {
    width: "48.8%",
    marginBottom: 11,
    backgroundColor: theme.white,
    borderRadius: 20,
    padding: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
    shadowColor: "#161B2E",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardSingle: { width: "100%" },
  cardPress: { ...StyleSheet.absoluteFill, borderRadius: 20 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  badges: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 },
  verbChip: {
    backgroundColor: theme.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  verbChipText: { color: theme.goldDark, fontSize: 11, fontWeight: "800" },
  accentChip: {
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  accentChipText: { color: theme.vermillion, fontSize: 11, fontWeight: "800" },
  learnedFlag: { color: theme.matchaDark, fontSize: 11, fontWeight: "900" },
  noteButton: {
    zIndex: 1,
    backgroundColor: theme.indigoSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  noteLabel: { color: theme.indigo, fontSize: 11, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  japanese: { flex: 1, minWidth: 0, alignItems: "flex-start", gap: 2 },
  word: { fontSize: 19, fontWeight: "900", color: theme.ink, textAlign: "left" },
  reading: { color: theme.indigo, fontSize: 13, fontWeight: "700" },
  meaning: { flex: 1, minWidth: 0, textAlign: "left", fontSize: 14, fontWeight: "700", color: theme.inkSoft, lineHeight: 20 },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 2 },
  detailCue: { fontSize: 11, fontWeight: "900" },
  emptyCard: {
    width: "100%",
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: theme.ink },
  emptyBody: { fontSize: 13, color: theme.inkSoft, textAlign: "center" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(22, 27, 46, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "78%",
    backgroundColor: theme.white,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  dialogTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  modalLevelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  modalLevelText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  closePill: {
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  closePillText: { color: theme.ink, fontSize: 12, fontWeight: "800" },
  dialogHero: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  dialogReading: { color: theme.indigo, fontSize: 13, fontWeight: "700" },
  dialogWord: { fontSize: 28, fontWeight: "900", color: theme.ink, textAlign: "center" },
  dialogMeaning: { fontSize: 16, fontWeight: "700", color: theme.inkSoft, textAlign: "center" },
  statBlock: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  statHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statLabel: { color: theme.ink, fontSize: 13, fontWeight: "900" },
  statDetail: { color: theme.inkSoft, fontSize: 11, fontWeight: "700" },
  levels: { flexDirection: "row", gap: 6, marginTop: 2 },
  levelButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 9,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  levelButtonOn: { backgroundColor: theme.indigo, borderColor: theme.indigo },
  levelText: { color: theme.inkSoft, fontWeight: "800", fontSize: 12 },
  levelTextOn: { color: "#fff" },
  noteScroll: { maxHeight: 160 },
  noteCallout: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
    padding: 12,
    gap: 6,
  },
  noteCalloutBadge: { color: "#047857", fontSize: 12, fontWeight: "900" },
  dialogScroll: { flexGrow: 0 },
  dialogBody: { fontSize: 14, lineHeight: 22, color: theme.ink, fontWeight: "500" },
});
