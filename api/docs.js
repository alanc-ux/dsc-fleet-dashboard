import { put, list } from '@vercel/blob';

const BLOB_KEY = 'dsc-fleet/docs.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ error: 'Blob token not configured' });

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: BLOB_KEY, limit: 1, token });
      if (!blobs || blobs.length === 0) return res.status(200).json({ docs: {} });
      const data = await fetch(blobs[0].url);
      const docs = await data.json();
      return res.status(200).json({ docs });
    } catch (e) {
      console.error('GET docs error:', e.message);
      return res.status(200).json({ docs: {} });
    }
  }

  if (req.method === 'POST') {
    try {
      const { docs } = req.body;
      if (docs === undefined) return res.status(400).json({ error: 'Missing docs' });
      await put(BLOB_KEY, JSON.stringify(docs), {
        access: 'public',
        addRandomSuffix: false,
        token,
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('POST docs error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
