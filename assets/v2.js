'use strict';
const config = window.MSP_CONFIG || {};
document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
const menu = document.querySelector('[data-menu]');
const navigation = document.querySelector('#navigation');
function closeMenu(){menu?.setAttribute('aria-expanded','false');navigation?.classList.remove('open');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open);});
navigation?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&navigation?.classList.contains('open')){closeMenu();menu.focus();}});
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{
  const radio=[...document.querySelectorAll('input[name=prestation]')].find(r=>r.value===link.dataset.service);
  if(radio)radio.checked=true;
}));
const requestedService=new URLSearchParams(location.search).get('prestation');
if(requestedService){const radio=[...document.querySelectorAll('input[name=prestation]')].find(r=>r.value===requestedService);if(radio)radio.checked=true;}

const gallery=document.querySelector('[data-gallery]');
const photos=[...document.querySelectorAll('[data-photo]')];
let matchingPhotos=photos;
if(gallery){
  const more=document.querySelector('[data-more]');
  const status=document.querySelector('[data-gallery-status]');
  let filter='all',limit=3;
  function render(){
    matchingPhotos=photos.filter(photo=>filter==='all'||photo.dataset.category===filter||(filter==='chantier'&&photo.dataset.stage==='chantier'));
    const visible=new Set(matchingPhotos.slice(0,limit));
    photos.forEach(photo=>photo.hidden=!visible.has(photo));
    gallery.classList.toggle('is-featured',filter==='all'&&limit===3);
    status.textContent=`${Math.min(limit,matchingPhotos.length)} photos sur ${matchingPhotos.length}`;
    more.hidden=limit>=matchingPhotos.length;
    more.querySelector('span').textContent=limit===3&&filter==='all'?`Explorer les ${matchingPhotos.length} photos`:'Voir plus de photos';
  }
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    filter=button.dataset.filter;limit=6;
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    render();
  }));
  more?.addEventListener('click',()=>{const firstNew=matchingPhotos[limit];limit+=6;render();firstNew?.focus({preventScroll:true});});
  render();
}

const viewer=document.querySelector('#photo-viewer');
let currentPhoto=0,viewerPhotos=photos,lastTrigger;
function showPhoto(){
  const photo=viewerPhotos[currentPhoto];
  const img=viewer.querySelector('img');
  img.src=photo.dataset.image;img.alt=photo.querySelector('img').alt;
  viewer.querySelector('[data-photo-caption]').textContent=photo.dataset.caption;
  viewer.querySelector('[data-photo-count]').textContent=`Photo ${currentPhoto+1} sur ${viewerPhotos.length}`;
}
photos.forEach(button=>button.addEventListener('click',()=>{
  viewerPhotos=gallery?matchingPhotos:photos;currentPhoto=viewerPhotos.indexOf(button);lastTrigger=button;showPhoto();viewer.showModal();
}));
viewer?.querySelector('[data-prev]')?.addEventListener('click',()=>{currentPhoto=(currentPhoto-1+viewerPhotos.length)%viewerPhotos.length;showPhoto();});
viewer?.querySelector('[data-next]')?.addEventListener('click',()=>{currentPhoto=(currentPhoto+1)%viewerPhotos.length;showPhoto();});
viewer?.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();viewer.querySelector('[data-prev]').click();}if(e.key==='ArrowRight'){e.preventDefault();viewer.querySelector('[data-next]').click();}});
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{if(dialog===viewer)lastTrigger?.focus();});
});
document.querySelectorAll('[data-open-dialog]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.openDialog)?.showModal()));

const form=document.querySelector('#project-form');
if(form){
  form.addEventListener('submit',e=>{
    const status=document.querySelector('#form-status');status.textContent='';
    const file=form.elements.photo.files[0];
    if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){
      e.preventDefault();
      status.textContent='Choisissez une photo JPG, PNG ou WebP de moins de 5 Mo.';form.elements.photo.focus();return;
    }
    if(!form.reportValidity()){e.preventDefault();return;}
    if(config.formEnabled)return;
    e.preventDefault();
    status.textContent='Votre demande est bien remplie. Cette version de présentation ne transmet aucun message. Vous pouvez écrire à Sébastien : msplomberie50@hotmail.com.';
    status.focus();
  });
  if(config.formEnabled)document.querySelector('.form-preview')?.remove();
}
if(config.googleBusinessUrl&&/^https:\/\//.test(config.googleBusinessUrl)){
  document.querySelectorAll('[data-google-link]').forEach(link=>{link.href=config.googleBusinessUrl;link.hidden=false;});
  document.querySelectorAll('[data-google-pending]').forEach(el=>el.hidden=true);
}
if(config.googleReviewUrl&&/^https:\/\//.test(config.googleReviewUrl)){
  document.querySelectorAll('[data-review-link]').forEach(link=>{link.href=config.googleReviewUrl;link.hidden=false;});
  document.querySelectorAll('[data-review-pending]').forEach(el=>el.hidden=true);
  document.querySelectorAll('[data-qr]').forEach(img=>img.alt='QR code pour partager votre expérience sur Google');
}
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target);}}),{threshold:.04,rootMargin:'0px 0px -15px 0px'});
  document.querySelectorAll('[data-reveal]').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});
}
