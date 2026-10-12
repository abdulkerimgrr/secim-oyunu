"""Ham kaynaklardan oyun veri dosyalarını üretir.

Kullanım (geliştirici için):
  pip install pyreadr pandas
  python3 tools/build_data.py <turkeyelections_repo> <turkey-map-react/lib/data/index.js> <anketdelisi_elections_2023.csv>

Kaynaklar data/sources.md dosyasında listelenmiştir.
"""
import json, re, sys, itertools, unicodedata
import pyreadr

TE_REPO, SVG_JS, SEAT_CSV = sys.argv[1:4]
OUT = 'data/generated'

# --- Bölgeler (coğrafi bölge, plaka kodu ile) ---
REGIONS = {
    'Marmara': [10, 11, 16, 17, 22, 34, 39, 41, 54, 59, 77],
    'Ege': [3, 9, 20, 35, 43, 45, 48, 64],
    'Akdeniz': [1, 7, 15, 31, 32, 33, 46, 80],
    'İç Anadolu': [6, 18, 26, 38, 40, 42, 50, 51, 58, 66, 68, 70, 71],
    'Karadeniz': [5, 8, 14, 19, 28, 29, 37, 52, 53, 55, 57, 60, 61, 67, 69, 74, 78, 81],
    'Doğu Anadolu': [4, 12, 13, 23, 24, 25, 30, 36, 44, 49, 62, 65, 75, 76],
    'Güneydoğu Anadolu': [2, 21, 27, 47, 56, 63, 72, 73, 79],
}
REGION_OF = {p: r for r, ps in REGIONS.items() for p in ps}
assert len(REGION_OF) == 81


def norm(s):
    s = s.replace('İ', 'i').replace('I', 'ı').lower()
    s = s.replace('ı', 'i').replace('â', 'a')
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


# --- Harita yolları ---
src = open(SVG_JS, encoding='utf-8').read()
cities = re.findall(r'"id": "([^"]+)",\s*"plateNumber": (\d+),\s*"name": "([^"]+)",\s*"path": "([^"]+)"', src)
assert len(cities) == 81, len(cities)


def compress_path(d):
    # Koordinatları 1 ondalığa yuvarla (dosya boyutunu yarıya indirir)
    d = re.sub(r'-?\d+\.\d+', lambda m: ('%.1f' % float(m.group())).rstrip('0').rstrip('.'), d)
    d = re.sub(r'\s+', ' ', d)
    return d.strip()


provinces = []
minx = miny = 1e9; maxx = maxy = -1e9
for cid, plate, name, d in cities:
    nums = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', d)]
    xs, ys = nums[0::2], nums[1::2]
    minx, maxx = min(minx, *xs), max(maxx, *xs)
    miny, maxy = min(miny, *ys), max(maxy, *ys)
    provinces.append({
        'plate': int(plate), 'id': cid, 'name': name,
        'region': REGION_OF[int(plate)],
        'cx': round(sum(xs) / len(xs), 1), 'cy': round(sum(ys) / len(ys), 1),
        'path': compress_path(d),
    })
provinces.sort(key=lambda p: p['plate'])
by_norm = {norm(p['name']): p for p in provinces}

# --- 2023 milletvekili sonuçları (87 seçim bölgesi) ---
df = pyreadr.read_r(f'{TE_REPO}/data/genel_secim_2023_il.RData')['genel_secim_2023_il']
PARTY_COLS = {
    'AKP': 'AK_Parti', 'CHP': 'CHP', 'MHP': 'MHP', 'IYI': 'IYI_Parti', 'YSP': 'YESIL_SOL_PARTI',
    'YRP': 'YENIDEN_REFAH', 'ZP': 'ZAFER_PARTISI', 'TIP': 'TIP', 'BBP': 'BBP', 'MP': 'MEMLEKET',
}
ALLIANCE_COLS = {  # yalnızca ittifak kutusuna basılan oylar ittifak partilerine oransal dağıtılır
    'CUMHUR_ITTIFAKI': ['AKP', 'MHP', 'YRP', 'BBP'],
    'MILLET_ITTIFAKI': ['CHP', 'IYI'],
    'EMEK_VE_OZGURLUK_ITTIFAKI': ['YSP', 'TIP'],
    'ATA_ITTIFAKI': ['ZP'],
}
known = set(PARTY_COLS.values()) | set(ALLIANCE_COLS)
meta = {'Il', 'Kayitli_Secmen_Sayisi', 'Oy_Kullanan_Secmen_Sayisi', 'Gecerli_Oy_Toplami'}
other_cols = [c for c in df.columns if not c.endswith('_%') and c not in known and c not in meta]

units = []
for _, r in df.iterrows():
    raw = r['Il']
    m = re.match(r'(.+?)-(\d)$', raw)
    base, sub = (m.group(1), int(m.group(2))) if m else (raw, 0)
    prov = by_norm[norm(base)]
    votes = {k: float(r[c]) for k, c in PARTY_COLS.items()}
    for col, members in ALLIANCE_COLS.items():
        tot = sum(votes[p] for p in members)
        if tot > 0:
            for p in members:
                votes[p] += float(r[col]) * votes[p] / tot
    votes['DIGER'] = sum(float(r[c]) for c in other_cols)
    units.append({
        'id': f"{prov['plate']:02d}-{sub}" if sub else f"{prov['plate']:02d}",
        'plate': prov['plate'],
        'name': prov['name'] + (f' {sub}. Bölge' if sub else ''),
        'registered': int(r['Kayitli_Secmen_Sayisi']),
        'turnout': round(float(r['Oy_Kullanan_Secmen_Sayisi']) / float(r['Kayitli_Secmen_Sayisi']), 4),
        'valid': int(r['Gecerli_Oy_Toplami']),
        'votes': {k: int(round(v)) for k, v in votes.items()},
    })
units.sort(key=lambda u: u['id'])
assert len(units) == 87

# --- Sandalye sayıları ---
import csv
prov_seats, prov_party_seats = {}, {}
CSV_MAP = {'akp': 'AKP', 'chp': 'CHP', 'mhp': 'MHP', 'iyi': 'IYI', 'dem': 'YSP', 'yeniden_refah': 'YRP',
           'tip': 'TIP', 'zaf': 'ZP', 'bbp': 'BBP', 'memleket': 'MP'}
for row in csv.DictReader(open(SEAT_CSV, encoding='utf-8')):
    p = by_norm[norm(row['province'])]['plate']
    s = int(row['seats'] or 0)
    prov_seats[p] = prov_seats.get(p, 0) + s
    if s:
        k = CSV_MAP[row['party']]
        prov_party_seats.setdefault(p, {})
        prov_party_seats[p][k] = prov_party_seats[p].get(k, 0) + s
assert sum(prov_seats.values()) == 600

nat = {}
for u in units:
    for k, v in u['votes'].items():
        nat[k] = nat.get(k, 0) + v
tot = sum(nat.values())
eligible = {k for k, v in nat.items() if k != 'DIGER'}
# 2023'te tüm ittifak üyeleri barajı geçmiş sayılır (ittifak toplamı > %7); ittifaksız partiler yok.
# ZP (Ata ittifakı) ittifak toplamı < %7 olduğundan dışarıda kalır.
eligible -= {'ZP', 'MP'}


def dhondt(votes, seats):
    res = {k: 0 for k in votes}
    for _ in range(seats):
        k = max(votes, key=lambda k: votes[k] / (res[k] + 1))
        res[k] += 1
    return res


def alloc(u, seats):
    return dhondt({k: v for k, v in u['votes'].items() if k in eligible}, seats)


# Tek bölgeli illerde ikinci kaynağın oy sayıları gerçek sandalye dağılımını birebir üretir;
# birinci kaynakta bazı illerde sayımlar eksik. Bu illerde oyları ikinci kaynaktan al.
csv_votes = {}
for row in csv.DictReader(open(SEAT_CSV, encoding='utf-8')):
    p = by_norm[norm(row['province'])]['plate']
    k = CSV_MAP.get(row['party'], 'DIGER')
    csv_votes.setdefault(p, {k2: 0 for k2 in list(PARTY_COLS) + ['DIGER']})
    csv_votes[p][k] += int(row['votes'])
for u in units:
    if '-' not in u['id']:
        u['votes'] = csv_votes[u['plate']]
        u['valid'] = sum(u['votes'].values())

for plate in sorted(prov_seats):
    us = [u for u in units if u['plate'] == plate]
    S = prov_seats[plate]
    target = prov_party_seats.get(plate, {})
    if len(us) == 1:
        us[0]['seats'] = S
        got = {k: v for k, v in alloc(us[0], S).items() if v}
        if got != target:
            print('UYARI', us[0]['name'], got, target)
        continue
    # Alt bölgeler: gerçek il toplamını D'Hondt ile yeniden üreten ve seçmen sayısına en yakın bölüşümü ara
    reg = [u['registered'] for u in us]
    best = None
    for split in itertools.product(range(5, S), repeat=len(us)):
        if sum(split) != S:
            continue
        agg = {}
        for u, s in zip(us, split):
            for k, v in alloc(u, s).items():
                if v:
                    agg[k] = agg.get(k, 0) + v
        if agg != target:
            continue
        err = sum(abs(s - S * r / sum(reg)) for s, r in zip(split, reg))
        if best is None or err < best[0]:
            best = (err, split)
    assert best, plate
    for u, s in zip(us, best[1]):
        u['seats'] = s
    print('Alt bölgeler', [(u['name'], u['seats']) for u in us])

# Doğrulama: tüm Türkiye sandalye dağılımı
agg = {}
for u in units:
    for k, v in alloc(u, u['seats']).items():
        agg[k] = agg.get(k, 0) + v
print('Sandalye kontrol:', {k: v for k, v in sorted(agg.items(), key=lambda x: -x[1]) if v})

for p in provinces:
    p['seats'] = prov_seats[p['plate']]

import os
os.makedirs(OUT, exist_ok=True)
hdr = '// OTOMATİK ÜRETİLDİ: tools/build_data.py — elle düzenlemeyin. Kaynak: data/sources.md\n'
with open(f'{OUT}/provinces.js', 'w', encoding='utf-8') as f:
    f.write(hdr)
    f.write('export const MAP_VIEWBOX = [%g, %g, %g, %g];\n' % (
        round(minx - 5), round(miny - 5), round(maxx - minx + 10), round(maxy - miny + 10)))
    f.write('export const PROVINCES = ' + json.dumps(provinces, ensure_ascii=False, separators=(',', ':')) + ';\n')
with open(f'{OUT}/results2023.js', 'w', encoding='utf-8') as f:
    f.write(hdr)
    f.write('// 2023 Milletvekili Genel Seçimi, 87 seçim bölgesi. İttifak kutusu oyları ittifak partilerine oransal dağıtıldı.\n')
    f.write('export const RESULTS_2023 = ' + json.dumps(units, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('Yazıldı.')
