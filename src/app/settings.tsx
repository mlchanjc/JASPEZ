import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PaperBackdrop } from "@/components/PaperBackdrop";
import { ARENA_BANK } from "@/data/arenaBank";
import { LEVELS } from "@/data/registry";
import type { LevelId } from "@/data/types";
import { useProgress } from "@/state/progress";
import type { ThemePreset } from "@/state/progress";
import { THEME_PRESETS, useAppTheme } from "@/theme";
import type { AppTheme } from "@/theme";

export default function SettingsScreen() {
  const {
    prefs,
    setPref,
    currentLevel,
    setCurrentLevel,
    streak,
    learnedCount,
    grammarLearnedCount,
    arenaAttempts,
    exportProgressJson,
    importProgressJson,
  } = useProgress();
  const { t, isDark, preset, levelAccent } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showImportBox, setShowImportBox] = useState(false);
  const [importDraft, setImportDraft] = useState("");
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const arenaPracticedCount = useMemo(() => Object.keys(arenaAttempts).length, [arenaAttempts]);

  const choosePreset = (next: ThemePreset) => {
    setPref("themePreset", next);
  };

  const handleExportAndShare = async () => {
    const jsonPayload = exportProgressJson();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `jaspez-backup-${dateStamp}.json`;

    try {
      if (Platform.OS === "web") {
        // Trigger direct .json download on web, plus Web Share API if available
        const g = globalThis as unknown as {
          document?: {
            createElement: (tag: string) => {
              href: string;
              download: string;
              click: () => void;
            };
          };
          URL?: {
            createObjectURL: (b: Blob) => string;
            revokeObjectURL: (u: string) => void;
          };
          navigator?: {
            share?: (opts: { title?: string; text?: string }) => Promise<void>;
            clipboard?: { writeText: (text: string) => Promise<void> };
          };
        };

        if (g.document && g.URL && typeof Blob !== "undefined") {
          const blob = new Blob([jsonPayload], { type: "application/json;charset=utf-8" });
          const url = g.URL.createObjectURL(blob);
          const link = g.document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          g.URL.revokeObjectURL(url);
          setExportStatus(`已下載備份檔 ${filename}`);
          return;
        }
        if (g.navigator?.share) {
          await g.navigator.share({ title: "JASPEZ 學習進度備份", text: jsonPayload });
          setExportStatus("已開啟系統分享選單");
          return;
        }
        if (g.navigator?.clipboard) {
          await g.navigator.clipboard.writeText(jsonPayload);
          setExportStatus("已複製備份 JSON 至剪貼簿");
          return;
        }
      }

      // Native iOS / Android: write .json file & share as real file attachment (WhatsApp, Discord, LINE, Files)
      try {
        const canShareFile = await Sharing.isAvailableAsync();
        const fsAny = FileSystem as unknown as {
          cacheDirectory?: string | null;
          writeAsStringAsync?: (uri: string, content: string) => Promise<void>;
          Paths?: { cache?: { uri: string } };
          File?: new (dir: unknown, name: string) => { uri: string; write: (content: string) => void };
        };
        let fileUri: string | null = null;
        if (fsAny.File && fsAny.Paths?.cache) {
          const f = new fsAny.File(fsAny.Paths.cache, filename);
          f.write(jsonPayload);
          fileUri = f.uri;
        } else if (fsAny.cacheDirectory && fsAny.writeAsStringAsync) {
          fileUri = `${fsAny.cacheDirectory}${filename}`;
          await fsAny.writeAsStringAsync(fileUri, jsonPayload);
        }
        if (canShareFile && fileUri) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/json",
            dialogTitle: "匯出並分享 JASPEZ 備份檔",
            UTI: "public.json",
          });
          setExportStatus(`已匯出備份檔 ${filename}`);
          return;
        }
      } catch {
        // Fallback to plain Share sheet below
      }

      const result = await Share.share(
        {
          title: `JASPEZ 學習進度備份 (${dateStamp})`,
          message: jsonPayload,
        },
        {
          dialogTitle: "匯出並分享 JASPEZ 學習資料",
          subject: `JASPEZ 學習進度備份 (${dateStamp})`,
        },
      );
      if (result.action === Share.sharedAction) {
        setExportStatus("已匯出並分享學習資料");
      } else {
        setExportStatus("已取消分享");
      }
    } catch {
      Alert.alert("匯出失敗", "無法開啟分享選單，請稍後再試。");
    }
  };

  const handleUploadBackupFile = async () => {
    setImportFeedback(null);
    try {
      if (Platform.OS === "web") {
        const g = globalThis as unknown as {
          document?: {
            createElement: (tag: string) => {
              type: string;
              accept: string;
              onchange: ((e: unknown) => void) | null;
              files?: { 0?: Blob };
              click: () => void;
            };
          };
        };
        if (!g.document) {
          setImportFeedback({ ok: false, msg: "目前環境不支援檔案上傳，請使用下方貼上方式。" });
          return;
        }
        const input = g.document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json,text/plain";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const res = importProgressJson(text);
            if (res.ok) {
              setImportFeedback({ ok: true, msg: "已從備份檔成功還原學習進度與偏好設定！" });
            } else {
              setImportFeedback({ ok: false, msg: res.error ?? "匯入失敗，請確認檔案格式。" });
            }
          } catch {
            setImportFeedback({ ok: false, msg: "無法讀取選擇的檔案，請確認為有效的 JSON 備份檔。" });
          }
        };
        input.click();
        return;
      }

      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets || picked.assets.length === 0) {
        return;
      }
      const asset = picked.assets[0];
      const response = await fetch(asset.uri);
      const text = await response.text();
      const res = importProgressJson(text);
      if (res.ok) {
        setImportFeedback({ ok: true, msg: `已從「${asset.name}」成功還原學習進度！` });
      } else {
        setImportFeedback({ ok: false, msg: res.error ?? "匯入失敗，請確認檔案格式。" });
      }
    } catch {
      setImportFeedback({ ok: false, msg: "讀取備份檔失敗，請確認選擇了有效的 .json 備份檔。" });
    }
  };

  const handleImport = () => {
    const res = importProgressJson(importDraft);
    if (res.ok) {
      setImportFeedback({ ok: true, msg: "已成功還原學習進度與偏好設定！" });
      setImportDraft("");
    } else {
      setImportFeedback({ ok: false, msg: res.error ?? "匯入失敗，請確認格式。" });
    }
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
          <Text style={styles.subtitle}>自訂外觀風格、深淺模式、個人偏好與資料備份</Text>
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

          {/* 4. Data Export & Share */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>學習資料備份與分享</Text>
            <View style={styles.card}>
              <View style={styles.prefBlock}>
                <Text style={styles.prefTitle}>匯出個人學習進度</Text>
                <Text style={styles.prefSub}>
                  目前紀錄：連勝 {streak} 天 · 單字 {learnedCount} 筆 · 文法 {grammarLearnedCount} 堂 · 擂台 {arenaPracticedCount} 題
                </Text>
                <Text style={styles.prefSub}>
                  可透過系統分享傳送至 WhatsApp、Discord、LINE、備忘錄或檔案備份。
                </Text>
              </View>

              <View style={styles.dataActionsRow}>
                <Pressable onPress={handleExportAndShare} style={styles.primaryActionBtn}>
                  <Text style={styles.primaryActionText}>匯出 .json 並分享 →</Text>
                </Pressable>
                <Pressable onPress={handleUploadBackupFile} style={styles.secondaryActionBtn}>
                  <Text style={styles.secondaryActionText}>上傳 .json 還原</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => {
                  setShowImportBox((prev) => !prev);
                  setImportFeedback(null);
                }}
                style={styles.linkToggleBtn}
              >
                <Text style={styles.linkToggleText}>
                  {showImportBox ? "▴ 收合手動貼上 JSON" : "▾ 或手動貼上備份 JSON 文字"}
                </Text>
              </Pressable>

              {exportStatus ? <Text style={styles.statusNote}>{exportStatus}</Text> : null}
              {!showImportBox && importFeedback ? (
                <Text
                  style={[
                    styles.statusNote,
                    { color: importFeedback.ok ? t.matchaDark : t.error },
                  ]}
                >
                  {importFeedback.msg}
                </Text>
              ) : null}

              {showImportBox && (
                <View style={styles.importBox}>
                  <Text style={styles.prefSub}>
                    若無法選擇檔案，也可將備份 JSON 文字直接貼於下方還原：
                  </Text>
                  <TextInput
                    value={importDraft}
                    onChangeText={setImportDraft}
                    placeholder='貼上 JASPEZ 備份 JSON（{ "app": "JASPEZ", ... }）'
                    placeholderTextColor={t.inkMuted}
                    multiline
                    textAlignVertical="top"
                    style={styles.importInput}
                  />
                  <Pressable
                    onPress={handleImport}
                    disabled={importDraft.trim().length === 0}
                    style={[
                      styles.primaryActionBtn,
                      importDraft.trim().length === 0 && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.primaryActionText}>確認還原資料</Text>
                  </Pressable>
                  {importFeedback ? (
                    <Text
                      style={[
                        styles.statusNote,
                        { color: importFeedback.ok ? t.matchaDark : t.error },
                      ]}
                    >
                      {importFeedback.msg}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* 5. Offline Library Summary */}
          <View style={styles.aboutRow}>
            <Text style={styles.aboutText}>
              JASPEZ 離線日語特訓 · 2,195 單字 · 254 堂文法課 · {ARENA_BANK.length.toLocaleString()} 題易混題庫
            </Text>
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
    prefBlock: { gap: 4 },
    prefTitle: { fontSize: 14, fontWeight: "700", color: t.ink },
    prefSub: { fontSize: 12, color: t.inkSoft, lineHeight: 18 },
    levelRow: { flexDirection: "row", gap: 6, marginTop: 4 },
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
    dataActionsRow: { flexDirection: "row", gap: 8 },
    primaryActionBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: t.controlRadius,
      backgroundColor: t.accentPrimary,
    },
    primaryActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
    secondaryActionBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: t.controlRadius,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.paperBorder,
    },
    secondaryActionText: { color: t.ink, fontSize: 13, fontWeight: "700" },
    linkToggleBtn: { alignSelf: "flex-start", paddingVertical: 2 },
    linkToggleText: { fontSize: 12, fontWeight: "600", color: t.inkSoft },
    statusNote: { fontSize: 12, fontWeight: "600", color: t.matchaDark },
    importBox: {
      gap: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: t.paperBorder,
    },
    importInput: {
      minHeight: 92,
      maxHeight: 160,
      backgroundColor: t.surface,
      borderRadius: t.controlRadius,
      borderWidth: 1,
      borderColor: t.paperBorder,
      padding: 10,
      fontSize: 12,
      color: t.ink,
    },
    btnDisabled: { opacity: 0.45 },
    aboutRow: { alignItems: "center", paddingTop: 4 },
    aboutText: { fontSize: 11.5, color: t.inkMuted, textAlign: "center" },
  });
}
