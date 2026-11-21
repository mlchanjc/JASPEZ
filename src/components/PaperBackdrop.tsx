import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/theme";

/**
 * Clean stationery backdrop: pure Washi / Sumi canvas with a subtle top editorial accent line.
 */
export function PaperBackdrop() {
  const { t } = useAppTheme();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.paper }]}>
      <View style={[styles.topRule, { backgroundColor: t.vermillion }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  topRule: {
    height: 2,
    width: "100%",
    opacity: 0.75,
  },
});
