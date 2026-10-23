const KEY = 'shopora.recentlyViewed';
const MAX = 8;

/** Remembers product IDs the shopper looked at (used by the customer dashboard later). */
export function rememberProduct(id: number) {
  try {
    const ids = getRecentlyViewed().filter((x) => x !== id);
    localStorage.setItem(KEY, JSON.stringify([id, ...ids].slice(0, MAX)));
  } catch { /* storage unavailable: not important */ }
}

export function getRecentlyViewed(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'number') : [];
  } catch { return []; }
}
