import { kv } from '@vercel/kv';

const KEY = 'dsc:photos';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    try {
      const photos = await kv.get(KEY);
      return res.status(200).json({ photos: photos || {} });
    } catch (e) {
      console.error('GET photos error:', e.message);
      return res.status(200).json({ photos: {} });
    }
  }

  if (req.method === 'POST') {
    try {
      const { photos } = req.body;
      if (photos === undefined) return res.status(400).json({ error: 'Missing photos' });
      await kv.set(KEY, photos);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('POST photos error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
