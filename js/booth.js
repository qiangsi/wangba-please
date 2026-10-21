'use strict';
// 检查台：旅客进出、证件拖拽、盖章、检查模式、测谎、X 光、特殊事件。

const WIN = [10, 132, 212, 264], WIN_W = 203, WIN_H = 133, WIN_CX = 111;
const SPEAKER = [6, 288, 26, 306];
const DETAIN_BTN = [168, 266, 212, 281];
const QUIZ_BTN = [120, 266, 164, 281];
const INSPECT_BTN = [600, 320, 634, 354];
const XRAY_BTN = [564, 320, 598, 354];
const RULE_BTN = [528, 320, 562, 354];
const ASK_BTN = [548, 138, 590, 160];
const BANNER_BOX = [300, 132, 598, 166];
const TRAY_Y0 = 196, TRAY_Y1 = 252, TRAY_W = 170, TRAY_X = W - TRAY_W;
const MARK_XY = { approve: [482, 214], deny: [560, 214] };
const BOOTH_POS = [150, 112], QUEUE_FRONT = [330, 106], DOOR_X = 580;
const PRINT_X = 242;
const BOOK_BOX = [498, 302, 556, 358];
const DESK = [222, 126, W - 1, H - 1];
const PORTRAIT_Y = WIN[1] + 41;

// ———— 全局状态 ————
let canvasEl, F, FG, now = 0;
const S = {};
let B = null;
const ptr = { x: 320, y: 180, mouse: false, down: false };
let drag = null;
let scene = 'boot', sceneT0 = 0;
const st = () => now - sceneT0;

// ———————————————————— 一天 ————————————————————

function startDay() {
  B = {
    queue: buildQueue(S.day), idx: 0, ent: null, docs: [], lines: [], timers: [],
    tray: { open: false, t: -9 }, presses: [], shake: -9,
    insp: { on: false, sel: [], banner: null, all: false },
    xray: { on: false, t: -9 }, printing: null, printQueue: [], effects: [],
    ruleInst: null, rulePos: [228, 136], ruleOpened: false, speakerT: -9, fightT: -9,
    pay: 0, bonus: 0, bribe: 0, fines: 0, cites: 0, correct: 0, total: 0, flash: null, clock0: now,
    ending: false, event: null, closeup: null, bday: null, lastFinish: now, tensionSrc: null,
  };
  // Day 2 开局明示测谎玩法（一次性）
  if (S.day === 2 && !S.tut.quizIntro) {
    S.tut.quizIntro = true;
    later(2.2, () => flash('今日新玩法「测谎」：先用『检查』找疑点，再按『测谎』对暗号——小孩忍不住接下半句，接了就露馅！'));
  }
}

function later(dt, fn) { B.timers.push({ t: now + dt, fn }); }
function runTimers() {
  const due = B.timers.filter((x) => x.t <= now);
  if (!due.length) return;
  B.timers = B.timers.filter((x) => x.t > now);
  due.sort((a, b) => a.t - b.t).forEach((x) => x.fn());
}

function say(who, text) {
  B.lines.push({ t: now, who, text, ent: B.ent });
  const pitch = who === 'C' ? 170 : who === 'Q' ? 160 : (B.ent ? B.ent.spec.voice : 125);
  SFX.mumble(text, pitch, B.lines.length * 7 + S.day);
  if (who === 'E' && B.ent) B.ent.talkUntil = now + Math.min(1.3, 0.25 + 0.065 * [...text].length);
}

function runSteps(steps, delay = 0) {
  let t = delay;
  const e = B.ent;
  for (const s0 of steps || []) {
    let who, text, o;
    if (Array.isArray(s0)) [who, text, o] = s0; else o = s0;
    o = o || {};
    later(t, () => {
      if (B.ent !== e) return;
      if (e) {
        if (o.expr) e.expr = o.expr;
        if (o.sweat && e.sweatT === null) e.sweatT = now;
        if (o.slip) { e.slip = true; e.expr = 'shock'; }
      }
      if (o.fight) { B.fightT = now; SFX.play('fight'); }
      if (text) say(who, text);
    });
    const len = text ? [...text].length : 0;
    t += o.hold !== undefined ? o.hold : Math.max(0.9, 0.4 + 0.085 * len);
  }
  if (e) e.busyUntil = Math.max(e.busyUntil || 0, now + t);
  return t;
}

function newEntrant(spec, instant) {
  return {
    spec, tEnter: instant ? now - 1 : now + 0.35, phase: instant ? 'here' : 'enter',
    expr: PEOPLE[spec.person].expr, talkUntil: 0, sweatT: null, slip: false, busyUntil: 0,
    decided: null, asked: new Set(), found: new Set(), quizDone: [], docs: [], placed: new Set(),
    instant, suspect: false, exposed: false,
  };
}

const nextItem = () => B.queue[B.idx];
const isEvent = (it) => it && it.type;

function callNext() {
  SFX.play('click');
  if (B.ent || B.event || B.closeup || B.bday || B.ending || B.idx >= B.queue.length) return;
  if (isEvent(nextItem())) { startEvent(B.queue[B.idx++]); return; }
  B.speakerT = now;
  SFX.play('intercom');
  say('C', '下一位！');
  S.tut.called = true;
  const spec = B.queue[B.idx++];
  const e = newEntrant(spec, false);
  B.ent = e;
  for (let i = 0; i < 4; i++) later(0.41 + i * 0.19, () => SFX.play('step'));
  later(1.15, () => {
    if (B.ent !== e) return;
    e.phase = 'here';
    if (spec.tension) SFX.play('select');
    const t = runSteps(spec.intro);
    later(t + (spec.intro.length ? 0 : 0.4), () => handDocs(e));
  });
}

function handDocs(e) {
  if (B.ent !== e) return;
  SFX.play('paper');
  e.docs = e.spec.docs.map(({ key, doc }, i) => {
    const inst = { doc, key, owner: 'ent', big: false, x: 44 + i * 24, y: 265, slot: [44 + i * 24, 265], marks: [] };
    B.docs.push(inst);
    return inst;
  });
  e.handed = true;
  if (e.spec.after) runSteps(e.spec.after, 0.3);
}

const decisionOf = (inst) => (inst.marks.length ? inst.marks[inst.marks.length - 1].kind : null);
function primaryOf(e) { return e.docs.find((d) => d.key === e.spec.primary); }

function checkLeave() {
  const e = B.ent;
  if (!e || e.phase !== 'here') return;
  const prim = primaryOf(e);
  if (!prim || !prim.returned) return;
  if (B.docs.some((d) => d.owner === 'ent' && d.big)) {
    if (!e.complained) { e.complained = true; say('E', '我的证件还在你那儿。'); }
    return;
  }
  const dec = decisionOf(prim);
  e.phase = 'waiting';
  later(Math.max(0, e.busyUntil - now) + 0.2, () => leave(e, dec));
}

function leave(e, dec) {
  if (B.ent !== e) return;
  e.phase = 'leave'; e.tLeave = now; e.dir = dec === 'approve' ? 'right' : 'left';
  for (let i = 0; i < 3; i++) later(i * 0.22, () => SFX.play('step'));
  later(0.15, () => { B.docs = B.docs.filter((d) => d.owner !== 'ent'); });
  later(0.65, () => finish(e, dec));
}

function detain() {
  const e = B.ent;
  SFX.play('click');
  if (!e || e.phase !== 'here' || !e.handed || B.event) return;
  e.phase = 'detained'; e.tDetain = now + 0.2; B.detainT = now;
  SFX.play('detain');
  later(1.2, () => { B.docs = B.docs.filter((d) => d.owner !== 'ent'); });
  later(1.7, () => finish(e, 'detain'));
}

function finish(e, dec) {
  if (B.ent !== e) return;
  B.ent = null;
  B.lastFinish = now;
  if (!e.noJudge) judge(e, dec);
  const then = e.spec.then;
  if (then === 'closeup') { B.closeup = { t0: now }; SFX.play('thud'); }
  if (then === 'birthday') afterBirthday(e, dec);
  if (then === 'ending') afterAuthor(dec);
  if (B.idx >= B.queue.length && !B.closeup && then !== 'ending') endDaySoon();
}

function judge(e, dec) {
  const spec = e.spec;
  B.total++;
  S.stats[dec] = (S.stats[dec] || 0) + 1;
  if (spec.author) return;
  if (spec.bribe && dec === 'approve' && S.flags.sawNote) {
    B.bribe += 20; S.flags.bribed = true;
    later(0.8, () => flash('后巷联盟：¥100 网费已充值。合作愉快。'));
  }
  if (spec.ok.includes(dec)) {
    B.correct++; S.stats.correct++;
    B.pay += 5;
    if (dec === 'detain' && e.exposed) B.bonus += 5;
    return;
  }
  S.stats.wrong++;
  const lines = dec === 'approve' ? ['放行了不合规人员', spec.reason || '']
    : dec === 'detain' ? ['无故扭送合规旅客', '证件齐全，信息一致'] : ['拒绝了合规旅客', '证件齐全，信息一致'];
  if (dec === 'approve' && spec.hint) lines.push(spec.hint);
  cite(lines);
}

function cite(lines, delay = 0.5) {
  B.cites++;
  if (B.cites > 1) B.fines += 5;
  lines.push(B.cites > 1 ? '罚款：5 元（当月工资里扣）' : '警告：再犯开始罚款');
  later(delay, () => printDoc(new Citation(lines), 1.1, 'cit'));
}

function printDoc(doc, dur, key) {
  if (B.printing) { B.printQueue.push([doc, dur, key]); return; }
  B.printing = { doc, t0: now, dur };
  SFX.printer(dur);
  later(dur, () => {
    B.printing = null;
    B.docs.push({ doc, key, owner: 'desk', big: true, x: PRINT_X, y: 131, marks: [] });
    if (key === 'cit') SFX.play('citation');
    if (B.printQueue.length) printDoc(...B.printQueue.shift());
  });
}

function endDaySoon() {
  if (B.ending) return;
  B.ending = true;
  const wait = B.printing ? 2 : 0;
  later(2.4 + wait, () => SFX.play('bell'));
  later(4.2 + wait, () => go('summary'));
}

function flash(text) { B.flash = { text, t: now }; }

// ———————————————————— 证件机关 ————————————————————

const NOTE_TEXT = ['同志：', '今晚放拎书包的那几个进来，', '给你充 100 网费。', '—— 后巷联盟'];

function onFirstPlace(d) {
  const e = B.ent;
  if (!e || d.owner !== 'ent' || e.placed.has(d)) return;
  e.placed.add(d);
  const trig = e.spec.onPlace && e.spec.onPlace[d.key];
  if (trig === 'note') {
    const doc = new NotePaper(NOTE_TEXT);
    const [x, y] = clampDesk(d.x + 30, d.y + 60, doc);
    later(0.3, () => {
      B.docs.push({ doc, key: 'note', owner: 'desk', big: true, x, y, marks: [] });
      SFX.play('paper');
      S.flags.sawNote = true;
      flash('证件里掉出一张小纸条（不想理就拖回窗口那边扔掉）');
    });
  }
}

function clampDesk(x, y, doc) {
  return [Math.round(Math.max(DESK[0] + 4, Math.min(W - doc.w - 4, x))), Math.round(Math.max(DESK[1] + 4, Math.min(H - doc.h - 4, y)))];
}

// —— 盖章栏 ——
function trayU() {
  const { open, t } = B.tray;
  return open ? easeOut(seg(now, t, t + 0.3)) : 1 - smooth(seg(now, t, t + 0.25));
}
function trayX() { return Math.round(lerp(W, TRAY_X, trayU())); }
function setTray(open) {
  if (B.tray.open === open) return;
  B.tray = { open, t: now };
  SFX.play(open ? 'tray' : 'tray_back');
  if (open) S.tut.tray = true;
}
function stampBtnBox(kind, tx) {
  const bx = tx + (kind === 'approve' ? 10 : 90);
  return [bx, TRAY_Y0 + 8, bx + 64, TRAY_Y0 + 48];
}

function stamp(kind) {
  B.presses.push({ t: now, kind });
  SFX.play(kind === 'approve' ? 'stamp_app' : 'stamp_deny');
  B.shake = now + 0.05;
  const [mx, my] = MARK_XY[kind];
  const cx = mx + 29, cy = my + 17;
  const target = [...B.docs].reverse().find((d) => d.big && inBox(cx, cy, [d.x, d.y, d.x + d.doc.w - 1, d.y + d.doc.h - 1]));
  if (target) {
    later(0.05, () => target.marks.push({ kind, rx: mx - target.x, ry: my - target.y }));
    S.tut.stamped = true;
    const e = B.ent;
    if (e && target.owner === 'ent' && target.key === e.spec.primary && !e.decided) {
      e.decided = kind;
      if (e.spec.tension && kind === 'approve') SFX.play('fanfare');
      if (e.spec.react && e.spec.react[kind]) runSteps(e.spec.react[kind], 0.4);
    }
  } else {
    flash('印章下面没有证件：把证件挪到印章正下方');
  }
  later(0.5, () => setTray(false));
}

// —— 公约手册 ——
function toggleRules() {
  SFX.play('paper');
  if (B.ruleInst) {
    B.rulePos = [B.ruleInst.x, B.ruleInst.y];
    B.docs = B.docs.filter((d) => d !== B.ruleInst);
    B.ruleInst = null;
    return;
  }
  B.ruleInst = { doc: new Rulebook(S.day), key: 'rule', owner: 'desk', big: true, x: B.rulePos[0], y: B.rulePos[1], marks: [] };
  B.docs.push(B.ruleInst);
  B.ruleOpened = true;
  S.tut.rules = true;
}
function ruleTabHit(d, x, y) {
  if (d.key !== 'rule' || d.doc.npages < 2) return false;
  const t = d.doc.tab;
  return inBox(x, y, [d.x + t[0], d.y + t[1], d.x + t[2], d.y + t[3]]);
}

// —— 测谎 ——
function quiz() {
  SFX.play('quiz_on');
  const e = B.ent;
  if (!e || e.phase !== 'here' || !e.handed || B.event) return;
  if (now < e.busyUntil) return;
  if (!e.suspect) { flash('先找到疑点才能测谎：证件矛盾，或者用『检查』点 Ta 说的话'); return; }
  S.tut.quiz = true;
  const q = e.spec.quiz;
  const pool = QUIZ.map((_, i) => i).filter((i) => i !== QUIZ_THURSDAY || S.day === 4);
  let idx;
  if (q && q.first !== undefined && !e.quizDone.length) idx = q.first;
  else {
    const left = pool.filter((i) => !e.quizDone.includes(i));
    idx = left.length ? pick(left) : pick(pool);
  }
  e.quizDone.push(idx);
  const [question, answer] = QUIZ[idx];
  const mini = idx === QUIZ_MINI;
  const kid = q === 'kid' || (q && q.first !== undefined);
  const steps = [['C', question]];
  if (kid) {
    steps.push(['E', answer, { expr: 'grin', hold: 1.1 }]);
    if (mini) steps.push(['Q', '（队伍里）我的世界！！', { fight: true, hold: 1.0 }]);
    steps.push(['E', '……', { expr: 'shock', hold: 1.0 }]);
    e.exposed = true;
  } else {
    steps.push(['E', pick(QUIZ_CONFUSED), { expr: 'neutral' }]);
    steps.push(['C', '……当我没问。']);
  }
  const dur = runSteps(steps);
  if (kid) later(dur + 0.2, () => flash('露馅了！暗号接上了，Ta 是小孩——按「扭送」或盖「拒绝」都算对'));
  else later(dur + 0.2, () => flash('暗号对不上：大概率是真大人——没别的矛盾就放行'));
}

// —— X 光 ——
function setXray(on) {
  if (B.xray.on === on) return;
  B.xray = { on, t: now };
  SFX.play(on ? 'xray' : 'click');
  if (on) S.tut.xray = true;
}
function xrayItemBox(e, it) {
  const ex = entrantX(e);
  if (ex === null) return [0, 0, 0, 0];
  const pat = XRAY_ICONS[it.icon];
  const pw = pat[0].length * 2, ph = pat.length * 2;
  const cx = WIN[0] + ex + it.at[0], cy = WIN[1] + it.at[1];
  return [cx - (pw >> 1) - 2, cy - (ph >> 1) - 2, cx + (pw >> 1) + 1, cy + (ph >> 1) + 1];
}

// ———————————————————— 检查模式 ————————————————————

function docBox(d) { return [d.x, d.y, d.x + d.doc.w - 1, d.y + d.doc.h - 1]; }

function lineBoxes() {
  return B.lines.slice(-3).map((ln, i) => {
    const size = tw(ln.text, 12) > 176 ? 10 : 12;
    const y = 288 + i * 17;
    return { ln, size, box: [30, y, 30 + tw(ln.text, size) + 8, y + 15] };
  });
}

function fieldAt(x, y) {
  const e = B.ent;
  if (e && e.handed) {
    for (const { ln, box } of lineBoxes()) {
      if (ln.who === 'E' && ln.ent === e && inBox(x, y, box)) return { key: 'say', ln, box: () => box };
    }
  }
  if (B.xray.on && e && e.spec.xray && entrantX(e) !== null) {
    for (const it of e.spec.xray) {
      const b = xrayItemBox(e, it);
      if (inBox(x, y, [b[0] - 3, b[1] - 3, b[2] + 3, b[3] + 3])) return { key: it.key, box: () => xrayItemBox(e, it), xr: it };
    }
  }
  for (const d of [...B.docs].reverse()) {
    if (!d.big || !inBox(x, y, docBox(d)) || !inBox(x, y, DESK)) continue;
    let best = null;
    for (const [name, f] of Object.entries(d.doc.fields)) {
      const b = [d.x + f[0] - 1, d.y + f[1] - 1, d.x + f[2] + 1, d.y + f[3] + 1];
      if (inBox(x, y, b)) best = { key: `${d.key}.${name}`, d, box: () => [d.x + f[0], d.y + f[1], d.x + f[2], d.y + f[3]] };
    }
    return best || { d, key: null };
  }
  return null;
}

function setInspect(on) {
  B.insp = { on, sel: [], banner: null, all: false };
  SFX.play(on ? 'select' : 'click');
  if (on) S.tut.inspect = true;
}

function matchIssue(keys) {
  const e = B.ent;
  if (!e || !e.handed) return null;
  for (const is of e.spec.issues) {
    if (is.all) {
      const mine = (k) => /^(pl|rc)\./.test(k);
      if (keys.length === 2 && keys.every(mine)) return is;
      continue;
    }
    for (const p of is.pairs) {
      if (p.length !== keys.length) continue;
      if (p.length === 1 ? p[0] === keys[0] : (p[0] === keys[0] && p[1] === keys[1]) || (p[0] === keys[1] && p[1] === keys[0])) return is;
    }
  }
  return null;
}

function showIssue(issue) {
  const e = B.ent, I = B.insp;
  I.banner = { title: issue.title, sub: issue.sub, issue, ask: !!(issue.ask && !e.asked.has(issue) && e.phase === 'here'), bad: true };
  e.suspect = true;
  if (issue.all) I.all = true;
  SFX.play('discrepancy');
  for (const s of I.sel) if (s.xr) e.found.add(s.key);
  if (issue.fx && !e.found.has(issue)) {
    if (issue.fx === 'pile') {
      B.effects.push({ type: 'pile', t0: now, ent: e });
      for (let i = 0; i < 20; i += 2) later(i * 0.043, () => SFX.play('paper'));
    }
    if (issue.fx === 'strip') {
      const names = ['王大柱', '李桂花', '张卫国', '刘惠芳', '陈建军', '杨秀英', '赵德柱', '周淑芬'];
      const rows = Array.from({ length: 14 }, (_, i) => `#${String(i + 1).padStart(2, '0')}  ${names[i % names.length]}  月租 8 元`);
      printDoc(new PrintStrip(['号码核验', issue.phone, '类型：亲情网副卡'], rows), 1.6, 'strip');
    }
  }
  e.found.add(issue);
}

function inspectClick(x, y) {
  const I = B.insp;
  if (I.banner && I.banner.ask && inBox(x, y, ASK_BTN)) {
    const issue = I.banner.issue;
    if (!B.ent || B.ent.phase !== 'here') { setInspect(false); return; }
    B.ent.asked.add(issue);
    setInspect(false);
    runSteps(issue.ask, 0.15);
    return;
  }
  const hit = fieldAt(x, y);
  if (hit && hit.d && ruleTabHit(hit.d, x, y)) { hit.d.doc.flip(); SFX.play('paper'); I.sel = I.sel.filter((s) => s.d !== hit.d); return; }
  if (I.banner) { I.banner = null; I.sel = []; I.all = false; }
  if (!hit || !hit.key) return;
  if (hit.key === 'say') {
    I.sel = [hit];
    SFX.play('select');
    const tell = B.ent.spec.tell;
    if (tell && hit.ln.text === tell.say) { S.tut.tell = true; showIssue(tell); }
    else I.banner = { title: '这句话没什么问题', sub: '换一句听听，或者去查证件', bad: false };
    return;
  }
  if (I.sel.some((s) => s.key === 'say')) I.sel = [];
  const k = I.sel.findIndex((s) => s.key === hit.key);
  if (k >= 0) { I.sel.splice(k, 1); return; }
  I.sel.push(hit);
  SFX.play('select');
  const single = I.sel.length === 1 && matchIssue([hit.key]);
  if (single) { showIssue(single); return; }
  if (I.sel.length < 2) return;
  const issue = matchIssue(I.sel.map((s) => s.key));
  if (issue) showIssue(issue);
  else { I.banner = { title: '没有发现不符', sub: '这两项对得上（或者不相关）', bad: false }; SFX.play('select_bad'); }
}

// ———————————————————— 拖拽 ————————————————————

function dragStart(d, x, y) {
  B.docs = B.docs.filter((o) => o !== d).concat([d]);
  drag = { d, startedBig: d.big, off: [x - d.x, y - d.y], prev: { big: d.big, x: d.x, y: d.y }, start: [x, y], moved: false };
  SFX.play('paper');
}

function dragMove(x, y) {
  const d = drag.d;
  if (Math.hypot(x - drag.start[0], y - drag.start[1]) > 3) drag.moved = true;
  if (!drag.moved) return;
  if (x < DESK[0]) { d.big = false; d.x = x - 8; d.y = y - 5; return; }
  d.big = true;
  const g = drag.startedBig ? drag.off : [Math.min(24, d.doc.w / 2), 12];
  d.x = Math.max(DESK[0] - g[0], Math.min(W - 30, x - g[0]));
  d.y = Math.max(DESK[1] - 8, Math.min(H - 24, y - g[1]));
}

function dragEnd(x, y) {
  const d = drag.d, prev = drag.prev, moved = drag.moved;
  drag = null;
  if (!moved) {
    if (d.big && ruleTabHit(d, x, y)) { d.doc.flip(); SFX.play('paper'); }
    return;
  }
  if (d.big) {
    SFX.play(d.key === 'id' ? 'thud' : 'paper');
    if (d.owner === 'ent') { S.tut.dragged = true; onFirstPlace(d); }
    return;
  }
  // 拖回了窗口那一侧
  if (['cit', 'strip'].includes(d.key)) { B.docs = B.docs.filter((o) => o !== d); SFX.play('paper'); return; }
  if (d.key === 'note') {
    B.docs = B.docs.filter((o) => o !== d);
    SFX.play('paper');
    flash('小广告扔进了垃圾桶。HARMLESS。');
    return;
  }
  if (d.key === 'rule') { d.x = prev.x; d.y = prev.y; d.big = true; toggleRules(); return; }
  const e = B.ent;
  const bounce = () => { Object.assign(d, prev); if (!prev.big && d.slot) { d.x = d.slot[0]; d.y = d.slot[1]; } };
  if (!e || (e.phase !== 'here' && e.phase !== 'waiting')) { bounce(); return; }
  if (d.key === e.spec.primary && !decisionOf(d)) {
    bounce();
    if (prev.big) flash('先在这本证件上盖章（右侧拉出盖章栏），再还给旅客');
    return;
  }
  if (!prev.big) { bounce(); return; }
  B.docs = B.docs.filter((o) => o !== d);
  d.returned = true;
  SFX.play('paper');
  if (d.key === e.spec.primary) S.tut.returned = true;
  checkLeave();
}

// ———————————————————— 输入 ————————————————————

function boothInput(x, y) {
  if (B.bday) { if (now - B.bday.t0 > 1.0) endBday(); return; }
  if (B.closeup) { if (now - B.closeup.t0 > 1.2) closeupDone(); return; }
  if (B.event && B.event.type === 'fence') { if (y < 130) interceptAt(x, y); return; }
  if (B.event && B.event.type === 'rush') {
    if (inBox(x, y, RUSH_APPROVE)) rushPick('approve');
    else if (inBox(x, y, RUSH_DENY)) rushPick('deny');
    return;
  }
  boothDown(x, y);
}

function boothDown(x, y) {
  if (B.insp.on) {
    if (inBox(x, y, INSPECT_BTN)) return setInspect(false);
    if (S.day >= 4 && inBox(x, y, XRAY_BTN)) return setXray(!B.xray.on);
    return inspectClick(x, y);
  }
  const tx = trayX(), u = trayU();
  if (inBox(x, y, [tx - 14, 204, tx - 1, 244])) return setTray(!B.tray.open);
  if (u > 0.6) {
    for (const kind of ['approve', 'deny']) if (inBox(x, y, stampBtnBox(kind, tx))) return stamp(kind);
    if (inBox(x, y, [tx, TRAY_Y0, W - 1, TRAY_Y1])) return;
  }
  if (inBox(x, y, INSPECT_BTN)) return setInspect(true);
  if (S.day >= 4 && inBox(x, y, XRAY_BTN)) return setXray(!B.xray.on);
  if (inBox(x, y, SPEAKER)) return callNext();
  if (S.day >= 2 && inBox(x, y, DETAIN_BTN)) return detain();
  if (S.day >= 2 && inBox(x, y, QUIZ_BTN)) return quiz();
  for (const d of [...B.docs].reverse()) {
    const box = d.big ? docBox(d) : [d.x, d.y, d.x + 18, d.y + 12];
    if (d.big && !inBox(x, y, DESK)) continue;
    if (inBox(x, y, box)) return dragStart(d, x, y);
  }
  if (inBox(x, y, BOOK_BOX)) return toggleRules();
}

// ———————————————————— 特殊事件 ————————————————————

const RUSH_APPROVE = [250, 214, 400, 274], RUSH_DENY = [440, 214, 590, 274];
const RUSH_TIME = 2.6;

function startRush() {
  SFX.play('intercom');
  say('C', '放学铃！快速通道，开！');
  B.event = { type: 'rush', list: RUSH_LINES.map((r) => ({ ...r, person: takePoolPerson() })), i: -1, t0: now, tFace: 0, hits: 0, wrong: 0, missed: 0, lock: true };
  later(2.6, rushNext);
}

function rushNext() {
  const ev = B.event;
  ev.i++;
  B.ent = null;
  if (ev.i >= ev.list.length) { rushEnd(); return; }
  const r = ev.list[ev.i];
  const e = newEntrant({ person: r.person, voice: 130 + ev.i * 15, docs: [], intro: [] }, true);
  B.ent = e;
  ev.tFace = now; ev.lock = false;
  SFX.play('step');
  say('E', r.line);
  const i = ev.i;
  later(RUSH_TIME, () => {
    if (B.event !== ev || ev.i !== i || ev.lock) return;
    ev.lock = true; ev.missed++;
    e.expr = 'shock';
    later(0.3, rushNext);
  });
}

function rushPick(kind) {
  const ev = B.event;
  if (ev.lock || !B.ent) return;
  ev.lock = true;
  const r = ev.list[ev.i];
  B.presses.push({ t: now, kind });
  SFX.play(kind === 'approve' ? 'stamp_app' : 'stamp_deny');
  B.shake = now;
  const okKind = r.kid ? 'deny' : 'approve';
  if (kind === okKind) { ev.hits++; B.pay += 2; } else ev.wrong++;
  B.ent.expr = kind === 'deny' ? 'shock' : 'smile';
  later(0.5, rushNext);
}

function rushEnd() {
  const ev = B.event;
  B.event = null;
  B.lastFinish = now;
  B.total += ev.list.length;
  say('C', `快剪结束：判对 ${ev.hits}，判错 ${ev.wrong}，漏掉 ${ev.missed}。`);
  if (ev.wrong || ev.missed) cite([`放学快剪：判错 ${ev.wrong} 人，漏放 ${ev.missed} 人`, '说学生黑话的拒绝，说大人话的放行'], 0.8);
  if (B.idx >= B.queue.length) endDaySoon();
}

function drawRush() {
  const ev = B.event;
  const u = ev.i < 0 ? 0 : clamp(1 - (now - ev.tFace) / RUSH_TIME);
  rect(240, 168, 600, 290, 'rgba(24,20,18,0.9)');
  outline(240, 168, 600, 290, K.NEON);
  txt(420, 174, '放学快剪：说学生黑话的『拒绝』，说大人话的『准予』', 10, K.NEON, 'ma');
  txt(420, 190, ev.i < 0 ? '准备……' : `第 ${ev.i + 1} / ${ev.list.length} 位`, 10, K.GREY, 'ma');
  rect(250, 204, 590, 207, K.METAL_D);
  if (ev.i >= 0 && !ev.lock) rect(250, 204, 250 + Math.round(340 * u), 207, u < 0.35 ? K.RED_L : K.NEON);
  for (const [box, label, sub, col, colD] of [[RUSH_APPROVE, '准予', 'APPROVED', K.GREEN, K.GREEN_D], [RUSH_DENY, '拒绝', 'DENIED', K.RED, K.RED_D]]) {
    const hover = ptr.mouse && inBox(ptr.x, ptr.y, box);
    rect(box[0] + 3, box[1] + 3, box[2] + 3, box[3] + 3, K.DESK_D);
    rect(...box, colD);
    rect(box[0] + 2, box[1] + 2, box[2] - 2, box[3] - 6, hover ? colD : col);
    txt((box[0] + box[2]) >> 1, box[1] + 14, label, 12, K.WHITE, 'ma');
    txt((box[0] + box[2]) >> 1, box[1] + 32, sub, 12, K.WHITE, 'ma');
  }
}

// ———— 翻墙大军：点击拦下翻墙进来的小学生 ————
function startFence() {
  const items = [];
  for (let i = 0; i < 8; i++) {
    items.push({ ts: now + 1.6 + i * 0.75, x0: -30, y: 92 + (i * 7) % 22, v: 46 + (i % 4) * 10, state: 'wait', th: 0 });
  }
  B.event = { type: 'fence', t0: now, items, hits: 0, passed: 0, siren: SFX.siren(true), done: false };
  B.xray.on = false;
  if (B.insp.on) setInspect(false);
  say('C', '警报！后墙方向——');
  S.tut.fence = true;
}

function fencePos(c) {
  if (now < c.ts) return null;
  if (c.state === 'hit') {
    if (now < c.th + 0.9) return [c.hx, c.y];
    return null;
  }
  return [c.x0 + c.v * (now - c.ts), c.y];
}

function updateFence() {
  const ev = B.event;
  for (const c of ev.items) {
    if (c.state === 'wait' && now >= c.ts) c.state = 'run';
    if (c.state === 'run') {
      const p = fencePos(c);
      if (p && p[0] >= DOOR_X) { c.state = 'through'; ev.passed++; SFX.play('discrepancy', 0.6); }
    }
  }
  if (!ev.done && ev.items.every((c) => c.state === 'hit' || c.state === 'through')) {
    ev.done = true;
    later(1.0, () => {
      SFX.siren(false);
      B.event = null;
      B.lastFinish = now;
      say('C', ev.passed ? `……拦下 ${ev.hits} 个，漏了 ${ev.passed} 个。` : '……全部劝返。');
      B.bonus += ev.hits;
      if (ev.passed) cite([`翻墙大军：${ev.passed} 人溜进大门`, '警报响起时，点击翻墙的学生'], 0.8);
      if (B.idx >= B.queue.length) endDaySoon();
    });
  }
}

function interceptAt(x, y) {
  const ev = B.event;
  SFX.play('whistle');
  B.shake = now;
  let best = null, bd = 20;
  for (const c of ev.items) {
    if (c.state !== 'run') continue;
    const p = fencePos(c);
    if (!p) continue;
    const d = Math.hypot(p[0] - x, p[1] - 14 - y);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) { best.state = 'hit'; best.th = now; best.hx = Math.round(best.x0 + best.v * (now - best.ts)); ev.hits++; }
}

function drawFence() {
  const ev = B.event;
  for (const c of ev.items) {
    const p = fencePos(c);
    if (!p || c.state === 'wait') continue;
    const [x, y] = [Math.round(p[0]), p.y];
    const step = c.state === 'run' && Math.floor(now * 8) % 2 ? 1 : 0;
    G.save();
    G.translate(x, y - step);
    G.scale(0.5, 0.5);
    if (c.state === 'hit') G.filter = 'grayscale(1)';
    G.drawImage(faceCanvas('KID_A', c.state === 'hit' ? 'shock' : ''), -FW / 2, -FH + 8);
    G.filter = 'none';
    G.restore();
    rect(x - 8, y - 1, x + 8, y - 1, K.FLOOR_D); // 影子
    if (c.state === 'hit') {
      rect(x - 16, y - 62, x + 34, y - 50, K.WHITE);
      outline(x - 16, y - 62, x + 34, y - 50, K.INK);
      txt(x + 9, y - 60, '政教处', 8, K.RED_D, 'ma');
    }
  }
}

function drawAlarm() {
  const ev = B.event;
  const lt = now - ev.t0;
  G.fillStyle = `rgba(180,30,20,${0.10 + 0.08 * (Math.floor(lt * 3) % 2)})`;
  G.fillRect(0, 0, W, 130);
  if (Math.floor(lt * 3) % 2 === 0 || lt > 2) {
    rect(140, 44, 500, 62, K.INK); outline(140, 44, 500, 62, K.RED_L);
    txt(320, 49, '警报：围墙方向发现翻墙大军 · 点击拦下他们！', 10, K.RED_L, 'ma');
  }
  txt(320, 70, `拦下 ${ev.hits}   溜进门 ${ev.passed}`, 10, K.WHITE, 'ma');
}

// ———— 公约特写（胡伯之后） ————
function drawCloseup() {
  const lt = now - B.closeup.t0;
  darken(0.72);
  const bw = 400, bh = 230, x0 = (W - bw) >> 1;
  const y0 = Math.round(lerp(H + 10, (H - bh) >> 1, easeOut(seg(lt, 0, 0.3))));
  rect(x0 - 6, y0 - 6, x0 + bw + 6, y0 + bh + 6, K.BOOK);
  outline(x0 - 6, y0 - 6, x0 + bw + 6, y0 + bh + 6, K.BOOK_L);
  rect(x0, y0, x0 + bw / 2 - 2, y0 + bh, K.PAPER);
  rect(x0 + bw / 2 + 2, y0, x0 + bw, y0 + bh, K.PAPER);
  rect(x0 + bw / 2 - 1, y0, x0 + bw / 2 + 1, y0 + bh, K.PAPER_D);
  spark(x0 + 24, y0 + 22, K.GOLD, false);
  txt(x0 + 36, y0 + 16, '护网公约', 12, K.TEXT);
  ['第 1 条', '入内资格依据：', '身份证「出生」栏，', '以周岁为准。'].forEach((s, i) => txt(x0 + 16, y0 + 44 + i * 16, s, 10, i ? K.TEXT_L : K.TEXT));
  for (let i = 0; i < 5; i++) rect(x0 + 16, y0 + 140 + i * 12, x0 + bw / 2 - 20 - (i * 13) % 40, y0 + 143 + i * 12, K.PAPER_D);
  if (lt > 0.5) ['只看证件，', '不看脸。'].forEach((s, i) => bigText(x0 + bw * 3 / 4, y0 + 64 + i * 40, s, 12, 2, K.RED_D));
  if (lt > 1.0) txt(x0 + bw * 3 / 4, y0 + bh - 26, '（长相、辈分、气质都不算数）', 8, K.TEXT_L, 'ma');
  if (lt > 1.2) txt(W / 2, H - 16, '点击继续', 8, K.GREY, 'ma');
}
function closeupDone() {
  B.closeup = null;
  if (B.idx >= B.queue.length) endDaySoon();
}

// ———— 铁蛋的生日（Day 6 放行后） ————
function afterBirthday(e, dec) {
  if (dec !== 'approve') {
    if (!e.spec.requeued) {
      const again = { ...e.spec, requeued: true, tension: true, intro: [['E', '我又排了一次队。叔，再看看！今天我满 18 啦！', { expr: 'shock' }]] };
      B.queue.splice(B.idx, 0, again);
    }
    return;
  }
  B.bday = { t0: now + 0.8 };
  SFX.play('coin');
}
function endBday() {
  B.bday = null;
  SFX.play('fanfare');
  flash('系统提示：今日起，王铁蛋为合法网民。');
  if (B.idx >= B.queue.length) endDaySoon();
}

// ———— 结局：策划案 ————
function afterAuthor(dec) {
  S.flags.ending = dec === 'approve' ? 'approve' : 'deny';
  if (dec === 'approve') {
    later(0.6, () => printDoc(new Citation(['放行未申报策划案一份', '（本游戏作者）', '扣除本月泡面预算']), 1.4, 'cit'));
    later(2.4, endDaySoon);
  } else {
    later(1.5, () => go('canceled'));
  }
}

// ———————————————————— 渲染 ————————————————————

function entrantX(e) {
  if (!e || now < e.tEnter) return null;
  if (e.phase === 'detained' && now >= e.tDetain + 0.8) {
    const u = seg(now, e.tDetain + 0.8, e.tDetain + 1.5);
    return u >= 1 ? null : Math.round(lerp(WIN_CX, -160, u * u));
  }
  if (e.phase === 'leave') {
    const u = seg(now, e.tLeave, e.tLeave + 0.65);
    if (u >= 1) return null;
    return Math.round(lerp(WIN_CX, e.dir === 'left' ? -160 : 400, u * u));
  }
  let x = WIN_CX;
  if (!e.instant && now < e.tEnter + 0.8) x = Math.floor(Math.round(lerp(-130, WIN_CX, easeOut(seg(now, e.tEnter, e.tEnter + 0.8)))) / 2) * 2;
  return x;
}

function exprKey(e) {
  const ex = e.expr;
  if (ex !== 'shock' && now < e.talkUntil && Math.floor(now * 8) % 2 === 0) return [e.spec.person, 'talk1'];
  if (ex === 'shock') return [e.spec.person, 'shock'];
  return [e.spec.person, ''];
}

function drawXray(e, ex) {
  rect(0, 0, WIN_W - 1, WIN_H - 1, K.XBG);
  G.fillStyle = 'rgb(24,50,52)';
  for (let x = 0; x < WIN_W; x += 12) G.fillRect(x, 0, 1, WIN_H);
  for (let y = 0; y < WIN_H; y += 12) G.fillRect(0, y, WIN_W, 1);
  if (ex !== null) {
    const [pkey] = exprKey(e);
    G.drawImage(faceSilhouette(PEOPLE[pkey].face), ex - FW / 2, PORTRAIT_Y - WIN[1]);
    G.strokeStyle = K.XL; G.lineWidth = 1;
    const ell = (cx, cy, rx, ry) => { G.beginPath(); G.ellipse(cx + 0.5, cy + 0.5, rx, ry, 0, 0, Math.PI * 2); G.stroke(); };
    ell(ex, 67, 19, 20); ell(ex - 7, 65, 3, 3); ell(ex + 7, 65, 3, 3);
    rect(ex, 90, ex + 1, WIN_H, K.XL);
    for (let k = 0, y = 94; y < 124; y += 8, k++) {
      const w = 26 - k * 2;
      G.beginPath(); G.ellipse(ex + 0.5, y + 3, Math.max(4, w), 6, 0, Math.PI * 1.11, Math.PI * 1.89); G.stroke();
    }
    for (const it of e.spec.xray || []) {
      const lit = e.found.has(it.key) || B.insp.sel.some((s) => s.key === it.key);
      const pat = XRAY_ICONS[it.icon];
      const pw = pat[0].length * 2, ph = pat.length * 2;
      const ix = ex + it.at[0], iy = it.at[1];
      pattern(pat, ix - (pw >> 1), iy - (ph >> 1), { X: lit ? K.RED_L : K.XL }, 2);
      if (lit) {
        const lw = tw(it.label, 8) + 6;
        const lx = Math.max(2, Math.min(WIN_W - lw - 2, ix - (lw >> 1)));
        rect(lx, iy - (ph >> 1) - 14, lx + lw, iy - (ph >> 1) - 4, K.INK);
        txt(lx + 3, iy - (ph >> 1) - 12, it.label, 8, K.RED_L);
      }
    }
  }
  const scan = Math.round(seg(now, B.xray.t, B.xray.t + 0.6) * WIN_H);
  if (scan < WIN_H) { rect(0, scan, WIN_W - 1, WIN_H - 1, K.XBG); rect(0, scan, WIN_W - 1, scan + 1, K.XL); }
  txt(4, 3, 'X-RAY · 书包安检', 8, K.XL);
}

function drawWindow() {
  G.save();
  G.beginPath(); G.rect(WIN[0], WIN[1], WIN_W, WIN_H); G.clip();
  G.translate(WIN[0], WIN[1]);
  const e = B.ent, ex = entrantX(e);
  if (B.xray.on) drawXray(e, ex);
  else {
    G.drawImage(WIN_IMG, 0, 0);
    if (ex !== null) {
      const moving = !e.instant && now < e.tEnter + 0.8;
      const bob = moving && Math.floor(now * 10) % 2 ? 1 : 0;
      const [pkey, mkey] = exprKey(e);
      G.drawImage(faceCanvas(PEOPLE[pkey].face, mkey), ex - FW / 2, PORTRAIT_Y - WIN[1] + bob);
      if (e.sweatT !== null) {
        const s = Math.min(6, Math.floor((now - e.sweatT) / 0.35));
        const sx = ex + 26, sy = 46 + s;
        pt(sx, sy, K.SWEAT); rect(sx - 1, sy + 1, sx + 1, sy + 3, K.SWEAT); pt(sx - 1, sy + 1, K.WHITE);
      }
      if (e.phase === 'detained' && now >= e.tDetain) {
        const u = easeOut(seg(now, e.tDetain, e.tDetain + 0.35));
        for (const [p, side] of [['GUARD', -1], ['GUARD2', 1]]) {
          const gx = Math.round(lerp(WIN_CX + side * 230, ex + side * 62, u));
          G.drawImage(faceCanvas(PEOPLE[p].face, ''), gx - FW / 2, PORTRAIT_Y - WIN[1]);
        }
      }
    }
  }
  G.fillStyle = 'rgba(0,0,0,0.3)'; G.fillRect(0, 0, WIN_W, 2);
  G.restore();
}

function along(path, dist) {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (dist <= L) return lerp2(a, b, L ? dist / L : 1);
    dist -= L;
  }
  return path[path.length - 1];
}

function drawExterior() {
  const e = B.ent;
  if (e && !e.instant && now >= e.tEnter && !(e.phase === 'detained' && now >= e.tDetain + 0.9)) {
    const meta = PEOPLE[e.spec.person];
    const [coat, top] = meta.walker;
    let pos, moving;
    if (e.phase === 'leave') {
      const path = e.dir === 'right' ? [BOOTH_POS, [330, 108], [DOOR_X + 40, 108]] : [BOOTH_POS, [290, 118], [-20, 118]];
      pos = along(path, (now - e.tLeave) * 80); moving = true;
      if (e.dir === 'right' && pos[0] > DOOR_X) return;
    } else {
      const u = seg(now, e.tEnter, e.tEnter + 0.8);
      pos = lerp2(QUEUE_FRONT, BOOTH_POS, u); moving = u > 0 && u < 1;
    }
    const step = moving ? Math.floor(now * 8) % 2 : 0;
    tinyPerson(pos[0], pos[1], rgb(coat), rgb(top), step);
  }
  if (now >= B.fightT && now < B.fightT + 3) drawFight();
}

function drawFight() {
  let s = Math.floor(now * 10) * 9301 + 49297;
  const r = (a, b) => { s = (s * 9301 + 49297) % 233280; return a + Math.floor(s / 233280 * (b - a + 1)); };
  const greys = [[150, 144, 132], [172, 166, 152], [128, 122, 112]];
  for (let i = 0; i < 9; i++) {
    const x = 250 + r(0, 34), y = 88 + r(0, 18), rr = r(5, 9);
    G.fillStyle = rgb(greys[r(0, 2)]);
    G.beginPath(); G.arc(x, y, rr, 0, Math.PI * 2); G.fill();
  }
  const word = Math.floor(now * 2.5) % 2 ? '迷你！' : '我的！';
  const bx = word === '迷你！' ? 236 : 286;
  rect(bx, 64, bx + 26, 77, K.WHITE); outline(bx, 64, bx + 26, 77, K.INK);
  txt(bx + 13, 66, word, 10, K.INK, 'ma');
}

function drawBoothLower() {
  const idle = !B.ent && !B.event && B.idx < B.queue.length && !B.ending && !isEvent(nextItem());
  const on = now < B.speakerT + 0.5 || (idle && Math.floor(now * 2) % 2 === 0);
  const [x0, y0] = SPEAKER;
  rect(x0, y0, x0 + 18, y0 + 16, on ? K.CHEN : K.METAL_D);
  outline(x0, y0, x0 + 18, y0 + 16, K.METAL_L);
  for (let yy = y0 + 3; yy < y0 + 15; yy += 3) rect(x0 + 3, yy, x0 + 15, yy, K.INK);
  for (const { ln, size, box } of lineBoxes()) {
    const n = Math.max(1, Math.floor((now - ln.t) * 26));
    const [lx, y] = box;
    rect(...box, 'rgb(30,28,26)');
    outline(...box, 'rgb(76,70,64)');
    if (ln.who === 'C') rect(lx, y, lx + 1, y + 15, K.CHEN);
    txt(35, y + (size === 12 ? 2 : 3), ln.text, size, ln.who === 'C' ? 'rgb(160,220,200)' : K.WHITE, 'la', n);
  }
  txt(8, 347, `${gameDate(S.day)}  ${gameWeekday(S.day)}`, 10, K.GREY);
  const m = 6 * 60 + Math.floor((now - B.clock0) / 1.1);
  txt(210, 346, `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, 12, K.LED, 'ra');
  if (S.day >= 2) {
    const can = B.ent && B.ent.phase === 'here' && B.ent.handed && !B.event;
    const lit = now < (B.detainT || -9) + 0.6;
    rect(...DETAIN_BTN, lit ? K.RED : K.RED_D); outline(...DETAIN_BTN, K.OUTLINE);
    txt(center(DETAIN_BTN)[0], DETAIN_BTN[1] + 2, '扭送', 10, can ? K.WHITE : K.GREY, 'ma');
    const busy = !can || !B.ent.suspect || now < B.ent.busyUntil;
    rect(...QUIZ_BTN, busy ? K.METAL_D : 'rgb(70,80,104)'); outline(...QUIZ_BTN, K.OUTLINE);
    txt(center(QUIZ_BTN)[0], QUIZ_BTN[1] + 2, '测谎', 10, busy ? K.GREY : K.WHITE, 'ma');
  }
  for (const d of B.docs) if (!d.big) smallIcon(d.doc.icon[0], d.doc.icon[1], d.x, d.y);
}

function drawStampMark(kind, x, y) {
  const col = kind === 'approve' ? K.GREEN : K.RED;
  const colD = kind === 'approve' ? K.GREEN_D : K.RED_D;
  outline(x, y, x + 57, y + 33, colD, 2);
  outline(x + 4, y + 4, x + 53, y + 29, col, 1);
  txt(x + 29, y + 9, kind === 'approve' ? '准予' : '拒绝', 14, col, 'ma');
}

function drawDesk() {
  G.save();
  G.beginPath(); G.rect(DESK[0], DESK[1], DESK[2] - DESK[0] + 1, DESK[3] - DESK[1] + 1); G.clip();
  for (const d of B.docs) {
    if (!d.big) continue;
    d.doc.draw(d.x, d.y);
    if (d.marks.length) {
      G.save();
      G.beginPath(); G.rect(d.x, d.y, d.doc.w, d.doc.h); G.clip();
      for (const mk of d.marks) drawStampMark(mk.kind, d.x + mk.rx, d.y + mk.ry);
      G.restore();
    }
  }
  if (B.printing) {
    const { doc, t0, dur } = B.printing;
    const L = Math.max(1, Math.round(doc.h * seg(now, t0, t0 + dur)));
    G.save(); G.beginPath(); G.rect(PRINT_X, 131, doc.w + 3, L); G.clip();
    doc.draw(PRINT_X, 131);
    G.restore();
  }
  G.restore();
  rect(PRINT_X - 4, 128, PRINT_X + 172, 130, K.INK);
}

function drawTray() {
  const tx = trayX(), u = trayU();
  const hx = tx - 13;
  rect(hx, 204, tx - 1, 244, K.METAL_D);
  outline(hx, 204, tx - 1, 244, K.METAL_L);
  txt(hx + 4, 209, B.tray.open ? '>' : '<', 10, K.WHITE);
  txt(hx + 3, 223, '印', 8, K.WHITE);
  txt(hx + 3, 233, '章', 8, K.WHITE);
  if (u <= 0) return;
  const press = {};
  for (const p of B.presses) if (now >= p.t && now < p.t + 0.22) press[p.kind] = 5;
  rect(tx + 3, TRAY_Y0 + 3, tx + TRAY_W + 3, TRAY_Y1 + 3, K.DESK_D);
  rect(tx, TRAY_Y0, tx + TRAY_W, TRAY_Y1, K.METAL);
  rect(tx, TRAY_Y0, tx + TRAY_W, TRAY_Y0 + 2, K.METAL_L);
  rect(tx, TRAY_Y1 - 2, tx + TRAY_W, TRAY_Y1, K.METAL_D);
  rect(tx, TRAY_Y0, tx + 3, TRAY_Y1, K.METAL_D);
  for (const [label, kind, col, colD] of [['准予', 'approve', K.GREEN, K.GREEN_D], ['拒绝', 'deny', K.RED, K.RED_D]]) {
    const off = press[kind] || 0;
    const bx = tx + (kind === 'approve' ? 10 : 90), by = TRAY_Y0 + 8 + off;
    rect(bx + 2, by + 2, bx + 66, by + 42 - off, K.METAL_D);
    rect(bx, by, bx + 64, by + 40, colD);
    rect(bx + 1, by + 1, bx + 63, by + 36, col);
    rect(bx + 22, by + 6, bx + 42, by + 18, colD);
    rect(bx + 24, by + 6, bx + 40, by + 8, col);
    txt(bx + 32, by + 25, label, 12, K.WHITE, 'ma');
  }
}

function hintText() {
  if (B.flash && now < B.flash.t + 3.2) return B.flash.text;
  const e = B.ent, here = e && e.phase === 'here' && e.handed && !B.event, T = S.tut;
  if (S.day === 1) {
    if (!T.called) return '点左下角闪烁的喇叭，叫下一位';
    if (!here) return '';
    const onDesk = B.docs.some((d) => d.owner === 'ent' && d.big);
    if (!T.dragged && !onDesk) return '把柜台上的证件（左下小图标）拖到右边桌上';
    if (!T.rules) return '点右下角的『公约』，看今天的检查规则';
    if (!T.tray) return '点右侧的把手“<”，拉出盖章栏';
    if (!T.stamped) return '把证件挪到印章正下方，按“准予”或“拒绝”';
    if (!T.returned && e.decided) return '把盖好章的证件拖回左边窗口，还给旅客';
    if (!T.inspect && B.idx >= 3) return '可选：右下『?』检查模式，点两处信息找矛盾';
    return '';
  }
  if (!here) return '';
  if (S.day <= 5 && !B.ruleOpened) return '今天有新规：点右下角『公约』看看（标着 NEW）';
  if (S.day === 2) {
    if (!T.inspect) return '右下『?』检查模式：点两处矛盾的信息（如姓名和证号）';
    if (!T.tell && !e.suspect && B.idx >= 3) return '证件都对得上？『检查』点点 Ta 说的话：小孩说话会露馅（提爸妈、作业、被接送）';
    if (!T.quiz && e.suspect && e.spec.quiz) return '有疑点了！按柜台『测谎』对暗号——小孩会忍不住接下半句，接了就扭送/拒绝';
  }
  if (S.day === 3 && !T.payChecked && B.idx <= 2) { T.payChecked = true; return '新：支付凭证。可疑的付款/手机/账单，和公约 §4 一起点'; }
  if (S.day === 4 && !T.xray) return '新：右下『X光』扫描书包；检查模式下直接点可疑物品';
  return '';
}

function drawHint() {
  const s = hintText();
  if (!s || B.insp.on) return;
  const size = tw(s, 10) > 396 ? 8 : 10;
  const w = tw(s, size) + 12;
  const x = Math.max(DESK[0] + 4, W - 6 - w), y = 134;
  rect(x, y, x + w, y + 15, 'rgba(24,20,18,0.92)');
  outline(x, y, x + w, y + 15, K.CHEN);
  txt(x + 6, y + (size === 10 ? 3 : 4), s, size, 'rgb(160,220,200)');
}

function button(box, glyph, label, active) {
  const [x0, y0, x1, y1] = box;
  rect(x0 + 2, y0 + 2, x1 + 2, y1 + 2, K.DESK_D);
  rect(x0, y0, x1, y1, active ? K.RED_D : K.METAL_D);
  outline(x0, y0, x1, y1, K.METAL_L);
  txt((x0 + x1) >> 1, y0 + 6, glyph, 12, K.WHITE, 'ma');
  txt((x0 + x1) >> 1, y0 + 21, label, 8, active ? K.WHITE : K.GREY, 'ma');
}

function drawButtons() {
  button(RULE_BTN, '§', '公约', !!B.ruleInst);
  if (S.day >= 4) button(XRAY_BTN, 'X', 'X光', B.xray.on);
  button(INSPECT_BTN, '?', '检查', B.insp.on);
}

// 桌上堆叠的宿舍地址卡效果
function drawEffects() {
  B.effects = B.effects.filter((fx) => fx.ent === B.ent && now < fx.t0 + 4);
  for (const fx of B.effects) {
    if (fx.type !== 'pile') continue;
    const lt = now - fx.t0, n = 37, step = 1.6 / n;
    const k = Math.min(n, Math.floor(lt / step) + 1);
    let s = 7;
    const r = (a, b) => { s = (s * 9301 + 49297) % 233280; return a + Math.floor(s / 233280 * (b - a + 1)); };
    G.save(); G.beginPath(); G.rect(DESK[0], DESK[1], W - DESK[0], H - DESK[1]); G.clip();
    for (let i = 0; i < k; i++) {
      const x = 430 + r(-60, 60), y = 210 + r(-30, 60);
      const fall = 1 - easeOut(seg(lt, i * step, i * step + 0.08));
      drawAddressCard(x, y - Math.round(fall * 16));
    }
    G.restore();
    bigText(600, 290, `×${k}`, 12, 2, K.RED_L, K.INK, 'right');
  }
}

function drawBooth() {
  G.drawImage(BG_IMG, 0, 0);
  if (Math.floor(now * 7) % 11 !== 0) { // 霓虹灯偶尔闪烁
    drawNeonSign();
  }
  drawExterior();
  if (B.event && B.event.type === 'fence') drawFence();
  drawWindow();
  drawBoothLower();
  drawDesk();
  drawTray();
  drawButtons();
  drawEffects();
  drawHint();
}

function drawNeonSign() {
  bigText(56, 10, '毛豆电竞网吧', 12, 3, K.NEON, K.NEON_D, 'left');
  txt(60, 72, 'MAODOU ESPORTS · 24H · 通宵包夜', 8, K.NEON_D, 'la');
}

function composeInspect(g) {
  const I = B.insp;
  g.fillStyle = 'rgba(26,10,10,0.55)';
  g.fillRect(0, 0, W, H);
  const lighten = (bx) => {
    if (bx[2] <= bx[0] || bx[3] <= bx[1]) return;
    g.drawImage(F, bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1], bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1]);
    g.fillStyle = 'rgba(26,10,10,0.2)'; g.fillRect(bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1]);
  };
  for (const d of B.docs) {
    if (d.big) lighten([Math.max(DESK[0], d.x), Math.max(DESK[1], d.y), Math.min(W, d.x + d.doc.w), Math.min(H, d.y + d.doc.h)]);
  }
  if (B.xray.on) lighten([WIN[0], WIN[1], WIN[2] + 1, WIN[3] + 1]);
  if (B.ent && B.ent.handed) lighten([28, 286, 220, 339]);
  let boxes = I.sel.map((s) => s.box());
  if (I.all && B.ent) {
    boxes = [];
    for (const d of B.ent.docs) if (d.big) for (const f of Object.values(d.doc.fields)) boxes.push([d.x + f[0], d.y + f[1], d.x + f[2], d.y + f[3]]);
  }
  for (const b of boxes) g.drawImage(F, b[0], b[1], b[2] - b[0] + 1, b[3] - b[1] + 1, b[0], b[1], b[2] - b[0] + 1, b[3] - b[1] + 1);
  setCtx(g);
  if (boxes.length >= 2 && I.banner && I.banner.bad) {
    for (let i = 0; i < boxes.length - 1; i++) {
      const p = edgePoint(boxes[i], center(boxes[i + 1])), q = edgePoint(boxes[i + 1], center(boxes[i]));
      line(p[0], p[1], q[0], q[1], K.RED_L);
    }
  }
  for (const b of boxes) outline(b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 2, K.RED_L, 2);
  drawButtons();
  const bn = I.banner;
  if (bn) {
    const [x0, y0] = BANNER_BOX;
    rect(...BANNER_BOX, K.INK); outline(...BANNER_BOX, bn.bad ? K.RED : K.GREY_D);
    txt(x0 + 8, y0 + 5, bn.title, 12, bn.bad ? K.RED_L : K.GREY);
    txt(x0 + 8, y0 + 21, bn.sub, tw(bn.sub, 10) > 236 && bn.ask ? 8 : 10, K.WHITE);
    if (bn.ask) {
      const hover = ptr.mouse && inBox(ptr.x, ptr.y, ASK_BTN);
      rect(...ASK_BTN, hover ? K.RED : K.RED_D); outline(...ASK_BTN, K.RED_L);
      txt(center(ASK_BTN)[0], 145, '询问', 12, K.WHITE, 'ma');
    }
  } else {
    const s = I.sel.length ? '再点一处，看看两者是否矛盾' : '检查模式：点两处信息找矛盾，或点旅客说的话找马脚';
    rect(...BANNER_BOX, 'rgba(24,20,18,0.85)'); outline(...BANNER_BOX, K.GREY_D);
    txt(BANNER_BOX[0] + 8, BANNER_BOX[1] + 12, s, 10, K.GREY);
  }
}
