'use strict';
// 剧本数据：每天的报纸、固定角色、随机路人、特殊事件。
//
// 旅客 spec：
//   person   立绘 key（PEOPLE）             voice  假语音音高
//   intro    进门后说的话                    after  递完证件后说的话
//   docs     证件列表 {key, doc}             primary 要盖章的主证件 key
//   ok       正确处理方式（approve / deny / detain 的子集）
//   reason   判错时警告单上写的理由           hint   警告单上的提示
//   issues   检查模式里能点出来的矛盾：{pairs, title, sub, ask, fx}
//   xray     X 光下书包里的东西 [{icon, at, label, key}]
//   quiz     'kid' = 测谎会露馅；{first: n} 指定第一题
//   react    盖章后的反应 {deny: [...], approve: [...]}
//   onPlace  证件第一次放到桌上时触发：note
//   then     旅客离开后的后续：closeup / ending
// 台词步骤：[who, text, {expr, sweat, hold, fight}]，who = 'C' 网管 / 'E' 旅客 / 'Q' 队伍里
// 特殊事件：{type: 'rush'} 放学快剪；{type: 'fence'} 翻墙大军

const LAST_DAY = 6;
// 日期：开局锚定真实日期（老存档无锚点时回退到 2026.10.19）
function anchorDate() { return new Date(S.anchor || new Date(2026, 9, 19).getTime()); }
function gameDate(day) {
  const d = anchorDate();
  d.setDate(d.getDate() + day - 1);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
function gameWeekday(day) {
  const d = anchorDate();
  d.setDate(d.getDate() + day - 1);
  return `星期${'日一二三四五六'[d.getDay()]}`;
}
// 铁蛋的生日 = 第 6 天（当天恰好满 18）
function tiedanBirth() {
  const d = anchorDate();
  d.setDate(d.getDate() + LAST_DAY - 1);
  return `2008.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const NEWS = {
  1: { h1: '绿盾行动启动！', sub: '全市网吧一律设卡：未成年人禁入', h2: '网协发言人：本协会对青少年非常关心', icon: 'gate' },
  2: { h1: '新规：进门先背身份证号', sub: '多名“大学生”背不出自己的出生日期', h2: '震惊！某中学门口“租证”生意火爆，50 元一天', icon: 'clock' },
  3: { h1: '实名核验升级！', sub: '即日起核查会员卡与支付凭证', h2: '某班主任：班里前十名的家长都来问过网吧', icon: 'plane' },
  4: { h1: '今天是疯狂星期四', sub: '绿盾办引进 X 光：书包无所遁形', h2: '专家提醒：书包里的《五三》，不一定是他的', icon: 'drumstick' },
  5: { h1: '严打“五排车队”', sub: '一卡多人一律拒绝，无论怎么拼', h2: '铁蛋妈妈：孩子这次月考进步了 20 名', icon: 'jorji' },
  6: { h1: '绿盾办表彰本周最佳网管', sub: '获奖者小陈：“我只是按公约办事。”', h2: '网友：建议给网管涨工资', icon: 'medal' },
};

// ———————————————— 立绘与角色 ————————————————

const PEOPLE = {
  TIEDAN: { face: 'TIEDAN', walker: [[64, 92, 150], [70, 50, 40]], voice: 215, scripted: true, expr: 'grin' },
  GRANDPA: { face: 'GRANDPA', walker: [[110, 80, 60], [150, 146, 136]], voice: 88, scripted: true, expr: 'neutral' },
  HUBO: { face: 'HUBO', walker: [[120, 120, 116], [148, 144, 134]], voice: 80, scripted: true, expr: 'neutral' },
  SUNGLASS: { face: 'SUNGLASS', walker: [[40, 40, 46], [30, 28, 28]], voice: 90, scripted: true, expr: 'neutral' },
  HOODIE: { face: 'HOODIE', walker: [[70, 66, 80], [52, 48, 62]], voice: 100, scripted: true, expr: 'neutral' },
  KEVIN: { face: 'CAP', walker: [[70, 90, 140], [186, 60, 48]], voice: 125, scripted: true, expr: 'grin' },
  FANG: { face: 'WOMAN1', walker: [[200, 160, 170], [130, 60, 50]], voice: 190, scripted: true, expr: 'smile' },
  V50: { face: 'MAN1', walker: [[50, 60, 90], [40, 35, 32]], voice: 120, scripted: true, expr: 'grin' },
  JIAOLIAN: { face: 'MAN2', walker: [[96, 96, 102], [190, 60, 50]], voice: 130, scripted: true, expr: 'neutral' },
  PAOMIAN: { face: 'MAN3', walker: [[216, 186, 146], [55, 45, 38]], voice: 100, scripted: true, expr: 'smile' },
  BOSS: { face: 'WOMAN2', walker: [[190, 122, 62], [80, 55, 40]], voice: 150, scripted: true, expr: 'smile' },
  GUARD: { face: 'GUARD', walker: [[50, 60, 90], [36, 44, 68]], voice: 60, scripted: true, guard: true, expr: 'angry' },
  GUARD2: { face: 'GUARD', walker: [[44, 54, 84], [36, 44, 68]], voice: 66, scripted: true, guard: true, expr: 'angry' },
  KID_A: { face: 'KID_A', walker: [[206, 200, 188], [50, 38, 30]], voice: 225 },
  KID_B: { face: 'KID_B', walker: [[190, 122, 140], [100, 60, 40]], voice: 230 },
  KID_C: { face: 'KID_C', walker: [[92, 132, 82], [60, 45, 35]], voice: 205 },
  RIDER: { face: 'RIDER', walker: [[90, 60, 40], [220, 170, 60]], voice: 110 },
  POOL_M1: { face: 'MAN1', walker: [[80, 80, 86], [40, 35, 32]], voice: 135 },
  POOL_M2: { face: 'MAN2', walker: [[70, 80, 120], [46, 38, 32]], voice: 145 },
  POOL_W: { face: 'WOMAN1', walker: [[90, 110, 150], [130, 60, 50]], voice: 180 },
};

// ———————————————— 姓名与地址池 ————————————————

const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '周', '吴', '郑'];
const GIVEN_M = ['建国', '建军', '志强', '磊', '洋', '勇', '军', '杰', '涛', '超'];
const GIVEN_F = ['芳', '娜', '敏', '静', '丽', '娟', '艳', '秀英', '桂芳', '雪'];
const KID_NAMES = ['王铁蛋', '李小虎', '张豆豆', '刘大壮', '陈小胖', '赵浩浩', '孙毛毛', '周萱萱'];
const STREETS = ['梧桐路 12 号', '建设路 480 号', '枫林路 77 号', '永安街 1500 号', '朝阳巷 23 号', '湖滨路 9 号'];
const REGIONS = [['330102', '上城区'], ['330106', '西湖区'], ['110105', '朝阳区'], ['440304', '南山区'], ['510107', '武侯区']];

// ———————————————— 测谎暗号 ————————————————
// 小学生听到上半句会条件反射接下半句

const QUIZ = [
  ['爱你孤身走暗巷？', '爱你不跪的模样！'],
  ['挖掘机技术哪家强？', '中国山东找蓝翔！'],
  ['白龙马，蹄朝西？', '驮着唐三藏跟着仨徒弟！'],
  ['奥利给！', '干了兄弟们！'],
  ['我的世界和迷你世界，哪个好玩？', '当然是迷你世界！'],
  ['敌军还有五秒到达战场？', '全军出击！'],
  ['你作业写完了吗？', '写完了，就差一点儿！'],
  ['今天星期几？', '疯狂星期四！V 我 50！'],
];
const QUIZ_THURSDAY = 7;
const QUIZ_MINI = 4;
const QUIZ_CONFUSED = ['……你在对暗号吗？', '啥玩意儿？', '朋友，我没听懂。', '这是哪首歌？', '……我十岁的侄子可能会。', '听不懂，下一题。'];

// 证件干净的伪装者，话里会露马脚：检查模式下点 Ta 说的话
const TELL = (say, sub, ask) => ({ say, title: '可疑：话里有马脚', sub, ask });
const RANDOM_TELLS = [
  ['叔，我爸让我来的。', '开口就“我爸让我来的”',
    [['C', '那你爸呢？'], ['E', '……出差了。', { sweat: true, expr: 'shock' }]]],
  ['哥，通融一下哈。', '句尾带“哈”，还管你叫哥',
    [['C', '我像你哥吗？'], ['E', '……像哥！亲哥！', { sweat: true, expr: 'nervous' }]]],
  ['我作业写完了，真的。', '没人问你作业',
    [['C', '谁问你作业了？'], ['E', '……漏台词了。', { sweat: true, expr: 'shock' }]]],
  ['老师拖堂了，来晚了。', '“老师拖堂”暴露了在校生身份',
    [['C', '你们老师姓什么？'], ['E', '……我们教练！健身教练！', { sweat: true, expr: 'nervous' }]]],
  ['我妈八点来接我。', '被家长接送的“成年人”',
    [['C', '你多大？'], ['E', '三十！我妈就是爱接我！', { sweat: true, expr: 'shock' }]]],
];

// ———————————————— 工具 ————————————————

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = rint(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const digits = (n) => Array.from({ length: n }, () => rint(0, 9)).join('');

function randBirth(y0, y1) { return `${rint(y0, y1)}.${String(rint(1, 12)).padStart(2, '0')}.${String(rint(1, 28)).padStart(2, '0')}`; }

// 18 位证号：6 位地区码 + 8 位生日 + 4 位顺序码
function idNo(region, birth) {
  const [code] = region;
  const b = birth.replace(/\./g, '');
  return `${code}${b}${rint(1, 9)}${digits(3)}`;
}

function adultID(person, opts = {}) {
  const region = opts.region || pick(REGIONS);
  const birth = opts.birth || randBirth(1970, 2004);
  const sex = opts.sex || pick(['男', '女']);
  const given = sex === '男' ? pick(GIVEN_M) : pick(GIVEN_F);
  const name = opts.name || pick(SURNAMES) + given;
  return new IDCard({
    person, name, sex, birth,
    addr: opts.addr || `${pick(REGIONS)[1]}·${pick(STREETS)}`,
    no: idNo(region, birth),
  });
}

const memberCard = (owner, opts = {}) => new MemberCard({
  no: `MD-${rint(10, 26)}${digits(6)}`,
  owner,
  tier: opts.tier || pick(['青铜', '白银', '黄金', '钻石']),
  balance: `¥${rint(0, 80)}`,
  cnt: opts.cnt,
});

const receipt = (opts = {}) => new Receipt({
  pay: opts.pay || pick(['现金', '微信·余额', '支付宝·花呗', `银行卡·尾号${digits(4)}`]),
  phone: opts.phone || `1${pick(['3', '5', '7', '8'])}${digits(9)}`,
  bill: opts.bill || `${pick(REGIONS)[1]}·${pick(STREETS)}`,
});

// —— 常见矛盾 ——
const AGE_ISSUE = (birth) => ({
  pairs: [['id.birth', 'rule.age'], ['id.birth'], ['id.header', 'rule.age']],
  title: '未成年人  MINOR', sub: `出生：${birth}，未满 18 周岁`,
  ask: [['C', '你满 18 了吗？'], ['E', '……虚岁算不算？', { sweat: true, expr: 'nervous' }]],
});
const NUM_ISSUE = (no) => ({
  pairs: [['id.no', 'rule.num'], ['id.no']],
  title: '证号对不上', sub: `证号：${no}（Ta 刚才背的不是这个）`, ask: null,
});
const NAME_ISSUE = (idName, owner) => ({
  pairs: [['id.name', 'mc.卡主'], ['mc.卡主', 'rule.pay'], ['id.name', 'rule.pay']],
  title: '卡不是他的', sub: `身份证：${idName}   VS   会员卡：${owner}`,
  ask: [['C', '这卡是谁的？'], ['E', '……我爸的。我们长得像。', { sweat: true, expr: 'nervous' }]],
});
const PAY_ISSUE = (pay) => ({
  pairs: [['rc.支付', 'rule.pay'], ['rc.支付']],
  title: '家长代付', sub: `支付方式：${pay}`, ask: null,
});
const DORM_ISSUE = () => ({
  pairs: [['rc.账单', 'rule.pay'], ['rc.账单', 'id.addr']],
  title: '记录比对', sub: '今天第 37 个账单在实验中学宿舍的旅客', fx: 'pile',
  ask: [['C', '你住学校宿舍？'], ['E', '……我给侄子代付的。', { sweat: true, expr: 'nervous' }]],
});
const PHONE_ISSUE = (phone) => ({
  pairs: [['rc.手机', 'rule.pay'], ['rc.手机']],
  title: '号码查询', sub: `${phone}：亲情网副卡`, fx: 'strip', phone,
  ask: [['C', '这号的主卡是谁？'], ['E', '……我妈。这号是我妈的！', { sweat: true, expr: 'shock' }]],
});
const XRAY_ITEM = {
  wusan: { icon: 'wusan', at: [30, 96], label: '五三·数学', key: 'xr.wusan' },
  juan: { icon: 'juan', at: [-32, 100], label: '试卷·57分', key: 'xr.juan' },
  hong: { icon: 'hong', at: [30, 98], label: '红领巾', key: 'xr.hong' },
  cup: { icon: 'cup', at: [-30, 96], label: '保温杯', key: 'xr.cup' },
};
const BAG_ISSUE = (kind) => ({
  pairs: [[XRAY_ITEM[kind].key], [XRAY_ITEM[kind].key, 'rule.bag']],
  title: '书包安检', sub: '书包里有在校生标识',
  ask: [['C', '书包里是什么？'], ['E', '……是我哥的。', { sweat: true, expr: 'nervous' }]],
});
const GANG_ISSUE = (n) => ({
  pairs: [['mc.人数', 'rule.gang'], ['mc.人数'], ['id.name', 'rule.gang']],
  title: '一卡多人  GANG', sub: `会员卡：${n} 人（车队）`,
  ask: [['C', '一张卡怎么六个人用？'], ['E', 'We are……我们是兄弟。', { expr: 'smile' }]],
});

// X 光物品图标（8px 网格图案，'X' 是线条）
const XRAY_ICONS = {
  wusan: ['XXXXXXXXXX', 'X........X', 'X.XXXXXX.X', 'X........X', 'XXXXXXXXXX', '.X......X.', '..XXXXXX..'],
  juan: ['X........X', 'X.XXXX.X.X', 'X........X', 'X.XXXX.X.X', 'X........X', 'X.XX.XX.XX', 'XXXXXXXXXX'],
  hong: ['XX........', 'XXXX......', 'XXXXXX....', 'XXXXXXXX..', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXX......'],
  cup: ['...XX.....', '..XXXX....', '..XXXX....', '..XXXX....', '..XXXX....', '..XXXX....', '..XXXX....'],
};

// ———————————————— 固定角色 ————————————————

function day1Fixed() {
  return {
    grandpa: {
      person: 'GRANDPA', voice: 88,
      intro: [['E', '小伙子，斗地主房间的密码是多少？']],
      docs: [{ key: 'id', doc: adultID('GRANDPA', { birth: '1951.08.08', sex: '男', name: '王守义' }) }],
      primary: 'id', ok: ['approve'], issues: [],
      react: { approve: [['E', '好嘞，占个靠窗的座。', { expr: 'smile' }]] },
    },
    boss: {
      person: 'BOSS', voice: 150,
      intro: [['E', '我巡店，别拦我。']],
      docs: [{ key: 'id', doc: adultID('BOSS', { birth: '1975.03.21', sex: '女', name: '钱掌柜' }) }],
      primary: 'id', ok: ['approve'], issues: [],
      react: { approve: [['E', '这月奖金看你的了。', { expr: 'smile' }]] },
    },
    tiedan: (() => {
      const tb = tiedanBirth();
      return {
        person: 'TIEDAN', voice: 215,
        intro: [['E', '叔，我成年了，真的。']],
        docs: [{ key: 'id', doc: adultID('TIEDAN', { birth: tb, sex: '男', name: '王铁蛋', region: REGIONS[0] }) }],
        primary: 'id',
        ok: ['deny'], reason: `出生：${tb}，未满 18`,
        issues: [AGE_ISSUE(tb)],
        react: { deny: [['E', '……还有五天！就差五天！', { expr: 'shock', hold: 1.4 }]] },
      };
    })(),
  };
}

function randomDay1(valid) {
  const person = takePoolPerson();
  if (valid) {
    return {
      person, voice: rint(100, 190),
      intro: [['E', pick(['办张卡，充五十。', '开台机子，包夜。', '上次充的钱还在吗？', '老板，来瓶冰可乐。'])]],
      docs: [{ key: 'id', doc: adultID(person) }], primary: 'id',
      ok: ['approve'], issues: [],
      react: { approve: [['E', pick(['谢了。', '几号机？', '老位置。'])]] },
    };
  }
  const birth = randBirth(2009, 2011);
  const name = pick(KID_NAMES);
  return {
    person, voice: rint(190, 230),
    intro: [['E', pick(['叔，我高一的。', '我身份证忘家里了，这是我的。', '看看像不像 18？'])]],
    docs: [{ key: 'id', doc: adultID(person, { birth, name }) }], primary: 'id',
    ok: ['deny'], reason: `出生：${birth}，未满 18`,
    issues: [AGE_ISSUE(birth)],
    react: { deny: [['E', pick(['啊？为什么？', '……我回去背证号。', '那我找我哥借证。', '行吧。']), { expr: 'shock' }]] },
  };
}

function day2Fixed() {
  return {
    kevin: {
      person: 'KEVIN', voice: 125,
      intro: [['E', 'Hello哈。']],
      tell: TELL('Hello哈。', '英文后面跟了个“哈”（输入法没切回来）',
        [['C', '你这个“哈”是什么？'], ['E', '……Ha! Ha ha. Very English.', { sweat: true, expr: 'nervous' }]]),
      docs: [
        { key: 'id', doc: adultID('KEVIN', { birth: '1995.07.16', sex: '男', name: '赵天宇' }) },
        { key: 'mc', doc: memberCard('赵天宇') },
      ],
      primary: 'id', quiz: { first: 0 },
      ok: ['deny', 'detain'], reason: 'Ta 会接《孤勇者》', hint: '提示：用『检查』点 Ta 说的话，找马脚',
      issues: [],
    },
    fang: {
      person: 'FANG', voice: 190,
      intro: [['E', '家人们，今天这网吧还行。']],
      docs: [
        { key: 'id', doc: adultID('FANG', { birth: '1988.11.02', sex: '女', name: '孙美丽' }) },
        { key: 'mc', doc: memberCard('孙美丽', { tier: '钻石' }) },
      ],
      primary: 'id', quiz: 'adult',
      ok: ['approve'], issues: [],
      react: { approve: [['E', '下播请你喝快乐水。', { expr: 'smile' }]] },
    },
    tiedan: {
      person: 'TIEDAN', voice: 215,
      intro: [['E', '叔，我爸让我来的。']],
      tell: TELL('叔，我爸让我来的。', '开口就“我爸让我来的”',
        [['C', '那你爸呢？'], ['E', '……出差了。在非洲。挖煤。', { sweat: true, expr: 'nervous' }]]),
      docs: [
        { key: 'id', doc: adultID('TIEDAN', { birth: '1979.04.18', sex: '男', name: '王大柱' }) },
        { key: 'mc', doc: memberCard('王大柱', { tier: '黄金' }) },
      ],
      primary: 'id', quiz: { first: 1 },
      ok: ['deny', 'detain'], reason: 'Ta 会接“中国山东找蓝翔”', hint: '提示：用『检查』点 Ta 说的话，找马脚',
      issues: [],
    },
  };
}

function day3Fixed() {
  return {
    paomian: {
      person: 'PAOMIAN', voice: 100,
      intro: [['E', '老板，老三样！']],
      docs: [
        { key: 'id', doc: adultID('PAOMIAN', { birth: '1990.09.09', sex: '男', name: '吴老三' }) },
        { key: 'mc', doc: memberCard('吴老三') },
        { key: 'rc', doc: receipt({ pay: '现金', bill: '文化路·实验中学(宿舍302)' }) },
      ],
      primary: 'id',
      ok: ['deny', 'detain'], reason: '账单：实验中学宿舍 302（学生证伪）',
      issues: [DORM_ISSUE()],
      react: { deny: [['E', '……那是我代取快递的地址。', { expr: 'shock' }]] },
    },
    jiaolian: {
      person: 'JIAOLIAN', voice: 130,
      intro: [['E', '练完就来的，爽。']],
      docs: [
        { key: 'id', doc: adultID('JIAOLIAN', { birth: '1986.06.06', sex: '男', name: '郑铁柱' }) },
        { key: 'mc', doc: memberCard('郑铁柱') },
        { key: 'rc', doc: receipt({ pay: '银行卡·尾号6688', phone: '13800001234（亲情副卡）' }) },
      ],
      primary: 'id',
      ok: ['deny', 'detain'], reason: '手机号是亲情网副卡（主卡：他妈）',
      issues: [PHONE_ISSUE('13800001234')],
      react: { deny: [['E', '副卡怎么了！我妈自愿的！', { expr: 'shock' }]] },
    },
    tiedan: {
      person: 'TIEDAN', voice: 215,
      intro: [['E', '叔，这次证是真的！我哥的！']],
      docs: [
        { key: 'id', doc: adultID('TIEDAN', { birth: '1999.02.14', sex: '男', name: '王铁龙' }) },
        { key: 'mc', doc: memberCard('王大柱', { tier: '黄金' }) },
        { key: 'rc', doc: receipt({ pay: '微信·妈妈', bill: '建设路 480 号' }) },
      ],
      primary: 'id',
      ok: ['deny', 'detain'], reason: '会员卡是王大柱的（借卡）+ 家长代付',
      issues: [NAME_ISSUE('王铁龙', '王大柱'), PAY_ISSUE('微信·妈妈')],
      react: { deny: [['E', '……我们一家人长得像！', { sweat: true, expr: 'nervous' }]] },
    },
  };
}

function day4Fixed() {
  const cleanDocs = (person, opts) => [
    { key: 'id', doc: adultID(person, opts) },
    { key: 'mc', doc: memberCard(opts.name) },
    { key: 'rc', doc: receipt() },
  ];
  return {
    hong: {
      person: 'KID_A', voice: 225,
      intro: [['E', '哥哥好~']],
      docs: cleanDocs('KID_A', { birth: '1996.05.20', sex: '女', name: '刘甜甜' }),
      primary: 'id', xray: [XRAY_ITEM.hong],
      ok: ['deny', 'detain'], reason: '书包：红领巾（在校生标识）',
      issues: [BAG_ISSUE('hong')],
      react: { deny: [['E', '……领巾借我同学的。', { sweat: true, expr: 'nervous' }]] },
    },
    v50: {
      person: 'V50', voice: 120,
      intro: [['E', 'Hey！今天星期几？']],
      tell: TELL('Hey！今天星期几？', '他知道今天是什么日子（懂的都懂）',
        [['C', '你问这个干什么？'], ['E', '……V 我 50，我告诉你。', { expr: 'grin' }]]),
      docs: cleanDocs('V50', { birth: '1992.10.22', sex: '男', name: '周建国' }),
      primary: 'id', quiz: { first: QUIZ_THURSDAY },
      ok: ['deny', 'detain'], reason: 'Ta 会说“V 我 50”', hint: '提示：用『检查』点 Ta 说的话，找马脚',
      issues: [],
    },
    tiedan: {
      person: 'TIEDAN', voice: 215,
      intro: [['E', '叔，我哥让我来的！他叫王铁龙！']],
      docs: cleanDocs('TIEDAN', { birth: '1999.02.14', sex: '男', name: '王铁龙' }),
      primary: 'id', xray: [XRAY_ITEM.wusan, XRAY_ITEM.juan],
      ok: ['deny', 'detain'], reason: 'X 光：《五三》数学 + 57 分试卷',
      issues: [BAG_ISSUE('wusan'), BAG_ISSUE('juan')],
      react: { deny: [['E', '卷子是我哥的！他考的！', { sweat: true, expr: 'shock' }]] },
    },
    sunglass: {
      person: 'SUNGLASS', voice: 90,
      intro: [['E', '……', { hold: 0.8 }]],
      docs: cleanDocs('SUNGLASS', { birth: '1985.01.30', sex: '男', name: '马文龙' }),
      primary: 'id', onPlace: { id: 'note' },
      ok: ['approve'], issues: [],
    },
  };
}

function day5Fixed() {
  return {
    hubo: {
      person: 'HUBO', voice: 80,
      intro: [['E', '咳咳……年轻人，办卡。']],
      docs: [{ key: 'id', doc: adultID('HUBO', { birth: '2009.03.15', sex: '男', name: '胡伯', region: REGIONS[2] }) }],
      primary: 'id',
      ok: ['deny'], reason: '出生：2009.03.15，未满 18',
      issues: [AGE_ISSUE('2009.03.15')],
      react: { deny: [['E', '……我这张脸也不像啊！', { expr: 'shock', hold: 1.4 }]] },
      then: 'closeup',
    },
    tiedan: {
      person: 'TIEDAN', voice: 215,
      intro: [['E', '五排！就差一个位置了！']],
      docs: [
        { key: 'id', doc: adultID('TIEDAN', { birth: '1999.02.14', sex: '男', name: '王铁龙' }) },
        { key: 'mc', doc: memberCard('五排小分队', { cnt: '6 人', tier: '青铜' }) },
        { key: 'rc', doc: receipt({ pay: '现金·凑的', bill: '建设路 480 号' }) },
      ],
      primary: 'id', onPlace: { mc: 'note' }, bribe: true,
      ok: ['deny', 'detain'], reason: '会员卡：6 人（车队）',
      issues: [GANG_ISSUE(6)],
      react: { deny: [['E', '……那我们再拼一个网吧。', { expr: 'shock' }]] },
    },
    grandpa: {
      person: 'GRANDPA', voice: 88,
      intro: [['E', '又是我。今天证带齐了。']],
      docs: [
        { key: 'id', doc: adultID('GRANDPA', { birth: '1951.08.08', sex: '男', name: '王守义' }) },
        { key: 'mc', doc: memberCard('王守义', { tier: '白银' }) },
      ],
      primary: 'id', ok: ['approve'], issues: [],
      react: { approve: [['C', '大爷，慢点走。'], ['E', '好嘞。', { expr: 'smile' }]] },
    },
  };
}

function day6Fixed() {
  return {
    tiedan: {
      person: 'TIEDAN', voice: 215, tension: true,
      intro: [['E', '叔。今天，你看看我的证。', { expr: 'neutral', hold: 1.3 }]],
      docs: [
        { key: 'id', doc: adultID('TIEDAN', { birth: tiedanBirth(), sex: '男', name: '王铁蛋', region: REGIONS[0] }) },
        { key: 'mc', doc: memberCard('王铁蛋', { tier: '青铜' }) },
        { key: 'rc', doc: receipt({ pay: '现金·打工挣的', bill: '建设路 480 号' }) },
      ],
      primary: 'id',
      ok: ['approve'], issues: [],
      react: {
        approve: [['E', '六年了。', { hold: 1.4 }], ['E', '我终于……有自己的机子了。', { expr: 'smile', hold: 1.6 }]],
        deny: [['E', '你再看看！今天是我生日！', { expr: 'shock' }]],
      },
      then: 'birthday',
    },
    author: {
      person: 'HOODIE', voice: 100, author: true,
      intro: [],
      docs: [
        { key: 'pl', doc: new PlanDoc('做一个 Papers, Please 风格的小游戏：让玩家当网吧网管，专门揪出拿家长身份证来上网的小学生。梗越多越好。') },
        { key: 'rc', doc: receipt({ pay: '经费·0 元', phone: '——', bill: '家里蹲工作室' }) },
      ],
      primary: 'pl',
      ok: ['approve', 'deny', 'detain'],
      react: { approve: [['C', '……我就当没看见这张单子。', { hold: 2.0 }]] },
      issues: [{ all: true, title: '信息不符 ×99', sub: '全部栏位' }],
      then: 'ending',
    },
  };
}

// ———————————————— 随机路人 ————————————————

// kind：valid / underage / hidden（借证、话里有马脚）/ card（借卡）/ pay / dorm / phone / bag / gang
function randomEntrant(day, kind) {
  const person = takePoolPerson();
  const isKid = ['KID_A', 'KID_B', 'KID_C'].includes(person);
  const spec = {
    person, voice: rint(100, 190), intro: [['E', pick(['办张卡。', '开台机子。', '包夜多少钱？', '老板好。'])]],
    primary: 'id', issues: [], quiz: 'adult', ok: ['approve'],
    react: { approve: [['E', pick(['谢了。', '老位置。', '快。'])]] },
  };
  const nervous = (lines) => ['E', pick(lines), { sweat: true, expr: 'nervous' }];
  let docs = [];
  if (kind === 'valid') {
    docs = [{ key: 'id', doc: adultID(person) }];
    if (day >= 2) docs.push({ key: 'mc', doc: memberCard(docs[0].doc.name) });
    if (day >= 3) docs.push({ key: 'rc', doc: receipt() });
    spec.docs = docs;
    return spec;
  }
  if (kind === 'underage') {
    const birth = randBirth(2009, 2011);
    const name = pick(KID_NAMES);
    docs = [{ key: 'id', doc: adultID(person, { birth, name, sex: pick(['男', '女']) }) }];
    spec.intro = [['E', pick(['叔，我高一的。', '我像 18 吗？像吧？'])]];
    spec.issues.push(AGE_ISSUE(birth));
    spec.reason = `出生：${birth}，未满 18`;
  } else if (kind === 'hidden') {
    const [say, sub, ask] = pick(RANDOM_TELLS);
    docs = [
      { key: 'id', doc: adultID(person, { birth: randBirth(1988, 2000) }) },
      { key: 'mc', doc: null },
    ];
    docs[1].doc = memberCard(docs[0].doc.name);
    if (day >= 3) docs.push({ key: 'rc', doc: receipt() });
    spec.intro = [['E', say]];
    spec.tell = TELL(say, sub, ask);
    spec.quiz = 'kid';
    spec.reason = 'Ta 会接测谎暗号';
    spec.hint = '提示：用『检查』点 Ta 说的话，找马脚';
  } else if (kind === 'card') {
    const id = adultID(person);
    const owner = pick(SURNAMES) + pick(['建国', '桂芳', '大军', '秀英']);
    docs = [{ key: 'id', doc: id }, { key: 'mc', doc: memberCard(owner, { cnt: '2 人' }) }];
    if (day >= 3) docs.push({ key: 'rc', doc: receipt() });
    spec.issues.push(NAME_ISSUE(id.name, owner));
    spec.reason = `会员卡：${owner}（借卡拼卡）`;
  } else if (kind === 'pay') {
    const id = adultID(person);
    const pay = pick(['微信·妈妈', '支付宝·我爸', '现金·我妈给的']);
    docs = [{ key: 'id', doc: id }, { key: 'mc', doc: memberCard(id.name) }];
    if (day >= 3) docs.push({ key: 'rc', doc: receipt({ pay }) });
    spec.issues.push(PAY_ISSUE(pay));
    spec.reason = '支付方式：家长代付';
  } else if (kind === 'dorm') {
    const id = adultID(person);
    docs = [{ key: 'id', doc: id }, { key: 'mc', doc: memberCard(id.name) }, { key: 'rc', doc: receipt({ bill: '文化路·实验中学(宿舍302)' }) }];
    spec.issues.push(DORM_ISSUE());
    spec.reason = '账单：实验中学宿舍（学生证伪）';
  } else if (kind === 'phone') {
    const id = adultID(person);
    const ph = `1${pick(['3', '8'])}${digits(9)}（亲情副卡）`;
    docs = [{ key: 'id', doc: id }, { key: 'mc', doc: memberCard(id.name) }, { key: 'rc', doc: receipt({ phone: ph }) }];
    spec.issues.push(PHONE_ISSUE(ph.split('（')[0]));
    spec.reason = '手机号是亲情网副卡';
  } else if (kind === 'bag') {
    const id = adultID(person, { birth: randBirth(1988, 2000) });
    docs = [{ key: 'id', doc: id }, { key: 'mc', doc: memberCard(id.name) }, { key: 'rc', doc: receipt() }];
    const it = pick(['wusan', 'juan', 'hong']);
    spec.xray = [XRAY_ITEM[it]];
    spec.issues.push(BAG_ISSUE(it));
    spec.reason = `X 光：${XRAY_ITEM[it].label}`;
  } else if (kind === 'gang') {
    const id = adultID(person);
    const n = rint(4, 9);
    docs = [{ key: 'id', doc: id }, { key: 'mc', doc: memberCard(pick(['包夜车队', '代练工作室', '开黑联盟']), { cnt: `${n} 人` }) }, { key: 'rc', doc: receipt() }];
    spec.intro = [['E', pick(['车队来的，一起办。', '我们一个团队的。'])]];
    spec.issues.push(GANG_ISSUE(n));
    spec.reason = `会员卡：${n} 人（一卡多人）`;
  }
  if (isKid && kind !== 'underage' && Math.random() < 0.7) spec.voice = rint(190, 235);
  if (kind !== 'valid') {
    spec.ok = ['deny', 'detain'];
    if (kind !== 'underage' && kind !== 'card' && kind !== 'pay' && kind !== 'dorm' && kind !== 'phone' && kind !== 'bag' && kind !== 'gang') spec.quiz = 'kid';
    if (!spec.react.deny) spec.react = { deny: [['E', pick(['……', '可恶。', '我还会回来的。', '这都能看出来？']), { expr: 'shock' }]] };
  }
  spec.docs = docs;
  return spec;
}

// 随机路人从立绘池里不重复地抽
let POOL_LEFT = [];
function takePoolPerson() {
  if (!POOL_LEFT.length) POOL_LEFT = shuffle(Object.keys(PEOPLE).filter((k) => !PEOPLE[k].scripted));
  return POOL_LEFT.pop();
}

const FLAWS = { 2: ['underage', 'hidden', 'card'], 3: ['underage', 'hidden', 'card', 'pay', 'dorm', 'phone'] };
FLAWS[4] = FLAWS[3].concat(['bag']);
FLAWS[5] = FLAWS[4].concat(['gang']);
FLAWS[6] = FLAWS[4];

function flawed(day, n) { return shuffle(FLAWS[day].slice()).slice(0, n).map((k) => randomEntrant(day, k)); }

// 当天的队伍
function buildQueue(day) {
  POOL_LEFT = [];
  const R = (kind) => randomEntrant(day, kind);
  if (day === 1) {
    const f = day1Fixed();
    return [f.grandpa, R('valid'), f.tiedan, R(Math.random() < 0.5 ? 'valid' : 'underage'), f.boss, R('valid')];
  }
  if (day === 2) {
    const f = day2Fixed(), x = flawed(2, 2);
    return [f.kevin, R('valid'), f.tiedan, x[0], f.fang, R('valid'), x[1]];
  }
  if (day === 3) {
    const f = day3Fixed(), x = flawed(3, 2);
    return [f.paomian, R('valid'), f.jiaolian, x[0], f.tiedan, R('valid'), x[1]];
  }
  if (day === 4) {
    const f = day4Fixed(), x = flawed(4, 2);
    return [f.hong, R('valid'), f.v50, { type: 'rush' }, x[0], f.tiedan, f.sunglass, R('valid'), x[1]];
  }
  if (day === 5) {
    const f = day5Fixed(), x = flawed(5, 1);
    return [f.hubo, f.tiedan, { type: 'fence' }, f.grandpa, x[0], R('valid')];
  }
  const f = day6Fixed();
  return [f.tiedan, R('valid'), R(pick(FLAWS[6])), R('hidden'), f.author];
}

// 放学快剪：说学生黑话的拒绝，说大人话的放行
const RUSH_LINES = [
  { line: '开黑吗？我拿手的。', kid: true },
  { line: '麻烦办张卡，充五十。', kid: false },
  { line: '快快快，我妈六点下班！', kid: true },
  { line: '包间还有位置吗？', kid: false },
  { line: '五排差一个，就差我一个！', kid: true },
  { line: '网速怎么这么卡，修修。', kid: false },
];
