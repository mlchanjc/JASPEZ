import type { VocabWord } from "@/data/types";

function normalize(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[\s・･]/g, "");
}

export function acceptedAnswers(word: VocabWord) {
  const answers = new Set<string>();
  const add = (value: string) => {
    const normalized = normalize(value);
    if (normalized) answers.add(normalized);
  };
  add(word.word);
  add(word.reading);
  for (const part of word.reading.split(/[;；/／、,，]/)) add(part);
  for (const kana of word.reading.matchAll(/[\u3040-\u30ffー]+/g)) add(kana[0]);
  return answers;
}

export function isCorrectAnswer(word: VocabWord, input: string) {
  const normalized = normalize(input);
  return normalized.length > 0 && acceptedAnswers(word).has(normalized);
}
