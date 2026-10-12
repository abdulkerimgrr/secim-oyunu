// D'Hondt yöntemiyle sandalye dağıtımı. Eşitlikte daha çok oy alan parti önce gelir.
export function dhondt(votes, seats) {
  const ids = Object.keys(votes).filter(k => votes[k] > 0);
  const res = Object.fromEntries(ids.map(k => [k, 0]));
  for (let i = 0; i < seats; i++) {
    let best = null, bq = -1;
    for (const k of ids) {
      const q = votes[k] / (res[k] + 1);
      if (q > bq || (q === bq && votes[k] > votes[best])) { bq = q; best = k; }
    }
    if (best === null) break;
    res[best]++;
  }
  return res;
}
