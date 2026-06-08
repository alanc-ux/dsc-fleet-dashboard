import { put } from '@vercel/blob';

const BLOB_KEY = 'dsc-fleet/vehicles.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    try {
      const list = await fetch(
        `https://blob.vercel-storage.com/?prefix=${BLOB_KEY}&limit=1`,
        { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } }
      );
      const { blobs } = await list.json();
      if (!blobs || blobs.length === 0) return res.status(200).json({ vehicles: null });
      const data = await fetch(blobs[0].url);
      const vehicles = await data.json();
      return res.status(200).json({ vehicles });
    } catch (e) {
      console.error('GET vehicles error:', e.message);
      return res.status(200).json({ vehicles: null });
    }
  }

  if (req.method === 'POST') {
    try {
      const { vehicles } = req.body;
      if (!vehicles) return res.status(400).json({ error: 'Missing vehicles' });
      await put(BLOB_KEY, JSON.stringify(vehicles), {
        access: 'public',
        addRandomSuffix: false,
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('POST vehicles error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
