// Evidence belongs to a cache namespace, not a filename heuristic. The pool
// owns at most 32 namespaces, each retaining two distinct invalidated artifacts.
export type PchHistory = readonly {
  readonly directory: string;
  readonly since: number;
  readonly identities: readonly string[];
}[];
export const pchHistoryMs = 10 * 60 * 1000;
export const prunePchHistory = (history: PchHistory, now: number): PchHistory =>
  history.filter((sample) => now - sample.since < pchHistoryMs).slice(-32);
export const recordPchInvalidation = (history: PchHistory, directory: string, identity: string, now: number): PchHistory => {
  const recent = prunePchHistory(history, now);
  const sample = recent.find((sample) => sample.directory === directory);
  return [...recent.filter((sample) => sample.directory !== directory), {
    directory, since: sample?.since ?? now,
    identities: [...new Set([...(sample?.identities ?? []), identity])].slice(-2)
  }].slice(-32);
};
export const suppressPchBuild = (history: PchHistory, directory: string, now: number): boolean =>
  prunePchHistory(history, now).some((sample) => sample.directory === directory && sample.identities.length >= 2);
export const resetPchHistory = (history: PchHistory, directory: string): PchHistory =>
  history.filter((sample) => sample.directory !== directory);
