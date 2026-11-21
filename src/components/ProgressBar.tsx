import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/theme";

type Props = {
  percent: number;
  color: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({ percent, color, trackColor, height = 4 }: Props) {
  const { t } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, percent));

  useEffect(() => {
    Animated.timing(progress, { toValue: clamped, duration: 550, useNativeDriver: false }).start();
  }, [clamped, progress]);

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor ?? t.paperBorder }]}>
      <Animated.View
        style={{
          height: "100%",
          borderRadius: 2,
          backgroundColor: color,
          width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    borderRadius: 2,
    overflow: "hidden",
  },
});
