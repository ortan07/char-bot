const GEMINI_API_KEY = "";
const GEMINI_MODEL = "gemini-2.0-flash";
const COMMENT_KEY = "meowide-comments";
const RECENT_KEY = "meowide-recent-chats";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  view: "explore",
  mode: "recommended",
  tag: "ทั้งหมด",
  search: "",
  currentBot: null,
  comments: readStore(COMMENT_KEY, {}),
  recent: readStore(RECENT_KEY, []),
  chat: [],
  geminiMessages: [],
};

function readStore(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function botEmoji(bot) {
  return bot.emoji || bot.name?.slice(0, 1) || "M";
}

function botImg(bot) {
  return Boolean(bot.hasImg && typeof bot.img === "string" && bot.img.trim());
}

function formatCount(count = 0) {
  return Number(count).toLocaleString("th-TH");
}

function allTags() {
  return ["ทั้งหมด", ...new Set(BOTS.flatMap((bot) => bot.tags || []))];
}

function filteredBots() {
  const query = state.search.trim().toLowerCase();
  let bots = BOTS.filter((bot) => {
    const tagOk = state.tag === "ทั้งหมด" || (bot.tags || []).includes(state.tag);
    const text = [bot.name, bot.role, bot.desc, ...(bot.tags || [])].join(" ").toLowerCase();
    return tagOk && (!query || text.includes(query));
  });

  if (state.mode === "popular") {
    bots = bots.toSorted((a, b) => (b.msgs || 0) - (a.msgs || 0));
  }

  if (state.mode === "latest") {
    bots = bots.toReversed();
  }

  return bots;
}

function setAccent(bot) {
  document.documentElement.style.setProperty("--accent", bot?.color || "#ff4bb8");
  document.documentElement.style.setProperty("--accent-soft", bot?.colorSoft || "rgba(255,75,184,.16)");
}

function renderModes() {
  const modes = [
    ["recommended", "แนะนำ"],
    ["popular", "ยอดนิยม"],
    ["latest", "ล่าสุด"],
  ];

  $("#modeTabs").innerHTML = modes
    .map(([id, label]) => `
      <button class="chip mode-chip ${state.mode === id ? "active" : ""}" type="button" data-mode="${esc(id)}">
        ${esc(label)}
      </button>
    `)
    .join("");
}

function renderFilters() {
  $("#tagFilters").innerHTML = allTags()
    .map((tag) => `
      <button class="chip tag-chip ${state.tag === tag ? "active" : ""}" type="button" data-tag="${esc(tag)}">
        ${esc(tag)}
      </button>
    `)
    .join("");
}

function cardImage(bot) {
  if (botImg(bot)) {
    return `<img class="bot-image" src="${esc(bot.img)}" alt="${esc(bot.name)}" loading="lazy">`;
  }
  return `<div class="bot-emoji">${esc(botEmoji(bot))}</div>`;
}

function renderCards() {
  const bots = filteredBots();
  $("#botGrid").innerHTML = bots.length
    ? bots
      .map((bot, index) => `
        <article class="bot-card" style="--card-i:${index}; --accent:${esc(bot.color)}; --accent-soft:${esc(bot.colorSoft)}" data-id="${esc(bot.id)}">
          <button class="bot-card-button" type="button" aria-label="เปิดรายละเอียด ${esc(bot.name)}">
            <div class="card-art">
              ${cardImage(bot)}
              <span class="msg-pill">คุย ${formatCount(bot.msgs)} ครั้ง</span>
            </div>
            <div class="card-body">
              <div class="tag-row">
                ${(bot.tags || []).slice(0, 3).map((tag) => `<span>${esc(tag)}</span>`).join("")}
              </div>
              <h3>${esc(bot.name)}</h3>
              <p class="role">${esc(bot.role)}</p>
              <p class="desc">${esc(bot.desc)}</p>
            </div>
          </button>
        </article>
      `)
      .join("")
    : `<div class="empty-state">ไม่เจอตัวละครที่ค้นหา</div>`;

  bindCardMotion();
}

function bindCardMotion() {
  $$(".bot-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rx = ((y / rect.height) - 0.5) * -11;
      const ry = ((x / rect.width) - 0.5) * 13;
      card.style.setProperty("--tilt-x", `${rx.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${ry.toFixed(2)}deg`);
      card.style.setProperty("--shine-x", `${x}px`);
      card.style.setProperty("--shine-y", `${y}px`);
    });

    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });
}

function setView(view) {
  state.view = view;
  $$(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));

  if (view === "chats") renderChatsView();
  if (view === "profile") renderProfileView();
}

function renderRecentChats() {
  const list = $("#recentChats");
  list.innerHTML = state.recent.length
    ? state.recent
      .map((item) => {
        const bot = BOTS.find((entry) => entry.id === item.id);
        if (!bot) return "";
        return `
          <button class="recent-item" type="button" data-id="${esc(bot.id)}">
            <span class="mini-avatar">${botImg(bot) ? `<img src="${esc(bot.img)}" alt="">` : esc(botEmoji(bot))}</span>
            <span>
              <strong>${esc(bot.name)}</strong>
              <small>${esc(item.preview || bot.role)}</small>
            </span>
          </button>
        `;
      })
      .join("")
    : `<p class="muted small">ยังไม่มีประวัติแชท</p>`;
}

function renderChatsView() {
  const list = $("#chatThreads");
  list.innerHTML = state.recent.length
    ? state.recent
      .map((item) => {
        const bot = BOTS.find((entry) => entry.id === item.id);
        if (!bot) return "";
        return `
          <button class="thread-card" type="button" data-id="${esc(bot.id)}">
            <span class="thread-avatar">${botImg(bot) ? `<img src="${esc(bot.img)}" alt="">` : esc(botEmoji(bot))}</span>
            <span>
              <strong>${esc(bot.name)}</strong>
              <small>${esc(item.preview || bot.greet || bot.role)}</small>
            </span>
            <em>${esc(item.time || "")}</em>
          </button>
        `;
      })
      .join("")
    : `<div class="empty-state">เริ่มคุยกับตัวละครจากหน้า Explore แล้วประวัติจะมาอยู่ตรงนี้</div>`;
}

function renderProfileView() {
  $("#profileStats").innerHTML = `
    <div class="stat-card"><strong>${formatCount(BOTS.length)}</strong><span>ตัวละคร</span></div>
    <div class="stat-card"><strong>${formatCount(state.recent.length)}</strong><span>แชทล่าสุด</span></div>
    <div class="stat-card"><strong>${formatCount(Object.values(state.comments).flat().length)}</strong><span>คอมเมนต์</span></div>
  `;
}

function openModal(bot) {
  setAccent(bot);
  $("#modalBox").innerHTML = `
    <button class="icon-btn modal-close" type="button" data-close-modal aria-label="ปิด">×</button>
    <div class="modal-hero" style="--accent:${esc(bot.color)}">
      ${cardImage(bot)}
    </div>
    <div class="modal-copy">
      <div class="tag-row">${(bot.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>
      <h2>${esc(bot.name)}</h2>
      <p class="role">${esc(bot.role)}</p>
      <p>${esc(bot.desc)}</p>
      <dl class="detail-list">
        <div><dt>ชอบ</dt><dd>${esc(bot.likes || "-")}</dd></div>
        <div><dt>ไม่ชอบ</dt><dd>${esc(bot.dislikes || "-")}</dd></div>
        <div><dt>ข้อความ</dt><dd>${formatCount(bot.msgs)} ครั้ง</dd></div>
      </dl>
      <button class="start-btn" type="button" data-start-chat="${esc(bot.id)}">เริ่มแชท</button>
    </div>
  `;
  $("#botModal").classList.add("active");
}

function closeModal() {
  $("#botModal").classList.remove("active");
}

function saveRecent(bot, preview = bot.greet) {
  const item = {
    id: bot.id,
    preview,
    time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
  };
  state.recent = [item, ...state.recent.filter((entry) => entry.id !== bot.id)].slice(0, 6);
  saveStore(RECENT_KEY, state.recent);
  renderRecentChats();
  renderChatsView();
  renderProfileView();
}

function startChat(bot) {
  state.currentBot = bot;
  state.chat = [];
  state.geminiMessages = [];
  closeModal();
  saveRecent(bot);
  setAccent(bot);

  $("#appShell").classList.remove("active");
  $("#pageChat").classList.add("active");
  $("#chatTitle").textContent = bot.name;
  $("#chatRole").textContent = bot.role;
  $("#chatBio").textContent = bot.desc;
  $("#chatAvatar").innerHTML = botImg(bot) ? `<img src="${esc(bot.img)}" alt="${esc(bot.name)}">` : esc(botEmoji(bot));
  $("#sideAvatar").innerHTML = botImg(bot) ? `<img src="${esc(bot.img)}" alt="${esc(bot.name)}">` : esc(botEmoji(bot));
  $("#sideName").textContent = bot.name;
  $("#sideRole").textContent = bot.role;
  $("#sideTags").innerHTML = (bot.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join("");
  $("#messages").innerHTML = "";
  appendMessage("bot", bot.greet || `สวัสดี เราคือ ${bot.name}`);
  renderComments();
  $("#chatInput").focus();
}

function closeChat() {
  $("#pageChat").classList.remove("active");
  $("#appShell").classList.add("active");
  state.currentBot = null;
  setAccent(null);
}

function toGeminiMessage(author, text) {
  return {
    role: author === "user" ? "user" : "model",
    parts: [{ text }],
  };
}

function appendMessage(author, text, options = {}) {
  const { trackGemini = true } = options;
  const message = {
    author,
    text,
  };
  state.chat.push(message);
  if (trackGemini) {
    state.geminiMessages.push(toGeminiMessage(author, text));
  }

  $("#messages").insertAdjacentHTML("beforeend", `
    <div class="message ${author === "user" ? "from-user" : "from-bot"}">
      <div class="message-bubble">${esc(text)}</div>
    </div>
  `);
  $("#messages").scrollTop = $("#messages").scrollHeight;
}

function showTyping() {
  $("#messages").insertAdjacentHTML("beforeend", `
    <div class="message from-bot typing" id="typingIndicator">
      <div class="message-bubble"><span></span><span></span><span></span></div>
    </div>
  `);
  $("#messages").scrollTop = $("#messages").scrollHeight;
}

function hideTyping() {
  $("#typingIndicator")?.remove();
}

async function sendMessage(text) {
  const bot = state.currentBot;
  if (!bot || !text.trim()) return;

  appendMessage("user", text.trim());
  saveRecent(bot, text.trim());
  $("#chatInput").value = "";
  showTyping();

  let reply;
  try {
    reply = await geminiReply(bot, text.trim());
  } catch {
    reply = localReply(bot, text.trim());
  }

  hideTyping();
  appendMessage("bot", reply);
}

async function geminiReply(bot, userText) {
  if (!GEMINI_API_KEY.trim()) {
    return localReply(bot, userText);
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: bot.system || "" }] },
      contents: state.geminiMessages,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 220,
      },
    }),
  });

  if (!response.ok) throw new Error("Gemini request failed");
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || localReply(bot, userText);
}

function localReply(bot, text) {
  const replies = [
    `${bot.name}: ได้ยินละ "${text}" แล้วไงต่อ`,
    `อืม... เล่าต่อดิ เราฟังอยู่`,
    `ประโยคนี้น่าสนใจนะ มันทำให้คิดถึงเรื่องของ ${bot.role}`,
    `ถ้าเป็นเรา เราจะตอบแบบตรง ๆ ว่า ลองขยายอีกนิด`,
    `โอเค เข้าใจละ งั้นเริ่มจากจุดที่มึง/เธอคาใจก่อน`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function renderComments() {
  const bot = state.currentBot;
  if (!bot) return;
  const comments = state.comments[bot.id] || [];
  $("#commentList").innerHTML = comments.length
    ? comments.map((comment) => `<div class="comment-item">${esc(comment)}</div>`).join("")
    : `<p class="muted small">ยังไม่มีคอมเมนต์</p>`;
}

function saveComment() {
  const bot = state.currentBot;
  const input = $("#commentInput");
  const text = input.value.trim();
  if (!bot || !text) return;

  state.comments[bot.id] = [text, ...(state.comments[bot.id] || [])].slice(0, 8);
  saveStore(COMMENT_KEY, state.comments);
  input.value = "";
  renderComments();
  renderProfileView();
}

function bindEvents() {
  $("#searchInput").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderCards();
  });

  $("#modeTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    renderModes();
    renderCards();
  });

  $("#tagFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tag]");
    if (!button) return;
    state.tag = button.dataset.tag;
    renderFilters();
    renderCards();
  });

  $("#botGrid").addEventListener("click", (event) => {
    const card = event.target.closest(".bot-card");
    if (!card) return;
    const bot = BOTS.find((entry) => entry.id === card.dataset.id);
    if (!bot) return;
    card.classList.add("is-opening");
    setTimeout(() => openModal(bot), 170);
    setTimeout(() => card.classList.remove("is-opening"), 340);
  });

  $("#botModal").addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal]") || event.target.id === "botModal") closeModal();
    const start = event.target.closest("[data-start-chat]");
    if (start) {
      const bot = BOTS.find((entry) => entry.id === start.dataset.startChat);
      if (bot) startChat(bot);
    }
  });

  $(".side-nav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) setView(button.dataset.view);
  });

  $("#recentChats").addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    const bot = BOTS.find((entry) => entry.id === button?.dataset.id);
    if (bot) startChat(bot);
  });

  $("#chatThreads").addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    const bot = BOTS.find((entry) => entry.id === button?.dataset.id);
    if (bot) startChat(bot);
  });

  $("#backBtn").addEventListener("click", closeChat);

  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage($("#chatInput").value);
  });

  $("#commentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveComment();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function init() {
  setAccent(null);
  renderModes();
  renderFilters();
  renderCards();
  renderRecentChats();
  renderChatsView();
  renderProfileView();
  bindEvents();
  setView("explore");
}

init();
