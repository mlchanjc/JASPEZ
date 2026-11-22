import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useAppTheme } from "@/theme";

export type ChoiceVisualState = "idle" | "correct" | "alt" | "wrong" | "muted";

type Props = {
  onPress: () => void;
  disabled?: boolean;
  state?: ChoiceVisualState;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Tactile 3D choice button inspired by the Grammar 活用練功 tiles:
 * - Crisp 3D bottom lip that physically depresses on press/mousedown
 * - Celebratory micro-pop on correct answer, crisp horizontal shake on wrong answer
 * - Always centers its content (whether ruby-annotated or plain kana/text)
 */
export function TactileChoiceButton({
  onPress,
  disabled = false,
  state = "idle",
  fullWidth = false,
  style,
  children,
}: Props) {
  const { t } = useAppTheme();
  const pressAnim = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === "correct" || state === "alt") {
      Animated.sequence([
        Animated.spring(feedbackScale, {
          toValue: 1.035,
          tension: 320,
          friction: 14,
          useNativeDriver: true,
        }),
        Animated.spring(feedbackScale, {
          toValue: 1,
          tension: 240,
          friction: 16,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (state === "wrong") {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -7, duration: 42, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 7, duration: 42, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -5, duration: 38, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 5, duration: 38, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 38, useNativeDriver: true }),
      ]).start();
    } else {
      feedbackScale.setValue(1);
      shakeX.setValue(0);
    }
  }, [state, feedbackScale, shakeX]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 65,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      tension: 300,
      friction: 18,
      useNativeDriver: true,
    }).start();
  };

  let bg = t.white;
  let border = t.paperBorder;
  let lip = t.choiceBottom;
  if (state === "correct") {
    bg = t.successSoft;
    border = t.success;
    lip = t.matchaDark;
  } else if (state === "alt") {
    bg = t.goldSoft;
    border = t.gold;
    lip = t.goldDark;
  } else if (state === "wrong") {
    bg = t.errorSoft;
    border = t.error;
    lip = t.error;
  } else if (state === "muted") {
    bg = t.surface;
    border = t.paperBorder;
    lip = t.paperBorder;
  }

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  });

  return (
    <Animated.View
      style={[
        styles.outer,
        fullWidth && styles.fullWidth,
        {
          transform: [{ translateX: shakeX }, { scale: feedbackScale }],
        },
        style,
      ]}
    >
      {/* Static 3D base lip underneath */}
      <View
        style={[
          styles.lipBase,
          {
            backgroundColor: lip,
            borderRadius: t.controlRadius,
          },
        ]}
      />
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.face,
            {
              backgroundColor: bg,
              borderColor: border,
              borderRadius: t.controlRadius,
              transform: [{ translateY }, { scale: pressScale }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexBasis: "46%",
    flexGrow: 1,
    minWidth: 120,
    paddingBottom: 3,
    position: "relative",
  },
  fullWidth: {
    flexBasis: "100%",
    width: "100%",
  },
  lipBase: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 3,
    bottom: 0,
  },
  pressable: {
    width: "100%",
  },
  face: {
    width: "100%",
    minHeight: 50,
    borderWidth: 1.25,
    paddingVertical: 11,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
