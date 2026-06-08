import { kv } from '@vercel/kv';

const KEY = 'dsc:docs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    try {
      const docs = await kv.get(KEY);
      return res.status(200).json({ docs: docs || {} });
    } catch (e) {
      console.error('GET docs error:', e.message);
      return res.status(200).json({ docs: {} });
    }
  }

  if (req.method === 'POST') {
    try {
      const { docs } = req.body;
      if (docs === undefined) return res.status(400).json({ error: 'Missing docs' });
      await kv.set(KEY, docs);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('POST docs error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
