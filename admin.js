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
      if (!S[id]) { S[id] = { id, name, messages: [], lastActivity: Date.now(), createdAt: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), unread: 0, device: navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop' }; save(); }
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
    matchResponse(text) { const t = text.toLowerCase(); return R.find(r => t.includes(r.keyword.toLowerCase())) || null; },
  };
})();

const ADMIN_USER = 'gtec', ADMIN_PASS = 'gtec123';
let selectedSess = null;
let admVoice = null;
let allVoices = [];

// ── Voice setup ───────────────────────────────────────────────────────────
const VOICE_PRESETS = [
  { id:'en-US-female', label:'Emma',   icon:'👩', lang:'en-US', gender:'female', keywords:['Google US English','Samantha','Victoria','Zira','Emma'] },
  { id:'en-US-male',   label:'James',  icon:'👨', lang:'en-US', gender:'male',   keywords:['Google US English Male','David','Mark','Alex','Daniel'] },
  { id:'en-GB-female', label:'Sophie', icon:'👸', lang:'en-GB', gender:'female', keywords:['Google UK English Female','Moira','Kate'] },
  { id:'en-GB-male',   label:'Oliver', icon:'🎩', lang:'en-GB', gender:'male',   keywords:['Google UK English Male','Daniel'] },
  { id:'en-AU',        label:'Olivia', icon:'🦘', lang:'en-AU', gender:'female', keywords:['Google Australian','Karen'] },
  { id:'en-IN',        label:'Priya',  icon:'🌸', lang:'en-IN', gender:'female', keywords:['Google Hindi','Lekha'] },
  { id:'es-ES',        label:'Sofia',  icon:'💃', lang:'es-ES', gender:'female', keywords:['Google español','Monica'] },
  { id:'fr-FR',        label:'Marie',  icon:'🥐', lang:'fr-FR', gender:'female', keywords:['Google français','Amelie'] },
  { id:'de-DE',        label:'Klaus',  icon:'🍺', lang:'de-DE', gender:'male',   keywords:['Google Deutsch','Stefan'] },
  { id:'ja-JP',        label:'Yuki',   icon:'🌸', lang:'ja-JP', gender:'female', keywords:['Google 日本語','Kyoko'] },
  { id:'zh-CN',        label:'Mei',    icon:'🐉', lang:'zh-CN', gender:'female', keywords:['Google 普通话','Ting-Ting'] },
  { id:'hi-IN',        label:'Anjali', icon:'🎵', lang:'hi-IN', gender:'female', keywords:['Google हिन्दी','Lekha'] },
  { id:'robot',        label:'Robot',  icon:'🤖', lang:'en-US', gender:'robot',  keywords:[] },
];

function loadVoices() {
  allVoices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  renderAdmVoiceList();
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 500);
}

function findVoiceForPreset(preset) {
  for (const kw of preset.keywords) { const v = allVoices.find(v => v.name.includes(kw)); if (v) return v; }
  return allVoices.find(v => v.lang.startsWith(preset.lang)) || null;
}

function renderAdmVoiceList() {
  const list = document.getElementById('admVoiceList'); list.innerHTML = '';
  VOICE_PRESETS.forEach(p => {
    const available = p.id === 'robot' || findVoiceForPreset(p);
    const item = document.createElement('div');
    item.className = 'vd-item' + (admVoice === p.id ? ' selected' : '');
    item.id = 'adm-vd-' + p.id;
    item.innerHTML = `<span class="vd-item-icon">${p.icon}</span><div style="flex:1"><div class="vd-item-name">${p.label}${!available?'<span style="font-size:10px;opacity:.4"> (unavailable)</span>':''}</div><div class="vd-item-lang">${p.lang} · ${p.gender}</div></div><button class="vd-test-btn" onclick="testAdmVoice('${p.id}',event)">▶</button>`;
    item.onclick = e => { if (!e.target.classList.contains('vd-test-btn')) selectAdmVoice(p.id); };
    list.appendChild(item);
  });
}

function testAdmVoice(id, e) {
  e.stopPropagation();
  const p = VOICE_PRESETS.find(x => x.id === id);
  if (p) speakWithPreset(`Hello! I'm ${p.label}, your admin voice.`, p);
}
function toggleAdmVoiceDD() { document.getElementById('admVoiceDD').classList.toggle('open'); }
function closeAdmVoiceDD()  { document.getElementById('admVoiceDD').classList.remove('open'); }
document.addEventListener('click', e => { if (!document.getElementById('admVoiceSelectorWrap').contains(e.target)) closeAdmVoiceDD(); });

function selectAdmVoice(id) {
  admVoice = id;
  document.querySelectorAll('#admVoiceDD .vd-item, #adm-vd-off').forEach(el => el.classList.remove('selected'));
  if (!id) {
    document.getElementById('adm-vd-off').classList.add('selected');
    document.getElementById('admVoiceBtnLabel').textContent = 'Voice: Off';
    document.getElementById('admVoiceBtn').classList.remove('active');
  } else {
    document.getElementById('adm-vd-' + id)?.classList.add('selected');
    const p = VOICE_PRESETS.find(x => x.id === id);
    document.getElementById('admVoiceBtnLabel').textContent = `${p.icon} ${p.label}`;
    document.getElementById('admVoiceBtn').classList.add('active');
  }
  localStorage.setItem('rc_adm_voice', id || '');
  closeAdmVoiceDD();
}

function speakWithPreset(text, preset) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const clean = text.replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/`/g, '');
  const u = new SpeechSynthesisUtterance(clean);
  if (preset.id === 'robot') {
    const base = allVoices.find(v => v.lang.startsWith('en')) || allVoices[0];
    if (base) u.voice = base; u.pitch = 0.2; u.rate = 0.85;
  } else {
    const v = findVoiceForPreset(preset);
    if (v) u.voice = v; u.lang = preset.lang;
    u.pitch = preset.gender === 'female' ? 1.1 : 0.85; u.rate = 0.95;
  }
  u.volume = 1; speechSynthesis.speak(u);
}

function speakAdmText(text) {
  if (!admVoice) return;
  const p = VOICE_PRESETS.find(x => x.id === admVoice);
  if (p) speakWithPreset(text, p);
}

// ── Clock ─────────────────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const n = new Date();
    document.getElementById('liveClock').textContent = n.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    document.getElementById('liveDate').textContent  = n.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});
  }
  tick(); setInterval(tick, 1000);
}

// ── Theme ─────────────────────────────────────────────────────────────────
function toggleTheme() { applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('rc_theme', t);
}

// ── Login ─────────────────────────────────────────────────────────────────
function doLogin() {
  const u = document.getElementById('lgUser').value.trim(), p = document.getElementById('lgPass').value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    document.getElementById('loginGate').style.display = 'none';
    document.getElementById('adminApp').classList.add('active');
    applyTheme(localStorage.getItem('rc_theme') || 'light');
    const sv = localStorage.getItem('rc_adm_voice');
    if (sv) selectAdmVoice(sv);
    renderConvList(); renderChips(); startAutoRefresh(); startClock();
    showToast('✅ Welcome back, Admin!');
  } else {
    document.getElementById('lgErr').classList.add('show');
    document.getElementById('lgPass').value = ''; document.getElementById('lgPass').focus();
  }
}
document.getElementById('lgPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('lgUser').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('lgPass').focus(); });
function exitToChat() { window.location.href = 'index.html'; }

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2400); }

// ── Stats ─────────────────────────────────────────────────────────────────
function updateStats() {
  const sessions = RoboDB.getAllSessions();
  document.getElementById('statTotal').textContent  = sessions.length;
  document.getElementById('statUnread').textContent = sessions.reduce((a,s) => a + (s.unread||0), 0);
  document.getElementById('statMsgs').textContent   = sessions.reduce((a,s) => a + s.messages.filter(m=>m.from==='user').length, 0);
}

// ── Conv list ─────────────────────────────────────────────────────────────
function renderConvList() {
  RoboDB.reload();
  const q = document.getElementById('searchInp')?.value.toLowerCase() || '';
  const sessions = RoboDB.getAllSessions()
    .filter(s => !q || s.name.toLowerCase().includes(q))
    .sort((a,b) => b.lastActivity - a.lastActivity);
  document.getElementById('convBadge').textContent = sessions.length;
  updateStats();
  const list = document.getElementById('convList'); list.innerHTML = '';
  if (!sessions.length) { list.innerHTML = '<div class="no-conv">No conversations yet.<br>Waiting for users… 👀</div>'; return; }
  sessions.forEach(s => {
    const msgs  = s.messages.filter(m => m.from === 'user');
    const last  = msgs[msgs.length - 1];
    const preview = last ? last.text : 'No messages yet';
    const item = document.createElement('div');
    item.className = 'conv-item' + (selectedSess === s.id ? ' selected' : '');
    item.onclick = () => { selectConv(s.id); closeDrawer(); };
    item.innerHTML = `
      <div class="ci-top"><span class="ci-name">${s.name}</span><span class="ci-time">${s.createdAt}</span></div>
      <div class="ci-device">${s.device || '💻 Desktop'}</div>
      <div class="ci-preview">${preview.substring(0,52)}${preview.length>52?'…':''}</div>
      <div class="ci-foot">
        <span style="font-size:10px;color:var(--sb-muted)">${s.messages.length} msg${s.messages.length!==1?'s':''}</span>
        ${s.unread>0?`<span class="unread-dot" title="${s.unread} unread"></span>`:''}
      </div>`;
    list.appendChild(item);
  });
}

// ── Select conv ───────────────────────────────────────────────────────────
function selectConv(id) {
  selectedSess = id; RoboDB.clearUnread(id);
  const s = RoboDB.getSession(id);
  document.getElementById('emptyState').style.display  = 'none';
  document.getElementById('convView').style.display    = 'flex';
  document.getElementById('cvName').textContent   = s.name;
  document.getElementById('cvDevice').textContent = s.device || '';
  const uc = s.messages.filter(m => m.from === 'user').length;
  document.getElementById('cvSub').textContent = `${uc} user message${uc!==1?'s':''} · ${s.id}`;
  renderAdminChat(s); renderConvList();
  if (admPhoneVisible) renderPhonePreview(s);
}

// ── Render chat ───────────────────────────────────────────────────────────
function renderAdminChat(session) {
  const body = document.getElementById('admBody'); body.innerHTML = '';
  session.messages.forEach(m => {
    if (m.from === 'bot') return;
    const isUser = m.from === 'user';
    const row = document.createElement('div');
    row.className = 'adm-row' + (isUser ? ' from-user' : '');
    if (!isUser) {
      row.innerHTML = `
        <div class="adm-av adm">🛠️</div>
        <div class="adm-bwrap">
          <div class="adm-from-label">Admin reply</div>
          <div class="adm-bubble from-admin">${m.text}</div>
          <div class="adm-time">${m.time}</div>
        </div>`;
    } else {
      row.innerHTML = `
        <div class="adm-av usr">You</div>
        <div class="adm-bwrap">
          <div class="adm-bubble from-user">${m.text}</div>
          <div class="adm-time">${m.time}</div>
        </div>`;
    }
    body.appendChild(row);
  });
  body.scrollTop = body.scrollHeight;
}

// ── Delete conv ───────────────────────────────────────────────────────────
function deleteConv() {
  if (!selectedSess || !confirm('Delete this conversation?')) return;
  RoboDB.deleteSession(selectedSess); selectedSess = null;
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('convView').style.display   = 'none';
  renderConvList(); showToast('🗑️ Conversation deleted.');
}

// ── Export conv ───────────────────────────────────────────────────────────
function exportConv() {
  if (!selectedSess) return;
  const s = RoboDB.getSession(selectedSess);
  const lines = [`RoboChat Export — ${s.name} (${s.id})`, `Created: ${s.createdAt}`, `Device: ${s.device}`, '─'.repeat(40)];
  s.messages.forEach(m => { lines.push(`[${m.time}] ${m.from.toUpperCase()}: ${m.text}`); });
  const blob = new Blob([lines.join('\n')], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `robochat-${s.id}.txt`; a.click();
  showToast('📄 Exported!');
}

// ── Send reply ────────────────────────────────────────────────────────────
function sendReply(custom) {
  const ta = document.getElementById('adminReply');
  const text = custom || ta.value.trim();
  if (!text) { showToast('⚠ Type a reply first.'); return; }
  if (!selectedSess) { showToast('⚠ Select a conversation first.'); return; }
  RoboDB.addMessage(selectedSess, 'admin', text); ta.value = '';
  const s = RoboDB.getSession(selectedSess); renderAdminChat(s);
  const uc = s.messages.filter(m => m.from === 'user').length;
  document.getElementById('cvSub').textContent = `${uc} user message${uc!==1?'s':''} · ${s.id}`;
  renderConvList(); showToast('✅ Reply sent to user!');
  speakAdmText('Reply sent: ' + text);
  if (admPhoneVisible && selectedSess) setTimeout(() => renderPhonePreview(RoboDB.getSession(selectedSess)), 100);
}
document.getElementById('adminReply').addEventListener('keydown', e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendReply(); } });

// ── Presets ───────────────────────────────────────────────────────────────
function renderChips() {
  const el = document.getElementById('chipList'); el.innerHTML = '';
  RoboDB.getSavedResponses().forEach(r => {
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = r.keyword;
    b.onclick = () => { document.getElementById('adminReply').value = r.text; document.getElementById('adminReply').focus(); };
    el.appendChild(b);
  });
}
function openSRManager()  { renderSRList(); document.getElementById('srOverlay').classList.add('show'); }
function closeSRManager() { document.getElementById('srOverlay').classList.remove('show'); renderChips(); }
function renderSRList() {
  const el = document.getElementById('srList'); const srs = RoboDB.getSavedResponses(); el.innerHTML = '';
  if (!srs.length) { el.innerHTML = '<p style="text-align:center;color:var(--text3);padding:24px;font-size:13px;">No presets yet.</p>'; return; }
  srs.forEach(r => {
    const c = document.createElement('div'); c.className = 'sr-card';
    c.innerHTML = `<div style="flex:1;min-width:0"><div class="sr-kw">${r.keyword}</div><div class="sr-txt">${r.text}</div></div><button class="sr-del" onclick="delSR(${r.id})">✕</button>`;
    el.appendChild(c);
  });
}
function addSR() {
  const kw=document.getElementById('srKw').value.trim(), tx=document.getElementById('srTx').value.trim();
  if(!kw||!tx){showToast('Fill both fields.');return;}
  RoboDB.addSavedResponse(kw,tx); document.getElementById('srKw').value=''; document.getElementById('srTx').value='';
  renderSRList(); showToast('✅ Preset saved!');
}
function delSR(id) { RoboDB.deleteSavedResponse(id); renderSRList(); showToast('🗑️ Deleted.'); }

// ── Auto-refresh ──────────────────────────────────────────────────────────
function startAutoRefresh() {
  setInterval(() => {
    renderConvList();
    if (selectedSess && RoboDB.getSession(selectedSess)) {
      const prev = document.getElementById('admBody').children.length;
      renderAdminChat(RoboDB.getSession(selectedSess));
    }
  }, 1500);
}

// ── Mobile drawer ─────────────────────────────────────────────────────────
function openDrawer()  { document.getElementById('convSidebar').classList.add('open');  document.getElementById('drawerBack').classList.add('show'); }
function closeDrawer() { document.getElementById('convSidebar').classList.remove('open'); document.getElementById('drawerBack').classList.remove('show'); }

// ── Viewport toggle (Desktop ↔ Mobile phone preview panel) ────────────────
let admPhoneVisible = false;
function toggleAdmViewport() {
  admPhoneVisible = !admPhoneVisible;
  const layout = document.querySelector('.layout');
  const icon   = document.getElementById('admViewportIcon');
  const label  = document.getElementById('admViewportLabel');
  if (admPhoneVisible) {
    layout.classList.add('with-phone');
    icon.innerHTML = `<rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/>`;
    label.textContent = 'Desktop view';
    if (selectedSess) renderPhonePreview(RoboDB.getSession(selectedSess));
  } else {
    layout.classList.remove('with-phone');
    icon.innerHTML = `<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/>`;
    label.textContent = 'Mobile view';
  }
}

// Render phone preview
function renderPhonePreview(session) {
  const body = document.getElementById('admPhoneBody');
  const nameEl = document.getElementById('admPhoneUser');
  if (!session) return;
  nameEl.textContent = session.name + ' · ' + (session.device || '');
  body.innerHTML = '';
  session.messages.forEach(m => {
    if (m.from === 'bot') return;
    const isUser = m.from === 'user';
    const isAdmin = m.from === 'admin';
    const row = document.createElement('div');
    row.className = 'phone-msg-row' + (isUser ? ' user' : '');
    row.innerHTML = `
      <div style="width:22px;height:22px;border-radius:50%;background:${isUser?'var(--indigo)':'var(--indigo-bg)'};display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;margin-bottom:2px;">${isUser?'👤':'🛠️'}</div>
      <div style="max-width:80%;display:flex;flex-direction:column;gap:2px;${isUser?'align-items:flex-end':''}">
        ${isAdmin?'<div style="font-size:9px;color:var(--orange);font-weight:700;letter-spacing:.5px;text-transform:uppercase;">Admin</div>':''}
        <div class="phone-bubble ${isUser?'user':isAdmin?'admin-reply':'bot'}">${m.text}</div>
        <div class="phone-btime">${m.time}</div>
      </div>`;
    body.appendChild(row);
  });
  body.scrollTop = body.scrollHeight;
}

// Quick reply from phone preview panel
function sendAdmPhoneReply() {
  const inp = document.getElementById('admPhoneReply');
  const text = inp.value.trim(); if (!text) return;
  inp.value = '';
  sendReply(text);
  if (admPhoneVisible && selectedSess) setTimeout(() => renderPhonePreview(RoboDB.getSession(selectedSess)), 100);
}
document.addEventListener('DOMContentLoaded', () => {
  const ri = document.getElementById('admPhoneReply');
  if (ri) ri.addEventListener('keydown', e => { if (e.key==='Enter') sendAdmPhoneReply(); });
});

// ── DATABASE PANEL ────────────────────────────────────────────────────────
function openDBPanel() {
  renderDBPanel();
  document.getElementById('dbPanel').classList.add('show');
}
function closeDBPanel() {
  document.getElementById('dbPanel').classList.remove('show');
}

function renderDBPanel() {
  RoboDB.reload();
  const query    = (document.getElementById('dbSearch')?.value || '').toLowerCase();
  const sessions = RoboDB.getAllSessions().sort((a,b) => b.lastActivity - a.lastActivity);
  const content  = document.getElementById('dbContent');
  const statsEl  = document.getElementById('dbStats');
  content.innerHTML = '';

  const totalMsgs   = sessions.reduce((a,s) => a + s.messages.length, 0);
  const totalUser   = sessions.reduce((a,s) => a + s.messages.filter(m=>m.from==='user').length, 0);
  const totalAdmin  = sessions.reduce((a,s) => a + s.messages.filter(m=>m.from==='admin').length, 0);
  statsEl.innerHTML = `
    <span class="db-stat-chip">📋 ${sessions.length} sessions</span>
    <span class="db-stat-chip">💬 ${totalMsgs} messages</span>
    <span class="db-stat-chip">👤 ${totalUser} user</span>
    <span class="db-stat-chip">🛠️ ${totalAdmin} admin replies</span>
    <span class="db-stat-chip" style="background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.3);color:#16a34a;">💾 ${(JSON.stringify(sessions).length/1024).toFixed(1)} KB stored</span>`;

  if (!sessions.length) { content.innerHTML = '<p style="text-align:center;color:var(--text3);padding:30px;font-size:13px;">No data in database yet.</p>'; return; }

  sessions.forEach(s => {
    const msgs = query ? s.messages.filter(m => m.text.toLowerCase().includes(query)) : s.messages;
    if (query && !msgs.length && !s.name.toLowerCase().includes(query)) return;
    const card = document.createElement('div'); card.className = 'db-session-card';
    const sessionId = s.id;
    card.innerHTML = `
      <div class="db-session-head" onclick="toggleDBSession('${sessionId}')">
        <div>
          <div class="db-session-name">${s.name} <span style="font-size:10px;color:var(--text3);font-weight:400;">${s.device||''}</span></div>
          <div class="db-session-meta">ID: ${s.id} · Created: ${s.createdAt} · ${s.messages.length} messages</div>
        </div>
        <div style="display:flex;gap:7px;align-items:center;">
          ${s.unread>0?`<span style="background:rgba(249,115,22,.15);color:var(--orange);border:1px solid rgba(249,115,22,.3);font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">${s.unread} unread</span>`:''}
          <span style="font-size:11px;color:var(--text3);">▼</span>
        </div>
      </div>
      <div class="db-session-msgs" id="dbsess-${sessionId}">
        ${msgs.filter(m=>m.from!=='bot').map(m=>`
          <div class="db-msg-row">
            <div class="db-msg-from ${m.from}">${m.from.toUpperCase()}</div>
            <div class="db-msg-text">${m.text}</div>
            <div class="db-msg-time">${m.time}</div>
          </div>`).join('')}
      </div>`;
    content.appendChild(card);
  });
}

function toggleDBSession(id) {
  const el = document.getElementById('dbsess-' + id);
  if (el) el.classList.toggle('open');
}

function clearAllDB() {
  if (!confirm('Delete ALL conversations from the database? This cannot be undone.')) return;
  RoboDB.getAllSessions().forEach(s => RoboDB.deleteSession(s.id));
  renderDBPanel(); renderConvList();
  showToast('🗑️ Database cleared.');
}

function exportAllDB() {
  RoboDB.reload();
  const sessions = RoboDB.getAllSessions();
  const lines = ['=== InfinexChat Database Export ===', `Exported: ${new Date().toLocaleString()}`, `Sessions: ${sessions.length}`, ''];
  sessions.forEach(s => {
    lines.push(`--- ${s.name} (${s.id}) ---`);
    lines.push(`Device: ${s.device}  Created: ${s.createdAt}`);
    s.messages.forEach(m => lines.push(`  [${m.time}] ${m.from.toUpperCase()}: ${m.text}`));
    lines.push('');
  });
  const blob = new Blob([lines.join('\n')], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `infinex-db-${Date.now()}.txt`; a.click();
  showToast('📄 Full database exported!');
}

// Apply saved theme on load
applyTheme(localStorage.getItem('rc_theme') || 'light');
