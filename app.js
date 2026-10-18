(() => {
  "use strict";
  const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const BUCKETS = ["07–10", "11–13", "14–17", "18–22", "23–06"], SHIFTS = ["Pagi", "Siang", "Malam"];
  const $ = (id) => document.getElementById(id);
  const dec = (x, d = 1) => Number(x).toFixed(d).replace(".", ",");
  const pc = (x, d = 1) => dec(x, d) + "%";
  const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tgl = (iso) => { const d = new Date(iso + "T00:00:00Z"); return d.getUTCDate() + " " + MON[d.getUTCMonth()]; };
  const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const toast = (m) => { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 4200); };

  // ---------- tema, dialog, tab (delegasi karena toolbar dirender ulang)
  try { const t = localStorage.getItem("ppe-theme5"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  document.addEventListener("click", (e) => {
    if (e.target.closest("#theme")) { const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = n; try { localStorage.setItem("ppe-theme5", n); } catch (x) {} }
    else if (e.target.closest("#asumsi-open")) $("asumsi").showModal();
  });

  // ---------- tooltip
  const tip = $("tip");
  function tipShow(html, ev) {
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight; let x = ev.clientX + 14, y = ev.clientY - h - 10;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14; if (y < 8) y = ev.clientY + 16;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const tipHide = () => { tip.hidden = true; };
  const tipOn = (el, html) => { el.addEventListener("mousemove", (e) => tipShow(html, e)); el.addEventListener("mouseleave", tipHide); };
  function hoverSvg(svg, W, n, xOf, html) {
    const line = svg.querySelector(".cross");
    svg.addEventListener("mousemove", (ev) => {
      const r = svg.getBoundingClientRect(), vx = (ev.clientX - r.left) / r.width * W; let best = 0, bd = 1e9;
      for (let i = 0; i < n; i++) { const d = Math.abs(xOf(i) - vx); if (d < bd) { bd = d; best = i; } }
      if (line) { line.setAttribute("x1", xOf(best)); line.setAttribute("x2", xOf(best)); line.style.opacity = 1; }
      tipShow(html(best), ev);
    });
    svg.addEventListener("mouseleave", () => { tipHide(); if (line) line.style.opacity = 0; });
  }

  // ---------- statistik di balik layar (hanya untuk memutuskan kata "naik", "turun", "stabil")
  const erfc = (x) => { const z = Math.abs(x), t = 1 / (1 + 0.5 * z), r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; };
  const pDiff = (k1, x1, k2, x2) => { if (!x1 || !x2 || k1 + k2 === 0) return 1; const p = (k1 + k2) / (x1 + x2), se = Math.sqrt(p * (1 / x1 + 1 / x2)); return se ? erfc(Math.abs(k1 / x1 - k2 / x2) / se / Math.SQRT2) : 1; };
  function trend4(weeks, scale) {
    const a = weeks.slice(-4), b = weeks.slice(-8, -4), k1 = sum(a.map((w) => w.n_event)), x1 = sum(a.map((w) => w.orang)), k2 = sum(b.map((w) => w.n_event)), x2 = sum(b.map((w) => w.orang));
    const r1 = scale * k1 / x1, r2 = scale * k2 / x2, pct = r2 ? 100 * (r1 - r2) / r2 : 0, p = pDiff(k1, x1, k2, x2);
    const real = p < 0.01 && Math.abs(pct) >= 10;
    return { recent: r1, prev: r2, pct, p, word: real ? (pct > 0 ? "naik" : "turun") : "stabil", k1, k2 };
  }
  const badge = (t, bad = true) => `<span class="tr ${t.word === "stabil" ? "st" : (t.word === "naik") === bad ? "up" : "dn"}">${t.word === "naik" ? "▲ naik" : t.word === "turun" ? "▼ turun" : "● stabil"}${t.word === "stabil" ? "" : " " + dec(Math.abs(t.pct), 0) + "%"}</span>`;
  const trTxt = (t) => (t.word === "stabil" ? "stabil dalam 4 minggu terakhir" : `${t.word} ${dec(Math.abs(t.pct), 0)}% dalam 4 minggu terakhir`);
  const withMa = (weeks, scale) => weeks.map((w, i) => { const a = Math.max(0, i - 3), s = weeks.slice(a, i + 1); return { ...w, rate: w.rate ?? scale * w.n_event / w.orang, ma4: scale * sum(s.map((q) => q.n_event)) / sum(s.map((q) => q.orang)) }; });

  // ---------- komponen
  const spark = (vals, color = "var(--blue)", w = 96, h = 24) => { const mx = Math.max(...vals, 1e-9), mn = Math.min(...vals, 0), pts = vals.map((v, i) => `${(i * (w - 4) / (vals.length - 1) + 2).toFixed(1)},${(h - 3 - (v - mn) / (mx - mn || 1) * (h - 6)).toFixed(1)}`).join(" "); return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/></svg>`; };
  const pn = (id, title, sub, body, span, cls = "") => `<section class="pn s${span} ${cls}" id="p-${id}"><header><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ""}</header><div class="pb">${body}</div></section>`;
  function bars(rows, o = {}) {
    const mx = Math.max(...rows.map((r) => r.value), 1e-9);
    return `<div class="rows">${rows.map((r) => `<div class="rw ${r.hi ? "hi" : ""}" ${r.tip ? `data-tip="${esc(r.tip)}"` : ""}><span class="lb" title="${esc(r.label)}">${esc(r.label)}</span><span class="tk"><i style="width:${r.value / mx * 100}%"></i></span><span class="v">${r.text ?? dec(r.value, o.d ?? 1)}</span><span class="x">${r.note || ""}</span></div>`).join("")}</div>`;
  }
  const wireTips = (root) => root.querySelectorAll("[data-tip]").forEach((el) => tipOn(el, el.dataset.tip));
  let seq = 0;
  function lineChart(weeks, scale, o = {}) {
    const id = "lc" + ++seq, W = 640, H = o.h || 200, pl = 38, pr = 12, pt = 8, pb = 24, nw = weeks.length, data = withMa(weeks, scale);
    const mxv = Math.max(...data.map((w) => w.rate)) * 1.12 || 1, step = nice(mxv, 4), ymax = Math.ceil(mxv / step) * step;
    const X = (i) => pl + (W - pl - pr) * i / (nw - 1), Y = (v) => pt + (H - pt - pb) * (1 - v / ymax);
    let g = ""; for (let v = 0; v <= ymax + 1e-9; v += step) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line-2)"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${dec(v, step < 1 ? 1 : 0)}${scale === 100 ? "%" : ""}</text>`;
    const ln = (vs, c, w, d) => `<polyline points="${vs.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" ${d ? `stroke-dasharray="${d}"` : ""}/>`;
    const area = `<polygon points="${X(0)},${Y(0)} ${data.map((w, i) => `${X(i)},${Y(w.rate)}`).join(" ")} ${X(nw - 1)},${Y(0)}" fill="var(--blue)" opacity=".08"/>`;
    const xl = data.map((w, i) => (i % 2 === 0 ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${tgl(w.mulai)}</text>` : "")).join("");
    wiring.push(() => { const el = $(id); el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "Per minggu")}">${g}${area}${ln(data.map((w) => w.ma4), "var(--mute)", 1.5, "5 4")}${ln(data.map((w) => w.rate), "var(--blue)", 2.3)}${data.map((w, i) => `<circle cx="${X(i)}" cy="${Y(w.rate)}" r="2.8" fill="var(--panel)" stroke="var(--blue)" stroke-width="1.5"/>`).join("")}<line class="cross" y1="${pt}" y2="${H - pb}" stroke="var(--mute)" stroke-dasharray="3 3" style="opacity:0"/>${xl}</svg>`;
      hoverSvg(el.firstChild, W, nw, X, (i) => `<b>Minggu ke-${i + 1} · ${tgl(data[i].mulai)}</b><br>${scale === 100 ? pc(data[i].rate, 2) : dec(data[i].rate, 0) + " per 10 ribu orang"}<br><span class="m">${data[i].n_event} dari ${num(data[i].orang)}</span>`); });
    return `<div class="chart" id="${id}"></div><div class="legend"><span><i class="ln" style="background:var(--blue)"></i>Per minggu</span><span><i class="ln" style="background:var(--mute)"></i>Rata-rata 4 minggu</span></div>`;
  }
  function nice(mx, n) { const raw = mx / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  const wiring = [];
  const stat = (b, s) => `<div><b>${b}</b><span>${s}</span></div>`;
  const findLi = (f) => `<li><b>${esc(f.judul)}</b><span>${esc(f.detail)}</span>${f.dasar ? `<em>${esc(f.dasar)}</em>` : ""}</li>`;


  // ---------- grafik tambahan
  const CAT = ["var(--blue)", "var(--orange)", "var(--aqua)"];
  function colChart(rows, o = {}) {
    const W = o.w || 360, H = o.h || 160, pl = 30, pr = 6, pt = 16, pb = 22, n = rows.length, mx = Math.max(...rows.map((r) => r.value), 1e-9) * 1.15, step = nice(mx, 3), ymax = o.max || Math.ceil(mx / step) * step;
    const bw = (W - pl - pr) / n, Y = (v) => pt + (H - pt - pb) * (1 - v / ymax); let g = "";
    for (let v = 0; v <= ymax + 1e-9; v += step) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line-2)"/><text x="${pl - 5}" y="${Y(v) + 4}" text-anchor="end">${dec(v, step < 1 ? 1 : 0)}${o.suffix || ""}</text>`;
    const bars = rows.map((r, i) => { const x = pl + i * bw + bw * .2, w = bw * .6, y = Y(r.value);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(H - pb - y, 0).toFixed(1)}" rx="3" fill="${r.hi ? "var(--coral)" : (o.color || "var(--blue)")}" ${r.tip ? `data-tip="${esc(r.tip)}"` : ""}/><text x="${(x + w / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" style="fill:var(--text);font-size:10.5px">${r.text ?? dec(r.value, o.d ?? 1)}</text><text x="${(x + w / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(r.label)}</text>`; }).join("");
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "Grafik kolom")}">${g}${bars}</svg></div>`;
  }
  function donut(slices, center, sub) {
    const tot = sum(slices.map((s) => s.value)) || 1, R = 54, r0 = 36; let a0 = -Math.PI / 2;
    const arcs = slices.map((s) => { const a1 = a0 + 2 * Math.PI * s.value / tot, big = a1 - a0 > Math.PI ? 1 : 0, p = (a, r) => `${(70 + r * Math.cos(a)).toFixed(2)},${(70 + r * Math.sin(a)).toFixed(2)}`;
      const d = s.value >= tot ? `M70,${70 - R} A${R},${R} 0 1 1 69.99,${70 - R} L69.99,${70 - r0} A${r0},${r0} 0 1 0 70,${70 - r0} Z` : `M${p(a0, R)} A${R},${R} 0 ${big} 1 ${p(a1, R)} L${p(a1, r0)} A${r0},${r0} 0 ${big} 0 ${p(a0, r0)} Z`; a0 = a1;
      return `<path d="${d}" fill="${s.color}" stroke="var(--panel)" stroke-width="1.5" data-tip="${esc(s.label + ": " + s.value + " (" + dec(100 * s.value / tot, 0) + "%)")}"/>`; }).join("");
    return `<div class="donut"><svg viewBox="0 0 140 140" width="150" height="150" role="img">${arcs}<text x="70" y="68" text-anchor="middle" style="font:500 20px var(--mono);fill:var(--text)">${center}</text><text x="70" y="84" text-anchor="middle" style="font-size:9.5px">${sub || ""}</text></svg>
      <ul class="dlg">${slices.map((s) => `<li><i style="background:${s.color}"></i><span>${esc(s.label)}</span><b>${s.value}</b></li>`).join("")}</ul></div>`;
  }
  function stackRows(rows, segs, o = {}) {
    const mx = Math.max(...rows.map((r) => sum(r.vals)), 1e-9);
    return `<div class="rows">${rows.map((r) => `<div class="stk wide"><span class="lb" title="${esc(r.title || r.label)}">${esc(r.label)}</span><span class="bar2" style="width:${sum(r.vals) / mx * 100}%">${r.vals.map((v, i) => `<i style="width:${v / (sum(r.vals) || 1) * 100}%;background:${segs[i].color}" data-tip="${esc(r.label + " · " + segs[i].label + ": " + num(v))}"></i>`).join("")}</span><span class="v">${num(sum(r.vals))}</span></div>`).join("")}</div><div class="legend">${segs.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join("")}</div>`;
  }
  function miniLine(vals, flag, label, sub) {
    const w = 150, h = 54, mx = Math.max(...vals, 1e-9) * 1.1, pts = vals.map((v, i) => `${(i * (w - 6) / (vals.length - 1) + 3).toFixed(1)},${(h - 4 - v / mx * (h - 10)).toFixed(1)}`).join(" "), c = flag ? "var(--coral)" : "var(--blue)";
    return `<div class="ml ${flag ? "fl" : ""}"><div class="mh"><b>${esc(label)}</b><span>${sub || ""}</span></div><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none"><polygon points="3,${h - 4} ${pts} ${w - 3},${h - 4}" fill="${c}" opacity=".1"/><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></div>`;
  }

  // ---------- kotak AI: aturan dulu, bisa ditulis ulang model
  const NOTES = new Map(); let nseq = 0;
  function aiBox(panel, headline, temuan, aksi, o = {}) {
    const id = "n" + ++nseq, t = { ringkas: headline, temuan, aksi, confidence: "Sedang" };
    NOTES.set(id, { panel, data: { ringkas: headline, temuan, aksi }, t });
    return `<aside class="ais ${o.cls || ""}" data-id="${id}">${aiInner(t, "aturan", o)}</aside>`;
  }
  function aiInner(t, src, o = {}) {
    const ak = (Array.isArray(t.aksi) ? t.aksi : [t.aksi]).filter(Boolean), tm = (t.temuan || []).filter(Boolean);
    const pair = tm.length === ak.length;
    const L = (a, c) => `<ul class="${c}">${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    const body = pair ? `<ol class="pairs">${tm.map((x, i) => `<li><p class="v">${esc(x)}</p><p class="s">${esc(ak[i])}</p></li>`).join("")}</ol>` : `<h5 class="ah">Pelanggaran</h5>${L(tm, "")}<h5 class="ah sol">Usulan solusi</h5>${L(ak, "")}`;
    return `${body}<div class="nh"><span>${src === "live" ? "Ditulis model" : "Dari aturan"}</span><button type="button" class="lk rw-ai">${src === "live" ? "Tulis ulang lagi" : "Tulis ulang dengan AI"}</button></div>`;
  }
  document.addEventListener("click", (e) => {
    const sg = e.target.closest(".seg button");
    if (sg) { const c = sg.closest(".card"); c.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("on", b === sg)); c.querySelectorAll(".pane").forEach((p) => (p.hidden = p.dataset.pane !== sg.dataset.pane)); }
    if (e.target.closest("#openall")) { const g = document.querySelectorAll("details.grp"), open = [...g].some((d) => !d.open); g.forEach((d) => (d.open = open)); e.target.closest("#openall").textContent = open ? "Tutup semua" : "Buka semua"; }
  });
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".rw-ai"); if (!btn) return;
    const el = btn.closest(".ais"), spec = NOTES.get(el.dataset.id); btn.disabled = true; btn.textContent = "Menulis…";
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ panel: spec.panel, data: spec.data, template: { ringkas: spec.t.ringkas, temuan: spec.t.temuan, aksi: spec.t.aksi } }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error || "Gagal");
      el.innerHTML = aiInner({ ...body, aksi: Array.isArray(body.aksi) ? body.aksi : [body.aksi] }, "live"); toast("Ringkasan ditulis model dan lolos pemeriksaan angka.");
    } catch (err) { btn.disabled = false; btn.textContent = "Tulis ulang dengan AI"; toast("Belum bisa: " + err.message); }
  });

  if (window.CCTV) boot(window.CCTV);
  else fetch("data/cctv.json").then((r) => r.json()).then(boot).catch((e) => { $("dash").textContent = "Data gagal dimuat."; console.error(e); });

  // =====================================================================
  function boot(C) {
    let cat = "ringkasan";
    const ZN = Object.fromEntries(C.meta.zona.map((z) => [z.id, z])), ZONES = C.meta.zona.map((z) => z.id);
    const J = C.jatuh, B = C.bahaya, T = C.tinggi, RG = C.ringkas, ITEMS = C.ppe.urut, IT = C.ppe.item;
    const find = (arr, l) => (arr || []).find((x) => x.label === l);
    const hi = (l) => l.rasio && l.rasio >= 1.5 && l.p < 0.005;
    const tPPE = trend4(RG.mingguan, 100), tJ = trend4(J.mingguan, 1e4), tB = trend4(B.mingguan, 1e4), tT = trend4(T.mingguan, 1e4);
    const zName = (z) => `${z} ${ZN[z].nama}`;

    // ---------- temuan (dipakai di Ringkasan dan di kotak AI tiap tab)
    const F = {};
    // kamera bermasalah
    { const bad = [...J.kamera].sort((a, b) => b.palsu - a.palsu)[0], w = J.kamera_bermasalah[bad.kamera];
      if (bad.palsu >= 10 && bad.palsu / bad.alarm >= 0.5) {
        const pre = w ? sum(w.slice(0, 5).map((x) => x.palsu)) / 5 : null, post = w ? sum(w.slice(5).map((x) => x.palsu)) / (w.length - 5) : null;
        F.kamera = { tab: "jatuh", judul: `Kamera ${bad.kamera} banyak memberi alarm jatuh palsu`, detail: `${bad.palsu} dari ${bad.alarm} alarm palsu${pre !== null && post > pre * 2 ? `; naik dari ${dec(pre, 1)} menjadi ${dec(post, 1)} per minggu sejak minggu ke-6` : ""}.`, dasar: `Kamera lain: ${pc(100 * sum(J.kamera.filter((c) => c.kamera !== bad.kamera).map((c) => c.benar)) / sum(J.kamera.filter((c) => c.kamera !== bad.kamera).map((c) => c.alarm)), 0)} alarm benar.`, aksi: `Periksa sudut, lensa, dan pencahayaan kamera ${bad.kamera}.` }; } }
    // zona yang makin sering dimasuki
    { const z = Object.entries(B.zona_tren).map(([id, v]) => ({ id, ...v })).filter((v) => v.cp.p_adj < 0.05 && v.paruh2 > v.paruh1).sort((a, b) => b.paruh2 - a.paruh2)[0];
      if (z) F.surge = { tab: "bahaya", judul: `Orang makin sering masuk zona berbahaya di ${z.id} (${ZN[z.id].zona_bahaya})`, detail: `${dec(z.paruh1, 0)} menjadi ${dec(z.paruh2, 0)} masuk per 10 ribu orang sejak minggu ke-${z.cp.minggu + 1}; zona lain stabil.`, usul: `Pasang rambu atau penghalang di ${ZN[z.id].zona_bahaya.toLowerCase()}, dan periksa jalur kerja yang membuat orang melewatinya.` }; }
    // harness
    { const H = T.harness, c = [...H.faktor.zona.map((x) => ({ g: "zona", ...x })), ...H.faktor.shift.map((x) => ({ g: "shift", ...x }))].filter((x) => x.rasio >= 2 && x.p < 0.005).sort((a, b) => b.excess_share - a.excess_share);
      const cz = H.grid.slice().sort((a, b) => b.excess - a.excess)[0];
      if (c[0]) { const where = c[0].g === "zona" ? "zona " + c[0].label : "shift " + lc(c[0].label);
        F.harness = { tab: "tinggi", judul: `Pekerja di ketinggian sering tanpa harness, terutama ${where}`, detail: `${pc(c[0].rate, 0)} episode tanpa harness, sekitar ${dec(c[0].rasio, 0)}× lebih sering dari yang lain${cz && cz.n_event >= 5 ? `; terparah ${cz.zona} shift ${lc(cz.shift)} (${cz.n_event} dari ${cz.orang} episode)` : ""}.`, usul: `Pastikan titik tambat tersedia dan tambah pengawas saat pekerjaan di ketinggian pada ${where}; cek harness sebelum mulai naik.` }; } }
    // kacamata di area B
    { const a = find(IT["Kacamata"].faktor.area, "Area B"); if (a && a.rasio >= 2 && a.p < 0.005) F.kacamata = { tab: "ppe", judul: `Kacamata tidak dipakai di Area B`, detail: `${pc(a.rate, 1)} cek gagal di Area B (B1–B3), ${dec(a.rasio, 0)}× area lain; ${num(a.n_event)} pelanggaran.`, usul: `Cek kacamata di pintu masuk Area B dan sediakan cadangan di titik kerja; kunjungi B1–B3 untuk melihat kenyamanan dan kondisi lensanya.` }; }
    // helm: titik rawan
    { const h = RG.titik_rawan.find((x) => x.item === "Helm"); if (h) F.helm = { tab: "ppe", judul: `Helm tidak dipakai di ${h.zona} pada jam ${h.jam}`, detail: `${pc(h.rate, 1)} cek gagal, ${dec(h.kali, 1)}× rata-rata helm (${pc(h.item_rate, 1)}); ${h.n_event} pelanggaran.`, usul: `Pasang pengingat helm dan pengawas saat pekerja kembali bekerja pada jam ${h.jam} di ${h.zona}.` }; }
    // jatuh per zona
    { const zr = J.faktor.zona.slice().sort((a, b) => b.n_event - a.n_event).slice(0, 2); if (zr[0] && zr[0].rasio >= 2) F.jatuh = { tab: "jatuh", judul: `Jatuh terbanyak di zona ${zr.map((z) => z.label).join(" dan ")}`, detail: `${zr.map((z) => `${z.label} ${z.n_event}`).join(" dan ")} dari ${J.benar} jatuh terkonfirmasi; ${dec(zr[0].rasio, 0)}× lebih sering dari zona lain di area yang sama.`, usul: `Perketat pengawasan dan kontrol kerja di ketinggian di ${zr.map((z) => z.label).join(" dan ")}.` }; }
    // respons malam
    { const m = J.respons.per_shift.Malam, p = J.respons.per_shift.Pagi; if (m.median >= p.median * 1.5 && m.lewat_5 >= 20) F.respons = { tab: "jatuh", judul: `Alarm jatuh malam ditanggapi lebih lambat`, detail: `Median ${dec(m.median, 1)} menit (pagi ${dec(p.median, 1)} menit); ${pc(m.lewat_5, 0)} alarm malam lewat 5 menit.`, usul: `Tinjau jumlah dan jadwal petugas yang menanggapi alarm pada shift malam.` }; }
    // kaitan gap PPE -> jatuh
    { const h = J.hubungan_ppe; if (h.rasio >= 1.5 && h.p < 0.05) F.kaitan = { tab: "ppe", judul: `Gap PPE yang naik cenderung diikuti lebih banyak jatuh`, detail: `Pekan setelah gap PPE tinggi, jatuh ${dec(h.rasio, 1)}× lebih banyak di zona yang sama (${h.event_atas + h.event_lain} jatuh, baru terlihat di data ini).`, usul: `Pantau gap PPE mingguan sebagai peringatan awal: bila naik di suatu zona, tambah pengawasan di zona itu pekan berikutnya.` }; }
    const FLIST = ["harness", "kacamata", "helm", "surge", "jatuh", "respons", "kaitan"].map((k) => F[k]).filter(Boolean);

    // ---------- satu halaman dashboard
    function viewSatu() {
      const Hn = T.harness, N = J.respons.per_shift;
      const topN = [...ITEMS].sort((a, b) => IT[b].n_event - IT[a].n_event).slice(0, 3).map((i) => lc(i));
      const headline = `Pelanggaran PPE terbanyak: ${topN.join(", ").replace(/, ([^,]*)$/, " dan $1")}. ${F.harness ? F.harness.judul + ". " : ""}${F.surge ? F.surge.judul + "." : ""}`.trim();
      const top = FLIST.slice(0, 3), rest = FLIST.slice(3);
      const ai = aiBox("satu-halaman", headline, top.map((f) => `${f.judul}: ${f.detail}`), top.map((f) => f.usul), { title: "Ditulis ulang" });
      const more = rest.length ? `<details class="rest"><summary>Temuan lain (${rest.length})</summary><ol>${rest.map((f) => `<li><b>${esc(f.judul)}</b><span>${esc(f.detail)}</span><em>${esc(f.usul)}</em></li>`).join("")}</ol></details>` : "";
      const kpi = (title, big, sub, t) => `<section class="kp"><div class="kh"><h3>${title}</h3>${t ? badge(t, true) : ""}</div><div class="bignum">${big}</div><div class="bsub">${sub}</div></section>`;
      const kpis = `<div class="kpis">${[
        kpi("PPE gagal", pc(RG.total.rate, 2), `${num(RG.total.n_event)} pelanggaran · 90 hari`, tPPE),
        kpi("Masuk zona berbahaya", num(B.n), `${B.dwell.lama} lama (5 menit atau lebih)`, tB),
        kpi("Jatuh terkonfirmasi", J.benar, `${pc(J.presisi, 0)} dari ${J.alarm} alarm benar`, tJ),
        kpi("Tanpa harness", pc(Hn.rate, 1), `${Hn.tidak_ada} dari ${Hn.dapat_dinilai} episode di ketinggian`, null)].join("")}</div>`;
      // --- tren: satu grafik, tiga pilihan
      const PANES = [["PPE gagal", RG.mingguan, 100, "Persen cek PPE yang gagal, per minggu"], ["Zona berbahaya", B.mingguan, 1e4, "Orang masuk zona berbahaya per 10 ribu orang terlihat"], ["Jatuh", J.mingguan, 1e4, "Jatuh terkonfirmasi per 10 ribu orang terlihat"]];
      const trendBody = `<div class="seg" role="tablist">${PANES.map((p, i) => `<button type="button" data-pane="${i}" class="${i ? "" : "on"}">${p[0]}</button>`).join("")}</div>${PANES.map((p, i) => `<div class="pane" data-pane="${i}" ${i ? "hidden" : ""}><p class="cap">${p[3]}</p>${lineChart(p[1], p[2], { label: p[0], h: 290 })}</div>`).join("")}`;
      // --- PPE per item
      const rows = ITEMS.map((it) => ({ it, pk: IT[it] })).sort((a, b) => b.pk.n_event - a.pk.n_event);
      const itemBars = bars(rows.map((r) => ({ label: r.it, value: r.pk.n_event, text: num(r.pk.n_event), note: pc(r.pk.rate, 1), tip: `${num(r.pk.n_event)} pelanggaran dari ${num(r.pk.orang)} cek` }))).replace(/<div class="rows">/, `<div class="rows wide">`) + `<p class="fn">Jumlah pelanggaran 90 hari · kanan: persen cek gagal.</p>`;
      const topItems = rows.slice(0, 3).map((r) => r.it);
      const zStack = ZONES.map((z) => { const v = topItems.map((it) => (find(IT[it].faktor.zona, z) || { n_event: 0 }).n_event), tot = RG.zona.find((x) => x.id === z).ppe_gap; return { label: z, title: ZN[z].nama, vals: [...v, Math.max(tot - sum(v), 0)] }; }).sort((a, b) => sum(b.vals) - sum(a.vals));
      const segs = [...topItems.map((it, i) => ({ label: it, color: CAT[i] })), { label: "Lainnya", color: "var(--dim)" }];
      const avg = RG.total.rate;
      const jamCols = colChart(RG.jam.map((r) => ({ label: r.label, value: r.rate, text: dec(r.rate, 1), hi: r.rate >= avg * 1.3, tip: `${r.n_event} pelanggaran dari ${num(r.orang)} cek` })), { suffix: "%", w: 420, h: 180, label: "Cek PPE gagal menurut jam" });
      const ORDER = ["Helm", "Sepatu safety", "Rompi hi-vis", "Kacamata", "Pelindung telinga", "Respirator", "Harness / tali", "Sarung tangan"], AB = { "Helm": "Helm", "Sepatu safety": "Sepatu", "Rompi hi-vis": "Rompi", "Kacamata": "Kacamata", "Pelindung telinga": "Telinga", "Respirator": "Respir.", "Harness / tali": "Harness", "Sarung tangan": "Sarung" };
      const cell = (z, it) => { const r = find(IT[it].faktor.zona, z); return r ? r.rate : null; };
      const mx = Math.max(...ZONES.flatMap((z) => ORDER.map((it) => cell(z, it) ?? 0)));
      const heatH = `<table class="heat"><thead><tr><th></th>${ORDER.map((it) => `<th title="${esc(it)}">${AB[it]}</th>`).join("")}</tr></thead><tbody>${ZONES.map((z) => `<tr><th class="r" title="${esc(ZN[z].nama)}">${z}</th>${ORDER.map((it) => { const v = cell(z, it); if (v === null) return `<td class="na">·</td>`; const a = Math.min(v / mx, 1) * .9 + .06; return `<td data-tip="${esc(z + " · " + it + ": " + pc(v, 2))}" style="background:color-mix(in srgb, var(--coral) ${Math.round(a * 100)}%, var(--panel-2));color:${a > .55 ? "var(--hi-ink)" : "var(--text)"}">${dec(v, 1)}</td>`; }).join("")}</tr>`).join("")}</tbody></table><p class="fn">Persen cek gagal; titik = item tidak dinilai di zona itu.</p>`;
      // --- jatuh
      const cams = [...J.kamera].sort((a, b) => b.alarm - a.alarm).slice(0, 6);
      const respCol = colChart(SHIFTS.map((sx) => ({ label: sx, value: N[sx].median, text: dec(N[sx].median, 1), hi: sx === "Malam" && N.Malam.lewat_5 >= 20, tip: `${N[sx].n} alarm; ${pc(N[sx].lewat_5, 0)} lewat 5 menit` })), { suffix: " mnt", w: 420, h: 150, label: "Median waktu tanggapan" });
      const jatuhH = `<div class="two">${donut([{ label: "Alarm benar", value: J.benar, color: "var(--green)" }, { label: "Alarm palsu", value: J.alarm - J.benar, color: "var(--coral)" }], J.alarm, "alarm")}<div>${stackRows(cams.map((c) => ({ label: c.kamera, vals: [c.benar, c.palsu], title: `${c.kamera}: ${c.benar} benar, ${c.palsu} palsu` })), [{ label: "Benar", color: "var(--green)" }, { label: "Palsu", color: "var(--coral)" }])}</div></div>`;
      const jzona = colChart(J.faktor.zona.slice().sort((a, b) => b.rate - a.rate).map((z) => ({ label: z.label, value: z.rate, text: dec(z.rate, 0), hi: hi(z), tip: `${z.n_event} jatuh dari ${num(z.orang)} orang terlihat` })), { w: 420, h: 200, label: "Jatuh per zona" });
      // --- zona berbahaya
      const zt = Object.entries(B.zona_tren).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.paruh2 - a.paruh2);
      const multi = `<div class="mlg">${zt.map((z) => miniLine(z.mingguan, z.cp.p_adj < 0.05 && z.paruh2 > z.paruh1, `${z.id} · ${ZN[z.id].zona_bahaya}`, `${dec(z.paruh1, 0)} → ${dec(z.paruh2, 0)}`)).join("")}</div><p class="fn">Masuk per 10 ribu orang, per minggu. Merah = naik nyata.</p>`;
      // --- harness
      const SG = [{ label: "Ada", color: "var(--green)" }, { label: "Tidak ada", color: "var(--coral)" }, { label: "Tidak terbaca", color: "var(--dim)" }];
      const stZ = stackRows(Hn.status_zona.map((r) => ({ label: r.label, vals: [r.ada, r["tidak ada"], r["tidak terbaca"]], title: ZN[r.label].nama })), SG);
      const stSh = stackRows(Hn.status_shift.map((r) => ({ label: r.label.slice(0, 5), vals: [r.ada, r["tidak ada"], r["tidak terbaca"]] })), SG).replace(/<div class="legend">[\s\S]*$/, "");
      const harnessD = donut([{ label: "Harness ada", value: Hn.status.ada, color: "var(--green)" }, { label: "Tidak ada", value: Hn.status["tidak ada"], color: "var(--coral)" }, { label: "Tidak terbaca", value: Hn.status["tidak terbaca"], color: "var(--dim)" }], T.n, "episode");
      // --- tabel zona
      const rowsZ = ZONES.map((z) => { const r = RG.zona.find((x) => x.id === z), j = find(J.faktor.zona, z), b = find(B.faktor.zona, z), h = find(Hn.faktor.zona, z); return { z, ppe: r.ppe_7, ppeb: r.ppe_7_sebelum, jatuh: j ? j.n_event : 0, bahaya: b ? b.rate : 0, hz: h ? h.rate : null }; });
      const top2 = (key) => new Set([...rowsZ].filter((r) => r[key] != null).sort((a, b) => b[key] - a[key]).slice(0, 2).map((r) => r.z));
      const tp = top2("ppe"), tj = top2("jatuh"), tb = top2("bahaya"), th = top2("hz");
      rowsZ.forEach((r) => (r.skor = [tp, tj, tb, th].filter((x) => x.has(r.z)).length)); rowsZ.sort((a, b) => b.skor - a.skor || b.ppe - a.ppe);
      const zTbl = `<table class="zt"><thead><tr><th>Zona</th><th class="n">PPE gagal<br><small>7 hari</small></th><th class="n">Jatuh<br><small>90 hari</small></th><th class="n">Zona bahaya<br><small>per 10 rb</small></th><th class="n">Tanpa harness</th></tr></thead><tbody>${rowsZ.map((r) => `<tr><td><b>${r.z}</b> <span class="zn">${esc(ZN[r.z].nama)}</span></td><td class="n ${tp.has(r.z) ? "hot" : ""}">${pc(r.ppe, 1)}<span class="ar ${r.ppe > r.ppeb * 1.1 ? "up" : r.ppe < r.ppeb * 0.9 ? "dn" : ""}">${r.ppe > r.ppeb * 1.1 ? "▲" : r.ppe < r.ppeb * 0.9 ? "▼" : ""}</span></td><td class="n ${tj.has(r.z) ? "hot" : ""}">${r.jatuh}</td><td class="n ${tb.has(r.z) ? "hot" : ""}">${dec(r.bahaya, 0)}</td><td class="n ${th.has(r.z) ? "hot" : ""}">${r.hz == null ? "–" : pc(r.hz, 1)}</td></tr>`).join("")}</tbody></table><p class="fn">Merah = dua tertinggi di kolom. Panah = dibanding 7 hari sebelumnya.</p>`;
      const sec = (t, s, b) => `<div class="sec"><h4>${t}</h4>${s ? `<p class="cap">${s}</p>` : ""}${b}</div>`;
      const grp = (t, s, body) => `<details class="grp"><summary><b>${t}</b><span>${s}</span></summary><div class="dgrid">${body}</div></details>`;
      const detail = [
        grp("PPE lebih dalam", "Menurut jam, per zona, dan zona × item", sec("Menurut jam", "Persen cek gagal; merah = 1,3× rata-rata atau lebih", jamCols) + sec("Per zona", "Jumlah pelanggaran per jenis item", stackRows(zStack, segs)) + sec("Zona × item", "", heatH)),
        grp("Deteksi jatuh", "Alarm benar atau palsu, tanggapan, per zona", sec("Alarm per kamera", "", jatuhH) + sec("Waktu tanggapan", "Median menit menurut shift", respCol) + sec("Jatuh per zona", "Per 10 ribu orang terlihat", jzona)),
        grp("Zona berbahaya", "Tiap zona dari minggu ke minggu", sec("Masuk per zona", "", multi)),
        grp("Kerja di ketinggian", "Harness per zona dan shift", sec("Status harness", "", harnessD) + sec("Per zona", "", stZ) + sec("Per shift", "", stSh))].join("");
      return { headline, ai, more, kpis, trendBody, itemBars, zTbl, detail };
    }

    // =====================================================  RAKIT
    function render() {
      wiring.length = 0; NOTES.clear(); tipHide();
      const V = viewSatu();
      $("dash").innerHTML = `<aside class="rail"><div class="brand"><span class="logo" aria-hidden="true"></span><b>PPE Forensik</b></div>
        <nav><a href="#top" class="on">Ringkasan</a><a href="#p-ai">Pelanggaran dan solusi</a><a href="#p-zona">Zona</a><a href="#detail">Detail</a></nav>
        <div class="rail-f"><span class="pill syn">Data sintetis</span><small>Analitik CCTV tambang</small></div></aside>
      <div class="main" id="top">
        <header class="ph"><div><h1>Ringkasan keselamatan</h1><p>21 Jul – 18 Okt 2026 · 8 zona · 16 kamera</p></div>
          <div class="bar-r"><button class="btn-ghost" id="asumsi-open" type="button">Dari mana angka ini</button><button class="icon-btn" id="theme" type="button" aria-label="Ganti tema terang/gelap">Tema</button></div></header>
        <p class="lead">${esc(V.headline)}</p>
        ${V.kpis}
        <div class="row r83">
          <section class="card"><header><h3>Tren mingguan</h3></header>${V.trendBody}</section>
          <section class="card" id="p-ai"><header><h3>Pelanggaran dan solusi</h3></header>${V.ai}${V.more}</section>
        </div>
        <div class="row r75">
          <section class="card" id="p-zona"><header><h3>Zona yang perlu perhatian</h3><p>Gabungan empat sumber kamera</p></header>${V.zTbl}</section>
          <section class="card"><header><h3>PPE per item</h3><p>Mana yang paling sering tidak dipakai</p></header>${V.itemBars}</section>
        </div>
        <section class="card detail" id="detail"><header><h3>Detail</h3><button class="lk" id="openall" type="button">Buka semua</button></header>${V.detail}</section>
        <footer class="foot">Data simulasi, bukan kondisi lapangan. Kamera tidak mengetahui identitas pekerja atau alasan, sehingga dashboard tidak menyimpulkan sebab.</footer>
      </div>`;
      wiring.forEach((fn) => fn()); wireTips($("dash"));
    }
    render();
  }
})();
