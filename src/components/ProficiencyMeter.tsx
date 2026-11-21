import { StyleSheet, Text, View } from "react-native";
import { PROFICIENCY_LEVELS, clampProficiency, proficiencyLabel } from "@/lib/proficiency";
import { useAppTheme } from "@/theme";

export function ProficiencyMeter({ value }: { value: number }) {
  const { t } = useAppTheme();
  const level = clampProficiency(value);

  return (
    <View style={styles.row}>
      <View style={styles.pips}>
        {PROFICIENCY_LEVELS.map((label, index) => (
          <View
            key={label}
            style={[
              styles.pip,
              { backgroundColor: index <= level ? t.vermillion : t.paperBorder },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: t.inkSoft }]}>{proficiencyLabel(level)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  pips: { flexDirection: "row", gap: 4 },
  pip: { width: 14, height: 4, borderRadius: 2 },
  label: { fontSize: 11.5, fontWeight: "600" },
});
