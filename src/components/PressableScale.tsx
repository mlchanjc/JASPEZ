import { useRef } from "react";
import { Animated, Pressable } from "react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";

type Props = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PressableScale({ onPress, onPressIn, onPressOut, children, style, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 8 : 0 }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPress={(event) => {
        onPress?.(event);
      }}
      onPressIn={(event) => {
        animate(0.94);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}
      style={style}
    >
      <Animated.View style={{ flex: 1, alignItems: "center", justifyContent: "center", transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
