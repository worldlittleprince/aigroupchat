function getRoomId() {
  const sp = new URLSearchParams(window.location.search);
  const q = sp.get('room');
  if (q && q.trim()) return q.trim();
  const hash = (window.location.hash || '').replace(/^#/, '').trim();
  if (hash) return hash;
  return 'lobby';
}

const ROOM_ID = getRoomId();
const socket = io({ auth: { roomId: ROOM_ID } });

const $messages = document.getElementById('messages');
const $typing = document.getElementById('typing');
const $input = document.getElementById('input');
const $name = document.getElementById('name');
const $send = document.getElementById('send');
const $roomInput = document.getElementById('room-input');
const $roomJoin = document.getElementById('room-join');
const $roomCreate = document.getElementById('room-create');
const $roomList = document.getElementById('room-list');
const $themeToggle = document.getElementById('theme-toggle');
const $settingsToggle = document.getElementById('settings-toggle');
const $settingsPanel = document.getElementById('settings-panel');
const $agentAlpha = document.getElementById('agent-alpha');
const $agentMuse = document.getElementById('agent-muse');
const $agentLeo = document.getElementById('agent-leo');
const $responseDensity = document.getElementById('response-density');

const typingMap = new Map(); // agentId -> displayName

// Persona meta (avatar emoji + CSS class)
const AGENT_META = {
  alpha: { emoji: '🧠', className: 'agent-alpha', name: '알파(분석가)' },
  muse:  { emoji: '🎨', className: 'agent-muse',  name: '뮤즈(예술가)' },
  leo:   { emoji: '🧭', className: 'agent-leo',   name: '리오(탐험가)' }
};

function isNearBottom() {
  const threshold = 120;
  const el = document.scrollingElement || document.documentElement;
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

function scrollToBottom(smooth = true) {
  const behavior = smooth ? 'smooth' : 'auto';
  window.scrollTo({ top: document.body.scrollHeight, behavior });
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function linkify(text) {
  const urlRe = /(https?:\/\/[\w.-]+(?:\/[\w\-.~:%/?#[\]@!$&'()*+,;=]*)?)/gi;
  const frag = document.createDocumentFragment();
  let lastIndex = 0; let m;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
    const a = document.createElement('a');
    a.href = m[0];
    a.textContent = m[0];
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    frag.appendChild(a);
    lastIndex = urlRe.lastIndex;
  }
  if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  return frag;
}

function renderContent($container, text) {
  // Primitive code fence handling for ``` blocks; otherwise linkify
  const fence = /```[\s\S]*?```/g;
  let last = 0; let match;
  while ((match = fence.exec(text)) !== null) {
    const before = text.slice(last, match.index);
    if (before) {
      const p = document.createElement('div');
      p.className = 'p';
      p.appendChild(linkify(before));
      $container.appendChild(p);
    }
    const code = match[0].replace(/^```\s*\n?/, '').replace(/```\s*$/, '');
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    $container.appendChild(pre);
    last = fence.lastIndex;
  }
  const tail = text.slice(last);
  if (tail) {
    const p = document.createElement('div');
    p.className = 'p';
    p.appendChild(linkify(tail));
    $container.appendChild(p);
  }
}

function renderMessage(m) {
  const atBottom = isNearBottom();
  const isAI = m.senderType === 'ai';
  const senderKey = isAI ? `ai:${m.agentId}` : `user:${m.displayName}`;
  const li = document.createElement('li');
  li.className = `message ${isAI ? 'ai' : 'user'}`;
  li.dataset.senderKey = senderKey;
  li.dataset.ts = String(m.ts);

  if (isAI && m.agentId && AGENT_META[m.agentId]) {
    li.classList.add(AGENT_META[m.agentId].className);
  }

  const prev = $messages.lastElementChild;
  const prevSame = prev && prev.dataset && prev.dataset.senderKey === senderKey && (m.ts - (+prev.dataset.ts || 0) < 3 * 60 * 1000);
  if (prevSame) li.classList.add('continued');

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = isAI ? (AGENT_META[m.agentId]?.emoji || '🤖') : '🙂';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (!prevSame) {
    const header = document.createElement('div');
    header.className = 'header';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = m.displayName;
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = formatTime(m.ts);
    header.appendChild(name);
    header.appendChild(time);
    bubble.appendChild(header);
  }

  const content = document.createElement('div');
  content.className = 'content';
  renderContent(content, m.content);
  bubble.appendChild(content);

  li.appendChild(avatar);
  li.appendChild(bubble);
  $messages.appendChild(li);

  if (atBottom) scrollToBottom(true);
}

function renderTyping() {
  $typing.innerHTML = '';
  const items = [...typingMap.entries()];
  for (const [agentId, displayName] of items) {
    const chip = document.createElement('div');
    chip.className = 'typing-chip';
    const emoji = document.createElement('span');
    emoji.textContent = (AGENT_META[agentId]?.emoji || '🤖');
    const name = document.createElement('span');
    name.textContent = displayName;
    const dots = document.createElement('span');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    chip.appendChild(emoji);
    chip.appendChild(name);
    chip.appendChild(dots);
    $typing.appendChild(chip);
  }
}

socket.on('history', (messages) => {
  $messages.innerHTML = '';
  messages.forEach(renderMessage);
});

socket.on('message', (m) => {
  renderMessage(m);
});

socket.on('typing_start', ({ agentId, displayName }) => {
  typingMap.set(agentId, displayName);
  renderTyping();
});

socket.on('typing_stop', ({ agentId }) => {
  typingMap.delete(agentId);
  renderTyping();
});

function send() {
  const content = ($input.value || '').trim();
  if (!content) return;
  const displayName = $name.value.trim() || '사용자';
  socket.emit('user_message', { content, displayName });
  $input.value = '';
  autoResize($input);
  $input.focus();
}

$send.addEventListener('click', send);
$input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

function autoResize(el) {
  try {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  } catch {}
}

$input.addEventListener('input', () => autoResize($input));
setTimeout(() => autoResize($input), 0);

// Show room id in the topbar title (fallback to brand header if missing)
try {
  const rt = document.getElementById('room-title');
  if (rt) {
    rt.textContent = ROOM_ID;
  } else {
    const h1 = document.querySelector('header h1');
    if (h1) h1.textContent = `${h1.textContent} — ${ROOM_ID}`;
  }
} catch {}

// Rooms UX
function navigateTo(roomId) {
  if (!roomId) return;
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  window.location.href = url.toString();
}

async function fetchRooms() {
  try {
    const res = await fetch('/rooms');
    if (!res.ok) return;
    const data = await res.json();
    renderRooms(data.rooms || []);
  } catch {}
}

function renderRooms(rooms) {
  if (!$roomList) return;
  $roomList.innerHTML = '';
  (rooms || []).slice(0, 20).forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.id} • ${r.participants}/${r.messages}`;
    if (r.id === ROOM_ID) li.classList.add('active');
    li.dataset.roomId = r.id;
    li.addEventListener('click', () => navigateTo(r.id));
    $roomList.appendChild(li);
  });
}

if ($roomJoin) {
  $roomJoin.addEventListener('click', () => {
    const id = ($roomInput?.value || '').trim();
    if (id) navigateTo(id);
  });
}

if ($roomInput) {
  $roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const id = ($roomInput?.value || '').trim();
      if (id) navigateTo(id);
    }
  });
}

if ($roomCreate) {
  $roomCreate.addEventListener('click', async () => {
    const desired = ($roomInput?.value || '').trim();
    try {
      const res = await fetch('/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: desired || undefined }) });
      if (res.ok) {
        const data = await res.json();
        navigateTo(data.id);
      }
    } catch {}
  });
}

socket.on('rooms_update', (rooms) => {
  renderRooms(rooms);
});

fetchRooms();

// Theme: light/dark toggle with persistence
(function themeInit() {
  const storageKey = 'theme';

  const getStored = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const setStored = (v) => { try { localStorage.setItem(storageKey, v); } catch {} };

  const systemPrefersDark = () => (
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const applyTheme = (theme, persist = false) => {
    const t = theme || (systemPrefersDark() ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
    if (persist) setStored(t);
    updateToggleIcon(t);
  };

  const updateToggleIcon = (t) => {
    if (!$themeToggle) return;
    // Show icon for the action that will happen when clicked
    if (t === 'dark') {
      $themeToggle.textContent = '☀️';
      $themeToggle.setAttribute('aria-label', '라이트 모드로 전환');
      $themeToggle.setAttribute('title', '라이트 모드로 전환');
    } else {
      $themeToggle.textContent = '🌙';
      $themeToggle.setAttribute('aria-label', '다크 모드로 전환');
      $themeToggle.setAttribute('title', '다크 모드로 전환');
    }
  };

  const current = document.documentElement.getAttribute('data-theme') || getStored();
  applyTheme(current || undefined, false);

  if ($themeToggle) {
    $themeToggle.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  }

  // If user has no stored preference, follow system changes
  const mm = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (mm && !getStored()) {
    try {
      mm.addEventListener('change', () => {
        if (!getStored()) applyTheme(undefined, false);
      });
    } catch {
      // Fallback for older browsers
      mm.addListener && mm.addListener(() => { if (!getStored()) applyTheme(undefined, false); });
    }
  }
})();

// Settings (P1): fetch/apply per-room config and allow updates
(function settingsInit() {
  if (!$settingsToggle || !$settingsPanel) return;
  let current = null;

  function applyUI(cfg) {
    try {
      if (!cfg) return;
      current = cfg;
      if ($agentAlpha) $agentAlpha.checked = cfg.agentEnabled?.alpha !== false;
      if ($agentMuse) $agentMuse.checked = cfg.agentEnabled?.muse !== false;
      if ($agentLeo) $agentLeo.checked = cfg.agentEnabled?.leo !== false;
      if ($responseDensity) $responseDensity.value = String(cfg.responseProbability ?? 1.0);
    } catch {}
  }

  async function fetchConfig() {
    try {
      const res = await fetch(`/rooms/${encodeURIComponent(ROOM_ID)}/config`);
      if (!res.ok) return;
      const data = await res.json();
      applyUI(data.config);
    } catch {}
  }

  async function postConfig(partial) {
    try {
      const res = await fetch(`/rooms/${encodeURIComponent(ROOM_ID)}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial)
      });
      if (res.ok) {
        const data = await res.json();
        applyUI(data.config);
      }
    } catch {}
  }

  $settingsToggle.addEventListener('click', () => {
    const isHidden = $settingsPanel.hasAttribute('hidden');
    if (isHidden) {
      $settingsPanel.removeAttribute('hidden');
      fetchConfig();
    } else {
      $settingsPanel.setAttribute('hidden', '');
    }
  });

  if ($agentAlpha) $agentAlpha.addEventListener('change', () => postConfig({ agentEnabled: { alpha: $agentAlpha.checked } }));
  if ($agentMuse) $agentMuse.addEventListener('change', () => postConfig({ agentEnabled: { muse: $agentMuse.checked } }));
  if ($agentLeo) $agentLeo.addEventListener('change', () => postConfig({ agentEnabled: { leo: $agentLeo.checked } }));
  if ($responseDensity) $responseDensity.addEventListener('change', () => postConfig({ responseProbability: parseFloat($responseDensity.value) }));
})();
