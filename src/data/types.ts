export type LevelId = "N5" | "N4" | "N3" | "N2" | "N1";

export type RegisterMode = "polite" | "casual";

export type WordPos = "N" | "Na" | "A" | "V";

export type VocabWord = {
  verbType?: string | null;
  word: string;
  reading: string | null;
  accent: string | null;
  meaning: string | null;
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

export type GrammarExample = {
  ja: string;
  reading?: string;
  zh?: string;
};

export type GrammarSection = {
  heading: string;
  pattern?: string;
  notes?: string[];
  examples?: GrammarExample[];
};

export type GrammarLesson = {
  level: LevelId;
  lesson: number;
  id: string;
  title: string;
  point: string;
  gloss: string;
  url: string;
  source?: string;
  published?: string;
  pattern: string;
  connection: string[];
  sections: GrammarSection[];
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

export type ExampleClozeQuestion = {
  before: string;
  after: string;
  answer: string;
  fullJa: string;
  reading: string;
  zh: string;
  choices: string[];
};
