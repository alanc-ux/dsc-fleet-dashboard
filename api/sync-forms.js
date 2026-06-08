// api/sync-forms.js
// Updates the Vehicle ID dropdown in all 3 Jotform forms
// whenever vehicles are added or deleted from the dashboard

const FORM_IDS = [
  '261553473034050', // Sign Out
  '261554150654051', // Sign In  
  '261553782081055', // Maintenance
];

const JOTFORM_BASE = 'https://api.jotform.com';

async function getFormQuestions(formId, apiKey) {
  const res = await fetch(`${JOTFORM_BASE}/form/${formId}/questions?apiKey=${apiKey}`);
  const json = await res.json();
  return json.content || {};
}

async function updateDropdown(formId, questionId, options, apiKey) {
  const body = new URLSearchParams();
  options.forEach((opt, i) => {
    body.append(`question[options]`, opt);
  });
  // Jotform API: PUT /form/{id}/question/{qid}
  const res = await fetch(`${JOTFORM_BASE}/form/${formId}/question/${questionId}?apiKey=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `question[options]=${encodeURIComponent(options.join('|'))}`,
  });
  const json = await res.json();
  return json;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.JOTFORM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'JOTFORM_API_KEY not set' });

  const { vehicles } = req.body;
  if (!vehicles || !Array.isArray(vehicles)) {
    return res.status(400).json({ error: 'Missing vehicles array' });
  }

  // Build the options list: "VAN01 - 2008 Chevy Floor Van"
  const options = vehicles.map(v => `${v.id} - ${v.name}`);

  const results = [];

  for (const formId of FORM_IDS) {
    try {
      // Get all questions and find the Vehicle ID dropdown
      const questions = await getFormQuestions(formId, apiKey);
      const vehicleQuestion = Object.entries(questions).find(([id, q]) => {
        const name = (q.name || q.text || '').toLowerCase();
        return name.includes('vehicle') && (q.type === 'control_dropdown' || q.type === 'control_radio');
      });

      if (!vehicleQuestion) {
        results.push({ formId, status: 'skipped', reason: 'Vehicle dropdown not found' });
        continue;
      }

      const [questionId] = vehicleQuestion;
      await updateDropdown(formId, questionId, options, apiKey);
      results.push({ formId, status: 'updated', questionId, optionCount: options.length });
    } catch (e) {
      results.push({ formId, status: 'error', error: e.message });
    }
  }

  return res.status(200).json({ ok: true, results });
}
