import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";

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

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, selected && { backgroundColor: tab.color }]}
          >
            <Text style={[styles.label, { color: selected ? "#fff" : tab.color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.white,
    borderTopWidth: 1,
    borderTopColor: "rgba(30, 36, 48, 0.08)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 12,
  },
  label: { fontSize: 15, fontWeight: "800" },
});
