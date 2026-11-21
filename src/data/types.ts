export type LevelId = "N5" | "N4" | "N3" | "N2" | "N1";

export type RegisterMode = "polite" | "casual";

export type WordPos = "N" | "Na" | "A" | "V";

export type VocabWord = {
  verbType?: string | null;
  word: string;
  reading: string;
  accent: string | null;
  meaning: string;
  extraInfo?: string | null;
};

export type LessonFile = {
  level: string;
  lesson: number;
  title: string;
  words: VocabWord[];
};

export type TopicManifest = {
  id: string;
  title: string;
  wordCount: number;
};

export type LevelManifest = {
  level: LevelId;
  topics: TopicManifest[];
};

export type GrammarToken = {
  text?: string;
  rt?: string;
  reading?: string;
  meaning?: string;
  blank?: boolean;
};

export type GrammarVariant = {
  tokens: GrammarToken[];
  translation: string;
  answer: string;
  accepted: string[];
  choices: string[];
  wrongHints: Record<string, string>;
};

export type GrammarExample = {
  id: string;
  polite: GrammarVariant;
  casual: GrammarVariant;
};

export type PatternRuleId =
  | "adj-chushi-te"
  | "v-mizen-nai"
  | "v-renyou-tai"
  | "v-te-mo-ii"
  | "v-te-wa-ikenai"
  | "v-koto-ga-dekiru"
  | "v-ta-koto-ga-aru"
  | "n4-ba"
  | "n4-tara"
  | "n4-nara"
  | "v-te-shimau"
  | "v-te-miru"
  | "v-te-oku"
  | "n3-okage-de"
  | "n3-sei-de"
  | "n3-wake-dewa-nai"
  | "n3-uchi-ni"
  | "n3-koto-ni-suru";

export type GrammarPoint = {
  id: string;
  level: LevelId;
  sigureCode: string;
  sigureUrl?: string;
  pattern: string;
  meaning: string;
  tag: string;
  formation: string;
  nuance: string;
  patternRuleId: PatternRuleId;
  allowedPos: WordPos[];
  examples: GrammarExample[];
};

export type ConfusableSide = {
  label: string;
  rule: string;
  example: string;
  translation: string;
};

export type ConfusablePair = {
  id: string;
  level: LevelId;
  title: string;
  subtitle: string;
  left: ConfusableSide;
  right: ConfusableSide;
  quizPrompt: string;
  options: [string, string];
  correct: string;
  explanation: string;
};

export type ClassicalForm = "mizen_nai" | "renyou_tai" | "renyou_te" | "renyou_ta" | "katei_ba" | "meirei";

export type PatternDrillQuestion = {
  id: string;
  level: LevelId;
  pos: WordPos;
  posLabel: string;
  dict: string;
  rt: string;
  meaning: string;
  promptLabel: string;
  answer: string;
  accepted: string[];
  choices: string[];
  rule: string;
};
