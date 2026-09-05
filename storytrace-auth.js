// ============================================================
//  Storytrace — 匿名登入＋工作人員金鑰（classic script，控台／副控／賓客端／手動控台共用）
//  - 每個頁面都匿名登入（uid 由瀏覽器保存）；賓客只能寫自己的 guests/{uid}
//  - 工作人員頁多寫 staff/{uid} = 金鑰；rules 只在金鑰等於 secrets/staffKey 時放行
//  - 金鑰存 localStorage；也可用網址 #k=金鑰 帶進來（進頁面就存起來並從網址拿掉）
//  - Firebase Authentication 沒啟用時登入會失敗 → 回 uid:null，頁面照舊無驗證跑（rules 上鎖前不會壞）
// ============================================================
(function () {
  'use strict';
  const LS = 'storytrace_staff_key_v1';
  const AUTH_URL = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
  function absorbHashKey() {
    try {
      const m = /[#&]k=([^&]+)/.exec(location.hash || '');
      if (!m) return;
      const k = decodeURIComponent(m[1]).trim();
      if (k) localStorage.setItem(LS, k);
      history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {}
  }
  absorbHashKey();
  window.StorytraceAuth = {
    LS: LS,
    getKey() { try { return (localStorage.getItem(LS) || '').trim(); } catch (e) { return ''; } },
    setKey(k) { try { k = String(k || '').trim(); if (k) localStorage.setItem(LS, k); else localStorage.removeItem(LS); } catch (e) {} },
    padLink(room) {
      const k = this.getKey();
      const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'storytrace-pad.html';
      return base + (room ? '?room=' + encodeURIComponent(room) : '') + (k ? '#k=' + encodeURIComponent(k) : '');
    },
    async signIn(app) {
      try {
        const authMod = await import(AUTH_URL);
        const auth = authMod.getAuth(app);
        const cred = await authMod.signInAnonymously(auth);
        return { uid: cred.user.uid, auth: auth, authMod: authMod };
      } catch (e) {
        return { uid: null, reason: (e && e.code) || String(e) };
      }
    },
    async registerStaff(dbMod, db, uid, key) {
      if (!uid) return { ok: false, reason: 'no-auth' };
      if (!key) return { ok: false, reason: 'no-key' };
      try { await dbMod.set(dbMod.ref(db, 'staff/' + uid), key); return { ok: true }; }
      catch (e) { return { ok: false, reason: (e && e.code) || String(e) }; }
    },
    explain(reason) {
      if (!reason) return '';
      if (/configuration-not-found|admin-restricted|operation-not-allowed/i.test(reason)) return 'Firebase 匿名登入尚未啟用（資料庫尚未上鎖，先照舊運作）';
      if (/PERMISSION_DENIED/i.test(reason)) return '金鑰不對或尚未輸入：資料庫已上鎖，請輸入工作人員金鑰';
      if (reason === 'no-key') return '尚未輸入工作人員金鑰';
      if (/network/i.test(reason)) return '登入時網路失敗';
      return reason;
    }
  };
})();
