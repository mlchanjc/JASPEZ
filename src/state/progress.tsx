import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { attemptStats, clampProficiency, pushAttempt, seedAttempts } from "@/lib/proficiency";
import type { LevelId, RegisterMode } from "@/data/types";

const STORAGE_KEY = "jaspez.progress.v1";

export type ThemePreset = "editorial" | "ios" | "darkInk";

export type UserPrefs = {
  showFurigana: boolean;
  register: RegisterMode;
  kanaOnly: boolean;
  darkMode: boolean;
  themePreset: ThemePreset;
};

type ProgressState = {
  streak: number;
  lastActiveDate: string | null;
  learned: string[];
  attempts: Record<string, number[]>;
  currentLevel: LevelId;
  grammarLearned: string[];
  grammarAttempts: Record<string, number[]>;
  arenaAttempts: Record<string, number[]>;
  grammarNotes: Record<string, string>;
  ghostGrammar: string[];
  prefs: UserPrefs;
};

type ProgressContextValue = {
  ready: boolean;
  streak: number;
  learnedCount: number;
  learned: ReadonlySet<string>;
  attempts: Readonly<Record<string, number[]>>;
  currentLevel: LevelId;
  setCurrentLevel: (level: LevelId) => void;
  markLearned: (key: string) => void;
  getProficiency: (key: string) => number;
  setProficiency: (key: string, level: number) => void;
  recordAttempt: (key: string, correct: boolean) => { level: number; correct: number; total: number };
  // Grammar & preferences
  grammarLearnedCount: number;
  grammarLearned: ReadonlySet<string>;
  grammarAttempts: Readonly<Record<string, number[]>>;
  arenaAttempts: Readonly<Record<string, number[]>>;
  grammarNotes: Readonly<Record<string, string>>;
  ghostGrammar: readonly string[];
  prefs: UserPrefs;
  setPref: <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => void;
  markGrammarLearned: (id: string) => void;
  getGrammarProficiency: (id: string) => number;
  setGrammarProficiency: (id: string, level: number) => void;
  recordGrammarAttempt: (id: string, correct: boolean) => { level: number; correct: number; total: number };
  recordArenaAttempt: (itemId: string, correct: boolean) => { level: number; correct: number; total: number };
  setGrammarNote: (id: string, note: string) => void;
  addGhostGrammar: (id: string) => void;
  clearGhostGrammar: (id: string) => void;
  exportProgressJson: () => string;
  importProgressJson: (rawJson: string) => { ok: boolean; error?: string };
};

const defaultPrefs: UserPrefs = {
  showFurigana: true,
  register: "polite",
  kanaOnly: false,
  darkMode: false,
  themePreset: "editorial",
};

const initial: ProgressState = {
  streak: 0,
  lastActiveDate: null,
  learned: [],
  attempts: {},
  currentLevel: "N5",
  grammarLearned: [],
  grammarAttempts: {},
  arenaAttempts: {},
  grammarNotes: {},
  ghostGrammar: [],
  prefs: defaultPrefs,
};

function readAttemptsMap(raw: unknown) {
  const attempts: Record<string, number[]> = {};
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      if (!Array.isArray(value)) continue;
      const history = value.filter((item) => item === 0 || item === 1).slice(-8);
      if (history.length > 0) attempts[key] = history;
    }
  }
  return attempts;
}

function readAttempts(saved: { attempts?: unknown; proficiency?: unknown }) {
  const attempts = readAttemptsMap(saved.attempts);
  if (saved.proficiency && typeof saved.proficiency === "object") {
    for (const [key, score] of Object.entries(saved.proficiency)) {
      if (attempts[key]) continue;
      const seeded = seedAttempts(clampProficiency(typeof score === "number" ? score : 0));
      if (seeded.length > 0) attempts[key] = seeded;
    }
  }
  return attempts;
}

function readNotes(raw: unknown) {
  const notes: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "string" && value.trim().length > 0) {
        notes[key] = value;
      }
    }
  }
  return notes;
}

function readPrefs(raw: unknown): UserPrefs {
  if (!raw || typeof raw !== "object") return defaultPrefs;
  const obj = raw as Partial<UserPrefs>;
  return {
    showFurigana: typeof obj.showFurigana === "boolean" ? obj.showFurigana : defaultPrefs.showFurigana,
    register: obj.register === "casual" || obj.register === "polite" ? obj.register : defaultPrefs.register,
    kanaOnly: typeof obj.kanaOnly === "boolean" ? obj.kanaOnly : defaultPrefs.kanaOnly,
    darkMode: typeof obj.darkMode === "boolean" ? obj.darkMode : defaultPrefs.darkMode,
    themePreset:
      obj.themePreset === "editorial" || obj.themePreset === "ios" || obj.themePreset === "darkInk"
        ? obj.themePreset
        : defaultPrefs.themePreset,
  };
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function previousDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return localDate(date);
}

function nextStreak(prev: ProgressState) {
  const today = localDate();
  let streak = prev.streak;
  if (prev.lastActiveDate !== today) {
    streak = prev.lastActiveDate === previousDate(today) ? prev.streak + 1 : 1;
  }
  return { streak, lastActiveDate: today };
}

function normalizeProgressState(saved: Partial<ProgressState> & { proficiency?: unknown }): ProgressState {
  const validLevel: LevelId =
    saved.currentLevel === "N5" ||
    saved.currentLevel === "N4" ||
    saved.currentLevel === "N3" ||
    saved.currentLevel === "N2" ||
    saved.currentLevel === "N1"
      ? saved.currentLevel
      : "N5";
  return {
    streak: typeof saved.streak === "number" && saved.streak >= 0 ? Math.floor(saved.streak) : 0,
    lastActiveDate: typeof saved.lastActiveDate === "string" ? saved.lastActiveDate : null,
    learned: Array.isArray(saved.learned)
      ? saved.learned.filter((item): item is string => typeof item === "string")
      : [],
    attempts: readAttempts(saved),
    currentLevel: validLevel,
    grammarLearned: Array.isArray(saved.grammarLearned)
      ? saved.grammarLearned.filter((item): item is string => typeof item === "string")
      : [],
    grammarAttempts: readAttemptsMap(saved.grammarAttempts),
    arenaAttempts: readAttemptsMap(saved.arenaAttempts),
    grammarNotes: readNotes(saved.grammarNotes),
    ghostGrammar: Array.isArray(saved.ghostGrammar)
      ? saved.ghostGrammar.filter((item): item is string => typeof item === "string")
      : [],
    prefs: readPrefs(saved.prefs),
  };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<ProgressState> & { proficiency?: unknown };
        setState({
          streak: saved.streak ?? 0,
          lastActiveDate: saved.lastActiveDate ?? null,
          learned: Array.isArray(saved.learned) ? saved.learned : [],
          attempts: readAttempts(saved),
          currentLevel: saved.currentLevel ?? "N5",
          grammarLearned: Array.isArray(saved.grammarLearned) ? saved.grammarLearned : [],
          grammarAttempts: readAttemptsMap(saved.grammarAttempts),
          arenaAttempts: readAttemptsMap(saved.arenaAttempts),
          grammarNotes: readNotes(saved.grammarNotes),
          ghostGrammar: Array.isArray(saved.ghostGrammar)
            ? saved.ghostGrammar.filter((item): item is string => typeof item === "string")
            : [],
          prefs: readPrefs(saved.prefs),
        });
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [ready, state]);

  const learned = useMemo(() => new Set(state.learned), [state.learned]);
  const grammarLearned = useMemo(() => new Set(state.grammarLearned), [state.grammarLearned]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      ready,
      streak: state.streak,
      learnedCount: state.learned.length,
      learned,
      attempts: state.attempts,
      currentLevel: state.currentLevel,
      setCurrentLevel: (level) => setState((prev) => ({ ...prev, currentLevel: level })),
      markLearned: (key) =>
        setState((prev) => {
          const learnedKeys = prev.learned.includes(key) ? prev.learned : [...prev.learned, key];
          return { ...prev, learned: learnedKeys, ...nextStreak(prev) };
        }),
      getProficiency: (key) => attemptStats(state.attempts[key]).level,
      setProficiency: (key, level) => {
        const seeded = seedAttempts(level);
        setState((prev) => {
          const attempts = { ...prev.attempts };
          if (seeded.length === 0) delete attempts[key];
          else attempts[key] = seeded;
          return { ...prev, attempts };
        });
      },
      recordAttempt: (key, correct) => {
        const history = pushAttempt(state.attempts[key], correct);
        const stats = attemptStats(history);
        setState((prev) => ({
          ...prev,
          attempts: { ...prev.attempts, [key]: pushAttempt(prev.attempts[key], correct) },
        }));
        return { level: stats.level, correct: stats.correct, total: stats.total };
      },
      // Grammar & preferences
      grammarLearnedCount: state.grammarLearned.length,
      grammarLearned,
      grammarAttempts: state.grammarAttempts,
      arenaAttempts: state.arenaAttempts,
      grammarNotes: state.grammarNotes,
      ghostGrammar: state.ghostGrammar,
      prefs: state.prefs,
      setPref: (key, val) =>
        setState((prev) => ({
          ...prev,
          prefs: { ...prev.prefs, [key]: val },
        })),
      markGrammarLearned: (id) =>
        setState((prev) => {
          const grammarLearnedKeys = prev.grammarLearned.includes(id)
            ? prev.grammarLearned
            : [...prev.grammarLearned, id];
          const ghostGrammar = prev.ghostGrammar.filter((item) => item !== id);
          return { ...prev, grammarLearned: grammarLearnedKeys, ghostGrammar, ...nextStreak(prev) };
        }),
      getGrammarProficiency: (id) => attemptStats(state.grammarAttempts[id]).level,
      setGrammarProficiency: (id, level) => {
        const seeded = seedAttempts(level);
        setState((prev) => {
          const grammarAttempts = { ...prev.grammarAttempts };
          if (seeded.length === 0) delete grammarAttempts[id];
          else grammarAttempts[id] = seeded;
          return { ...prev, grammarAttempts };
        });
      },
      recordGrammarAttempt: (id, correct) => {
        const history = pushAttempt(state.grammarAttempts[id], correct);
        const stats = attemptStats(history);
        setState((prev) => ({
          ...prev,
          grammarAttempts: {
            ...prev.grammarAttempts,
            [id]: pushAttempt(prev.grammarAttempts[id], correct),
          },
        }));
        return { level: stats.level, correct: stats.correct, total: stats.total };
      },
      recordArenaAttempt: (itemId, correct) => {
        const nextHistory = pushAttempt(state.arenaAttempts[itemId], correct);
        const stats = attemptStats(nextHistory);
        setState((prev) => ({
          ...prev,
          arenaAttempts: {
            ...prev.arenaAttempts,
            [itemId]: pushAttempt(prev.arenaAttempts[itemId], correct),
          },
        }));
        return stats;
      },
      setGrammarNote: (id, note) =>
        setState((prev) => {
          const grammarNotes = { ...prev.grammarNotes };
          if (note.trim().length === 0) delete grammarNotes[id];
          else grammarNotes[id] = note;
          return { ...prev, grammarNotes };
        }),
      addGhostGrammar: (id) =>
        setState((prev) => {
          if (prev.ghostGrammar.includes(id)) return prev;
          return { ...prev, ghostGrammar: [...prev.ghostGrammar, id] };
        }),
      clearGhostGrammar: (id) =>
        setState((prev) => ({
          ...prev,
          ghostGrammar: prev.ghostGrammar.filter((item) => item !== id),
        })),
      exportProgressJson: () =>
        JSON.stringify(
          {
            app: "JASPEZ",
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            data: state,
          },
          null,
          2,
        ),
      importProgressJson: (rawJson) => {
        try {
          const parsed = JSON.parse(rawJson.trim()) as
            | { app?: string; data?: Partial<ProgressState> & { proficiency?: unknown } }
            | (Partial<ProgressState> & { proficiency?: unknown });
          if (!parsed || typeof parsed !== "object") {
            return { ok: false, error: "格式錯誤：請貼上有效的 JASPEZ 備份 JSON。" };
          }
          const payload = "data" in parsed && parsed.data && typeof parsed.data === "object"
            ? parsed.data
            : (parsed as Partial<ProgressState> & { proficiency?: unknown });
          const next = normalizeProgressState(payload);
          setState(next);
          return { ok: true };
        } catch {
          return { ok: false, error: "JSON 解析失敗，請確認複製了完整的備份內容。" };
        }
      },
    }),
    [grammarLearned, learned, ready, state],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used within ProgressProvider");
  return value;
}
