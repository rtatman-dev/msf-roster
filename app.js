const CLIENT_ID    = "2255dc00-cc5f-4140-8609-7b445cc11958";
  const REDIRECT_URI = "https://msf-roster.pages.dev/callback";
  const AUTH_URL     = "https://hydra-public.prod.m3.scopelypv.com/oauth2/auth";
  const API_BASE     = "https://api.marvelstrikeforce.com";
  const API_KEY      = "17wMKJLRxy3pYDCKG5ciP7VSU45OVumB2biCzzgw";
  const SCOPE        = "openid m3p.f.pr.ros m3p.f.pr.pro m3p.f.pr.act m3p.f.pr.inv m3p.f.ar.pro";

  const DEMO_ROSTER = [
    {name:"Iron Man",        role:"Blaster",    tier:"T13", power:348000, stars:7, redStars:5, iso:18, team:"Avengers",      portrait:"IronMan"},
    {name:"Captain America", role:"Tank",       tier:"T13", power:341000, stars:7, redStars:5, iso:18, team:"Avengers",      portrait:"CaptainAmerica"},
    {name:"Thor",            role:"Brawler",    tier:"T12", power:312000, stars:7, redStars:4, iso:16, team:"Avengers",      portrait:"Thor"},
    {name:"Black Widow",     role:"Controller", tier:"T12", power:298000, stars:7, redStars:4, iso:15, team:"Avengers",      portrait:"BlackWidow"},
    {name:"Hawkeye",         role:"Blaster",    tier:"T11", power:271000, stars:6, redStars:3, iso:14, team:"Avengers",      portrait:"Hawkeye"},
    {name:"Spider-Man",      role:"Brawler",    tier:"T13", power:355000, stars:7, redStars:5, iso:18, team:"Web Warriors",  portrait:"SpiderMan"},
    {name:"Ghost-Spider",    role:"Support",    tier:"T12", power:309000, stars:7, redStars:4, iso:16, team:"Web Warriors",  portrait:"GhostSpider"},
    {name:"Scarlet Witch",   role:"Controller", tier:"T11", power:265000, stars:6, redStars:3, iso:13, team:"Brotherhood",   portrait:"ScarletWitch"},
    {name:"Magneto",         role:"Controller", tier:"T12", power:305000, stars:7, redStars:4, iso:15, team:"Brotherhood",   portrait:"Magneto"},
    {name:"Mystique",        role:"Blaster",    tier:"T10", power:241000, stars:6, redStars:2, iso:12, team:"Brotherhood",   portrait:"Mystique"},
    {name:"Wolverine",       role:"Brawler",    tier:"T11", power:278000, stars:6, redStars:3, iso:14, team:"X-Men",         portrait:"Wolverine"},
    {name:"Cyclops",         role:"Blaster",    tier:"T10", power:235000, stars:5, redStars:2, iso:11, team:"X-Men",         portrait:"Cyclops"},
    {name:"Storm",           role:"Controller", tier:"T11", power:262000, stars:6, redStars:3, iso:13, team:"X-Men",         portrait:"Storm"},
    {name:"Colossus",        role:"Tank",       tier:"T10", power:228000, stars:5, redStars:2, iso:10, team:"X-Men",         portrait:"Colossus"},
    {name:"Luke Cage",       role:"Tank",       tier:"T9",  power:198000, stars:5, redStars:1, iso:8,  team:"Defenders",     portrait:"LukeCage"},
    {name:"Jessica Jones",   role:"Brawler",    tier:"T9",  power:193000, stars:5, redStars:1, iso:8,  team:"Defenders",     portrait:"JessicaJones"},
    {name:"Daredevil",       role:"Brawler",    tier:"T8",  power:171000, stars:4, redStars:1, iso:6,  team:"Defenders",     portrait:"Daredevil"},
    {name:"Iron Fist",       role:"Support",    tier:"T8",  power:168000, stars:4, redStars:0, iso:5,  team:"Defenders",     portrait:"IronFist"},
    {name:"Thanos",          role:"Tank",       tier:"T13", power:362000, stars:7, redStars:5, iso:18, team:"Infinity Watch", portrait:"Thanos"},
    {name:"Gamora",          role:"Brawler",    tier:"T12", power:318000, stars:7, redStars:4, iso:16, team:"Guardians",     portrait:"Gamora"},
  ];

  const DEMO_SQUADS = [
    { name: "War Offense Alpha", type: "War", members: [
      {name:"Thanos", power:362000}, {name:"Spider-Man", power:355000},
      {name:"Iron Man", power:348000}, {name:"Captain America", power:341000}, {name:"Gamora", power:318000}
    ]},
    { name: "Raid Team", type: "Raid", members: [
      {name:"Ghost-Spider", power:309000}, {name:"Magneto", power:305000},
      {name:"Thor", power:312000}, {name:"Black Widow", power:298000}, {name:"Wolverine", power:278000}
    ]},
  ];

  let roster   = [];
  let playerEvents = [];
  let playerInventory = [];
  let itemMetadata = {}; // item id -> { name, icon, description, locations }
  let raidIds      = [];
  let ddIds        = [];
  let allianceCard = null;
  let campaigns    = [];
  let campaignNodes = {}; // id -> full node/chapter data
  let squads   = [];
  let card     = null;
  let maxPower = 1;

  // ── Portrait helpers ────────────────────────────────────────────────────────
  // Build a portrait URL from the MSF character API icon field or msf.gg CDN pattern
  function getPortraitUrl(c) {
    // Prefer the icon URL from the API if available
    if (c.icon) return c.icon;
    // msf.gg serves character portrait thumbnails at a predictable URL
    const slug = (c.portrait || c.name || "").replace(/[\s\-']/g, "").toLowerCase();
    return "https://msf.gg/img/roster/" + slug + ".jpg";
  }

  // Role → accent color mapping
  const ROLE_COLORS = {
    Blaster:    "#ff4e4e",
    Brawler:    "#ff8c00",
    Controller: "#a855f7",
    Support:    "#22d3ee",
    Tank:       "#4ade80",
  };

  // SVG fallback avatar (gradient + initials)
  function makeFallbackAvatar(name, role) {
    const initials = (name || "?").split(/[\s\-]+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
    const color = ROLE_COLORS[role] || "#00c8ff";
    return `
      <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:0.18"/>
            <stop offset="100%" style="stop-color:#000;stop-opacity:0.8"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#g_${initials})"/>
        <text x="50" y="60" text-anchor="middle" font-family="Orbitron,monospace" font-size="28" font-weight="900" fill="${color}" opacity="0.85">${initials}</text>
      </svg>`;
  }

  // Build an img tag that falls back to SVG avatar
  function portraitImgTag(c, cssClass) {
    const url = getPortraitUrl(c);
    const fallback = makeFallbackAvatar(c.name, c.role).replace(/"/g, "'").replace(/\n/g, "");
    return `<img src="${url}" class="${cssClass}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
      loading="lazy" /><div class="char-avatar-fallback" style="display:none;background:var(--bg-deep)">${fallback}</div>`;
  }

  // ── Shard helpers ────────────────────────────────────────────────────────────
  const STAR_THRESHOLDS = [0, 10, 25, 45, 75, 105, 140, 175];

  function getInventoryMap() {
    const map = {};
    playerInventory.forEach(item => { map[item.item] = item.quantity; });
    return map;
  }

  function getShardData(c) {
    const invMap = getInventoryMap();
    const shardId    = "SHARD_" + (c.name.replace(/\s/g,   "").toUpperCase());
    const altShardId = "SHARD_" + (c.name.replace(/[\s-]/g,"").toUpperCase());
    const shardsOwned = invMap[shardId] || invMap[altShardId] || 0;
    const currentStars = c.stars || 0;
    const nextStarNeeded = currentStars < 7 ? (STAR_THRESHOLDS[currentStars + 1] || 175) : 0;
    const pct = nextStarNeeded > 0 ? Math.min(100, Math.round(shardsOwned / nextStarNeeded * 100)) : 100;
    return { shardsOwned, currentStars, nextStarNeeded, pct };
  }

  // ── Star rendering ──────────────────────────────────────────────────────────
  function renderStars(yellow, red) {
    let html = "";
    for (let i = 1; i <= 7; i++) {
      if (i <= red) html += `<span class="char-star red">★</span>`;
      else if (i <= yellow) html += `<span class="char-star filled">★</span>`;
      else html += `<span class="char-star">★</span>`;
    }
    return html;
  }

  // ── Tab switching ────────────────────────────────────────────────────────────
  function switchTab(name) {
    ["roster","squads","ai","card","activities","inventory"].forEach(t => {
      document.getElementById("panel-" + t).classList.toggle("hidden", t !== name);
      document.getElementById("tab-" + t).classList.toggle("active", t === name);
    });
  }

  // ── PKCE ────────────────────────────────────────────────────────────────────
  function generateRandom(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => chars[b % chars.length]).join("");
  }

  async function sha256Base64url(plain) {
    const data = new TextEncoder().encode(plain);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function startOAuth() {
    const codeVerifier  = generateRandom(64);
    const codeChallenge = await sha256Base64url(codeVerifier);
    const state         = generateRandom(16);
    sessionStorage.setItem("pkce_code_verifier", codeVerifier);
    sessionStorage.setItem("pkce_state", state);
    const params = new URLSearchParams({
      response_type: "code", client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI, scope: SCOPE,
      state, code_challenge: codeChallenge, code_challenge_method: "S256"
    });
    window.location.href = AUTH_URL + "?" + params.toString();
  }

  function logout() {
    sessionStorage.removeItem("msf_token");
    document.getElementById("main-app").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
  }

  // ── Demo mode ────────────────────────────────────────────────────────────────
  function useDemoMode() {
    roster   = [...DEMO_ROSTER];
    squads   = [...DEMO_SQUADS];
    maxPower = Math.max(...roster.map(c => c.power));
    showApp(false);
  }

  // ── Show app ─────────────────────────────────────────────────────────────────
  function showApp(isLive) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");
    const badge     = document.getElementById("mode-badge");
    const logoutBtn = document.getElementById("logout-btn");
    if (isLive) {
      badge.textContent = "Live data"; badge.className = "status-badge live";
      logoutBtn.classList.remove("hidden");
      document.getElementById("refresh-btn").classList.remove("hidden");
    } else {
      badge.textContent = "Demo mode"; badge.className = "status-badge";
      logoutBtn.classList.add("hidden");
      document.getElementById("refresh-btn").classList.add("hidden");
    }
    renderMetrics();
    populateTeamFilter();
    renderRoster();
    renderSquads();
    renderCard();
    renderActivities();
    renderInventory();
    const hadHistory = loadChatHistory();
    if (!hadHistory) {
      addMessage("assistant", "Hi SuperZero! I have your full roster and squad data loaded. Ask me anything about your characters, teams, or strategy.");
    }
  }

  // ── Load live data ───────────────────────────────────────────────────────────
  async function loadLiveData(token) {
    const badge = document.getElementById("mode-badge");
    badge.textContent = "Loading..."; badge.className = "status-badge loading";

    const headers = { "Authorization": "Bearer " + token, "x-api-key": API_KEY };

    try {
      const [rosterRes, squadsRes, cardRes, gameCharsRes, eventsRes, inventoryRes, raidListRes, ddListRes, allianceRes, campaignRes, itemsRes] = await Promise.all([
        fetch(API_BASE + "/player/v1/roster",  { headers }),
        fetch(API_BASE + "/player/v1/squads",  { headers }),
        fetch(API_BASE + "/player/v1/card",    { headers }),
        fetch(API_BASE + "/game/v1/characters?traitFormat=id&perPage=500", { headers }),
        fetch(API_BASE + "/player/v1/events",  { headers }),
        fetch(API_BASE + "/player/v1/inventory", { headers }),
        fetch(API_BASE + "/game/v1/raids",     { headers }),
        fetch(API_BASE + "/game/v1/dds",       { headers }),
        fetch(API_BASE + "/player/v1/alliance/card", { headers }),
        fetch(API_BASE + "/game/v1/episodics/campaign", { headers }),
        fetch(API_BASE + "/game/v1/items?perPage=500", { headers })
      ]);

      console.log("Roster:", rosterRes.status, "Squads:", squadsRes.status, "Card:", cardRes.status, "GameChars:", gameCharsRes.status);

      if (!rosterRes.ok) throw new Error("Roster: HTTP " + rosterRes.status);

      const rosterJson = await rosterRes.json();
      const gameCharsMap = {};
      if (gameCharsRes.ok) {
        const gameCharsJson = await gameCharsRes.json();
        (gameCharsJson.data || []).forEach(gc => {
          if (!gc.id) return;
          const traits = gc.traits || [];
          const roleTraits = new Set(["Blaster","Brawler","Controller","Support","Tank"]);
          const skipTraits = new Set(["Hero","Villain","Neutral","Cosmic","Mystic","Bio","Tech","Mutant","Skill","City","Global"]);
          const roles = traits.filter(t => roleTraits.has(t));
          const teams = traits.filter(t => !roleTraits.has(t) && !skipTraits.has(t));
          gameCharsMap[gc.id] = {
            roles, teams,
            icon: gc.portrait || gc.icon || gc.image || null  // grab any image field from API
          };
        });
        window._gameCharsMap = gameCharsMap;
        console.log("Game chars loaded:", Object.keys(gameCharsMap).length);
      }

      const chars = (rosterJson.data || []).map(c => {
        const meta = gameCharsMap[c.id] || {};
        const splitCase = s => s.replace(/([A-Z])/g, " $1").trim();
        return {
          name:     c.id ? splitCase(c.id) : "Unknown",
          portrait: c.id || "",
          icon:     meta.icon || c.portrait || null,
          roles:    meta.roles && meta.roles.length ? meta.roles : [],
          role:     meta.roles && meta.roles[0] ? meta.roles[0] : "—",
          teams:    meta.teams && meta.teams.length ? meta.teams.map(splitCase) : [],
          team:     meta.teams && meta.teams[0] ? splitCase(meta.teams[0]) : "—",
          tier:     c.gearTier ? "T" + c.gearTier : "T1",
          power:    c.power || 0,
          stars:    c.activeYellow || 0,
          redStars: c.activeRed || 0,
          iso:      (c.iso8 && c.iso8.active) ? c.iso8.active : "—",
          level:    c.level || 1
        };
      });

      if (chars.length === 0) throw new Error("No characters returned");
      roster   = chars;
      maxPower = Math.max(...roster.map(c => c.power));

      squads = [];
      if (squadsRes.ok) {
        const squadsJson = await squadsRes.json();
        const tabs = (squadsJson.data && squadsJson.data.tabs) ? squadsJson.data.tabs : {};
        const tabLabels = { roster: "Roster", blitz: "Blitz", tower: "Tower", raids: "Raids", war: "War" };
        const powerByKey = {};
        roster.forEach(c => { powerByKey[c.name.toLowerCase().replace(/[\s-]/g, "")] = c.power; });
        Object.entries(tabs).forEach(([tabKey, squadArrays]) => {
          if (!Array.isArray(squadArrays)) return;
          const label = tabLabels[tabKey] || tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
          squadArrays.forEach((memberIds, idx) => {
            if (!Array.isArray(memberIds) || memberIds.length === 0) return;
            squads.push({
              name: label + " Squad " + (idx + 1), type: label,
              members: memberIds.filter(Boolean).map(id => {
                const name = id.replace(/([A-Z])/g, " $1").trim();
                return { name, power: powerByKey[id.toLowerCase()] || 0 };
              })
            });
          });
        });
      }

      if (cardRes.ok) {
        const cardJson = await cardRes.json();
        card = cardJson.data || cardJson;
      }

      if (eventsRes.ok) {
        const eventsJson = await eventsRes.json();
        playerEvents = eventsJson.data || [];
      }

      if (inventoryRes.ok) {
        const inventoryJson = await inventoryRes.json();
        playerInventory = inventoryJson.data || [];
      }

      if (raidListRes.ok) {
        const raidListJson = await raidListRes.json();
        raidIds = (raidListJson.data || []).map(r => r.id).filter(Boolean);
      }

      if (ddListRes.ok) {
        const ddListJson = await ddListRes.json();
        ddIds = (ddListJson.data || []).map(d => d.id).filter(Boolean);
      }

      if (allianceRes.ok) {
        const allianceJson = await allianceRes.json();
        allianceCard = allianceJson.data || null;
      }

      if (campaignRes.ok) {
        const campaignJson = await campaignRes.json();
        campaigns = campaignJson.data || [];

        // Fetch full chapter/node detail for each campaign in parallel
        // Each campaign has chapters, each chapter has nodes with trait requirements
        const token = sessionStorage.getItem("msf_token");
        const authHeaders = { "Authorization": "Bearer " + token, "x-api-key": API_KEY };
        const nodeResults = await Promise.all(
          campaigns.map(camp =>
            fetch(API_BASE + "/game/v1/episodics/campaign/" + camp.id, { headers: authHeaders })
              .then(r => r.ok ? r.json() : null).catch(() => null)
          )
        );
        nodeResults.forEach((res, i) => {
          if (res && res.data) campaignNodes[campaigns[i].id] = res.data;
        });
        console.log("Campaign nodes loaded for:", Object.keys(campaignNodes).join(", "));
      }

      // Parse item metadata (icons, names, locations, descriptions)
      if (itemsRes && itemsRes.ok) {
        const itemsJson = await itemsRes.json();
        (itemsJson.data || []).forEach(item => {
          if (!item.id) return;
          itemMetadata[item.id] = {
            name:        item.name        || null,
            icon:        item.icon        || item.image || null,
            description: item.description || null,
            locations:   item.locations   || item.farming || item.sources || []
          };
        });
        console.log("Item metadata loaded:", Object.keys(itemMetadata).length, "items");
      }

      showApp(true);
    } catch (e) {
      console.error("Live load failed:", e.message, e.stack);
      useDemoMode();
      setTimeout(() => alert("Could not load live data (" + e.message + ").\n\nShowing demo data instead."), 300);
    }
  }

  // ── Populate team filter ─────────────────────────────────────────────────────
  function populateTeamFilter() {
    const allTeams = new Set();
    roster.forEach(c => { if (c.teams) c.teams.forEach(t => allTeams.add(t)); });
    const sorted = Array.from(allTeams).sort();
    const sel = document.getElementById("filter-team");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">All teams</option>' +
      sorted.map(t => '<option value="' + t + '"' + (t === current ? " selected" : "") + '>' + t + '</option>').join("");
  }

  // ── Render metrics ────────────────────────────────────────────────────────────
  function renderMetrics() {
    const avg = Math.round(roster.reduce((a, c) => a + c.power, 0) / roster.length);
    const top = Math.max(...roster.map(c => c.power));
    const t13 = roster.filter(c => c.tier === "T13").length;
    document.getElementById("metrics").innerHTML = `
      <div class="metric"><div class="metric-label">Characters</div><div class="metric-val">${roster.length}</div></div>
      <div class="metric"><div class="metric-label">Avg power</div><div class="metric-val">${Math.round(avg/1000)}k</div></div>
      <div class="metric"><div class="metric-label">Top power</div><div class="metric-val">${Math.round(top/1000)}k</div></div>
      <div class="metric"><div class="metric-label">T13 chars</div><div class="metric-val">${t13}</div></div>
      <div class="metric"><div class="metric-label">Squads</div><div class="metric-val">${squads.length}</div></div>
    `;
  }

  // ── Tier class ───────────────────────────────────────────────────────────────
  function tierClass(t) {
    if (t === "T13") return "tier-T13"; if (t === "T12") return "tier-T12";
    if (t === "T11") return "tier-T11"; if (t === "T10") return "tier-T10";
    return "tier-low";
  }

  // ── Render roster ─────────────────────────────────────────────────────────────
  function renderRoster() {
    const search = document.getElementById("search").value.toLowerCase();
    const tier   = document.getElementById("filter-tier").value;
    const role   = document.getElementById("filter-role").value;
    const sort   = document.getElementById("sort-by").value;
    let filtered = roster.filter(c => {
      if (search && !c.name.toLowerCase().includes(search)) return false;
      if (role && !(c.roles && c.roles.includes(role))) return false;
      const team = document.getElementById("filter-team") ? document.getElementById("filter-team").value : "";
      if (team && !(c.teams && c.teams.includes(team))) return false;
      if (tier === "low") return !["T13","T12","T11","T10"].includes(c.tier);
      if (tier && c.tier !== tier) return false;
      return true;
    });
    window._filteredRoster = filtered;
    filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "tier") { const o = ["T13","T12","T11","T10","T9","T8","T7","T6"]; return o.indexOf(a.tier) - o.indexOf(b.tier); }
      return b.power - a.power;
    });

    const invMap = getInventoryMap();

    document.getElementById("roster").innerHTML = filtered.length ? filtered.map((c, i) => {
      const roleColor = ROLE_COLORS[c.role] || "#00c8ff";
      const { shardsOwned, currentStars, nextStarNeeded, pct } = getShardData(c);
      const roleClass = "role-" + (c.role || "");
      const portUrl = getPortraitUrl(c);
      const fallbackSvg = makeFallbackAvatar(c.name, c.role).replace(/"/g, "'").replace(/\n/g, "");

      // Shard bar (only if we have shard data or < 7 stars)
      const shardHtml = (shardsOwned > 0 || currentStars < 7) ? `
        <div class="char-shard-row">
          <div class="char-shard-label">
            <span>Shards</span>
            <span>${shardsOwned}${nextStarNeeded ? " / " + nextStarNeeded : " ✓"}</span>
          </div>
          <div class="shard-bar-bg"><div class="shard-bar-fill" style="width:${pct}%"></div></div>
        </div>` : "";

      return `
        <div class="char-card" data-modal-idx="${i}">
          <div class="char-portrait">
            <img src="${portUrl}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block;transition:transform 0.3s"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy" />
            <div class="char-avatar-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:var(--bg-deep)">${fallbackSvg}</div>
            <div class="char-portrait-overlay"></div>
            <span class="tier-badge ${tierClass(c.tier)}" style="position:absolute;top:6px;left:6px;backdrop-filter:blur(4px);font-size:9px;font-family:var(--font-hud);font-weight:700;padding:2px 5px;border:1px solid">${c.tier}</span>
            <div class="char-stars" style="position:absolute;bottom:5px;left:0;right:0;display:flex;justify-content:center;gap:1px;font-size:9px">${renderStars(c.stars, c.redStars)}</div>
          </div>
          <div class="char-body">
            <div class="char-name">${c.name}</div>
            <div class="char-role-teams">
              <span class="char-role-dot ${roleClass}" style="background:${roleColor}"></span>
              <span class="char-role-text">${c.roles && c.roles.length ? c.roles.join(" / ") : "—"} · ${c.teams && c.teams.length ? c.teams[0] : "—"}</span>
            </div>
            <div class="char-stats-row">
              <div class="char-stat">
                <div class="char-stat-label">Power</div>
                <div class="char-stat-val">${Math.round(c.power/1000)}k</div>
              </div>
              <div class="char-stat">
                <div class="char-stat-label">ISO</div>
                <div class="char-stat-val">${c.iso}</div>
              </div>
            </div>
            ${shardHtml}
            <div class="power-bar-bg"><div class="power-bar" style="width:${Math.round(c.power/maxPower*100)}%"></div></div>
          </div>
        </div>`;
    }).join("") : '<p class="empty-state">No characters match your filters.</p>';
  }

  // ── Squad helpers ─────────────────────────────────────────────────────────────

  // Generic traits to skip when detecting team name / synergies
  const SKIP_TRAITS = new Set([
    "Hero","Villain","Neutral","Cosmic","Mystic","Bio","Tech","Mutant","Skill","City","Global",
    "Blaster","Brawler","Controller","Support","Tank","Human","Alien","Robot","Female","Male"
  ]);

  // Trait type → display category for synergy badges
  const TRAIT_CATEGORY = {
    // Factions / origins (highlight)
    Mutant:"origin", Cosmic:"origin", Mystic:"origin", Bio:"origin", Tech:"origin", Skill:"origin", City:"origin",
    // Alignment
    Hero:"align", Villain:"align", Neutral:"align",
  };

  const SYNERGY_COLORS = {
    // Named teams get accent colors
    "Avengers":      "#c8102e",
    "X-Men":         "#f7c948",
    "Guardians":     "#58c4dc",
    "Defenders":     "#d44000",
    "Inhumans":      "#7e4fbb",
    "Infinity Watch":"#8b5cf6",
    "Web Warriors":  "#e11d48",
    "Brotherhood":   "#dc2626",
    "Fantastic":     "#2563eb",
    "Wakandan":      "#7c3aed",
    "Symbiote":      "#4b5563",
    "Asgardian":     "#f59e0b",
    "Kree":          "#1d4ed8",
    "Shield":        "#64748b",
    "Hydra":         "#16a34a",
    "Hand":          "#dc2626",
    "Military":      "#4d7c0f",
    "Ravager":       "#9a3412",
    // Origins
    Mutant:"#f59e0b", Cosmic:"#818cf8", Mystic:"#a855f7", Bio:"#22c55e",
    Tech:"#06b6d4", Skill:"#f97316", City:"#64748b",
  };

  // Detect the dominant team name for a squad by finding the most-shared named team trait
  function detectTeamName(memberChars) {
    const teamCounts = {};
    memberChars.forEach(c => {
      (c.teams || []).forEach(t => {
        if (!SKIP_TRAITS.has(t)) teamCounts[t] = (teamCounts[t] || 0) + 1;
      });
    });
    // Find team shared by the most members (min 2)
    const sorted = Object.entries(teamCounts).sort((a,b) => b[1]-a[1]);
    if (sorted.length && sorted[0][1] >= 2) return sorted[0][0];
    return null;
  }

  // Get shared synergy traits (shared by 2+ members), split into team name vs trait origin
  function detectSynergies(memberChars) {
    const traitCounts = {};
    memberChars.forEach(c => {
      const allTraits = [...(c.teams || []), ...(c.roles || [])];
      allTraits.forEach(t => { traitCounts[t] = (traitCounts[t] || 0) + 1; });
    });
    // Return traits shared by ≥2 members, sorted by count desc
    return Object.entries(traitCounts)
      .filter(([t, n]) => n >= 2)
      .sort((a,b) => b[1]-a[1])
      .map(([t, n]) => ({ trait: t, count: n }));
  }

  // Build squad member portrait icon (small hex/circle)
  function squadMemberIcon(m, rosterChar) {
    const c = rosterChar || { name: m.name, role: "—", portrait: m.name.replace(/\s/g,"") };
    const portUrl = getPortraitUrl(c);
    const roleColor = ROLE_COLORS[c.role] || "#00c8ff";
    const initials = (c.name || "?").split(/[\s\-]+/).map(w => w[0]||"").join("").slice(0,2).toUpperCase();
    return `
      <div class="squad-icon-wrap" title="${m.name}${m.power ? ' · ' + Math.round(m.power/1000) + 'k' : ''}">
        <div class="squad-icon" style="--role-color:${roleColor}">
          <img src="${portUrl}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
            loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:50%;display:block" />
          <div class="squad-icon-fallback" style="display:none;background:linear-gradient(135deg,${roleColor}33,#040608);color:${roleColor};font-family:var(--font-hud);font-size:11px;font-weight:900;width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center">${initials}</div>
        </div>
        <div class="squad-icon-tier">${c.tier || "—"}</div>
        <div class="squad-icon-name">${m.name.split(" ")[0]}</div>
      </div>`;
  }

  // Role composition breakdown
  function roleBreakdown(memberChars) {
    const counts = {};
    memberChars.forEach(c => { const r = c.role || "—"; counts[r] = (counts[r]||0)+1; });
    return Object.entries(counts).map(([role, n]) => {
      const color = ROLE_COLORS[role] || "#4a5568";
      return `<span class="squad-role-pip" style="background:${color}" title="${role}">${role.charAt(0)}</span>`;
    }).join("");
  }

  // ── Render squads ─────────────────────────────────────────────────────────────
  function renderSquads() {
    if (!squads.length) {
      document.getElementById("squads").innerHTML = '<p class="empty-state">No saved squads found. Save squads in-game and they will appear here.</p>';
      return;
    }

    // Build a fast name → roster char lookup
    const rosterByName = {};
    roster.forEach(c => { rosterByName[c.name.toLowerCase()] = c; });

    document.getElementById("squads").innerHTML = squads.map(s => {
      const total = s.members.reduce((a, m) => a + m.power, 0);

      // Enrich members with full roster data
      const memberChars = s.members.map(m => {
        const rc = rosterByName[m.name.toLowerCase()] || null;
        return rc ? { ...rc, power: m.power || rc.power } : { name: m.name, power: m.power, role: "—", teams: [], roles: [], tier: "—", portrait: m.name.replace(/\s/g,"") };
      });

      // Detect team name
      const teamName = detectTeamName(memberChars);

      // Synergy analysis
      const synergies = detectSynergies(memberChars);
      // Separate "team" synergies (named factions) from "trait" synergies (origins/roles)
      const teamSyns  = synergies.filter(s => !SKIP_TRAITS.has(s.trait));
      const traitSyns = synergies.filter(s => SKIP_TRAITS.has(s.trait) && s.trait !== teamName);

      const synergyHtml = [
        ...teamSyns.slice(0,4),
        ...traitSyns.slice(0,3)
      ].map(({ trait, count }) => {
        const color = SYNERGY_COLORS[trait] || "#00c8ff";
        return `<span class="synergy-badge" style="border-color:${color}30;color:${color};background:${color}12">${trait} <span class="synergy-count">×${count}</span></span>`;
      }).join("");

      // Portrait row
      const iconsHtml = memberChars.map(mc => squadMemberIcon(
        { name: mc.name, power: mc.power },
        mc
      )).join("");

      // Role breakdown pips
      const rolePips = roleBreakdown(memberChars);

      // Tab type badge color
      const tabColors = { War:"#b91c1c", Raid:"#15803d", Blitz:"#1d4ed8", Tower:"#7c3aed", Roster:"#0369a1" };
      const tabColor = tabColors[s.type] || "#374151";

      return `
        <div class="squad-card">
          <div class="squad-card-header">
            <div>
              ${teamName ? `<div class="squad-team-name">${teamName}</div>` : ""}
              <div class="squad-name" style="${teamName ? "font-size:11px;color:var(--text-dim);margin-top:1px" : ""}">${s.name}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
              <span class="squad-type-badge" style="background:${tabColor}22;border-color:${tabColor}55;color:${tabColor}">${s.type || "Squad"}</span>
              <div class="squad-role-pips">${rolePips}</div>
            </div>
          </div>

          <div class="squad-icons-row">${iconsHtml}</div>

          ${synergyHtml ? `<div class="squad-synergies">${synergyHtml}</div>` : ""}

          ${total ? `
          <div class="squad-footer">
            <span class="squad-footer-label">Total power</span>
            <span class="squad-footer-val">${Math.round(total/1000)}k</span>
          </div>` : ""}
        </div>`;
    }).join("");
  }

  // ── AI chat ───────────────────────────────────────────────────────────────────
  let chatHistory = [];

  function saveChatHistory() {
    try { localStorage.setItem("msf_chat_history", JSON.stringify(chatHistory)); } catch(e) {}
  }

  function loadChatHistory() {
    try {
      const saved = localStorage.getItem("msf_chat_history");
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return false;
      chatHistory = parsed;
      const container = document.getElementById("ai-messages");
      container.innerHTML = "";
      chatHistory.forEach(msg => addMessage(msg.role, msg.content));
      return true;
    } catch(e) { return false; }
  }

  function buildContext() {
    const now = Date.now() / 1000;

    // ── 1. Player card ──────────────────────────────────────────────────────
    let cardSection = "Not available.";
    if (card) {
      const lvl       = (card.level && card.level.completedTier) ? card.level.completedTier : (card.level || "?");
      const tcp       = card.tcp       ? Math.round(card.tcp / 1000)       + "k" : "?";
      const stp       = card.stp       ? Math.round(card.stp / 1000)       + "k" : "?";
      const arena     = card.latestArena  || "?";
      const blitz     = card.latestBlitz  ? Math.round(card.latestBlitz / 1000) + "k" : "?";
      const blitzWins = card.blitzWins    || "?";
      const chars     = card.charactersCollected || roster.length;
      cardSection = "Name: " + (card.name || "SuperZero") + " | Level: " + lvl + " | Characters collected: " + chars + " | TCP: " + tcp + " | Squad power: " + stp + " | Arena rank: " + arena + " | Blitz score: " + blitz + " | Blitz wins: " + blitzWins;
    }

    // ── 2. Full roster with all traits ──────────────────────────────────────
    const sorted = [...roster].sort((a, b) => b.power - a.power);
    const charLines = sorted.map(c => {
      const roles = (c.roles && c.roles.length) ? c.roles.join(", ") : "none";
      const teams = (c.teams && c.teams.length) ? c.teams.join(", ") : "none";
      return "  " + c.name + " | " + c.tier + " | " + Math.round(c.power / 1000) + "k | roles: " + roles + " | traits/teams: " + teams + " | " + c.stars + "star red:" + c.redStars + " | ISO:" + c.iso + " | lvl:" + c.level;
    }).join("\n");

    // ── 3. Trait index ──────────────────────────────────────────────────────
    const traitMap = {};
    roster.forEach(c => {
      [...(c.roles || []), ...(c.teams || [])].forEach(t => {
        if (!traitMap[t]) traitMap[t] = [];
        traitMap[t].push(c.name);
      });
    });
    const traitIndex = Object.entries(traitMap)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([trait, names]) => "  " + trait + " (" + names.length + "): " + names.join(", "))
      .join("\n");

    // ── 4. Squads ───────────────────────────────────────────────────────────
    const squadSummary = squads.length
      ? squads.map(s => {
          const total = s.members.reduce((a, m) => a + m.power, 0);
          const memberList = s.members.map(m => m.name + (m.power ? " " + Math.round(m.power/1000) + "k" : "")).join(", ");
          return "  " + s.name + " [" + (s.type || "Squad") + "]: " + memberList + " | total: " + Math.round(total / 1000) + "k";
        }).join("\n")
      : "  No saved squads.";

    // ── 5. Active events ────────────────────────────────────────────────────
    const activeEvents = playerEvents.filter(ev => ev.endTime > now);
    const endedEvents  = playerEvents.filter(ev => ev.endTime <= now);
    const eventLines = activeEvents.length
      ? activeEvents.map(ev => {
          const hoursLeft = Math.round((ev.endTime - now) / 3600);
          const days      = Math.floor(hoursLeft / 24);
          const hrs       = hoursLeft % 24;
          const timeStr   = days > 0 ? days + "d " + hrs + "h remaining" : hrs + "h remaining";
          const ids       = (ev.episodic && ev.episodic.ids) || [];
          const tiers     = ids.length ? " | difficulties: " + ids.map(id => ({A:"Easy",B:"Normal",C:"Hard"}[id.slice(-1)] || id.slice(-1))).join("/") : "";
          return "  " + (ev.name || "Event") + (ev.subName ? " — " + ev.subName : "") + " | " + timeStr + tiers + (ev.details ? " | " + ev.details.replace(/\n/g," ").slice(0,120) : "");
        }).join("\n")
      : "  No active events.";
    const endedLines = endedEvents.length
      ? "  Ended recently: " + endedEvents.map(ev => ev.name || "Event").slice(0,5).join(", ")
      : "";

    // ── 6. Alliance ─────────────────────────────────────────────────────────
    let allianceSection = "Not available.";
    if (allianceCard) {
      const tcp = allianceCard.tcp ? Math.round(allianceCard.tcp / 1000000) + "M" : "?";
      allianceSection = "Name: " + (allianceCard.name || "?") + " | Members: " + (allianceCard.memberCount || "?") + " | TCP: " + tcp + " | War rating: " + (allianceCard.warRating || "?") + " | Raid rating: " + (allianceCard.raidRating || "?") + (allianceCard.description ? " | Desc: " + allianceCard.description : "");
    }

    // ── 7. Inventory summary ─────────────────────────────────────────────────
    let inventorySection = "Not available.";
    if (playerInventory.length) {
      // Categorise and summarise — full detail for shards, grouped totals for the rest
      const shards = playerInventory.filter(i => i.item && i.item.startsWith("SHARD_"))
        .sort((a, b) => b.quantity - a.quantity)
        .map(i => i.item.replace("SHARD_","") + ":" + i.quantity);
      const orbs = playerInventory.filter(i => i.item && i.item.startsWith("ORB_"))
        .sort((a, b) => b.quantity - a.quantity)
        .map(i => i.item.replace("ORB_","") + ":" + i.quantity);
      const currency = playerInventory.filter(i => i.item && i.item.startsWith("CURRENCY_"))
        .map(i => i.item.replace("CURRENCY_","") + ":" + i.quantity);
      const gear = playerInventory.filter(i => i.item && (i.item.startsWith("GEAR_") || i.item.startsWith("MATERIAL_")));
      const consumables = playerInventory.filter(i => i.item && i.item.startsWith("CONSUMABLE_"))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20)
        .map(i => i.item.replace("CONSUMABLE_","") + ":" + i.quantity);
      const other = playerInventory.filter(i => i.item && !i.item.startsWith("SHARD_") && !i.item.startsWith("ORB_") && !i.item.startsWith("CURRENCY_") && !i.item.startsWith("GEAR_") && !i.item.startsWith("MATERIAL_") && !i.item.startsWith("CONSUMABLE_"))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20)
        .map(i => i.item + ":" + i.quantity);
      inventorySection =
        "  Character shards (" + shards.length + " types): " + (shards.slice(0, 60).join(", ") || "none") +
        "\n  Orbs (" + orbs.length + " types): " + (orbs.join(", ") || "none") +
        "\n  Currency: " + (currency.join(", ") || "none") +
        "\n  Gear & materials: " + gear.length + " types (" + gear.reduce((a, i) => a + i.quantity, 0) + " total pieces)" +
        (consumables.length ? "\n  Consumables (top 20): " + consumables.join(", ") : "") +
        (other.length ? "\n  Other (top 20): " + other.join(", ") : "");
    }

    // ── 8. Campaigns ────────────────────────────────────────────────────────
    let campaignSection = "Not available.";
    if (campaigns.length) {
      function extractReqs(reqs) {
        if (!reqs) return [];
        const out = [];
        if (reqs.minCharacters) out.push(reqs.minCharacters + " chars required");
        if (reqs.minPower) out.push("min " + Math.round(reqs.minPower/1000) + "k power");
        if (reqs.maxPower) out.push("max " + Math.round(reqs.maxPower/1000) + "k power");
        if (reqs.anyCharacterFilters) {
          reqs.anyCharacterFilters.forEach(f => {
            const traits = (f.allTraits || []).map(t => t.name || t.id || t).filter(Boolean);
            if (traits.length) out.push("needs trait: " + traits.join("+"));
          });
        }
        if (reqs.allCharacterFilters) {
          reqs.allCharacterFilters.forEach(f => {
            const traits = (f.allTraits || []).map(t => t.name || t.id || t).filter(Boolean);
            if (traits.length) out.push("all must have: " + traits.join("+"));
          });
        }
        return out;
      }

      campaignSection = campaigns.map(camp => {
        const numChapters = camp.numChapters || Object.keys(camp.chapters || {}).length;
        const topReqs = extractReqs(camp.requirements);
        let lines = "Campaign: " + (camp.name || camp.id) + " | " + numChapters + " chapters" +
          (topReqs.length ? " | global: " + topReqs.join(", ") : "") +
          (camp.details ? " | " + camp.details.replace(/\n/g," ").slice(0,80) : "");

        const nodeData = campaignNodes[camp.id];
        if (nodeData && nodeData.chapters) {
          const diffLabels = { A:"Easy", B:"Normal", C:"Hard" };
          Object.entries(nodeData.chapters).forEach(([chNum, chapter]) => {
            const chReqs = extractReqs(chapter.requirements);
            lines += "\n  Ch" + chNum + (chapter.name ? " " + chapter.name : "") +
              (chReqs.length ? " [" + chReqs.join(", ") + "]" : "");
            if (chapter.tiers) {
              Object.entries(chapter.tiers).forEach(([diff, tier]) => {
                const label = diffLabels[diff] || diff;
                const tierReqs = extractReqs(tier.requirements);
                if (tierReqs.length) lines += "\n    " + label + " [" + tierReqs.join(", ") + "]";
                if (tier.nodes) {
                  Object.entries(tier.nodes).forEach(([nodeNum, node]) => {
                    const nodeReqs = extractReqs(node.requirements);
                    if (nodeReqs.length) lines += "\n      Node " + nodeNum + " " + label + " [" + nodeReqs.join(", ") + "]";
                  });
                }
              });
            }
          });
        }
        return lines;
      }).join("\n");
    }

    // ── 9. Available raids & DDs (by id) ────────────────────────────────────
    const raidsSection   = raidIds.length   ? raidIds.join(", ")  : "None available.";
    const ddsSection     = ddIds.length     ? ddIds.join(", ")    : "None available.";

    // ── Assemble ────────────────────────────────────────────────────────────
    const avgPower = roster.length ? Math.round(roster.reduce((a, c) => a + c.power, 0) / roster.length / 1000) : 0;
    const t13 = roster.filter(c => c.tier === "T13").length;
    const t12 = roster.filter(c => c.tier === "T12").length;

    return [
      "=== PLAYER CARD ===",
      cardSection,
      "",
      "=== ROSTER SUMMARY ===",
      roster.length + " characters | avg " + avgPower + "k | T13: " + t13 + " | T12: " + t12,
      "",
      "=== FULL ROSTER (name | tier | power | roles | traits/teams | stars | ISO | level) ===",
      charLines,
      "",
      "=== TRAIT & TEAM INDEX (characters who share each trait) ===",
      traitIndex,
      "",
      "=== SAVED SQUADS ===",
      squadSummary,
      "",
      "=== ACTIVE EVENTS ===",
      eventLines,
      endedLines,
      "",
      "=== ALLIANCE ===",
      allianceSection,
      "",
      "=== INVENTORY ===",
      inventorySection,
      "",
      "=== CAMPAIGNS ===",
      campaignSection,
      "",
      "=== AVAILABLE RAIDS (IDs) ===",
      raidsSection,
      "",
      "=== AVAILABLE DARK DIMENSIONS (IDs) ===",
      ddsSection,
    ].join("\n");
  }

  // ── Markdown renderer ────────────────────────────────────────────────────────
  function renderMarkdown(text) {
    // Escape HTML first to prevent injection
    const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

    const lines = text.split("\n");
    let html = "";
    let inUl = false, inOl = false;

    const closeList = () => {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
    };

    const inlineFormat = s => s
      // Bold **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      // Italic *text* or _text_ (not inside words)
      .replace(/(?<!\w)\*(?!\*)(.+?)\*(?!\*)(?!\w)/g, "<em>$1</em>")
      .replace(/(?<!\w)_(?!_)(.+?)_(?!_)(?!\w)/g, "<em>$1</em>")
      // Inline code `code`
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Tier badges T13, T12, etc. → styled span
      .replace(/\b(T1[0-9]|T[1-9])\b/g, '<span class="ai-tier-badge">$1</span>')
      // Power values like 348k → accent color
      .replace(/\b(\d+\.?\d*[kKmM])\b/g, '<span class="ai-power-val">$1</span>');

    lines.forEach(raw => {
      const line = raw.trimEnd();

      // H3 ### heading
      if (/^### (.+)/.test(line)) {
        closeList();
        html += `<h3 class="ai-h3">${inlineFormat(esc(line.replace(/^### /,"").trim()))}</h3>`;
        return;
      }
      // H2 ## heading
      if (/^## (.+)/.test(line)) {
        closeList();
        html += `<h2 class="ai-h2">${inlineFormat(esc(line.replace(/^## /,"").trim()))}</h2>`;
        return;
      }
      // H1 # heading
      if (/^# (.+)/.test(line)) {
        closeList();
        html += `<h2 class="ai-h2">${inlineFormat(esc(line.replace(/^# /,"").trim()))}</h2>`;
        return;
      }
      // Horizontal rule ---
      if (/^-{3,}$/.test(line.trim())) {
        closeList();
        html += `<hr class="ai-hr">`;
        return;
      }
      // Unordered list
      if (/^[\*\-] (.+)/.test(line)) {
        if (!inUl) { closeList(); html += "<ul class='ai-ul'>"; inUl = true; }
        html += `<li>${inlineFormat(esc(line.replace(/^[\*\-] /,"").trim()))}</li>`;
        return;
      }
      // Ordered list
      if (/^\d+\. (.+)/.test(line)) {
        if (!inOl) { closeList(); html += "<ol class='ai-ol'>"; inOl = true; }
        html += `<li>${inlineFormat(esc(line.replace(/^\d+\. /,"").trim()))}</li>`;
        return;
      }
      // Bold-only line (acts as a mini-header)
      if (/^\*\*(.+)\*\*$/.test(line.trim())) {
        closeList();
        html += `<p class="ai-bold-line">${inlineFormat(esc(line.trim()))}</p>`;
        return;
      }
      // Empty line → paragraph break
      if (line.trim() === "") {
        closeList();
        html += `<div class="ai-spacer"></div>`;
        return;
      }
      // Normal paragraph line
      closeList();
      html += `<p class="ai-p">${inlineFormat(esc(line.trim()))}</p>`;
    });

    closeList();
    return html;
  }

  function addMessage(role, text, isLoading) {
    const container = document.getElementById("ai-messages");
    const div = document.createElement("div");
    div.className = "ai-msg " + role + (isLoading ? " loading" : "");
    const bubble = document.createElement("div");
    bubble.className = "ai-msg-bubble";
    if (isLoading || role === "user") {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = renderMarkdown(text);
    }
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  async function sendMessage(text) {
    switchTab("ai");
    if (!text || !text.trim()) return;
    addMessage("user", text);
    chatHistory.push({ role: "user", content: text });
    saveChatHistory();

    const loadingEl = addMessage("assistant", "Analyzing...", true);

    const systemPrompt = `You are an expert Marvel Strike Force tactical advisor for the player SuperZero. Here is their current roster and squad data:

${buildContext()}

BEHAVIOR RULES — strictly follow these before every response:
1. ALWAYS check the node/campaign requirements in the context above before giving advice about a specific mission or node. The exact trait, power, and character requirements are listed in the CAMPAIGNS section. Use them — never guess.
2. If the player asks about a specific node (e.g. "Heroes 7-3 Hard") and the requirements are in context, state them explicitly at the top of your response before advising.
3. If requirements are NOT in the context, use web_search immediately to look them up on sites like msf.gg, marvel.church, or msfgg. Do not advise until you have the actual requirement.
4. Cross-check every team suggestion against the player's actual roster in the FULL ROSTER section. Name real characters they own, with their actual tier and power.
5. Never make up requirements or synergies. If unsure, search first.

FORMATTING RULES:
- Use **bold** for character names, team names, and key terms
- Use ## for section headers when covering multiple topics
- Use bullet lists for recommendations and character lists
- Use numbered lists for step-by-step priorities
- Keep paragraphs short — 2-3 sentences max
- Always cite the specific node requirement at the start of mission-specific advice
- End with a clear "**Priority:**" or "**Next step:**" line`;

    const tools = [{ type: "web_search_20250305", name: "web_search" }];

    // Agentic loop: keep calling until stop_reason is "end_turn"
    // This ensures web_search results are fed back before the final answer
    const agentMessages = [...chatHistory];
    let finalReply = "";
    let loopCount = 0;
    const MAX_LOOPS = 5;

    try {
      while (loopCount < MAX_LOOPS) {
        loopCount++;

        const res = await fetch("https://msf-ai-proxy.rtatman-shops.workers.dev", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 2048,
            system: systemPrompt,
            tools: tools,
            messages: agentMessages
          })
        });

        const data = await res.json();
        if (!data.content) break;

        const stopReason = data.stop_reason;

        // Collect any text from this turn
        const textBlocks = data.content.filter(b => b.type === "text");
        if (textBlocks.length) {
          finalReply = textBlocks.map(b => b.text).join("");
          // Update bubble live so user sees progress
          loadingEl.querySelector(".ai-msg-bubble").innerHTML = renderMarkdown(finalReply);
          document.getElementById("ai-messages").scrollTop = document.getElementById("ai-messages").scrollHeight;
        }

        // Add assistant turn to agent history
        agentMessages.push({ role: "assistant", content: data.content });

        // If done, exit loop
        if (stopReason === "end_turn" || stopReason === "stop_sequence") break;

        // If tool_use, collect all tool_use blocks and build tool_result message
        const toolUseBlocks = data.content.filter(b => b.type === "tool_use");
        if (toolUseBlocks.length === 0) break; // nothing to process

        // Update loading message to show search is happening
        if (loopCount === 1) {
          loadingEl.querySelector(".ai-msg-bubble").textContent = "Searching for current data...";
          loadingEl.querySelector(".ai-msg-bubble").style.fontFamily = "var(--font-mono)";
          loadingEl.querySelector(".ai-msg-bubble").style.fontSize = "12px";
          loadingEl.querySelector(".ai-msg-bubble").style.color = "var(--text-dim)";
        }

        // Feed all tool results back in a single user message
        const toolResults = toolUseBlocks.map(block => ({
          type: "tool_result",
          tool_use_id: block.id,
          content: block.input && block.input.query
            ? "[Web search for: " + block.input.query + " — results will be provided by the tool]"
            : "[Tool result]"
        }));

        agentMessages.push({ role: "user", content: toolResults });
      }

      if (!finalReply) {
        finalReply = "Sorry, I couldn't get a response. Try again.";
      }

      // Commit the final exchange to persistent chat history
      chatHistory.push({ role: "assistant", content: finalReply });

      loadingEl.classList.remove("loading");
      loadingEl.querySelector(".ai-msg-bubble").style = "";
      loadingEl.querySelector(".ai-msg-bubble").innerHTML = renderMarkdown(finalReply);
      document.getElementById("ai-messages").scrollTop = document.getElementById("ai-messages").scrollHeight;

      saveChatHistory();
    } catch (e) {
      console.error("AI error:", e);
      loadingEl.classList.remove("loading");
      loadingEl.querySelector(".ai-msg-bubble").textContent = "Could not reach the AI. Check your connection and try again.";
    }
  }

  function sendCustom() {
    const input = document.getElementById("ai-input");
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    sendMessage(q);
  }

  function clearChat() {
    chatHistory = [];
    try { localStorage.removeItem("msf_chat_history"); } catch(e) {}
    document.getElementById("ai-messages").innerHTML = "";
    addMessage("assistant", "Chat cleared! Ask me anything about your roster, squads, or strategy.");
  }

  // ── Render player card ─────────────────────────────────────────────────────
  function renderCard() {
    const el = document.getElementById("player-card");
    if (!card && !roster.length) {
      el.innerHTML = '<p style="padding:3rem;text-align:center;color:var(--text-dim);font-size:14px;font-family:var(--font-mono)">Player card not available. Try signing out and back in.</p>';
      return;
    }

    // ── Pull all data ───────────────────────────────────────────────────────
    const name      = (card && card.name) || "Commander";
    const level     = card ? ((card.level && card.level.completedTier) ? card.level.completedTier : (card.level || "—")) : "—";
    const tcp       = (card && card.tcp) || 0;
    const stp       = (card && card.stp) || 0;
    const chars     = (card && card.charactersCollected) || roster.length;
    const arena     = (card && card.latestArena) || "—";
    const blitz     = (card && card.latestBlitz) ? Math.round(card.latestBlitz / 1000) + "k" : "—";
    const blitzWins = (card && card.blitzWins) || "—";
    const initials  = name.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "??";

    // ── Derived roster stats ─────────────────────────────────────────────────
    const sortedByPower = [...roster].sort((a, b) => b.power - a.power);
    const bestChar      = sortedByPower[0] || null;
    const top5          = sortedByPower.slice(0, 5);
    const t13Count      = roster.filter(c => c.tier === "T13").length;
    const t12Count      = roster.filter(c => c.tier === "T12").length;
    const avgPower      = roster.length ? Math.round(roster.reduce((a, c) => a + c.power, 0) / roster.length) : 0;

    // Role distribution
    const roleDist = {};
    roster.forEach(c => { roleDist[c.role] = (roleDist[c.role] || 0) + 1; });
    const topRole = Object.entries(roleDist).sort((a,b) => b[1]-a[1])[0];

    // Best squad (highest total power from squads array, or derived from top5)
    let bestSquad = null;
    if (squads.length) {
      bestSquad = [...squads].sort((a, b) => {
        const ap = a.members.reduce((s, m) => s + (m.power || 0), 0);
        const bp = b.members.reduce((s, m) => s + (m.power || 0), 0);
        return bp - ap;
      })[0];
    }

    // Alliance info
    const allianceName  = allianceCard ? (allianceCard.name || "—") : "—";
    const allianceRank  = allianceCard ? (allianceCard.warRating || allianceCard.raidRating || "—") : "—";
    const allianceTCP   = allianceCard && allianceCard.tcp ? Math.round(allianceCard.tcp / 1000000) + "M" : "—";
    const allianceMembers = allianceCard ? (allianceCard.memberCount || "—") : "—";

    // ── Helpers ──────────────────────────────────────────────────────────────
    function portImg(c, cls, style) {
      if (!c) return "";
      const url = getPortraitUrl(c);
      const fb  = makeFallbackAvatar(c.name, c.role).replace(/"/g,"'").replace(/\n/g,"");
      return `<img src="${url}" class="${cls}" style="${style||""}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy"/>
        <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;position:absolute;inset:0">${fb}</div>`;
    }

    function statBox(label, val, accent) {
      return `<div class="cmd-stat">
        <div class="cmd-stat-label">${label}</div>
        <div class="cmd-stat-val" style="${accent ? "color:"+accent : ""}">${val}</div>
      </div>`;
    }

    // ── Tier distribution bar ─────────────────────────────────────────────────
    const tierOrder  = ["T13","T12","T11","T10","T9","T8","T7","T6","T5","T4","T3","T2","T1"];
    const tierColors = { T13:"#00c8ff", T12:"#00e676", T11:"#f0a500", T10:"#b46eff", T9:"#ff7b00", T8:"#ff3e3e" };
    const tierCounts = {};
    roster.forEach(c => { tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1; });
    const tierBarHtml = tierOrder
      .filter(t => tierCounts[t])
      .map(t => {
        const pct = Math.round(tierCounts[t] / roster.length * 100);
        const col = tierColors[t] || "#324d62";
        return `<div class="tier-bar-seg" style="width:${pct}%;background:${col}" title="${t}: ${tierCounts[t]} characters (${pct}%)"></div>`;
      }).join("");

    const tierLegendHtml = tierOrder
      .filter(t => tierCounts[t])
      .map(t => {
        const col = tierColors[t] || "#324d62";
        return `<span class="tier-legend-item"><span class="tier-legend-dot" style="background:${col}"></span>${t} <span style="color:var(--text-dim)">${tierCounts[t]}</span></span>`;
      }).join("");

    // ── Best squad member icons ───────────────────────────────────────────────
    const rosterByName = {};
    roster.forEach(c => { rosterByName[c.name.toLowerCase()] = c; });

    let bestSquadHtml = "";
    if (bestSquad) {
      const teamName = detectTeamName(
        bestSquad.members.map(m => rosterByName[m.name.toLowerCase()] || { name: m.name, teams: [], roles: [] })
      );
      const total = bestSquad.members.reduce((a, m) => a + (m.power || 0), 0);
      bestSquadHtml = `
        <div class="cmd-section">
          <div class="cmd-section-label">Top Squad${teamName ? " — " + teamName : ""}</div>
          <div class="cmd-squad-row">
            ${bestSquad.members.map(m => {
              const rc = rosterByName[m.name.toLowerCase()];
              const url = rc ? getPortraitUrl(rc) : "";
              const roleColor = rc ? (ROLE_COLORS[rc.role] || "#00c8ff") : "#00c8ff";
              const fb = makeFallbackAvatar(m.name, rc ? rc.role : "").replace(/"/g,"'").replace(/\n/g,"");
              return `<div class="cmd-squad-member">
                <div class="cmd-squad-icon" style="border-color:${roleColor};box-shadow:0 0 10px ${roleColor}40">
                  <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy"/>
                  <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center">${fb}</div>
                </div>
                <div class="cmd-squad-name">${m.name.split(" ")[0]}</div>
                <div class="cmd-squad-power">${m.power ? Math.round(m.power/1000)+"k" : rc ? Math.round(rc.power/1000)+"k" : "—"}</div>
              </div>`;
            }).join("")}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-dim)">
            <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em">${bestSquad.name}</span>
            <span style="font-family:var(--font-hud);font-size:13px;font-weight:700;color:var(--accent)">${Math.round(total/1000)}k total</span>
          </div>
        </div>`;
    }

    // ── Top 5 characters ─────────────────────────────────────────────────────
    const top5Html = top5.map((c, i) => {
      const url = getPortraitUrl(c);
      const roleColor = ROLE_COLORS[c.role] || "#00c8ff";
      const fb = makeFallbackAvatar(c.name, c.role).replace(/"/g,"'").replace(/\n/g,"");
      const isTop = i === 0;
      return `<div class="cmd-top-char${isTop ? " cmd-top-char--hero" : ""}">
        <div class="cmd-top-rank">#${i+1}</div>
        <div class="cmd-top-port" style="border-color:${isTop ? "var(--accent)" : roleColor};${isTop ? "box-shadow:0 0 18px var(--accent-glow)" : ""}">
          <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy"/>
          <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center">${fb}</div>
        </div>
        <div class="cmd-top-name">${c.name}</div>
        <div class="cmd-top-tier">
          <span class="tier-badge ${tierClass(c.tier)}" style="font-size:8px;padding:1px 4px;border:1px solid">${c.tier}</span>
        </div>
        <div class="cmd-top-power">${Math.round(c.power/1000)}k</div>
      </div>`;
    }).join("");

    // ── Assemble ─────────────────────────────────────────────────────────────
    el.innerHTML = `
      <div class="cmd-page">

        <!-- Hero Banner -->
        <div class="cmd-hero">
          <div class="cmd-hero-bg">
            ${bestChar ? `<img src="${getPortraitUrl(bestChar)}"
              onerror="this.style.display='none'"
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;opacity:0.18;filter:blur(2px) saturate(1.5)" loading="lazy"/>` : ""}
          </div>
          <div class="cmd-hero-content">
            <div class="cmd-avatar-ring">
              <div class="cmd-avatar">${initials}</div>
            </div>
            <div class="cmd-hero-info">
              <div class="cmd-commander-label">Commander</div>
              <div class="cmd-commander-name">${name}</div>
              <div class="cmd-commander-meta">
                <span class="cmd-meta-pill">Lvl ${level}</span>
                ${allianceName !== "—" ? `<span class="cmd-meta-pill cmd-meta-alliance">⚔ ${allianceName}</span>` : ""}
                <span class="cmd-meta-pill">${chars} Characters</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Core stats row -->
        <div class="cmd-stats-row">
          ${statBox("Total Power", tcp ? Math.round(tcp/1000)+"k" : avgPower ? Math.round(avgPower/1000)+"k avg" : "—", "var(--accent)")}
          ${statBox("T13 Characters", t13Count, t13Count > 0 ? "var(--accent)" : null)}
          ${statBox("T12 Characters", t12Count, "var(--green)")}
          ${statBox("Arena Rank", arena)}
          ${statBox("Blitz Score", blitz)}
          ${statBox("Blitz Wins", blitzWins)}
          ${stp ? statBox("Squad Power", Math.round(stp/1000)+"k") : ""}
        </div>

        <!-- Tier distribution -->
        <div class="cmd-section">
          <div class="cmd-section-label">Roster Tier Distribution</div>
          <div class="cmd-tier-bar">${tierBarHtml}</div>
          <div class="cmd-tier-legend">${tierLegendHtml}</div>
        </div>

        <!-- Top 5 characters -->
        <div class="cmd-section">
          <div class="cmd-section-label">Top Characters by Power</div>
          <div class="cmd-top5-row">${top5Html}</div>
        </div>

        <!-- Best squad -->
        ${bestSquadHtml}

        <!-- Alliance block -->
        ${allianceCard && allianceCard.name ? `
        <div class="cmd-section">
          <div class="cmd-section-label">Alliance</div>
          <div class="cmd-alliance-grid">
            <div class="cmd-alliance-name">${allianceCard.name}</div>
            ${allianceCard.description ? `<div class="cmd-alliance-desc">${allianceCard.description}</div>` : ""}
            <div class="cmd-alliance-stats">
              ${allianceTCP !== "—" ? statBox("Alliance Power", allianceTCP, "var(--accent)") : ""}
              ${statBox("Members", allianceMembers)}
              ${allianceCard.warRating ? statBox("War Rating", allianceCard.warRating, "var(--red)") : ""}
              ${allianceCard.raidRating ? statBox("Raid Rating", allianceCard.raidRating, "var(--green)") : ""}
            </div>
          </div>
        </div>` : ""}

        <!-- Role distribution -->
        <div class="cmd-section">
          <div class="cmd-section-label">Roster Role Composition</div>
          <div class="cmd-role-grid">
            ${Object.entries(roleDist).sort((a,b)=>b[1]-a[1]).map(([role, count]) => {
              const color = ROLE_COLORS[role] || "#4a5568";
              const pct   = Math.round(count / roster.length * 100);
              return `<div class="cmd-role-item">
                <div class="cmd-role-label" style="color:${color}">${role}</div>
                <div class="cmd-role-bar-bg">
                  <div class="cmd-role-bar-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                <div class="cmd-role-count">${count}</div>
              </div>`;
            }).join("")}
          </div>
        </div>

      </div>`;
  }

  // ── Character modal ─────────────────────────────────────────────────────────
  async function openModal(idx) {
    const c = (window._filteredRoster || [])[idx];
    if (!c) return;

    // Set portrait in header
    const headerEl = document.getElementById("modal-portrait-header");
    const portUrl = getPortraitUrl(c);
    const roleColor = ROLE_COLORS[c.role] || "#00c8ff";
    const fallback = makeFallbackAvatar(c.name, c.role).replace(/"/g, "'").replace(/\n/g, "");
    headerEl.style.background = `linear-gradient(135deg, ${roleColor}22 0%, var(--bg-deep) 100%)`;

    // Replace fallback content with portrait image
    headerEl.innerHTML = `
      <img src="${portUrl}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
      <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:5rem;position:absolute;inset:0">${fallback}</div>
      <div class="modal-portrait-gradient"></div>
      <div class="modal-portrait-info">
        <div id="modal-name" class="modal-title">${c.name}</div>
        <div id="modal-tier-badge"><span class="tier-badge ${tierClass(c.tier)}" style="font-size:10px;padding:2px 6px;border:1px solid">${c.tier}</span></div>
      </div>`;

    const rolesEl = document.getElementById("modal-roles");
    rolesEl.innerHTML = c.roles && c.roles.length
      ? c.roles.map(r => '<span class="modal-badge role">' + r + '</span>').join("")
      : '<span style="font-size:13px;color:var(--text-dim)">Unknown</span>';

    const teamsEl = document.getElementById("modal-teams");
    teamsEl.innerHTML = c.teams && c.teams.length
      ? c.teams.map(t => '<span class="modal-badge">' + t + '</span>').join("")
      : '<span style="font-size:13px;color:var(--text-dim)">None</span>';

    // Stats
    const statsEl = document.getElementById("modal-stats");
    statsEl.innerHTML = [
      ["Power",     c.power ? Math.round(c.power/1000) + "k" : "—"],
      ["Level",     c.level || "—"],
      ["Stars",     (c.stars || 0) + "★"],
      ["Red stars", (c.redStars || 0) + "★"],
      ["Gear tier", c.tier],
      ["ISO class", c.iso || "—"]
    ].map(([label, val]) =>
      '<div class="modal-stat"><div class="modal-stat-label">' + label + '</div><div class="modal-stat-val">' + val + '</div></div>'
    ).join("");

    // Shards
    const invMap = getInventoryMap();
    const shardId = "SHARD_" + (c.name.replace(/\s/g, "").toUpperCase());
    const altShardId = "SHARD_" + (c.name.replace(/[\s-]/g, "").toUpperCase());
    const shardsOwned = invMap[shardId] || invMap[altShardId] || 0;
    const currentStars = c.stars || 0;
    const nextStarNeeded = STAR_THRESHOLDS[currentStars + 1] || STAR_THRESHOLDS[7];
    const pct = nextStarNeeded > 0 ? Math.min(100, Math.round(shardsOwned / nextStarNeeded * 100)) : 100;
    const shardsEl = document.getElementById("modal-shards");
    if (shardsOwned > 0 || currentStars < 7) {
      shardsEl.innerHTML =
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">' +
        '<span>' + shardsOwned + ' shards owned</span>' +
        (currentStars < 7 ? '<span style="color:var(--text-dim)">' + nextStarNeeded + ' needed for ' + (currentStars+1) + '★</span>' : '<span style="color:var(--green)">Max stars!</span>') +
        '</div>' +
        '<div class="modal-shard-bar"><div class="modal-shard-fill" style="width:' + pct + '%"></div></div>' +
        '<a href="https://msf.gg/characters/' + c.name.replace(/ /g, "") + '" target="_blank" style="font-size:11px;color:var(--accent);display:block;margin-top:6px;text-decoration:none">View on msf.gg ↗</a>';
    } else {
      shardsEl.innerHTML = '<span style="font-size:13px;color:var(--text-dim)">No shards in inventory</span>';
    }

    document.getElementById("char-modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Gear for next tier
    const gearEl = document.getElementById("modal-gear");
    const currentTierNum = parseInt((c.tier || "T1").replace("T", "")) || 1;
    const nextTierNum = currentTierNum + 1;
    const charId = c.name.replace(/\s/g, "");

    try {
      const token = sessionStorage.getItem("msf_token");
      const headers = { "x-api-key": API_KEY, "Authorization": "Bearer " + token };
      const res = await fetch(API_BASE + "/game/v1/characters/" + charId, { headers });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const gearTiers = data.data && data.data.gearTiers;
      const nextTier = gearTiers && gearTiers[nextTierNum];

      if (!nextTier || !nextTier.slots) {
        gearEl.innerHTML = '<span style="font-size:13px;color:var(--text-dim)">' + (nextTierNum > 20 ? "Max gear tier reached!" : "No gear data for T" + nextTierNum) + '</span>';
      } else {
        gearEl.className = "modal-gear-grid";
        gearEl.innerHTML = nextTier.slots.map(slot => {
          const piece = slot.piece;
          const owned = invMap[piece.id] || 0;
          const needed = slot.level || 1;
          const hasEnough = owned >= needed;
          return '<div class="modal-gear-piece" style="border:1px solid ' + (hasEnough ? "rgba(0,230,118,0.3)" : "var(--border-dim)") + '">' +
            '<img class="modal-gear-icon" src="' + piece.icon + '" onerror="this.style.display=\'none\'" />' +
            '<div class="modal-gear-name">' + piece.name + '</div>' +
            '<div class="modal-gear-level" style="color:' + (hasEnough ? "var(--green)" : "var(--gold)") + '">' +
            owned + ' / ' + needed + '</div>' +
            '</div>';
        }).join("");
      }
    } catch(e) {
      gearEl.className = "";
      gearEl.innerHTML = '<span style="font-size:13px;color:var(--text-dim)">Could not load gear data.</span>';
    }
  }

  function closeModal(e) {
    if (e && e.target !== document.getElementById("char-modal")) return;
    document.getElementById("char-modal").classList.add("hidden");
    document.body.style.overflow = "";
  }

  // ── Activity modal ──────────────────────────────────────────────────────────
  async function openActivityModal(ev) {
    if (typeof ev === "number") ev = playerEvents[ev];
    if (!ev) return;

    document.getElementById("act-modal-title").textContent = ev.name || "Event";
    document.getElementById("act-modal-sub").textContent = ev.subName || "";
    document.getElementById("act-modal-details").textContent = ev.details || "No details available.";

    // Set icon/image on activity modal header
    const actPortrait = document.getElementById("act-modal-portrait");
    if (ev.image || ev.icon) {
      actPortrait.style.backgroundImage = "url(" + (ev.image || ev.icon) + ")";
      actPortrait.style.backgroundSize = "cover";
      actPortrait.style.backgroundPosition = "center";
    }

    const episodic = ev.episodic || {};
    const ids = episodic.ids || [];
    const tierLabels = { "A": "Easy", "B": "Normal", "C": "Hard" };
    const tiersEl = document.getElementById("act-modal-tiers");
    if (ids.length) {
      tiersEl.innerHTML = ids.map(id => {
        const suffix = id.slice(-1);
        return '<span class="activity-tier-badge">' + (tierLabels[suffix] || suffix) + '</span>';
      }).join("");
      document.getElementById("act-modal-tiers-section").style.display = "";
    } else {
      document.getElementById("act-modal-tiers-section").style.display = "none";
    }

    document.getElementById("activity-modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";

    const squadEl = document.getElementById("act-modal-squad");
    squadEl.textContent = "Analyzing your roster...";

    const details = (ev.details || "") + " " + (ev.name || "");
    const traitKeywords = ["Horsemen","Mystic","Mutant","Bio","MSF Original","Cosmic","Tech","Skill","City","Hero","Villain","Avenger","Guardian","Spider","X-Men","Fantastic","Defender","Inhumans"];
    const matchedTraits = traitKeywords.filter(t => details.toLowerCase().includes(t.toLowerCase()));
    const scored = roster.map(c => {
      let score = 0;
      const charTeams = (c.teams || []).join(" ") + " " + (c.roles || []).join(" ");
      matchedTraits.forEach(t => { if (charTeams.toLowerCase().includes(t.toLowerCase())) score++; });
      return { ...c, score };
    }).filter(c => c.score > 0 || matchedTraits.length === 0)
      .sort((a, b) => b.power - a.power).slice(0, 5);

    if (scored.length === 0) {
      squadEl.innerHTML = '<span style="color:var(--text-dim);font-size:13px">No matching characters found.</span>';
    } else {
      squadEl.className = "activity-modal-squad";
      squadEl.innerHTML = scored.map(c =>
        '<div class="activity-squad-member">' +
        '<div class="activity-squad-name">' + c.name + '</div>' +
        '<div class="activity-squad-power">' + Math.round(c.power/1000) + 'k · ' + c.tier + '</div>' +
        '</div>'
      ).join("");
    }
  }

  function closeActivityModal(e) {
    if (e && e.target !== document.getElementById("activity-modal")) return;
    document.getElementById("activity-modal").classList.add("hidden");
    document.body.style.overflow = "";
  }

  // ── Render activities ────────────────────────────────────────────────────────
  async function renderActivities() {
    const el = document.getElementById("activities-content");
    if (!el) return;
    el.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:1rem 0;font-family:var(--font-mono)">Loading activities...</div>';

    const token = sessionStorage.getItem("msf_token");
    const headers = { "x-api-key": API_KEY, "Authorization": "Bearer " + token };
    const now = Date.now() / 1000;

    function timeRemaining(endTime) {
      const diff = endTime - now;
      if (diff <= 0) return "Ended";
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      if (days > 0) return days + "d " + hours + "h";
      return hours + "h remaining";
    }

    function formatType(type) {
      if (!type) return "Event";
      return type.replace(/([A-Z])/g, " $1").trim();
    }

    function parseReqs(details) {
      if (!details) return "";
      const lines = details.split("\n").filter(l => l.trim().startsWith("-"));
      return lines.map(l => l.trim().replace(/^-\s*/, "")).join(" · ");
    }

    function keyRewards(nodeRewards) {
      if (!nodeRewards) return [];
      const boss = (nodeRewards.boss && nodeRewards.boss.allOf) || [];
      return boss.filter(r => r.item && !["SC","EVTA_SEASON_POINTS"].includes(r.item.id))
        .map(r => r.item.name).slice(0, 3);
    }

    // Activity type → emoji icon fallback
    const TYPE_ICONS = { Raid:"⚔️", "Dark Dimension":"🌑", Event:"⭐", Campaign:"📋", Blitz:"⚡" };

    function cardHTML(id, typeLabel, typeBadgeColor, name, subName, detail, metaLine, timeOrReq, imageUrl) {
      const imgSection = imageUrl
        ? `<img class="event-image" src="${imageUrl}" onerror="this.style.display='none'" loading="lazy" />`
        : `<div class="event-image-placeholder">${TYPE_ICONS[typeLabel] || "◆"}</div>`;

      return '<div class="event-card" id="card-' + id + '" data-activity-id="' + id + '">' +
        imgSection +
        '<div class="event-card-body">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div>' +
        '<div class="event-type-badge" style="background:' + typeBadgeColor + ';color:#fff">' + typeLabel + '</div>' +
        '<div class="event-name">' + name + '</div>' +
        (subName ? '<div class="event-subname">' + subName + '</div>' : '') +
        '</div>' +
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);white-space:nowrap;padding-left:8px;margin-top:2px">' + (timeOrReq || "") + '</div>' +
        '</div>' +
        '<div class="activity-expand hidden" id="expand-' + id + '">' +
        (detail ? '<div style="font-size:12px;color:var(--text-mid);line-height:1.6;margin:8px 0">' + detail + '</div>' : '') +
        (metaLine ? '<div style="font-size:10px;color:var(--text-dim);margin-bottom:5px;font-family:var(--font-mono)">' + metaLine + '</div>' : '') +
        '<div style="margin-top:7px"><div class="gm-squad-title">Best matching squad from your roster</div>' +
        '<div id="squad-' + id + '"><span style="color:var(--text-dim);font-size:11px;font-style:italic;font-family:var(--font-mono)">Loading recommendation...</span></div>' +
        '</div></div>' +
        '</div></div>';
    }

    let html = "";
    window._activityData = {};

    const activeEvents = playerEvents.filter(ev => ev.endTime > now);
    const endedEvents  = playerEvents.filter(ev => ev.endTime <= now);

    if (activeEvents.length) {
      html += '<div class="section-header">Active Events <span style="font-size:11px;color:var(--text-dim);font-weight:400;font-family:var(--font-mono)">(' + activeEvents.length + ')</span></div>';
      html += '<div class="activities-grid">';
      activeEvents.forEach((ev, i) => {
        const remaining = timeRemaining(ev.endTime);
        const ids = (ev.episodic && ev.episodic.ids) || [];
        const tiers = ids.length ? ids.map(id => { const s=id.slice(-1); return {A:"Easy",B:"Normal",C:"Hard"}[s]||s; }).join(" / ") : "";
        html += cardHTML("ev-" + i, formatType((ev.episodic && ev.episodic.typeName) || ev.type || "Event"), "#1a56a0", ev.name || "Event", ev.subName || "", ev.details || "", tiers ? "Difficulties: " + tiers : "", "⏱ " + remaining, ev.image || ev.icon || null);
      });
      html += '</div>';
    }

    html += '<div class="section-header" style="margin-top:1.25rem">Raids <span style="font-size:11px;color:var(--text-dim);font-weight:400;font-family:var(--font-mono)">(' + raidIds.length + ')</span></div>';
    html += '<div class="activities-grid" id="raids-cards">';
    if (raidIds.length === 0) html += '<span style="color:var(--text-dim);font-size:12px;font-family:var(--font-mono)">No raids available.</span>';
    else html += '<div style="color:var(--text-dim);font-size:12px;font-style:italic;font-family:var(--font-mono)">Loading raids...</div>';
    html += '</div>';

    html += '<div class="section-header" style="margin-top:1.25rem">Dark Dimensions <span style="font-size:11px;color:var(--text-dim);font-weight:400;font-family:var(--font-mono)">(' + ddIds.length + ')</span></div>';
    html += '<div class="activities-grid" id="dds-cards">';
    if (ddIds.length === 0) html += '<span style="color:var(--text-dim);font-size:12px;font-family:var(--font-mono)">No Dark Dimensions available.</span>';
    else html += '<div style="color:var(--text-dim);font-size:12px;font-style:italic;font-family:var(--font-mono)">Loading Dark Dimensions...</div>';
    html += '</div>';

    if (campaigns.length > 0) {
      html += '<div class="section-header" style="margin-top:1.25rem">Campaigns <span style="font-size:11px;color:var(--text-dim);font-weight:400;font-family:var(--font-mono)">(' + campaigns.length + ')</span></div>';
      html += '<div class="activities-grid">';
      campaigns.forEach((camp, i) => {
        const id = "camp-" + i;
        const numChapters = camp.numChapters || Object.keys(camp.chapters || {}).length;
        window._activityData[id] = { name: camp.name + " Campaign", detail: camp.details || "" };
        html += cardHTML(id, "Campaign", "#5b2b8c", camp.name || camp.id, "", camp.details || "", numChapters + " chapters", "", camp.image || null);
      });
      html += '</div>';
    }

    if (endedEvents.length) {
      html += '<div class="section-header" style="margin-top:1.25rem;color:var(--text-dim)">Ended Events <span style="font-size:11px;font-weight:400;font-family:var(--font-mono)">(' + endedEvents.length + ')</span></div>';
      html += '<div class="activities-grid">';
      endedEvents.forEach((ev, i) => {
        html += cardHTML("ev-ended-" + i, formatType(ev.type || "Event"), "#333", ev.name || "Event", ev.subName || "", ev.details || "", "", "Ended", null);
      });
      html += '</div>';
    }

    el.innerHTML = html;

    activeEvents.forEach((ev, i) => { window._activityData["ev-" + i] = { name: ev.name + " Event", detail: ev.details || "" }; });
    endedEvents.forEach((ev, i) => { window._activityData["ev-ended-" + i] = { name: ev.name + " Event", detail: ev.details || "" }; });

    // Fetch raids in parallel
    if (raidIds.length > 0) {
      const raidResults = await Promise.all(
        raidIds.map(id => fetch(API_BASE + "/game/v1/raids/" + id, { headers })
          .then(r => r.ok ? r.json() : null).catch(() => null))
      );
      const raidsEl = document.getElementById("raids-cards");
      if (raidsEl) {
        const raidCards = raidResults.filter(Boolean).map(r => r.data).filter(Boolean);
        raidsEl.innerHTML = raidCards.map((raid, idx) => {
          const reqs = parseReqs(raid.details);
          const rewards = keyRewards(raid.nodeRewards);
          const id = "raid-" + idx;
          window._activityData[id] = { name: raid.name + " Raid", detail: (raid.details || "") + (rewards.length ? " Rewards: " + rewards.join(", ") : "") };
          return cardHTML(id, "Raid", "#1a5c1a", raid.name || raid.id, raid.subName || "", reqs, rewards.length ? "Boss drops: " + rewards.join(", ") : "", raid.teams ? raid.teams + " teams · " + raid.hours + "h" : "", raid.image || raid.icon || null);
        }).join("") || '<span style="color:var(--text-dim);font-size:12px;font-family:var(--font-mono)">No raid data.</span>';
      }
    }

    // Fetch DDs in parallel
    if (ddIds.length > 0) {
      const ddResults = await Promise.all(
        ddIds.map(id => fetch(API_BASE + "/game/v1/dds/" + id, { headers })
          .then(r => r.ok ? r.json() : null).catch(() => null))
      );
      const ddsEl = document.getElementById("dds-cards");
      if (ddsEl) {
        const ddCards = ddResults.filter(Boolean).map(r => r.data).filter(Boolean);
        ddsEl.innerHTML = ddCards.map((dd, idx) => {
          const reqs = parseReqs(dd.details);
          const tiers = dd.ddCompletion && dd.ddCompletion.tiers ? Object.keys(dd.ddCompletion.tiers).length : 0;
          const id = "dd-" + idx;
          window._activityData[id] = { name: dd.name + " Dark Dimension", detail: dd.details || "" };
          return cardHTML(id, "Dark Dimension", "#5c2200", dd.name || dd.id, dd.subName || "", reqs, tiers ? tiers + " completion tier" + (tiers > 1 ? "s" : "") : "", "", dd.image || dd.icon || null);
        }).join("") || '<span style="color:var(--text-dim);font-size:12px;font-family:var(--font-mono)">No Dark Dimension data.</span>';
      }
    }
  }

  window._expandedCards = {};

  function toggleActivityCard(id) {
    const expand = document.getElementById("expand-" + id);
    if (!expand) return;
    const isHidden = expand.classList.contains("hidden");
    expand.classList.toggle("hidden", !isHidden);
    if (isHidden && !window._expandedCards[id]) {
      window._expandedCards[id] = true;
      const squadEl = document.getElementById("squad-" + id);
      const data = window._activityData && window._activityData[id];
      if (squadEl && data) {
        squadEl.innerHTML = "<span style='color:var(--text-dim);font-size:11px;font-style:italic;font-family:var(--font-mono)'>Looking up meta team...</span>";
        queueMetaSquad(data.name, data.detail, squadEl);
      }
    }
  }

  const _aiQueue = [];
  let _aiRunning = false;

  function queueMetaSquad(modeName, modeDetail, squadEl) {
    _aiQueue.push({ modeName, modeDetail, squadEl });
    if (!_aiRunning) processAiQueue();
  }

  async function processAiQueue() {
    if (_aiQueue.length === 0) { _aiRunning = false; return; }
    _aiRunning = true;
    const job = _aiQueue.shift();
    await fetchMetaSquad(job.modeName, job.modeDetail, job.squadEl);
    await new Promise(r => setTimeout(r, 1500));
    processAiQueue();
  }

  async function fetchMetaSquad(modeName, modeDetail, squadEl) {
    const rosterSummary = roster
      .filter(c => (parseInt((c.tier||"T1").replace("T",""))||1) >= 8)
      .sort((a,b) => b.power - a.power).slice(0, 80)
      .map(c => c.name + " (" + c.tier + ")").join(", ");

    const prompt = "What is the current meta team for this Marvel Strike Force game mode?\n\nMode: " + modeName + "\nRequirements: " + modeDetail + "\n\nPlayer roster (T8+ characters): " + rosterSummary + "\n\nUsing your knowledge of current MSF meta teams, identify the best team for this mode. Then check if the player has those characters. Reply in exactly this format with no extra text:\nMETA: [comma separated character names]\nPLAYER HAS: [Yes / Partial / No]\nRECOMMENDED: [5 character names from player roster, comma separated]\nNOTE: [one sentence reason or substitution tip]";

    try {
      const res = await fetch("https://msf-ai-proxy.rtatman-shops.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 400,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const reply = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
      if (!reply) throw new Error("No response");

      const metaLine = reply.split("\n").find(l => l.startsWith("META:"));
      const hasLine  = reply.split("\n").find(l => l.startsWith("PLAYER HAS:"));
      const recLine  = reply.split("\n").find(l => l.startsWith("RECOMMENDED:"));
      const noteLine = reply.split("\n").find(l => l.startsWith("NOTE:"));

      const hasVal = hasLine ? hasLine.replace("PLAYER HAS:","").trim() : "";
      const hasColor = hasVal === "Yes" ? "var(--green)" : hasVal === "Partial" ? "var(--gold)" : "var(--red)";

      let html = "";
      if (metaLine) html += "<div style='font-size:10px;color:var(--text-dim);margin-bottom:3px;font-family:var(--font-mono)'>" + metaLine + "</div>";
      if (hasLine)  html += "<div style='font-size:10px;font-weight:600;color:" + hasColor + ";margin-bottom:7px;font-family:var(--font-mono)'>" + hasLine + "</div>";
      if (recLine) {
        const names = recLine.replace("RECOMMENDED:","").trim().split(",").map(n => n.trim()).filter(Boolean);
        html += "<div class='activity-modal-squad'>" +
          names.map(name => {
            const match = roster.find(c => c.name.toLowerCase() === name.toLowerCase());
            const sub = match ? Math.round(match.power/1000) + "k · " + match.tier : "";
            return "<div class='activity-squad-member'><div class='activity-squad-name'>" + name + "</div>" +
              (sub ? "<div class='activity-squad-power'>" + sub + "</div>" : "") + "</div>";
          }).join("") + "</div>";
      }
      if (noteLine) html += "<div style='font-size:10px;color:var(--text-dim);margin-top:7px;font-style:italic;font-family:var(--font-mono)'>" + noteLine.replace("NOTE:","").trim() + "</div>";
      squadEl.innerHTML = html || "<span style='color:var(--text-dim);font-size:11px'>No recommendation available.</span>";
    } catch(e) {
      const fullText = modeName + " " + modeDetail;
      const tierMatch = fullText.match(/Gear Tier (\d+)/i);
      const minTier = tierMatch ? parseInt(tierMatch[1]) : 0;
      const knownTraits = ["Horsemen","Mystic","Mutant","Bio","Cosmic","Tech","Skill","City","Avenger","Guardian","Spider","Fantastic","Defender","Inhumans","Retcon","Alpha","Uncanny","Weapon","Villain","Hero","Shield","Military","Wakandan","Kree","Hydra","Hand","Symbiote","Asgardian","Mercenary","Ravager"];
      const capsWords = (fullText.match(/\b[A-Z][A-Z]{2,}\b/g) || []).map(w => w.charAt(0) + w.slice(1).toLowerCase());
      const matchedTraits = [...new Set([...capsWords, ...knownTraits.filter(t => fullText.toLowerCase().includes(t.toLowerCase()))])];
      const scored = roster
        .filter(c => !minTier || (parseInt((c.tier||"T1").replace("T",""))||1) >= minTier)
        .map(c => {
          const ct = (c.teams||[]).join(" ").toLowerCase();
          return { ...c, score: matchedTraits.filter(t => ct.includes(t.toLowerCase())).length };
        })
        .filter(c => matchedTraits.length === 0 || c.score > 0)
        .sort((a,b) => b.power - a.power).slice(0, 5);
      squadEl.innerHTML = "<div style='font-size:10px;color:var(--text-dim);margin-bottom:5px;font-family:var(--font-mono)'>Keyword match (AI unavailable)</div>" +
        "<div class='activity-modal-squad'>" +
        scored.map(c => "<div class='activity-squad-member'><div class='activity-squad-name'>" + c.name + "</div><div class='activity-squad-power'>" + Math.round(c.power/1000) + "k · " + c.tier + "</div></div>").join("") +
        "</div>";
    }
  }

  // ── Render inventory ─────────────────────────────────────────────────────────
  function renderInventory() {
    const el = document.getElementById("inventory-content");
    if (!el) return;

    // Exclude shards (shown on character cards already)
    const items = playerInventory.filter(i => i.item && !i.item.startsWith("SHARD_"));

    if (!items.length) {
      el.innerHTML = '<p style="color:var(--text-dim);font-size:13px;padding:2rem 0;font-family:var(--font-mono)">No inventory data available.</p>';
      return;
    }

    function formatItemName(id) {
      if (!id) return "Unknown";
      const meta = itemMetadata[id];
      if (meta && meta.name) return meta.name;
      return id
        .replace(/^CONSUMABLE_/, "").replace(/^GEAR_/, "").replace(/^ORB_/, "")
        .replace(/^MATERIAL_/, "").replace(/^CURRENCY_/, "").replace(/^ISO8_/, "")
        .replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    function getCategory(id) {
      if (!id) return "Other";
      if (id.startsWith("CONSUMABLE_")) return "Consumables";
      if (id.startsWith("GEAR_") || id.startsWith("MATERIAL_")) return "Gear & Materials";
      if (id.startsWith("ORB_")) return "Orbs";
      if (id.startsWith("CURRENCY_")) return "Currency";
      if (id.includes("ISO") || id.includes("ORANGE") || id.includes("TEAL")) return "ISO & Special";
      return "Other";
    }

    const CAT_META = {
      "Consumables":      { icon: "💊", color: "var(--green)"  },
      "Gear & Materials": { icon: "⚙️", color: "var(--gold)"   },
      "Orbs":             { icon: "🔮", color: "var(--purple)"  },
      "Currency":         { icon: "💎", color: "var(--accent)"  },
      "ISO & Special":    { icon: "🔶", color: "var(--orange)"  },
      "Other":            { icon: "◆",  color: "var(--text-dim)"},
    };

    const grouped = {};
    items.forEach(item => {
      const cat = getCategory(item.item);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    const order = ["Gear & Materials", "Orbs", "Currency", "Consumables", "ISO & Special", "Other"];

    let html = "";

    order.forEach(cat => {
      if (!grouped[cat] || !grouped[cat].length) return;
      const catItems = grouped[cat].sort((a, b) => b.quantity - a.quantity);
      const catMeta  = CAT_META[cat] || CAT_META["Other"];
      const isGear   = cat === "Gear & Materials";

      html += '<div class="inv-section">';
      html += '<div class="inv-section-title">' +
        catMeta.icon + ' ' + cat +
        ' <span style="color:var(--text-dim);font-weight:400">(' + catItems.length + ')</span>' +
        (isGear ? ' <span class="inv-low-legend">⚠ &lt;100</span>' : '') +
        '</div>';
      html += '<div class="inv-cards-grid">';

      catItems.forEach(item => {
        const id    = item.item;
        const qty   = item.quantity;
        const meta  = itemMetadata[id] || {};
        const name  = formatItemName(id);
        const icon  = meta.icon || null;
        const desc  = meta.description || null;
        const locs  = meta.locations && meta.locations.length ? meta.locations : null;
        const isLow = isGear && qty < 100;

        const iconHtml = icon
          ? `<img class="inv-card-icon" src="${icon}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
               loading="lazy" />
             <div class="inv-card-icon-fb" style="display:none">${catMeta.icon}</div>`
          : `<div class="inv-card-icon-fb">${catMeta.icon}</div>`;

        const locsHtml = locs
          ? '<div class="inv-expand-section"><div class="inv-expand-label">Farming Locations</div>' +
            locs.map(loc => {
              const locName = loc.name || loc.label || loc.id || JSON.stringify(loc);
              const locDetail = loc.detail || loc.nodes || loc.description || "";
              return '<div class="inv-location-row">' +
                '<span class="inv-location-dot"></span>' +
                '<span class="inv-location-name">' + locName + (locDetail ? ' <span style="color:var(--text-dim)">— ' + locDetail + '</span>' : '') + '</span>' +
                '</div>';
            }).join("") +
            '</div>'
          : '<div class="inv-expand-section" style="color:var(--text-dim);font-family:var(--font-mono);font-size:11px">No location data available from API.</div>';

        const descHtml = desc
          ? '<div class="inv-expand-section"><div class="inv-expand-label">Description</div>' +
            '<div style="font-size:12px;color:var(--text-mid);line-height:1.6">' + desc + '</div></div>'
          : '';

        html += `<div class="inv-card${isLow ? " inv-card--low" : ""}" onclick="this.classList.toggle('inv-card--open')">
          <div class="inv-card-main">
            <div class="inv-card-icon-wrap">${iconHtml}</div>
            <div class="inv-card-info">
              <div class="inv-card-name">${name}</div>
              ${isLow ? '<div class="inv-low-badge">⚠ Low stock</div>' : ''}
            </div>
            <div class="inv-card-qty${isLow ? " inv-card-qty--low" : ""}">${qty.toLocaleString()}</div>
            <div class="inv-card-chevron">›</div>
          </div>
          <div class="inv-card-expand">
            <div class="inv-expand-section">
              <div class="inv-expand-label">Quantity</div>
              <div class="inv-expand-qty${isLow ? " inv-expand-qty--low" : ""}">${qty.toLocaleString()}</div>
            </div>
            ${descHtml}
            ${locsHtml}
          </div>
        </div>`;
      });

      html += '</div></div>';
    });

    el.innerHTML = html;
  }


  // ── Refresh ──────────────────────────────────────────────────────────────────
  async function refreshRoster() {
    const token = sessionStorage.getItem("msf_token");
    if (!token) { alert("You are not signed in."); return; }

    const btn = document.getElementById("refresh-btn");
    const badge = document.getElementById("mode-badge");
    const origText = btn.textContent;
    btn.textContent = "Syncing...";
    btn.disabled = true;
    badge.textContent = "Loading...";
    badge.className = "status-badge loading";

    const headers = { "Authorization": "Bearer " + token, "x-api-key": API_KEY };

    try {
      const [rosterRes, squadsRes, cardRes] = await Promise.all([
        fetch(API_BASE + "/player/v1/roster", { headers }),
        fetch(API_BASE + "/player/v1/squads", { headers }),
        fetch(API_BASE + "/player/v1/card",   { headers })
      ]);

      if (!rosterRes.ok) throw new Error("Roster: HTTP " + rosterRes.status);

      const rosterJson = await rosterRes.json();
      const gameCharsMap = window._gameCharsMap || {};
      const chars = (rosterJson.data || []).map(c => {
        const meta = gameCharsMap[c.id] || {};
        const splitCase = s => s.replace(/([A-Z])/g, " $1").trim();
        return {
          name:     c.id ? splitCase(c.id) : "Unknown",
          portrait: c.id || "",
          icon:     meta.icon || c.portrait || null,
          roles:    meta.roles && meta.roles.length ? meta.roles : [],
          role:     meta.roles && meta.roles[0] ? meta.roles[0] : "—",
          teams:    meta.teams && meta.teams.length ? meta.teams.map(splitCase) : [],
          team:     meta.teams && meta.teams[0] ? splitCase(meta.teams[0]) : "—",
          tier:     c.gearTier ? "T" + c.gearTier : "T1",
          power:    c.power || 0,
          stars:    c.activeYellow || 0,
          redStars: c.activeRed || 0,
          iso:      (c.iso8 && c.iso8.active) ? c.iso8.active : "—",
          level:    c.level || 1
        };
      });

      if (chars.length === 0) throw new Error("No characters returned");
      roster   = chars;
      maxPower = Math.max(...roster.map(c => c.power));

      if (squadsRes.ok) {
        const squadsJson = await squadsRes.json();
        const tabs = (squadsJson.data && squadsJson.data.tabs) ? squadsJson.data.tabs : {};
        const tabLabels = { roster: "Roster", blitz: "Blitz", tower: "Tower", raids: "Raids", war: "War" };
        const powerByKey = {};
        roster.forEach(c => { powerByKey[c.name.toLowerCase().replace(/[\s-]/g, "")] = c.power; });
        squads = [];
        Object.entries(tabs).forEach(([tabKey, squadArrays]) => {
          if (!Array.isArray(squadArrays)) return;
          const label = tabLabels[tabKey] || tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
          squadArrays.forEach((memberIds, idx) => {
            if (!Array.isArray(memberIds) || memberIds.length === 0) return;
            squads.push({
              name: label + " Squad " + (idx + 1), type: label,
              members: memberIds.filter(Boolean).map(id => {
                const name = id.replace(/([A-Z])/g, " $1").trim();
                return { name, power: powerByKey[id.toLowerCase()] || 0 };
              })
            });
          });
        });
      }

      if (cardRes.ok) {
        const cardJson = await cardRes.json();
        card = cardJson.data || cardJson;
      }

      badge.textContent = "Live data"; badge.className = "status-badge live";
      btn.textContent = origText; btn.disabled = false;

      renderMetrics(); populateTeamFilter(); renderRoster();
      renderSquads(); renderCard(); renderActivities(); renderInventory();

      addMessage("assistant", "✓ Roster synced! " + roster.length + " characters loaded, avg power " + Math.round(roster.reduce((a,c)=>a+c.power,0)/roster.length/1000) + "k. What would you like to know?");
      chatHistory.push({ role: "assistant", content: "Roster refreshed with latest data." });
      saveChatHistory();
      switchTab("ai");
    } catch (e) {
      badge.textContent = "Live data"; badge.className = "status-badge live";
      btn.textContent = origText; btn.disabled = false;
      alert("Refresh failed: " + e.message);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  (function init() {
    const token = sessionStorage.getItem("msf_token");
    if (token) loadLiveData(token);
  })();

  // ── Event listeners ──────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function() {
    const signinBtn = document.getElementById("signin-btn");
    if (signinBtn) signinBtn.addEventListener("click", startOAuth);
    const demoBtn = document.getElementById("demo-btn");
    if (demoBtn) demoBtn.addEventListener("click", useDemoMode);

    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) refreshBtn.addEventListener("click", refreshRoster);
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    ["roster","squads","ai","card","activities","inventory"].forEach(function(t) {
      const el = document.getElementById("tab-" + t);
      if (el) el.addEventListener("click", function() { switchTab(t); });
    });

    const aiButtons = {
      "ai-btn-raids":   "Which of my characters should I prioritize for raids?",
      "ai-btn-teams":   "What are my strongest teams right now?",
      "ai-btn-upgrade": "Who are my weakest characters that need investment?",
      "ai-btn-squads":  "Review my saved squads and suggest improvements."
    };
    Object.entries(aiButtons).forEach(function([id, msg]) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", function() { sendMessage(msg); });
    });

    const clearBtn = document.getElementById("ai-btn-clear");
    if (clearBtn) clearBtn.addEventListener("click", clearChat);
    const sendBtn = document.getElementById("ai-send-btn");
    if (sendBtn) sendBtn.addEventListener("click", sendCustom);

    const actCloseBtn = document.getElementById("activity-modal-close-btn");
    if (actCloseBtn) actCloseBtn.addEventListener("click", function() { closeActivityModal(); });
    const charCloseBtn = document.getElementById("char-modal-close-btn");
    if (charCloseBtn) charCloseBtn.addEventListener("click", function() { closeModal(); });

    const actModal = document.getElementById("activity-modal");
    if (actModal) actModal.addEventListener("click", closeActivityModal);
    const charModal = document.getElementById("char-modal");
    if (charModal) charModal.addEventListener("click", closeModal);

    // Prevent clicks inside modal boxes from bubbling up to the overlay
    document.querySelectorAll(".modal-box").forEach(function(box) {
      box.addEventListener("click", function(e) { e.stopPropagation(); });
    });

    document.addEventListener("click", function(e) {
      const card = e.target.closest("[data-modal-idx]");
      if (card) openModal(parseInt(card.dataset.modalIdx));
    });

    document.addEventListener("click", function(e) {
      const card = e.target.closest("[data-activity-id]");
      if (card) toggleActivityCard(card.dataset.activityId);
    });

    const searchInput = document.getElementById("search");
    if (searchInput) searchInput.addEventListener("input", renderRoster);
    ["filter-tier","filter-role","filter-team","sort-by"].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", renderRoster);
    });

    const aiInput = document.getElementById("ai-input");
    if (aiInput) aiInput.addEventListener("keydown", function(e) { if (e.key === "Enter") sendCustom(); });
  });