import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { ProgressProvider } from "@/state/progress";
import { theme } from "@/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ProgressProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.paper },
            animation: "slide_from_right",
          }}
        />
      </ProgressProvider>
    </SafeAreaProvider>
  );
}
