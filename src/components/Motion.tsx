import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Animated, Pressable } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * Smoothly fades and slides a question card in whenever `triggerKey` changes.
 */
export function QuestionTransition({
  triggerKey,
  style,
  children,
}: {
  triggerKey: string | number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(10);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 220,
        friction: 22,
        useNativeDriver: true,
      }),
    ]).start();
  }, [triggerKey, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Smoothly slides up + fades in the bottom feedback dock upon answer submission.
 */
export function AnimatedFeedbackDock({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(26)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 240,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Tactile press-down wrapper for CTA buttons (下一題, 送出答案, etc.).
 */
export function TactilePress({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2],
  });
  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (disabled) return;
        Animated.timing(pressAnim, { toValue: 1, duration: 60, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(pressAnim, { toValue: 0, tension: 280, friction: 18, useNativeDriver: true }).start();
      }}
    >
      <Animated.View style={[style, { transform: [{ translateY }, { scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
