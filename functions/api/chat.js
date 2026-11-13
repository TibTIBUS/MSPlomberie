// Fonction Cloudflare Pages - assistant du site msplomberie.
// Portage identique de la fonction Netlify (meme modele, prompt, limites).
// La cle MISTRAL_API_KEY reste en variable d'environnement Cloudflare, jamais dans le code.
// ALLOWED_ORIGINS : liste d'origines separees par des virgules (pages.dev + domaine prod).

const MODEL = 'ministral-8b-2512';
const MAX_BODY_BYTES = 8000;
const MAX_MESSAGES = 12;
const MAX_MSG_CHARS = 1000;
const MAX_REPLY_TOKENS = 400;
const RATE_LIMIT_PER_MIN = 10;
const RATE_LIMIT_PER_DAY = 60;

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

function corsFor(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function onRequestOptions(context) {
  return new Response('', { status: 204, headers: corsFor(context.request, context.env) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const cors = corsFor(request, env);
  const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (rateLimited(ip)) return json(429, { error: 'rate_limited' });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'too_large' });

  let messages;
  try {
    const data = JSON.parse(raw || '{}');
    messages = Array.isArray(data.messages) ? data.messages.slice(-MAX_MESSAGES) : [];
    messages = messages.filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
  } catch { messages = null; }
  if (!messages || !messages.length) return json(400, { error: 'bad_request' });

  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.MISTRAL_API_KEY}` },
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
    return json(200, { reply });
  } catch {
    return json(200, { error: 'unavailable' });
  }
}
