// Fonction Netlify de production - assistant du site msplomberie (ms-plomberie-manche.fr).
// Copie l'architecture Lumi (POST {messages} -> {reply}) avec anti-abus adapte a un endpoint public.
// La cle MISTRAL_API_KEY reste en variable d'environnement Netlify, jamais dans le code.

const ALLOWED_ORIGIN = 'https://ms-plomberie-manche.fr';
const MODEL = 'ministral-8b-2512'; // meme modele que Lumi, verifie dans la console Mistral
const MAX_BODY_BYTES = 8000;
const MAX_MESSAGES = 12;
const MAX_MSG_CHARS = 1000;
const MAX_REPLY_TOKENS = 400;
const RATE_LIMIT_PER_MIN = 10;   // par IP
const RATE_LIMIT_PER_DAY = 60;   // par IP

// Compteurs en memoire (remis a zero au demarrage a froid de la fonction :
// limite indicative, documentee, suffisante pour une copie de test).
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.dayStart > 86400000) b = { dayStart: now, day: 0, minute: [] };
  b.minute = b.minute.filter(t => now - t < 60000);
  if (b.minute.length >= RATE_LIMIT_PER_MIN || b.day >= RATE_LIMIT_PER_DAY) { buckets.set(ip, b); return true; }
  b.minute.push(now); b.day++; buckets.set(ip, b);
  return false;
}

const SYSTEM_PROMPT = `Tu es l'assistant du site de msplomberie, entreprise de Sebastien Mauger, plombier-chauffagiste a Periers (Manche), 16 cite Jean-Baptiste Pasturel, 50190 Periers.
Tu reponds en francais, de facon courte, claire et chaleureuse, aux questions sur :
- Prestations : chauffage (pompes a chaleur), panneaux solaires photovoltaiques, salles de bains, plomberie et eau chaude sanitaire.
- Horaires : lundi au vendredi 8h-12h et 13h30-17h, ferme samedi et dimanche.
- Realisations presentees sur le site.
- Zone : Periers, Manche et Calvados.
- Contact : 07 78 81 84 21, msplomberie50@hotmail.com.
Tu ne donnes pas de prix ni de devis chiffre : tu invites a decrire le projet via le formulaire du site ou a appeler.
Si la question sort de ce cadre, propose poliment le contact direct.
IMPORTANT : reponds en texte brut uniquement. Aucun markdown, aucune etoile, pas de gras ni d'italique. Des phrases simples, des tirets simples si necessaire.`;

exports.handler = async (event) => {
  const origin = event.headers.origin || '';
  const cors = {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : 'null',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: '{}' };

  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';
  if (rateLimited(ip)) {
    return { statusCode: 429, headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'rate_limited' }) };
  }
  if ((event.body || '').length > MAX_BODY_BYTES) {
    return { statusCode: 413, headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'too_large' }) };
  }

  let messages;
  try {
    const data = JSON.parse(event.body || '{}');
    messages = Array.isArray(data.messages) ? data.messages.slice(-MAX_MESSAGES) : [];
    messages = messages.filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
  } catch { messages = null; }
  if (!messages || !messages.length) {
    return { statusCode: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'bad_request' }) };
  }

  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: MAX_REPLY_TOKENS,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) throw new Error('no reply');
    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }) };
  } catch {
    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'unavailable' }) };
  }
};