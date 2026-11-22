import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/theme";

export function PaperBackdrop() {
  const { t } = useAppTheme();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.paper }]}>
      {t.topRuleHeight > 0 ? (
        <View style={{ height: t.topRuleHeight, width: "100%", backgroundColor: t.vermillion, opacity: 0.8 }} />
      ) : null}
    </View>
  );
}
