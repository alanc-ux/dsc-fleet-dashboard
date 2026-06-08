import { kv } from '@vercel/kv';

const KEY = 'dsc:vehicles';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    try {
      const vehicles = await kv.get(KEY);
      return res.status(200).json({ vehicles: vehicles || null });
    } catch (e) {
      console.error('GET vehicles error:', e.message);
      return res.status(200).json({ vehicles: null });
    }
  }

  if (req.method === 'POST') {
    try {
      const { vehicles } = req.body;
      if (!vehicles) return res.status(400).json({ error: 'Missing vehicles' });
      await kv.set(KEY, vehicles);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('POST vehicles error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
