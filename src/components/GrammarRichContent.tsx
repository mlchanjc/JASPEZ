import { useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { resolveGrammarImage } from "@/data/grammarImages";
import type { GrammarBlock, GrammarExample, GrammarLesson, GrammarTableCell, LevelId } from "@/data/types";
import { theme } from "@/theme";

type Props = {
  lesson: GrammarLesson;
  showFurigana: boolean;
  accentColor: string;
  onNavigateLesson?: (level: LevelId, id: string) => void;
};

type CalloutStyleMeta = {
  badge: string;
  bg: string;
  border: string;
  accent: string;
  titleColor: string;
};

const CALLOUT_STYLES: Record<string, CalloutStyleMeta> = {
  warning: {
    badge: "⚠️ 注意",
    bg: "#FFF1F2",
    border: "#FECDD3",
    accent: "#F43F5E",
    titleColor: "#BE123C",
  },
  point: {
    badge: "💡 重點",
    bg: "#FFFBEB",
    border: "#FDE68A",
    accent: "#F59E0B",
    titleColor: "#B45309",
  },
  note: {
    badge: "📝 說明",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    accent: "#4F46E5",
    titleColor: "#3730A3",
  },
  hosoku: {
    badge: "📌 補充",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    accent: "#10B981",
    titleColor: "#047857",
  },
};

type ZoomState = {
  source: ImageSourcePropType;
  alt?: string;
  aspectRatio: number;
};

/**
 * Repairs stray inline newlines created when HTML <span lang="ja">, <ruby>, <rt>, <rp>
 * tags were flattened into text, while preserving genuine paragraph breaks.
 */
function cleanInlineText(raw: string): string {
  if (!raw) return "";
  const lines = raw.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return lines[0] ?? "";

  const out: string[] = [lines[0]];
  for (let i = 1; i < lines.length; i += 1) {
    const prev = out[out.length - 1];
    const curr = lines[i];

    // Keep explicit paragraph breaks:
    // 1) Previous line ends a full sentence (。！？) and current line starts a new Chinese/bullet sentence
    const prevEndsSentence = /[。！？]$/.test(prev);
    const currIsBullet = /^[※・●■◆▶★☆]|^\d+[.、．]/.test(curr);
    // 2) Short standalone title line (e.g. "關於名詞與形容動詞的接續" or "重點") at index 0
    const prevIsHeading = i === 1 && prev.length <= 18 && !/[。、，,「『（(：:]$/.test(prev) && !/^[A-Za-z0-9①②③④]/.test(curr);
    // 3) Lesson reference line (e.g. "N4 文法06...")
    const currIsLessonRef = /^N[1-5]\s*文法/.test(curr);

    if (currIsBullet || currIsLessonRef || prevIsHeading || (prevEndsSentence && curr.length > 2 && !/^[」』）)。、，,]/.test(curr))) {
      out.push(curr);
    } else {
      // Join inline fragment directly without breaking the line
      out[out.length - 1] = `${prev}${curr}`;
    }
  }

  return out.join("\n").trim();
}

function parseInternalGrammarHref(href: string): { level: LevelId; id: string } | null {
  const m = href.match(/\/grammar\/(n[1-5])\/(\d+)/i);
  if (!m) return null;
  const level = m[1].toUpperCase() as LevelId;
  const id = m[2].padStart(2, "0");
  return { level, id };
}

function normalizeExamples(items: GrammarExample[]): GrammarExample[] {
  const clean: GrammarExample[] = [];
  for (const ex of items) {
    if (!ex || typeof ex.ja !== "string") continue;
    const ja = ex.ja.trim();
    const zh = (ex.zh ?? "").trim();
    if (!ja) continue;
    if (zh && ja === zh) continue;
    clean.push(ex);
  }
  return clean;
}

/**
 * Groups consecutive blocks that belong together in a `<div class="block">` on the original page:
 * - A `pattern` block + immediately following `note` block(s) -> rendered together in ONE shaded grammar block card.
 * - Leading standalone `note` block(s) right before `examples` -> rendered inside a shaded grammar block card.
 */
type RenderItem =
  | { kind: "grammarGroup"; pattern?: { pattern: string; connection?: string[] }; notes: string[] }
  | { kind: "single"; block: GrammarBlock };

function stripDuplicateConnection(text: string, connection?: string[]): string {
  if (!connection || connection.length === 0) return text;
  const connSet = new Set(["詳細接續：", "詳細接續:", ...connection.map((c) => c.trim())]);
  return text
    .split("\n")
    .filter((line) => !connSet.has(line.trim()))
    .join("\n")
    .trim();
}

function groupBlocksForRender(blocks: GrammarBlock[]): RenderItem[] {
  const items: RenderItem[] = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];
    if (!b) {
      i += 1;
      continue;
    }

    // Case A: pattern + immediately following explicit HTML `block` -> unified .block card
    if (b.type === "pattern") {
      const notes: string[] = [];
      let j = i + 1;
      while (j < blocks.length && blocks[j]?.type === "block") {
        const rawText = cleanInlineText((blocks[j] as { type: "block"; text: string }).text ?? "");
        const deduped = stripDuplicateConnection(rawText, b.connection);
        if (deduped) notes.push(deduped);
        j += 1;
      }
      items.push({
        kind: "grammarGroup",
        pattern: { pattern: b.pattern, connection: b.connection },
        notes,
      });
      i = j;
      continue;
    }

    // Case B: standalone explicit HTML `block` -> styled .block card
    if (b.type === "block") {
      const t = cleanInlineText(b.text ?? "");
      if (t) items.push({ kind: "grammarGroup", notes: [t] });
      i += 1;
      continue;
    }

    // Plain `note` (<p>) always renders as normal text, never wrapped in .block
    items.push({ kind: "single", block: b });
    i += 1;
  }

  return items;
}

function TableBlockView({
  caption,
  rows,
  showFurigana,
}: {
  caption?: string;
  rows: GrammarTableCell[][];
  showFurigana: boolean;
}) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const maxCols = rows.reduce((max, r) => {
    const spanSum = r.reduce((s, c) => s + (c.colspan ?? 1), 0);
    return Math.max(max, spanSum);
  }, 1);
  const baseColWidth = maxCols <= 2 ? 150 : maxCols === 3 ? 118 : 104;

  return (
    <View style={styles.tableWrap}>
      {caption ? <Text style={styles.tableCaption}>{caption}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableBox}>
          {rows.map((row, rIdx) => {
            const isHeaderRow = row.every((c) => c.header);
            return (
              <View
                key={`r-${rIdx}`}
                style={[
                  styles.tableRow,
                  rIdx > 0 && styles.tableRowBorder,
                  isHeaderRow ? styles.tableHeaderRow : rIdx % 2 === 1 ? styles.tableRowAlt : undefined,
                ]}
              >
                {row.map((cell, cIdx) => {
                  const span = cell.colspan ?? 1;
                  const cellWidth = baseColWidth * span;
                  return (
                    <View
                      key={`c-${rIdx}-${cIdx}`}
                      style={[
                        styles.tableCell,
                        { width: cellWidth },
                        cIdx > 0 && styles.tableCellBorder,
                        cell.header && styles.tableCellHeader,
                      ]}
                    >
                      <Text style={[styles.tableCellText, cell.header && styles.tableCellHeaderText]}>
                        {cleanInlineText(cell.text ?? "")}
                      </Text>
                      {showFurigana && cell.reading ? (
                        <Text style={styles.tableCellReading}>{cell.reading}</Text>
                      ) : null}
                      {cell.zh ? <Text style={styles.tableCellZh}>{cell.zh}</Text> : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function ImageBlockView({
  src,
  alt,
  maxWidth,
  onZoom,
}: {
  src: string;
  alt?: string;
  maxWidth: number;
  onZoom: (zoom: ZoomState) => void;
}) {
  const bundled = resolveGrammarImage(src);
  const source: ImageSourcePropType = bundled ? bundled.source : { uri: src };
  const aspectRatio = bundled ? bundled.width / Math.max(1, bundled.height) : 16 / 9;

  // Constrain strictly inside screen/card width and cap height for tall infographics
  const rawHeight = maxWidth / aspectRatio;
  const maxInlineHeight = 340;
  const fitHeight = Math.min(rawHeight, maxInlineHeight);
  const fitWidth = Math.min(maxWidth, fitHeight * aspectRatio);

  return (
    <Pressable
      onPress={() => onZoom({ source, alt, aspectRatio })}
      style={styles.imageCard}
      accessibilityRole="button"
      accessibilityLabel={alt ? `放大圖片：${alt}` : "放大圖片"}
    >
      <View style={styles.imageCenter}>
        <Image
          source={source}
          style={{ width: fitWidth, height: fitHeight, borderRadius: 10 }}
          resizeMode="contain"
        />
      </View>
      <View style={styles.imageFooter}>
        <Text style={styles.imageCaption} numberOfLines={1}>
          {alt || "文法圖解"}
        </Text>
        <Text style={styles.zoomHint}>🔍 點擊放大</Text>
      </View>
    </Pressable>
  );
}

function BlockList({
  blocks,
  showFurigana,
  accentColor,
  maxImgWidth,
  onZoom,
  onNavigateLesson,
}: {
  blocks: GrammarBlock[];
  showFurigana: boolean;
  accentColor: string;
  maxImgWidth: number;
  onZoom: (zoom: ZoomState) => void;
  onNavigateLesson?: (level: LevelId, id: string) => void;
}) {
  const grouped = groupBlocksForRender(blocks);

  return (
    <View style={styles.blockStack}>
      {grouped.map((entry, idx) => {
        if (entry.kind === "grammarGroup") {
          return (
            <View key={`grp-${idx}`} style={[styles.grammarBlockCard, { borderLeftColor: accentColor }]}>
              {entry.pattern && (
                <View style={styles.patternHeader}>
                  <Text style={[styles.patternLabel, { color: accentColor }]}>文法句型</Text>
                  <Text style={styles.patternValue}>{entry.pattern.pattern}</Text>
                  {Array.isArray(entry.pattern.connection) && entry.pattern.connection.length > 0 && (
                    <View style={styles.connList}>
                      {entry.pattern.connection.map((line, i) => (
                        <Text key={i} style={styles.connLine}>
                          • {line}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
              {entry.pattern && entry.notes.length > 0 && <View style={styles.blockDivider} />}
              {entry.notes.map((n, nIdx) => (
                <Text key={`gn-${nIdx}`} style={styles.blockNoteText}>
                  {n}
                </Text>
              ))}
            </View>
          );
        }

        const block = entry.block;

        if (block.type === "note") {
          const text = cleanInlineText(block.text ?? "");
          if (!text) return null;
          return (
            <Text key={`note-${idx}`} style={styles.noteText}>
              {text}
            </Text>
          );
        }

        if (block.type === "callout") {
          const meta = CALLOUT_STYLES[block.kind ?? "note"] ?? CALLOUT_STYLES.note;
          const text = block.text ? cleanInlineText(block.text) : "";
          return (
            <View
              key={`callout-${idx}`}
              style={[
                styles.calloutBox,
                { backgroundColor: meta.bg, borderColor: meta.border, borderLeftColor: meta.accent },
              ]}
            >
              <Text style={[styles.calloutBadge, { color: meta.titleColor }]}>{meta.badge}</Text>
              {text ? <Text style={styles.calloutText}>{text}</Text> : null}
              {Array.isArray(block.blocks) && block.blocks.length > 0 && (
                <BlockList
                  blocks={block.blocks}
                  showFurigana={showFurigana}
                  accentColor={accentColor}
                  maxImgWidth={Math.max(180, maxImgWidth - 24)}
                  onZoom={onZoom}
                  onNavigateLesson={onNavigateLesson}
                />
              )}
            </View>
          );
        }

        if (block.type === "table") {
          return (
            <TableBlockView
              key={`tbl-${idx}`}
              caption={block.caption}
              rows={block.rows}
              showFurigana={showFurigana}
            />
          );
        }

        if (block.type === "image") {
          return (
            <ImageBlockView
              key={`img-${idx}`}
              src={block.src}
              alt={block.alt}
              maxWidth={maxImgWidth}
              onZoom={onZoom}
            />
          );
        }

        if (block.type === "examples") {
          const items = normalizeExamples(block.items ?? []);
          if (items.length === 0) return null;
          return (
            <View key={`ex-${idx}`} style={styles.examplesStack}>
              {items.map((ex, eIdx) => (
                <View key={`exi-${eIdx}`} style={styles.exampleItem}>
                  <View style={styles.exampleRow}>
                    <View style={[styles.exampleNum, { backgroundColor: `${accentColor}1E` }]}>
                      <Text style={[styles.exampleNumText, { color: accentColor }]}>{eIdx + 1}</Text>
                    </View>
                    <View style={styles.exampleBody}>
                      {ex.label ? <Text style={styles.exampleLabel}>{ex.label}</Text> : null}
                      <Text style={styles.exampleJa}>{ex.ja}</Text>
                      {showFurigana && ex.reading ? (
                        <Text style={styles.exampleReading}>{ex.reading}</Text>
                      ) : null}
                      {ex.zh ? <Text style={styles.exampleZh}>{ex.zh}</Text> : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === "link") {
          const internal = parseInternalGrammarHref(block.href ?? "");
          return (
            <Pressable
              key={`lnk-${idx}`}
              onPress={() => {
                if (internal && onNavigateLesson) {
                  onNavigateLesson(internal.level, internal.id);
                } else if (block.href && /^https?:\/\//i.test(block.href)) {
                  Linking.openURL(block.href).catch(() => undefined);
                }
              }}
              style={styles.linkCard}
            >
              <Text style={styles.linkText}>
                {internal ? `📘 相關課程：${block.text}` : `🔗 ${block.text}`}
              </Text>
              <Text style={styles.linkArrow}>→</Text>
            </Pressable>
          );
        }

        return null;
      })}
    </View>
  );
}

export function GrammarRichContent({ lesson, showFurigana, accentColor, onNavigateLesson }: Props) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [zoomImage, setZoomImage] = useState<ZoomState | null>(null);

  // Strict card-inner width calculation so images never overflow horizontally
  const maxImgWidth = Math.max(200, Math.min(winWidth - 88, 600));

  const modalImgWidth = Math.max(260, winWidth - 32);
  const modalImgHeight = zoomImage
    ? Math.min(winHeight * 0.78, modalImgWidth / zoomImage.aspectRatio)
    : 300;

  return (
    <View style={styles.wrap}>
      {lesson.sections.map((sec, idx) => {
        const isSub = (sec.level ?? 2) >= 3;
        const blocks: GrammarBlock[] = Array.isArray(sec.blocks) ? sec.blocks : [];

        return (
          <View key={`${sec.heading}-${idx}`} style={[styles.sectionCard, isSub && styles.subSectionCard]}>
            {sec.heading ? (
              <View style={styles.headingRow}>
                {!isSub && <View style={[styles.headingBar, { backgroundColor: accentColor }]} />}
                <Text style={isSub ? styles.subHeading : styles.sectionHeading}>{sec.heading}</Text>
              </View>
            ) : null}

            {blocks.length > 0 ? (
              <BlockList
                blocks={blocks}
                showFurigana={showFurigana}
                accentColor={accentColor}
                maxImgWidth={maxImgWidth}
                onZoom={setZoomImage}
                onNavigateLesson={onNavigateLesson}
              />
            ) : (
              <View style={styles.blockStack}>
                {(sec.notes ?? []).map((n, nIdx) => (
                  <Text key={nIdx} style={styles.noteText}>
                    {cleanInlineText(n)}
                  </Text>
                ))}
                {(sec.examples ?? []).map((ex, eIdx) => (
                  <View key={eIdx} style={styles.exampleItem}>
                    <Text style={styles.exampleJa}>{ex.ja}</Text>
                    {showFurigana && ex.reading ? <Text style={styles.exampleReading}>{ex.reading}</Text> : null}
                    {ex.zh ? <Text style={styles.exampleZh}>{ex.zh}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* Tap-to-Enlarge Fullscreen Image Lightbox Dialog */}
      <Modal
        visible={Boolean(zoomImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomImage(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setZoomImage(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {zoomImage?.alt || "圖片預覽"}
              </Text>
              <Pressable onPress={() => setZoomImage(null)} style={styles.modalCloseBtn} hitSlop={10}>
                <Text style={styles.modalCloseText}>✕ 關閉</Text>
              </Pressable>
            </View>
            {zoomImage && (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image
                  source={zoomImage.source}
                  style={{ width: modalImgWidth, height: modalImgHeight }}
                  resizeMode="contain"
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  sectionCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.paperBorder,
  },
  subSectionCard: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 14,
  },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headingBar: { width: 4, height: 18, borderRadius: 4 },
  sectionHeading: { flex: 1, fontSize: 16, fontWeight: "900", color: theme.ink, lineHeight: 22 },
  subHeading: { flex: 1, fontSize: 14, fontWeight: "900", color: theme.indigo, lineHeight: 20 },
  blockStack: { gap: 10 },
  grammarBlockCard: {
    backgroundColor: "#F5F7FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.2)",
    borderLeftWidth: 4,
    padding: 13,
    gap: 8,
  },
  patternHeader: { gap: 4 },
  patternLabel: { fontSize: 11, fontWeight: "900" },
  patternValue: { fontSize: 15, fontWeight: "900", color: theme.ink, lineHeight: 22 },
  connList: { gap: 3, paddingTop: 3 },
  connLine: { fontSize: 12, fontWeight: "700", color: theme.inkSoft, lineHeight: 18 },
  blockDivider: { height: 1, backgroundColor: "rgba(79, 70, 229, 0.14)" },
  blockNoteText: { fontSize: 13.5, color: theme.ink, lineHeight: 22, fontWeight: "600" },
  noteText: { fontSize: 14, color: theme.ink, lineHeight: 22, fontWeight: "500" },
  calloutBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    gap: 8,
  },
  calloutBadge: { fontSize: 12, fontWeight: "900" },
  calloutText: { fontSize: 13, color: theme.ink, lineHeight: 21, fontWeight: "600" },
  tableWrap: { gap: 6 },
  tableCaption: { fontSize: 12, fontWeight: "800", color: theme.inkSoft },
  tableBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    overflow: "hidden",
    backgroundColor: theme.white,
  },
  tableRow: { flexDirection: "row", alignItems: "stretch" },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: theme.paperBorder },
  tableHeaderRow: { backgroundColor: theme.indigoSoft },
  tableRowAlt: { backgroundColor: theme.surface },
  tableCell: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: "center", gap: 2 },
  tableCellBorder: { borderLeftWidth: 1, borderLeftColor: theme.paperBorder },
  tableCellHeader: { backgroundColor: theme.indigoSoft },
  tableCellText: { fontSize: 13, color: theme.ink, lineHeight: 19, fontWeight: "600" },
  tableCellHeaderText: { fontWeight: "900", color: theme.indigo },
  tableCellReading: { fontSize: 11, color: theme.indigo, lineHeight: 15 },
  tableCellZh: { fontSize: 11, color: theme.inkSoft, lineHeight: 16 },
  imageCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.paperBorder,
    gap: 8,
    overflow: "hidden",
  },
  imageCenter: { alignItems: "center", justifyContent: "center" },
  imageFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  imageCaption: { flex: 1, fontSize: 11, fontWeight: "700", color: theme.inkMuted },
  zoomHint: { fontSize: 11, fontWeight: "800", color: theme.indigo },
  examplesStack: { gap: 8 },
  exampleItem: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  exampleRow: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  exampleNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  exampleNumText: { fontSize: 11, fontWeight: "900" },
  exampleBody: { flex: 1, gap: 3 },
  exampleLabel: { fontSize: 11, fontWeight: "900", color: theme.indigo, marginBottom: 1 },
  exampleJa: { fontSize: 15, fontWeight: "800", color: theme.ink, lineHeight: 22 },
  exampleReading: { fontSize: 12, color: theme.indigo, lineHeight: 18 },
  exampleZh: { fontSize: 13, color: theme.inkSoft, lineHeight: 19 },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.indigoSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  linkText: { flex: 1, fontSize: 13, fontWeight: "800", color: theme.indigo },
  linkArrow: { fontSize: 14, fontWeight: "900", color: theme.indigo },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.90)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: theme.white,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.paperBorder,
    gap: 10,
  },
  modalTitle: { flex: 1, fontSize: 14, fontWeight: "900", color: theme.ink },
  modalCloseBtn: {
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.paperBorder,
  },
  modalCloseText: { fontSize: 12, fontWeight: "900", color: theme.ink },
  modalScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
});
