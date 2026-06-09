const FORM_IDS = {
  signOut:     '261553473034050',
  signIn:      '261554150654051',
  maintenance: '261553782081055',
};

const JOTFORM_BASE = 'https://api.jotform.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSubmissions(formId, apiKey) {
  const url = `${JOTFORM_BASE}/form/${formId}/submissions?apiKey=${apiKey}&limit=50&orderby=created_at&direction=DESC`;
  const res = await fetch(url);
  if (res.status === 429) throw new Error('RATE_LIMITED');
  if (!res.ok) throw new Error(`Jotform API error ${res.status} for form ${formId}`);
  const json = await res.json();
  return json.content || [];
}

function field(answers, ...keys) {
  for (const key of keys) {
    for (const [, v] of Object.entries(answers)) {
      const name = (v.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const text = (v.text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const needle = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (name.includes(needle) || text.includes(needle)) {
        if (v.answer && typeof v.answer === 'object' && v.answer.full) return v.answer.full;
        if (v.answer && typeof v.answer === 'object' && v.answer.first) {
          return [v.answer.first, v.answer.last].filter(Boolean).join(' ');
        }
        if (v.prettyFormat) return v.prettyFormat;
        if (typeof v.answer === 'string') return v.answer;
        if (Array.isArray(v.answer)) return v.answer.join(', ');
      }
    }
  }
  return null;
}

function normalizeSignOut(sub) {
  const a = sub.answers || {};
  return {
    id: sub.id, type: 'sign-out', datetime: sub.created_at,
    operator:    field(a, 'employee name', 'employeename', 'name') || 'Unknown',
    vehicleId:   field(a, 'vehicle id', 'vehicleid') || '—',
    vehicleName: field(a, 'vehicle id', 'vehicleid') || '—',
    plate:       field(a, 'license plate', 'licenseplate', 'plate') || '—',
    odometerOut: parseInt(field(a, 'odometer', 'reading at departure') || 0, 10),
    destination: [field(a, 'departing from', 'departingfrom'), field(a, 'traveling to', 'travelingto')].filter(Boolean).join(' → ') || '—',
    damage:        (field(a, 'damage', 'visible damage') || '').toLowerCase().includes('yes'),
    damageDetail:  field(a, 'describe the damage', 'describedamage') || '',
    warningLights: (field(a, 'warning lights', 'warninglights', 'dashboard') || '').toLowerCase().includes('yes'),
    warningDetail: field(a, 'which warning', 'whichwarning') || '',
    comments:      field(a, 'comments before', 'comments') || '',
  };
}

function normalizeSignIn(sub) {
  const a = sub.answers || {};
  return {
    id: sub.id, type: 'sign-in', datetime: sub.created_at,
    operator:   field(a, 'employee name', 'employeename', 'name') || 'Unknown',
    vehicleId:  field(a, 'vehicle id', 'vehicleid') || '—',
    vehicleName:field(a, 'vehicle id', 'vehicleid') || '—',
    plate:      field(a, 'license plate', 'licenseplate', 'plate') || '—',
    odometerIn: parseInt(field(a, 'odometer reading on return', 'odometer') || 0, 10),
    damage:        (field(a, 'new damage', 'damage occur') || '').toLowerCase().includes('yes'),
    damageDetail:  field(a, 'describe the new damage', 'newdamage') || '',
    warningLights: (field(a, 'warning lights', 'new dashboard') || '').toLowerCase().includes('yes'),
    warningDetail: field(a, 'which new warning', 'whichwarning') || '',
    cleanlinessRating: parseInt(field(a, 'interior cleanliness', 'interior') || 3, 10),
    exteriorRating:    parseInt(field(a, 'exterior cleanliness', 'exterior') || 3, 10),
    refueled:   (field(a, 'refuel', 'fuel') || '').toLowerCase().includes('yes'),
    fuelDetail: field(a, 'fuel added', 'fueladded', 'gas station') || '',
    comments:   field(a, 'comments on return', 'comments') || '',
  };
}

function normalizeMaintenance(sub) {
  const a = sub.answers || {};
  return {
    id: sub.id, type: 'maintenance', datetime: sub.created_at,
    operator:        field(a, 'fleet manager name', 'managername', 'name') || 'Fleet Manager',
    vehicleId:       field(a, 'vehicle id', 'vehicleid') || '—',
    vehicleName:     field(a, 'vehicle id', 'vehicleid') || '—',
    plate:           field(a, 'license plate', 'licenseplate', 'plate') || '—',
    maintenanceType: field(a, 'type of service', 'typeofservice') || '—',
    workDescription: field(a, 'describe work', 'work performed') || '—',
    odometerAtService: parseInt(field(a, 'odometer at time', 'odometerat') || 0, 10),
    serviceVendor:   field(a, 'vendor', 'service performed by', 'performedby') || '—',
    cost:            parseFloat(field(a, 'total cost', 'totalcost') || 0),
    nextDueMiles:    parseInt(field(a, 'next service due mileage', 'nextduemiles') || 0, 10) || null,
    nextDueDate:     field(a, 'next service due date', 'nextduedate') || null,
    flagImmediate:   (field(a, 'flag', 'immediate attention') || '').toLowerCase().includes('yes'),
    notes:           field(a, 'additional notes', 'notes for fleet', 'items needing') || '',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const apiKey = process.env.JOTFORM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'JOTFORM_API_KEY not set' });

  try {
    // Sequential fetches with delay to avoid rate limiting
    const signOutRaw = await fetchSubmissions(FORM_IDS.signOut, apiKey);
    await sleep(500);
    const signInRaw = await fetchSubmissions(FORM_IDS.signIn, apiKey);
    await sleep(500);
    const maintRaw = await fetchSubmissions(FORM_IDS.maintenance, apiKey);

    const activity = [
      ...signOutRaw.map(normalizeSignOut),
      ...signInRaw.map(normalizeSignIn),
      ...maintRaw.map(normalizeMaintenance),
    ].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    // Cache for 10 minutes on Vercel's CDN
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ activity, fetchedAt: new Date().toISOString() });

  } catch (err) {
    if (err.message === 'RATE_LIMITED') {
      // Don't return empty — tell the client to use stale data
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      return res.status(200).json({ 
        activity: [], 
        fetchedAt: new Date().toISOString(), 
        rateLimited: true,
        message: 'Jotform rate limit reached — data will refresh shortly'
      });
    }
    console.error('Activity fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
}
