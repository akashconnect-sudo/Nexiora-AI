const PREFS_KEY = 'nexiora_prefs';

export type UserPrefs = {
  defaultMode: 'universal' | 'research' | 'news';
  openCitationsInNewTab: boolean;
};

export const DEFAULT_PREFS: UserPrefs = {
  defaultMode: 'universal',
  openCitationsInNewTab: true,
};

export function loadPrefs(): UserPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as UserPrefs) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: UserPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
