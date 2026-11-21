import { StyleSheet, Text, View } from "react-native";
import { PROFICIENCY_LEVELS, clampProficiency, proficiencyLabel } from "@/lib/proficiency";
import { theme } from "@/theme";

export function ProficiencyMeter({ value }: { value: number }) {
  const level = clampProficiency(value);

  return (
    <View style={styles.row}>
      <View style={styles.pips}>
        {PROFICIENCY_LEVELS.map((label, index) => (
          <View key={label} style={[styles.pip, index <= level && styles.pipOn]} />
        ))}
      </View>
      <Text style={styles.label}>{proficiencyLabel(level)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  pips: { flexDirection: "row", gap: 4 },
  pip: { width: 16, height: 6, borderRadius: 3, backgroundColor: "rgba(30, 36, 48, 0.12)" },
  pipOn: { backgroundColor: theme.indigo },
  label: { color: theme.inkSoft, fontSize: 12, fontWeight: "700" },
});
