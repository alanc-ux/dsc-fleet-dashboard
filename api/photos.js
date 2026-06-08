// api/photos.js — GET and POST vehicle photos to/from Vercel Blob
import { put } from '@vercel/blob';

const BLOB_KEY = 'dsc-fleet/photos.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    try {
      const r = await fetch(`https://blob.vercel-storage.com/${BLOB_KEY}`, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
      });
      if (!r.ok) return res.status(200).json({ photos: {} });
      const photos = await r.json();
      return res.status(200).json({ photos });
    } catch (_) { return res.status(200).json({ photos: {} }); }
  }

  if (req.method === 'POST') {
    const { photos } = req.body;
    if (photos === undefined) return res.status(400).json({ error: 'Missing photos' });
    await put(BLOB_KEY, JSON.stringify(photos), {
      access: 'public',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
