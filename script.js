const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

document.querySelector('.contact-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const note = document.querySelector('.form-note');
  note.textContent = 'Recebido. Nosso time entra em contato em breve.';
  event.target.reset();
});

const loginModal = document.querySelector('.login-modal');
const loginForm = document.querySelector('.login-form');
const loginTitle = document.querySelector('#login-title');
const authSwitch = document.querySelector('[data-auth-switch]');
let isRegistering = false;

document.querySelector('[data-open-login]').addEventListener('click', () => {
  loginModal.hidden = false;
  loginModal.querySelector('input').focus();
});

document.querySelector('[data-close-login]').addEventListener('click', () => {
  loginModal.hidden = true;
});

loginModal.addEventListener('click', (event) => {
  if (event.target === loginModal) loginModal.hidden = true;
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = loginForm.querySelector('input[type="email"]').value;
  const password = loginForm.querySelector('input[type="password"]').value;
  const note = loginForm.querySelector('.login-note');
  note.textContent = 'Conectando...';
  fetch(`/api/auth/${isRegistering ? 'register' : 'login'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível concluir.');
      return data;
    })
    .then((data) => {
      note.textContent = `Acesso confirmado para ${data.user.email}.`;
      loginForm.reset();
    })
    .catch((error) => { note.textContent = error.message; });
});

authSwitch.addEventListener('click', () => {
  isRegistering = !isRegistering;
  loginTitle.innerHTML = isRegistering ? 'Crie sua<br><em>conta.</em>' : 'Bem-vindo<br><em>de volta.</em>';
  loginForm.querySelector('.button').innerHTML = isRegistering ? 'Criar conta <span>↗</span>' : 'Entrar na conta <span>↗</span>';
  authSwitch.textContent = isRegistering ? 'Já tenho uma conta' : 'Ainda não tenho uma conta';
  loginForm.querySelector('.login-note').textContent = '';
});
