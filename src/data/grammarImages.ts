import type { ImageSourcePropType } from "react-native";

export type BundledImage = {
  source: ImageSourcePropType;
  width: number;
  height: number;
};

const GRAMMAR_IMAGES: Record<string, BundledImage> = {
  "/data/img/n5/grammar/n5-grammar-00-particle.png": { source: require("../../data/img/n5/grammar/n5-grammar-00-particle.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-01-kugiri.png": { source: require("../../data/img/n5/grammar/n5-grammar-01-kugiri.png"), width: 1200, height: 477 },
  "/data/img/learn-japanese/grammar/n5/06-01.png": { source: require("../../data/img/learn-japanese/grammar/n5/06-01.png"), width: 1160, height: 2048 },
  "/data/img/learn-japanese/grammar/n5/06-02.png": { source: require("../../data/img/learn-japanese/grammar/n5/06-02.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-07-2.png": { source: require("../../data/img/n5/grammar/n5-grammar-07-2.png"), width: 1200, height: 678 },
  "/data/img/n5/grammar/n5-grammar-07-3.png": { source: require("../../data/img/n5/grammar/n5-grammar-07-3.png"), width: 1200, height: 679 },
  "/data/img/n5/grammar/n5-grammar-08-001.png": { source: require("../../data/img/n5/grammar/n5-grammar-08-001.png"), width: 1116, height: 640 },
  "/data/img/n5/grammar/n5-grammar-08-002.png": { source: require("../../data/img/n5/grammar/n5-grammar-08-002.png"), width: 1118, height: 638 },
  "/data/img/n5/grammar/n5-grammar-10-002.png": { source: require("../../data/img/n5/grammar/n5-grammar-10-002.png"), width: 1384, height: 968 },
  "/data/img/n5/grammar/n5-grammar-12-2.png": { source: require("../../data/img/n5/grammar/n5-grammar-12-2.png"), width: 1064, height: 660 },
  "/data/img/learn-japanese/grammar/n5/12-01.png": { source: require("../../data/img/learn-japanese/grammar/n5/12-01.png"), width: 1828, height: 1004 },
  "/data/img/learn-japanese/grammar/n5/18-01.png": { source: require("../../data/img/learn-japanese/grammar/n5/18-01.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n5/18-02.png": { source: require("../../data/img/learn-japanese/grammar/n5/18-02.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n5/18-03.png": { source: require("../../data/img/learn-japanese/grammar/n5/18-03.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n5/19-01.png": { source: require("../../data/img/learn-japanese/grammar/n5/19-01.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n5/19-02.png": { source: require("../../data/img/learn-japanese/grammar/n5/19-02.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n5/19-03.png": { source: require("../../data/img/learn-japanese/grammar/n5/19-03.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n5/19-04.png": { source: require("../../data/img/learn-japanese/grammar/n5/19-04.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n5/19-05.png": { source: require("../../data/img/learn-japanese/grammar/n5/19-05.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n5/19-06.png": { source: require("../../data/img/learn-japanese/grammar/n5/19-06.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-21-01.png?v1": { source: require("../../data/img/n5/grammar/n5-grammar-21-01.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-21-02.png?v1": { source: require("../../data/img/n5/grammar/n5-grammar-21-02.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-21-03.png?v1": { source: require("../../data/img/n5/grammar/n5-grammar-21-03.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-21-04-2.png?v1": { source: require("../../data/img/n5/grammar/n5-grammar-21-04-2.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-21-05.png?v1": { source: require("../../data/img/n5/grammar/n5-grammar-21-05.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-21-06.png?v1": { source: require("../../data/img/n5/grammar/n5-grammar-21-06.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-21-08.png?v1": { source: require("../../data/img/n5/grammar/n5-grammar-21-08.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-21-07.png?v1": { source: require("../../data/img/n5/grammar/n5-grammar-21-07.png"), width: 1760, height: 920 },
  "/data/img/n5/grammar/n5-grammar-24-02-jitadoushi.png": { source: require("../../data/img/n5/grammar/n5-grammar-24-02-jitadoushi.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-25-02.png": { source: require("../../data/img/n5/grammar/n5-grammar-25-02.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-25-03.png": { source: require("../../data/img/n5/grammar/n5-grammar-25-03.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-25-04.png": { source: require("../../data/img/n5/grammar/n5-grammar-25-04.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-26-03.png": { source: require("../../data/img/n5/grammar/n5-grammar-26-03.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-26-04.png": { source: require("../../data/img/n5/grammar/n5-grammar-26-04.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-29-2-to.png": { source: require("../../data/img/n5/grammar/n5-grammar-29-2-to.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-30-1-desk.png": { source: require("../../data/img/n5/grammar/n5-grammar-30-1-desk.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-32-2-de.png": { source: require("../../data/img/n5/grammar/n5-grammar-32-2-de.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-32-3-de.png": { source: require("../../data/img/n5/grammar/n5-grammar-32-3-de.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-33-2.png": { source: require("../../data/img/n5/grammar/n5-grammar-33-2.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-33-3-mo.png.png": { source: require("../../data/img/n5/grammar/n5-grammar-33-3-mo.png.png"), width: 1200, height: 628 },
  "/data/img/n5/grammar/n5-grammar-45-fukushi-02.png": { source: require("../../data/img/n5/grammar/n5-grammar-45-fukushi-02.png"), width: 1200, height: 628 },
  "/data/img/learn-japanese/grammar/n4/09-01.png": { source: require("../../data/img/learn-japanese/grammar/n4/09-01.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n4/28-01.png": { source: require("../../data/img/learn-japanese/grammar/n4/28-01.png"), width: 1760, height: 920 },
  "/data/img/learn-japanese/grammar/n4/28-02.png": { source: require("../../data/img/learn-japanese/grammar/n4/28-02.png"), width: 1760, height: 920 },
  "/tatsuzin/1501229644-657742156_n.png?v=1501229647": { source: require("../../data/grammar/external/pic.pimg.tw-1501229644-657742156_n.png"), width: 1083, height: 837 },
  "/tatsuzin/1501229880-844653355_n.png": { source: require("../../data/grammar/external/pic.pimg.tw-1501229880-844653355_n.png"), width: 1083, height: 837 },
  "/tatsuzin/1501229644-2487341118_n.png?v=1501229647": { source: require("../../data/grammar/external/pic.pimg.tw-1501229644-2487341118_n.png"), width: 1084, height: 838 },
  "/tatsuzin/1501237692-4272895516_n.png?v=1501237695": { source: require("../../data/grammar/external/pic.pimg.tw-1501237692-4272895516_n.png"), width: 1083, height: 837 },
  "/data/img/ArticleContent/2025/20250407_155212_67f3842c6fe96.png": { source: require("../../data/img/ArticleContent/2025/20250407_155212_67f3842c6fe96.png"), width: 1760, height: 920 },
  "/data/img/ArticleContent/2025/20250407_155221_67f3843556a4b.png": { source: require("../../data/img/ArticleContent/2025/20250407_155221_67f3843556a4b.png"), width: 1760, height: 920 },
  "/data/img/ArticleContent/2025/20250407_155317_67f3846d49744.png": { source: require("../../data/img/ArticleContent/2025/20250407_155317_67f3846d49744.png"), width: 1760, height: 920 },
  "/data/img/ArticleContent/2025/20250421_114610_6805bf826f55e.png": { source: require("../../data/img/ArticleContent/2025/20250421_114610_6805bf826f55e.png"), width: 1760, height: 920 },
  "/data/img/ArticleContent/2025/20250513_122154_6822c8e23a80e.png": { source: require("../../data/img/ArticleContent/2025/20250513_122154_6822c8e23a80e.png"), width: 1760, height: 920 },
  "/data/img/ArticleContent/2025/20250513_122219_6822c8fbb5496.png": { source: require("../../data/img/ArticleContent/2025/20250513_122219_6822c8fbb5496.png"), width: 1760, height: 920 },
  "/data/img/ArticleContent/2025/20250715_132818_6875e6f22cd82.png": { source: require("../../data/img/ArticleContent/2025/20250715_132818_6875e6f22cd82.png"), width: 1760, height: 920 },
  "/data/img/ArticleContent/2025/20251003_115311_68df48a76259e.png": { source: require("../../data/img/ArticleContent/2025/20251003_115311_68df48a76259e.png"), width: 1760, height: 920 },
};

export function resolveGrammarImage(src: string | undefined): BundledImage | null {
  if (!src) return null;
  const key = src.replace(/^https?:\/\/[^/]+/i, "").trim();
  return GRAMMAR_IMAGES[key] ?? GRAMMAR_IMAGES[src.trim()] ?? null;
}
