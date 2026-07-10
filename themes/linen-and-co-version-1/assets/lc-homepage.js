(() => {
  const initRail = (rail, options = {}) => {
    if (!rail || rail.dataset.lcRailReady === 'true') {
      return;
    }

    const track = rail.querySelector(options.track || '[data-lc-rail-track]');
    const prev = rail.querySelector(options.prev || '[data-lc-rail-prev]');
    const next = rail.querySelector(options.next || '[data-lc-rail-next]');
    const controls = rail.querySelector(options.controls || '[data-lc-rail-controls]');

    if (!track || !prev || !next) {
      return;
    }

    rail.dataset.lcRailReady = 'true';

    const getStep = () => {
      const firstItem = track.querySelector(options.item || ':scope > *');

      if (!firstItem) {
        return track.clientWidth * 0.85;
      }

      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;

      return firstItem.getBoundingClientRect().width + gap;
    };

    const update = () => {
      const maxScroll = track.scrollWidth - track.clientWidth - 2;
      const hasOverflow = maxScroll > 1;

      if (controls) {
        controls.hidden = !hasOverflow;
      }

      prev.disabled = !hasOverflow || track.scrollLeft <= 2;
      next.disabled = !hasOverflow || track.scrollLeft >= maxScroll;
    };

    prev.addEventListener('click', () => {
      track.scrollBy({ left: getStep() * -1, behavior: 'smooth' });
    });

    next.addEventListener('click', () => {
      track.scrollBy({ left: getStep(), behavior: 'smooth' });
    });

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    update();
    window.setTimeout(update, 300);
  };

  const initShopByNeed = (root = document) => {
    root.querySelectorAll('[data-lc-shop-by-need-rail]').forEach((rail) => {
      initRail(rail, {
        track: '[data-lc-shop-by-need-track]',
        prev: '[data-lc-shop-by-need-prev]',
        next: '[data-lc-shop-by-need-next]',
        controls: '[data-lc-shop-by-need-controls]',
        item: '.lc-home-shop-by-need__tile'
      });
    });
  };

  const initFabricGuide = (root = document) => {
    root.querySelectorAll('[data-lc-fabric-guide-rail]').forEach((rail) => {
      initRail(rail, {
        track: '[data-lc-fabric-guide-track]',
        prev: '[data-lc-fabric-guide-prev]',
        next: '[data-lc-fabric-guide-next]',
        controls: '[data-lc-fabric-guide-controls]',
        item: '.lc-home-fabric-guide__card'
      });
    });
  };

  const initCustomFinishes = (root = document) => {
    root.querySelectorAll('[data-lc-custom-finishes-rail]').forEach((rail) => {
      initRail(rail, {
        track: '[data-lc-custom-finishes-track]',
        prev: '[data-lc-custom-finishes-prev]',
        next: '[data-lc-custom-finishes-next]',
        controls: '[data-lc-custom-finishes-controls]',
        item: '.lc-home-custom-finishes__card'
      });
    });
  };

  const initShopByShade = (root = document) => {
    root.querySelectorAll('[data-lc-shade-section]').forEach((section) => {
      if (section.dataset.lcShadeReady === 'true') {
        return;
      }

      section.dataset.lcShadeReady = 'true';

      const tabs = Array.from(section.querySelectorAll('[data-lc-shade-tab]'));
      const panels = Array.from(section.querySelectorAll('[data-lc-shade-panel]'));
      const cta = section.querySelector('[data-lc-shade-cta]');

      const updateRails = (panel) => {
        if (!panel) {
          return;
        }

        panel.querySelectorAll('[data-lc-shade-rail]').forEach((rail) => {
          initRail(rail, {
            track: '[data-lc-shade-track]',
            prev: '[data-lc-shade-prev]',
            next: '[data-lc-shade-next]',
            controls: '[data-lc-shade-controls]',
            item: '.lc-home-shop-by-shade__product'
          });
        });
      };

      const activate = (tab) => {
        const targetPanel = section.querySelector(`#${tab.getAttribute('aria-controls')}`);

        tabs.forEach((currentTab) => {
          const isActive = currentTab === tab;
          currentTab.classList.toggle('is-active', isActive);
          currentTab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach((panel) => {
          const isActive = panel === targetPanel;
          panel.classList.toggle('is-active', isActive);
          panel.hidden = !isActive;

          if (isActive) {
            const track = panel.querySelector('[data-lc-shade-track]');
            if (track) {
              track.scrollTo({ left: 0, behavior: 'auto' });
            }
          }
        });

        if (cta) {
          const ctaText = tab.dataset.lcShadeCtaText;
          const ctaUrl = tab.dataset.lcShadeCtaUrl;

          if (ctaText) {
            cta.textContent = ctaText;
          }

          if (ctaUrl) {
            cta.setAttribute('href', ctaUrl);
          }
        }

        window.requestAnimationFrame(() => updateRails(targetPanel));
      };

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => activate(tab));
      });

      updateRails(section.querySelector('[data-lc-shade-panel]:not([hidden])'));
    });
  };

  const initProductHubs = (root = document) => {
    root.querySelectorAll('[data-lc-home-product-rail]').forEach((rail) => {
      initRail(rail, {
        track: '[data-lc-home-product-track]',
        prev: '[data-lc-home-rail-prev]',
        next: '[data-lc-home-rail-next]',
        controls: '[data-lc-home-rail-controls]',
        item: '.lc-home-product-hub__product'
      });
    });
  };

  const initBestsellers = (root = document) => {
    root.querySelectorAll('.lc-home-bestsellers').forEach((section) => {
      if (section.dataset.lcBestsellersReady === 'true') {
        return;
      }

      section.dataset.lcBestsellersReady = 'true';

      const tabs = Array.from(section.querySelectorAll('[data-lc-bestsellers-tab]'));
      const panels = Array.from(section.querySelectorAll('[data-lc-bestsellers-panel]'));

      const updateRails = () => {
        section.querySelectorAll('[data-lc-bestsellers-rail]').forEach((rail) => {
          initRail(rail, {
            track: '[data-lc-bestsellers-track]',
            prev: '[data-lc-bestsellers-prev]',
            next: '[data-lc-bestsellers-next]',
            controls: '[data-lc-bestsellers-controls]',
            item: '.lc-home-bestsellers__product'
          });
        });
      };

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const targetPanel = section.querySelector(`#${tab.getAttribute('aria-controls')}`);

          tabs.forEach((currentTab) => {
            const isActive = currentTab === tab;
            currentTab.classList.toggle('is-active', isActive);
            currentTab.setAttribute('aria-selected', isActive ? 'true' : 'false');
          });

          panels.forEach((panel) => {
            const isActive = panel === targetPanel;
            panel.classList.toggle('is-active', isActive);
            panel.hidden = !isActive;

            if (isActive) {
              const track = panel.querySelector('[data-lc-bestsellers-track]');
              if (track) {
                track.scrollTo({ left: 0, behavior: 'auto' });
              }
            }
          });

          window.requestAnimationFrame(updateRails);
        });
      });

      updateRails();
    });
  };

  const initHomepage = (root = document) => {
    initShopByNeed(root);
    initFabricGuide(root);
    initCustomFinishes(root);
    initShopByShade(root);
    initBestsellers(root);
    initProductHubs(root);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initHomepage());
  } else {
    initHomepage();
  }

  document.addEventListener('shopify:section:load', (event) => initHomepage(event.target));
})();
