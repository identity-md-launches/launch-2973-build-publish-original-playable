export type Score = {
  name: string;
  wave: number;
  block: string | null;
  kills: number;
  practice: boolean;
  endless: boolean;
  won: boolean;
  date: string;
};
export const SCORES_KEY = "burrow-siege-scores-v1";
export const TUTORIAL_KEY = "burrow-siege-tutorial-v1";
export function readScores(): Score[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (s): s is Score =>
          s &&
          typeof s.name === "string" &&
          Array.from(s.name).length <= 20 &&
          Number.isSafeInteger(s.wave) &&
          s.wave >= 0 &&
          Number.isSafeInteger(s.kills) &&
          s.kills >= 0 &&
          (s.block === null ||
            (typeof s.block === "string" && /^\d{1,30}$/.test(s.block))) &&
          typeof s.practice === "boolean" &&
          typeof s.endless === "boolean" &&
          typeof s.won === "boolean" &&
          typeof s.date === "string",
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}
export function saveScore(score: Score): boolean {
  try {
    const scores = [
      ...readScores(),
      {
        ...score,
        name:
          Array.from(score.name.trim()).slice(0, 20).join("") ||
          "Burrow keeper",
      },
    ]
      .sort(
        (a, b) =>
          b.wave - a.wave || Number(b.won) - Number(a.won) || b.kills - a.kills,
      )
      .slice(0, 10);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    return true;
  } catch {
    return false;
  }
}
export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "seen";
  } catch {
    return false;
  }
}
export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, "seen");
  } catch {
    /* Still playable without storage. */
  }
}
