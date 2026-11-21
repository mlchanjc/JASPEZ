export type LevelId = "N5" | "N4" | "N3" | "N2" | "N1";

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
