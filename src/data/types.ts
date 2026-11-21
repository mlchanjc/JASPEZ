export type LevelId = "N5" | "N4" | "N3" | "N2" | "N1";

export type RegisterMode = "polite" | "casual";

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

export type GrammarPoint = {
  id: string;
  level: LevelId;
  pattern: string;
  meaning: string;
  tag: string;
  formation: string;
  nuance: string;
  polite: GrammarVariant;
  casual: GrammarVariant;
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

export type ConjugationForm = "te" | "nai" | "potential" | "ta";

export type ConjugationVerb = {
  id: string;
  dict: string;
  rt: string;
  group: string;
  meaning: string;
  forms: Record<
    ConjugationForm,
    {
      answer: string;
      choices: string[];
      rule: string;
    }
  >;
};
