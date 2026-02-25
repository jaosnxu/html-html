const deck = window.__DECK__ || { meta: {}, slides: [] };

const state = {
  idx: 0,
  lang: "both", // both | cn | ru
};

const els = {
  stage: document.getElementById("stage"),
  thumbs: document.getElementById("thumbs"),
  title: document.getElementById("deckTitle"),
  brandName: document.getElementById("brandName"),
  brandLogo: document.getElementById("brandLogo"),
  counter: document.getElementById("counter"),
  btnPrev: document.getElementById("btnPrev"),
  btnNext: document.getElementById("btnNext"),
  langBtns: Array.from(document.querySelectorAll("[data-lang]")),
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getHashIndex() {
  const m = (location.hash || "").match(/s=(\\d+)/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  if (Number.isNaN(v)) return null;
  return v - 1;
}

function setHashIndex(idx) {
  const s = idx + 1;
  history.replaceState(null, "", `#s=${s}`);
}

function slideTitle(slide) {
  return slide?.title_cn || slide?.title_ru || `Slide ${slide?.id || ""}`;
}

function brandLabel() {
  const b = deck.meta?.brand || {};
  const cn = (b.name_cn || "").trim();
  const ru = (b.name_ru || "").trim();
  if (state.lang === "cn") return cn || ru || "";
  if (state.lang === "ru") return ru || cn || "";
  if (cn && ru) return `${cn} / ${ru}`;
  return cn || ru || "";
}

function sloganLabel() {
  const b = deck.meta?.brand || {};
  const cn = (b.slogan_cn || "").trim();
  const ru = (b.slogan_ru || "").trim();
  if (state.lang === "cn") return cn || "";
  if (state.lang === "ru") return ru || "";
  if (cn && ru) return `${cn} · ${ru}`;
  return cn || ru || "";
}

function resolveImageSrc(fn) {
  const s = String(fn || "");
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;
  if (s.includes("/")) {
    const cleaned = s.replace(/^\.?\//, "").replace(/^assets\//, "");
    return `./assets/${cleaned}`;
  }
  return `./assets/ppt_media/${s}`;
}

function renderSlideFooter(root) {
  const b = deck.meta?.brand || {};
  const label = brandLabel();
  const logo = (b.logo || "").trim();
  const slogan = sloganLabel();
  if (!label && !logo && !slogan) return;

  const foot = document.createElement("div");
  foot.className = "slideFooter";

  const left = document.createElement("div");
  left.className = "footLeft";

  if (logo) {
    const img = document.createElement("img");
    img.className = "footLogo";
    img.alt = "Logo";
    img.src = resolveImageSrc(logo);
    left.appendChild(img);
  }

  const brand = document.createElement("div");
  brand.className = "footBrand";
  brand.textContent = label;
  left.appendChild(brand);

  const right = document.createElement("div");
  right.className = "footRight";
  right.textContent = slogan || "";

  foot.append(left, right);
  root.appendChild(foot);
}

function renderThumbs() {
  els.thumbs.innerHTML = "";
  deck.slides.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.className = "thumb";
    btn.type = "button";
    btn.addEventListener("click", () => go(i));
    const t1 = document.createElement("div");
    t1.className = "t1";
    t1.textContent = `${String(i + 1).padStart(2, "0")}  ${slideTitle(s)}`;
    const t2 = document.createElement("div");
    t2.className = "t2";
    const preview =
      (s.body_cn && s.body_cn[0]) ||
      (s.body_ru && s.body_ru[0]) ||
      (s.note || "");
    t2.textContent = preview ? preview.slice(0, 46) : "";
    btn.append(t1, t2);
    els.thumbs.appendChild(btn);
  });
}

function block(label, cls, title, body, bullets) {
  const wrap = document.createElement("div");
  wrap.className = `langBlock ${cls}`;
  const lab = document.createElement("div");
  lab.className = "langLabel";
  lab.textContent = label;
  wrap.appendChild(lab);

  if (title) {
    const h = document.createElement("h1");
    h.className = "h1";
    h.textContent = title;
    wrap.appendChild(h);
  }

  if (body && body.length) {
    const p = document.createElement("p");
    p.className = "p";
    p.textContent = body.join(" ");
    wrap.appendChild(p);
  }

  if (bullets && bullets.length) {
    const ul = document.createElement("ul");
    ul.className = "ul";
    bullets.forEach((b) => {
      const li = document.createElement("li");
      li.textContent = b;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
  }

  return wrap;
}

function renderChartSvg(spec) {
  const width = 960;
  const height = 320;
  const pad = { l: 44, r: 18, t: 12, b: 44 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const labels = Array.isArray(spec?.labels) ? spec.labels : [];
  const values = Array.isArray(spec?.values) ? spec.values : [];
  const max = Math.max(1, ...values.map((v) => (typeof v === "number" ? v : 0)));

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.classList.add("chartSvg");

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(width));
  bg.setAttribute("height", String(height));
  bg.setAttribute("fill", "#fff");
  svg.appendChild(bg);

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (innerH * i) / 4;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", String(pad.l));
    line.setAttribute("x2", String(pad.l + innerW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "rgba(0,0,0,.06)");
    svg.appendChild(line);
  }

  const type = spec?.type || "bar";
  const accent = deck.meta?.theme?.accent || "#DF2A2C";

  if (type === "line") {
    const pts = values.map((v, i) => {
      const x = pad.l + (innerW * (labels.length <= 1 ? 0 : i / (labels.length - 1)));
      const y = pad.t + innerH * (1 - (v / max));
      return [x, y];
    });

    const path = document.createElementNS(svgNS, "path");
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", accent);
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);

    pts.forEach(([x, y]) => {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", String(x));
      c.setAttribute("cy", String(y));
      c.setAttribute("r", "5");
      c.setAttribute("fill", "#fff");
      c.setAttribute("stroke", accent);
      c.setAttribute("stroke-width", "3");
      svg.appendChild(c);
    });
  } else {
    // bar
    const n = Math.max(1, values.length);
    const gap = 10;
    const barW = Math.max(6, (innerW - gap * (n - 1)) / n);
    values.forEach((v, i) => {
      const x = pad.l + i * (barW + gap);
      const h = innerH * (v / max);
      const y = pad.t + (innerH - h);
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", String(x));
      r.setAttribute("y", String(y));
      r.setAttribute("width", String(barW));
      r.setAttribute("height", String(h));
      r.setAttribute("rx", "8");
      r.setAttribute("fill", accent);
      svg.appendChild(r);
    });
  }

  // X labels (downsample if too many)
  const step = labels.length > 10 ? Math.ceil(labels.length / 10) : 1;
  labels.forEach((lab, i) => {
    if (i % step !== 0) return;
    const x = pad.l + (innerW * (labels.length <= 1 ? 0 : i / (labels.length - 1)));
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", String(x));
    t.setAttribute("y", String(height - 16));
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-size", "12");
    t.setAttribute("fill", "rgba(0,0,0,.55)");
    t.textContent = String(lab);
    svg.appendChild(t);
  });

  return svg;
}

function isOverflowing(el) {
  return el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;
}

function setTypeScale(root, scale) {
  root.style.setProperty("--typeScale", String(scale));
}

function autoFitSlide(root) {
  root.dataset.stacked = "0";
  root.dataset.overflow = "0";

  // First try: reduce font sizes uniformly.
  let scale = 1;
  setTypeScale(root, scale);
  for (let i = 0; i < 14; i++) {
    if (!isOverflowing(root)) return;
    scale *= 0.95;
    if (scale < 0.74) break;
    setTypeScale(root, scale);
  }

  // Second try: when showing both languages, stack them vertically.
  if (state.lang === "both" && root.querySelector(".grid")) {
    root.dataset.stacked = "1";
    scale = 1;
    setTypeScale(root, scale);
    for (let i = 0; i < 14; i++) {
      if (!isOverflowing(root)) return;
      scale *= 0.95;
      if (scale < 0.74) break;
      setTypeScale(root, scale);
    }
  }

  // Last resort: allow internal scroll in blocks if content is extreme.
  if (isOverflowing(root)) {
    root.dataset.overflow = "1";
  }
}

function renderSlide(idx) {
  const slide = deck.slides[idx];
  els.stage.innerHTML = "";
  const root = document.createElement("section");
  root.className = "slide";
  root.style.setProperty("--accent", deck.meta?.theme?.accent || "#DF2A2C");
  root.style.setProperty("--text", deck.meta?.theme?.text || "#404040");
  root.style.setProperty("--bg", deck.meta?.theme?.bg || "#FFFFFF");

  if (slide.layout === "cover") {
    root.classList.add("cover");
    const h = document.createElement("h1");
    h.className = "h1";
    h.textContent = slide.title_cn || deck.meta?.title || "演示";
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = slide.title_ru ? `Рус: ${slide.title_ru}` : (deck.meta?.subtitle || "");
    root.append(h, sub);
  } else if (slide.layout === "gallery") {
    root.classList.add("gallery");

    const header = document.createElement("div");
    header.className = "galleryHeader";

    const t = document.createElement("div");
    if (state.lang === "ru") {
      const h = document.createElement("h1");
      h.className = "h1";
      h.textContent = slide.title_ru || "";
      t.appendChild(h);
    } else if (state.lang === "cn") {
      const h = document.createElement("h1");
      h.className = "h1";
      h.textContent = slide.title_cn || "";
      t.appendChild(h);
    } else {
      const h = document.createElement("h1");
      h.className = "h1";
      h.textContent = slide.title_cn || slide.title_ru || "";
      const note = document.createElement("div");
      note.className = "galleryNote";
      note.textContent = slide.title_ru ? slide.title_ru : "";
      t.append(h, note);
    }

    header.appendChild(t);
    root.appendChild(header);

    const imgs = (slide.images || []).slice(0, 6);
    if (imgs.length) {
      const grid = document.createElement("div");
      grid.className = `galleryImgs ${imgs.length === 1 ? "one" : ""}`;

      imgs.forEach((fn, i) => {
        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = resolveImageSrc(fn);
        img.alt = fn;
        if (i === 0 && imgs.length > 1) img.classList.add("hero");
        grid.appendChild(img);
      });

      root.appendChild(grid);
    }
  } else {
    const grid = document.createElement("div");
    grid.className = "grid";

    const cn = block("中文", "cn", slide.title_cn, slide.body_cn, slide.bullets_cn);
    const ru = block("Русский", "ru", slide.title_ru, slide.body_ru, slide.bullets_ru);

    if (state.lang === "cn") {
      grid.style.gridTemplateColumns = "1fr";
      grid.appendChild(cn);
    } else if (state.lang === "ru") {
      grid.style.gridTemplateColumns = "1fr";
      grid.appendChild(ru);
    } else {
      grid.append(cn, ru);
    }

    root.appendChild(grid);
  }

  if (slide.chart && (slide.layout === "title_body" || slide.layout === "chart")) {
    const wrap = document.createElement("div");
    wrap.className = "chartWrap";
    const title = document.createElement("div");
    title.className = "chartTitle";
    title.textContent = slide.chart.title || "Chart";
    wrap.appendChild(title);
    wrap.appendChild(renderChartSvg(slide.chart));
    root.appendChild(wrap);
  }

  if (slide.layout !== "gallery" && slide.images && slide.images.length) {
    const strip = document.createElement("div");
    strip.className = "imageStrip";
    slide.images.slice(0, 10).forEach((fn) => {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = resolveImageSrc(fn);
      img.alt = fn;
      strip.appendChild(img);
    });
    root.appendChild(strip);
  }

  els.stage.appendChild(root);
  renderSlideFooter(root);
  if (slide.layout !== "gallery") autoFitSlide(root);

  // thumbs active
  Array.from(els.thumbs.children).forEach((n, i) => {
    n.classList.toggle("active", i === idx);
  });

  els.counter.textContent = `${idx + 1}/${deck.slides.length}`;
  setHashIndex(idx);
  document.title = `${deck.meta?.title || "Deck"} · ${idx + 1}/${deck.slides.length}`;
  els.title.textContent = deck.meta?.title || "演示";
  if (els.brandName) els.brandName.textContent = brandLabel() || "演示";
  if (els.brandLogo) {
    const logo = (deck.meta?.brand?.logo || "").trim();
    if (logo) {
      els.brandLogo.src = resolveImageSrc(logo);
      els.brandLogo.onerror = () => {
        els.brandLogo.style.display = "none";
      };
      els.brandLogo.style.display = "block";
    } else {
      els.brandLogo.style.display = "none";
    }
  }
}

function go(idx) {
  state.idx = clamp(idx, 0, deck.slides.length - 1);
  renderSlide(state.idx);
}

function next() {
  go(state.idx + 1);
}

function prev() {
  go(state.idx - 1);
}

function setLang(lang) {
  state.lang = lang;
  els.langBtns.forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  renderSlide(state.idx);
}

function onKey(e) {
  if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
    e.preventDefault();
    next();
  }
  if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    prev();
  }
  if (e.key === "Home") go(0);
  if (e.key === "End") go(deck.slides.length - 1);
}

function init() {
  if (!deck.slides || !deck.slides.length) {
    els.stage.textContent = "No slides in content.json";
    return;
  }

  renderThumbs();
  els.btnNext.addEventListener("click", next);
  els.btnPrev.addEventListener("click", prev);
  document.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", () => {
    const idx = getHashIndex();
    if (idx !== null) go(idx);
  });

  els.langBtns.forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
  setLang("both");

  const idx = getHashIndex();
  go(idx === null ? 0 : clamp(idx, 0, deck.slides.length - 1));
}

init();
