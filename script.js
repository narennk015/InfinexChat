const RoboDB = (() => {
  const KS = 'rc_sessions_v2', KR = 'rc_saved_responses';
  let S = {}, R = [];
  function load() {
    S = JSON.parse(localStorage.getItem(KS) || '{}');
    R = JSON.parse(localStorage.getItem(KR) || '[]');
  }
  function save() { localStorage.setItem(KS, JSON.stringify(S)); }
  function savr() { localStorage.setItem(KR, JSON.stringify(R)); }
  load();
  return {
    reload() { load(); },
    createSession(id, name) {
      if (!S[id]) {
        S[id] = { id, name, messages: [], lastActivity: Date.now(), createdAt: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), unread: 0, device: navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop' };
        save();
      }
      return S[id];
    },
    getSession(id)     { return S[id] || null; },
    getAllSessions()    { return Object.values(S); },
    addMessage(sid, from, text) {
      if (!S[sid]) return;
      S[sid].messages.push({ from, text, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), ts: Date.now() });
      S[sid].lastActivity = Date.now();
      if (from === 'admin') S[sid].unread++;
      save();
    },
    clearUnread(sid)   { if (S[sid]) { S[sid].unread = 0; save(); } },
    deleteSession(sid) { delete S[sid]; save(); },
    getSavedResponses(){ return R; },
    addSavedResponse(kw, text) { R.push({ id: Date.now(), keyword: kw, text }); savr(); },
    deleteSavedResponse(id) { R = R.filter(r => r.id !== id); savr(); },
    matchResponse(text) {
      const t = text.toLowerCase();
      return R.find(r => t.includes(r.keyword.toLowerCase())) || null;
    },
  };
})();

const ADMIN_USER = 'gtec', ADMIN_PASS = 'gtec123';
const SERVER_URL  = 'http://localhost:8000'; // ← change to your deployed server URL

const SESSION_ID   = 'user_' + Math.random().toString(36).slice(2, 9);
const SESSION_NAME = 'Guest ' + SESSION_ID.slice(5, 10).toUpperCase();

let listening = false, recognition = null, lastMsgCount = 0, serverOnline = false;
let selectedVoice = null; // null = TTS off
const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
let allVoices = [];

// ── Voice assistant setup ──────────────────────────────────────────────────
const VOICE_PRESETS = [
  { id: 'en-US-female', label: 'Emma',    icon: '👩', lang: 'en-US', gender: 'female', keywords: ['Google US English','Samantha','Victoria','Zira','Emma'] },
  { id: 'en-US-male',   label: 'James',   icon: '👨', lang: 'en-US', gender: 'male',   keywords: ['Google US English Male','David','Mark','Alex','Daniel'] },
  { id: 'en-GB-female', label: 'Sophie',  icon: '👸', lang: 'en-GB', gender: 'female', keywords: ['Google UK English Female','Moira','Kate','Serena'] },
  { id: 'en-GB-male',   label: 'Oliver',  icon: '🎩', lang: 'en-GB', gender: 'male',   keywords: ['Google UK English Male','Arthur','Daniel'] },
  { id: 'en-AU',        label: 'Olivia',  icon: '🦘', lang: 'en-AU', gender: 'female', keywords: ['Google Australian','Karen'] },
  { id: 'en-IN',        label: 'Priya',   icon: '🌸', lang: 'en-IN', gender: 'female', keywords: ['Google Hindi','Lekha','Rishi'] },
  { id: 'es-ES',        label: 'Sofia',   icon: '💃', lang: 'es-ES', gender: 'female', keywords: ['Google español','Monica','Paulina'] },
  { id: 'fr-FR',        label: 'Marie',   icon: '🥐', lang: 'fr-FR', gender: 'female', keywords: ['Google français','Amelie','Thomas'] },
  { id: 'de-DE',        label: 'Klaus',   icon: '🍺', lang: 'de-DE', gender: 'male',   keywords: ['Google Deutsch','Anna','Stefan'] },
  { id: 'ja-JP',        label: 'Yuki',    icon: '🌸', lang: 'ja-JP', gender: 'female', keywords: ['Google 日本語','Kyoko','Otoya'] },
  { id: 'zh-CN',        label: 'Mei',     icon: '🐉', lang: 'zh-CN', gender: 'female', keywords: ['Google 普通话','Ting-Ting','Li-mu'] },
  { id: 'hi-IN',        label: 'Anjali',  icon: '🎵', lang: 'hi-IN', gender: 'female', keywords: ['Google हिन्दी','Lekha'] },
  { id: 'robot',        label: 'Robot',   icon: '🤖', lang: 'en-US', gender: 'robot',  keywords: [] }, // special pitch effect
];

function loadVoices() {
  allVoices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  renderVoiceList();
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 500);
}

function renderVoiceList() {
  const list = document.getElementById('voiceList');
  list.innerHTML = '';
  VOICE_PRESETS.forEach(preset => {
    const matched = findVoiceForPreset(preset);
    const available = preset.id === 'robot' || matched;
    const item = document.createElement('div');
    item.className = 'vd-item' + (selectedVoice === preset.id ? ' selected' : '');
    item.id = 'vd-' + preset.id;
    item.innerHTML = `
      <span class="vd-item-icon">${preset.icon}</span>
      <div class="vd-item-info">
        <div class="vd-item-name">${preset.label} ${!available ? '<span style="font-size:10px;opacity:.5">(unavailable)</span>' : ''}</div>
        <div class="vd-item-lang">${preset.lang} · ${preset.gender}</div>
      </div>
      <button class="vd-test-btn" onclick="testVoice('${preset.id}',event)">▶ Test</button>`;
    item.onclick = (e) => { if (!e.target.classList.contains('vd-test-btn')) selectVoice(preset.id); };
    list.appendChild(item);
  });
}

function findVoiceForPreset(preset) {
  if (!allVoices.length) return null;
  // Try keyword match first
  for (const kw of preset.keywords) {
    const v = allVoices.find(v => v.name.includes(kw));
    if (v) return v;
  }
  // Fall back to lang match
  return allVoices.find(v => v.lang.startsWith(preset.lang)) || null;
}

function selectVoice(id) {
  selectedVoice = id;
  // Update UI
  document.querySelectorAll('.vd-item,.vd-off').forEach(el => el.classList.remove('selected'));
  if (id === null) {
    document.getElementById('vd-off').classList.add('selected');
    document.getElementById('voiceBtnLabel').textContent = 'Voice: Off';
    document.getElementById('voiceSelectBtn').classList.remove('active');
  } else {
    document.getElementById('vd-' + id)?.classList.add('selected');
    const preset = VOICE_PRESETS.find(p => p.id === id);
    document.getElementById('voiceBtnLabel').textContent = `${preset.icon} ${preset.label}`;
    document.getElementById('voiceSelectBtn').classList.add('active');
  }
  localStorage.setItem('rc_voice', id || '');
  closeVoiceDropdown();
}

function testVoice(id, e) {
  e.stopPropagation();
  const preset = VOICE_PRESETS.find(p => p.id === id);
  if (!preset) return;
  speakWithPreset(`Hi! I'm ${preset.label}. I'll be your voice assistant today.`, preset);
}

function toggleVoiceDropdown() {
  document.getElementById('voiceDropdown').classList.toggle('open');
}
function closeVoiceDropdown() {
  document.getElementById('voiceDropdown').classList.remove('open');
}
// Close on outside click
document.addEventListener('click', e => {
  if (!document.getElementById('voiceSelectorWrap').contains(e.target)) closeVoiceDropdown();
});

function speakText(text) {
  if (!selectedVoice || !('speechSynthesis' in window)) return;
  const preset = VOICE_PRESETS.find(p => p.id === selectedVoice);
  if (preset) speakWithPreset(text, preset);
}

function speakWithPreset(text, preset) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const clean = text.replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/`/g,'');
  const u = new SpeechSynthesisUtterance(clean);

  if (preset.id === 'robot') {
    // Robot voice: use any english voice with pitch/rate modified
    const base = allVoices.find(v => v.lang.startsWith('en')) || allVoices[0];
    if (base) u.voice = base;
    u.pitch = 0.2; u.rate = 0.85; u.volume = 1;
  } else {
    const v = findVoiceForPreset(preset);
    if (v) u.voice = v;
    u.lang  = preset.lang;
    u.pitch = preset.gender === 'female' ? 1.1 : 0.85;
    u.rate  = 0.95; u.volume = 1;
  }
  speechSynthesis.speak(u);
}

// ── Init ──────────────────────────────────────────────────────────────────
function init() {
  // Restore theme
  const t = localStorage.getItem('rc_theme') || 'light';
  applyTheme(t);
  // Restore voice
  const v = localStorage.getItem('rc_voice');
  if (v) selectVoice(v); else selectVoice(null);

  RoboDB.createSession(SESSION_ID, SESSION_NAME);
  lastMsgCount = RoboDB.getSession(SESSION_ID).messages.length;
  startPolling(); checkServer(); setInterval(checkServer, 30000);
}

// ── Theme ─────────────────────────────────────────────────────────────────
function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('rc_theme', t);
  updatePhoneTheme();
}
function updatePhoneTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  const btn = document.getElementById('phoneThemeBtn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}

// ── Viewport toggle (Desktop ↔ Mobile view) ────────────────────────────────
let isMobileView = false;
function toggleViewport() {
  isMobileView = !isMobileView;
  document.body.classList.toggle('mobile-view', isMobileView);
  const icon = document.getElementById('viewportIcon');
  const label = document.getElementById('viewportLabel');
  if (isMobileView) {
    // switch icon to desktop monitor
    icon.innerHTML = `<rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/>`;
    label.textContent = 'Desktop view';
    syncPhoneFrame();
  } else {
    // switch icon back to phone
    icon.innerHTML = `<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/>`;
    label.textContent = 'Mobile view';
  }
}

// Sync phone frame with real chat messages
function syncPhoneFrame() {
  const src = document.getElementById('chatBody');
  const dst = document.getElementById('phoneBody');
  if (!src || !dst) return;
  // Clone all message rows (not the welcome banner)
  const rows = src.querySelectorAll('.msg-row, .typing-row');
  // Clear phone body except intro card
  while (dst.children.length > 1) dst.removeChild(dst.lastChild);
  rows.forEach(row => {
    const clone = row.cloneNode(true);
    clone.style.animation = 'none';
    clone.style.opacity = '1';
    dst.appendChild(clone);
  });
  dst.scrollTop = dst.scrollHeight;
}

// Phone frame send
function sendPhoneMsg() {
  const inp = document.getElementById('phoneInput');
  const text = inp.value.trim(); if (!text) return;
  inp.value = '';
  // Route through main send logic
  document.getElementById('userInput').value = text;
  sendMsg();
  setTimeout(syncPhoneFrame, 400);
}
document.addEventListener('DOMContentLoaded', () => {
  const pi = document.getElementById('phoneInput');
  if (pi) pi.addEventListener('keydown', e => { if (e.key === 'Enter') sendPhoneMsg(); });
});

// Phone mic
let phoneListening = false, phoneRecognition = null;
async function togglePhoneMic() {
  if (phoneListening) {
    if (phoneRecognition) try { phoneRecognition.stop(); } catch(e) {}
    stopPhoneMicUI(); return;
  }
  if (!hasSR) { showToast('Voice not supported — try Chrome'); return; }
  try { const s = await navigator.mediaDevices.getUserMedia({audio:true}); s.getTracks().forEach(t=>t.stop()); }
  catch(err) { showToast('Mic blocked'); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  phoneRecognition = new SR(); phoneRecognition.lang='en-US'; phoneRecognition.continuous=false; phoneRecognition.interimResults=true;
  const inp = document.getElementById('phoneInput'); let finalT = '';
  phoneRecognition.onstart  = () => { phoneListening=true; finalT=''; inp.value=''; startPhoneMicUI(); };
  phoneRecognition.onresult = e => { let int=''; finalT=''; for(let i=0;i<e.results.length;i++){if(e.results[i].isFinal)finalT+=e.results[i][0].transcript;else int+=e.results[i][0].transcript;} inp.value=finalT||int; };
  phoneRecognition.onend    = () => { stopPhoneMicUI(); const t=(finalT||inp.value).trim(); if(t){inp.value=t;sendPhoneMsg();}};
  phoneRecognition.onerror  = () => stopPhoneMicUI();
  try { phoneRecognition.start(); } catch { stopPhoneMicUI(); }
}
function startPhoneMicUI() {
  ['phoneMicBtn','phoneMicBtn2'].forEach(id=>{const b=document.getElementById(id);if(b){b.textContent='⏹️';}});
}
function stopPhoneMicUI() {
  phoneListening=false;
  ['phoneMicBtn','phoneMicBtn2'].forEach(id=>{const b=document.getElementById(id);if(b){b.textContent='🎙️';}});
}

// ── Server ────────────────────────────────────────────────────────────────
async function checkServer() {
  try { const r = await fetch(`${SERVER_URL}/api/status`, {signal: AbortSignal.timeout(3000)}); serverOnline = r.ok; }
  catch { serverOnline = false; }
  const b = document.getElementById('serverBadge');
  b.innerHTML = `<span class="srv-dot"></span> ${serverOnline ? 'API online' : 'API offline'}`;
  b.className = 'srv-badge ' + (serverOnline ? 'on' : 'off');
}

async function askServer(message) {
  if (!serverOnline) return null;
  try {
    const r = await fetch(`${SERVER_URL}/api/chat`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message}),signal:AbortSignal.timeout(5000)});
    const d = await r.json(); return (r.ok && d.reply) ? d : null;
  } catch { return null; }
}

// ── Bubble rendering ──────────────────────────────────────────────────────
function fmt(t) { return t.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/`(.*?)`/g,'<code>$1</code>').replace(/\n/g,'<br>'); }

function hideWelcome() {
  const w = document.getElementById('welcomeBanner');
  if (w) w.style.display = 'none';
}

function addBubble(text, type) {
  hideWelcome();
  const body = document.getElementById('chatBody');
  const now  = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const isUser = type === 'user';
  const row = document.createElement('div');
  row.className = 'msg-row' + (isUser ? ' user' : '');

  let extraBadge = '';
  if (type === 'admin-reply') {
    extraBadge = `<div class="admin-badge-row"><span class="admin-badge-tag">Admin reply</span></div>`;
  }

  row.innerHTML = `
    <div class="av ${isUser ? 'user-av' : 'bot-av'}">${isUser ? 'You' : '💬'}</div>
    <div class="bwrap">
      ${extraBadge}
      <div class="bubble ${type}">${fmt(text)}</div>
      <div class="btime">${now}</div>
    </div>`;
  body.appendChild(row);
  requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
  if (isMobileView) setTimeout(syncPhoneFrame, 60);
}

const addBotBubble     = t => { addBubble(t, 'bot');          speakText(t); };
const addUserBubble    = t =>   addBubble(t, 'user');
const addFallbackBubble= t => { addBubble(t, 'fallback');     speakText(t); };
const addAdminBubble   = t => { addBubble(t, 'admin-reply');  speakText(t); };
const addServerBubble  = t => { addBubble(t, 'server-reply'); speakText(t); };

function showTyping() {
  removeTyping();
  const body = document.getElementById('chatBody');
  const row  = document.createElement('div');
  row.id = 'typingRow'; row.className = 'typing-row';
  row.innerHTML = `<div class="av bot-av">💬</div><div class="typing-dots"><span></span><span></span><span></span></div>`;
  body.appendChild(row);
  requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
}
function removeTyping() { document.getElementById('typingRow')?.remove(); }

function sendQuick(t) { document.getElementById('userInput').value = t; sendMsg(); }

// ── Send message ──────────────────────────────────────────────────────────
async function sendMsg() {
  const inp  = document.getElementById('userInput');
  const text = inp.value.trim(); if (!text) return;
  inp.value = ''; inp.blur();
  addUserBubble(text);
  RoboDB.addMessage(SESSION_ID, 'user', text);

  const match = RoboDB.matchResponse(text);
  if (match) {
    showTyping();
    setTimeout(() => { removeTyping(); RoboDB.addMessage(SESSION_ID,'bot',match.text); addBotBubble(match.text); lastMsgCount = RoboDB.getSession(SESSION_ID).messages.length; }, 600);
    return;
  }
  showTyping();
  const resp = await askServer(text); removeTyping();
  if (resp) {
    RoboDB.addMessage(SESSION_ID, 'bot', resp.reply);
    addServerBubble(resp.reply);
    lastMsgCount = RoboDB.getSession(SESSION_ID).messages.length;
    return;
  }
  const fb = "I didn't quite catch that 🙏 Our team has been notified and will respond shortly.";
  RoboDB.addMessage(SESSION_ID, 'bot', fb); addFallbackBubble(fb);
  lastMsgCount = RoboDB.getSession(SESSION_ID).messages.length;
}
document.getElementById('userInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });

// ── Poll admin replies ────────────────────────────────────────────────────
function startPolling() {
  setInterval(() => {
    RoboDB.reload();
    const s = RoboDB.getSession(SESSION_ID);
    if (!s) return;
    if (s.messages.length > lastMsgCount) {
      s.messages.slice(lastMsgCount).forEach(m => {
        if (m.from === 'admin') { removeTyping(); addAdminBubble(m.text); }
      });
      lastMsgCount = s.messages.length;
    }
  }, 1000);
}

// ── Microphone ────────────────────────────────────────────────────────────
async function toggleMic() {
  if (listening) { if (recognition) try { recognition.stop(); } catch(e){} stopMicUI(); return; }
  if (!hasSR) { showToast('Voice input not supported — try Chrome or Safari'); return; }
  try { const s = await navigator.mediaDevices.getUserMedia({audio:true}); s.getTracks().forEach(t=>t.stop()); }
  catch(err) { showToast(err.name==='NotAllowedError'?'Mic blocked — allow in browser settings':'Mic error: '+err.message); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR(); recognition.lang='en-US'; recognition.continuous=false; recognition.interimResults=true;
  const inp = document.getElementById('userInput'); let final = '';
  recognition.onstart  = () => { listening=true; final=''; inp.value=''; startMicUI(); };
  recognition.onresult = e => { let int=''; final=''; for(let i=0;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript;else int+=e.results[i][0].transcript;} inp.value=final||int; };
  recognition.onend    = () => { stopMicUI(); const t=(final||inp.value).trim(); if(t){inp.value=t;sendMsg();}else showToast('No speech detected'); };
  recognition.onerror  = e => { stopMicUI(); const m={'no-speech':'No speech detected','not-allowed':'Mic blocked','aborted':''}; if(m[e.error]!==undefined&&m[e.error])showToast(m[e.error]); else if(e.error!=='aborted')showToast('Mic error: '+e.error); };
  try { recognition.start(); } catch { stopMicUI(); showToast('Could not start mic'); }
}
function startMicUI() {
  ['micBtn','micBtn2'].forEach(id=>{const b=document.getElementById(id);if(b){b.classList.add('recording');b.innerHTML='⏹️ Stop';}});
  document.getElementById('micBanner').classList.add('show');
}
function stopMicUI() {
  listening=false;
  ['micBtn','micBtn2'].forEach(id=>{const b=document.getElementById(id);if(b){b.classList.remove('recording');b.innerHTML=id==='micBtn'?'🎙️ Mic':'🎙️ Voice';}});
  document.getElementById('micBanner').classList.remove('show');
}

// ── Login ─────────────────────────────────────────────────────────────────
function openLogin()  { document.getElementById('loginOverlay').classList.add('show'); setTimeout(()=>document.getElementById('loginUser').focus(),180); }
function closeLogin() { document.getElementById('loginOverlay').classList.remove('show'); document.getElementById('loginErr').classList.remove('show'); document.getElementById('loginUser').value=''; document.getElementById('loginPass').value=''; }
function doLogin() {
  const u=document.getElementById('loginUser').value.trim(), p=document.getElementById('loginPass').value;
  if(u===ADMIN_USER&&p===ADMIN_PASS){closeLogin();window.location.href='admin.html';}
  else{document.getElementById('loginErr').classList.add('show');document.getElementById('loginPass').value='';document.getElementById('loginPass').focus();}
}
document.getElementById('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg,dur=3000){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}

init();
