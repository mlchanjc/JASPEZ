import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/theme";

export function PaperBackdrop() {
  const { t } = useAppTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.paper }]} />;
}
