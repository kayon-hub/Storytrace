// ════════════════════════════════════════════════════════
//  Storytrace 需求表 — Google Apps Script v2
//  KAYON STUDIO × KARBON X GAIA ENTERTAINMENT
//
//  功能：
//    1. 表單送出 → 寫入 Google Sheets
//    2. 寄 Email 通知到 ray@
//    3. 推送 LINE 訊息到 KAYON 個人 LINE
//
//  部署：Extensions → Apps Script → 把整個檔案內容貼進去 → Save
//        → Deploy → Manage deployments → 編輯既有部署 → New version → Deploy
// ════════════════════════════════════════════════════════

// ────────────── CONFIG ──────────────
const SHEET_ID      = '1v3cA-d8sN4owG3P1osSmIsl00CfI19RpXXrCMDZ4VPU';
const NOTIFY_EMAIL  = 'ray@karbonxgaiaentertainment.com';
const LINE_TOKEN    = 'HgQRs9lj7OdDidR1mS78VtNv/9TjL1iNd2HqpqQw/laWEe4cI2n63QRfC1irwrzd1bRgkeyLMiXU0582eZVgyPhOcF5cjyBYGKueWXWh2hql5jbNPgP5uo8bJG2wbBmW/ohmq9TxRjFoJA3hDp1pnwdB04t89/1O/w1cDnyilFU=';
const LINE_USER_ID  = 'U6cc085fec4bee1b9ad8aa99b63da5b18';   // KAYON 個人 LINE

// ────────────── MAIN HANDLER ──────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ── 是 LINE webhook 事件嗎？ ──
    if (data.events && Array.isArray(data.events)) {
      return handleLineWebhook(data);
    }

    // ── 否則當成需求表單送出 ──
    // 1. 寫入 Sheets
    writeToSheet(data);

    // 2. 寄 Email
    sendEmailNotification(data);

    // 3. 推 LINE
    try {
      sendLineNotification(data);
    } catch (lineErr) {
      Logger.log('LINE push failed: ' + lineErr);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost error: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ────────────── LINE WEBHOOK HANDLER ──────────────
// 收到 LINE 的事件（使用者傳訊息、加好友、解除好友等）
// 主要用來：在使用者第一次傳訊息時抓 user ID
function handleLineWebhook(payload) {
  const props = PropertiesService.getScriptProperties();

  for (const event of (payload.events || [])) {
    const userId = event.source && event.source.userId;
    if (!userId) continue;

    const existing = props.getProperty('LINE_USER_ID');

    // 第一次：儲存 user ID 並回覆確認
    if (!existing) {
      props.setProperty('LINE_USER_ID', userId);
      Logger.log('LINE user ID captured via webhook: ' + userId);

      if (event.replyToken) {
        try {
          UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'post',
            contentType: 'application/json',
            headers: { 'Authorization': 'Bearer ' + LINE_TOKEN },
            payload: JSON.stringify({
              replyToken: event.replyToken,
              messages: [{
                type: 'text',
                text: '✅ Storytrace 已綁定你的 LINE！\n\n之後客戶填需求表時，這裡會收到完整內容通知。\n\n— KAYON STUDIO'
              }]
            }),
            muteHttpExceptions: true
          });
        } catch (e) {
          Logger.log('Webhook reply failed: ' + e);
        }
      }
    }
    // 已經綁定過：忽略後續訊息（避免重複占用 webhook 額度）
  }

  return ContentService
    .createTextOutput('ok')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────── SHEETS ──────────────
function writeToSheet(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheets()[0];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '時間戳記', '姓名', '公司', '電話', 'Email', 'LINE',
      '活動名稱', '活動類型', '活動日期', '活動地點', '預計人數',
      '主題色', '活動標語', '素材需求', '功能需求', '預算規模',
      '備註', '來源'
    ]);
    sheet.getRange(1, 1, 1, 18)
      .setBackground('#0D0D0D')
      .setFontColor('#C9A84C')
      .setFontWeight('bold');
  }

  sheet.appendRow([
    new Date(),
    data['姓名']   || '',
    data['公司']   || '',
    data['電話']   || '',
    data['Email']  || '',
    data['LINE']   || '',
    data['活動名稱'] || '',
    data['活動類型'] || '',
    data['活動日期'] || '',
    data['活動地點'] || '',
    data['預計人數'] || '',
    data['主題色'] || '',
    data['活動標語'] || '',
    data['素材需求'] || '',
    data['功能需求'] || '',
    data['預算規模'] || '',
    data['備註']   || '',
    data['來源']   || '',
  ]);
}

// ────────────── EMAIL ──────────────
function sendEmailNotification(data) {
  const subject = `【Storytrace 新需求】${data['活動名稱'] || '未填'} — ${data['姓名'] || '未填'}`;
  const body = `
收到一筆新的 Storytrace 活動需求表！

━━━━━━━━━━━━━━━━━━━━━━━━
▌ 聯絡資訊
姓名：${data['姓名'] || '—'}
公司：${data['公司'] || '—'}
電話：${data['電話'] || '—'}
Email：${data['Email'] || '—'}
LINE：${data['LINE'] || '—'}

▌ 活動資訊
活動名稱：${data['活動名稱'] || '—'}
活動類型：${data['活動類型'] || '—'}
活動日期：${data['活動日期'] || '—'}
活動地點：${data['活動地點'] || '—'}
預計人數：${data['預計人數'] || '—'}

▌ 品牌視覺
主題色：${data['主題色'] || '—'}
活動標語：${data['活動標語'] || '—'}
素材：${data['素材需求'] || '—'}

▌ 功能需求
${data['功能需求'] || '—'}

▌ 預算規模：${data['預算規模'] || '—'}

▌ 備註：
${data['備註'] || '—'}

▌ 來源：${data['來源'] || '—'}
━━━━━━━━━━━━━━━━━━━━━━━━
查看所有需求表記錄：
https://docs.google.com/spreadsheets/d/${SHEET_ID}
  `.trim();

  GmailApp.sendEmail(NOTIFY_EMAIL, subject, body, {
    replyTo: data['Email'] || '',
  });
}

// ────────────── LINE PUSH ──────────────
function sendLineNotification(data) {
  // 優先用 Script Properties（如果之後想換 ID 不用改程式），否則用上面的常數
  const userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID') || LINE_USER_ID;
  if (!userId) {
    Logger.log('LINE user ID not configured — skipping LINE push');
    return;
  }

  const text =
`🎯 Storytrace 新需求進來了！

▎ ${data['活動名稱'] || '未填活動名稱'}
類型：${data['活動類型'] || '—'}
日期：${data['活動日期'] || '—'}
地點：${data['活動地點'] || '—'}
人數：${data['預計人數'] || '—'}

──────────
聯絡人：${data['姓名'] || '—'}
公司：${data['公司'] || '—'}
電話：${data['電話'] || '—'}
Email：${data['Email'] || '—'}
LINE：${data['LINE'] || '—'}

──────────
預算：${data['預算規模'] || '—'}
功能：${(data['功能需求'] || '—').substring(0, 80)}

📋 完整內容：
docs.google.com/spreadsheets/d/${SHEET_ID}`;

  const resp = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + LINE_TOKEN },
    payload: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: text }]
    }),
    muteHttpExceptions: true
  });

  const code = resp.getResponseCode();
  if (code !== 200) {
    Logger.log('LINE push HTTP ' + code + ': ' + resp.getContentText());
  }
}

// ────────────── UTILITIES ──────────────
// User ID 透過 webhook 取得（免費 OA 不能用 followers API）
// 此函式僅作為診斷用：檢查目前是否已綁定
function checkLineUserId() {
  const userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  if (userId) {
    Logger.log('OK: LINE user ID is bound: ' + userId);
  } else {
    Logger.log('NOT BOUND: 請先設定 webhook URL，然後從個人 LINE 傳一句話給 bot');
  }
  return userId;
}

// 可手動執行：測試 LINE 推送是否正常
function testLinePush() {
  const userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID') || LINE_USER_ID;
  if (!userId) {
    Logger.log('FAIL: user ID 沒設定');
    return;
  }

  const resp = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + LINE_TOKEN },
    payload: JSON.stringify({
      to: userId,
      messages: [{
        type: 'text',
        text: '✅ Storytrace LINE 通知測試成功！\n\n之後客戶填需求表時，這裡就會收到完整內容通知。'
      }]
    }),
    muteHttpExceptions: true
  });

  Logger.log('Test push HTTP ' + resp.getResponseCode() + ': ' + resp.getContentText());
}

// 可手動執行：清掉已存的 user ID（換 LINE 帳號或除錯用）
function resetLineUserId() {
  PropertiesService.getScriptProperties().deleteProperty('LINE_USER_ID');
  Logger.log('LINE user ID cleared.');
}
