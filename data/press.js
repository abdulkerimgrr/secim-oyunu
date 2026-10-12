// Basın açıklaması tutumları ve medya tepkileri — TÜMÜ KURGUSAL (gazete, yorumcu ve vatandaş adları uydurmadır).
// Gerçek partilere ve hükümete doğrudan alıntı atfedilmez; tepkiler özet olarak verilir.

export const PRESS_STANCES = {
  ekonomi: [
    { id: 'elestiri', label: 'Hükümetin ekonomi politikasını sert eleştir', quote: 'Mutfaktaki yangını görmeyen bir yönetimle karşı karşıyayız.', tone: 'sert', critical: true, audience: { kararsiz: 1, laik_kentli: 0.6, sol: 0.6 } },
    { id: 'cozum', label: 'Somut bir çözüm paketi açıkla', quote: 'Üç adımda enflasyonu düşürecek planımızı bugün açıklıyoruz.', tone: 'olumlu', audience: { kararsiz: 0.8, muhafazakar: 0.5, milliyetci: 0.4 } },
    { id: 'uzlasma', label: 'Tüm partilere ekonomi uzlaşısı çağrısı yap', quote: 'Ekonomi hepimizin; gelin bir masa etrafında buluşalım.', tone: 'uzlasma', audience: { kararsiz: 0.6, muhafazakar: 0.4 } },
  ],
  guvenlik: [
    { id: 'kararli', label: 'Terörle kararlı mücadele vurgusu', quote: 'Milletimizin huzuru pazarlık konusu değildir.', tone: 'sert', axis: { milli: 1 }, audience: { milliyetci: 1, muhafazakar: 0.6 } },
    { id: 'baris', label: 'Barış ve diyalog çağrısı', quote: 'Kalıcı huzur diyalog ve adaletle gelir.', tone: 'uzlasma', axis: { milli: -1 }, audience: { kurt: 1, sol: 0.7 } },
    { id: 'sinir', label: 'Sınır güvenliği ve düzensiz göç', quote: 'Sınırlarımızı korumak ilk görevimizdir.', tone: 'olumlu', axis: { milli: 1 }, audience: { milliyetci: 0.9, kararsiz: 0.6, laik_kentli: 0.3 } },
  ],
  kimlik: [
    { id: 'aile', label: 'Aile ve manevi değerler', quote: 'Güçlü aile, güçlü toplum demektir.', tone: 'olumlu', axis: { din: 1, deger: -1 }, audience: { dindar: 1, muhafazakar: 0.8 } },
    { id: 'laiklik', label: 'Laiklik ve yaşam tarzı özgürlüğü', quote: 'Kimsenin yaşam tarzına karışılmayacak bir Türkiye.', tone: 'olumlu', axis: { din: -1, ozg: 1 }, audience: { laik_kentli: 1, sol: 0.7 } },
    { id: 'kutuplasma', label: 'Kutuplaşmaya son çağrısı', quote: 'Bu ülkenin hiçbir rengi ötekisi değildir.', tone: 'uzlasma', audience: { kararsiz: 1, muhafazakar: 0.3, laik_kentli: 0.3 } },
  ],
  adalet: [
    { id: 'yargi', label: 'Yargı bağımsızlığı reformu', quote: 'Adalet herkese lazım; bağımsız yargı için reform şart.', tone: 'olumlu', axis: { ozg: 1 }, audience: { laik_kentli: 0.9, sol: 0.8, kurt: 0.6 } },
    { id: 'ceza', label: 'Suçla mücadele ve sert cezalar', quote: 'Suçluya taviz yok, vatandaşa güvenlik.', tone: 'sert', axis: { ozg: -1 }, audience: { muhafazakar: 0.9, milliyetci: 0.8 } },
    { id: 'basin', label: 'Basın özgürlüğü çağrısı', quote: 'Gazetecilik suç değildir.', tone: 'sert', critical: true, axis: { ozg: 1 }, audience: { sol: 1, laik_kentli: 0.8 } },
  ],
  hizmet: [
    { id: 'deprem', label: 'Deprem bölgesi için kalıcı konut', quote: 'Konteynerde geçen her gün hepimizin ayıbıdır.', tone: 'olumlu', audience: { kararsiz: 0.6, muhafazakar: 0.5, kurt: 0.4, laik_kentli: 0.4 } },
    { id: 'yerel', label: 'Belediyelere daha çok yetki', quote: 'Hizmet yerinde, karar yerelde.', tone: 'olumlu', axis: { yerel: 1 }, audience: { kurt: 0.8, laik_kentli: 0.6 } },
    { id: 'altyapi', label: 'Ulaşım ve altyapı projeleri', quote: 'Her ile hızlı tren, her köye sağlam yol.', tone: 'olumlu', audience: { muhafazakar: 0.8, kararsiz: 0.6 } },
  ],
};

export const PAPERS = [
  { id: 'ufuk', name: 'Yeni Ufuk', line: 'iktidar', font: 'serif', color: '#B71C1C', motto: 'Türkiye’nin gazetesi' },
  { id: 'meydan', name: 'MEYDAN', line: 'muhalif', font: 'sans', color: '#0D47A1', motto: 'Gerçeğin peşinde' },
  { id: 'gunortasi', name: 'Gün Ortası', line: 'tarafsiz', font: 'serif', color: '#263238', motto: 'Bağımsız günlük gazete' },
  { id: 'ekspres', name: 'Anadolu Ekspres', line: 'milli', font: 'sans', color: '#1B5E20', motto: 'Anadolu’nun sesi' },
];

export const HEADLINES = {
  pos: ['{SHORT} gündemi belirledi', '{NAME}’dan dikkat çeken çıkış', 'Ankara bu açıklamayı konuşuyor', '{SHORT} sahaya güçlü bir mesaj verdi'],
  neg: ['{SHORT} yine hedef şaşırttı', 'Söylem bol, çözüm yok', '{NAME} açıklamasına sert eleştiri', 'Seçim yaklaşınca hatırladılar'],
  neu: ['{SHORT} {TOPIC} konusunda açıklama yaptı', '{NAME} basın toplantısı düzenledi', '{SHORT} yeni bir çağrı yaptı'],
};
export const SUBHEADS = {
  pos: ['Açıklama sosyal medyada geniş yankı buldu.', 'Uzmanlar öneriyi ciddiye alınması gereken bir adım olarak değerlendirdi.'],
  neg: ['Eleştirmenler açıklamanın içinin boş olduğunu savundu.', 'Açıklamadaki çelişkiler dikkat çekti.'],
  neu: ['Açıklamanın etkisi önümüzdeki günlerde netleşecek.', 'Basın toplantısına çok sayıda gazeteci katıldı.'],
};

export const CITIZENS = [
  { name: 'Hatice T.', who: 'emekli öğretmen, Konya', cluster: 'muhafazakar' },
  { name: 'Emre K.', who: 'üniversite öğrencisi, İzmir', cluster: 'kararsiz' },
  { name: 'Serdar Y.', who: 'esnaf, Kayseri', cluster: 'milliyetci' },
  { name: 'Zelal A.', who: 'hemşire, Diyarbakır', cluster: 'kurt' },
  { name: 'Melis D.', who: 'yazılımcı, İstanbul', cluster: 'laik_kentli' },
  { name: 'Yusuf Ö.', who: 'imam hatip mezunu, Erzurum', cluster: 'dindar' },
  { name: 'Can B.', who: 'sendika üyesi, Kocaeli', cluster: 'sol' },
  { name: 'Ayten S.', who: 'ev hanımı, Samsun', cluster: 'muhafazakar' },
  { name: 'Burak E.', who: 'kurye, Ankara', cluster: 'kararsiz' },
  { name: 'Gülay P.', who: 'avukat, Eskişehir', cluster: 'laik_kentli' },
];
export const CITIZEN_LINES = {
  pos: ['Sonunda biri bunu söyledi 👏', 'Hayat pahalılığını konuşan tek kişi.', 'İlk defa ikna oldum, takipteyim.', 'Bu sözlerin arkasında durursa oyum belli.', 'Tam da bunu bekliyorduk.'],
  neg: ['Seçim yaklaşınca hatırladılar.', 'Önce kendi partinize bakın.', 'Laf çok, icraat yok.', 'Bunu daha önce de duymuştuk.', 'Hiç inandırıcı değil.'],
  neu: ['Sözler güzel, icraat görelim.', 'Detayları merak ediyorum.', 'Bakalım ne kadar tutarlı olacak.'],
};
export const PUNDITS = ['Prof. Nihat Erol (siyaset bilimci)', 'Aslı Gürkan (gazeteci)', 'Tarık Sönmez (kamuoyu araştırmacısı)'];
export const PUNDIT_LINES = {
  pos: ['Doğru zamanda doğru mesaj. Kararsız seçmende karşılığı olacaktır.', 'Bu açıklama kampanyanın kırılma anı olabilir.'],
  neg: ['Mesaj tabanın dışına taşmıyor; yeni seçmen kazandırmaz.', 'Tutarlılık sorunu var; rakipler bunu kullanacaktır.'],
  neu: ['Etkisini görmek için birkaç hafta beklemek lazım.', 'Fena bir açıklama değil ama gündemi değiştirecek güçte de değil.'],
};
