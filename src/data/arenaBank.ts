import rawArenaBank from "../../data/grammar/arena-bank.json";
import type { LevelId } from "@/data/types";

export type ArenaGroupId =
  | "n5-particles"
  | "n5-movement"
  | "n5-nominal-particles"
  | "n4-conditionals"
  | "n4-aux-state"
  | "n4-aux-dir"
  | "n4-appearance-simile"
  | "n4-hearsay-inference"
  | "n3-purpose"
  | "n3-decisions-rules"
  | "n3-cause-effect"
  | "n3-concession"
  | "n3-time-span"
  | "n3-moment-final"
  | "n3-moment-clause";

export interface ArenaItem {
  id: string;
  groupId: ArenaGroupId;
  before: string;
  after: string;
  reading: string;
  zh: string;
  grammarKey: string;
  answer: string;
  surface?: string;
  choices?: string[];
  tip: string;
  altAnswers?: Record<string, string>;
  distractorNotes?: Record<string, string>;
  jlptTag?: "N5" | "N4" | "N3" | "N3/N2";
}

export type ArenaGroupMeta = {
  id: ArenaGroupId;
  label: string;
  level: LevelId;
  grammarKeys: string[];
  choices: string[];
  requiresInflectedChoices?: boolean;
};

export const ARENA_GROUPS: ArenaGroupMeta[] = [
  {
    id: "n5-particles",
    label: "N5 基礎助詞",
    level: "N5",
    grammarKeys: ["は", "が", "に", "で", "を"],
    choices: ["は", "が", "に", "で", "を"],
  },
  {
    id: "n5-movement",
    label: "N5 移動場所",
    level: "N5",
    grammarKeys: ["を", "に", "で"],
    choices: ["を", "に", "で"],
  },
  {
    id: "n5-nominal-particles",
    label: "N5 名詞助詞＋の",
    level: "N5",
    grammarKeys: ["への", "での", "からの"],
    choices: ["への", "での", "からの"],
  },
  {
    id: "n4-conditionals",
    label: "N4 假定四天王",
    level: "N4",
    grammarKeys: ["と", "ば", "たら", "なら"],
    choices: ["と", "ば", "たら", "なら"],
    requiresInflectedChoices: true,
  },
  {
    id: "n4-aux-state",
    label: "N4 狀態與準備",
    level: "N4",
    grammarKeys: ["ておく", "てある", "ている", "てしまう"],
    choices: ["ておく", "てある", "ている", "てしまう"],
    requiresInflectedChoices: true,
  },
  {
    id: "n4-aux-dir",
    label: "N4 補助動詞方向",
    level: "N4",
    grammarKeys: ["てみる", "ていく", "てくる", "てしまう"],
    choices: ["てみる", "ていく", "てくる", "てしまう"],
  },
  {
    id: "n4-appearance-simile",
    label: "N4 樣態與比喻",
    level: "N4",
    grammarKeys: ["そうだ[様態]", "ようだ", "みたいだ"],
    choices: ["そうだ", "ようだ", "みたいだ"],
    requiresInflectedChoices: true,
  },
  {
    id: "n4-hearsay-inference",
    label: "N4 傳聞與推測",
    level: "N4",
    grammarKeys: ["そうだ[伝聞]", "らしい", "ようだ"],
    choices: ["そうだ", "らしい", "ようだ"],
    requiresInflectedChoices: true,
  },
  {
    id: "n3-purpose",
    label: "N3 目的表現",
    level: "N3",
    grammarKeys: ["ために", "ように"],
    choices: ["ために", "ように"],
  },
  {
    id: "n3-decisions-rules",
    label: "N3 決定與規定",
    level: "N3",
    grammarKeys: ["ことにする", "ことにしている", "ことになる", "ことになっている"],
    choices: ["ことにする", "ことにしている", "ことになる", "ことになっている"],
  },
  {
    id: "n3-cause-effect",
    label: "N3 因果歸因",
    level: "N3",
    grammarKeys: ["おかげで", "せいで", "せいか", "ばかりに"],
    choices: ["おかげで", "せいで", "せいか", "ばかりに"],
  },
  {
    id: "n3-concession",
    label: "N3 逆接讓步",
    level: "N3",
    grammarKeys: ["のに", "くせに", "わりに", "といっても"],
    choices: ["のに", "くせに", "わりに", "といっても"],
  },
  {
    id: "n3-time-span",
    label: "N3 期間與趁早",
    level: "N3",
    grammarKeys: ["うちに", "あいだに", "あいだ"],
    choices: ["うちに", "あいだに", "あいだ"],
  },
  {
    id: "n3-moment-final",
    label: "N3 動作時點（句尾）",
    level: "N3",
    grammarKeys: ["たばかり", "たところ", "ているところ", "辞書形＋ところ"],
    choices: ["たばかり", "たところ", "ているところ", "辞書形＋ところ"],
    requiresInflectedChoices: true,
  },
  {
    id: "n3-moment-clause",
    label: "N3 瞬間與結果（句中）",
    level: "N3",
    grammarKeys: ["たとたんに", "たところに", "たばかりに", "たせいで"],
    choices: ["たとたんに", "たところに", "たばかりに", "たせいで"],
    requiresInflectedChoices: true,
  },
];

export const ARENA_BANK: ArenaItem[] = rawArenaBank as ArenaItem[];
