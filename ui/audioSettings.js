// Ses ve müzik ayarları paneli (Ayarlar sekmesi ve açılış ekranında kullanılır)
import { getSettings, setSetting, sfx } from './sound.js';
import { playTrack, currentTrack } from './music.js';

export function audioSettingsHtml() {
  const s = getSettings();
  return `<div class="aset">
    <label class="aset-row"><span>🔊 Tüm sesler</span><input type="checkbox" id="as-master" ${s.master ? 'checked' : ''}></label>
    <label class="aset-row"><span>🎵 Müzik</span><input type="checkbox" id="as-music" ${s.music ? 'checked' : ''}></label>
    <label class="aset-col"><span>Müzik seviyesi <b id="as-mv">%${Math.round(s.musicVol * 100)}</b></span><input type="range" id="as-musicVol" min="0" max="100" value="${Math.round(s.musicVol * 100)}"></label>
    <label class="aset-row"><span>🔔 Efektler</span><input type="checkbox" id="as-sfx" ${s.sfx ? 'checked' : ''}></label>
    <label class="aset-col"><span>Efekt seviyesi <b id="as-sv">%${Math.round(s.sfxVol * 100)}</b></span><input type="range" id="as-sfxVol" min="0" max="100" value="${Math.round(s.sfxVol * 100)}"></label>
    <div class="aset-col"><span>Müziği dinle</span><div class="chips wrap">${[['menu', 'Menü'], ['game', 'Oyun'], ['campaign', 'Kampanya'], ['president', 'Cumhurbaşkanlığı']].map(([k, l]) => `<button class="chip" type="button" data-track="${k}">${l}</button>`).join('')}</div></div>
  </div>`;
}

export function bindAudioSettings(root, { onChange } = {}) {
  const q = id => root.querySelector('#' + id);
  q('as-master').onchange = e => { setSetting('master', e.target.checked); onChange?.(); };
  q('as-music').onchange = e => setSetting('music', e.target.checked);
  q('as-sfx').onchange = e => { setSetting('sfx', e.target.checked); sfx('ping'); };
  q('as-musicVol').oninput = e => { setSetting('musicVol', +e.target.value / 100); q('as-mv').textContent = '%' + e.target.value; };
  q('as-sfxVol').oninput = e => { setSetting('sfxVol', +e.target.value / 100); q('as-sv').textContent = '%' + e.target.value; };
  q('as-sfxVol').onchange = () => sfx('ping');
  root.querySelectorAll('[data-track]').forEach(b => b.onclick = () => { playTrack(b.dataset.track); });
}
