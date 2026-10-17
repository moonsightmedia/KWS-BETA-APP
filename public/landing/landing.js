(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup = () => {};

  function navigationInset() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset')) || 0;
  }
  function navigationBottomSpace() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-bottom-space')) || 0;
  }

  function setupNavigation() {
    const header = document.querySelector('.header');
    const navigation = header.querySelector('.primary-nav');
    const links = [...navigation.querySelectorAll('.nav-links a')];
    const sections = links.map(link => document.querySelector(link.hash));
    let frame = 0;
    function update() {
      frame = 0;
      header.classList.toggle('is-scrolled', scrollY > 12);
      const marker = navigationInset() + Math.min(180, innerHeight * .22);
      let current = -1;
      sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= marker) current = index; });
      links.forEach((link, index) => {
        if (index === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    function resize() {
      const top = parseFloat(getComputedStyle(header).top) || 0;
      const dock = getComputedStyle(navigation).position === 'fixed';
      document.documentElement.style.setProperty('--nav-height', `${header.offsetHeight}px`);
      document.documentElement.style.setProperty('--nav-offset', `${header.offsetHeight + top}px`);
      document.documentElement.style.setProperty('--nav-bottom-space', `${dock ? innerHeight - navigation.getBoundingClientRect().top + 12 : 0}px`);
      update();
    }
    links.forEach(link => link.addEventListener('click', () => {
      const target = document.querySelector(link.hash);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }));
    window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    header.classList.add('is-enhanced');
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(header);
    observer.observe(navigation);
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
      const navHeight = navigationInset() + 8;
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
      const availableHeight = innerHeight - navigationInset() - navigationBottomSpace();
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
        const start = scrollY + story.getBoundingClientRect().top - navigationInset() - 8;
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
    let gesture;
    let ignorePointerClick = false;
    const visualTransitions = new Set();
    let visualRevision = 0;
    const swipeOffset = () => parseFloat(gallery.style.getPropertyValue('--swipe-offset')) || 0;
    function cancelVisuals() {
      visualRevision++;
      visualTransitions.forEach(animation => animation.cancel());
      visualTransitions.clear();
      visuals.forEach(button => button.style.removeProperty('z-index'));
    }
    function resetGesture(releaseCapture = true, settle = true) {
      const pointerId = gesture?.id;
      const horizontal = gesture?.axis === 'horizontal';
      const offset = swipeOffset();
      gesture = undefined;
      gallery.classList.remove('is-swiping');
      gallery.style.removeProperty('--swipe-offset');
      if (releaseCapture && pointerId !== undefined && gallery.hasPointerCapture(pointerId)) gallery.releasePointerCapture(pointerId);
      if (settle && horizontal) select(active, true, offset);
    }
    function select(index, animate = true, offset = 0) {
      if (index === active && !offset) return;
      const previous = active;
      const moving = animate && previous >= 0 && !preference.matches && !!Element.prototype.animate;
      const from = moving ? visuals.map(button => {
        const style = getComputedStyle(button);
        const matrix = new DOMMatrix(style.transform);
        matrix.e += offset;
        return { transform: matrix.toString(), opacity: style.opacity, filter: style.filter };
      }) : [];
      cancelVisuals();
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
      if (moving) {
        const revision = visualRevision;
        const direction = index === (previous + 1) % tabs.length ? 1 : -1;
        const wrap = index === previous ? -1 : (previous + (direction > 0 ? 2 : 1)) % tabs.length;
        visuals.forEach((button, n) => {
          const style = getComputedStyle(button);
          const to = { transform: style.transform, opacity: style.opacity, filter: style.filter };
          let frames = [from[n], to];
          if (n === index && index !== previous) frames = [from[n], { opacity: 1, offset: .15 }, to];
          if (n === wrap) {
            // Recycle the rear device at the outer edges while invisible.
            const exit = new DOMMatrix(from[n].transform);
            const enter = new DOMMatrix(to.transform);
            exit.e -= direction * 80;
            enter.e += direction * 80;
            frames = [from[n], { ...from[n], transform: exit.toString(), opacity: 0, offset: .32 }, { ...to, transform: enter.toString(), opacity: 0, offset: .33 }, to];
          }
          button.style.zIndex = String(n === index ? 3 : n === wrap ? 0 : 2);
          const animation = button.animate(frames, { duration: 360, easing: 'cubic-bezier(.22,.61,.36,1)' });
          visualTransitions.add(animation);
          animation.finished.then(() => {
            visualTransitions.delete(animation);
            if (revision === visualRevision) button.style.removeProperty('z-index');
          }, () => visualTransitions.delete(animation));
        });
        if (index !== previous) transition = panels[index].animate([{ opacity: .4 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      }
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
      // A touch tap stays responsive directly after a swipe, even when the
      // browser suppresses its compatibility click. Scrolling cancels the tap.
      let tap;
      tab.addEventListener('pointerdown', event => {
        if (event.isPrimary && event.pointerType === 'touch') tap = { id: event.pointerId, x: event.clientX, y: event.clientY };
      });
      tab.addEventListener('pointercancel', () => { tap = undefined; });
      tab.addEventListener('pointerup', event => {
        const start = tap;
        tap = undefined;
        if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 12 && tab.contains(document.elementFromPoint(event.clientX, event.clientY))) select(index);
      });
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
    gallery.querySelectorAll('img').forEach(image => { image.draggable = false; });
    gallery.addEventListener('pointerdown', event => {
      ignorePointerClick = false;
      resetGesture();
      if (!event.isPrimary || event.button !== 0) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
    });
    gallery.addEventListener('pointermove', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 12) {
        gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'horizontal' : 'vertical';
        if (gesture.axis === 'horizontal') {
          // Touch already captures its original target; keep its native tap lifecycle.
          if (event.pointerType !== 'touch') gallery.setPointerCapture(event.pointerId);
          gallery.classList.add('is-swiping');
        }
      }
      if (gesture.axis === 'horizontal' && !preference.matches) gallery.style.setProperty('--swipe-offset', `${Math.max(-70, Math.min(70, dx * .32))}px`);
    });
    gallery.addEventListener('pointerup', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const horizontal = gesture.axis === 'horizontal';
      const threshold = Math.max(44, Math.min(90, gallery.clientWidth * .12));
      const offset = swipeOffset();
      resetGesture(false, false);
      if (!horizontal) return;
      ignorePointerClick = true;
      const next = Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.25 ? (active + (dx < 0 ? 1 : tabs.length - 1)) % tabs.length : active;
      select(next, true, offset);
    });
    gallery.addEventListener('click', event => {
      if (ignorePointerClick && event.detail > 0) {
        ignorePointerClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    gallery.addEventListener('pointercancel', resetGesture);
    gallery.addEventListener('lostpointercapture', event => {
      if (event.target === gallery && event.pointerId === gesture?.id) resetGesture();
    });
    window.addEventListener('resize', () => { resetGesture(true, false); cancelVisuals(); }, { passive: true });
    window.addEventListener('blur', resetGesture);
    gallery.classList.add('is-interactive');
    root.querySelector('.upcoming-copy').classList.add('is-interactive');
    const requested = new URLSearchParams(location.search).get('thema');
    const initial = tabs.findIndex(tab => tab.dataset.upcoming === requested);
    select(initial < 0 ? 0 : initial, false);
    tablist.hidden = false;
    preference.addEventListener('change', () => { transition?.cancel(); resetGesture(true, false); cancelVisuals(); });
  }

  setupNavigation();
  setupRoadmap();
  setupFeatureStory();
  setupPartnership();
  startMotion();
  preference.addEventListener('change', startMotion);
})();
