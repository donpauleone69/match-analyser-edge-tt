/* Simulated screens. Nothing here is saved to the app. */
(function () {
  const params = new URLSearchParams(location.search);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const MATCHES = [
    { id: "m-new", opponent: "Lee", event: "Open trial", date: "", result: null },
    { id: "m-ready", opponent: "Kim", event: "County open", date: "2026-11-18", result: null },
    { id: "m-partial", opponent: "Sam", event: "Club night", date: "2026-11-15", result: [3, 1] },
    { id: "m-complete", opponent: "Pat", event: "League final", date: "2026-11-09", result: [3, 2] },
    { id: "m-h1", opponent: "Alex", event: "Junior GP", date: "2026-11-02", result: [3, 0] },
    { id: "m-h2", opponent: "Jo", event: "Junior GP", date: "2026-11-02", result: [1, 3] },
    { id: "m-h3", opponent: "Kim", event: "League", date: "2026-10-26", result: [3, 2] },
    { id: "m-h4", opponent: "Sam", event: "Club night", date: "2026-10-19", result: [2, 1] },
    { id: "m-h5", opponent: "Max", event: "County open", date: "2026-10-12", result: [3, 1] },
    { id: "m-h6", opponent: "Pat", event: "League", date: "2026-10-05", result: [2, 3] },
    { id: "m-h7", opponent: "Alex", event: "Nationals", date: "2026-09-21", result: [3, 1] },
    { id: "m-h8", opponent: "Jo", event: "Nationals", date: "2026-09-21", result: [0, 3] },
    { id: "m-h9", opponent: "Lee", event: "League", date: "2026-09-07", result: [3, 1] },
    { id: "m-h10", opponent: "Max", event: "Junior GP", date: "2026-08-25", result: [3, 2] },
  ];

  function setRow(id, me, them, tagged, extra) {
    return Object.assign({ id, me: String(me), them: String(them), tagged }, extra || {});
  }

  const SETS = {
    "m-new": { sets: [setRow(1, "", "", "Not tagged")] },
    "m-ready": { sets: [setRow(1, "", "", "Not tagged")] },
    "m-partial": {
      sets: [
        setRow(1, 11, 7, "11 - 7"),
        setRow(2, 9, 11, "4 - 3 so far", { progress: true }),
        setRow(3, 11, 8, "Not tagged"),
        setRow(4, 11, 6, "Not tagged"),
      ],
    },
    "m-complete": {
      sets: [
        setRow(1, 11, 8, "11 - 8"),
        setRow(2, 9, 11, "8 - 11"),
        setRow(3, 11, 6, "11 - 6"),
        setRow(4, 7, 11, "7 - 11"),
        setRow(5, 11, 9, "11 - 9"),
      ],
    },
    "m-h1": { sets: [setRow(1, 11, 5, "11 - 5"), setRow(2, 11, 7, "11 - 7"), setRow(3, 11, 4, "11 - 4")] },
    "m-h2": { sets: [setRow(1, 11, 8, "11 - 8"), setRow(2, 6, 11, "6 - 11"), setRow(3, 9, 11, "9 - 11"), setRow(4, 4, 11, "4 - 11")] },
    "m-h3": {
      sets: [
        setRow(1, 11, 9, "11 - 9"),
        setRow(2, 9, 11, "9 - 11"),
        setRow(3, 11, 7, "11 - 7"),
        setRow(4, 8, 11, "8 - 11"),
        setRow(5, 9, 7, "9 - 7"),
      ],
    },
    "m-h4": { sets: [setRow(1, 11, 9, "11 - 9"), setRow(2, 8, 11, "8 - 11"), setRow(3, 11, 6, "11 - 6")] },
    "m-h5": { sets: [setRow(1, 11, 7, "11 - 7"), setRow(2, 11, 8, "11 - 8"), setRow(3, 6, 11, "Not tagged"), setRow(4, 11, 5, "11 - 5")] },
    "m-h6": {
      sets: [
        setRow(1, 11, 9, "11 - 9"),
        setRow(2, 9, 11, "9 - 11"),
        setRow(3, 11, 7, "11 - 7"),
        setRow(4, 6, 11, "6 - 11"),
        setRow(5, 9, 11, "9 - 11"),
      ],
    },
    "m-h7": { sets: [setRow(1, 11, 6, "11 - 6"), setRow(2, 11, 9, "11 - 9"), setRow(3, 7, 11, "7 - 11"), setRow(4, 11, 8, "11 - 8")] },
    "m-h8": { sets: [setRow(1, 5, 11, "5 - 11"), setRow(2, 8, 11, "8 - 11"), setRow(3, 3, 11, "3 - 11")] },
    "m-h9": { sets: [setRow(1, 11, 7, "11 - 7"), setRow(2, 11, 9, "11 - 9"), setRow(3, 9, 11, "9 - 11"), setRow(4, 11, 4, "11 - 4")] },
    "m-h10": {
      sets: [
        setRow(1, 11, 8, "11 - 8"),
        setRow(2, 7, 11, "7 - 11"),
        setRow(3, 11, 9, "11 - 9"),
        setRow(4, 10, 12, "10 - 12"),
        setRow(5, 11, 6, "11 - 6"),
      ],
    },
  };

  const RESULTS = [
    ["Best of 3", [[2, 0], [2, 1], [1, 2], [0, 2]]],
    ["Best of 5", [[3, 0], [3, 1], [3, 2], [2, 3], [1, 3], [0, 3]]],
    ["Best of 7", [[4, 0], [4, 1], [4, 2], [4, 3], [3, 4], [2, 4], [1, 4], [0, 4]]],
  ];

  const INSIGHTS = [
    {
      id: "phases",
      title: "Phases",
      value: "52%",
      sub: "Won 431 of 825 · China team marks · Solid",
      columns: ["You", "Them", "Grade"],
      rows: [
        { label: "Serve to 5th", weak: true, you: ["55%", "of 302"], them: ["51%", "of 290"], grade: "Below" },
        { label: "Receive to 4th", you: ["60%", "of 235"], them: ["56%", "of 246"], grade: "Excellent" },
        { label: "Rally", you: ["43%", "of 288"], them: ["38%", "of 289"], grade: "Pass" },
      ],
      playlist: "Lost on serve to 5th",
      count: 137,
      about: [
        "Points you won, split the way China's coaches split a match.",
        "The player who misses is charged on that ball. The player who wins is credited on the ball before.",
        "Serve to 5th is your 1st, 3rd and 5th when you served. Receive to 4th is your receive, 2nd and 4th when they served. Rally is the rest.",
        "The grade is the China team marks from Zhang 2004. It needs 20 of your points in that row. Only you are graded.",
        "Across the matches in the filter. Each point counts once.",
        "A grade here needs 100 of your points in the row.",
      ],
    },
    {
      id: "serve",
      title: "Serve",
      value: "50%",
      sub: "Won 210 of 416 on your serve · Solid",
      compare: "Them 46% · Elite 51%",
      rows: [
        { label: "Ace or fault", single: "won 9 of 15" },
        { label: "They attacked", single: "won 45 of 87", detail: "52%" },
        { label: "You attacked 3rd", single: "won 36 of 77", detail: "47%" },
        { label: "No attack by 3rd", single: "won 120 of 237", detail: "51%" },
      ],
      playlist: "Lost on your serve",
      count: 206,
      about: [
        "Every point you served, including aces and faults.",
        "The rows are the first three shots: their attack on the receive, your attack on the 3rd ball, or neither.",
        "Elite 51% is elite men on serve, from Djokic 2020. Lets are not counted.",
        "Across the matches in the filter. Each point counts once.",
      ],
    },
    {
      id: "receive",
      title: "Receive",
      value: "54%",
      sub: "Won 221 of 409 on their serve · Solid",
      compare: "Them 50% · Elite 49%",
      rows: [],
      about: [
        "Every point they served.",
        "The rows show whether you attacked the receive, they attacked the 3rd ball, or neither.",
        "Elite 49% is the same study, Djokic 2020, from the receiver's side.",
        "Across the matches in the filter. Each point counts once.",
      ],
    },
  ];

  const state = {
    screen: params.get("screen") || "tagger",
    mode: params.get("mode") || "answer",
    matchId: params.get("match") || (params.get("screen") === "details" ? "m-complete" : "m-partial"),
    pin: params.get("focus") !== "0",
    filters: { opponent: "Any", event: "Any", status: "Any" },
    iFilters: { dates: "Any", opponent: "Any", event: "Any", from: "", to: "" },
    draft: null,
    iDraft: null,
    filterOpen: false,
    playing: null,
    flipped: null,
    playOn: false,
    muted: false,
    speed: 1,
    seek: 64,
    settings: false,
    loop: true,
    pressed: null,
    toast: null,
    editKind: "rally",
    editAt: 1,
    reviewAt: 1,
    marked: true,
    edits: {},
    pending: null,
    confirmDelete: false,
  };

  const app = document.getElementById("app");

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function icon(name, size) {
    const filled = name === "play" || name === "pause" || name === "rew" || name === "fwd";
    const paths = {
      list: '<path d="M9 7h11M9 12h11M9 17h11"/><path d="M5 7h.01M5 12h.01M5 17h.01"/>',
      chart: '<path d="M5 19V10M12 19V5M19 19v-7"/>',
      user: '<circle cx="12" cy="8" r="3"/><path d="M5 19c1.5-3 3.8-4.5 7-4.5S17.5 16 19 19"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
      back: '<path d="M15 5 8 12l7 7"/>',
      play: '<path d="M8 5.5v13l11-6.5-11-6.5z"/>',
      pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z"/>',
      rew: '<path d="M11 7 5 12l6 5V7zM19 7l-6 5 6 5V7z"/>',
      fwd: '<path d="M13 7v10l6-5-6-5zM5 7v10l6-5-6-5z"/>',
      vol: '<path d="M4 10h3l4-3v10l-4-3H4zM16 9a4 4 0 0 1 0 6"/>',
      mute: '<path d="M4 10h3l4-3v10l-4-3H4zM16 10l4 4M20 10l-4 4"/>',
      gear: '<path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="1.6" fill="currentColor"/><circle cx="15" cy="16" r="1.6" fill="currentColor"/>',
      info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
      down: '<path d="M12 5v10M8 11l4 4 4-4M6 19h12"/>',
      close: '<path d="M7 7l10 10M17 7 7 17"/>',
      star: '<path d="m12 4 2.1 4.4 4.9.7-3.5 3.4.8 4.8L12 15.8 7.7 17.3l.8-4.8L5 9.1l4.9-.7L12 4z"/>',
      check: '<path d="M5 12.5 9.2 17 19 7"/>',
    };
    const paint = filled
      ? 'fill="currentColor" stroke="none"'
      : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
    return `<svg class="icon" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" aria-hidden="true" ${paint}>${paths[name] || ""}</svg>`;
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]}`;
  }

  function resultText(result) {
    if (!result) return "";
    const [me, them] = result;
    const score = `${me} - ${them}`;
    if (me > them) return `Won ${score}`;
    if (them > me) return `Lost ${score}`;
    return score;
  }

  function rowLine(match) {
    const event = match.opponent.trim() ? match.event.trim() : "";
    return [fmtDate(match.date), resultText(match.result), event].filter(Boolean).join(" · ");
  }

  function statusOf(match) {
    if (match.id === "m-new") return { text: "No video", button: false };
    if (match.id === "m-ready") return { text: "Not tagged", button: false };
    if (match.id === "m-partial") return { text: "Continue set 2", button: true };
    return { text: "Tagged", button: false };
  }

  function phase(match) {
    if (match.id === "m-new" || match.id === "m-ready") return "not";
    if (match.id === "m-partial") return "part";
    return "tagged";
  }

  function matchBy(id) {
    return MATCHES.find((m) => m.id === id) || MATCHES[2];
  }

  function editOf(id) {
    if (!state.edits[id]) {
      const match = matchBy(id);
      const src = SETS[id];
      state.edits[id] = {
        opponent: match.opponent,
        event: match.event,
        date: match.date,
        result: match.result ? match.result.slice() : null,
        sets: src.sets.map((s) => Object.assign({}, s)),
      };
    }
    return state.edits[id];
  }

  function differs(set) {
    if (set.progress || set.tagged === "Not tagged" || String(set.tagged).includes("so far")) return false;
    return set.tagged !== `${set.me} - ${set.them}`;
  }

  function taggedPool() {
    return MATCHES.filter((m) => m.id !== "m-new" && m.id !== "m-ready");
  }

  function keptInsights() {
    const f = state.iFilters;
    const today = new Date(2026, 10, 21);
    return taggedPool().filter((m) => {
      if (f.opponent !== "Any" && m.opponent !== f.opponent) return false;
      if (f.event !== "Any" && m.event !== f.event) return false;
      if (f.dates === "Any" || !m.date) return f.dates === "Any";
      const [y, mo, d] = m.date.split("-").map(Number);
      const when = new Date(y, mo - 1, d);
      const days = (today - when) / 86400000;
      if (f.dates === "Last 30 days") return days <= 30;
      if (f.dates === "Last 3 months") return days <= 92;
      if (f.dates === "Last 12 months") return days <= 365;
      if (f.dates === "Last 5 matches") return taggedPool().indexOf(m) < 5;
      if (f.dates === "From and to") {
        if (f.from && m.date < f.from) return false;
        if (f.to && m.date > f.to) return false;
      }
      return true;
    });
  }

  function choices(list, key) {
    return ["Any", ...new Set(list.map((m) => m[key]).filter(Boolean))];
  }

  function go(screen, extra) {
    state.screen = screen;
    state.pin = false;
    state.settings = false;
    state.filterOpen = false;
    state.toast = null;
    if (extra) Object.assign(state, extra);
    render(false);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "preview-nav", screen: state.screen, mode: state.mode }, "*");
    }
  }

  function toast(text) {
    state.toast = text;
    render(true);
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      state.toast = null;
      render(true);
    }, 2500);
  }

  function nav(current) {
    const items = [
      ["matches", "list", "Matches"],
      ["insights", "chart", "Insights"],
      ["account", "user", "Account"],
    ];
    return items
      .map(
        ([id, glyph, label]) =>
          `<button type="button" class="nav-item" data-act="nav" data-screen="${id}" ${current === id ? 'aria-current="page"' : ""}>${icon(glyph, 20)}<span>${label}</span></button>`,
      )
      .join("");
  }

  function shell(inner, flags) {
    const match = flags.match;
    const tagger = flags.tagger;
    return `<div class="shell${match ? " is-match" : ""}${tagger ? " is-tagger" : ""}">
      ${match ? "" : `<nav class="nav-rail" aria-label="Main">${nav(flags.nav)}</nav>`}
      <main class="main" id="main">${inner}</main>
      ${match ? "" : `<nav class="nav-bar" aria-label="Main">${nav(flags.nav)}</nav>`}
      ${flags.overlay || ""}
    </div>`;
  }

  function topRow(innerClass, body) {
    return `<header class="top-row"><div class="top-inner ${innerClass}">${body}</div></header>`;
  }

  function filterButton(count, label) {
    const pin = state.pin && state.screen === "insights" ? "" : "";
    return `<button type="button" class="btn btn-icon" data-act="filter" aria-label="Filter" aria-expanded="${state.filterOpen ? "true" : "false"}" style="position:relative">${icon("filter", 20)}${count ? `<span class="badge badge-count">${count}</span>` : ""}</button>`;
  }

  function chip(text, act) {
    return `<button type="button" class="btn" data-act="${act}" data-chip="${esc(text)}" aria-label="Remove ${esc(text)}">${esc(text)} ${icon("close", 16)}</button>`;
  }

  function filterMarkup(fieldsHtml, clearAct, applyAct) {
    return `<div class="fields">${fieldsHtml}</div><div class="actions-split filter-actions"><button type="button" class="btn btn-lg btn-quiet" data-act="${clearAct}">Clear</button><button type="button" class="btn btn-lg btn-primary" data-act="${applyAct}">Apply</button></div>`;
  }

  function filterChrome(fieldsHtml, clearAct, applyAct) {
    const body = filterMarkup(fieldsHtml, clearAct, applyAct);
    if (!state.filterOpen) return { inline: "", overlay: "" };
    const narrow = window.matchMedia("(max-width: 639px)").matches;
    if (narrow) {
      return {
        inline: "",
        overlay: `<div class="overlay" data-filter-surface><button type="button" class="scrim" data-act="filter" aria-label="Close filters"></button><div class="sheet" role="dialog" aria-label="Filters"><h2>Filter</h2>${body}</div></div>`,
      };
    }
    return { inline: `<div class="card filter-panel stack" data-filter-surface>${body}</div>`, overlay: "" };
  }

  function selectField(id, label, value, options, act) {
    const opts = options
      .map((o) => {
        const v = Array.isArray(o) ? o[0] : o;
        const t = Array.isArray(o) ? o[1] : o;
        return `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(t)}</option>`;
      })
      .join("");
    return `<label class="field-row"><span class="lbl">${esc(label)}</span><span class="select-wrap"><select class="select" id="${id}" data-act="${act}" data-key="${esc(label)}">${opts}</select><span class="chev" aria-hidden="true"></span></span></label>`;
  }

  function picture() {
    return `<div class="picture" role="img" aria-label="Still of a table, standing in for the match video">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="hall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#16242c"/>
            <stop offset="1" stop-color="#070b10"/>
          </linearGradient>
          <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2f74c8"/>
            <stop offset="1" stop-color="#1a4e96"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#hall)"/>
        <polygon points="160,900 1440,900 1200,560 400,560" fill="#1b2822"/>
        <polygon points="250,470 1350,470 1520,780 80,780" fill="url(#top)"/>
        <polygon points="250,470 1350,470 1520,780 80,780" fill="none" stroke="#f4f7fb" stroke-width="10"/>
        <line x1="800" y1="470" x2="800" y2="780" stroke="#f4f7fb" stroke-width="4"/>
        <polygon points="80,780 1520,780 1560,820 40,820" fill="#14386e"/>
        <line x1="170" y1="625" x2="1430" y2="625" stroke="rgba(255,255,255,.85)" stroke-width="3"/>
        <rect x="792" y="430" width="16" height="230" rx="2" fill="#e7eef6"/>
        <rect x="786" y="448" width="28" height="150" fill="rgba(255,255,255,.18)"/>
        <circle cx="980" cy="540" r="16" fill="#f3efe4"/>
        <circle cx="974" cy="534" r="5" fill="#fff" opacity=".7"/>
      </svg>
    </div>`;
  }

  function pillsFor(me, them) {
    const low = Math.min(me, them);
    const winner = me >= them ? "a" : "b";
    const out = [];
    for (let i = 0; i < low; i++) out.push("a", "b");
    for (let i = 0; i < Math.abs(me - them); i++) out.push(winner);
    return out;
  }

  const HERO_PILLS = ["a", "a", "b", "a", "b", "b", "a"];

  function taggerModel() {
    if (state.mode === "saved") {
      const pills = pillsFor(11, 7);
      return {
        who: "Sam",
        setNo: 1,
        sets: [0, 0],
        points: [11, 7],
        server: null,
        pills,
        open: null,
        head: "18 You",
        headSide: "a",
        headOpen: false,
        score: "10 - 7",
        shots: [
          { n: 1, side: "a", done: true },
          { n: 2, side: "b", done: true },
          { n: 3, side: "a", done: true, fa: true },
          { n: 4, side: "b", done: true },
        ],
        empty: true,
      };
    }
    return {
      who: "Sam",
      setNo: 2,
      sets: [1, 0],
      points: [4, 3],
      server: "a",
      pills: HERO_PILLS,
      open: "a",
      head: state.mode === "watch" ? "8 You" : "8 You",
      headSide: "a",
      headOpen: state.mode === "watch",
      score: state.mode === "review" ? "3 - 3" : "4 - 3",
      headText: state.mode === "review" ? "7 You" : "8 You",
      shots: [
        { n: 1, side: "a", done: true },
        { n: 2, side: "b", done: true },
        { n: 3, side: "a", done: true, fa: true },
        { n: 4, side: "b", done: state.mode !== "answer", open: state.mode === "answer", current: state.mode === "answer" },
      ],
    };
  }

  function regions() {
    if (state.mode === "saved") return [];
    if (state.mode === "watch") return [{ key: "play", row: 0, span: true, label: "Play", tone: "action" }];
    if (state.mode === "answer") {
      return [
        { key: "bh-a", row: 0, column: 1, label: "BH Attack", tone: "bh" },
        { key: "fh-a", row: 0, column: 2, label: "FH Attack", tone: "fh" },
        { key: "bh-c", row: 1, column: 1, label: "BH Control", tone: "bh-soft" },
        { key: "fh-c", row: 1, column: 2, label: "FH Control", tone: "fh-soft" },
      ];
    }
    if (state.mode === "review") {
      const parts = ["Opening", "Attack", "End"];
      const part = parts[state.reviewAt];
      return [
        { key: "back", row: 0, column: 1, label: "Back", tone: "step", dim: state.reviewAt === 0 },
        { key: "fwd", row: 0, column: 2, label: "Forward", tone: "step", dim: state.reviewAt === parts.length - 1 },
        { key: "mark", row: 1, column: 1, label: `Review ${part}`, tone: state.marked && part === "Attack" ? "mark" : "step" },
      ];
    }
    const n = state.editAt + 1;
    const rallyOn = state.editKind === "rally";
    return [
      { key: "rallies", row: 0, column: 1, short: true, label: "Rallies", tone: rallyOn ? "action" : "idle", pressed: rallyOn },
      { key: "gaps", row: 0, column: 2, short: true, label: "Gaps", tone: rallyOn ? "idle" : "action", pressed: !rallyOn },
      { key: "back", row: 1, column: 1, label: "Back", tone: "step", dim: state.editAt === 0 },
      { key: "fwd", row: 1, column: 2, label: "Forward", tone: "step", dim: state.editAt >= HERO_PILLS.length - 1 },
      rallyOn
        ? { key: "edit", row: 2, column: 1, label: `Edit Rally ${n}`, tone: "step" }
        : { key: "insert", row: 2, column: 1, label: `Insert rally ${n}`, tone: "action" },
      rallyOn
        ? { key: "delete", row: 2, column: 2, label: `Delete rally ${n}`, tone: "destructive" }
        : null,
      { key: "save", row: 3, column: 2, label: "Save set", tone: "action" },
    ].filter(Boolean);
  }

  function regionBtn(region) {
    const pressed = state.pressed === region.key || region.pressed;
    return `<button type="button" class="region tone-${region.tone}${region.dim ? " is-dim" : ""}" data-act="region" data-key="${region.key}" ${pressed ? 'aria-pressed="true"' : ""} ${region.dim ? 'aria-disabled="true"' : ""}>${esc(region.label)}</button>`;
  }

  function padHtml(list) {
    if (!list.length) return `<div class="pad" data-empty="true"></div>`;
    const rows = [...new Set(list.map((r) => r.row))].sort((a, b) => a - b);
    const body = rows
      .map((row) => {
        const span = list.find((r) => r.row === row && r.span);
        const short = list.some((r) => r.row === row && r.short);
        if (span) return `<div class="pad-row${short ? " is-short" : ""}">${regionBtn(span)}</div>`;
        const left = list.find((r) => r.row === row && r.column === 1);
        const right = list.find((r) => r.row === row && r.column === 2);
        return `<div class="pad-row is-split${short ? " is-short" : ""}">${left ? regionBtn(left) : "<div></div>"}${right ? regionBtn(right) : "<div></div>"}</div>`;
      })
      .join("");
    return `<div class="pad">${body}</div>`;
  }

  function wingHtml(list, column) {
    const rows = [...new Set(list.map((r) => r.row))].sort((a, b) => a - b);
    const template = rows.map((row) => (list.some((r) => r.row === row && r.short) ? "var(--size-short-row)" : "minmax(0,1fr)")).join(" ");
    const cells = rows
      .map((row) => {
        const region = list.find((r) => r.row === row && (r.span || r.column === column));
        return `<div class="wing-cell">${region ? regionBtn(region) : ""}</div>`;
      })
      .join("");
    const side = column === 1 ? "left" : "right";
    return `<div class="wing wing-${side}" style="grid-template-rows:${rows.length ? template : "none"}">${cells}</div>`;
  }

  function shotHtml(shot) {
    if (state.mode === "review") return "";
    const open = shot.open ? ` is-open${shot.side === "a" ? " is-a" : ""}` : "";
    const fa = shot.fa ? " is-fa" : "";
    const current = shot.current ? " is-current" : "";
    const mark = shot.done ? icon("check", 10) : "";
    return `<button type="button" class="shot shot-${shot.side}${open}${fa}${current}" data-act="shot" data-n="${shot.n}" aria-label="Shot ${shot.n}${shot.fa ? ", first attack" : ""}"><span class="num">${shot.n}</span>${mark}</button>`;
  }

  function reviewBlock() {
    const parts = ["Opening", "Attack", "End"];
    return `<div class="review-grid">${parts
      .map((part, i) => {
        const current = i === state.reviewAt ? " is-current" : "";
        const marked = part === "Attack" && state.marked ? " is-marked" : "";
        return `<button type="button" class="chip-hit" data-act="part" data-i="${i}"><span class="chip${current}${marked}">${part}</span></button><span class="part-line${marked}"></span>`;
      })
      .join("")}</div>`;
  }

  function reviewChips() {
    const parts = ["Opening", "Attack", "End"];
    return parts
      .map((part, i) => {
        const current = i === state.reviewAt ? " is-current" : "";
        const marked = part === "Attack" && state.marked ? " is-marked" : "";
        return `<button type="button" class="chip-hit" data-act="part" data-i="${i}"><span class="chip${current}${marked}">${part}</span></button>`;
      })
      .join("");
  }

  function linesHtml(model) {
    if (state.mode === "review") {
      const widths = [72, 52, 36];
      return ["Opening", "Attack", "End"]
        .map((part, i) => `<span class="part-line${part === "Attack" && state.marked ? " is-marked" : ""}" style="width:${widths[i]}px"></span>`)
        .join("");
    }
    if (state.mode === "answer") {
      return `<span class="part-line" style="width:74px"></span><span class="part-line" style="width:36px"></span>`;
    }
    return `<span class="part-line" style="width:74px"></span><span class="part-line" style="width:36px"></span><span class="part-line" style="width:36px"></span>`;
  }

  function rallyHtml(model) {
    const headText = model.headText || model.head;
    const open = model.headOpen ? " is-open" : "";
    const side = model.headSide === "b" ? " is-b" : "";
    let actions = "";
    if (state.mode === "answer") {
      actions = `<button type="button" class="zone-hit" data-act="discard"><span class="zone-face">Discard</span></button>`;
    } else if (state.mode === "saved" || state.mode === "watch" || state.mode === "review") {
      const on = state.mode === "review";
      actions = `<button type="button" class="zone-hit is-star" data-act="star" aria-pressed="${on ? "true" : "false"}" aria-label="${on ? "Leave review" : "Review"}"><span class="zone-face">${icon("star", 16)}</span></button>
        <button type="button" class="zone-hit" data-act="edit-rally"><span class="zone-face">Edit Rally</span></button>`;
    } else {
      actions = `<button type="button" class="zone-hit" data-act="mode" data-mode="answer"><span class="zone-face">Cancel</span></button>`;
    }
    const shots = state.mode === "review" ? reviewBlock() : `<div class="shot-row">${model.shots.map(shotHtml).join("")}</div><div class="line-row">${linesHtml(model)}</div>`;
    return `<div class="head-row">
        <div class="head-cell${side}${open}">${esc(headText)}</div>
        <div class="head-score num">at ${esc(model.score)}</div>
        <div class="zone-actions">${actions}</div>
      </div>
      ${shots}`;
  }

  function setZone(model) {
    const pills = model.pills
      .map((side, i) => {
        const picked = state.mode === "edit" && i === state.editAt ? " is-picked" : "";
        return `<button type="button" class="zone-hit" data-act="pill" data-i="${i}" aria-label="Rally ${i + 1}"><span class="pill pill-${side}${picked}">${i + 1}</span></button>`;
      })
      .join("");
    const open =
      model.open != null
        ? `<button type="button" class="zone-hit" data-act="pill" data-i="${model.pills.length}" aria-label="Rally ${model.pills.length + 1}, open"><span class="pill pill-open${model.open === "b" ? " is-b" : ""}">${model.pills.length + 1}</span></button>`
        : "";
    const editOn = state.mode === "edit";
    return `<div class="pills">${pills}${open}</div>
      <button type="button" class="zone-hit" data-act="edit-set" aria-pressed="${editOn ? "true" : "false"}"><span class="zone-face">Edit Set</span></button>`;
  }

  function bug(model) {
    const row = (name, sets, points, server) =>
      `<span class="dot${server ? ` is-${server}` : ""}"></span><span class="nm">${esc(name)}</span><span class="sets num">${sets}</span><span class="num">${points}</span>`;
    return `<div class="bug" aria-label="Set ${model.setNo}. You ${model.points[0]}, ${model.who} ${model.points[1]}.">
      ${row("You", model.sets[0], model.points[0], model.server === "a" ? "a" : "")}
      ${row(model.who, model.sets[1], model.points[1], model.server === "b" ? "b" : "")}
    </div>`;
  }

  function seekHtml() {
    const spans = [
      [6, 5],
      [13, 4],
      [19, 5],
      [26, 4],
      [33, 6],
      [41, 4],
      [48, 5],
      [56, 7],
    ];
    const bars = spans
      .map((s, i) => `<span class="seek-span${i === spans.length - 1 ? " is-on" : ""}" style="left:${s[0]}%;width:${s[1]}%"></span>`)
      .join("");
    return `<button type="button" class="seek" data-act="seek" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.seek}">
      <span class="seek-track">${bars}<span class="seek-knob" style="left:${state.seek}%"></span></span>
    </button>`;
  }

  function tagger() {
    const model = taggerModel();
    const list = regions();
    const pin = state.pin ? " is-focus" : "";
    const speeds = ["0.5×", "1×", "1.5×", "2×"];
    const speedLabel = speeds[[0.5, 1, 1.5, 2].indexOf(state.speed)] || "1×";
    const toastHtml = state.toast
      ? `<div class="toast" role="status"><p>${esc(state.toast)}</p><button type="button" class="btn btn-chrome" data-act="undo">Undo</button></div>`
      : "";
    const menu = state.settings
      ? `<button type="button" class="scrim" data-act="settings" aria-label="Close settings"></button>
        <div class="menu" role="dialog" aria-label="Playback">
          <p>Loop the rally</p>
          <div class="segmented" role="group" aria-label="Loop the rally">
            <button type="button" data-act="loop" data-val="1" aria-pressed="${state.loop ? "true" : "false"}">On</button>
            <button type="button" data-act="loop" data-val="0" aria-pressed="${state.loop ? "false" : "true"}">Off</button>
          </div>
        </div>`
      : "";
    const body = `<div class="tagger">
      ${wingHtml(list, 1)}
      <div class="middle">
        <div class="video-zone">
          ${picture()}
          <div class="v-top">
            <button type="button" class="btn btn-icon btn-chrome on-video${pin}" data-act="back" aria-label="Back"${state.pin ? ' data-pin="focus"' : ""}>${icon("back", 20)}</button>
            ${bug(model)}
          </div>
          <div class="v-bot">
            <button type="button" class="btn btn-icon btn-chrome on-video" data-act="skip" data-dir="-1" aria-label="Back 5 seconds">${icon("rew", 20)}</button>
            <button type="button" class="btn btn-icon btn-chrome on-video" data-act="play" aria-label="${state.playOn ? "Pause" : "Play"}" aria-pressed="${state.playOn ? "true" : "false"}">${icon(state.playOn ? "pause" : "play", 20)}</button>
            <button type="button" class="btn btn-icon btn-chrome on-video" data-act="skip" data-dir="1" aria-label="Forward 5 seconds">${icon("fwd", 20)}</button>
            <button type="button" class="btn btn-chrome speed-btn on-video num" data-act="speed" aria-label="Speed ${speedLabel}">${speedLabel}</button>
            <button type="button" class="btn btn-icon btn-chrome on-video" data-act="mute" aria-label="${state.muted ? "Unmute" : "Mute"}" aria-pressed="${state.muted ? "true" : "false"}">${icon(state.muted ? "mute" : "vol", 20)}</button>
            <button type="button" class="btn btn-icon btn-chrome on-video" data-act="settings" aria-label="Settings" aria-expanded="${state.settings ? "true" : "false"}">${icon("gear", 20)}</button>
          </div>
          ${seekHtml()}
          ${toastHtml}
          ${menu}
        </div>
        <div class="set-zone">${setZone(model)}</div>
        <div class="rally-zone">${rallyHtml(model)}</div>
        ${padHtml(list)}
      </div>
      ${wingHtml(list, 2)}
    </div>`;
    return shell(body, { match: true, tagger: true });
  }

  function matches() {
    const f = state.filters;
    const shown = MATCHES.filter((m) => {
      if (f.opponent !== "Any" && m.opponent !== f.opponent) return false;
      if (f.event !== "Any" && m.event !== f.event) return false;
      if (f.status === "Not tagged") return phase(m) === "not";
      if (f.status === "Part tagged") return phase(m) === "part";
      if (f.status === "Tagged") return phase(m) === "tagged";
      return true;
    });
    const labels = [];
    if (f.opponent !== "Any") labels.push(`Opponent: ${f.opponent}`);
    if (f.event !== "Any") labels.push(`Event: ${f.event}`);
    if (f.status !== "Any") labels.push(`Status: ${f.status}`);
    const n = labels.length;
    const pin = state.pin;
    const rows = shown.length
      ? `<div class="list">${shown
          .map((m) => {
            const st = statusOf(m);
            const trail = st.button
              ? `<button type="button" class="btn${pin ? " is-focus" : ""}" data-act="open" data-id="${m.id}" data-dest="tagger">Continue set 2</button>`
              : `<span class="row-trail">${esc(st.text)}</span>`;
            return `<div class="row" role="link" tabindex="0" data-act="open" data-id="${m.id}" data-dest="${st.button ? "tagger" : "details"}">
              <span class="row-main"><span class="row-title">vs ${esc(m.opponent)}</span><span class="row-meta">${esc(rowLine(m) || m.event)}</span></span>
              ${trail}
            </div>`;
          })
          .join("")}</div>`
      : `<div class="callout callout-empty"><p>Nothing fits this filter.</p><button type="button" class="btn btn-primary btn-lg" data-act="clear-filters">Clear filter</button></div>`;
    const draft = state.draft || f;
    const surface = filterChrome(
      `${selectField("f-opp", "Opponent", draft.opponent, choices(MATCHES, "opponent"), "draft")}
        ${selectField("f-event", "Event", draft.event, choices(MATCHES, "event"), "draft")}
        ${selectField("f-status", "Status", draft.status, ["Any", "Not tagged", "Part tagged", "Tagged"], "draft")}`,
      "clear-filters",
      "apply",
    );
    const inline = surface.inline;
    const chips = labels.length ? `<div class="chips">${labels.map((label) => chip(label, "unchip")).join("")}</div>` : "";
    const overlay = surface.overlay;
    const body = `${topRow(
      "page-list",
      `<h1 class="top-title">Matches</h1><div class="top-end">${filterButton(n)}<button type="button" class="btn btn-quiet" data-act="new">${icon("plus", 16)} New</button></div>`,
    )}${chips}<div class="page page-list">${inline}${rows}</div>`;
    return shell(body, { nav: "matches", overlay });
  }

  function resultOptions(current) {
    const key = current ? `${current[0]}-${current[1]}` : "";
    const known = RESULTS.some((g) => g[1].some((r) => `${r[0]}-${r[1]}` === key));
    let html = `<option value=""${!key ? " selected" : ""}>Not entered</option>`;
    if (key && !known) html += `<option value="${key}" selected>${key.replace("-", " - ")}</option>`;
    html += RESULTS.map(
      ([label, rows]) =>
        `<optgroup label="${label}">${rows
          .map((r) => {
            const v = `${r[0]}-${r[1]}`;
            return `<option value="${v}"${v === key ? " selected" : ""}>${r[0]} - ${r[1]}</option>`;
          })
          .join("")}</optgroup>`,
    ).join("");
    return html;
  }

  function details() {
    const match = matchBy(state.matchId);
    const edit = editOf(match.id);
    const them = edit.opponent.trim() || "Opponent";
    const count = edit.result ? edit.result[0] + edit.result[1] : 0;
    const pin = state.pin ? " is-focus" : "";
    const tabs = ["insights", "details", "tag"]
      .map((id) => {
        const label = id[0].toUpperCase() + id.slice(1);
        const on = id === "details";
        return `<button type="button" class="tab" data-act="tab" data-tab="${id}" ${on ? 'aria-current="page"' : ""}>${label}</button>`;
      })
      .join("");
    let pendingHtml = "";
    if (state.pending) {
      const [me, themScore] = state.pending;
      const lost = edit.sets.filter((s) => s.id > me + themScore && (s.me !== "" || s.them !== ""));
      if (lost.length) {
        const names = lost.map((s) => `set ${s.id}`);
        const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
        pendingHtml = `<div class="callout callout-warning" role="alertdialog" aria-label="Change result">
          <p>${me} - ${themScore} gives ${me + themScore} sets. ${list[0].toUpperCase()}${list.slice(1)} ${lost.length === 1 ? "has" : "have"} entered scores that will be removed.</p>
          <div class="actions"><button type="button" class="btn" data-act="commit-result">Change to ${me} - ${themScore}</button><button type="button" class="btn btn-quiet" data-act="cancel-result">Keep ${edit.result ? edit.result.join(" - ") : "the result"}</button></div>
        </div>`;
      }
    }
    const differing = edit.sets.filter(differs);
    const scoresLine =
      differing.length > 1
        ? `<div class="callout callout-warning"><span>${differing.length} sets differ from tagging.</span><button type="button" class="btn" data-act="use-all">Use tagged scores</button></div>`
        : "";
    const rows = edit.sets
      .map((s) => {
        const badMe = s.me === "" && s.them !== "";
        const badThem = s.them === "" && s.me !== "";
        const flag = differs(s);
        const tagged = flag
          ? `<span class="num">${esc(s.tagged)}</span><span class="badge badge-flag">Differs</span><button type="button" class="btn" data-act="use-tagged" data-set="${s.id}">Use tagged</button><button type="button" class="btn btn-quiet" data-act="open-set" data-set="${s.id}">Open set ${s.id}</button>`
          : `<span class="${s.tagged.includes("-") || s.tagged.includes("so far") ? "" : "row-meta"}">${esc(s.tagged)}</span>`;
        const err = badMe || badThem ? `<p class="help is-error" id="err-${s.id}">Enter both scores</p>` : "";
        return `<tr>
          <td class="num">${s.id}</td>
          <td>
            <span class="score-pair">
              <input class="field score num" inputmode="numeric" aria-label="Set ${s.id}, your points" value="${esc(s.me)}" data-act="score" data-set="${s.id}" data-side="me" ${badMe ? 'aria-invalid="true"' : ""}>
              <span aria-hidden="true">-</span>
              <input class="field score num" inputmode="numeric" aria-label="Set ${s.id}, ${esc(them)} points" value="${esc(s.them)}" data-act="score" data-set="${s.id}" data-side="them" ${badThem ? `aria-invalid="true" aria-describedby="err-${s.id}"` : ""}>
            </span>
            ${err}
          </td>
          <td><div class="tagged-cell">${tagged}</div></td>
        </tr>`;
      })
      .join("");
    const deleteHtml = state.confirmDelete
      ? `<div class="callout callout-warning" role="alertdialog" aria-label="Delete match"><p>Delete this match and its tagging? This cannot be undone.</p><div class="actions"><button type="button" class="btn btn-danger" data-act="do-delete">Delete</button><button type="button" class="btn btn-quiet" data-act="cancel-delete">Cancel</button></div></div>`
      : `<button type="button" class="btn btn-quiet is-danger" data-act="delete">Delete match</button>`;
    const body = `${topRow(
      "page-form",
      `<button type="button" class="btn btn-icon btn-quiet" data-act="nav" data-screen="matches" aria-label="Back">${icon("back", 20)}</button>
       <div class="tabs" role="tablist">${tabs}</div>
       <div class="top-end"><span class="top-name">vs ${esc(them)}</span></div>`,
    )}
    <div class="page page-form">
      <div class="form-grid">
        <section class="card stack">
          <h2 class="card-title">Match</h2>
          <div class="fields">
            <label class="field-row"><span class="lbl">Opponent</span><input class="field${pin}" data-act="text" data-field="opponent" value="${esc(edit.opponent)}" placeholder="Who you played" ${state.pin ? 'data-pin="focus"' : ""}></label>
            <label class="field-row"><span class="lbl">Event</span><input class="field" data-act="text" data-field="event" value="${esc(edit.event)}"></label>
            <label class="field-row"><span class="lbl">Date</span><input class="field" type="date" data-act="text" data-field="date" value="${esc(edit.date)}"></label>
          </div>
        </section>
        <section class="card" id="result">
          <h2 class="card-title">Result</h2>
          <div class="result-line">
            <span>You</span>
            <span class="select-wrap" style="width:auto"><select class="select num" aria-label="Result" data-act="result" style="width:auto">${resultOptions(state.pending || edit.result)}</select><span class="chev"></span></span>
            <span>${esc(them)}</span>
            <span class="grow">${count ? `${count} ${count === 1 ? "set" : "sets"}` : "Sets follow the result"}</span>
          </div>
          <div class="stack">${pendingHtml}${scoresLine}
            <table class="table">
              <thead><tr><th>Set</th><th>Entered</th><th>Tagged</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      </div>
      <div style="margin-top:var(--gap-stack)">${deleteHtml}</div>
    </div>`;
    return shell(body, { match: true });
  }

  function insightCard(card) {
    const flipped = state.flipped === card.id;
    const playing = state.playing === card.id;
    const pin = state.pin && card.id === "phases" && !flipped ? " is-focus" : "";
    const head = `<div class="i-head"><h2 class="card-title">${esc(card.title)}</h2><span style="display:flex;align-items:center;gap:4px">${card.value && !flipped ? `<span class="i-value num">${esc(card.value)}</span>` : ""}<button type="button" class="btn btn-icon btn-quiet${pin}" data-act="flip" data-id="${card.id}" aria-pressed="${flipped ? "true" : "false"}" aria-label="${flipped ? `Back to ${esc(card.title)}` : `About ${esc(card.title)}`}">${icon("info", 20)}</button></span></div>`;
    if (flipped) {
      return `<article class="card${playing ? " is-selected" : ""}" data-insight="${card.id}">${head}<div class="about">${card.about.map((line) => `<p>${esc(line)}</p>`).join("")}</div></article>`;
    }
    let rows = "";
    if (card.columns && card.rows.length) {
      const cols = card.columns.length;
      const template = `minmax(0,1fr) repeat(${cols}, minmax(3.4rem, max-content))`;
      rows =
        `<div class="i-cols" style="grid-template-columns:${template}"><span></span>${card.columns.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` +
        card.rows
          .map((row) => {
            const grade = row.grade ? `<span class="i-cell grade-${row.grade.toLowerCase()}"><strong>${esc(row.grade)}</strong></span>` : "";
            return `<div class="i-row" style="grid-template-columns:${template}"><span class="i-label"><span class="dot${row.weak ? " is-on" : ""}"></span><b>${esc(row.label)}</b></span><span class="i-cell num"><strong>${esc(row.you[0])}</strong><span class="of">${esc(row.you[1])}</span></span><span class="i-cell num"><strong>${esc(row.them[0])}</strong><span class="of">${esc(row.them[1])}</span></span>${grade}</div>`;
          })
          .join("");
    } else if (card.rows) {
      rows = card.rows
        .map(
          (row) =>
            `<div class="i-row" style="grid-template-columns:minmax(0,1fr) auto"><span class="i-label"><span class="dot${row.weak ? " is-on" : ""}"></span><b>${esc(row.label)}</b></span><span class="i-single num"><strong>${esc(row.single)}</strong>${row.detail ? `<span class="detail">${esc(row.detail)}</span>` : ""}</span></div>`,
        )
        .join("");
    }
    const play = card.playlist
      ? `<div class="play-row"><button type="button" class="btn btn-icon" data-act="play-card" data-id="${card.id}" aria-label="Play ${esc(card.playlist)}">${icon(playing ? "pause" : "play", 20)}</button><span>${esc(card.playlist)} · ${card.count}</span><button type="button" class="btn btn-icon" disabled aria-label="Download" title="Download is not available yet">${icon("down", 20)}</button></div>`
      : "";
    return `<article class="card${playing ? " is-selected" : ""}" data-insight="${card.id}">${head}${card.sub ? `<p class="i-sub">${esc(card.sub)}</p>` : ""}${card.compare ? `<p class="i-compare">${esc(card.compare)}</p>` : ""}${rows}${play}</article>`;
  }

  function playerBlock() {
    const card = INSIGHTS.find((c) => c.id === state.playing);
    if (!card) return "";
    return `<div class="media-player"><div class="player-frame"><div class="player-picture">${picture()}
        <button type="button" class="btn btn-icon btn-chrome on-video" data-act="play" aria-label="${state.playOn ? "Pause" : "Play"}" style="position:absolute;right:8px;bottom:8px">${icon(state.playOn ? "pause" : "play", 20)}</button>
      </div>
      <div class="caption"><p>${esc(card.playlist)} · 1 of ${card.count}</p><button type="button" class="btn btn-quiet" data-act="close-play">Close</button></div></div></div>`;
  }

  function insights() {
    const f = state.iFilters;
    const labels = [];
    if (f.dates !== "Any") labels.push(f.dates === "From and to" ? `Dates: ${f.from || "…"} to ${f.to || "…"}` : `Dates: ${f.dates}`);
    if (f.opponent !== "Any") labels.push(`Opponent: ${f.opponent}`);
    if (f.event !== "Any") labels.push(`Event: ${f.event}`);
    const kept = keptInsights();
    const filtered = labels.length > 0;
    const draft = state.iDraft || f;
    const dates = ["Any", "Last 5 matches", "Last 30 days", "Last 3 months", "Last 12 months", "From and to"];
    const range = draft.dates === "From and to"
      ? `<label class="field-row"><span class="lbl">From</span><input class="field" type="date" data-act="idates" data-field="from" value="${esc(draft.from)}"></label><label class="field-row"><span class="lbl">To</span><input class="field" type="date" data-act="idates" data-field="to" value="${esc(draft.to)}"></label>`
      : "";
    const surface = filterChrome(
      `${selectField("i-dates", "Dates", draft.dates, dates, "idraft")}${range}
        ${selectField("i-opp", "Opponent", draft.opponent, choices(taggedPool(), "opponent"), "idraft")}
        ${selectField("i-event", "Event", draft.event, choices(taggedPool(), "event"), "idraft")}`,
      "clear-i",
      "apply-i",
    );
    const inline = surface.inline;
    const overlay = surface.overlay;
    let content = "";
    if (!kept.length) {
      content = `<div class="callout callout-empty"><p>Nothing fits this filter.</p><button type="button" class="btn btn-primary btn-lg" data-act="clear-i">Clear filter</button></div>`;
    } else if (filtered) {
      content = `<p class="lede">${kept.length} ${kept.length === 1 ? "match" : "matches"} in this filter.</p>
        <div class="callout callout-info"><p>Point totals are not recomputed in this preview. Clear the filter to see the 12-match cards.</p></div>
        <div class="list" style="margin-top:var(--gap-stack)">${kept
          .map(
            (m) =>
              `<button type="button" class="row" data-act="open" data-id="${m.id}" data-dest="details"><span class="row-main"><span class="row-title">vs ${esc(m.opponent)}</span><span class="row-meta">${esc(rowLine(m))}</span></span></button>`,
          )
          .join("")}</div>`;
    } else {
      const cards = INSIGHTS.map(insightCard).join("");
      content = state.playing
        ? `<p class="lede">12 matches · 825 points · 1 part tagged</p><div class="media">${playerBlock()}<div class="media-rest"><div class="cards">${cards}</div></div></div>`
        : `<p class="lede">12 matches · 825 points · 1 part tagged</p><div class="cards">${cards}</div>`;
    }
    const chips = labels.length ? `<div class="chips">${labels.map((label) => chip(label, "unchip-i")).join("")}</div>` : "";
    const body = `${topRow("page-cards", `<h1 class="top-title">Insights</h1><div class="top-end">${filterButton(labels.length)}</div>`)}${chips}<div class="page page-cards">${inline}${content}</div>`;
    return shell(body, { nav: "insights", overlay });
  }

  function account() {
    const filled = state.demo !== "empty";
    const body = `${topRow("page-cards", `<h1 class="top-title">Account</h1>`)}
      <div class="page page-cards"><div class="cards">
        <section class="card stack">
          <h2 class="card-title">Profile</h2>
          <label class="field-row"><span class="lbl">Display name</span><input class="field" value="Paul Overton" data-act="noop"></label>
          <label class="field-row"><span class="lbl">Role</span><input class="field" value="Player / coach" data-act="noop"></label>
          <label class="field-row"><span class="lbl">Email</span><input class="field" placeholder="Cloud email" data-act="noop"></label>
          <div class="actions" style="justify-content:flex-start">
            <button type="button" class="btn" disabled>Save profile</button>
            <button type="button" class="btn" disabled>Sign out</button>
          </div>
        </section>
        <section class="card stack">
          <h2 class="card-title">Prototype</h2>
          <p class="i-sub" style="margin:0">Empty shows only empty states. Filled restores the seed matches.</p>
          <div class="segmented" role="group" aria-label="Demo data">
            <button type="button" data-act="demo" data-val="empty" aria-pressed="${filled ? "false" : "true"}">Empty</button>
            <button type="button" data-act="demo" data-val="filled" aria-pressed="${filled ? "true" : "false"}">Filled</button>
          </div>
        </section>
      </div></div>
      <p class="version">v0.17.28</p>`;
    if (!filled) {
      const emptyBody = `${topRow("page-cards", `<h1 class="top-title">Account</h1>`)}
        <div class="page page-cards"><section class="card stack" style="max-width:28rem">
          <h2 class="card-title">Profile</h2>
          <label class="field-row"><span class="lbl">Display name</span><input class="field" placeholder="Empty"></label>
          <label class="field-row"><span class="lbl">Email</span><input class="field" placeholder="Empty"></label>
          <div class="segmented" role="group" aria-label="Demo data">
            <button type="button" data-act="demo" data-val="empty" aria-pressed="true">Empty</button>
            <button type="button" data-act="demo" data-val="filled" aria-pressed="false">Filled</button>
          </div>
        </section></div><p class="version">v0.17.28</p>`;
      return shell(emptyBody, { nav: "account" });
    }
    return shell(body, { nav: "account" });
  }

  function render(keepScroll) {
    const main = document.getElementById("main");
    const y = keepScroll && main ? main.scrollTop : 0;
    let html = "";
    if (state.demo === "empty" && (state.screen === "matches" || state.screen === "insights")) {
      const title = state.screen === "matches" ? "Matches" : "Insights";
      const empty =
        state.screen === "matches"
          ? `<div class="callout callout-empty"><p>No matches yet.</p><button type="button" class="btn btn-primary btn-lg" data-act="new">New match</button></div>`
          : `<div class="callout callout-empty"><p>No insights yet.</p><p class="i-sub">Tag a rally in any match to see insights.</p></div>`;
      const end = state.screen === "matches" ? `<button type="button" class="btn btn-quiet" data-act="new">${icon("plus", 16)} New</button>` : "";
      html = shell(`${topRow("page-list", `<h1 class="top-title">${title}</h1><div class="top-end">${end}</div>`)}<div class="page page-list">${empty}</div>`, {
        nav: state.screen,
      });
    } else if (state.screen === "tagger") html = tagger();
    else if (state.screen === "matches") html = matches();
    else if (state.screen === "details") html = details();
    else if (state.screen === "account") html = account();
    else html = insights();
    app.innerHTML = html;
    const next = document.getElementById("main");
    if (next && keepScroll) next.scrollTop = y;
    const pin = document.querySelector("[data-pin]");
    if (pin && state.pin) pin.classList.add("is-focus");
    requestAnimationFrame(measure);
  }

  function measure() {
    const q = (s) => document.querySelector(s);
    const box = (el) => {
      if (!el) return "none";
      const style = getComputedStyle(el);
      if (style.display === "none") return "none";
      const r = el.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)}`;
    };
    document.documentElement.dataset.measure = [box(q(".video-zone")), box(q(".picture")), box(q(".set-zone")), box(q(".rally-zone")), box(q(".wing-left")), box(q(".pad"))].join("|");
    document.documentElement.dataset.ready = "1";
  }

  function onScore(el) {
    const edit = editOf(state.matchId);
    const set = edit.sets.find((s) => s.id === Number(el.dataset.set));
    if (!set) return;
    set[el.dataset.side] = el.value.replace(/\D/g, "").slice(0, 2);
    state.pin = false;
    render(true);
  }

  app.addEventListener("click", (event) => {
    const t = event.target.closest("[data-act]");
    if (!t || t.disabled) return;
    const act = t.dataset.act;
    if (act === "seek") {
      const rect = t.querySelector(".seek-track").getBoundingClientRect();
      state.seek = Math.round(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)));
      state.pin = false;
      render(true);
      return;
    }
    if (act === "nav") return go(t.dataset.screen);
    if (act === "back") return go("details");
    if (act === "open") {
      if (t.dataset.dest === "tagger") return go("tagger", { mode: "answer", matchId: t.dataset.id });
      return go("details", { matchId: t.dataset.id, confirmDelete: false, pending: null });
    }
    if (act === "new") {
      state.demo = "filled";
      return go("details", { matchId: "m-new", confirmDelete: false, pending: null });
    }
    if (act === "tab") {
      if (t.dataset.tab === "tag") return go("tagger", { mode: state.matchId === "m-partial" ? "answer" : "saved" });
      if (t.dataset.tab === "insights") return go("insights");
      return;
    }
    if (act === "filter") {
      state.filterOpen = !state.filterOpen;
      state.draft = Object.assign({}, state.filters);
      state.iDraft = Object.assign({}, state.iFilters);
      state.pin = false;
      render(true);
      return;
    }
    if (act === "apply") {
      state.filters = Object.assign({}, state.draft || state.filters);
      state.filterOpen = false;
      state.pin = false;
      render(false);
      return;
    }
    if (act === "apply-i") {
      state.iFilters = Object.assign({}, state.iDraft || state.iFilters);
      state.filterOpen = false;
      state.playing = null;
      state.pin = false;
      render(false);
      return;
    }
    if (act === "clear-filters") {
      state.filters = { opponent: "Any", event: "Any", status: "Any" };
      state.draft = Object.assign({}, state.filters);
      state.filterOpen = false;
      render(false);
      return;
    }
    if (act === "clear-i") {
      state.iFilters = { dates: "Any", opponent: "Any", event: "Any", from: "", to: "" };
      state.iDraft = Object.assign({}, state.iFilters);
      state.filterOpen = false;
      state.playing = null;
      render(false);
      return;
    }
    if (act === "unchip") {
      const label = t.dataset.chip;
      if (label.startsWith("Opponent")) state.filters.opponent = "Any";
      if (label.startsWith("Event")) state.filters.event = "Any";
      if (label.startsWith("Status")) state.filters.status = "Any";
      render(false);
      return;
    }
    if (act === "unchip-i") {
      const label = t.dataset.chip;
      if (label.startsWith("Opponent")) state.iFilters.opponent = "Any";
      if (label.startsWith("Event")) state.iFilters.event = "Any";
      if (label.startsWith("Dates")) {
        state.iFilters.dates = "Any";
        state.iFilters.from = "";
        state.iFilters.to = "";
      }
      state.playing = null;
      render(false);
      return;
    }
    if (act === "play") {
      state.playOn = !state.playOn;
      state.pin = false;
      render(true);
      return;
    }
    if (act === "play-card") {
      state.playing = state.playing === t.dataset.id ? null : t.dataset.id;
      state.playOn = Boolean(state.playing);
      state.pin = false;
      render(false);
      return;
    }
    if (act === "close-play") {
      state.playing = null;
      state.playOn = false;
      render(true);
      return;
    }
    if (act === "flip") {
      state.flipped = state.flipped === t.dataset.id ? null : t.dataset.id;
      state.pin = false;
      render(true);
      return;
    }
    if (act === "mute") {
      state.muted = !state.muted;
      render(true);
      return;
    }
    if (act === "speed") {
      const order = [1, 1.5, 2, 0.5];
      state.speed = order[(order.indexOf(state.speed) + 1) % order.length];
      render(true);
      return;
    }
    if (act === "skip") {
      state.seek = Math.min(100, Math.max(0, state.seek + Number(t.dataset.dir) * 5));
      toast("Simulated. The still does not move.");
      return;
    }
    if (act === "settings") {
      state.settings = !state.settings;
      state.pin = false;
      render(true);
      return;
    }
    if (act === "loop") {
      state.loop = t.dataset.val === "1";
      render(true);
      return;
    }
    if (act === "region") {
      if (t.classList.contains("is-dim")) {
        toast("Simulated. That step is at the end of the row.");
        return;
      }
      if (t.dataset.key === "rallies" || t.dataset.key === "gaps") {
        state.editKind = t.dataset.key === "rallies" ? "rally" : "gaps";
        state.pressed = t.dataset.key;
        render(true);
        return;
      }
      if (t.dataset.key === "back" && state.mode === "review") {
        state.reviewAt = Math.max(0, state.reviewAt - 1);
        render(true);
        return;
      }
      if (t.dataset.key === "fwd" && state.mode === "review") {
        state.reviewAt = Math.min(2, state.reviewAt + 1);
        render(true);
        return;
      }
      if (t.dataset.key === "back" && state.mode === "edit") {
        state.editAt = Math.max(0, state.editAt - 1);
        render(true);
        return;
      }
      if (t.dataset.key === "fwd" && state.mode === "edit") {
        state.editAt = Math.min(HERO_PILLS.length - 1, state.editAt + 1);
        render(true);
        return;
      }
      if (t.dataset.key === "mark") {
        state.marked = !state.marked;
        render(true);
        return;
      }
      state.pressed = t.dataset.key;
      toast(`Simulated. ${t.textContent.trim()} is not saved.`);
      return;
    }
    if (act === "discard" || act === "edit-rally" || act === "undo") {
      toast("Simulated. Nothing was changed.");
      return;
    }
    if (act === "star") {
      state.mode = state.mode === "review" ? "watch" : "review";
      state.pin = false;
      render(true);
      if (window.parent !== window) window.parent.postMessage({ type: "preview-nav", screen: "tagger", mode: state.mode }, "*");
      return;
    }
    if (act === "edit-set") {
      state.mode = state.mode === "edit" ? "answer" : "edit";
      state.pin = false;
      render(true);
      if (window.parent !== window) window.parent.postMessage({ type: "preview-nav", screen: "tagger", mode: state.mode }, "*");
      return;
    }
    if (act === "mode") {
      state.mode = t.dataset.mode;
      render(true);
      return;
    }
    if (act === "pill") {
      if (state.mode === "edit") {
        state.editAt = Number(t.dataset.i);
        render(true);
        return;
      }
      toast(`Simulated. Rally ${Number(t.dataset.i) + 1} stays on this still.`);
      return;
    }
    if (act === "part") {
      state.reviewAt = Number(t.dataset.i);
      state.mode = "review";
      render(true);
      return;
    }
    if (act === "shot") {
      toast(`Simulated. Shot ${t.dataset.n} is not retagged.`);
      return;
    }
    if (act === "delete") {
      state.confirmDelete = true;
      state.pin = false;
      render(true);
      return;
    }
    if (act === "cancel-delete") {
      state.confirmDelete = false;
      render(true);
      return;
    }
    if (act === "do-delete") {
      toast("Simulated. The match is still in the list.");
      state.confirmDelete = false;
      go("matches");
      return;
    }
    if (act === "use-tagged") {
      const edit = editOf(state.matchId);
      const set = edit.sets.find((s) => s.id === Number(t.dataset.set));
      if (set && set.tagged.includes("-")) {
        const [me, them] = set.tagged.split("-").map((n) => n.trim());
        set.me = me;
        set.them = them;
      }
      state.pin = false;
      render(true);
      return;
    }
    if (act === "use-all") {
      const edit = editOf(state.matchId);
      edit.sets.forEach((set) => {
        if (differs(set)) {
          const [me, them] = set.tagged.split("-").map((n) => n.trim());
          set.me = me;
          set.them = them;
        }
      });
      render(true);
      return;
    }
    if (act === "open-set") return go("tagger", { mode: "saved" });
    if (act === "commit-result") {
      const edit = editOf(state.matchId);
      const keep = state.pending[0] + state.pending[1];
      edit.result = state.pending.slice();
      edit.sets = edit.sets.filter((s) => s.id <= keep);
      state.pending = null;
      render(true);
      return;
    }
    if (act === "cancel-result") {
      state.pending = null;
      render(true);
      return;
    }
    if (act === "demo") {
      state.demo = t.dataset.val;
      state.pin = false;
      render(false);
      return;
    }
  });

  app.addEventListener("change", (event) => {
    const t = event.target;
    if (t.dataset.act === "draft") {
      state.draft = state.draft || Object.assign({}, state.filters);
      const key = t.id === "f-opp" ? "opponent" : t.id === "f-event" ? "event" : "status";
      state.draft[key] = t.value;
      return;
    }
    if (t.dataset.act === "idraft") {
      state.iDraft = state.iDraft || Object.assign({}, state.iFilters);
      const key = t.id === "i-opp" ? "opponent" : t.id === "i-event" ? "event" : "dates";
      state.iDraft[key] = t.value;
      if (key === "dates") render(true);
      return;
    }
    if (t.dataset.act === "text") {
      const edit = editOf(state.matchId);
      edit[t.dataset.field] = t.value;
      state.pin = false;
      return;
    }
    if (t.dataset.act === "idates") {
      state.iDraft = state.iDraft || Object.assign({}, state.iFilters);
      state.iDraft[t.dataset.field] = t.value;
      return;
    }
    if (t.dataset.act === "score") return onScore(t);
    if (t.dataset.act === "result") {
      state.pin = false;
      const edit = editOf(state.matchId);
      if (!t.value) {
        edit.result = null;
        state.pending = null;
        render(true);
        return;
      }
      const next = t.value.split("-").map(Number);
      const lost = edit.sets.filter((s) => s.id > next[0] + next[1] && (s.me !== "" || s.them !== ""));
      if (lost.length) state.pending = next;
      else {
        edit.result = next;
        state.pending = null;
      }
      render(true);
    }
  });

  app.addEventListener("input", (event) => {
    const t = event.target;
    if (t.dataset.act === "score") {
      const clean = t.value.replace(/\D/g, "").slice(0, 2);
      if (clean !== t.value) t.value = clean;
    }
    if (t.dataset.act === "text") {
      editOf(state.matchId)[t.dataset.field] = t.value;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target instanceof HTMLElement && event.target.classList.contains("row")) {
      event.target.click();
    }
    if (event.key === "Escape") {
      if (state.settings || state.filterOpen || state.confirmDelete || state.pending) {
        state.settings = false;
        state.filterOpen = false;
        state.confirmDelete = false;
        state.pending = null;
        render(true);
      }
    }
    if (state.screen === "tagger" && event.key === " " && event.target === document.body) {
      event.preventDefault();
      state.playOn = !state.playOn;
      render(true);
    }
  });

  render(false);
})();
