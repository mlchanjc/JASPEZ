import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme";

export type RubySegment = {
  text: string;
  rt?: string;
  isBlank?: boolean;
};

const KANJI_CHAR_RE = /[\u4e00-\u9fff々〆ヵヶ]/;

function toHiragana(str: string): string {
  let out = "";
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCharCode(code - 0x60);
    } else {
      out += str[i];
    }
  }
  return out;
}

/**
 * Splits a Japanese string `jp` and its full kana `reading` into exact
 * ruby segments `{ text, rt? }` where `rt` is attached only to kanji runs.
 */
export function alignKanjiRuby(jp: string, reading: string): RubySegment[] {
  if (!jp) return [];
  if (!reading || !KANJI_CHAR_RE.test(jp)) {
    return [{ text: jp }];
  }

  // Split jp into alternating runs of kanji vs non-kanji
  const runs: { text: string; isKanji: boolean }[] = [];
  for (let i = 0; i < jp.length; i += 1) {
    const ch = jp[i];
    const isK = KANJI_CHAR_RE.test(ch);
    const prev = runs[runs.length - 1];
    if (prev && prev.isKanji === isK) {
      prev.text += ch;
    } else {
      runs.push({ text: ch, isKanji: isK });
    }
  }

  const rdNorm = toHiragana(reading);
  const segs: RubySegment[] = [];
  let rdPos = 0;

  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    if (!run.isKanji) {
      const target = toHiragana(run.text);
      const idx = rdNorm.indexOf(target, rdPos);
      if (idx !== -1) {
        rdPos = idx + target.length;
      }
      segs.push({ text: run.text });
      continue;
    }

    // Kanji run: find where the next non-kanji anchor begins in reading
    const nextRun = runs[i + 1];
    if (!nextRun) {
      const rt = reading.slice(rdPos);
      rdPos = reading.length;
      segs.push({ text: run.text, rt: rt || undefined });
    } else {
      const anchor = toHiragana(nextRun.text);
      // Search for anchor at least 1 kana after rdPos (each kanji has >= 1 mora)
      let searchStart = Math.min(reading.length, rdPos + 1);
      let idx = rdNorm.indexOf(anchor, searchStart);
      if (idx === -1) {
        idx = rdNorm.indexOf(anchor, rdPos);
      }
      if (idx !== -1) {
        const rt = reading.slice(rdPos, idx);
        rdPos = idx;
        segs.push({ text: run.text, rt: rt || undefined });
      } else {
        // Fallback: attach remaining reading to avoid silent drop
        segs.push({ text: run.text });
      }
    }
  }

  return segs;
}

/**
 * Aligns a cloze sentence (`before` + `[surface]` + `after`) against its full
 * `reading`, masking the blank cleanly before submission so the reading never
 * leaks the answer.
 */
export function alignClozeRuby(params: {
  before: string;
  surface: string;
  after: string;
  reading: string;
  revealed: boolean;
  blankPlaceholder?: string;
}): RubySegment[] {
  const { before, surface, after, reading, revealed, blankPlaceholder = "【　　】" } = params;
  const fullJp = `${before}${surface}${after}`;
  const fullSegs = alignKanjiRuby(fullJp, reading);

  const blankStart = before.length;
  const blankEnd = before.length + surface.length;

  const out: RubySegment[] = [];
  let cursor = 0;
  let emittedPlaceholder = false;

  for (const seg of fullSegs) {
    const segStart = cursor;
    const segEnd = cursor + seg.text.length;
    cursor = segEnd;

    // Completely before blank
    if (segEnd <= blankStart) {
      out.push(seg);
      continue;
    }
    // Completely after blank
    if (segStart >= blankEnd) {
      if (!revealed && !emittedPlaceholder) {
        out.push({ text: blankPlaceholder, isBlank: true });
        emittedPlaceholder = true;
      }
      out.push(seg);
      continue;
    }

    // Overlaps blank [blankStart, blankEnd)
    const preLen = Math.max(0, blankStart - segStart);
    const postStartInSeg = Math.min(seg.text.length, blankEnd - segStart);

    if (preLen > 0) {
      out.push({ text: seg.text.slice(0, preLen) });
    }

    if (revealed) {
      const midText = seg.text.slice(preLen, postStartInSeg);
      if (midText.length > 0) {
        const isWholeSeg = preLen === 0 && postStartInSeg === seg.text.length;
        out.push({
          text: midText,
          rt: isWholeSeg ? seg.rt : undefined,
          isBlank: true,
        });
      }
    } else if (!emittedPlaceholder) {
      out.push({ text: blankPlaceholder, isBlank: true });
      emittedPlaceholder = true;
    }

    if (postStartInSeg < seg.text.length) {
      out.push({ text: seg.text.slice(postStartInSeg) });
    }
  }

  if (!revealed && !emittedPlaceholder) {
    out.push({ text: blankPlaceholder, isBlank: true });
  }

  // Wrap revealed blank segments with 【 and 】 visually
  if (revealed) {
    const firstBlankIdx = out.findIndex((s) => s.isBlank);
    let lastBlankIdx = -1;
    for (let i = out.length - 1; i >= 0; i -= 1) {
      if (out[i].isBlank) {
        lastBlankIdx = i;
        break;
      }
    }
    if (firstBlankIdx !== -1 && lastBlankIdx !== -1) {
      out.splice(lastBlankIdx + 1, 0, { text: "】", isBlank: true });
      out.splice(firstBlankIdx, 0, { text: "【", isBlank: true });
    }
  }

  return out;
}

type RubyTextProps = {
  segments?: RubySegment[];
  jp?: string;
  reading?: string | null;
  showRuby: boolean;
  fontSize?: number;
  rtFontSize?: number;
  color?: string;
  blankColor?: string;
  fontFamily?: string;
  align?: "left" | "center";
};

export function RubyText({
  segments,
  jp,
  reading,
  showRuby,
  fontSize = 19,
  rtFontSize = 10,
  color,
  blankColor,
  fontFamily,
  align = "left",
}: RubyTextProps) {
  const { t } = useAppTheme();
  const baseColor = color ?? t.ink;
  const resolvedBlankColor = blankColor ?? t.vermillion;
  const resolvedFont = fontFamily ?? t.serif;

  const resolvedSegments = useMemo(() => {
    if (segments) return segments;
    if (jp) return alignKanjiRuby(jp, reading ?? "");
    return [];
  }, [segments, jp, reading]);

  // Expand non-ruby runs into per-character atoms so Japanese wraps naturally at any char
  const atoms = useMemo(() => {
    const list: { text: string; rt?: string; isBlank?: boolean }[] = [];
    for (const seg of resolvedSegments) {
      if (seg.rt || (seg.isBlank && seg.text.startsWith("【") && seg.text.endsWith("】"))) {
        list.push(seg);
      } else {
        for (const ch of seg.text) {
          list.push({ text: ch, isBlank: seg.isBlank });
        }
      }
    }
    return list;
  }, [resolvedSegments]);

  const baseLineHeight = Math.round(fontSize * 1.38);
  const rtLineHeight = Math.round(rtFontSize * 1.25);

  return (
    <View
      style={[
        styles.row,
        align === "center" && styles.rowCenter,
        { rowGap: showRuby ? 6 : 2 },
      ]}
    >
      {atoms.map((atom, idx) => {
        const hasRt = showRuby && Boolean(atom.rt);
        return (
          <View key={idx} style={styles.col}>
            {showRuby ? (
              <Text
                style={[
                  styles.rt,
                  {
                    fontSize: rtFontSize,
                    lineHeight: rtLineHeight,
                    color: hasRt
                      ? atom.isBlank
                        ? resolvedBlankColor
                        : t.inkSoft
                      : "transparent",
                  },
                ]}
                numberOfLines={1}
              >
                {hasRt ? atom.rt : " "}
              </Text>
            ) : null}
            <Text
              style={[
                styles.base,
                {
                  fontFamily: resolvedFont,
                  fontSize,
                  lineHeight: baseLineHeight,
                  fontWeight: atom.isBlank ? "800" : "700",
                  color: atom.isBlank ? resolvedBlankColor : baseColor,
                },
              ]}
            >
              {atom.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  rowCenter: {
    justifyContent: "center",
  },
  col: {
    alignItems: "center",
  },
  rt: {
    fontWeight: "600",
    textAlign: "center",
  },
  base: {
    textAlign: "center",
  },
});
