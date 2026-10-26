// Granted idea library: a static catalog that renders data/ideas.json.
const app = document.getElementById("app");
const STYLES = [["cards", "Cards"], ["books", "Books"]];
const state = { ideas: [], q: "", chip: "all", track: "all", sort: "newest", view: "shelf", style: "cards" };

const PALETTES = [
  ["#6b5a8e", "#ece5f4"], // plum
  ["#2f6f6a", "#dfeeea"], // teal
  ["#8c3b32", "#f3e1dc"], // oxblood
  ["#6e7a3a", "#ebeed9"], // olive
  ["#34507a", "#e0e7f1"], // navy
  ["#a9772b", "#f5ead3"], // ochre
];
// Two tracks: ventures (startup opportunities) and builds (weekend projects to post). Ideas from before the split are ventures.
const TRACKS = [["all", "All"], ["venture", "Ventures"], ["build", "Builds"]];
const trackOf = (i) => (i.track === "build" ? "build" : "venture");
const VERDICTS = {
  venture: { dig_deeper: "Dig deeper", watch: "Watch", pass: "Pass" },
  build: { dig_deeper: "Build it", watch: "Worth a try", pass: "Pass" },
};
const verdictLabel = (i) => VERDICTS[trackOf(i)][i.verdict] || "Unrated";
const CRITERIA = {
  venture: [["pain", "Pain"], ["market_pull", "Market pull"], ["timing", "Timing"], ["gap", "Gap"], ["wedge", "Wedge"]],
  build: [["wow", "Wow"], ["shareability", "Shareability"], ["buildability", "Buildability"], ["freshness", "Freshness"], ["usefulness", "Usefulness"]],
};
const criteria = (i) => CRITERIA[trackOf(i)];
const trackLabel = (i) => (trackOf(i) === "build" ? "Build" : "Venture");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// Topics get distinct colours in order of size; unknown ones fall back to a hash.
const paletteIndex = new Map();
const palette = (cat) => PALETTES[paletteIndex.get(cat || "Uncategorised") ?? hash(cat || "Uncategorised") % PALETTES.length];
const catVars = (cat) => { const [c1, c2] = palette(cat); return `--c1:${c1};--c2:${c2}`; };
const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const num = (n) => String(n).padStart(2, "0");
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

function rng(seed) {
  let t = seed >>> 0;
  return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}

// Engraving-style plate: contour rings, hatching and a small constellation, all seeded by the idea id.
function plate(seedKey, cat, w = 320, h = 200) {
  const [c1] = palette(cat);
  const r = rng(hash(seedKey));
  const cx = w * (0.35 + r() * 0.3), cy = h * (0.4 + r() * 0.25);
  const rings = Array.from({ length: 9 }, (_, i) => {
    const rad = 14 + i * (10 + r() * 6), wob = 2 + r() * 5, pts = [];
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      const rr = rad + Math.sin(t * 3 + i) * wob + Math.cos(t * 5 + r() * 2) * wob * 0.5;
      pts.push(`${(cx + Math.cos(t) * rr * 1.25).toFixed(1)},${(cy + Math.sin(t) * rr).toFixed(1)}`);
    }
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="${c1}" stroke-opacity="${(0.9 - i * 0.07).toFixed(2)}" stroke-width="${i === 0 ? 1.6 : 1}"/>`;
  }).join("");
  const ang = r() * 40 - 20;
  const hatch = Array.from({ length: 34 }, (_, i) => `<line x1="${-40 + i * 12}" y1="${h + 20}" x2="${-40 + i * 12 + 60}" y2="-20" stroke="${c1}" stroke-opacity=".16" stroke-width=".8"/>`).join("");
  const stars = Array.from({ length: 6 }, () => [w * (0.08 + r() * 0.84), h * (0.1 + r() * 0.8), 1.2 + r() * 2.2]);
  const links = stars.slice(1).map((s, i) => `<line x1="${stars[i][0].toFixed(1)}" y1="${stars[i][1].toFixed(1)}" x2="${s[0].toFixed(1)}" y2="${s[1].toFixed(1)}" stroke="${c1}" stroke-opacity=".55" stroke-width=".9" stroke-dasharray="2 3"/>`).join("");
  const dots = stars.map(([x, y, s]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${c1}" fill-opacity=".75"/>`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g transform="rotate(${ang.toFixed(1)} ${w / 2} ${h / 2})">${hatch}</g>${rings}${links}${dots}
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.2" fill="${c1}"/></svg>`;
}

const icons = {
  shelf: '<svg viewBox="0 0 16 16"><rect x="2" y="2.5" width="4.5" height="11" rx="1"/><rect x="9.5" y="2.5" width="4.5" height="11" rx="1"/></svg>',
  topics: '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>',
  map: '<svg viewBox="0 0 16 16"><circle cx="4" cy="11" r="1.5"/><circle cx="8" cy="5" r="1.5"/><circle cx="12.5" cy="8.5" r="1.5"/><path d="M5.2 10 7 6.3M9.4 5.8l2 1.8"/></svg>',
  search: '<svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>',
  lib: '<svg viewBox="0 0 16 16"><path d="M3 2.5v11M6.5 2.5v11M10 3l3 10.5"/></svg>',
};

const current = () => state.ideas.filter((i) => !i.superseded_by);
const inTrack = () => current().filter((i) => state.track === "all" || trackOf(i) === state.track);

function visibleIdeas() {
  const q = state.q.trim().toLowerCase();
  let list = inTrack().filter((i) => {
    if (state.chip === "dig_deeper" || state.chip === "watch") { if (i.verdict !== state.chip) return false; }
    else if (state.chip !== "all" && i.category !== state.chip) return false;
    if (!q) return true;
    return [i.short_name, i.one_liner, i.category, ...(i.tags || [])].join(" ").toLowerCase().includes(q);
  });
  list = list.slice().sort((a, b) => state.sort === "score" ? (b.score ?? 0) - (a.score ?? 0) || b.number - a.number : b.number - a.number);
  return list;
}

function header() {
  const ideas = current();
  const cats = new Set(ideas.map((i) => i.category).filter(Boolean));
  const builds = ideas.filter((i) => trackOf(i) === "build").length;
  const protos = ideas.filter((i) => i.prototype_url).length;
  const lastSeen = store.get("granted:lastSeen");
  const fresh = lastSeen ? state.ideas.filter((i) => i.date > lastSeen).length : 0;
  return `
    <span class="eyebrow">${icons.lib} Scouted every night from my bookmarks</span>
    <h1 class="title">Idea library</h1>
    ${!ideas.length ? "" : `<p class="stats">${[[ideas.length, "idea"], [ideas.length - builds, "venture"], [builds, "build"], [cats.size, "topic"], [protos, "prototype"]].map(([n, w]) => `<span><b>${n}</b> ${w}${n === 1 ? "" : "s"}</span>`).join("<span>·</span>")}</p>`}
    ${fresh ? `<button class="new-pill" data-act="newest"><span class="dot">${fresh}</span>${fresh === 1 ? "new idea" : "new ideas"} since you last looked</button>` : ""}`;
}

function chips() {
  const pool = inTrack();
  const counts = {};
  for (const i of pool) if (i.category) counts[i.category] = (counts[i.category] || 0) + 1;
  const verdictCount = (v) => pool.filter((i) => i.verdict === v).length;
  const chip = (key, label, count, sw = "") => `<button class="chip" data-chip="${esc(key)}" aria-pressed="${state.chip === key}">${sw}${esc(label)}<span class="count">${count}</span></button>`;
  const names = state.track === "build" ? ["Build it", "Worth a try"] : state.track === "venture" ? ["Dig deeper", "Watch"] : ["Top picks", "Watch list"];
  return `${chip("all", "All", pool.length)}
      ${chip("dig_deeper", names[0], verdictCount("dig_deeper"))}
      ${chip("watch", names[1], verdictCount("watch"))}
      ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c, n]) => chip(c, c, n, `<span class="sw" style="background:${palette(c)[0]}"></span>`)).join("")}`;
}

function trackSwitch() {
  const n = (t) => (t === "all" ? current().length : current().filter((i) => trackOf(i) === t).length);
  return `<div class="tabs track-switch" role="radiogroup" aria-label="Track">${TRACKS.map(([k, l]) => `<button class="tab" role="radio" data-track="${k}" aria-checked="${state.track === k}" aria-selected="${state.track === k}">${l}<span class="count">${n(k)}</span></button>`).join("")}</div>`;
}

function controls() {
  const any = current().length > 0;
  const tab = (v, label) => `<button class="tab" role="tab" data-view="${v}" aria-selected="${state.view === v}">${icons[v]}${label}</button>`;
  return `
    <div class="controls">
      <div class="tabs" role="tablist" aria-label="Views">${tab("shelf", "Shelf")}${tab("topics", "Topics")}${tab("map", "Map")}</div>
      ${any ? `<label class="search">${icons.search}<input id="q" type="search" placeholder="Search the library" value="${esc(state.q)}" aria-label="Search ideas"><kbd>/</kbd></label>` : ""}
      ${state.view === "shelf" ? `<div class="tabs style-switch" role="radiogroup" aria-label="Shelf style">${STYLES.map(([k, l]) => `<button class="tab" role="radio" data-style="${k}" aria-checked="${state.style === k}" aria-selected="${state.style === k}">${l}</button>`).join("")}</div>` : ""}
      ${state.view === "shelf" && any ? `<label class="sort">Arrange by <select id="sort"><option value="newest"${state.sort === "newest" ? " selected" : ""}>Newest</option><option value="score"${state.sort === "score" ? " selected" : ""}>Score</option></select></label>` : ""}
    </div>
    ${state.view === "shelf" && any ? `<div class="filter-row">${trackSwitch()}<div class="chips" id="chips" role="group" aria-label="Filter">${chips()}</div></div>` : ""}`;
}

function card(i) {
  const stats = i.scores
    ? criteria(i).map(([k, label]) => { const v = Number(i.scores[k] ?? 0); return `<div class="stat"><span>${label}</span><span class="bar"><span style="width:${Math.max(0, Math.min(10, v)) * 10}%"></span></span><b>${v}</b></div>`; }).join("")
    : `<div class="stat" style="grid-template-columns:1fr auto"><span>${trackOf(i) === "build" ? "Overall build score" : "Overall opportunity"}</span><span class="score-big">${i.score ?? "–"}<small>/10</small></span></div>`;
  return `
    <a class="card ${trackOf(i)} ${i.verdict === "dig_deeper" ? "dig" : ""} ${i.superseded_by ? "superseded" : ""}" data-key="${esc(i.id)}" href="#/idea/${esc(i.id)}" style="${catVars(i.category)}" data-tilt>
      <div class="card-top"><span class="cat"><i></i>${esc(i.category || "Uncategorised")}</span><span>No. ${num(i.number)}</span></div>
      <div class="plate">${plate(i.id, i.category)}</div>
      <h3>${esc(i.short_name)}</h3>
      <p>${esc(i.one_liner)}</p>
      <div class="stats-block">${stats}</div>
      <div class="card-foot"><span class="stamp ${esc(i.verdict)}">${esc(verdictLabel(i))}</span><span><b class="track-tag">${trackLabel(i)}</b> · ${i.superseded_by ? "earlier take" : !i.prototype_url && i.sibling ? "brief only" : fmtDate(i.date)}</span></div>
    </a>`;
}

// Empty shelves: a fanned stack of blank, dog-eared cards, or a few untitled books lying on the plank.
function emptyArt(kind) {
  if (kind === "books") {
    const book = (n, w, h, x) => { const [c1] = PALETTES[n]; return `<span class="lying" style="--c1:${c1};width:${w}px;height:${h}px;--x:${x}px;--i:${n}"><i></i><i></i></span>`; };
    return `<div class="empty-art ea-books" aria-hidden="true"><div class="pile">${book(2, 236, 40, -10)}${book(1, 206, 34, 14)}${book(0, 222, 30, -4)}</div><div class="plank"></div></div>`;
  }
  return `<div class="empty-art ea-cards" aria-hidden="true">
    <span class="ec" style="--r:-11deg;--x:-46px;--i:0"></span>
    <span class="ec" style="--r:8deg;--x:44px;--i:1"></span>
    <span class="ec top" style="--r:-2deg;--x:0px;--i:2"><b class="ph plate"></b><b class="ph line"></b><b class="ph line short"></b><i class="fold"></i></span>
  </div>`;
}

function emptyState(kind, art) {
  const thing = art === "books" ? "book" : "card";
  if (kind === "nomatch") {
    const q = state.q.trim();
    return `<div class="empty-state small">${emptyArt(art)}
      <h2>Nothing on the shelf matches${q ? ` “${esc(q)}”` : ""}</h2>
      <p>Try another word, or put the filters back.</p>
      <button class="btn" data-act="clear">Clear filters</button></div>`;
  }
  return `<div class="empty-state">${emptyArt(art)}
    <h2>The shelf is waiting for its first night</h2>
    <p>Each night the workflow reads your newest bookmarks, scouts one idea and files it here. Run it once and the first ${thing} appears.</p>
    <a class="btn" href="#/about">How it works</a></div>`;
}

function shelfView() {
  const list = visibleIdeas();
  if (!list.length) return emptyState(current().length ? "nomatch" : "fresh", state.style);
  if (state.style === "books") return booksView(list);
  return `<div class="shelf">${list.map(card).join("")}</div>`;
}

const byCategory = (list) => {
  const groups = {};
  for (const i of list) (groups[i.category || "Uncategorised"] ||= []).push(i);
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
};

// Bookshelf: one spine per idea, grouped by topic; taller spines scored higher, gilt bands mark "dig deeper".
function booksView(list) {
  const spine = (i) => {
    const h = 200 + Math.max(0, Math.min(10, i.score ?? 6) - 5) * 26;
    const w = 46 + (hash(i.id) % 18);
    return `<button class="spine ${trackOf(i)} ${i.verdict === "dig_deeper" ? "gilt" : ""}" data-book="${esc(i.id)}" data-key="${esc(i.id)}" data-tip="${esc(i.short_name)}" data-tip-meta="${esc(`${trackLabel(i)} · ${i.category || ""} · ${fmtDate(i.date)}`)}" style="${catVars(i.category)};height:${h}px;width:${w}px" aria-label="${esc(`${i.short_name}, ${trackLabel(i)}, ${i.category}, ${verdictLabel(i)} ${i.score ?? ""}`)}">
      <span class="spine-band"></span>
      <span class="spine-title">${esc(i.short_name)}</span>
      <span class="spine-label">${esc(i.verdict ? verdictLabel(i) : "")}</span>
      <span class="spine-no">${num(i.number)}</span>
    </button>`;
  };
  const groups = byCategory(list);
  return `<div class="bookcase">
    <div class="books" role="list">${groups.map(([cat, items]) => `<div class="book-group" role="listitem">${items.map(spine).join("")}</div>`).join(`<span class="bookend" aria-hidden="true"></span>`)}</div>
    <div class="plank" aria-hidden="true"></div>
    <div class="shelf-labels">${groups.map(([cat, items]) => `<span style="${catVars(cat)}"><i></i>${esc(cat)} <em>${items.length}</em></span>`).join("")}</div>
    <p class="shelf-hint">Click a spine to take it down. Arrow keys walk the shelf.</p>
  </div>`;
}

function bookSpread(i) {
  return `<div class="spread-backdrop" data-close></div>
  <div class="spread" role="dialog" aria-modal="true" aria-label="${esc(i.short_name)}" style="${catVars(i.category)}">
    <button class="spread-close" data-close aria-label="Close">×</button>
    <div class="spread-page left">
      <div class="bookplate">
        <p class="ex">Ex libris</p>
        <div class="bookplate-art">${plate(i.id, i.category, 240, 150)}</div>
        <p class="owner">A Granted idea</p>
        <p class="meta">No. ${num(i.number)} · scouted ${esc(fmtDate(i.date))}</p>
      </div>
    </div>
    <div class="spread-page right">
      <p class="kicker">${esc(trackLabel(i))} · ${esc(i.category || "Uncategorised")}</p>
      <h2>${esc(i.short_name)}</h2>
      <p class="lede">${esc(i.one_liner)}</p>
      <div class="verdict-row"><span class="stamp ${esc(i.verdict)}">${esc(verdictLabel(i))}</span><span class="score-big">${i.score ?? "–"}<small>/10</small></span></div>
      <div class="spread-actions">
        <a class="btn primary" href="#/idea/${esc(i.id)}">Read the field guide</a>
        ${i.prototype_url ? `<a class="btn" href="${esc(i.prototype_url)}" target="_blank" rel="noopener">Open the prototype ↗</a>` : ""}
      </div>
    </div>
  </div>`;
}

function bookCover(i) {
  return `<div class="bk-frame">
      <div class="bk-art">${plate(i.id, i.category, 240, 190)}</div>
      <p class="bk-kicker">${esc(i.category || "Uncategorised")} · ${esc(String(i.date).slice(0, 4))}</p>
      <p class="bk-title">${esc(i.short_name)}</p>
      <p class="bk-author">Granted · No. ${num(i.number)}</p>
    </div>`;
}

// The 3D stand-in for the opening: a closed book (spine, cover, page block) laid over the spread's right page.
function buildFlyingBook(i, spread, spineEl) {
  const sr = spread.getBoundingClientRect();
  const pw = sr.width / 2, ph = sr.height;
  const s = spineEl.getBoundingClientRect();
  // Thick enough that, shrunk to shelf size, the spine face is as wide as the spine it replaces.
  const depth = Math.round(s.width * ph / s.height);
  const fly = document.createElement("div");
  fly.className = "book-fly";
  fly.setAttribute("aria-hidden", "true");
  fly.setAttribute("style", catVars(i.category));
  fly.innerHTML = `<div class="book-body" style="left:${sr.left + pw}px;top:${sr.top}px;width:${pw}px;height:${ph}px;--depth:${depth}px">
      <div class="bk-page">${spread.querySelector(".spread-page.right").outerHTML}</div>
      <div class="bk-spine"><span>${esc(i.short_name)}</span></div>
      <div class="bk-cover">
        <div class="bk-front">${bookCover(i)}</div>
        <div class="bk-inside">${spread.querySelector(".spread-page.left").outerHTML}</div>
      </div>
    </div>`;
  fly.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
  document.body.appendChild(fly);
  return {
    fly,
    body: fly.querySelector(".book-body"),
    cover: fly.querySelector(".bk-cover"),
    // The book's left edge (its spine) starts exactly where the spine stood on the shelf.
    shelf: `translate(${s.left - (sr.left + pw)}px, ${s.top + s.height / 2 - (sr.top + ph / 2)}px) scale(${s.height / ph}) rotateY(90deg)`,
    lift: `translate(${(s.left - (sr.left + pw)) * 0.45}px, ${(s.top + s.height / 2 - (sr.top + ph / 2)) * 0.45 - 50}px) scale(${(s.height / ph + 1) / 2}) rotateY(38deg)`,
  };
}

const done = (anim) => anim.finished.catch(() => {});

function openBook(id, spineEl) {
  const i = state.ideas.find((x) => x.id === id);
  if (!i) return;
  const host = document.createElement("div");
  host.className = "spread-host";
  host.innerHTML = bookSpread(i);
  document.body.appendChild(host);
  const spread = host.querySelector(".spread");
  const opener = document.activeElement;
  // The flight needs the two-page layout and a spine to fly from; otherwise the spread simply fades in.
  const animated = Boolean(spineEl) && !reduceMotion() && innerWidth > 680;
  let busy = false;

  const teardown = () => { host.remove(); document.removeEventListener("keydown", onKey); if (spineEl) spineEl.style.visibility = ""; };
  const close = async () => {
    if (busy) return;
    if (!animated) { teardown(); opener?.focus?.(); return; }
    busy = true;
    const book = buildFlyingBook(i, spread, spineEl);
    book.cover.style.transform = "rotateY(-180deg)";
    spread.classList.add("staging");
    await done(book.cover.animate([{ transform: "rotateY(-180deg)" }, { transform: "rotateY(0deg)" }], { duration: 520, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }));
    host.classList.remove("open");
    await done(book.body.animate([{ transform: "none" }, { transform: book.lift, offset: 0.55 }, { transform: book.shelf }], { duration: 560, easing: "cubic-bezier(.6,0,.4,1)", fill: "forwards" }));
    book.fly.remove();
    teardown();
    opener?.focus?.({ preventScroll: true });
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  host.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", close));
  host.querySelectorAll("a[href^='#/idea/']").forEach((a) => a.addEventListener("click", teardown));
  document.addEventListener("keydown", onKey);

  if (!animated) {
    requestAnimationFrame(() => host.classList.add("open"));
    host.querySelector(".btn.primary")?.focus();
    return;
  }
  busy = true;
  spread.classList.add("staging");
  requestAnimationFrame(async () => {
    const book = buildFlyingBook(i, spread, spineEl);
    spineEl.style.visibility = "hidden";
    host.classList.add("open");
    // 1. pull the book off the shelf and turn it to show the cover
    await done(book.body.animate([{ transform: book.shelf }, { transform: book.lift, offset: 0.45 }, { transform: "none" }], { duration: 720, easing: "cubic-bezier(.3,.6,.2,1)", fill: "forwards" }));
    // 2. swing the cover open on its left hinge to reveal the bookplate
    await done(book.cover.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }], { duration: 760, easing: "cubic-bezier(.45,.05,.2,1)", fill: "forwards" }));
    spread.style.transition = "none";
    spread.classList.remove("staging");
    void spread.offsetWidth;
    spread.style.transition = "";
    book.fly.remove();
    busy = false;
    host.querySelector(".btn.primary")?.focus({ preventScroll: true });
  });
}


function topicsView() {
  if (!current().length) return emptyState("fresh", "cards");
  return `<div class="topics">${byCategory(current()).map(([cat, items]) => {
    const scored = items.filter((x) => x.score != null);
    const avg = scored.length ? (scored.reduce((s, x) => s + x.score, 0) / scored.length).toFixed(1) : "–";
    const bars = items.slice().sort((a, b) => a.number - b.number).map((x) => `<span style="height:${Math.max(8, ((x.score ?? 0) / 10) * 100)}%" title="${esc(x.short_name)} · ${x.score ?? "–"}"></span>`).join("");
    return `<a class="topic" href="#/topic/${slugify(cat)}" style="${catVars(cat)}">
      <div class="plate">${plate(`topic-${cat}`, cat, 320, 180)}</div>
      <div class="topic-body"><h3><i></i>${esc(cat)}</h3><p class="meta">${items.length} ${items.length === 1 ? "idea" : "ideas"} · average score ${avg}</p><div class="bars">${bars}</div></div>
    </a>`;
  }).join("")}</div>`;
}

function mapView() {
  const items = state.ideas.filter((i) => i.score != null);
  if (!items.length) return emptyState("fresh", "cards");
  const W = 900, H = 420, P = { l: 48, r: 24, t: 24, b: 40 };
  const t = (d) => new Date(`${d}T00:00:00`).getTime();
  const dates = items.map((i) => t(i.date));
  const t0 = Math.min(...dates) - 86400000, t1 = Math.max(...dates) + 86400000;
  const x = (d) => P.l + ((t(d) - t0) / (t1 - t0)) * (W - P.l - P.r);
  const y = (s) => P.t + (1 - (s - 5) / 5) * (H - P.t - P.b);
  const sameDay = {};
  const grid = [5, 6, 7, 8, 9, 10].map((s) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(s)}" y2="${y(s)}" stroke="var(--line)"/><text x="${P.l - 10}" y="${y(s) + 4}" text-anchor="end">${s}</text>`).join("");
  const band = `<rect x="${P.l}" y="${y(10)}" width="${W - P.l - P.r}" height="${y(7.5) - y(10)}" fill="var(--stamp-dig)" fill-opacity=".05"/><text x="${W - P.r - 6}" y="${y(7.5) - 6}" text-anchor="end">dig deeper zone</text>`;
  const perDay = {};
  for (const i of items) perDay[i.date] = (perDay[i.date] || 0) + 1;
  const pts = items.map((i) => {
    const k = i.date, n = sameDay[k] = (sameDay[k] || 0) + 1;
    const dx = (n - 1) * 26;
    const [c1] = palette(i.category);
    const r = 6 + Math.min(10, (i.sources_count || 0) / 2);
    const cx = x(i.date) + dx, cy = y(i.score);
    // Ideas from the same night sit side by side: first label on the left, second on the right, the rest underneath.
    const lbl = perDay[k] > 1 && n === 1 ? { x: cx - r - 6, y: cy + 4, a: "end" }
      : n <= 2 ? { x: cx + r + 6, y: cy + 4, a: "start" }
      : { x: cx, y: cy + r + 16, a: "middle" };
    return `<a href="#/idea/${esc(i.id)}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${c1}" fill-opacity="${i.superseded_by ? 0.35 : 0.85}" stroke="${c1}" stroke-opacity=".35" stroke-width="6"/>
      <text class="label" x="${lbl.x}" y="${lbl.y}" text-anchor="${lbl.a}">${esc(i.short_name)}</text></a>`;
  }).join("");
  const days = [...new Set(items.map((i) => i.date))].map((d) => `<text x="${x(d)}" y="${H - 14}" text-anchor="middle">${esc(fmtDate(d).replace(/,? \d{4}$/, ""))}</text>`).join("");
  return `<div class="map-wrap"><h2>Night sky</h2><p>Every idea as a star: higher means a stronger opportunity, bigger means more sources behind the brief.</p>
    <svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ideas plotted by date and score">${band}${grid}${days}${pts}</svg></div>`;
}

function topicPage(slug) {
  const items = current().filter((i) => slugify(i.category || "Uncategorised") === slug);
  const cat = items[0]?.category || "Uncategorised";
  return `<div class="page">
    <a class="back" href="#/topics">← All topics</a>
    <span class="eyebrow">${icons.lib} Topic</span>
    <h1 class="title" style="font-size:clamp(42px,6vw,72px)">${esc(cat)}</h1>
    <p class="stats"><span><b>${items.length}</b> ${items.length === 1 ? "idea" : "ideas"}</span></p>
    <div class="shelf">${items.sort((a, b) => b.number - a.number).map(card).join("")}</div></div>`;
}

// Text fields arrive as prose with line breaks and "1) ..." enumerations; render them as paragraphs or lists.
function rich(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  const linkify = (s) => esc(s).replace(/https?:\/\/[^\s)]+/g, (u) => `<a href="${u}" rel="noopener" target="_blank">${u}</a>`);
  const enumerated = t.split(/\s*(?:^|\n|\s)(?=\(?\d{1,2}[).]\s)/).map((s) => s.trim()).filter(Boolean);
  if (enumerated.length > 1 && enumerated.every((s) => /^\(?\d{1,2}[).]/.test(s))) {
    return `<ol>${enumerated.map((s) => `<li>${linkify(s.replace(/^\(?\d{1,2}[).]\s*/, ""))}</li>`).join("")}</ol>`;
  }
  return t.split(/\n{1,}/).map((p) => `<p>${linkify(p)}</p>`).join("");
}

function handle(url) {
  const m = /x\.com\/([^/]+)\/status/.exec(url || "");
  return m && m[1] !== "i" ? `@${m[1]}` : url;
}

async function ideaPage(id) {
  app.innerHTML = `<div class="page"><p class="empty">Opening the field guide…</p></div>`;
  let idea;
  try { idea = await loadIdea(id); }
  catch { app.innerHTML = `<div class="page"><a class="back" href="#/">← Library</a><p class="empty">That idea could not be found.</p></div>`; return revealGuide(); }
  const sec = (title, sub, body) => body ? `<section class="section"><h2>${esc(title)}${sub ? ` <small>${esc(sub)}</small>` : ""}</h2>${body}</section>` : "";
  const isBuild = trackOf(idea) === "build";
  const scoreStrip = idea.scores ? `<div class="score-strip">${criteria(idea).map(([k, l]) => `<span>${l} <b>${idea.scores[k] ?? "–"}</b></span>`).join("")}</div>` : "";
  const related = [...(idea.sibling ? [["Same night", idea.sibling]] : []), ...(idea.earlier || []).map((r) => ["Earlier take", r]), ...(idea.superseded_by ? [["Replaced by", idea.superseded_by]] : [])];
  const siblingName = idea.sibling ? state.ideas.find((x) => x.id === idea.sibling)?.short_name || "tonight's other idea" : "";
  app.innerHTML = `<div class="page">
    <a class="back" href="#/">← Library</a>
    <article class="guide" style="${catVars(idea.category)}">
      <aside class="specimen">
        <div class="plate">${plate(idea.id, idea.category, 320, 400)}</div>
        <div class="label-card">
          <p class="plate-no">Plate No. ${num(idea.number)}</p>
          <p class="genus">${esc(idea.short_name)}</p>
          <dl>
            <dt>Track</dt><dd>${esc(isBuild ? "Build: a project to ship and post" : "Venture: a startup opportunity")}</dd>
            <dt>Classification</dt><dd>${esc(idea.category || "Uncategorised")}</dd>
            ${idea.effort ? `<dt>Effort</dt><dd>${esc(idea.effort)}</dd>` : ""}
            ${idea.pain_type ? `<dt>Pain</dt><dd>${esc(idea.pain_type)}</dd>` : ""}
            <dt>Collected</dt><dd>${esc(fmtDate(idea.date))}</dd>
            <dt>Collected from</dt><dd>${(idea.inspiration || []).map((u) => `<a href="${esc(u)}" rel="noopener" target="_blank">${esc(handle(u))}</a>`).join(", ") || "—"}</dd>
            <dt>Sources</dt><dd>${(idea.sources || []).length}</dd>
          </dl>
        </div>
        <div class="actions">
          ${idea.prototype_url ? `<a class="btn primary" href="${esc(idea.prototype_url)}" target="_blank" rel="noopener">Open the prototype ↗</a>` : `<a class="btn primary" aria-disabled="true">No prototype for this one</a>`}
          ${related.map(([l, r]) => `<a class="btn" href="#/idea/${esc(r)}">${esc(l)}: ${esc(state.ideas.find((x) => x.id === r)?.short_name || r)}</a>`).join("")}
        </div>
      </aside>
      <div class="entry">
        <p class="kicker">Field guide entry · ${esc(isBuild ? "Build" : "Venture")}</p>
        <h1>${esc(idea.short_name)}</h1>
        <p class="lede">${esc(idea.one_liner)}</p>
        <div class="verdict-row"><span class="stamp ${esc(idea.verdict)}">${esc(verdictLabel(idea))}</span><span class="score-big">${idea.score ?? "–"}<small>/10</small></span>${scoreStrip}</div>
        ${idea.partial ? `<p class="notice">This early entry was recovered from a run that has since been cleaned up, so only part of its brief survives.</p>` : ""}
        ${!idea.prototype_url ? (idea.sibling
          ? `<p class="notice">A brief without a prototype: that night's prototype went to <a href="#/idea/${esc(idea.sibling)}">${esc(siblingName)}</a>.</p>`
          : `<p class="notice">This take's prototype was replaced by a later run on the same night.</p>`) : ""}
        ${isBuild ? `
        ${idea.launch_post ? `<section class="section launch"><h2>The launch post <small>a draft for X</small></h2><blockquote class="launch-post">${esc(idea.launch_post)}</blockquote><button class="btn small" data-act="copy" data-text="${esc(idea.launch_post)}">Copy the post</button></section>` : ""}
        ${sec("Observed behaviour", "who it's for", rich(idea.problem))}
        ${sec("Habitat", "the audience and where they hang out", rich(idea.target_customer))}
        ${sec("Why now", "what just became possible", rich(idea.why_now))}
        ${sec("Field notes", "how to build it", rich(idea.build_plan))}
        ${sec("Related species", "prior art and how this differs", rich(idea.comparables))}
        ${sec("Hazards", "risks", rich(idea.risks))}
        ${idea.could_grow ? sec("Could it grow?", "", "<p>The scout thinks this build could turn into a venture. Its reasoning is in the scout's notes below.</p>") : ""}` : `
        ${sec("Observed behaviour", "the problem", rich(idea.problem))}
        ${sec("Habitat", "who has it and who pays", rich(idea.target_customer))}
        ${sec("Why now", "", rich(idea.why_now))}
        ${sec("Related species", "comparables and the gap", rich(idea.comparables))}
        ${sec("Range", "market", rich(idea.market_note))}
        ${sec("Hazards", "risks", rich(idea.risks))}
        ${sec("Riskiest assumptions", "", rich(idea.riskiest_assumptions))}
        ${sec("First sightings", "the first ten customers", rich(idea.first_customers))}
        ${sec("Field test this week", "", rich(idea.validation_test))}
        ${sec("First version", "the narrowest thing to ship", rich(idea.build_plan))}`}
        ${sec("Scout's notes", "why this one won", rich(idea.reasoning))}
        ${sec("Other specimens considered", "", rich(idea.candidates_considered))}
        ${sec("Research log", "", rich(idea.research_notes))}
        ${(idea.sources || []).length ? sec("Sources", "", `<ol class="sources">${idea.sources.map((u) => `<li><a href="${esc(u)}" rel="noopener" target="_blank">${esc(u)}</a></li>`).join("")}</ol>`) : ""}
      </div>
    </article></div>`;
  window.scrollTo(0, 0);
  revealGuide();
}

function aboutPage() {
  return `<div class="page" style="max-width:760px">
    <a class="back" href="#/">← Library</a>
    <h1 class="title" style="font-size:clamp(40px,6vw,64px)">How it works</h1>
    <section class="section"><h2>Every night at 2 AM</h2><p>A UiPath Maestro workflow reads my newest X bookmarks, an agent checks them against every idea already on this shelf, researches the strongest candidates on the web, red-teams them and writes a brief. A second agent builds a one-file clickable prototype, which is checked and published to GitHub Pages. The brief lands in my inbox and on this shelf.</p></section>
    <section class="section"><h2>Two kinds of idea</h2><p><b>Ventures</b> are startup opportunities: someone would pay, and a company could grow. They are scored on pain, market pull, timing, gap and wedge. <b>Builds</b> are projects one person can ship in a day or a weekend and post: they are scored on wow, shareability, buildability, freshness and usefulness, and come with a build plan and a draft launch post. Each night the scout picks the best of each; the stronger one gets a prototype, the other is filed as a brief.</p></section>
    <section class="section"><h2>Reading a card</h2><p>The stamp is the verdict. A venture marked <b>Dig deeper</b>, or a build marked <b>Build it</b>, averaged 7.5 or more and wears a foil edge; <b>Watch</b> and <b>Worth a try</b> scored 6 to 7.4. Open a card to read its field guide entry and the prototype.</p></section>
    <section class="section"><h2>Run your own</h2><p>A step-by-step guide to running Granted on your own UiPath account, with your own sources and your own library, is coming soon. Follow along in the <a href="https://github.com/Yashsharma1911/granted#run-your-own" rel="noopener">README</a>.</p></section>
  </div>`;
}

// Card → field guide. The card lifts, a sheet grows out of it to fill the screen and becomes the page,
// then the entry writes itself in. "← Library" runs it backwards into the card's slot.
const ideaCache = new Map();
function loadIdea(id) {
  if (!ideaCache.has(id)) {
    const p = fetch(`data/ideas/${encodeURIComponent(id)}.json`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    p.catch(() => ideaCache.delete(id));
    ideaCache.set(id, p);
  }
  return ideaCache.get(id);
}

let cardTrip = null; // { id, from, y, sheet } from the moment a card opens until the reader is back on a list
const FULL = "inset(0px 0px 0px 0px round 0px)";
const clipAt = (r, rad) => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round ${rad})`;
const route = (h) => h.replace(/^#\/?/, "");

function cardGhost(cardEl, r) {
  const g = cardEl.cloneNode(true);
  g.removeAttribute("href");
  g.removeAttribute("data-tilt");
  g.setAttribute("aria-hidden", "true");
  g.classList.add("card-ghost");
  Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  document.body.appendChild(g);
  return g;
}

function cardSheet(clip) {
  const sh = document.createElement("div");
  sh.className = "card-sheet";
  sh.style.clipPath = clip;
  document.body.appendChild(sh);
  return sh;
}

async function openCard(cardEl) {
  const id = cardEl.dataset.key;
  loadIdea(id).catch(() => {});
  const r = cardEl.getBoundingClientRect();
  const look = getComputedStyle(cardEl);
  const paper = getComputedStyle(document.body).backgroundColor;
  const ghost = cardGhost(cardEl, r);
  const sheet = cardSheet(clipAt(r, look.borderRadius));
  sheet.style.backgroundColor = look.backgroundColor;
  cardEl.style.visibility = "hidden";
  cardTrip = { id, from: route(location.hash), y: scrollY, sheet };
  const lift = "translateY(-8px) scale(1.03)";
  const lifted = { left: r.left - r.width * 0.015, right: r.right + r.width * 0.015, top: r.top - 8 - r.height * 0.015, bottom: r.bottom - 8 + r.height * 0.015 };
  // 1. lift it off the grid
  await done(ghost.animate([{ transform: "none" }, { transform: lift }], { duration: 170, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }));
  sheet.style.clipPath = clipAt(lifted, look.borderRadius);
  // 2. the card's sheet grows to fill the screen while its contents melt away
  ghost.animate([{ opacity: 1, transform: lift }, { opacity: 0, transform: `${lift} scale(1.06)` }], { duration: 230, easing: "ease-in", fill: "forwards" });
  await done(sheet.animate([
    { clipPath: clipAt(lifted, look.borderRadius), backgroundColor: look.backgroundColor },
    { clipPath: FULL, backgroundColor: paper },
  ], { duration: 540, easing: "cubic-bezier(.65,0,.25,1)", fill: "forwards" }));
  ghost.remove();
  location.hash = `#/idea/${encodeURIComponent(id)}`;
}

// The entry builds itself on the sheet: title word by word, then the rest in reading order.
function revealGuide() {
  const sheet = cardTrip?.sheet;
  if (cardTrip) cardTrip.sheet = null;
  if (sheet) done(sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-out", fill: "forwards" })).then(() => sheet.remove());
  if (reduceMotion()) return;
  const h1 = app.querySelector(".entry h1");
  if (h1) h1.innerHTML = h1.textContent.split(/(\s+)/).map((w) => (/^\s*$/.test(w) ? w : `<span class="w"><span>${esc(w)}</span></span>`)).join("");
  const rise = (el, delay, dist = 18) => el.animate(
    [{ opacity: 0, transform: `translateY(${dist}px)` }, { opacity: 1, transform: "none" }],
    { duration: 520, delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
  let t = sheet ? 120 : 0;
  app.querySelectorAll(".back, .entry .kicker").forEach((el) => rise(el, (t += 50)));
  h1?.querySelectorAll(".w > span").forEach((el) => el.animate(
    [{ transform: "translateY(105%)" }, { transform: "none" }],
    { duration: 620, delay: (t += 70), easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
  const specimen = app.querySelector(".specimen");
  if (specimen) rise(specimen, t + 60, 28);
  const later = [...app.querySelectorAll(".entry > .lede, .entry > .verdict-row, .entry > .notice, .entry > .section, .specimen .label-card, .specimen .actions")];
  const fold = innerHeight - 40;
  const below = [];
  for (const el of later) {
    if (el.getBoundingClientRect().top < fold) rise(el, (t += 70));
    else below.push(el);
  }
  // Sections further down rise as they scroll into view.
  if (!below.length || !("IntersectionObserver" in window)) return;
  below.forEach((el) => el.classList.add("pre-rise"));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    e.target.classList.remove("pre-rise");
    rise(e.target, 0);
  }), { rootMargin: "0px 0px -8% 0px" });
  below.forEach((el) => io.observe(el));
}

async function leaveGuide(href) {
  const page = app.querySelector(".page");
  if (page) await done(page.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(10px)" }], { duration: 180, easing: "ease-in", fill: "forwards" }));
  location.hash = href;
}

async function returnToCard() {
  const trip = cardTrip;
  cardTrip = null;
  if (!trip || reduceMotion()) return;
  if (route(location.hash) === trip.from) window.scrollTo(0, trip.y);
  const cardEl = app.querySelector(`a.card[data-key="${CSS.escape(trip.id)}"]`);
  if (!cardEl) return;
  let r = cardEl.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) { cardEl.scrollIntoView({ block: "center" }); r = cardEl.getBoundingClientRect(); }
  const look = getComputedStyle(cardEl);
  const sheet = cardSheet(FULL);
  sheet.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
  const ghost = cardGhost(cardEl, r);
  ghost.style.opacity = "0";
  cardEl.style.visibility = "hidden";
  ghost.animate([{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: 480, fill: "forwards" });
  await done(sheet.animate([
    { clipPath: FULL, backgroundColor: sheet.style.backgroundColor },
    { clipPath: clipAt(r, look.borderRadius), backgroundColor: look.backgroundColor },
  ], { duration: 480, easing: "cubic-bezier(.65,0,.25,1)", fill: "forwards" }));
  cardEl.style.visibility = "";
  sheet.remove();
  ghost.remove();
}

document.addEventListener("click", (e) => {
  if (e.target.closest?.("[data-act=clear]")) { state.q = ""; state.chip = "all"; state.track = "all"; render(); document.getElementById("q")?.focus(); return; }
  const copy = e.target.closest?.("[data-act=copy]");
  if (copy) {
    navigator.clipboard?.writeText(copy.dataset.text || "").then(() => { copy.textContent = "Copied"; setTimeout(() => (copy.textContent = "Copy the post"), 1600); }, () => {});
    return;
  }
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduceMotion()) return;
  const cardEl = e.target.closest?.("a.card[data-key]");
  if (cardEl && app.contains(cardEl)) {
    e.preventDefault();
    if (!cardTrip?.sheet) openCard(cardEl);
    return;
  }
  const back = e.target.closest?.("a.back");
  if (back && app.contains(back) && route(location.hash).startsWith("idea/")) {
    e.preventDefault();
    leaveGuide(back.getAttribute("href"));
  }
});

function render() {
  hideTip();
  const route = location.hash.replace(/^#\/?/, "");
  const [head, arg] = route.split("/");
  if (head === "idea" && arg) return ideaPage(decodeURIComponent(arg));
  if (head === "topic" && arg) { app.innerHTML = topicPage(arg); bindCards(); return returnToCard(); }
  if (head === "about") { cardTrip = null; app.innerHTML = aboutPage(); return; }
  state.view = ["topics", "map"].includes(head) ? head : "shelf";
  const body = state.view === "topics" ? topicsView() : state.view === "map" ? mapView() : shelfView();
  app.innerHTML = `<div class="page">${header()}${controls()}<div id="body">${body}</div></div>`;
  bindControls();
  bindCards();
  returnToCard();
}

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// FLIP re-render: survivors glide to their new slot, leavers drop away, arrivals rise in.
async function rerenderBody(fresh = false) {
  const el = document.getElementById("body");
  if (!el) return;
  hideTip();
  // A style switch changes what each idea looks like, so nothing glides; everything arrives fresh.
  const before = fresh ? new Map() : new Map([...el.querySelectorAll("[data-key]")].map((n) => [n.dataset.key, n.getBoundingClientRect()]));
  const next = document.createElement("div");
  next.innerHTML = shelfView();
  const nextKeys = new Set([...next.querySelectorAll("[data-key]")].map((n) => n.dataset.key));
  const leaving = fresh ? [] : [...el.querySelectorAll("[data-key]")].filter((n) => !nextKeys.has(n.dataset.key));
  const token = (rerenderBody.token = (rerenderBody.token || 0) + 1);
  if (leaving.length && !reduceMotion()) {
    await Promise.all(leaving.map((n) => n.animate(
      n.classList.contains("spine")
        ? [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(36px) rotate(4deg)", opacity: 0 }]
        : [{ transform: "scale(1)", opacity: 1 }, { transform: "translateY(14px) scale(.94)", opacity: 0 }],
      { duration: 180, easing: "ease-in", fill: "forwards" }).finished.catch(() => {})));
    if (token !== rerenderBody.token) return;
  }
  el.replaceChildren(...next.childNodes);
  bindCards();
  bindShelfStyles();
  if (reduceMotion()) return;
  let arrival = 0;
  el.querySelectorAll("[data-key]").forEach((n) => {
    const old = before.get(n.dataset.key);
    const now = n.getBoundingClientRect();
    if (old) {
      const dx = old.left - now.left, dy = old.top - now.top;
      if (dx || dy) n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
    } else {
      const delay = Math.min(arrival++ * 45, 360);
      n.animate(
        n.classList.contains("spine")
          ? [{ transform: "translateY(60px)", opacity: 0 }, { transform: "translateY(-6px)", opacity: 1, offset: .75 }, { transform: "translateY(0)", opacity: 1 }]
          : [{ transform: "translateY(18px) scale(.95)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 460, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    }
  });
  document.querySelectorAll("[data-chip]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.chip === state.chip)));
}

function bindChips() {
  document.querySelectorAll("[data-chip]").forEach((b) => b.addEventListener("click", () => { state.chip = b.dataset.chip; rerenderBody(); }));
}

function bindControls() {
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { location.hash = b.dataset.view === "shelf" ? "#/" : `#/${b.dataset.view}`; }));
  bindChips();
  document.querySelectorAll("[data-track]").forEach((b) => b.addEventListener("click", () => {
    state.track = b.dataset.track;
    state.chip = "all";
    document.querySelectorAll("[data-track]").forEach((x) => { const on = x.dataset.track === state.track; x.setAttribute("aria-checked", String(on)); x.setAttribute("aria-selected", String(on)); });
    const box = document.getElementById("chips");
    if (box) { box.innerHTML = chips(); bindChips(); }
    rerenderBody();
  }));
  const q = document.getElementById("q");
  q?.addEventListener("input", () => { state.q = q.value; if (state.view !== "shelf") { location.hash = "#/"; } else rerenderBody(); });
  document.getElementById("sort")?.addEventListener("change", (e) => { state.sort = e.target.value; rerenderBody(); });
  document.querySelector("[data-act=newest]")?.addEventListener("click", (e) => { state.sort = "newest"; state.chip = "all"; e.currentTarget.remove(); rerenderBody(); });
  document.querySelectorAll("[data-style]").forEach((b) => b.addEventListener("click", () => {
    state.style = b.dataset.style;
    store.set("granted:style", state.style);
    document.querySelectorAll("[data-style]").forEach((x) => { const on = x.dataset.style === state.style; x.setAttribute("aria-checked", String(on)); x.setAttribute("aria-selected", String(on)); });
    rerenderBody(true);
  }));
  bindShelfStyles();
}

function tipEl() {
  let t = document.getElementById("spine-tooltip");
  if (!t) { t = document.createElement("div"); t.id = "spine-tooltip"; t.className = "spine-tooltip"; t.setAttribute("role", "tooltip"); document.body.appendChild(t); }
  return t;
}
function showTip(s) {
  const t = tipEl();
  t.innerHTML = `<b>${esc(s.dataset.tip)}</b>${esc(s.dataset.tipMeta)}`;
  t.classList.add("on");
  const b = s.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  const left = Math.max(8, Math.min(innerWidth - w - 8, b.left + b.width / 2 - w / 2));
  const top = Math.max(8, b.top - h - 24);
  t.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
function hideTip() { document.getElementById("spine-tooltip")?.classList.remove("on"); }
// Scrolling hides the label, except the scroll that bringing a keyboard-selected book into view causes.
let keepTipUntil = 0;
const hideTipOnScroll = () => { if (performance.now() > keepTipUntil) hideTip(); };
addEventListener("scroll", hideTipOnScroll, { passive: true });
function focusSpine(s) {
  keepTipUntil = performance.now() + 400;
  s.scrollIntoView({ block: "nearest", inline: "nearest" });
  // Leave room above the book for the lift and its label.
  const top = s.getBoundingClientRect().top;
  if (top < 96) scrollBy({ top: top - 96 });
  s.focus({ preventScroll: true, focusVisible: true });
  setTimeout(() => { if (document.activeElement === s) showTip(s); }, 220);
}

function bindShelfStyles() {
  const spines = [...document.querySelectorAll("[data-book]")];
  document.querySelector(".books")?.addEventListener("scroll", hideTipOnScroll, { passive: true });
  spines.forEach((s, n) => {
    s.addEventListener("pointerenter", () => showTip(s));
    s.addEventListener("pointerleave", hideTip);
    s.addEventListener("focus", () => showTip(s));
    s.addEventListener("blur", hideTip);
    s.addEventListener("click", () => { hideTip(); openBook(s.dataset.book, s); });
    s.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (step) {
        e.preventDefault();
        focusSpine(spines[(n + step + spines.length) % spines.length]);
      }
    });
  });
}

function bindCards() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: none)").matches) return;
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const b = el.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      el.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
      el.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
      el.style.setProperty("--foil", `${Math.round(px * 360)}deg`);
      el.style.setProperty("--shine", `${Math.round(px * 100)}%`);
    });
    el.addEventListener("pointerleave", () => { el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); });
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement?.id !== "q") { const q = document.getElementById("q"); if (q) { e.preventDefault(); q.focus(); } }
  // Arrow keys walk the bookshelf from anywhere on the page, not only after tabbing onto a spine.
  if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
    const spines = [...document.querySelectorAll("[data-book]")];
    if (typing || !spines.length || document.querySelector(".spread-host") || spines.includes(document.activeElement)) return;
    e.preventDefault();
    focusSpine(e.key === "ArrowRight" ? spines[0] : spines[spines.length - 1]);
  }
});
window.addEventListener("hashchange", render);

(async function init() {
  const wanted = new URLSearchParams(location.search).get("style") || store.get("granted:style");
  if (STYLES.some(([k]) => k === wanted)) state.style = wanted;
  try {
    const data = await (await fetch("data/ideas.json", { cache: "no-cache" })).json();
    state.ideas = data.ideas || [];
    const sizes = {};
    for (const i of state.ideas) if (!i.superseded_by) sizes[i.category || "Uncategorised"] = (sizes[i.category || "Uncategorised"] || 0) + 1;
    Object.entries(sizes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([c], n) => paletteIndex.set(c, n % PALETTES.length));
  } catch {
    app.innerHTML = `<div class="page"><p class="empty">Could not load the library.</p></div>`;
    return;
  }
  render();
  const newest = state.ideas.reduce((m, i) => (i.date > m ? i.date : m), "");
  // Remember what was seen after a short look, so the "new since" pill reflects the next visit.
  setTimeout(() => newest && store.set("granted:lastSeen", newest), 4000);
})();
