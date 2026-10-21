'use strict';
// 绘图层：调色板、像素图元（闭区间矩形）、文字、像素立绘。
const W = 640, H = 360;
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const C = {
  INK: [24, 20, 18], OUTLINE: [40, 32, 28],
  WALL: [47, 41, 38], WALL_D: [37, 32, 30], FLOOR: [60, 53, 50], FLOOR_D: [49, 43, 41],
  COUNTER: [97, 85, 71], COUNTER_L: [123, 108, 91], COUNTER_D: [69, 60, 51],
  DESK: [74, 62, 53], DESK_D: [60, 50, 43], DESK_L: [90, 76, 65],
  HALL: [30, 34, 52], HALL_L: [44, 52, 76], SCREEN: [70, 122, 152], SCREEN_L: [150, 208, 226],
  NEON: [92, 192, 202], NEON_D: [42, 92, 102],
  PAPER: [228, 217, 198], PAPER_D: [202, 189, 169], PAPER_LINE: [218, 206, 186],
  GREENP: [205, 213, 190], GREENP_D: [170, 178, 152],
  BLUEP: [195, 205, 223], BLUEP_D: [158, 170, 194],
  TEXT: [72, 56, 46], TEXT_L: [132, 110, 94],
  RED: [182, 48, 40], RED_D: [122, 30, 28], RED_L: [224, 94, 78],
  GREEN: [86, 130, 70], GREEN_D: [56, 88, 48], GREEN_L: [124, 180, 100],
  METAL: [94, 92, 88], METAL_D: [62, 60, 58], METAL_L: [126, 124, 118],
  WHITE: [230, 224, 212], GREY: [152, 146, 136], GREY_D: [102, 96, 90],
  ORANGE: [222, 152, 70], AMBER: [240, 190, 90], CHEN: [140, 196, 170],
  XBG: [16, 42, 46], XFG: [70, 142, 138], XL: [152, 222, 212],
  LED: [216, 74, 52], SWEAT: [150, 188, 208],
  BOOK: [90, 62, 48], BOOK_L: [128, 98, 70], GOLD: [192, 162, 100],
  SKIN: [200, 154, 120], IDGREEN: [104, 132, 100], IDGREEN_D: [76, 102, 74],
};
const K = {}; for (const k in C) K[k] = rgb(C[k]);

let G = null;
function setCtx(ctx) { G = ctx; G.imageSmoothingEnabled = false; }

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// 矩形用闭区间坐标
function rect(x0, y0, x1, y1, col) { G.fillStyle = col; G.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1); }
function outline(x0, y0, x1, y1, col, w = 1) {
  rect(x0, y0, x1, y0 + w - 1, col); rect(x0, y1 - w + 1, x1, y1, col);
  rect(x0, y0, x0 + w - 1, y1, col); rect(x1 - w + 1, y0, x1, y1, col);
}
function pt(x, y, col) { G.fillStyle = col; G.fillRect(x, y, 1, 1); }
function line(x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  if (y0 === y1) return rect(Math.min(x0, x1), y0, Math.max(x0, x1), y0, col);
  if (x0 === x1) return rect(x0, Math.min(y0, y1), x0, Math.max(y0, y1), col);
  G.fillStyle = col;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    G.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function pattern(pat, x, y, colors, k = 1) {
  for (let j = 0; j < pat.length; j++) {
    const row = pat[j];
    for (let i = 0; i < row.length; i++) {
      const c = colors[row[i]];
      if (c) { G.fillStyle = c; G.fillRect(x + i * k, y + j * k, k, k); }
    }
  }
}
const SPARK_13 = [
  '......X......', '...X..X..X...', '....X.X.X....', '.X...XXX...X.', '..XX.XXX.XX..', '....XXXXX....',
  'XXXXXXXXXXXXX', '....XXXXX....', '..XX.XXX.XX..', '.X...XXX...X.', '....X.X.X....', '...X..X..X...',
  '......X......',
];
const SPARK_7 = ['...X...', '.X.X.X.', '..XXX..', 'XXXXXXX', '..XXX..', '.X.X.X.', '...X...'];
function spark(cx, cy, col, big = true, k = 1) {
  const pat = big ? SPARK_13 : SPARK_7;
  const r = Math.floor(pat.length / 2) * k;
  pattern(pat, cx - r, cy - r, { X: col }, k);
}
function darken(alpha, col = C.INK, box = null) {
  G.fillStyle = rgba(col, alpha);
  if (box) G.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  else G.fillRect(0, 0, W, H);
}

// ———————————————————— 文字 ————————————————————

const FONT_STACK = '"SimSun","NSimSun","Songti SC","Noto Serif CJK SC","Microsoft YaHei",monospace';
let MCTX = null;
function fontStr(size, weight) { return `${weight || ''} ${size}px ${FONT_STACK}`; }
const twCache = new Map();
function tw(s, size = 12) {
  const key = size + '|' + s;
  let v = twCache.get(key);
  if (v !== undefined) return v;
  if (!MCTX) MCTX = makeCanvas(8, 8)[1];
  MCTX.font = fontStr(size);
  v = Math.max(1, Math.round(MCTX.measureText(s).width));
  if (twCache.size > 4000) twCache.clear();
  twCache.set(key, v);
  return v;
}
function txt(x, y, s, size = 12, col = K.WHITE, anchor = 'la', n = null) {
  s = String(s);
  if (!s) return;
  G.font = fontStr(size);
  G.textBaseline = 'top';
  const w = tw(s, size);
  if (anchor === 'ma') x = Math.round(x - w / 2);
  else if (anchor === 'ra') x -= w;
  if (n !== null) {
    if (n <= 0) return;
    G.save(); G.beginPath(); G.rect(x - 1, y - 2, w + 2, size + 7); G.clip();
    G.fillStyle = col; G.fillText([...s].slice(0, n).join(''), x, y);
    G.restore();
    return;
  }
  G.fillStyle = col;
  G.fillText(s, x, y);
}
// 放大 k 倍的像素标题（先画到小画布再整数倍放大，保持像素感）
const bigCache = new Map();
function bigText(x, y, s, size, k, col, shadow = null, align = 'center') {
  const w = tw(s, size) * k, h = (size + 7) * k;
  let c = bigCache.get(size + '|' + col + '|' + s);
  if (!c) {
    if (bigCache.size > 300) bigCache.clear();
    const [cv, g] = makeCanvas(tw(s, size) + 2, size + 7);
    g.font = fontStr(size); g.textBaseline = 'top';
    g.fillStyle = col; g.fillText(s, 1, 2);
    c = cv; bigCache.set(size + '|' + col + '|' + s, c);
  }
  if (align === 'center') x = Math.round(x - w / 2);
  else if (align === 'right') x -= w;
  if (shadow) G.drawImage(c, 0, 0, c.width, c.height, x + k, y + k, c.width * k, c.height * k);
  G.drawImage(c, 0, 0, c.width, c.height, x, y, c.width * k, c.height * k);
  return [w, h];
}
function wrap(s, size, width) {
  const lines = [];
  let cur = '';
  for (const ch of s) {
    if (ch === '\n') { lines.push(cur); cur = ''; continue; }
    if (cur && tw(cur + ch, size) > width) { lines.push(cur); cur = ch.trim(); } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ———————————————————— 缓动 ————————————————————
const clamp = (u) => Math.max(0, Math.min(1, u));
const seg = (t, t0, t1) => (t1 > t0 ? clamp((t - t0) / (t1 - t0)) : +(t >= t1));
const smooth = (u) => u * u * (3 - 2 * u);
const easeOut = (u) => 1 - (1 - u) ** 3;
const lerp = (a, b, u) => a + (b - a) * u;
const lerp2 = (p, q, u) => [Math.round(lerp(p[0], q[0], u)), Math.round(lerp(p[1], q[1], u))];
const inBox = (x, y, b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
const center = (b) => [Math.floor((b[0] + b[2]) / 2), Math.floor((b[1] + b[3]) / 2)];
function edgePoint(box, toward) {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const dx = toward[0] - cx, dy = toward[1] - cy;
  if (!dx && !dy) return [Math.round(cx), Math.round(cy)];
  const sx = dx ? (x1 - x0) / 2 / Math.abs(dx) : Infinity;
  const sy = dy ? (y1 - y0) / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy) + 0.02;
  return [Math.round(cx + dx * s), Math.round(cy + dy * s)];
}

// ———————————————————— 鼠标指针 / 室外小人 ————————————————————

const CURSOR_PX = [
  'X.........', 'XX........', 'XWX.......', 'XWWX......', 'XWWWX.....', 'XWWWWX....', 'XWWWWWX...',
  'XWWWWWWX..', 'XWWWWWWWX.', 'XWWWWXXXXX', 'XWWXWX....', 'XWX.XWX...', 'XX...XWX..', '......XX..',
];
const HAND_PX = [
  '....XX......', '...XWWX.....', '...XWWX.....', '...XWWXXX...', '...XWWXWWXX.', '.XXXWWXWWXWX',
  'XWWXWWWWWXWX', 'XWWWWWWWWWWX', '.XWWWWWWWWWX', '..XWWWWWWWX.', '...XWWWWWX..', '...XXXXXXX..',
];
function drawCursor(x, y, mode) {
  if (mode === 'hand') return pattern(HAND_PX, x - 5, y - 1, { X: K.INK, W: K.WHITE });
  pattern(CURSOR_PX, x, y, { X: K.INK, W: K.WHITE });
}

function tinyPerson(x, y, coat, hat = null, step = 0, skin = K.SKIN) {
  rect(x - 3, y + 1, x + 3, y + 1, K.FLOOR_D);
  rect(x - 2, y - 3, x - 1, y - (step ? 1 : 0), K.OUTLINE);
  rect(x + 1, y - 3, x + 2, y - (step ? 0 : 1), K.OUTLINE);
  rect(x - 2, y - 8, x + 2, y - 4, coat);
  rect(x - 1, y - 11, x + 1, y - 9, skin);
  if (hat) rect(x - 1, y - 12, x + 1, y - 12, hat);
}

// ———————————————————— 像素立绘 ————————————————————
// 每个角色是一张 18×21 的字符画（比例 4 倍后 72×84）。
// 字符含义见 BASE_PAL；'p' 瞳孔、'm' 嘴（说话会动），shock 时瞳孔翻白。

const BASE_PAL = {
  s: [200, 154, 120], S: [166, 122, 94], e: [236, 232, 224], p: [40, 38, 48], m: [172, 96, 80],
  w: [224, 220, 210], k: [34, 30, 28], g: [140, 136, 128], t: [130, 160, 185], r: [186, 60, 48],
  y: [224, 172, 64], n: [58, 70, 108], b: [110, 80, 60],
};
const FACES = {
  TIEDAN: {
    pal: { h: [70, 50, 40], c: [64, 92, 150], C: [46, 68, 116] },
    rows: [
      '...h..h..h..h.....',
      '..hhhhhhhhhhhh....',
      '..hhhhhhhhhhhh....',
      '..hhhhhhhhhhhh....',
      '..hhssssssssshh...',
      '..hsssssssssssh...',
      '..hsppssssssppsh..',
      '..hsssssssssssh...',
      '..hssmmmmmmssssh..',
      '..hsssssssssssh...',
      '...ssssssssss.....',
      '...sSSSSSSSSs.....',
      '.....ssssss.......',
      '...cccccccccc.....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  KID_A: {
    pal: { h: [50, 38, 30], c: [206, 200, 188], C: [160, 154, 142] },
    rows: [
      '..................',
      '....hhhhhhhhhh....',
      '...hhhhhhhhhhhh...',
      '...hhhhhhhhhhhh...',
      '...hHssssssssHh...',
      '...hssssssssssh...',
      '...hsppssssppsh...',
      '...hssssssssssh...',
      '...hsssmmmmsssh...',
      '...hssssssssssh...',
      '....ssssssss......',
      '....sSSSSSSs......',
      '.....ssssss.......',
      '....cccccccccc....',
      '...crrrrrrrrrrc...',
      '...cccccccccccc...',
      '...cccccccccccc...',
      '...cccccccccccc...',
      '...CCCCCCCCCCCC...',
      '..................',
      '..................',
    ],
  },
  KID_B: {
    pal: { h: [100, 60, 40], c: [190, 122, 140], C: [150, 92, 110] },
    rows: [
      '..hh..........hh..',
      '..hh.hhhhhhhh.hh..',
      '..hhhhhhhhhhhhhh..',
      '..hhhhhhhhhhhhhh..',
      '..hhHssssssssHhh..',
      '..hhsssssssssshh..',
      '..hhsppsssppsshh..',
      '..hhsssssssssshh..',
      '..hhsssmmmmssshh..',
      '..hhsssssssssshh..',
      '...hsssssssssh....',
      '....sSSSSSSs......',
      '.....ssssss.......',
      '....cccccccccc....',
      '...cccccccccccc...',
      '...cccccccccccc...',
      '...cccccccccccc...',
      '...cccccccccccc...',
      '...CCCCCCCCCCCC...',
      '..................',
      '..................',
    ],
  },
  KID_C: {
    pal: { h: [60, 45, 35], c: [92, 132, 82], C: [68, 100, 60] },
    rows: [
      '..................',
      '...hhhhhhhhhhhh...',
      '..hhhhhhhhhhhhhh..',
      '..hhhhhhhhhhhhhh..',
      '..hHssssssssssHh..',
      '..hssssssssssssh..',
      '..hsppssssppsssh..',
      '..hssssssssssssh..',
      '..hssssmmsssssh...',
      '..hssssssssssssh..',
      '..hsssssssssssh...',
      '...sSSSSSSSSSs....',
      '....ssssssss......',
      '...cccccccccccc...',
      '..cccccccccccccc..',
      '..cccccccccccccc..',
      '..cccccccccccccc..',
      '..cccccccccccccc..',
      '..CCCCCCCCCCCCCC..',
      '..................',
      '..................',
    ],
  },
  GRANDPA: {
    pal: { w: [214, 206, 190], g: [150, 146, 136], t: [130, 160, 185], c: [110, 80, 60], C: [82, 58, 44] },
    rows: [
      '..................',
      '....wwwwwwwwww....',
      '...wwwwwwwwwwww...',
      '...wwwwwwwwwwww...',
      '...ggssssssssgg...',
      '...gssssssssssg...',
      '...gttppttppttg...',
      '...gssssssssssg...',
      '...gssmmmmmmssg...',
      '...gssssssssssg...',
      '....ssssssss......',
      '....sSSSSSSs......',
      '.....ssssss.......',
      '...cccccccccc.....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  HUBO: {
    pal: { g: [148, 144, 134], s: [188, 168, 150], S: [152, 132, 116], c: [120, 120, 116], C: [90, 90, 88] },
    rows: [
      '..................',
      '...gg........gg...',
      '...gggggggggggg...',
      '...ggssssssssgg...',
      '...gSssssssssSg...',
      '...gssSssssSssg...',
      '...gsSppssppSsg...',
      '...gssssssssssg...',
      '...gsggggggggsg...',
      '...gsggggggggsg...',
      '....sggggggs......',
      '....sggggggs......',
      '.....ssssss.......',
      '...cccccccccc.....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  SUNGLASS: {
    pal: { h: [30, 28, 28], c: [40, 40, 46], C: [28, 28, 34], w: [224, 220, 210] },
    rows: [
      '..................',
      '....hhhhhhhhhh....',
      '...hhhhhhhhhhhh...',
      '...hhhhhhhhhhhh...',
      '...hhssssssssHh...',
      '...hssssssssssh...',
      '...hkkkkkkkkkkh...',
      '...hssssssssssh...',
      '...hsssmmmmsssh...',
      '...hssssssssssh...',
      '....ssssssss......',
      '....sSSSSSSs......',
      '.....ssssss.......',
      '...cccccccccc.....',
      '..CCCCCCCCCCCC....',
      '..CCCCwwwwCCCC....',
      '..CCCCCkkwCCCC....',
      '..CCCCCkkwCCCC....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  HOODIE: {
    pal: { c: [70, 66, 80], C: [52, 48, 62] },
    rows: [
      '....CCCCCCCCCC....',
      '...CCCCCCCCCCCC...',
      '..CCCCCCCCCCCCCC..',
      '..CCssssssssssCC..',
      '..CCssssssssssCC..',
      '..CCssppssppssCC..',
      '..CCssssssssssCC..',
      '..CCssssmmssssCC..',
      '..CCssssssssssCC..',
      '...CCssssssssCC...',
      '....CCssssCC......',
      '....CCCCCCCC......',
      '.....ssssss.......',
      '...cccccccccc.....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  CAP: {
    pal: { r: [186, 60, 48], h: [60, 46, 38], c: [70, 90, 140], C: [52, 68, 106] },
    rows: [
      '....rrrrrrrrrr....',
      '...rrrrrrrrrrrr...',
      '..rrrrrrrrrrrrrr..',
      '.rrrrrrrrrrrrrrrr.',
      '...hHssssssssHh...',
      '...hssssssssssh...',
      '...hsppssssppsh...',
      '...hssssssssssh...',
      '...hsssmmmmsssh...',
      '...hssssssssssh...',
      '....ssssssss......',
      '....sSSSSSSs......',
      '.....ssssss.......',
      '...cccccccccc.....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  WOMAN1: {
    pal: { h: [130, 60, 50], c: [200, 160, 170], C: [158, 120, 132], y: [224, 172, 64] },
    rows: [
      '..hh..........hh..',
      '..hhhhhhhhhhhhhh..',
      '.hhhhhhhhhhhhhhhh.',
      '.hhhhhhhhhhhhhhhh.',
      '.hhHssssssssHhh...',
      '.hhsssssssssshh...',
      '.hhssppssssppshh..',
      '.hhsssssssssshh...',
      '.hhssssmmsssshh...',
      '.hhsssssssssshh...',
      '.hh.ssssssss.hh...',
      '.hh.sSSSSSSs.hh...',
      '.hh...ssss...hh...',
      '..hccccccccccch...',
      '..hccccccccccch...',
      '..hhccccccccchh...',
      '..hhccccccccchh...',
      '...cccccccccc.....',
      '...CCCCCCCCCC.....',
      '..................',
      '..................',
    ],
  },
  WOMAN2: {
    pal: { h: [80, 55, 40], c: [190, 122, 62], C: [150, 94, 46], w: [228, 222, 208] },
    rows: [
      '...h.h.h.hh.h.h...',
      '..hhhhhhhhhhhhhh..',
      '.hhhhhhhhhhhhhhhh.',
      '.hhhhhhhhhhhhhhhh.',
      '.hhHssssssssHhh...',
      '.hhsssssssssshh...',
      '.hhssppssssppshh..',
      '.hhsssssssssshh...',
      '.hhssssmmsssshh...',
      '.hhsssssssssshh...',
      '.hh.ssssssss.hh...',
      '.hh.sSSSSSSs.hh...',
      '.hh...ssss...hh...',
      '..cccccccccccc....',
      '..ccwwwwwwwwcc....',
      '..cCwwwwwwwwCc....',
      '..ccwwwwwwwwcc....',
      '..ccccwwwwcccc....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  MAN1: {
    pal: { h: [40, 35, 32], c: [50, 60, 90], C: [36, 44, 68] },
    rows: [
      '..................',
      '....hhhhhhhhhh....',
      '...hhhhhhhhhhhh...',
      '...hhhhhhhhhhhh...',
      '...hHssssssssHh...',
      '...hssssssssssh...',
      '...hsppssssppsh...',
      '...hssssssssssh...',
      '...hsssmmmmsssh...',
      '...hssssssssssh...',
      '....ssssssss......',
      '....sSSSSSSs......',
      '.....ssssss.......',
      '....cccccccc......',
      '...cccccccccc.....',
      '...cccCkkCccc.....',
      '...cccCkkCccc.....',
      '...cccccccccc.....',
      '...CCCCCCCCCC.....',
      '..................',
      '..................',
    ],
  },
  MAN2: {
    pal: { h: [46, 38, 32], r: [190, 60, 50], c: [96, 96, 102], C: [70, 70, 76] },
    rows: [
      '..................',
      '....hhhhhhhhhh....',
      '..rrrrrrrrrrrr....',
      '..hhhhhhhhhhhh....',
      '..hhsssssssshh....',
      '..hssssssssssh....',
      '..hsppssssppsh....',
      '..hssssssssssh....',
      '..hsssmmmmsssh....',
      '..hssssssssssh....',
      '...ssssssssss.....',
      '...sSSSSSSSSs.....',
      '.....ssssss.......',
      '...cccccccccc.....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  MAN3: {
    pal: { h: [55, 45, 38], c: [216, 186, 146], C: [180, 150, 114] },
    rows: [
      '..................',
      '...hhhhhhhhhhhh...',
      '..hhhhhhhhhhhhhh..',
      '..hhhhhhhhhhhhhh..',
      '..hHssssssssssHh..',
      '..hssssssssssssh..',
      '..hsppssssppssh...',
      '..hssssssssssssh..',
      '..hsssssmmsssssh..',
      '..hssssssssssssh..',
      '..hsssssssssssh...',
      '...sSSSSSSSSSs....',
      '....ssssssss......',
      '...cccccccccccc...',
      '..cccccccccccccc..',
      '..cccccccccccccc..',
      '..cccccccccccccc..',
      '..cccccccccccccc..',
      '..CCCCCCCCCCCCCC..',
      '..................',
      '..................',
    ],
  },
  RIDER: {
    pal: { y: [220, 170, 60], t: [120, 150, 170], c: [90, 60, 40], C: [66, 42, 28] },
    rows: [
      '.....yyyyyyyy.....',
      '...yyyyyyyyyyyy...',
      '..yyyyyyyyyyyyyy..',
      '..yyyyyyyyyyyyyy..',
      '..yyyyyyyyyyyyyy..',
      '..ytttttttttttty..',
      '..ytttttttttttty..',
      '..yyyssssssssyyy..',
      '...yyssssssssyy...',
      '...yssmmmmmmsy....',
      '....ssssssss......',
      '....sSSSSSSs......',
      '.....ssssss.......',
      '...cccccccccc.....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..cccccccccccc....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
  GUARD: {
    pal: { n: [50, 60, 90], h: [46, 38, 32], c: [50, 60, 90], C: [36, 44, 68], y: [224, 172, 64] },
    rows: [
      '....nnnnnnnnnn....',
      '...nnnnnnnnnnnn...',
      '..nnnnnnnnnnnnnn..',
      '...nnnnnnnnnnnn...',
      '...hhssssssssHh...',
      '...hssssssssssh...',
      '...hsppssssppsh...',
      '...hssssssssssh...',
      '...hssskkkksssh...',
      '...hssssssssssh...',
      '....ssssssss......',
      '....sSSSSSSs......',
      '.....ssssss.......',
      '...nnnnnnnnnn.....',
      '..nnnnnnnnnnnn....',
      '..nnnnnnyynnnn....',
      '..nnnnnnyynnnn....',
      '..nnnnnnnnnnnn....',
      '..CCCCCCCCCCCC....',
      '..................',
      '..................',
    ],
  },
};

// 'p' 瞳孔 / 'm' 嘴的自动定位；渲染时可选：shock（翻白眼）、talk（嘴动）
const faceCache = new Map();
function faceRows(key) { return FACES[key] ? FACES[key].rows : FACES.MAN1.rows; }
function facePal(key) { return Object.assign({}, BASE_PAL, FACES[key] ? FACES[key].pal : {}); }

function faceCanvas(key, mode) {
  // mode: '' | 'shock' | 'talk0' | 'talk1'
  const ck = key + '|' + mode;
  let c = faceCache.get(ck);
  if (c) return c;
  if (faceCache.size > 220) faceCache.clear();
  const SC = 4, rows = faceRows(key), pal = facePal(key);
  const [cv, g] = makeCanvas(rows[0].length * SC, rows.length * SC);
  let eyes = [], mouth = null;
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      let ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      let col;
      if (ch === 'p') col = mode === 'shock' ? pal.e : pal.p;
      else if (ch === 'm') col = (mode === 'talk0' || mode === 'talk1') ? (mode === 'talk0' ? pal.m : [90, 40, 36]) : pal.m;
      else col = pal[ch] || pal.s;
      g.fillStyle = rgb(col);
      g.fillRect(i * SC, j * SC, SC, SC);
      if (ch === 'p') eyes.push([i, j]);
      if (ch === 'm') { mouth = mouth || [i, j, i, j]; mouth[0] = Math.min(mouth[0], i); mouth[1] = Math.min(mouth[1], j); mouth[2] = Math.max(mouth[2], i); mouth[3] = Math.max(mouth[3], j); }
    }
  }
  if (mode === 'shock' && eyes.length) {
    g.fillStyle = rgb(pal.p);
    for (const [ex, ey] of eyes) g.fillRect(ex * SC, (ey - 1) * SC, SC, 1); // 眉头上抬一条
    if (mouth) {
      g.fillStyle = rgb([90, 40, 36]);
      g.fillRect(((mouth[0] + mouth[2]) >> 1) * SC, (mouth[1]) * SC, SC, SC * 2);
    }
  }
  faceCache.set(ck, cv);
  return cv;
}
const FW = 72, FH = 84;

// 证件照：缩小到 40×48（无平滑取整像素）
const photoCache = new Map();
function facePhoto(key) {
  let c = photoCache.get(key);
  if (c) return c;
  const [cv, g] = makeCanvas(40, 48);
  g.imageSmoothingEnabled = false;
  g.drawImage(faceCanvas(key, ''), 0, 0, FW, FH, 0, 0, 40, 48);
  photoCache.set(key, cv);
  return cv;
}

// X 光剪影
const silCache = new Map();
function faceSilhouette(key) {
  let c = silCache.get(key);
  if (c) return c;
  const src = faceCanvas(key, '');
  const [cv, g] = makeCanvas(FW, FH);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = K.XFG;
  g.fillRect(0, 0, FW, FH);
  silCache.set(key, cv);
  return cv;
}
