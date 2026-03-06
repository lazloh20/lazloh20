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

app.listen(PORT, () => console.log(`LlH20 backend running on port ${PORT}`));
