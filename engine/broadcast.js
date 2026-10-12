// Canlı yayın: soru seçimi ve cevapların anlık etkileri.
import { KURULTAY_QUESTIONS, GENERAL_QUESTIONS, HOSTS, CHANNEL_NAMES, PROGRAMS } from '../data/tv.js';
import { answerFactionEffects, bumpFaction, recalcSupport } from './kurultay.js';
import { DIFFICULTY } from './params.js';
import { clamp } from './util.js';
import { charMod } from './character.js';
import { CLUSTERS } from '../data/clusters.js';

const AUD = { iktidara_yakin: 'muhafazakar', muhalif: 'laik_kentli', tarafsiz: 'kararsiz', yerel: null };

export function prepareBroadcast(state, kind, channel, rng) {
  const pool = kind === 'kurultay' ? KURULTAY_QUESTIONS : GENERAL_QUESTIONS;
  const recent = state.flags.recentQ || [];
  let cands = pool.filter(q => !recent.includes(q.id));
  if (cands.length < 3) cands = pool;
  const qs = [];
  while (qs.length < 3) { const q = rng.pick(cands); if (!qs.includes(q)) qs.push(q); }
  state.flags.recentQ = [...qs.map(q => q.id), ...recent].slice(0, 6);
  const seed = rng.int(1, 1e6);
  return {
    kind, channel, seed,
    channelName: CHANNEL_NAMES[kind === 'kurultay' ? 'kurultay' : channel],
    program: rng.pick(PROGRAMS), host: rng.pick(HOSTS),
    questions: qs.map(q => q.id), step: 0, results: [],
  };
}

export function questionById(id) {
  return KURULTAY_QUESTIONS.find(q => q.id === id) || GENERAL_QUESTIONS.find(q => q.id === id);
}

// Cevap uygula; dönen: { lines, reaction, mood, meter }
export function applyAnswer(state, b, ansIndex, rng) {
  const q = questionById(b.questions[b.step]);
  const a = q.answers[ansIndex];
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.zor;
  const out = { lines: [], deltas: {} };
  const tv = charMod(state, 'tv');
  if (b.kind === 'kurultay') {
    const k = state.player.kurultay;
    const before = k.support;
    // hostile sorularda etkiler büyür
    const scale = (q.hostile ? 1.3 : 1) * 1.2 * diff.effect * tv * (1 + rng.normal(0, 0.25));
    const eff = answerFactionEffects(k, a.tags, scale);
    for (const [fid, v] of Object.entries(eff)) out.deltas[fid] = bumpFaction(k, fid, v);
    // genç aday etiketi (yaş) ve gaf ihtimali
    if (a.tags.sert && rng.chance(0.18 * charMod(state, 'gaffe'))) {
      for (const f of k.factions) bumpFaction(k, f.id, -1.2);
      out.lines.push('⚠️ Sert çıkışın parti içinde tepki çekti.');
      out.gaffe = true;
    }
    recalcSupport(k);
    k.tvAnswers.push(...Object.keys(a.tags));
    out.meter = k.support; out.change = k.support - before;
    out.reaction = out.change > 1.2 ? 'Salondan alkış! Delegeler arasında adın hızla yükseliyor.'
      : out.change > 0.25 ? 'Delegelerden olumlu tepki.'
      : out.change < -0.6 ? 'Genel merkez çevreleri cevabından hiç memnun değil.'
      : out.change < -0.1 ? 'Bazı delegeler bu cevabı beğenmedi.' : 'Delegeler temkinli; belirgin bir etki yok.';
    out.mood = out.change > 0.25 ? 'smile' : out.change < -0.1 ? 'tense' : 'serious';
  } else {
    const p = state.parties[state.player.partyId];
    let fit = 0;
    for (const [ax, dir] of Object.entries(a.axis || {})) fit += dir * (p.ideology[ax] || 0);
    // kanal izleyicisiyle uyum
    let aud = 0;
    const cl = CLUSTERS.find(c => c.id === AUD[b.channel]);
    if (cl) for (const [ax, dir] of Object.entries(a.axis || {})) aud += dir * (cl.ideo[ax] || 0);
    // tutarlılık: aynı konuda önceki yön
    const st = state.flags.stances || (state.flags.stances = {});
    const dirKey = Object.entries(a.axis || {}).map(([k, v]) => k + (v > 0 ? '+' : '-')).join(',');
    let uturn = false;
    if (q.topic && st[q.topic] && dirKey && st[q.topic] !== dirKey) uturn = true;
    if (q.topic && dirKey) st[q.topic] = dirKey;
    let mom = (0.012 * fit + 0.008 * aud + 0.004) * diff.effect * tv;
    let rec = (0.003 + 0.004 * (1 - Math.max(0, aud))) * diff.effect * tv;
    if (a.tone === 'kacamak') { mom -= 0.006; out.lines.push('Sunucu cevabı yeterli bulmadı.'); }
    if (a.tone === 'sert') { mom *= 1.3; if (rng.chance(0.2 * charMod(state, 'gaffe'))) { p.leader.image = clamp(p.leader.image - 0.02, 0, 1); out.lines.push('⚠️ Sert üslubun tartışma yarattı.'); out.gaffe = true; } }
    if (uturn) { mom -= 0.02; p.leader.image = clamp(p.leader.image - 0.01, 0, 1); out.lines.push('⚠️ Rakipler bunu "U dönüşü" diye paylaşıyor.'); }
    p.momentum += mom;
    p.recognition = clamp(p.recognition + rec * (1 - p.recognition), 0, 1);
    out.change = mom * 1000; out.meter = clamp(50 + mom * 1500, 0, 100);
    out.reaction = mom > 0.01 ? 'İzleyiciden güçlü olumlu tepki.' : mom < 0 ? 'Cevap izleyicide karşılık bulmadı.' : 'Ilımlı tepki.';
    out.mood = mom > 0.01 ? 'smile' : mom < 0 ? 'tense' : 'serious';
  }
  b.results.push({ q: q.id, a: ansIndex, change: out.change });
  b.step++;
  return out;
}
