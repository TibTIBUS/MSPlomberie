// Fonction Netlify appelée par la notification webhook « New form submission »
// (Forms > Submission notifications, limitée au formulaire, avec secret JWS).
// L'appel direct de l'URL publique sans signature valide est rejeté (403).
// Envoie la notification HTML mise en page via Resend.
//
// Variables d'environnement (console Netlify, jamais dans le code) :
//   RESEND_API_KEY  clé API Resend (obligatoire)
//   WEBHOOK_JWS_SECRET  secret JWS du webhook Netlify (obligatoire, fail-closed)
//   MAIL_FROM       expéditeur, défaut "msplomberie <notifications@ms-plomberie-manche.fr>"
//   NOTIFY_TO_TEST  destinataire(s) des demandes de TEST, défaut contact@localiapro.fr
//   NOTIFY_TO_PROD  destinataire(s) des vraies demandes, défaut msplomberie50@hotmail.com
//   NOTIFY_CC_PROD  copie(s) des vraies demandes, défaut contact@localiapro.fr
// Routage sans variable à redéployer : une soumission dont le message commence
// par le marqueur interne [TEST-MSP] n'est envoyée qu'à NOTIFY_TO_TEST (jamais
// à l'artisan) ; toute autre soumission part à l'artisan avec copie NOTIFY_CC_PROD.
// Marqueur volontairement improbable pour un visiteur réel ; à utiliser tel quel
// en début de message pour les essais (documenté pour l'équipe Localia).

const FORM_NAME = 'projet-msplomberie';

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function field(d, ...names) {
  for (const n of names) { const v = d[n]; if (v != null && String(v).trim() !== '') return String(v).trim(); }
  return '';
}


// Vérification JWS des webhooks sortants Netlify (X-Webhook-Signature, HS256,
// iss "netlify", sha256 du corps brut — docs.netlify.com/deploy/deploy-notifications).
// Fail-closed : sans secret configuré ou signature invalide, rejet 403.
const crypto = require('crypto');
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}
function verifyNetlifyJws(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const parts = String(signature).split('.');
  if (parts.length !== 3) return false;
  try {
    const signingInput = parts[0] + '.' + parts[1];
    const expected = crypto.createHmac('sha256', secret).update(signingInput).digest();
    const actual = b64urlDecode(parts[2]);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;
    const claims = JSON.parse(b64urlDecode(parts[1]).toString('utf8'));
    if (claims.iss !== 'netlify') return false;
    const bodyHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
    return claims.sha256 === bodyHash;
  } catch (e) { return false; }
}

function telHref(t) { return 'tel:' + t.replace(/[^+0-9]/g, ''); }

function buildHtml({ prestation, name, commune, email, telephone, message, photoUrl, dateFr, submissionId, isTest }) {
  const photoOk = /^https?:\/\//.test(photoUrl || '') ? photoUrl : '';
  const lignes = [
    ['Prestation', esc(prestation)], ['Commune', esc(commune)],
    ['Photo jointe', photoOk ? `<a href="${esc(photoOk)}" style="color:#244d85;">Voir la photo</a>` : 'Non'],
  ].map(([k, v]) => `<tr><td width="110" style="color:#5a6b80;">${k}</td><td style="font-weight:bold;">${v}</td></tr>`).join('');
  const telBloc = telephone
    ? `<a href="${telHref(telephone)}" style="font-size:26px;font-weight:bold;color:#183453;text-decoration:none;">${esc(telephone)}</a><br>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f1;padding:24px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e6ee;">
  <tr><td style="background:#183453;padding:20px 28px;">
    <span style="font-size:22px;font-weight:bold;color:#ffffff;">ms<span style="color:#cce97b;">plomberie</span></span><br>
    <span style="font-size:12px;color:#e0e6ee;">Plomberie · Chauffage · Solaire — Périers (Manche)</span>
  </td></tr>
  <tr><td style="padding:24px 28px 8px;">
    <span style="display:inline-block;background:#cce97b;color:#183453;font-weight:bold;font-size:13px;padding:5px 12px;border-radius:20px;">Nouvelle demande de devis</span>${isTest ? ' <span style="display:inline-block;background:#e0e6ee;color:#5a6b80;font-weight:bold;font-size:13px;padding:5px 12px;border-radius:20px;margin-left:8px;">ENVOI DE TEST</span>' : ''}
    <h1 style="font-size:20px;color:#183453;margin:14px 0 4px;">${esc(prestation)} - ${esc(name)}</h1>
    <p style="font-size:13px;color:#5a6b80;margin:0;">Reçue le ${esc(dateFr)} via le formulaire du site</p>
  </td></tr>
  <tr><td style="padding:16px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f1;border-radius:10px;">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 2px;font-size:11px;color:#5a6b80;text-transform:uppercase;letter-spacing:0.5px;">À rappeler</p>
        ${telBloc}<a href="mailto:${esc(email)}" style="font-size:14px;color:#244d85;">${esc(email)}</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 28px;">
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;color:#183453;">${lignes}</table>
  </td></tr>
  <tr><td style="padding:8px 28px 20px;">
    <p style="font-size:11px;color:#5a6b80;text-transform:uppercase;letter-spacing:0.5px;margin:12px 0 6px;">Message</p>
    <div style="background:#f6f7f1;border-left:4px solid #cce97b;border-radius:6px;padding:14px 16px;font-size:14px;color:#183453;line-height:1.55;">
      ${esc(message).replace(/\n/g, '<br>')}
    </div>
  </td></tr>
  <tr><td style="background:#f6f7f1;padding:14px 28px;font-size:12px;color:#5a6b80;border-top:1px solid #e0e6ee;">
    Répondez directement à ce mail : votre réponse ira au client (<b>reply-to</b> déjà rempli).<br>
    Formulaire de ms-plomberie-manche.fr — demande n° ${esc(submissionId)}
  </td></tr>
</table>
</body></html>`;
}

exports.handler = async (event) => {
  try {
    // Endpoint public : exige la signature JWS du webhook Netlify (fail-closed).
    const jwsSecret = process.env.WEBHOOK_JWS_SECRET;
    const signature = (event.headers || {})['x-webhook-signature'] || (event.headers || {})['X-Webhook-Signature'];
    if (!verifyNetlifyJws(event.body || '', signature, jwsSecret)) {
      console.error('Signature webhook absente ou invalide');
      return { statusCode: 403 };
    }
    const body = JSON.parse(event.body || '{}');
    const payload = body.payload || body || {};
    if (payload.form_name && payload.form_name !== FORM_NAME) return { statusCode: 200 };
    const d = payload.data || payload.fields || {};

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) { console.error('RESEND_API_KEY absente'); return { statusCode: 500 }; }

    const prestation = field(d, 'prestation', 'Prestation') || 'Non précisée';
    const name = field(d, 'name', 'Name', 'nom') || 'Non précisé';
    const commune = field(d, 'commune', 'Commune') || 'Non précisée';
    const email = field(d, 'email', 'Email');
    const telephone = field(d, 'telephone', 'Telephone', 'Téléphone', 'tel');
    const message = field(d, 'message', 'Message', 'description') || '(vide)';
    let photoUrl = field(d, 'photo', 'Photo');
    if (photoUrl && !/^https?:\/\//.test(photoUrl)) photoUrl = '';

    const created = payload.created_at ? new Date(payload.created_at) : new Date();
    const dateFr = created.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const from = process.env.MAIL_FROM || 'msplomberie <notifications@ms-plomberie-manche.fr>';
    // Convention interne stricte : message commençant par [TEST-MSP] = essai,
    // jamais chez l'artisan. Marqueur improbable pour un vrai visiteur.
    const isTest = /^\s*\[TEST-MSP\]/i.test(message);
    const toVar = isTest ? (process.env.NOTIFY_TO_TEST || 'contact@localiapro.fr')
                         : (process.env.NOTIFY_TO_PROD || 'msplomberie50@hotmail.com');
    const ccVar = isTest ? '' : (process.env.NOTIFY_CC_PROD || 'contact@localiapro.fr');
    const to = toVar.split(',').map(s => s.trim()).filter(Boolean);
    const cc = ccVar.split(',').map(s => s.trim()).filter(Boolean);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to, ...(cc.length ? { cc } : {}),
        ...(email ? { reply_to: email } : {}),
        subject: `${isTest ? 'TEST - ' : ''}Nouvelle demande - ${prestation} - ${commune} - ${name}`,
        html: buildHtml({ prestation, name, commune, email, telephone, message, photoUrl, dateFr, submissionId: payload.id || payload.submission_id || '', isTest }),
      }),
    });
    if (!res.ok) {
      console.error('Resend a refusé:', res.status, (await res.text()).slice(0, 500));
      return { statusCode: 500 };
    }
    return { statusCode: 200 };
  } catch (e) {
    console.error('submission-created erreur:', e && e.message);
    return { statusCode: 500 };
  }
};

// Exporte le gabarit pour les tests locaux uniquement.
exports._buildHtml = buildHtml;