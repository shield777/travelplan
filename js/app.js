/* 여행일정 — 여행 일정 앱 (서버 없이 브라우저에 저장) */
(function () {
  'use strict';

  const { AIRPORTS, AIRLINES, ICN_T2, COUNTRY_LIST } = window.TP_DATA;
  const AP = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));
  const STORE_KEY = 'travelplan.v1';
  const UI_KEY = 'travelplan.ui';
  const IN_FRAME = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  // ───────── 아이콘 ─────────
  const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const ICON = {
    plane: svg('<path d="M10.5 21l2.2-7.5H18a2 2 0 0 0 0-4h-5.3L10.5 2H8.6l1.4 7.5H5.6L4 7H2.6l.9 4.5-.9 4.5H4l1.6-2.5H10L8.6 21z" fill="currentColor" stroke="none"/>'),
    move: svg('<rect x="4" y="3.5" width="16" height="13" rx="2"/><path d="M4 10.5h16M8 20l1-3.5M16 20l-1-3.5"/><circle cx="8" cy="13.5" r=".6" fill="currentColor"/><circle cx="16" cy="13.5" r=".6" fill="currentColor"/>'),
    sight: svg('<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.3"/>'),
    food: svg('<path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.3 1.2-3.5 4-3.5 8H17"/>'),
    stay: svg('<path d="M3 19V6M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="10.5" r="1.8"/>'),
    shop: svg('<path d="M5 8h14l-1.2 13H6.2zM9 8V6.5a3 3 0 0 1 6 0V8"/>'),
    etc: svg('<circle cx="12" cy="12" r="3.2"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    back: svg('<path d="M15 5l-7 7 7 7"/>'),
    edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    trash: svg('<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>'),
    doc: svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    save: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    share: svg('<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>')
  };
  const TYPES = [
    { id: 'move', label: '이동' }, { id: 'sight', label: '관광' }, { id: 'food', label: '식사' },
    { id: 'stay', label: '숙소' }, { id: 'shop', label: '쇼핑' }, { id: 'etc', label: '기타' }
  ];
  const TYPE_LABEL = Object.fromEntries(TYPES.map(t => [t.id, t.label]));
  const CATS = ['서류', '예약', '돈', '통신', '짐', '집', '기타'];
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  // 통화: [한글 단위, 소수 자릿수]
  const CUR = {
    KRW: ['원', 0], JPY: ['엔', 0], USD: ['달러', 2], EUR: ['유로', 2], CNY: ['위안', 2], TWD: ['대만달러', 0], HKD: ['홍콩달러', 2], MOP: ['파타카', 2],
    THB: ['바트', 2], VND: ['동', 0], PHP: ['페소', 2], SGD: ['싱가포르달러', 2], MYR: ['링깃', 2], IDR: ['루피아', 0], MNT: ['투그릭', 0],
    CAD: ['캐나다달러', 2], GBP: ['파운드', 2], CHF: ['스위스프랑', 2], CZK: ['코루나', 2], HUF: ['포린트', 0], TRY: ['리라', 2],
    AED: ['디르함', 2], QAR: ['리얄', 2], AUD: ['호주달러', 2], NZD: ['뉴질랜드달러', 2], LAK: ['킵', 0], INR: ['루피', 2], EGP: ['이집트파운드', 2]
  };
  const RATE_UNIT = { JPY: 100, VND: 100, IDR: 100 }; // 은행 고시처럼 100엔·100동 기준으로 보여 줌
  const COUNTRY_CUR = {
    '대한민국': 'KRW', '한국': 'KRW', '일본': 'JPY', '대만': 'TWD', '홍콩': 'HKD', '마카오': 'MOP', '중국': 'CNY', '태국': 'THB', '베트남': 'VND',
    '필리핀': 'PHP', '싱가포르': 'SGD', '말레이시아': 'MYR', '인도네시아': 'IDR', '몽골': 'MNT', '미국': 'USD', '캐나다': 'CAD', '영국': 'GBP',
    '스위스': 'CHF', '체코': 'CZK', '헝가리': 'HUF', '튀르키예': 'TRY', '터키': 'TRY', '아랍에미리트': 'AED', '카타르': 'QAR', '호주': 'AUD',
    '뉴질랜드': 'NZD', '라오스': 'LAK', '캄보디아': 'USD', '인도': 'INR', '이집트': 'EGP',
    '프랑스': 'EUR', '독일': 'EUR', '네덜란드': 'EUR', '이탈리아': 'EUR', '스페인': 'EUR', '오스트리아': 'EUR', '그리스': 'EUR', '포르투갈': 'EUR',
    '크로아티아': 'EUR', '핀란드': 'EUR', '벨기에': 'EUR', '아일랜드': 'EUR'
  };
  const EXP_CATS = [['flight', '항공'], ['stay', '숙소'], ['move', '교통'], ['food', '식사'], ['tour', '관광·투어'], ['shop', '쇼핑'], ['etc', '기타']];
  const EXP_LABEL = Object.fromEntries(EXP_CATS);
  const TYPE_TO_EXP = { move: 'move', sight: 'tour', food: 'food', stay: 'stay', shop: 'shop', etc: 'etc' };
  const PAYS = [['card', '카드'], ['cash', '현금'], ['etc', '기타']];
  const PAY_LABEL = Object.fromEntries(PAYS);
  const DUE_OPTS = [[null, '기한 없음'], [60, 'D-60'], [30, 'D-30'], [14, 'D-14'], [7, 'D-7'], [3, 'D-3'], [1, 'D-1'], [0, '출발일']];

  // ───────── 기본 도구 ─────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = n => String(n).padStart(2, '0');
  const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const toStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => toStr(new Date());
  const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return toStr(d); };
  const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
  const fmtD = s => { if (!s) return ''; const d = parseD(s); return `${d.getMonth() + 1}.${d.getDate()}(${WD[d.getDay()]})`; };
  const fmtDLong = s => { const d = parseD(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
  const isDomestic = trip => /한국|대한민국|korea/i.test(trip.country || '');
  const mapUrl = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const naverUrl = q => `https://map.naver.com/p/search/${encodeURIComponent(q)}`;
  // 일정 장소는 국내 여행이면 네이버지도, 해외 여행이면 구글맵으로 열어요
  // 아이폰 지도 앱을 바로 여는 주소
  const placeMap = (t, q) => {
    const e = encodeURIComponent(q);
    return isDomestic(t)
      ? { app: `nmap://search?query=${e}&appname=${encodeURIComponent(NAV_APPNAME)}`, label: '네이버지도' }
      : { app: `comgooglemaps://?q=${e}`, label: '구글맵' };
  };

  // ── 돈 계산
  const fmtNum = (n, d = 0) => Number(n).toLocaleString('ko-KR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const curUnit = c => (has(CUR, c) ? CUR[c][0] : c);
  const fmtMoney = (n, c) => c === 'KRW' ? `${fmtNum(Math.round(n))}원` : `${fmtNum(n, has(CUR, c) ? CUR[c][1] : 2)}${curUnit(c)}`;
  const parseAmount = v => { const n = Number(String(v || '').replace(/[,\s원]/g, '')); return Number.isFinite(n) ? n : NaN; };
  function tripCurrency(t) {
    if (t.currency && has(CUR, t.currency)) return t.currency;
    const c = String(t.country || '').replace(/\(.*\)/, '').trim();
    if (/미국/.test(c)) return 'USD';
    return has(COUNTRY_CUR, c) ? COUNTRY_CUR[c] : 'USD';
  }
  const rateOf = (t, c) => c === 'KRW' ? 1 : ((t.rates || {})[c] || {}).v || null;
  const rateLabel = (t, c) => { const r = rateOf(t, c), u = RATE_UNIT[c] || 1; return r ? `${fmtNum(u)}${curUnit(c)} = ${fmtNum(r * u, 2)}원` : ''; };
  function krwOf(t, e) {
    if (e.krw != null && e.krw !== '') return Number(e.krw);
    const r = rateOf(t, e.currency);
    return r ? Math.round(Number(e.amount) * r) : null;
  }
  function expTotals(t) {
    const out = { total: 0, count: 0, missing: new Set(), byCur: {}, byCat: {}, byDate: {}, byItem: {} };
    (t.expenses || []).forEach(e => {
      const k = krwOf(t, e);
      out.count++;
      const bc = out.byCur[e.currency] = out.byCur[e.currency] || { amt: 0, krw: 0 };
      bc.amt += Number(e.amount) || 0;
      if (e.itemId) { const bi = out.byItem[e.itemId] = out.byItem[e.itemId] || { krw: 0, cur: {} }; bi.cur[e.currency] = (bi.cur[e.currency] || 0) + (Number(e.amount) || 0); if (k != null) bi.krw += k; }
      if (k == null) { out.missing.add(e.currency); return; }
      out.total += k; bc.krw += k;
      out.byCat[e.cat] = (out.byCat[e.cat] || 0) + k;
      out.byDate[e.date || ''] = (out.byDate[e.date || ''] || 0) + k;
    });
    return out;
  }
  // 무료 환율 서비스 두 곳 중 되는 곳에서 가져와요 (원화 1원당 외화 → 외화 1단위당 원화로 뒤집음)
  async function fetchRates(curs) {
    const want = curs.filter(c => c !== 'KRW');
    if (!want.length) return {};
    const get = async url => {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
      try { const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' }); if (!r.ok) throw new Error('http'); return await r.json(); } finally { clearTimeout(timer); }
    };
    const sources = [
      async () => { const j = await get('https://open.er-api.com/v6/latest/KRW'); if (j.result !== 'success') throw new Error('bad'); return c => j.rates && j.rates[c]; },
      async () => { const j = await get('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/krw.json'); return c => j.krw && j.krw[c.toLowerCase()]; }
    ];
    for (const src of sources) {
      try {
        const pick = await src(); const out = {};
        want.forEach(c => { const v = Number(pick(c)); if (v > 0) out[c] = 1 / v; });
        if (Object.keys(out).length) return out;
      } catch (e) { /* 다음 서비스로 */ }
    }
    throw new Error('rates');
  }
  async function updateRates(t, curs, quiet) {
    try {
      const got = await fetchRates(curs);
      t.rates = t.rates || {};
      Object.entries(got).forEach(([c, v]) => { t.rates[c] = { v, date: todayStr(), src: 'auto' }; });
      save(); render();
      toast(`환율을 불러왔어요 (${Object.keys(got).map(c => curUnit(c)).join('·')})`);
    } catch (e) {
      toast(quiet ? '환율을 자동으로 못 불러왔어요. 경비 탭에서 직접 입력해 주세요.' : '환율을 불러오지 못했어요. 인터넷 연결을 확인하거나 직접 입력해 주세요.');
    }
  }

  function tripDays(trip) {
    if (!trip.startDate || !trip.endDate) return [];
    const n = Math.max(0, diffDays(trip.startDate, trip.endDate));
    return Array.from({ length: Math.min(n, 120) + 1 }, (_, i) => addDays(trip.startDate, i));
  }
  function tripName(t) { return [t.year, t.country, t.city].filter(Boolean).join(' · '); }
  function nightsLabel(t) {
    if (!t.startDate || !t.endDate) return '';
    const n = diffDays(t.startDate, t.endDate);
    return n <= 0 ? '당일' : `${n}박 ${n + 1}일`;
  }
  function dday(t) {
    if (!t.startDate) return { text: '날짜 미정', cls: 'past' };
    const today = todayStr();
    const toStart = diffDays(today, t.startDate);
    if (toStart > 0) return { text: `D-${toStart}`, cls: '' };
    if (toStart === 0) return { text: 'D-DAY', cls: 'now' };
    if (t.endDate && diffDays(today, t.endDate) >= 0) return { text: `여행 ${1 - toStart}일차`, cls: 'now' };
    return { text: '다녀옴', cls: 'past' };
  }

  // ───────── 저장소 ─────────
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.trips)) return s; }
    } catch (e) { /* 저장소를 못 쓰는 환경 */ }
    return { trips: [sampleTrip()], seeded: true };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('이 브라우저에서는 저장이 안 돼요. 백업 파일로 보관하세요.'); }
  }
  function loadUI() {
    try { return JSON.parse(localStorage.getItem(UI_KEY)) || { view: 'home' }; } catch (e) { return { view: 'home' }; }
  }
  function saveUI() { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) { /* 무시 */ } }
  let sharedTrip = null; // 공유 링크로 받아서 아직 저장하지 않은 여행
  let sharedLink = '';
  const ro = () => ui.view === 'shared'; // 보기 전용 화면인지
  const curTrip = () => ro() ? sharedTrip : state.trips.find(t => t.id === ui.tripId);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  // ───────── 기본 체크리스트 ─────────
  const TEMPLATE = [
    ['서류', '여권 유효기간 확인 (입국일 기준 6개월 이상 남았는지)', 60, true],
    ['서류', '비자·전자여행허가 필요 여부 확인 (ESTA·eTA·ETA 등)', 30, true],
    ['서류', '아이 여권·필요 서류 챙기기', 30, true],
    ['예약', '항공권 e-티켓 저장', 30, false],
    ['예약', '숙소 예약 확인 (주소·체크인 시간)', 14, false],
    ['예약', '여행자보험 가입', 7, false],
    ['예약', '공항 주차 예약 또는 공항 가는 교통편 정하기', 7, false],
    ['예약', '온라인 체크인·좌석 지정', 1, false],
    ['돈', '환전 또는 트래블카드 충전', 7, true],
    ['통신', '로밍·eSIM·유심 준비', 3, true],
    ['통신', '입국 신고 사전 등록 (예: 일본 Visit Japan Web)', 3, true],
    ['짐', '충전기·보조배터리 (보조배터리는 기내 반입만 가능)', 1, false],
    ['짐', '여행지 전압·콘센트 어댑터 확인', 3, true],
    ['짐', '상비약 (해열제·소화제·밴드)', 3, false],
    ['짐', '아이 준비물 (간식·놀거리·여벌옷)', 1, false],
    ['집', '가스·전기·창문 점검, 음식물 쓰레기 버리기', 0, false]
  ];
  function templateChecklist(domestic) {
    return TEMPLATE.filter(r => !(domestic && r[3])).map(([cat, text, due]) => ({ id: uid(), cat, text, due, done: false, memo: '' }));
  }

  function sampleTrip() {
    const list = templateChecklist(false);
    list.slice(0, 5).forEach(c => { c.done = true; });
    const d = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'];
    const t = {
      id: uid(), example: true, year: 2026, country: '일본', city: '오사카', subtitle: '가족여행 (예시)', people: 3,
      startDate: d[0], endDate: d[3], memo: '앱 사용법을 보여 주는 예시 여행이에요. 확인 후 지워도 돼요.',
      dayTitles: { [d[0]]: '도착 · 난바', [d[1]]: '유니버설 스튜디오', [d[2]]: '교토 당일치기', [d[3]]: '쇼핑 · 귀국' },
      flights: [
        { id: uid(), flightNo: 'KE723', dep: 'ICN', arr: 'KIX', depDate: d[0], depTime: '08:30', arrDate: d[0], arrTime: '10:20', depTerminal: '', arrTerminal: '', counter: '', gate: '', seat: '32A·B·C', pnr: '', memo: '예시 항공편이에요. 실제 시간과 다를 수 있어요.' },
        { id: uid(), flightNo: 'KE724', dep: 'KIX', arr: 'ICN', depDate: d[3], depTime: '15:30', arrDate: d[3], arrTime: '17:20', depTerminal: '', arrTerminal: '', gate: '', seat: '', pnr: '', memo: '' }
      ],
      items: [
        { id: uid(), date: d[0], time: '11:10', type: 'move', title: '난카이 라피트로 난바 이동', place: '간사이공항역', memo: '약 40분, 지정석' },
        { id: uid(), date: d[0], time: '12:30', type: 'stay', title: '호텔 짐 맡기기', place: '난바역 근처 호텔', memo: '체크인 15:00' },
        { id: uid(), date: d[0], time: '13:00', type: 'food', title: '점심 · 오코노미야키', place: '도톤보리', memo: '' },
        { id: uid(), date: d[0], time: '18:00', type: 'sight', title: '도톤보리 야경 산책', place: '도톤보리 글리코 사인', memo: '' },
        { id: uid(), date: d[1], time: '08:00', type: 'move', title: 'JR로 유니버설시티역 이동', place: '', memo: '' },
        { id: uid(), date: d[1], time: '08:45', type: 'sight', title: '유니버설 스튜디오 재팬', place: 'Universal Studios Japan', memo: '익스프레스 패스 앱에 저장해 둠' },
        { id: uid(), date: d[2], time: '09:00', type: 'move', title: '한큐선으로 교토 이동', place: '오사카 우메다역', memo: '' },
        { id: uid(), date: d[2], time: '10:00', type: 'sight', title: '후시미 이나리 신사', place: 'Fushimi Inari Taisha', memo: '아이와 함께면 중간 지점까지만' },
        { id: uid(), date: d[2], time: '14:00', type: 'sight', title: '기요미즈데라', place: 'Kiyomizu-dera', memo: '' },
        { id: uid(), date: d[3], time: '09:30', type: 'shop', title: '체크아웃 후 신사이바시 쇼핑', place: '신사이바시스지', memo: '' },
        { id: uid(), date: d[3], time: '12:30', type: 'move', title: '공항으로 출발', place: '난바역', memo: '출발 3시간 전 도착 목표' }
      ],
      checklist: list,
      rates: { JPY: { v: 9.05, date: '2026-10-23', src: 'manual' } },
      expenses: []
    };
    const it = title => (t.items.find(i => i.title.startsWith(title)) || {}).id || '';
    const ex = (date, title, cat, amount, currency, pay, itemId, krw) => ({ id: uid(), date, title, cat, amount, currency, pay, itemId: itemId || '', krw: krw == null ? null : krw, memo: '' });
    t.expenses = [
      ex('', '항공권 왕복 3명 (예시)', 'flight', 1350000, 'KRW', 'card'),
      ex('', '난바 호텔 3박 (예시)', 'stay', 96000, 'JPY', 'card', '', 873400),
      ex(d[0], '라피트 3명', 'move', 4040, 'JPY', 'card', it('난카이')),
      ex(d[0], '오코노미야키 점심', 'food', 4800, 'JPY', 'cash', it('점심')),
      ex(d[1], '입장권 어른 2·아이 1', 'tour', 25800, 'JPY', 'card', it('유니버설 스튜디오')),
      ex(d[1], '기념품', 'shop', 6500, 'JPY', 'card'),
      ex(d[2], '기요미즈데라 입장료', 'tour', 1000, 'JPY', 'cash', it('기요미즈데라'))
    ];
    return t;
  }

  // ───────── 공항·항공 도우미 ─────────
  const airlineCode = no => { const m = String(no || '').toUpperCase().replace(/\s/g, '').match(/^([A-Z0-9]{2})(\d{1,4})/); return m ? m[1] : ''; };
  const airlineName = no => AIRLINES[airlineCode(no)] || '';
  const findAp = code => AP[String(code || '').toUpperCase()] || null;

  function suggestTerminal(f, side) {
    const code = side === 'dep' ? f.dep : f.arr;
    const ap = findAp(code);
    if (!ap || !ap.terminals || !ap.terminals.length) return '';
    const al = airlineCode(f.flightNo);
    if (ap.code === 'ICN' && al) return ICN_T2.has(al) ? 'T2' : 'T1';
    if (ap.terminals.includes('국내선') && ap.terminals.includes('국제선')) {
      const other = findAp(side === 'dep' ? f.arr : f.dep);
      if (other) return other.country === ap.country ? '국내선' : '국제선';
    }
    if (ap.code === 'KIX' && al) return al === 'MM' ? 'T2' : 'T1';
    return '';
  }
  function terminalOf(f, side) {
    const v = side === 'dep' ? f.depTerminal : f.arrTerminal;
    if (v) return { v, est: false };
    const s = suggestTerminal(f, side);
    return { v: s, est: !!s };
  }
  function counterHint(f) {
    if (f.counter) return '발권(체크인) 카운터예요. 국제선 카운터는 보통 출발 1시간 전에 마감되니 늦지 않게 가세요.';
    return '출발 당일 공항 전광판이나 항공사 앱에서 확인하세요. 온라인 체크인을 했고 부칠 짐이 없으면 카운터를 거치지 않아도 되는 경우가 많아요.';
  }
  function gateHint(f) {
    const ap = findAp(f.dep);
    const g = String(f.gate || '').trim();
    if (!g) return { text: '게이트는 보통 출발 1~2시간 전에 정해지고 바뀔 수 있어요. 공항 전광판·항공사 앱으로 꼭 다시 확인하세요.', warn: false };
    const n = parseInt(g.replace(/\D/g, ''), 10);
    const term = terminalOf(f, 'dep').v;
    if (ap && ap.code === 'ICN' && n) {
      if (n >= 1 && n <= 50) return { text: '제1터미널 본관 게이트예요. 출국심사 후 바로 걸어갈 수 있어요.', warn: term === 'T2' };
      if (n >= 101 && n <= 132) return { text: '제1터미널 탑승동 게이트예요. 출국심사 후 셔틀트레인을 타고 이동해야 하니 면세점 쇼핑 전에 위치부터 확인하세요.', warn: term === 'T2' };
      if (n >= 200 && n <= 299) return { text: '제2터미널 게이트예요.', warn: term === 'T1' };
    }
    return { text: '탑승 시작 시간보다 20~30분 일찍 게이트 근처에 가 있으면 안전해요.', warn: false };
  }

  function tzOffset(tz, date) {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(date).map(x => [x.type, x.value]));
      return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(date.getTime() / 60000) * 60000) / 60000);
    } catch (e) { return null; }
  }
  function localToUTC(tz, dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number); const [h, mi] = timeStr.split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, h, mi);
    const o1 = tzOffset(tz, new Date(guess)); if (o1 == null) return null;
    let utc = guess - o1 * 60000;
    const o2 = tzOffset(tz, new Date(utc)); if (o2 !== o1) utc = guess - o2 * 60000;
    return utc;
  }
  function flightDuration(f) {
    const a = findAp(f.dep), b = findAp(f.arr);
    if (!a || !b) return '';
    const s = localToUTC(a.tz, f.depDate, f.depTime), e = localToUTC(b.tz, f.arrDate || f.depDate, f.arrTime);
    if (s == null || e == null) return '';
    const min = Math.round((e - s) / 60000);
    if (min <= 0 || min > 30 * 60) return '';
    return `${Math.floor(min / 60)}시간 ${pad(min % 60)}분`;
  }
  function tzLabel(ap, dateStr) {
    const at = new Date((dateStr ? parseD(dateStr) : new Date()).getTime() + 12 * 3600000);
    const o = tzOffset(ap.tz, at), k = tzOffset('Asia/Seoul', at);
    if (o == null || k == null) return '';
    const dm = o - k;
    const utc = `UTC${o >= 0 ? '+' : '−'}${Math.floor(Math.abs(o) / 60)}${Math.abs(o) % 60 ? ':' + pad(Math.abs(o) % 60) : ''}`;
    if (dm === 0) return `${utc} · 한국과 같은 시간`;
    const h = Math.abs(dm) / 60; const hs = Number.isInteger(h) ? `${h}시간` : `${Math.floor(h)}시간 ${Math.abs(dm) % 60}분`;
    return `${utc} · 한국보다 ${hs} ${dm < 0 ? '느림' : '빠름'}`;
  }
  function apName(code, custom) { const a = findAp(code); return a ? a.ko : (custom || ''); }
  function sortFlights(fs) { return [...fs].sort((a, b) => ((a.depDate || '') + (a.depTime || '')).localeCompare((b.depDate || '') + (b.depTime || ''))); }

  let state = load();
  let ui = loadUI();

  // ───────── 렌더링 ─────────
  const app = $('#app');

  function render() {
    const trip = curTrip();
    if (ro() && trip) { renderTrip(trip); return; }
    if (ui.view === 'trip' && trip) renderTrip(trip); else { ui.view = 'home'; renderHome(); }
    saveUI();
  }

  function renderHome() {
    const trips = [...state.trips].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    const byYear = {};
    trips.forEach(t => { const y = t.year || (t.startDate || '').slice(0, 4) || '연도 미정'; (byYear[y] = byYear[y] || []).push(t); });
    const years = Object.keys(byYear).sort((a, b) => String(b).localeCompare(String(a)));

    app.innerHTML = `
      <div class="wrap">
        <header class="topbar">
          <div class="grow brand">여행일정</div>
          <button class="btn sm" data-act="backup">불러오기</button>
          <button class="btn primary sm" data-act="new-trip">${ICON.plus}새 여행</button>
        </header>
        ${trips.length === 0 ? `<div class="empty">아직 여행이 없어요.<br>오른쪽 위 <b>새 여행</b>으로 연도·나라·여행지를 입력해 시작하세요.</div>` : ''}
        ${years.map(y => `
          <section class="year-group">
            <div class="year-head">${esc(y)}<span>${byYear[y].length}개 여행</span></div>
            ${byYear[y].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')).map(tripCard).join('')}
          </section>`).join('')}
      </div>`;
  }

  function tripCard(t) {
    const dd = dday(t);
    const total = (t.checklist || []).length, done = (t.checklist || []).filter(c => c.done).length;
    const routes = sortFlights(t.flights || []).map(f => `<span class="route-chip">${esc(f.dep || '?')}→${esc(f.arr || '?')}</span>`).join('');
    return `
      <button class="trip-card" data-act="open-trip" data-id="${t.id}">
        <div>
          <div class="crumb">${esc(t.year || '')} · <b>${esc(t.country || '나라 미정')}</b>${t.example ? '<span class="example-badge">예시</span>' : ''}${t.receivedAt ? '<span class="recv-badge">공유받음</span>' : ''}</div>
          <h3>${esc(t.city || '여행지 미정')}</h3>
          ${t.subtitle ? `<div class="sub">${esc(t.subtitle)}</div>` : ''}
        </div>
        <span class="dchip ${dd.cls}">${dd.text}</span>
        <div class="meta">
          <span class="num">${fmtD(t.startDate)} – ${fmtD(t.endDate)}</span><span>${nightsLabel(t)}</span>
          ${routes}
          ${total ? `<span>준비 <span class="num">${done}/${total}</span> <span class="mini-bar"><i style="width:${Math.round(done / total * 100)}%"></i></span></span>` : ''}
          ${(t.expenses || []).length ? `<span>경비 <span class="num">${fmtNum(expTotals(t).total)}원</span></span>` : ''}
        </div>
      </button>`;
  }

  function renderTrip(t) {
    const dd = dday(t);
    const tab = ui.tab || 'plan';
    const total = (t.checklist || []).length, done = (t.checklist || []).filter(c => c.done).length;
    app.innerHTML = `
      <div class="wrap">
        <header class="topbar">
          <button class="btn icon ghost" data-act="${ro() ? 'close-shared' : 'home'}" aria-label="${ro() ? '닫기' : '여행 목록'}">${ICON.back}</button>
          <div class="grow"></div>
          <button class="btn sm" data-act="pdf">${ICON.doc}PDF</button>
          ${ro()
            ? `<button class="btn primary sm" data-act="save-shared">${ICON.save}내 앱에 저장</button>`
            : `<button class="btn sm" data-act="share">${ICON.share}공유</button><button class="btn sm" data-act="edit-trip">${ICON.edit}여행 정보</button>`}
        </header>
        <section class="trip-head">
          <div>
            <div class="crumb">${esc(t.year || '')} · ${esc(t.country || '나라 미정')}${t.example ? '<span class="example-badge">예시</span>' : ''}</div>
            <h1>${esc(t.city || '여행지 미정')}</h1>
            <div class="dates"><span class="num">${fmtD(t.startDate)} – ${fmtD(t.endDate)}</span> · ${nightsLabel(t)}${t.subtitle ? ' · ' + esc(t.subtitle) : ''}</div>
          </div>
          <span class="dchip ${dd.cls}">${dd.text}</span>
        </section>
        ${ro() ? `<div class="shared-banner">
          <b>공유받은 일정 · 보기 전용${t.shareMeta && t.shareMeta.at ? ` · ${fmtD(t.shareMeta.at)}에 보냄` : ''}</b>
          <span>보낸 사람이 일정을 바꾸면 새 링크를 다시 받아야 해요.${standalone() ? '' : ' 홈 화면의 여행일정 앱에 넣으려면 링크를 복사한 뒤, 앱의 <b>불러오기</b>에 붙여넣으세요.'}</span>
          ${standalone() || !sharedLink ? '' : `<button class="btn sm" data-act="copy-shared">링크 복사</button>`}
        </div>` : ''}
        <nav class="tabs" role="tablist">
          <button role="tab" aria-selected="${tab === 'plan'}" data-act="tab" data-tab="plan">일정</button>
          <button role="tab" aria-selected="${tab === 'flights'}" data-act="tab" data-tab="flights">항공<span class="count">${(t.flights || []).length || ''}</span></button>
          <button role="tab" aria-selected="${tab === 'check'}" data-act="tab" data-tab="check">준비<span class="count">${done}/${total}</span></button>
          <button role="tab" aria-selected="${tab === 'money'}" data-act="tab" data-tab="money">경비</button>
        </nav>
        <div id="tab-body">${tab === 'flights' ? flightsTab(t) : tab === 'check' ? checkTab(t) : tab === 'money' ? moneyTab(t) : planTab(t)}</div>
      </div>`;
  }

  // ── 일정 탭
  function dayEntries(t, date) {
    const items = (t.items || []).filter(i => i.date === date).map(i => ({ kind: 'item', sort: i.time || '99:99', i }));
    const fl = (t.flights || []).filter(f => f.depDate === date).map(f => ({ kind: 'flight', sort: f.depTime || '99:99', f }));
    const arr = (t.flights || []).filter(f => f.arrDate && f.arrDate !== f.depDate && f.arrDate === date).map(f => ({ kind: 'arrive', sort: f.arrTime || '00:00', f }));
    return [...items, ...fl, ...arr].sort((a, b) => a.sort.localeCompare(b.sort));
  }

  function planTab(t) {
    const days = tripDays(t);
    const money = expTotals(t);
    if (!days.length) return ro() ? `<div class="empty">여행 날짜가 없는 일정이에요.</div>` : `<div class="empty">여행 날짜를 먼저 입력해 주세요.<br><button class="btn primary sm" data-act="edit-trip" style="margin-top:10px">여행 정보 입력</button></div>`;
    const today = todayStr();
    const outside = (t.items || []).filter(i => !days.includes(i.date));
    return `
      ${days.map((d, i) => daySection(t, d, i, today, money)).join('')}
      ${outside.length ? `<section class="day"><div class="day-head"><div class="info"><div class="title">여행 기간 밖 일정</div><div class="date">날짜를 바꾸면 해당 일차로 옮겨져요</div></div></div>
        <ul class="timeline">${outside.map(i => itemRow(i, true, money, t)).join('')}</ul></section>` : ''}`;
  }

  function daySection(t, d, i, today, money) {
    const entries = dayEntries(t, d);
    const title = (t.dayTitles || {})[d];
    return `
      <section class="day" id="day-${d}">
        <div class="day-head">
          <div class="no">${i + 1}<small>일차</small></div>
          <div class="info">
            <div class="date">${fmtDLong(d)}${d === today ? '<span class="today-tag">오늘</span>' : ''}</div>
            ${ro() ? (title ? `<div class="title">${esc(title)}</div>` : '')
              : `<div class="title ${title ? '' : 'placeholder'}" data-act="day-title" data-date="${d}" role="button" tabindex="0">${title ? esc(title) : '이 날의 제목 (예: 교토 당일치기)'}</div>`}
          </div>
          ${money.byDate[d] ? `<div class="day-spent"><span>이날 경비</span><b class="num">${fmtNum(money.byDate[d])}원</b></div>` : ''}
        </div>
        ${entries.length ? `<ul class="timeline">${entries.map(e => e.kind === 'item' ? itemRow(e.i, false, money, t) : flightRow(e.f, e.kind === 'arrive')).join('')}</ul>` : ''}
        ${ro() ? (entries.length ? '' : '<div class="note-small" style="padding-top:8px">일정 없음</div>') : `<div class="add-row" ${entries.length ? '' : 'style="padding-left:0"'}>
          <button class="btn sm" data-act="add-item" data-date="${d}">${ICON.plus}일정 추가</button>
        </div>`}
      </section>`;
  }

  function itemRow(i, showDate, money, t) {
    const map = i.place ? placeMap(t, i.place) : null;
    const sp = money && money.byItem[i.id];
    const foreign = sp ? Object.entries(sp.cur).filter(([c]) => c !== 'KRW').map(([c, a]) => fmtMoney(a, c)).join(' + ') : '';
    return `
      <li class="tl-item">
        <div class="tl-time">${esc(i.time || '—')}${i.endTime ? `<small>~${esc(i.endTime)}</small>` : ''}${showDate ? `<small>${fmtD(i.date)}</small>` : ''}</div>
        <div class="tl-rail"><span class="tl-dot"></span></div>
        <div class="tl-card" ${ro() ? '' : `data-act="edit-item" data-id="${i.id}" role="button" tabindex="0"`}>
          <div class="tl-type">${ICON[i.type] || ICON.etc}${TYPE_LABEL[i.type] || '기타'}</div>
          <div class="tl-title">${esc(i.title)}</div>
          ${map ? `<div class="tl-place"><a href="${esc(map.app)}" data-stop="1">${esc(i.place)} ↗</a><span class="map-tag">${map.label} 앱</span></div>` : ''}
          ${i.memo ? `<div class="tl-memo">${esc(i.memo)}</div>` : ''}
          ${i.cost ? `<div class="tl-cost">${esc(i.cost)}</div>` : ''}
          ${sp ? `<div class="tl-spent num">${fmtNum(sp.krw)}원${foreign ? ` <small>(${esc(foreign)})</small>` : ''}</div>` : ''}
          ${ro() ? '' : `<button class="btn sm ghost add-exp" data-act="add-exp-item" data-id="${i.id}" aria-label="${esc(i.title)} 경비 추가">${ICON.plus}경비</button>`}
        </div>
      </li>`;
  }

  function flightRow(f, arriveOnly) {
    const dt = terminalOf(f, 'dep');
    const sub = arriveOnly
      ? `${esc(f.flightNo)} 도착 · ${esc(apName(f.arr, f.arrName))}`
      : [airlineName(f.flightNo), dt.v ? `${dt.v}${dt.est ? '(추정)' : ''}` : '', f.counter ? `카운터 ${f.counter}` : '', f.gate ? `게이트 ${f.gate}` : '', f.seat ? `좌석 ${f.seat}` : ''].filter(Boolean).map(esc).join(' · ');
    return `
      <li class="tl-item flight">
        <div class="tl-time">${esc(arriveOnly ? f.arrTime : f.depTime || '—')}</div>
        <div class="tl-rail"><span class="tl-dot"></span></div>
        <div class="tl-card flight" data-act="goto-flight" data-id="${f.id}" role="button" tabindex="0">
          <div class="tl-type">${ICON.plane}항공 ${esc(f.flightNo || '')}</div>
          <div class="fl-route">${esc(f.dep || '?')} <span class="t">${esc(f.depTime || '')}</span><span class="arr">→</span>${esc(f.arr || '?')} <span class="t">${esc(f.arrTime || '')}${f.arrDate && f.arrDate !== f.depDate ? ' +' + diffDays(f.depDate, f.arrDate) : ''}</span></div>
          <div class="fl-sub">${sub}</div>
        </div>
      </li>`;
  }

  // ── 항공·공항 탭
  function flightsTab(t) {
    const fs = sortFlights(t.flights || []);
    const seen = new Set();
    return `
      <div class="section-title"><h2>항공편</h2>${ro() ? '' : `<button class="btn primary sm" data-act="add-flight">${ICON.plus}항공편 추가</button>`}</div>
      <div class="info-note">편명과 출발·도착 공항 코드를 넣으면 공항 이름, 터미널(추정), 시차, 비행시간, 주차장, 지도 링크가 자동으로 나와요. 발권 카운터와 게이트는 출발 당일 정해지므로 카드의 <b>실시간 확인</b> 버튼으로 찾아 넣으세요.</div>
      ${fs.length ? fs.map(f => flightCard(t, f, seen)).join('') : `<div class="empty">등록된 항공편이 없어요.</div>`}`;
  }

  function flightCard(t, f, seen) {
    const da = findAp(f.dep), aa = findAp(f.arr);
    const dt = terminalOf(f, 'dep'), at = terminalOf(f, 'arr');
    const dur = flightDuration(f);
    const al = airlineName(f.flightNo);
    const fno = String(f.flightNo || '').replace(/\s/g, '');
    return `
      <article class="flight-card" id="fl-${f.id}">
        <div class="pass">
          <div class="pass-top"><b>${esc(fno || '편명 없음')}</b><span>${esc(al)}</span><span class="grow"></span><span class="num">${fmtD(f.depDate)}</span></div>
          <div class="pass-route">
            <div class="end"><div class="code">${esc(f.dep || '???')}</div><div class="tm">${esc(f.depTime || '--:--')}</div><div class="nm">${esc(apName(f.dep, f.depName))}</div></div>
            <div class="mid">${ICON.plane}${dur ? esc(dur) : ''}</div>
            <div class="end right"><div class="code">${esc(f.arr || '???')}</div><div class="tm">${esc(f.arrTime || '--:--')}${f.arrDate && f.arrDate !== f.depDate ? ' +' + diffDays(f.depDate, f.arrDate) : ''}</div><div class="nm">${esc(apName(f.arr, f.arrName))}</div></div>
          </div>
        </div>
        <dl class="pass-fields">
          <div><dt>출발 터미널</dt><dd>${esc(dt.v || '-')}${dt.est ? '<span class="est">추정</span>' : ''}</dd></div>
          <div><dt>발권 카운터</dt><dd>${esc(f.counter || '-')}</dd></div>
          <div><dt>탑승 게이트</dt><dd>${esc(f.gate || '-')}</dd></div>
          <div><dt>좌석</dt><dd>${esc(f.seat || '-')}</dd></div>
          <div><dt>예약번호</dt><dd>${esc(f.pnr || '-')}</dd></div>
        </dl>
        ${liveLinks(f, fno, da)}
        <div class="airport-pair">
          ${airportPanel(f, da, 'dep', dt, seen)}
          ${airportPanel(f, aa, 'arr', at, seen)}
        </div>
        ${f.memo ? `<div class="ap" style="border-top:1px solid var(--line)"><div class="note-small">${esc(f.memo)}</div></div>` : ''}
        ${ro() ? '' : `<div class="flight-actions"><button class="btn sm" data-act="edit-flight" data-id="${f.id}">${ICON.edit}수정</button></div>`}
      </article>`;
  }

  // 주차장: 국내 공항은 카카오맵·티맵·네이버 앱으로 바로 열기, 해외는 지도 링크
  const NAV_APPNAME = location.hostname || 'travelplan';
  function navButtons(q) {
    const e = encodeURIComponent(q);
    return `<div class="nav-btns">
      <a class="btn sm" href="kakaomap://search?q=${e}">카카오맵</a>
      <a class="btn sm" href="tmap://search?name=${e}" data-copy="${esc(q)}">티맵</a>
      <a class="btn sm" href="nmap://search?query=${e}&amp;appname=${encodeURIComponent(NAV_APPNAME)}">네이버</a>
    </div>`;
  }
  function parkingBlock(f, ap, side, term, isKr) {
    const t = term.v;
    const mine = ap.parking.filter(p => !p.term || !t || p.term === t);
    const others = ap.parking.filter(p => p.term && t && p.term !== t);
    const row = p => `
      <div class="park-item"><span class="p">P</span><div><b>${esc(p.name)}</b>${p.res ? '<span class="ptag">예약 전용</span>' : ''}<div>${esc(p.desc)}</div>
        ${isKr ? navButtons(p.q) : `<div class="lk"><a href="${mapUrl(p.q)}" target="_blank" rel="noopener">지도 ↗</a></div>`}</div></div>`;
    // 제1터미널 카운터 위치로 가까운 장기주차장 안내 (공식 안내가 아닌 이용자 정리 기준)
    let near = '';
    const m = String(f.counter || '').trim().match(/^([A-Z])/i);
    if (ap.code === 'ICN' && t === 'T1' && side === 'dep' && m) {
      const c = m[1].toUpperCase();
      if (c >= 'A' && c <= 'G') near = `${c}열은 동편 카운터라 P1·P3에서 가깝다고 알려져 있어요.`;
      else if (c >= 'H' && c <= 'N') near = `${c}열은 서편 카운터라 P2·P4에서 가깝다고 알려져 있어요.`;
    }
    return `<div><h4>주차장${t && others.length ? ` · ${esc(t)}` : ''}</h4>
      ${near ? `<div class="near-tip">${esc(near)} <span>(이용자 정리 기준, 공식 안내 아님)</span></div>` : ''}
      <div class="park">${mine.map(row).join('')}</div>
      ${others.length ? `<details class="park-other"><summary>다른 터미널 주차장 (${others.length})</summary><div class="park">${others.map(row).join('')}</div></details>` : ''}
      ${ap.parkingRes ? `<div class="res-box"><b>예약주차장</b> ${esc(ap.parkingRes)}</div>` : ''}
      ${ap.parkingLinks ? `<div class="links" style="margin-top:6px">${ap.parkingLinks.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</div>` : ''}
      ${isKr ? '<div class="note-small" style="margin-top:6px">카카오맵·티맵·네이버는 아이폰에 앱이 있어야 열려요. 티맵은 주차장 이름을 복사해 두니, 바로 검색되지 않으면 검색창에 붙여넣으세요. 카카오내비는 카카오맵에서 길찾기 → 내비로 넘어가면 돼요.</div>' : ''}
      ${ap.parkingNote ? `<div class="note-small" style="margin-top:6px">${esc(ap.parkingNote)}</div>` : ''}
    </div>`;
  }

  // 터미널·발권 카운터·게이트·지연을 바로 확인하는 링크 (편명으로 검색)
  function liveLinks(f, fno, ap) {
    if (!fno) return '';
    const q = encodeURIComponent;
    const links = [
      ['구글', `https://www.google.com/search?q=${q(fno + ' flight status')}`],
      ['네이버', `https://search.naver.com/search.naver?query=${q(fno + ' 항공편')}`]
    ];
    if (ap) links.push([`${ap.ko.replace(/국제공항$/, '공항')} 운항정보`, ap.site || `https://www.google.com/search?q=${q(ap.en + ' departures ' + fno)}`]);
    links.push(['Flightradar24', `https://www.flightradar24.com/data/flights/${q(fno.toLowerCase())}`]);
    return `
      <div class="live">
        <div class="live-head"><b>실시간 확인</b><span>터미널 · 발권 카운터 · 게이트 · 지연</span></div>
        <div class="live-links">${links.map(([l, u]) => `<a class="btn sm" href="${u}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</div>
        <div class="note-small">구글·네이버는 편명 ${esc(fno)}으로 바로 검색돼요. ${ap && ap.site ? '공항 사이트는 첫 화면의 운항정보에서 편명을 검색하세요. 발권 카운터는 구글보다 공항 사이트에 나오는 경우가 많아요.' : '공항 링크는 검색 결과로 열려요.'}</div>
      </div>`;
  }

  function airportPanel(f, ap, side, term, seen) {
    const label = side === 'dep' ? '출발 공항' : '도착 공항';
    const date = side === 'dep' ? f.depDate : (f.arrDate || f.depDate);
    if (!ap) {
      const code = side === 'dep' ? f.dep : f.arr;
      const nm = side === 'dep' ? f.depName : f.arrName;
      const q = nm || (code ? code + ' airport' : '');
      return `<div class="ap"><div class="ap-sign"><span class="lbl">${label}</span><span class="nm">${esc(nm || code || '공항 미입력')}</span><span class="en">앱 공항 목록에 없는 공항이에요</span></div>
        ${q ? `<div class="links"><a href="${mapUrl(q)}" target="_blank" rel="noopener">지도 ↗</a><a href="${mapUrl(q + ' parking')}" target="_blank" rel="noopener">근처 주차장 ↗</a></div>` : ''}</div>`;
    }
    const hint = side === 'dep' ? gateHint(f) : null;
    const isKr = ap.country === '대한민국';
    const first = !seen.has(ap.code); seen.add(ap.code);
    const showPark = ap.parking && ap.parking.length && (side === 'dep' || isKr);
    const hasMore = (ap.notes && ap.notes.length) || showPark;
    return `
      <div class="ap">
        <div class="ap-sign">
          <span class="lbl">${label} · ${esc(ap.code)}</span>
          <span class="nm">${esc(ap.ko)}${term.v ? ` · ${esc(term.v)}` : ''}${term.est ? ' <span class="est" style="color:var(--sign-fg)">추정</span>' : ''}</span>
          <span class="en">${esc(ap.en)} · ${esc(ap.city)}, ${esc(ap.country)}</span>
          <span class="tzl">${esc(tzLabel(ap, date))}</span>
        </div>
        ${side === 'dep' ? `<div class="gate-box"><span class="gl">발권 카운터</span>${f.counter ? `<span class="g">${esc(f.counter)}</span>` : '<b>미정</b> · '}${esc(counterHint(f))}</div>` : ''}
        ${hint ? `<div class="gate-box ${hint.warn ? 'warn' : ''}"><span class="gl">탑승 게이트</span>${f.gate ? `<span class="g">${esc(f.gate)}</span>` : '<b>게이트 미정</b> · '}${esc(hint.text)}${hint.warn ? ' <b>입력한 터미널과 게이트가 맞지 않아요. 다시 확인하세요.</b>' : ''}</div>` : ''}
        ${term.est ? `<div class="note-small">터미널은 항공사 기준 추정값이에요. 항공권·항공사 안내로 확인하세요.</div>` : ''}
        ${hasMore ? `<details class="ap-more" ${first ? 'open' : ''}><summary>${first ? '공항 안내' : '공항 안내 (위와 같음)'}${showPark ? ' · 주차장' : ''}</summary><div class="ap-more-body">` : ''}
        ${ap.notes && ap.notes.length ? `<div><h4>알아두면 좋은 점</h4><ul>${ap.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
        ${showPark ? parkingBlock(f, ap, side, term, isKr) : ''}
        ${hasMore ? '</div></details>' : ''}
        <div class="links">
          <a href="${mapUrl(ap.en)}" target="_blank" rel="noopener">공항 지도 ↗</a>
          ${!ap.parking ? `<a href="${mapUrl('parking near ' + ap.en)}" target="_blank" rel="noopener">근처 주차장 ↗</a>` : ''}
          <a href="${ap.site || 'https://www.google.com/search?q=' + encodeURIComponent(ap.en + ' official site')}" target="_blank" rel="noopener">${ap.site ? '공식 사이트' : '공식 사이트 검색'} ↗</a>
        </div>
      </div>`;
  }

  // ── 경비 탭
  function moneyTab(t) {
    const m = expTotals(t);
    const days = tripDays(t);
    const tc = tripCurrency(t);
    const used = Array.from(new Set([tc, ...(t.expenses || []).map(e => e.currency)])).filter(c => c !== 'KRW');
    const people = Number(t.people) || 0;
    const cats = EXP_CATS.map(([id, label]) => [id, label, m.byCat[id] || 0]).filter(c => c[2] > 0).sort((a, b) => b[2] - a[2]);
    const max = cats.length ? cats[0][2] : 1;
    const groups = [['', '여행 전 · 날짜 없음'], ...days.map((d, i) => [d, `${i + 1}일차 · ${fmtD(d)}`])];
    const strays = (t.expenses || []).filter(e => e.date && !days.includes(e.date));
    const rows = list => list.map(e => {
      const k = krwOf(t, e);
      const item = e.itemId ? (t.items || []).find(i => i.id === e.itemId) : null;
      return `<li class="exp-row" ${ro() ? '' : `data-act="edit-exp" data-id="${e.id}" role="button" tabindex="0"`}>
        <div class="ex-main"><div class="ex-title">${esc(e.title || EXP_LABEL[e.cat] || '경비')}</div>
          <div class="ex-sub">${esc(EXP_LABEL[e.cat] || '기타')} · ${esc(PAY_LABEL[e.pay] || '')}${item ? ` · ${esc(item.title)}` : ''}${e.memo ? ` · ${esc(e.memo)}` : ''}</div></div>
        <div class="ex-amt"><div class="num">${esc(fmtMoney(e.amount, e.currency))}</div>
          ${e.currency !== 'KRW' ? `<div class="ex-krw num ${k == null ? 'miss' : ''}">${k == null ? '환율 없음' : `${fmtNum(k)}원${e.krw != null ? ' · 실결제' : ''}`}</div>` : ''}</div>
      </li>`;
    }).join('');
    return `
      <section class="money-hero">
        <div class="lbl">총 경비 · 원화 환산</div>
        <div class="big num">${fmtNum(m.total)}<small>원</small></div>
        <div class="sub">${m.count}건${days.length && m.total ? ` · 하루 평균 ${fmtNum(Math.round(m.total / days.length))}원` : ''}${people > 1 && m.total ? ` · ${people}명 기준 1인당 ${fmtNum(Math.round(m.total / people))}원` : ''}</div>
        ${m.missing.size ? `<div class="warn-line">${[...m.missing].map(curUnit).join('·')} 환율이 없어서 합계에서 빠진 금액이 있어요. 아래에서 환율을 넣어 주세요.</div>` : ''}
        ${Object.keys(m.byCur).length > 1 ? `<div class="cur-split">${Object.entries(m.byCur).map(([c, v]) => `<span><b class="num">${esc(fmtMoney(v.amt, c))}</b>${c !== 'KRW' ? ` → ${fmtNum(v.krw)}원` : ''}</span>`).join('')}</div>` : ''}
      </section>

      ${used.length ? `<section class="rates">
        <div class="section-title"><h2>환율</h2>${ro() ? '' : `<button class="btn sm" data-act="fetch-rates">최신 환율 불러오기</button>`}</div>
        <ul class="rate-list">${used.map(c => `<li>
          <span class="rc">${esc(c)}</span>
          <span class="rv num">${rateOf(t, c) ? esc(rateLabel(t, c)) : '<span class="miss">환율 없음</span>'}</span>
          <span class="rd">${rateOf(t, c) ? `${fmtD(t.rates[c].date)} ${t.rates[c].src === 'manual' ? '직접 입력' : '자동'}` : ''}</span>
          ${ro() ? '' : `<button class="btn sm ghost" data-act="edit-rate" data-cur="${esc(c)}">${ICON.edit}</button>`}
        </li>`).join('')}</ul>
        <div class="note-small">자동 환율은 시장 환율이에요. 카드 청구액은 수수료 때문에 1~2% 다를 수 있어요. 명세서 금액을 알면 경비에 <b>실제 원화 결제액</b>을 넣으세요. 그 금액이 우선 적용돼요.</div>
      </section>` : ''}

      ${cats.length ? `<section class="cat-bars"><h2 class="h2s">항목별</h2>
        ${cats.map(([id, label, k]) => `<div class="cb-row"><span class="cb-l">${esc(label)}</span><span class="cb-track"><i style="width:${Math.max(2, Math.round(k / max * 100))}%"></i></span><span class="cb-v num">${fmtNum(k)}원 <small>${Math.round(k / m.total * 100)}%</small></span></div>`).join('')}
      </section>` : ''}

      <div class="section-title"><h2>날짜별 내역</h2>${ro() ? '' : `<button class="btn primary sm" data-act="add-exp">${ICON.plus}경비 추가</button>`}</div>
      ${m.count === 0 ? `<div class="empty">아직 경비가 없어요.<br>${ro() ? '' : '쓴 돈을 현지 통화로 넣으면 원화 합계가 자동으로 계산돼요.'}</div>` : ''}
      ${groups.map(([d, label]) => {
        const list = (t.expenses || []).filter(e => (e.date || '') === d);
        if (!list.length) return '';
        return `<section class="exp-group"><h3><span>${esc(label)}</span><span class="num">${fmtNum(m.byDate[d] || 0)}원</span></h3><ul class="exp-list">${rows(list)}</ul></section>`;
      }).join('')}
      ${strays.length ? `<section class="exp-group"><h3><span>여행 기간 밖</span></h3><ul class="exp-list">${rows(strays)}</ul></section>` : ''}`;
  }

  // ── 준비 탭
  function checkTab(t) {
    const list = t.checklist || [];
    const done = list.filter(c => c.done).length;
    const pct = list.length ? Math.round(done / list.length * 100) : 0;
    const dd = dday(t);
    const today = todayStr();
    const over = list.filter(c => !c.done && isOver(t, c, today)).length;
    const cats = CATS.filter(c => list.some(x => (x.cat || '기타') === c));
    return `
      <div class="progress-card">
        <div class="row"><span class="big num">${done}<small>/${list.length}</small></span><span class="grow" style="flex:1">완료 · ${pct}%</span><span class="dchip ${dd.cls}">${dd.text}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        ${over ? `<div class="note-small" style="color:var(--warn);font-weight:600">기한이 지난 항목이 ${over}개 있어요.</div>` : ''}
      </div>
      ${list.length === 0 ? (ro() ? `<div class="empty">함께 보낸 준비 항목이 없어요.</div>` : `<div class="empty">준비 항목이 없어요.<br><button class="btn sm" data-act="load-template" style="margin-top:10px">기본 준비 리스트 불러오기</button></div>`) : ''}
      ${cats.map(c => {
        const items = list.filter(x => (x.cat || '기타') === c);
        return `<section class="cat"><h3>${esc(c)} <span class="num">${items.filter(x => x.done).length}/${items.length}</span></h3>
          <ul class="check-list">${items.map(x => checkRow(t, x, today)).join('')}</ul></section>`;
      }).join('')}
      ${ro() ? '' : `<form class="add-check" id="add-check-form">
        <input type="text" id="new-check-text" placeholder="새 할 일 (예: 유모차 대여 예약)" aria-label="새 할 일" required>
        <select id="new-check-cat" aria-label="분류">${CATS.map(c => `<option>${c}</option>`).join('')}</select>
        <select id="new-check-due" aria-label="기한">${DUE_OPTS.map(([v, l]) => `<option value="${v ?? ''}">${l}</option>`).join('')}</select>
        <button class="btn primary" type="submit">${ICON.plus}추가</button>
      </form>
      ${list.length ? `<div style="margin-top:10px;text-align:right"><button class="btn sm ghost" data-act="load-template">기본 항목 다시 추가</button></div>` : ''}`}`;
  }
  function dueDate(t, c) { return (c.due == null || c.due === '' || !t.startDate) ? null : addDays(t.startDate, -Number(c.due)); }
  function isOver(t, c, today) { const d = dueDate(t, c); return d ? today > d : false; }
  function checkRow(t, c, today) {
    const d = dueDate(t, c);
    const over = !c.done && isOver(t, c, today);
    return `
      <li class="check-item ${c.done ? 'done' : ''}">
        <label class="box"><input type="checkbox" data-act="toggle-check" data-id="${c.id}" ${c.done ? 'checked' : ''} ${ro() ? 'disabled' : ''} aria-label="${esc(c.text)} 완료"></label>
        <div class="txt" ${ro() ? '' : `data-act="edit-check" data-id="${c.id}" role="button" tabindex="0"`}>
          <div class="t">${esc(c.text)}</div>
          ${d ? `<div class="due ${over ? 'over' : ''}">${Number(c.due) === 0 ? '출발일' : 'D-' + c.due}까지 · ${fmtD(d)}${over ? ' · 기한 지남' : ''}</div>` : ''}
          ${c.memo ? `<div class="memo">${esc(c.memo)}</div>` : ''}
        </div>
        ${ro() ? '' : `<button class="btn icon ghost sm del" data-act="del-check" data-id="${c.id}" aria-label="삭제">${ICON.trash}</button>`}
      </li>`;
  }

  // ───────── 시트(입력창) ─────────
  const sheetRoot = $('#sheet-root');
  let sheetClose = null;
  function openSheet(title, body, foot, onMount) {
    sheetRoot.innerHTML = `
      <div class="sheet-scrim" data-scrim="1">
        <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <div class="sheet-head"><h2>${esc(title)}</h2><button class="btn icon ghost" data-close="1" aria-label="닫기">${ICON.close}</button></div>
          <form class="form" id="sheet-form" novalidate>${body}<div class="sheet-foot">${foot}</div></form>
        </div>
      </div>`;
    const root = sheetRoot.firstElementChild;
    const close = () => { sheetRoot.innerHTML = ''; document.removeEventListener('keydown', onKey); sheetClose = null; };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    root.addEventListener('click', e => { if (e.target.dataset.scrim || e.target.closest('[data-close]')) close(); });
    sheetClose = close;
    onMount && onMount(root, close);
    const first = root.querySelector('input:not([type=checkbox]), select, textarea');
    if (first && window.matchMedia('(min-width: 700px)').matches) first.focus();
    return close;
  }
  function confirmSheet(msg, yesLabel, onYes) {
    openSheet('확인', `<p style="margin:0">${esc(msg)}</p>`,
      `<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary danger" style="background:var(--warn);border-color:var(--warn);color:var(--surface)">${esc(yesLabel)}</button>`,
      (root, close) => { $('#sheet-form', root).addEventListener('submit', e => { e.preventDefault(); close(); onYes(); }); });
  }
  const val = (root, id) => ($('#' + id, root)?.value ?? '').trim();

  // 여행 정보
  function tripSheet(t) {
    const isNew = !t;
    t = t || { year: '', country: '', city: '', subtitle: '', startDate: '', endDate: '', memo: '' };
    openSheet(isNew ? '새 여행' : '여행 정보', `
      <div class="grid3">
        <label class="field"><span>연도</span><input type="number" id="f-year" inputmode="numeric" value="${esc(t.year)}" placeholder="출발일 기준 자동"></label>
        <label class="field"><span>나라</span><input type="text" id="f-country" list="dl-country" value="${esc(t.country)}" placeholder="일본" required></label>
        <label class="field"><span>여행지</span><input type="text" id="f-city" value="${esc(t.city)}" placeholder="오사카" required></label>
      </div>
      <datalist id="dl-country">${COUNTRY_LIST.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      <label class="field"><span>부제 <span class="hint">(선택) 예: 가족여행, 결혼기념일</span></span><input type="text" id="f-sub" value="${esc(t.subtitle)}"></label>
      <div class="grid2">
        <label class="field"><span>출발일</span><input type="date" id="f-start" value="${esc(t.startDate)}" required></label>
        <label class="field"><span>돌아오는 날</span><input type="date" id="f-end" value="${esc(t.endDate)}" required></label>
      </div>
      <div class="grid2">
        <label class="field"><span>인원 <span class="hint">(선택) 1인당 경비 계산</span></span><input type="number" id="f-people" inputmode="numeric" min="1" max="50" value="${esc(t.people || '')}" placeholder="3"></label>
        <label class="field"><span>현지 통화</span><select id="f-cur"><option value="">나라에 맞게 자동</option>${Object.keys(CUR).map(c => `<option value="${c}" ${t.currency === c ? 'selected' : ''}>${c} · ${CUR[c][0]}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>메모</span><textarea id="f-memo">${esc(t.memo)}</textarea></label>
      ${isNew ? `<label class="check-inline"><input type="checkbox" id="f-tpl" checked> 기본 준비 리스트 넣기 (여권·보험·환전 등)</label>` : ''}
      <div class="ap-preview" id="f-name-preview"></div>
      <div class="ap-preview" id="f-err" style="color:var(--warn)"></div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="f-del">${ICON.trash}여행 삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        const upd = () => { const y = val(root, 'f-year') || val(root, 'f-start').slice(0, 4); $('#f-name-preview', root).innerHTML = `여행 이름: <b>${esc([y, val(root, 'f-country'), val(root, 'f-city')].filter(Boolean).join(' · ') || '-')}</b>`; };
        root.addEventListener('input', upd); upd();
        $('#f-start', root).addEventListener('change', () => { const s = val(root, 'f-start'), e = $('#f-end', root); if (s && (!e.value || e.value < s)) e.value = s; });
        $('#f-del', root)?.addEventListener('click', () => {
          close();
          confirmSheet(`'${tripName(t)}' 여행을 삭제할까요? 일정·항공편·체크리스트가 모두 지워져요.`, '삭제', () => {
            state.trips = state.trips.filter(x => x.id !== t.id); ui.view = 'home'; save(); render(); toast('여행을 삭제했어요');
          });
        });
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          const country = val(root, 'f-country'), city = val(root, 'f-city'), s = val(root, 'f-start'), en = val(root, 'f-end');
          if (!country || !city || !s || !en) { $('#f-err', root).textContent = '나라, 여행지, 출발일, 돌아오는 날을 모두 입력해 주세요.'; return; }
          if (en < s) { $('#f-err', root).textContent = '돌아오는 날이 출발일보다 빨라요.'; return; }
          const data = { year: Number(val(root, 'f-year')) || Number(s.slice(0, 4)), country, city, subtitle: val(root, 'f-sub'), startDate: s, endDate: en, memo: val(root, 'f-memo'), people: Number(val(root, 'f-people')) || '', currency: val(root, 'f-cur') };
          if (isNew) {
            const nt = { id: uid(), ...data, dayTitles: {}, items: [], flights: [], expenses: [], rates: {}, checklist: $('#f-tpl', root).checked ? templateChecklist(/한국|대한민국/.test(country)) : [] };
            state.trips.push(nt); ui.tripId = nt.id; ui.view = 'trip'; ui.tab = 'plan';
          } else {
            Object.assign(t, data);
          }
          save(); close(); render(); toast('저장했어요');
        });
      });
  }

  // 일정 항목
  function itemSheet(t, item, date) {
    const isNew = !item;
    item = item || { date, time: '', endTime: '', type: 'sight', title: '', place: '', memo: '', cost: '' };
    const days = tripDays(t);
    openSheet(isNew ? '일정 추가' : '일정 수정', `
      <div class="field"><span>종류</span><div class="type-pick">${TYPES.map(ty => `<label><input type="radio" name="f-type" value="${ty.id}" ${item.type === ty.id ? 'checked' : ''}>${ICON[ty.id]}<span>${ty.label}</span></label>`).join('')}</div></div>
      <label class="field"><span>무엇을 하나요</span><input type="text" id="f-title" value="${esc(item.title)}" placeholder="예: 유니버설 스튜디오" required></label>
      <div class="grid3">
        <label class="field"><span>날짜</span><select id="f-date">${days.map((d, i) => `<option value="${d}" ${d === item.date ? 'selected' : ''}>${i + 1}일차 ${fmtD(d)}</option>`).join('')}${days.includes(item.date) ? '' : `<option value="${esc(item.date)}" selected>${fmtD(item.date)}</option>`}</select></label>
        <label class="field"><span>시작</span><input type="time" id="f-time" value="${esc(item.time)}"></label>
        <label class="field"><span>끝 <span class="hint">(선택)</span></span><input type="time" id="f-end" value="${esc(item.endTime)}"></label>
      </div>
      <label class="field"><span>장소 · 주소 <span class="hint">${isDomestic(t) ? '국내 여행이라 네이버지도 앱으로 열려요' : '해외 여행이라 구글맵 앱으로 열려요'}</span></span><input type="text" id="f-place" value="${esc(item.place)}" placeholder="${isDomestic(t) ? '예: 제주 애월읍 애월해안로 272' : '예: Kiyomizu-dera 또는 현지 주소'}"></label>
      <label class="field"><span>메모</span><textarea id="f-memo">${esc(item.memo)}</textarea></label>
      ${item.cost ? `<label class="field"><span>비용 메모 <span class="hint">(이전 방식 · 합계에는 안 들어가요)</span></span><input type="text" id="f-cost" value="${esc(item.cost)}"></label>` : ''}
      ${isNew ? '<div class="note-small">저장한 뒤 일정 카드의 <b>+경비</b>로 쓴 돈을 넣을 수 있어요.</div>' : `<div class="field"><span>이 일정의 경비</span>
        ${(t.expenses || []).filter(e => e.itemId === item.id).map(e => `<div class="ex-mini"><span>${esc(e.title || EXP_LABEL[e.cat])}</span><span class="num">${esc(fmtMoney(e.amount, e.currency))}</span></div>`).join('') || '<div class="note-small">아직 없어요</div>'}
        <button type="button" class="btn sm" id="f-addexp" style="justify-self:start">${ICON.plus}이 일정에 경비 추가</button></div>`}
      <div class="ap-preview" id="f-err" style="color:var(--warn)"></div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="f-del">${ICON.trash}삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        $('#f-del', root)?.addEventListener('click', () => {
          t.items = t.items.filter(x => x.id !== item.id);
          (t.expenses || []).forEach(e => { if (e.itemId === item.id) e.itemId = ''; }); // 경비는 남기고 연결만 풀기
          save(); close(); render(); toast('일정을 삭제했어요');
        });
        $('#f-addexp', root)?.addEventListener('click', () => { close(); expSheet(t, null, expPreset(item)); });
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          const title = val(root, 'f-title');
          if (!title) { $('#f-err', root).textContent = '무엇을 하는지 적어 주세요.'; return; }
          const data = { date: val(root, 'f-date'), time: val(root, 'f-time'), endTime: val(root, 'f-end'), type: (root.querySelector('input[name=f-type]:checked') || {}).value || 'etc', title, place: val(root, 'f-place'), memo: val(root, 'f-memo'), cost: val(root, 'f-cost') };
          if (!data.cost) delete data.cost;
          if (isNew) t.items.push({ id: uid(), ...data }); else { if (!data.cost) delete item.cost; Object.assign(item, data); }
          save(); close(); render(); toast('저장했어요');
        });
      });
  }

  // 경비
  const expPreset = item => ({ date: item.date, itemId: item.id, title: item.title, cat: TYPE_TO_EXP[item.type] || 'etc' });
  function expSheet(t, e, preset = {}) {
    const isNew = !e;
    const days = tripDays(t);
    const today = todayStr();
    const tc = tripCurrency(t);
    t.expenses = t.expenses || [];
    e = e || { date: has(preset, 'date') ? preset.date : (days.includes(today) ? today : ''), itemId: preset.itemId || '', title: preset.title || '', cat: preset.cat || 'etc', amount: '', currency: ui.lastCur && (ui.lastCur === 'KRW' || ui.lastCur === tc) ? ui.lastCur : tc, krw: null, pay: 'card', memo: '' };
    const curOpts = Array.from(new Set([e.currency, tc, 'KRW', 'USD', ...Object.keys(CUR)]));
    const dateOpts = [['', '여행 전 · 날짜 없음'], ...days.map((d, i) => [d, `${i + 1}일차 ${fmtD(d)}`])];
    if (e.date && !days.includes(e.date)) dateOpts.push([e.date, fmtD(e.date)]);
    openSheet(isNew ? '경비 추가' : '경비 수정', `
      <label class="field"><span>내용</span><input type="text" id="x-title" value="${esc(e.title)}" placeholder="예: 유니버설 입장권 3명"></label>
      <div class="grid2 amt-row">
        <label class="field"><span>금액</span><input type="text" id="x-amt" inputmode="decimal" value="${e.amount === '' ? '' : esc(e.amount)}" placeholder="0" autocomplete="off"></label>
        <label class="field"><span>통화</span><select id="x-cur">${curOpts.map(c => `<option value="${c}" ${c === e.currency ? 'selected' : ''}>${c} · ${CUR[c][0]}</option>`).join('')}</select></label>
      </div>
      <div class="krw-preview" id="x-prev"></div>
      <div class="field"><span>분류</span><div class="type-pick">${EXP_CATS.map(([id, l]) => `<label><input type="radio" name="x-cat" value="${id}" ${e.cat === id ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
      <div class="grid2">
        <label class="field"><span>날짜</span><select id="x-date">${dateOpts.map(([v, l]) => `<option value="${v}" ${v === (e.date || '') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>결제</span><select id="x-pay">${PAYS.map(([v, l]) => `<option value="${v}" ${v === e.pay ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>연결할 일정 <span class="hint">(선택)</span></span><select id="x-item"></select></label>
      <label class="field" id="x-krw-wrap"><span>실제 원화 결제액 <span class="hint">(선택) 카드 명세서 금액을 알면 넣으세요</span></span><input type="text" id="x-krw" inputmode="numeric" value="${e.krw == null ? '' : esc(e.krw)}" placeholder="비우면 환율로 계산"></label>
      <label class="field"><span>메모</span><input type="text" id="x-memo" value="${esc(e.memo || '')}"></label>
      <div class="ap-preview" id="x-err" style="color:var(--warn)"></div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="x-del">${ICON.trash}삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        const fillItems = () => {
          const d = $('#x-date', root).value;
          const list = (t.items || []).filter(i => (i.date || '') === d).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
          const cur = $('#x-item', root).value || e.itemId;
          $('#x-item', root).innerHTML = `<option value="">연결 안 함</option>` + list.map(i => `<option value="${i.id}" ${i.id === cur ? 'selected' : ''}>${esc(i.time || '')} ${esc(i.title)}</option>`).join('');
        };
        const upd = () => {
          const amt = parseAmount(val(root, 'x-amt')), c = $('#x-cur', root).value, k = parseAmount(val(root, 'x-krw'));
          $('#x-krw-wrap', root).hidden = c === 'KRW';
          let msg = '';
          if (c !== 'KRW' && val(root, 'x-krw') && k > 0) msg = `원화 <b>${fmtNum(k)}원</b> (실제 결제액)`;
          else if (c !== 'KRW' && amt) msg = rateOf(t, c) ? `≈ <b>${fmtNum(Math.round(amt * rateOf(t, c)))}원</b> <span>(${esc(rateLabel(t, c))})</span>` : `${esc(curUnit(c))} 환율이 아직 없어요. 저장하면 자동으로 불러와 볼게요.`;
          $('#x-prev', root).innerHTML = msg;
        };
        fillItems(); upd();
        root.addEventListener('input', upd);
        $('#x-cur', root).addEventListener('change', upd);
        $('#x-date', root).addEventListener('change', fillItems);
        $('#x-item', root).addEventListener('change', () => {
          const it = (t.items || []).find(i => i.id === $('#x-item', root).value);
          if (it && !val(root, 'x-title')) $('#x-title', root).value = it.title;
          if (it && isNew) { const r = root.querySelector(`input[name=x-cat][value="${TYPE_TO_EXP[it.type] || 'etc'}"]`); if (r) r.checked = true; }
        });
        $('#x-del', root)?.addEventListener('click', () => { t.expenses = t.expenses.filter(x => x.id !== e.id); save(); close(); render(); toast('경비를 삭제했어요'); });
        $('#sheet-form', root).addEventListener('submit', ev => {
          ev.preventDefault();
          const amount = parseAmount(val(root, 'x-amt'));
          if (!val(root, 'x-amt') || !amount) { $('#x-err', root).textContent = '금액을 숫자로 넣어 주세요.'; return; }
          const currency = $('#x-cur', root).value;
          const krwRaw = val(root, 'x-krw'), krw = parseAmount(krwRaw);
          if (currency !== 'KRW' && krwRaw && !Number.isFinite(krw)) { $('#x-err', root).textContent = '실제 원화 결제액은 숫자로 넣어 주세요.'; return; }
          const cat = (root.querySelector('input[name=x-cat]:checked') || {}).value || 'etc';
          const data = { title: val(root, 'x-title'), amount, currency, cat, date: $('#x-date', root).value, pay: $('#x-pay', root).value, itemId: $('#x-item', root).value, krw: currency !== 'KRW' && krwRaw ? Math.round(krw) : null, memo: val(root, 'x-memo') };
          if (isNew) t.expenses.push({ id: uid(), ...data }); else Object.assign(e, data);
          ui.lastCur = currency;
          save(); close(); render(); toast('저장했어요');
          if (currency !== 'KRW' && data.krw == null && !rateOf(t, currency)) updateRates(t, [currency], true);
        });
      });
  }

  function rateSheet(t, c) {
    const u = RATE_UNIT[c] || 1, r = rateOf(t, c);
    openSheet(`${curUnit(c)} 환율`, `
      <label class="field"><span>${fmtNum(u)}${esc(curUnit(c))} (${esc(c)}) = 몇 원?</span><input type="text" id="r-v" inputmode="decimal" value="${r ? +(r * u).toFixed(4) : ''}" placeholder="예: ${c === 'JPY' ? '905' : c === 'USD' ? '1,380' : ''}"></label>
      <div class="note-small">환전한 영수증이나 트래블카드 앱의 환율을 넣으면 실제와 가장 가까워요.</div>
      <div class="ap-preview" id="r-err" style="color:var(--warn)"></div>`,
      `<button type="button" class="btn left" id="r-auto">자동으로 불러오기</button><button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        $('#r-auto', root).addEventListener('click', () => { close(); updateRates(t, [c]); });
        $('#sheet-form', root).addEventListener('submit', ev => {
          ev.preventDefault();
          const v = parseAmount(val(root, 'r-v'));
          if (!(v > 0)) { $('#r-err', root).textContent = '0보다 큰 숫자를 넣어 주세요.'; return; }
          t.rates = t.rates || {}; t.rates[c] = { v: v / u, date: todayStr(), src: 'manual' };
          save(); close(); render(); toast('환율을 저장했어요');
        });
      });
  }

  // 항공편
  function flightSheet(t, f) {
    const isNew = !f;
    f = f || { flightNo: '', dep: '', arr: '', depName: '', arrName: '', depDate: t.startDate || '', depTime: '', arrDate: '', arrTime: '', depTerminal: '', arrTerminal: '', gate: '', seat: '', pnr: '', memo: '' };
    const apOpts = AIRPORTS.map(a => `<option value="${a.code}">${esc(a.ko)} · ${esc(a.city)}</option>`).join('');
    openSheet(isNew ? '항공편 추가' : '항공편 수정', `
      <div class="grid2">
        <label class="field"><span>편명</span><input type="text" id="f-no" value="${esc(f.flightNo)}" placeholder="KE723" autocapitalize="characters" autocomplete="off"></label>
        <div class="field"><span>항공사</span><div class="ap-preview" id="f-al" style="padding-top:10px"></div></div>
      </div>
      <div class="grid2">
        <label class="field"><span>출발 공항 코드</span><input type="text" id="f-dep" list="dl-ap" value="${esc(f.dep)}" placeholder="ICN" autocapitalize="characters" autocomplete="off" maxlength="3"><span class="ap-preview" id="p-dep"></span></label>
        <label class="field"><span>도착 공항 코드</span><input type="text" id="f-arr" list="dl-ap" value="${esc(f.arr)}" placeholder="KIX" autocapitalize="characters" autocomplete="off" maxlength="3"><span class="ap-preview" id="p-arr"></span></label>
      </div>
      <datalist id="dl-ap">${apOpts}</datalist>
      <div class="grid2" id="custom-names">
        <label class="field" id="w-depName" hidden><span>출발 공항 이름 (목록에 없음)</span><input type="text" id="f-depName" value="${esc(f.depName || '')}"></label>
        <label class="field" id="w-arrName" hidden><span>도착 공항 이름 (목록에 없음)</span><input type="text" id="f-arrName" value="${esc(f.arrName || '')}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>출발 날짜</span><input type="date" id="f-ddate" value="${esc(f.depDate)}"></label>
        <label class="field"><span>출발 시간 (현지)</span><input type="time" id="f-dtime" value="${esc(f.depTime)}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>도착 날짜 <span class="hint">비우면 출발일</span></span><input type="date" id="f-adate" value="${esc(f.arrDate)}"></label>
        <label class="field"><span>도착 시간 (현지)</span><input type="time" id="f-atime" value="${esc(f.arrTime)}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>출발 터미널</span><input type="text" id="f-dterm" value="${esc(f.depTerminal)}" placeholder=""></label>
        <label class="field"><span>도착 터미널</span><input type="text" id="f-aterm" value="${esc(f.arrTerminal)}" placeholder=""></label>
      </div>
      <div class="grid2">
        <label class="field"><span>발권 카운터</span><input type="text" id="f-counter" value="${esc(f.counter || '')}" placeholder="예: H열 · 당일 확인" autocapitalize="characters"></label>
        <label class="field"><span>탑승 게이트</span><input type="text" id="f-gate" value="${esc(f.gate)}" placeholder="당일 확인" inputmode="text"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>좌석</span><input type="text" id="f-seat" value="${esc(f.seat)}" placeholder="32A"></label>
        <label class="field"><span>예약번호</span><input type="text" id="f-pnr" value="${esc(f.pnr)}" autocapitalize="characters"></label>
      </div>
      <label class="field"><span>메모</span><textarea id="f-memo">${esc(f.memo)}</textarea></label>
      <div class="note-small">터미널을 비워 두면 항공사 기준으로 추정해서 보여 줘요. 시간은 각 공항의 현지 시간으로 입력하세요.</div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="f-del">${ICON.trash}삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        const upd = () => {
          const no = val(root, 'f-no'), dep = val(root, 'f-dep').toUpperCase(), arr = val(root, 'f-arr').toUpperCase();
          $('#f-al', root).innerHTML = airlineName(no) ? `<b>${esc(airlineName(no))}</b>` : (no ? '목록에 없는 항공사' : '');
          const tmp = { flightNo: no, dep, arr };
          [['dep', dep], ['arr', arr]].forEach(([s, c]) => {
            const a = findAp(c);
            $('#p-' + s, root).innerHTML = a ? `<b>${esc(a.ko)}</b> · ${esc(a.city)}` : (c.length === 3 ? '목록에 없는 공항 · 아래에 이름을 적어 주세요' : '');
            $('#w-' + s + 'Name', root).hidden = !(c.length === 3 && !a);
          });
          $('#f-dterm', root).placeholder = suggestTerminal(tmp, 'dep') ? suggestTerminal(tmp, 'dep') + ' (추정)' : '';
          $('#f-aterm', root).placeholder = suggestTerminal(tmp, 'arr') ? suggestTerminal(tmp, 'arr') + ' (추정)' : '';
        };
        root.addEventListener('input', upd); upd();
        $('#f-del', root)?.addEventListener('click', () => { t.flights = t.flights.filter(x => x.id !== f.id); save(); close(); render(); toast('항공편을 삭제했어요'); });
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          const data = {
            flightNo: val(root, 'f-no').toUpperCase().replace(/\s/g, ''), dep: val(root, 'f-dep').toUpperCase(), arr: val(root, 'f-arr').toUpperCase(),
            depName: val(root, 'f-depName'), arrName: val(root, 'f-arrName'),
            depDate: val(root, 'f-ddate'), depTime: val(root, 'f-dtime'), arrDate: val(root, 'f-adate'), arrTime: val(root, 'f-atime'),
            depTerminal: val(root, 'f-dterm').toUpperCase(), arrTerminal: val(root, 'f-aterm').toUpperCase(), gate: val(root, 'f-gate').toUpperCase(), counter: val(root, 'f-counter').toUpperCase(),
            seat: val(root, 'f-seat').toUpperCase(), pnr: val(root, 'f-pnr').toUpperCase(), memo: val(root, 'f-memo')
          };
          if (!data.arrDate) data.arrDate = data.depDate;
          if (isNew) t.flights.push({ id: uid(), ...data }); else Object.assign(f, data);
          save(); close(); render(); toast('저장했어요');
        });
      });
  }

  function dayTitleSheet(t, d) {
    openSheet(`${fmtDLong(d)} 제목`, `<label class="field"><span>이 날의 제목</span><input type="text" id="f-dt" value="${esc((t.dayTitles || {})[d] || '')}" placeholder="예: 교토 당일치기"></label>`,
      `<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => { $('#sheet-form', root).addEventListener('submit', e => { e.preventDefault(); t.dayTitles = t.dayTitles || {}; t.dayTitles[d] = val(root, 'f-dt'); save(); close(); render(); }); });
  }

  function checkSheet(t, c) {
    openSheet('할 일 수정', `
      <label class="field"><span>할 일</span><input type="text" id="f-text" value="${esc(c.text)}"></label>
      <div class="grid2">
        <label class="field"><span>분류</span><select id="f-cat">${CATS.map(x => `<option ${x === c.cat ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>기한</span><select id="f-due">${DUE_OPTS.map(([v, l]) => `<option value="${v ?? ''}" ${String(v ?? '') === String(c.due ?? '') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>메모</span><textarea id="f-memo">${esc(c.memo || '')}</textarea></label>`,
      `<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          const text = val(root, 'f-text'); if (!text) return;
          const due = val(root, 'f-due');
          Object.assign(c, { text, cat: val(root, 'f-cat'), due: due === '' ? null : Number(due), memo: val(root, 'f-memo') });
          save(); close(); render();
        });
      });
  }

  // ───────── 백업 ─────────
  function backupSheet() {
    openSheet('불러오기 · 백업', `
      <label class="field"><span>받은 공유 링크 열기</span><textarea id="b-link" style="min-height:64px" placeholder="카톡으로 받은 링크를 길게 눌러 복사한 뒤 여기에 붙여넣으세요"></textarea></label>
      <button type="button" class="btn primary" id="b-open">링크 열기</button>
      <hr class="sep">
      <p style="margin:0" class="note-small">여행 데이터는 지금 쓰는 기기의 브라우저에만 저장돼요. 아이폰과 아이패드는 서로 공유되지 않으니, 백업 파일을 iCloud Drive에 저장해 두고 다른 기기에서 불러오세요.</p>
      <button type="button" class="btn" id="b-export">${ICON.save}백업 파일 만들기 (.json)</button>
      <label class="field"><span>백업 파일 불러오기</span><input type="file" id="b-import" accept="application/json,.json"></label>
      <div class="ap-preview" id="b-msg"></div>`,
      `<button type="button" class="btn" data-close="1">닫기</button>`,
      (root, close) => {
        $('#b-open', root).addEventListener('click', () => {
          const text = val(root, 'b-link'); const m = text.match(SHARE_RE);
          if (!m) { $('#b-msg', root).textContent = '공유 링크를 찾지 못했어요. 링크 전체를 붙여넣었는지 확인하세요.'; return; }
          const url = (text.match(/https?:\/\/\S+/) || [])[0] || '';
          openShared(m[1], url);
        });
        $('#b-export', root).addEventListener('click', () => {
          const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
          deliverFile(blob, `여행일정-백업-${todayStr()}.json`);
        });
        $('#b-import', root).addEventListener('change', e => {
          const file = e.target.files[0]; if (!file) return;
          const r = new FileReader();
          r.onload = () => {
            try {
              const data = JSON.parse(r.result);
              if (!data || !Array.isArray(data.trips)) throw new Error('형식 오류');
              let added = 0, updated = 0;
              data.trips.map(normalizeTrip).forEach(tr => {
                const i = state.trips.findIndex(x => x.id === tr.id);
                if (i >= 0) { state.trips[i] = tr; updated++; } else { state.trips.push(tr); added++; }
              });
              save(); close(); render(); toast(`불러오기 완료 · 새 여행 ${added}개, 덮어쓴 여행 ${updated}개`);
            } catch (err) { $('#b-msg', root).textContent = '이 파일은 여행일정 백업 파일이 아니에요.'; }
          };
          r.readAsText(file);
        });
      });
  }

  // 파일 내보내기: 공유 시트(아이폰) → 안 되면 다운로드
  function deliverFile(blob, filename) {
    const file = (() => { try { return new File([blob], filename, { type: blob.type }); } catch (e) { return null; } })();
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: filename }).catch(err => { if (err && err.name !== 'AbortError') downloadBlob(blob, filename); });
      return;
    }
    downloadBlob(blob, filename);
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (IN_FRAME) toast('미리보기 화면에서는 파일 저장이 막혀 있어요. 실제 앱 주소에서 이용하세요.');
  }

  // ───────── 공유 링크 ─────────
  // 일정 전체를 압축해서 주소의 # 뒤에 담아요. # 뒤는 서버로 전송되지 않아서 일정이 어디에도 저장되지 않아요.
  const SHARE_RE = /(?:#s=)?([01]\.[A-Za-z0-9_-]{10,})/;
  const b64u = bytes => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64u = str => {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b;
  };
  const pipeBytes = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

  async function encodeShare(trip) {
    const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, trip }));
    if (window.CompressionStream) {
      try { return '1.' + b64u(await pipeBytes(bytes, new CompressionStream('deflate-raw'))); } catch (e) { /* 압축 없이 */ }
    }
    return '0.' + b64u(bytes);
  }
  async function decodeShare(code) {
    if (code.length > 300000) throw new Error('too-long');
    const [kind, body] = [code[0], code.slice(2)];
    let bytes = unb64u(body);
    if (kind === '1') {
      if (!window.DecompressionStream) throw new Error('unsupported');
      bytes = await pipeBytes(bytes, new DecompressionStream('deflate-raw'));
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  function shareable(t, o) {
    const c = JSON.parse(JSON.stringify(t));
    delete c.receivedAt;
    if (!o.pnr) (c.flights || []).forEach(f => { f.pnr = ''; });
    if (!o.check) c.checklist = [];
    if (!o.exp) { c.expenses = []; c.rates = {}; }
    c.shareMeta = { pnr: !!o.pnr, check: !!o.check, exp: !!o.exp, at: todayStr() };
    return c;
  }

  // 다른 사람이 만든 데이터라서, 화면에 넣기 전에 형식을 하나하나 확인해요
  function normalizeTrip(t) {
    t = t && typeof t === 'object' ? t : {};
    const arr = v => Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];
    const sid = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v)) ? v : uid();
    const str = (v, n) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').slice(0, n);
    const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
    const time = v => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : '';
    const titles = t.dayTitles && typeof t.dayTitles === 'object' ? t.dayTitles : {};
    const out = {
      id: sid(t.id), example: !!t.example, year: Number(t.year) || '', country: str(t.country, 40), city: str(t.city, 60), subtitle: str(t.subtitle, 80),
      startDate: date(t.startDate), endDate: date(t.endDate), memo: str(t.memo, 2000),
      dayTitles: Object.fromEntries(Object.entries(titles).filter(([k]) => date(k)).map(([k, v]) => [k, str(v, 80)])),
      items: arr(t.items).map(i => ({ id: sid(i.id), date: date(i.date), time: time(i.time), endTime: time(i.endTime), type: Object.prototype.hasOwnProperty.call(TYPE_LABEL, i.type) ? i.type : 'etc', title: str(i.title, 200), place: str(i.place, 200), memo: str(i.memo, 2000), cost: str(i.cost, 100) })),
      flights: arr(t.flights).map(f => ({ id: sid(f.id), flightNo: str(f.flightNo, 10), dep: str(f.dep, 3).toUpperCase(), arr: str(f.arr, 3).toUpperCase(), depName: str(f.depName, 80), arrName: str(f.arrName, 80), depDate: date(f.depDate), depTime: time(f.depTime), arrDate: date(f.arrDate), arrTime: time(f.arrTime), depTerminal: str(f.depTerminal, 10), arrTerminal: str(f.arrTerminal, 10), gate: str(f.gate, 10), counter: str(f.counter, 20), seat: str(f.seat, 40), pnr: str(f.pnr, 20), memo: str(f.memo, 1000) })),
      people: Number(t.people) >= 1 && Number(t.people) <= 50 ? Math.round(Number(t.people)) : '',
      currency: typeof t.currency === 'string' && has(CUR, t.currency) ? t.currency : '',
      rates: Object.fromEntries(Object.entries(t.rates && typeof t.rates === 'object' ? t.rates : {})
        .filter(([c, r]) => has(CUR, c) && c !== 'KRW' && r && Number(r.v) > 0)
        .map(([c, r]) => [c, { v: Number(r.v), date: date(r.date), src: r.src === 'manual' ? 'manual' : 'auto' }])),
      expenses: arr(t.expenses).map(e => ({ id: sid(e.id), date: date(e.date), itemId: typeof e.itemId === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(e.itemId) ? e.itemId : '', title: str(e.title, 120), cat: has(EXP_LABEL, e.cat) ? e.cat : 'etc', amount: Number.isFinite(Number(e.amount)) ? Number(e.amount) : 0, currency: typeof e.currency === 'string' && has(CUR, e.currency) ? e.currency : 'KRW', krw: e.krw === null || e.krw === '' || e.krw === undefined || !Number.isFinite(Number(e.krw)) ? null : Math.round(Number(e.krw)), pay: has(PAY_LABEL, e.pay) ? e.pay : 'etc', memo: str(e.memo, 500) })),
      checklist: arr(t.checklist).map(c => ({ id: sid(c.id), text: str(c.text, 200), cat: CATS.includes(c.cat) ? c.cat : '기타', due: (c.due === null || c.due === '' || c.due === undefined || !Number.isFinite(Number(c.due))) ? null : Math.max(0, Math.min(365, Math.round(Number(c.due)))), done: !!c.done, memo: str(c.memo, 500) }))
    };
    if (date(t.receivedAt)) out.receivedAt = t.receivedAt;
    if (t.shareMeta && typeof t.shareMeta === 'object') out.shareMeta = { pnr: !!t.shareMeta.pnr, check: !!t.shareMeta.check, exp: !!t.shareMeta.exp, at: date(t.shareMeta.at) };
    return out;
  }

  async function openShared(code, link) {
    try {
      const data = await decodeShare(code);
      const t = normalizeTrip(data && data.trip);
      if (!t.city && !t.country) throw new Error('empty');
      sharedTrip = t; sharedLink = link || `${location.origin}${location.pathname}#s=${code}`;
      if (sheetClose) sheetClose();
      ui.view = 'shared'; ui.tab = 'plan'; render(); window.scrollTo(0, 0);
    } catch (e) {
      toast(e && e.message === 'unsupported' ? '이 브라우저에서는 열 수 없어요. iOS 16.4 이상 Safari에서 열어 주세요.' : '공유 링크를 읽지 못했어요. 링크가 중간에 잘리지 않았는지 확인하세요.');
    }
  }
  function clearShareHash() {
    if (SHARE_RE.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 무시 */ } }
  }
  function closeShared() { sharedTrip = null; ui.view = 'home'; clearShareHash(); render(); window.scrollTo(0, 0); }
  function saveShared() {
    const t = JSON.parse(JSON.stringify(sharedTrip));
    const meta = t.shareMeta || {}; delete t.shareMeta;
    const ex = state.trips.find(x => x.id === t.id);
    const doSave = () => {
      if (ex) {
        // 함께 보내지 않은 내용은 내 기기에 있던 값을 그대로 둬요
        if (!meta.check) t.checklist = ex.checklist || [];
        if (!meta.exp) { t.expenses = ex.expenses || []; t.rates = ex.rates || {}; }
        if (!meta.pnr) t.flights.forEach(f => { const o = (ex.flights || []).find(y => y.id === f.id); if (o && o.pnr) f.pnr = o.pnr; });
        state.trips[state.trips.indexOf(ex)] = t;
      } else state.trips.push(t);
      t.receivedAt = todayStr();
      save(); sharedTrip = null; clearShareHash();
      ui.view = 'trip'; ui.tripId = t.id; render(); window.scrollTo(0, 0);
      toast(ex ? '받은 일정으로 바꿨어요' : '내 앱에 저장했어요');
    };
    if (ex) confirmSheet('이미 저장된 여행이에요. 받은 일정으로 바꿀까요? 이 기기에서 고친 내용은 사라져요.', '바꾸기', doSave); else doSave();
  }

  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* 무시 */ } ta.remove();
      toast(ok ? '링크를 복사했어요' : '복사가 안 돼요. 링크 칸을 길게 눌러 복사하세요');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('링크를 복사했어요'), fallback); else fallback();
  }

  function shareSheet(t) {
    let link = '';
    openSheet('가족에게 일정 공유', `
      <p class="note-small" style="margin:0">링크를 받은 가족은 앱을 설치하지 않아도 바로 일정을 볼 수 있어요. <b>보내는 시점의 일정</b>이 담기니, 일정을 바꾼 뒤에는 링크를 다시 보내 주세요.</p>
      <div class="field"><span>함께 보낼 내용</span>
        <label class="check-inline"><input type="checkbox" id="s-check" checked> 준비 체크리스트 (체크 상태 포함)</label>
        <label class="check-inline"><input type="checkbox" id="s-exp"> 경비 내역</label>
        <label class="check-inline"><input type="checkbox" id="s-pnr"> 항공 예약번호</label>
        <div class="note-small">예약번호는 이름과 함께 있으면 예약 변경·취소에 쓰일 수 있어서 기본으로 빼 뒀어요.</div>
      </div>
      <label class="field"><span>공유 링크</span><input type="text" id="s-link" readonly value="만드는 중…"></label>
      <div class="ap-preview" id="s-msg"></div>`,
      `<button type="button" class="btn" id="s-copy" disabled>링크 복사</button><button type="submit" class="btn primary" disabled>${ICON.share}카톡·메시지로 보내기</button>`,
      (root) => {
        const btns = root.querySelectorAll('#s-copy, button[type=submit]');
        const gen = async () => {
          btns.forEach(b => { b.disabled = true; });
          const code = await encodeShare(shareable(t, { check: $('#s-check', root).checked, pnr: $('#s-pnr', root).checked, exp: $('#s-exp', root).checked }));
          link = `${location.origin}${location.pathname}#s=${code}`;
          $('#s-link', root).value = link;
          const msgs = [];
          if (IN_FRAME) msgs.push('미리보기 화면에서 만든 링크는 가족이 열 수 없어요. 실제 앱 주소에 올린 뒤에 보내세요. (복사해서 불러오기에 붙여넣으면 받는 화면은 미리 볼 수 있어요)');
          if (link.length > 6000) msgs.push(`링크가 길어요(${link.length.toLocaleString()}자). 일부 앱에서 잘릴 수 있으니 체크리스트를 빼거나 PDF로 보내 보세요.`);
          $('#s-msg', root).textContent = msgs.join(' ');
          btns.forEach(b => { b.disabled = false; });
        };
        root.addEventListener('change', e => { if (e.target.type === 'checkbox') gen(); });
        gen();
        $('#s-link', root).addEventListener('focus', e => e.target.select());
        $('#s-copy', root).addEventListener('click', () => copyText(link));
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          if (navigator.share) navigator.share({ title: tripName(t), text: `${tripName(t)} 여행 일정이에요.`, url: link }).catch(err => { if (err && err.name !== 'AbortError') copyText(link); });
          else copyText(link);
        });
      });
  }

  // ───────── PDF ─────────
  function pdfSheet(t) {
    openSheet('PDF 내보내기', `
      <div class="field"><span>넣을 내용</span>
        <label class="check-inline"><input type="checkbox" id="p-flights" checked> 항공편</label>
        <label class="check-inline"><input type="checkbox" id="p-airports" checked> 공항 정보 (터미널·주차장·팁)</label>
        <label class="check-inline"><input type="checkbox" id="p-plan" checked> 일차별 일정</label>
        <label class="check-inline"><input type="checkbox" id="p-check" checked> 준비 체크리스트</label>
        <label class="check-inline"><input type="checkbox" id="p-money" checked> 경비</label>
      </div>
      <div class="ap-preview" id="p-msg">${IN_FRAME ? '미리보기 화면에서는 PDF 저장·인쇄가 막혀 있어요. 실제 앱 주소에서 이용하세요.' : 'A4 세로로 만들어요. 아이폰에서는 공유 시트가 열리면 “파일에 저장”이나 카카오톡으로 보낼 수 있어요.'}</div>`,
      `<button type="button" class="btn left" id="p-print">인쇄</button><button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">${ICON.doc}PDF 만들기</button>`,
      (root, close) => {
        const opts = () => ({ flights: $('#p-flights', root).checked, airports: $('#p-airports', root).checked, plan: $('#p-plan', root).checked, check: $('#p-check', root).checked, money: $('#p-money', root).checked });
        $('#p-print', root).addEventListener('click', () => {
          const pr = $('#print-root'); pr.innerHTML = ''; pr.appendChild(buildReport(t, opts()));
          close(); setTimeout(() => window.print(), 50);
        });
        $('#sheet-form', root).addEventListener('submit', async e => {
          e.preventDefault();
          if (!window.html2pdf) { $('#p-msg', root).textContent = 'PDF 도구를 불러오지 못했어요. 인터넷 연결을 확인하거나 “인쇄”에서 PDF로 저장하세요.'; return; }
          const btn = e.submitter || root.querySelector('button[type=submit]');
          btn.disabled = true; btn.textContent = '만드는 중…';
          const filename = `${tripName(t).replace(/ · /g, '_')}_여행일정.pdf`;
          const prevY = window.scrollY;
          window.scrollTo(0, 0); // 스크롤된 상태로 만들면 첫 장이 비거나 내용이 밀려요
          try {
            const blob = await window.html2pdf().set({
              margin: [10, 10, 12, 10], filename,
              image: { type: 'jpeg', quality: 0.95 },
              html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF', scrollX: 0, scrollY: 0 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.r-block', '.r-day-head'] }
            }).from(buildReport(t, opts())).outputPdf('blob');
            const pdf = new Blob([blob], { type: 'application/pdf' });
            window.scrollTo(0, prevY);
            close();
            // 아이폰은 사용자가 한 번 더 눌러야 공유 시트를 열 수 있어서 버튼을 따로 보여 줘요
            openSheet('PDF 준비 완료', `<p style="margin:0">${esc(filename)}</p>`,
              `<button type="button" class="btn" data-close="1">닫기</button><button type="button" class="btn" id="p-dl">다운로드</button><button type="button" class="btn primary" id="p-share">${ICON.save}저장·공유</button>`,
              (r2) => {
                $('#p-share', r2).addEventListener('click', () => deliverFile(pdf, filename));
                $('#p-dl', r2).addEventListener('click', () => downloadBlob(pdf, filename));
              });
          } catch (err) {
            window.scrollTo(0, prevY);
            btn.disabled = false; btn.textContent = 'PDF 만들기';
            $('#p-msg', root).textContent = 'PDF를 만들지 못했어요. “인쇄”를 눌러 PDF로 저장해 보세요.';
          }
        });
      });
  }

  function buildReport(t, o) {
    const el = document.createElement('div');
    el.className = 'report';
    const fs = sortFlights(t.flights || []);
    const days = tripDays(t);
    let h = `<div class="r-crumb">${esc(t.year)} · ${esc(t.country)}</div><h1>${esc(t.city)}${t.subtitle ? ` <span style="font-size:15px;font-weight:500;color:#5B6472">${esc(t.subtitle)}</span>` : ''}</h1>
      <div class="r-dates">${fmtDLong(t.startDate)} – ${fmtDLong(t.endDate)} · ${nightsLabel(t)}</div>${t.memo ? `<div style="margin-top:6px">${esc(t.memo)}</div>` : ''}`;
    if (o.flights && fs.length) {
      h += `<h2>항공편</h2><table><thead><tr><th>편명</th><th>날짜</th><th>구간</th><th>시간(현지)</th><th>터미널</th><th>발권 카운터 · 게이트</th><th>좌석 · 예약번호</th></tr></thead><tbody>
        ${fs.map(f => { const dt = terminalOf(f, 'dep'), at = terminalOf(f, 'arr'); return `<tr><td style="white-space:nowrap"><b>${esc(f.flightNo)}</b><br>${esc(airlineName(f.flightNo))}</td><td style="white-space:nowrap">${fmtD(f.depDate)}</td><td>${esc(f.dep)} ${esc(apName(f.dep, f.depName))}<br>→ ${esc(f.arr)} ${esc(apName(f.arr, f.arrName))}</td><td>${esc(f.depTime)} → ${esc(f.arrTime)}${f.arrDate && f.arrDate !== f.depDate ? ' (+' + diffDays(f.depDate, f.arrDate) + ')' : ''}<br>${esc(flightDuration(f))}</td><td style="white-space:nowrap">${esc(dt.v || '-')}${dt.est ? '*' : ''} → ${esc(at.v || '-')}${at.est ? '*' : ''}</td><td>카운터 ${esc(f.counter || '당일 확인')}<br>게이트 ${esc(f.gate || '당일 확인')}</td><td>${esc(f.seat || '-')}${f.pnr ? `<br>${esc(f.pnr)}` : ''}</td></tr>`; }).join('')}
      </tbody></table>${fs.some(f => terminalOf(f, 'dep').est || terminalOf(f, 'arr').est) ? '<div style="color:#5B6472;margin-top:4px">* 항공사 기준 추정 터미널</div>' : ''}`;
    }
    if (o.airports && fs.length) {
      const codes = []; fs.forEach(f => [f.dep, f.arr].forEach(c => { if (c && !codes.includes(c)) codes.push(c); }));
      const aps = codes.map(findAp).filter(Boolean);
      if (aps.length) {
        h += `<h2>공항 정보</h2>` + aps.map(a => `<div class="r-ap r-block"><b>${esc(a.code)} · ${esc(a.ko)}</b> <span style="color:#5B6472">${esc(a.en)} · ${esc(tzLabel(a, t.startDate))}</span>
          ${a.terminals && a.terminals.length ? `<div>터미널: ${esc(a.terminals.join(', '))}</div>` : ''}
          ${(a.notes || []).length ? `<ul>${a.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
          ${(a.parking || []).length ? `<div style="margin-top:4px"><b style="font-size:12px">주차장</b><ul>${a.parking.map(p => `<li><b>${esc(p.name)}</b>${p.res ? ' (예약 전용)' : ''} — ${esc(p.desc)}</li>`).join('')}</ul>${a.parkingRes ? `<div style="color:#5B6472">${esc(a.parkingRes)}</div>` : ''}${a.parkingNote ? `<div style="color:#5B6472">${esc(a.parkingNote)}</div>` : ''}</div>` : ''}
        </div>`).join('');
      }
    }
    if (o.plan && days.length) {
      h += `<h2>일차별 일정</h2>` + days.map((d, i) => {
        const es = dayEntries(t, d);
        return `<div class="r-day-head"><b>${i + 1}일차</b><span>${fmtDLong(d)}</span><strong>${esc((t.dayTitles || {})[d] || '')}</strong></div>
          ${es.length ? `<table><tbody>${es.map(e => e.kind === 'item'
            ? `<tr><td class="t">${esc(e.i.time || '—')}${e.i.endTime ? '~' + esc(e.i.endTime) : ''}</td><td style="width:44px;color:#5B6472">${TYPE_LABEL[e.i.type] || ''}</td><td><b>${esc(e.i.title)}</b>${e.i.place ? ` · ${esc(e.i.place)}` : ''}${e.i.memo ? `<br><span style="color:#5B6472">${esc(e.i.memo)}</span>` : ''}${e.i.cost ? `<br><span style="color:#5B6472">${esc(e.i.cost)}</span>` : ''}</td></tr>`
            : `<tr><td class="t">${esc(e.kind === 'arrive' ? e.f.arrTime : e.f.depTime)}</td><td style="width:44px;color:#5B6472">항공</td><td><div class="r-flight"><span class="c">${esc(e.f.dep)} → ${esc(e.f.arr)}</span><span>${esc(e.f.flightNo)} ${esc(e.f.depTime)}–${esc(e.f.arrTime)}</span><span>${esc(terminalOf(e.f, 'dep').v)}${e.f.counter ? ' · 카운터 ' + esc(e.f.counter) : ''}${e.f.gate ? ' · 게이트 ' + esc(e.f.gate) : ''}</span></div></td></tr>`).join('')}</tbody></table>`
            : `<div style="color:#5B6472;padding:4px 6px">일정 없음</div>`}`;
      }).join('');
    }
    if (o.check && (t.checklist || []).length) {
      const list = t.checklist;
      h += `<h2>준비 체크리스트 (${list.filter(c => c.done).length}/${list.length})</h2>` + CATS.filter(c => list.some(x => (x.cat || '기타') === c)).map(c =>
        `<div class="r-block" style="margin-bottom:6px"><b style="font-size:12px;color:#5B6472">${esc(c)}</b><div class="r-check">${list.filter(x => (x.cat || '기타') === c).map(x => `<div><span class="bx">${x.done ? '☑' : '☐'}</span><span>${esc(x.text)}${dueDate(t, x) ? ` <span style="color:#5B6472">(${fmtD(dueDate(t, x))}까지)</span>` : ''}</span></div>`).join('')}</div></div>`).join('');
    }
    if (o.money && (t.expenses || []).length) {
      const m = expTotals(t);
      const days2 = tripDays(t);
      const label = d => !d ? '여행 전' : days2.includes(d) ? `${days2.indexOf(d) + 1}일차 ${fmtD(d)}` : fmtD(d);
      const sorted = [...t.expenses].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      const usedR = Object.keys(m.byCur).filter(c => c !== 'KRW' && rateOf(t, c));
      h += `<h2>경비 · 총 ${fmtNum(m.total)}원${Number(t.people) > 1 ? ` (1인당 ${fmtNum(Math.round(m.total / Number(t.people)))}원)` : ''}</h2>
        <div class="r-block" style="margin-bottom:6px">${EXP_CATS.filter(([id]) => m.byCat[id]).map(([id, l]) => `${l} ${fmtNum(m.byCat[id])}원`).join(' · ')}</div>
        ${usedR.length ? `<div style="color:#5B6472;margin-bottom:6px">환율: ${usedR.map(c => esc(rateLabel(t, c))).join(' · ')}</div>` : ''}
        ${m.missing.size ? `<div style="color:#B8460E;margin-bottom:6px">환율이 없어 합계에서 빠진 통화: ${[...m.missing].map(curUnit).join(', ')}</div>` : ''}
        <table><thead><tr><th>날짜</th><th>내용</th><th>분류</th><th>결제</th><th style="text-align:right">금액</th><th style="text-align:right">원화</th></tr></thead><tbody>
        ${sorted.map(e => { const k = krwOf(t, e); return `<tr><td>${label(e.date)}</td><td>${esc(e.title || EXP_LABEL[e.cat])}</td><td>${EXP_LABEL[e.cat] || ''}</td><td>${PAY_LABEL[e.pay] || ''}</td><td style="text-align:right">${esc(fmtMoney(e.amount, e.currency))}</td><td style="text-align:right">${k == null ? '-' : fmtNum(k) + '원'}${e.krw != null ? ' *' : ''}</td></tr>`; }).join('')}
        </tbody></table>${t.expenses.some(e => e.krw != null) ? '<div style="color:#5B6472;margin-top:4px">* 실제 원화 결제액</div>' : ''}`;
    }
    h += `<div class="r-foot">여행일정 · ${todayStr()} 생성 · 게이트와 터미널은 출발 당일 공항·항공사 안내로 다시 확인하세요.</div>`;
    el.innerHTML = h;
    return el;
  }

  // ───────── 토스트 ─────────
  let toastTimer;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // ───────── 이벤트 ─────────
  app.addEventListener('click', e => {
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const text = cp.dataset.copy;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('주차장 이름을 복사했어요'), () => {});
      return; // 링크는 그대로 열려요
    }
    if (e.target.closest('[data-stop]')) return;
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id, t = curTrip();
    if (ro() && ['edit-trip', 'add-item', 'edit-item', 'day-title', 'add-flight', 'edit-flight', 'edit-check', 'del-check', 'load-template', 'share', 'add-exp', 'add-exp-item', 'edit-exp', 'edit-rate', 'fetch-rates'].includes(act)) return;
    switch (act) {
      case 'add-exp': expSheet(t, null); break;
      case 'add-exp-item': { const it = t.items.find(x => x.id === id); if (it) expSheet(t, null, expPreset(it)); break; }
      case 'edit-exp': expSheet(t, (t.expenses || []).find(x => x.id === id)); break;
      case 'edit-rate': rateSheet(t, el.dataset.cur); break;
      case 'fetch-rates': {
        const curs = Array.from(new Set([tripCurrency(t), ...(t.expenses || []).map(e => e.currency)])).filter(c => c !== 'KRW');
        toast('환율을 불러오는 중…'); updateRates(t, curs); break;
      }
      case 'share': shareSheet(t); break;
      case 'save-shared': saveShared(); break;
      case 'close-shared': closeShared(); break;
      case 'copy-shared': copyText(sharedLink); break;
      case 'new-trip': tripSheet(null); break;
      case 'backup': backupSheet(); break;
      case 'open-trip': ui.tripId = id; ui.view = 'trip'; ui.tab = ui.tab || 'plan'; render(); window.scrollTo(0, 0); break;
      case 'home': ui.view = 'home'; render(); window.scrollTo(0, 0); break;
      case 'edit-trip': tripSheet(t); break;
      case 'tab': ui.tab = el.dataset.tab; render(); break;
      case 'pdf': pdfSheet(t); break;
      case 'day-title': dayTitleSheet(t, el.dataset.date); break;
      case 'add-item': itemSheet(t, null, el.dataset.date); break;
      case 'edit-item': itemSheet(t, t.items.find(x => x.id === id)); break;
      case 'goto-flight': ui.tab = 'flights'; render(); setTimeout(() => $('#fl-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); break;
      case 'add-flight': flightSheet(t, null); break;
      case 'edit-flight': flightSheet(t, t.flights.find(x => x.id === id)); break;
      case 'edit-check': checkSheet(t, t.checklist.find(x => x.id === id)); break;
      case 'del-check': {
        const c = t.checklist.find(x => x.id === id);
        confirmSheet(`'${c.text}' 항목을 지울까요?`, '삭제', () => { t.checklist = t.checklist.filter(x => x.id !== id); save(); render(); });
        break;
      }
      case 'load-template': {
        const have = new Set(t.checklist.map(c => c.text));
        const add = templateChecklist(isDomestic(t)).filter(c => !have.has(c.text));
        t.checklist.push(...add); save(); render(); toast(add.length ? `기본 항목 ${add.length}개를 추가했어요` : '기본 항목이 이미 다 있어요');
        break;
      }
    }
  });
  app.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
  });
  app.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.act === 'toggle-check' && !ro()) {
      const t = curTrip(); const c = t.checklist.find(x => x.id === el.dataset.id);
      c.done = el.checked; save(); render();
    }
  });
  app.addEventListener('submit', e => {
    if (e.target.id !== 'add-check-form') return;
    e.preventDefault();
    const t = curTrip(); const text = $('#new-check-text').value.trim(); if (!text) return;
    const due = $('#new-check-due').value;
    t.checklist.push({ id: uid(), text, cat: $('#new-check-cat').value, due: due === '' ? null : Number(due), done: false, memo: '' });
    save(); render(); $('#new-check-text')?.focus();
  });
  window.addEventListener('afterprint', () => { $('#print-root').innerHTML = ''; });

  if (state.seeded) { delete state.seeded; save(); }
  if (ui.view === 'shared') ui.view = 'home';
  render();
  const openFromHash = () => { const m = location.hash.match(/^#s=([01]\.[A-Za-z0-9_-]+)$/); if (m) openShared(m[1], location.href); };
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
