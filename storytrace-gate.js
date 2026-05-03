// ============================================================
//  Storytrace Control Panel — Access Gate
//  KAYON STUDIO x KARBON X GAIA ENTERTAINMENT
//  v1.0
// ============================================================
//  在 wedding-control.html 的 <head> 最頂端載入：
//    <script src="storytrace-gate.js"></script>
// ============================================================

(function () {
  'use strict';

  const CONFIG = {
    // 密碼的 SHA-256 雜湊。要換密碼跟 Claude 說即可
    PASSWORD_HASH: '98c4817e87fd529505cfd9d2f9a417f2daea340e1b8959c15011fb58b9be8685',
    CACHE_HOURS: 12,           // 解鎖快取時數，0 = 每次都要輸入
    LS_KEY: 'storytrace_gate_unlock_v1',
    MAX_ATTEMPTS: 5,           // 連錯 N 次鎖定
    LOCKOUT_SECONDS: 60,
  };

  // 在頁面渲染前先把整頁遮起來，避免控台內容閃現
  const earlyStyle = document.createElement('style');
  earlyStyle.id = 'storytrace-gate-early';
  earlyStyle.textContent = 'html{visibility:hidden!important}';
  (document.head || document.documentElement).appendChild(earlyStyle);

  function reveal() {
    const s = document.getElementById('storytrace-gate-early');
    if (s) s.remove();
  }

  async function sha256Hex(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CONFIG.LS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj.ts || !obj.hashTag) return null;
      if (obj.hashTag !== CONFIG.PASSWORD_HASH.slice(0, 8)) {
        localStorage.removeItem(CONFIG.LS_KEY);
        return null;
      }
      const ageMs = Date.now() - obj.ts;
      if (ageMs > CONFIG.CACHE_HOURS * 3600 * 1000) {
        localStorage.removeItem(CONFIG.LS_KEY);
        return null;
      }
      return obj;
    } catch {
      return null;
    }
  }

  function writeCache() {
    localStorage.setItem(
      CONFIG.LS_KEY,
      JSON.stringify({
        ts: Date.now(),
        hashTag: CONFIG.PASSWORD_HASH.slice(0, 8),
      })
    );
  }

  function readAttempts() {
    try { return JSON.parse(localStorage.getItem(CONFIG.LS_KEY + '_attempts') || '{}'); }
    catch { return {}; }
  }
  function writeAttempts(obj) {
    localStorage.setItem(CONFIG.LS_KEY + '_attempts', JSON.stringify(obj));
  }
  function clearAttempts() {
    localStorage.removeItem(CONFIG.LS_KEY + '_attempts');
  }

  function renderLockScreen() {
    document.body.innerHTML = '';
    document.body.style.cssText =
      'background:#0D0D0D;color:#C9A84C;font-family:-apple-system,BlinkMacSystemFont,"PingFang TC","Microsoft JhengHei",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box;';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;max-width:340px;text-align:center;';
    wrap.innerHTML = `
      <div style="font-size:44px;margin-bottom:8px;">🎛️</div>
      <h1 style="margin:0 0 4px;font-size:18px;letter-spacing:3px;font-weight:600;">STORYTRACE</h1>
      <p style="opacity:.45;margin:0 0 28px;font-size:11px;letter-spacing:2px;">CONTROL PANEL ACCESS</p>
      <input type="password" id="st-pwd" placeholder="輸入控台密碼" autocomplete="off" autocapitalize="off" autocorrect="off"
        style="width:100%;padding:14px 16px;border:1px solid rgba(201,168,76,.3);background:#1a1a1a;color:#fff;border-radius:8px;font-size:16px;outline:none;box-sizing:border-box;letter-spacing:2px;text-align:center;">
      <button id="st-unlock"
        style="margin-top:12px;width:100%;padding:14px;border:none;background:#C9A84C;color:#0D0D0D;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:3px;cursor:pointer;transition:opacity .15s;">
        UNLOCK
      </button>
      <label style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;font-size:12px;opacity:.55;cursor:pointer;user-select:none;">
        <input type="checkbox" id="st-remember" checked style="cursor:pointer;"> 記住此裝置 ${CONFIG.CACHE_HOURS} 小時
      </label>
      <p id="st-msg" style="color:#ff5566;margin:14px 0 0;font-size:12px;min-height:18px;letter-spacing:.5px;"></p>
      <p style="opacity:.25;margin:32px 0 0;font-size:10px;letter-spacing:1px;">KAYON STUDIO × KARBON X GAIA</p>
    `;
    document.body.appendChild(wrap);
    reveal();

    const pwdEl = document.getElementById('st-pwd');
    const btnEl = document.getElementById('st-unlock');
    const remEl = document.getElementById('st-remember');
    const msgEl = document.getElementById('st-msg');
    pwdEl.focus();

    function isLockedOut() {
      const a = readAttempts();
      if (!a.lockedUntil) return 0;
      const remain = a.lockedUntil - Date.now();
      return remain > 0 ? remain : 0;
    }

    function updateLockoutUI() {
      const remain = isLockedOut();
      if (remain > 0) {
        btnEl.disabled = true;
        btnEl.style.opacity = '.4';
        btnEl.style.cursor = 'not-allowed';
        msgEl.textContent = `已鎖定，剩 ${Math.ceil(remain / 1000)} 秒`;
        setTimeout(updateLockoutUI, 1000);
      } else {
        btnEl.disabled = false;
        btnEl.style.opacity = '';
        btnEl.style.cursor = 'pointer';
        if (msgEl.textContent.startsWith('已鎖定')) msgEl.textContent = '';
      }
    }

    async function attempt() {
      if (isLockedOut() > 0) return;
      const pwd = pwdEl.value;
      if (!pwd) { msgEl.textContent = '請輸入密碼'; return; }
      msgEl.textContent = '';
      btnEl.disabled = true;
      btnEl.textContent = '檢查中…';

      const inputHash = await sha256Hex(pwd);
      if (inputHash === CONFIG.PASSWORD_HASH.toLowerCase()) {
        clearAttempts();
        if (remEl.checked) writeCache();
        btnEl.textContent = '✓ UNLOCKED';
        btnEl.style.background = '#27ae60';
        btnEl.style.color = '#fff';
        setTimeout(() => location.reload(), 200);
      } else {
        btnEl.disabled = false;
        btnEl.textContent = 'UNLOCK';
        const a = readAttempts();
        const fails = (a.fails || 0) + 1;
        if (fails >= CONFIG.MAX_ATTEMPTS) {
          writeAttempts({ fails: 0, lockedUntil: Date.now() + CONFIG.LOCKOUT_SECONDS * 1000 });
          updateLockoutUI();
        } else {
          writeAttempts({ fails });
          msgEl.textContent = `密碼錯誤（${fails}/${CONFIG.MAX_ATTEMPTS}）`;
        }
        pwdEl.value = '';
        pwdEl.focus();
      }
    }

    btnEl.addEventListener('click', attempt);
    pwdEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') attempt(); });
    updateLockoutUI();
  }

  function boot() {
    if (readCache()) { reveal(); return; }
    renderLockScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // 在 console 跑 storytraceLogout() 可以強制登出（清快取 + reload）
  window.storytraceLogout = function () {
    localStorage.removeItem(CONFIG.LS_KEY);
    clearAttempts();
    location.reload();
  };
})();
