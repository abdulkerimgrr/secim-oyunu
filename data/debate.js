// Liderler tartışması — KURGUSAL program. Gerçek liderlere alıntı atfedilmez; rakip cevapları özetlenir.
export const DEBATE_MODERATOR = 'Defne Aral';
export const DEBATE_QUESTIONS = [
  { id: 'd1', text: 'Seçilirseniz ilk 100 günde ekonomide ne yapacaksınız?', answers: [
    { label: 'Asgari ücret ve emekli maaşlarını enflasyonun üzerinde artıracağım.', axis: { eko: -1 }, tone: 'halkci' },
    { label: 'Bağımsız merkez bankası ve sıkı mali disiplinle enflasyonu düşüreceğim.', axis: { eko: 1 }, tone: 'teknik' },
    { label: 'Rakiplerimin bu ekonomiyi nasıl batırdığını herkes biliyor.', tone: 'saldiri' },
  ], summary: { sol: 'sosyal yardımlar ve ücret artışlarını öne çıkardı', sag: 'yatırım ortamı ve istikrar vurgusu yaptı', merkez: 'üretim ve istihdam odaklı bir plan anlattı' } },
  { id: 'd2', text: 'Göç ve sığınmacı politikanız nedir?', answers: [
    { label: 'Takvime bağlı, insani ve güvenli geri dönüş planı.', axis: { milli: 1 }, tone: 'teknik' },
    { label: 'Uluslararası hukuka uygun bir uyum ve kayıt politikası.', axis: { milli: -1, ozg: 1 }, tone: 'teknik' },
    { label: 'Bu sorunu yaratanlar şimdi çözüm vaat ediyor!', tone: 'saldiri' },
  ], summary: { sol: 'insani yaklaşım ve uluslararası işbirliğini savundu', sag: 'sınır güvenliği ve geri dönüş takvimini öne çıkardı', merkez: 'kademeli ve kontrollü bir politika önerdi' } },
  { id: 'd3', text: 'Yargı bağımsızlığı ve hukukun üstünlüğü için ne vaat ediyorsunuz?', answers: [
    { label: 'Anayasal reformla bağımsız yargıyı güvenceye alacağım.', axis: { ozg: 1 }, tone: 'teknik' },
    { label: 'Önce güvenlik; terörle ve suçla mücadele taviz vermeden sürecek.', axis: { ozg: -1 }, tone: 'teknik' },
    { label: 'Adalet herkese lazım; bir gün size de lazım olacak.', tone: 'halkci' },
  ], summary: { sol: 'yargı reformu ve temel haklar vurgusu yaptı', sag: 'güvenlik ve kamu düzeni önceliğini savundu', merkez: 'yargıda hız ve verimlilik önerdi' } },
  { id: 'd4', text: 'Seçmenlere son sözünüz nedir? (1 dakika)', answers: [
    { label: 'Bu ülke hepimizin; birlikte kazanacağız.', tone: 'halkci' },
    { label: 'Planımız hazır, kadromuz hazır. Karar sizin.', tone: 'teknik' },
    { label: 'Ya değişim ya da bu karanlık devam edecek!', tone: 'saldiri' },
  ], summary: { sol: 'eşitlik ve adalet vurgusuyla kapanış yaptı', sag: 'istikrar ve güçlü Türkiye mesajı verdi', merkez: 'birlik ve uzlaşma çağrısıyla bitirdi' } },
];
