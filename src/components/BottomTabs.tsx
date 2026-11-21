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
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              selected
                ? { backgroundColor: t.ink, borderColor: t.ink }
                : { backgroundColor: "transparent", borderColor: t.paperBorder },
            ]}
          >
            <Text style={[styles.label, { color: selected ? t.paper : t.inkSoft }]}>{tab.label}</Text>
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
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 10,
  },
  label: { fontSize: 13, fontWeight: "700", letterSpacing: 0.4 },
});
