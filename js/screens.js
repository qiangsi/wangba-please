'use strict';
// 检查台以外的画面：开场、标题、日期卡、报纸、下班结算、结局、片尾。

const SAVE_KEY = 'wangba-please-save-v1';
const MEMBERS = ['cat', 'uncle', 'nephew'];

function newGame() {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, {
    day: 1, savings: 0,
    anchor: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime(),
    family: {
      cat: { name: '橘座（猫）', hunger: 0, gone: false },
      uncle: { name: '二舅', hunger: 1, sick: 0, gone: false },
      nephew: { name: '侄子小磊', wantsGPU: false, gpuHappy: false },
    },
    stats: { approve: 0, deny: 0, detain: 0, correct: 0, wrong: 0 },
    flags: {}, tut: {},
  });
}

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 存不了就算了 */ }
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!(s && s.day > 1 && s.day <= LAST_DAY)) return null;
    if (!s.anchor) {
      // 老存档迁移：对齐到真实日历，让继续游戏的那天显示今天
      const d = new Date();
      s.anchor = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - (s.day - 1) * 86400000;
    }
    return s;
  } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 同上 */ } }

// ———————————————————— 首屏日期/天气牌 ————————————————————

const WEATHER = { txt: '', temp: '' };
function fetchT(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { signal: ctl.signal }).finally(() => clearTimeout(t));
}
function wmoText(c) {
  const M = { 0: '晴', 1: '晴间多云', 2: '多云', 3: '阴', 45: '雾', 48: '雾凇', 51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
    56: '冻雨', 57: '冻雨', 61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '冻雨', 71: '小雪', 73: '中雪', 75: '大雪',
    77: '米雪', 80: '阵雨', 81: '阵雨', 82: '强阵雨', 85: '阵雪', 86: '阵雪', 95: '雷阵雨', 96: '雷雨冰雹', 99: '雷雨冰雹' };
  return M[c] || '多云';
}
function seededWeather() {
  const d = new Date();
  const s = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
  return ['晴', '多云', '阴', '小雨', '晴转多云'][s % 5];
}
function initWeather() {
  WEATHER.txt = '天气…';
  WEATHER.temp = '';
  (async () => {
    let lat = 39.9042, lon = 116.4074; // 默认北京
    try {
      const r = await fetchT('https://ipapi.co/json/', 2500);
      if (r.ok) {
        const j = await r.json();
        if (j && isFinite(j.latitude) && isFinite(j.longitude)) { lat = j.latitude; lon = j.longitude; }
      }
    } catch (e) { /* 定位失败就用默认城市 */ }
    try {
      const r = await fetchT(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`, 3500);
      if (r.ok) {
        const j = await r.json();
        const c = j && j.current;
        if (c && isFinite(c.weather_code)) {
          WEATHER.txt = wmoText(c.weather_code);
          WEATHER.temp = isFinite(c.temperature_2m) ? `${Math.round(c.temperature_2m)}°C` : '';
          return;
        }
      }
    } catch (e) { /* 接口失败就本地生成 */ }
    WEATHER.txt = seededWeather();
    WEATHER.temp = '';
  })();
}
function drawDateChip() {
  const d = new Date();
  const wk = '日一二三四五六'[d.getDay()];
  const l1 = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${wk}`;
  const l2 = (WEATHER.txt || '天气…') + (WEATHER.temp ? ` ${WEATHER.temp}` : '');
  const w = Math.max(tw(l1, 10), tw(l2, 10)) + 14;
  const x1 = W - 10, x0 = x1 - w, y0 = 46, y1 = y0 + 35;
  rect(x0, y0, x1, y1, 'rgb(16,20,26)');
  outline(x0, y0, x1, y1, K.NEON_D);
  outline(x0 + 2, y0 + 2, x1 - 2, y1 - 2, 'rgb(30,60,66)');
  txt(x0 + 7, y0 + 4, l1, 10, K.NEON);
  txt(x0 + 7, y0 + 19, l2, 10, K.NEON_D);
}

// ———————————————————— 打字机 ————————————————————

function typeLines(paras) {
  const out = [];
  let t = 0.5;
  paras.forEach((para, pi) => {
    for (const s of para) { out.push({ pi, s, t }); t += [...s].length / 17 + 0.12; }
    t += 0.6;
  });
  out.end = t + 1.3;
  out.npara = paras.length;
  return out;
}

const INTRO_LINES = typeLines([
  ['恭喜。'],
  ['本店原网管回家结婚去了，', '老板娘把你抽中了。'],
  ['请立即到 毛豆电竞网吧 收银台 报到。', '绿盾行动，本周严打。'],
]);
const CANCELED_LINES = typeLines([
  ['你把策划案拒之门外。'],
  ['因此，这个游戏从未被做出来。'],
  ['……', '（那你刚才玩的是什么？）'],
]);

function drawTyped(lines) {
  rect(0, 0, W - 1, H - 1, K.INK);
  const total = lines.length + lines.npara - 1;
  let y = Math.floor(H / 2 - total * 18 / 2), last = null;
  for (const { pi, s, t } of lines) {
    if (last !== null && pi !== last) y += 18;
    last = pi;
    const n = Math.floor((st() - t) * 17);
    if (n > 0) txt(Math.floor(W / 2 - tw(s) / 2), y, s, 12, 'rgb(214,206,190)', 'la', n);
    y += 18;
  }
  txt(W - 8, H - 14, '点击跳过', 8, K.GREY_D, 'ra');
}

let lastKey = -1;
function typedSounds(lines) {
  const k = Math.floor(st() * 17);
  if (k === lastKey) return;
  lastKey = k;
  for (const { s, t } of lines) {
    const i = Math.floor((st() - t) * 17);
    if (i >= 0 && i < [...s].length && [...s][i].trim()) { SFX.play('key'); break; }
  }
}

// ———————————————————— 标题 ————————————————————

const CONTINUE_TITLE = [190, 296, 312, 324], NEWGAME_TITLE = [328, 296, 450, 324];
const RESTART_BTN = [250, 314, 390, 340];

function drawTitle(t) {
  G.drawImage(BG_IMG, 0, 0);
  darken(0.88);
  drawDateChip();
  if (t < 0.3) return;
  rect(0, 120, W - 1, 218, 'rgb(30,58,60)');
  rect(0, 120, W - 1, 121, K.NEON); rect(0, 217, W - 1, 218, K.NEON);
  bigText(W / 2, 134, '网吧，PLEASE', 12, 4, K.WHITE, K.INK);
  if (t >= 1.0) bigText(W / 2, 232, '请出示你的身份证', 12, 2, 'rgb(160,220,200)', K.INK);
  if (t >= 1.6) txt(W / 2, 280, '一场关于青春、身份证与《五三》的怀旧检查', 8, K.GREY, 'ma');
  if (t < 1.6) return;
  const save = loadSave();
  if (save) {
    for (const [box, label] of [[CONTINUE_TITLE, `继续 · DAY ${save.day}`], [NEWGAME_TITLE, '从头开始']]) {
      const hover = ptr.mouse && inBox(ptr.x, ptr.y, box);
      rect(...box, hover ? K.NEON_D : 'rgb(20,40,42)'); outline(...box, K.NEON);
      txt(center(box)[0], box[1] + 7, label, 12, K.WHITE, 'ma');
    }
  } else if (Math.floor(t * 2) % 2 === 0) txt(W / 2, 344, '点击开始上班', 12, K.WHITE, 'ma');
}

function titleClick(x, y) {
  if (st() < 1.6) return;
  const save = loadSave();
  if (!save) { newGame(); go('daycard'); return; }
  if (inBox(x, y, CONTINUE_TITLE)) { newGame(); Object.assign(S, save); go('daycard'); return; }
  if (inBox(x, y, NEWGAME_TITLE)) { clearSave(); newGame(); go('daycard'); }
}

function drawBoot() {
  rect(0, 0, W - 1, H - 1, K.INK);
  bigText(W / 2, 120, '网吧，PLEASE', 12, 4, K.WHITE);
  txt(W / 2, 202, '请出示你的身份证 · Papers, Please 像素小游戏', 10, 'rgb(160,220,200)', 'ma');
  if (Math.floor(now * 2) % 2 === 0) txt(W / 2, 244, '点击屏幕开始', 12, K.WHITE, 'ma');
  txt(W / 2, 290, '建议横屏、打开声音 · 鼠标或手指拖动证件 · 全程约 30 分钟', 8, K.GREY, 'ma');
  txt(W / 2, 320, '玩法致敬 Lucas Pope《Papers, Please》 · 画面与音效均由程序生成 · 题材原创', 8, K.GREY_D, 'ma');
  drawDateChip();
}

function drawDayCard(t) {
  rect(0, 0, W - 1, H - 1, K.INK);
  if (t < 0.55) return;
  bigText(W / 2, 128, `DAY ${S.day}`, 12, 4, K.WHITE);
  txt(W / 2, 196, `${gameDate(S.day)}  ${gameWeekday(S.day)}  ·  绿盾严打周`, 10, K.GREY, 'ma');
}

// ———————————————————— 报纸 ————————————————————

const NEWS_ICON = {
  gate: ['X.X.X.X.X.X', 'XXXXXXXXXXX', 'X.........X', 'X..XXX....X', 'X..X.X....X', 'X..X.X....X', 'XXXXXXXXXXX'],
  clock: ['...XXXX....', '.X......X..', 'X....X...X.', 'X....X...X.', 'X....XX..X.', '.X.......X.', '...XXXX....'],
  plane: ['....X......', '....XX.....', 'XXXXXXXXX..', '....XX.....', '....X......', '...XXX.....', '..X...X....'],
  drumstick: ['.....XXX...', '....XXXXX..', '...XXXXXX..', '..XXXXX....', '.XXXX......', 'XXX........', 'XX.........'],
  jorji: ['..XXXXXX...', '.X......X..', 'X..X..X..X.', 'X........X.', 'X..XX....X.', '.X......X..', '..XXXXXX...'],
  medal: ['...XXXX....', '..X....X...', '..X.XX.X...', '..XXXXXX...', '...XXXX....', '....XX.....', '....XX.....'],
};

function drawNews(t) {
  const n = { ...NEWS[S.day] };
  if (S.day === 6 && S.flags.bribed) n.h2 = '后巷联盟：感谢某位网管的“合作”';
  rect(0, 0, W - 1, H - 1, K.DESK);
  for (let y = 4; y < H; y += 7) if ((y * 7919) % 10 < 6) rect(0, y, W - 1, y, K.DESK_D);
  const px = 140, pw = 360, ph = 330;
  const py = Math.round(lerp(H + 4, 16, easeOut(seg(t, 0, 0.45))));
  rect(px + 4, py + 4, px + pw + 4, py + ph + 4, K.DESK_D);
  const ink = 'rgb(40,34,30)', faint = 'rgb(176,164,144)';
  rect(px, py, px + pw, py + ph, 'rgb(224,214,192)');
  bigText(px + pw / 2, py + 10, '绿盾周报', 12, 2, ink);
  txt(px + pw / 2, py + 38, `GREEN SHIELD WEEKLY  ·  ${gameDate(S.day)}`, 8, K.TEXT_L, 'ma');
  rect(px + 10, py + 50, px + pw - 10, py + 51, ink);
  rect(px + 10, py + 54, px + pw - 10, py + 54, ink);
  const k = tw(n.h1) * 2 <= pw - 24 ? 2 : 1;
  bigText(px + pw / 2, py + 62, n.h1, 12, k, ink);
  let yy = py + 62 + (k === 2 ? 30 : 18);
  for (const s of wrap(n.sub, 10, pw - 40)) { txt(px + pw / 2, yy, s, 10, K.TEXT, 'ma'); yy += 13; }
  yy += 4;
  rect(px + 10, yy, px + pw - 10, yy, ink);
  yy += 8;
  pattern(NEWS_ICON[n.icon] || NEWS_ICON.gate, px + 14, yy, { X: ink }, 2);
  let hy = yy + 2;
  for (const s of wrap(n.h2, 12, pw - 175)) { txt(px + 160, hy, s, 12, ink); hy += 16; }
  for (let r = 0; r < 4; r++) rect(px + 160, hy + 6 + r * 9, px + 340 - ((r * 37) % 50), hy + 9 + r * 9, faint);
  yy = Math.max(yy + 110, hy + 46);
  for (let row = 0; yy + row * 10 < py + ph - 12; row++) {
    for (let col = 0; col < 3; col++) {
      const x0 = px + 14 + col * 114;
      rect(x0, yy + row * 10, x0 + 100 - ((row * 13 + col * 7) % 30), yy + row * 10 + 3, faint);
    }
  }
  if (t > 0.8 && Math.floor(t * 2) % 2 === 0) txt(W - 8, H - 14, '点击上班 ▶', 10, K.WHITE, 'ra');
}

// ———————————————————— 下班结算 ————————————————————

let SUM = null;
const CONTINUE_BTN = [430, 318, 620, 344];

function initSummary() {
  const fam = S.family;
  if (S.day === 4) {
    if (!fam.uncle.gone) fam.uncle.sick = Math.max(fam.uncle.sick || 0, 1);
    if (!fam.nephew.gpuHappy) fam.nephew.wantsGPU = true;
  }
  const final = S.day === LAST_DAY && S.flags.ending === 'approve';
  const rows = [['food', '伙食（全家的饭）', 5], ['cat', '猫粮', 5]];
  if (!fam.uncle.gone) rows.push(['extra', '二舅加餐', 10]);
  if (MEMBERS.some((k) => fam[k].sick && !fam[k].gone)) rows.push(['med', '药费', 10]);
  if (fam.nephew.wantsGPU) rows.push(['gpu', '侄子的新皮肤', 20]);
  if (!fam.cat.gone) rows.push(['treat', '猫条（橘座最爱）', 10]);
  SUM = { start: S.savings, pay: B.pay, bonus: B.bonus, bribe: B.bribe, fines: B.fines, correct: B.correct, total: B.total, rows, on: {}, final };
}

function sumBalance() {
  let b = SUM.start + SUM.pay + SUM.bonus + SUM.bribe - SUM.fines - 3; // 电费 3
  for (const [k, , cost] of SUM.rows) if (SUM.on[k]) b -= cost;
  return b;
}

function familyAfter() {
  const f = JSON.parse(JSON.stringify(S.family));
  const on = SUM.on;
  f.cat.hunger = on.cat ? 0 : f.cat.hunger + (on.treat ? -1 : 1);
  if (f.cat.hunger < 0) f.cat.hunger = 0;
  if (f.cat.hunger >= 3) f.cat.gone = true;
  f.uncle.hunger = on.food ? Math.max(0, f.uncle.hunger - 1) : f.uncle.hunger + 1;
  if (f.uncle.sick) f.uncle.sick = on.med ? 0 : f.uncle.sick + 1;
  if (f.uncle.hunger >= 4 || f.uncle.sick >= 3) f.uncle.gone = true;
  if (on.gpu) { f.nephew.wantsGPU = false; f.nephew.gpuHappy = true; } else f.nephew.gpuHappy = false;
  return f;
}

function familyStatus(k, m) {
  if (k === 'cat') {
    if (m.gone) return ['猫跑了（去了隔壁网吧）', 'bad'];
    if (m.hunger >= 2) return ['很饿（盯上了你的泡面）', 'warn'];
    if (m.hunger >= 1) return ['饿了', 'warn'];
    return ['吃饱了在打呼噜', 'good'];
  }
  if (k === 'uncle') {
    if (m.gone) return ['回老家养病了', 'bad'];
    if (m.sick >= 2) return ['病重', 'bad'];
    if (m.sick) return ['生病', 'warn'];
    if (m.hunger >= 2) return ['很饿', 'warn'];
    if (m.hunger >= 1) return ['饿了', 'warn'];
    return ['挺好（在浇花）', 'ok'];
  }
  if (m.gpuHappy) return ['开心（新皮肤已到账）', 'good'];
  if (m.wantsGPU) return ['想要新皮肤（一直在叹气）', 'warn'];
  return ['在写作业（装的）', 'ok'];
}

function ledgerRows() {
  if (SUM.final) {
    const award = S.stats.wrong <= 5;
    return [['存款', `${SUM.start}`], ['工资', `+${SUM.pay + SUM.bonus}`],
      [award ? '奖金（最佳网管）' : '奖金（没评上）', award ? '+50' : '+0'],
      ['罚款（放行策划案）', '-全部']];
  }
  const rows = [['存款', `${SUM.start}`], ['工资', `+${SUM.pay}`]];
  if (SUM.bonus) rows.push(['奖金（快剪 / 劝返 / 扭送）', `+${SUM.bonus}`]);
  if (SUM.bribe) rows.push(['后巷联盟“网费”', `+${SUM.bribe}`]);
  if (SUM.fines) rows.push(['罚款', `-${SUM.fines}`]);
  rows.push(['电费', '-3']);
  return rows;
}

function drawSummary(t) {
  rect(0, 0, W - 1, H - 1, K.INK);
  txt(W / 2, 20, `DAY ${S.day} · 打烊`, 12, K.WHITE, 'ma');
  txt(W / 2, 36, `今日接待 ${SUM.total} 人，办对 ${SUM.correct} 人`, 10, K.GREY, 'ma');
  rect(60, 50, W - 60, 50, K.GREY_D);
  let y = 60, k = 0;
  const shown = (i) => t >= 0.3 + i * 0.15;
  for (const [label, val] of ledgerRows()) {
    if (!shown(k++)) return;
    const suf = /^[-+]?\d+$/.test(val) ? ' 元' : '';
    txt(70, y, label, 12, K.GREY);
    txt(310, y, val + suf, 12, val.startsWith('-') ? K.RED_L : K.WHITE, 'ra');
    y += 17;
  }
  SUM.boxes = {};
  const after = sumBalance();
  if (!SUM.final) {
    y += 2;
    txt(70, y, '开销（点击勾选）', 8, K.GREY_D);
    y += 12;
    for (const [key, label, cost] of SUM.rows) {
      if (!shown(k++)) return;
      const on = SUM.on[key];
      const dep = (key === 'extra' && !SUM.on.food) || (key === 'treat' && !SUM.on.cat);
      const afford = on || (after >= cost && !dep);
      SUM.boxes[key] = [66, y - 3, 314, y + 13];
      outline(70, y, 80, y + 10, afford ? K.WHITE : K.GREY_D);
      if (on) rect(72, y + 2, 78, y + 8, 'rgb(160,220,200)');
      txt(88, y, label + (dep ? '（要先勾前面的）' : ''), 12, afford ? K.WHITE : K.GREY_D);
      txt(310, y, `-${cost} 元`, 12, on ? K.RED_L : K.GREY_D, 'ra');
      y += 17;
    }
  }
  if (!shown(k++)) return;
  rect(70, y, 310, y, K.GREY_D);
  txt(70, y + 6, '结余', 12, K.WHITE);
  txt(310, y + 6, `${after} 元`, 12, after < 0 ? K.RED_L : 'rgb(160,220,200)', 'ra');
  const fam = SUM.final ? S.family : familyAfter();
  let fy = 60;
  txt(370, fy - 2, '家里人（明天）', 10, K.GREY_D);
  fy += 14;
  for (const key of MEMBERS) {
    if (!shown(k++)) return;
    const [s, lv] = familyStatus(key, fam[key]);
    const col = { ok: K.WHITE, warn: K.ORANGE, bad: K.RED_L, good: K.GREEN_L }[lv] || K.WHITE;
    txt(370, fy, fam[key].name, 12, K.WHITE);
    wrap(s, 10, 250).forEach((ln, i) => txt(370, fy + 15 + i * 12, ln, 10, col));
    fy += 36;
  }
  if (!shown(k + 1)) return;
  const label = SUM.final ? '全剧终 ▶' : after < 0 ? '欠费……继续 ▶' : '睡觉，明天继续 ▶';
  rect(...CONTINUE_BTN, 'rgb(30,58,60)'); outline(...CONTINUE_BTN, K.NEON);
  txt(center(CONTINUE_BTN)[0], CONTINUE_BTN[1] + 7, label, 12, K.WHITE, 'ma');
}

function summaryClick(x, y) {
  if (st() < 1.2) return;
  for (const [key, , cost] of SUM.rows) {
    const b = SUM.boxes && SUM.boxes[key];
    if (b && inBox(x, y, b)) {
      if (SUM.on[key]) { SUM.on[key] = false; if (key === 'food') SUM.on.extra = false; if (key === 'cat') SUM.on.treat = false; }
      else if (sumBalance() >= cost && !((key === 'extra' && !SUM.on.food) || (key === 'treat' && !SUM.on.cat))) SUM.on[key] = true;
      SFX.play('select');
      return;
    }
  }
  if (!inBox(x, y, CONTINUE_BTN)) return;
  SFX.play('click');
  if (SUM.final) { S.savings = 0; clearSave(); go('end'); return; }
  const bal = sumBalance();
  S.family = familyAfter();
  S.savings = bal;
  if (bal < 0) { clearSave(); go('over'); return; }
  S.day++;
  saveGame();
  go('daycard');
}

// ———————————————————— 结局 / 片尾 ————————————————————

function drawEnd(t) {
  G.drawImage(BG_IMG, 0, 0);
  darken(0.9);
  const approve = S.flags.ending !== 'deny';
  rect(0, 34, W - 1, 124, 'rgb(30,58,60)');
  rect(0, 34, W - 1, 35, K.NEON); rect(0, 123, W - 1, 124, K.NEON);
  bigText(W / 2, 48, '网吧，PLEASE', 12, 3, K.WHITE, K.INK);
  txt(W / 2, 110, approve ? '全剧终 · 感谢游玩' : '结局：铁面网管', 10, 'rgb(160,220,200)', 'ma');
  const s = S.stats;
  if (t > 0.6) {
    txt(W / 2, 134, `放行 ${s.approve || 0}  ·  拒绝 ${s.deny || 0}  ·  扭送 ${s.detain || 0}  ·  判错 ${s.wrong}`, 12, K.WHITE, 'ma');
    const fam = MEMBERS.map((k) => `${S.family[k].name.split('（')[0]}：${S.family[k].gone ? '离开了' : '安好'}`).join('   ');
    txt(W / 2, 154, fam, 10, K.GREY, 'ma');
  }
  if (t > 1.2) {
    if (approve) {
      txt(W / 2, 178, '本游戏由一份被放行的策划案制作', 12, K.WHITE, 'ma');
      if (S.flags.bribed) txt(W / 2, 196, '（你收过后巷联盟的网费，绿盾办还不知道）', 8, K.GREY, 'ma');
    } else {
      txt(W / 2, 178, '网管小陈获得一枚奖章。策划案被拒，游戏无限期推迟。', 10, K.WHITE, 'ma');
      txt(W / 2, 196, '（再玩一次，这次放他进来？）', 8, K.GREY, 'ma');
    }
  }
  if (t > 1.8) bigText(W / 2, 214, approve ? '祝你有空就来打两把' : '绿盾行动，从我做起', 12, 2, 'rgb(160,220,200)', K.INK);
  if (t > 2.4) {
    rect(...RESTART_BTN, 'rgb(30,58,60)'); outline(...RESTART_BTN, K.NEON);
    txt(center(RESTART_BTN)[0], RESTART_BTN[1] + 6, '再玩一次', 12, K.WHITE, 'ma');
    txt(W / 2, 346, '玩法致敬 Lucas Pope《Papers, Please》 · 画面音效均由程序生成 · 题材原创', 8, K.GREY_D, 'ma');
  }
}

function drawOver(t) {
  rect(0, 0, W - 1, H - 1, K.INK);
  bigText(W / 2, 110, '欠费查封', 12, 3, K.RED_L);
  if (t > 0.6) txt(W / 2, 180, '房东贴了封条，网吧断网了。', 12, K.WHITE, 'ma');
  if (t > 1.0) txt(W / 2, 204, '橘座去了隔壁网吧，二叔回了老家。', 10, K.GREY, 'ma');
  if (t > 1.5) {
    rect(...RESTART_BTN, 'rgb(30,58,60)'); outline(...RESTART_BTN, K.NEON);
    txt(center(RESTART_BTN)[0], RESTART_BTN[1] + 6, '重新开张', 12, K.WHITE, 'ma');
  }
}
