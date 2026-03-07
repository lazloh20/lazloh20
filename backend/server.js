const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'https://lazloh20.github.io' }));
app.use(express.json());

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', app: 'LlH20 v1.5 Backend' }));

// Claude proxy
app.post('/api/claude', async (req, res) => {
  const { key, model, query } = req.body;
  if (!key) return res.status(400).json({ error: 'No Claude API key provided' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: query }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Claude error' });
    res.json({ answer: data.content[0].text, model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Perplexity proxy
app.post('/api/perplexity', async (req, res) => {
  const { key, model, query } = req.body;
  if (!key) return res.status(400).json({ error: 'No Perplexity API key provided' });
  try {
    const r = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'sonar',
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Answer concisely with cited sources.' },
          { role: 'user', content: query }
        ]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Perplexity error' });
    res.json({ answer: data.choices[0].message.content, citations: data.citations, model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Telegram webhook -> Claude
app.post('/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;
    if (!update.message || !update.message.text) {
      return res.sendStatus(200);
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    // Only handle your own chat for now
    if (chatId !== 6114515468) {
      return res.sendStatus(200);
    }

    // Claude API key + Telegram bot token from Railway env vars
    const claudeKey = process.env.CLAUDE_API_KEY;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!claudeKey || !telegramToken) {
      console.error('Missing CLAUDE_API_KEY or TELEGRAM_BOT_TOKEN');
      return res.sendStatus(500);
    }

    // Model selection: /haiku, /sonnet, /opus
    let model = 'claude-haiku-4-5';
    let query = text;

    if (text.startsWith('/haiku')) {
      model = 'claude-haiku-4-5';
      query = text.replace('/haiku', '').trim() || 'You are set to Haiku. Reply OK.';
    } else if (text.startsWith('/sonnet')) {
      model = 'claude-sonnet-4-5';
      query = text.replace('/sonnet', '').trim() || 'You are set to Sonnet. Reply OK.';
    } else if (text.startsWith('/opus')) {
      model = 'claude-opus-4-5';
      query = text.replace('/opus', '').trim() || 'You are set to Opus. Reply OK.';
    }

    // Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [{ role: 'user', content: query }]
      })
    });

    const claudeData = await claudeRes.json();
    let answer = 'Sorry, Claude error.';

    if (claudeRes.ok && claudeData.content && claudeData.content[0] && claudeData.content[0].text) {
      answer = claudeData.content[0].text;
    } else if (claudeData.error && claudeData.error.message) {
      answer = `Error: ${claudeData.error.message}`;
    }

    // Send reply back to Telegram
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: answer,
        parse_mode: 'Markdown'
      })
    });

    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error', err);
    res.sendStatus(200); // Avoid Telegram retries loop
  }
});

app.listen(PORT, () => console.log(`LlH20 backend running on port ${PORT}`));
