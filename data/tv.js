// Canlı yayın soru havuzu — KURGUSAL program ve sunucular.
// Kurultay cevaplarındaki etiketler hiziplerin tercihleriyle çarpılır (data/factions.js).
// Genel cevaplarda axis: cevabın ideoloji ekseni üzerindeki yönü; topic: tutarlılık takibi (U dönüşü).

export const HOSTS = ['Selin Ateş', 'Murat Kandemir', 'Ece Yalçın', 'Kerem Uslu', 'Nazlı Tuna', 'Tolga Sezer'];
export const CHANNEL_NAMES = {
  iktidara_yakin: 'Ekran 1 Haber', muhalif: 'Meydan TV', tarafsiz: 'Gündem 24', yerel: 'Yerel Kanal',
  kurultay: 'Gündem 24',
};
export const PROGRAMS = ['Ana Haber Özel', 'Kırmızı Çizgi', 'Gece Masası', 'Siyaset Odası', 'Açık Oturum'];

export const KURULTAY_QUESTIONS = [
  { id: 'k1', text: 'Genel başkanınız görevdeyken neden aday oldunuz?', answers: [
    { label: 'Parti yenilenmezse iktidar olamayız.', tags: { degisim: 2, sadakat: -1 } },
    { label: 'Genel başkanımıza saygım büyük; ama delegelerin bir seçeneği olmalı.', tags: { uzlasma: 2, degisim: 1 } },
    { label: 'Kaybedilen seçimlerin hesabı sorulmalı.', tags: { degisim: 3, sadakat: -3, sert: 2 } },
  ] },
  { id: 'k2', text: 'Kazanırsanız mevcut yönetime ne olacak?', answers: [
    { label: 'Herkesle çalışırım; kimseyi dışarıda bırakmam.', tags: { uzlasma: 2, sadakat: 1 } },
    { label: 'Yepyeni, genç bir kadro kuracağım.', tags: { degisim: 2, genclik: 2, sadakat: -2 } },
    { label: 'Liyakat esas olacak; isimleri delegeler görecek.', tags: { tecrube: 1, degisim: 1, ilke: 1 } },
  ] },
  { id: 'k3', text: 'İttifak politikanız ne olacak?', answers: [
    { label: 'İktidar için geniş bir ittifak kurarız.', tags: { ittifak: 2, merkez: 1, ideoloji: -1 } },
    { label: 'Partimiz kendi kimliğiyle yarışmalı.', tags: { bagimsiz: 2, ideoloji: 1 } },
    { label: 'Şartlara göre karar veririz.', tags: { kacamak: 1 } },
  ] },
  { id: 'k4', text: 'Partinin çizgisini nereye taşıyacaksınız?', answers: [
    { label: 'Kurucu ilkelerimize döneceğiz.', tags: { ideoloji: 2, tecrube: 1, merkez: -1 } },
    { label: 'Merkeze açılıp yeni seçmenlere ulaşmalıyız.', tags: { merkez: 2, ideoloji: -1, degisim: 1 } },
    { label: 'Gençlerin ve kadınların partisi olacağız.', tags: { genclik: 2, degisim: 1 } },
  ] },
  { id: 'k5', text: 'Delegelere makam sözü verdiğiniz iddia ediliyor. Doğru mu?', hostile: true, answers: [
    { label: 'Hiçbir delegeye makam sözü vermedim.', tags: { ilke: 2 } },
    { label: 'Delegelerimiz yönetimde söz sahibi olacak, bunu saklamıyorum.', tags: { teskilat: 2, ilke: -1 } },
    { label: 'Bu iddiaları ciddiye almıyorum.', tags: { sert: 1, kacamak: 1 } },
  ] },
  { id: 'k6', text: 'Kaybederseniz partide kalacak mısınız?', answers: [
    { label: 'Elbette. Bu benim partim.', tags: { sadakat: 2, uzlasma: 1 } },
    { label: 'Kaybetmeyeceğim.', tags: { sert: 1, degisim: 1 } },
    { label: 'Delegelerin kararından sonra değerlendiririz.', tags: { kacamak: 1, sadakat: -1 } },
  ] },
  { id: 'k7', text: 'Seçim yenilgilerinin sorumlusu kim?', hostile: true, answers: [
    { label: 'Hepimiziz; ben de dahil.', tags: { uzlasma: 2, ilke: 1 } },
    { label: 'Yönetim sorumluluk almalı.', tags: { degisim: 2, sadakat: -2, sert: 1 } },
    { label: 'Geçmişi değil geleceği konuşalım.', tags: { genclik: 1, kacamak: 1 } },
  ] },
  { id: 'k8', text: 'Teşkilata mesajınız ne?', answers: [
    { label: 'Teşkilat partinin sahibidir; il başkanları yetki alacak.', tags: { teskilat: 3 } },
    { label: 'Disiplin ve tek merkezden yönetim.', tags: { sadakat: 1, teskilat: -1, tecrube: 1 } },
    { label: 'Dijital üyelik ve şeffaf ön seçim getireceğiz.', tags: { genclik: 2, degisim: 1, teskilat: -0.5 } },
  ] },
  { id: 'k9', text: 'Aday listelerini kim belirleyecek?', answers: [
    { label: 'Ön seçim; üyeler belirleyecek.', tags: { degisim: 1, teskilat: 1, ilke: 1, sadakat: -1 } },
    { label: 'Genel merkez ile il başkanları birlikte.', tags: { uzlasma: 1, teskilat: 1 } },
    { label: 'Kazanacak adayları ben seçeceğim.', tags: { sert: 1, sadakat: -1, teskilat: -1 } },
  ] },
  { id: 'k10', text: 'Mevcut genel başkanın döneminde neler doğru yapıldı?', answers: [
    { label: 'Partiyi zor günlerde ayakta tuttu; hakkını teslim ederim.', tags: { sadakat: 2, uzlasma: 1, degisim: -0.5 } },
    { label: 'Emekleri var ama yeni bir döneme ihtiyaç var.', tags: { degisim: 1, uzlasma: 1 } },
    { label: 'Sonuçlar ortada; sayılara bakın.', tags: { degisim: 2, sert: 2, sadakat: -2 } },
  ] },
];

export const GENERAL_QUESTIONS = [
  { id: 'g1', topic: 'ekonomi', text: 'Enflasyonla mücadele için ilk adımınız ne olur?', answers: [
    { label: 'Faizi artırıp disiplin sağlarız.', axis: { eko: 1 } },
    { label: 'Ücretleri koruyup fiyat denetimi yaparız.', axis: { eko: -1 } },
    { label: 'Önce bağımsız kurumları yeniden inşa ederiz.', axis: { ozg: 1 } },
  ] },
  { id: 'g2', topic: 'goc', text: 'Sığınmacı meselesinde politikanız ne?', answers: [
    { label: 'Takvime bağlı, gönüllü ve güvenli geri dönüş.', axis: { milli: 1 } },
    { label: 'Uluslararası hukuka uygun, insani bir uyum politikası.', axis: { milli: -1, ozg: 1 } },
    { label: 'Sınırları kapatır, kayıt dışılığı bitiririz.', axis: { milli: 1, ozg: -1 }, tone: 'sert' },
  ] },
  { id: 'g3', topic: 'dis', text: 'AB üyelik süreci sizce canlandırılmalı mı?', answers: [
    { label: 'Evet, tam üyelik hedefi stratejik.', axis: { dis: -1 } },
    { label: 'Hayır, çok yönlü ve bağımsız bir dış politika.', axis: { dis: 1 } },
    { label: 'Önce gümrük birliği güncellenmeli.', axis: { eko: 1 } },
  ] },
  { id: 'g4', topic: 'adalet', text: 'Yargı bağımsızlığı konusunda ne yapacaksınız?', answers: [
    { label: 'HSK yapısını değiştirip bağımsızlığı anayasal güvenceye alırız.', axis: { ozg: 1 } },
    { label: 'Terörle mücadele ve güvenlik önce gelir.', axis: { ozg: -1, milli: 1 } },
    { label: 'Yargı paketleriyle süreçleri hızlandırırız.', axis: {} },
  ] },
  { id: 'g5', topic: 'yerel', text: 'Belediyelere daha fazla yetki verilmeli mi?', answers: [
    { label: 'Evet, güçlü yerel yönetimler.', axis: { yerel: 1 } },
    { label: 'Hayır, üniter yapı ve güçlü merkez.', axis: { yerel: -1 } },
    { label: 'Hizmet kalitesine bağlı, kademeli olarak.', axis: {} },
  ] },
  { id: 'g6', topic: 'din', text: 'Din eğitimi ve laiklik tartışmasında yeriniz neresi?', answers: [
    { label: 'Laiklik tartışmaya açık değildir.', axis: { din: -1 } },
    { label: 'İnanç özgürlüğü ve manevi değerler korunmalı.', axis: { din: 1 } },
    { label: 'Herkesin yaşam tarzına saygı; kutuplaşmaya hayır.', axis: { ozg: 1 } },
  ] },
  { id: 'g7', topic: 'ekonomi', text: 'Asgari ücret ne kadar olmalı?', answers: [
    { label: 'Yoksulluk sınırının üzerinde ve vergisiz.', axis: { eko: -1 } },
    { label: 'Verimlilik ve istihdamı bozmadan belirlenmeli.', axis: { eko: 1 } },
    { label: 'Bölgesel asgari ücret tartışılmalı.', axis: { yerel: 1, eko: 1 } },
  ] },
  { id: 'g8', topic: 'ittifak', text: 'Seçimde kimlerle ittifak yaparsınız?', hostile: true, answers: [
    { label: 'İlkelerimize yakın herkesle konuşuruz.', axis: {} },
    { label: 'Kimseyle; tek başımıza iktidar hedefliyoruz.', axis: {}, tone: 'sert' },
    { label: 'Bunu şimdi konuşmak doğru değil.', axis: {}, tone: 'kacamak' },
  ] },
  { id: 'g9', topic: 'deger', text: 'Toplumsal cinsiyet eşitliği politikalarınız var mı?', answers: [
    { label: 'Kadın kotası ve eşit ücret yasası.', axis: { deger: 1 } },
    { label: 'Aile kurumunu güçlendiren politikalar önceliğimiz.', axis: { deger: -1 } },
    { label: 'Fırsat eşitliği; kimlik tartışmalarına girmeyiz.', axis: {} },
  ] },
  { id: 'g10', topic: 'yolsuzluk', text: 'Partinize yöneltilen usulsüzlük eleştirilerine ne diyorsunuz?', hostile: true, answers: [
    { label: 'Tüm hesaplarımızı kamuoyuna açıyoruz.', axis: { ozg: 1 } },
    { label: 'Bunlar karalama kampanyası.', axis: {}, tone: 'sert' },
    { label: 'Yargı süreci var, yorum yapmam.', axis: {}, tone: 'kacamak' },
  ] },
];
