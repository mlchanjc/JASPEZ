import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type Props = {
  percent: number;
  color: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({ percent, color, trackColor = "rgba(30, 36, 48, 0.08)", height = 10 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, percent));

  useEffect(() => {
    Animated.timing(progress, { toValue: clamped, duration: 700, useNativeDriver: false }).start();
  }, [clamped, progress]);

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <Animated.View
        style={{
          height: "100%",
          borderRadius: height,
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
    borderRadius: 99,
    overflow: "hidden",
  },
});
