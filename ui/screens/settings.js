// Ayarlar: kayıt yuvaları, dışa/içe aktarma, test araçları, kaynaklar ve lisanslar.
import { esc, sheet, toast } from '../dom.js';
import { saveGame, loadGame, slotInfo, deleteSlot, exportState, importState, SLOTS } from '../../engine/save.js';
import { DIFFICULTY } from '../../engine/params.js';
import { fmtDate } from '../../engine/util.js';

export function renderSettings(view, ctx) {
  const s = ctx.state;
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Kayıtlar <small>bu tarayıcıda saklanır</small></h2>
    <p class="small muted" style="margin:0 0 6px">Oyun her eylem ve turdan sonra otomatik kaydedilir.</p>
    <div class="list">${SLOTS.map(sl => { const i = slotInfo(sl); return `<div class="li"><div class="grow"><div class="t">${sl === 'oto' ? 'Otomatik kayıt' : 'Yuva ' + sl}</div><div class="small muted">${i ? `${esc(i.party)} · ${esc(i.name)} · ${fmtDate(i.date)}` : 'Boş'}</div></div>
      ${sl !== 'oto' ? `<button class="btn" data-save="${sl}">Kaydet</button>` : ''}${i ? `<button class="btn" data-load="${sl}">Yükle</button>` : ''}${i && sl !== 'oto' ? `<button class="btn" data-del="${sl}" aria-label="Sil">✕</button>` : ''}</div>`; }).join('')}</div></section>`);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Dışa / içe aktar</h2>
    <p class="small muted" style="margin:0 0 8px">Kaydı başka bir cihaza taşımak için metni kopyala, diğer cihazda yapıştır.</p>
    <div class="grid2"><button class="btn" id="exp">Dışa aktar</button><button class="btn" id="imp">İçe aktar</button></div></section>`);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Oyun</h2><dl class="kv"><dt>Zorluk</dt><dd>${DIFFICULTY[s.difficulty].label}</dd><dt>Senaryo</dt><dd>2023 · seçim sonrası</dd><dt>Tohum</dt><dd>${s.seed}</dd></dl>
    <div class="grid2" style="margin-top:10px"><button class="btn" id="ff4">4 hafta hızlı ilerle</button><button class="btn" id="ff26">26 hafta hızlı ilerle</button></div>
    <button class="btn block" style="margin-top:8px" id="fftest">Test modu: seçim gecesine kadar ilerle</button>
    <p class="small muted" style="margin:6px 0 0">Hızlı ilerlemede eylem yapılmaz, bekleyen olaylar düşer; eylemsiz yeni parti zamanla iflas edebilir. Test modu para, teşkilat ve kongre şartlarını otomatik sağlar (bu oyunun kaydı "test" olarak işaretlenir).</p>
    <button class="btn red block" style="margin-top:10px" id="newgame">Ana menü / yeni oyun</button></section>`);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Kaynaklar ve lisanslar</h2><div class="small" style="display:flex;flex-direction:column;gap:6px">
    <p style="margin:0"><b>2023 seçim sonuçları:</b> YSK verileri; <i>turkeyelections</i> R paketi (MIT, Ozancan Özdemir) ve <i>AnketDelisi/Turkiye</i> işlenmiş verileri üzerinden. Model başlangıçta 2023 meclis dağılımını birebir üretir.</p>
    <p style="margin:0"><b>Harita:</b> <i>turkey-map-react</i> (MIT, Erdi Gökçe) il sınırları.</p>
    <p style="margin:0"><b>Mevzuat:</b> %7 baraj ve ittifak kuralı (7393 s. Kanun, 2022). Seçime katılım şartları ve Hazine yardımı tutarları tahminidir; resmi metinle doğrulanmalıdır.</p>
    <p style="margin:0"><b>Tasarım varsayımları:</b> parti ideoloji konumları, seçmen kümeleri, medya erişimi ve tüm denge katsayıları oyun tasarımıdır; gerçek kişi veya kurumlar hakkında iddia içermez. Olaylar kurgusaldır.</p></div></section>`);

  view.querySelectorAll('[data-save]').forEach(b => b.onclick = () => { toast(saveGame(s, b.dataset.save) ? 'Kaydedildi' : 'Kaydedilemedi (tarayıcı depolaması kapalı olabilir)'); ctx.render(); });
  view.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { const st = loadGame(b.dataset.load); if (st) { ctx.start(st); toast('Kayıt yüklendi'); } else toast('Kayıt okunamadı'); });
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const sh = sheet(`<h2>Yuva ${b.dataset.del} silinsin mi?</h2><div class="grid2"><button class="btn" data-a="no">Vazgeç</button><button class="btn red" data-a="yes">Sil</button></div>`);
    sh.root.querySelector('[data-a=no]').onclick = sh.close;
    sh.root.querySelector('[data-a=yes]').onclick = () => { deleteSlot(b.dataset.del); sh.close(); ctx.render(); };
  });
  view.querySelector('#exp').onclick = () => {
    const txt = exportState(s);
    const sh = sheet(`<h2>Kaydı dışa aktar</h2><textarea class="in" id="exp-t" rows="6" readonly>${esc(txt)}</textarea>
      <div class="grid2"><button class="btn primary" id="copy">Kopyala</button><a class="btn" id="dl" style="text-align:center;text-decoration:none">Dosya indir</a></div>
      <p class="small muted" style="margin:0">Bazı ortamlarda dosya indirme kapalıdır; o zaman metni kopyala.</p>`);
    const ta = sh.root.querySelector('#exp-t');
    sh.root.querySelector('#copy').onclick = async () => {
      try { await navigator.clipboard.writeText(txt); toast('Kopyalandı'); } catch { ta.select(); toast('Metni seçtim; kopyala komutunu kullan'); }
    };
    const a = sh.root.querySelector('#dl');
    try { a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = `secim-oyunu-${s.date}.json`; } catch { a.hidden = true; }
  };
  view.querySelector('#imp').onclick = () => {
    const sh = sheet(`<h2>Kaydı içe aktar</h2><label class="f">Dosya seç<input type="file" id="imp-f" accept=".json,application/json" class="in"></label>
      <label class="f">veya metni yapıştır<textarea class="in" id="imp-t" rows="5"></textarea></label><button class="btn primary" id="imp-go">Yükle</button>`);
    const load = txt => { try { ctx.start(importState(txt)); sh.close(); toast('Kayıt yüklendi'); } catch (e) { toast(e.message || 'Geçersiz kayıt'); } };
    sh.root.querySelector('#imp-f').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(load); };
    sh.root.querySelector('#imp-go').onclick = () => load(sh.root.querySelector('#imp-t').value);
  };
  view.querySelector('#ff4').onclick = () => ctx.fastForward(4);
  view.querySelector('#ff26').onclick = () => ctx.fastForward(26);
  view.querySelector('#fftest').onclick = () => ctx.fastForward(400, { test: true });
  view.querySelector('#newgame').onclick = () => {
    const sh = sheet(`<h2>Ana menüye dön?</h2><p>Oyunun otomatik kayıtta saklı; oradan devam edebilirsin.</p><div class="grid2"><button class="btn" data-a="no">Vazgeç</button><button class="btn red" data-a="yes">Ana menü</button></div>`);
    sh.root.querySelector('[data-a=no]').onclick = sh.close;
    sh.root.querySelector('[data-a=yes]').onclick = () => { sh.close(); ctx.quit(); };
  };
}
