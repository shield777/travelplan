/* 가족 함께 쓰기: 구글 로그인 + Firestore 실시간 동기화
 * - 가족(families/{fam})의 members에 들어 있는 구글 이메일만 그 가족의 여행(families/{fam}/trips/{trip})을 읽고 써요 (firestore.rules)
 * - 여행 하나를 문서 하나로 통째로 저장해요. 동시에 같은 여행을 고치면 나중에 저장한 쪽이 남아요
 * - Firebase 프로그램은 필요할 때만 불러와요 (가족 기능을 안 쓰면 앱이 무거워지지 않게)
 */
(function () {
  'use strict';
  const CFG = window.TP_FIREBASE;
  if (!CFG) return;

  const EMU = /[?&]emu=1\b/.test(location.search) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname); // 개발용 에뮬레이터
  const SDK = ['vendor/firebase/firebase-app-compat.js', 'vendor/firebase/firebase-auth-compat.js', 'vendor/firebase/firebase-firestore-compat.js'];
  const LS_KEY = 'travelplan.cloud';
  const PERM_KEY = 'travelplan.perm'; // 가족별로 내가 고칠 수 있는지 (인터넷이 없을 때도 알 수 있게 기억)
  const App = () => window.TPApp;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  let loading = null, auth = null, db = null;
  let user = null, family = null, families = [];
  let famUnsub = null, tripsUnsub = null;
  let state = 'off'; // off | loading | signedout | nofamily | ready | error
  let lastError = '';
  const ownRevs = new Set();   // 내가 보낸 저장은 다시 받아도 무시
  const lastPushed = {};       // 여행별로 마지막으로 맞춘(보냈거나 받은) 내용
  // 앱을 열 때 기기에 있던 내용을 '맞춘 상태'로 봐요. 아직 못 보낸 수정은 t.cloud.dirty로 기기에 남아 있어요
  function baseline() { (App().getTrips() || []).forEach(t => { if (t.cloud && !t.cloud.dirty) lastPushed[t.id] = canon(t); }); }
  const timers = {};           // 아직 보내지 않은 저장
  let pendingWrites = 0;

  const emit = () => App() && App().cloudChanged();
  const setState = (s, err) => { state = s; lastError = err || ''; emit(); };
  const myEmail = () => (user && user.email ? user.email.toLowerCase() : '');
  const remember = on => { try { if (on) localStorage.setItem(LS_KEY, '1'); else localStorage.removeItem(LS_KEY); } catch (e) { /* 무시 */ } };
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const perms = (() => { try { return JSON.parse(localStorage.getItem(PERM_KEY)) || {}; } catch (e) { return {}; } })();
  // 가족을 만든 사람(owner)과, owner가 수정 권한을 준 사람(editors)만 여행을 고치고 지울 수 있어요
  const famCanEdit = f => !!(f && user && (f.owner === user.uid || (f.editors || []).includes(myEmail())));
  function canEdit(fam) {
    if (family && user && family.id === fam) return famCanEdit(family);
    return has(perms, fam) ? perms[fam] : null; // 모르면 null (막지 않아요)
  }
  function rememberPerm() {
    if (!family) return;
    const v = famCanEdit(family);
    if (perms[family.id] === v) return;
    perms[family.id] = v;
    try { localStorage.setItem(PERM_KEY, JSON.stringify(perms)); } catch (e) { /* 무시 */ }
  }
  const wanted = () => { try { return localStorage.getItem(LS_KEY) === '1'; } catch (e) { return false; } };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('sdk'));
      document.head.appendChild(s);
    });
  }

  function load() {
    if (loading) return loading;
    setState('loading');
    loading = SDK.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve())
      .then(() => {
        baseline();
        const fb = window.firebase;
        fb.initializeApp(CFG);
        auth = fb.auth(); db = fb.firestore();
        if (EMU) { auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); db.useEmulator('127.0.0.1', 8080); }
        db.enablePersistence({ synchronizeTabs: true }).catch(() => { /* 인터넷 없을 때 저장은 메모리로 */ });
        return new Promise(resolve => {
          let first = true;
          auth.onAuthStateChanged(u => { user = u; onUser(); if (first) { first = false; resolve(); } });
        });
      })
      .catch(err => { loading = null; setState('error', '함께 쓰기 기능을 불러오지 못했어요. 인터넷 연결을 확인하세요.'); throw err; });
    return loading;
  }

  function onUser() {
    if (famUnsub) { famUnsub(); famUnsub = null; }
    stopTrips();
    family = null; families = [];
    if (!user) { setState('signedout'); return; }
    remember(true);
    setState('loading');
    // 서버 저장이 끝났다는 알림도 받아야 해서 includeMetadataChanges를 켜요
    famUnsub = db.collection('families').where('members', 'array-contains', myEmail()).onSnapshot({ includeMetadataChanges: true }, snap => {
      // 방금 만든 가족은 서버에 저장이 끝난 뒤에 써요 (그 전에 여행을 읽으면 서버가 권한 없음으로 거절해요)
      if (snap.metadata.hasPendingWrites) return;
      families = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // 내가 만든 가족을 먼저, 없으면 초대받은 가족
      const pick = families.find(f => f.owner === user.uid) || families[0] || null;
      if (!pick) { family = null; stopTrips(); setState('nofamily'); return; }
      const changed = !family || family.id !== pick.id;
      family = pick;
      rememberPerm();
      if (changed) startTrips();
      setState('ready');
    }, err => setState('error', explain(err)));
  }

  function stopTrips() { if (tripsUnsub) { tripsUnsub(); tripsUnsub = null; } }
  function tripsCol(fam) { return db.collection('families').doc(fam).collection('trips'); }
  // 링크로 보는 사람용 사본 (로그인 없이 문서 번호를 아는 사람만 읽어요, firestore.rules)
  function pubCol(fam) { return db.collection('families').doc(fam).collection('public'); }
  // 링크가 퍼져도 안전하게: 항공 예약번호·숙소 예약번호·경비는 빼요
  function publicCopy(t) {
    const c = payload(t);
    (c.flights || []).forEach(f => { f.pnr = ''; });
    (c.stays || []).forEach(s => { s.confirmNo = ''; });
    c.expenses = [];
    return c;
  }
  function publish(t) {
    if (!db || !t.cloud) return Promise.resolve();
    return pubCol(t.cloud.fam).doc(t.id).set({ trip: publicCopy(t), updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() });
  }

  function startTrips() {
    stopTrips();
    const fam = family.id;
    tripsUnsub = tripsCol(fam).onSnapshot(snap => {
      const updates = [], removed = [];
      snap.docChanges().forEach(ch => {
        const id = ch.doc.id;
        if (ch.type === 'removed') { if (!timers[id]) removed.push(id); return; }
        const data = ch.doc.data();
        if (!data || !data.trip) return;
        if (ownRevs.has(data.rev)) return;      // 내가 보낸 것
        if (timers[id]) return;                 // 이 기기에 아직 안 보낸 수정이 있으면 그걸 먼저 보내요
        const local = (App().getTrips() || []).find(x => x.id === id);
        if (local && local.cloud && local.cloud.dirty && canEdit(fam) !== false) { push(local, true); return; }
        const t = App().normalizeTrip(data.trip);
        t.id = id; t.cloud = { fam, by: data.updatedBy || '', at: data.updatedAt && data.updatedAt.toMillis ? data.updatedAt.toMillis() : Date.now() };
        lastPushed[id] = canon(t);
        updates.push(t);
      });
      if (updates.length || removed.length) App().applyRemote(updates, removed, fam);
      if (state === 'error') setState('ready');
    }, err => {
      // 연결이 끊기거나 거절되면 잠시 뒤 다시 연결해요
      tripsUnsub = null;
      setState('error', explain(err));
      setTimeout(() => { if (family && family.id === fam && !tripsUnsub && user) startTrips(); }, 4000);
    });
  }

  // 클라우드로 보낼 내용 (기기에만 필요한 표시는 빼요)
  function payload(t) {
    const c = JSON.parse(JSON.stringify(t));
    delete c.cloud; delete c.receivedAt; delete c.shareMeta;
    return c;
  }
  const canon = t => JSON.stringify(payload(t));

  function push(t, now) {
    if (!db || !family || !t.cloud || t.cloud.fam !== family.id) return;
    if (!famCanEdit(family)) { delete t.cloud.dirty; return; } // 권한이 없으면 보내지 않아요 (가족 공간의 내용이 맞아요)
    const body = canon(t);
    if (lastPushed[t.id] === body && !now) return;
    clearTimeout(timers[t.id]);
    timers[t.id] = setTimeout(() => {
      delete timers[t.id];
      const rev = uid(); ownRevs.add(rev);
      lastPushed[t.id] = body;
      pendingWrites++; emit();
      tripsCol(family.id).doc(t.id).set({
        trip: JSON.parse(body), rev, updatedBy: myEmail(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => { pendingWrites--; if (t.cloud) delete t.cloud.dirty; App().persist(); emit(); publish(t).catch(() => { /* 규칙을 아직 안 바꿨으면 링크 보기만 안 돼요 */ }); })
        .catch(err => { pendingWrites--; lastPushed[t.id] = ''; setState('error', explain(err)); });
    }, now ? 0 : 700);
  }

  function explain(err) {
    const c = (err && err.code) || '';
    if (c === 'permission-denied') return '권한이 없어요. 멤버로 등록된 구글 계정인지 확인하세요.';
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '로그인을 취소했어요.';
    if (c === 'auth/unauthorized-domain') return 'Firebase 설정에서 승인된 도메인에 shield777.github.io를 추가해야 해요.';
    if (c === 'auth/operation-not-allowed') return 'Firebase에서 Google 로그인을 켜야 해요 (Authentication → 로그인 방법).';
    if (c === 'unavailable') return '인터넷 연결이 없어요. 연결되면 자동으로 맞춰져요.';
    return '문제가 생겼어요' + (c ? ` (${c})` : '') + '. 잠시 뒤 다시 해 보세요.';
  }

  const api = {
    get enabled() { return true; },
    get state() { return state; },
    get error() { return lastError; },
    get email() { return myEmail(); },
    get family() { return family; },
    get isOwner() { return !!(family && user && family.owner === user.uid); },
    canEdit,
    get syncing() { return pendingWrites > 0 || Object.keys(timers).length > 0; },
    load,
    // app.js의 save()가 저장 직전에 불러요: 바뀐 여행에 '아직 안 보냄' 표시
    markDirty(trips) { trips.forEach(t => { if (t.cloud && lastPushed[t.id] !== undefined && canon(t) !== lastPushed[t.id]) t.cloud.dirty = true; }); },
    autoStart() { baseline(); if (wanted() || App().hasCloudTrips()) load().catch(() => {}); },

    async signIn() {
      await load();
      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await auth.signInWithPopup(provider);
      } catch (err) {
        const c = err && err.code;
        if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment' || c === 'auth/web-storage-unsupported') {
          await auth.signInWithRedirect(provider); return;
        }
        setState(user ? state : 'signedout', explain(err)); throw err;
      }
    },
    async signOut() { remember(false); if (auth) await auth.signOut(); },

    async createFamily(name) {
      await db.collection('families').add({
        name: (name || '우리 그룹').slice(0, 30), owner: user.uid, ownerEmail: myEmail(), members: [myEmail()],
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    async addMember(email) {
      const e = String(email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('email');
      await db.collection('families').doc(family.id).update({ members: window.firebase.firestore.FieldValue.arrayUnion(e) });
    },
    async removeMember(email) {
      const FV = window.firebase.firestore.FieldValue;
      await db.collection('families').doc(family.id).update({ members: FV.arrayRemove(email), editors: FV.arrayRemove(email) });
    },
    // 수정·삭제 권한 주기/빼기 (owner만)
    async setEditor(email, on) {
      const FV = window.firebase.firestore.FieldValue;
      await db.collection('families').doc(family.id).update({ editors: on ? FV.arrayUnion(email) : FV.arrayRemove(email) });
    },

    // 여행을 가족 공간에 올리기 / 내리기
    upload(t) { t.cloud = { fam: family.id, by: myEmail(), at: Date.now(), dirty: true }; push(t, true); },
    async unshare(t) {
      if (canEdit(t.cloud && t.cloud.fam) === false) return;
      const fam = t.cloud && t.cloud.fam;
      delete t.cloud;
      if (fam && db) { pubCol(fam).doc(t.id).delete().catch(() => {}); await tripsCol(fam).doc(t.id).delete(); }
    },
    // 링크를 보내기 전에 보기용 사본을 지금 내용으로 올려요
    publish(t) { return load().then(() => publish(t)); },
    // 링크로 연 여행 보기 (로그인 없이). 바뀌면 다시 불러요. 그만 볼 때 쓰는 함수를 돌려줘요
    async watchPublic(fam, id, onData, onErr) {
      await load();
      return pubCol(fam).doc(id).onSnapshot(snap => onData(snap.exists ? snap.data() : null), err => onErr && onErr(err));
    },
    // 이 기기에서 고친 여행을 보내요 (app.js의 save()가 불러요)
    onLocalSave(trips) { if (state === 'ready') trips.forEach(t => { if (t.cloud) push(t); }); },
    removeTrip(t) {
      if (canEdit(t.cloud && t.cloud.fam) === false) return;
      if (db && t.cloud && family && t.cloud.fam === family.id) {
        pubCol(family.id).doc(t.id).delete().catch(() => {});
        tripsCol(family.id).doc(t.id).delete().catch(err => setState('error', explain(err)));
      }
    },

    // 개발용: 에뮬레이터에서만 가짜 구글 계정으로 로그인
    async _testSignIn(email) {
      if (!EMU) return;
      await load();
      const cred = window.firebase.auth.GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true }));
      await auth.signInWithCredential(cred);
    }
  };
  window.TPCloud = api;
})();
