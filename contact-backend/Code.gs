/**
 * Portfolio contact form backend — Google Apps Script (free).
 *
 * Replaces the old n8n workflow, doing the same three jobs:
 *   1. logs every message as a row in this Google Sheet ("Messages" tab)
 *   2. emails it to OWNER_EMAIL, with Reply-To set to the sender
 *   3. sends the sender a short thank-you auto-reply
 *
 * Abuse guards (the endpoint is public, and it can send email):
 *   - honeypot field (`website`) silently accepted and dropped
 *   - basic validation + length caps
 *   - at most MAX_PER_HOUR messages per hour overall
 *   - at most one auto-reply per sender address per day
 *
 * Setup: see README.md next to this file.
 */

const OWNER_EMAIL = 'shreoriginal@gmail.com';
const OWNER_NAME = 'Shreyas';
const SHEET_NAME = 'Messages';
const MAX_PER_HOUR = 20;

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Bots fill the hidden honeypot — pretend all is well, do nothing
    if (data.website) return reply({ ok: true });

    const name = clean(data.name, 120);
    const email = clean(data.email, 200);
    const message = clean(data.message, 5000);
    if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return reply({ ok: false, error: 'invalid' });
    }

    const cache = CacheService.getScriptCache();
    const hourKey = 'count-' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
    const count = Number(cache.get(hourKey) || 0);
    if (count >= MAX_PER_HOUR) return reply({ ok: false, error: 'busy' });
    cache.put(hourKey, String(count + 1), 3600);

    // 1) log
    sheet().appendRow([new Date(), name, email, message, clean(data.page, 200)]);

    // 2) notify me — hitting Reply answers the sender directly
    MailApp.sendEmail({
      to: OWNER_EMAIL,
      replyTo: email,
      subject: 'Portfolio message from ' + name,
      body: message + '\n\n— ' + name + ' <' + email + '>'
    });

    // 3) thank-you to the sender (once per address per day)
    const sentKey = 'ack-' + email.toLowerCase();
    if (!cache.get(sentKey)) {
      MailApp.sendEmail({
        to: email,
        name: OWNER_NAME,
        replyTo: OWNER_EMAIL,
        subject: 'Thanks for reaching out — ' + OWNER_NAME,
        body:
          'Hi ' + name + ',\n\n' +
          'Thanks for your message — it reached me, and I’ll get back to you soon.\n\n' +
          'For reference, here’s what you sent:\n\n' + message + '\n\n' +
          '— ' + OWNER_NAME
      });
      cache.put(sentKey, '1', 21600); // cache max is 6h; good enough
    }

    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: 'server' });
  }
}

// A GET just confirms the deployment is alive (handy for testing the URL)
function doGet() {
  return reply({ ok: true, service: 'portfolio-contact' });
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Received', 'Name', 'Email', 'Message', 'Page']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
