const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  nav.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
}

const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}

const installButton = document.querySelector('#install-app');
const installNote = document.querySelector('#install-note');
let deferredInstall = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isIos() {
  const ua = window.navigator.userAgent || '';
  const classic = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return classic || iPadOs;
}

function hideInstall() {
  if (installButton) installButton.hidden = true;
  if (installNote) installNote.hidden = true;
}

if (isStandalone()) hideInstall();

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstall = event;
  if (installButton) installButton.hidden = false;
});

window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  hideInstall();
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (deferredInstall) {
      const prompt = deferredInstall;
      deferredInstall = null;
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') hideInstall();
      return;
    }
    if (!isIos() || isStandalone() || !installNote) return;
    const open = installNote.hidden;
    installNote.hidden = !open;
    installButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
