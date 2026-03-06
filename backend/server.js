const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const cors = require('cors');
app.use(cors({ origin: 'https://lazloh20.github.io' }));
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'ok', app: 'LlH20 v1.5 Backend' }));

app.post('/api/claude', async (req, res) => {
  const { key, model, query } = req.body;
  if (!key) return res.status(400).json({ error: 'No Claude API key provided' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || 'claude-haiku-4-5', max_tokens: 1024, messages: [{ role: 'user', content: query }] })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Claude error' });
    res.json({ answer: data.content[0].text, model });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/telegram', async (req, res) => {
  const { key, chat_id, text } = req.body;
  if (!key) return res.status(400).json({ error: 'No Telegram token' });
  try {
    const r = await fetch(`https://api.telegram.org/bot${key}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text })
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/slack', async (req, res) => {
  const { key, channel, text } = req.body;
  if (!key) return res.status(400).json({ error: 'No Slack token' });
  try {
    const r = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text })
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/discord', async (req, res) => {
  const { webhook_url, content } = req.body;
  if (!webhook_url) return res.status(400).json({ error: 'No Discord webhook URL' });
  try {
    const r = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    res.json({ ok: r.ok, status: r.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/whatsapp', async (req, res) => {
  const { key, phone_number_id, to, message } = req.body;
  if (!key) return res.status(400).json({ error: 'No WhatsApp token' });
  try {
    const r = await fetch(`https://graph.facebook.com/v18.0/${phone_number_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } })
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/twilio', async (req, res) => {
  const { account_sid, auth_token, from, to, body } = req.body;
  if (!account_sid) return res.status(400).json({ error: 'No Twilio credentials' });
  try {
    const auth = Buffer.from(`${account_sid}:${auth_token}`).toString('base64');
    const params = new URLSearchParams({ From: from, To: to, Body: body });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/buffer', async (req, res) => {
  const { key, profile_ids, text, scheduled_at } = req.body;
  if (!key) return res.status(400).json({ error: 'No Buffer token' });
  try {
    const r = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_ids, text, scheduled_at, now: !scheduled_at })
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const affiliateMap = { shopify: 'https://www.shopify.com/affiliates', notion: 'https://www.notion.so/affiliates' };
app.get('/r/:id', (req, res) => {
  const url = affiliateMap[req.params.id];
  if (!url) return res.status(404).send('Not found');
  res.redirect(302, url);
});

app.listen(PORT, () => console.log(`LlH20 backend running on port ${PORT}`));
