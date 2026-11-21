import rawArenaBank from "../../data/grammar/arena-bank.json";
import type { LevelId } from "@/data/types";

export type BankQuestion = {
  groupId: string;
  before: string;
  after: string;
  reading: string;
  zh: string;
  answer: string;
  tip: string;
};

export type ArenaGroupMeta = {
  id: string;
  label: string;
  level: LevelId;
  choices: string[];
  lessonRefs: { level: LevelId; lessonId: string; choiceLabel: string; tokens: string[]; tip: string }[];
};

export const ARENA_GROUPS: ArenaGroupMeta[] = [
  {
    id: "n5-particles",
    label: "N5 基礎助詞",
    level: "N5",
    choices: ["は", "が", "に", "で", "を"],
    lessonRefs: [],
  },
  {
    id: "n5-movement",
    label: "N5 移動場所",
    level: "N5",
    choices: ["に", "へ", "で", "を"],
    lessonRefs: [],
  },
  {
    id: "n4-conditionals",
    label: "N4 假定四天王",
    level: "N4",
    choices: ["と", "ば", "たら", "なら"],
    lessonRefs: [
      { level: "N4", lessonId: "10", choiceLabel: "と", tokens: ["と"], tip: "恆常必然結果（一…就…），後句不可接意志或請求。" },
      { level: "N4", lessonId: "11", choiceLabel: "ば", tokens: ["ば"], tip: "假定形＋ば，著重於前句條件成立。" },
      { level: "N4", lessonId: "12", choiceLabel: "たら", tokens: ["たら", "だら"], tip: "最萬用條件句，強調前項完成之後，後句可接請求／意志。" },
      { level: "N4", lessonId: "13", choiceLabel: "なら", tokens: ["なら"], tip: "承接對方話題或前提（如果要…的話），常用於給建議。" },
    ],
  },
  {
    id: "n4-aux-verbs",
    label: "N4 補助動詞",
    level: "N4",
    choices: ["ていく", "てくる", "てみる", "てしまう", "ておく"],
    lessonRefs: [
      { level: "N4", lessonId: "16", choiceLabel: "ていく", tokens: ["ていく", "ていき", "ていっ", "でいく", "でいっ"], tip: "動作往遠處或未來持續變化。" },
      { level: "N4", lessonId: "17", choiceLabel: "てくる", tokens: ["てくる", "てき", "でくる", "でき"], tip: "從過去持續到現在，或朝說話者方向而來。" },
      { level: "N4", lessonId: "18", choiceLabel: "てみる", tokens: ["てみる", "てみ", "でみる", "でみ"], tip: "試著做看看結果如何。" },
      { level: "N4", lessonId: "19", choiceLabel: "てしまう", tokens: ["てしまう", "てしま", "でしまう", "でしま", "ちゃう", "ちゃっ"], tip: "徹底完成，或不小心、帶有遺憾語感。" },
      { level: "N4", lessonId: "20", choiceLabel: "ておく", tokens: ["ておく", "ておき", "ておい", "でおく", "でおい"], tip: "為了日後目的而事先準備。" },
    ],
  },
  {
    id: "n4-appearance",
    label: "N4 推測樣態",
    level: "N4",
    choices: ["そうだ", "ようだ", "らしい", "みたいだ"],
    lessonRefs: [],
  },
  {
    id: "n3-cause-effect",
    label: "N3 因果歸因",
    level: "N3",
    choices: ["おかげで", "せいで", "せいか", "ばかりに"],
    lessonRefs: [
      { level: "N3", lessonId: "04", choiceLabel: "おかげで", tokens: ["おかげで", "おかげだ", "おかげです"], tip: "帶有感謝心情，後句必為正面好結果。" },
      { level: "N3", lessonId: "33", choiceLabel: "せいで", tokens: ["せいで", "せいだ", "せいです"], tip: "帶有責怪或懊惱，後句為負面壞結果。" },
      { level: "N3", lessonId: "34", choiceLabel: "せいか", tokens: ["せいか"], tip: "不確定的推測原因（也許是因為…的緣故）。" },
    ],
  },
  {
    id: "n3-purpose",
    label: "N3 目的決定",
    level: "N3",
    choices: ["ために", "ように", "ことにしている", "ことになっている"],
    lessonRefs: [
      { level: "N4", lessonId: "37", choiceLabel: "ために", tokens: ["ために", "ためだ", "ためです"], tip: "可控意志動作的目的（為了…），或表原因。" },
      { level: "N3", lessonId: "123", choiceLabel: "ように", tokens: ["ように"], tip: "接可能形／無意志／否定形表狀態目標。" },
      { level: "N3", lessonId: "25", choiceLabel: "ことにしている", tokens: ["ことにしている", "ことにしています"], tip: "自己養成的個人習慣（總是固定這麼做）。" },
      { level: "N3", lessonId: "26", choiceLabel: "ことになっている", tokens: ["ことになっている", "ことになっています"], tip: "外部規則、制度或既定安排（按規定…）。" },
    ],
  },
  {
    id: "n3-concession",
    label: "N3 逆接讓步",
    level: "N3",
    choices: ["のに", "くせに", "わりに", "といっても"],
    lessonRefs: [
      { level: "N3", lessonId: "63", choiceLabel: "といっても", tokens: ["といっても", "とはいっても"], tip: "雖說如此，但實際上沒那麼厲害（修正對方過度期待）。" },
    ],
  },
  {
    id: "n3-time-aspect",
    label: "N3 時間瞬間",
    level: "N3",
    choices: ["うちに", "たびに", "とたんに", "あいだに"],
    lessonRefs: [
      { level: "N3", lessonId: "03", choiceLabel: "うちに", tokens: ["うちに"], tip: "趁著某狀態改變之前把握時機行動。" },
      { level: "N3", lessonId: "70", choiceLabel: "とたんに", tokens: ["とたんに", "とたん"], tip: "一做完前項動作的瞬間立即發生意外變化。" },
    ],
  },
];

type RawTuple = [string, string, string, string, string, string, string];

export const ARENA_BANK: BankQuestion[] = (rawArenaBank as RawTuple[]).map(
  ([groupId, before, after, reading, zh, answer, tip]) => ({
    groupId,
    before,
    after,
    reading,
    zh,
    answer,
    tip,
  }),
);
