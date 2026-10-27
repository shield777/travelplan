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
    up: svg('<path d="M6 15l6-6 6 6"/>'),
    users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.3.2 4 1.8 4.5 4.5"/>'),
    cloud: svg('<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.3 9.2 4.5 4.5 0 0 0 7 18z"/>'),
    down: svg('<path d="M6 9l6 6 6-6"/>'),
    share: svg('<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>')
  };
  const TYPES = [
    { id: 'move', label: '이동' }, { id: 'sight', label: '관광' }, { id: 'food', label: '식사' },
    { id: 'stay', label: '숙소' }, { id: 'shop', label: '쇼핑' }, { id: 'etc', label: '기타' }
  ];
  const TYPE_LABEL = Object.fromEntries(TYPES.map(t => [t.id, t.label]));
  const RESV = { done: '예약완료', todo: '예약필요' }; // 일정의 예약 상태 (선택 안 하면 표시 없음)
  const PAID = { paid: '결제', unpaid: '미결제' };       // 예약 아래: 결제 상태
  const PAY_BY = { cash: '현금', card: '카드', gln: 'GLN' }; // 결제 아래: 결제 수단
  const CATS = ['서류', '예약', '돈', '통신', '짐', '집', '기타', '투어예약', '사전준비']; // 저장된 값 검사용 (예전 분류 포함)
  const PREP_CATS = ['사전준비', '기타'];
  // 예전 분류(서류·예약·돈…)는 '사전준비'로 보여 줘요. 데이터는 바꾸지 않아요
  const prepCat = c => PREP_CATS.includes(c.cat) ? c.cat : (!c.cat ? '기타' : '사전준비'); // 예전 분류(투어예약 포함)는 사전준비
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
  const EXP_CATS = [['flight', '항공'], ['stay', '숙소'], ['move', '교통'], ['food', '식사'], ['tour', '관광·투어'], ['tourbook', '투어예약'], ['shop', '쇼핑'], ['prep', '사전준비'], ['etc', '기타']];
  const EXP_LABEL = Object.fromEntries(EXP_CATS);
  // 준비 탭 항목에 연결된 비용은 그 항목의 분류(사전준비·기타)로 합산해요 (저장된 값은 그대로 두고 보여 줄 때만)
  const PREP_EXP = { '사전준비': 'prep', '기타': 'etc' };
  const prepOf = (t, id) => (id && (t.checklist || []).find(c => c.id === id)) || null;
  const expCat = (t, e) => { const c = prepOf(t, e.itemId); return c ? PREP_EXP[prepCat(c)] : e.cat; };
  const TYPE_TO_EXP = { move: 'move', sight: 'tour', food: 'food', stay: 'stay', shop: 'shop', etc: 'etc' };
  const PAYS = [['card', '카드'], ['cash', '현금'], ['gln', 'GLN'], ['etc', '기타']];
  const PAY_LABEL = Object.fromEntries(PAYS);

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
  // 휴대폰 종류에 맞게 지도 앱을 여는 주소
  // 아이폰: 앱 전용 주소 · 안드로이드: 인텐트 주소(앱이 없으면 플레이스토어로) / 구글맵은 일반 주소(앱으로 열려요) · PC: 웹 지도
  const UA = navigator.userAgent || '';
  const OS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' // 아이패드는 맥처럼 보여서 터치로 구분
    : /Android/i.test(UA) ? 'android' : 'pc';
  const NAV_APPNAME = location.hostname || 'travelplan';
  const intentUrl = (path, scheme, pkg) => `intent://${path}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=${pkg};end`;
  function mapLink(app, q) {
    const e = encodeURIComponent(q), nq = `search?query=${e}&appname=${encodeURIComponent(NAV_APPNAME)}`;
    if (app === 'google') return OS === 'ios' ? `comgooglemaps://?q=${e}` : mapUrl(q);
    if (app === 'naver') return OS === 'ios' ? `nmap://${nq}` : OS === 'android' ? intentUrl(nq, 'nmap', 'com.nhn.android.nmap') : naverUrl(q);
    if (app === 'kakao') return OS === 'ios' ? `kakaomap://search?q=${e}` : OS === 'android' ? intentUrl(`search?q=${e}`, 'kakaomap', 'net.daum.android.map') : `https://map.kakao.com/link/search/${e}`;
    if (app === 'tmap') return OS === 'ios' ? `tmap://search?name=${e}` : OS === 'android' ? intentUrl(`search?name=${e}`, 'tmap', 'com.skt.tmap.ku') : ''; // 티맵은 웹 지도가 없어요
    return '';
  }
  const appWord = OS === 'pc' ? '' : ' 앱';
  // 지도 버튼 하나 (웹 주소면 새 창으로)
  function mapBtn(app, q, label, extra = '') {
    const href = mapLink(app, q);
    if (!href) return '';
    return `<a class="btn sm" href="${esc(href)}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}${extra}>${label}</a>`;
  }
  // 일정 장소는 국내 여행이면 네이버지도, 해외 여행이면 구글맵으로 열어요
  const placeMap = (t, q) => isDomestic(t) ? { app: mapLink('naver', q), label: '네이버지도' } : { app: mapLink('google', q), label: '구글맵' };

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
      const cat = expCat(t, e);
      out.byCat[cat] = (out.byCat[cat] || 0) + k;
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
      if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.trips)) { fixDupIds(s.trips); return s; } }
    } catch (e) { /* 저장소를 못 쓰는 환경 */ }
    return { trips: [sampleTrip()], seeded: true };
  }
  // 같은 id의 여행이 둘이면 홈에서 눌러도 한쪽만 열리고 지울 때 둘 다 지워져요.
  // 가족 공유 여행을 그대로 두고, 나머지에 새 id를 줘요 (내용은 그대로)
  function fixDupIds(trips) {
    const seen = new Set();
    [...trips.filter(t => t && t.cloud), ...trips.filter(t => t && !t.cloud)].forEach(t => {
      if (seen.has(t.id)) { t.id = uid(); delete t.cloud; }
      seen.add(t.id);
    });
  }
  function save() {
    if (window.TPCloud) window.TPCloud.markDirty(state.trips);
    persist();
    if (window.TPCloud) window.TPCloud.onLocalSave(state.trips);
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('이 브라우저에서는 저장이 안 돼요. 백업 파일로 보관하세요.'); }
  }
  function loadUI() {
    try { return JSON.parse(localStorage.getItem(UI_KEY)) || { view: 'home' }; } catch (e) { return { view: 'home' }; }
  }
  function saveUI() { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) { /* 무시 */ } }
  let selItem = null; // 순서를 옮기려고 체크한 일정 id
  let sharedTrip = null; // 공유 링크로 받아서 아직 저장하지 않은 여행
  let sharedLink = '';
  let sharedLive = null; // 링크(#t=가족.여행)로 보고 있는 가족 여행 { fam, id, stop }
  const shared = () => ui.view === 'shared'; // 공유 링크로 받은 여행을 보는 중인지
  // 가족 공유 여행인데 나에게 수정 권한이 없으면 잠가요 (권한은 가족 공간을 만든 사람이 줘요)
  const locked = t => !!(t && t.cloud && window.TPCloud && window.TPCloud.canEdit(t.cloud.fam) === false);
  const ro = () => shared() || (ui.view === 'trip' && locked(state.trips.find(t => t.id === ui.tripId))); // 보기 전용인지
  const curTrip = () => shared() ? sharedTrip : state.trips.find(t => t.id === ui.tripId);
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
      stays: [
        { id: uid(), name: '난바역 근처 호텔 (예시)', address: 'Namba Station, Osaka', checkIn: d[0], checkInTime: '15:00', checkOut: d[3], checkOutTime: '11:00', confirmNo: '', phone: '', memo: '트리플룸, 조식 포함' }
      ],
      rates: { JPY: { v: 9.05, date: '2026-10-23', src: 'manual' } },
      expenses: []
    };
    const it = title => (t.items.find(i => i.title.startsWith(title)) || {}).id || '';
    const ex = (date, title, cat, amount, currency, pay, itemId, krw) => ({ id: uid(), date, title, cat, amount, currency, pay, itemId: itemId || '', krw: krw == null ? null : krw, memo: '' });
    t.expenses = [
      ex('', '항공권 왕복 3명 (예시)', 'flight', 1350000, 'KRW', 'card', t.flights[0].id),
      ex('', '난바 호텔 3박 (예시)', 'stay', 873400, 'KRW', 'card', t.stays[0].id),
      ex('', '여행자보험 3명 (예시)', 'prep', 38000, 'KRW', 'card', (list.find(c => c.text.startsWith('여행자보험')) || {}).id),
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
  // 공항 이름·도시·나라·코드로 찾기 (예: 인천, 간사이, 나트랑, 도쿄, incheon)
  const apKey = v => String(v || '').toLowerCase().replace(/\s|국제공항|공항|airport|international/g, '');
  function searchAirports(q) {
    const k = apKey(q); if (!k) return [];
    const scored = [];
    AIRPORTS.forEach(a => {
      const fields = [a.code.toLowerCase(), apKey(a.ko), apKey(a.en), apKey(a.city), apKey(a.country)];
      let sc = 0;
      if (fields[0] === k) sc = 100;
      else if (fields[1] === k || fields[3] === k) sc = 90;
      else if (fields[1].startsWith(k) || fields[3].startsWith(k)) sc = 70;
      else if (fields[1].includes(k) || fields[2].includes(k) || fields[3].includes(k)) sc = 50;
      else if (fields[4].startsWith(k)) sc = 20;
      if (sc) scored.push([sc, a]);
    });
    return scored.sort((x, y) => y[0] - x[0]).map(x => x[1]);
  }
  // 입력 글자를 공항 코드로: 하나로 정해지면 코드, 여러 개면 null(골라야 함), 없으면 ''
  function resolveAirport(q) {
    const t = String(q || '').trim(); if (!t) return '';
    const exact = AIRPORTS.find(a => a.ko === t || a.code === t.toUpperCase());
    if (exact) return exact.code;
    const list = searchAirports(t);
    if (list.length === 1) return list[0].code;
    if (list.length > 1) { const top = list.filter(a => apKey(a.city) === apKey(t) || apKey(a.ko) === apKey(t)); return top.length === 1 ? top[0].code : null; }
    return '';
  }
  const apLabel = (code, name) => { const a = findAp(code); return a ? a.ko : (name || code || ''); };

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
    if (shared() && trip) { renderTrip(trip); return; }
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
          ${window.TPCloud ? `<button class="btn icon sm fam-btn ${famDot()}" data-act="family" aria-label="멤버와 함께 쓰기">${ICON.users}</button>` : ''}
          <button class="btn sm" data-act="backup">불러오기</button>
          <button class="btn primary sm" data-act="new-trip">${ICON.plus}새 여행</button>
        </header>
        ${trips.some(x => x.example) ? `<div class="example-note"><span>예시 여행이 들어 있어요. 둘러본 뒤 지워도 돼요.</span><button class="btn sm" data-act="del-example">${ICON.trash}예시 지우기</button></div>` : ''}
        ${trips.length === 0 ? `<div class="empty">아직 여행이 없어요.<br>오른쪽 위 <b>새 여행</b>으로 연도·나라·여행지를 입력해 시작하세요.</div>` : ''}
        ${years.map(y => `
          <section class="year-group">
            <div class="year-head">${esc(y)}<span>${byYear[y].length}개 여행</span></div>
            ${byYear[y].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')).map(tripCard).join('')}
          </section>`).join('')}
        <div class="app-share"><button class="btn sm" data-act="share-app">${ICON.share}이 앱을 지인에게 보내기</button></div>
      </div>`;
  }

  function tripCard(t) {
    const dd = dday(t);
    const total = (t.checklist || []).length, done = (t.checklist || []).filter(c => c.done).length;
    const routes = sortFlights(t.flights || []).map(f => `<span class="route-chip">${esc(f.dep || '?')}→${esc(f.arr || '?')}</span>`).join('');
    return `
      <div class="trip-wrap">
      <button class="trip-card" data-act="open-trip" data-id="${t.id}">
        <div>
          <div class="crumb">${esc(t.year || '')} · <b>${esc(t.country || '나라 미정')}</b>${t.example ? '<span class="example-badge">예시</span>' : ''}${t.receivedAt ? '<span class="recv-badge">공유받음</span>' : ''}${t.cloud ? '<span class="recv-badge">공유 중</span>' : ''}</div>
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
      </button>
      ${locked(t) ? '' : `<button class="btn sm ghost del-trip" data-act="del-trip" data-id="${t.id}" aria-label="${esc(tripName(t))} 삭제">${ICON.trash}</button>`}
      </div>`;
  }

  function renderTrip(t) {
    const dd = dday(t);
    const tab = ui.tab || 'plan';
    const total = (t.checklist || []).length, done = (t.checklist || []).filter(c => c.done).length;
    app.innerHTML = `
      <div class="wrap">
        <header class="topbar">
          <button class="btn icon ghost" data-act="${shared() ? 'close-shared' : 'home'}" aria-label="${shared() ? '닫기' : '여행 목록'}">${ICON.back}</button>
          <div class="grow"></div>
          <button class="btn sm" data-act="pdf">${ICON.doc}PDF</button>
          ${shared()
            ? (sharedLive ? `<button class="btn sm" data-act="family">${ICON.users}멤버 로그인</button>` : `<button class="btn primary sm" data-act="save-shared">${ICON.save}내 앱에 저장</button>`)
            : `<button class="btn sm" data-act="share">${ICON.share}공유</button>${ro() ? '' : `<button class="btn sm" data-act="edit-trip">${ICON.edit}여행 정보</button>`}`}
        </header>
        <section class="trip-head">
          <div>
            <div class="crumb">${esc(t.year || '')} · ${esc(t.country || '나라 미정')}${t.example ? '<span class="example-badge">예시</span>' : ''}</div>
            <h1>${esc(t.city || '여행지 미정')}</h1>
            <div class="dates"><span class="num">${fmtD(t.startDate)} – ${fmtD(t.endDate)}</span> · ${nightsLabel(t)}${t.subtitle ? ' · ' + esc(t.subtitle) : ''}</div>
            ${t.cloud && !shared() ? `<div class="sync-line ${syncInfo(t).cls}" data-act="family" role="button" tabindex="0">${ICON.cloud}${esc(syncInfo(t).text)}</div>` : ''}
          </div>
          <span class="dchip ${dd.cls}">${dd.text}</span>
        </section>
        ${shared() && sharedLive ? `<div class="shared-banner">
          <b>공유받은 일정 · 보기 전용</b>
          <span>보낸 사람이 일정을 바꾸면 <b>자동으로 반영</b>돼요. 수정 권한을 받은 멤버는 <b>멤버 로그인</b>을 하면 고칠 수 있어요.</span>
        </div>` : ''}
        ${shared() && !sharedLive ? `<div class="shared-banner">
          <b>공유받은 일정 · 보기 전용${t.shareMeta && t.shareMeta.at ? ` · ${fmtD(t.shareMeta.at)}에 보냄` : ''}</b>
          <span>보낸 사람이 일정을 바꾸면 새 링크를 다시 받아야 해요.${standalone() ? '' : ' 홈 화면의 여행일정 앱에 넣으려면 링크를 복사한 뒤, 앱의 <b>불러오기</b>에 붙여넣으세요.'}</span>
          ${standalone() || !sharedLink ? '' : `<button class="btn sm" data-act="copy-shared">링크 복사</button>`}
        </div>` : ''}
        <nav class="tabs" role="tablist">
          <button role="tab" aria-selected="${tab === 'plan'}" data-act="tab" data-tab="plan">일정</button>
          <button role="tab" aria-selected="${tab === 'flights'}" data-act="tab" data-tab="flights">항공<span class="count">${(t.flights || []).length || ''}</span></button>
          <button role="tab" aria-selected="${tab === 'stay'}" data-act="tab" data-tab="stay">숙박<span class="count">${(t.stays || []).length || ''}</span></button>
          <button role="tab" aria-selected="${tab === 'check'}" data-act="tab" data-tab="check">준비<span class="count">${done}/${total}</span></button>
          <button role="tab" aria-selected="${tab === 'money'}" data-act="tab" data-tab="money">경비</button>
        </nav>
        <div id="tab-body">${tab === 'flights' ? flightsTab(t) : tab === 'stay' ? stayTab(t) : tab === 'check' ? checkTab(t) : tab === 'money' ? moneyTab(t) : planTab(t)}</div>
      </div>
      ${moveBar(t, tab)}`;
    document.body.classList.toggle('has-move-bar', !!app.querySelector('.move-bar'));
  }

  // 체크한 일정을 같은 날 안에서 위아래로 옮기는 아래 막대
  function moveBar(t, tab) {
    const it = selItem && tab === 'plan' && !ro() ? (t.items || []).find(x => x.id === selItem) : null;
    if (!it) { selItem = null; return ''; }
    const same = dayEntries(t, it.date).filter(e => e.kind === 'item').map(e => e.i);
    const k = same.indexOf(it);
    return `<div class="move-bar" role="toolbar" aria-label="일정 순서 옮기기">
      <div class="mb-inner">
        <div class="mb-info"><b>${esc(it.title)}</b><span>${k + 1}/${same.length}번째 · 옮기면 시간도 서로 바뀌어요</span></div>
        <button class="btn" data-act="move-sel" data-dir="-1" ${k > 0 ? '' : 'disabled'}>${ICON.up}위로</button>
        <button class="btn" data-act="move-sel" data-dir="1" ${k < same.length - 1 ? '' : 'disabled'}>${ICON.down}아래로</button>
        <button class="btn primary" data-act="sel-done">완료</button>
      </div>
    </div>`;
  }
  // 같은 날 바로 앞·뒤 일정과 자리를 바꿔요. 시간순 정렬이라 시간도 함께 맞바꿔야 순서가 유지돼요
  function moveItem(t, id, dir) {
    const it = t.items.find(x => x.id === id); if (!it) return false;
    const same = dayEntries(t, it.date).filter(e => e.kind === 'item').map(e => e.i);
    const other = same[same.indexOf(it) + dir];
    if (!other) return false;
    [it.time, other.time] = [other.time, it.time];
    [it.endTime, other.endTime] = [other.endTime, it.endTime];
    const a = t.items.indexOf(it), b = t.items.indexOf(other); // 시간이 없는 일정은 목록 순서로 정렬돼서 자리도 바꿔요
    [t.items[a], t.items[b]] = [t.items[b], t.items[a]];
    return true;
  }

  // ── 일정 탭
  function dayEntries(t, date) {
    const items = (t.items || []).filter(i => i.date === date).map(i => ({ kind: 'item', sort: i.time || '99:99', i }));
    const fl = (t.flights || []).filter(f => f.depDate === date).map(f => ({ kind: 'flight', sort: f.depTime || '99:99', f }));
    const arr = (t.flights || []).filter(f => f.arrDate && f.arrDate !== f.depDate && f.arrDate === date).map(f => ({ kind: 'arrive', sort: f.arrTime || '00:00', f }));
    const st = [];
    (t.stays || []).forEach(s => {
      if (s.checkIn === date) st.push({ kind: 'checkin', sort: s.checkInTime || '15:00', s });
      if (s.checkOut === date) st.push({ kind: 'checkout', sort: s.checkOutTime || '11:00', s });
    });
    return [...items, ...fl, ...arr, ...st].sort((a, b) => a.sort.localeCompare(b.sort));
  }

  // 지금 시각에 진행 중인 일정 (끝 시간이 있으면 끝날 때까지, 없으면 다음 일정이 시작할 때까지).
  // 진행 중인 게 없으면 다음 일정, 다 끝났으면 마지막 일정
  function currentRow(dayEl) {
    const d = new Date(), hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const rows = [...dayEl.querySelectorAll('.tl-item[data-t]')].filter(r => r.dataset.t);
    for (let k = 0; k < rows.length; k++) {
      const start = rows[k].dataset.t, end = rows[k].dataset.e || (rows[k + 1] ? rows[k + 1].dataset.t : '');
      if (start > hm) return rows[k];            // 아직 시작 전인 첫 일정
      if (!end || end > hm) return rows[k];      // 진행 중
    }
    return rows[rows.length - 1] || null;
  }
  // 여행 중이면 일정 탭을 열 때 오늘 일차 제목 바로 아래에 진행 중인 일정이 오게 해요
  // (일차 제목은 위에 붙어 있어서, 앞의 일정을 지나쳐도 몇 일차인지 보여요)
  function jumpToToday() {
    if ((ui.view !== 'trip' && ui.view !== 'shared') || (ui.tab || 'plan') !== 'plan') return false;
    const el = $('#day-' + todayStr()); if (!el) return false;
    el.scrollIntoView({ block: 'start' });
    const tabs = app.querySelector('.tabs'), head = el.querySelector('.day-head');
    if (!tabs || !head) return true;
    const row = currentRow(el);
    const first = el.querySelector('.tl-item[data-t]:not([data-t=""])');
    if (!row || row === first) window.scrollBy(0, el.getBoundingClientRect().top - tabs.getBoundingClientRect().bottom - 6);
    else window.scrollBy(0, row.getBoundingClientRect().top - tabs.getBoundingClientRect().bottom - head.offsetHeight - 8);
    return true;
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
    const last = tripDays(t).length - 1;
    return `
      <section class="day" id="day-${d}">
        <div class="day-head">
          <div class="no">${i + 1}<small>일차</small></div>
          <div class="info">
            <div class="date">${fmtDLong(d)}${d === today ? '<span class="today-tag">오늘</span>' : ''}</div>
            ${ro() ? (title ? `<div class="title">${esc(title)}</div>` : '')
              : `<div class="title ${title ? '' : 'placeholder'}" data-act="day-title" data-date="${d}" role="button" tabindex="0">${title ? esc(title) : '이날의 제목'}</div>`}
          </div>
          ${money.byDate[d] ? `<div class="day-spent"><span>이날 경비</span><b class="num">${fmtNum(money.byDate[d])}원</b></div>` : ''}
          ${ro() || last < 1 ? '' : `<div class="day-move">
            <button class="btn icon sm ghost" data-act="move-day" data-date="${d}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${i + 1}일차를 앞날로">${ICON.up}</button>
            <button class="btn icon sm ghost" data-act="move-day" data-date="${d}" data-dir="1" ${i === last ? 'disabled' : ''} aria-label="${i + 1}일차를 뒷날로">${ICON.down}</button>
          </div>`}
        </div>
        ${entries.length ? `<ul class="timeline">${(() => {
          const ids = entries.filter(e => e.kind === 'item').map(e => e.i.id); // 같은 날 일정끼리만 순서를 바꿔요
          return entries.map(e => e.kind === 'item' ? itemRow(e.i, false, money, t, { up: ids.indexOf(e.i.id) > 0, down: ids.indexOf(e.i.id) < ids.length - 1 }) : e.s ? stayRow(e.s, e.kind) : flightRow(e.f, e.kind === 'arrive')).join('');
        })()}</ul>` : ''}
        ${ro() ? (entries.length ? '' : '<div class="note-small" style="padding-top:8px">일정 없음</div>') : `<div class="add-row" ${entries.length ? '' : 'style="padding-left:0"'}>
          <button class="btn sm" data-act="add-item" data-date="${d}">${ICON.plus}일정 추가</button>
        </div>`}
      </section>`;
  }

  // 두 날의 일정·제목·경비를 통째로 맞바꿔요 (항공편·숙소는 예약된 날짜라 그대로 둬요)
  function swapDays(t, a, b) {
    const flip = o => { if (o.date === a) o.date = b; else if (o.date === b) o.date = a; };
    (t.items || []).forEach(flip);
    (t.expenses || []).forEach(flip); // 그날 날짜로 넣은 경비도 같이 옮겨요
    t.dayTitles = t.dayTitles || {};
    const ta = t.dayTitles[a], tb = t.dayTitles[b];
    if (tb) t.dayTitles[a] = tb; else delete t.dayTitles[a];
    if (ta) t.dayTitles[b] = ta; else delete t.dayTitles[b];
  }

  // 예약 상태 · 결제 상태 · 결제 수단 표시 (예: [예약완료] [결제 · 카드])
  function resvBadges(i) {
    if (!RESV[i.resv]) return '';
    const pay = PAID[i.paid] ? `${PAID[i.paid]}${PAY_BY[i.payBy] ? ' · ' + PAY_BY[i.payBy] : ''}` : '';
    return `<span class="resv ${i.resv}">${RESV[i.resv]}</span>${pay ? `<span class="resv ${i.paid}">${pay}</span>` : ''}`;
  }
  const resvText = i => !RESV[i.resv] ? '' : [RESV[i.resv], PAID[i.paid] ? PAID[i.paid] + (PAY_BY[i.payBy] ? ' · ' + PAY_BY[i.payBy] : '') : ''].filter(Boolean).join(' / ');
  function itemRow(i, showDate, money, t, move) {
    const map = i.place ? placeMap(t, i.place) : null;
    const sp = money && money.byItem[i.id];
    const foreign = sp ? Object.entries(sp.cur).filter(([c]) => c !== 'KRW').map(([c, a]) => fmtMoney(a, c)).join(' + ') : '';
    return `
      <li class="tl-item ${selItem === i.id ? 'selected' : ''}" id="it-${i.id}" data-t="${esc(i.time || '')}" data-e="${esc(i.endTime || '')}">
        <div class="tl-time">${esc(i.time || '—')}${i.endTime ? `<small>~${esc(i.endTime)}</small>` : ''}${showDate ? `<small>${fmtD(i.date)}</small>` : ''}
          ${move && !ro() && (move.up || move.down) ? `<button class="sel-box ${selItem === i.id ? 'on' : ''}" data-act="sel-item" data-id="${i.id}" aria-pressed="${selItem === i.id}" aria-label="${esc(i.title)} 순서 옮기기 선택"></button>` : ''}</div>
        <div class="tl-rail"><span class="tl-dot"></span></div>
        <div class="tl-card" ${ro() ? '' : `data-act="edit-item" data-id="${i.id}" role="button" tabindex="0"`}>
          <div class="tl-type">${ICON[i.type] || ICON.etc}${TYPE_LABEL[i.type] || '기타'}${resvBadges(i)}</div>
          <div class="tl-title">${esc(i.title)}</div>
          ${map ? `<div class="tl-place"><a href="${esc(map.app)}" data-stop="1"${/^https?:/.test(map.app) ? ' target="_blank" rel="noopener"' : ''}>${esc(i.place)} ↗</a><span class="map-tag">${map.label}${appWord}</span></div>` : ''}
          ${i.memo ? `<div class="tl-memo">${esc(i.memo)}</div>` : ''}
          ${i.cost ? `<div class="tl-cost">${esc(i.cost)}</div>` : ''}
          ${sp ? `<div class="tl-spent num">${fmtNum(sp.krw)}원${foreign ? ` <small>(${esc(foreign)})</small>` : ''}</div>` : ''}
          ${ro() ? '' : `<div class="card-acts"><button class="btn sm ghost del-item" data-act="del-item" data-id="${i.id}" aria-label="${esc(i.title)} 삭제">${ICON.trash}</button></div>`}
        </div>
      </li>`;
  }

  function stayRow(s, kind) {
    const inn = kind === 'checkin';
    return `
      <li class="tl-item stay" data-t="${esc((inn ? s.checkInTime : s.checkOutTime) || (inn ? '15:00' : '11:00'))}">
        <div class="tl-time">${esc((inn ? s.checkInTime : s.checkOutTime) || (inn ? '15:00' : '11:00'))}</div>
        <div class="tl-rail"><span class="tl-dot"></span></div>
        <div class="tl-card stay-card" data-act="goto-stay" data-id="${s.id}" role="button" tabindex="0">
          <div class="tl-type">${ICON.stay}${inn ? '체크인' : '체크아웃'}</div>
          <div class="tl-title">${esc(s.name)}</div>
          ${inn && s.checkOut ? `<div class="tl-memo">${nightsBetween(s)}박 · ${fmtD(s.checkOut)} 체크아웃</div>` : ''}
        </div>
      </li>`;
  }
  const nightsBetween = s => (s.checkIn && s.checkOut ? Math.max(0, diffDays(s.checkIn, s.checkOut)) : 0);

  function flightRow(f, arriveOnly) {
    const dt = terminalOf(f, 'dep');
    const sub = arriveOnly
      ? `${esc(f.flightNo)} 도착 · ${esc(apName(f.arr, f.arrName))}`
      : [airlineName(f.flightNo), dt.v ? `${dt.v}${dt.est ? '(추정)' : ''}` : '', f.counter ? `카운터 ${f.counter}` : ''].filter(Boolean).map(esc).join(' · ');
    return `
      <li class="tl-item flight" data-t="${esc((arriveOnly ? f.arrTime : f.depTime) || '')}" data-e="${esc(arriveOnly ? '' : (!f.arrDate || f.arrDate === f.depDate ? f.arrTime || '' : '23:59'))}">
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
      <div class="section-title"><h2>항공편${sectionTotal(t, 'flight', fs)}</h2>${ro() ? '' : `<button class="btn primary sm" data-act="add-flight">${ICON.plus}항공편 추가</button>`}</div>
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
          <div><dt>예약번호</dt><dd>${esc(f.pnr || '-')}</dd></div>
        </dl>
        ${f.memo ? `<div class="fl-memo">${esc(f.memo)}</div>` : ''}
        ${costBox(t, f.id)}
        <details class="fl-more">
          <summary>공항 정보 · 주차장 · 실시간 확인</summary>
          ${liveLinks(f, fno, da)}
          <div class="airport-pair">
            ${airportPanel(f, da, 'dep', dt, seen)}
            ${airportPanel(f, aa, 'arr', at, seen)}
          </div>
        </details>
        ${ro() ? '' : `<div class="flight-actions"><button class="btn sm" data-act="edit-flight" data-id="${f.id}">${ICON.edit}수정</button></div>`}
      </article>`;
  }

  // 주차장: 국내 공항은 카카오맵·티맵·네이버 앱으로 바로 열기, 해외는 지도 링크
  function navButtons(q) {
    return `<div class="nav-btns">
      ${mapBtn('kakao', q, '카카오맵')}
      ${mapBtn('tmap', q, '티맵', ` data-copy="${esc(q)}"`)}
      ${mapBtn('naver', q, '네이버')}
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

  // 항공편·숙소에 연결된 비용
  // 항공·숙박 탭 제목 옆 합계: 그 분류의 비용 + 항공편·숙소에 연결된 비용
  function sectionTotal(t, cat, refs) {
    const ids = new Set(refs.map(r => r.id));
    const all = (t.expenses || []).filter(e => e.cat === cat || ids.has(e.itemId));
    if (!all.length) return '';
    return `<span class="h2-cost num">${fmtNum(all.reduce((a, e) => a + (krwOf(t, e) || 0), 0))}원</span>`;
  }

  function costBox(t, refId) {
    const list = (t.expenses || []).filter(e => e.itemId === refId);
    if (!list.length) return '';
    const krw = list.reduce((a, e) => a + (krwOf(t, e) || 0), 0);
    const foreign = list.filter(e => e.currency !== 'KRW').map(e => fmtMoney(e.amount, e.currency)).join(' + ');
    return `<div class="cost-line"><span>비용</span><b class="num">${fmtNum(krw)}원</b>${foreign ? `<small>(${esc(foreign)})</small>` : ''}${list.some(e => krwOf(t, e) == null) ? '<small class="miss">환율 없음</small>' : ''}</div>`;
  }
  // 비용이 어느 탭에서 들어왔는지: { kind: 일정·항공·숙박·준비, tab, title }
  const linkInfo = (t, id) => {
    if (!id) return null;
    const i = (t.items || []).find(x => x.id === id); if (i) return { kind: '일정', tab: 'plan', title: i.title };
    const f = (t.flights || []).find(x => x.id === id); if (f) return { kind: '항공', tab: 'flights', title: `${f.flightNo || '항공'} ${f.dep || ''}→${f.arr || ''}` };
    const s = (t.stays || []).find(x => x.id === id); if (s) return { kind: '숙박', tab: 'stay', title: s.name };
    const c = (t.checklist || []).find(x => x.id === id); if (c) return { kind: '준비', tab: 'check', title: c.text };
    return null;
  };
  const linkTitle = (t, id) => (linkInfo(t, id) || {}).title || '';
  const shortText = v => String(v || '').replace(/\s*\(.*\)\s*$/, '').slice(0, 40);

  // ── 숙박 탭
  const gmapEmbed = q => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=ko&z=15&output=embed`;
  function stayTab(t) {
    const list = [...(t.stays || [])].sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));
    return `
      <div class="section-title"><h2>숙소${sectionTotal(t, 'stay', list)}</h2>${ro() ? '' : `<button class="btn primary sm" data-act="add-stay">${ICON.plus}숙소 추가</button>`}</div>
      ${list.length ? '' : `<div class="empty">등록된 숙소가 없어요.${ro() ? '' : '<br>숙소를 추가하면 체크인·체크아웃이 일정에 자동으로 들어가요.'}</div>`}
      ${list.map(s => stayCard(t, s)).join('')}`;
  }
  function stayCard(t, s) {
    const q = s.address || s.name;
    const n = nightsBetween(s);
    return `
      <article class="stay-box" id="st-${s.id}">
        <div class="stay-top">
          <div class="stay-name"><span class="lbl">${ICON.stay}숙소</span><h3>${esc(s.name)}</h3>${s.address ? `<div class="addr">${esc(s.address)}</div>` : ''}</div>
          ${n ? `<span class="nights num">${n}박</span>` : ''}
        </div>
        <dl class="stay-dates">
          <div><dt>체크인</dt><dd class="num">${s.checkIn ? fmtD(s.checkIn) : '-'} ${esc(s.checkInTime || '')}</dd></div>
          <div><dt>체크아웃</dt><dd class="num">${s.checkOut ? fmtD(s.checkOut) : '-'} ${esc(s.checkOutTime || '')}</dd></div>
        </dl>
        ${q ? `<div class="map-wrap">${IN_FRAME
          ? `<div class="map-ph">미리보기 화면에서는 지도를 띄울 수 없어요. 실제 앱 주소에서는 여기에 구글맵이 나와요.</div>`
          : `<iframe src="${gmapEmbed(q)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${esc(s.name)} 위치"></iframe>`}</div>
          <div class="nav-btns stay-nav">
            ${mapBtn('google', q, '구글맵' + appWord)}
            ${isDomestic(t) ? mapBtn('naver', q, '네이버지도') + mapBtn('kakao', q, '카카오맵') : ''}
          </div>` : ''}
        ${s.confirmNo || s.phone || s.memo ? `<dl class="stay-info">
          ${s.confirmNo ? `<div><dt>예약번호</dt><dd class="num">${esc(s.confirmNo)}</dd></div>` : ''}
          ${s.phone ? `<div><dt>전화</dt><dd class="num">${esc(s.phone)}</dd></div>` : ''}
          ${s.memo ? `<div class="wide"><dt>메모</dt><dd>${esc(s.memo)}</dd></div>` : ''}
        </dl>` : ''}
        ${costBox(t, s.id)}
        ${ro() ? '' : `<div class="flight-actions"><button class="btn sm" data-act="edit-stay" data-id="${s.id}">${ICON.edit}수정</button></div>`}
      </article>`;
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
      const li = linkInfo(t, e.itemId);
      return `<li class="exp-row" ${ro() ? '' : `data-act="edit-exp" data-id="${e.id}" role="button" tabindex="0"`}>
        <div class="ex-main"><div class="ex-title">${esc(e.title || EXP_LABEL[expCat(t, e)] || '경비')}</div>
          <div class="ex-sub">${li ? `<span class="src-tag" data-act="tab" data-tab="${li.tab}" title="${esc(li.kind)} 탭으로">${esc(li.kind)}</span>` : ''}${esc(EXP_LABEL[expCat(t, e)] || '기타')} · ${esc(PAY_LABEL[e.pay] || '')}${li ? ` · ${esc(shortText(li.title))}` : ''}${e.memo ? ` · ${esc(e.memo)}` : ''}</div></div>
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
    const ids = new Set(list.map(c => c.id));
    const prepCost = (t.expenses || []).filter(e => ids.has(e.itemId)).reduce((a, e) => a + (krwOf(t, e) || 0), 0);
    return `
      <div class="progress-card">
        <div class="row"><span class="big num">${done}<small>/${list.length}</small></span><span class="grow" style="flex:1">완료 · ${pct}%</span><span class="dchip ${dd.cls}">${dd.text}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        ${prepCost ? `<div class="note-small">준비 비용 <b class="num" style="color:var(--ink)">${fmtNum(prepCost)}원</b> · 경비 탭 합계에 들어가 있어요</div>` : ''}
      </div>
      ${list.length === 0 ? `<div class="empty">${ro() ? '함께 보낸 준비 항목이 없어요.' : '준비할 일을 아래에 추가하세요. 비용이 드는 일은 금액도 같이 넣으면 경비 탭에 들어가요.'}</div>` : ''}
      ${PREP_CATS.map(cat => {
        const items = list.filter(x => prepCat(x) === cat);
        return items.length ? `<section class="cat"><h3>${cat} <span class="num">${items.filter(x => x.done).length}/${items.length}</span></h3><ul class="check-list">${items.map(x => checkRow(t, x)).join('')}</ul></section>` : '';
      }).join('')}
      ${ro() ? '' : `<form class="add-check" id="add-check-form">
        <input type="text" id="new-check-text" placeholder="새 할 일 (예: 여행자보험 가입)" aria-label="새 할 일" required>
        <select id="new-check-cat" aria-label="분류">${PREP_CATS.map(c => `<option ${c === (PREP_CATS.includes(ui.lastPrepCat) ? ui.lastPrepCat : '사전준비') ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <div class="won-input"><input type="text" id="new-check-cost" inputmode="numeric" placeholder="비용 (선택)" aria-label="비용" autocomplete="off"><span>원</span></div>
        <button class="btn primary" type="submit">${ICON.plus}추가</button>
      </form>
`}`;
  }
  function checkRow(t, c) {
    const costs = (t.expenses || []).filter(e => e.itemId === c.id);
    const krw = costs.reduce((a, e) => a + (krwOf(t, e) || 0), 0);
    return `
      <li class="check-item ${c.done ? 'done' : ''}">
        <label class="box"><input type="checkbox" data-act="toggle-check" data-id="${c.id}" ${c.done ? 'checked' : ''} ${ro() ? 'disabled' : ''} aria-label="${esc(c.text)} 완료"></label>
        <div class="txt" ${ro() ? '' : `data-act="edit-check" data-id="${c.id}" role="button" tabindex="0"`}>
          <div class="t">${esc(c.text)}</div>
          ${c.memo ? `<div class="memo">${esc(c.memo)}</div>` : ''}
          ${costs.length ? `<div class="check-cost num">${fmtNum(krw)}원${costs.some(e => e.currency !== 'KRW') ? ` <small>(${esc(costs.map(e => fmtMoney(e.amount, e.currency)).join(' + '))})</small>` : ''}</div>` : ''}
        </div>
        ${ro() ? '' : `<div class="check-acts"><button class="btn icon ghost sm del" data-act="del-check" data-id="${c.id}" aria-label="삭제">${ICON.trash}</button></div>`}
      </li>`;
  }

  // ───────── 시트(입력창) ─────────
  const sheetRoot = $('#sheet-root');
  let sheetRefresh = null; // 열려 있는 창을 다시 그리는 함수 (가족 창)
  let sheetClose = null;
  // 창이 열려 있는 동안 뒤 화면을 그 자리에 고정해요 (아이폰에서 창 안을 스크롤하면 뒤 화면까지 같이 내려가는 문제)
  let sheetY = null;
  function lockPage() {
    if (sheetY !== null) return; // 창에서 창으로 바뀔 때는 처음 자리를 그대로 기억
    sheetY = window.scrollY;
    document.body.style.top = `-${sheetY}px`;
    document.body.classList.add('sheet-open');
  }
  function unlockPage() {
    if (sheetY === null) return;
    const y = sheetY; sheetY = null;
    document.body.classList.remove('sheet-open');
    document.body.style.top = '';
    window.scrollTo(0, y);
  }
  function openSheet(title, body, foot, onMount) {
    lockPage();
    sheetRoot.innerHTML = `
      <div class="sheet-scrim" data-scrim="1">
        <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <div class="sheet-head"><h2>${esc(title)}</h2><button class="btn icon ghost" data-close="1" aria-label="닫기">${ICON.close}</button></div>
          <form class="form" id="sheet-form" novalidate>${body}<div class="sheet-foot">${foot}</div></form>
        </div>
      </div>`;
    const root = sheetRoot.firstElementChild;
    const close = () => { sheetRoot.innerHTML = ''; unlockPage(); document.removeEventListener('keydown', onKey); sheetClose = null; sheetRefresh = null; setTimeout(flushRemote, 0); };
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
      <div class="ap-preview" id="f-name-preview"></div>
      <div class="ap-preview" id="f-err" style="color:var(--warn)"></div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="f-del">${ICON.trash}여행 삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        const upd = () => { const y = val(root, 'f-year') || val(root, 'f-start').slice(0, 4); $('#f-name-preview', root).innerHTML = `여행 이름: <b>${esc([y, val(root, 'f-country'), val(root, 'f-city')].filter(Boolean).join(' · ') || '-')}</b>`; };
        root.addEventListener('input', upd); upd();
        $('#f-start', root).addEventListener('change', () => { const s = val(root, 'f-start'), e = $('#f-end', root); if (s && (!e.value || e.value < s)) e.value = s; });
        // 창을 바꾸지 않고 같은 버튼을 한 번 더 눌러 확인해요 (아이폰에서 창 전환 중 터치가 사라지는 문제 방지)
        let armed = false, armTimer;
        $('#f-del', root)?.addEventListener('click', ev => {
          ev.preventDefault();
          const btn = ev.currentTarget;
          if (!armed) {
            armed = true;
            btn.classList.add('armed'); btn.textContent = '한 번 더 누르면 삭제';
            $('#f-err', root).textContent = `'${tripName(t)}'의 일정·항공편·숙소·체크리스트·경비가 모두 지워져요.${t.cloud ? ' 함께 쓰는 여행이라 멤버 모두의 앱에서 지워져요.' : ''}`;
            clearTimeout(armTimer);
            armTimer = setTimeout(() => { armed = false; btn.classList.remove('armed'); btn.innerHTML = `${ICON.trash}여행 삭제`; $('#f-err', root).textContent = ''; }, 5000);
            return;
          }
          clearTimeout(armTimer);
          deleteTrips(x => x === t); close(); toast('여행을 삭제했어요');
        });
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          const country = val(root, 'f-country'), city = val(root, 'f-city'), s = val(root, 'f-start'), en = val(root, 'f-end');
          if (!country || !city || !s || !en) { $('#f-err', root).textContent = '나라, 여행지, 출발일, 돌아오는 날을 모두 입력해 주세요.'; return; }
          if (en < s) { $('#f-err', root).textContent = '돌아오는 날이 출발일보다 빨라요.'; return; }
          const data = { year: Number(val(root, 'f-year')) || Number(s.slice(0, 4)), country, city, subtitle: val(root, 'f-sub'), startDate: s, endDate: en, memo: val(root, 'f-memo'), people: Number(val(root, 'f-people')) || '', currency: val(root, 'f-cur') };
          if (isNew) {
            const nt = { id: uid(), ...data, dayTitles: {}, items: [], flights: [], stays: [], expenses: [], rates: {}, checklist: [] };
            state.trips.push(nt); ui.tripId = nt.id; ui.view = 'trip'; ui.tab = 'plan';
          } else {
            Object.assign(t, data);
          }
          save(); close(); render(); toast('저장했어요');
        });
      });
  }

  function deleteTrips(match) {
    if (window.TPCloud) state.trips.filter(match).forEach(x => window.TPCloud.removeTrip(x));
    state.trips = state.trips.filter(x => !match(x));
    if (!state.trips.some(x => x.id === ui.tripId)) { ui.tripId = null; ui.view = 'home'; }
    save(); render(); window.scrollTo(0, 0);
  }

  // 일정 항목
  function itemSheet(t, item, date) {
    const isNew = !item;
    item = item || { date, time: '', endTime: '', type: 'sight', title: '', place: '', memo: '', cost: '' };
    const days = tripDays(t);
    openSheet(isNew ? '일정 추가' : '일정 수정', `
      <div class="field"><span>종류</span><div class="type-pick">${TYPES.map(ty => `<label><input type="radio" name="f-type" value="${ty.id}" ${item.type === ty.id ? 'checked' : ''}>${ICON[ty.id]}<span>${ty.label}</span></label>`).join('')}</div></div>
      <label class="field"><span>무엇을 하나요</span><input type="text" id="f-title" value="${esc(item.title)}" placeholder="예: 유니버설 스튜디오" required></label>
      <div class="grid2 date-row">
        <label class="field"><span>날짜</span><select id="f-date">${days.map((d, i) => `<option value="${d}" ${d === item.date ? 'selected' : ''}>${i + 1}일차 ${fmtD(d)}</option>`).join('')}${days.includes(item.date) ? '' : `<option value="${esc(item.date)}" selected>${fmtD(item.date)}</option>`}</select></label>
        <label class="check-inline tp-mode"><input type="checkbox" id="f-tp-mode"> 분단위 입력</label>
      </div>
      <div class="grid2 time-row">
        <div class="field"><span>시작</span>${timePick('f-time', item.time)}</div>
        <div class="field"><span>끝 <span class="hint">(선택)</span></span>${timePick('f-end', item.endTime)}</div>
      </div>
      <div class="field"><span>예약 <span class="hint">(선택) 투어·식당처럼 예약이 필요한 일정</span></span><div class="type-pick resv-pick">
        ${[['', '선택 안 함'], ['done', '예약완료'], ['todo', '예약필요']].map(([v, l]) => `<label><input type="radio" name="f-resv" value="${v}" ${(item.resv || '') === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <div class="sub-pick" id="f-paid-wrap" ${item.resv ? '' : 'hidden'}><span class="sub-l">결제</span><div class="type-pick resv-pick">
          ${[['', '선택 안 함'], ['paid', '결제'], ['unpaid', '미결제']].map(([v, l]) => `<label><input type="radio" name="f-paid" value="${v}" ${(item.paid || '') === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
        <div class="sub-pick" id="f-payby-wrap" ${item.resv && item.paid ? '' : 'hidden'}><span class="sub-l">결제 수단</span><div class="type-pick resv-pick">
          ${[['', '선택 안 함'], ['cash', '현금'], ['card', '카드'], ['gln', 'GLN']].map(([v, l]) => `<label><input type="radio" name="f-payby" value="${v}" ${(item.payBy || '') === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div></div>
      <label class="field"><span>장소 · 주소 <span class="hint">${isDomestic(t) ? '국내 여행이라 네이버지도 앱으로 열려요' : '해외 여행이라 구글맵 앱으로 열려요'}</span></span><input type="text" id="f-place" value="${esc(item.place)}" placeholder="${isDomestic(t) ? '예: 제주 애월읍 애월해안로 272' : '예: Kiyomizu-dera 또는 현지 주소'}"></label>
      <label class="field"><span>메모</span><textarea id="f-memo">${esc(item.memo)}</textarea></label>
      ${item.cost ? `<label class="field"><span>비용 메모 <span class="hint">(이전 방식 · 합계에는 안 들어가요)</span></span><input type="text" id="f-cost" value="${esc(item.cost)}"></label>` : ''}
      ${itemCostHtml(t, isNew ? '' : item.id)}
      <div class="ap-preview" id="f-err" style="color:var(--warn)"></div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="f-del">${ICON.trash}삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        $('#f-del', root)?.addEventListener('click', () => {
          const n = dropWithCosts(t, 'items', item.id);
          save(); close(); render(); toast(n ? '일정과 연결된 비용을 삭제했어요' : '일정을 삭제했어요');
        });
        const pick = n => (root.querySelector(`input[name=${n}]:checked`) || {}).value || '';
        // 시간: 오전/오후와 시:분을 골라요. 분은 기본 00·30, '분단위 입력'을 체크하면 00~59
        // (예전에 넣은 시간이 30분 단위가 아니면 처음부터 체크). 끝 시간은 시작 시간 다음 시각부터 고를 수 있어요
        let fullMin = ['f-time', 'f-end'].some(id => { const v = val(root, id); return v && !/:(00|30)$/.test(v); });
        const tpStart = $('.tp3[data-for=f-time]', root), tpEnd = $('.tp3[data-for=f-end]', root);
        const hid = tp => $('input[type=hidden]', tp);
        const apOf = x => (x < '12:00' ? 'am' : 'pm');
        const fill = tp => {
          const after = tp === tpEnd ? hid(tpStart).value : '';
          const v = hid(tp).value, c = timeCands(fullMin ? 1 : 30, v, after);
          const aps = ['am', 'pm'].filter(a => c.some(x => apOf(x) === a));
          let ap = v ? apOf(v) : (tp.dataset.ap || (tp === tpEnd && after ? apOf(after) : 'am'));
          if (!aps.includes(ap)) ap = aps[0] || 'am';
          tp.dataset.ap = ap;
          $('.tp-ap', tp).innerHTML = aps.map(a => `<option value="${a}" ${a === ap ? 'selected' : ''}>${a === 'am' ? '오전' : '오후'}</option>`).join('');
          const hm12 = x => `${(+x.slice(0, 2) % 12) || 12}:${x.slice(3)}`;
          // 분단위 입력이면 목록 대신 글자로 (예: 315 → 3:15)
          $('.tp-hm', tp).hidden = fullMin; $('.tp-txt', tp).hidden = !fullMin;
          if (fullMin) { if (document.activeElement !== $('.tp-txt', tp)) $('.tp-txt', tp).value = v ? hm12(v) : ''; return; }
          $('.tp-hm', tp).innerHTML = `<option value="">--:--</option>` + c.filter(x => apOf(x) === ap)
            .map(x => `<option value="${x}" ${x === v ? 'selected' : ''}>${hm12(x)}</option>`).join('');
        };
        // 글자로 넣은 시간 읽기: 315 · 3:15 · 3.15 → 오전/오후 칸 기준, 13 이상이면 24시간제로 봐요. 못 읽으면 null
        const parseTyped = (text, ap) => {
          const t = String(text).trim(); if (!t) return '';
          let h, m;
          const sep = t.match(/^(\d{1,2})\s*[:.\s]\s*(\d{1,2})$/);
          if (sep) { h = +sep[1]; m = +sep[2]; }
          else if (/^\d{1,4}$/.test(t)) { if (t.length <= 2) { h = +t; m = 0; } else { h = +t.slice(0, -2); m = +t.slice(-2); } }
          else return null;
          if (m > 59 || h > 23) return null;
          if (h <= 12) h = h % 12 + (ap === 'pm' ? 12 : 0);
          return `${pad2(h)}:${pad2(m)}`;
        };
        const onPick = (tp, target) => {
          const ap = $('.tp-ap', tp).value, inp = hid(tp), after = tp === tpEnd ? hid(tpStart).value : '';
          tp.dataset.ap = ap;
          if (target.classList.contains('tp-ap')) {
            // 오전/오후만 바꾸면 같은 시각의 반대편으로 (예: 오전 3:00 → 오후 3:00)
            if (inp.value) { const hh = +inp.value.slice(0, 2) % 12 + (ap === 'pm' ? 12 : 0); inp.value = `${pad2(hh)}:${inp.value.slice(3)}`; }
          } else if (target.classList.contains('tp-txt')) {
            const got = parseTyped(target.value, ap);
            if (got === null) { $('#f-err', root).textContent = '시간은 315 또는 3:15처럼 넣어 주세요.'; inp.value = ''; }
            else { $('#f-err', root).textContent = ''; inp.value = got; if (got) tp.dataset.ap = apOf(got); }
          } else inp.value = $('.tp-hm', tp).value;
          if (after && inp.value && inp.value <= after) { inp.value = ''; if (target.classList.contains('tp-txt')) $('#f-err', root).textContent = '끝 시간은 시작 시간보다 늦게 넣어 주세요.'; }
          if (tp === tpStart) { const e = hid(tpEnd); if (inp.value && e.value && e.value <= inp.value) e.value = ''; if (!e.value) delete tpEnd.dataset.ap; fill(tpEnd); }
          fill(tp);
        };
        [tpStart, tpEnd].forEach(tp => tp.addEventListener('change', e => onPick(tp, e.target)));
        $('#f-tp-mode', root).checked = fullMin;
        $('#f-tp-mode', root).addEventListener('change', e => { fullMin = e.target.checked; fill(tpStart); fill(tpEnd); });
        fill(tpStart); fill(tpEnd);
        const updResv = () => { $('#f-paid-wrap', root).hidden = !pick('f-resv'); $('#f-payby-wrap', root).hidden = !pick('f-resv') || !pick('f-paid'); };
        root.querySelectorAll('input[name=f-resv], input[name=f-paid]').forEach(r => r.addEventListener('change', updResv));
        const updCost = () => {
          const box = $('#c-prev', root); if (!box) return;
          const amt = parseAmount(val(root, 'c-amt')), c = $('#c-cur', root).value;
          box.innerHTML = c !== 'KRW' && amt ? (rateOf(t, c) ? `≈ <b>${fmtNum(Math.round(amt * rateOf(t, c)))}원</b> <span>(${esc(rateLabel(t, c))})</span>` : `${esc(curUnit(c))} 환율이 아직 없어요. 저장하면 자동으로 불러와 볼게요.`) : '';
        };
        updCost();
        $('#c-amt', root)?.addEventListener('input', updCost);
        $('#c-cur', root)?.addEventListener('change', updCost);
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          const title = val(root, 'f-title');
          if (!title) { $('#f-err', root).textContent = '무엇을 하는지 적어 주세요.'; return; }
          if (val(root, 'c-amt') && !(parseAmount(val(root, 'c-amt')) > 0)) { $('#f-err', root).textContent = '비용은 숫자로 넣어 주세요.'; return; }
          const before = { date: item.date, title: item.title, type: item.type };
          const data = { date: val(root, 'f-date'), time: val(root, 'f-time'), endTime: val(root, 'f-end'), type: (root.querySelector('input[name=f-type]:checked') || {}).value || 'etc', title, place: val(root, 'f-place'), memo: val(root, 'f-memo'), cost: val(root, 'f-cost'), resv: pick('f-resv'), paid: '', payBy: '' };
          if (data.resv) { data.paid = pick('f-paid'); if (data.paid) data.payBy = pick('f-payby'); } // 위를 안 고르면 아래도 비워요
          ['cost', 'resv', 'paid', 'payBy'].forEach(k => { if (!data[k]) delete data[k]; });
          const iid = isNew ? uid() : item.id;
          if (isNew) t.items.push({ id: iid, ...data }); else { ['cost', 'resv', 'paid', 'payBy'].forEach(k => { if (!data[k]) delete item[k]; }); Object.assign(item, data); }
          const cur = applyItemCost(t, root, iid, data, before);
          // 일정 종류(식사·관광…)를 바꾸면, 종류에 맞춰 자동으로 정해졌던 경비 분류도 따라 바꿔요 (경비 탭에서 직접 고른 분류는 그대로)
          if (!isNew && before.type !== data.type) {
            const from = TYPE_TO_EXP[before.type] || 'etc', to = TYPE_TO_EXP[data.type] || 'etc';
            (t.expenses || []).forEach(e => { if (e.itemId === iid && e.cat === from) e.cat = to; });
          }
          save(); close(); render(); toast('저장했어요');
          if (cur && cur !== 'KRW' && !rateOf(t, cur)) updateRates(t, [cur], true);
        });
      });
  }

  // 경비
  // 일정 시간 칸: [오전/오후] [시:분] (목록은 itemSheet에서 채워요). 값은 숨은 칸에 HH:MM
  const pad2 = n => String(n).padStart(2, '0');
  function timePick(id, v) {
    return `<div class="tp3" data-for="${id}"><select class="tp-ap" aria-label="오전/오후"></select><select class="tp-hm" aria-label="시간"></select><input type="text" class="tp-txt" inputmode="numeric" placeholder="예: 315" aria-label="시간 직접 입력" autocomplete="off" hidden><input type="hidden" id="${id}" value="${esc(v || '')}"></div>`;
  }
  // 고를 수 있는 시각들: step분 간격 + 지금 값, after를 주면 그 이후만
  function timeCands(step, v, after) {
    const out = [];
    for (let m = 0; m < 1440; m += step) out.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
    if (v && !out.includes(v)) out.push(v);
    return out.filter(x => x === v || !after || x > after).sort();
  }
  // 일정·항공편·숙소·준비 항목을 지우면 거기에 연결된 비용도 경비에서 같이 지워요
  const linkedExp = (t, refId) => (t.expenses || []).filter(e => e.itemId === refId);
  const linkedNote = (t, refId) => { const l = linkedExp(t, refId); return l.length ? ` 연결된 비용 ${fmtNum(l.reduce((a, e) => a + (krwOf(t, e) || 0), 0))}원도 경비에서 같이 지워져요.` : ''; };
  function dropWithCosts(t, key, refId) {
    t[key] = (t[key] || []).filter(x => x.id !== refId);
    const n = linkedExp(t, refId).length;
    if (n) t.expenses = t.expenses.filter(e => e.itemId !== refId);
    return n;
  }
  // 일정 입력창 안의 비용 칸 (해외 투어는 현지 통화로도 넣을 수 있어요). 연결된 비용이 여러 건이면 경비 탭에서 고치도록 안내해요
  function itemCostHtml(t, refId) {
    const linked = refId ? (t.expenses || []).filter(e => e.itemId === refId) : [];
    if (linked.length > 1) {
      const krw = linked.reduce((a, e) => a + (krwOf(t, e) || 0), 0);
      return `<div class="field"><span>비용</span><div class="note-small">비용이 ${linked.length}건 들어 있어요 (합계 ${fmtNum(krw)}원). 경비 탭에서 고치세요.</div></div>`;
    }
    const e = linked[0], tc = tripCurrency(t);
    const cur = e ? e.currency : 'KRW'; // 새로 넣을 때는 원화가 기본
    const curOpts = Array.from(new Set([cur, tc, 'KRW', 'USD', ...Object.keys(CUR)])).filter(c => has(CUR, c));
    return `<div class="field"><span>비용 <span class="hint">(선택) 넣으면 경비 탭 합계에 들어가요</span></span>
      <div class="grid2 amt-row"><input type="text" id="c-amt" inputmode="decimal" value="${e ? esc(e.currency === 'KRW' ? fmtNum(e.amount) : e.amount) : ''}" placeholder="0" autocomplete="off" aria-label="비용 금액">
      <select id="c-cur" aria-label="통화">${curOpts.map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c} · ${CUR[c][0]}</option>`).join('')}</select></div>
      <div class="krw-preview" id="c-prev"></div></div>`;
  }
  // 저장할 때 비용 칸을 경비에 반영해요. 넣은 통화를 돌려줘요 (환율 불러오기용)
  function applyItemCost(t, root, refId, data, before) {
    const amt = $('#c-amt', root); if (!amt) return '';
    t.expenses = t.expenses || [];
    const ex = t.expenses.find(e => e.itemId === refId);
    if (!amt.value.trim()) { if (ex) t.expenses = t.expenses.filter(x => x !== ex); return ''; }
    const currency = $('#c-cur', root).value;
    let amount = parseAmount(amt.value);
    if (currency === 'KRW') amount = Math.round(amount);
    if (ex) {
      if (ex.amount !== amount || ex.currency !== currency) Object.assign(ex, { amount, currency, krw: null });
      if (ex.date === before.date) ex.date = data.date;     // 일정 날짜를 옮기면 비용 날짜도 따라가요
      if (ex.title === before.title) ex.title = data.title;
      if (data.payBy) ex.pay = data.payBy; // 일정에서 고른 결제 수단을 경비에도
    } else t.expenses.push({ id: uid(), date: data.date, itemId: refId, title: data.title, cat: TYPE_TO_EXP[data.type] || 'etc', amount, currency, krw: null, pay: data.payBy || 'card', memo: '' });
    return currency;
  }

  // 항공편·숙소 입력창 안의 비용 칸 (원화로만 입력). 연결된 비용이 한 건이면 그 비용을 고치고, 여러 건이면 경비 탭에서 고치도록 안내해요
  function sheetCostHtml(t, refId, label, hint) {
    const linked = refId ? (t.expenses || []).filter(e => e.itemId === refId) : [];
    if (linked.length > 1) {
      const krw = linked.reduce((a, e) => a + (krwOf(t, e) || 0), 0);
      return `<div class="field"><span>${label}</span><div class="note-small">비용이 ${linked.length}건 들어 있어요 (합계 ${fmtNum(krw)}원). 경비 탭에서 고치세요.</div></div>`;
    }
    const e = linked[0];
    const v = e ? (e.currency === 'KRW' ? e.amount : krwOf(t, e)) : null;
    return `<label class="field"><span>${label} <span class="hint">(선택) ${hint}</span></span>
      <div class="won-input"><input type="text" id="c-amt" inputmode="numeric" value="${v == null ? '' : fmtNum(v)}" placeholder="0" autocomplete="off"><span>원</span></div></label>`;
  }
  // 저장 전에 금액 확인. 잘못 넣었으면 오류 문구를 돌려줘요
  function checkSheetCost(root) {
    const amt = $('#c-amt', root); if (!amt || !amt.value.trim()) return '';
    return parseAmount(amt.value) ? '' : '비용은 숫자로 넣어 주세요.';
  }
  function applySheetCost(t, root, refId, meta) {
    const amt = $('#c-amt', root); if (!amt) return;
    t.expenses = t.expenses || [];
    const ex = t.expenses.find(e => e.itemId === refId);
    if (!amt.value.trim()) { if (ex) t.expenses = t.expenses.filter(x => x !== ex); return; }
    const amount = Math.round(parseAmount(amt.value));
    if (ex) {
      if (ex.currency !== 'KRW' && krwOf(t, ex) === amount) return; // 예전에 외화로 넣은 비용을 안 바꿨으면 그대로 둬요
      Object.assign(ex, { amount, currency: 'KRW', krw: null });
    } else t.expenses.push({ id: uid(), date: '', itemId: refId, title: meta.title, cat: meta.cat, amount, currency: 'KRW', krw: null, pay: 'card', memo: '' });
  }

  // 숙소 입력
  function staySheet(t, s) {
    const isNew = !s;
    s = s || { name: '', address: '', checkIn: t.startDate || '', checkInTime: '15:00', checkOut: t.endDate || '', checkOutTime: '11:00', confirmNo: '', phone: '', memo: '' };
    openSheet(isNew ? '숙소 추가' : '숙소 수정', `
      <label class="field"><span>숙소 이름</span><input type="text" id="s-name" value="${esc(s.name)}" placeholder="예: 난바 OO 호텔"></label>
      <label class="field"><span>주소 <span class="hint">구글맵에서 찾을 수 있게 영문 이름이나 현지 주소가 좋아요</span></span><input type="text" id="s-addr" value="${esc(s.address)}" placeholder="예: 1-2-3 Namba, Chuo-ku, Osaka"></label>
      <div class="grid2">
        <label class="field"><span>체크인 날짜</span><input type="date" id="s-in" value="${esc(s.checkIn)}"></label>
        <label class="field"><span>체크인 시간</span><input type="time" id="s-int" value="${esc(s.checkInTime)}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>체크아웃 날짜</span><input type="date" id="s-out" value="${esc(s.checkOut)}"></label>
        <label class="field"><span>체크아웃 시간</span><input type="time" id="s-outt" value="${esc(s.checkOutTime)}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>예약번호</span><input type="text" id="s-conf" value="${esc(s.confirmNo)}" autocapitalize="characters"></label>
        <label class="field"><span>전화번호</span><input type="text" id="s-phone" value="${esc(s.phone)}" inputmode="tel"></label>
      </div>
      ${sheetCostHtml(t, s.id, '숙박비', '넣으면 경비 탭에 함께 들어가요')}
      <label class="field"><span>메모</span><input type="text" id="s-memo" value="${esc(s.memo)}" placeholder="예: 트리플룸, 조식 포함"></label>
      <div class="ap-preview" id="s-err" style="color:var(--warn)"></div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="s-del">${ICON.trash}삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        $('#s-in', root).addEventListener('change', () => { const a = val(root, 's-in'), b = $('#s-out', root); if (a && (!b.value || b.value < a)) b.value = a; });
        $('#s-del', root)?.addEventListener('click', () => {
          const n = dropWithCosts(t, 'stays', s.id);
          save(); close(); render(); toast(n ? '숙소와 연결된 비용을 삭제했어요' : '숙소를 삭제했어요');
        });
        $('#sheet-form', root).addEventListener('submit', ev => {
          ev.preventDefault();
          const name = val(root, 's-name');
          if (!name) { $('#s-err', root).textContent = '숙소 이름을 넣어 주세요.'; return; }
          const data = { name, address: val(root, 's-addr'), checkIn: val(root, 's-in'), checkInTime: val(root, 's-int'), checkOut: val(root, 's-out'), checkOutTime: val(root, 's-outt'), confirmNo: val(root, 's-conf'), phone: val(root, 's-phone'), memo: val(root, 's-memo') };
          if (data.checkIn && data.checkOut && data.checkOut < data.checkIn) { $('#s-err', root).textContent = '체크아웃 날짜가 체크인보다 빨라요.'; return; }
          const costErr = checkSheetCost(root); if (costErr) { $('#s-err', root).textContent = costErr; return; }
          t.stays = t.stays || [];
          const sid = isNew ? uid() : s.id;
          if (isNew) t.stays.push({ id: sid, ...data }); else Object.assign(s, data);
          applySheetCost(t, root, sid, { cat: 'stay', title: data.name });
          save(); close(); render(); toast('저장했어요');
        });
      });
  }
  function expSheet(t, e, preset = {}) {
    const isNew = !e;
    const days = tripDays(t);
    const today = todayStr();
    const tc = tripCurrency(t);
    t.expenses = t.expenses || [];
    e = e || { date: has(preset, 'date') ? preset.date : (days.includes(today) ? today : ''), itemId: preset.itemId || '', title: preset.title || '', cat: preset.cat || 'etc', amount: '', currency: preset.currency || 'KRW', krw: null, pay: 'card', memo: '' };
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
      <div class="field"><span>분류</span><div class="type-pick" id="x-cats">${EXP_CATS.filter(([id]) => id !== 'tourbook' || expCat(t, e) === 'tourbook').map(([id, l]) => `<label><input type="radio" name="x-cat" value="${id}" ${expCat(t, e) === id ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <div class="note-small" id="x-cat-note" hidden>준비 탭 항목에 연결된 비용은 그 항목의 분류를 따라요.</div></div>
      <div class="grid2">
        <label class="field"><span>날짜</span><select id="x-date">${dateOpts.map(([v, l]) => `<option value="${v}" ${v === (e.date || '') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>결제</span><select id="x-pay">${PAYS.map(([v, l]) => `<option value="${v}" ${v === e.pay ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>연결 <span class="hint">(선택) 일정·항공편·숙소</span></span><select id="x-item"></select></label>
      <label class="field" id="x-krw-wrap"><span>실제 원화 결제액 <span class="hint">(선택) 카드 명세서 금액을 알면 넣으세요</span></span><input type="text" id="x-krw" inputmode="numeric" value="${e.krw == null ? '' : esc(e.krw)}" placeholder="비우면 환율로 계산"></label>
      <label class="field"><span>메모</span><input type="text" id="x-memo" value="${esc(e.memo || '')}"></label>
      <div class="ap-preview" id="x-err" style="color:var(--warn)"></div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="x-del">${ICON.trash}삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        const fillItems = () => {
          const d = $('#x-date', root).value;
          const list = (t.items || []).filter(i => (i.date || '') === d).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
          const cur = $('#x-item', root).value || e.itemId;
          const opt = (id, label) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(label)}</option>`;
          $('#x-item', root).innerHTML = `<option value="">연결 안 함</option>`
            + (list.length ? `<optgroup label="이날 일정">${list.map(i => opt(i.id, `${i.time || ''} ${i.title}`)).join('')}</optgroup>` : '')
            + ((t.flights || []).length ? `<optgroup label="항공편">${sortFlights(t.flights).map(f => opt(f.id, linkTitle(t, f.id))).join('')}</optgroup>` : '')
            + ((t.stays || []).length ? `<optgroup label="숙소">${t.stays.map(s => opt(s.id, s.name)).join('')}</optgroup>` : '')
            + ((t.checklist || []).length ? `<optgroup label="준비">${t.checklist.map(c => opt(c.id, shortText(c.text))).join('')}</optgroup>` : '');
        };
        const upd = () => {
          const amt = parseAmount(val(root, 'x-amt')), c = $('#x-cur', root).value, k = parseAmount(val(root, 'x-krw'));
          $('#x-krw-wrap', root).hidden = c === 'KRW';
          let msg = '';
          if (c !== 'KRW' && val(root, 'x-krw') && k > 0) msg = `원화 <b>${fmtNum(k)}원</b> (실제 결제액)`;
          else if (c !== 'KRW' && amt) msg = rateOf(t, c) ? `≈ <b>${fmtNum(Math.round(amt * rateOf(t, c)))}원</b> <span>(${esc(rateLabel(t, c))})</span>` : `${esc(curUnit(c))} 환율이 아직 없어요. 저장하면 자동으로 불러와 볼게요.`;
          $('#x-prev', root).innerHTML = msg;
        };
        // 준비 항목에 연결되면 분류를 그 항목 분류로 고정해요
        const lockCat = () => {
          const c = prepOf(t, $('#x-item', root).value);
          root.querySelectorAll('input[name=x-cat]').forEach(r => { r.disabled = !!c; if (c && r.value === PREP_EXP[prepCat(c)]) r.checked = true; });
          $('#x-cat-note', root).hidden = !c;
        };
        fillItems(); upd(); lockCat();
        root.addEventListener('input', upd);
        $('#x-cur', root).addEventListener('change', upd);
        $('#x-date', root).addEventListener('change', () => { fillItems(); lockCat(); });
        $('#x-item', root).addEventListener('change', () => {
          const id = $('#x-item', root).value;
          const it = (t.items || []).find(i => i.id === id);
          const cat = it ? (TYPE_TO_EXP[it.type] || 'etc') : (t.flights || []).some(f => f.id === id) ? 'flight' : (t.stays || []).some(s => s.id === id) ? 'stay' : (t.checklist || []).some(c => c.id === id) ? 'prep' : '';
          if (id && !val(root, 'x-title')) $('#x-title', root).value = shortText(linkTitle(t, id));
          if (cat && isNew) { const r = root.querySelector(`input[name=x-cat][value="${cat}"]`); if (r) r.checked = true; }
          lockCat();
        });
        $('#x-del', root)?.addEventListener('click', () => { t.expenses = t.expenses.filter(x => x.id !== e.id); save(); close(); render(); toast('경비를 삭제했어요'); });
        $('#sheet-form', root).addEventListener('submit', ev => {
          ev.preventDefault();
          const amount = parseAmount(val(root, 'x-amt'));
          if (!val(root, 'x-amt') || !amount) { $('#x-err', root).textContent = '금액을 숫자로 넣어 주세요.'; return; }
          const currency = $('#x-cur', root).value;
          const krwRaw = val(root, 'x-krw'), krw = parseAmount(krwRaw);
          if (currency !== 'KRW' && krwRaw && !Number.isFinite(krw)) { $('#x-err', root).textContent = '실제 원화 결제액은 숫자로 넣어 주세요.'; return; }
          const cat = prepOf(t, $('#x-item', root).value) ? 'prep' : (root.querySelector('input[name=x-cat]:checked') || {}).value || 'etc'; // 준비 항목 비용은 저장값을 그대로 'prep'
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

  // ── 편명 기억: 한 번 넣은 편명의 노선·시간을 이 기기에 기억해 두고 다음에 자동으로 채워요
  const normNo = v => String(v || '').toUpperCase().replace(/\s/g, '');
  function rememberFlight(f) {
    const no = normNo(f.flightNo);
    if (!no || !f.dep || !f.arr) return;
    state.flightMemo = state.flightMemo || {};
    state.flightMemo[no] = {
      dep: f.dep, arr: f.arr, depName: f.depName || '', arrName: f.arrName || '', depTime: f.depTime || '', arrTime: f.arrTime || '',
      dayOffset: f.depDate && f.arrDate ? Math.max(0, diffDays(f.depDate, f.arrDate)) : 0,
      depTerminal: f.depTerminal || '', arrTerminal: f.arrTerminal || '', at: todayStr()
    };
  }
  function seedFlightMemo() {
    if (state.flightMemo) return;
    state.flightMemo = {};
    state.trips.filter(t => !t.example).forEach(t => sortFlights(t.flights || []).forEach(rememberFlight)); // 예시 여행 시간은 실제가 아니라서 빼요
  }

  // 항공편
  function flightSheet(t, f) {
    const isNew = !f;
    f = f || { flightNo: '', dep: '', arr: '', depName: '', arrName: '', depDate: t.startDate || '', depTime: '', arrDate: '', arrTime: '', depTerminal: '', arrTerminal: '', gate: '', seat: '', pnr: '', memo: '' };
    openSheet(isNew ? '항공편 추가' : '항공편 수정', `
      <div class="grid2">
        <label class="field"><span>편명</span><input type="text" id="f-no" list="dl-fno" value="${esc(f.flightNo)}" placeholder="KE723" autocapitalize="characters" autocomplete="off"></label>
        <div class="field"><span>항공사</span><div class="ap-preview" id="f-al" style="padding-top:10px"></div></div>
      </div>
      <datalist id="dl-fno">${Object.entries(state.flightMemo || {}).map(([no, m]) => `<option value="${esc(no)}">${esc(m.dep)}→${esc(m.arr)} ${esc(m.depTime)}</option>`).join('')}</datalist>
      <div class="fl-lookup" id="f-look"></div>
      <div class="grid2">
        <div class="field"><span>출발 공항</span><input type="text" id="f-dep" value="${esc(apLabel(f.dep, f.depName))}" placeholder="예: 인천" autocomplete="off" data-code="${esc(f.dep)}"><div class="ap-sugg" id="s-dep"></div></div>
        <div class="field"><span>도착 공항</span><input type="text" id="f-arr" value="${esc(apLabel(f.arr, f.arrName))}" placeholder="예: 간사이, 나트랑" autocomplete="off" data-code="${esc(f.arr)}"><div class="ap-sugg" id="s-arr"></div></div>
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
        <label class="field"><span>예약번호</span><input type="text" id="f-pnr" value="${esc(f.pnr)}" autocapitalize="characters"></label>
      </div>
      ${sheetCostHtml(t, f.id, '항공권 비용', '왕복 항공권이면 가는 편에만 넣으세요')}
      <label class="field"><span>메모</span><textarea id="f-memo">${esc(f.memo)}</textarea></label>
      <div class="ap-preview" id="f-err" style="color:var(--warn)"></div>
      <div class="note-small">터미널을 비워 두면 항공사 기준으로 추정해서 보여 줘요. 시간은 각 공항의 현지 시간으로 입력하세요.</div>`,
      `${isNew ? '' : `<button type="button" class="btn danger left" id="f-del">${ICON.trash}삭제</button>`}<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        let filledFor = isNew ? '' : normNo(f.flightNo); // 수정할 때는 기존 값을 덮어쓰지 않아요
        // 공항 칸: 글자를 넣으면 후보를 보여 주고, 고르면 코드를 기억해요
        const setAp = (side, code, name) => { const inp = $('#f-' + side, root); inp.value = apLabel(code, name); inp.dataset.code = findAp(code) ? code : ''; };
        const apCode = side => { const inp = $('#f-' + side, root); return inp.dataset.code || resolveAirport(inp.value); }; // null이면 후보가 여러 개
        const showSugg = side => {
          const inp = $('#f-' + side, root), box = $('#s-' + side, root);
          const a = findAp(inp.dataset.code);
          if (a && a.ko === inp.value.trim()) { box.innerHTML = `<span class="ap-ok">✓ ${esc(a.code)} · ${esc(a.city)}, ${esc(a.country)}</span>`; return; }
          inp.dataset.code = '';
          const q = inp.value.trim();
          if (!q) { box.innerHTML = ''; return; }
          const list = searchAirports(q).slice(0, 6);
          box.innerHTML = list.length
            ? list.map(x => `<button type="button" class="btn sm ap-pick" data-side="${side}" data-code="${x.code}">${esc(x.ko)} <small>${esc(x.code)} · ${esc(x.city)}</small></button>`).join('')
            : `<span class="ap-none">목록에 없는 공항이에요. 이 이름 그대로 저장돼요.</span>`;
        };
        root.addEventListener('click', ev => {
          const b = ev.target.closest('.ap-pick'); if (!b) return;
          setAp(b.dataset.side, b.dataset.code); showSugg(b.dataset.side); $('#f-err', root).textContent = ''; upd();
        });
        const fillFromMemo = m => {
          const set = (id, v) => { if (v) $('#' + id, root).value = v; };
          setAp('dep', m.dep, m.depName); setAp('arr', m.arr, m.arrName);
          set('f-dtime', m.depTime); set('f-atime', m.arrTime); set('f-dterm', m.depTerminal); set('f-aterm', m.arrTerminal);
          const d = val(root, 'f-ddate');
          if (d) $('#f-adate', root).value = addDays(d, m.dayOffset || 0);
        };
        const lookup = () => {
          const no = normNo(val(root, 'f-no')), d = val(root, 'f-ddate');
          const box = $('#f-look', root);
          if (!no || no.length < 3) { box.innerHTML = ''; return; }
          const m = (state.flightMemo || {})[no];
          // 새 항공편이고 출발·도착이 비어 있으면 기억된 정보로 바로 채워요
          if (m && filledFor !== no && !val(root, 'f-dep') && !val(root, 'f-arr')) { fillFromMemo(m); filledFor = no; showSugg('dep'); showSugg('arr'); }
          const q = encodeURIComponent(`${no} ${d ? `${parseD(d).getMonth() + 1}월 ${parseD(d).getDate()}일` : ''} 항공편`.replace(/\s+/g, ' ').trim());
          box.innerHTML = `
            ${m ? `<div class="memo-hit">${filledFor === no ? '전에 넣은' : '기억된'} <b>${esc(no)}</b> 정보: ${esc(m.dep)}→${esc(m.arr)} ${esc(m.depTime)}${m.arrTime ? '–' + esc(m.arrTime) : ''}
              ${filledFor === no ? '<span>로 채웠어요. 날짜와 시간이 맞는지 확인하세요.</span>' : `<button type="button" class="btn sm" id="f-fill">이 정보로 채우기</button>`}</div>` : ''}
            <div class="look-links"><span>${m ? '노선이 바뀌었으면' : '노선을 모르면'}</span>
              <a class="btn sm" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">구글에서 찾기 ↗</a>
              <a class="btn sm" href="https://search.naver.com/search.naver?query=${q}" target="_blank" rel="noopener">네이버에서 찾기 ↗</a></div>`;
          $('#f-fill', root)?.addEventListener('click', () => { fillFromMemo(m); filledFor = no; upd(); });
        };
        const upd = () => {
          lookup();
          const no = val(root, 'f-no'), dep = apCode('dep'), arr = apCode('arr');
          $('#f-al', root).innerHTML = airlineName(no) ? `<b>${esc(airlineName(no))}</b>` : (no ? '목록에 없는 항공사' : '');
          const tmp = { flightNo: no, dep, arr };
          $('#f-dterm', root).placeholder = suggestTerminal(tmp, 'dep') ? suggestTerminal(tmp, 'dep') + ' (추정)' : '';
          $('#f-aterm', root).placeholder = suggestTerminal(tmp, 'arr') ? suggestTerminal(tmp, 'arr') + ' (추정)' : '';
        };
        root.addEventListener('input', ev => { if (ev.target.id === 'f-dep' || ev.target.id === 'f-arr') { showSugg(ev.target.id.slice(2)); $('#f-err', root).textContent = ''; } upd(); });
        showSugg('dep'); showSugg('arr'); upd();
        $('#f-del', root)?.addEventListener('click', () => {
          const n = dropWithCosts(t, 'flights', f.id);
          save(); close(); render(); toast(n ? '항공편과 연결된 비용을 삭제했어요' : '항공편을 삭제했어요');
        });
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          // 공항: 목록에서 하나로 정해지면 코드, 후보가 여럿이면 고르게, 목록에 없으면 이름 그대로
          const ap = {};
          for (const side of ['dep', 'arr']) {
            const text = val(root, 'f-' + side), code = apCode(side);
            if (text && code === null) { $('#f-err', root).textContent = `${side === 'dep' ? '출발' : '도착'} 공항 후보가 여러 개예요. 아래 목록에서 하나를 골라 주세요.`; return; }
            ap[side] = code ? { code, name: '' } : { code: /^[A-Za-z]{3}$/.test(text) ? text.toUpperCase() : '', name: /^[A-Za-z]{3}$/.test(text) ? '' : text };
          }
          const data = {
            flightNo: val(root, 'f-no').toUpperCase().replace(/\s/g, ''), dep: ap.dep.code, arr: ap.arr.code,
            depName: ap.dep.name, arrName: ap.arr.name,
            depDate: val(root, 'f-ddate'), depTime: val(root, 'f-dtime'), arrDate: val(root, 'f-adate'), arrTime: val(root, 'f-atime'),
            depTerminal: val(root, 'f-dterm').toUpperCase(), arrTerminal: val(root, 'f-aterm').toUpperCase(), gate: f.gate || '', counter: val(root, 'f-counter').toUpperCase(),
            seat: f.seat || '', pnr: val(root, 'f-pnr').toUpperCase(), memo: val(root, 'f-memo')
          };
          if (!data.arrDate) data.arrDate = data.depDate;
          const costErr = checkSheetCost(root); if (costErr) { $('#f-err', root).textContent = costErr; return; }
          const fid = isNew ? uid() : f.id;
          if (isNew) t.flights.push({ id: fid, ...data }); else Object.assign(f, data);
          if (!t.example) rememberFlight(data);
          applySheetCost(t, root, fid, { cat: 'flight', title: `${data.flightNo || '항공'} ${data.dep || ''}→${data.arr || ''}` });
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
      <div class="field"><span>분류</span><div class="type-pick">${PREP_CATS.map(x => `<label><input type="radio" name="f-pcat" value="${x}" ${x === prepCat(c) ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
      ${sheetCostHtml(t, c.id, '비용', '넣으면 경비 탭에 함께 들어가요')}
      <label class="field"><span>메모</span><textarea id="f-memo">${esc(c.memo || '')}</textarea></label>
      <div class="ap-preview" id="f-err" style="color:var(--warn)"></div>`,
      `<button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">저장</button>`,
      (root, close) => {
        $('#sheet-form', root).addEventListener('submit', e => {
          e.preventDefault();
          const text = val(root, 'f-text'); if (!text) { $('#f-err', root).textContent = '할 일을 적어 주세요.'; return; }
          const costErr = checkSheetCost(root); if (costErr) { $('#f-err', root).textContent = costErr; return; }
          const pcat = (root.querySelector('input[name=f-pcat]:checked') || {}).value || prepCat(c);
          Object.assign(c, { text, memo: val(root, 'f-memo') });
          if (pcat !== prepCat(c)) c.cat = pcat; // 분류를 바꿨을 때만 저장 (예전 분류는 그대로 둠)
          applySheetCost(t, root, c.id, { cat: 'prep', title: shortText(text) });
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
          const tl = text.match(/#t=(?:([A-Za-z0-9]{10,40})\.)?([A-Za-z0-9_-]{4,40})/); // 공유 링크(#t=)도 열어요
          if (!m && tl) { close(); openTripHash(tl[2], tl[1]); return; }
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

  // ───────── 가족 함께 쓰기 (js/cloud.js) ─────────
  const C = () => window.TPCloud;
  const famDot = () => { const c = C(); if (!c) return ''; return c.state === 'ready' ? 'on' : c.state === 'error' ? 'err' : ''; };
  const shortName = e => String(e || '').split('@')[0];
  function syncInfo(t) {
    const c = C();
    if (!c) return { text: '', cls: '' };
    if (c.state === 'signedout') return { text: '멤버와 함께 쓰는 여행 · 로그인하면 다시 맞춰져요', cls: 'warn' };
    if (c.state === 'error') return { text: c.error, cls: 'warn' };
    if (c.state !== 'ready') return { text: '그룹에 연결하는 중…', cls: '' };
    if (!navigator.onLine) return { text: '인터넷 없음 · 연결되면 멤버와 맞춰져요', cls: 'warn' };
    if (c.syncing || (t.cloud && t.cloud.dirty)) return { text: '멤버와 맞추는 중…', cls: '' };
    const by = t.cloud && t.cloud.by && t.cloud.by !== c.email ? ` · 마지막 수정 ${shortName(t.cloud.by)}` : '';
    if (locked(t)) return { text: '보기 전용 · 수정은 권한을 받은 멤버만 할 수 있어요' + by, cls: '' };
    return { text: '멤버와 함께 쓰는 중 · 저장됨' + by, cls: 'ok' };
  }

  // 가족이 고친 내용 받기. 입력 중이거나 창이 열려 있으면 끝날 때까지 미뤄요 (고치던 내용이 사라지지 않게)
  const pendingRemote = { updates: new Map(), removed: new Set() };
  let pendingOpen = null; // 링크(#t=)로 열려고 기다리는 여행
  function applyRemote(updates, removed) {
    updates.forEach(t => { pendingRemote.updates.set(t.id, t); pendingRemote.removed.delete(t.id); });
    removed.forEach(id => { pendingRemote.removed.add(id); pendingRemote.updates.delete(id); });
    flushRemote();
  }
  function busy() {
    const a = document.activeElement;
    return !!sheetClose || !!(a && app.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  }
  let needRender = false; // 창이 열려 있어서 미룬 다시 그리기 (로그인·권한이 바뀐 경우)
  function flushRemote() {
    if (!busy() && needRender && !pendingRemote.updates.size && !pendingRemote.removed.size) { needRender = false; render(); return; }
    if (busy() || (!pendingRemote.updates.size && !pendingRemote.removed.size)) return;
    needRender = false;
    let goneCurrent = false;
    pendingRemote.updates.forEach(t => {
      const i = state.trips.findIndex(x => x.id === t.id);
      // 창이 열려 있는 동안 기다리던 내용이, 그 사이 이 기기에서 고친 내용(아직 보내는 중)을 덮어쓰면 안 돼요
      if (i >= 0 && state.trips[i].cloud && state.trips[i].cloud.dirty) return;
      if (i >= 0) state.trips[i] = t; else state.trips.push(t);
    });
    pendingRemote.removed.forEach(id => {
      const x = state.trips.find(y => y.id === id);
      if (!x || !x.cloud || x.cloud.dirty) return;
      if (ui.tripId === id && ui.view === 'trip') goneCurrent = true;
      state.trips = state.trips.filter(y => y.id !== id);
    });
    pendingRemote.updates.clear(); pendingRemote.removed.clear();
    persist();
    if (goneCurrent) { ui.view = 'home'; toast('멤버가 이 여행을 지웠어요'); }
    if (pendingOpen && state.trips.some(x => x.id === pendingOpen)) { stopLive(); sharedTrip = null; ui.tripId = pendingOpen; ui.view = 'trip'; ui.tab = 'plan'; pendingOpen = null; clearTripHash(); }
    render();
  }
  app.addEventListener('focusout', () => setTimeout(flushRemote, 0));
  window.addEventListener('online', () => render());
  window.addEventListener('offline', () => render());

  function clearTripHash() { if (/^#t=/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 무시 */ } } }
  function openTripHash(id, fam) {
    const local = state.trips.find(x => x.id === id);
    if (local) { ui.tripId = id; ui.view = 'trip'; ui.tab = 'plan'; clearTripHash(); render(); jumpToToday(); return; }
    if (!C()) return;
    pendingOpen = id; // 가족(로그인)이면 가족 공간에서 오는 대로 고칠 수 있는 화면으로 바뀌어요
    if (!fam) { // 예전 링크(가족 번호 없음)는 멤버 로그인으로만 열려요
      C().load().then(() => { if (C().state !== 'ready') familySheet('함께 쓰는 여행이에요. 멤버로 등록된 구글 계정으로 로그인하면 열려요.'); else toast('함께 쓰는 여행을 불러오는 중…'); }).catch(() => {});
      return;
    }
    stopLive();
    let first = true;
    const live = { fam, id, stop: null };
    sharedLive = live;
    C().watchPublic(fam, id, data => {
      if (sharedLive !== live) return;
      if (!data || !data.trip) {
        toast(first ? '일정을 찾을 수 없어요. 링크를 보낸 사람에게 다시 받아 주세요.' : '공유가 꺼졌어요.');
        if (!first) closeShared();
        return;
      }
      const wasFirst = first; first = false;
      sharedTrip = normalizeTrip(data.trip); sharedTrip.id = id; sharedLink = '';
      if (pendingOpen !== id && state.trips.some(x => x.id === id)) return;
      if (wasFirst) { if (sheetClose) sheetClose(); ui.view = 'shared'; ui.tab = 'plan'; render(); if (!jumpToToday()) window.scrollTo(0, 0); }
      else if (ui.view === 'shared') { if (!busy()) render(); else needRender = true; }
    }, () => { if (sharedLive === live && first) toast('일정을 열 수 없어요. 인터넷 연결을 확인하거나 링크를 다시 받아 주세요.'); })
      .then(stop => { if (sharedLive === live) live.stop = stop; else stop(); }).catch(() => toast('일정을 열 수 없어요. 인터넷 연결을 확인해 주세요.'));
  }
  function stopLive() { if (sharedLive) { if (sharedLive.stop) sharedLive.stop(); sharedLive = null; } }

  function familySheet(note) {
    const c = C(); if (!c) return;
    openSheet('멤버와 함께 쓰기', `<div id="fam-body" class="fam-body"></div>`,
      `<button type="button" class="btn" data-close="1">닫기</button>`,
      (root) => {
        const body = $('#fam-body', root);
        const draw = () => {
          const st = c.state, fam = c.family;
          const msg = c.error ? `<div class="fam-err">${esc(c.error)}</div>` : '';
          const top = note ? `<div class="fam-note">${esc(note)}</div>` : '';
          if (st === 'off' || st === 'loading') { body.innerHTML = top + '<p class="note-small">그룹에 연결하는 중…</p>'; return; }
          if (st === 'signedout' || (st === 'error' && !c.email)) {
            body.innerHTML = `${top}${msg}
              <p class="fam-lead">멤버로 등록된 <b>구글 계정</b>으로 로그인하면, 같은 여행을 멤버 모두 <b>실시간으로</b> 보고, 수정 권한을 받은 멤버는 고칠 수 있어요. 아이폰·아이패드도 자동으로 맞춰져요.</p>
              <button type="button" class="btn primary" id="fam-login">구글로 로그인</button>
              <p class="note-small">처음 한 번만 로그인하면 돼요. 이 기기의 여행은 지워지지 않아요.</p>`;
            return;
          }
          if (st === 'nofamily') {
            body.innerHTML = `${top}${msg}
              <div class="fam-me">로그인: <b>${esc(c.email)}</b></div>
              <p class="fam-lead">아직 그룹이 없어요.</p>
              <div class="fam-box"><b>내가 만들기</b>
                <div class="fam-row"><input type="text" id="fam-name" value="우리 그룹" maxlength="30" aria-label="그룹 이름"><button type="button" class="btn primary" id="fam-create">그룹 만들기</button></div>
              </div>
              <div class="fam-box"><b>다른 멤버가 이미 만들었다면</b>
                <p class="note-small" style="margin:0">그 멤버에게 이 이메일을 추가해 달라고 하세요: <b>${esc(c.email)}</b>. 추가되면 자동으로 들어가요.</p></div>
              <button type="button" class="btn ghost sm" id="fam-logout">로그아웃</button>`;
            return;
          }
          if (st === 'ready') {
            const shared = state.trips.filter(x => x.cloud && x.cloud.fam === fam.id).length;
            body.innerHTML = `${top}${msg}
              <div class="fam-me">로그인: <b>${esc(c.email)}</b></div>
              <div class="fam-title">${ICON.users}<b>${esc(fam.name || '우리 그룹')}</b><span>함께 쓰는 여행 ${shared}개</span></div>
              <ul class="fam-list">${(fam.members || []).map(m => {
                const owner = m === fam.ownerEmail, ed = owner || (fam.editors || []).includes(m);
                return `<li><span>${esc(m)}</span>${m === c.email ? '<em>나</em>' : ''}${owner ? '<em>만든 사람</em>' : ''}
                ${c.isOwner && !owner ? `<button type="button" class="btn sm perm-btn ${ed ? 'on' : ''}" data-perm="${esc(m)}" data-on="${ed ? '' : '1'}" aria-pressed="${ed}">${ed ? '수정 가능' : '보기만'}</button>` : !owner ? `<em class="${ed ? '' : 'ro'}">${ed ? '수정 가능' : '보기만'}</em>` : ''}
                ${c.isOwner && m !== c.email ? `<button type="button" class="btn sm ghost" data-rm="${esc(m)}">빼기</button>` : ''}</li>`;
              }).join('')}</ul>
              <p class="note-small" style="margin:0">여행을 고치고 지우는 건 <b>만든 사람</b>과 <b>수정 가능</b>인 멤버만 할 수 있어요. 나머지는 보기만 해요.${c.isOwner ? ' 이름 옆 버튼을 누르면 바뀌어요.' : ''}</p>
              ${c.isOwner ? `<div class="fam-row"><input type="email" id="fam-add" placeholder="멤버 구글 이메일" autocomplete="off" autocapitalize="none" aria-label="추가할 멤버 이메일"><button type="button" class="btn primary" id="fam-add-btn">추가</button></div>
                <p class="note-small" style="margin:0">추가한 멤버가 앱에서 그 구글 계정으로 로그인하면 바로 함께 쓸 수 있어요.</p>`
                : '<p class="note-small" style="margin:0">멤버 추가·빼기는 그룹을 만든 사람만 할 수 있어요.</p>'}
              <p class="note-small" style="margin:0">여행을 올리려면 여행 화면의 <b>공유</b>에서 <b>올리고 공유하기</b>를 누르세요. 링크를 받은 사람은 누구나 볼 수 있고, 고치기는 위에서 <b>수정 가능</b>으로 바꾼 멤버만 할 수 있어요.</p>
              <button type="button" class="btn ghost sm" id="fam-logout">로그아웃</button>`;
            return;
          }
          body.innerHTML = top + msg + '<button type="button" class="btn" id="fam-retry">다시 시도</button>';
        };
        sheetRefresh = draw;
        draw();
        c.load().catch(() => {});
        root.addEventListener('click', async ev => {
          const b = ev.target.closest('button'); if (!b) return;
          try {
            if (b.id === 'fam-login') { b.disabled = true; b.textContent = '로그인 창을 여는 중…'; await c.signIn(); }
            else if (b.id === 'fam-logout') { await c.signOut(); toast('로그아웃했어요'); }
            else if (b.id === 'fam-create') { b.disabled = true; await c.createFamily(val(root, 'fam-name')); toast('그룹을 만들었어요'); }
            else if (b.id === 'fam-add-btn') {
              const e = val(root, 'fam-add');
              try { await c.addMember(e); toast(`${e.toLowerCase()} 추가했어요`); } catch (err) { toast(err.message === 'email' ? '이메일 주소를 확인해 주세요' : c.error || '추가하지 못했어요'); }
            } else if (b.dataset.perm) { b.disabled = true; await c.setEditor(b.dataset.perm, !!b.dataset.on); toast(b.dataset.on ? '수정 권한을 줬어요' : '보기만 하도록 바꿨어요'); }
            else if (b.dataset.rm) { await c.removeMember(b.dataset.rm); toast('멤버에서 뺐어요'); }
            else if (b.id === 'fam-retry') { c.load().catch(() => {}); }
          } catch (err) { /* 오류 문구는 c.error로 보여 줘요 */ }
          if (sheetRefresh) sheetRefresh();
        });
      });
  }

  window.TPApp = {
    getTrips: () => state.trips,
    hasCloudTrips: () => state.trips.some(t => t.cloud),
    normalizeTrip: t => normalizeTrip(t),
    persist,
    applyRemote,
    cloudChanged: () => {
      if (sheetRefresh) sheetRefresh();
      // 로그인 상태가 바뀌면 화면 전체를, 저장 중 표시만 바뀌면 그 줄만 다시 그려요 (누르던 버튼이 사라지지 않게)
      const st = C().state, fam = C().family;
      const sig = st + (fam ? '|' + C().canEdit(fam.id) : '');
      if (sig !== lastCloudState) { lastCloudState = sig; if (!busy()) render(); else needRender = true; return; }
      const fb = app.querySelector('.fam-btn'); if (fb) fb.className = `btn icon sm fam-btn ${famDot()}`;
      const line = app.querySelector('.sync-line'), t = curTrip();
      if (line && t && t.cloud) { const si = syncInfo(t); line.className = `sync-line ${si.cls}`; line.innerHTML = `${ICON.cloud}${esc(si.text)}`; }
    }
  };
  let lastCloudState = '';

  // ───────── 공유 링크 ─────────
  // 일정 전체를 압축해서 주소의 # 뒤에 담아요. # 뒤는 서버로 전송되지 않아서 일정이 어디에도 저장되지 않아요.
  const SHARE_RE = /(?:#s=)?([01]\.[A-Za-z0-9_-]{10,})/;
  const unb64u = str => {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b;
  };
  const pipeBytes = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

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
  // 다른 사람이 만든 데이터라서, 화면에 넣기 전에 형식을 하나하나 확인해요
  function normalizeTrip(t) {
    t = t && typeof t === 'object' ? t : {};
    const arr = v => Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];
    const validId = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v);
    const sid = v => validId(v) ? v : uid();
    const str = (v, n) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').slice(0, n);
    const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
    const time = v => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : '';
    const titles = t.dayTitles && typeof t.dayTitles === 'object' ? t.dayTitles : {};
    const out = {
      id: sid(t.id), example: !!t.example, year: Number(t.year) || '', country: str(t.country, 40), city: str(t.city, 60), subtitle: str(t.subtitle, 80),
      startDate: date(t.startDate), endDate: date(t.endDate), memo: str(t.memo, 2000),
      dayTitles: Object.fromEntries(Object.entries(titles).filter(([k]) => date(k)).map(([k, v]) => [k, str(v, 80)])),
      items: arr(t.items).map(i => ({ id: sid(i.id), date: date(i.date), time: time(i.time), endTime: time(i.endTime), type: Object.prototype.hasOwnProperty.call(TYPE_LABEL, i.type) ? i.type : 'etc', title: str(i.title, 200), place: str(i.place, 200), memo: str(i.memo, 2000), cost: str(i.cost, 100), ...(has(RESV, i.resv) ? { resv: i.resv } : {}), ...(has(PAID, i.paid) ? { paid: i.paid } : {}), ...(has(PAY_BY, i.payBy) ? { payBy: i.payBy } : {}) })),
      stays: arr(t.stays).map(s => ({ id: sid(s.id), name: str(s.name, 120), address: str(s.address, 200), checkIn: date(s.checkIn), checkInTime: time(s.checkInTime), checkOut: date(s.checkOut), checkOutTime: time(s.checkOutTime), confirmNo: str(s.confirmNo, 40), phone: str(s.phone, 40), memo: str(s.memo, 500) })),
      flights: arr(t.flights).map(f => ({ id: sid(f.id), flightNo: str(f.flightNo, 10), dep: str(f.dep, 3).toUpperCase(), arr: str(f.arr, 3).toUpperCase(), depName: str(f.depName, 80), arrName: str(f.arrName, 80), depDate: date(f.depDate), depTime: time(f.depTime), arrDate: date(f.arrDate), arrTime: time(f.arrTime), depTerminal: str(f.depTerminal, 10), arrTerminal: str(f.arrTerminal, 10), gate: str(f.gate, 10), counter: str(f.counter, 20), seat: str(f.seat, 40), pnr: str(f.pnr, 20), memo: str(f.memo, 1000) })),
      people: Number(t.people) >= 1 && Number(t.people) <= 50 ? Math.round(Number(t.people)) : '',
      currency: typeof t.currency === 'string' && has(CUR, t.currency) ? t.currency : '',
      rates: Object.fromEntries(Object.entries(t.rates && typeof t.rates === 'object' ? t.rates : {})
        .filter(([c, r]) => has(CUR, c) && c !== 'KRW' && r && Number(r.v) > 0)
        .map(([c, r]) => [c, { v: Number(r.v), date: date(r.date), src: r.src === 'manual' ? 'manual' : 'auto' }])),
      expenses: arr(t.expenses).map(e => ({ id: sid(e.id), date: date(e.date), itemId: typeof e.itemId === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(e.itemId) ? e.itemId : '', title: str(e.title, 120), cat: has(EXP_LABEL, e.cat) ? e.cat : 'etc', amount: Number.isFinite(Number(e.amount)) ? Number(e.amount) : 0, currency: typeof e.currency === 'string' && has(CUR, e.currency) ? e.currency : 'KRW', krw: e.krw === null || e.krw === '' || e.krw === undefined || !Number.isFinite(Number(e.krw)) ? null : Math.round(Number(e.krw)), pay: has(PAY_LABEL, e.pay) ? e.pay : 'etc', memo: str(e.memo, 500) })),
      checklist: arr(t.checklist).map(c => ({ id: sid(c.id), text: str(c.text, 200), cat: CATS.includes(c.cat) ? c.cat : '기타', due: (c.due === null || c.due === '' || c.due === undefined || !Number.isFinite(Number(c.due))) ? null : Math.max(0, Math.min(365, Math.round(Number(c.due)))), done: !!c.done, memo: str(c.memo, 500), ...(validId(c.tour) ? { tour: c.tour } : {}) }))
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
  function closeShared() { stopLive(); pendingOpen = null; sharedTrip = null; ui.view = 'home'; clearShareHash(); clearTripHash(); render(); window.scrollTo(0, 0); }
  function saveShared() {
    const t = JSON.parse(JSON.stringify(sharedTrip));
    // 링크 안의 짧은 번호 id는 기기 안에서 새 id로 바꿔요 (연결된 경비도 함께)
    const remap = {};
    ['items', 'stays', 'checklist', 'expenses'].forEach(k => (t[k] || []).forEach(o => { if (o.id && o.id.length < 8) { remap[o.id] = uid(); o.id = remap[o.id]; } }));
    (t.expenses || []).forEach(e => { if (e.itemId && remap[e.itemId]) e.itemId = remap[e.itemId]; });
    (t.checklist || []).forEach(c => { if (c.tour && remap[c.tour]) c.tour = remap[c.tour]; });
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

  // 이 앱을 지인에게 알려 주기 (여행 링크가 아니라 앱 주소 + 사용 안내)
  function shareApp() {
    const url = location.origin + location.pathname.replace(/index\.html$/, '');
    const text = `여행 일정 앱이야. 설치 없이 무료로 쓸 수 있어.
1) 아이폰은 Safari로 열고 공유 → '홈 화면에 추가' (안드로이드는 Chrome ⋮ → '홈 화면에 추가')
2) 처음에 보이는 오사카 예시는 '예시 지우기'로 지우고 '새 여행'으로 만들면 돼
3) 일행이랑 같이 쓰려면 위쪽 사람 모양 버튼 → 구글 로그인 → 그룹 만들기 → 일행 이메일 추가`;
    if (navigator.share) navigator.share({ title: '여행일정', text, url }).catch(err => { if (err && err.name !== 'AbortError') copyText(`${text}\n${url}`); });
    else copyText(`${text}\n${url}`);
  }
  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* 무시 */ } ta.remove();
      toast(ok ? '링크를 복사했어요' : '복사가 안 돼요. 링크 칸을 길게 눌러 복사하세요');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('링크를 복사했어요'), fallback); else fallback();
  }

  // 공유: 링크 하나로 보내요. 링크를 받은 사람은 누구나 볼 수 있고(로그인 없이, 바뀌면 자동 반영),
  // 고치기는 가족 공간을 만든 사람과 수정 권한을 받은 가족만 (로그인 후)
  // 공유 창 아래: 고칠 수 있는 사람 목록 (만든 사람은 여기서 바로 권한을 바꿔요)
  function editorsBox(c) {
    const fam = c.family;
    if (c.state !== 'ready' || !fam) return '<p class="note-small" style="margin:0">로그인하면 고칠 수 있는 사람 목록이 보여요.</p>';
    const rows = (fam.members || []).map(m => {
      const owner = m === fam.ownerEmail, ed = owner || (fam.editors || []).includes(m);
      const tag = owner ? '<em>만든 사람</em>' : c.isOwner
        ? `<button type="button" class="btn sm perm-btn ${ed ? 'on' : ''}" data-perm="${esc(m)}" data-on="${ed ? '' : '1'}" aria-pressed="${ed}">${ed ? '수정 가능' : '보기만'}</button>`
        : `<em class="${ed ? '' : 'ro'}">${ed ? '수정 가능' : '보기만'}</em>`;
      return `<li><span>${esc(m)}</span>${m === c.email ? '<em>나</em>' : ''}${tag}</li>`;
    }).join('');
    return `<div class="field" style="margin-top:4px"><span>고칠 수 있는 사람 <span class="hint">${c.isOwner ? '버튼을 누르면 바뀌어요' : '권한은 만든 사람이 바꿔요'}</span></span>
      <ul class="fam-list">${rows}</ul>
      <button type="button" class="btn sm ghost" id="f-fam" style="justify-self:start">${ICON.users}추가·관리</button></div>`;
  }
  const famLink = t => `${location.origin}${location.pathname}#t=${t.cloud ? t.cloud.fam + '.' : ''}${t.id}`;
  function shareSheet(t) {
    openSheet('일정 공유', `<div class="fam-share" id="fam-share"></div>`,
      `<button type="button" class="btn" data-close="1">닫기</button>`,
      (root, close) => {
        const fs = $('#fam-share', root);
        const drawFam = () => {
          const c = C();
          if (!c) { fs.innerHTML = '<p class="note-small" style="margin:0">이 화면에서는 공유를 쓸 수 없어요.</p>'; return; }
          if (t.cloud) {
            fs.innerHTML = `<div class="fam-on">${ICON.cloud}<b>링크로 공유 중</b></div>
              <p class="note-small" style="margin:0">링크를 받은 사람은 <b>누구나 볼 수 있어요</b> (로그인 없이, 일정을 바꾸면 자동으로 반영). <b>고치기</b>는 그룹을 만든 사람과 <b>수정 권한을 받은 멤버</b>만 로그인해서 할 수 있어요.</p>
              <p class="note-small" style="margin:0">링크로 보는 사람에게는 <b>항공 예약번호·숙소 예약번호·경비</b>가 보이지 않아요.</p>
              <div class="fam-row"><input type="text" id="f-link" readonly value="${esc(famLink(t))}" aria-label="공유 링크"><button type="button" class="btn" id="f-copy">복사</button></div>
              <div class="fam-row"><button type="button" class="btn primary" id="f-send">${ICON.share}카톡으로 보내기</button>${locked(t) ? '' : '<button type="button" class="btn sm ghost" id="f-off">공유 끄기</button>'}</div>
              <div class="ap-preview" id="f-msg" style="color:var(--warn)"></div>
              ${locked(t) ? '<p class="note-small" style="margin:0">이 여행은 <b>보기 전용</b>이에요. 고치려면 그룹을 만든 사람에게 수정 권한을 받으세요.</p>' : ''}
              ${editorsBox(c)}`;
          } else if (c.state === 'ready' && c.canEdit(c.family.id) === false) {
            fs.innerHTML = `<p class="note-small" style="margin:0">여행을 올려서 공유하려면 그룹을 만든 사람에게 <b>수정 권한</b>을 받아야 해요.</p>`;
          } else if (c.state === 'ready') {
            fs.innerHTML = `<p class="fam-lead">이 여행을 <b>${esc(c.family.name || '우리 그룹')}</b> 그룹에 올리면 <b>링크 하나</b>로 공유할 수 있어요. 받은 사람은 누구나 보고, 고치기는 권한을 준 멤버만 할 수 있어요.</p>
              <button type="button" class="btn primary" id="f-up">${ICON.users}올리고 공유하기</button>`;
          } else {
            fs.innerHTML = `<p class="fam-lead">구글로 로그인하고 그룹에 여행을 올리면 <b>링크 하나</b>로 공유할 수 있어요. 일정을 바꿔도 링크를 다시 보낼 필요가 없어요.</p>
              <button type="button" class="btn primary" id="f-login">${ICON.users}로그인하기</button>`;
          }
        };
        drawFam();
        if (!C()) return;
        sheetRefresh = drawFam;
        C().load().catch(() => {});
        // 링크를 보내기 전에 보기용 사본을 지금 내용으로 올려요 (규칙을 아직 안 바꿨으면 알려 줘요)
        const ready = () => C().publish(t).then(() => true, err => {
          const m = $('#f-msg', root); if (m) m.textContent = err && err.code === 'permission-denied' ? 'Firebase 규칙을 새로 게시해야 링크로 볼 수 있어요 (docs/FIREBASE_SETUP.md).' : '인터넷 연결을 확인해 주세요. 연결되면 링크로 볼 수 있어요.';
          return false;
        });
        let offArmed = false;
        fs.addEventListener('click', async ev => {
          const b = ev.target.closest('button'); if (!b) return;
          if (b.dataset.perm) { b.disabled = true; try { await C().setEditor(b.dataset.perm, !!b.dataset.on); toast(b.dataset.on ? '수정 권한을 줬어요' : '보기만 하도록 바꿨어요'); } catch (err) { toast('바꾸지 못했어요. 인터넷 연결을 확인해 주세요.'); } drawFam(); return; }
          if (b.id === 'f-fam') { close(); familySheet(); return; }
          if (b.id === 'f-copy') { copyText(famLink(t)); ready(); }
          else if (b.id === 'f-send') {
            ready();
            if (navigator.share) navigator.share({ title: tripName(t), text: `${tripName(t)} 여행 일정이에요.`, url: famLink(t) }).catch(() => {});
            else copyText(famLink(t));
          } else if (b.id === 'f-up') { C().upload(t); persist(); render(); drawFam(); toast('그룹에 올렸어요'); }
          else if (b.id === 'f-login') { close(); familySheet(); }
          else if (b.id === 'f-off') {
            if (!offArmed) { offArmed = true; b.classList.add('armed'); b.textContent = '한 번 더 누르면 꺼져요 (링크·멤버 앱에서 사라져요)'; return; }
            C().unshare(t).catch(() => {}); persist(); render(); drawFam(); toast('이 기기에만 남기고 공유를 껐어요');
          }
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
        <label class="check-inline"><input type="checkbox" id="p-stays" checked> 숙소</label>
        <label class="check-inline"><input type="checkbox" id="p-money" checked> 경비</label>
      </div>
      <div class="ap-preview" id="p-msg">${IN_FRAME ? '미리보기 화면에서는 PDF 저장·인쇄가 막혀 있어요. 실제 앱 주소에서 이용하세요.' : 'A4 세로로 만들어요. 아이폰에서는 공유 시트가 열리면 “파일에 저장”이나 카카오톡으로 보낼 수 있어요.'}</div>`,
      `<button type="button" class="btn left" id="p-print">인쇄</button><button type="button" class="btn" data-close="1">취소</button><button type="submit" class="btn primary">${ICON.doc}PDF 만들기</button>`,
      (root, close) => {
        const opts = () => ({ flights: $('#p-flights', root).checked, airports: $('#p-airports', root).checked, plan: $('#p-plan', root).checked, check: $('#p-check', root).checked, money: $('#p-money', root).checked, stays: $('#p-stays', root).checked });
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
      h += `<h2>항공편</h2><table><thead><tr><th>편명</th><th>날짜</th><th>구간</th><th>시간(현지)</th><th>터미널</th><th>발권 카운터</th><th>예약번호</th></tr></thead><tbody>
        ${fs.map(f => { const dt = terminalOf(f, 'dep'), at = terminalOf(f, 'arr'); return `<tr><td style="white-space:nowrap"><b>${esc(f.flightNo)}</b><br>${esc(airlineName(f.flightNo))}</td><td style="white-space:nowrap">${fmtD(f.depDate)}</td><td>${esc(f.dep)} ${esc(apName(f.dep, f.depName))}<br>→ ${esc(f.arr)} ${esc(apName(f.arr, f.arrName))}</td><td>${esc(f.depTime)} → ${esc(f.arrTime)}${f.arrDate && f.arrDate !== f.depDate ? ' (+' + diffDays(f.depDate, f.arrDate) + ')' : ''}<br>${esc(flightDuration(f))}</td><td style="white-space:nowrap">${esc(dt.v || '-')}${dt.est ? '*' : ''} → ${esc(at.v || '-')}${at.est ? '*' : ''}</td><td>${esc(f.counter || '당일 확인')}</td><td>${esc(f.pnr || '-')}</td></tr>`; }).join('')}
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
    if (o.stays && (t.stays || []).length) {
      h += `<h2>숙소</h2><table><thead><tr><th>숙소</th><th>체크인</th><th>체크아웃</th><th>예약번호 · 전화</th></tr></thead><tbody>
        ${[...t.stays].sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || '')).map(s => `<tr><td><b>${esc(s.name)}</b>${s.address ? `<br><span style="color:#5B6472">${esc(s.address)}</span>` : ''}${s.memo ? `<br><span style="color:#5B6472">${esc(s.memo)}</span>` : ''}</td><td style="white-space:nowrap">${s.checkIn ? fmtD(s.checkIn) : '-'} ${esc(s.checkInTime || '')}</td><td style="white-space:nowrap">${s.checkOut ? fmtD(s.checkOut) : '-'} ${esc(s.checkOutTime || '')}<br>${nightsBetween(s)}박</td><td>${esc(s.confirmNo || '-')}${s.phone ? `<br>${esc(s.phone)}` : ''}</td></tr>`).join('')}
      </tbody></table>`;
    }
    if (o.plan && days.length) {
      h += `<h2>일차별 일정</h2>` + days.map((d, i) => {
        const es = dayEntries(t, d);
        return `<div class="r-day-head"><b>${i + 1}일차</b><span>${fmtDLong(d)}</span><strong>${esc((t.dayTitles || {})[d] || '')}</strong></div>
          ${es.length ? `<table><tbody>${es.map(e => e.s
            ? `<tr><td class="t">${esc((e.kind === 'checkin' ? e.s.checkInTime : e.s.checkOutTime) || '')}</td><td style="width:44px;color:#5B6472">숙소</td><td><b>${e.kind === 'checkin' ? '체크인' : '체크아웃'} · ${esc(e.s.name)}</b></td></tr>`
            : e.kind === 'item'
            ? `<tr><td class="t">${esc(e.i.time || '—')}${e.i.endTime ? '~' + esc(e.i.endTime) : ''}</td><td style="width:44px;color:#5B6472">${TYPE_LABEL[e.i.type] || ''}</td><td><b>${esc(e.i.title)}</b>${resvText(e.i) ? ` <span style="color:${e.i.resv === 'done' ? '#1F7A4D' : '#B4541A'}">[${esc(resvText(e.i))}]</span>` : ''}${e.i.place ? ` · ${esc(e.i.place)}` : ''}${e.i.memo ? `<br><span style="color:#5B6472">${esc(e.i.memo)}</span>` : ''}${e.i.cost ? `<br><span style="color:#5B6472">${esc(e.i.cost)}</span>` : ''}</td></tr>`
            : `<tr><td class="t">${esc(e.kind === 'arrive' ? e.f.arrTime : e.f.depTime)}</td><td style="width:44px;color:#5B6472">항공</td><td><div class="r-flight"><span class="c">${esc(e.f.dep)} → ${esc(e.f.arr)}</span><span>${esc(e.f.flightNo)} ${esc(e.f.depTime)}–${esc(e.f.arrTime)}</span><span>${esc(terminalOf(e.f, 'dep').v)}${e.f.counter ? ' · 카운터 ' + esc(e.f.counter) : ''}</span></div></td></tr>`).join('')}</tbody></table>`
            : `<div style="color:#5B6472;padding:4px 6px">일정 없음</div>`}`;
      }).join('');
    }
    if (o.check && (t.checklist || []).length) {
      const list = t.checklist;
      h += `<h2>준비 체크리스트 (${list.filter(c => c.done).length}/${list.length})</h2>` + PREP_CATS.map(cat => {
        const items = list.filter(x => prepCat(x) === cat);
        return items.length ? `<div style="margin:6px 0 2px"><b style="font-size:12px;color:#5B6472">${cat}</b></div><div class="r-check">${items.map(x => `<div class="r-block"><span class="bx">${x.done ? '☑' : '☐'}</span><span>${esc(x.text)}</span></div>`).join('')}</div>` : '';
      }).join('');
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
        ${sorted.map(e => { const k = krwOf(t, e); return `<tr><td>${label(e.date)}</td><td>${esc(e.title || EXP_LABEL[expCat(t, e)])}</td><td>${EXP_LABEL[expCat(t, e)] || ''}</td><td>${PAY_LABEL[e.pay] || ''}</td><td style="text-align:right">${esc(fmtMoney(e.amount, e.currency))}</td><td style="text-align:right">${k == null ? '-' : fmtNum(k) + '원'}${e.krw != null ? ' *' : ''}</td></tr>`; }).join('')}
        </tbody></table>${t.expenses.some(e => e.krw != null) ? '<div style="color:#5B6472;margin-top:4px">* 실제 원화 결제액</div>' : ''}`;
    }
    h += `<div class="r-foot">여행일정 · ${todayStr()} 생성 · 터미널과 발권 카운터는 출발 당일 공항·항공사 안내로 다시 확인하세요.</div>`;
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
  let delItemTimer, delTripTimer;
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
    if (shared() && (act === 'share' || (act === 'family' && !sharedLive))) return;
    if (ro() && ['del-trip', 'move-sel', 'sel-done', 'move-day', 'del-item', 'add-stay', 'edit-stay', 'edit-trip', 'add-item', 'edit-item', 'day-title', 'add-flight', 'edit-flight', 'edit-check', 'del-check', 'add-exp', 'edit-exp', 'edit-rate', 'fetch-rates'].includes(act)) return;
    switch (act) {
      case 'add-exp': expSheet(t, null); break;
      case 'sel-item': selItem = selItem === id ? null : id; render(); break;
      case 'sel-done': selItem = null; render(); break;
      case 'move-sel': {
        if (selItem && moveItem(t, selItem, Number(el.dataset.dir))) {
          save(); render();
          $('#it-' + selItem)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        break;
      }
      case 'move-day': {
        const days = tripDays(t), i = days.indexOf(el.dataset.date), j = i + Number(el.dataset.dir);
        if (i < 0 || j < 0 || j >= days.length) break;
        swapDays(t, days[i], days[j]); save(); render();
        const target = $('#day-' + days[j]); if (target) target.scrollIntoView({ block: 'start' });
        toast(`${i + 1}일차와 ${j + 1}일차 일정을 바꿨어요`);
        break;
      }
      case 'del-trip': {
        const tr = state.trips.find(x => x.id === id); if (!tr || locked(tr)) break;
        if (!el.classList.contains('armed')) {
          app.querySelectorAll('.del-trip.armed').forEach(b => { b.classList.remove('armed'); b.innerHTML = ICON.trash; });
          el.classList.add('armed'); el.innerHTML = `${ICON.trash}삭제`;
          toast(tr.cloud ? '멤버 모두의 앱에서 지워져요. 한 번 더 누르면 삭제' : '한 번 더 누르면 여행이 지워져요');
          clearTimeout(delTripTimer);
          delTripTimer = setTimeout(() => { el.classList.remove('armed'); el.innerHTML = ICON.trash; }, 4000);
          break;
        }
        clearTimeout(delTripTimer);
        deleteTrips(x => x === tr); toast('여행을 삭제했어요');
        break;
      }
      case 'del-item': {
        if (!el.classList.contains('armed')) {
          app.querySelectorAll('.del-item.armed').forEach(b => { b.classList.remove('armed'); b.innerHTML = ICON.trash; });
          el.classList.add('armed'); el.innerHTML = `${ICON.trash}삭제`;
          toast('한 번 더 누르면 지워져요.' + linkedNote(t, id));
          clearTimeout(delItemTimer);
          delItemTimer = setTimeout(() => { el.classList.remove('armed'); el.innerHTML = ICON.trash; }, 4000);
          break;
        }
        clearTimeout(delItemTimer);
        const n = dropWithCosts(t, 'items', id);
        save(); render(); toast(n ? '일정과 연결된 비용을 지웠어요' : '일정을 지웠어요');
        break;
      }
      case 'add-stay': staySheet(t, null); break;
      case 'edit-stay': staySheet(t, (t.stays || []).find(x => x.id === id)); break;
      case 'goto-stay': ui.tab = 'stay'; render(); setTimeout(() => $('#st-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); break;
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
      case 'family': familySheet(); break;
      case 'del-example': deleteTrips(x => x.example); toast('예시 여행을 지웠어요'); break;
      case 'backup': backupSheet(); break;
      case 'share-app': shareApp(); break;
      case 'open-trip': selItem = null; ui.tripId = id; ui.view = 'trip'; ui.tab = ui.tab || 'plan'; render(); if (!jumpToToday()) window.scrollTo(0, 0); break;
      case 'home': selItem = null; ui.view = 'home'; render(); window.scrollTo(0, 0); break;
      case 'edit-trip': tripSheet(t); break;
      case 'tab': selItem = null; ui.tab = el.dataset.tab; render(); if (ui.tab === 'plan') jumpToToday(); break;
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
        confirmSheet(`'${c.text}' 항목을 지울까요?${linkedNote(t, id)}`, '삭제', () => {
          dropWithCosts(t, 'checklist', id);
          save(); render();
        });
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
    const costRaw = $('#new-check-cost').value.trim(), cost = Math.round(parseAmount(costRaw));
    if (costRaw && !cost) { toast('비용은 숫자로 넣어 주세요'); return; }
    const cat = $('#new-check-cat').value; ui.lastPrepCat = cat;
    const c = { id: uid(), text, cat, due: null, done: false, memo: '' };
    t.checklist.push(c);
    if (cost) { t.expenses = t.expenses || []; t.expenses.push({ id: uid(), date: '', itemId: c.id, title: shortText(text), cat: 'prep', amount: cost, currency: 'KRW', krw: null, pay: 'card', memo: '' }); }
    save(); render(); toast(cost ? `추가했어요 · 비용 ${fmtNum(cost)}원은 경비 탭에 들어갔어요` : '추가했어요'); $('#new-check-text')?.focus();
  });
  window.addEventListener('afterprint', () => { $('#print-root').innerHTML = ''; });

  if (state.seeded) { delete state.seeded; save(); }
  seedFlightMemo();
  if (ui.view === 'shared') ui.view = 'home';
  render();
  requestAnimationFrame(() => jumpToToday()); // 앱을 열 때 여행 중이면 오늘 일정부터
  const openFromHash = () => {
    const m = location.hash.match(/^#s=([01]\.[A-Za-z0-9_-]+)$/); if (m) { openShared(m[1], location.href); return; }
    const t = location.hash.match(/^#t=(?:([A-Za-z0-9]{10,40})\.)?([A-Za-z0-9_-]{4,40})$/); if (t) openTripHash(t[2], t[1]);
  };
  if (window.TPCloud) window.TPCloud.autoStart();
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
