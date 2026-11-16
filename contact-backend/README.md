# Contact form backend (free — Google Apps Script)

The portfolio's contact form posts to a small Google Apps Script web app that
runs in your own Google account. It replaces the old n8n workflow and does the
same three things:

1. **Logs** each message as a row in a Google Sheet
2. **Emails** it to you — hitting *Reply* answers the sender directly
3. **Auto-replies** to the sender with a short thank-you

It's free, there's no server to keep awake, and Google's limit (about 100
emails a day on a personal account) is far more than a portfolio needs.

## One-time setup (about 3 minutes)

1. Go to [sheets.new](https://sheets.new) to create a blank Google Sheet.
   Name it something like *Portfolio messages*.
2. In the sheet: **Extensions → Apps Script**.
3. Delete the starter code, paste in everything from [`Code.gs`](Code.gs), and
   save (the disk icon). Check `OWNER_EMAIL` at the top is where you want
   messages to arrive.
4. Click **Deploy → New deployment**. Next to *Select type*, click the gear and
   choose **Web app**. Set:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**

   Click **Deploy**, then **Authorize access** and allow it. Google shows an
   "unverified app" warning because it's your own script — choose *Advanced →
   Go to (project name)* and *Allow*.
5. Copy the **Web app URL** (it ends in `/exec`).
6. In `src/main.js`, paste it into `CONTACT_ENDPOINT`:

   ```js
   const CONTACT_ENDPOINT = 'https://script.google.com/macros/s/…/exec';
   ```

7. Rebuild and deploy the site. Send yourself a test message from the live
   form: a row should appear in the sheet, the email should arrive, and the
   address you used gets the thank-you.

Opening the `/exec` URL in a browser should show
`{"ok":true,"service":"portfolio-contact"}` — a quick way to check it's live.

## Changing it later

Edit the script, then **Deploy → Manage deployments → (edit) → Version: New
version → Deploy**. The URL stays the same, so the site doesn't need changing.

## Until it's set up

While `CONTACT_ENDPOINT` is empty, the form doesn't try to send at all. It
offers the visitor *Open in Gmail*, *Email app* and *Copy message* instead,
pre-filled with what they typed, so no message is ever lost.
