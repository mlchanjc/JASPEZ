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
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              selected
                ? { backgroundColor: tab.color, borderColor: tab.color }
                : { backgroundColor: theme.surface, borderColor: theme.paperBorder },
            ]}
          >
            <Text style={[styles.label, { color: selected ? "#fff" : theme.inkSoft }]}>{tab.label}</Text>
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
    paddingHorizontal: 14,
    backgroundColor: theme.white,
    borderTopWidth: 1,
    borderTopColor: theme.paperBorder,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 11,
  },
  label: { fontSize: 14, fontWeight: "800" },
});
