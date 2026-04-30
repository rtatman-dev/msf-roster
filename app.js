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
    return `<img src="${url}" class="${cssClass}" class="img-with-fallback" /><div class="char-avatar-fallback" style="display:none;background:var(--bg-deep)">${fallback}</div>`;
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
      const [rosterRes, squadsRes, cardRes, gameCharsRes, eventsRes, inventoryRes, raidGroupsRes, raidListRes, ddListRes, pypRes, stRes, allianceRes, campaignRes, eventCampRes, challengeRes, flashRes, unlockRes, otherRes] = await Promise.all([
        fetch(API_BASE + "/player/v1/roster",  { headers }),
        fetch(API_BASE + "/player/v1/squads",  { headers }),
        fetch(API_BASE + "/player/v1/card",    { headers }),
        fetch(API_BASE + "/game/v1/characters?traitFormat=id&perPage=500", { headers }),
        fetch(API_BASE + "/player/v1/events",  { headers }),
        fetch(API_BASE + "/player/v1/inventory?itemFormat=full&pieceInfo=full", { headers }),
        fetch(API_BASE + "/game/v1/raidGroups",       { headers }),
        fetch(API_BASE + "/game/v1/raids",             { headers }),
        fetch(API_BASE + "/game/v1/dds",               { headers }),
        fetch(API_BASE + "/game/v1/pickYourPoisons",   { headers }),
        fetch(API_BASE + "/game/v1/survivalTowers",    { headers }),
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
          isoColor: (c.iso8 && c.iso8.color) ? c.iso8.color : null,
          isoLevel: (c.iso8 && c.iso8.level) ? c.iso8.level : null,
          level:    c.level || 1,
          // Ability levels from API
          abilityBasic:    c.basicLevel    || c.basic    || 1,
          abilitySpecial:  c.specialLevel  || c.special  || 1,
          abilityUltimate: c.ultimateLevel || c.ultimate || 1,
          abilityPassive:  c.passiveLevel  || c.passive  || 0,
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
        const rawInv = inventoryJson.data || [];
        // With itemFormat=full, each entry has { item: {id, name, icon, ...}, quantity }
        // OR with itemFormat=id, each entry has { item: "GEAR_...", quantity }
        playerInventory = rawInv.map(entry => {
          if (typeof entry.item === "object" && entry.item !== null) {
            // Full item object — extract icon/name into metadata, normalise to id
            const itm = entry.item;
            if (itm.id) {
              if (!itemMetadata[itm.id]) itemMetadata[itm.id] = { name: null, icon: null, description: null, locations: [] };
              if (itm.icon  && !itemMetadata[itm.id].icon)        itemMetadata[itm.id].icon        = itm.icon;
              if (itm.name  && !itemMetadata[itm.id].name)        itemMetadata[itm.id].name        = itm.name;
              if (itm.description && !itemMetadata[itm.id].description) itemMetadata[itm.id].description = itm.description;
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
      }

      if (raidListRes.ok) {
        const raidListJson = await raidListRes.json();
        raidIds = (raidListJson.data || []).map(r => r.id).filter(Boolean);
      }

      if (ddListRes.ok) {
        const ddListJson = await ddListRes.json();
        ddIds = (ddListJson.data || []).map(d => d.id).filter(Boolean);
      }

      if (pypRes.ok) {
        const pypJson = await pypRes.json();
        pypIds = (pypJson.data || []).map(p => p.id).filter(Boolean);
      }

      if (stRes.ok) {
        const stJson = await stRes.json();
        stIds = (stJson.data || []).map(s => s.id).filter(Boolean);
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
            fetch(API_BASE + "/game/v1/episodics/campaign/" + camp.id + "?itemFormat=full&pieceInfo=full", { headers: authHeaders })
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

        // Fetch node data for all non-campaign episodics in parallel
        const otherEpisodicFetches = [];
        EPISODIC_TYPES.forEach(({ res, key }) => {
          if (!res || !res.ok) return;
          res.json().then(j => {
            const items = j.data || [];
            // Tag each item with its episodic type so we can call the right endpoint
            items.forEach(item => { item._episodicType = key; });
            episodics[key] = items;
            campaigns.push(...items); // add to campaigns array for AI context
            // Fetch node data for each
            items.forEach(ep => {
              otherEpisodicFetches.push(
                fetch(API_BASE + "/game/v1/episodics/" + key + "/" + ep.id + "?itemFormat=full&pieceInfo=full", { headers: authHeaders })
                  .then(r => r.ok ? r.json() : null).catch(() => null)
                  .then(res => { if (res && res.data) campaignNodes[ep.id] = res.data; })
              );
            });
          }).catch(() => {});
        });

        // Also populate episodics.campaign
        episodics.campaign = campaigns.filter(c => !["eventCampaign","challenge","flashEvent","unlockEvent","otherEvent"].some(k => episodics[k].some(e => e.id === c.id)));
        episodics.campaign.forEach(c => { if (!c._episodicType) c._episodicType = "campaign"; });

        await Promise.all(otherEpisodicFetches);
        console.log("All episodic types loaded:", Object.keys(episodics).map(k => k + ":" + episodics[k].length).join(", "));

        // Build farming locations index: itemId -> [{name, detail}]
        // by scanning all campaign chapter/node rewards
        Object.entries(campaignNodes).forEach(([campId, campData]) => {
          const campName = (campaigns.find(c => c.id === campId) || {}).name || campId;
          if (!campData.chapters) return;
          Object.entries(campData.chapters).forEach(([chNum, chapter]) => {
            const chName = chapter.name || ("Ch " + chNum);
            if (!chapter.tiers) return;
            const diffLabels = { A: "Normal", B: "Hard", C: "Extreme" };
            Object.entries(chapter.tiers).forEach(([diff, tier]) => {
              const diffLabel = diffLabels[diff] || diff;
              if (!tier.nodes) return;
              Object.entries(tier.nodes).forEach(([nodeNum, node]) => {
                // Gather all reward items from this node
                const rewards = [];
                if (node.rewards) {
                  const addRewards = (r) => {
                    if (!r) return;
                    if (Array.isArray(r)) r.forEach(addRewards);
                    else if (r.allOf) r.allOf.forEach(addRewards);
                    else if (r.oneOf) r.oneOf.forEach(addRewards);
                    else if (r.item) {
                      const itemId = typeof r.item === "string" ? r.item : r.item.id;
                      if (itemId) rewards.push(itemId);
                    }
                  };
                  addRewards(node.rewards);
                }
                // Also check node.boss, node.clear rewards
                [node.boss, node.clear, node.battle].forEach(r => {
                  if (!r) return;
                  const addR = (x) => {
                    if (!x) return;
                    if (Array.isArray(x)) x.forEach(addR);
                    else if (x.allOf) x.allOf.forEach(addR);
                    else if (x.item) {
                      const id = typeof x.item === "string" ? x.item : x.item.id;
                      if (id) rewards.push(id);
                    }
                  };
                  addR(r);
                });
                // Store location for each reward item
                rewards.forEach(itemId => {
                  if (!itemMetadata[itemId]) itemMetadata[itemId] = { name: null, icon: null, description: null, locations: [] };
                  const loc = {
                    name: campName + " " + chName + "-" + nodeNum + " " + diffLabel,
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
        });
        const itemsWithLocations = Object.values(itemMetadata).filter(m => m.locations && m.locations.length > 0).length;
        console.log("Items with farming locations:", itemsWithLocations);
      }



      // Pre-fetch gear piece icons across many characters to maximise icon coverage.
      // Strategy: pick one character per gear tier (T1-T13) + top characters overall,
      // deduplicate, then fetch all in parallel. Each character's gearTiers object
      // contains ALL tiers T1-T13, so even one character gives icons for all 13 tiers.
      // We fetch 20 characters to cover as many unique piece IDs as possible.
      {
        const token = sessionStorage.getItem("msf_token");
        const authHeaders = { "Authorization": "Bearer " + token, "x-api-key": API_KEY };

        // Fetch gear data for ALL roster characters in batches of 20.
        // Each character's gearTiers covers T1-T13, giving us icons for all their
        // gear piece IDs. We need broad coverage to map all inventory GEAR_ IDs.
        const BATCH = 20;
        const allChars = [...roster];
        console.log("Fetching gear icons for", allChars.length, "characters in batches of", BATCH, "...");

        const gearResults = [];
        for (let i = 0; i < allChars.length; i += BATCH) {
          // Update loading badge with progress
          const prog = Math.round((i / allChars.length) * 100);
          const badge = document.getElementById("mode-badge");
          if (badge) { badge.textContent = "Loading icons " + prog + "%"; }

          const batch = allChars.slice(i, i + BATCH);
          const batchResults = await Promise.all(
            batch.map(c => {
              // Use the original API character ID (stored in portrait field)
              // not the display name, as the API endpoint expects camelCase IDs
              const charId = c.portrait || c.name.replace(/\s/g, "");
              return fetch(API_BASE + "/game/v1/characters/" + charId, { headers: authHeaders })
                .then(r => r.ok ? r.json() : null).catch(() => null);
            })
          );
          batchResults.forEach(r => gearResults.push(r));
          // Small delay between batches to avoid rate limiting
          if (i + BATCH < allChars.length) {
            await new Promise(r => setTimeout(r, 200));
          }
        }

        let gearIconCount = 0;
        gearResults.forEach(res => {
          if (!res || !res.data || !res.data.gearTiers) return;
          Object.values(res.data.gearTiers).forEach(tier => {
            if (!tier.slots) return;
            tier.slots.forEach(slot => {
              const piece = slot.piece;

              if (piece && piece.id) {
                // Store the gear piece itself
                if (piece.icon) {
                  if (!itemMetadata[piece.id]) {
                    itemMetadata[piece.id] = { name: null, icon: null, description: null, locations: [] };
                  }
                  if (!itemMetadata[piece.id].icon) {
                    itemMetadata[piece.id].icon = piece.icon;
                    gearIconCount++;
                  }
                  if (piece.name && !itemMetadata[piece.id].name) {
                    itemMetadata[piece.id].name = piece.name;
                  }
                }
                // Store ingredient materials (crafting mats like Bio Mat, Damage Mat)
                // These appear in player inventory but are ingredients INSIDE gear pieces
                // Try all possible field names the API might use
                const ingredients = piece.recipe || piece.ingredients || piece.components || piece.parts || piece.materials || [];
                (Array.isArray(ingredients) ? ingredients : []).forEach(ing => {
                  if (!ing || !ing.id) return;
                  const ingIcon = ing.icon || ing.image || null;
                  if (!itemMetadata[ing.id]) {
                    itemMetadata[ing.id] = { name: null, icon: null, description: null, locations: [] };
                  }
                  if (ingIcon && !itemMetadata[ing.id].icon) {
                    itemMetadata[ing.id].icon = ingIcon;
                    gearIconCount++;
                  }
                  if (ing.name && !itemMetadata[ing.id].name) {
                    itemMetadata[ing.id].name = ing.name;
                  }
                });
              }
            });
          });
        });
        console.log("Gear icons populated:", gearIconCount, "unique pieces");



        const totalWithIcons = Object.values(itemMetadata).filter(m => m.icon).length;
        console.log("Total item metadata entries with icons:", totalWithIcons);



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
            <img src="${portUrl}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block;transition:transform 0.3s" class="img-with-fallback" />
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
          <img src="${portUrl}" class="img-with-fallback" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:50%;display:block" />
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
      return `<img src="${url}" class="${cls}" style="${style||""}" class="img-with-fallback" />
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
                  <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block" class="img-with-fallback" />
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
          <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block" class="img-with-fallback" />
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
            ${bestChar ? `<img src="${getPortraitUrl(bestChar)}" class="img-hide-on-error" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;opacity:0.18;filter:blur(2px) saturate(1.5)"/>` : ""}
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
      <img src="${portUrl}" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block" class="img-with-fallback" />
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
            '<img class="modal-gear-icon img-hide-on-error" src="' + piece.icon + '" />' +
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

  // ── Helper: extract requirements text ─────────────────────────────────────
  function formatRequirements(reqs) {
    if (!reqs) return null;
    const parts = [];
    if (reqs.minCharacters && reqs.minCharacters > 1) parts.push(reqs.minCharacters + " chars");
    if (reqs.otherRequirements) {
      const o = reqs.otherRequirements;
      if (o.minPower) parts.push("≥" + Math.round(o.minPower/1000) + "k power");
      if (o.maxPower) parts.push("≤" + Math.round(o.maxPower/1000) + "k power");
    }
    if (reqs.anyCharacterFilters && reqs.anyCharacterFilters.length) {
      reqs.anyCharacterFilters.forEach(f => {
        const traits = (f.allTraits || []).map(t => typeof t === "string" ? t : (t.name || t.id || "")).filter(Boolean);
        if (traits.length) parts.push(traits.join("+"));
      });
    }
    if (reqs.specificCharacters && reqs.specificCharacters.length) {
      parts.push("Requires: " + reqs.specificCharacters.slice(0,3).map(id => id.replace(/([A-Z])/g," $1").trim()).join(", "));
    }
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

  // ── Helper: smart squad suggestion from requirements ─────────────────────────
  function smartSquadForReqs(reqs, top) {
    top = top || 5;
    if (!reqs || !roster.length) return [];
    const filters = reqs.anyCharacterFilters || [];
    const minPower = (reqs.otherRequirements && reqs.otherRequirements.minPower) || 0;
    const scored = roster.map(c => {
      const charTraits = [...(c.roles||[]), ...(c.teams||[])].map(x => x.toLowerCase());
      let score = 0;
      if (filters.length > 0) {
        let satisfiesAny = false;
        filters.forEach(f => {
          const reqTraits = (f.allTraits || []).map(t => typeof t === "string" ? t.toLowerCase() : (t.id||t.name||"").toLowerCase()).filter(Boolean);
          if (reqTraits.length === 0) { satisfiesAny = true; return; }
          const allMatch = reqTraits.every(rt => charTraits.some(ct => ct === rt || ct.includes(rt) || rt.includes(ct)));
          if (allMatch) { satisfiesAny = true; score += reqTraits.length * 10; }
          else score += reqTraits.filter(rt => charTraits.some(ct => ct === rt || ct.includes(rt))).length;
        });
        if (satisfiesAny) score += 50;
      }
      if (minPower && c.power < minPower) score -= 100;
      return { ...c, _score: score };
    });
    const qualified = scored.filter(c => c._score > 0);
    if (qualified.length >= top) return qualified.sort((a,b) => b._score - a._score || b.power - a.power).slice(0, top);
    return [...roster].sort((a,b) => b.power - a.power).slice(0, top);
  }

  // ── Helper: build roster suggestion from requirements ────────────────────────
  function suggestRosterForReqs(reqs, topN) {
    if (!roster.length) return [];
    topN = topN || 5;
    // Score each character based on matching traits/filters
    const filters = (reqs && reqs.anyCharacterFilters) || [];
    const scored = roster.map(c => {
      let score = 0;
      filters.forEach(f => {
        const reqTraits = (f.allTraits || []).map(t => typeof t === "string" ? t.toLowerCase() : (t.name || t.id || "").toLowerCase()).filter(Boolean);
        const charTraits = [...(c.roles||[]), ...(c.teams||[])].map(x => x.toLowerCase());
        const matches = reqTraits.filter(rt => charTraits.some(ct => ct.includes(rt) || rt.includes(ct)));
        if (matches.length === reqTraits.length && reqTraits.length > 0) score += 10;
        else score += matches.length;
      });
      const minPower = reqs && reqs.otherRequirements && reqs.otherRequirements.minPower;
      if (minPower && c.power >= minPower) score += 2;
      return { ...c, _score: score };
    }).sort((a,b) => b._score - a._score || b.power - a.power);
    return scored.slice(0, topN);
  }

  // ── Activity tab state ───────────────────────────────────────────────────────
  let _actTab = "events";

  // ── Render activities ────────────────────────────────────────────────────────
  async function renderActivities() {
    const el = document.getElementById("activities-content");
    if (!el) return;

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
      const name = item.name || item.id;
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
        return `<div class="act-roster-pip" title="${c.name} · ${Math.round(c.power/1000)}k · ${c.tier}" style="border-color:${roleColor}">
          <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:50%" class="img-with-fallback" />
          <div style="display:none;width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center">${fb}</div>
        </div>`;
      }).join("");
    }

    // ── Card builder ───────────────────────────────────────────────────────────
    function actCard({ id, typeLabel, typeColor, name, subName, art, timeLeft, reqText, rewards, suggestedChars, details, noTimer }) {
      const timeHtml = noTimer ? "" : (timeLeft ? `<div class="act-timer">⏱ ${timeLeft}</div>` : `<div class="act-timer act-timer--ended">Ended</div>`);
      const artHtml = art
        ? `<div class="act-card-art" style="background-image:url('${art}')"></div>`
        : `<div class="act-card-art act-card-art--placeholder" style="background:linear-gradient(160deg,${typeColor}18 0%,#040608 100%)">
             <span style="color:${typeColor};opacity:0.25;font-size:3rem;font-family:var(--font-hud);line-height:110px">◆</span>
           </div>`;

      const rewardsHtml = rewards && rewards.length
        ? `<div class="act-section-label">Rewards</div><div class="act-rewards-row">${rewards.map(rewardPill).join("")}</div>`
        : "";

      // Only show squad if we have real matches (score > 0 chars)
      const rosterHtml = suggestedChars && suggestedChars.length
        ? `<div class="act-section-label">${reqText ? "Matched Squad" : "Top Squad"}</div>
           <div class="act-roster-row">${rosterPips(suggestedChars)}</div>`
        : "";

      const detailHtml = details ? `<div class="act-card-details">${details.replace(/\n/g," ").slice(0,180)}${details.length>180?"…":""}</div>` : "";
      const reqHtml = reqText ? `<div class="act-req-badge">⚠ ${reqText}</div>` : "";

      return `<div class="act-card" data-act-id="${id}">
        ${artHtml}
        <div class="act-card-body">
          <div class="act-card-header">
            <div class="act-type-badge" style="background:${typeColor}22;color:${typeColor};border-color:${typeColor}44">${typeLabel}</div>
            ${timeHtml}
          </div>
          <div class="act-card-title">${name}</div>
          ${subName ? `<div class="act-card-sub">${subName}</div>` : ""}
          ${reqHtml}
          ${detailHtml}
          ${rewardsHtml}
          ${rosterHtml}
        </div>
      </div>`;
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
        return `<span class="act-diff-badge" style="color:${color};border-color:${color}40" title="${diffReqText || ''}">${label}</span>`;
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
        name: primary.name || primary.id,
        subName: (primary.subName || meta) + (diffBadgesHtml ? `<div class="act-diff-row" style="margin-top:4px">${diffBadgesHtml}</div>` : ""),
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
        subName: ev.subName || "",
        art, timeLeft: tLeft,
        reqText, rewards,
        suggestedChars: suggested,
        details: ev.details
      });
    }

    // ── Campaign grouping ─────────────────────────────────────────────────────
    function getCampaignBaseKey(camp) {
      return camp.id.replace(/_HARD$|_HEROIC$|_EPIC$|_XTREME$|_APOCALYPTIC$/, "");
    }

    function groupCampaigns(campList) {
      const grouped = {}, order = [];
      campList.forEach(camp => {
        const key = getCampaignBaseKey(camp);
        if (!grouped[key]) { grouped[key] = []; order.push(key); }
        grouped[key].push(camp);
      });
      order.forEach(key => grouped[key].sort((a,b) => a.id.localeCompare(b.id)));
      return order.map(key => grouped[key]);
    }

    // Req text in gold style
    function formatReqGold(reqs) {
      if (!reqs) return "";
      const parts = [];
      const filters = [...(reqs.anyCharacterFilters||[]), ...(reqs.allCharacterFilters||[])];
      filters.forEach(f => {
        const traits = (f.allTraits||[]).map(t => typeof t==="string"?t:(t.name||t.id||"")).filter(Boolean);
        const gear = f.minGearTier ? " @ Gear Tier " + f.minGearTier : "";
        if (traits.length || gear) parts.push("<span class='camp-req-trait'>" + traits.join(" + ") + gear + "</span>");
      });
      if (reqs.specificCharacters && reqs.specificCharacters.length) {
        parts.unshift("Requires: <span class='camp-req-trait'>" +
          reqs.specificCharacters.slice(0,3).map(id=>id.replace(/([A-Z])/g," $1").trim()).join(", ") + "</span>");
      }
      if (reqs.otherRequirements && reqs.otherRequirements.minPower) {
        parts.push("Min <span class='camp-req-trait'>" + Math.round(reqs.otherRequirements.minPower/1000) + "k power</span>");
      }
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
        return `<div class="camp-reward-chip" title="${name}×${r.qty||1}">
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

      const diffLabels = {"":"Normal","_HARD":"Hard","_HEROIC":"Heroic","_EPIC":"Epic","_APOCALYPTIC":"Apocalyptic","_XTREME":"X-Treme"};
      const diffColors = {"Normal":"#94a3b8","Hard":"#f59e0b","Heroic":"#ef4444","Epic":"#8b5cf6","Apocalyptic":"#dc2626","X-Treme":"#06b6d4"};
      const diffs = campGroup.map(camp => {
        const suffix = camp.id.replace(getCampaignBaseKey(camp), "");
        const label  = diffLabels[suffix] || suffix.replace("_","") || "Normal";
        return { label, color: diffColors[label]||"#6b7280", campId: camp.id };
      });

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
        <div class="act-card-art${art?" ":"  act-card-art--placeholder"}"
          style="${art ? `background-image:url('${art}')` : `background:linear-gradient(160deg,${typeColor}18,#040608)`}">
          ${!art ? `<span style="color:${typeColor};opacity:0.2;font-size:3rem;font-family:var(--font-hud)">◆</span>` : ""}
        </div>
        <div class="act-card-body">
          <div class="act-card-header">
            <div class="act-type-badge" style="background:${typeColor}22;color:${typeColor};border-color:${typeColor}44">${typeLabel}</div>
            ${diffs.length > 1 ? `<div style="display:flex;gap:3px;flex-wrap:wrap">${diffBadges}</div>` : ""}
          </div>
          <div class="act-card-title">${primary.name || primary.id}</div>
          ${primary.details ? `<div class="act-card-sub">${primary.details.replace(/\n/g," ").slice(0,80)}${primary.details.length>80?"…":""}</div>` : ""}
          ${reqGold ? `<div class="act-req-badge" style="color:#f0a500;border-color:#f0a50030;background:#f0a50010;font-size:9px">${reqGold}</div>` : ""}
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-top:2px">${chCount} chapters</div>
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

    // ── Assemble sections by the 6 API episodic types ─────────────────────────
    const allSections = [];

    // Helper to build campaign cards from an episodic type's data
    function episodicTypeCards(typeKey) {
      const items = episodics[typeKey] || [];
      if (!items.length) return [];
      return groupCampaigns(items).map(grp => campaignGroupCard(grp));
    }

    // 1. Campaign (standard campaigns)
    const campCards = groupCampaigns(episodics.campaign.length ? episodics.campaign : campaigns).map(grp => campaignGroupCard(grp));
    if (campCards.length) allSections.push(section("Campaigns", "📋", campCards, "No campaigns available"));

    // 2. Event Campaign
    const evCampCards = episodicTypeCards("eventCampaign");
    if (evCampCards.length) allSections.push(section("Event Campaigns", "⭐", evCampCards, ""));

    // 3. Challenge
    const challengeCards = episodicTypeCards("challenge");
    if (challengeCards.length) allSections.push(section("Challenges", "★", challengeCards, ""));

    // 4. Flash Event (time-limited events from playerEvents with type=episodic/blitz etc.)
    //    Also include episodics.flashEvent entries
    const flashEpisodics = episodicTypeCards("flashEvent");
    const flashEvents = [...byType.blitz, ...byType.episodic, ...byType.milestone,
                         ...byType.tower, ...byType.pickYourPoison].map(eventCard);
    if (flashEpisodics.length || flashEvents.length)
      allSections.push(section("Flash Events", "⚡", [...flashEpisodics, ...flashEvents], "No flash events"));

    // 5. Unlock Event
    const unlockCards = episodicTypeCards("unlockEvent");
    if (unlockCards.length) allSections.push(section("Unlock Events", "🔓", unlockCards, ""));

    // 6. Other Event
    const otherEpisodics = episodicTypeCards("otherEvent");
    const otherEvents = [...byType.other, ...byType.warSeason, ...byType.battlePass, ...byType.strikePass].map(eventCard);
    if (otherEpisodics.length || otherEvents.length)
      allSections.push(section("Other Events", "◆", [...otherEpisodics, ...otherEvents], ""));

    // Raids (grouped by groupId)
    const raidCards = raidGroups.map(grp => raidGroupCard(grp, false));
    if (raidCards.length) allSections.push(section("Raids", "⚔️", raidCards, "No raids available"));

    // Dark Dimensions (grouped)
    const ddCards = ddGroups.map(grp => raidGroupCard(grp, "dd"));
    if (ddCards.length) allSections.push(section("Dark Dimensions", "🌑", ddCards, ""));

    // Pick Your Poison
    const pypCards = pypGroups.map(grp => raidGroupCard(grp, "pyp"));
    if (pypCards.length) allSections.push(section("Pick Your Poison", "☠", pypCards, ""));

    // Survival Towers
    const towerCards = stGroups.map(grp => raidGroupCard(grp, "tower"));
    if (towerCards.length) allSections.push(section("Survival Towers", "▲", towerCards, ""));

    // Alliance war
    if (allianceCard) {
      const warCard = actCard({
        id: "alliance-war", typeLabel: "Alliance War", typeColor: "#ef4444",
        name: (allianceCard.name || "Alliance") + " War",
        subName: "War rating: " + (allianceCard.warRating || "—") + " · " + (allianceCard.memberCount||"?") + " members",
        art: null, timeLeft: null, noTimer: true,
        reqText: null, rewards: [], suggestedChars: [],
        details: "Raid rating: " + (allianceCard.raidRating || "—")
      });
      allSections.push(section("Alliance War", "⚔", [warCard], ""));
    }

    // Ended events
    if (ended.length) {
      const endedCards = ended.filter(e => !RAID_EVENT_TYPES.has(e.type)).slice(0,6).map(eventCard);
      if (endedCards.length) allSections.push(`<div class="act-section act-section--ended">
        <div class="act-section-header">
          <span class="act-section-icon">⏰</span>
          <span class="act-section-title" style="color:var(--text-dim)">Recently Ended</span>
          <span class="act-section-count">${endedCards.length}</span>
        </div>
        <div class="act-cards-row">${endedCards.join("")}</div>
      </div>`);
    }

    el.innerHTML = allSections.join("") || `<div class="act-empty-full">No activity data available.</div>`;

    // Wire campaign cards → detail panel
    el.querySelectorAll("[data-camp-group]").forEach(card => {
      card.addEventListener("click", function() {
        openCampaignDetailPanel(this.dataset.campGroup);
      });
    });

    // Wire raid/DD/PYP/tower cards → room detail panel
    el.querySelectorAll("[data-raid-type]").forEach(card => {
      card.addEventListener("click", function() {
        openRaidDetailPanel(this.dataset.raidType, this.dataset.raidIds.split(","));
      });
    });
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

    function reqGoldHtml(reqs) {
      if (!reqs) return "";
      const parts = [];
      const filters = [...(reqs.anyCharacterFilters||[]),...(reqs.allCharacterFilters||[])];
      filters.forEach(f => {
        const traits = (f.allTraits||[]).map(t=>typeof t==="string"?t:(t.name||t.id||"")).filter(Boolean);
        const gear   = f.minGearTier ? " @ Gear Tier " + f.minGearTier : "";
        if (traits.length||gear) parts.push("<span class='camp-req-trait'>" + traits.join(" + ") + gear + "</span>");
      });
      if (reqs.specificCharacters && reqs.specificCharacters.length) {
        parts.unshift("Requires: <span class='camp-req-trait'>" +
          reqs.specificCharacters.map(id=>id.replace(/([A-Z])/g," $1").trim()).join(", ") + "</span>");
      }
      if (reqs.otherRequirements && reqs.otherRequirements.minPower) {
        parts.push("Min <span class='camp-req-trait'>" + Math.round(reqs.otherRequirements.minPower/1000) + "k power</span>");
      }
      return parts.join(" · ");
    }

    function rewardChips(rewardObj) {
      const items = extractRewardItems(rewardObj, 8);
      if (!items.length) return "";
      return '<div class="camp-reward-row">' + items.map(r => {
        const icon = r.icon || (itemMetadata[r.id] && itemMetadata[r.id].icon);
        const name = r.name || (itemMetadata[r.id] && itemMetadata[r.id].name) || r.id;
        return `<div class="camp-reward-chip" title="${name}">
          ${icon ? `<div style="width:22px;height:22px;background:url('${icon}') center/contain no-repeat;flex-shrink:0"></div>` : ""}
          <span class="camp-reward-name">${name}${r.qty>1?" ×"+r.qty:""}</span>
        </div>`;
      }).join("") + "</div>";
    }

    function squadRow(reqs) {
      const chars = smartSquadForReqs(reqs, 5);
      const hasReqs = reqs && (reqs.anyCharacterFilters||[]).some(f=>(f.allTraits||[]).length>0);
      if (!hasReqs || !chars.length) return "";
      const minPow = reqs.otherRequirements && reqs.otherRequirements.minPower || 0;
      return '<div class="camp-modal-label">Your Best Match</div><div class="camp-modal-squad-row">' +
        chars.map(c => {
          const url = getPortraitUrl(c);
          const rc  = ROLE_COLORS[c.role] || "#00c8ff";
          const ok  = !minPow || c.power >= minPow;
          const fb  = makeFallbackAvatar(c.name, c.role).replace(/"/g,"'").replace(/\n/g,"");
          return `<div class="camp-squad-char">
            <div class="camp-squad-portrait" style="border-color:${ok?rc:"#dc2626"}">
              <img src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:50%" class="img-with-fallback" />
              <div style="display:none;width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center">${fb}</div>
              <div class="camp-squad-badge" style="background:${ok?"#16a34a":"#dc2626"}">${ok?"✓":"✗"}</div>
            </div>
            <div class="camp-squad-name">${c.name.split(" ")[0]}</div>
            <div class="camp-squad-power">${Math.round(c.power/1000)}k · ${c.tier}</div>
          </div>`;
        }).join("") + "</div>";
    }

    // Build header
    const topReqHtml = reqGoldHtml(topReqs);
    const topSquadHtml = squadRow(topReqs);

    let html = `
      <div class="camp-detail-campname">${(() => {
        const DIFF_WORDS = new Set(["hard","heroic","normal","epic","apocalyptic","x-treme","xtreme"]);
        const raw = campMeta.name || "";
        return DIFF_WORDS.has(raw.toLowerCase().trim())
          ? campId.replace(/_HARD$|_HEROIC$|_EPIC$|_XTREME$|_APOCALYPTIC$/,"").replace(/_/g," ").toLowerCase().replace(/\w/g,c=>c.toUpperCase())
          : (raw || campId.replace(/_/g," "));
      })()}</div>
      ${campMeta.details ? `<div class="camp-detail-sub">${campMeta.details.replace(/\n/g," ")}</div>` : ""}
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
      chContent.innerHTML = '<p style="color:var(--text-dim);padding:1rem;font-family:var(--font-mono);font-size:12px">No chapter data available.</p>';
    } else {
      tabBar.innerHTML = chapters.map(([chNum, ch]) => {
        // Tiers are numbered NodeInfo — tier IS the mission, no sub-nodes
        const firstTier = ch.tiers ? Object.values(ch.tiers)[0] : null;
        const chName = (firstTier && firstTier.name) ? firstTier.name : ("Ch " + chNum);
        return `<button class="camp-ch-tab" data-ch="${chNum}" title="${chName}">${chNum}</button>`;
      }).join("");

      async function renderChapter(chNum) {
        tabBar.querySelectorAll(".camp-ch-tab").forEach(t =>
          t.classList.toggle("camp-ch-tab--active", t.dataset.ch === chNum));

        const ch = nodeData.chapters[chNum] || nodeData.chapters[parseInt(chNum)] || null;
        if (!ch) {
          chContent.innerHTML = `<p style="color:var(--text-dim);padding:1rem;font-size:12px;font-family:var(--font-mono)">No data for chapter ${chNum}.</p>`;
          return;
        }

        chContent.innerHTML = `<div style="color:var(--text-dim);padding:1rem;font-family:var(--font-mono);font-size:12px">⚙ Loading tier data...</div>`;

        const chReqHtml = reqGoldHtml(ch.requirements);
        const numTiers  = ch.numTiers || Object.keys(ch.tiers || {}).length || 1;
        const episodicType = campMeta._episodicType || "campaign";

        const TIER_LABELS = {"1":"Normal","2":"Hard","3":"Heroic","4":"Legendary","5":"Mythic","6":"X-Treme","7":"Apocalyptic"};
        const TIER_COLORS = {"1":"#94a3b8","2":"#f59e0b","3":"#ef4444","4":"#8b5cf6","5":"#dc2626","6":"#06b6d4","7":"#ec4899"};

        // Fetch all tiers for this chapter from the dedicated endpoint
        const tierNums = Array.from({length: numTiers}, (_, i) => String(i + 1));
        const token = sessionStorage.getItem("msf_token");
        const headers = { "x-api-key": API_KEY, "Authorization": "Bearer " + token };

        const tierResults = await Promise.all(
          tierNums.map(t =>
            fetch(`${API_BASE}/game/v1/episodics/${episodicType}/${campId}/${chNum}/${t}?itemFormat=full&pieceInfo=full`, { headers })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );

        const tiersHtml = tierResults.map((res, i) => {
          const tierNum = tierNums[i];
          const tLabel  = TIER_LABELS[tierNum] || ("Tier " + tierNum);
          const tColor  = TIER_COLORS[tierNum] || "#6b7280";

          if (!res || !res.data) {
            return `<div class="camp-tier-block">
              <div class="camp-tier-header" style="color:${tColor}">
                <span class="camp-tier-dot" style="background:${tColor}"></span>
                ${tLabel}
              </div>
              <div style="color:var(--text-dim);font-size:11px;padding:4px 0;font-family:var(--font-mono)">No data available.</div>
            </div>`;
          }

          const node = res.data;
          const nodeReqHtml = reqGoldHtml(node.requirements);
          const ftRewards   = rewardChips(node.firstTimeRewards);
          const regRewards  = rewardChips(node.rewards);
          const tierSquad   = squadRow(node.requirements || ch.requirements || topReqs);
          const nodeDesc    = node.details || "";

          return `<div class="camp-tier-block">
            <div class="camp-tier-header" style="color:${tColor};border-bottom:1px solid ${tColor}30;padding-bottom:6px;margin-bottom:8px">
              <span class="camp-tier-dot" style="background:${tColor}"></span>
              <span style="font-family:var(--font-hud);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">${tLabel}</span>
              ${node.name ? `<span style="font-family:var(--font-hud);font-size:10px;font-style:italic;color:var(--text-mid);margin-left:6px">${node.name}</span>` : ""}
              ${nodeReqHtml ? `<span class="camp-tier-req" style="margin-left:auto">${nodeReqHtml}</span>` : ""}
            </div>
            ${nodeDesc ? `<div class="camp-node-desc" style="margin-bottom:8px">${nodeDesc.replace(/\n/g," ").slice(0,200)}</div>` : ""}
            ${tierSquad}
            ${ftRewards ? `<div style="margin-bottom:6px"><div class="camp-reward-label">First Time Rewards</div>${ftRewards}</div>` : ""}
            ${regRewards ? `<div><div class="camp-reward-label">Rewards</div>${regRewards}</div>` : ""}
          </div>`;
        }).join("");

        const firstTierNode = tierResults[0] && tierResults[0].data;
        const chHeading = firstTierNode && firstTierNode.name ? "" : ("Chapter " + chNum);

        chContent.innerHTML = `
          <div class="camp-ch-detail">
            ${chHeading ? `<div class="camp-ch-name">${chHeading}</div>` : ""}
            ${chReqHtml ? `<div class="camp-req-gold" style="margin:4px 0 10px">${chReqHtml}</div>` : ""}
            ${tiersHtml || `<div style="color:var(--text-dim);font-size:12px;font-family:var(--font-mono)">No tier data returned.</div>`}
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
  function openRaidDetailPanel(type, raidIdArray) {
    // Find the data objects
    const dataMap = { raid: raids_data, dd: dds_data, pyp: pyps_data, tower: towers_data };
    const allItems = dataMap[type] || [];
    const items = raidIdArray.map(id => allItems.find(r => r.id === id)).filter(Boolean);
    if (!items.length) return;

    const primary = items[0];
    const panel   = document.getElementById("camp-detail-panel");
    const body    = document.getElementById("camp-detail-body");
    if (!panel || !body) return;

    const typeLabel = { raid:"Raid", dd:"Dark Dimension", pyp:"Pick Your Poison", tower:"Survival Tower" }[type] || "Activity";
    const typeColor = { raid:"#ef4444", dd:"#a855f7", pyp:"#f59e0b", tower:"#10b981" }[type] || "#ef4444";

    const diffLabels = ["Normal","Hard","Heroic","Legendary","Mythic"];
    const diffColors = ["#94a3b8","#f59e0b","#ef4444","#8b5cf6","#dc2626"];

    // Helper: render a CharacterInstance enemy as a portrait card
    function enemyCard(unit) {
      if (!unit) return "";
      const charId   = unit.id || "";
      const charMeta = window._gameCharsMap && window._gameCharsMap[charId] || {};
      const icon     = charMeta.icon || (charId ? "https://msf.gg/img/roster/" + charId.toLowerCase() + ".jpg" : null);
      const name     = charId.replace(/([A-Z])/g," $1").trim() || "Enemy";
      const lvl      = unit.level || "";
      const pwr      = unit.power ? Math.round(unit.power/1000) + "k" : "";
      const tier     = unit.gearTier ? "T" + unit.gearTier : "";

      return `<div class="raid-enemy-card">
        <div class="raid-enemy-portrait">
          ${icon ? `<img src="${icon}" style="width:100%;height:100%;object-fit:cover;object-position:top center" class="img-hide-on-error" />` : ""}
        </div>
        <div class="raid-enemy-info">
          <div class="raid-enemy-name">${name}</div>
          ${lvl ? `<div class="raid-enemy-stat">Lvl ${lvl}</div>` : ""}
          ${pwr ? `<div class="raid-enemy-stat" style="color:var(--accent)">${pwr}</div>` : ""}
          ${tier ? `<div class="raid-enemy-stat">${tier}</div>` : ""}
        </div>
      </div>`;
    }

    // Helper: render waves of enemies from NodeCombat
    function wavesHtml(combat) {
      if (!combat) return "";
      const side = combat.right || combat.left || null;
      if (!side || !side.waves) return "";
      return side.waves.map((wave, wi) => {
        const units = wave.units || [];
        if (!units.length) return "";
        return `<div class="raid-wave">
          <div class="raid-wave-label">Wave ${wi + 1}</div>
          <div class="raid-enemies-row">${units.map(enemyCard).join("")}</div>
        </div>`;
      }).join("");
    }

    // Helper: render rewards from ItemQuantity
    function rewardRow(itemQty, label) {
      const items = extractRewardItems(itemQty, 10);
      if (!items.length) return "";
      return `<div class="raid-reward-block">
        <div class="raid-reward-label">${label}</div>
        <div class="raid-reward-chips">${items.map(r => {
          const icon = r.icon || (itemMetadata[r.id] && itemMetadata[r.id].icon);
          const name = r.name || (itemMetadata[r.id] && itemMetadata[r.id].name) || r.id;
          return `<div class="camp-reward-chip" title="${name}×${r.qty||1}">
            ${icon ? `<div style="width:22px;height:22px;background:url('${icon}') center/contain no-repeat;flex-shrink:0"></div>` : ""}
            <span class="camp-reward-name">${name}${r.qty>1?" ×"+r.qty:""}</span>
          </div>`;
        }).join("")}</div>
      </div>`;
    }

    // Build rooms sorted by position (boss room last)
    function roomsHtml(item) {
      if (!item.rooms) return "<p style='color:var(--text-dim);font-size:12px'>No room data available.</p>";
      const roomEntries = Object.entries(item.rooms)
        .sort((a, b) => {
          // Boss room last
          if (a[1].isBoss && !b[1].isBoss) return 1;
          if (!a[1].isBoss && b[1].isBoss) return -1;
          return a[0].localeCompare(b[0]);
        });

      return roomEntries.map(([roomId, room]) => {
        const enemies  = wavesHtml(room.combat);
        const ftRew    = rewardRow(room.firstTimeRewards, "First Time");
        const regRew   = rewardRow(room.rewards, "Rewards");
        const reqText  = room.requirements ? formatRequirements(room.requirements) : "";

        return `<div class="raid-room${room.isBoss ? " raid-room--boss" : ""}">
          <div class="raid-room-header">
            ${room.icon ? `<div style="width:40px;height:40px;background:url('${room.icon}') center/cover no-repeat;border-radius:4px;flex-shrink:0"></div>` : ""}
            <div class="raid-room-info">
              <div class="raid-room-name${room.isBoss ? " raid-room-name--boss" : ""}">${room.name || roomId}${room.isBoss ? " 👑" : ""}</div>
              ${room.subName ? `<div class="raid-room-sub">${room.subName}</div>` : ""}
              ${room.details ? `<div class="raid-room-desc">${room.details.replace(/\n/g," ").slice(0,120)}</div>` : ""}
              ${reqText ? `<div class="camp-req-gold" style="font-size:10px;margin-top:3px">${reqText}</div>` : ""}
            </div>
          </div>
          ${enemies ? `<div class="raid-room-enemies">${enemies}</div>` : ""}
          ${ftRew || regRew ? `<div class="raid-room-rewards">${ftRew}${regRew}</div>` : ""}
        </div>`;
      }).join("");
    }

    // Build difficulty tabs (one per difficulty/variant)
    const diffTabs = items.map((item, i) => {
      const diffs = item.difficulties ? Object.keys(item.difficulties).sort() : [];
      const label = diffLabels[i] || item.subName || ("Variant " + (i+1));
      const color = diffColors[i] || "#6b7280";
      return { item, label, color };
    });

    // Build header
    let html = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div class="act-type-badge" style="background:${typeColor}22;color:${typeColor};border-color:${typeColor}44">${typeLabel}</div>
      </div>
      <div class="camp-detail-campname">${primary.name || primary.id}</div>
      ${primary.subName ? `<div class="camp-detail-sub">${primary.subName}</div>` : ""}
      ${primary.details ? `<div class="camp-detail-sub" style="font-size:12px">${primary.details.replace(/\n/g," ").slice(0,200)}</div>` : ""}
    `;

    // Difficulty tabs if multiple variants
    if (diffTabs.length > 1) {
      html += `<div class="camp-chapter-tabs" id="raid-diff-tabs">
        ${diffTabs.map((d, i) => `<button class="camp-ch-tab${i===0?" camp-ch-tab--active":""}" data-idx="${i}"
          style="${i===0?`border-color:${d.color};color:${d.color};background:${d.color}18`:""}"
          >${d.label}</button>`).join("")}
      </div>`;
    }

    // Completion rewards (from primary)
    const compObj = type === "dd" ? primary.ddCompletion : primary.completion;
    if (compObj && compObj.tiers) {
      const compItems = [];
      Object.entries(compObj.tiers).forEach(([t, tier]) => compItems.push(...extractRewardItems(tier.rewards, 4)));
      if (compItems.length) {
        html += `<div class="raid-reward-block" style="margin:8px 0">
          <div class="raid-reward-label">Completion Rewards</div>
          <div class="raid-reward-chips">${compItems.slice(0,8).map(r => {
            const icon = r.icon || (itemMetadata[r.id] && itemMetadata[r.id].icon);
            const name = r.name || (itemMetadata[r.id] && itemMetadata[r.id].name) || r.id;
            return `<div class="camp-reward-chip" title="${name}">
              ${icon ? `<div style="width:22px;height:22px;background:url('${icon}') center/contain no-repeat;flex-shrink:0"></div>` : ""}
              <span class="camp-reward-name">${name}${r.qty>1?" ×"+r.qty:""}</span>
            </div>`;
          }).join("")}</div>
        </div>`;
      }
    }

    html += `<div id="raid-rooms-content">${roomsHtml(diffTabs[0].item)}</div>`;
    body.innerHTML = html;

    // Wire difficulty tab clicks
    const tabBar = body.querySelector("#raid-diff-tabs");
    if (tabBar) {
      tabBar.querySelectorAll(".camp-ch-tab").forEach((tab, i) => {
        tab.addEventListener("click", function() {
          tabBar.querySelectorAll(".camp-ch-tab").forEach((t, j) => {
            t.classList.toggle("camp-ch-tab--active", j === i);
            if (j === i) { t.style.borderColor = diffTabs[i].color; t.style.color = diffTabs[i].color; t.style.background = diffTabs[i].color + "18"; }
            else { t.style.borderColor = ""; t.style.color = ""; t.style.background = ""; }
          });
          const rc = body.querySelector("#raid-rooms-content");
          if (rc) rc.innerHTML = roomsHtml(diffTabs[i].item);
        });
      });
    }

    panel.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }





  // ── Render inventory ─────────────────────────────────────────────────────────
  function renderInventory() {
    const el = document.getElementById("inventory-content");
    if (!el) return;

    function categoriseById(id) {
      const u = id.toUpperCase();
      if (u.includes("XPLVL") || u.includes("_XP_") || u.match(/^MATERIAL_XP/)) return null;
      if (u.startsWith("ABILITY_MATERIAL_")) return "Ability Mats";
      if (u.includes("ISOITEM") || u.includes("ISO8") || u.includes("_ISO_")) return "ISO-8";
      if (u.includes("CATALYST")) return "Catalyst";
      if (u.startsWith("GEAR_")) return "Gear Pieces";
      const abilityMatColours = ["GREEN","BLUE","ORANGE","PURPLE"];
      for (const col of abilityMatColours) {
        if (u.includes("_"+col+"_") || u.startsWith("GEAR_"+col+"_") || u.startsWith("MATERIAL_"+col+"_")) return "Ability Mats";
      }
      const otherColours = ["RED","TEAL","YELLOW","PINK"];
      for (const col of otherColours) {
        if (u.includes("_"+col+"_") || u.startsWith("MATERIAL_"+col+"_")) return col;
      }
      if (u.includes("_BASIC_") || u.includes("BASIC")) return "Basic";
      if (u.startsWith("MATERIAL_")) return "Other Mats";
      return "Other";
    }

    function formatItemName(id) {
      if (!id) return "Unknown";
      const meta = itemMetadata[id];
      if (meta && meta.name) return meta.name;
      const baseId = id.replace(/_B[0-9]+$/,"").replace(/_C[0-9]+$/,"").replace(/_BIT[0-9]*$/,"").replace(/_CAT$/,"");
      const baseMeta = (baseId !== id) ? itemMetadata[baseId] : null;
      if (baseMeta && baseMeta.name) {
        const suffix = id.slice(baseId.length).replace(/_/g," ").trim();
        return baseMeta.name + (suffix ? " " + suffix : "");
      }
      return id.replace(/^GEAR_/,"").replace(/^MATERIAL_/,"").replace(/_/g," ").toLowerCase().replace(/\w/g,c=>c.toUpperCase());
    }

    const gearItems = playerInventory.filter(i => i.item && categoriseById(i.item) !== null);
    if (!gearItems.length) {
      el.innerHTML = '<p style="color:var(--text-dim);font-size:13px;padding:2rem 0;font-family:var(--font-mono)">No gear data available.</p>';
      return;
    }

    const CAT_STYLES = {
      "Ability Mats":{ border:"#22c55e",frame:"#14532d",glow:"rgba(34,197,94,0.5)",  bg:"linear-gradient(160deg,#031a08,#010e04)",label:"#86efac",name:"Ability Mats"},
      "RED":         { border:"#dc2626",frame:"#7f1d1d",glow:"rgba(220,38,38,0.5)",  bg:"linear-gradient(160deg,#1f0505,#0d0202)",label:"#fca5a5",name:"Red Mats"},
      "TEAL":        { border:"#0d9488",frame:"#134e4a",glow:"rgba(13,148,136,0.5)", bg:"linear-gradient(160deg,#001f1e,#00100f)",label:"#5eead4",name:"Teal Mats"},
      "YELLOW":      { border:"#ca8a04",frame:"#713f12",glow:"rgba(202,138,4,0.5)",  bg:"linear-gradient(160deg,#1a1000,#0d0800)",label:"#fde68a",name:"Yellow Mats"},
      "PINK":        { border:"#db2777",frame:"#831843",glow:"rgba(219,39,119,0.5)", bg:"linear-gradient(160deg,#1a0310,#0d010a)",label:"#f9a8d4",name:"Pink Mats"},
      "Catalyst":    { border:"#15803d",frame:"#14532d",glow:"rgba(21,128,61,0.5)",  bg:"linear-gradient(160deg,#021408,#010a04)",label:"#4ade80",name:"Catalysts"},
      "ISO-8":       { border:"#0891b2",frame:"#164e63",glow:"rgba(8,145,178,0.55)", bg:"linear-gradient(160deg,#001e2a,#000f16)",label:"#67e8f9",name:"ISO-8"},
      "Gear Pieces": { border:"#1e3a5f",frame:"#0c1f33",glow:"rgba(30,80,160,0.4)", bg:"linear-gradient(160deg,#050d18,#030810)",label:"#60a5fa",name:"Gear Pieces"},
      "Basic":       { border:"#475569",frame:"#1e293b",glow:"rgba(71,85,105,0.4)", bg:"linear-gradient(160deg,#0c1018,#060810)",label:"#94a3b8",name:"Basic"},
      "Other Mats":  { border:"#374151",frame:"#111827",glow:"rgba(55,65,81,0.3)",  bg:"linear-gradient(160deg,#0a0c10,#060808)",label:"#6b7280",name:"Other Mats"},
      "Other":       { border:"#374151",frame:"#111827",glow:"rgba(55,65,81,0.3)",  bg:"linear-gradient(160deg,#0a0c10,#060808)",label:"#6b7280",name:"Other"},
    };

    const CAT_ORDER = ["Ability Mats","RED","TEAL","YELLOW","PINK","Catalyst","ISO-8","Gear Pieces","Basic","Other Mats","Other"];
    const grouped = {};
    CAT_ORDER.forEach(c => { grouped[c] = []; });
    gearItems.forEach(item => {
      const cat  = categoriseById(item.item);
      const name = formatItemName(item.item);
      if (grouped[cat]) grouped[cat].push({ ...item, _name: name, _cat: cat });
    });
    CAT_ORDER.forEach(c => grouped[c] && grouped[c].sort((a,b) => b.quantity - a.quantity));

    const activeCats = CAT_ORDER.filter(c => grouped[c] && grouped[c].length > 0);
    let activeTab = activeCats[0] || "Other";
    let searchVal = "";
    let sortVal   = "qty-desc";

    el.innerHTML = `
      <div class="inv-toolbar">
        <div class="inv-search-wrap"><span class="inv-search-icon">⌕</span><input id="inv-search" class="inv-search" type="text" placeholder="Search gear..." /></div>
        <select id="inv-sort" class="inv-filter-select">
          <option value="qty-desc">Qty: High → Low</option>
          <option value="qty-asc">Qty: Low → High</option>
          <option value="name">Name A–Z</option>
          <option value="low">Low Stock First</option>
        </select>
      </div>
      <div id="inv-tabs" class="inv-tabs"></div>
      <div class="inv-toolbar" id="inv-sub-toolbar" style="margin-bottom:0.75rem;margin-top:-0.5rem"><div id="inv-sub-filter-wrap"></div></div>
      <div id="inv-grid-wrap"></div>`;

    function renderTabs() {
      const tabsEl = document.getElementById("inv-tabs");
      if (!tabsEl) return;
      tabsEl.innerHTML = activeCats.map(cat => {
        const s = CAT_STYLES[cat] || CAT_STYLES["Other"];
        const lowCount = grouped[cat].filter(i => i.quantity < 100).length;
        const isActive = cat === activeTab;
        return `<button class="inv-tab${isActive ? " inv-tab--active" : ""}" data-cat="${cat}"
          style="${isActive ? `border-color:${s.border};color:${s.label};background:${s.border}20` : ""}">
          <span class="inv-tab-dot" style="background:${s.border}"></span>
          ${s.name || cat}<span class="inv-tab-count">${grouped[cat].length}</span>
          ${lowCount ? `<span class="inv-tab-low">⚠${lowCount}</span>` : ""}
        </button>`;
      }).join("");
      tabsEl.querySelectorAll(".inv-tab").forEach(btn => {
        btn.addEventListener("click", function() { activeTab = this.dataset.cat; renderTabs(); renderGrid(); });
      });
    }

    function renderGrid() {
      const wrap = document.getElementById("inv-grid-wrap");
      if (!wrap) return;
      let items = [...(grouped[activeTab] || [])];
      if (searchVal) items = items.filter(i => i._name.toLowerCase().includes(searchVal));
      const subFilterEl = document.getElementById("inv-sub-filter");
      const subFilterVal = subFilterEl ? subFilterEl.value : "all";
      if (subFilterVal !== "all") {
        items = items.filter(i => i._name.toLowerCase().includes(subFilterVal.toLowerCase()) || i.item.toLowerCase().includes(subFilterVal.toLowerCase()));
      }
      items.sort((a,b) => {
        if (sortVal === "qty-asc") return a.quantity - b.quantity;
        if (sortVal === "name")    return a._name.localeCompare(b._name);
        if (sortVal === "low")     return (a.quantity<100?0:1)-(b.quantity<100?0:1)||a.quantity-b.quantity;
        return b.quantity - a.quantity;
      });
      if (!items.length) { wrap.innerHTML = '<p class="inv-empty">No items match.</p>'; return; }

      const s = CAT_STYLES[activeTab] || CAT_STYLES["Other"];

      // Sub-filter injection
      let subFilterHtml = "";
      if (activeTab === "ISO-8") {
        const isoClasses = ["Striker","Fortifier","Healer","Skirmisher","Raider"];
        const colours = [...new Set(items.map(i => { const m = i._name.match(/^(Green|Blue|Orange|Purple|Teal|Red)/i); return m?m[1]:null; }).filter(Boolean))].sort();
        subFilterHtml = `<select id="inv-sub-filter" class="inv-filter-select" style="min-width:140px">
          <option value="all">All ISO-8</option>
          <optgroup label="Class">${isoClasses.map(c=>`<option value="${c}">${c}</option>`).join("")}</optgroup>
          <optgroup label="Colour">${colours.map(c=>`<option value="${c}">${c}</option>`).join("")}</optgroup>
        </select>`;
      } else if (activeTab === "Gear Pieces") {
        const tierNums = [...new Set(items.map(i => { const m=i.item.match(/T(\d+)/i); return m?parseInt(m[1]):null; }).filter(Boolean))].sort((a,b)=>a-b);
        subFilterHtml = tierNums.length ? `<select id="inv-sub-filter" class="inv-filter-select" style="min-width:120px">
          <option value="all">All Tiers</option>${tierNums.map(t=>`<option value="T${t}">T${t}</option>`).join("")}
        </select>` : `<select id="inv-sub-filter" class="inv-filter-select" style="display:none"><option value="all">All</option></select>`;
      } else {
        subFilterHtml = `<select id="inv-sub-filter" class="inv-filter-select" style="display:none"><option value="all">All</option></select>`;
      }
      const subFilterWrap = document.getElementById("inv-sub-filter-wrap");
      if (subFilterWrap) {
        subFilterWrap.innerHTML = subFilterHtml;
        const sf = document.getElementById("inv-sub-filter");
        if (sf) sf.addEventListener("change", renderGrid);
        if (sf && subFilterVal !== "all" && sf.querySelector(`option[value="${subFilterVal}"]`)) sf.value = subFilterVal;
      }

      wrap.innerHTML = '<div class="inv-msf-grid">' + items.map(item => {
        const id   = item.item;
        const qty  = item.quantity;
        const name = item._name;
        const meta = itemMetadata[id] || {};
        let icon = meta.icon || null;
        if (!icon) {
          const baseId = id.replace(/_B[0-9]+$/,"").replace(/_C[0-9]+$/,"").replace(/_BIT[0-9]*$/,"").replace(/_CAT$/,"").replace(/_NOARMOR$/,"");
          if (baseId !== id && itemMetadata[baseId] && itemMetadata[baseId].icon) icon = itemMetadata[baseId].icon;
        }
        if (!icon) {
          const colourMatch = id.match(/^(GEAR|MATERIAL)_(RED|GREEN|BLUE|ORANGE|PURPLE|TEAL|YELLOW|PINK)_/);
          if (colourMatch) {
            const prefix = colourMatch[1] + "_" + colourMatch[2] + "_";
            const colourKey = Object.keys(itemMetadata).find(k => k.startsWith(prefix) && k.includes("_MAT") && itemMetadata[k].icon);
            if (colourKey) icon = itemMetadata[colourKey].icon;
          }
        }
        const desc = meta.description || "";
        const locs = meta.locations && meta.locations.length ? meta.locations : null;
        const isLow = qty < 100;
        const svgFallback = `<svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="44" height="44" rx="4" fill="${s.frame}" opacity="0.6"/>
          <polygon points="26,8 44,26 26,44 8,26" fill="${s.border}" opacity="0.5"/>
          <polygon points="26,14 38,26 26,38 14,26" fill="${s.label}" opacity="0.35"/>
          <circle cx="8" cy="8" r="3" fill="${s.border}" opacity="0.6"/>
          <circle cx="44" cy="8" r="3" fill="${s.border}" opacity="0.6"/>
          <circle cx="8" cy="44" r="3" fill="${s.border}" opacity="0.6"/>
          <circle cx="44" cy="44" r="3" fill="${s.border}" opacity="0.6"/>
        </svg>`;
        const frameBorder = activeTab === "Gear Pieces" ? "var(--border-mid)" : s.border;
        const frameBg     = activeTab === "Gear Pieces" ? "linear-gradient(160deg,#0c1220,#070b14)" : s.bg;
        const frameGlow   = activeTab === "Gear Pieces" ? "none" : `0 0 16px ${s.glow}`;
        const nameColor   = activeTab === "Gear Pieces" ? "var(--text-primary)" : s.label;
        const imgHtml = icon
          ? `<div class="inv-tile-img-bg" style="background-image:url('${icon}')"></div>`
          : `<div class="inv-tile-img-fb">${svgFallback}</div>`;
        const locsHtml = locs
          ? locs.slice(0,8).map(loc => {
              const n = loc.name || loc.label || loc.id || String(loc);
              return `<div class="inv-popup-loc"><span class="inv-popup-dot" style="background:${s.label}"></span>${n}</div>`;
            }).join("")
          : `<span style="color:var(--text-dim);font-size:11px;font-family:var(--font-mono)">No farming data available.</span>`;
        return `<div class="inv-tile${isLow?" inv-tile--low":""}" tabindex="0">
          ${isLow?`<div class="inv-tile-low-flag">⚠</div>`:""}
          <div class="inv-tile-name" style="color:${nameColor}">${name}</div>
          <div class="inv-tile-frame" style="border-color:${frameBorder};background:${frameBg};box-shadow:${frameGlow},inset 0 0 0 1px rgba(255,255,255,0.04)">
            <div class="inv-tile-icon-inner">${imgHtml}</div>
          </div>
          <div class="inv-tile-own">You own: <span class="inv-tile-qty${isLow?" inv-tile-qty--low":""}">${qty.toLocaleString()}</span></div>
          <div class="inv-popup" style="border-color:${s.border}99">
            <div class="inv-popup-header">
              <div class="inv-popup-swatch" style="border-color:${s.border};background:${s.bg}">
                ${icon?`<div style="width:36px;height:36px;background-image:url('${icon}');background-size:contain;background-repeat:no-repeat;background-position:center"></div>`:svgFallback}
              </div>
              <div>
                <div class="inv-popup-name" style="color:${nameColor}">${name}</div>
                <div class="inv-popup-qty${isLow?" inv-popup-qty--low":""}">${isLow?"⚠ ":""}${qty.toLocaleString()}</div>
              </div>
            </div>
            ${desc?`<div class="inv-popup-desc">${desc}</div>`:""}
            <div class="inv-popup-label">Farming Locations</div>
            <div class="inv-popup-locs">${locsHtml}</div>
          </div>
        </div>`;
      }).join("") + "</div>";

      wrap.querySelectorAll(".inv-tile").forEach(tile => {
        tile.addEventListener("click", function(e) {
          e.stopPropagation();
          const wasOpen = this.classList.contains("inv-tile--open");
          wrap.querySelectorAll(".inv-tile--open").forEach(t => t.classList.remove("inv-tile--open"));
          if (!wasOpen) this.classList.add("inv-tile--open");
        });
      });
      setTimeout(() => {
        document.addEventListener("click", function h() {
          wrap && wrap.querySelectorAll(".inv-tile--open").forEach(t => t.classList.remove("inv-tile--open"));
          document.removeEventListener("click", h);
        }, { once: true });
      }, 0);
    }

    document.getElementById("inv-search").addEventListener("input", function() { searchVal = this.value.toLowerCase(); renderGrid(); });
    document.getElementById("inv-sort").addEventListener("change", function() { sortVal = this.value; renderGrid(); });
    renderTabs();
    renderGrid();
  }

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
        return {
          name: c.id ? splitCase(c.id) : "Unknown", portrait: c.id || "",
          icon: meta.icon || c.portrait || null,
          roles: meta.roles && meta.roles.length ? meta.roles : [],
          role:  meta.roles && meta.roles[0] ? meta.roles[0] : "—",
          teams: meta.teams && meta.teams.length ? meta.teams.map(splitCase) : [],
          team:  meta.teams && meta.teams[0] ? splitCase(meta.teams[0]) : "—",
          tier: c.gearTier ? "T" + c.gearTier : "T1", power: c.power || 0,
          stars: c.activeYellow || 0, redStars: c.activeRed || 0,
          iso: (c.iso8 && c.iso8.active) ? c.iso8.active : "—", level: c.level || 1
        };
      });
      if (chars.length === 0) throw new Error("No characters returned");
      roster = chars; maxPower = Math.max(...roster.map(c => c.power));
      if (squadsRes.ok) {
        const squadsJson = await squadsRes.json();
        const tabs = (squadsJson.data && squadsJson.data.tabs) ? squadsJson.data.tabs : {};
        const tabLabels = { roster:"Roster", blitz:"Blitz", tower:"Tower", raids:"Raids", war:"War" };
        const powerByKey = {};
        roster.forEach(c => { powerByKey[c.name.toLowerCase().replace(/[\s-]/g,"")] = c.power; });
        squads = [];
        Object.entries(tabs).forEach(([tabKey, squadArrays]) => {
          if (!Array.isArray(squadArrays)) return;
          const label = tabLabels[tabKey] || tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
          squadArrays.forEach((memberIds, idx) => {
            if (!Array.isArray(memberIds) || memberIds.length === 0) return;
            squads.push({ name: label + " Squad " + (idx + 1), type: label,
              members: memberIds.filter(Boolean).map(id => {
                const name = id.replace(/([A-Z])/g, " $1").trim();
                return { name, power: powerByKey[id.toLowerCase()] || 0 };
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

  // ── Init ─────────────────────────────────────────────────────────────────────
  (function init() {
    const token = sessionStorage.getItem("msf_token");
    if (token) loadLiveData(token);
  })();

  // ── Event listeners ──────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function() {
    // CSP-safe image error handling — replaces onerror inline handlers
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
    }, true); // capture phase so it fires before bubble

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