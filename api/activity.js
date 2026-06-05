const FORM_IDS = {
  signOut:     '261553473034050',
  signIn:      '261554150654051',
  maintenance: '261553782081055',
};

const JOTFORM_BASE = 'https://api.jotform.com';

async function fetchSubmissions(formId, apiKey) {
  const url = `${JOTFORM_BASE}/form/${formId}/submissions?apiKey=${apiKey}&limit=50&orderby=created_at&direction=DESC`;
  const res = await fetch(url);
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
    id: sub.id,
    type: 'sign-out',
    datetime: sub.created_at,
    operator:    field(a, 'employee name', 'employeename', 'name') || 'Unknown',
    vehicleId:   field(a, 'vehicle id', 'vehicleid') || '—',
    vehicleName: field(a, 'vehicle id', 'vehicleid') || '—',
    plate:       field(a, 'license plate', 'licenseplate', 'plate') || '—',
    odometerOut: parseInt(field(a, 'odometer', 'reading at departure') || 0, 10),
    destination: [
      field(a, 'departing from', 'departingfrom'),
      field(a, 'traveling to', 'travelingto'),
    ].filter(Boolean).join(' → ') || '—',
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
    id: sub.id,
    type: 'sign-in',
    datetime: sub.created_at,
    operator:   field(a, 'employee name', 'employeename', 'name') || 'Unknown',
    vehicleId:  field(a, 'vehicle id', 'vehicleid') || '—',
    vehicleName:field(a, 'vehicle id', 'vehicle
