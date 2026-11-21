import { StyleSheet, View } from "react-native";

export function PaperBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobSide]} />
      <View style={styles.waveRow}>
        {Array.from({ length: 8 }, (_, index) => (
          <View key={index} style={[styles.wave, index % 2 === 0 ? styles.waveGold : styles.waveIndigo]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.35,
  },
  blobTop: {
    width: 220,
    height: 220,
    backgroundColor: "#F0C9A0",
    top: -80,
    right: -60,
  },
  blobSide: {
    width: 160,
    height: 160,
    backgroundColor: "#D7E3C8",
    bottom: 80,
    left: -50,
  },
  waveRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    flexDirection: "row",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  wave: {
    width: 56,
    height: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginRight: -8,
  },
  waveGold: { backgroundColor: "rgba(198, 161, 91, 0.35)" },
  waveIndigo: { backgroundColor: "rgba(36, 62, 106, 0.18)" },
});
