'use strict';
const cfg = window.MSP_CONFIG || {formEnabled:false,contactEmail:'msplomberie50@hotmail.com'};
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
const nav = document.querySelector('#navigation');
const toggle = document.querySelector('.menu-toggle');
toggle?.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { toggle.setAttribute('aria-expanded','false'); nav.classList.remove('open'); }));
document.addEventListener('keydown', e => { if(e.key==='Escape' && nav?.classList.contains('open')) { toggle.setAttribute('aria-expanded','false'); nav.classList.remove('open'); toggle.focus(); } });
document.querySelectorAll('[data-email-link]').forEach(el => { el.href = 'mailto:' + cfg.contactEmail; el.textContent = cfg.contactEmail; });
// Service pages link to ./?prestation=…#contact: preselect that service in the form.
{
  const wanted = new URLSearchParams(location.search).get('prestation');
  const field = document.querySelector('#prestation');
  if (wanted && field && [...field.options].some(o => o.value === wanted)) field.value = wanted;
}
document.querySelectorAll('[data-service]').forEach(el => el.addEventListener('click', () => { const field=document.querySelector('#prestation'); if(field) field.value=el.dataset.service; }));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(b => { const active=b===button; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
  let count=0; document.querySelectorAll('.project').forEach(p => { p.hidden = button.dataset.filter !== 'all' && p.dataset.category !== button.dataset.filter; if(!p.hidden) count++; });
  document.querySelector('.gallery-status').textContent=count + ' réalisation' + (count>1?'s':'') + ' affichée' + (count>1?'s':'');
}));
const lightbox=document.querySelector('#lightbox');
let lastPhotoButton;
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  const img=lightbox.querySelector('img'); img.src=button.dataset.image; img.alt=button.querySelector('img').alt; lightbox.querySelector('p').textContent=img.alt; lastPhotoButton=button; lightbox.showModal();
}));
lightbox?.querySelector('.close-dialog').addEventListener('click',()=>lightbox.close());
lightbox?.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close();});
lightbox?.addEventListener('close',()=>lastPhotoButton?.focus());
for (const [name,url] of [['google',cfg.googleBusinessUrl]]) {
  if (url && /^https:\/\//.test(url)) {
    document.querySelectorAll('[data-social="'+name+'"]').forEach(el=>{el.href=url;el.hidden=false;});
    document.querySelectorAll('[data-'+name+'-pending]').forEach(el=>el.hidden=true);
  }
}
const form=document.querySelector('#contact-form');
if(form){
  const active=cfg.formEnabled && !location.hostname.endsWith('github.io') && !['localhost','127.0.0.1','terminal.local'].includes(location.hostname);
  const submit=form.querySelector('[type=submit]'); const status=document.querySelector('#form-status');
  const preview=document.querySelector('[data-preview-note]');
  if(active){
    submit.firstChild.textContent='Envoyer ma demande ';
    preview.hidden=cfg.mode==='production';
    if(!preview.hidden) preview.textContent='Version de test : cette demande sera envoyée uniquement à Localia.';
  } else {
    // Also prevent native no-JS submissions in the built HTML (see build.py).
    form.removeAttribute('action');
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault(); status.textContent='';
    const file=form.elements.photo.files[0];
    if(file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>5*1024*1024)) { status.textContent='Choisissez une image JPG, PNG ou WebP de moins de 5 Mo.'; form.elements.photo.focus(); return; }
    if(!form.reportValidity())return;
    if(!active){status.textContent='Votre formulaire est correctement rempli. Cette maquette ne transmet aucune donnée : aucun email n’a été envoyé.';return;}
    submit.disabled=true; submit.textContent='Envoi en cours…';
    try{
      const res=await fetch('/',{method:'POST',body:new FormData(form)});
      if(!res.ok)throw new Error('Envoi refusé');
      status.textContent=cfg.mode==='production'?'Votre demande a bien été transmise. Merci, Sébastien en prendra connaissance.':'Votre demande de test a bien été transmise à Localia.';
      form.reset();
    }catch{status.textContent='L’envoi n’a pas abouti. Vos informations sont conservées dans le formulaire. Réessayez ou contactez-nous par email.';}
    finally{submit.disabled=false;submit.innerHTML='Envoyer ma demande <span aria-hidden="true">↗</span>';}
  });
}
const reviewUrl = cfg.googleReviewUrl && /^https:\/\//.test(cfg.googleReviewUrl) ? cfg.googleReviewUrl : '';
if(reviewUrl){
  document.querySelectorAll('[data-review-button]').forEach(review=>{review.href=reviewUrl;review.hidden=false;});
  document.querySelectorAll('[data-review-pending]').forEach(el=>el.hidden=true);
  document.querySelectorAll('[data-review-qr]').forEach(qr=>{qr.alt='QR code pour partager votre avis sur Google';});
  // qr.html: for a client who cannot scan, send the link (share sheet, else SMS).
  document.querySelectorAll('[data-review-share]').forEach(button=>{
    button.hidden=false;
    button.addEventListener('click', async ()=>{
      const status=document.querySelector('[data-qr-status]');
      const text='Merci pour votre confiance ! Votre avis sur msplomberie : ';
      if(navigator.share){ try{ await navigator.share({title:'Avis msplomberie', text, url:reviewUrl}); }catch{} return; }
      location.href='sms:?&body='+encodeURIComponent(text+reviewUrl);
      if(status) status.textContent='Si rien ne s’ouvre, copiez ce lien : '+reviewUrl;
    });
  });
}
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());

// One subtle entrance per section; keep everything visible without JS or motion.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const entranceObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        entranceObserver.unobserve(entry.target);
      }
    });
  }, {threshold: 0.04, rootMargin: '0px 0px -20px 0px'});
  document.querySelectorAll('main > section:not(.hero), .expertise-strip').forEach(section => {
    section.classList.add('motion-enter');
    entranceObserver.observe(section);
  });
}
