// Fonction Cloudflare Pages - reception du formulaire de contact msplomberie.
// Remplace Netlify Forms + webhook : meme mise en page mail, meme routage, via Resend.
// Le marqueur [TEST-MSP] en debut de message reste la convention essai (jamais chez l'artisan).
// Variables d'environnement Cloudflare (jamais dans le code) :
//   RESEND_API_KEY (obligatoire)
//   MAIL_FROM, NOTIFY_TO_TEST, NOTIFY_TO_PROD, NOTIFY_CC_PROD (memes defauts qu'avant)

const FORM_NAME = 'projet-msplomberie';

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function field(d, ...names) {
  for (const n of names) { const v = d[n]; if (v != null && String(v).trim() !== '') return String(v).trim(); }
  return '';
}

function telHref(t) { return 'tel:' + t.replace(/[^+0-9]/g, ''); }

function buildHtml({ prestation, name, commune, email, telephone, message, photoAttached, dateFr, submissionId, isTest }) {
  const photoOk = photoAttached === true;
  const lignes = [
    ['Prestation', esc(prestation)], ['Commune', esc(commune)],
    ['Photo jointe', photoOk ? 'Oui (piece jointe a ce mail)' : 'Non'],
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

const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.start > 60000) b = { start: now, n: 0 };
  b.n++; buckets.set(ip, b);
  return b.n > 10;
}

function redirect(url) {
  return new Response(null, { status: 303, headers: { Location: url } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (rateLimited(ip)) return redirect('/merci');

    const form = await request.formData();
    // Honeypot : un bot qui remplit bot-field croit reussir, rien n'est envoye.
    if (String(form.get('bot-field') || '').trim() !== '') return redirect('/merci');

    const d = {};
    for (const [k, v] of form.entries()) { if (typeof v === 'string') d[k] = v; }

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) { console.error('RESEND_API_KEY absente'); return new Response('Configuration incomplete.', { status: 500 }); }

    const prestation = field(d, 'prestation', 'Prestation') || 'Non precisee';
    const name = field(d, 'name', 'Name', 'nom') || 'Non precise';
    const commune = field(d, 'commune', 'Commune') || 'Non precisee';
    const email = field(d, 'email', 'Email');
    const telephone = field(d, 'telephone', 'Telephone', 'Téléphone', 'tel');
    const message = field(d, 'message', 'Message', 'description') || '(vide)';

    // Photo : jointe au mail en base64 (JPG/PNG/WebP, 5 Mo max, comme cote client).
    let attachments;
    let photoAttached = false;
    const photo = form.get('photo');
    if (photo && typeof photo === 'object' && photo.size > 0) {
      const okType = ['image/jpeg', 'image/png', 'image/webp'].includes(photo.type);
      if (okType && photo.size <= 5 * 1024 * 1024) {
        const buf = new Uint8Array(await photo.arrayBuffer());
        let bin = '';
        const CHUNK = 8192;
        for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK));
        attachments = [{ filename: photo.name || 'photo.jpg', content: btoa(bin) }];
        photoAttached = true;
      }
    }

    const dateFr = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const from = env.MAIL_FROM || 'msplomberie <notifications@ms-plomberie-manche.fr>';
    // Convention interne stricte : message commencant par [TEST-MSP] = essai,
    // jamais chez l'artisan. Marqueur improbable pour un vrai visiteur.
    const isTest = /^\s*\[TEST-MSP\]/i.test(message);
    const toVar = isTest ? (env.NOTIFY_TO_TEST || 'contact@localiapro.fr')
                         : (env.NOTIFY_TO_PROD || 'msplomberie50@hotmail.com');
    const ccVar = isTest ? '' : (env.NOTIFY_CC_PROD || 'contact@thibautmarie-web.fr');
    const to = toVar.split(',').map(s => s.trim()).filter(Boolean);
    const cc = ccVar.split(',').map(s => s.trim()).filter(Boolean);
    const submissionId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to, ...(cc.length ? { cc } : {}),
        ...(email ? { reply_to: email } : {}),
        ...(attachments ? { attachments } : {}),
        subject: `${isTest ? 'TEST - ' : ''}Nouvelle demande - ${prestation} - ${commune} - ${name}`,
        html: buildHtml({ prestation, name, commune, email, telephone, message, photoAttached, dateFr, submissionId, isTest }),
      }),
    });
    if (!res.ok) {
      
      console.error('Resend a refuse:', res.status); return new Response('L\'envoi n\'a pas abouti. Reessayez ou ecrivez a msplomberie50@hotmail.com.', { status: 502 });
    }
    return redirect('/merci');
  } catch (e) {
    console.error('contact erreur:', e && e.message);
    return new Response('L\'envoi n\'a pas abouti. Reessayez ou ecrivez a msplomberie50@hotmail.com.', { status: 500 });
  }
}
