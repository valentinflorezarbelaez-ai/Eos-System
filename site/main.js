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
