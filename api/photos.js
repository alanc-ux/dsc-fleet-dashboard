import { put } from '@vercel/blob';

const BLOB_KEY = 'dsc-fleet/photos.json';

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
      if (!blobs || blobs.length === 0) return res.status(200).json({ photos: {} });
      const data = await fetch(blobs[0].url);
      const photos = await data.json();
      return res.status(200).json({ photos });
    } catch (e) {
      console.error('GET photos error:', e.message);
      return res.status(200).json({ photos: {} });
    }
  }

  if (req.method === 'POST') {
    try {
      const { photos } = req.body;
      if (photos === undefined) return res.status(400).json({ error: 'Missing photos' });
      await put(BLOB_KEY, JSON.stringify(photos), {
        access: 'public',
        addRandomSuffix: false,
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('POST photos error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
