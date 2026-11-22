import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { GrammarToken } from "@/data/types";
import { useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

type Props = {
  tokens: GrammarToken[];
  showFurigana: boolean;
  blankText?: string;
  blankStatus?: "idle" | "correct" | "wrong" | "filled";
  accentColor?: string;
  interactive?: boolean;
};

export function FuriganaSentence({
  tokens,
  showFurigana,
  blankText,
  blankStatus = "idle",
  accentColor,
  interactive = true,
}: Props) {
  const { t } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const resolvedAccent = accentColor ?? t.indigo;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selectedToken = selectedIdx !== null ? tokens[selectedIdx] : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
        {tokens.map((token, idx) => {
          if (token.blank) {
            const bg =
              blankStatus === "correct"
                ? t.successSoft
                : blankStatus === "wrong"
                  ? t.errorSoft
                  : blankStatus === "filled"
                    ? t.indigoSoft
                    : "rgba(36, 62, 106, 0.08)";
            const border =
              blankStatus === "correct"
                ? t.success
                : blankStatus === "wrong"
                  ? t.error
                  : resolvedAccent;
            const color =
              blankStatus === "correct"
                ? t.success
                : blankStatus === "wrong"
                  ? t.error
                  : resolvedAccent;

            return (
              <View key={`blank-${idx}`} style={styles.tokenColumn}>
                {showFurigana && <Text style={styles.rtPlaceholder}> </Text>}
                <View style={[styles.blankBox, { backgroundColor: bg, borderBottomColor: border }]}>
                  <Text style={[styles.blankText, { color }]}>{blankText || "　　　"}</Text>
                </View>
              </View>
            );
          }

          const tappable = interactive && Boolean(token.meaning);
          const isSelected = selectedIdx === idx;

          const inner = (
            <View style={[styles.tokenColumn, isSelected && styles.tokenSelected]}>
              {showFurigana && (
                <Text style={styles.rtText} numberOfLines={1}>
                  {token.rt ?? " "}
                </Text>
              )}
              <View style={tappable ? [styles.underlineBox, isSelected && { borderBottomColor: resolvedAccent }] : undefined}>
                <Text style={[styles.wordText, isSelected && { color: resolvedAccent }]}>{token.text}</Text>
              </View>
            </View>
          );

          if (!tappable) {
            return <View key={`tok-${idx}`}>{inner}</View>;
          }

          return (
            <Pressable
              key={`tok-${idx}`}
              onPress={() => setSelectedIdx(isSelected ? null : idx)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`查看單字 ${token.text}`}
            >
              {inner}
            </Pressable>
          );
        })}
      </View>

      {interactive && selectedToken && selectedToken.meaning && (
        <View style={styles.popover}>
          <View style={styles.popoverMain}>
            <View style={styles.popoverHead}>
              <Text style={styles.popoverWord}>{selectedToken.text}</Text>
              {selectedToken.reading && <Text style={styles.popoverReading}>{selectedToken.reading}</Text>}
            </View>
            <Text style={styles.popoverMeaning}>{selectedToken.meaning}</Text>
          </View>
          <Pressable onPress={() => setSelectedIdx(null)} hitSlop={10} style={styles.popoverClose}>
            <Text style={styles.popoverCloseText}>✕</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
  wrap: { gap: 10 },
  line: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    rowGap: 10,
  },
  tokenColumn: {
    alignItems: "center",
    paddingHorizontal: 1,
    borderRadius: 6,
  },
  tokenSelected: {
    backgroundColor: t.indigoSoft,
  },
  rtText: {
    fontSize: 10,
    lineHeight: 13,
    color: t.inkSoft,
    fontWeight: "600",
    marginBottom: 1,
  },
  rtPlaceholder: {
    fontSize: 10,
    lineHeight: 13,
    marginBottom: 1,
  },
  underlineBox: {
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderBottomColor: "rgba(92, 83, 72, 0.45)",
    paddingBottom: 1,
  },
  wordText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    color: t.ink,
  },
  blankBox: {
    minWidth: 78,
    paddingHorizontal: 10,
    paddingVertical: 1,
    marginHorizontal: 3,
    borderRadius: 8,
    borderBottomWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  blankText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "800",
  },
  popover: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.paperBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  popoverMain: { flex: 1, gap: 2 },
  popoverHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  popoverWord: { fontSize: 16, fontWeight: "800", color: t.indigo },
  popoverReading: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
  popoverMeaning: { fontSize: 13, color: t.ink, fontWeight: "600" },
  popoverClose: { padding: 4 },
  popoverCloseText: { fontSize: 14, fontWeight: "800", color: t.inkMuted },
});
}
