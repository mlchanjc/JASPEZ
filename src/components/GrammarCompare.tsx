import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CONFUSABLE_PAIRS } from "@/data/grammar";
import { levelAccent, theme } from "@/theme";

export function GrammarCompare() {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>易混文法辨析</Text>
        <Text style={styles.bannerSub}>並排對照 N5–N3 最常搞混的句型，點選小測驗立刻驗收。</Text>
      </View>

      {CONFUSABLE_PAIRS.map((pair) => {
        const picked = answers[pair.id];
        const isCorrect = picked === pair.correct;
        const accent = levelAccent[pair.level];

        return (
          <View key={pair.id} style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.levelBadge, { backgroundColor: accent }]}>
                <Text style={styles.levelText}>{pair.level}</Text>
              </View>
              <View style={styles.headText}>
                <Text style={styles.title}>{pair.title}</Text>
                <Text style={styles.subtitle}>{pair.subtitle}</Text>
              </View>
            </View>

            <View style={styles.columns}>
              <View style={[styles.sideBox, { backgroundColor: theme.indigoSoft }]}>
                <Text style={[styles.sideLabel, { color: theme.indigo }]}>{pair.left.label}</Text>
                <Text style={styles.sideRule}>{pair.left.rule}</Text>
                <Text style={styles.sideExample}>{pair.left.example}</Text>
                <Text style={styles.sideTrans}>{pair.left.translation}</Text>
              </View>
              <View style={[styles.sideBox, { backgroundColor: theme.goldSoft }]}>
                <Text style={[styles.sideLabel, { color: theme.goldDark }]}>{pair.right.label}</Text>
                <Text style={styles.sideRule}>{pair.right.rule}</Text>
                <Text style={styles.sideExample}>{pair.right.example}</Text>
                <Text style={styles.sideTrans}>{pair.right.translation}</Text>
              </View>
            </View>

            <View style={styles.miniQuiz}>
              <Text style={styles.quizLabel}>⚡ 即時小測驗</Text>
              <Text style={styles.quizPrompt}>{pair.quizPrompt}</Text>
              <View style={styles.optionRow}>
                {pair.options.map((opt) => {
                  let bg = theme.white;
                  let border = theme.paperBorder;
                  let bottom = "#CBD5E1";
                  let color = theme.ink;
                  if (picked) {
                    if (opt === pair.correct) {
                      bg = theme.successSoft;
                      border = theme.success;
                      bottom = theme.matchaDark;
                      color = theme.matchaDark;
                    } else if (opt === picked) {
                      bg = theme.errorSoft;
                      border = theme.error;
                      bottom = theme.error;
                      color = theme.error;
                    } else {
                      color = theme.inkMuted;
                    }
                  }
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setAnswers((prev) => ({ ...prev, [pair.id]: opt }))}
                      style={[styles.optionBtn, { backgroundColor: bg, borderColor: border, borderBottomColor: bottom }]}
                    >
                      <Text style={[styles.optionText, { color }]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {picked && (
                <Text style={[styles.explanation, { color: isCorrect ? theme.matchaDark : theme.error }]}>
                  {isCorrect ? "✓ " : "✕ "}
                  {pair.explanation}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  banner: {
    backgroundColor: theme.indigo,
    borderRadius: 24,
    padding: 18,
    gap: 4,
  },
  bannerTitle: { fontSize: 18, fontWeight: "900", color: "#fff" },
  bannerSub: { fontSize: 13, color: "rgba(255, 255, 255, 0.85)", lineHeight: 19 },
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
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  headText: { flex: 1 },
  title: { fontSize: 18, fontWeight: "900", color: theme.ink },
  subtitle: { fontSize: 12, color: theme.inkSoft, fontWeight: "700", marginTop: 2 },
  columns: { flexDirection: "row", gap: 10 },
  sideBox: { flex: 1, borderRadius: 16, padding: 12, gap: 6 },
  sideLabel: { fontSize: 13, fontWeight: "900" },
  sideRule: { fontSize: 12, color: theme.ink, lineHeight: 18 },
  sideExample: { fontSize: 13, fontWeight: "800", color: theme.ink, paddingTop: 4 },
  sideTrans: { fontSize: 11, color: theme.inkSoft },
  miniQuiz: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  quizLabel: { fontSize: 11, fontWeight: "900", color: theme.vermillion },
  quizPrompt: { fontSize: 13, fontWeight: "700", color: theme.ink, lineHeight: 20 },
  optionRow: { flexDirection: "row", gap: 8 },
  optionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    alignItems: "center",
  },
  optionText: { fontSize: 14, fontWeight: "900" },
  explanation: { fontSize: 12, lineHeight: 18, fontWeight: "700" },
});
