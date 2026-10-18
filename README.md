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
