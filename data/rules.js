// Seçim ve parti mevzuatı parametreleri.
// Her kural için "dogrulama" alanı: "kaynakli" = resmi/haber kaynağıyla doğrulandı,
// "tahmini" = bilgi tabanından, resmi metinle karşılaştırılmalı. Ayrıntı: data/sources.md

export const RULES = {
  parliament: {
    seats: 600,                 // Anayasa m.75 — kaynakli
    constituencies: 87,         // 2023 seçimi, 81 il, 4 ilde alt bölge — kaynakli (YSK verisi)
    method: 'dhondt',           // 2839 s. Kanun m.34 — kaynakli
    threshold: 0.07,            // 7393 s. Kanun (2022) ile %10 → %7 — kaynakli
    allianceThreshold: true,    // İttifak toplamı barajı geçerse tüm üyeler geçmiş sayılır — kaynakli
    allianceSeatsByParty: true, // 2022'den beri sandalye hesabı her parti için ayrı — kaynakli
    termYears: 5,               // Anayasa m.77 (2017 değişikliği) — kaynakli
  },
  partyEligibility: {
    // 2839 s. Kanun m.33 / 2820 s. SPK m.36: illerin en az yarısında teşkilat ve seçimden
    // en az 6 ay önce büyük kongre. — tahmini (resmi metinle doğrulanmalı)
    minProvinceOrgs: 41,
    congressMonthsBefore: 6,
  },
  treasuryAid: {
    // SPK Ek Madde 1: genel bütçe gelirlerinin beşbinde ikisi, barajı geçen partilere oy oranıyla;
    // %3'ü geçen partiler de oransal pay alır (2014 değişikliği). Seçim yılında 3 kat.
    // 2023 normal yıl toplamı ≈ 1,505 milyar TL. — kaynakli (haber kaynakları), tutarlar tahmini
    minVoteShare: 0.03,
    annualTotal2023: 1_505_000_000,
    electionYearMultiplier: 3,
  },
  campaignDays: 56,             // Oyun tasarımı: son 8 hafta haftalık tur (yasal kampanya süresi değil); öncesi aylık tur
};
