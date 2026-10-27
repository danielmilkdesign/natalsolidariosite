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

// Real-time synchronization channel with SISTEMA
let syncChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('natal_solidario_hub');
  }
} catch (e) {
  // BroadcastChannel unavailable
}

let currentPresetDonation = null;

const modalTemplates = {
  pix: {
    icon: '⚡',
    getHtml: () => {
      return '<h2>PIX indisponível nesta demonstração</h2><p>Nenhuma chave ou QR Code de pagamento foi validado pela coordenação. Não efetue transferências usando este site de demonstração.</p>';

    }
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

      <form class="modal-form" data-demo-form data-form-type="camisa">
        <label>Seu nome completo
          <input required name="nome" type="text" placeholder="Como podemos te chamar?" />
        </label>
        <label>WhatsApp fictício (nenhuma mensagem será enviada)
          <input required name="whatsapp" type="text" placeholder="(92) 99999-9999" />
        </label>
        <label>Seu e-mail corporativo ou pessoal
          <input required name="email" type="email" placeholder="voce@email.com" />
        </label>
        <div class="form-row-2col">
          <label>Tamanho da camisa
            <select name="tamanho" required>
              <option value="PP">PP</option>
              <option value="P">P</option>
              <option value="M" selected>M (Mais pedido)</option>
              <option value="G">G</option>
              <option value="GG">GG</option>
              <option value="XG">XG</option>
            </select>
          </label>
          <label>Quantidade
            <input name="quantidade" type="number" min="1" max="20" value="1" required id="camisaQtd" />
          </label>
        </div>
        <div id="camisaTotal" style="padding:10px 14px; background:#f3eee4; border-radius:8px; font-weight:700; font-size:13px; color:#0a1f1b;">
          Total demonstrativo: R$ 50,00
        </div>
        <button class="button button-primary" type="submit">
          Salvar pedido demonstrativo <span aria-hidden="true">↗</span>
        </button>
      </form>
      <small>Demonstração: salvo somente neste navegador, na mesma origem do Sistema de Gestão. Nenhum pedido real será enviado.</small>
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
      <form class="modal-form" data-demo-form data-form-type="parceiro">
        <label>Nome da Empresa / Startup
          <input required name="empresa" type="text" placeholder="Ex: Manaus Cloud Tech" />
        </label>
        <label>Nome do Representante
          <input required name="representante" type="text" placeholder="Ex: Roberto Silva (CTO / People)" />
        </label>
        <div class="form-row-2col">
          <label>WhatsApp corporativo
            <input required name="whatsapp" type="text" placeholder="(92) 99999-9999" />
          </label>
          <label>Apoio estimado (R$)
            <input name="valor" type="number" step="100" placeholder="Ex: 2500" />
          </label>
        </div>
        <label>E-mail institucional
          <input required name="email" type="email" placeholder="contato@empresa.com" />
        </label>
        <label>Como gostariam de apoiar? (Doação direta, camisa para a equipe, voluntariado)
          <textarea required name="mensagem" placeholder="Conte brevemente sobre o interesse de apoio da sua organização..."></textarea>
        </label>
        <button class="button button-primary" type="submit">
          Cadastrar Proposta de Parceria <span aria-hidden="true">↗</span>
        </button>
      </form>
      <small>Sua proposta entra instantaneamente no CRM Kanban da Coordenação de Parcerias.</small>
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

// Goal Sync with SISTEMA (localStorage & BroadcastChannel)
function syncGoalsFromSystem() {
  try {
    const raw = localStorage.getItem('natal_ti_demo_state_v2');
    if (!raw) return;
    const metas = JSON.parse(raw).metas;
    if (!Array.isArray(metas) || !metas.every(meta => Number.isFinite(meta.atual) && Number.isFinite(meta.meta) && meta.meta > 0)) return;

    metas.forEach((m) => {
      const percent = Math.min(100, Math.round((m.atual / m.meta) * 100));

      if (m.item_tipo === 'cesta_basica') {
        const bigNum = document.querySelector('.progress-feature .big-number');
        if (bigNum) bigNum.innerHTML = `${percent}<small>%</small>`;

        const countTxt = document.querySelector('.progress-copy strong');
        if (countTxt) countTxt.innerHTML = `${m.atual} <span>de ${m.meta} cestas arrecadadas (demo)</span>`;

        const track = document.querySelector('.progress-track-large span');
        if (track) track.style.width = `${percent}%`;

        const remaining = document.querySelector('.remaining-count');
        if (remaining) remaining.textContent = `Faltam ${Math.max(0, m.meta - m.atual)} famílias para a meta`;

        const chipCount = document.querySelector('.badge-cesta small');
        if (chipCount) chipCount.textContent = `${m.atual} de ${m.meta} cestas`;
      } else if (m.item_tipo === 'brinquedo') {
        const card = document.querySelector('.progress-card:nth-of-type(1)');
        if (card) {
          const strong = card.querySelector('strong');
          if (strong) strong.innerHTML = `${percent}<small>%</small>`;
          const track = card.querySelector('.progress-track span');
          if (track) track.style.width = `${percent}%`;
          const foot = card.querySelector('.progress-card-foot span:first-child');
          if (foot) foot.textContent = `${m.atual} de ${m.meta} brinquedos (demo)`;
        }
      } else if (m.item_tipo === 'kit_higiene' || m.item_tipo === 'leite_fralda') {
        const card = document.querySelector('.progress-card:nth-of-type(2)');
        if (card) {
          const strong = card.querySelector('strong');
          if (strong) strong.innerHTML = `${percent}<small>%</small>`;
          const track = card.querySelector('.progress-track span');
          if (track) track.style.width = `${percent}%`;
          const foot = card.querySelector('.progress-card-foot span:first-child');
          if (foot) foot.textContent = `${m.atual} de ${m.meta} pacotes`;
        }
      }
    });
  } catch (e) {
    console.error('Error syncing goals:', e);
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
    showToast('PIX real indisponível nesta demonstração.');
  }
});

// Demo submission: one snapshot write, no payment or message side effects.
const DEMO_STORAGE_KEY = 'natal_ti_demo_state_v2';
function saveDemoSubmission(collection, item) {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) throw new Error('Abra o Sistema de Gestão e salve um registro na demonstração antes de testar este formulário.');
  const state = JSON.parse(raw);
  if (!state || !Array.isArray(state[collection])) throw new Error('Dados locais inválidos. Preserve uma cópia e revise no sistema.');
  state[collection].unshift(item);
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
}
modalContent.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-demo-form]');
  if (!form) return;
  event.preventDefault();
  const formData = new FormData(form);
  const text = key => String(formData.get(key) || '').trim();
  try {
    if (form.dataset.formType === 'camisa') {
      const quantity = Number(formData.get('quantidade'));
      const size = text('tamanho');
      if (!text('nome') || !text('whatsapp') || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20 || !['PP','P','M','G','GG','XG'].includes(size)) throw new Error('Informe nome fictício, contato fictício e quantidade entre 1 e 20.');
      saveDemoSubmission('pedidosCamisas', { id: 'ped-' + crypto.randomUUID(), nome_comprador: text('nome'), whatsapp: text('whatsapp'), tamanho: size, quantidade: quantity, valor_total: quantity * 50, pagamento_status: false, entrega_status: 'pendente', created_at: new Date().toISOString(), origem_site: true });
    } else if (form.dataset.formType === 'parceiro') {
      const value = Number(formData.get('valor') || 0);
      if (!text('empresa') || !text('representante') || !Number.isFinite(value) || value < 0 || value > 99999999 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) throw new Error('Informe empresa e representante fictícios e valor válido.');
      saveDemoSubmission('parceiros', { id: 'crm-' + crypto.randomUUID(), nome_empresa: text('empresa'), representante: text('representante'), email_contato: text('email'), telefone_contato: text('whatsapp'), estagio_funil: 'contato_inicial', valor_prometido: value, contrapartidas: text('mensagem'), origem_site: true, created_at: new Date().toISOString() });
    } else return;
    form.reset(); hideModal(); showToast('Exemplo salvo neste navegador. Nenhuma mensagem foi enviada.');
  } catch (error) { showToast(error.message || 'Não foi possível salvar. Verifique o armazenamento e tente novamente.'); }
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
    if (window.innerWidth > 1024 && siteNav.classList.contains('is-open')) {
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

// Initial Sync and Storage Listeners
syncGoalsFromSystem();
window.addEventListener('storage', (e) => {
  if (e.key === 'natal_ti_demo_state_v2') {
    syncGoalsFromSystem();
  }
});
if (syncChannel) {
  syncChannel.onmessage = (e) => {
    if (e.data?.key === 'natal_ti_demo_state_v2') {
      syncGoalsFromSystem();
    }
  };
}
