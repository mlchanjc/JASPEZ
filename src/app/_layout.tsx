import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { ProgressProvider } from "@/state/progress";
import { useAppTheme } from "@/theme";

const MAX_TABLET_WIDTH = 768;

function AppShell() {
  const { t, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = width > MAX_TABLET_WIDTH;

  return (
    <View style={[styles.outer, { backgroundColor: isWide ? t.paperDeep : t.paper }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={[
          styles.frame,
          { backgroundColor: t.paper },
          isWide && {
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: t.paperBorder,
          },
        ]}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.paper },
            animation: "slide_from_right",
          }}
        />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ProgressProvider>
        <AppShell />
      </ProgressProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: "center",
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_TABLET_WIDTH,
    overflow: "hidden",
  },
});
