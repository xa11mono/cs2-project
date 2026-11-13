/* v147 — автоматическая смена клубной формы на портретах игроков.
   Отдельная подсистема: Node companion держит секрет API, очередь ограничена одним запросом,
   исходные фотографии никогда не перезаписываются. */
(() => {
  'use strict';
  const W = window;
  const API = 'http://127.0.0.1:47831';
  const CLIENT_HEADER = 'X-CS2-Jersey-Client';
  const DATA_KEY = 'cs2JerseySwap147';
  const FREE_AGENT = '__FREE_AGENT__';
  const OUT = '__OUT__';
  const norm = s => String(s || '').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const teamList = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const season = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const media = () => W.V31Media || null;
  let active = false;
  let queue = [];
  const queued = new Set();
  let health = { checkedAt: 0, online: false, configured: false, model: '', error: 'Локальный помощник ещё не проверен' };
  let selectedTeam = '';

  function state() {
    const s = season();
    if (!s) return null;
    if (!s[DATA_KEY] || typeof s[DATA_KEY] !== 'object') {
      s[DATA_KEY] = { enabled: true, bootstrapped: false, lastSeen: {}, portraits: {}, kits: {}, pending: {}, lastError: '', lastSuccessAt: 0 };
    }
    const d = s[DATA_KEY];
    d.lastSeen = d.lastSeen && typeof d.lastSeen === 'object' ? d.lastSeen : {};
    d.portraits = d.portraits && typeof d.portraits === 'object' ? d.portraits : {};
    d.kits = d.kits && typeof d.kits === 'object' ? d.kits : {};
    d.pending = d.pending && typeof d.pending === 'object' ? d.pending : {};
    return d;
  }
  function save() {
    try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {}
  }
  function ownersNow() {
    const map = new Map();
    teamList().forEach(t => {
      if (!t || !t.name) return;
      (Array.isArray(t.players) ? t.players : []).forEach(p => {
        if (p && p.nick) map.set(norm(p.nick), { nick: p.nick, player: p, team: t.name, teamObject: t });
      });
    });
    try {
      (transferState.freeAgents || []).forEach(p => {
        if (p && p.nick && !map.has(norm(p.nick))) map.set(norm(p.nick), { nick: p.nick, player: p, team: FREE_AGENT, teamObject: null });
      });
    } catch (e) {}
    return map;
  }
  function teamForPlayer(p) {
    if (!p || !p.nick) return null;
    return ownersNow().get(norm(p.nick)) || null;
  }
  function tintFor(teamName) {
    try {
      const u = media()?.url('team', teamName);
      const file = u && u.split('/').pop().split('?')[0];
      const rgb = file && W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[file];
      if (Array.isArray(rgb) && rgb.length >= 3) return '#' + rgb.slice(0, 3).map(v => Math.max(0, Math.min(255, +v || 0)).toString(16).padStart(2, '0')).join('');
    } catch (e) {}
    return '#18232d';
  }
  function safeHex(value, fallback) {
    const s = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : fallback;
  }
  function kitFor(teamName) {
    const d = state();
    const saved = d && d.kits[teamName] || {};
    return {
      description: String(saved.description || '').slice(0, 600),
      primaryColor: safeHex(saved.primaryColor, tintFor(teamName)),
      secondaryColor: safeHex(saved.secondaryColor, '#111820'),
      version: Number(saved.version) || 1
    };
  }
  function kitFingerprint(teamName) {
    const k = kitFor(teamName);
    const value = [teamName, k.description, k.primaryColor, k.secondaryColor, k.version].join('|');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function portraitKey(nick, teamName, mode) {
    return [norm(nick), norm(teamName), mode === 'full' ? 'full' : 'portrait'].join('|');
  }
  function playerManifestEntry(nick) {
    const players = W.CS2_MEDIA && W.CS2_MEDIA.players || {};
    const wanted = norm(nick);
    const key = Object.keys(players).find(x => norm(x) === wanted);
    return key ? players[key] : null;
  }
  function sourceUrl(nick, mode) {
    const m = media();
    if (mode === 'full') {
      const full = m && m.full(nick);
      if (full) return full;
    }
    const current = m && m.url('player', nick);
    if (current) return current;
    const entry = playerManifestEntry(nick);
    return mode === 'full' && entry && entry.full ? entry.full : entry && entry.file || null;
  }
  async function blobToDataUrl(blob) {
    if (!blob || !/^image\/(png|jpeg|webp)$/i.test(blob.type || '')) throw new Error('Исходник должен быть PNG, JPG или WEBP');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    return 'data:' + blob.type + ';base64,' + btoa(binary);
  }
  async function sourcePayload(nick, mode) {
    const url = sourceUrl(nick, mode);
    if (!url) throw new Error('Для ' + nick + ' не найден исходный портрет');
    if (/^blob:|^https?:/i.test(url)) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Не удалось прочитать исходное фото: HTTP ' + response.status);
      return { sourceDataUrl: await blobToDataUrl(await response.blob()) };
    }
    const path = String(url).replace(/\\/g, '/').split('?')[0].replace(/^\.\//, '');
    if (!/^assets\/media\/players\/[a-z0-9._/-]+$/i.test(path) || path.includes('/../')) {
      throw new Error('Путь к исходнику не разрешён: ' + path);
    }
    return { sourcePath: path };
  }
  function promptFor(teamName) {
    const k = kitFor(teamName);
    const details = k.description || 'clean professional esports match jersey with a unique, restrained club-inspired design';
    return [
      'Edit the provided real esports player photograph. Change ONLY the shirt/jersey garment to the team kit described below.',
      'TEAM: ' + teamName + '. KIT: ' + details + '.',
      'Primary kit color: ' + k.primaryColor + '. Secondary kit color: ' + k.secondaryColor + '.',
      'Preserve the exact same person and identity: face, facial features, eyes, nose, mouth, skin, hair, ears, neck, expression, age, body shape, pose, arms, hands and posture must remain unchanged.',
      'Keep the original camera angle, crop, lighting, shadows, background and photographic style. Preserve fabric folds and realistic stitching. Fit the jersey naturally to the existing body.',
      'Do not invent readable lettering, sponsor names, numbers, badges or logos. Leave the chest design clean and uncluttered. Do not add accessories or other objects.'
    ].join(' ');
  }
  function enqueue(p, teamName, mode, force) {
    const d = state();
    if (!d || !d.enabled || !p || !p.nick || !teamName || teamName === FREE_AGENT) return false;
    const kind = mode === 'full' ? 'full' : 'portrait';
    const key = portraitKey(p.nick, teamName, kind);
    const fingerprint = kitFingerprint(teamName);
    const existing = d.portraits[key];
    if (!force && existing && existing.kitFingerprint === fingerprint) return false;
    if (queued.has(key) || (d.pending[key] && !force)) return false;
    const job = { key, nick: p.nick, teamName, mode: kind, kitFingerprint: fingerprint, force: !!force };
    d.pending[key] = job;
    queue.push(job); queued.add(key);
    d.lastError = '';
    save();
    pump();
    return true;
  }
  async function checkService(force) {
    const now = Date.now();
    if (!force && now - health.checkedAt < 10000) return health;
    health = { checkedAt: now, online: false, configured: false, model: '', error: 'Проверяем локальный помощник…' };
    try {
      const response = await fetch(API + '/health', { headers: { [CLIENT_HEADER]: 'v147' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));
      health = { checkedAt: now, online: true, configured: !!data.configured, model: String(data.model || ''), error: data.configured ? '' : 'В помощнике не задан HF_TOKEN' };
    } catch (e) {
      health = { checkedAt: now, online: false, configured: false, model: '', error: e.message || 'Локальный помощник недоступен' };
    }
    return health;
  }
  async function pump() {
    const d = state();
    if (!d || !d.enabled) return;
    // Queue survives page reloads and a temporarily offline helper.
    if (!queue.length) Object.values(d.pending).forEach(job => {
      if (job && job.key && !queued.has(job.key)) { queue.push(job); queued.add(job.key); }
    });
    if (active || !queue.length) return;
    active = true;
    try {
      const h = await checkService(false);
      if (!h.online || !h.configured) {
        d.lastError = h.error || 'AI-помощник не настроен';
        save();
        return;
      }
      while (queue.length && d.enabled) {
        const job = queue.shift();
        try {
          const src = await sourcePayload(job.nick, job.mode);
          const k = kitFor(job.teamName);
          const response = await fetch(API + '/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', [CLIENT_HEADER]: 'v147' },
            body: JSON.stringify({
              nick: job.nick,
              teamName: job.teamName,
              mode: job.mode,
              kitDescription: k.description,
              primaryColor: k.primaryColor,
              secondaryColor: k.secondaryColor,
              prompt: promptFor(job.teamName),
              force: job.force,
              ...src
            })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.relativeUrl) throw new Error(result.error || ('AI request failed: HTTP ' + response.status));
          d.portraits[job.key] = {
            url: result.relativeUrl,
            kitFingerprint: job.kitFingerprint,
            model: result.model || h.model || '',
            createdAt: Date.now(),
            mode: job.mode
          };
          delete d.pending[job.key];
          d.lastSuccessAt = Date.now();
          d.lastError = '';
          save();
          try { W.HS && W.HS.render && W.HS.render(); } catch (e) {}
        } catch (e) {
          d.lastError = job.nick + ' → ' + job.teamName + ': ' + (e.message || 'ошибка генерации');
          console.warn('[jersey-swap]', d.lastError);
          save();
        } finally {
          queued.delete(job.key);
        }
      }
    } finally {
      active = false;
      try { W.HS && W.HS.S && W.HS.S.page === 'settings' && W.HS.render(); } catch (e) {}
    }
  }
  function reconcile() {
    const d = state();
    if (!d) return;
    const current = ownersNow();
    if (!d.bootstrapped) {
      if (!current.size) return;
      current.forEach((owner, key) => { d.lastSeen[key] = owner.team; });
      d.bootstrapped = true;
      save();
      return;
    }
    let changed = false;
    current.forEach((owner, key) => {
      const prev = d.lastSeen[key];
      if (prev !== owner.team && owner.team !== FREE_AGENT && owner.team !== OUT && d.enabled) {
        enqueue(owner.player, owner.team, 'portrait', false);
      }
      if (prev !== owner.team) { d.lastSeen[key] = owner.team; changed = true; }
    });
    Object.keys(d.lastSeen).forEach(key => {
      if (!current.has(key) && d.lastSeen[key] !== OUT) { d.lastSeen[key] = OUT; changed = true; }
    });
    if (changed) save();
  }
  function queueTeam(teamName, force) {
    const t = teamList().find(x => x && x.name === teamName);
    if (!t) return 0;
    const players = (t.players || []).filter(p => p && p.nick && (!p.status || p.status === 'STARTER')).slice(0, 5);
    let n = 0;
    players.forEach(p => { if (enqueue(p, teamName, 'portrait', !!force)) n++; });
    return n;
  }
  function photoFor(p, original, mode) {
    if (!p || !p.nick) return original || null;
    const owner = teamForPlayer(p);
    if (!owner || !owner.team || owner.team === FREE_AGENT) return original || null;
    const d = state();
    if (!d) return original || null;
    const kind = mode === 'full' ? 'full' : 'portrait';
    const key = portraitKey(p.nick, owner.team, kind);
    const record = d.portraits[key];
    if (record && record.url && record.kitFingerprint === kitFingerprint(owner.team)) return record.url;
    if (kind === 'full' && d.enabled) enqueue(p, owner.team, 'full', false);
    return original || null;
  }
  function statusText() {
    const d = state();
    const q = d ? Object.keys(d.pending).length : queue.length;
    const service = !health.online ? health.error : (!health.configured ? 'Помощник запущен, но HF_TOKEN не задан' : 'Подключено · ' + (health.model || 'модель готова'));
    return service + (q ? ' · в очереди: ' + q : '') + (d && d.lastError ? ' · последняя ошибка: ' + d.lastError : '');
  }
  function settingsBox() {
    const d = state();
    if (!d) return '';
    const list = teamList().filter(t => t && t.name).slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!selectedTeam || !list.some(t => t.name === selectedTeam)) selectedTeam = list[0]?.name || '';
    const kit = selectedTeam ? kitFor(selectedTeam) : { description: '', primaryColor: '#18232d', secondaryColor: '#111820' };
    const options = list.map(t => '<option value="' + esc(t.name) + '"' + (t.name === selectedTeam ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('');
    const count = Object.keys(d.portraits).length;
    const status = statusText();
    return H.box('Автоматическая смена клубной формы',
      '<div class="md-auto">' +
      '<p class="hs-note">При обнаружении перехода игрока программа берёт его исходное фото, меняет только форму через AI и сохраняет результат в <code>assets/media/generated-jerseys/</code>. Оригиналы не изменяются. Одновременно выполняется один запрос, готовые изображения кешируются.</p>' +
      '<div class="pt-actions"><button type="button" class="hs-btn' + (d.enabled ? '' : ' ghost') + '" data-jtoggle>' + (d.enabled ? 'Автогенерация включена' : 'Автогенерация выключена') + '</button>' +
      '<button type="button" class="hs-btn ghost" data-jprobe>Проверить помощник</button>' +
      '<button type="button" class="hs-btn ghost" data-jretry' + (Object.keys(d.pending).length ? '' : ' disabled') + '>Продолжить очередь (' + Object.keys(d.pending).length + ')</button></div>' +
      '<p class="hs-note" role="status">' + esc(status) + ' · сохранённых портретов: ' + count + '</p>' +
      '<label class="hs-field"><span>Команда</span><select class="hs-inp" data-jteam>' + options + '</select></label>' +
      '<label class="hs-field"><span>Описание формы (цвета, узор, воротник, рукава; до 600 символов)</span><textarea class="hs-inp" rows="3" maxlength="600" data-jdescription placeholder="Например: чёрная соревновательная футболка, ярко-зелёные панели на плечах, тонкие геометрические линии, матовая ткань…">' + esc(kit.description) + '</textarea></label>' +
      '<div class="pt-actions"><label class="hs-field"><span>Основной цвет</span><input class="hs-inp" type="color" value="' + kit.primaryColor + '" data-jprimary></label>' +
      '<label class="hs-field"><span>Дополнительный цвет</span><input class="hs-inp" type="color" value="' + kit.secondaryColor + '" data-jsecondary></label></div>' +
      '<div class="pt-actions"><button type="button" class="hs-btn" data-jsave>Сохранить дизайн формы</button>' +
      '<button type="button" class="hs-btn ghost" data-jgenerate' + (selectedTeam ? '' : ' disabled') + '>Создать портреты текущей пятёрки</button></div>' +
      '<p class="hs-note">AI может ошибиться с лицом, эмблемами и надписями. Оригинал всегда остаётся резервом. Точные логотипы и спонсорские надписи лучше наносить отдельной графикой.</p>' +
      '<p class="hs-note">Ключ API вводится только в <code>tools/jerseys/.env</code> на компьютере — не в игру и не в Git. Облачная генерация может быть платной.</p>' +
      '<p class="hs-note"><a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener">Создать токен Hugging Face</a> · инструкция: <code>tools/jerseys/README_RU.md</code></p>' +
      '</div>');
  }
  function saveKitFromUI() {
    const d = state(), root = document.getElementById('hs-root');
    if (!d || !root) return;
    const team = root.querySelector('[data-jteam]')?.value;
    if (!team) return;
    selectedTeam = team;
    d.kits[team] = {
      description: String(root.querySelector('[data-jdescription]')?.value || '').slice(0, 600).trim(),
      primaryColor: safeHex(root.querySelector('[data-jprimary]')?.value, tintFor(team)),
      secondaryColor: safeHex(root.querySelector('[data-jsecondary]')?.value, '#111820'),
      version: (Number(d.kits[team]?.version) || 0) + 1
    };
    save();
    W.HS.render();
  }
  W.CS2JerseySwap = {
    state,
    photoFor,
    reconcile,
    checkService,
    queueTeam,
    status: () => ({ ...health, queue: Object.keys(state()?.pending || {}).length, active }),
    portraitKey,
    kitFingerprint
  };

  // События ускоряют обнаружение; периодическая сверка ловит и прямые изменения состава.
  ['transfer', 'signing', 'release', 'bench', 'loan', 'loan-return', 'promotion', 'standin', 'standin-return', 'retire', 'buyout'].forEach(type => {
    try { W.CS2?.on?.(type, () => reconcile()); } catch (e) {}
  });
  if (W.CS2Loop?.every) W.CS2Loop.every(reconcile, 5000, 'jersey-swap-v147');
  else setTimeout(reconcile, 2500);

  const H = W.HS;
  if (H && H.PAGES && typeof H.PAGES.settings === 'function') {
    const oldSettings = H.PAGES.settings;
    H.PAGES.settings = function () { return oldSettings.apply(this, arguments) + settingsBox(); };
    H.CLICKS.push(['[data-jtoggle]', () => {
      const d = state(); if (!d) return;
      d.enabled = !d.enabled; save();
      if (d.enabled) pump();
      H.render();
    }]);
    H.CLICKS.push(['[data-jprobe]', async () => { await checkService(true); await pump(); H.render(); }]);
    H.CLICKS.push(['[data-jretry]', () => { pump(); }]);
    H.CLICKS.push(['[data-jsave]', saveKitFromUI]);
    H.CLICKS.push(['[data-jteam]', el => { selectedTeam = el.value; H.render(); }]);
    H.CLICKS.push(['[data-jgenerate]', () => {
      const root = document.getElementById('hs-root');
      const name = root?.querySelector('[data-jteam]')?.value || selectedTeam;
      if (!name) return;
      selectedTeam = name;
      const n = queueTeam(name, true);
      if (!n) health.error = 'В команде нет игроков основы с доступными фото';
      H.render();
    }]);
  }
  setTimeout(() => { checkService(false).then(() => pump()); reconcile(); }, 1800);
})();