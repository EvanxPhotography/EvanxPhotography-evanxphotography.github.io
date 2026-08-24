(function () {
  const topbar = document.getElementById('topbar');
  const menuToggle = document.getElementById('menuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileLinks = document.getElementById('mobileLinks');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const prevShot = document.getElementById('prevShot');
  const nextShot = document.getElementById('nextShot');
  const closeLightboxButton = document.getElementById('closeLightbox');
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');

  let currentItems = [];
  let currentIndex = 0;
  let revealObserver = null;
  let heroScrollHandler = null;

  function routeFromPath() {
    const fileName = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (fileName === 'index.html' || fileName === 'startseite.html') return 'startseite';
    if (fileName === 'bilder.html') return 'bilder';
    if (fileName === 'galerie.html' || fileName.startsWith('galerie-')) return 'galerie';
    if (fileName === 'projekte.html' || fileName.startsWith('projekte-')) return 'projekte';
    if (fileName === 'ueber-mich.html') return 'ueber-mich';
    if (fileName === 'kontakt.html') return 'kontakt';
    return '';
  }

  function setActiveNav() {
    const route = routeFromPath();
    document.querySelectorAll('[data-nav]').forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('data-nav') === route);
    });
  }

  function closeMenu() {
    if (!mobileDrawer || !menuToggle) return;
    mobileDrawer.dataset.open = 'false';
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    if (!mobileDrawer || !menuToggle) return;
    const isOpen = mobileDrawer.dataset.open === 'true';
    mobileDrawer.dataset.open = isOpen ? 'false' : 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
  }

  function shuffleElements(elements) {
    const items = [...elements];
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function closeLightboxModal() {
    if (!lightbox) return;
    lightbox.dataset.open = 'false';
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentItems = [];
    currentIndex = 0;
  }

  function updateLightbox() {
    const item = currentItems[currentIndex];
    if (!item || !lightboxImage || !lightboxCaption) return;
    lightboxImage.src = item.src;
    lightboxImage.alt = item.label || 'Fotografie';
    lightboxCaption.textContent = item.label || 'Fotografie';
  }

  function openLightboxFromTrigger(trigger) {
    if (!lightbox || !lightboxImage || !lightboxCaption) return;
    const group = trigger.dataset.lightboxGroup;
    if (!group) return;
    const items = Array.from(document.querySelectorAll(`[data-lightbox-group="${group}"]`)).map((element) => ({
      src: element.dataset.lightboxSrc || '',
      label: element.dataset.lightboxLabel || element.querySelector('img')?.alt || 'Fotografie',
    }));
    const index = items.findIndex((item, idx) => {
      const element = document.querySelectorAll(`[data-lightbox-group="${group}"]`)[idx];
      return element === trigger;
    });
    currentItems = items.filter((item) => item.src);
    currentIndex = Math.max(0, index);
    updateLightbox();
    lightbox.dataset.open = 'true';
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function nextLightboxItem(step) {
    if (!currentItems.length) return;
    currentIndex = (currentIndex + step + currentItems.length) % currentItems.length;
    updateLightbox();
  }

  function bindLightbox() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-lightbox-group]');
      if (!trigger) return;
      event.preventDefault();
      openLightboxFromTrigger(trigger);
    });

    if (closeLightboxButton) closeLightboxButton.addEventListener('click', closeLightboxModal);
    if (prevShot) prevShot.addEventListener('click', () => nextLightboxItem(-1));
    if (nextShot) nextShot.addEventListener('click', () => nextLightboxItem(1));
    if (lightbox) {
      lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) closeLightboxModal();
      });
    }

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
        closeLightboxModal();
      }
      if (lightbox && lightbox.dataset.open === 'true') {
        if (event.key === 'ArrowLeft') nextLightboxItem(-1);
        if (event.key === 'ArrowRight') nextLightboxItem(1);
      }
    });
  }

  function syncShotGridSpans(root = document) {
    root.querySelectorAll('.shot').forEach((shot) => {
      const img = shot.querySelector('img');
      if (!img) return;

      const applySpan = () => {
        const width = img.naturalWidth || 1;
        const height = img.naturalHeight || 1;
        shot.dataset.span = width > height ? 'landscape' : 'portrait';
        shot.style.aspectRatio = `${width} / ${height}`;
        shot.classList.add('is-loaded');
      };

      if (img.complete && img.naturalWidth && img.naturalHeight) {
        applySpan();
      } else {
        img.addEventListener('load', applySpan, { once: true });
      }
    });
  }

  function syncProjectFrameRatios(root = document) {
    const maxHeight = window.matchMedia('(max-width: 760px)').matches ? '420px' : '560px';
    root.querySelectorAll('.story-panel, .editorial-card.image').forEach((frame) => {
      const img = frame.querySelector('img');
      if (!img) return;

      frame.style.minHeight = '0';
      frame.style.maxHeight = maxHeight;
      frame.style.overflow = 'hidden';

      const applyRatio = () => {
        const width = img.naturalWidth || 1;
        const height = img.naturalHeight || 1;
        frame.style.aspectRatio = `${width} / ${height}`;
      };

      if (img.complete && img.naturalWidth && img.naturalHeight) {
        applyRatio();
      } else {
        img.addEventListener('load', applyRatio, { once: true });
      }
    });
  }

  function activateReveal() {
    if (revealObserver) revealObserver.disconnect();
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-inview'));
  }

  function initHeroMotion() {
    if (heroScrollHandler) {
      window.removeEventListener('scroll', heroScrollHandler);
      heroScrollHandler = null;
    }

    const hero = document.querySelector('[data-parallax]');
    if (!hero) return;

    const update = () => {
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, 1 - rect.top / (window.innerHeight + rect.height)));
      const shift = Math.round((progress - 0.5) * 28);
      hero.style.setProperty('--hero-shift', `${shift}px`);
    };

    heroScrollHandler = update;
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function bindMenu() {
    if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
    if (mobileLinks) {
      mobileLinks.addEventListener('click', (event) => {
        const target = event.target.closest('a');
        if (target) closeMenu();
      });
    }
  }

  function bindContactForm() {
    if (!contactForm) return;
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (formStatus) {
        formStatus.textContent = 'Sende...';
        formStatus.classList.remove('success', 'error');
      }

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(contactForm),
        });

        if (response.ok) {
          if (formStatus) {
            formStatus.textContent = 'Danke! Deine Nachricht ist eingegangen.';
            formStatus.classList.add('success');
          }
          contactForm.reset();
          setTimeout(() => {
            window.location.href = 'Danke.html';
          }, 900);
          return;
        }

        if (formStatus) {
          formStatus.textContent = 'Fehler beim Senden. Bitte später erneut versuchen.';
          formStatus.classList.add('error');
        }
      } catch (error) {
        if (formStatus) {
          formStatus.textContent = 'Netzwerkfehler. Bitte später erneut versuchen.';
          formStatus.classList.add('error');
        }
      }
    });
  }

  function updateScrollState() {
    if (!topbar) return;
    topbar.classList.toggle('is-scrolled', window.scrollY > 12);
  }

  function shuffleImagePage() {
    if (routeFromPath() !== 'bilder') return;
    const grid = document.querySelector('.image-grid');
    if (!grid) return;
    const items = shuffleElements(Array.from(grid.children));
    grid.replaceChildren(...items);
  }

  function init() {
    setActiveNav();
    bindMenu();
    bindLightbox();
    bindContactForm();
    shuffleImagePage();
    activateReveal();
    syncShotGridSpans();
    syncProjectFrameRatios();
    initHeroMotion();
    updateScrollState();

    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', () => {
      syncShotGridSpans();
      syncProjectFrameRatios();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();