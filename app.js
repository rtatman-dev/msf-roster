const CLIENT_ID    = "2255dc00-cc5f-4140-8609-7b445cc11958";
  const REDIRECT_URI = "https://msf-roster.pages.dev/callback";
  const AUTH_URL     = "https://hydra-public.prod.m3.scopelypv.com/oauth2/auth";
  const API_BASE     = "https://api.marvelstrikeforce.com";
  const API_KEY      = "17wMKJLRxy3pYDCKG5ciP7VSU45OVumB2biCzzgw";
  const SCOPE        = "openid m3p.f.pr.ros m3p.f.pr.pro m3p.f.pr.act m3p.f.pr.inv m3p.f.ar.pro";

  const DEMO_ROSTER = [
    {name:"Iron Man",        role:"Blaster",    tier:"T13", power:348000, stars:7, redStars:5, iso:18, team:"Avengers"},
    {name:"Captain America", role:"Tank",       tier:"T13", power:341000, stars:7, redStars:5, iso:18, team:"Avengers"},
    {name:"Thor",            role:"Brawler",    tier:"T12", power:312000, stars:7, redStars:4, iso:16, team:"Avengers"},
    {name:"Black Widow",     role:"Controller", tier:"T12", power:298000, stars:7, redStars:4, iso:15, team:"Avengers"},
    {name:"Hawkeye",         role:"Blaster",    tier:"T11", power:271000, stars:6, redStars:3, iso:14, team:"Avengers"},
    {name:"Spider-Man",      role:"Brawler",    tier:"T13", power:355000, stars:7, redStars:5, iso:18, team:"Web Warriors"},
    {name:"Ghost-Spider",    role:"Support",    tier:"T12", power:309000, stars:7, redStars:4, iso:16, team:"Web Warriors"},
    {name:"Scarlet Witch",   role:"Controller", tier:"T11", power:265000, stars:6, redStars:3, iso:13, team:"Brotherhood"},
    {name:"Magneto",         role:"Controller", tier:"T12", power:305000, stars:7, redStars:4, iso:15, team:"Brotherhood"},
    {name:"Mystique",        role:"Blaster",    tier:"T10", power:241000, stars:6, redStars:2, iso:12, team:"Brotherhood"},
    {name:"Wolverine",       role:"Brawler",    tier:"T11", power:278000, stars:6, redStars:3, iso:14, team:"X-Men"},
    {name:"Cyclops",         role:"Blaster",    tier:"T10", power:235000, stars:5, redStars:2, iso:11, team:"X-Men"},
    {name:"Storm",           role:"Controller", tier:"T11", power:262000, stars:6, redStars:3, iso:13, team:"X-Men"},
    {name:"Colossus",        role:"Tank",       tier:"T10", power:228000, stars:5, redStars:2, iso:10, team:"X-Men"},
    {name:"Luke Cage",       role:"Tank",       tier:"T9",  power:198000, stars:5, redStars:1, iso:8,  team:"Defenders"},
    {name:"Jessica Jones",   role:"Brawler",    tier:"T9",  power:193000, stars:5, redStars:1, iso:8,  team:"Defenders"},
    {name:"Daredevil",       role:"Brawler",    tier:"T8",  power:171000, stars:4, redStars:1, iso:6,  team:"Defenders"},
    {name:"Iron Fist",       role:"Support",    tier:"T8",  power:168000, stars:4, redStars:0, iso:5,  team:"Defenders"},
    {name:"Thanos",          role:"Tank",       tier:"T13", power:362000, stars:7, redStars:5, iso:18, team:"Infinity Watch"},
    {name:"Gamora",          role:"Brawler",    tier:"T12", power:318000, stars:7, redStars:4, iso:16, team:"Guardians"},
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
  let raidIds      = [];
  let ddIds        = [];
  let allianceCard = null;
  let campaigns    = [];
  let squads   = [];
  let card     = null;
  let maxPower = 1;

  // ── Tab switching ──────────────────────────────────────────────────────────
  function switchTab(name) {
    ["roster","squads","ai","card","activities","inventory"].forEach(t => {
      document.getElementById("panel-" + t).classList.toggle("hidden", t !== name);
      document.getElementById("tab-" + t).classList.toggle("active", t === name);
    });
  }

  // ── PKCE ───────────────────────────────────────────────────────────────────
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

  // ── Demo mode ──────────────────────────────────────────────────────────────
  function useDemoMode() {
    roster   = [...DEMO_ROSTER];
    squads   = [...DEMO_SQUADS];
    maxPower = Math.max(...roster.map(c => c.power));
    showApp(false);
  }

  // ── Show app ───────────────────────────────────────────────────────────────
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

  // ── Load live data ─────────────────────────────────────────────────────────
  async function loadLiveData(token) {
    const badge = document.getElementById("mode-badge");
    badge.textContent = "Loading..."; badge.className = "status-badge loading";

    const headers = { "Authorization": "Bearer " + token, "x-api-key": API_KEY };

    try {
      // Fetch roster and squads in parallel
      const [rosterRes, squadsRes, cardRes, gameCharsRes, eventsRes, inventoryRes, raidListRes, ddListRes, allianceRes, campaignRes] = await Promise.all([
        fetch(API_BASE + "/player/v1/roster",  { headers }),
        fetch(API_BASE + "/player/v1/squads",  { headers }),
        fetch(API_BASE + "/player/v1/card",    { headers }),
        fetch(API_BASE + "/game/v1/characters?traitFormat=id&perPage=500", { headers }),
        fetch(API_BASE + "/player/v1/events",  { headers }),
        fetch(API_BASE + "/player/v1/inventory", { headers }),
        fetch(API_BASE + "/game/v1/raids",     { headers }),
        fetch(API_BASE + "/game/v1/dds",       { headers }),
        fetch(API_BASE + "/player/v1/alliance/card", { headers }),
        fetch(API_BASE + "/game/v1/episodics/campaign", { headers })
      ]);

      // Log all response statuses immediately
      console.log("Roster:", rosterRes.status, "Squads:", squadsRes.status, "Card:", cardRes.status, "GameChars:", gameCharsRes.status, "Events:", eventsRes.status, "Inventory:", inventoryRes.status);

      if (!rosterRes.ok) throw new Error("Roster: HTTP " + rosterRes.status);

      const rosterJson = await rosterRes.json();
      // Build a lookup of game character metadata (roles, teams)
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
          gameCharsMap[gc.id] = { roles, teams };
        });
        window._gameCharsMap = gameCharsMap;
        console.log("Game chars loaded:", Object.keys(gameCharsMap).length);
      }

      const chars = (rosterJson.data || []).map(c => {
        const meta = gameCharsMap[c.id] || {};
        const splitCase = s => s.replace(/([A-Z])/g, " $1").trim();
        return {
          name:     c.id ? splitCase(c.id) : "Unknown",
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

      // Squads: API returns { data: { tabs: { roster: [[heroId,...]], raids: [[...]], ... } } }
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
              name: label + " Squad " + (idx + 1),
              type: label,
              members: memberIds.filter(Boolean).map(id => {
                const name = id.replace(/([A-Z])/g, " $1").trim();
                const key  = id.toLowerCase();
                return { name, power: powerByKey[key] || 0 };
              })
            });
          });
        });
      } else {
        console.warn("Squads endpoint returned", squadsRes.status);
      }

      // Card
      if (cardRes.ok) {
        const cardJson = await cardRes.json();
        console.log("Card raw response:", JSON.stringify(cardJson).substring(0, 600));
        card = cardJson.data || cardJson;
      }

      // Events
      if (eventsRes.ok) {
        const eventsJson = await eventsRes.json();
        playerEvents = eventsJson.data || [];
      }

      // Inventory
      if (inventoryRes.ok) {
        const inventoryJson = await inventoryRes.json();
        playerInventory = inventoryJson.data || [];
      }

      // Raids list
      if (raidListRes.ok) {
        const raidListJson = await raidListRes.json();
        raidIds = (raidListJson.data || []).map(r => r.id).filter(Boolean);
      }

      // Dark Dimensions list
      if (ddListRes.ok) {
        const ddListJson = await ddListRes.json();
        ddIds = (ddListJson.data || []).map(d => d.id).filter(Boolean);
      }

      // Alliance card
      if (allianceRes.ok) {
        const allianceJson = await allianceRes.json();
        allianceCard = allianceJson.data || null;
      }

      // Campaigns
      if (campaignRes.ok) {
        const campaignJson = await campaignRes.json();
        campaigns = campaignJson.data || [];
      }



      showApp(true);
    } catch (e) {
      console.error("Live load failed:", e.message, e.stack);
      useDemoMode();
      setTimeout(() => alert("Could not load live data (" + e.message + ").\n\nShowing demo data instead."), 300);
    }
  }

  // ── Populate team filter ──────────────────────────────────────────────────
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

  // ── Render metrics ─────────────────────────────────────────────────────────
  function renderMetrics() {
    const avg = Math.round(roster.reduce((a, c) => a + c.power, 0) / roster.length);
    const top = Math.max(...roster.map(c => c.power));
    const t13 = roster.filter(c => c.tier === "T13").length;
    document.getElementById("metrics").innerHTML = `
      <div class="metric"><div class="metric-label">Characters</div><div class="metric-val">${roster.length}</div></div>
      <div class="metric"><div class="metric-label">Avg power</div><div class="metric-val">${Math.round(avg/1000)}k</div></div>
      <div class="metric"><div class="metric-label">Top power</div><div class="metric-val">${Math.round(top/1000)}k</div></div>
      <div class="metric"><div class="metric-label">T13 chars</div><div class="metric-val">${t13}</div></div>
      <div class="metric"><div class="metric-label">Saved squads</div><div class="metric-val">${squads.length}</div></div>
    `;
  }

  // ── Render roster ──────────────────────────────────────────────────────────
  function tierClass(t) {
    if (t === "T13") return "tier-T13"; if (t === "T12") return "tier-T12";
    if (t === "T11") return "tier-T11"; if (t === "T10") return "tier-T10";
    return "tier-low";
  }

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
    document.getElementById("roster").innerHTML = filtered.length ? filtered.map((c, i) => `
      <div class="char-card" data-modal-idx="${i}">
        <div class="char-name">${c.name}</div>
        <div class="char-role">${c.roles && c.roles.length ? c.roles.join(" / ") : "—"}</div>
        <div class="char-teams" style="font-size:11px;color:#888;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.teams && c.teams.length ? c.teams.join(", ") : "—"}</div>
        <span class="tier-badge ${tierClass(c.tier)}">${c.tier}</span>
        <div class="stat-row"><span class="stat-label">Power</span><span class="stat-val">${Math.round(c.power/1000)}k</span></div>
        <div class="stat-row"><span class="stat-label">Stars</span><span class="stat-val">${c.stars}&#9733; (${c.redStars} red)</span></div>
        <div class="stat-row"><span class="stat-label">Level</span><span class="stat-val">${c.level || "—"}</span></div>
        <div class="stat-row"><span class="stat-label">ISO class</span><span class="stat-val">${c.iso}</span></div>
        <div class="power-bar-bg"><div class="power-bar" style="width:${Math.round(c.power/maxPower*100)}%"></div></div>
      </div>
    `).join("") : '<p class="empty-state">No characters match your filters.</p>';
  }

  // ── Render squads ──────────────────────────────────────────────────────────
  function renderSquads() {
    if (!squads.length) {
      document.getElementById("squads").innerHTML = '<p class="empty-state">No saved squads found. Save squads in-game and they will appear here.</p>';
      return;
    }
    document.getElementById("squads").innerHTML = squads.map(s => {
      const total = s.members.reduce((a, m) => a + m.power, 0);
      const membersHtml = s.members.map(m => `
        <div class="squad-member">
          <span class="squad-member-name">${m.name}</span>
          <span class="squad-member-power">${m.power ? Math.round(m.power/1000) + "k" : "—"}</span>
        </div>
      `).join("");
      return `
        <div class="squad-card">
          <div class="squad-name">${s.name}</div>
          <div class="squad-type">${s.type || "Squad"}</div>
          <div class="squad-members">${membersHtml || '<span style="font-size:12px;color:#aaa">No members listed</span>'}</div>
          ${total ? `<div class="squad-total"><span class="squad-total-label">Total power</span><span>${Math.round(total/1000)}k</span></div>` : ""}
        </div>
      `;
    }).join("");
  }

  // ── AI chat ────────────────────────────────────────────────────────────────
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
    const byTeam = {};
    roster.forEach(c => { if (!byTeam[c.team]) byTeam[c.team] = []; byTeam[c.team].push(c); });
    const teams = Object.entries(byTeam).map(([team, chars]) => {
      const avg = Math.round(chars.reduce((a, c) => a + c.power, 0) / chars.length / 1000);
      return "  " + team + ": " + chars.length + " chars, avg " + avg + "k, tiers: " + chars.map(c => c.tier).join(", ");
    }).join("\n");
    const squadSummary = squads.length
      ? squads.map(function(s) {
          const total = s.members.reduce((a, m) => a + m.power, 0);
          return "  " + s.name + " (" + (s.type || "Squad") + "): " + s.members.map(m => m.name).join(", ") + " — total " + Math.round(total/1000) + "k";
        }).join("\n")
      : "  No saved squads.";
    return "Roster:\n- Total: " + roster.length + " characters\n- Avg power: " + Math.round(roster.reduce((a,c)=>a+c.power,0)/roster.length/1000) + "k\n- T13 count: " + roster.filter(c=>c.tier==="T13").length + "\n\nBy team:\n" + teams + "\n\nSaved squads:\n" + squadSummary;
  }

  function addMessage(role, text, isLoading) {
    const container = document.getElementById("ai-messages");
    const div = document.createElement("div");
    div.className = "ai-msg " + role + (isLoading ? " loading" : "");
    const bubble = document.createElement("div");
    bubble.className = "ai-msg-bubble";
    bubble.textContent = text;
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

    const loadingEl = addMessage("assistant", "Thinking...", true);

    const systemPrompt = "You are an expert Marvel Strike Force advisor helping the player SuperZero. Here is their current roster and squad data:\n\n" + buildContext() + "\n\nProvide specific, actionable advice referencing their actual characters, teams, and squads. Be conversational and concise. Remember previous messages in this conversation.";

    try {
      const res = await fetch("https://msf-ai-proxy.rtatman-shops.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: systemPrompt,
          messages: chatHistory
        })
      });
      const data = await res.json();
      const reply = data.content ? data.content.map(b => b.type === "text" ? b.text : "").join("") : "Sorry, I couldn't get a response. Try again.";

      loadingEl.classList.remove("loading");
      loadingEl.querySelector(".ai-msg-bubble").textContent = reply;
      document.getElementById("ai-messages").scrollTop = document.getElementById("ai-messages").scrollHeight;

      chatHistory.push({ role: "assistant", content: reply });
      saveChatHistory();
    } catch (e) {
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
    const container = document.getElementById("ai-messages");
    container.innerHTML = "";
    addMessage("assistant", "Chat cleared! Ask me anything about your roster, squads, or strategy.");
  }

  // ── Render player card ────────────────────────────────────────────────────
  function renderCard() {
    const el = document.getElementById("player-card");
    if (!card) {
      el.innerHTML = '<p style="padding:3rem;text-align:center;color:#aaa;font-size:14px">Player card not available. Try signing out and back in.</p>';
      return;
    }

    const name       = card.name || "Commander";
    const level      = (card.level && card.level.completedTier) ? card.level.completedTier : (card.level || "—");
    const tcp        = card.tcp || 0;
    const stp        = card.stp || 0;
    const chars      = card.charactersCollected || roster.length;
    const arena      = card.latestArena || "—";
    const blitz      = card.latestBlitz ? Math.round(card.latestBlitz/1000) + "k" : "—";
    const blitzWins  = card.blitzWins || "—";
    const initials   = name.split(" ").map(function(w){ return w[0]; }).join("").substring(0, 2).toUpperCase() || "??";

    var html = '<div class="player-card-wrap"><div class="player-card-box">';
    html += '<div class="player-card-header">';
    html += '<div class="player-avatar">' + initials + '</div>';
    html += '<div><div class="player-name">' + name + '</div>';
    html += '<div class="player-level">Level ' + level + '</div></div></div>';
    html += '<div class="player-stats">';
    html += '<div class="player-stat"><div class="player-stat-label">Total char power</div><div class="player-stat-val">' + (tcp ? Math.round(tcp/1000) + "k" : "—") + '</div></div>';
    html += '<div class="player-stat"><div class="player-stat-label">Characters</div><div class="player-stat-val">' + chars + '</div></div>';
    html += '<div class="player-stat"><div class="player-stat-label">Arena rank</div><div class="player-stat-val">' + arena + '</div></div>';
    html += '<div class="player-stat"><div class="player-stat-label">Blitz score</div><div class="player-stat-val">' + blitz + '</div></div>';
    html += '<div class="player-stat"><div class="player-stat-label">Blitz wins</div><div class="player-stat-val">' + blitzWins + '</div></div>';
    html += '<div class="player-stat"><div class="player-stat-label">Squad power</div><div class="player-stat-val">' + (stp ? Math.round(stp/1000) + "k" : "—") + '</div></div>';
    html += '</div></div></div>';
    el.innerHTML = html;
  }

    // ── Build inventory lookup ─────────────────────────────────────────────────
  function getInventoryMap() {
    const map = {};
    playerInventory.forEach(item => { map[item.item] = item.quantity; });
    return map;
  }

  // ── Star thresholds (shards needed per star level) ─────────────────────────
  const STAR_THRESHOLDS = [0, 10, 25, 45, 75, 105, 140, 175];

  // ── Character modal ────────────────────────────────────────────────────────
  async function openModal(idx) {
    const c = (window._filteredRoster || [])[idx];
    if (!c) return;

    document.getElementById("modal-name").textContent = c.name;

    const tierEl = document.getElementById("modal-tier-badge");
    tierEl.innerHTML = '<span class="tier-badge ' + tierClass(c.tier) + '" style="margin-top:6px;display:inline-block">' + c.tier + '</span>';

    const rolesEl = document.getElementById("modal-roles");
    rolesEl.innerHTML = c.roles && c.roles.length
      ? c.roles.map(r => '<span class="modal-badge role">' + r + '</span>').join("")
      : '<span style="font-size:13px;color:#aaa">Unknown</span>';

    const teamsEl = document.getElementById("modal-teams");
    teamsEl.innerHTML = c.teams && c.teams.length
      ? c.teams.map(t => '<span class="modal-badge">' + t + '</span>').join("")
      : '<span style="font-size:13px;color:#aaa">None</span>';

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
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">' +
        '<span>' + shardsOwned + ' shards owned</span>' +
        (currentStars < 7 ? '<span style="color:#888">' + nextStarNeeded + ' needed for ' + (currentStars+1) + '★</span>' : '<span style="color:#27500a">Max stars!</span>') +
        '</div>' +
        '<div class="modal-shard-bar"><div class="modal-shard-fill" style="width:' + pct + '%"></div></div>' +
        '<a href="https://msf.gg/characters/' + c.name.replace(/ /g, "") + '" target="_blank" style="font-size:11px;color:#378add;display:block;margin-top:6px;text-decoration:none">View farming locations on msf.gg ↗</a>';
    } else {
      shardsEl.innerHTML = '<span style="font-size:13px;color:#aaa">No shards in inventory</span>';
    }

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

    document.getElementById("char-modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Fetch gear data for next tier
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
        gearEl.innerHTML = '<span style="font-size:13px;color:#aaa">' + (nextTierNum > 20 ? "Max gear tier reached!" : "No gear data for T" + nextTierNum) + '</span>';
      } else {
        const slots = nextTier.slots;
        gearEl.className = "modal-gear-grid";
        gearEl.innerHTML = slots.map(slot => {
          const piece = slot.piece;
          const pieceId = piece.id;
          const owned = invMap[pieceId] || 0;
          const needed = slot.level || 1;
          const hasEnough = owned >= needed;
          return '<div class="modal-gear-piece" style="border:1px solid ' + (hasEnough ? "#c3e6cb" : "#e8e8e5") + '">' +
            '<img class="modal-gear-icon" src="' + piece.icon + '" onerror="this.style.display=\"none\"" />' +
            '<div class="modal-gear-name">' + piece.name + '</div>' +
            '<div class="modal-gear-level" style="color:' + (hasEnough ? "#27500a" : "#633806") + '">' +
            'Have: ' + owned + ' / Need: ' + needed + '</div>' +
            '</div>';
        }).join("");
      }
    } catch(e) {
      gearEl.className = "";
      gearEl.innerHTML = '<span style="font-size:13px;color:#aaa">Could not load gear data.</span>';
    }
  }

  function closeModal(e) {
    if (e && e.target !== document.getElementById("char-modal")) return;
    document.getElementById("char-modal").classList.add("hidden");
    document.body.style.overflow = "";
  }

  // ── Activity modal ────────────────────────────────────────────────────────
  async function openActivityModal(ev) {
    if (typeof ev === "number") ev = playerEvents[ev];
    if (!ev) return;

    document.getElementById("act-modal-title").textContent = ev.name || "Event";
    document.getElementById("act-modal-sub").textContent = ev.subName || "";
    document.getElementById("act-modal-details").textContent = ev.details || "No details available.";

    // Tiers
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

    // Build recommended squad from roster based on trait keywords in details
    const squadEl = document.getElementById("act-modal-squad");
    squadEl.textContent = "Analyzing your roster...";

    const details = (ev.details || "") + " " + (ev.name || "");
    const traitKeywords = ["Horsemen","Mystic","Mutant","Bio","MSF Original","Cosmic","Tech","Skill","City","Hero","Villain","Avenger","Guardian","Spider","X-Men","Fantastic","Defender","Inhumans"];
    const matchedTraits = traitKeywords.filter(t => details.toLowerCase().includes(t.toLowerCase()));

    // Score roster chars by how many matching traits they have
    const scored = roster.map(c => {
      let score = 0;
      const charTeams = (c.teams || []).join(" ") + " " + (c.roles || []).join(" ");
      matchedTraits.forEach(t => { if (charTeams.toLowerCase().includes(t.toLowerCase())) score++; });
      return { ...c, score };
    }).filter(c => c.score > 0 || matchedTraits.length === 0)
      .sort((a, b) => b.power - a.power)
      .slice(0, 5);

    if (scored.length === 0) {
      squadEl.innerHTML = '<span style="color:#aaa;font-size:13px">No matching characters found in your roster.</span>';
    } else {
      squadEl.className = "activity-modal-squad";
      squadEl.innerHTML = scored.map(c =>
        '<div class="activity-squad-member">' +
        '<div class="activity-squad-name">' + c.name + '</div>' +
        '<div class="activity-squad-power">' + Math.round(c.power/1000) + 'k · ' + c.tier + '</div>' +
        '</div>'
      ).join("");
    }

    // Fetch episodic detail if available
    if (ids.length && ev.type === "episodic") {
      try {
        const token = sessionStorage.getItem("msf_token");
        const headers = { "x-api-key": API_KEY, "Authorization": "Bearer " + token };
        const hardId = ids.find(id => id.endsWith("_C")) || ids[0];
        const res = await fetch(API_BASE + "/game/v1/episodics/" + (episodic.type || "eventCampaign") + "/" + hardId, { headers });
        if (res.ok) {
          const epData = await res.json();
          const ep = epData.data;
          if (ep && ep.chapters) {
            const chapterCount = ep.numChapters || Object.keys(ep.chapters).length;
            const firstChapter = ep.chapters["1"];
            const tierCount = firstChapter ? firstChapter.numTiers : "?";
            document.getElementById("act-modal-details").textContent =
              (ep.details || ev.details || "") + "\n\n" + chapterCount + " chapter(s) · " + tierCount + " tier(s) per chapter";
          }
        }
      } catch(e) { console.warn("Episodic fetch failed:", e.message); }
    }
  }

  function closeActivityModal(e) {
    if (e && e.target !== document.getElementById("activity-modal")) return;
    document.getElementById("activity-modal").classList.add("hidden");
    document.body.style.overflow = "";
  }

  // ── Render activities (unified: events + raids + DDs) ────────────────────
  async function renderActivities() {
    const el = document.getElementById("activities-content");
    if (!el) return;
    el.innerHTML = '<div style="color:#aaa;font-size:14px;padding:1rem 0">Loading activities...</div>';

    const token = sessionStorage.getItem("msf_token");
    const headers = { "x-api-key": API_KEY, "Authorization": "Bearer " + token };

    const now = Date.now() / 1000;

    function timeRemaining(endTime) {
      const diff = endTime - now;
      if (diff <= 0) return "Ended";
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      if (days > 0) return days + "d " + hours + "h remaining";
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

    function cardHTML(id, typeLabel, typeBadgeColor, name, subName, detail, metaLine, timeOrReq) {
      return '<div class="event-card" id="card-' + id + '" data-activity-id="' + id + '" style="cursor:pointer">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div>' +
        '<div class="event-type-badge" style="background:' + typeBadgeColor + ';color:#fff">' + typeLabel + '</div>' +
        '<div class="event-name">' + name + '</div>' +
        (subName ? '<div class="event-subname">' + subName + '</div>' : '') +
        '</div>' +
        '<div style="font-size:11px;color:#888;white-space:nowrap;padding-left:8px;margin-top:2px">' + (timeOrReq || "") + '</div>' +
        '</div>' +
        '<div class="activity-expand hidden" id="expand-' + id + '">' +
        (detail ? '<div style="font-size:13px;color:#555;line-height:1.6;margin:10px 0">' + detail + '</div>' : '') +
        (metaLine ? '<div style="font-size:11px;color:#888;margin-bottom:6px">' + metaLine + '</div>' : '') +
        '<div class="gm-squad" style="margin-top:8px">' +
        '<div class="gm-squad-title">Best matching squad from your roster</div>' +
        '<div id="squad-' + id + '"><span style="color:#aaa;font-size:12px;font-style:italic">Loading recommendation...</span></div>' +
        '</div></div>' +
        '</div>';
    }

    let html = "";
    window._activityData = {};

    // ── Active Events ──────────────────────────────────────────────────────
    const activeEvents = playerEvents.filter(ev => ev.endTime > now);
    const endedEvents  = playerEvents.filter(ev => ev.endTime <= now);

    if (activeEvents.length) {
      html += '<div class="section-header">Active Events <span style="font-size:13px;color:#aaa;font-weight:400">(' + activeEvents.length + ')</span></div>';
      html += '<div class="activities-grid">';
      activeEvents.forEach((ev, i) => {
        const remaining = timeRemaining(ev.endTime);
        const ids = ev.episodic && ev.episodic.ids || [];
        const tiers = ids.length ? ids.map(id => {const s=id.slice(-1); return {A:"Easy",B:"Normal",C:"Hard"}[s]||s;}).join(" / ") : "";
        html += cardHTML(
          "ev-" + i,
          formatType(ev.episodic && ev.episodic.typeName || ev.type || "Event"),
          "#1a56a0",
          ev.name || "Event",
          ev.subName || "",
          ev.details || "",
          tiers ? "Difficulties: " + tiers : "",
          "⏱ " + remaining
        );
      });
      html += '</div>';
    }

    // ── Raids ──────────────────────────────────────────────────────────────
    html += '<div class="section-header" style="margin-top:1.5rem">Raids <span style="font-size:13px;color:#aaa;font-weight:400">(' + raidIds.length + ')</span></div>';
    html += '<div class="activities-grid" id="raids-cards">';
    if (raidIds.length === 0) {
      html += '<span style="color:#aaa;font-size:13px">No raids available.</span>';
    } else {
      html += '<div style="color:#aaa;font-size:13px;font-style:italic">Loading raids...</div>';
    }
    html += '</div>';

    // ── Dark Dimensions ────────────────────────────────────────────────────
    html += '<div class="section-header" style="margin-top:1.5rem">Dark Dimensions <span style="font-size:13px;color:#aaa;font-weight:400">(' + ddIds.length + ')</span></div>';
    html += '<div class="activities-grid" id="dds-cards">';
    if (ddIds.length === 0) {
      html += '<span style="color:#aaa;font-size:13px">No Dark Dimensions available.</span>';
    } else {
      html += '<div style="color:#aaa;font-size:13px;font-style:italic">Loading Dark Dimensions...</div>';
    }
    html += '</div>';

    // ── Campaigns ─────────────────────────────────────────────────────────
    if (campaigns.length > 0) {
      html += '<div class="section-header" style="margin-top:1.5rem">Campaigns <span style="font-size:13px;color:#aaa;font-weight:400">(' + campaigns.length + ')</span></div>';
      html += '<div class="activities-grid">';
      campaigns.forEach((camp, i) => {
        const id = "camp-" + i;
        const numChapters = camp.numChapters || Object.keys(camp.chapters || {}).length;
        // Extract trait requirements
        const traitReqs = [];
        if (camp.requirements && camp.requirements.anyCharacterFilters) {
          camp.requirements.anyCharacterFilters.forEach(f => {
            (f.allTraits || []).forEach(t => traitReqs.push(t.name));
          });
        }
        const minChars = camp.requirements && camp.requirements.minCharacters;
        const reqStr = [
          minChars ? minChars + " characters" : "",
          traitReqs.length ? traitReqs.join(", ") : ""
        ].filter(Boolean).join(" · ");
        const detail = (camp.details || "") + (reqStr ? "\nRequires: " + reqStr : "") + "\n" + numChapters + " chapters";
        window._activityData[id] = { name: camp.name + " Campaign", detail: camp.details || "" };
        html += cardHTML(id, "Campaign", "#5b2b8c", camp.name || camp.id, reqStr, camp.details || "", numChapters + " chapters", "");
      });
      html += '</div>';
    }

    // ── Ended Events (collapsed) ───────────────────────────────────────────
    if (endedEvents.length) {
      html += '<div class="section-header" style="margin-top:1.5rem;color:#aaa">Ended Events <span style="font-size:13px;font-weight:400">(' + endedEvents.length + ')</span></div>';
      html += '<div class="activities-grid">';
      endedEvents.forEach((ev, i) => {
        html += cardHTML("ev-ended-" + i, formatType(ev.type || "Event"), "#aaa", ev.name || "Event", ev.subName || "", ev.details || "", "", "Ended");
      });
      html += '</div>';
    }

    el.innerHTML = html;

    // Store event data for squad recommendations
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
          return cardHTML(id, "Raid", "#27500a", raid.name || raid.id, raid.subName || "", reqs, rewards.length ? "Boss drops: " + rewards.join(", ") : "", raid.teams ? raid.teams + " teams · " + raid.hours + "h" : "");
        }).join("") || '<span style="color:#aaa;font-size:13px">No raid data.</span>';
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
          return cardHTML(id, "Dark Dimension", "#633806", dd.name || dd.id, dd.subName || "", reqs, tiers ? tiers + " completion tiers" : "", "");
        }).join("") || '<span style="color:#aaa;font-size:13px">No Dark Dimension data.</span>';
      }
    }
  }

  // Store which cards are expanded
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
        squadEl.innerHTML = "<span style=\'color:#aaa;font-size:12px;font-style:italic\'>Looking up meta team...</span>";
        queueMetaSquad(data.name, data.detail, squadEl);
      }
    }
  }

  // ── AI request queue ──────────────────────────────────────────────────────
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
    // Build compact roster summary of chars T8+
    const rosterSummary = roster
      .filter(c => (parseInt((c.tier||"T1").replace("T",""))||1) >= 8)
      .sort((a,b) => b.power - a.power)
      .slice(0, 80)
      .map(c => c.name + " (" + c.tier + ")")
      .join(", ");

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

      // Extract text from potentially mixed content blocks
      const reply = (data.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n")
        .trim();

      if (!reply) throw new Error("No response");

      const metaLine  = reply.split("\n").find(l => l.startsWith("META:"));
      const hasLine   = reply.split("\n").find(l => l.startsWith("PLAYER HAS:"));
      const recLine   = reply.split("\n").find(l => l.startsWith("RECOMMENDED:"));
      const noteLine  = reply.split("\n").find(l => l.startsWith("NOTE:"));

      const hasVal = hasLine ? hasLine.replace("PLAYER HAS:","").trim() : "";
      const hasColor = hasVal === "Yes" ? "#27500a" : hasVal === "Partial" ? "#795700" : "#a32d2d";

      let html = "";
      if (metaLine) html += "<div style=\'font-size:11px;color:#888;margin-bottom:4px\'>" + metaLine + "</div>";
      if (hasLine)  html += "<div style=\'font-size:11px;font-weight:600;color:" + hasColor + ";margin-bottom:8px\'>" + hasLine + "</div>";
      if (recLine) {
        const names = recLine.replace("RECOMMENDED:","").trim().split(",").map(n => n.trim()).filter(Boolean);
        html += "<div class=\'activity-modal-squad\'>" +
          names.map(name => {
            const match = roster.find(c => c.name.toLowerCase() === name.toLowerCase());
            const sub = match ? Math.round(match.power/1000) + "k · " + match.tier : "";
            return "<div class=\'activity-squad-member\'><div class=\'activity-squad-name\'>" + name + "</div>" +
              (sub ? "<div class=\'activity-squad-power\'>" + sub + "</div>" : "") + "</div>";
          }).join("") + "</div>";
      }
      if (noteLine) html += "<div style=\'font-size:11px;color:#888;margin-top:8px;font-style:italic\'>" + noteLine.replace("NOTE:","").trim() + "</div>";

      squadEl.innerHTML = html || "<span style=\'color:#aaa;font-size:12px\'>No recommendation available.</span>";

    } catch(e) {
      // Fallback to keyword matching if AI fails
      const fullText = modeName + " " + modeDetail;
      const tierMatch = fullText.match(/Gear Tier (\d+)/i);
      const minTier = tierMatch ? parseInt(tierMatch[1]) : 0;
      const knownTraits = ["Horsemen","Mystic","Mutant","Bio","Cosmic","Tech","Skill","City",
        "Avenger","Guardian","Spider","Fantastic","Defender","Inhumans","Retcon","Alpha",
        "Uncanny","Weapon","Villain","Hero","Shield","Military","Wakandan","Kree",
        "Hydra","Hand","Symbiote","Asgardian","Mercenary","Ravager"];
      const capsWords = (fullText.match(/\b[A-Z][A-Z]{2,}\b/g) || [])
        .map(w => w.charAt(0) + w.slice(1).toLowerCase());
      const matchedTraits = [...new Set([...capsWords, ...knownTraits.filter(t => fullText.toLowerCase().includes(t.toLowerCase()))])];
      const scored = roster
        .filter(c => !minTier || (parseInt((c.tier||"T1").replace("T",""))||1) >= minTier)
        .map(c => {
          const ct = (c.teams||[]).join(" ").toLowerCase();
          return { ...c, score: matchedTraits.filter(t => ct.includes(t.toLowerCase())).length };
        })
        .filter(c => matchedTraits.length === 0 || c.score > 0)
        .sort((a,b) => b.power - a.power).slice(0, 5);
      squadEl.innerHTML = "<div style=\'font-size:11px;color:#aaa;margin-bottom:6px\'>Keyword match (AI unavailable)</div>" +
        "<div class=\'activity-modal-squad\'>" +
        scored.map(c => "<div class=\'activity-squad-member\'><div class=\'activity-squad-name\'>" + c.name + "</div><div class=\'activity-squad-power\'>" + Math.round(c.power/1000) + "k · " + c.tier + "</div></div>").join("") +
        "</div>";
    }
  }

  // ── Render inventory ───────────────────────────────────────────────────────
  function renderInventory() {
    const el = document.getElementById("inventory-content");
    if (!el) return;

    if (!playerInventory.length) {
      el.innerHTML = '<p style="color:#aaa;font-size:14px;padding:2rem 0">No inventory data available.</p>';
      return;
    }

    function formatItemName(id) {
      if (!id) return "Unknown";
      return id
        .replace(/^SHARD_/, "")
        .replace(/^CONSUMABLE_/, "")
        .replace(/^GEAR_/, "")
        .replace(/^ORB_/, "")
        .replace(/^MATERIAL_/, "")
        .replace(/^CURRENCY_/, "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\w/g, c => c.toUpperCase());
    }

    function getCategory(id) {
      if (!id) return "Other";
      if (id.startsWith("SHARD_")) return "Character Shards";
      if (id.startsWith("CONSUMABLE_")) return "Consumables";
      if (id.startsWith("GEAR_") || id.startsWith("MATERIAL_")) return "Gear & Materials";
      if (id.startsWith("ORB_")) return "Orbs";
      if (id.startsWith("CURRENCY_")) return "Currency";
      if (id.includes("ISO") || id.includes("ORANGE") || id.includes("TEAL")) return "ISO & Special";
      return "Other";
    }

    const grouped = {};
    playerInventory.forEach(item => {
      const cat = getCategory(item.item);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    const order = ["Character Shards", "Consumables", "Gear & Materials", "Orbs", "Currency", "ISO & Special", "Other"];
    order.sort((a, b) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      return ai - bi;
    });

    let html = "";
    order.forEach(cat => {
      if (!grouped[cat] || !grouped[cat].length) return;
      const items = grouped[cat].sort((a, b) => b.quantity - a.quantity);
      html += '<div class="inv-section">';
      html += '<div class="inv-section-title">' + cat + ' (' + items.length + ')</div>';
      html += '<div class="inv-grid">';
      items.forEach(item => {
        html += '<div class="inv-item">';
        html += '<span class="inv-item-name">' + formatItemName(item.item) + '</span>';
        html += '<span class="inv-item-qty">' + item.quantity.toLocaleString() + '</span>';
        html += '</div>';
      });
      html += '</div></div>';
    });

    el.innerHTML = html;
  }

  // ── Render game modes ─────────────────────────────────────────────────────
  async function renderGameModes() {
    const el = document.getElementById("gamemodes-content");
    if (!el) return;
    el.innerHTML = '<div class="gm-loading">Loading game mode data...</div>';

    const token = sessionStorage.getItem("msf_token");
    const headers = { "x-api-key": API_KEY, "Authorization": "Bearer " + token };

    // Helper: extract requirement text from details
    function parseReqs(details) {
      if (!details) return "";
      const lines = details.split("\n").filter(l => l.trim().startsWith("-"));
      return lines.map(l => l.trim().replace(/^-\s*/, "")).join(" · ");
    }

    // Helper: ask AI for meta squad recommendation
    async function aiSquadRec(modeName, modeDetails, containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = '<span style="color:#aaa;font-size:12px;font-style:italic">Analyzing...</span>';

      const rosterSummary = roster
        .filter(c => (parseInt((c.tier||"T1").replace("T",""))||1) >= 8)
        .sort((a,b) => b.power - a.power)
        .slice(0, 60)
        .map(c => c.name + " (" + c.tier + ", " + Math.round(c.power/1000) + "k, teams: " + (c.teams||[]).slice(0,2).join("/") + ")")
        .join(", ");

      const prompt = "You are an expert Marvel Strike Force advisor. For the game mode: " + modeName + "\nRequirements: " + modeDetails + "\n\nPlayer roster (top 60 by power): " + rosterSummary + "\n\nWhat is the current MSF meta team for this game mode? Then check if the player has those characters. If yes, recommend them. If not, recommend the best available alternative squad from the player roster. Respond in this exact format:\nMeta team: [character names]\nPlayer has meta: [Yes/No/Partial]\nRecommended squad: [5 character names from player roster]\nReason: [1 sentence]";

      try {
        const res = await fetch("https://msf-ai-proxy.rtatman-shops.workers.dev", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await res.json();
        const reply = data.content ? data.content.map(b => b.type === "text" ? b.text : "").join("") : "";

        if (!reply || !el) return;

        // Parse the structured response
        const lines = reply.split("\n").filter(l => l.trim());
        const metaLine    = lines.find(l => l.startsWith("Meta team:"));
        const hasLine     = lines.find(l => l.startsWith("Player has meta:"));
        const squadLine   = lines.find(l => l.startsWith("Recommended squad:"));
        const reasonLine  = lines.find(l => l.startsWith("Reason:"));

        let html = "";
        if (metaLine) html += '<div style="font-size:11px;color:#888;margin-bottom:4px">' + metaLine + '</div>';
        if (hasLine) {
          const status = hasLine.replace("Player has meta:","").trim();
          const color = status === "Yes" ? "#27500a" : status === "Partial" ? "#633806" : "#a32d2d";
          html += '<div style="font-size:11px;font-weight:600;color:' + color + ';margin-bottom:6px">' + hasLine + '</div>';
        }
        if (squadLine) {
          const names = squadLine.replace("Recommended squad:","").trim().split(",").map(n => n.trim());
          html += '<div class="gm-squad-members">' + names.map(n => '<span class="gm-squad-member">' + n + '</span>').join("") + '</div>';
        }
        if (reasonLine) html += '<div style="font-size:11px;color:#888;margin-top:6px;font-style:italic">' + reasonLine.replace("Reason:","").trim() + '</div>';

        el.innerHTML = html || reply;
      } catch(e) {
        if (el) el.innerHTML = '<span style="color:#aaa;font-size:12px">Could not load recommendation.</span>';
      }
    }

    // Helper: extract key rewards
    function keyRewards(nodeRewards) {
      if (!nodeRewards) return [];
      const boss = nodeRewards.boss && nodeRewards.boss.allOf || [];
      return boss
        .filter(r => r.item && !["SC","EVTA_SEASON_POINTS"].includes(r.item.id))
        .map(r => r.item.name)
        .slice(0, 4);
    }

    let html = "";

    // ── Alliance section ───────────────────────────────────────────────────
    html += '<div class="gm-section">';
    html += '<div class="gm-section-title">Alliance</div>';
    if (allianceCard && allianceCard.name) {
      html += '<div class="gm-section-sub">' + allianceCard.name + '</div>';
      html += '<div class="gm-alliance-grid">';
      const stats = [
        ["Name", allianceCard.name],
        ["Description", allianceCard.description || "—"],
        ["Members", allianceCard.memberCount || "—"],
        ["Total Power", allianceCard.tcp ? Math.round(allianceCard.tcp/1000000) + "M" : "—"],
        ["War Rating", allianceCard.warRating || "—"],
        ["Raid Rating", allianceCard.raidRating || "—"],
      ];
      stats.forEach(([label, val]) => {
        if (val && val !== "—") {
          html += '<div class="gm-alliance-stat"><div class="gm-alliance-label">' + label + '</div><div class="gm-alliance-val">' + val + '</div></div>';
        }
      });
      html += '</div>';
    } else {
      html += '<div style="color:#aaa;font-size:13px;margin-bottom:1rem">Alliance data not available. Make sure you authorized the "View Alliance Profile" scope.</div>';
    }
    html += '</div>';

    // ── Raids section ──────────────────────────────────────────────────────
    html += '<div class="gm-section">';
    html += '<div class="gm-section-title">Raids</div>';
    html += '<div class="gm-section-sub">Tap a raid to see details and your best squad</div>';
    html += '<div class="gm-grid" id="raids-grid"><div class="gm-loading">Fetching raid data...</div></div>';
    html += '</div>';

    // ── Dark Dimensions section ────────────────────────────────────────────
    html += '<div class="gm-section">';
    html += '<div class="gm-section-title">Dark Dimensions</div>';
    html += '<div class="gm-section-sub">Tap a dimension to see requirements and your eligible characters</div>';
    html += '<div class="gm-grid" id="dds-grid"><div class="gm-loading">Fetching Dark Dimension data...</div></div>';
    html += '</div>';

    el.innerHTML = html;

    // Fetch all raids in parallel
    const raidResults = await Promise.all(
      raidIds.map(id => fetch(API_BASE + "/game/v1/raids/" + id, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null))
    );

    const raidsEl = document.getElementById("raids-grid");
    if (raidsEl) {
      const raidCards = raidResults.filter(Boolean).map(r => r.data).filter(Boolean);
      if (raidCards.length === 0) {
        raidsEl.innerHTML = '<span style="color:#aaa;font-size:13px">No raid data available.</span>';
      } else {
        raidsEl.innerHTML = raidCards.map((raid, idx) => {
          const reqs = parseReqs(raid.details);
          const rewards = keyRewards(raid.nodeRewards);
          const sqId = "raid-squad-" + idx;
          return '<div class="gm-card">' +
            '<div class="gm-card-name">' + (raid.name || raid.id) + '</div>' +
            (raid.subName ? '<div class="gm-card-sub">' + raid.subName + '</div>' : '') +
            (reqs ? '<div class="gm-card-req">' + reqs + '</div>' : '') +
            (rewards.length ? '<div class="gm-card-rewards">' + rewards.map(r => '<span class="gm-reward-badge">' + r + '</span>').join("") + '</div>' : '') +
            '<div class="gm-squad"><div class="gm-squad-title">Meta squad recommendation</div>' +
            '<div id="' + sqId + '"><span style="color:#aaa;font-size:12px;font-style:italic">Loading...</span></div>' +
            '</div></div>';
        }).join("");

      }
    }

    // Fetch all DDs in parallel
    const ddResults = await Promise.all(
      ddIds.map(id => fetch(API_BASE + "/game/v1/dds/" + id, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null))
    );

    const ddsEl = document.getElementById("dds-grid");
    if (ddsEl) {
      const ddCards = ddResults.filter(Boolean).map(r => r.data).filter(Boolean);
      if (ddCards.length === 0) {
        ddsEl.innerHTML = '<span style="color:#aaa;font-size:13px">No Dark Dimension data available.</span>';
      } else {
        ddsEl.innerHTML = ddCards.map((dd, idx) => {
          const reqs = parseReqs(dd.details);
          const tiers = dd.ddCompletion && dd.ddCompletion.tiers ? Object.keys(dd.ddCompletion.tiers).length : 0;
          const tier1 = dd.ddCompletion && dd.ddCompletion.tiers && dd.ddCompletion.tiers["1"];
          const topRewards = tier1 && tier1.rewards && tier1.rewards.allOf
            ? tier1.rewards.allOf.filter(r => r.item).map(r => r.item.name).slice(0, 3)
            : [];
          const sqId = "dd-squad-" + idx;
          return '<div class="gm-card">' +
            '<div class="gm-card-name">' + (dd.name || dd.id) + '</div>' +
            (dd.subName ? '<div class="gm-card-sub">' + dd.subName + '</div>' : '') +
            (reqs ? '<div class="gm-card-req">' + reqs + '</div>' : '') +
            (tiers ? '<div style="font-size:11px;color:#888;margin-bottom:6px">' + tiers + ' completion tier' + (tiers > 1 ? "s" : "") + '</div>' : '') +
            (topRewards.length ? '<div class="gm-card-rewards">' + topRewards.map(r => '<span class="gm-reward-badge">' + r + '</span>').join("") + '</div>' : '') +
            '<div class="gm-squad"><div class="gm-squad-title">Meta squad recommendation</div>' +
            '<div id="' + sqId + '"><span style="color:#aaa;font-size:12px;font-style:italic">Loading...</span></div>' +
            '</div></div>';
        }).join("");

      }
    }
  }

  // ── Refresh roster ────────────────────────────────────────────────────────
  async function refreshRoster() {
    const token = sessionStorage.getItem("msf_token");
    if (!token) { alert("You are not signed in."); return; }

    const btn = document.getElementById("refresh-btn");
    const badge = document.getElementById("mode-badge");
    const origText = btn.textContent;
    btn.textContent = "Refreshing...";
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

      // Log all response statuses immediately
      console.log("Roster:", rosterRes.status, "Squads:", squadsRes.status, "Card:", cardRes.status);

      if (!rosterRes.ok) throw new Error("Roster: HTTP " + rosterRes.status);

      const rosterJson = await rosterRes.json();
      const gameCharsMap = window._gameCharsMap || {};
      const chars = (rosterJson.data || []).map(c => {
        const meta = gameCharsMap[c.id] || {};
        const splitCase = s => s.replace(/([A-Z])/g, " $1").trim();
        return {
          name:     c.id ? splitCase(c.id) : "Unknown",
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

      badge.textContent = "Live data";
      badge.className   = "status-badge live";
      btn.textContent   = origText;
      btn.disabled      = false;

      renderMetrics();
      populateTeamFilter();
      renderRoster();
      renderSquads();
      renderCard();
      renderActivities();
      renderInventory();

      // Notify AI chat that roster was refreshed
      addMessage("assistant", "✓ Roster refreshed! I now have your latest data — " + roster.length + " characters with an average power of " + Math.round(roster.reduce((a,c)=>a+c.power,0)/roster.length/1000) + "k. What would you like to know?");
      chatHistory.push({ role: "assistant", content: "Roster refreshed with latest data." });
      saveChatHistory();
      switchTab("ai");

    } catch (e) {
      badge.textContent = "Live data";
      badge.className   = "status-badge live";
      btn.textContent   = origText;
      btn.disabled      = false;
      alert("Refresh failed: " + e.message);
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  (function init() {
    const token = sessionStorage.getItem("msf_token");
    if (token) loadLiveData(token);
  })();


// ── Event listeners (replaces inline onclick handlers) ────────────────────
document.addEventListener("DOMContentLoaded", function() {
  // Sign in / demo
  const signinBtn = document.getElementById("signin-btn");
  if (signinBtn) signinBtn.addEventListener("click", startOAuth);
  const demoBtn = document.getElementById("demo-btn");
  if (demoBtn) demoBtn.addEventListener("click", useDemoMode);

  // Top bar buttons
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", refreshRoster);
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Tabs
  ["roster","squads","ai","card","activities","inventory"].forEach(function(t) {
    const el = document.getElementById("tab-" + t);
    if (el) el.addEventListener("click", function() { switchTab(t); });
  });

  // AI prompt buttons
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

  // Modal close buttons
  const actCloseBtn = document.getElementById("activity-modal-close-btn");
  if (actCloseBtn) actCloseBtn.addEventListener("click", function() { closeActivityModal(); });
  const charCloseBtn = document.getElementById("char-modal-close-btn");
  if (charCloseBtn) charCloseBtn.addEventListener("click", function() { closeModal(); });

  // Modal overlay clicks
  const actModal = document.getElementById("activity-modal");
  if (actModal) actModal.addEventListener("click", closeActivityModal);
  const charModal = document.getElementById("char-modal");
  if (charModal) charModal.addEventListener("click", closeModal);

  // Roster card delegation - openModal
  document.addEventListener("click", function(e) {
    const card = e.target.closest("[data-modal-idx]");
    if (card) openModal(parseInt(card.dataset.modalIdx));
  });

  // Activity card delegation - toggleActivityCard
  document.addEventListener("click", function(e) {
    const card = e.target.closest("[data-activity-id]");
    if (card) toggleActivityCard(card.dataset.activityId);
  });

  // Search and filter inputs
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("input", renderRoster);
  ["filter-tier","filter-role","filter-team","sort-by"].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderRoster);
  });

  // AI input enter key
  const aiInput = document.getElementById("ai-input");
  if (aiInput) aiInput.addEventListener("keydown", function(e) { if (e.key === "Enter") sendCustom(); });
});