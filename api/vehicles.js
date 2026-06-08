// api/vehicles.js — GET and POST vehicle data to/from Vercel Blob
import { put, head, getDownloadUrl } from '@vercel/blob';

const BLOB_KEY = 'dsc-fleet/vehicles.json';

async function getVehicles() {
  try {
    // Try to fetch existing blob
    const res = await fetch(`https://blob.vercel-storage.com/${BLOB_KEY}`, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    const vehicles = await getVehicles();
    return res.status(200).json({ vehicles });
  }

  if (req.method === 'POST') {
    const { vehicles } = req.body;
    if (!vehicles) return res.status(400).json({ error: 'Missing vehicles' });
    const blob = await put(BLOB_KEY, JSON.stringify(vehicles), {
      access: 'public',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return res.status(200).json({ ok: true, url: blob.url });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
