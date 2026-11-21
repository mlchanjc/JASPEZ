import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { attemptStats, clampProficiency, pushAttempt, seedAttempts } from "@/lib/proficiency";
import type { LevelId } from "@/data/types";

const STORAGE_KEY = "jaspez.progress.v1";

type ProgressState = {
  streak: number;
  lastActiveDate: string | null;
  learned: string[];
  attempts: Record<string, number[]>;
  currentLevel: LevelId;
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
};

const initial: ProgressState = {
  streak: 0,
  lastActiveDate: null,
  learned: [],
  attempts: {},
  currentLevel: "N5",
};

function readAttempts(saved: { attempts?: unknown; proficiency?: unknown }) {
  const attempts: Record<string, number[]> = {};
  if (saved.attempts && typeof saved.attempts === "object") {
    for (const [key, value] of Object.entries(saved.attempts)) {
      if (!Array.isArray(value)) continue;
      const history = value.filter((item) => item === 0 || item === 1).slice(-8);
      if (history.length > 0) attempts[key] = history;
    }
  }
  if (saved.proficiency && typeof saved.proficiency === "object") {
    for (const [key, score] of Object.entries(saved.proficiency)) {
      if (attempts[key]) continue;
      const seeded = seedAttempts(clampProficiency(typeof score === "number" ? score : 0));
      if (seeded.length > 0) attempts[key] = seeded;
    }
  }
  return attempts;
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
        });
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [ready, state]);

  const learned = useMemo(() => new Set(state.learned), [state.learned]);

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
          const today = localDate();
          const learnedKeys = prev.learned.includes(key) ? prev.learned : [...prev.learned, key];
          let streak = prev.streak;
          if (prev.lastActiveDate !== today) {
            streak = prev.lastActiveDate === previousDate(today) ? prev.streak + 1 : 1;
          }
          return { ...prev, learned: learnedKeys, streak, lastActiveDate: today };
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
    }),
    [learned, ready, state],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used within ProgressProvider");
  return value;
}
