(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup = () => {};

  function setupNavigation() {
    const header = document.querySelector('.header');
    const toggle = header.querySelector('.nav-toggle');
    const navigation = header.querySelector('.primary-nav');
    const links = [...navigation.querySelectorAll('.nav-links a')];
    const sections = links.map(link => document.querySelector(link.hash));
    const narrow = matchMedia('(max-width: 960px)');
    let frame = 0;
    let open = false;
    function setOpen(value, restoreFocus = false) {
      open = value && narrow.matches;
      header.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.visually-hidden').textContent = open ? 'Menü schließen' : 'Menü öffnen';
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
    function update() {
      frame = 0;
      header.classList.toggle('is-scrolled', scrollY > 12);
      const marker = header.offsetHeight + Math.min(180, innerHeight * .22);
      let current = -1;
      sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= marker) current = index; });
      links.forEach((link, index) => {
        if (index === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    function resize() {
      document.documentElement.style.setProperty('--nav-height', `${header.querySelector('.header-inner').offsetHeight}px`);
      if (!narrow.matches) {
        const hadFocus = document.activeElement === toggle;
        setOpen(false);
        if (hadFocus) links[0].focus({ preventScroll: true });
      }
      update();
    }
    toggle.addEventListener('click', () => setOpen(!open));
    links.forEach(link => link.addEventListener('click', () => {
      const wasOpen = open;
      setOpen(false);
      if (wasOpen) {
        const target = document.querySelector(link.hash);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
    }));
    header.querySelector('.brand').addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
    });
    document.addEventListener('click', event => { if (open && !header.contains(event.target)) setOpen(false); });
    header.addEventListener('focusout', event => { if (open && event.relatedTarget && !header.contains(event.relatedTarget)) setOpen(false); });
    window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    header.classList.add('is-enhanced');
    toggle.hidden = false;
    resize();
  }

  function setupFeatureStory() {
    const story = document.querySelector('.feature-story');
    const sticky = story.querySelector('.feature-sticky');
    const steps = [...story.querySelectorAll('.feature-step')];
    const screens = [...story.querySelectorAll('.feature-screen')];
    const buttons = [...story.querySelectorAll('[data-feature]')];
    const note = story.querySelector('.feature-image-note');
    const sceneWord = story.querySelector('.feature-scene-word');
    const sceneLabels = ['Boulder entdecken', 'Beta ansehen', 'Fortschritt festhalten', 'Schraubplan ansehen'];
    const labels = ['Boulder in der Beta App', 'Beta-Video direkt beim Boulder', 'Statistikansicht mit Beispieldaten', 'Der Schraubplan deiner Kletterwelt'];
    const transitions = new Set();
    let pinned = false;
    let compact = false;
    let active = -1;
    let scheduled = 0;

    function cancelTransitions() {
      transitions.forEach(animation => animation.cancel());
      transitions.clear();
    }
    function select(index, animate = true) {
      if (index === active) return;
      active = index;
      cancelTransitions();
      steps.forEach((step, i) => { step.hidden = (pinned || compact) && i !== index; });
      screens.forEach((screen, i) => { screen.hidden = i !== index; });
      note.textContent = labels[index];
      sceneWord.textContent = sceneLabels[index];
      buttons.forEach((button, i) => {
        button.classList.toggle('is-active', i === index);
        if (i === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      if (animate && !preference.matches && Element.prototype.animate) {
        [steps[index], screens[index]].forEach(element => {
          const animation = element.animate([
            { opacity: .15, transform: 'translateY(14px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
          transitions.add(animation);
          animation.finished.then(() => transitions.delete(animation), () => transitions.delete(animation));
        });
      }
    }
    function update() {
      scheduled = 0;
      if (!pinned) return;
      const range = story.offsetHeight - sticky.offsetHeight;
      const navHeight = document.querySelector('.header').offsetHeight;
      const progress = Math.max(0, Math.min(1, (navHeight - story.getBoundingClientRect().top) / Math.max(1, range)));
      const position = progress * steps.length;
      select(Math.min(steps.length - 1, Math.floor(position)));
      buttons.forEach((button, i) => button.style.setProperty('--step-fill', Math.max(0, Math.min(1, position - i))));
    }
    function scheduleUpdate() {
      if (!scheduled) scheduled = requestAnimationFrame(update);
    }
    function configure() {
      if (preference.matches) cancelTransitions();
      const availableHeight = innerHeight - document.querySelector('.header').offsetHeight;
      const nextCompact = innerWidth <= 600;
      const nextPinned = !nextCompact && !preference.matches && availableHeight >= 640;
      if (nextPinned !== pinned || nextCompact !== compact) {
        const previous = Math.max(0, active);
        pinned = nextPinned;
        compact = nextCompact;
        story.classList.toggle('is-pinned', pinned);
        story.classList.toggle('is-compact', compact);
        cancelTransitions();
        active = -1;
        if (compact) {
          select(previous, false);
        } else if (!pinned) {
          steps.forEach(step => { step.hidden = false; });
          screens.forEach((screen, i) => { screen.hidden = i !== 0; });
          note.textContent = labels[0];
          sceneWord.textContent = sceneLabels[0];
        }
      }
      update();
    }
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        if (compact) { select(index); return; }
        if (!pinned) return;
        const start = scrollY + story.getBoundingClientRect().top - document.querySelector('.header').offsetHeight;
        const range = story.offsetHeight - sticky.offsetHeight;
        scrollTo({ top: start + range * (index + .2) / steps.length, behavior: 'smooth' });
      });
      button.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next].focus();
        buttons[next].click();
      });
    });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', configure, { passive: true });
    preference.addEventListener('change', configure);
    configure();
  }

  function setupPartnership() {
    const section = document.querySelector('.collaboration');
    const map = section.querySelector('.collaboration-map');
    const choices = [...section.querySelectorAll('[data-partner]')];
    const details = [...section.querySelectorAll('[data-contribution]')];
    const screens = [...section.querySelectorAll('[data-partner-screen]')];
    const status = section.querySelector('.partner-status');
    const toggle = section.querySelector('.partner-toggle');
    const transitions = new Set();
    let selected;
    let revision = 0;
    let hintConsumed = false;

    function track(animation, onFinish) {
      transitions.add(animation);
      animation.finished.then(() => {
        transitions.delete(animation);
        onFinish?.();
        animation.cancel();
      }, () => transitions.delete(animation));
    }
    function settleScreens() {
      screens.forEach(screen => {
        screen.hidden = screen.dataset.partnerScreen !== selected;
        screen.setAttribute('aria-hidden', String(screen.hidden));
        screen.style.removeProperty('opacity');
      });
    }
    function select(value, animate = true) {
      if (selected === value) return;
      // Read the painted opacities before cancelling, so a reversal starts here.
      const opacities = screens.map(screen => screen.hidden ? 0 : Number(getComputedStyle(screen).opacity));
      selected = value;
      const operation = ++revision;
      transitions.forEach(animation => animation.cancel());
      transitions.clear();
      map.dataset.selected = value;
      choices.forEach(choice => {
        const active = choice.dataset.partner === value;
        choice.classList.toggle('is-active', active);
        choice.setAttribute('aria-pressed', String(active));
      });
      details.forEach(detail => { detail.hidden = detail.dataset.contribution !== value; });
      toggle.setAttribute('aria-label', value === 'moonsight' ? 'Kletterwelt Sauerland anzeigen' : 'Moonsight Media anzeigen');
      toggle.title = value === 'moonsight' ? 'Zur Kletterwelt Sauerland wechseln' : 'Zu Moonsight Media wechseln';
      if (!animate) { settleScreens(); return; }
      hintConsumed = true;
      status.textContent = value === 'moonsight' ? 'Moonsight Media: Design und Entwicklung.' : 'Kletterwelt Sauerland: Boulder und Hallenalltag.';
      if (preference.matches || !Element.prototype.animate) { settleScreens(); return; }

      // Screens stay on one fixed plane beneath the unchanged photographic frame.
      screens.forEach((screen, index) => {
        const active = screen.dataset.partnerScreen === value;
        screen.hidden = false;
        screen.setAttribute('aria-hidden', String(!active));
        screen.style.opacity = String(opacities[index]);
        track(screen.animate([
          { opacity: opacities[index] },
          { opacity: active ? 1 : 0 }
        ], { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }), () => {
          if (revision !== operation) return;
          screen.hidden = !active;
          screen.style.removeProperty('opacity');
        });
      });
      const detail = details.find(element => !element.hidden);
      track(detail.animate([
        { opacity: 0, transform: `translateY(6px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 300, easing: 'ease-out', fill: 'backwards' }));
    }

    section.classList.add('is-interactive');
    map.setAttribute('role', 'group');
    map.setAttribute('aria-label', 'Beiträge der Projektpartner');
    toggle.hidden = false;
    toggle.setAttribute('aria-describedby', 'partner-interaction-hint');
    toggle.addEventListener('click', () => select(selected === 'moonsight' ? 'kws' : 'moonsight'));
    choices.forEach((choice, index) => {
      choice.setAttribute('role', 'button');
      choice.setAttribute('aria-describedby', 'partner-interaction-hint');
      choice.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        select(choice.dataset.partner);
      });
      choice.addEventListener('keydown', event => {
        if (event.key === ' ') { event.preventDefault(); select(choice.dataset.partner); }
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const next = choices[(index + 1) % choices.length];
          next.focus();
          select(next.dataset.partner);
        }
      });
    });
    // One pulse teaches the switch affordance without changing the chosen partner.
    if (window.IntersectionObserver) {
      const hintObserver = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        hintObserver.disconnect();
        if (hintConsumed || preference.matches || !Element.prototype.animate) return;
        hintConsumed = true;
        track(toggle.animate([
          { boxShadow: '0 0 0 0px rgb(25 36 54 / 0%)' },
          { boxShadow: '0 0 0 6px rgb(25 36 54 / 14%)', offset: .5 },
          { boxShadow: '0 0 0 10px rgb(25 36 54 / 0%)' }
        ], { duration: 1100, easing: 'ease-out' }));
      }, { threshold: .45 });
      hintObserver.observe(map);
    }
    preference.addEventListener('change', () => {
      if (preference.matches) {
        revision++;
        transitions.forEach(animation => animation.cancel());
        transitions.clear();
        settleScreens();
      }
    });
    select('moonsight', false);
  }

  function startMotion() {
    cleanup();
    if (preference.matches || !Element.prototype.animate || !window.IntersectionObserver) return;

    const animations = new Set();
    const heroAnimations = new Set();
    const hero = document.querySelector('.hero');
    const devices = document.querySelector('.hero-devices');
    const phones = [...devices.querySelectorAll('.phone')];
    const grips = [...document.querySelectorAll('.hero-grip')];
    const desktop = window.matchMedia('(min-width: 851px) and (pointer: fine)');
    let frame = 0;
    let lastProgress = -1;
    let lastStrength = -1;
    let heroVisible = hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < innerHeight;

    function syncPlayback() {
      const shouldPlay = heroVisible && !document.hidden;
      heroAnimations.forEach(animation => {
        if (shouldPlay && animation.playState === 'paused') animation.play();
        if (!shouldPlay && animation.playState === 'running') animation.pause();
      });
    }

    function track(animation, isHero = false) {
      animations.add(animation);
      if (isHero) {
        heroAnimations.add(animation);
        syncPlayback();
      }
      animation.finished.then(() => {
        animations.delete(animation);
        heroAnimations.delete(animation);
      }, () => {
        animations.delete(animation);
        heroAnimations.delete(animation);
      });
    }

    function reveal(element, delay = 0) {
      const animation = element.animate([
        { opacity: 0, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 620, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      track(animation);
    }

    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
        reveal(entry.target, Math.min(index * 65, 195));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    document.querySelectorAll('.feature-heading, [data-reveal], .footer-main').forEach(element => observer.observe(element));
    document.querySelectorAll('.hero-copy > .eyebrow, .hero-copy h1, .hero-description, .download-block').forEach((element, index) => reveal(element, index * 70));

    // One entrance only. At rest, the devices and grips remain still.
    phones.forEach((phone, index) => {
      const side = index === 0 ? -1 : index === 2 ? 1 : 0;
      const lift = desktop.matches ? 110 : 32;
      const slide = desktop.matches ? 48 : 12;
      const turn = desktop.matches ? side * 8 : 0;
      track(phone.animate([
        { opacity: 0, transform: `translate(${side * slide}px, ${lift}px) rotate(${turn}deg) scale(${desktop.matches ? .92 : .98})` },
        { opacity: 1, transform: 'translate(0, 0) rotate(0deg) scale(1)' }
      ], { duration: desktop.matches ? 1250 : 650, delay: desktop.matches ? (side ? 360 + index * 70 : 180) : (side ? 180 + index * 40 : 100), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }), true);
    });
    grips.forEach((grip, index) => {
      const side = index ? 1 : -1;
      const angle = parseFloat(getComputedStyle(grip).rotate) || 0;
      track(grip.animate([
        { opacity: 0, translate: `${side * (desktop.matches ? 90 : 24)}px ${desktop.matches ? 70 : 20}px`, rotate: `${angle + side * (desktop.matches ? 18 : 6)}deg` },
        { opacity: 1, translate: '0px 0px', rotate: `${angle}deg` }
      ], { duration: desktop.matches ? 1450 : 800, delay: desktop.matches ? 280 + index * 170 : 180 + index * 100, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }), true);
    });

    const heroObserver = new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      syncPlayback();
    });
    heroObserver.observe(hero);
    document.addEventListener('visibilitychange', syncPlayback);

    function updateDepth() {
      frame = 0;
      const bounds = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -bounds.top / bounds.height));
      const strength = desktop.matches ? 1 : 0;
      if (progress === lastProgress && strength === lastStrength) return;
      lastProgress = progress;
      lastStrength = strength;
      devices.style.setProperty('--depth-y', `${progress * -44 * strength}px`);
      phones.forEach((phone, index) => {
        const side = index === 0 ? -1 : index === 2 ? 1 : 0;
        phone.style.setProperty('--phone-turn', `${side * progress * 6 * strength}deg`);
        phone.style.setProperty('--phone-scale', `${1 + (side ? 0 : progress * .04 * strength)}`);
      });
      grips.forEach((grip, index) => {
        grip.style.setProperty('--depth-y', `${progress * (index ? 72 : -125) * strength}px`);
        grip.style.setProperty('--depth-x', `${progress * (index ? 32 : -32) * strength}px`);
      });
    }
    function scheduleDepth() {
      if (!frame) frame = requestAnimationFrame(updateDepth);
    }
    window.addEventListener('scroll', scheduleDepth, { passive: true });
    window.addEventListener('resize', scheduleDepth, { passive: true });
    updateDepth();

    cleanup = () => {
      observer.disconnect();
      heroObserver.disconnect();
      animations.forEach(animation => animation.cancel());
      document.removeEventListener('visibilitychange', syncPlayback);
      window.removeEventListener('scroll', scheduleDepth);
      window.removeEventListener('resize', scheduleDepth);
      cancelAnimationFrame(frame);
      [devices, ...grips].forEach(element => {
        element.style.removeProperty('--depth-y');
        element.style.removeProperty('--depth-x');
      });
      phones.forEach(phone => {
        phone.style.removeProperty('--phone-turn');
        phone.style.removeProperty('--phone-scale');
      });
    };
  }

  function setupRoadmap() {
    const root = document.querySelector('.upcoming-gallery');
    if (!root) return;
    const gallery = root.querySelector('.upcoming-gallery-stage');
    const tablist = root.querySelector('.upcoming-topics');
    const tabs = [...tablist.querySelectorAll('[data-upcoming]')];
    const visuals = [...gallery.querySelectorAll('[data-upcoming]')];
    const panels = [...root.querySelectorAll('[data-upcoming-panel]')];
    let active = -1;
    let transition;
    function select(index, animate = true) {
      if (index === active) return;
      transition?.cancel();
      active = index;
      const id = tabs[index].dataset.upcoming;
      gallery.dataset.active = id;
      tabs.forEach((tab, n) => {
        tab.setAttribute('aria-selected', String(n === index));
        tab.tabIndex = n === index ? 0 : -1;
        panels[n].hidden = n !== index;
      });
      visuals.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.upcoming === id)));
      if (animate && !preference.matches) transition = panels[index].animate([{ opacity: .4 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    }
    tablist.setAttribute('role', 'tablist');
    tabs.forEach((tab, index) => {
      tab.id = 'upcoming-tab-' + tab.dataset.upcoming;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'upcoming-panel-' + tab.dataset.upcoming);
      panels[index].id = 'upcoming-panel-' + tab.dataset.upcoming;
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      panels[index].tabIndex = 0;
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        select(next);
        tabs[next].focus({ preventScroll: true });
      });
    });
    visuals.forEach(button => button.addEventListener('click', () => select(tabs.findIndex(tab => tab.dataset.upcoming === button.dataset.upcoming))));
    gallery.classList.add('is-interactive');
    root.querySelector('.upcoming-copy').classList.add('is-interactive');
    const requested = new URLSearchParams(location.search).get('thema');
    const initial = tabs.findIndex(tab => tab.dataset.upcoming === requested);
    select(initial < 0 ? 0 : initial, false);
    tablist.hidden = false;
    preference.addEventListener('change', () => transition?.cancel());
  }

  setupNavigation();
  setupRoadmap();
  setupFeatureStory();
  setupPartnership();
  startMotion();
  preference.addEventListener('change', startMotion);
})();
