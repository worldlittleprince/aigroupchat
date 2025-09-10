const socket = io();

const $messages = document.getElementById('messages');
const $typing = document.getElementById('typing');
const $input = document.getElementById('input');
const $name = document.getElementById('name');
const $send = document.getElementById('send');

const typingMap = new Map(); // agentId -> displayName

function renderMessage(m) {
  const li = document.createElement('li');
  li.className = `message ${m.senderType === 'ai' ? 'ai' : 'user'}`;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${m.displayName} • ${new Date(m.ts).toLocaleTimeString()}`;
  const content = document.createElement('div');
  content.className = 'content';
  content.textContent = m.content;
  li.appendChild(meta);
  li.appendChild(content);
  $messages.appendChild(li);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function renderTyping() {
  const names = [...typingMap.values()];
  if (!names.length) {
    $typing.textContent = '';
    return;
  }
  $typing.textContent = names.map(n => `${n} 입력 중...`).join('   ');
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
  const content = $input.value.trim();
  if (!content) return;
  const displayName = $name.value.trim() || '사용자';
  socket.emit('user_message', { content, displayName });
  $input.value = '';
  $input.focus();
}

$send.addEventListener('click', send);
$input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') send();
});

