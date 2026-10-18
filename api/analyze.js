// Vercel serverless function: menulis ulang narasi satu panel dengan LLM (9Router).
// Key dibaca dari environment variable, tidak pernah ditulis di kode atau dikirim ke browser.
//   NINEROUTER_API_KEY   (wajib)
//   NINEROUTER_BASE_URL  (opsional, default https://inferencelabs.alxosphere.com/v1)
//   NINEROUTER_MODEL     (opsional, default cx/gpt-6-luna[1m](max))

const DEFAULT_BASE = "https://inferencelabs.alxosphere.com/v1";
const DEFAULT_MODEL = "cx/gpt-6-luna[1m](max)";
const MAX_BODY = 90 * 1024;
const BANNED = [/menyebabkan/i, /penyebab adalah/i, /penyebabnya/i, /\bpasti\b/i, /terbukti bahwa/i];

const SYSTEM = [
  "Kamu menulis narasi untuk dashboard keselamatan tambang (PPE dan bahaya).",
  "Aturan keras:",
  "1. Hanya gunakan angka yang ada di FAKTA. Jangan menghitung ulang, jangan membulatkan lain, jangan menambah angka baru.",
  "2. Jangan menyebut nama pekerja. Gunakan kode zona, divisi, crew, atau kelompok masa kerja saja.",
  "3. Jangan menyatakan sebab. Gunakan kata 'mungkin', 'hipotesis', atau 'perlu diuji' untuk setiap tafsir.",
  "4. Sebutkan bila sampel kecil atau data sintetis berpengaruh pada keyakinan.",
  "5. Keluarkan HANYA JSON dengan kunci dan bentuk yang sama persis dengan DRAF TEMPLATE (string tetap string, daftar tetap daftar, hipotesis tetap berisi h, ya, tidak), ditambah confidence (Rendah | Sedang | Tinggi).",
  "6. Untuk setiap hipotesis sebut bukti yang mendukung dan yang melemahkan, hanya dari FAKTA. Jangan menambah hipotesis di luar yang didukung angka.",
  "7. Sebut keterbatasan: liputan alasan yang tidak merata, ukuran sampel, dan bahwa alasan berasal dari catatan supervisor yang subjektif.",
  "Bahasa: Indonesia, ringkas, lugas, tanpa jargon yang tidak perlu.",
].join("\n");

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return {};
}

// kumpulkan semua angka dari fakta (format titik dan koma) sebagai himpunan yang diizinkan
function allowedNumbers(obj, set = new Set()) {
  if (typeof obj === "number") {
    set.add(Math.abs(Number(obj.toFixed(2))));
    set.add(Math.abs(Math.round(obj)));
  } else if (typeof obj === "string") {
    for (const m of obj.matchAll(/\d+(?:[.,]\d+)?/g)) set.add(Number(m[0].replace(",", ".")));
  } else if (Array.isArray(obj)) obj.forEach((x) => allowedNumbers(x, set));
  else if (obj && typeof obj === "object") Object.values(obj).forEach((x) => allowedNumbers(x, set));
  return set;
}

// angka kecil (1–12) boleh untuk kata seperti 'dua minggu'; tahun dan angka lain harus dari fakta
function checkGuardrail(text, facts) {
  const allowed = allowedNumbers(facts);
  for (let i = 1; i <= 13; i++) allowed.add(i);
  allowed.add(90);
  const bad = [];
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const n = Number(m[0].replace(",", "."));
    const ok = [...allowed].some((a) => Math.abs(a - n) < 0.006);
    if (!ok) bad.push(m[0]);
  }
  const banned = BANNED.filter((re) => re.test(text)).map((re) => re.source);
  return { ok: bad.length === 0 && banned.length === 0, bad, banned };
}

function extractJson(content) {
  const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1));
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan POST." });

  const key = process.env.NINEROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: "NINEROUTER_API_KEY belum diset di Vercel." });

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: "Body bukan JSON yang valid." });
  }
  if (JSON.stringify(body).length > MAX_BODY) return res.status(413).json({ error: "Fakta terlalu besar." });
  const { panel, data, template } = body;
  if (!panel || !data) return res.status(400).json({ error: "Butuh field panel dan data." });

  const base = (process.env.NINEROUTER_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
  const model = process.env.NINEROUTER_MODEL || DEFAULT_MODEL;
  const user = [
    "PANEL: " + panel,
    "FAKTA (JSON, satu-satunya sumber angka):",
    JSON.stringify(data),
    "DRAF TEMPLATE (boleh diperbaiki gaya bahasanya, angka tetap dari FAKTA):",
    JSON.stringify(template || {}),
  ].join("\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  let upstream;
  try {
    upstream = await fetch(base + "/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: "Gagal menghubungi model: " + (err.name === "AbortError" ? "timeout" : err.message) });
  } finally {
    clearTimeout(timer);
  }
  if (!upstream.ok) return res.status(502).json({ error: "Model menolak permintaan (HTTP " + upstream.status + ")." });

  const payload = await upstream.json();
  const content = payload?.choices?.[0]?.message?.content || "";
  let out;
  try {
    out = extractJson(content);
  } catch {
    return res.status(502).json({ error: "Jawaban model bukan JSON." });
  }

  const keys = Object.keys(template || {}).filter((k) => k !== "confidence");
  const want = keys.length ? keys : ["fakta", "tafsir", "tanya", "aksi"];
  const missing = want.filter((k) => out[k] === undefined || out[k] === null);
  if (missing.length) return res.status(502).json({ error: "Jawaban model tidak memuat kunci: " + missing.join(", ") });
  const flat = (v) => (Array.isArray(v) ? v.map(flat).join(" ") : v && typeof v === "object" ? Object.values(v).map(flat).join(" ") : String(v ?? ""));
  const text = want.map((k) => flat(out[k])).join(" ");
  const check = checkGuardrail(text, data);
  if (!check.ok) {
    return res.status(422).json({
      error: "Ditolak guardrail: angka di luar fakta atau klaim sebab.",
      detail: { angka_asing: check.bad, frasa_terlarang: check.banned },
    });
  }
  const result = { confidence: out.confidence || "Rendah", model };
  want.forEach((k) => { result[k] = out[k]; });
  return res.status(200).json(result);
};

module.exports.checkGuardrail = checkGuardrail;
