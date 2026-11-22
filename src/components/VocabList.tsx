import { RubyText } from "@/components/RubyText";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import type { LevelId, VocabWord } from "@/data/types";
import { attemptStats, PROFICIENCY_LEVELS } from "@/lib/proficiency";
import { wordKey } from "@/lib/vocab";
import { useProgress } from "@/state/progress";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";
import { ProficiencyMeter } from "./ProficiencyMeter";

function hasNote(word: VocabWord) {
  return Boolean(word.extraInfo && word.extraInfo.trim());
}

export function VocabList({ level, topicId, words }: { level: LevelId; topicId: string; words: VocabWord[] }) {
  const { attempts, learned, setProficiency } = useProgress();
  const { t, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
            placeholderTextColor={t.inkMuted}
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
                    {word.verbType ? <Text style={styles.verbText}>{word.verbType}</Text> : null}
                    {word.accent ? <Text style={styles.accentText}>{word.accent}</Text> : null}
                    {isLearned ? <Text style={styles.learnedFlag}>✓ 已學</Text> : null}
                  </View>
                  {hasNote(word) ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${word.word} 補充`}
                      onPress={() => setNote(word)}
                      style={styles.noteButton}
                    >
                      <Text style={styles.noteLabel}>補充</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.row} pointerEvents="none">
                  <View style={styles.japanese}>
                    <RubyText
                      jp={word.word}
                      reading={word.reading}
                      showRuby={Boolean(word.reading && word.reading !== word.word)}
                      fontSize={20}
                      rtFontSize={10}
                    />
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
                  <Text style={[styles.modalLevelText, { color: accent }]}>{level}</Text>
                  {selectedWord.verbType ? <Text style={styles.verbText}>{selectedWord.verbType}</Text> : null}
                  {selectedWord.accent ? <Text style={styles.accentText}>{selectedWord.accent}</Text> : null}
                </View>
                <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.closePill}>
                  <Text style={styles.closePillText}>✕ 關閉</Text>
                </Pressable>
              </View>

              <View style={styles.dialogHero}>
                <RubyText
                  jp={selectedWord.word}
                  reading={selectedWord.reading}
                  showRuby={Boolean(selectedWord.reading && selectedWord.reading !== selectedWord.word)}
                  fontSize={30}
                  rtFontSize={12}
                  align="center"
                />
                <Text style={styles.dialogMeaning}>{selectedWord.meaning}</Text>
              </View>

              <View style={styles.statBlock}>
                <View style={styles.statHead}>
                  <Text style={styles.statLabel}>熟練度</Text>
                  <Text style={styles.statDetail}>
                    最近 {selectedStats.correct}/{selectedStats.total} 正確 ·{" "}
                    {learned.has(selectedKey) ? "✓ 測驗已答對" : "尚未答對"}
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
                    <Text style={styles.noteCalloutBadge}>補充說明</Text>
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
              <Text style={styles.noteCalloutBadge}>單字補充</Text>
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

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    searchBarWrap: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
    searchBox: {
      backgroundColor: t.white,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.paperBorder,
      paddingHorizontal: 12,
    },
    searchInput: { height: 38, fontSize: 13.5, color: t.ink },
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
      marginBottom: 10,
      backgroundColor: t.white,
      borderRadius: 8,
      padding: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    cardSingle: { width: "100%" },
    cardPress: { ...StyleSheet.absoluteFill, borderRadius: 8 },
    cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
    badges: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 },
    verbText: {
      color: t.goldDark,
      backgroundColor: t.goldSoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 11,
      fontWeight: "700",
    },
    accentText: { color: t.vermillion, fontSize: 11, fontWeight: "700" },
    learnedFlag: { color: t.matcha, fontSize: 11, fontWeight: "700" },
    noteButton: {
      zIndex: 1,
      borderWidth: 1,
      borderColor: t.paperBorder,
      backgroundColor: t.surface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    noteLabel: { color: t.inkSoft, fontSize: 11, fontWeight: "700" },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    japanese: { flex: 1, minWidth: 0, alignItems: "flex-start", gap: 2 },
    word: { fontFamily: t.serif, fontSize: 19, fontWeight: "700", color: t.ink, textAlign: "left" },
    reading: { color: t.indigo, fontSize: 12.5, fontWeight: "600" },
    meaning: { flex: 1, minWidth: 0, textAlign: "left", fontSize: 13.5, fontWeight: "600", color: t.inkSoft, lineHeight: 20 },
    cardFoot: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: t.paperBorder,
    },
    detailCue: { fontSize: 11.5, fontWeight: "700" },
    emptyCard: {
      width: "100%",
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
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(10, 9, 8, 0.58)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    dialog: {
      width: "100%",
      maxWidth: 440,
      maxHeight: "78%",
      backgroundColor: t.white,
      borderRadius: 10,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    dialogTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    modalLevelText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
    closePill: {
      backgroundColor: t.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    closePillText: { color: t.ink, fontSize: 12, fontWeight: "700" },
    dialogHero: {
      backgroundColor: t.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.paperBorder,
      padding: 16,
      alignItems: "center",
      gap: 4,
    },
    dialogReading: { color: t.indigo, fontSize: 13, fontWeight: "600" },
    dialogWord: { fontFamily: t.serif, fontSize: 28, fontWeight: "700", color: t.ink, textAlign: "center" },
    dialogMeaning: { fontSize: 15.5, fontWeight: "600", color: t.inkSoft, textAlign: "center" },
    statBlock: {
      borderWidth: 1,
      borderColor: t.paperBorder,
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    statHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    statLabel: { color: t.ink, fontSize: 12.5, fontWeight: "700" },
    statDetail: { color: t.inkSoft, fontSize: 11, fontWeight: "600" },
    levels: { flexDirection: "row", gap: 6, marginTop: 2 },
    levelButton: {
      flex: 1,
      alignItems: "center",
      borderRadius: 6,
      paddingVertical: 8,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    levelButtonOn: { backgroundColor: t.ink, borderColor: t.ink },
    levelText: { color: t.inkSoft, fontWeight: "700", fontSize: 12 },
    levelTextOn: { color: t.paper },
    noteScroll: { maxHeight: 160 },
    noteCallout: {
      backgroundColor: t.surface,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.paperBorder,
      borderLeftWidth: 3,
      borderLeftColor: t.vermillion,
      padding: 12,
      gap: 6,
    },
    noteCalloutBadge: { color: t.vermillion, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6 },
    dialogScroll: { flexGrow: 0 },
    dialogBody: { fontSize: 14, lineHeight: 22, color: t.ink },
  });
}
