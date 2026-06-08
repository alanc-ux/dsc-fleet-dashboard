const FORM_IDS = [
  '261553473034050', // Sign Out
  '261554150654051', // Sign In
  '261553782081055', // Maintenance
];

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

  const options = vehicles.map(v => `${v.id} - ${v.name}`).join('|');
  const results = [];

  for (const formId of FORM_IDS) {
    try {
      const qRes = await fetch(
        `https://api.jotform.com/form/${formId}/questions?apiKey=${apiKey}`
      );
      const qJson = await qRes.json();
      const questions = qJson.content || {};

      // Log all question names so we can see what we're working with
      const allQuestions = Object.entries(questions).map(([id, q]) => ({
        id, text: q.text, name: q.name, type: q.type
      }));
      console.log(`Form ${formId} questions:`, JSON.stringify(allQuestions));

      // Find Vehicle ID dropdown - match on "Vehicle ID" text exactly
      const vehicleEntry = Object.entries(questions).find(([, q]) => {
        const text = (q.text || q.name || '').toLowerCase().trim();
        return text === 'vehicle id' || text.includes('vehicle id');
      });

      if (!vehicleEntry) {
        results.push({ formId, status: 'skipped', reason: 'Vehicle ID question not found', allQuestions });
        continue;
      }

      const [qid, question] = vehicleEntry;
      console.log(`Found Vehicle ID question: qid=${qid}, type=${question.type}`);

      const updateRes = await fetch(
        `https://api.jotform.com/form/${formId}/question/${qid}?apiKey=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `question[options]=${encodeURIComponent(options)}`,
        }
      );
      const updateJson = await updateRes.json();
      console.log(`Update response for form ${formId}:`, JSON.stringify(updateJson));

      results.push({ 
        formId, 
        status: updateJson.responseCode === 200 ? 'updated' : 'error', 
        qid,
        count: vehicles.length,
        response: updateJson.responseCode
      });

    } catch (e) {
      console.error(`Error for form ${formId}:`, e.message);
      results.push({ formId, status: 'error', error: e.message });
    }
  }

  return res.status(200).json({ ok: true, results });
}
