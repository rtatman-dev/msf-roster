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
  let raidIds        = [];
  let ddIds          = [];
  let raidGroups_data = [];   // from /game/v1/raidGroups
  let raids_data      = [];   // full raid objects
  let dds_data        = [];   // full DD objects
  let pypIds          = [];   // pick your poison IDs
  let pyps_data       = [];   // full PYP objects
  let stIds           = [];   // survival tower IDs
  let towers_data     = [];   // full tower objects
  let allianceCard    = null;
  let campaigns    = [];          // campaign type
  let campaignNodes = {};         // id -> full node/chapter data (all types)
  let episodics = {               // all 6 episodic types
    campaign: [], eventCampaign: [], challenge: [],
    flashEvent: [], unlockEvent: [], otherEvent: []
  };
  let _invCat          = "ABILITY_MATERIAL";
  let _invSearch       = "";
  let _invIso          = "";
  let _gearSort        = "name-asc"; // "name-asc"|"name-desc"|"qty-asc"|"qty-desc"
  let _gearChar        = "";
  let _gearMat         = "";
  let _gearOrigin      = "";
  let _invCloseHandler = null;

  let squads   = [];
  let card     = null;
  let maxPower = 1;

  // ── HTML escaping ───────────────────────────────────────────────────────────
  // API strings (localized names, details, alliance descriptions) are not trusted
  // as markup — escape before any innerHTML interpolation.
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

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
    const initials = esc((name || "?").split(/[\s\-]+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase());
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
    return `<img src="${url}" class="${cssClass} img-with-fallback" /><div class="char-avatar-fallback" style="display:none;background:var(--bg-deep)">${fallback}</div>`;
  }

  // ── Shard helpers ────────────────────────────────────────────────────────────
  const STAR_THRESHOLDS = [0, 10, 25, 45, 75, 105, 140, 175];

  function getInventoryMap() {
    const map = {};
    playerInventory.forEach(item => { map[item.item] = item.quantity; });
    return map;
  }

  function getShardData(c, invMap) {
    // invMap can be passed in by callers that render many characters at once
    invMap = invMap || getInventoryMap();
    // shardItemId comes from CharacterInfo.starItems[0] (the yellow star shard item)
    const shardsOwned = (c.shardItemId && invMap[c.shardItemId]) || 0;
    const currentStars = c.stars || 0;
    const nextStarNeeded = currentStars < 7 ? (STAR_THRESHOLDS[currentStars + 1] || 175) : 0;
    const pct = nextStarNeeded > 0 ? Math.min(100, Math.round(shardsOwned / nextStarNeeded * 100)) : 100;
    return { shardsOwned, currentStars, nextStarNeeded, pct };
  }

  // ── Star rendering ──────────────────────────────────────────────────────────
  function renderStars(yellow, red) {
    let html = "";
    if (red >= 8) {
      // Diamond tier (spec: activeRed 8-10 = 1-3 diamonds).
      // All 7 yellow stars are always filled at this tier.
      for (let i = 1; i <= 7; i++) html += `<span class="char-star filled">★</span>`;
      const diamonds = Math.min(red - 7, 3);
      for (let i = 1; i <= 3; i++) {
        html += `<span class="char-star diamond${i <= diamonds ? "" : " diamond-empty"}">◆</span>`;
      }
    } else {
      for (let i = 1; i <= 7; i++) {
        if (i <= red) html += `<span class="char-star red">★</span>`;
        else if (i <= yellow) html += `<span class="char-star filled">★</span>`;
        else html += `<span class="char-star">★</span>`;
      }
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
      const [rosterRes, squadsRes, cardRes, gameCharsRes, eventsRes, inventoryRes, raidGroupsRes, raidListRes, ddListRes, pypRes, stRes, allianceRes, campaignRes, eventCampRes, challengeRes, flashRes, unlockRes, otherRes] = await Promise.all([
        fetch(API_BASE + "/player/v1/roster",  { headers }),
        fetch(API_BASE + "/player/v1/squads",  { headers }),
        fetch(API_BASE + "/player/v1/card",    { headers }),
        fetch(API_BASE + "/game/v1/characters?traitFormat=id&perPage=500", { headers }),
        fetch(API_BASE + "/player/v1/events",  { headers }),
        fetch(API_BASE + "/player/v1/inventory?itemFormat=object&pieceInfo=full", { headers }),
        fetch(API_BASE + "/game/v1/raidGroups",       { headers }),
        fetch(API_BASE + "/game/v1/raids?raidInfo=full&raidDiffs=full",           { headers }),
        fetch(API_BASE + "/game/v1/dds?raidInfo=full&raidMap=full&nodeInfo=full&nodeReqs=full&nodeRewards=full",             { headers }),
        fetch(API_BASE + "/game/v1/pickYourPoisons?raidInfo=full&raidMap=full&nodeInfo=full&nodeReqs=full&raidDiffs=full",   { headers }),
        fetch(API_BASE + "/game/v1/survivalTowers?raidInfo=full&raidMap=full&nodeInfo=full&nodeReqs=full&nodeRewards=full",  { headers }),
        fetch(API_BASE + "/player/v1/alliance/card",   { headers }),
        fetch(API_BASE + "/game/v1/episodics/campaign",      { headers }),
        fetch(API_BASE + "/game/v1/episodics/eventCampaign", { headers }),
        fetch(API_BASE + "/game/v1/episodics/challenge",     { headers }),
        fetch(API_BASE + "/game/v1/episodics/flashEvent",    { headers }),
        fetch(API_BASE + "/game/v1/episodics/unlockEvent",   { headers }),
        fetch(API_BASE + "/game/v1/episodics/otherEvent",    { headers })
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
            name: gc.name || null,
            icon: gc.portrait || gc.icon || gc.image || null,
            shardItemId: null
          };
          // starItems per spec: [0] = yellow star shard item,
          // [1-7] = red star items, [8-10] = diamond items 1-3
          if (gc.starItems && Array.isArray(gc.starItems)) {
            gc.starItems.forEach((si, i) => {
              const id = si && (typeof si === "string" ? si : si.id);
              if (!id) return;
              if (i === 0) { gameCharsMap[gc.id].shardItemId = id; return; }
              if (!itemMetadata[id]) itemMetadata[id] = { name: null, icon: null, description: null, locations: [], type: null };
              itemMetadata[id].type = "RS";
              if (si.name  && !itemMetadata[id].name)  itemMetadata[id].name  = si.name;
              if (si.icon  && !itemMetadata[id].icon)  itemMetadata[id].icon  = si.icon;
              if (i >= 1 && i <= 7)  itemMetadata[id].rsTier        = i;
              if (i >= 8 && i <= 10) itemMetadata[id].rsDiamondTier = i - 7;
            });
          }
        });
        window._gameCharsMap = gameCharsMap;
        console.log("Game chars loaded:", Object.keys(gameCharsMap).length);
      }

      const chars = (rosterJson.data || []).map(c => {
        const meta = gameCharsMap[c.id] || {};
        const splitCase = s => s.replace(/([A-Z])/g, " $1").trim();
        // Iso8 per spec: active = class id ("striker"...), matrix = "green"|"blue",
        // class level is keyed by class name (iso8[iso8.active])
        const iso8 = (c.iso8 && typeof c.iso8 === "object") ? c.iso8 : null;
        const isoActive = iso8 && iso8.active ? iso8.active : null;
        return {
          name:     meta.name || (c.id ? splitCase(c.id) : "Unknown"),
          portrait: c.id || "",
          icon:     meta.icon || c.portrait || null,
          shardItemId: meta.shardItemId || null,
          roles:    meta.roles && meta.roles.length ? meta.roles : [],
          role:     meta.roles && meta.roles[0] ? meta.roles[0] : "—",
          teams:    meta.teams && meta.teams.length ? meta.teams.map(splitCase) : [],
          team:     meta.teams && meta.teams[0] ? splitCase(meta.teams[0]) : "—",
          tier:     c.gearTier ? "T" + c.gearTier : "T1",
          power:    c.power || 0,
          stars:    c.activeYellow || 0,
          redStars: c.activeRed || 0,
          iso:      isoActive ? isoActive.charAt(0).toUpperCase() + isoActive.slice(1) : "—",
          isoColor: iso8 ? (iso8.matrix || "green") : null,
          isoLevel: isoActive ? (iso8[isoActive] || null) : null,
          level:    c.level || 1,
          // Ability levels — spec fields are basic/special/ultimate/passive
          abilityBasic:    c.basic    || 1,
          abilitySpecial:  c.special  || 0,
          abilityUltimate: c.ultimate || 0,
          abilityPassive:  c.passive  || 0,
          // Raw object for planner
          _raw: c
        };
      });

      if (chars.length === 0) throw new Error("No characters returned");
      roster   = chars;
      maxPower = Math.max(...roster.map(c => c.power));

      squads = [];
      if (squadsRes.ok) {
        const squadsJson = await squadsRes.json();
        const tabs = (squadsJson.data && squadsJson.data.tabs) ? squadsJson.data.tabs : {};
        const tabLabels = { roster: "Roster", blitz: "Blitz", tower: "Tower", raids: "Raids", arena: "Arena", war: "War", crucible: "Crucible" };
        // Squad members are character IDs — match against the roster by ID
        const rosterById = {};
        roster.forEach(c => { rosterById[c.portrait] = c; });
        Object.entries(tabs).forEach(([tabKey, squadArrays]) => {
          if (!Array.isArray(squadArrays)) return;
          const label = tabLabels[tabKey] || tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
          squadArrays.forEach((memberIds, idx) => {
            if (!Array.isArray(memberIds) || memberIds.length === 0) return;
            squads.push({
              name: label + " Squad " + (idx + 1), type: label,
              members: memberIds.filter(Boolean).map(id => {
                const rc = rosterById[id];
                return {
                  name:  rc ? rc.name : id.replace(/([A-Z])/g, " $1").trim(),
                  power: rc ? rc.power : 0
                };
              })
            });
          });
        });
      }

      if (cardRes.ok) {
        const cardJson = await cardRes.json();
        card = cardJson.data || cardJson;
        console.log("Card icon:", card && card.icon, "Frame:", card && card.frame);
      }

      if (eventsRes.ok) {
        const eventsJson = await eventsRes.json();
        playerEvents = eventsJson.data || [];
      }

      if (inventoryRes.ok) {
        const inventoryJson = await inventoryRes.json();
        const rawInv = inventoryJson.data || [];
        // itemFormat=object → each entry has { item: {id, name, icon, tier?, ...}, quantity }
        playerInventory = rawInv.map(entry => {
          if (typeof entry.item === "object" && entry.item !== null) {
            // Full item object — extract icon/name into metadata, normalise to id
            const itm = entry.item;
            if (itm.id) {
              if (!itemMetadata[itm.id]) itemMetadata[itm.id] = { name: null, icon: null, description: null, locations: [] };
              if (itm.icon  && !itemMetadata[itm.id].icon)        itemMetadata[itm.id].icon        = itm.icon;
              if (itm.name  && !itemMetadata[itm.id].name)        itemMetadata[itm.id].name        = itm.name;
              if (itm.description && !itemMetadata[itm.id].description) itemMetadata[itm.id].description = itm.description;
              // Gear items carry their tier directly on the item object
              if (itm.tier && !itemMetadata[itm.id].gearTier)    itemMetadata[itm.id].gearTier    = itm.tier;
              // Also store icons from directCost/flatCost ingredients
              [...(itm.directCost || []), ...(itm.flatCost || [])].forEach(cost => {
                const ing = cost.item;
                if (!ing || !ing.id) return;
                if (!itemMetadata[ing.id]) itemMetadata[ing.id] = { name: null, icon: null, description: null, locations: [] };
                if (ing.icon && !itemMetadata[ing.id].icon) itemMetadata[ing.id].icon = ing.icon;
                if (ing.name && !itemMetadata[ing.id].name) itemMetadata[ing.id].name = ing.name;
              });
            }
            return { item: itm.id || "", quantity: entry.quantity || 0 };
          }
          // Already just an ID string
          return { item: entry.item || "", quantity: entry.quantity || 0 };
        }).filter(e => e.item);
        console.log("Inventory loaded:", playerInventory.length, "items");
        const invWithIcons = playerInventory.filter(e => itemMetadata[e.item] && itemMetadata[e.item].icon).length;
        console.log("Inventory items with icons from API:", invWithIcons);
      }

      if (raidGroupsRes.ok) {
        const rg = await raidGroupsRes.json();
        raidGroups_data = rg.data || [];
        console.log("RaidGroups:", raidGroups_data.length, raidGroups_data.map(g => g.id));
      } else {
        console.warn("raidGroups HTTP", raidGroupsRes.status);
      }

      if (raidListRes.ok) {
        const raidListJson = await raidListRes.json();
        raids_data = raidListJson.data || [];
        raidIds = raids_data.map(r => r.id).filter(Boolean);
        console.log("Raids:", raids_data.length, raids_data.map(r => r.id + (r.rooms ? "("+Object.keys(r.rooms).length+"rooms)" : "(no rooms)")));
      } else {
        console.warn("raids HTTP", raidListRes.status);
      }

      if (ddListRes.ok) {
        const ddListJson = await ddListRes.json();
        dds_data = ddListJson.data || [];
        ddIds = dds_data.map(d => d.id).filter(Boolean);
        console.log("DDs:", dds_data.length, dds_data.map(d => d.id));
      } else {
        console.warn("dds HTTP", ddListRes.status);
      }

      if (pypRes.ok) {
        const pypJson = await pypRes.json();
        pyps_data = pypJson.data || [];
        pypIds = pyps_data.map(p => p.id).filter(Boolean);
        console.log("PYPs:", pyps_data.length, pyps_data.map(p => p.id));
      } else {
        console.warn("pyps HTTP", pypRes.status);
      }

      if (stRes.ok) {
        const stJson = await stRes.json();
        towers_data = stJson.data || [];
        stIds = towers_data.map(s => s.id).filter(Boolean);
        console.log("Towers:", towers_data.length, towers_data.map(s => s.id));
      } else {
        console.warn("survivalTowers HTTP", stRes.status);
      }

      // Raids return 472 when fetched all at once — re-fetch per group to stay within size limits
      if (raidGroups_data.length && (!raids_data.length || !raids_data[0].rooms)) {
        const perGroupResults = await Promise.all(
          raidGroups_data.map(grp =>
            fetch(API_BASE + "/game/v1/raids?groupId=" + encodeURIComponent(grp.id) +
                  "&raidInfo=full&raidMap=full&nodeInfo=full&nodeReqs=full&nodeRewards=full&raidDiffs=full", { headers })
              .then(r => { if (!r.ok) { console.warn("raid group", grp.id, "HTTP", r.status); return null; } return r.json(); })
              .catch(e => { console.warn("raid group fetch error", grp.id, e); return null; })
          )
        );
        const perGroupRaids = perGroupResults.flatMap(res => (res && res.data) || []);
        if (perGroupRaids.length) {
          raids_data = perGroupRaids;
          raidIds = raids_data.map(r => r.id).filter(Boolean);
          console.log("Raids (per-group):", raids_data.length, raids_data.map(r => r.id + (r.rooms ? "(" + Object.keys(r.rooms).length + "r)" : "(no rooms)")));
        }
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
            fetch(API_BASE + "/game/v1/episodics/campaign/" + camp.id + "?nodeInfo=full&nodeReqs=full&nodeRewards=full&pieceInfo=full", { headers: authHeaders })
              .then(r => r.ok ? r.json() : null).catch(() => null)
          )
        );
        nodeResults.forEach((res, i) => {
          if (res && res.data) campaignNodes[campaigns[i].id] = res.data;
        });
        console.log("Campaign nodes loaded for:", Object.keys(campaignNodes).join(", "));

        // Parse all other episodic types and fetch their node data
        const EPISODIC_TYPES = [
          { res: eventCampRes, key: "eventCampaign" },
          { res: challengeRes, key: "challenge" },
          { res: flashRes,     key: "flashEvent" },
          { res: unlockRes,    key: "unlockEvent" },
          { res: otherRes,     key: "otherEvent" }
        ];

        // Fetch node data for all non-campaign episodics in parallel.
        // Bodies must be parsed (awaited) before episodics.campaign is derived
        // and before the node fetches are awaited below.
        const otherEpisodicFetches = [];
        await Promise.all(EPISODIC_TYPES.map(async ({ res, key }) => {
          if (!res || !res.ok) return;
          try {
            const j = await res.json();
            const items = j.data || [];
            // Tag each item with its episodic type so we can call the right endpoint
            items.forEach(item => { item._episodicType = key; });
            episodics[key] = items;
            campaigns.push(...items); // add to campaigns array for AI context
            // Fetch node data for each
            items.forEach(ep => {
              otherEpisodicFetches.push(
                fetch(API_BASE + "/game/v1/episodics/" + key + "/" + ep.id + "?nodeInfo=full&nodeReqs=full&nodeRewards=full&pieceInfo=full", { headers: authHeaders })
                  .then(r => r.ok ? r.json() : null).catch(() => null)
                  .then(res => { if (res && res.data) campaignNodes[ep.id] = res.data; })
              );
            });
          } catch (e) { /* malformed body — skip this type */ }
        }));

        // Also populate episodics.campaign
        episodics.campaign = campaigns.filter(c => !["eventCampaign","challenge","flashEvent","unlockEvent","otherEvent"].some(k => episodics[k].some(e => e.id === c.id)));
        episodics.campaign.forEach(c => { if (!c._episodicType) c._episodicType = "campaign"; });

        await Promise.all(otherEpisodicFetches);
        console.log("All episodic types loaded:", Object.keys(episodics).map(k => k + ":" + episodics[k].length).join(", "));

        // Build farming locations index: itemId -> [{name, detail}]
        // Spec shape: EpisodicInfo.chapters = IndexedChapterInfos (numbered),
        // ChapterInfo.tiers = IndexedNodeInfos — each numbered tier IS a mission
        // node, with rewards/firstTimeRewards/limitedRewards directly on it.
        Object.entries(campaignNodes).forEach(([campId, campData]) => {
          const campMeta = campaigns.find(c => c.id === campId) || {};
          const campName = campMeta.name || campId;
          // nodeName is the localized node prefix, e.g. "HEROES" in "HEROES 1-1"
          const nodePrefix = campData.nodeName || campMeta.nodeName || campName;
          if (!campData.chapters) return;
          Object.entries(campData.chapters).forEach(([chNum, chapter]) => {
            if (!chapter.tiers) return;
            Object.entries(chapter.tiers).forEach(([tierNum, node]) => {
              // Gather all reward items from this node (ItemQuantity tree)
              const rewards = [];
              const addRewards = (r) => {
                if (!r) return;
                if (Array.isArray(r)) { r.forEach(addRewards); return; }
                if (r.allOf) { r.allOf.forEach(addRewards); return; }
                if (r.oneOf) { r.oneOf.forEach(addRewards); return; }
                if (r.chanceOf) { addRewards(r.chanceOf); return; }
                if (r.item) {
                  const itemId = typeof r.item === "string" ? r.item : r.item.id;
                  if (itemId) rewards.push(itemId);
                }
              };
              addRewards(node.rewards);
              addRewards(node.firstTimeRewards);
              addRewards(node.limitedRewards);
              // Store location for each reward item
              rewards.forEach(itemId => {
                if (!itemMetadata[itemId]) itemMetadata[itemId] = { name: null, icon: null, description: null, locations: [] };
                const loc = {
                  name: nodePrefix + " " + chNum + "-" + tierNum,
                  source: campName,
                  detail: ""
                };
                // Avoid duplicates
                if (!itemMetadata[itemId].locations.some(l => l.name === loc.name)) {
                  itemMetadata[itemId].locations.push(loc);
                }
              });
            });
          });
        });
        const itemsWithLocations = Object.values(itemMetadata).filter(m => m.locations && m.locations.length > 0).length;
        console.log("Items with farming locations:", itemsWithLocations);
      }



      // Fetch typed inventory in parallel with the gear-icon batching below.
      // Uses itemType filter to tag each item ID with its real API category.
      const INV_TYPES = ["GEAR", "ISOITEM", "SHARD", "RS", "COSTUME", "CONSUMABLE", "ABILITY_MATERIAL"];
      const invTypePromise = Promise.all(
        INV_TYPES.map(t =>
          fetch(`${API_BASE}/player/v1/inventory?itemFormat=id&itemType=${t}`, { headers })
            .then(r => r.ok ? r.json() : null).catch(() => null)
        )
      ).then(results => {
        INV_TYPES.forEach((type, i) => {
          ((results[i] && results[i].data) || []).forEach(entry => {
            const id = typeof entry.item === "string" ? entry.item : (entry.item && entry.item.id);
            if (!id) return;
            if (!itemMetadata[id]) itemMetadata[id] = { name: null, icon: null, description: null, locations: [], type: null };
            itemMetadata[id].type = type;
          });
        });
        console.log("Inventory items typed:", Object.values(itemMetadata).filter(m => m.type).length);
      });

      await invTypePromise;
      showApp(true);
    } catch (e) {
      console.error("Live load failed:", e.message, e.stack);
      // If we have any live data (campaigns/raids loaded), show app with partial data
      if (campaigns.length > 0 || raidIds.length > 0) {
        // Keep whatever live data loaded, just use demo roster
        roster = [...DEMO_ROSTER];
        maxPower = Math.max(...roster.map(c => c.power));
        squads = [...DEMO_SQUADS];
        showApp(false);
        setTimeout(() => {
          const badge = document.getElementById("mode-badge");
          if (badge) { badge.textContent = "Roster unavailable"; badge.className = "status-badge"; }
        }, 100);
      } else {
        useDemoMode();
      }
      console.warn("Roster load failed:", e.message);
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
      sorted.map(t => '<option value="' + esc(t) + '"' + (t === current ? " selected" : "") + '>' + esc(t) + '</option>').join("");
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

  function getTierRingColor(tier) {
    const n = parseInt((tier || "T0").replace("T", "")) || 0;
    if (n >= 14) return "#00c8ff"; // cyan  — T14+
    if (n === 13) return "#f59e0b"; // amber — T13 (orange gear)
    if (n >= 10)  return "#a855f7"; // purple — T10-T12
    if (n >= 7)   return "#3b82f6"; // blue  — T7-T9
    if (n >= 4)   return "#22c55e"; // green — T4-T6
    return "#94a3b8";               // gray  — T1-T3
  }

  const ISO_COLORS = { red:"#ff4f4f", blue:"#00d4ff", green:"#00e676", yellow:"#f5b000", purple:"#c07aff" };

  function renderAbilityPips(c) {
    const abilities = [
      { label: "B", level: c.abilityBasic    || 1 },
      { label: "S", level: c.abilitySpecial  || 1 },
      { label: "U", level: c.abilityUltimate || 1 },
      { label: "P", level: c.abilityPassive  || 0 },
    ];
    return `<div class="char-ability-pips">${
      abilities.map(a => {
        const col = a.level >= 7 ? "#f59e0b" : a.level >= 5 ? "#3b82f6" : a.level >= 3 ? "#22c55e" : "#567a96";
        return `<div class="ability-pip" style="border-color:${col}"><span class="ability-pip-letter">${a.label}</span><span class="ability-pip-val" style="color:${col}">${a.level || "—"}</span></div>`;
      }).join("")
    }</div>`;
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
      const { shardsOwned, currentStars, nextStarNeeded, pct } = getShardData(c, invMap);
      const roleClass = "role-" + (c.role || "");
      const portUrl = getPortraitUrl(c);
      const fallbackSvg = makeFallbackAvatar(c.name, c.role).replace(/"/g, "'").replace(/\n/g, "");
      const ringColor = getTierRingColor(c.tier);

      const shardHtml = (shardsOwned > 0 || currentStars < 7) ? `
        <div class="char-shard-row">
          <div class="char-shard-label">
            <span>Shards</span>
            <span>${shardsOwned}${nextStarNeeded ? " / " + nextStarNeeded : " ✓"}</span>
          </div>
          <div class="shard-bar-bg"><div class="shard-bar-fill" style="width:${pct}%"></div></div>
        </div>` : "";

      const isoHtml = c.iso && c.iso !== "—" ? `
        <div class="char-iso-row">
          <span class="char-iso-dot" style="background:${ISO_COLORS[c.isoColor] || "#567a96"}"></span>
          <span class="char-iso-label">ISO</span>
          <span class="char-iso-class">${c.iso}</span>
          ${c.isoLevel ? `<span class="char-iso-level">Lv${c.isoLevel}</span>` : ""}
        </div>` : "";

      return `
        <div class="char-card" data-modal-idx="${i}">
          <div class="char-portrait" style="color:${ringColor}">
            <img src="${portUrl}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block;transition:transform 0.3s" class="img-with-fallback" />
            <div class="char-avatar-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:var(--bg-deep)">${fallbackSvg}</div>
            <div class="char-portrait-overlay"></div>
            <div class="char-tier-label" style="color:${ringColor}">${c.tier}</div>
            <div class="char-stars">${renderStars(c.stars, c.redStars)}</div>
          </div>
          <div class="char-body">
            <div class="char-lvl-power">
              <span class="char-lvl">LVL ${c.level}</span>
              <span class="char-power-full">${c.power.toLocaleString()}</span>
            </div>
            <div class="char-name">${esc(c.name)}</div>
            <div class="char-role-teams">
              <span class="char-role-dot ${roleClass}" style="background:${roleColor}"></span>
              <span class="char-role-text">${c.roles && c.roles.length ? c.roles.join(" / ") : "—"} · ${c.teams && c.teams.length ? c.teams[0] : "—"}</span>
            </div>
            ${renderAbilityPips(c)}
            ${isoHtml}
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
      <div class="squad-icon-wrap" title="${esc(m.name)}${m.power ? ' · ' + Math.round(m.power/1000) + 'k' : ''}">
        <div class="squad-icon" style="--role-color:${roleColor}">
          <img src="${portUrl}" class="img-with-fallback" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:50%;display:block" />
          <div class="squad-icon-fallback" style="display:none;background:linear-gradient(135deg,${roleColor}33,#040608);color:${roleColor};font-family:var(--font-hud);font-size:11px;font-weight:900;width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center">${initials}</div>
        </div>
        <div class="squad-icon-tier">${c.tier || "—"}</div>
        <div class="squad-icon-name">${esc(m.name.split(" ")[0])}</div>
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

    const rosterByName = {};
    roster.forEach(c => { rosterByName[c.name.toLowerCase()] = c; });

    const CAT_ORDER  = ["War","Raid","Arena","Blitz","Tower","Roster"];
    const CAT_COLORS = { War:"#b91c1c", Raid:"#15803d", Arena:"#b45309", Blitz:"#1d4ed8", Tower:"#7c3aed", Roster:"#0369a1" };

    // Group squads by type
    const groups = {};
    squads.forEach(s => {
      const cat = s.type || "Roster";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });

    const orderedCats = [
      ...CAT_ORDER.filter(c => groups[c]),
      ...Object.keys(groups).filter(c => !CAT_ORDER.includes(c))
    ];

    function renderSquadCard(s) {
      const total = s.members.reduce((a, m) => a + m.power, 0);
      const memberChars = s.members.map(m => {
        const rc = rosterByName[m.name.toLowerCase()] || null;
        return rc ? { ...rc, power: m.power || rc.power } : { name: m.name, power: m.power, role: "—", teams: [], roles: [], tier: "—", portrait: m.name.replace(/\s/g,"") };
      });
      const teamName  = detectTeamName(memberChars);
      const synergies = detectSynergies(memberChars);
      const teamSyns  = synergies.filter(sy => !SKIP_TRAITS.has(sy.trait));
      const traitSyns = synergies.filter(sy => SKIP_TRAITS.has(sy.trait) && sy.trait !== teamName);
      const synergyHtml = [...teamSyns.slice(0,4), ...traitSyns.slice(0,3)].map(({ trait, count }) => {
        const color = SYNERGY_COLORS[trait] || "#00c8ff";
        return `<span class="synergy-badge" style="border-color:${color}30;color:${color};background:${color}12">${trait} <span class="synergy-count">×${count}</span></span>`;
      }).join("");
      const iconsHtml = memberChars.map(mc => squadMemberIcon({ name: mc.name, power: mc.power }, mc)).join("");
      const rolePips  = roleBreakdown(memberChars);
      return `
        <div class="squad-card">
          <div class="squad-card-header">
            <div>
              ${teamName ? `<div class="squad-team-name">${teamName}</div>` : ""}
              <div class="squad-name" style="${teamName ? "font-size:11px;color:var(--text-mid);margin-top:1px" : ""}">${s.name}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
              <div class="squad-role-pips">${rolePips}</div>
            </div>
          </div>
          <div class="squad-icons-row">${iconsHtml}</div>
          ${synergyHtml ? `<div class="squad-synergies">${synergyHtml}</div>` : ""}
          ${total ? `<div class="squad-footer"><span class="squad-footer-label">Total power</span><span class="squad-footer-val">${Math.round(total/1000)}k</span></div>` : ""}
        </div>`;
    }

    document.getElementById("squads").innerHTML = orderedCats.map(cat => {
      const color = CAT_COLORS[cat] || "#6b7280";
      return `
        <div class="squad-category">
          <div class="squad-category-header" style="color:${color};border-color:${color}44">
            ${cat}
          </div>
          <div class="squad-category-grid">
            ${groups[cat].map(renderSquadCard).join("")}
          </div>
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
      const blitz     = card.latestBlitz  || "?"; // spec: latestBlitz is a rank, not a score
      const blitzWins = card.blitzWins    || "?";
      const chars     = card.charactersCollected || roster.length;
      cardSection = "Name: " + (card.name || "SuperZero") + " | Level: " + lvl + " | Characters collected: " + chars + " | TCP: " + tcp + " | Squad power: " + stp + " | Arena rank: " + arena + " | Blitz rank: " + blitz + " | Blitz wins: " + blitzWins;
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
          // List the raw episodic ids — they match the CAMPAIGNS section ids, and the
          // spec does not define difficulty semantics for id suffixes
          const ids       = (ev.episodic && ev.episodic.ids) || [];
          const tiers     = ids.length ? " | episodic ids: " + ids.join("/") : "";
          return "  " + (ev.name || "Event") + (ev.subName ? " — " + ev.subName : "") + " | " + timeStr + tiers + (ev.details ? " | " + ev.details.replace(/\n/g," ").slice(0,120) : "");
        }).join("\n")
      : "  No active events.";
    const endedLines = endedEvents.length
      ? "  Ended recently: " + endedEvents.map(ev => ev.name || "Event").slice(0,5).join(", ")
      : "";

    // ── 6. Alliance ─────────────────────────────────────────────────────────
    let allianceSection = "Not available.";
    if (allianceCard) {
      // AllianceCard spec fields: name, level, type, warTrophies, warRank, description
      const aLvl = (allianceCard.level && allianceCard.level.completedTier) ? allianceCard.level.completedTier : "?";
      allianceSection = "Name: " + (allianceCard.name || "?") + " | Level: " + aLvl + " | Type: " + (allianceCard.type || "?") + " | War trophies: " + (allianceCard.warTrophies != null ? allianceCard.warTrophies : "?") + " | War rank: " + (allianceCard.warRank != null ? allianceCard.warRank : "?") + (allianceCard.description ? " | Desc: " + allianceCard.description : "");
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
        // requirements can be per-difficulty arrays (NodeInfo spec) — use first non-null
        if (Array.isArray(reqs)) reqs = reqs.find(Boolean);
        if (!reqs) return [];
        const out = [];
        if (reqs.minCharacters && reqs.minCharacters > 1) out.push(reqs.minCharacters + " chars required");
        if (reqs.otherRequirements && reqs.otherRequirements.playerLevel)
          out.push("player lvl " + reqs.otherRequirements.playerLevel + "+");
        if (reqs.anyCharacterFilters) {
          reqs.anyCharacterFilters.forEach(f => {
            const fp = [];
            const traits = (f.allTraits || []).map(t => t.name || t.id || t).filter(Boolean);
            if (traits.length) fp.push("needs trait: " + traits.join("+"));
            if (f.gearTier)     fp.push("gear T" + f.gearTier + "+");
            if (f.level)        fp.push("lvl " + f.level + "+");
            if (f.activeYellow) fp.push(f.activeYellow + "star+");
            if (fp.length) out.push(fp.join(" "));
          });
        }
        if (reqs.specificCharacters && reqs.specificCharacters.length)
          out.push("requires: " + reqs.specificCharacters.map(id => id.replace(/([A-Z])/g, " $1").trim()).join(", "));
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
          // Spec: chapters are numbered; chapter.tiers are numbered NodeInfo objects —
          // each tier IS a mission node ("HEROES 7-3" = chapter 7, tier 3)
          const nodePrefix = nodeData.nodeName || camp.nodeName || "";
          Object.entries(nodeData.chapters).forEach(([chNum, chapter]) => {
            const chReqs = extractReqs(chapter.requirements);
            lines += "\n  Ch" + chNum +
              (chReqs.length ? " [" + chReqs.join(", ") + "]" : "");
            if (chapter.tiers) {
              Object.entries(chapter.tiers).forEach(([tierNum, node]) => {
                const nodeReqs = extractReqs(node.requirements);
                if (nodeReqs.length) {
                  const nodeLabel = (nodePrefix ? nodePrefix + " " : "") + chNum + "-" + tierNum +
                    (node.name ? " (" + node.name + ")" : "");
                  lines += "\n    " + nodeLabel + " [" + nodeReqs.join(", ") + "]";
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

        // web_search is a server-side tool: Anthropic executes it and includes the
        // results in the response automatically — never fabricate tool_result blocks.
        // The only continuation case is stop_reason "pause_turn" (long-running turn):
        // resend the conversation as-is so the server can finish.
        if (stopReason !== "pause_turn") break;

        if (loopCount === 1) {
          loadingEl.querySelector(".ai-msg-bubble").textContent = "Searching for current data...";
          loadingEl.querySelector(".ai-msg-bubble").style.fontFamily = "var(--font-mono)";
          loadingEl.querySelector(".ai-msg-bubble").style.fontSize = "12px";
          loadingEl.querySelector(".ai-msg-bubble").style.color = "var(--text-dim)";
        }
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
      el.innerHTML = '<p style="padding:3rem;text-align:center;color:var(--text-mid);font-size:14px;font-family:var(--font-mono)">Player card not available. Try signing out and back in.</p>';
      return;
    }

    // ── Pull all data ───────────────────────────────────────────────────────
    const name      = (card && card.name) || "Commander";
    const level     = card ? ((card.level && card.level.completedTier) ? card.level.completedTier : (card.level || "—")) : "—";
    const tcp       = (card && card.tcp) || 0;
    const stp       = (card && card.stp) || 0;
    const chars     = (card && card.charactersCollected) || roster.length;
    const arena     = (card && card.latestArena) || "—";
    const blitz     = (card && card.latestBlitz) || "—"; // spec: latestBlitz is a rank
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

    // Alliance info — AllianceCard spec fields: name, level, type, warTrophies, warRank
    const allianceName     = allianceCard ? (allianceCard.name || "—") : "—";
    const allianceLevel    = allianceCard && allianceCard.level && allianceCard.level.completedTier != null ? allianceCard.level.completedTier : "—";
    const allianceType     = allianceCard && allianceCard.type ? allianceCard.type.charAt(0).toUpperCase() + allianceCard.type.slice(1) : "—";
    const allianceTrophies = allianceCard && allianceCard.warTrophies != null ? allianceCard.warTrophies : "—";
    const allianceWarRank  = allianceCard && allianceCard.warRank != null ? allianceCard.warRank : "—";

    // ── Derived roster stats ─────────────────────────────────────────────────
    const totalStars    = roster.reduce((s, c) => s + (c.stars    || 0), 0);
    const totalRedStars = roster.reduce((s, c) => s + (c.redStars || 0), 0);

    // ── Helpers ──────────────────────────────────────────────────────────────
    function portImg(c, cls, style) {
      if (!c) return "";
      const url = getPortraitUrl(c);
      const fb  = makeFallbackAvatar(c.name, c.role).replace(/"/g,"'").replace(/\n/g,"");
      return `<img src="${url}" class="${cls} img-with-fallback" style="${style||""}" />
        <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;position:absolute;inset:0">${fb}</div>`;
    }

    function statBox(label, val, accent) {
      return `<div class="cmd-stat">
        <div class="cmd-stat-label">${label}</div>
        <div class="cmd-stat-val" style="${accent ? "color:"+accent : ""}">${val}</div>
      </div>`;
    }

    function statRow(label, val) {
      if (val === null || val === undefined || val === "—" || val === "") return "";
      return `<div class="cmd-stat-row">
        <span class="cmd-stat-label">${label}</span>
        <span class="cmd-stat-val">${val}</span>
      </div>`;
    }

    function fmtPower(n) {
      if (!n) return null;
      return n >= 1000000 ? (Math.round(n / 100000) / 10) + "M" : Math.round(n / 1000) + "k";
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
        return `<span class="tier-legend-item"><span class="tier-legend-dot" style="background:${col}"></span>${t} <span style="color:var(--text-mid)">${tierCounts[t]}</span></span>`;
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
                  <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block" class="img-with-fallback" />
                  <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center">${fb}</div>
                </div>
                <div class="cmd-squad-name">${esc(m.name.split(" ")[0])}</div>
                <div class="cmd-squad-power">${m.power ? Math.round(m.power/1000)+"k" : rc ? Math.round(rc.power/1000)+"k" : "—"}</div>
              </div>`;
            }).join("")}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-dim)">
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-mid);text-transform:uppercase;letter-spacing:.1em">${bestSquad.name}</span>
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
          <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block" class="img-with-fallback" />
          <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center">${fb}</div>
        </div>
        <div class="cmd-top-name">${esc(c.name)}</div>
        <div class="cmd-top-tier">
          <span class="tier-badge ${tierClass(c.tier)}" style="font-size:10px;padding:1px 4px;border:1px solid">${c.tier}</span>
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
            ${bestChar ? `<img src="${getPortraitUrl(bestChar)}" class="img-hide-on-error" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;opacity:0.18;filter:blur(2px) saturate(1.5)"/>` : ""}
          </div>
          <div class="cmd-hero-content">
            <div class="cmd-player-avatar">
              <img src="${card && card.icon ? card.icon : (bestChar ? getPortraitUrl(bestChar) : "")}"
                   class="cmd-portrait img-with-fallback">
              <div class="cmd-portrait-fallback" style="display:none">
                <span>${initials}</span>
              </div>
              ${card && card.frame ? `<img src="${card.frame}" class="cmd-frame img-hide-on-error">` : ""}
              <span class="cmd-avatar-level">${level}</span>
            </div>
            <div class="cmd-hero-info">
              <div class="cmd-commander-label">Commander</div>
              <div class="cmd-commander-name">${esc(name)}</div>
              <div class="cmd-commander-meta">
                ${allianceName !== "—" ? `<span class="cmd-meta-pill cmd-meta-alliance">⚔ ${esc(allianceName)}</span>` : ""}
                <span class="cmd-meta-pill">${chars} Characters</span>
              </div>
              <div class="cmd-stats-table">
                ${statRow("Total Power",      fmtPower(tcp))}
                ${statRow("Team Power",       fmtPower(stp))}
                ${statRow("Max Stars",        card && card.charactersAtMaxStarRank != null ? card.charactersAtMaxStarRank : null)}
                ${statRow("Total Stars",      totalStars || null)}
                ${statRow("Red Stars",        totalRedStars || null)}
                ${statRow("Arena Rank",       card && card.latestArena ? card.latestArena : null)}
                ${statRow("Best Arena",       card && card.bestArena   ? card.bestArena   : null)}
                ${statRow("Blitz Rank",       card && card.latestBlitz != null ? card.latestBlitz : null)}
                ${statRow("Blitz Wins",       card && card.blitzWins != null ? card.blitzWins : null)}
                ${statRow("War MVP",          card && card.warMvp != null ? card.warMvp : null)}
              </div>
            </div>
          </div>
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
            <div class="cmd-alliance-name">${esc(allianceCard.name)}</div>
            ${allianceCard.description ? `<div class="cmd-alliance-desc">${esc(allianceCard.description)}</div>` : ""}
            <div class="cmd-alliance-stats">
              ${allianceLevel    !== "—" ? statBox("Level", allianceLevel, "var(--accent)") : ""}
              ${allianceType     !== "—" ? statBox("Type", allianceType) : ""}
              ${allianceTrophies !== "—" ? statBox("War Trophies", allianceTrophies, "var(--red)") : ""}
              ${allianceWarRank  !== "—" ? statBox("War Rank", allianceWarRank, "var(--green)") : ""}
            </div>
          </div>
        </div>` : ""}

        <!-- Owned Frames -->
        ${(() => {
          const frames = playerInventory
            .filter(item => categoriseById(item.item) === "FRAME")
            .map(item => ({ id: item.item, qty: item.quantity, meta: itemMetadata[item.item] || {} }))
            .filter(f => f.meta.name || f.meta.icon);
          if (!frames.length) return "";
          return `<div class="cmd-section">
            <div class="cmd-section-label">Owned Frames</div>
            <div class="cmd-frames-grid">
              ${frames.map(f => {
                const isActive = card && card.frame && f.meta.icon && card.frame === f.meta.icon;
                const fname = esc(f.meta.name || f.id);
                return `<div class="cmd-frame-tile${isActive ? " cmd-frame-tile--active" : ""}">
                  ${f.meta.icon
                    ? `<img src="${f.meta.icon}" class="cmd-frame-img img-hide-on-error" />`
                    : `<div class="cmd-frame-img-fb">${fname.charAt(0)}</div>`}
                  <div class="cmd-frame-name">${fname}</div>
                  ${isActive ? `<div class="cmd-frame-equipped">Equipped</div>` : ""}
                </div>`;
              }).join("")}
            </div>
          </div>`;
        })()}

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
      <img src="${portUrl}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block" class="img-with-fallback" />
      <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:5rem;position:absolute;inset:0">${fallback}</div>
      <div class="modal-portrait-gradient"></div>
      <div class="modal-portrait-info">
        <div id="modal-name" class="modal-title">${esc(c.name)}</div>
        <div id="modal-tier-badge"><span class="tier-badge ${tierClass(c.tier)}" style="font-size:11px;padding:2px 6px;border:1px solid">${c.tier}</span></div>
      </div>`;

    const rolesEl = document.getElementById("modal-roles");
    rolesEl.innerHTML = c.roles && c.roles.length
      ? c.roles.map(r => '<span class="modal-badge role">' + r + '</span>').join("")
      : '<span style="font-size:13px;color:var(--text-mid)">Unknown</span>';

    const teamsEl = document.getElementById("modal-teams");
    teamsEl.innerHTML = c.teams && c.teams.length
      ? c.teams.map(t => '<span class="modal-badge">' + t + '</span>').join("")
      : '<span style="font-size:13px;color:var(--text-mid)">None</span>';

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
    const { shardsOwned, currentStars, nextStarNeeded, pct } = getShardData(c, invMap);
    const shardsEl = document.getElementById("modal-shards");
    if (shardsOwned > 0 || currentStars < 7) {
      shardsEl.innerHTML =
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">' +
        '<span>' + shardsOwned + ' shards owned</span>' +
        (currentStars < 7 ? '<span style="color:var(--text-mid)">' + nextStarNeeded + ' needed for ' + (currentStars+1) + '★</span>' : '<span style="color:var(--green)">Max stars!</span>') +
        '</div>' +
        '<div class="modal-shard-bar"><div class="modal-shard-fill" style="width:' + pct + '%"></div></div>' +
        '<a href="https://msf.gg/characters/' + c.name.replace(/ /g, "") + '" target="_blank" style="font-size:11px;color:var(--accent);display:block;margin-top:6px;text-decoration:none">View on msf.gg ↗</a>';
    } else {
      shardsEl.innerHTML = '<span style="font-size:13px;color:var(--text-mid)">No shards in inventory</span>';
    }

    document.getElementById("char-modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Gear for next tier
    const gearEl = document.getElementById("modal-gear");
    const currentTierNum = parseInt((c.tier || "T1").replace("T", "")) || 1;
    const nextTierNum = currentTierNum + 1;
    // c.portrait holds the real characterId from the API; never rebuild it from the display name
    const charId = c.portrait || c.name.replace(/\s/g, "");

    try {
      const token = sessionStorage.getItem("msf_token");
      const headers = { "x-api-key": API_KEY, "Authorization": "Bearer " + token };
      // gearTiers defaults to "none" — must be requested explicitly
      const res = await fetch(API_BASE + "/game/v1/characters/" + encodeURIComponent(charId) + "?gearTiers=full&pieceInfo=full", { headers });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const gearTiers = data.data && data.data.gearTiers;
      const nextTier = gearTiers && gearTiers[nextTierNum];

      if (!nextTier || !nextTier.slots) {
        gearEl.innerHTML = '<span style="font-size:13px;color:var(--text-mid)">' + (nextTierNum > 20 ? "Max gear tier reached!" : "No gear data for T" + nextTierNum) + '</span>';
      } else {
        gearEl.className = "modal-gear-grid";
        gearEl.innerHTML = nextTier.slots.map(slot => {
          const piece = slot.piece;
          const owned = invMap[piece.id] || 0;
          const needed = slot.level || 1;
          const hasEnough = owned >= needed;
          return '<div class="modal-gear-piece" style="border:1px solid ' + (hasEnough ? "rgba(0,230,118,0.3)" : "var(--border-dim)") + '">' +
            '<img class="modal-gear-icon img-hide-on-error" src="' + piece.icon + '" />' +
            '<div class="modal-gear-name">' + esc(piece.name) + '</div>' +
            '<div class="modal-gear-level" style="color:' + (hasEnough ? "var(--green)" : "var(--gold)") + '">' +
            owned + ' / ' + needed + '</div>' +
            '</div>';
        }).join("");
      }
    } catch(e) {
      gearEl.className = "";
      gearEl.innerHTML = '<span style="font-size:13px;color:var(--text-mid)">Could not load gear data.</span>';
    }
  }

  function closeModal(e) {
    if (e && e.target !== document.getElementById("char-modal")) return;
    document.getElementById("char-modal").classList.add("hidden");
    document.body.style.overflow = "";
  }

  // ── Helper: extract requirements text ─────────────────────────────────────
  // Module-level requirement formatter — uses full CharacterFilter schema from API spec
  function formatRequirements(reqs) {
    if (!reqs) return null;
    const parts = [];
    const traitStr = t => typeof t === "string" ? t : (t && (t.name || t.id) || "");

    (reqs.anyCharacterFilters || []).forEach(f => {
      const fp = [];
      if (f.allTraits  && f.allTraits.length)  fp.push(f.allTraits.map(traitStr).filter(Boolean).join("+"));
      if (f.anyTraits  && f.anyTraits.length)  fp.push("any:"+f.anyTraits.map(traitStr).filter(Boolean).join("/"));
      if (f.gearTier)   fp.push("T"+f.gearTier+"+");
      if (f.level)      fp.push("Lvl"+f.level+"+");
      if (f.activeYellow) fp.push(f.activeYellow+"★+");
      if (f.iso8Class)  fp.push("ISO:"+f.iso8Class);
      if (f.anyCharacters && f.anyCharacters.length)
        fp.push(f.anyCharacters.slice(0,2).map(id=>id.replace(/([A-Z])/g," $1").trim()).join("/"));
      if (fp.length) parts.push(fp.join(" "));
    });

    if (reqs.specificCharacters && reqs.specificCharacters.length)
      parts.unshift("Req: " + reqs.specificCharacters.map(id=>id.replace(/([A-Z])/g," $1").trim()).join(", "));
    if (reqs.minCharacters && reqs.minCharacters > 1)
      parts.push(reqs.minCharacters + " chars");

    return parts.length ? parts.join(" · ") : null;
  }

  // ── Helper: extract item rewards list ───────────────────────────────────────
  function extractRewardItems(itemQty, limit) {
    if (!itemQty) return [];
    const items = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.allOf) { node.allOf.forEach(walk); return; }
      if (node.oneOf) { node.oneOf.forEach(walk); return; }
      if (node.item) {
        const itm = node.item;
        const id   = typeof itm === "string" ? itm : itm.id;
        const name = typeof itm === "object" ? (itm.name || null) : null;
        const icon = typeof itm === "object" ? (itm.icon || null) : null;
        if (id && !id.startsWith("CURRENCY_") && !id.startsWith("CONSUMABLE_")) {
          items.push({ id, name: name || (itemMetadata[id] && itemMetadata[id].name) || id.replace(/^[A-Z]+_/, "").replace(/_/g," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()), icon: icon || (itemMetadata[id] && itemMetadata[id].icon) || null, qty: node.quantity || 0 });
        }
      }
    };
    walk(itemQty);
    return items.slice(0, limit || 6);
  }

  // ── Smart squad suggestion using full CharacterFilter schema from API spec ────
  // CharacterFilter fields: allTraits, anyTraits, exceptTraits, anyCharacters,
  //                         level, activeYellow, activeRed, gearTier, iso8Class, iso8ClassLevel
  function smartSquadForReqs(reqs, top) {
    top = top || 5;
    if (!reqs || !roster.length) return [];
    const filters = reqs.anyCharacterFilters || [];
    const traitStr = t => (typeof t === "string" ? t : (t && (t.name || t.id) || "")).toLowerCase();

    // Check if a character satisfies a CharacterFilter
    function satisfiesFilter(c, f) {
      const charTraits = [...(c.roles||[]), ...(c.teams||[])].map(x => x.toLowerCase());
      const tierNum = parseInt((c.tier||"T0").replace("T","")) || 0;

      // allTraits: character must have each trait
      if (f.allTraits && f.allTraits.length) {
        if (!f.allTraits.every(t => charTraits.some(ct => ct === traitStr(t) || ct.includes(traitStr(t))))) return false;
      }
      // anyTraits: character must have at least one
      if (f.anyTraits && f.anyTraits.length) {
        if (!f.anyTraits.some(t => charTraits.some(ct => ct === traitStr(t) || ct.includes(traitStr(t))))) return false;
      }
      // exceptTraits: character must NOT have these
      if (f.exceptTraits && f.exceptTraits.length) {
        if (f.exceptTraits.some(t => charTraits.some(ct => ct === traitStr(t)))) return false;
      }
      // gearTier: minimum gear tier
      if (f.gearTier && tierNum < f.gearTier) return false;
      // level: minimum level
      if (f.level && (c.level||1) < f.level) return false;
      // activeYellow: minimum yellow stars
      if (f.activeYellow && (c.stars||0) < f.activeYellow) return false;
      // anyCharacters: must be one of these specific characters
      if (f.anyCharacters && f.anyCharacters.length) {
        if (!f.anyCharacters.some(id => id.replace(/([A-Z])/g," $1").trim().toLowerCase() === c.name.toLowerCase())) return false;
      }
      return true;
    }

    const scored = roster.map(c => {
      let score = 0;
      let meetsAnyFilter = filters.length === 0; // no filters = all qualify

      filters.forEach(f => {
        if (satisfiesFilter(c, f)) {
          meetsAnyFilter = true;
          // Higher score for more specific matches
          score += (f.allTraits||[]).length * 10 + (f.gearTier ? 5 : 0) + (f.level ? 3 : 0);
        }
      });

      if (!meetsAnyFilter) score -= 200;

      // Also check specificCharacters
      if (reqs.specificCharacters && reqs.specificCharacters.length) {
        if (reqs.specificCharacters.some(id => id.replace(/([A-Z])/g," $1").trim().toLowerCase() === c.name.toLowerCase()))
          score += 100;
      }

      return { ...c, _score: score, _meets: meetsAnyFilter };
    });

    const qualified = scored.filter(c => c._meets || filters.length === 0);
    if (qualified.length > 0)
      return qualified.sort((a,b) => b._score - a._score || b.power - a.power).slice(0, top);
    return [...roster].sort((a,b) => b.power - a.power).slice(0, top);
  }

  // ── Activity tab state ───────────────────────────────────────────────────────
  let _actTab = "events";

  // ── Render activities ────────────────────────────────────────────────────────
  async function renderActivities() {
    const elChallenges = document.getElementById("act-panel-challenges");
    const elMissions   = document.getElementById("act-panel-missions");
    const elMaps       = document.getElementById("act-panel-maps");
    const elLegendary  = document.getElementById("act-panel-legendary");
    if (!elChallenges || !elMissions || !elMaps || !elLegendary) return;

    const token = sessionStorage.getItem("msf_token");
    const headers = { "x-api-key": API_KEY, "Authorization": "Bearer " + token };
    const now = Date.now() / 1000;

    function timeStr(endTime) {
      const diff = endTime - now;
      if (diff <= 0) return null;
      const d = Math.floor(diff / 86400), h = Math.floor((diff%86400)/3600), m = Math.floor((diff%3600)/60);
      if (d > 0) return d + "d " + h + "h";
      if (h > 0) return h + "h " + m + "m";
      return m + "m";
    }

    function rewardPill(item) {
      const icon = item.icon;
      const name = esc(item.name || item.id);
      return `<div class="act-reward-pill" title="${name}">
        ${icon ? `<div class="act-reward-icon" style="background-image:url('${icon}')"></div>` : `<div class="act-reward-icon act-reward-icon--text">${name.slice(0,2).toUpperCase()}</div>`}
        <span class="act-reward-name">${name}</span>
      </div>`;
    }

    function rosterPips(chars) {
      return chars.slice(0,5).map(c => {
        const url = getPortraitUrl(c);
        const roleColor = ROLE_COLORS[c.role] || "#00c8ff";
        const fb = makeFallbackAvatar(c.name, c.role).replace(/"/g,"'").replace(/\n/g,"");
        return `<div class="act-roster-pip" title="${esc(c.name)} · ${Math.round(c.power/1000)}k · ${c.tier}" style="border-color:${roleColor}">
          <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:50%" class="img-with-fallback" />
          <div style="display:none;width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center">${fb}</div>
        </div>`;
      }).join("");
    }

    // ── Card builder ───────────────────────────────────────────────────────────
    function actCard({ id, typeLabel, typeColor, name, subName, art, timeLeft, reqText, rewards, suggestedChars, details, noTimer, popupArt, popupDetails }) {
      const timeHtml = noTimer ? "" : (timeLeft ? `<div class="act-timer">⏱ ${timeLeft}</div>` : `<div class="act-timer act-timer--ended">Ended</div>`);
      const artHtml = art
        ? `<div class="act-card-art" style="background-image:url('${art}')"></div>`
        : "";

      const rewardsHtml = rewards && rewards.length
        ? `<div class="act-section-label">Rewards</div><div class="act-rewards-row">${rewards.map(rewardPill).join("")}</div>`
        : "";

      // Only show squad if we have real matches (score > 0 chars)
      const rosterHtml = suggestedChars && suggestedChars.length
        ? `<div class="act-section-label">${reqText ? "Matched Squad" : "Top Squad"}</div>
           <div class="act-roster-row">${rosterPips(suggestedChars)}</div>`
        : "";

      const detailHtml = details ? `<div class="act-card-details">${esc(details.replace(/\n/g," ").slice(0,200))}${details.length>200?"…":""}</div>` : "";
      const reqHtml = reqText ? `<div class="act-req-badge">⚠ ${esc(reqText)}</div>` : "";

      // Popup data attributes — added when the card has popup content to show
      const hasPopup = popupArt || popupDetails;
      const escapedPopupArt     = popupArt     ? popupArt.replace(/"/g,"&quot;")     : "";
      const escapedPopupDetails = popupDetails ? popupDetails.replace(/"/g,"&quot;") : "";
      const escapedName         = name.replace(/"/g,"&quot;");
      const escapedSub          = (subName||"").replace(/<[^>]*>/g,"").replace(/"/g,"&quot;");
      const popupAttrs = hasPopup
        ? ` data-popup-art="${escapedPopupArt}" data-popup-details="${escapedPopupDetails}" data-popup-title="${escapedName}" data-popup-sub="${escapedSub}" data-popup-type="${typeLabel}" data-popup-color="${typeColor}"`
        : "";
      const clickableClass = hasPopup ? " act-card--clickable" : "";

      return `<div class="act-card${clickableClass}" data-act-id="${id}"${popupAttrs}>
        ${artHtml}
        <div class="act-card-body">
          <div class="act-card-header">
            <div class="act-type-badge" style="background:${typeColor}22;color:${typeColor};border-color:${typeColor}44">${typeLabel}</div>
            ${timeHtml}
          </div>
          <div class="act-card-title">${esc(name)}</div>
          ${subName ? `<div class="act-card-sub">${subName}</div>` : ""}
          ${reqHtml}
          ${detailHtml}
          ${rewardsHtml}
          ${rosterHtml}
        </div>
      </div>`;
    }

    function formatActivityId(id) {
      if (!id) return "Unknown";
      return id
        .replace(/^dd_id_/, "")
        .replace(/^raid_/, "")
        .replace(/^pyp_/, "")
        .replace(/^tower_/, "")
        .replace(/_details$/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    // Grouped raid card — type: "raid" | "dd" | "pyp" | "tower"
    function raidGroupCard(groupRaids, type) {
      if (!groupRaids || !groupRaids.length) return "";
      const isDark = type === "dd";
      const primary = groupRaids[0];
      const typeLabel = { raid:"Raid", dd:"Dark Dimension", pyp:"Pick Your Poison", tower:"Survival Tower" }[type] || "Raid";
      const typeColor = { raid:"#ef4444", dd:"#a855f7", pyp:"#f59e0b", tower:"#10b981" }[type] || "#ef4444";
      // Get icon from boss room or starting room (NodeInfo has icon field)
      let art = primary.cardArt || primary.popupArt || null;
      if (!art && primary.rooms) {
        // Try boss room first, then starting room, then any room with an icon
        const roomValues = Object.values(primary.rooms);
        const bossRoom = roomValues.find(r => r.isBoss && r.icon);
        const startRoom = primary.startingRoomId && primary.rooms[primary.startingRoomId];
        const anyRoom = roomValues.find(r => r.icon);
        const iconRoom = bossRoom || (startRoom && startRoom.icon ? startRoom : null) || anyRoom;
        if (iconRoom && iconRoom.icon) art = iconRoom.icon;
      }

      // Collect requirements from all difficulties
      const diffs = primary.difficulties || {};
      const diffEntries = Object.entries(diffs).sort((a,b) => parseInt(a[0])-parseInt(b[0]));
      const diff1 = (diffEntries[0] && diffEntries[0][1]) || null;
      const reqs  = diff1 && diff1.requirements ? diff1.requirements : null;
      const reqText = formatRequirements(reqs);

      // Difficulty badge row
      const diffLabels = ["Normal","Hard","Heroic","Legendary"];
      const diffBadgeColors = ["#94a3b8","#f59e0b","#ef4444","#8b5cf6"];
      const diffBadgesHtml = diffEntries.map(([num, info], i) => {
        const label = diffLabels[i] || ("Diff " + num);
        const color = diffBadgeColors[i] || "#6b7280";
        const diffReqText = formatRequirements(info.requirements);
        return `<span class="act-diff-badge" style="color:${color};border-color:${color}40" title="${esc(diffReqText || '')}">${label}</span>`;
      }).join("");

      // Completion rewards from the highest difficulty
      const lastDiff = diffEntries[diffEntries.length-1];
      const lastDiffData = lastDiff && lastDiff[1];
      let rewards = [];
      const compObj = isDark ? primary.ddCompletion : primary.completion;
      if (compObj && compObj.tiers) {
        Object.values(compObj.tiers).slice(0,2).forEach(t => rewards.push(...extractRewardItems(t.rewards, 2)));
      }
      if (primary.nodeRewards) {
        Object.values(primary.nodeRewards).forEach(nrObj => rewards.push(...extractRewardItems(nrObj, 2)));
      }
      rewards = [...new Map(rewards.map(r => [r.id, r])).values()].slice(0, 6);

      // Squad suggestion: use diff1 requirements
      const suggested = smartSquadForReqs(reqs, 5);

      const meta = primary.hours ? primary.hours + "h · " + (primary.teams||1) + " teams" : "";
      const recs = lastDiffData && lastDiffData.recommendations || diff1 && diff1.recommendations || primary.details || null;

      const cardId = type + "-" + primary.id;
      // Wrap in a clickable div that opens the room detail panel
      const cardHtml = actCard({
        id: cardId,
        typeLabel, typeColor,
        name: primary.name || formatActivityId(primary.id),
        subName: esc(primary.subName || meta) + (diffBadgesHtml ? `<div class="act-diff-row" style="margin-top:4px">${diffBadgesHtml}</div>` : ""),
        art, timeLeft: null, noTimer: true,
        reqText, rewards,
        suggestedChars: suggested,
        details: recs
      });
      // Make card clickable - store type and group ids for detail panel
      const groupIds = groupRaids.map(r => r.id).join(",");
      return cardHtml.replace(`data-act-id="${cardId}"`,
        `data-act-id="${cardId}" data-raid-type="${type}" data-raid-ids="${groupIds}" style="cursor:pointer"`);
    }

    // ── Build section HTML ─────────────────────────────────────────────────────
    function section(title, icon, cards, emptyMsg) {
      if (!cards.length && !emptyMsg) return "";
      return `<div class="act-section">
        <div class="act-section-header">
          <span class="act-section-icon">${icon}</span>
          <span class="act-section-title">${title}</span>
          <span class="act-section-count">${cards.length}</span>
        </div>
        <div class="act-cards-row">
          ${cards.length ? cards.join("") : `<div class="act-empty">${emptyMsg}</div>`}
        </div>
      </div>`;
    }

    // ── Categorise player events by type ───────────────────────────────────────
    const active = playerEvents.filter(e => e.endTime > now);
    const ended  = playerEvents.filter(e => e.endTime <= now);

    // Raid-related event types should NOT appear in events — they're in the Raids section
    const RAID_EVENT_TYPES = new Set(["raid", "raidSeason"]);

    const byType = { blitz:[], episodic:[], milestone:[], tower:[], warSeason:[], battlePass:[], strikePass:[], pickYourPoison:[], other:[] };
    active.forEach(ev => {
      if (RAID_EVENT_TYPES.has(ev.type)) return; // skip — shown in Raids section
      const t = ev.type || "other";
      if (byType[t]) byType[t].push(ev);
      else byType.other.push(ev);
    });

    // Build event cards
    function eventCard(ev) {
      const art = ev.cardArt || ev.popupArt || null;
      const tLeft = timeStr(ev.endTime);
      let reqs = null, rewards = [];

      if (ev.blitz && ev.blitz.requirements)  reqs = ev.blitz.requirements;
      if (ev.tower && ev.tower.requirements)   reqs = ev.tower.requirements;
      if (ev.milestone && ev.milestone.objective && ev.milestone.objective.tiers) {
        Object.values(ev.milestone.objective.tiers).forEach(t => rewards.push(...extractRewardItems(t.rewards, 2)));
      }

      const reqText = formatRequirements(reqs);
      // Only show squad suggestion if there are actual trait requirements
      const hasTraitReqs = reqs && reqs.anyCharacterFilters && reqs.anyCharacterFilters.some(f => f.allTraits && f.allTraits.length);
      const suggested = hasTraitReqs ? smartSquadForReqs(reqs, 5) : [];

      const typeColors = { blitz:"#f59e0b", episodic:"#8b5cf6", milestone:"#06b6d4", tower:"#10b981", warSeason:"#ef4444", raidSeason:"#3b82f6", battlePass:"#f97316", strikePass:"#ec4899", pickYourPoison:"#a855f7", other:"#6b7280" };
      const typeNames  = { blitz:"Blitz", episodic:"Challenge", milestone:"Milestone", tower:"Tower", warSeason:"War Season", raidSeason:"Raid Season", battlePass:"Battle Pass", strikePass:"Strike Pass", pickYourPoison:"Pick Your Poison", other:"Event" };

      return actCard({
        id: "ev-" + ev.id,
        typeLabel: typeNames[ev.type] || "Event",
        typeColor: typeColors[ev.type] || "#6b7280",
        name: ev.name || "Event",
        subName: esc(ev.subName || ""),
        art, timeLeft: tLeft,
        reqText, rewards,
        suggestedChars: suggested,
        details: ev.details,
        popupArt: ev.popupArt || null,
        popupDetails: ev.popupDetails || null
      });
    }

    // ── Campaign grouping using EventCampaignGroup.ids from API spec ────────────
    // EpisodicInfo.group = { name, description, ids: [episodicId, ...] }
    // ids gives the authoritative ordered list of variants in a group
    function getCampaignBaseKey(camp) {
      // Fallback suffix-strip for campaigns without a group
      return camp.id.replace(/_HARD$|_HEROIC$|_EPIC$|_XTREME$|_APOCALYPTIC$/, "");
    }

    function groupCampaigns(campList) {
      const grouped = {}, order = [];
      campList.forEach(camp => {
        // Use group.ids[0] as the group key if available (spec: EventCampaignGroup)
        const groupKey = (camp.group && camp.group.ids && camp.group.ids.length)
          ? camp.group.ids[0]
          : getCampaignBaseKey(camp);
        if (!grouped[groupKey]) { grouped[groupKey] = []; order.push(groupKey); }
        grouped[groupKey].push(camp);
      });
      // Sort within group by the order defined in group.ids
      order.forEach(key => {
        const firstCamp = grouped[key][0];
        const idOrder = (firstCamp && firstCamp.group && firstCamp.group.ids) || [];
        grouped[key].sort((a,b) => {
          const ia = idOrder.indexOf(a.id), ib = idOrder.indexOf(b.id);
          if (ia !== -1 && ib !== -1) return ia - ib;
          return a.id.localeCompare(b.id);
        });
      });
      return order.map(key => grouped[key]);
    }

    // Format Requirements using full CharacterFilter schema from API spec
    // CharacterFilter fields: allTraits, anyTraits, exceptTraits, anyCharacters,
    //                         level, activeYellow, activeRed, gearTier, iso8Class, iso8ClassLevel
    // Trait is oneOf [string, {id, name}]
    function traitName(t) {
      return typeof t === "string" ? t : (t && (t.name || t.id) || "");
    }

    function formatReqGold(reqs) {
      if (!reqs) return "";
      const parts = [];

      // anyCharacterFilters: different chars can match different filters
      const filters = reqs.anyCharacterFilters || [];
      filters.forEach(f => {
        const filterParts = [];
        if (f.allTraits && f.allTraits.length)
          filterParts.push(f.allTraits.map(traitName).filter(Boolean).join(" + "));
        if (f.anyTraits && f.anyTraits.length)
          filterParts.push("any of: " + f.anyTraits.map(traitName).filter(Boolean).join("/"));
        if (f.gearTier)    filterParts.push("Gear Tier " + f.gearTier + "+");
        if (f.level)       filterParts.push("Lvl " + f.level + "+");
        if (f.activeYellow) filterParts.push(f.activeYellow + "+ ★");
        if (f.activeRed)   filterParts.push(f.activeRed + "+ RS");
        if (f.iso8Class)   filterParts.push("ISO " + f.iso8Class + (f.iso8ClassLevel ? " Lvl " + f.iso8ClassLevel : ""));
        if (f.anyCharacters && f.anyCharacters.length)
          filterParts.push("one of: " + f.anyCharacters.slice(0,3).map(id => id.replace(/([A-Z])/g," $1").trim()).join("/"));
        if (filterParts.length)
          parts.push("<span class='camp-req-trait'>" + esc(filterParts.join(" · ")) + "</span>");
      });

      // specificCharacters: all required
      if (reqs.specificCharacters && reqs.specificCharacters.length) {
        parts.unshift("Requires: <span class='camp-req-trait'>" +
          esc(reqs.specificCharacters.map(id => id.replace(/([A-Z])/g," $1").trim()).join(", ")) + "</span>");
      }

      // minCharacters
      if (reqs.minCharacters && reqs.minCharacters > 1)
        parts.push("<span class='camp-req-trait'>" + reqs.minCharacters + " chars min</span>");

      return parts.join(" · ");
    }

    // Get first node name from a chapter as its display name
    function getChapterDisplayName(chapter, chNum) {
      if (!chapter || !chapter.tiers) return "Chapter " + chNum;
      // Tiers are numbered NodeInfo objects — tier itself IS the mission
      const firstTier = Object.values(chapter.tiers)[0];
      return (firstTier && firstTier.name) ? firstTier.name : ("Chapter " + chNum);
    }

    // Build reward icons strip
    function rewardStrip(rewards, limit) {
      const items = extractRewardItems(rewards, limit||6);
      if (!items.length) return "";
      return items.map(r => {
        const icon = r.icon || (itemMetadata[r.id] && itemMetadata[r.id].icon);
        const name = r.name || (itemMetadata[r.id] && itemMetadata[r.id].name) || r.id;
        return `<div class="camp-reward-chip" title="${esc(name)}×${r.qty||1}">
          ${icon ? `<div style="width:20px;height:20px;background-image:url('${icon}');background-size:contain;background-repeat:no-repeat;background-position:center;flex-shrink:0"></div>`
                 : `<div style="width:20px;height:20px;background:rgba(255,255,255,0.05);border-radius:2px;flex-shrink:0"></div>`}
          ${r.qty > 1 ? `<span>×${r.qty}</span>` : ""}
        </div>`;
      }).join("");
    }

    // Build a campaign card — clicking opens the detail panel
    function campaignGroupCard(campGroup) {
      const primary = campGroup[0];
      const nodeData = campaignNodes[primary.id];
      const STD = new Set(["VILLAINS_CAMPAIGN","NEXUS_CAMPAIGN","COSMIC_CAMPAIGN","MYSTIC_CAMPAIGN",
        "HEROES_CAMPAIGN","DOOM_CAMPAIGN","ISO8_CAMPAIGN","INCURSION_CAMPAIGN"]);
      const isEvent = !STD.has(getCampaignBaseKey(primary));
      const typeLabel = isEvent ? "Event Campaign" : "Campaign";
      const typeColor = isEvent ? "#f59e0b" : "#6366f1";

      const topReqs  = nodeData && nodeData.requirements ? nodeData.requirements : null;
      const reqGold  = formatReqGold(topReqs);

      const DIFF_WORDS = new Set(["hard","heroic","normal","epic","apocalyptic","x-treme","xtreme","extreme","hard","heroic"]);

      // Display name: use group.name (title-cased) for event campaigns
      const groupRawName = (primary.group && primary.group.name) || "";
      const rawPrimaryName = (primary.name || "").trim();
      const displayName = groupRawName
        ? groupRawName.toLowerCase().replace(/\w/g, c => c.toUpperCase())
        : (DIFF_WORDS.has(rawPrimaryName.toLowerCase())
            ? getCampaignBaseKey(primary).replace(/_/g," ").toLowerCase().replace(/\w/g, c => c.toUpperCase())
            : rawPrimaryName);

      const diffLabels = {"":"Normal","_HARD":"Hard","_HEROIC":"Heroic","_EPIC":"Epic","_APOCALYPTIC":"Apocalyptic","_XTREME":"X-Treme"};
      const diffColors = {"Normal":"#94a3b8","Hard":"#f59e0b","Heroic":"#ef4444","Epic":"#8b5cf6","Apocalyptic":"#dc2626","X-Treme":"#06b6d4"};
      // Build difficulty badges from each campaign's name field
      // For event campaigns: name = "HARD"/"HEROIC"/"APOCALYPTIC" (the difficulty)
      // For standard campaigns: name = "Villains United" etc, use suffix-based labels
      const diffs = campGroup.map(camp => {
        const campName = (camp.name || "").trim();
        const isDiffName = DIFF_WORDS.has(campName.toLowerCase());
        let label, color;
        if (isDiffName) {
          // Event campaign — name IS the difficulty
          label = campName.charAt(0) + campName.slice(1).toLowerCase();
          color = diffColors[label] || diffColors[campName] || "#6b7280";
        } else {
          // Standard campaign — derive from ID suffix
          const suffix = camp.id.replace(getCampaignBaseKey(camp), "");
          label = diffLabels[suffix] || (suffix ? suffix.replace(/_/g,"") : "Normal");
          color = diffColors[label] || "#6b7280";
        }
        return { label, color, campId: camp.id };
      }).filter((d,i,arr) => arr.findIndex(x=>x.label===d.label)===i); // deduplicate

      // Art from first node icon
      let art = null;
      if (nodeData && nodeData.chapters) {
        outer: for (const ch of Object.values(nodeData.chapters)) {
          for (const tier of Object.values(ch.tiers||{})) {
            for (const node of Object.values(tier.nodes||{})) {
              if (node.icon) { art = node.icon; break outer; }
            }
          }
        }
      }

      const chCount = nodeData && nodeData.chapters ? Object.keys(nodeData.chapters).length : "?";
      const diffBadges = diffs.map(d =>
        `<span class="camp-diff-badge" style="color:${d.color};border-color:${d.color}40">${d.label}</span>`
      ).join("");

      return `<div class="act-card camp-card" style="cursor:pointer" data-camp-group="${primary.id}">
        ${art ? `<div class="act-card-art" style="background-image:url('${art}')"></div>` : ""}
        <div class="act-card-body">
          <div class="act-card-header">
            <div class="act-type-badge" style="background:${typeColor}22;color:${typeColor};border-color:${typeColor}44">${typeLabel}</div>
            ${diffs.length > 1 ? `<div style="display:flex;gap:3px;flex-wrap:wrap">${diffBadges}</div>` : ""}
          </div>
          <div class="act-card-title">${esc(displayName)}</div>
          ${primary.details ? `<div class="act-card-sub">${esc(primary.details.replace(/\n/g," ").slice(0,80))}${primary.details.length>80?"…":""}</div>` : ""}
          ${reqGold ? `<div class="act-req-badge" style="color:#f0a500;border-color:#f0a50030;background:#f0a50010;font-size:11px">${reqGold}</div>` : ""}
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-mid);margin-top:2px">${chCount} chapters</div>
        </div>
      </div>`;
    }


    // Group raids using official raidGroups data, fallback to groupId field
    function groupByRaidGroups(items, rgList) {
      if (rgList && rgList.length) {
        const byGroup = {}, order = [];
        rgList.forEach(rg => { byGroup[rg.id] = []; order.push(rg.id); });
        items.forEach(item => {
          const key = item.groupId || item.id;
          if (byGroup[key] !== undefined) byGroup[key].push(item);
          else { if (!byGroup[item.id]) { byGroup[item.id] = []; order.push(item.id); } byGroup[item.id].push(item); }
        });
        order.forEach(key => { if (byGroup[key]) byGroup[key].sort((a,b)=>a.id.localeCompare(b.id)); });
        return order.map(key => byGroup[key]).filter(g => g && g.length);
      }
      const grouped = {}, order = [];
      items.forEach(item => {
        const key = item.groupId || item.id;
        if (!grouped[key]) { grouped[key] = []; order.push(key); }
        grouped[key].push(item);
      });
      order.forEach(key => grouped[key].sort((a,b)=>a.id.localeCompare(b.id)));
      return order.map(key => grouped[key]);
    }

    // Local aliases for module-level data populated during fetch
    const raids = raids_data;
    const dds   = dds_data;

    const raidGroups = groupByRaidGroups(raids, raidGroups_data);
    const ddGroups   = groupByRaidGroups(dds, []);
    const pypGroups  = groupByRaidGroups(pyps_data, []);
    const stGroups   = groupByRaidGroups(towers_data, []);

    // ── Assemble sections ─────────────────────────────────────────────────────
    // Tab 1 "Challenges & Events": Challenges, Flash Events, Unlock Events, Other Events
    // Tab 2 "All Missions":        Campaigns, Event Campaigns
    // Tab 3 "Raid and Event Maps": Raids, Dark Dimensions, Pick Your Poison, Survival Towers
    // Tab 4 "Legendary Events":    Live Events, Alliance War, Recently Ended
    const challengeSections = [];
    const missionSections   = [];
    const legendarySections = [];

    // ── Section 1: Active Live Events (player events with art or key types) ──
    const SHOW_PLAYER_EVENT_TYPES = new Set(["blitz","battlePass","strikePass"]);
    const SKIP_PLAYER_EVENT_TYPES = new Set(["episodic","eventCampaign","challenge","flashEvent","unlockEvent","otherEvent","raid","raidSeason","warSeason","donation","info"]);

    const liveEvents = active.filter(ev =>
      SHOW_PLAYER_EVENT_TYPES.has(ev.type) ||
      (!SKIP_PLAYER_EVENT_TYPES.has(ev.type) && (ev.cardArt || ev.popupArt))
    );

    if (liveEvents.length) {
      const liveCards = liveEvents.map(ev => {
        const art = ev.cardArt || ev.popupArt || null;
        const tLeft = timeStr(ev.endTime);
        const typeColors = { blitz:"#f59e0b", battlePass:"#f97316", strikePass:"#ec4899", milestone:"#06b6d4", pickYourPoison:"#a855f7" };
        const typeNames  = { blitz:"Blitz", battlePass:"Battle Pass", strikePass:"Strike Pass", milestone:"Milestone", pickYourPoison:"Pick Your Poison" };
        const typeColor = typeColors[ev.type] || "#6b7280";
        const typeLabel = typeNames[ev.type] || (ev.type.charAt(0).toUpperCase()+ev.type.slice(1));

        let reqs = null, rewards = [];
        if (ev.blitz && ev.blitz.requirements) reqs = ev.blitz.requirements;
        const reqText = formatRequirements(reqs);
        const hasTraitReqs = reqs && (reqs.anyCharacterFilters||[]).some(f=>(f.allTraits||[]).length>0);
        const suggested = hasTraitReqs ? smartSquadForReqs(reqs, 5) : [];

        return actCard({
          id: "ev-" + ev.id, typeLabel, typeColor,
          name: ev.name || "Event",
          subName: esc(ev.subName || ""),
          art, timeLeft: tLeft,
          reqText, rewards, suggestedChars: suggested,
          details: ev.details,
          popupArt: ev.popupArt || null,
          popupDetails: ev.popupDetails || null
        });
      });
      // Live Events: tab TBD
    }

    // ── Helper: build campaign cards from episodic type ───────────────────────
    function episodicTypeCards(typeKey) {
      const items = episodics[typeKey] || [];
      if (!items.length) return [];
      return groupCampaigns(items).map(grp => campaignGroupCard(grp));
    }

    // ── Tab 2: All Missions ───────────────────────────────────────────────────
    const stdCamps = episodics.campaign.length ? episodics.campaign : campaigns.filter(c => {
      const STD = new Set(["VILLAINS_CAMPAIGN","NEXUS_CAMPAIGN","COSMIC_CAMPAIGN","MYSTIC_CAMPAIGN",
        "HEROES_CAMPAIGN","DOOM_CAMPAIGN","ISO8_CAMPAIGN","INCURSION_CAMPAIGN"]);
      return STD.has(getCampaignBaseKey(c));
    });
    const stdCards = groupCampaigns(stdCamps).map(grp => campaignGroupCard(grp));
    if (stdCards.length) missionSections.push(section("Select Campaigns", "📋", stdCards, ""));

    const evCampCards = episodicTypeCards("eventCampaign");
    if (evCampCards.length) missionSections.push(section("Event Campaigns", "⭐", evCampCards, ""));

    // ── Tab 3: Raid and Event Maps — dropdown + map viewer ───────────────────
    const mapItemsById = {};
    raids_data.forEach( item => { mapItemsById[item.id] = { item, typeLabel:"Raid",             typeColor:"#ef4444" }; });
    dds_data.forEach(   item => { mapItemsById[item.id] = { item, typeLabel:"Dark Dimension",   typeColor:"#a855f7" }; });
    pyps_data.forEach(  item => { mapItemsById[item.id] = { item, typeLabel:"Pick Your Poison", typeColor:"#f59e0b" }; });
    towers_data.forEach(item => { mapItemsById[item.id] = { item, typeLabel:"Survival Tower",   typeColor:"#10b981" }; });

    function buildOptgroup(items, label) {
      if (!items.length) return "";
      return `<optgroup label="${label}">${items.map(item =>
        `<option value="${esc(item.id)}">${esc(item.name || formatActivityId(item.id))}</option>`
      ).join("")}</optgroup>`;
    }

    // Room IDs encode grid position: "A8" = column A (index 0), row 8
    // Columns: A=0, B=1, C=2...  Rows displayed descending (highest = boss end, at top)
    function parseRoomId(id) {
      const m = String(id).match(/^([A-Za-z]+)(\d+)$/);
      if (!m) return null;
      let col = 0;
      for (const ch of m[1].toUpperCase()) col = col * 26 + ch.charCodeAt(0) - 64;
      return { col: col - 1, row: parseInt(m[2]) };
    }

    function rmapCellHtml(roomId, r) {
      const isBoss = !!r.isBoss;
      // Connection lines: roomNE = north (higher row), roomSW = south (lower row),
      // roomNW = west (prev col), roomSE = east (next col)
      const lines = [
        r.roomNE ? '<div class="rmap-line rmap-line-n"></div>' : "",
        r.roomSW ? '<div class="rmap-line rmap-line-s"></div>' : "",
        r.roomNW ? '<div class="rmap-line rmap-line-w"></div>' : "",
        r.roomSE ? '<div class="rmap-line rmap-line-e"></div>' : "",
      ].join("");
      const inner = r.icon
        ? `<img src="${r.icon}" class="rmap-node-img img-hide-on-error" alt="">`
        : `<span class="rmap-sym">${isBoss ? "★" : "α"}</span>`;
      const energy = r.energyCost ? `<div class="rmap-energy">${r.energyCost}</div>` : "";
      return `<div class="rmap-cell rmap-cell--active${isBoss ? " rmap-cell--boss" : ""}" data-room-id="${roomId}">
        ${lines}
        <div class="rmap-node${isBoss ? " rmap-node--boss" : ""}">${inner}</div>
        ${energy}
      </div>`;
    }

    function renderRaidMap(itemId) {
      const entry = mapItemsById[itemId];
      if (!entry) return `<div class="rmap-empty">Select a map above.</div>`;
      const { item, typeLabel, typeColor } = entry;
      const rooms = item.rooms || {};
      const roomIds = Object.keys(rooms);
      if (!roomIds.length) return `<div class="rmap-empty">No room data available for this map.</div>`;

      const meta = [item.hours ? item.hours + "h" : null, item.teams ? item.teams + " teams" : null].filter(Boolean).join(" · ");
      const metaHtml = `<div class="rmap-meta">
        <span class="rmap-meta-name">${esc(item.name || formatActivityId(item.id))}</span>
        <span class="rmap-meta-type" style="color:${typeColor};border-color:${typeColor}44;background:${typeColor}15">${typeLabel}</span>
        ${meta ? `<span class="rmap-meta-detail">${meta}</span>` : ""}
      </div>`;

      // Parse positions from room IDs
      const pos = {};
      roomIds.forEach(id => { const p = parseRoomId(id); if (p) pos[id] = p; });
      const positioned = Object.keys(pos);

      // Fallback for non-standard IDs: flat boss/regular groups
      if (!positioned.length) {
        const bossRooms = roomIds.filter(id => rooms[id].isBoss);
        const regRooms  = roomIds.filter(id => !rooms[id].isBoss);
        const nodeCell  = id => rmapCellHtml(id, rooms[id]);
        const bossHtml  = bossRooms.length ? `<div class="rmap-list-group"><div class="rmap-list-group-label">BOSS ROOMS</div><div class="rmap-list-row">${bossRooms.map(nodeCell).join("")}</div></div>` : "";
        const regHtml   = regRooms.length  ? `<div class="rmap-list-group"><div class="rmap-list-group-label">NODES (${regRooms.length})</div><div class="rmap-list-row">${regRooms.map(nodeCell).join("")}</div></div>` : "";
        return metaHtml + `<div class="rmap-flat">${bossHtml}${regHtml}</div>` + `<div id="rmap-node-detail" class="rmap-node-detail"></div>`;
      }

      const cols = positioned.map(id => pos[id].col);
      const rows = positioned.map(id => pos[id].row);
      const colMin = Math.min(...cols), colMax = Math.max(...cols);
      const rowMin = Math.min(...rows), rowMax = Math.max(...rows);
      const numCols = colMax - colMin + 1;
      const colLabels = Array.from({length: numCols}, (_, i) => String.fromCharCode(65 + colMin + i));

      // cellMap keyed by "col,row" relative to grid origin
      const cellMap = {};
      positioned.forEach(id => { cellMap[(pos[id].col - colMin) + "," + pos[id].row] = id; });

      // Render rows in DESCENDING order (highest row at top = boss end)
      const rowRange = [];
      for (let r = rowMax; r >= rowMin; r--) rowRange.push(r);

      const headerRow = `<div class="rmap-row rmap-header-row">
        <div class="rmap-row-label"></div>
        ${colLabels.map(l => `<div class="rmap-col-label">${l}</div>`).join("")}
      </div>`;
      const bodyRows = rowRange.map(rowNum =>
        `<div class="rmap-row">
          <div class="rmap-row-label">${rowNum}</div>
          ${Array.from({length: numCols}, (_, ci) => {
            const roomId = cellMap[ci + "," + rowNum];
            return roomId
              ? rmapCellHtml(roomId, rooms[roomId])
              : `<div class="rmap-cell rmap-cell--empty"></div>`;
          }).join("")}
        </div>`
      ).join("");

      return metaHtml
        + `<div class="rmap-grid-wrap"><div class="rmap-grid">${headerRow}${bodyRows}</div></div>`
        + `<div id="rmap-node-detail" class="rmap-node-detail"></div>`;
    }

    function showRmapNodeDetail(roomId, item) {
      const panel = document.getElementById("rmap-node-detail");
      if (!panel) return;
      const r = (item.rooms || {})[roomId];
      if (!r) return;

      const reqText = formatRequirements(r.requirements || null);
      const isBoss  = r.isBoss;
      const suggested = r.requirements ? smartSquadForReqs(r.requirements, 5) : [];
      const rewardKey  = r.raidNodeRewards || null;
      const rewardData = rewardKey && item.nodeRewards && item.nodeRewards[rewardKey] ? item.nodeRewards[rewardKey] : null;
      const rewards    = rewardData ? extractRewardItems(rewardData, 4) : [];

      const iconHtml = r.icon
        ? `<img src="${r.icon}" class="rmap-detail-icon img-hide-on-error" alt="">`
        : `<div class="rmap-detail-icon rmap-detail-icon--sym">${isBoss ? "★" : "α"}</div>`;

      const pipsHtml = suggested.length
        ? `<div class="rmap-detail-section-label">SQUAD SUGGESTION</div>
           <div class="rmap-detail-pips">${suggested.map(c => {
             const url = getPortraitUrl(c);
             const color = ROLE_COLORS[c.role] || "#00c8ff";
             return `<div class="rmap-detail-pip" style="border-color:${color}" title="${esc(c.name)}">
               <img src="${url}" class="img-hide-on-error" alt="${esc(c.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">
             </div>`;
           }).join("")}</div>`
        : "";

      const rewardHtml = rewards.length
        ? `<div class="rmap-detail-section-label">REWARDS</div>
           <div class="act-rewards-row">${rewards.map(rw => {
             const iconStyle = rw.icon ? `background-image:url('${rw.icon}')` : "";
             return `<div class="act-reward-pill">
               <div class="act-reward-icon${rw.icon ? "" : " act-reward-icon--text"}" style="${iconStyle}">${rw.icon ? "" : esc((rw.name||"?").slice(0,2))}</div>
               <span class="act-reward-name">${esc(rw.name||rw.id||"")}</span>
               ${rw.quantity > 1 ? `<span style="font-size:10px;color:var(--text-dim)">×${rw.quantity}</span>` : ""}
             </div>`;
           }).join("")}</div>`
        : "";

      const connections = [r.roomNW && "NW", r.roomNE && "NE", r.roomSE && "SE", r.roomSW && "SW"].filter(Boolean);

      panel.innerHTML = `
        <div class="rmap-detail-row">
          ${iconHtml}
          <div class="rmap-detail-text">
            <div class="rmap-detail-name">${esc(r.name || roomId)}${isBoss ? ` <span class="rmap-boss-badge">BOSS</span>` : ""}</div>
            ${r.subName ? `<div class="rmap-detail-sub">${esc(r.subName)}</div>` : ""}
            <div class="rmap-detail-stats">
              ${r.energyCost ? `<span class="rmap-detail-stat">⚡ <b>${r.energyCost}</b> energy</span>` : ""}
              ${connections.length ? `<span class="rmap-detail-stat">↔ ${connections.join(" / ")}</span>` : ""}
            </div>
            ${reqText ? `<div class="rmap-detail-req">${esc(reqText)}</div>` : ""}
          </div>
        </div>
        ${r.details ? `<div class="rmap-detail-desc">${esc(r.details)}</div>` : ""}
        ${pipsHtml}${rewardHtml}
      `;
    }

    function wireRmapClicks(item) {
      const grid = document.querySelector("#act-panel-maps .rmap-grid");
      if (!grid) return;
      grid.querySelectorAll(".rmap-cell--active").forEach(cell => {
        cell.addEventListener("click", function() {
          grid.querySelectorAll(".rmap-cell--active").forEach(c => c.classList.remove("rmap-cell--selected"));
          this.classList.add("rmap-cell--selected");
          showRmapNodeDetail(this.dataset.roomId, item);
        });
      });
    }

    const hasMaps     = raids_data.length || dds_data.length || pyps_data.length || towers_data.length;
    const firstMapItem = raids_data[0] || dds_data[0] || pyps_data[0] || towers_data[0] || null;
    const firstMapId   = firstMapItem ? firstMapItem.id : "";
    const dropdownOpts = [
      buildOptgroup(raids_data,    "RAIDS"),
      buildOptgroup(dds_data,      "DARK DIMENSIONS"),
      buildOptgroup(pyps_data,     "PICK YOUR POISON"),
      buildOptgroup(towers_data,   "SURVIVAL TOWERS"),
    ].filter(Boolean).join("");

    if (hasMaps) {
      elMaps.innerHTML = `<div class="rmap-container">
        <div class="rmap-header"><span class="rmap-header-title">MAP INFO</span></div>
        <div class="rmap-controls">
          <select id="rmap-select" class="rmap-select">
            <option value="">— Select a map —</option>
            ${dropdownOpts}
          </select>
        </div>
        <div id="rmap-display" class="rmap-display">${firstMapId ? renderRaidMap(firstMapId) : '<div class="rmap-empty">Select a map above.</div>'}</div>
      </div>`;
      const rmapSel = document.getElementById("rmap-select");
      if (rmapSel) {
        if (firstMapId) { rmapSel.value = firstMapId; wireRmapClicks(firstMapItem); }
        rmapSel.addEventListener("change", function() {
          const d = document.getElementById("rmap-display");
          if (!d) return;
          if (!this.value) { d.innerHTML = '<div class="rmap-empty">Select a map above.</div>'; return; }
          const selEntry = mapItemsById[this.value];
          d.innerHTML = renderRaidMap(this.value);
          if (selEntry) wireRmapClicks(selEntry.item);
        });
      }
    } else {
      elMaps.innerHTML = `<div class="act-empty-full">No raid or event maps available.</div>`;
    }

    // ── Tab 4: Legendary Events ───────────────────────────────────────────────
    // Alliance War and Recently Ended: tab TBD

    // ── Legendary event detection & card builder ─────────────────────────────
    const LEGENDARY_EVENT_NAMES = new Set([
      "the infinity watch","unite the kingdoms","surgical s.t.r.i.k.e.","surgical strike",
      "black & ebony","now you see me","i am iron man","like, totally jubilee",
      "asteroid m","chasing fury","red death","phoenix rising",
      "princess and the symbiote","space ace"
    ]);

    function isLegendaryUnlockEvent(ep) {
      const name = (ep.name || "").toLowerCase().trim();
      if (LEGENDARY_EVENT_NAMES.has(name)) return true;
      const nd = campaignNodes[ep.id];
      // Data-driven fallback: legendary events have eligibleCharacters without standard chapters
      if (nd && nd.eligibleCharacters && !nd.chapters) return true;
      return false;
    }

    function legendaryEventCard(ep) {
      const nd = campaignNodes[ep.id];
      const typeColor = "#d4a50d";

      // Art: use target character portrait if available
      const targetChar = nd && (nd.character || nd.targetCharacter) || null;
      const art = (targetChar && (targetChar.icon || targetChar.portrait)) || null;

      // Requirements from nodeData or top-level episode
      const reqs = (nd && nd.requirements) || null;
      const reqText = formatRequirements(reqs);

      // Count roster chars that satisfy requirements
      const allMatched = reqs ? smartSquadForReqs(reqs, roster.length) : [];
      const qualCount  = allMatched.filter(c => c._score > 0).length;
      const topFive    = allMatched.slice(0, 5);

      const details = (ep.details || (nd && nd.details) || "").replace(/\n/g, " ");
      const progressColor = qualCount >= 5 ? "#22c55e" : qualCount >= 3 ? "#f59e0b" : "#ef4444";

      const typeBadgeHtml = `<div class="act-type-badge" style="background:${typeColor}22;color:${typeColor};border-color:${typeColor}44">Legendary</div>`;
      const qualBadge = reqs
        ? `<span style="font-family:var(--font-mono);font-size:10px;color:${progressColor}">${qualCount} chars qualify</span>`
        : "";

      const cardHtml = actCard({
        id: "leg-" + ep.id,
        typeLabel: "Legendary",
        typeColor,
        name: ep.name || "Legendary Event",
        subName: esc(ep.subName || ""),
        art,
        timeLeft: null, noTimer: true,
        reqText: reqText || null,
        rewards: [],
        suggestedChars: topFive,
        details: details ? details.slice(0, 200) + (details.length > 200 ? "…" : "") : null
      });
      return cardHtml
        .replace(`data-act-id="leg-${ep.id}"`,
          `data-act-id="leg-${ep.id}" data-camp-group="${ep.id}" style="cursor:pointer"`)
        .replace(typeBadgeHtml, typeBadgeHtml + qualBadge);
    }

    // ── Challenges & Events tab ───────────────────────────────────────────────
    const challengeCards = episodicTypeCards("challenge");
    if (challengeCards.length) challengeSections.push(section("Challenges", "★", challengeCards, ""));

    const flashCards = episodicTypeCards("flashEvent");
    if (flashCards.length) challengeSections.push(section("Flash Events", "⚡", flashCards, ""));

    // Split unlockEvent into legendary vs regular
    const allUnlockEps = episodics.unlockEvent || [];
    const regularUnlocks  = allUnlockEps.filter(ep => !isLegendaryUnlockEvent(ep));
    const legendaryUnlocks = allUnlockEps.filter(ep =>  isLegendaryUnlockEvent(ep));

    const regularUnlockCards = groupCampaigns(regularUnlocks).map(grp => campaignGroupCard(grp));
    if (regularUnlockCards.length) challengeSections.push(section("Unlock Events", "🔓", regularUnlockCards, ""));

    const otherEpCards = episodicTypeCards("otherEvent");
    if (otherEpCards.length) challengeSections.push(section("Other Events", "◆", otherEpCards, ""));

    // ── Legendary Events tab ─────────────────────────────────────────────────
    const legendaryCards = legendaryUnlocks.map(ep => legendaryEventCard(ep));
    if (legendaryCards.length) legendarySections.push(section("Legendary Events", "★", legendaryCards, "No legendary events found."));

    // ── Populate panels ───────────────────────────────────────────────────────
    elChallenges.innerHTML = challengeSections.join("") || `<div class="act-empty-full">No challenges or events available.</div>`;
    elMissions.innerHTML   = missionSections.join("")   || `<div class="act-empty-full">No campaigns available.</div>`;
    elLegendary.innerHTML  = legendarySections.join("") || `<div class="act-empty-full">No legendary events available.</div>`;

    // Sub-tab button wiring is done once at init (see bottom of script)

    // ── Wire click handlers on all four panels ────────────────────────────────
    [elChallenges, elMissions, elMaps, elLegendary].forEach(panel => {
      panel.querySelectorAll("[data-camp-group]").forEach(card => {
        card.addEventListener("click", function() {
          openCampaignDetailPanel(this.dataset.campGroup);
        });
      });
      panel.querySelectorAll("[data-popup-art],[data-popup-details]").forEach(card => {
        if (card.dataset.campGroup || card.dataset.raidType) return;
        card.addEventListener("click", function() {
          const art      = this.dataset.popupArt;
          const details  = this.dataset.popupDetails;
          const title    = this.dataset.popupTitle || "";
          const sub      = this.dataset.popupSub   || "";
          const type     = this.dataset.popupType  || "";
          const color    = this.dataset.popupColor || "#6b7280";
          if (!art && !details) return;
          const overlay  = document.getElementById("event-popup-panel");
          const artEl    = document.getElementById("event-popup-art");
          const detailEl = document.getElementById("event-popup-details");
          const typeEl   = document.getElementById("event-popup-type");
          document.getElementById("event-popup-title").textContent = title;
          document.getElementById("event-popup-sub").textContent   = sub;
          typeEl.textContent = type;
          typeEl.style.color = color;
          typeEl.style.borderColor = color + "55";
          typeEl.style.background  = color + "15";
          if (art) { artEl.src = art; artEl.style.display = "block"; }
          else { artEl.style.display = "none"; artEl.src = ""; }
          if (details) { detailEl.textContent = details; detailEl.style.display = "block"; }
          else { detailEl.style.display = "none"; }
          overlay.classList.remove("hidden");
          overlay.style.display = "flex";
        });
      });
    });
  }

  // ── Inventory category constants (keyed by real API itemType values) ─────
  const GEAR_TIER_COLORS = {
    1:"#94a3b8",2:"#94a3b8",3:"#94a3b8",
    4:"#22c55e",5:"#22c55e",6:"#22c55e",
    7:"#3b82f6",8:"#3b82f6",9:"#3b82f6",
    10:"#a855f7",11:"#a855f7",12:"#a855f7",
    13:"#f59e0b",
  };
  const CAT_ORDER = ["ABILITY_MATERIAL", "GEAR", "ISOITEM", "SHARD", "RS", "COSTUME", "CONSUMABLE", "other"];
  const CAT_STYLES = {
    ABILITY_MATERIAL: { label: "Ability Mats", color: "#f0b429" },
    GEAR:             { label: "Gear Pieces",  color: "#f59e0b" },
    ISOITEM:          { label: "ISO-8",        color: "#3b82f6" },
    SHARD:            { label: "Shards",       color: "#00d4ff" },
    RS:               { label: "Red Stars / Diamonds", color: "#ef4444" },
    COSTUME:          { label: "Costumes",     color: "#a855f7" },
    CONSUMABLE:       { label: "Consumables",  color: "#22c55e" },
    other:            { label: "Other",        color: "#94a3b8" },
  };

  function getGearMaterialType(name, id) {
    const n = (name || "").toLowerCase();
    const u = (id   || "").toUpperCase();
    if (n.includes("mini") || u.includes("MINI"))            return "Mini-Unique";
    if (n.includes("unique") || u.includes("_UNIQUE"))       return "Unique";
    if (n.includes("catalyst") || u.includes("CATALYST"))    return "Catalyst";
    if (n.includes(" bit") || n.endsWith("bit") || u.includes("_BIT")) return "Bit";
    if (n.includes("piece") || n.includes(" part") || u.includes("_PIECE") || u.includes("_PART")) return "Piece";
    return "";
  }

  function getGearOrigin(name, id) {
    const n = (name || "").toLowerCase();
    const u = (id   || "").toUpperCase();
    if (n.includes("bio")    || u.includes("BIO"))    return "Biological";
    if (n.includes("mutant") || u.includes("MUTANT")) return "Mutant";
    if (n.includes("mystic") || u.includes("MYSTIC")) return "Mystic";
    if (n.includes("skill")  || u.includes("SKILL"))  return "Skill";
    if (n.includes("tech")   || u.includes("TECH"))   return "Technological";
    return "";
  }

  function categoriseById(id) {
    const stored = itemMetadata[id] && itemMetadata[id].type;
    if (stored) return stored;
    // Fallback for items the API doesn't assign to one of its 7 typed categories
    // (e.g. diamond stars, profile frames) — route by name keywords
    const nm = ((itemMetadata[id] || {}).name || "").toLowerCase();
    const u  = id.toUpperCase();
    if (nm.includes("diamond") || u.includes("DIAMOND"))                 return "RS";
    if (nm.includes("frame")   || u.includes("FRAME"))                   return "FRAME";
    if (nm.includes("teal")    || u.includes("TEAL"))                    return "RS";
    if (nm.includes("shard")   || u.includes("SHARD"))                   return "SHARD";
    if (nm.includes("gear")    || u.includes("GEAR_"))                   return "GEAR";
    if (nm.includes("iso")     || u.includes("ISO"))                     return "ISOITEM";
    if (nm.includes("ability") || u.includes("ABILITY"))                 return "ABILITY_MATERIAL";
    return "other";
  }

  // ── Inventory ─────────────────────────────────────────────────────────────
  function renderInventory() {
    const root = document.getElementById("inventory-content");
    if (!root) return;

    const invMap = getInventoryMap();
    const allIds = Object.keys(invMap).filter(id => invMap[id] > 0);

    if (!allIds.length) {
      root.innerHTML = '<p class="inv-empty">No inventory data loaded.</p>';
      return;
    }

    // Bucket items by category
    const buckets = {};
    CAT_ORDER.forEach(c => { buckets[c] = []; });
    allIds.forEach(id => {
      const cat = categoriseById(id);
      if (!buckets[cat]) return; // e.g. FRAME — shown in Commander tab, not inventory
      buckets[cat].push({ id, qty: invMap[id] });
    });

    // Fall back to first non-empty category if current is empty
    if (!buckets[_invCat] || !buckets[_invCat].length) {
      const first = CAT_ORDER.find(c => buckets[c].length > 0);
      if (first) _invCat = first;
    }

    // ── Build toolbar HTML ────────────────────────────────────────────────
    root.innerHTML = `
      <div class="inv-toolbar">
        <div class="inv-search-wrap">
          <span class="inv-search-icon">⌕</span>
          <input class="inv-search" type="text" id="inv-search-input" placeholder="Search…" />
        </div>
        <select class="inv-filter-select" id="inv-iso-filter" style="display:none">
          <option value="">All classes</option>
          <option>Striker</option><option>Skirmisher</option><option>Raider</option>
          <option>Healer</option><option>Fortifier</option>
        </select>
        <select class="inv-filter-select" id="inv-gear-char" style="display:none">
          <option value="">Select Character</option>
        </select>
        <select class="inv-filter-select" id="inv-gear-mat" style="display:none">
          <option value="">Select Material</option>
          <option>Unique</option>
          <option>Mini-Unique</option>
          <option>Catalyst</option>
          <option>Bit</option>
          <option>Piece</option>
        </select>
        <select class="inv-filter-select" id="inv-gear-origin" style="display:none">
          <option value="">Select Origin</option>
          <option>Biological</option>
          <option>Mutant</option>
          <option>Mystic</option>
          <option>Skill</option>
          <option>Technological</option>
        </select>
        <select class="inv-filter-select" id="inv-gear-sort" style="display:none">
          <option value="name-asc">Name A→Z</option>
          <option value="name-desc">Name Z→A</option>
          <option value="qty-asc">Count ↑</option>
          <option value="qty-desc">Count ↓</option>
        </select>
      </div>
      <div class="inv-tabs" id="inv-cat-tabs"></div>
      <div id="inv-grid-area"></div>`;

    const searchInput  = root.querySelector("#inv-search-input");
    const isoFilter    = root.querySelector("#inv-iso-filter");
    const gearCharEl   = root.querySelector("#inv-gear-char");
    const gearMatEl    = root.querySelector("#inv-gear-mat");
    const gearOriginEl = root.querySelector("#inv-gear-origin");
    const gearSortEl   = root.querySelector("#inv-gear-sort");
    const tabBar       = root.querySelector("#inv-cat-tabs");
    const gridArea     = root.querySelector("#inv-grid-area");

    // Populate character dropdown from roster
    const rosterChars = roster.map(c => ({ name: c.name, id: c.portrait || c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    gearCharEl.innerHTML = '<option value="">Select Character</option>' +
      rosterChars.map(c => `<option value="${c.name}"${c.name === _gearChar ? " selected" : ""}>${c.name}</option>`).join("");

    // Restore last filter state
    searchInput.value  = _invSearch;
    isoFilter.value    = _invIso;
    gearMatEl.value    = _gearMat;
    gearOriginEl.value = _gearOrigin;
    gearSortEl.value   = _gearSort;

    // ── Build category tabs ───────────────────────────────────────────────
    CAT_ORDER.forEach(cat => {
      if (!buckets[cat].length) return;
      const s = CAT_STYLES[cat];
      const lowCount = buckets[cat].filter(i => i.qty < 5).length;
      const btn = document.createElement("button");
      btn.className = "inv-tab" + (cat === _invCat ? " inv-tab--active" : "");
      if (cat === _invCat) { btn.style.borderColor = s.color; btn.style.color = s.color; }
      btn.dataset.cat = cat;
      btn.innerHTML =
        `<span class="inv-tab-dot" style="background:${s.color}"></span>` +
        s.label +
        `<span class="inv-tab-count">${buckets[cat].length}</span>` +
        (lowCount ? `<span class="inv-tab-low">⚠${lowCount}</span>` : "");
      tabBar.appendChild(btn);
    });

    // Show/hide sub-filters for current category
    function syncSubFilters() {
      const isGear = _invCat === "GEAR";
      isoFilter.style.display    = _invCat === "ISOITEM" ? "" : "none";
      gearCharEl.style.display   = isGear ? "" : "none";
      gearMatEl.style.display    = isGear ? "" : "none";
      gearOriginEl.style.display = isGear ? "" : "none";
      gearSortEl.style.display   = isGear ? "" : "none";
    }
    syncSubFilters();

    // ── Render the item grid ──────────────────────────────────────────────
    function renderGrid() {
      let items = [...(buckets[_invCat] || [])];
      const q = _invSearch.trim().toLowerCase();
      if (q) {
        items = items.filter(({ id }) => {
          const nm = ((itemMetadata[id] || {}).name || id).toLowerCase();
          return nm.includes(q) || id.toLowerCase().includes(q);
        });
      }
      if (_invCat === "ISOITEM" && _invIso) {
        const cls = _invIso.toLowerCase();
        items = items.filter(({ id }) =>
          ((itemMetadata[id] || {}).name || id).toLowerCase().includes(cls));
      }
      if (!(_invCat === "GEAR")) {
        items.sort((a, b) => {
          const na = (itemMetadata[a.id] || {}).name || a.id;
          const nb = (itemMetadata[b.id] || {}).name || b.id;
          return na.localeCompare(nb);
        });
      }

      if (!items.length) {
        gridArea.innerHTML = '<div class="inv-empty">No items found.</div>';
        return;
      }

      const catColor = CAT_STYLES[_invCat].color;

      function buildItemGrid(groupItems) {
        const grid = document.createElement("div");
        grid.className = "inv-msf-grid";
        groupItems.forEach(({ id, qty }) => {
          const meta  = itemMetadata[id] || {};
          // esc() once here — every use below is innerHTML interpolation
          const name  = esc(meta.name || id.replace(/^[A-Z0-9]+_/g, "").replace(/_/g, " ")
                          .replace(/\b\w/g, c => c.toUpperCase()));
          const icon  = meta.icon  || null;
          const locs  = meta.locations || [];
          const desc  = esc(meta.description || "");
          const isLow = qty < 5;

          const tile = document.createElement("div");
          tile.className = "inv-tile" + (isLow ? " inv-tile--low" : "");
          tile.dataset.itemId = id;

          const iconHtml = icon
            ? `<img class="inv-popup-icon" src="${icon}" alt="">`
            : `<div class="inv-popup-icon-fb" style="color:${catColor}">${name.charAt(0)}</div>`;
          const descHtml = desc
            ? `<div class="inv-popup-desc">${desc}</div>` : "";
          const locsHtml = locs.length
            ? `<div class="inv-popup-label">Farming Locations</div>
               <div class="inv-popup-locs">${
                 locs.slice(0, 6).map(l =>
                   `<div class="inv-popup-loc">
                      <span class="inv-popup-dot" style="background:${catColor}"></span>
                      <span>${esc(l.name)}</span>
                    </div>`
                 ).join("")
               }</div>` : "";

          tile.innerHTML =
            (isLow ? `<span class="inv-tile-low-flag">⚠</span>` : "") +
            `<div class="inv-tile-name">${name}</div>
             <div class="inv-tile-frame">
               ${icon
                 ? `<img class="inv-tile-img img-hide-on-error" src="${icon}" alt="${name.replace(/"/g, "&quot;")}">`
                 : `<div class="inv-tile-img-fb" style="color:${catColor}">${name.charAt(0)}</div>`}
             </div>
             <div class="inv-tile-own">
               <span class="inv-tile-qty${isLow ? " inv-tile-qty--low" : ""}">${qty.toLocaleString()}</span>
             </div>
             <div class="inv-popup" style="border-color:${catColor}">
               <div class="inv-popup-header">
                 ${iconHtml}
                 <div>
                   <div class="inv-popup-name" style="color:${catColor}">${name}</div>
                   <div class="inv-popup-qty${isLow ? " inv-popup-qty--low" : ""}">×${qty.toLocaleString()}</div>
                 </div>
               </div>
               ${descHtml}${locsHtml}
             </div>`;

          grid.appendChild(tile);
        });
        return grid;
      }

      if (_invCat === "GEAR") {
        function getGearTierNum(id) {
          const meta = itemMetadata[id];
          if (meta && meta.gearTier) return meta.gearTier;
          const m = id.match(/_T(\d+)(?:_|$)/);
          return m ? parseInt(m[1], 10) : 0;
        }

        // Apply filters
        let gearItems = items;
        if (_gearChar) {
          const charLower = _gearChar.toLowerCase();
          gearItems = gearItems.filter(({ id }) =>
            ((itemMetadata[id] || {}).name || "").toLowerCase().includes(charLower));
        }
        if (_gearMat) {
          gearItems = gearItems.filter(({ id }) => {
            const meta = itemMetadata[id] || {};
            return getGearMaterialType(meta.name, id) === _gearMat;
          });
        }
        if (_gearOrigin) {
          gearItems = gearItems.filter(({ id }) => {
            const meta = itemMetadata[id] || {};
            return getGearOrigin(meta.name, id) === _gearOrigin;
          });
        }

        // Sort comparator
        const [sortField, sortDir] = _gearSort.split("-");
        function gearCmp(a, b) {
          let diff;
          if (sortField === "qty") {
            diff = a.qty - b.qty;
          } else {
            const na = (itemMetadata[a.id] || {}).name || a.id;
            const nb = (itemMetadata[b.id] || {}).name || b.id;
            diff = na.localeCompare(nb);
          }
          return sortDir === "desc" ? -diff : diff;
        }

        // Bucket by tier
        const gearTierBuckets = {};
        const gearMats = [];
        gearItems.forEach(item => {
          const t = getGearTierNum(item.id);
          if (t > 0) {
            (gearTierBuckets[t] = gearTierBuckets[t] || []).push(item);
          } else {
            gearMats.push(item);
          }
        });

        // Sort within each bucket
        Object.values(gearTierBuckets).forEach(grp => grp.sort(gearCmp));
        gearMats.sort(gearCmp);

        const tierNums = Object.keys(gearTierBuckets).map(Number);
        const maxTier  = tierNums.length ? Math.max(...tierNums) : 0;

        gridArea.innerHTML = "";
        for (let t = maxTier; t >= 1; t--) {
          const grp = gearTierBuckets[t];
          if (!grp || !grp.length) continue;
          const tierColor = GEAR_TIER_COLORS[t] || "#a855f7";
          const hdr = document.createElement("div");
          hdr.className = "inv-gear-group-header";
          hdr.innerHTML =
            `<span class="inv-gear-tier-badge" style="background:${tierColor}20;color:${tierColor};border-color:${tierColor}40">T${t}</span>` +
            `<span>Tier ${t}</span>` +
            `<span class="inv-gear-tier-count">${grp.length} item${grp.length !== 1 ? "s" : ""}</span>`;
          gridArea.appendChild(hdr);
          gridArea.appendChild(buildItemGrid(grp));
        }
        if (gearMats.length) {
          const hdr = document.createElement("div");
          hdr.className = "inv-gear-group-header";
          hdr.innerHTML =
            `<span class="inv-gear-tier-badge" style="background:rgba(148,163,184,0.1);color:#94a3b8;border-color:rgba(148,163,184,0.25)">MAT</span>` +
            `<span>Materials</span>` +
            `<span class="inv-gear-tier-count">${gearMats.length} item${gearMats.length !== 1 ? "s" : ""}</span>`;
          gridArea.appendChild(hdr);
          gridArea.appendChild(buildItemGrid(gearMats));
        }
        if (!gridArea.children.length) {
          gridArea.innerHTML = '<div class="inv-empty">No items found.</div>';
        }
        return;
      }

      if (_invCat === "RS") {
        const starBuckets   = {};
        const diamondBuckets = {};
        const rsOther = [];
        items.forEach(item => {
          const meta = itemMetadata[item.id] || {};
          if (meta.rsDiamondTier) {
            (diamondBuckets[meta.rsDiamondTier] = diamondBuckets[meta.rsDiamondTier] || []).push(item);
          } else if (meta.rsTier) {
            (starBuckets[meta.rsTier] = starBuckets[meta.rsTier] || []).push(item);
          } else {
            rsOther.push(item);
          }
        });

        gridArea.innerHTML = "";
        for (let t = 1; t <= 7; t++) {
          const grp = starBuckets[t];
          if (!grp || !grp.length) continue;
          const hdr = document.createElement("div");
          hdr.className = "inv-rs-group-header";
          hdr.innerHTML = `<span class="inv-rs-stars" style="color:#ef4444">${"★".repeat(t)}</span><span>${t}★ Red Stars</span>`;
          gridArea.appendChild(hdr);
          gridArea.appendChild(buildItemGrid(grp));
        }
        for (let t = 1; t <= 8; t++) {
          const grp = diamondBuckets[t];
          if (!grp || !grp.length) continue;
          const hdr = document.createElement("div");
          hdr.className = "inv-rs-group-header";
          hdr.innerHTML = `<span class="inv-rs-diamonds" style="color:#60a5fa">${"◆".repeat(t)}</span><span>${t} Diamond${t > 1 ? "s" : ""}</span>`;
          gridArea.appendChild(hdr);
          gridArea.appendChild(buildItemGrid(grp));
        }
        if (rsOther.length) {
          const hdr = document.createElement("div");
          hdr.className = "inv-rs-group-header";
          hdr.textContent = "Other";
          gridArea.appendChild(hdr);
          gridArea.appendChild(buildItemGrid(rsOther));
        }
        if (!gridArea.children.length) {
          gridArea.innerHTML = '<div class="inv-empty">No items found.</div>';
        }
        return;
      }

      gridArea.innerHTML = "";
      gridArea.appendChild(buildItemGrid(items));
    }

    renderGrid();

    // ── Event listeners (all CSP-safe, no inline handlers) ───────────────
    searchInput.addEventListener("input", () => {
      _invSearch = searchInput.value;
      renderGrid();
    });

    isoFilter.addEventListener("change", () => {
      _invIso = isoFilter.value;
      renderGrid();
    });

    gearCharEl.addEventListener("change", () => {
      _gearChar = gearCharEl.value; renderGrid();
    });
    gearMatEl.addEventListener("change", () => {
      _gearMat = gearMatEl.value; renderGrid();
    });
    gearOriginEl.addEventListener("change", () => {
      _gearOrigin = gearOriginEl.value; renderGrid();
    });
    gearSortEl.addEventListener("change", () => {
      _gearSort = gearSortEl.value; renderGrid();
    });

    tabBar.addEventListener("click", e => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      _invCat = btn.dataset.cat;
      // Reset sub-filters when changing category
      _invIso = ""; isoFilter.value = "";
      _gearChar = ""; _gearMat = ""; _gearOrigin = "";
      // Update tab active state inline
      tabBar.querySelectorAll(".inv-tab").forEach(b => {
        const active = b.dataset.cat === _invCat;
        b.classList.toggle("inv-tab--active", active);
        const s = CAT_STYLES[_invCat];
        b.style.borderColor = active ? s.color : "";
        b.style.color       = active ? s.color : "";
      });
      syncSubFilters();
      renderGrid();
    });

    // Tile click → toggle popup
    gridArea.addEventListener("click", e => {
      const tile = e.target.closest(".inv-tile");
      if (!tile) return;
      const wasOpen = tile.classList.contains("inv-tile--open");
      root.querySelectorAll(".inv-tile--open").forEach(t => t.classList.remove("inv-tile--open"));
      if (!wasOpen) tile.classList.add("inv-tile--open");
      e.stopPropagation();
    });

    // Document-level handler closes all popups on outside click
    if (_invCloseHandler) document.removeEventListener("click", _invCloseHandler);
    _invCloseHandler = e => {
      const inv = document.getElementById("inventory-content");
      if (inv && !inv.contains(e.target)) {
        inv.querySelectorAll(".inv-tile--open").forEach(t => t.classList.remove("inv-tile--open"));
      }
    };
    document.addEventListener("click", _invCloseHandler);
  }

  // ── Campaign detail panel ───────────────────────────────────────────────────
  function openCampaignDetailPanel(campId) {
    const nodeData = campaignNodes[campId];
    if (!nodeData) return;
    const campMeta = campaigns.find(c => c.id === campId) || {};
    const panel    = document.getElementById("camp-detail-panel");
    const body     = document.getElementById("camp-detail-body");
    if (!panel || !body) return;

    // Campaign-level requirements
    const topReqs = nodeData.requirements || null;
    const diffLabels = {"A":"Normal","B":"Hard","C":"Heroic"};
    const diffColors = {"A":"#94a3b8","B":"#f59e0b","C":"#ef4444"};

    // Detail panel requirement formatter — full CharacterFilter schema
    function reqGoldHtml(reqs) {
      if (!reqs) return "";
      const parts = [];
      const trStr = t => typeof t === "string" ? t : (t && (t.name || t.id) || "");

      (reqs.anyCharacterFilters || []).forEach(f => {
        const fp = [];
        if (f.allTraits  && f.allTraits.length)   fp.push(f.allTraits.map(trStr).filter(Boolean).join(" + "));
        if (f.anyTraits  && f.anyTraits.length)   fp.push("any of: " + f.anyTraits.map(trStr).filter(Boolean).join("/"));
        if (f.gearTier)    fp.push("Gear Tier " + f.gearTier + "+");
        if (f.level)       fp.push("Lvl " + f.level + "+");
        if (f.activeYellow) fp.push(f.activeYellow + "+ Yellow Stars");
        if (f.activeRed)   fp.push(f.activeRed + "+ Red Stars");
        if (f.iso8Class)   fp.push("ISO-8 " + f.iso8Class + (f.iso8ClassLevel ? " Lvl " + f.iso8ClassLevel : ""));
        if (f.anyCharacters && f.anyCharacters.length)
          fp.push("one of: " + f.anyCharacters.map(id=>id.replace(/([A-Z])/g," $1").trim()).join(", "));
        if (fp.length)
          parts.push("<span class='camp-req-trait'>" + esc(fp.join(" · ")) + "</span>");
      });

      if (reqs.specificCharacters && reqs.specificCharacters.length)
        parts.unshift("Requires: <span class='camp-req-trait'>" +
          esc(reqs.specificCharacters.map(id=>id.replace(/([A-Z])/g," $1").trim()).join(", ")) + "</span>");
      if (reqs.minCharacters && reqs.minCharacters > 1)
        parts.push("<span class='camp-req-trait'>" + reqs.minCharacters + " characters minimum</span>");

      return parts.join(" · ");
    }

    function rewardChips(rewardObj) {
      const items = extractRewardItems(rewardObj, 8);
      if (!items.length) return "";
      return '<div class="camp-reward-row">' + items.map(r => {
        const icon = r.icon || (itemMetadata[r.id] && itemMetadata[r.id].icon);
        const name = r.name || (itemMetadata[r.id] && itemMetadata[r.id].name) || r.id;
        return `<div class="camp-reward-chip" title="${esc(name)}">
          ${icon ? `<div style="width:22px;height:22px;background:url('${icon}') center/contain no-repeat;flex-shrink:0"></div>` : ""}
          <span class="camp-reward-name">${esc(name)}${r.qty>1?" ×"+r.qty:""}</span>
        </div>`;
      }).join("") + "</div>";
    }

    function squadRow(reqs) {
      const chars = smartSquadForReqs(reqs, 5);
      const hasReqs = reqs && (reqs.anyCharacterFilters||[]).some(f=>(f.allTraits||[]).length>0);
      if (!hasReqs || !chars.length) return "";
      return '<div class="camp-modal-label">Your Best Match</div><div class="camp-modal-squad-row">' +
        chars.map(c => {
          const url = getPortraitUrl(c);
          const rc  = ROLE_COLORS[c.role] || "#00c8ff";
          const ok  = c._meets !== false; // does the character satisfy at least one filter?
          const fb  = makeFallbackAvatar(c.name, c.role).replace(/"/g,"'").replace(/\n/g,"");
          return `<div class="camp-squad-char">
            <div class="camp-squad-portrait" style="border-color:${ok?rc:"#dc2626"}">
              <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:50%" class="img-with-fallback" />
              <div style="display:none;width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center">${fb}</div>
              <div class="camp-squad-badge" style="background:${ok?"#16a34a":"#dc2626"}">${ok?"✓":"✗"}</div>
            </div>
            <div class="camp-squad-name">${esc(c.name.split(" ")[0])}</div>
            <div class="camp-squad-power">${Math.round(c.power/1000)}k · ${c.tier}</div>
          </div>`;
        }).join("") + "</div>";
    }

    // Build header
    const topReqHtml = reqGoldHtml(topReqs);
    const topSquadHtml = squadRow(topReqs);

    let html = `
      <div class="camp-detail-campname">${
        esc((() => {
          const gn = campMeta.group && campMeta.group.name;
          if (gn) return gn.toLowerCase().replace(/\w/g, c => c.toUpperCase());
          const DIFFS = new Set(["hard","heroic","normal","epic","apocalyptic","x-treme","xtreme"]);
          const raw = campMeta.name || "";
          return DIFFS.has(raw.toLowerCase().trim())
            ? campId.replace(/_HARD$|_HEROIC$|_EPIC$|_XTREME$|_APOCALYPTIC$/,"").replace(/_/g," ").toLowerCase().replace(/\w/g,c=>c.toUpperCase())
            : (raw || campId.replace(/_/g," "));
        })())
      }</div>
      ${campMeta.details ? `<div class="camp-detail-sub">${esc(campMeta.details.replace(/\n/g," "))}</div>` : ""}
      ${topReqHtml ? `<div class="camp-detail-reqs"><div class="camp-req-label">Campaign Requirements</div><div class="camp-req-gold">${topReqHtml}</div></div>` : ""}
      ${topSquadHtml ? `<div class="camp-detail-squad-wrap">${topSquadHtml}</div>` : ""}
      <div class="camp-chapter-tabs" id="camp-ch-tabs"></div>
      <div id="camp-ch-content"></div>
    `;
    body.innerHTML = html;

    // Build chapter tab bar
    const chapters = Object.entries(nodeData.chapters || {}).sort((a,b)=>parseInt(a[0])-parseInt(b[0]));
    const tabBar = document.getElementById("camp-ch-tabs");
    const chContent = document.getElementById("camp-ch-content");

    if (!chapters.length) {
      chContent.innerHTML = '<p style="color:var(--text-mid);padding:1rem;font-family:var(--font-mono);font-size:12px">No chapter data available.</p>';
    } else {
      tabBar.innerHTML = chapters.map(([chNum, ch]) => {
        // Tiers are numbered NodeInfo — tier IS the mission, no sub-nodes
        const firstTier = ch.tiers ? Object.values(ch.tiers)[0] : null;
        const chName = (firstTier && firstTier.name) ? firstTier.name : ("Ch " + chNum);
        return `<button class="camp-ch-tab" data-ch="${chNum}" title="${esc(chName)}">${chNum}</button>`;
      }).join("");

      async function renderChapter(chNum) {
        tabBar.querySelectorAll(".camp-ch-tab").forEach(t =>
          t.classList.toggle("camp-ch-tab--active", t.dataset.ch === chNum));

        const ch = nodeData.chapters[chNum] || nodeData.chapters[parseInt(chNum)] || null;
        if (!ch) {
          chContent.innerHTML = `<p style="color:var(--text-mid);padding:1rem;font-size:13px;font-family:var(--font-mono)">No data for chapter ${chNum}.</p>`;
          return;
        }

        chContent.innerHTML = `<div style="color:var(--text-mid);padding:1rem;font-family:var(--font-mono);font-size:13px">⚙ Loading tier data...</div>`;

        const chReqHtml = reqGoldHtml(ch.requirements);
        const numTiers  = ch.numTiers || Object.keys(ch.tiers || {}).length || 1;
        const episodicType = campMeta._episodicType || "campaign";
        const tierNums = Array.from({length: numTiers}, (_, i) => String(i + 1));
        const headers  = { "x-api-key": API_KEY, "Authorization": "Bearer " + sessionStorage.getItem("msf_token") };

        // Fetch all tiers in parallel
        const tierResults = await Promise.all(
          tierNums.map(t =>
            fetch(`${API_BASE}/game/v1/episodics/${episodicType}/${campId}/${chNum}/${t}?itemFormat=full`, { headers })
              .then(r => r.ok ? r.json() : null).catch(() => null)
          )
        );

        // For each tier, also fetch combat data if combatId exists
        const combatResults = await Promise.all(
          tierResults.map(res => {
            const combatId = res && res.data && res.data.combatId;
            if (!combatId) return Promise.resolve(null);
            return fetch(`${API_BASE}/game/v1/nodeCombats/${combatId}`, { headers })
              .then(r => r.ok ? r.json() : null).catch(() => null);
          })
        );

        const TIER_LABELS = {"1":"Normal","2":"Hard","3":"Heroic","4":"Legendary","5":"Mythic","6":"X-Treme","7":"Apocalyptic"};
        const TIER_COLORS = {"1":"#94a3b8","2":"#f59e0b","3":"#ef4444","4":"#8b5cf6","5":"#dc2626","6":"#06b6d4","7":"#ec4899"};

        // ── Reward renderer ─────────────────────────────────────────────────
        function renderItemQty(iq, label, accent) {
          if (!iq) return "";
          // Walk ItemQuantity tree collecting items
          const items = [];
          function walk(node, possible) {
            if (!node) return;
            if (node.item && typeof node.item === "object") {
              items.push({ item: node.item, qty: node.quantity || 1, possible });
            } else if (node.allOf) {
              node.allOf.forEach(n => walk(n, possible));
            } else if (node.oneOf) {
              node.oneOf.forEach(n => walk(n, true));
            } else if (node.chanceOf) {
              walk(node.chanceOf, true);
            }
          }
          walk(iq, false);
          if (!items.length) return "";

          // Group into guaranteed vs possible
          const guaranteed = items.filter(i => !i.possible);
          const possible   = items.filter(i => i.possible);

          function itemChip(i) {
            const icon = i.item.icon || (itemMetadata[i.item.id] && itemMetadata[i.item.id].icon);
            const name = esc(i.item.name || i.item.id);
            return `<div class="tier-reward-chip" title="${name} ×${i.qty}">
              ${icon ? `<div class="tier-reward-icon" style="background-image:url('${icon}')"></div>` : `<div class="tier-reward-icon tier-reward-icon--text">${name.slice(0,3)}</div>`}
              <div class="tier-reward-info">
                <div class="tier-reward-name">${name}</div>
                <div class="tier-reward-qty">×${i.qty}</div>
              </div>
            </div>`;
          }

          let html = `<div class="tier-reward-block">
            <div class="tier-reward-section-label" style="color:${accent||"var(--accent)"}">${label}</div>`;
          if (guaranteed.length) {
            html += `<div class="tier-reward-label">Guaranteed</div>
              <div class="tier-reward-row">${guaranteed.map(itemChip).join("")}</div>`;
          }
          if (possible.length) {
            html += `<div class="tier-reward-label" style="margin-top:8px">Possible</div>
              <div class="tier-reward-row">${possible.map(itemChip).join("")}</div>`;
          }
          html += `</div>`;
          return html;
        }

        // ── Enemy renderer ──────────────────────────────────────────────────
        function renderEnemies(combatData) {
          if (!combatData || !combatData.right || !combatData.right.waves) return "";
          const waves = combatData.right.waves;
          if (!waves.length) return "";

          return `<div class="tier-enemies">
            <div class="tier-section-title" style="color:#ef4444">⚔ Enemies</div>
            ${waves.map((wave, wi) => {
              const units = wave.units || [];
              return `<div class="tier-wave">
                <div class="tier-wave-label">
                  <span class="tier-wave-num">${wi+1}</span>
                  Wave ${wi+1}
                </div>
                <div class="tier-units-row">
                  ${units.map(unit => {
                    const charMeta = window._gameCharsMap && window._gameCharsMap[unit.id] || {};
                    const icon = charMeta.icon;
                    const name = unit.id.replace(/([A-Z])/g," $1").replace(/_/g," ").trim();
                    const tier = unit.gearTier ? "T"+unit.gearTier : "";
                    const pwr  = unit.power ? Math.round(unit.power/1000)+"k" : "";
                    return `<div class="tier-unit">
                      <div class="tier-unit-portrait">
                        ${icon ? `<img src="${icon}" class="img-with-fallback" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:50%"/>
                        <div style="display:none;width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);font-size:8px;color:var(--text-mid)">${name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>` : `<div style="width:100%;height:100%;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--text-mid)">${name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>`}
                      </div>
                      <div class="tier-unit-name">${name}</div>
                      <div class="tier-unit-stats">
                        ${unit.level ? `Lvl ${unit.level}` : ""}
                        ${pwr ? ` · ${pwr}` : ""}
                        ${tier ? ` · ${tier}` : ""}
                      </div>
                    </div>`;
                  }).join("")}
                </div>
              </div>`;
            }).join("")}
          </div>`;
        }

        // ── Build tier blocks ────────────────────────────────────────────────
        const tiersHtml = tierResults.map((res, i) => {
          const tierNum = tierNums[i];
          const tLabel  = TIER_LABELS[tierNum] || ("Tier " + tierNum);
          const tColor  = TIER_COLORS[tierNum] || "#6b7280";
          const node    = res && res.data;
          const combat  = combatResults[i] && combatResults[i].data;

          if (!node) return `<div class="camp-tier-block">
            <div class="camp-tier-header" style="color:${tColor}">
              <span class="camp-tier-dot" style="background:${tColor}"></span>
              <span>${tLabel}</span>
            </div>
            <div style="color:var(--text-mid);font-size:12px;padding:4px 0;font-family:var(--font-mono)">No data available.</div>
          </div>`;

          const nodeReqHtml = reqGoldHtml(node.requirements);
          const tierSquad   = squadRow(node.requirements || ch.requirements || topReqs);
          const nodeDesc    = node.details || "";
          const ftRewards   = renderItemQty(node.firstTimeRewards, "First Time Rewards", "#f59e0b");
          const regRewards  = renderItemQty(node.rewards, "Completion Rewards", "#22c55e");
          const enemies     = renderEnemies(combat);

          return `<div class="camp-tier-block">
            <div class="camp-tier-header" style="color:${tColor};border-bottom:1px solid ${tColor}30;padding-bottom:8px;margin-bottom:12px">
              <span class="camp-tier-dot" style="background:${tColor}"></span>
              <span style="font-family:var(--font-hud);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase">${tLabel}</span>
              ${node.name ? `<span style="font-family:var(--font-hud);font-size:11px;font-style:italic;color:var(--text-mid);margin-left:8px">${esc(node.name)}</span>` : ""}
              ${nodeReqHtml ? `<span class="camp-tier-req" style="margin-left:auto;font-size:11px">${nodeReqHtml}</span>` : ""}
            </div>
            ${nodeDesc ? `<div style="font-size:13px;color:var(--text-mid);line-height:1.5;margin-bottom:12px">${esc(nodeDesc.replace(/\n/g," "))}</div>` : ""}
            ${tierSquad}
            ${ftRewards}
            ${regRewards}
            ${enemies}
          </div>`;
        }).join("");

        const firstNode = tierResults[0] && tierResults[0].data;
        chContent.innerHTML = `
          <div class="camp-ch-detail">
            ${chReqHtml ? `<div class="camp-req-gold" style="margin:0 0 12px">${chReqHtml}</div>` : ""}
            ${tiersHtml || `<div style="color:var(--text-mid);font-size:13px;font-family:var(--font-mono)">No tier data returned.</div>`}
          </div>`;
      }
      // Wire tab clicks
      tabBar.querySelectorAll(".camp-ch-tab").forEach(tab => {
        tab.addEventListener("click", () => renderChapter(tab.dataset.ch));
      });

      // Show first chapter
      renderChapter(chapters[0][0]);
    }

    panel.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeCampaignDetailPanel() {
    const p = document.getElementById("camp-detail-panel");
    if (p) p.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function closeCampaignNodeModal() { closeCampaignDetailPanel(); }

  // ── Raid / DD / PYP / Tower detail panel ────────────────────────────────────
  // ── Refresh ──────────────────────────────────────────────────────────────────
  async function refreshRoster() {
    const token = sessionStorage.getItem("msf_token");
    if (!token) { alert("You are not signed in."); return; }
    const btn = document.getElementById("refresh-btn");
    const badge = document.getElementById("mode-badge");
    const origText = btn.textContent;
    btn.textContent = "Syncing..."; btn.disabled = true;
    badge.textContent = "Loading..."; badge.className = "status-badge loading";
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
        const iso8 = (c.iso8 && typeof c.iso8 === "object") ? c.iso8 : null;
        const isoActive = iso8 && iso8.active ? iso8.active : null;
        return {
          name: meta.name || (c.id ? splitCase(c.id) : "Unknown"), portrait: c.id || "",
          icon: meta.icon || c.portrait || null,
          shardItemId: meta.shardItemId || null,
          roles: meta.roles && meta.roles.length ? meta.roles : [],
          role:  meta.roles && meta.roles[0] ? meta.roles[0] : "—",
          teams: meta.teams && meta.teams.length ? meta.teams.map(splitCase) : [],
          team:  meta.teams && meta.teams[0] ? splitCase(meta.teams[0]) : "—",
          tier: c.gearTier ? "T" + c.gearTier : "T1", power: c.power || 0,
          stars: c.activeYellow || 0, redStars: c.activeRed || 0,
          iso:      isoActive ? isoActive.charAt(0).toUpperCase() + isoActive.slice(1) : "—",
          isoColor: iso8 ? (iso8.matrix || "green") : null,
          isoLevel: isoActive ? (iso8[isoActive] || null) : null,
          level: c.level || 1,
          abilityBasic:    c.basic    || 1,
          abilitySpecial:  c.special  || 0,
          abilityUltimate: c.ultimate || 0,
          abilityPassive:  c.passive  || 0,
          _raw: c
        };
      });
      if (chars.length === 0) throw new Error("No characters returned");
      roster = chars; maxPower = Math.max(...roster.map(c => c.power));
      if (squadsRes.ok) {
        const squadsJson = await squadsRes.json();
        const tabs = (squadsJson.data && squadsJson.data.tabs) ? squadsJson.data.tabs : {};
        const tabLabels = { roster:"Roster", blitz:"Blitz", tower:"Tower", raids:"Raids", arena:"Arena", war:"War", crucible:"Crucible" };
        const rosterById = {};
        roster.forEach(c => { rosterById[c.portrait] = c; });
        squads = [];
        Object.entries(tabs).forEach(([tabKey, squadArrays]) => {
          if (!Array.isArray(squadArrays)) return;
          const label = tabLabels[tabKey] || tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
          squadArrays.forEach((memberIds, idx) => {
            if (!Array.isArray(memberIds) || memberIds.length === 0) return;
            squads.push({ name: label + " Squad " + (idx + 1), type: label,
              members: memberIds.filter(Boolean).map(id => {
                const rc = rosterById[id];
                return {
                  name:  rc ? rc.name : id.replace(/([A-Z])/g, " $1").trim(),
                  power: rc ? rc.power : 0
                };
              })
            });
          });
        });
      }
      if (cardRes.ok) { const cardJson = await cardRes.json(); card = cardJson.data || cardJson; }
      badge.textContent = "Live data"; badge.className = "status-badge live";
      btn.textContent = origText; btn.disabled = false;
      renderMetrics(); populateTeamFilter(); renderRoster();
      renderSquads(); renderCard(); renderActivities(); renderInventory();
      addMessage("assistant", "✓ Roster synced! " + roster.length + " characters loaded.");
      chatHistory.push({ role:"assistant", content:"Roster refreshed." });
      saveChatHistory(); switchTab("ai");
    } catch(e) {
      badge.textContent = "Live data"; badge.className = "status-badge live";
      btn.textContent = origText; btn.disabled = false;
      alert("Refresh failed: " + e.message);
    }
  }


  // OAuth callback is handled by callback.html + callback.js
  // When they complete, they redirect back here with the token already in sessionStorage
  (function init() {
    const token = sessionStorage.getItem("msf_token");
    if (token) loadLiveData(token);
    // Otherwise stay on login screen
  })();

  document.addEventListener("DOMContentLoaded", function() {
    document.addEventListener("error", function(e) {
      const img = e.target;
      if (img.tagName !== "IMG") return;
      if (img.classList.contains("img-with-fallback")) {
        img.style.display = "none";
        const next = img.nextElementSibling;
        if (next) next.style.display = "flex";
      } else if (img.classList.contains("img-hide-on-error")) {
        img.style.display = "none";
      }
    }, true);

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
      if (el) el.addEventListener("click", function() {
        switchTab(t);
        if (t === "inventory") setTimeout(renderInventory, 50);
      });
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

    const charCloseBtn = document.getElementById("char-modal-close-btn");
    if (charCloseBtn) charCloseBtn.addEventListener("click", function() { closeModal(); });
    const campDetailCloseBtn = document.getElementById("camp-detail-close");
    if (campDetailCloseBtn) campDetailCloseBtn.addEventListener("click", closeCampaignDetailPanel);
    const eventPopupCloseBtn = document.getElementById("event-popup-close");
    if (eventPopupCloseBtn) eventPopupCloseBtn.addEventListener("click", function() {
      const panel = document.getElementById("event-popup-panel");
      panel.classList.add("hidden"); panel.style.display = "none";
    });
    const eventPopupPanel = document.getElementById("event-popup-panel");
    if (eventPopupPanel) eventPopupPanel.addEventListener("click", function(e) {
      if (e.target === this) { this.classList.add("hidden"); this.style.display = "none"; }
    });
    // Activities sub-tab switching (wired once, reads panel IDs directly)
    document.querySelectorAll(".act-subtab").forEach(function(btn) {
      btn.addEventListener("click", function() {
        document.querySelectorAll(".act-subtab").forEach(function(b) { b.classList.remove("act-subtab--active"); });
        this.classList.add("act-subtab--active");
        const tab = this.dataset.actTab;
        const panels = { challenges: "act-panel-challenges", missions: "act-panel-missions", maps: "act-panel-maps", legendary: "act-panel-legendary" };
        Object.entries(panels).forEach(function(entry) {
          const el = document.getElementById(entry[1]);
          if (el) el.classList.toggle("hidden", tab !== entry[0]);
        });
        _actTab = tab;
      });
    });
    const charModal = document.getElementById("char-modal");
    if (charModal) charModal.addEventListener("click", closeModal);

    document.querySelectorAll(".modal-box").forEach(function(box) {
      box.addEventListener("click", function(e) { e.stopPropagation(); });
    });

    document.addEventListener("click", function(e) {
      const card = e.target.closest("[data-modal-idx]");
      if (card) openModal(parseInt(card.dataset.modalIdx));
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