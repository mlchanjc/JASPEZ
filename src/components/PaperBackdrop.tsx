import { StyleSheet, View } from "react-native";

export function PaperBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orb, styles.orbCoral]} />
      <View style={[styles.orb, styles.orbMint]} />
      <View style={[styles.orb, styles.orbIndigo]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbCoral: {
    width: 240,
    height: 240,
    backgroundColor: "rgba(255, 90, 95, 0.09)",
    top: -90,
    right: -70,
  },
  orbMint: {
    width: 200,
    height: 200,
    backgroundColor: "rgba(16, 185, 129, 0.09)",
    bottom: 90,
    left: -70,
  },
  orbIndigo: {
    width: 170,
    height: 170,
    backgroundColor: "rgba(79, 70, 229, 0.07)",
    top: 220,
    right: -60,
  },
});
