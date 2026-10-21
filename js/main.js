'use strict';
// 场景切换、输入分发、主循环、背景预渲染。

let BG_IMG = null, WIN_IMG = null;

function go(name) {
  scene = name; sceneT0 = now;
  SFX.ambient(name === 'booth');
  if (name === 'title') SFX.play('title', 0.8);
  if (name === 'daycard') SFX.play('day_hit');
  if (name === 'news') { SFX.play('whoosh'); SFX.play('paper'); }
  if (name === 'summary') { SFX.play('sad', 0.9); initSummary(); }
  if (name === 'end') SFX.play('end', 0.8);
  if (name === 'booth') startDay();
}

// ———————————————————— 背景预渲染 ————————————————————

function buildBackgrounds() {
  {
    const [cv, g] = makeCanvas(W, H);
    setCtx(g);
    // 基底
    rect(0, 0, W - 1, H - 1, K.INK);
    // 墙面（0..96）
    rect(0, 0, W - 1, 95, K.WALL);
    rect(0, 0, W - 1, 4, K.WALL_D);
    for (let x = 8; x < W; x += 48) rect(x, 8, x, 92, K.WALL_D);
    // 墙裙
    rect(0, 88, W - 1, 95, K.COUNTER_D);
    rect(0, 88, W - 1, 89, K.COUNTER);
    // 霓虹灯箱
    rect(16, 6, 312, 64, 'rgb(16,20,26)');
    outline(16, 6, 312, 64, K.METAL_D);
    outline(20, 10, 308, 60, 'rgb(30,60,66)');
    txt(290, 50, 'NO.168', 8, 'rgb(50,80,88)', 'ra');
    // 大门（右侧）
    rect(552, 14, 640, 128, K.WALL_D);
    rect(558, 20, 634, 122, K.METAL_D);
    rect(562, 24, 630, 118, 'rgb(52,64,58)');
    rect(566, 28, 626, 114, 'rgb(64,78,66)');
    for (let y = 32; y < 112; y += 14) rect(566, y, 626, y, 'rgba(255,255,255,0.05)');
    rect(596, 66, 602, 80, K.GOLD); // 门把
    txt(596, 34, '推', 8, 'rgb(120,140,120)', 'ma');
    rect(556, 122, 640, 127, K.FLOOR_D);
    // 人行道（96..130）
    rect(0, 96, W - 1, 127, K.FLOOR);
    for (let x = 0; x < W; x += 32) rect(x, 96, x, 127, K.FLOOR_D);
    for (let x = 16; x < W; x += 32) rect(x, 112, x, 127, K.FLOOR_D);
    rect(0, 96, W - 1, 97, K.FLOOR_D);
    rect(0, 126, W - 1, 128, K.FLOOR_D);
    // 窗洞外的室内大厅（透过玻璃看）
    // 柜台（左下 0..222, 264..360）
    rect(0, 264, 221, 272, K.COUNTER_L);
    rect(0, 273, 221, 359, K.COUNTER);
    rect(0, 273, 221, 276, K.COUNTER_L);
    for (let x = 6; x < 216; x += 40) { rect(x, 282, x + 2, 300, K.COUNTER_D); }
    rect(0, 340, 221, 341, K.COUNTER_D);
    // 收银台上的一盆绿萝
    rect(186, 246, 210, 258, 'rgb(60,80,56)');
    rect(190, 240, 206, 248, 'rgb(80,110,70)');
    rect(194, 234, 202, 242, 'rgb(96,130,80)');
    // 橘座（猫）趴在柜台右角
    rect(158, 250, 178, 262, 'rgb(214,150,60)');
    rect(172, 244, 180, 256, 'rgb(214,150,60)');
    rect(174, 242, 176, 246, 'rgb(214,150,60)'); // 耳朵
    rect(178, 242, 180, 246, 'rgb(214,150,60)');
    rect(175, 248, 176, 249, K.INK); // 眼
    rect(178, 248, 179, 249, K.INK);
    for (let x = 154; x >= 144; x -= 2) rect(x, 258 + ((x / 2) % 2), x + 1, 259 + ((x / 2) % 2), 'rgb(190,128,48)'); // 尾巴
    // 桌面（右）
    rect(222, 126, W - 1, 359, K.DESK);
    rect(222, 126, W - 1, 129, K.DESK_L);
    rect(222, 356, W - 1, 359, K.DESK_D);
    for (let y = 140; y < 350; y += 26) rect(226, y, W - 6, y, K.DESK_D);
    // 打印机出纸口
    rect(PRINT_X - 6, 124, PRINT_X + 178, 130, K.METAL_D);
    rect(PRINT_X - 6, 124, PRINT_X + 178, 125, K.METAL_L);
    // 右下角堆着的旧公约
    rect(502, 344, 552, 352, K.BOOK);
    rect(504, 340, 550, 345, K.BOOK_L);
    rect(500, 348, 554, 356, 'rgb(70,48,38)');
    txt(527, 337, '公约', 8, K.GOLD, 'ma');
    BG_IMG = cv;
  }
  {
    // 窗内：网吧大厅
    const [cv, g] = makeCanvas(WIN_W, WIN_H);
    setCtx(g);
    rect(0, 0, WIN_W - 1, WIN_H - 1, K.HALL);
    rect(0, 0, WIN_W - 1, 3, K.HALL_L);
    for (let x = 6; x < WIN_W; x += 24) rect(x, 6, x, 60, 'rgb(36,40,60)');
    // 迷你霓虹
    rect(120, 10, 190, 30, 'rgb(14,18,24)');
    outline(120, 10, 190, 30, K.NEON_D);
    txt(155, 15, 'GAME', 10, K.NEON_D, 'ma');
    // 墙上的海报
    rect(12, 12, 56, 52, 'rgb(200,190,170)');
    rect(14, 14, 54, 50, 'rgb(220,212,192)');
    txt(34, 18, '通宵', 10, 'rgb(160,60,50)', 'ma');
    txt(34, 32, '包夜', 10, 'rgb(70,80,140)', 'ma');
    // 一排机器
    for (let i = 0; i < 3; i++) {
      const dx = 8 + i * 68;
      rect(dx, 96, dx + 44, 132, K.COUNTER_D);
      rect(dx + 6, 74, dx + 38, 98, 'rgb(30,30,36)');
      rect(dx + 9, 77, dx + 35, 95, K.SCREEN);
      rect(dx + 9, 77, dx + 35, 80, K.SCREEN_L);
      txt(dx + 22, 82, `${17 - i}号`, 8, 'rgb(20,40,50)', 'ma');
    }
    // 地板
    rect(0, 118, WIN_W - 1, 132, 'rgb(40,36,46)');
    for (let x = 0; x < WIN_W; x += 18) rect(x, 118, x, 132, 'rgb(34,30,40)');
    WIN_IMG = cv;
  }
  setCtx(FG);
}

// ———————————————————— 输入 ————————————————————

function toGame(ev) {
  const r = canvasEl.getBoundingClientRect();
  return [Math.floor((ev.clientX - r.left) * W / r.width), Math.floor((ev.clientY - r.top) * H / r.height)];
}

function onDown(ev) {
  SFX.init();
  const [x, y] = toGame(ev);
  Object.assign(ptr, { x, y, down: true, mouse: ev.pointerType === 'mouse' });
  if (canvasEl.setPointerCapture) canvasEl.setPointerCapture(ev.pointerId);
  ev.preventDefault();
  if (scene === 'booth') boothInput(x, y);
  else sceneClick(x, y);
}

function onMove(ev) {
  const [x, y] = toGame(ev);
  Object.assign(ptr, { x, y, mouse: ev.pointerType === 'mouse' });
  if (drag) dragMove(x, y);
}

function onUp(ev) {
  const [x, y] = toGame(ev);
  Object.assign(ptr, { x, y, down: false });
  if (drag) dragEnd(x, y);
}

function sceneClick(x, y) {
  if (scene === 'boot') { go('intro'); return; }
  if (scene === 'intro') { go('title'); return; }
  if (scene === 'title') { titleClick(x, y); return; }
  if (scene === 'news' && st() > 0.6) { go('booth'); return; }
  if (scene === 'summary') { summaryClick(x, y); return; }
  if (scene === 'canceled' && st() > 1) { go('end'); return; }
  if ((scene === 'end' || scene === 'over') && st() > 1.5 && inBox(x, y, RESTART_BTN)) { clearSave(); newGame(); go('daycard'); }
}

// ———————————————————— 主循环 ————————————————————

function update() {
  if (scene === 'booth') {
    runTimers();
    tutUpdate();
    if (B.event && B.event.type === 'fence') updateFence();
    const idle = !B.ent && !B.event && !B.closeup && !B.bday && !B.ending;
    if (idle && isEvent(nextItem()) && now > B.lastFinish + 1.6) startEvent(B.queue[B.idx++]);
  }
  if (scene === 'intro') { typedSounds(INTRO_LINES); if (st() > INTRO_LINES.end) go('title'); }
  if (scene === 'canceled') { typedSounds(CANCELED_LINES); if (st() > CANCELED_LINES.end + 1) go('end'); }
  if (scene === 'daycard' && st() > 1.9) go('news');
}

function startEvent(item) {
  if (item.type === 'rush') startRush();
  if (item.type === 'fence') startFence();
}

function render() {
  setCtx(FG);
  const t = st();
  if (scene === 'boot') drawBoot();
  else if (scene === 'intro') drawTyped(INTRO_LINES);
  else if (scene === 'canceled') drawTyped(CANCELED_LINES);
  else if (scene === 'title') drawTitle(t);
  else if (scene === 'daycard') drawDayCard(t);
  else if (scene === 'news') drawNews(t);
  else if (scene === 'booth') drawBooth();
  else if (scene === 'summary') drawSummary(t);
  else if (scene === 'end') drawEnd(t);
  else if (scene === 'over') drawOver(t);

  if (GERROR) { txt(6, 4, 'ERR: ' + GERROR.slice(0, 90), 8, K.RED_L); }

  const g = canvasEl.getContext('2d');
  g.imageSmoothingEnabled = false;
  let ox = 0, oy = 0;
  if (scene === 'booth') {
    const k = Math.floor((now - B.shake) * 30);
    if (k >= 0 && k < 4) [ox, oy] = [[0, 3], [1, -2], [-1, 1], [0, -1]][k];
  }
  g.fillStyle = K.INK;
  g.fillRect(0, 0, W, H);
  g.drawImage(F, ox, oy);
  let cursor = drag ? 'hand' : 'arrow';
  if (scene === 'booth' && B) {
    if (B.insp.on) composeInspect(g);
    if (B.event && B.event.type === 'fence') { setCtx(g); drawAlarm(); }
    if (B.event && B.event.type === 'rush') { setCtx(g); drawRush(); }
    if (B.closeup) { setCtx(g); drawCloseup(); }
  }
  if (ptr.mouse) { setCtx(g); drawCursor(ptr.x, ptr.y, cursor); }
}

function loop(ts) {
  now = ts / 1000;
  update();
  render();
  requestAnimationFrame(loop);
}

function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvasEl.style.width = `${Math.floor(W * s)}px`;
  canvasEl.style.height = `${Math.floor(H * s)}px`;
}

function toggleMute() {
  SFX.init();
  const m = SFX.toggleMute();
  const b = document.getElementById('mute');
  if (b) b.textContent = m ? '声音：关' : '声音：开';
}

let GERROR = '';
window.addEventListener('error', (e) => { GERROR = String(e.message || e.error || 'unknown'); });

function boot() {
  canvasEl = document.getElementById('game');
  canvasEl.width = W; canvasEl.height = H;
  [F, FG] = makeCanvas(W, H);
  setCtx(FG);
  buildBackgrounds();
  fit();
  window.addEventListener('resize', fit);
  canvasEl.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') toggleMute(); });
  newGame();
  initWeather();
  sceneT0 = performance.now() / 1000;
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', boot);
