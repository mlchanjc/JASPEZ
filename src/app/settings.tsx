import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { LEVELS } from "@/data/registry";
import type { LevelId } from "@/data/types";
import { useProgress } from "@/state/progress";
import type { ThemePreset } from "@/state/progress";
import { THEME_PRESETS, useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

export default function SettingsScreen() {
  const { prefs, setPref, currentLevel, setCurrentLevel } = useProgress();
  const { t, isDark, preset, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const choosePreset = (next: ThemePreset) => {
    setPref("themePreset", next);
  };

  return (
    <View style={styles.screen}>
      <PaperBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backText}>← 返回</Text>
          </Pressable>
          <Text style={styles.title}>設定</Text>
          <Text style={styles.subtitle}>自訂外觀風格、深淺模式與個人學習偏好</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* 1. Theme Preset Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>介面風格</Text>
            <View style={styles.presetList}>
              {THEME_PRESETS.map((item) => {
                const selected = preset === item.id;
                const pv = isDark ? item.previewDark : item.previewLight;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => choosePreset(item.id)}
                    style={[styles.presetCard, selected && styles.presetCardSelected]}
                  >
                    {/* Live Mini Screen Preview */}
                    <View
                      style={[
                        styles.miniPreview,
                        {
                          backgroundColor: pv.paper,
                          borderColor: pv.paperBorder,
                          borderRadius: Math.min(pv.cardRadius, 12),
                        },
                      ]}
                    >
                      {pv.topRuleHeight > 0 && (
                        <View style={{ height: 2, backgroundColor: pv.vermillion, width: "100%" }} />
                      )}
                      <View style={styles.miniInner}>
                        <View style={styles.miniRow}>
                          <Text
                            style={[
                              styles.miniTitle,
                              { color: pv.ink, fontFamily: pv.serif },
                            ]}
                            numberOfLines={1}
                          >
                            今日の勉強
                          </Text>
                          <View
                            style={[
                              styles.miniDot,
                              { backgroundColor: pv.accentPrimary },
                            ]}
                          />
                        </View>
                        <View
                          style={[
                            styles.miniCard,
                            {
                              backgroundColor: pv.white,
                              borderColor: pv.paperBorder,
                              borderWidth: pv.cardBorderWidth,
                              borderRadius: Math.max(4, pv.cardRadius - 4),
                            },
                          ]}
                        >
                          <View style={[styles.miniBarTrack, { backgroundColor: pv.paperBorder, height: pv.barHeight }]}>
                            <View style={{ width: "68%", height: "100%", backgroundColor: pv.accentPrimary, borderRadius: 2 }} />
                          </View>
                          <View style={styles.miniBtnRow}>
                            <View
                              style={[
                                styles.miniBtn,
                                {
                                  backgroundColor: pv.surface,
                                  borderColor: pv.paperBorder,
                                  borderRadius: Math.max(3, pv.controlRadius - 2),
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.miniBtn,
                                {
                                  backgroundColor: pv.preset === "ios" ? pv.accentPrimary : pv.ink,
                                  borderColor: pv.preset === "ios" ? pv.accentPrimary : pv.ink,
                                  borderRadius: Math.max(3, pv.controlRadius - 2),
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Preset Metadata */}
                    <View style={styles.presetInfo}>
                      <View style={styles.presetHead}>
                        <Text style={styles.presetName}>{item.name}</Text>
                        <Text style={styles.presetEn}>{item.enName}</Text>
                        {selected && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>✓ 使用中</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.presetDesc}>{item.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 2. Light / Dark Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>顯示模式</Text>
            <View style={styles.card}>
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => setPref("darkMode", false)}
                  style={[styles.modeBtn, !isDark && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeBtnText, !isDark && styles.modeBtnTextActive]}>昼 · 淺色模式</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPref("darkMode", true)}
                  style={[styles.modeBtn, isDark && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeBtnText, isDark && styles.modeBtnTextActive]}>夜 · 深色模式</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* 3. Study Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>學習偏好</Text>
            <View style={styles.card}>
              <View style={styles.prefBlock}>
                <Text style={styles.prefTitle}>目標 JLPT 級別</Text>
                <View style={styles.levelRow}>
                  {LEVELS.map((lvl) => {
                    const active = currentLevel === lvl;
                    const col = levelAccent[lvl];
                    return (
                      <Pressable
                        key={lvl}
                        onPress={() => setCurrentLevel(lvl as LevelId)}
                        style={[
                          styles.levelBtn,
                          active && { backgroundColor: col, borderColor: col },
                        ]}
                      >
                        <Text style={[styles.levelBtnText, active && { color: "#FFFFFF" }]}>{lvl}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.divider} />

              <Pressable
                onPress={() => setPref("showFurigana", !prefs.showFurigana)}
                style={styles.toggleRow}
              >
                <View style={styles.toggleCopy}>
                  <Text style={styles.prefTitle}>顯示假名讀音</Text>
                  <Text style={styles.prefSub}>在文法課文、例句與活用練習中顯示平假名</Text>
                </View>
                <View style={[styles.switchPill, prefs.showFurigana && styles.switchPillOn]}>
                  <Text style={[styles.switchText, prefs.showFurigana && styles.switchTextOn]}>
                    {prefs.showFurigana ? "開" : "關"}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                onPress={() => setPref("kanaOnly", !prefs.kanaOnly)}
                style={styles.toggleRow}
              >
                <View style={styles.toggleCopy}>
                  <Text style={styles.prefTitle}>單字選詞只看假名</Text>
                  <Text style={styles.prefSub}>隱藏漢字選項，專注訓練假名與聽讀記憶</Text>
                </View>
                <View style={[styles.switchPill, prefs.kanaOnly && styles.switchPillOn]}>
                  <Text style={[styles.switchText, prefs.kanaOnly && styles.switchTextOn]}>
                    {prefs.kanaOnly ? "開" : "關"}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* 4. Offline Library Summary */}
          <View style={styles.aboutRow}>
            <Text style={styles.aboutText}>JASPEZ 離線日語特訓 · 2,195 單字 · 254 堂文法課 · 1,051 題易混題庫</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  const shadow = t.useShadow
    ? {
        shadowColor: "#111827",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }
    : {};

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.paper },
    safe: { flex: 1 },
    top: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 14,
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: t.paperBorder,
    },
    backBtn: {
      alignSelf: "flex-start",
      backgroundColor: t.white,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    backText: { color: t.ink, fontSize: 12.5, fontWeight: "700" },
    title: { fontFamily: t.serif, fontSize: 26, fontWeight: "700", color: t.ink, marginTop: 4 },
    subtitle: { fontSize: 12.5, color: t.inkSoft },
    content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 20 },
    section: { gap: 8 },
    sectionLabel: {
      fontSize: 11.5,
      fontWeight: "700",
      letterSpacing: 1,
      color: t.inkMuted,
      paddingHorizontal: 2,
    },
    presetList: { gap: 10 },
    presetCard: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
      padding: 13,
      gap: 11,
      ...shadow,
    },
    presetCardSelected: {
      borderColor: t.accentPrimary,
      borderWidth: 1.5,
    },
    miniPreview: {
      borderWidth: 1,
      overflow: "hidden",
    },
    miniInner: { padding: 10, gap: 8 },
    miniRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    miniTitle: { fontSize: 13, fontWeight: "700" },
    miniDot: { width: 8, height: 8, borderRadius: 4 },
    miniCard: { padding: 8, gap: 8 },
    miniBarTrack: { width: "100%", borderRadius: 99, overflow: "hidden" },
    miniBtnRow: { flexDirection: "row", gap: 6 },
    miniBtn: { flex: 1, height: 14, borderWidth: 1 },
    presetInfo: { gap: 4 },
    presetHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    presetName: { fontSize: 15, fontWeight: "700", color: t.ink },
    presetEn: { fontSize: 11.5, fontWeight: "600", color: t.inkMuted },
    activeBadge: {
      marginLeft: "auto",
      backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: t.controlRadius,
    },
    activeBadgeText: {
      color: t.preset === "ios" ? "#FFFFFF" : t.paper,
      fontSize: 11,
      fontWeight: "700",
    },
    presetDesc: { fontSize: 12.5, color: t.inkSoft, lineHeight: 19 },
    card: {
      backgroundColor: t.white,
      borderRadius: t.cardRadius,
      borderWidth: t.cardBorderWidth,
      borderColor: t.paperBorder,
      padding: 14,
      gap: 12,
      ...shadow,
    },
    modeRow: { flexDirection: "row", gap: 8 },
    modeBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 11,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    modeBtnActive: {
      backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink,
      borderColor: t.preset === "ios" ? t.accentPrimary : t.ink,
    },
    modeBtnText: { fontSize: 13, fontWeight: "700", color: t.inkSoft },
    modeBtnTextActive: { color: t.preset === "ios" ? "#FFFFFF" : t.paper },
    prefBlock: { gap: 8 },
    prefTitle: { fontSize: 14, fontWeight: "700", color: t.ink },
    prefSub: { fontSize: 12, color: t.inkSoft, marginTop: 2 },
    levelRow: { flexDirection: "row", gap: 6 },
    levelBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    levelBtnText: { fontSize: 12.5, fontWeight: "800", color: t.inkSoft },
    divider: { height: 1, backgroundColor: t.paperBorder },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    toggleCopy: { flex: 1, minWidth: 0 },
    switchPill: {
      minWidth: 44,
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    switchPillOn: {
      backgroundColor: t.preset === "ios" ? t.accentPrimary : t.ink,
      borderColor: t.preset === "ios" ? t.accentPrimary : t.ink,
    },
    switchText: { fontSize: 12, fontWeight: "700", color: t.inkSoft },
    switchTextOn: { color: t.preset === "ios" ? "#FFFFFF" : t.paper },
    aboutRow: { alignItems: "center", paddingTop: 4 },
    aboutText: { fontSize: 11.5, color: t.inkMuted, textAlign: "center" },
  });
}
