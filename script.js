/**
 * Natal Solidário em TI - Manaus 2026
 * Script Principal da Landing Page Pública
 * Esquadrões de Frontend, UI/UX e Integração
 */

const modalBackdrop = document.querySelector('[data-modal-backdrop]');
const modal = document.querySelector('.modal');
const modalContent = document.querySelector('[data-modal-content]');
const modalIcon = document.querySelector('[data-modal-icon]');
const closeModalButton = document.querySelector('[data-close-modal]');
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');
let lastFocusedElement = null;
let toastTimer;

let currentPresetDonation = null;

const modalTemplates = {
  pix: {
    icon: '⚡',
    getHtml: () => `
      <h2>Faça sua doação via <em>PIX.</em></h2>
      <p>Cada contribuição é revertida integralmente na aquisição de cestas básicas, brinquedos, leite e fraldas para famílias em vulnerabilidade em Manaus.</p>
      
      <div class="pix-box">
        <div class="pix-key">
          <div>
            <span style="display:block; font-size:11px; font-weight:800; color:var(--ink-secondary); text-transform:uppercase; letter-spacing:0.06em;">Chave PIX Oficial (E-mail)</span>
            <code id="pixKeyText" style="font-size:15px; font-weight:700; color:var(--forest-night);">coordenacao@natalti.org</code>
          </div>
          <button class="copy-button" type="button" data-copy-pix title="Copiar chave PIX">Copiar Chave 📋</button>
        </div>
      </div>

      <small>Abra o app do seu banco, escolha a opção PIX (chave e-mail), cole a chave acima e confirme o valor desejado.</small>
    `
  },
  camisa: {
    icon: '👕',
    getHtml: () => `
      <h2>Vista a <em>causa.</em></h2>
      <p>A camisa oficial do Natal Solidário em TI (R$ 50,00) financia a alimentação das famílias, leite e fraldas e a logística dos voluntários.</p>
      
      <div class="modal-shirt-preview">
        <div class="shirt-main-img-box">
          <img id="modalShirtImg" src="assets/camisa.jpg" alt="Camisa Oficial Natal Solidário em TI" class="modal-shirt-img" />
          <span id="modalShirtTag" class="shirt-img-tag">Frente e Verso no corpo</span>
        </div>
        <div class="shirt-thumbs">
          <button type="button" class="shirt-thumb-btn active" data-shirt-src="assets/camisa.jpg" data-shirt-tag="Frente e Verso no corpo">
            <img src="assets/camisa.jpg" alt="No corpo" />
            <span>Em uso</span>
          </button>
          <button type="button" class="shirt-thumb-btn" data-shirt-src="assets/frente.jpg" data-shirt-tag="Vista Frontal Oficial">
            <img src="assets/frente.jpg" alt="Frente" />
            <span>Frente</span>
          </button>
          <button type="button" class="shirt-thumb-btn" data-shirt-src="assets/verso.jpg" data-shirt-tag="Vista Posterior Oficial">
            <img src="assets/verso.jpg" alt="Verso" />
            <span>Verso</span>
          </button>
        </div>
      </div>

      <div class="public-form-notice"><p>Os pedidos de camisas pelo site ainda não estão disponíveis.</p><p>Consulte a coordenação para participar. Nenhum dado é coletado ou enviado por esta página.</p></div>
    `
  },
  coleta: {
    icon: '📍',
    getHtml: () => `
      <h2>Pontos de <em>coleta física.</em></h2>
      <p>Entregue alimentos não perecíveis, brinquedos novos, leite e fraldas em um dos nossos pontos credenciados em Manaus:</p>
      <div class="collection-list">
        <div class="collection-item">
          <strong>Hub de Tecnologia Manaus (Polo Digital)</strong>
          <span>Av. Djalma Batista, 1.200 • Chapada • Seg a sex, 9h às 17h</span>
          <a href="https://maps.google.com/?q=Av.+Djalma+Batista+1200+Manaus" target="_blank" rel="noreferrer">Abrir rota no Google Maps ↗</a>
        </div>
        <div class="collection-item">
          <strong>Casa Criativa Centro</strong>
          <span>Rua Guilherme Moreira, 315 • Centro • Seg a sáb, 10h às 18h</span>
          <a href="https://maps.google.com/?q=Rua+Guilherme+Moreira+315+Manaus" target="_blank" rel="noreferrer">Abrir rota no Google Maps ↗</a>
        </div>
        <div class="collection-item">
          <strong>Instituto Norte Digital</strong>
          <span>Rua Recife, 850 • Adrianópolis • Sábados, 9h às 13h</span>
          <a href="https://maps.google.com/?q=Rua+Recife+850+Adrianopolis+Manaus" target="_blank" rel="noreferrer">Abrir rota no Google Maps ↗</a>
        </div>
      </div>
      <small>Pontos oficiais com equipe voluntária realizando triagem e registro direto no inventário da campanha.</small>
    `
  },
  parceiro: {
    icon: '🤝',
    getHtml: () => `
      <h2>Vamos transformar <em>juntos?</em></h2>
      <p>Empresas, aceleradoras e startups de Manaus: junte seu time a essa rede de solidariedade.</p>
      <div class="public-form-notice"><p>Os cadastros de parceiros pelo site ainda não estão disponíveis.</p><p>Consulte a coordenação para participar. Nenhum dado é coletado ou enviado por esta página.</p></div>
    `
  },
  'arte-kv': {
    icon: '🖼️',
    getHtml: () => `
      <h2>Arte Oficial da <em>Campanha.</em></h2>
      <p>Key Visual oficial do <strong>Natal Solidário em TI 2026</strong>. Criada para conectar o ecossistema de tecnologia e inspirar solidariedade na Amazônia.</p>
      
      <div class="poster-preview-box">
        <img src="assets/kv-completo.jpg" alt="Cartaz Oficial Natal Solidário em TI 2026" class="modal-poster-img" />
      </div>

      <div class="poster-actions">
        <a href="assets/kv-completo.jpg" download="Natal-Solidario-TI-2026-Arte-Oficial.jpg" class="button button-primary" style="flex:1;">
          Baixar Imagem em Alta Resolução <span>↓</span>
        </a>
        <button class="button button-ghost" type="button" data-open-modal="pix" style="color:#0f1c19; border-color:#0f1c19;">
          Doe via PIX <span>⚡</span>
        </button>
      </div>
      <small>Compartilhe nos grupos de WhatsApp, LinkedIn e Instagram Stories da sua equipe para expandir o alcance da campanha!</small>
    `
  }
};

function showModal(type) {
  const template = modalTemplates[type];
  if (!template) return;
  lastFocusedElement = document.activeElement;
  modalIcon.textContent = template.icon;
  modalContent.innerHTML = template.getHtml();
  const modalTitle = modalContent.querySelector('h2');
  if (modalTitle) modalTitle.id = 'modal-title';
  modalBackdrop.hidden = false;
  document.body.classList.add('modal-open');
  modal.focus();

  // Dynamic listener for shirt quantity calculation inside modal
  const camisaQtd = modalContent.querySelector('#camisaQtd');
  const camisaTotal = modalContent.querySelector('#camisaTotal');
  if (camisaQtd && camisaTotal) {
    camisaQtd.addEventListener('input', (e) => {
      const q = Math.max(1, parseInt(e.target.value || '1', 10));
      camisaTotal.textContent = `Total a pagar: R$ ${(q * 50).toFixed(2).replace('.', ',')}`;
    });
  }

  // Listener for interactive modal shirt preview switcher
  const shirtThumbs = modalContent.querySelectorAll('.shirt-thumb-btn');
  const modalShirtImg = modalContent.querySelector('#modalShirtImg');
  const modalShirtTag = modalContent.querySelector('#modalShirtTag');
  if (shirtThumbs.length && modalShirtImg) {
    shirtThumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        shirtThumbs.forEach((b) => b.classList.remove('active'));
        thumb.classList.add('active');
        modalShirtImg.src = thumb.dataset.shirtSrc;
        if (modalShirtTag && thumb.dataset.shirtTag) {
          modalShirtTag.textContent = thumb.dataset.shirtTag;
        }
      });
    });
  }
}

function hideModal() {
  modalBackdrop.hidden = true;
  document.body.classList.remove('modal-open');
  currentPresetDonation = null;
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

function showToast(message) {
  const toast = document.querySelector('.toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}

// Interactive Donation Impact Calculator Logic
const IMPACT_DATA = {
  30: {
    title: 'Leite e Fralda para Crianças e Bebês',
    desc: 'Com R$ 30,00 você garante pacotes de fraldas e latas de leite para nutrir e confortar os bebês das famílias atendidas.'
  },
  50: {
    title: '1 Camisa Oficial OU 1 Ceia + Brinquedo',
    desc: 'Com R$ 50,00 você garante um brinquedo novinho para uma criança de Manaus e apoia o lanche e logística da equipe de voluntários em campo.'
  },
  100: {
    title: '1 Cesta Básica Completa para 1 Família',
    desc: 'Com R$ 100,00 você garante arroz, feijão, leite, proteína, óleo e itens para uma ceia natalina digna e farta para até 5 pessoas.'
  },
  250: {
    title: 'Pacote Família Completa (Cesta + Brinquedos + Leite e Fralda)',
    desc: 'Impacto transformador! Você acolhe um lar inteiro com alimentação para o mês de dezembro, brinquedos para os filhos, leite e fraldas.'
  },
  500: {
    title: 'Adoção Solidária: 2 Lares Transformados',
    desc: 'Impacto multiplicador! Duas famílias inteiras recebem cestas básicas fartas, presentes de Natal para todas as crianças e suporte completo.'
  }
};

const presetButtons = document.querySelectorAll('[data-preset]');
const calcTitle = document.querySelector('#calcResultTitle');
const calcDesc = document.querySelector('#calcResultDesc');
const calcDonateBtn = document.querySelector('#calcDonateBtn');

presetButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    presetButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    const val = parseInt(btn.dataset.preset, 10);
    const data = IMPACT_DATA[val];
    if (data && calcTitle && calcDesc) {
      calcTitle.textContent = data.title;
      calcDesc.textContent = data.desc;
      currentPresetDonation = val;
    }
  });
});

if (calcDonateBtn) {
  calcDonateBtn.addEventListener('click', () => {
    const activeBtn = document.querySelector('.preset-btn.active');
    if (activeBtn) {
      currentPresetDonation = parseInt(activeBtn.dataset.preset, 10);
    }
    showModal('pix');
  });
}

// 3D Perspective Tilt for the Key Visual Card
const kvCard = document.querySelector('#kvInteractiveCard');
if (kvCard && window.matchMedia('(min-width: 1025px)').matches) {
  const container = kvCard.closest('.kv-card-container');
  if (container) {
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = (-y / (rect.height / 2)) * 6;
      const rotateY = (x / (rect.width / 2)) * 6;
      kvCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    container.addEventListener('mouseleave', () => {
      kvCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  }
}

// Global Click Handlers for Modals & Copy Actions
document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-open-modal]');
  if (opener) {
    event.preventDefault();
    showModal(opener.dataset.openModal);
  }

  if (event.target.matches('[data-close-modal]') || event.target === modalBackdrop) {
    hideModal();
  }

  const copyButton = event.target.closest('[data-copy-pix]');
  if (copyButton) {
    const key = document.querySelector('#pixKeyText')?.textContent?.trim() || 'coordenacao@natalti.org';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(key).then(() => {
        copyButton.textContent = 'Copiado! ✓';
        showToast('Chave PIX copiada: ' + key);
        setTimeout(() => { copyButton.textContent = 'Copiar Chave 📋'; }, 3000);
      }).catch(() => {
        showToast('Chave PIX: ' + key);
      });
    } else {
      showToast('Chave PIX: ' + key);
    }
  }
});

// Close on ESC and Trap Focus
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalBackdrop.hidden) hideModal();
  if (event.key === 'Tab' && !modalBackdrop.hidden) {
    const focusable = [...modal.querySelectorAll('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

// Mobile Navigation Drawer Controller
const navBackdrop = document.querySelector('#navBackdrop');

function closeMobileMenu() {
  if (siteNav) siteNav.classList.remove('is-open');
  if (menuToggle) {
    menuToggle.classList.remove('is-active');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  document.body.classList.remove('nav-open');
}

function openMobileMenu() {
  if (siteNav) siteNav.classList.add('is-open');
  if (menuToggle) {
    menuToggle.classList.add('is-active');
    menuToggle.setAttribute('aria-expanded', 'true');
  }
  document.body.classList.add('nav-open');
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isCurrentlyOpen = siteNav.classList.contains('is-open');
    if (isCurrentlyOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target.closest('a') || event.target.closest('button')) {
      closeMobileMenu();
    }
  });

  if (navBackdrop) {
    navBackdrop.addEventListener('click', closeMobileMenu);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
      closeMobileMenu();
    }
  });

  // Close when window resized to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1180 && siteNav.classList.contains('is-open')) {
      closeMobileMenu();
    }
  });
}

// Year update
document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

// Smooth Scroll Reveal with instant fallback for top elements
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealItems.forEach((item) => observer.observe(item));

  // Safeguard: Make sure items near top are immediately visible
  setTimeout(() => {
    revealItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        item.classList.add('is-visible');
      }
    });
  }, 150);
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}
