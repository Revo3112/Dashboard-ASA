(() => {
  const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const COL = { A: "var(--blue)", B: "var(--orange)", C: "var(--aqua)" };
  const DIVNAMA = { A: "Hauling", B: "Crusher", C: "Workshop" };

  const pc = (x, d = 2) => x.toFixed(d).replace(".", ",") + "%";
  const dec = (x, d = 1) => x.toFixed(d).replace(".", ",");
  const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tgl = (iso) => { const d = new Date(iso + "T00:00:00Z"); return d.getUTCDate() + " " + MON[d.getUTCMonth()]; };
  const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const toast = (msg) => { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 4200); };

  fetch("data/facts.json").then((r) => r.json()).then(boot).catch(() => {
    document.getElementById("headline").textContent = "Data gagal dimuat.";
  });

  function boot(D) {
    const R = D.ringkas;
    const zonaSorted = [...D.zona].sort((a, b) => b.g7 - a.g7);
    const top = zonaSorted[0];
    const itemSorted = Object.entries(R.gap_per_item).sort((a, b) => b[1] - a[1]);
    const gapTotal = R.gap;

    // ---------- headline & angka
    const it1 = itemSorted[0][0], it2 = itemSorted[1][0];
    document.getElementById("headline").innerHTML =
      `<em>${esc(it1)}</em> dan <em>${esc(it2.toLowerCase())}</em> memimpin gap PPE. Zona <em>${esc(top.id)}</em> paling tinggi minggu ini.`;
    document.getElementById("nums").innerHTML = [
      [num(R.cek_valid), "cek PPE valid · 90 hari"],
      [pc(R.gap_rate), `gap terkonfirmasi · ${num(R.gap)} kejadian`],
      [dec(R.helm_share, 0) + "%", "gap berupa helm tidak dipakai"],
      [`${R.near_miss} / ${R.insiden}`, "near-miss / insiden"],
    ].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("");

    // ---------- 01 zona
    const tiles = document.getElementById("tiles");
    tiles.innerHTML = zonaSorted.map((z) => {
      const kind = z.g7 >= 2.5 ? "siaga" : z.g7 >= 1.5 ? "pantau" : "normal";
      const lab = kind === "siaga" ? "Siaga" : kind === "pantau" ? "Pantau" : "Normal";
      const w = Math.min(z.g7 / 4 * 100, 100);
      const color = kind === "siaga" ? "var(--coral)" : kind === "pantau" ? "var(--yellow)" : "var(--green)";
      return `<button class="tile ${kind}" data-zona="${z.id}" aria-label="Zona ${z.id}, gap ${pc(z.g7)}">
        <div class="tid"><span>${z.id}</span><span>div ${z.divisi}</span></div>
        <div class="tnm">${esc(z.nama)}</div>
        <div class="tv">${dec(z.g7)}<small>%</small></div>
        <div class="tbar"><i style="width:${w}%;background:${color}"></i></div>
        <div class="tst st-${kind}">${lab} · ${z.kejadian} kejadian</div>
      </button>`;
    }).join("");
    tiles.addEventListener("click", (e) => {
      const b = e.target.closest(".tile"); if (!b) return;
      tiles.querySelectorAll(".tile").forEach((t) => t.classList.toggle("on", t === b));
    });
    const topItemOfTop = Object.entries(top.items).sort((a, b) => b[1] - a[1])[0];
    mount("zona", {
      data: { zona: top.id, nama: top.nama, gap_7h: top.g7, gap_situs: R.gap_rate, zona_siaga: R.zona_siaga, zona_total: D.zona.length,
              item_teratas: topItemOfTop[0], rate_item: topItemOfTop[1] },
      t: {
        fakta: `Zona ${top.id} (${top.nama}) punya gap ${pc(top.g7)} dalam 7 hari terakhir, di atas rata-rata situs ${pc(R.gap_rate)}. ${R.zona_siaga} dari ${D.zona.length} zona berstatus siaga.`,
        tafsir: `Gap ini mengumpul di satu zona, bukan pada satu orang. Item paling sering: ${topItemOfTop[0].toLowerCase()} (${pc(topItemOfTop[1])}). Penyebab (fit, stok, atau kebiasaan) belum terbukti.`,
        tanya: `Apakah peralatan dan kontrol di zona ${top.id} sudah sesuai dengan kondisi bising dan debu di zona ini?`,
        aksi: `Audit kontrol ${topItemOfTop[0].toLowerCase()} di zona ${top.id} minggu ini. Jangan ubah SOP sebelum audit selesai.`,
        confidence: "Sedang",
      },
    });

    // ---------- 02 denyut
    const days = D.harian.tanggal, gap = D.harian.gap;
    const W = 1000, H = 230, bw = W / days.length;
    const gmax = Math.max(...gap);
    const bars = gap.map((g, i) => {
      const h = g / gmax * 150, x = i * bw + bw * .15;
      return `<rect x="${x.toFixed(1)}" y="${(160 - h).toFixed(1)}" width="${(bw * .7).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="var(--blue)" opacity=".78"><title>${tgl(days[i])}: ${g} gap</title></rect>`;
    }).join("");
    const dots = D.kejadian.map((e) => {
      const i = days.indexOf(e.hari);
      const x = (i + .5) * bw, c = e.kejadian === "Insiden" ? "var(--coral)" : "var(--yellow)";
      return `<circle cx="${x.toFixed(1)}" cy="${e.kejadian === "Insiden" ? 196 : 200}" r="${e.kejadian === "Insiden" ? 5 : 3.5}" fill="${c}"><title>${tgl(e.hari)} · zona ${e.zona} · ${e.kejadian}: ${e.bahaya}</title></circle>`;
    }).join("");
    const ticks = days.map((d, i) => (i % 14 === 0 ? `<text x="${(i * bw).toFixed(1)}" y="222">${tgl(d)}</text>` : "")).join("");
    document.getElementById("denyut-chart").innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gap harian 90 hari dengan penanda kejadian">
        <line x1="0" x2="${W}" y1="160" y2="160" stroke="var(--line)"/>${bars}
        <line x1="0" x2="${W}" y1="190" y2="190" stroke="var(--line)" stroke-dasharray="2 4"/>${dots}${ticks}</svg>`;
    const last30 = avg(gap.slice(-30)), prev60 = avg(gap.slice(0, -30));
    const ev14 = D.kejadian.filter((e) => days.indexOf(e.hari) >= days.length - 14).length;
    mount("denyut", {
      data: { jendela_hari: 30, gap_per_hari_30h: +last30.toFixed(2), gap_per_hari_sebelumnya: +prev60.toFixed(2), jendela_14h: 14, kejadian_14h: ev14,
              near_miss: R.near_miss, insiden: R.insiden, hari: days.length },
      t: {
        fakta: `Rata-rata ${dec(last30)} gap per hari dalam 30 hari terakhir, ${last30 <= prev60 ? "turun" : "naik"} dari ${dec(prev60)} pada periode sebelumnya. ${ev14} kejadian dalam 14 hari terakhir.`,
        tafsir: `Penurunan gap harian tidak otomatis berarti risiko turun. Near-miss dan insiden perlu dibaca dalam konteks zona yang sama.`,
        tanya: `Apakah penurunan ini berasal dari perbaikan kontrol, atau dari perubahan jadwal dan jumlah pekerja?`,
        aksi: `Pisahkan jumlah cek per hari dari gap per hari sebelum menyimpulkan tren. Tampilkan keduanya di layar yang sama.`,
        confidence: "Sedang",
      },
    });

    // ---------- 03 helm: heat + ladder
    const hm = D.helm.peta_jam_masa;
    const hmax = Math.max(...hm.map((c) => c.rate));
    const jams = [...new Set(hm.map((c) => c.jam))], masas = [...new Set(hm.map((c) => c.masa))];
    const cell = (j, m) => hm.find((c) => c.jam === j && c.masa === m);
    const heatRows = jams.map((j) => `<tr><th class="r">${j}</th>${masas.map((m) => {
      const c = cell(j, m), a = (c.rate / hmax) * .85 + .05;
      return `<td style="background:color-mix(in srgb, var(--coral) ${Math.round(a * 100)}%, var(--panel-2));color:${a > .55 ? "#0c0f13" : "var(--text)"}">${pc(c.rate)}<small>${c.gap} dari ${num(c.cek)}</small></td>`;
    }).join("")}</tr>`).join("");
    document.getElementById("helm-heat").innerHTML =
      `<h3 style="font-size:13px;font-weight:500;margin:0 0 12px;color:var(--mute);text-transform:uppercase;letter-spacing:.06em">Jam kerja × masa kerja</h3>
       <table class="heat"><thead><tr><th></th>${masas.map((m) => `<th>${m}</th>`).join("")}</tr></thead><tbody>${heatRows}</tbody></table>`;
    const drv = D.helm.driver;
    const ladderGroup = (title, rows, hiTop = true) => {
      const mx = Math.max(...rows.map((r) => r.rate));
      const sorted = [...rows].sort((a, b) => b.rate - a.rate);
      return `<div class="lad-g"><h3>${title}</h3>${sorted.map((r, i) => `
        <div class="lad-row ${hiTop && i === 0 ? "hi" : ""}"><span class="lb">${esc(r.label)}</span>
          <div class="lad-track"><i style="width:${(r.rate / mx * 100).toFixed(1)}%"></i></div>
          <span class="lv">${pc(r.rate)}</span></div>`).join("")}</div>`;
    };
    document.getElementById("helm-ladder").innerHTML =
      ladderGroup("Masa kerja", drv["Masa kerja"]) + ladderGroup("Jam kerja", drv["Jam kerja"]) + ladderGroup("Zona", drv["Zona"]);
    const topCell = [...hm].sort((a, b) => b.rate - a.rate)[0];
    const crewTop = [...drv["Crew"]].sort((a, b) => b.rate - a.rate)[0];
    const zonaHelm = [...drv["Zona"]].sort((a, b) => b.rate - a.rate)[0];
    const rasio = topCell.rate / D.helm.ringkas.rate;
    mount("helm", {
      data: { helm_situs: D.helm.ringkas.rate, jam: topCell.jam, masa: topCell.masa, rate_sel: topCell.rate, gap_sel: topCell.gap,
              cek_sel: topCell.cek, rasio: +rasio.toFixed(1), zona_tertinggi: zonaHelm.label, rate_zona: zonaHelm.rate,
              crew_tertinggi: crewTop.label, rate_crew: crewTop.rate },
      t: {
        fakta: `Kombinasi jam ${topCell.jam} dan masa kerja ${topCell.masa} punya gap helm ${pc(topCell.rate)} (${topCell.gap} gap), sekitar ${dec(rasio)}× rata-rata helm ${pc(D.helm.ringkas.rate)}.`,
        tafsir: `Dua faktor bertemu: jam panas dan pekerja yang belum terbiasa. Helm mungkin dilepas saat istirahat lalu tidak dipasang lagi. Ini hipotesis, belum terbukti.`,
        tanya: `Apakah helm dilepas di area istirahat, dan apakah pekerja baru tahu helm wajib sampai ke area kerja?`,
        aksi: `Uji pengingat helm saat kembali dari istirahat di zona panas selama dua minggu, lalu bandingkan sel ini.`,
        confidence: "Sedang",
      },
    });

    // ---------- 04 tren
    const wk = D.helm.mingguan, site = D.helm.mingguan_situs, n = site.length;
    const labels = Array.from({ length: n }, (_, i) => tgl(days[Math.min(i * 7, days.length - 1)]));
    const ymax = Math.ceil(Math.max(...Object.values(wk).flat(), ...site));
    const TW = 1000, TH = 280, pl = 40, pb = 28, pt = 12;
    const X = (i) => pl + (TW - pl - 12) * i / (n - 1);
    const Y = (v) => pt + (TH - pt - pb) * (1 - v / ymax);
    let grid = "";
    for (let t = 0; t <= ymax; t++) grid += `<line x1="${pl}" x2="${TW - 12}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)"/><text x="${pl - 8}" y="${Y(t) + 4}" text-anchor="end">${t}%</text>`;
    const xl = labels.map((l, i) => `<text x="${X(i)}" y="${TH - 6}" text-anchor="middle">${l}</text>`).join("");
    const line = (vals, color, w, dash = "") => `<polyline points="${vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
    const lines = line(site, "var(--mute)", 1.6, "5 5") + line(wk.A, COL.A, 2) + line(wk.C, COL.C, 2) + line(wk.B, COL.B, 3.4);
    document.getElementById("tren-chart").innerHTML = `<svg viewBox="0 0 ${TW} ${TH}" role="img" aria-label="Gap helm mingguan per divisi">${grid}${lines}${xl}</svg>`;
    document.getElementById("tren-legend").innerHTML = ["A", "B", "C"].map((d) => `<span><i style="background:${COL[d]}"></i>Divisi ${d} · ${DIVNAMA[d]}</span>`).join("") + `<span><i style="background:var(--mute)"></i>Situs</span>`;
    mount("tren", {
      data: { helm_awal_b: D.helm.b_awal, helm_akhir_b: D.helm.b_akhir, helm_situs: D.helm.ringkas.rate, minggu_awal_akhir: "1–7", minggu_akhir_mulai: "8–13", minggu_total: 13, hari: days.length },
      t: {
        fakta: `Helm di Divisi B naik dari rata-rata ${pc(D.helm.b_awal, 1)} (minggu 1–7) ke ${pc(D.helm.b_akhir, 1)} (minggu 8–13). Gap helm situs ${pc(D.helm.ringkas.rate, 1)} selama 90 hari.`,
        tafsir: `Kenaikan kecil, tapi searah dengan rekrutmen kontraktor baru di Divisi B. Hipotesis: orientasi belum memuat pengecekan helm.`,
        tanya: `Apakah orientasi kontraktor baru punya pengecekan APD pada hari pertama?`,
        aksi: `Tambah pengecekan helm untuk dua minggu pertama setiap pekerja baru, lalu pantau empat minggu sebelum mengubah SOP.`,
        confidence: "Sedang",
      },
    });

    // ---------- 05 matrix
    const ITEMS = [...new Set(D.zona.flatMap((z) => Object.keys(z.items)))];
    const ORDER = ["Helm", "Sepatu safety", "Rompi hi-vis", "Kacamata", "Pelindung telinga", "Respirator", "Harness / tali", "Sarung tangan"];
    const cols = ORDER.filter((c) => ITEMS.includes(c));
    const vmax = 8.5;
    const mrows = D.zona.map((z) => `<tr><th class="r">${z.id} · ${esc(z.nama)}</th>${cols.map((c) => {
      if (!(c in z.items)) return `<td class="na">–</td>`;
      const v = z.items[c], a = Math.min(v / vmax, 1) * .9 + .06;
      return `<td style="background:color-mix(in srgb, var(--coral) ${Math.round(a * 100)}%, var(--panel-2));color:${a > .55 ? "#0c0f13" : "var(--text)"}">${pc(v, 1)}</td>`;
    }).join("")}</tr>`).join("");
    document.getElementById("matrix").innerHTML =
      `<table class="matrix"><thead><tr><th class="r">Zona</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${mrows}</tbody></table>`;
    const kb = D.kacamata_b, hc = D.harness_c2;
    mount("ppe", {
      data: { kacamata_b_rate: kb.rate, kacamata_b_share: kb.share, kacamata_gap: R.gap_per_item["Kacamata"], gap_total: gapTotal,
              top3_share: +((itemSorted.slice(0, 3).reduce((s, x) => s + x[1], 0)) / gapTotal * 100).toFixed(0),
              harness_c2_malam: hc.malam, harness_c2_lain: hc.lainnya },
      t: {
        fakta: `Tiga item teratas (${itemSorted.slice(0, 3).map((x) => x[0].toLowerCase()).join(", ")}) menyumbang ${Math.round(itemSorted.slice(0, 3).reduce((s, x) => s + x[1], 0) / gapTotal * 100)}% gap. Kacamata di Divisi B mencapai ${pc(kb.rate, 1)}, dengan ${dec(kb.share, 0)}% dari seluruh gap.`,
        tafsir: `Kacamata dan pelindung telinga naik bersama di zona bising dan berdebu. Ini pola item-zona, bukan pola individu. Harness di tepi pit malam mencapai ${pc(hc.malam, 1)} dibanding ${pc(hc.lainnya, 1)} shift lain.`,
        tanya: `Apakah kacamata di zona debu cocok dengan jenis debu dan lensa yang dipakai?`,
        aksi: `Audit fit dan lensa kacamata di B1 sampai B3. Ubah SOP hanya kalau gap bertahan setelah stok dibenahi.`,
        confidence: "Sedang",
      },
    });

    // ---------- 06 peringatan dini
    const op = D.peringatan_dini.operasional;
    const ew = D.peringatan_dini.ambang;
    const opRow = ew.find((e) => e.T === op) || ew[1];
    document.getElementById("ew-table").innerHTML = `<table>
      <thead><tr><th>Ambang gap 7 hari</th><th>Zona-hari ditandai</th><th>Kejadian | ditandai</th><th>Kejadian | tidak</th><th>Lift</th><th>Tertangkap</th></tr></thead>
      <tbody>${ew.map((e) => `<tr class="${e === opRow ? "op" : ""}"><td>${pc(e.T, 1)}${e === opRow ? " · operasional" : ""}</td><td>${dec(e.tandai, 0)}%</td><td>${dec(e.p_tandai, 0)}%</td><td>${dec(e.p_tidak, 0)}%</td><td><b>${dec(e.lift, 1)}×</b></td><td>${dec(e.recall, 0)}%</td></tr>`).join("")}</tbody></table>`;
    const mx = Math.max(opRow.p_tandai, opRow.p_tidak);
    document.getElementById("ew-read").innerHTML = `
      <div class="big">${dec(opRow.lift, 1)}<small>× lebih sering kejadian dalam 7 hari</small></div>
      <p style="color:var(--mute);font-size:13px;margin:10px 0 0">Pada ambang ${pc(opRow.T, 1)}, zona yang ditandai mengalami kejadian lebih sering.</p>
      <div class="bars">
        <div class="bar-l"><span>Zona ditandai</span><span class="mono">${pc(opRow.p_tandai, 0)}</span></div>
        <div class="bar-t"><i style="width:${opRow.p_tandai / mx * 100}%;background:var(--coral)"></i></div>
        <div class="bar-l"><span>Tidak ditandai</span><span class="mono">${pc(opRow.p_tidak, 0)}</span></div>
        <div class="bar-t"><i style="width:${opRow.p_tidak / mx * 100}%;background:var(--blue)"></i></div>
      </div>
      <p class="honest">Hubungan ini dibentuk dalam data simulasi. Angkanya membuktikan logika dashboard, belum kenyataan di lapangan.</p>`;
    mount("dini", {
      data: { ambang_operasional: opRow.T, zona_ditandai_persen: opRow.tandai, p_ditandai: opRow.p_tandai, p_tidak: opRow.p_tidak, lift: opRow.lift, tertangkap: opRow.recall },
      t: {
        fakta: `Pada ambang ${pc(opRow.T, 1)}, ${dec(opRow.tandai, 0)}% zona-hari ditandai. Zona yang ditandai punya peluang ${dec(opRow.p_tandai, 0)}% mengalami kejadian dalam 7 hari, zona yang tidak ditandai ${dec(opRow.p_tidak, 0)}%.`,
        tafsir: `Sinyal gap 7 hari bergerak bersama kejadian dalam data ini. Tapi data ini dibentuk dengan hubungan tersebut, jadi belum membuktikan hal yang sama di site nyata.`,
        tanya: `Di data nyata, apakah zona dengan gap 7 hari tinggi juga lebih sering punya near-miss?`,
        aksi: `Jalankan sebagai mode bayangan delapan minggu: tampilkan peringatan, tapi jangan jadikan dasar tindakan dulu.`,
        confidence: "Rendah (belum divalidasi)",
      },
    });

    // ---------- 07 kasus
    document.getElementById("cases").innerHTML = D.kasus.map((c, i) => {
      const mxg = Math.max(...c.gap_zona_7h, 1);
      const spark = c.gap_zona_7h.map((g, k) => `<div class="${k === c.gap_zona_7h.length - 1 ? "last" : ""}" style="height:${Math.max(g / mxg * 100, 6)}%" title="${g} gap"></div>`).join("");
      const itemsTxt = c.item_7h.map((x) => `${esc(x.item)} (${x.gap})`).join(", ");
      const tot = c.gap_zona_7h.reduce((s, x) => s + x, 0);
      const inc = c.kejadian === "Insiden";
      return `<article class="case" data-kasus="${i}">
        <span class="tag ${inc ? "inc" : "nm"}">${inc ? "Insiden · " + esc(c.tingkat) : "Near-miss"}</span>
        <h3>${esc(c.bahaya)}</h3>
        <div class="meta">${tgl(c.hari)} · shift ${c.shift} · zona ${c.zona}</div>
        <div class="meta">PPE tidak dipakai (catatan investigasi): <b style="color:var(--text);font-weight:500">${esc(c.ppe_tidak_dipakai)}</b></div>
        <div class="spark" aria-label="Gap zona 7 hari sebelumnya">${spark}</div>
        <div class="sl"><span>${tgl(shiftDay(c.hari, -7))}</span><span>${tgl(shiftDay(c.hari, -1))}</span></div>
        <div class="items">Gap 7 hari sebelumnya: <b>${tot}</b> · ${itemsTxt}</div>
        <div class="ai-slot"></div>
      </article>`;
    }).join("");
    D.kasus.forEach((c, i) => {
      const tot = c.gap_zona_7h.reduce((s, x) => s + x, 0);
      const top = c.item_7h[0] || { item: "–", gap: 0 };
      const sinyal = top.gap;
      const hasRel = c.ppe_tidak_dipakai === "Helm" && c.bahaya.toLowerCase().includes("benda jatuh");
      const harnessIrrel = c.ppe_tidak_dipakai === "Harness / tali" && c.bahaya.toLowerCase().includes("benda jatuh");
      const tafsir = harnessIrrel
        ? "Catatan PPE saat kejadian tidak relevan dengan bahaya ini. Catatan investigasi perlu dikoreksi sebelum dipakai sebagai label."
        : hasRel
          ? "PPE yang tidak dipakai relevan dengan bahaya, tapi sebab belum bisa ditetapkan dari data ini."
          : "Sinyal sebelum kejadian mungkin terkait kondisi zona, tapi belum terbukti. Catatan PPE perlu divalidasi investigator.";
      const slot = document.querySelector(`[data-kasus="${i}"] .ai-slot`);
      mountInto(slot, "kasus", {
        data: { zona: c.zona, kejadian: c.kejadian, tingkat: c.tingkat, shift: c.shift, gap_7h_total: tot, item_teratas: top.item, gap_item_teratas: sinyal, ppe_tidak_dipakai: c.ppe_tidak_dipakai },
        t: {
          fakta: `${c.kejadian}, tingkat ${c.tingkat.toLowerCase()}, zona ${c.zona}, shift ${c.shift}. Gap zona 7 hari sebelumnya ${tot}, dengan ${top.item.toLowerCase()} (${sinyal}) terbanyak.`,
          tafsir,
          tanya: `Apakah kontrol utama untuk bahaya "${c.bahaya.toLowerCase()}" berfungsi pada minggu kejadian?`,
          aksi: `Validasi catatan investigasi, lalu uji kontrol utama di zona ${c.zona} sebelum mengubah SOP.`,
          confidence: "Sedang",
        },
      });
    });

    // ---------- 08 SOP
    const verdictCls = (v) => v.startsWith("Perlu") ? "v-rev" : v.startsWith("Pantau") ? "v-pantau" : "v-belum";
    const sopHead = `<div class="sop-row head"><span>Topik</span><span>Gap vs pembanding</span><span>Rasio</span><span>Persisten</span><span>Crew</span><span>Tren 13 mg</span><span>Keputusan</span></div>`;
    const sopRows = D.sop.map((s) => {
      const max = Math.max(...s.tren, .01), w = 110, h = 28;
      const pts = s.tren.map((v, i) => `${(i * (w - 4) / (s.tren.length - 1) + 2).toFixed(1)},${(h - 3 - v / max * (h - 6)).toFixed(1)}`).join(" ");
      return `<div class="sop-row"><span class="tn">${esc(s.topik)}</span>
        <span class="mono">${pc(s.rate, 1)} <span style="color:var(--mute)">vs ${pc(s.base, 1)}</span></span>
        <span class="mono"><b>${dec(s.rasio)}×</b></span><span class="mono">${s.persisten} / 4</span><span class="mono">${s.crew}</span>
        <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${s.keputusan.startsWith("Perlu") ? "var(--coral)" : "var(--mute)"}" stroke-width="1.8"/></svg>
        <span class="verdict ${verdictCls(s.keputusan)}">${esc(s.keputusan)}</span></div>`;
    }).join("");
    document.getElementById("sop-list").innerHTML = sopHead + sopRows;
    const perlu = D.sop.filter((s) => s.keputusan.startsWith("Perlu")).length;
    const pantau = D.sop.filter((s) => s.keputusan.startsWith("Pantau")).length;
    const helmSop = D.sop[0];
    mount("sop", {
      data: { topik_total: D.sop.length, perlu_revisi: perlu, pantau: pantau, topik_helm: helmSop.topik, rasio_helm: helmSop.rasio, persisten_helm: helmSop.persisten, minggu_persisten_total: 4, crew_helm: helmSop.crew },
      t: {
        fakta: `${perlu} dari ${D.sop.length} topik memenuhi syarat revisi. ${pantau} topik masuk pantau. ${helmSop.topik} punya rasio ${dec(helmSop.rasio)}×, persisten ${helmSop.persisten} dari 4 minggu.`,
        tafsir: `Kacamata dan harness memenuhi syarat karena selisihnya besar dan bertahan. Helm jam 11–13 lebih mungkin soal kebiasaan istirahat dan belum cukup bukti.`,
        tanya: `Sebelum revisi, apakah SOP sudah mengatur kacamata sesuai zona debu, dan apakah titik anchor malam tersedia?`,
        aksi: `Untuk topik yang memenuhi syarat: audit kontrol (stok, fit, anchor) lalu revisi SOP bila gap bertahan. Untuk helm: pantau dua minggu.`,
        confidence: "Sedang",
      },
    });
  }

  function shiftDay(iso, k) {
    const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + k);
    return d.toISOString().slice(0, 10);
  }

  // ---------- blok AI: teks dari aturan dulu, lalu bisa ditulis ulang oleh model
  function mount(panel, spec) {
    mountInto(document.querySelector(`.ai-slot[data-panel="${panel}"]`), panel, spec);
  }
  function mountInto(slot, panel, spec) {
    if (!slot) return;
    slot.dataset.spec = JSON.stringify(spec);
    slot.dataset.panel = panel;
    paint(slot, spec.t, "aturan");
  }
  function paint(slot, t, src) {
    slot.innerHTML = `<div class="ai">
      <div class="ai-h"><span>✦ AI · ${src === "live" ? "ditulis model" : "dari aturan"}</span>
        <span class="src">confidence ${esc(t.confidence)}</span></div>
      <dl>
        <dt>Fakta</dt><dd>${esc(t.fakta)}</dd>
        <dt>Tafsir</dt><dd>${esc(t.tafsir)} <span style="color:var(--mute);font-size:12px">(hipotesis)</span></dd>
        <dt>Tanya</dt><dd>${esc(t.tanya)}</dd>
        <dt class="aksi">Aksi</dt><dd>${esc(t.aksi)}</dd>
      </dl>
      <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--mute)">${src === "live" ? "Angka diperiksa terhadap fakta panel ini." : "Teks ini dibuat dari aturan, tanpa model."}</span>
        <button type="button">${src === "live" ? "Tulis ulang lagi" : "Tulis ulang dengan AI"}</button>
      </div></div>`;
    const btn = slot.querySelector("button");
    btn.addEventListener("click", () => regenerate(slot, btn));
  }
  async function regenerate(slot, btn) {
    const spec = JSON.parse(slot.dataset.spec);
    const panel = slot.dataset.panel;
    btn.disabled = true; btn.textContent = "Menulis…";
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panel, data: spec.data, template: spec.t }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal");
      paint(slot, body, "live");
      toast("Narasi ditulis model dan lolos pemeriksaan angka.");
    } catch (err) {
      btn.disabled = false; btn.textContent = "Tulis ulang dengan AI";
      toast("Belum bisa: " + err.message);
    }
  }
})();
