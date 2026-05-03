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
const SHEET_ID     = '1v3cA-d8sN4owG3P1osSmIsl00CfI19RpXXrCMDZ4VPU';
const NOTIFY_EMAIL = 'ray@karbonxgaiaentertainment.com';
const LINE_TOKEN   = 'HgQRs9lj7OdDidR1mS78VtNv/9TjL1iNd2HqpqQw/laWEe4cI2n63QRfC1irwrzd1bRgkeyLMiXU0582eZVgyPhOcF5cjyBYGKueWXWh2hql5jbNPgP5uo8bJG2wbBmW/ohmq9TxRjFoJA3hDp1pnwdB04t89/1O/w1cDnyilFU=';

// ────────────── MAIN HANDLER ──────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 1. 寫入 Sheets
    writeToSheet(data);

    // 2. 寄 Email
    sendEmailNotification(data);

    // 3. 推 LINE
    try {
      sendLineNotification(data);
    } catch (lineErr) {
      // LINE 失敗不影響主流程，只記錄
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
  // 確保 LINE user ID 已註冊（首次自動撈）
  let userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  if (!userId) {
    userId = bootstrapLineUserId();
    if (!userId) {
      Logger.log('Cannot resolve LINE user ID — skipping LINE push');
      return;
    }
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

// ────────────── BOOTSTRAP / UTILITIES ──────────────
// 首次執行：撈 bot 的 followers，把第一個（也就是 KAYON）存進 Script Properties
function bootstrapLineUserId() {
  const resp = UrlFetchApp.fetch('https://api.line.me/v2/bot/followers/ids', {
    headers: { 'Authorization': 'Bearer ' + LINE_TOKEN },
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() !== 200) {
    Logger.log('Followers API failed: ' + resp.getContentText());
    return null;
  }

  const data = JSON.parse(resp.getContentText());
  const ids = data.userIds || [];

  if (ids.length === 0) {
    Logger.log('No followers found. Make sure KAYON has added the bot as friend.');
    return null;
  }

  const userId = ids[0];
  PropertiesService.getScriptProperties().setProperty('LINE_USER_ID', userId);
  Logger.log('LINE user ID registered: ' + userId);
  return userId;
}

// 可手動執行：測試 LINE 推送是否正常
function testLinePush() {
  let userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  if (!userId) {
    userId = bootstrapLineUserId();
  }
  if (!userId) {
    Logger.log('FAIL: cannot get user ID');
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
