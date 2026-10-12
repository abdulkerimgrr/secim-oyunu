// Başlangıç senaryosu: Haziran 2023 (28. Dönem TBMM açılışı sonrası).
// Ekonomik göstergeler TÜİK/TCMB'nin Haziran 2023 civarı değerlerine YAKLAŞIK olarak ayarlanmıştır — tahmini.
export const SCENARIO_2023 = {
  id: '2023',
  label: '2023 — Seçim sonrası',
  startDate: '2023-06-05',
  nextGeneralElection: '2028-05-14',   // 5 yıllık dönem; tarih tahmini (Mayıs 2028'in ikinci pazarı)
  localElection: '2024-03-31',         // 2024 mahalli idareler seçimi — kaynakli
  economy: {
    inflation: 38.2,     // yıllık TÜFE, Haziran 2023 — tahmini
    unemployment: 9.6,   // — tahmini
    usdTry: 25.8,        // Haziran 2023 sonu civarı — tahmini
    growth: 3.5,         // — tahmini
  },
  government: ['AKP', 'MHP'],   // Cumhur İttifakı meclis çoğunluğu; MHP kabinede yer almaz (destek)
  president: 'Recep Tayyip Erdoğan',
};

export const START_YEARS = [
  { id: '2002', label: '2002', available: false },
  { id: '2007', label: '2007', available: false },
  { id: '2011', label: '2011', available: false },
  { id: '2015', label: '2015', available: false },
  { id: '2018', label: '2018', available: false },
  { id: '2023', label: '2023', available: true },
  { id: 'bugun', label: 'Bugün', available: true },
];
