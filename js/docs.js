'use strict';
// 证件与纸张。每种证件知道自己的尺寸、怎么画、各栏位相对坐标（检查模式用）。

function docShadow(x, y, w, h) { rect(x + 2, y + 2, x + w + 1, y + h + 1, K.DESK_D); }

// ———————— 居民身份证（主证件） ————————
class IDCard {
  constructor({ name, sex, birth, addr, no, person }) {
    Object.assign(this, { name, sex, birth, addr, no, person });
    this.w = 176; this.h = 118;
    this.icon = ['book', C.IDGREEN];
    this.fields = {
      header: [3, 3, 172, 18], name: [56, 22, 172, 36], sex: [56, 36, 172, 47],
      birth: [56, 47, 172, 59], addr: [56, 59, 172, 88], no: [56, 90, 172, 104],
    };
  }
  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, K.IDGREEN_D);
    rect(x + 1, y + 1, x + w - 2, y + h - 2, K.IDGREEN);
    rect(x + 1, y + 1, x + w - 2, y + 18, K.IDGREEN_D);
    txt(x + 8, y + 5, '居民身份证', 10, K.PAPER);
    txt(x + w - 8, y + 7, 'ID CARD', 8, 'rgb(150,176,148)', 'ra');
    for (let yy = y + 24; yy < y + h - 20; yy += 4) rect(x + 56, yy, x + w - 6, yy, 'rgb(126,152,124)');
    rect(x + 9, y + 24, x + 52, y + 78, K.PAPER_D);
    rect(x + 10, y + 25, x + 51, y + 77, K.PAPER);
    G.drawImage(facePhoto(this.person), x + 11, y + 26);
    txt(x + 12, y + 80, '毛豆网盟监制', 8, K.PAPER_D, 'la');
    const row = (label, val, yy, vs = 10) => {
      txt(x + 58, yy, label, 8, K.TEXT_L);
      txt(x + 80, yy - 1, val, tw(val, vs) > 92 ? 8 : vs, K.TEXT);
    };
    row('姓名', this.name, y + 23, 12);
    row('性别', this.sex, y + 37);
    row('出生', this.birth, y + 48);
    wrap(this.addr, 8, 88).slice(0, 2).forEach((s, i) => {
      if (i === 0) txt(x + 58, y + 60, '住址', 8, K.TEXT_L);
      txt(x + 80, y + 59 + i * 10, s, 8, K.TEXT);
    });
    row('证号', this.no, y + 91, 10);
  }
}

// ———————— 毛豆网盟会员卡 ————————
class MemberCard {
  constructor({ no, owner, tier, balance, cnt }) {
    this.rows = cnt ? [['卡号', no], ['卡主', owner], ['等级', tier], ['余额', balance], ['人数', cnt]]
      : [['卡号', no], ['卡主', owner], ['等级', tier], ['余额', balance]];
    this.w = 152;
    this.h = 20 + 14 * this.rows.length + 8;
    this.icon = ['card', C.GREENP];
    this.fields = {};
    this.rows.forEach(([k], i) => { this.fields[k] = [4, 18 + 14 * i, this.w - 5, 31 + 14 * i]; });
  }
  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, K.GREENP_D);
    rect(x + 1, y + 1, x + w - 2, y + h - 2, K.GREENP);
    rect(x + 1, y + 1, x + w - 2, y + 14, K.GREENP_D);
    txt(x + 6, y + 4, '毛豆网盟 · 会员卡', 10, K.TEXT);
    txt(x + w - 6, y + 6, 'MEMBER', 8, K.GREENP_D, 'ra');
    this.rows.forEach(([k, v], i) => {
      const yy = y + 20 + i * 14;
      const susp = k === '人数';
      txt(x + 8, yy, k, 10, susp ? K.RED_D : K.TEXT_L);
      txt(x + 38, yy, v, tw(v, 10) > w - 44 ? 8 : 10, susp ? K.RED_D : K.TEXT);
      G.fillStyle = K.GREENP_D;
      for (let sx = x + 6; sx < x + w - 6; sx += 2) G.fillRect(sx, yy + 11, 1, 1);
    });
  }
}

// ———————— 支付凭证 ————————
class Receipt {
  constructor({ pay, phone, bill }) {
    this.rows = [['支付', pay], ['手机', phone], ['账单', bill]];
    this.w = 152;
    this.h = 20 + 14 * this.rows.length + 8;
    this.icon = ['card', C.BLUEP];
    this.fields = {};
    this.rows.forEach(([k], i) => { this.fields[k] = [4, 18 + 14 * i, this.w - 5, 31 + 14 * i]; });
  }
  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, K.BLUEP_D);
    rect(x + 1, y + 1, x + w - 2, y + h - 2, K.BLUEP);
    rect(x + 1, y + 1, x + w - 2, y + 14, K.BLUEP_D);
    txt(x + 6, y + 4, '支付凭证', 10, K.TEXT);
    txt(x + w - 6, y + 6, 'RECEIPT', 8, K.BLUEP_D, 'ra');
    this.rows.forEach(([k, v], i) => {
      const yy = y + 20 + i * 14;
      txt(x + 8, yy, k, 10, K.TEXT_L);
      const lines = wrap(v, 10, w - 44);
      txt(x + 38, yy, lines[0], tw(lines[0], 10) > w - 44 ? 8 : 10, K.TEXT);
      if (lines[1]) txt(x + 38, yy + 10, lines[1], 8, K.TEXT);
      G.fillStyle = K.BLUEP_D;
      for (let sx = x + 6; sx < x + w - 6; sx += 2) G.fillRect(sx, yy + 11, 1, 1);
    });
  }
}

// ———————— 小纸条（夹在证件里的） ————————
class NotePaper {
  constructor(lines) {
    this.lines = lines;
    this.w = Math.max(...lines.map((s) => tw(s, 10))) + 16;
    this.h = 12 + 13 * lines.length;
    this.icon = ['card', [236, 228, 204]];
    this.fields = {};
  }
  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(236,228,204)');
    G.fillStyle = K.DESK_D;
    G.beginPath(); G.moveTo(x + this.w - 8, y); G.lineTo(x + this.w, y); G.lineTo(x + this.w, y + 8); G.fill();
    this.lines.forEach((s, i) => txt(x + 8, y + 7 + i * 13, s, 10, 'rgb(90,70,60)'));
  }
}

// ———————— 绿盾办警告单 ————————
class Citation {
  constructor(lines) {
    this.lines = lines;
    this.w = 168;
    this.h = 26 + 13 * lines.length + 6;
    this.icon = ['card', [226, 184, 176]];
    this.fields = {};
  }
  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(226,184,176)');
    rect(x, y, x + this.w - 1, y + 16, K.RED_D);
    txt(x + 6, y + 4, '绿盾行动 · 警告单', 10, K.WHITE);
    txt(x + this.w - 6, y + 6, 'CITATION', 8, 'rgb(226,184,176)', 'ra');
    this.lines.forEach((s, i) => {
      txt(x + 8, y + 22 + i * 13, s, tw(s, 10) > this.w - 14 ? 8 : 10, i === this.lines.length - 1 ? K.RED_D : K.TEXT);
    });
  }
}

// ———————— 打印长条（话费/号码核验） ————————
class PrintStrip {
  constructor(header, rows) {
    this.header = header; this.rows = rows;
    this.w = 128;
    this.h = 10 + 13 * header.length + 6 + 10 * rows.length + 6;
    this.icon = ['card', [232, 230, 222]];
    this.fields = {};
  }
  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, 'rgb(232,230,222)');
    G.fillStyle = K.GREY;
    for (let yy = y + 3; yy < y + h; yy += 6) { G.fillRect(x + 2, yy, 1, 1); G.fillRect(x + w - 3, yy, 1, 1); }
    let yy = y + 6;
    for (const s of this.header) { txt(x + 8, yy, s, 10, K.INK); yy += 13; }
    rect(x + 6, yy, x + w - 7, yy, K.GREY);
    yy += 5;
    for (const s of this.rows) { txt(x + 8, yy, s, 8, K.TEXT); yy += 10; }
  }
}

// ———————— 策划案（结局用） ————————
class PlanDoc {
  constructor(text) {
    this.lines = wrap(text, 10, 158);
    this.w = 176; this.h = 24 + 13 * this.lines.length + 10;
    this.icon = ['card', [236, 234, 226]];
    this.fields = { header: [3, 3, 172, 16], text: [6, 20, 170, 20 + 13 * this.lines.length] };
  }
  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(236,234,226)');
    rect(x + 3, y + 3, x + this.w - 4, y + 16, 'rgb(110,104,96)');
    txt(x + 8, y + 6, '策划案 · 内部机密', 8, K.WHITE);
    this.lines.forEach((s, i) => txt(x + 9, y + 22 + i * 13, s, 10, K.INK));
  }
}

// ———————— 学生宿舍地址卡（成堆出现的效果） ————————
function drawAddressCard(x, y) {
  docShadow(x, y, 96, 34);
  rect(x, y, x + 95, y + 33, K.PAPER_D);
  rect(x + 1, y + 1, x + 94, y + 32, K.PAPER);
  txt(x + 6, y + 6, '实验中学·宿舍302', 8, K.TEXT);
  txt(x + 6, y + 20, '文化路 6 号', 8, K.TEXT_L);
}

// ———————— 《护网公约》：当天的规则手册，两页可翻 ————————
const RULES = [
  { day: 1, page: 0, key: 'age', head: '§1 未成年人禁止入内', subs: ['以身份证「出生」为准，满 18 周岁', '方可入内。未满 18：拒绝'] },
  { day: 2, page: 0, key: 'num', head: '§2 进门须报身份证号', subs: ['报不出、或与证件不符：拒绝'] },
  { day: 2, page: 0, key: 'quiz', head: '§3 暗号露馅者扭送', subs: ['先有疑点才能测谎（『检查』模式', '点证件矛盾或点 Ta 说的话）', '例：问「爱你孤身走暗巷？」', '接「爱你不跪的模样」＝露馅', '露馅：拒绝或扭送教导主任'] },
  { day: 3, page: 1, key: 'pay', head: '§4 会员卡与支付须本人', subs: ['禁止：借卡、拼卡、家长代付', '禁止：学校宿舍账单、亲情副卡'] },
  { day: 4, page: 1, key: 'bag', head: '§5 书包安检须干净', subs: ['课本、试卷、红领巾等在校标识：', '拒绝（右下『X光』扫描）'] },
  { day: 5, page: 1, key: 'gang', head: '§6 一卡多人一律拒绝', subs: ['无论怎么拼：车队、包夜、代练'] },
];

class Rulebook {
  constructor(day) {
    this.day = day;
    this.w = 200;
    this.icon = ['book', C.BOOK];
    const rules = RULES.filter((r) => r.day <= day);
    this.npages = day >= 3 ? 2 : 1;
    this.pages = [];
    for (let p = 0; p < this.npages; p++) {
      const L = [];
      for (const r of rules.filter((q) => q.page === p)) {
        L.push({ s: r.head, size: 10, col: r.day === day ? K.RED_D : K.TEXT, key: r.key, isNew: r.day === day });
        for (const s of r.subs) L.push({ s, size: 8, col: K.TEXT_L, key: r.key });
      }
      if (p === this.npages - 1) L.push({ s: '第 12 条：只看证件，不看脸。', size: 8, col: K.TEXT_L, key: null });
      let y = 22;
      const fields = {};
      for (const row of L) {
        row.y = y;
        y += row.size === 10 ? 14 : 10;
        if (row.key) {
          const f = fields[row.key];
          fields[row.key] = f ? [f[0], f[1], f[2], y - 2] : [4, row.y - 2, this.w - 5, y - 2];
        }
      }
      this.pages.push({ rows: L, fields, h: y + 6 });
    }
    this.h = Math.max(...this.pages.map((p) => p.h));
    this.page = this.npages - 1;
    this.tab = [this.w - 52, 3, this.w - 4, 16];
  }
  get fields() { return this.pages[this.page].fields; }
  flip() { this.page = (this.page + 1) % this.npages; }
  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, K.BOOK);
    rect(x + 3, y + 3, x + w - 4, y + h - 4, K.PAPER);
    rect(x + 3, y + 3, x + w - 4, y + 16, K.BOOK_L);
    txt(x + 8, y + 5, '护网公约 · 网吧检查规则', 10, K.PAPER);
    if (this.npages > 1) {
      rect(x + this.tab[0], y + this.tab[1], x + this.tab[2], y + this.tab[3], K.BOOK);
      txt(x + this.tab[2] - 4, y + 7, `第${this.page + 1}/${this.npages}页 ▶`, 8, K.PAPER, 'ra');
    } else {
      txt(x + w - 8, y + 7, `DAY ${this.day}`, 8, K.PAPER, 'ra');
    }
    for (const r of this.pages[this.page].rows) {
      txt(x + 8, y + r.y, r.s, r.size, r.col);
      if (r.isNew) {
        const nx = x + 10 + tw(r.s, r.size);
        rect(nx, y + r.y - 1, nx + 19, y + r.y + 8, K.RED);
        txt(nx + 2, y + r.y, 'NEW', 8, K.WHITE);
      }
    }
  }
}

// 柜台上的小图标
function smallIcon(kind, color, x, y) {
  if (kind === 'book') {
    rect(x, y, x + 18, y + 12, K.INK);
    rect(x + 1, y + 1, x + 17, y + 11, rgb(color));
    pt(x + 9, y + 6, K.GOLD);
  } else {
    const d = color.map((c) => Math.floor(c * 0.82)), d2 = color.map((c) => Math.floor(c * 0.75));
    rect(x, y, x + 16, y + 10, rgb(d));
    rect(x + 1, y + 1, x + 15, y + 9, rgb(color));
    rect(x + 3, y + 4, x + 12, y + 4, rgb(d2));
  }
}
