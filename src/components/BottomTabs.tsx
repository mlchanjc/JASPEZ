import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";

export type BottomTab = {
  id: string;
  label: string;
  color: string;
};

type Props = {
  tabs: BottomTab[];
  value: string;
  onChange: (id: string) => void;
};

export function BottomTabs({ tabs, value, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useAppTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: t.white,
          borderTopColor: t.paperBorder,
        },
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        const activeBg = t.preset === "ios" ? t.accentPrimary : t.ink;
        const activeFg = t.preset === "ios" ? "#FFFFFF" : t.paper;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              { borderRadius: t.controlRadius },
              selected
                ? { backgroundColor: activeBg, borderColor: activeBg }
                : { backgroundColor: t.preset === "ios" ? t.surface : "transparent", borderColor: t.paperBorder },
            ]}
          >
            <Text style={[styles.label, { color: selected ? activeFg : t.inkSoft }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 10,
  },
  label: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
});
