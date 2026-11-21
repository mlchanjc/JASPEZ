import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { attemptStats, PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { theme } from "@/theme";
import { ProficiencyMeter } from "./ProficiencyMeter";

function hasNote(word: VocabWord) {
  return Boolean(word.extraInfo && word.extraInfo.trim());
}

export function VocabList({ level, topicId, words }: { level: LevelId; topicId: string; words: VocabWord[] }) {
  const { attempts, learned, setProficiency } = useProgress();
  const { width } = useWindowDimensions();
  const singleColumn = width < 720;
  const [note, setNote] = useState<VocabWord | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedWord = selected == null ? null : words[selected];
  const selectedKey = selected == null ? "" : wordKey(level, topicId, selected);
  const selectedStats = attemptStats(selected == null ? undefined : attempts[selectedKey]);

  return (
    <>
      <ScrollView style={styles.list} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {words.map((word, index) => (
          <View key={`${word.word}-${word.reading}-${index}`} style={[styles.card, singleColumn && styles.cardSingle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${word.word} 詳情`}
              onPress={() => setSelected(index)}
              style={styles.cardPress}
            />
            <View style={styles.row} pointerEvents="box-none">
              <View style={styles.japanese} pointerEvents="none">
                <Text style={styles.word}>{word.word}</Text>
                <View style={styles.sound}>
                  <Text style={styles.reading}>{word.reading}</Text>
                  <Text style={styles.accent}>{word.accent || "—"}</Text>
                </View>
              </View>
              <Text style={styles.meaning} pointerEvents="none">
                {word.meaning}
              </Text>
              <View style={styles.noteSlot}>
                {hasNote(word) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${word.word} 補充`}
                    onPress={() => setNote(word)}
                    style={styles.noteButton}
                  >
                    <Text style={styles.noteLabel}>注</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {word.verbType ? (
              <Text style={styles.verb} pointerEvents="none">
                {word.verbType}
              </Text>
            ) : null}
            <View pointerEvents="none">
              <ProficiencyMeter value={attemptStats(attempts[wordKey(level, topicId, index)]).level} />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={selectedWord != null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <Pressable accessibilityLabel="關閉單字" style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selectedWord ? (
            <View style={styles.dialog}>
              <Text style={styles.dialogWord}>{selectedWord.word}</Text>
              <Text style={styles.dialogReading}>
                {selectedWord.reading}
                {selectedWord.accent ? `  ${selectedWord.accent}` : ""}
              </Text>
              <Text style={styles.dialogMeaning}>{selectedWord.meaning}</Text>
              {selectedWord.verbType ? <Text style={styles.verb}>{selectedWord.verbType}</Text> : null}
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>熟練度</Text>
                <ProficiencyMeter value={selectedStats.level} />
                <Text style={styles.statDetail}>
                  最近 {selectedStats.correct}/{selectedStats.total} 正確 · {learned.has(selectedKey) ? "測驗已答對" : "測驗尚未答對"}
                </Text>
              </View>
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
              {hasNote(selectedWord) ? (
                <ScrollView style={styles.noteScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.dialogBody}>{selectedWord.extraInfo}</Text>
                </ScrollView>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.closeButton}>
                <Text style={styles.closeLabel}>關閉</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={note != null} transparent animationType="fade" onRequestClose={() => setNote(null)}>
        <View style={styles.backdrop}>
          <Pressable accessibilityLabel="關閉補充" style={StyleSheet.absoluteFill} onPress={() => setNote(null)} />
          <View style={styles.dialog}>
            <Text style={styles.dialogWord}>{note?.word}</Text>
            <Text style={styles.dialogReading}>
              {note?.reading}
              {note?.accent ? `  ${note.accent}` : ""}
            </Text>
            <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.dialogBody}>{note?.extraInfo}</Text>
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setNote(null)} style={styles.closeButton}>
              <Text style={styles.closeLabel}>關閉</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    width: "48.5%",
    marginBottom: 12,
    backgroundColor: theme.white,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  cardSingle: { width: "100%" },
  cardPress: { ...StyleSheet.absoluteFillObject, borderRadius: 22 },
  row: { flexDirection: "row", alignItems: "center" },
  meaning: { flex: 1, textAlign: "left", fontSize: 16, fontWeight: "700", color: theme.ink },
  japanese: { flex: 1, alignItems: "flex-start", gap: 2 },
  word: { fontSize: 18, fontWeight: "800", color: theme.ink, textAlign: "left" },
  sound: { flexDirection: "row", alignItems: "center", gap: 8 },
  reading: { color: theme.indigo, fontWeight: "700" },
  accent: { color: theme.vermillion, fontSize: 12, fontWeight: "700" },
  noteSlot: { width: 36, marginLeft: 10, alignItems: "center" },
  verb: { color: theme.inkSoft, fontWeight: "700" },
  noteButton: {
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36, 62, 106, 0.1)",
  },
  noteLabel: { color: theme.indigo, fontWeight: "900" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(30, 36, 48, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "70%",
    backgroundColor: theme.paper,
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  dialogWord: { fontSize: 24, fontWeight: "800", color: theme.ink },
  dialogReading: { color: theme.indigo, fontWeight: "700" },
  dialogScroll: { flexGrow: 0 },
  dialogMeaning: { fontSize: 18, fontWeight: "700", color: theme.ink },
  statBlock: { marginTop: 8, gap: 6 },
  statLabel: { color: theme.inkSoft, fontWeight: "800" },
  statDetail: { color: theme.inkSoft, fontSize: 13 },
  levels: { flexDirection: "row", gap: 8, marginTop: 8 },
  levelButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(30, 36, 48, 0.06)",
  },
  levelButtonOn: { backgroundColor: theme.indigo },
  levelText: { color: theme.ink, fontWeight: "800", fontSize: 13 },
  levelTextOn: { color: "#fff" },
  noteScroll: { maxHeight: 140 },
  dialogBody: { marginTop: 8, fontSize: 16, lineHeight: 24, color: theme.ink },
  closeButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    backgroundColor: theme.indigo,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeLabel: { color: "#fff", fontWeight: "800" },
});
