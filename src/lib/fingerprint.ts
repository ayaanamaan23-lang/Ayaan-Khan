const KEY = "lp_fingerprint";

export function getUserFingerprint(): string {
  let fp = localStorage.getItem(KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(KEY, fp);
  }
  return fp;
}

export function getVotedKey(incidentId: number): string {
  return `lp_voted_${incidentId}`;
}

export function hasVoted(incidentId: number): boolean {
  return localStorage.getItem(getVotedKey(incidentId)) === "1";
}

export function markVoted(incidentId: number): void {
  localStorage.setItem(getVotedKey(incidentId), "1");
}
