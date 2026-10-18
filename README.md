# Pengawasan PPE & Bahaya Tambang

Dashboard statis + satu fungsi serverless (`api/analyze.js`) yang menulis ulang narasi AI lewat 9Router.
Semua data adalah **sintetis** (90 hari, seed tetap). Hubungan sinyal–kejadian dibentuk dalam simulasi.

## Struktur
- `index.html`, `styles.css`, `app.js`: dashboard (tanpa framework, tanpa build).
- `data/facts.json`: fakta terstruktur hasil ekspor (`export_facts.py` di folder kerja).
- `api/analyze.js`: POST `/api/analyze` → model → pemeriksaan angka + frasa terlarang → JSON.
- `vercel.json`: batas waktu fungsi 30 detik.

## Deploy ke Vercel
1. Import repo ini di vercel.com (New Project), atau jalankan `npx vercel` lalu `npx vercel --prod`.
2. Set environment variable di Vercel (Production dan Preview):
   - `NINEROUTER_API_KEY` (wajib)
   - `NINEROUTER_BASE_URL` (opsional, default `https://inferencelabs.alxosphere.com/v1`)
   - `NINEROUTER_MODEL` (opsional, default `cx/gpt-6-luna[1m](max)`)
3. Redeploy setelah env diset.

Key tidak pernah ditulis di kode dan tidak dikirim ke browser. Setelah deploy, pertimbangkan merotasi key
karena key pernah ditampilkan di chat.

## Guardrail
Jawaban model ditolak (HTTP 422) bila:
- ada angka yang tidak ada di fakta panel (angka 1–12 diizinkan untuk kata seperti "dua minggu"),
- ada frasa klaim sebab: "menyebabkan", "penyebab adalah", "pasti", "terbukti bahwa".

Uji lokal logika ini: `node -e "require('./api/analyze.js').checkGuardrail('...', {})"`.

## Batas
- Narasi awal dibuat dari aturan (tanpa model). Tombol "Tulis ulang dengan AI" memanggil model.
- Peringatan dini belum tervalidasi di lapangan.
- Tidak ada autentikasi di halaman: jangan deploy data nyata tanpa menambahkan kontrol akses.

## Struktur (v5, ringkas untuk supervisor dan manajemen)

- Satu halaman dashboard: enam angka utama, tiga grafik tren, lalu PPE, deteksi jatuh, zona berbahaya, dan kerja di ketinggian dalam satu layar gulir. Tanpa tab.
- Bahasa sederhana: tidak ada CI, p, atau titik ubah di layar. Uji statistik hanya dipakai di balik layar untuk menentukan kata “naik”, “turun”, atau “stabil”.

## Data (berbasis CCTV)

- `data/cctv.json`: satu-satunya data. Empat aliran keluaran CCTV: model PPE, deteksi jatuh, zona berbahaya (geofence),
  dan kerja di ketinggian. Semua laju dinormalisasi per 10.000 orang terlihat kamera.
- Tidak ada atribut yang tidak bisa dilihat kamera: masa kerja, crew, alasan, aturan lokasi. Dashboard tidak menyimpulkan sebab.
- Data sintetis (seed 2026). Beberapa pola sengaja ditanam agar mekanisme terlihat: kamera B2-K2 menghasilkan alarm palsu
  deteksi jatuh sejak minggu ke-6, lonjakan masuk zona berbahaya B3 sejak minggu ke-8, harness tidak terlihat lebih sering
  di C2 dan shift malam, dan gap PPE tinggi mendahului jatuh. Gunakan hanya untuk mendemonstrasikan logika dashboard.
- `api/analyze.js` menerima skema bebas: model harus mengembalikan kunci yang sama dengan template panel.
  Guardrail: semua angka harus ada di fakta panel (atau 1–13 dan 90), dan frasa klaim sebab ditolak.
