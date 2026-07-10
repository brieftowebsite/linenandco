/* ============================================================
   ASSET: lc-main-product.js
   Purpose: PDP interactions for anchor navigation, pack size,
            satin stitch, closure selection, wishlist toggles,
            and copy link.
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var mainProductSection =
      document.getElementById('lc-main-product') ||
      document.querySelector('.shopify-section--main-product') ||
      document.querySelector('.lc-blind-product-shell');
    if (!mainProductSection) return;

    // =========================================================================
    // 1. ANCHOR NAVIGATION
    // =========================================================================
    (function lcInitAnchorNavigation() {
      var anchorWrapper =
        document.getElementById('lc-js-sticky-nav-anchor') ||
        document.querySelector('.lc-anchor-nav-breakout-row-wrapper');
      var anchorNav = document.querySelector('.lc-anchor-nav');

      if (!(anchorNav && anchorWrapper)) return;

      var links = Array.prototype.slice.call(anchorNav.querySelectorAll('.lc-anchor-nav__link'));
      var ACTIVE = 'lc-anchor-nav__link--active';
      var isScrolling = false;
      var scrollTimer = null;

      function getStickyHeaderHeight() {
        var css = getComputedStyle(document.documentElement).getPropertyValue('--sticky-area-height');
        var height = parseInt(css, 10);

        if (!isNaN(height) && height >= 0) return height;

        var header = document.querySelector('.header, .shopify-section--header');
        if (header) {
          var box = header.getBoundingClientRect();
          if (box.bottom > 0) return box.height || (window.innerWidth >= 1000 ? 70 : 60);
        }

        return 0;
      }

      function getNavOffset() {
        return getStickyHeaderHeight() + (anchorWrapper.getBoundingClientRect().height || 40);
      }

      window.addEventListener(
        'scroll',
        function () {
          if (window.scrollY > 15) {
            anchorWrapper.classList.add('is-sticky');
          } else {
            anchorWrapper.classList.remove('is-sticky');
          }
        },
        { passive: true }
      );

      anchorNav.addEventListener('click', function (e) {
        var link = e.target.closest('a[href^="#"]');
        if (!link) return;

        var id = link.getAttribute('href').slice(1);

        if (!id || id === 'lc-main-product' || id === 'lc-quantity-buy') {
          e.preventDefault();
          isScrolling = true;
          window.scrollTo({ top: 0, behavior: 'smooth' });

          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(function () {
            isScrolling = false;
          }, 800);

          return;
        }

        var target = document.getElementById(id);
        if (!target) return;

        e.preventDefault();
        isScrolling = true;

        var y = target.getBoundingClientRect().top + window.scrollY - getNavOffset() - 12;
        window.scrollTo({ top: y, behavior: 'smooth' });

        if (history.pushState) history.pushState(null, null, '#' + id);

        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
          isScrolling = false;
        }, 800);
      });

      var spySections = links
        .map(function (link) {
          return (link.getAttribute('href') || '').replace('#', '');
        })
        .filter(function (id) {
          return id && id !== 'lc-main-product' && id !== 'lc-quantity-buy';
        })
        .map(function (id) {
          return document.getElementById(id);
        })
        .filter(Boolean);

      if ('IntersectionObserver' in window && spySections.length) {
        var linkMap = new Map();

        spySections.forEach(function (section) {
          var link = anchorNav.querySelector('a[href="#' + section.id + '"]');
          if (link) linkMap.set(section, link);
        });

        spySections.forEach(function (section) {
          new IntersectionObserver(
            function (entries) {
              if (isScrolling) return;

              entries.forEach(function (entry) {
                var link = linkMap.get(entry.target);
                if (!link) return;

                if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
                  links.forEach(function (item) {
                    item.classList.remove(ACTIVE, 'is-active');
                  });

                  link.classList.add(ACTIVE, 'is-active');
                }
              });
            },
            { rootMargin: '-90px 0px -50% 0px', threshold: [0.1, 0.25] }
          ).observe(section);
        });
      }
    })();


    // =========================================================================
    // 2. SELECTED VARIANT OPTION LABELS
    // =========================================================================
    (function lcInitSelectedVariantOptionLabels() {
      var nonVariantSelections = {};

      function cleanText(text) {
        return (text || '').replace(/\s+/g, ' ').trim();
      }

      function getOptionLabel(input) {
        if (!input) return '';

        if (input.labels && input.labels.length) {
          return cleanText(input.labels[0].textContent);
        }

        return cleanText(input.getAttribute('aria-label') || input.value);
      }

      function normaliseMediaKey(text) {
        return (text || '')
          .toLowerCase()
          .replace(/-/g, ' ')
          .replace(/\u00a0/g, ' ')
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function getNonVariantInputs(root) {
        if (!root || !root.querySelectorAll) return [];

        return Array.prototype.slice.call(
          root.querySelectorAll('[data-non-variant-option] input[type="radio"][name^="properties["]')
        );
      }

      function storeNonVariantSelection(input) {
        if (!input || !input.name || !input.checked) return;

        nonVariantSelections[input.name] = input.value;
      }

      function captureNonVariantSelections(root) {
        getNonVariantInputs(root).forEach(function (input) {
          if (input.checked) storeNonVariantSelection(input);
        });
      }

      function restoreNonVariantSelections() {
        var restoredInputs = [];

        Object.keys(nonVariantSelections).forEach(function (name) {
          var value = nonVariantSelections[name];

          getNonVariantInputs(mainProductSection).some(function (input) {
            if (input.name === name && input.value === value) {
              input.checked = true;
              restoredInputs.push(input);
              return true;
            }

            return false;
          });
        });

        return restoredInputs;
      }

      function findGalleryMediaByKey(gallery, input) {
        var terms = [input.getAttribute('data-non-variant-media-key'), getOptionLabel(input), input.value]
          .map(normaliseMediaKey)
          .filter(Boolean);

        if (!terms.length) return null;

        var mediaNodes = Array.prototype.slice.call(gallery.querySelectorAll('.product-gallery__media'));

        for (var i = 0; i < mediaNodes.length; i++) {
          var mediaNode = mediaNodes[i];
          var img = mediaNode.querySelector('img');
          var haystack = normaliseMediaKey(
            [
              img && img.getAttribute('alt'),
              img && (img.getAttribute('src') || img.currentSrc),
              img && img.getAttribute('srcset'),
              mediaNode.getAttribute('aria-label')
            ].join(' ')
          );

          if (!haystack) continue;

          for (var j = 0; j < terms.length; j++) {
            if (terms[j] && haystack.indexOf(terms[j]) > -1) {
              return mediaNode;
            }
          }
        }

        return null;
      }

      function findGalleryMediaForInput(input) {
        var gallery = mainProductSection.querySelector('product-gallery');
        if (!gallery || !input) return null;

        var mediaId = input.getAttribute('data-non-variant-media-id');
        var mediaNode = mediaId ? gallery.querySelector('[data-media-id="' + mediaId + '"]') : null;

        if (!mediaNode) {
          mediaNode = findGalleryMediaByKey(gallery, input);
        }

        return mediaNode ? { gallery: gallery, mediaNode: mediaNode } : null;
      }

      function selectGalleryMedia(gallery, mediaNode) {
        if (!gallery || !mediaNode) return;

        var mediaId = mediaNode.getAttribute('data-media-id');
        var carousel = gallery.querySelector('.product-gallery__carousel');
        var thumbnail = mediaId ? gallery.querySelector('.product-gallery__thumbnail[data-media-id="' + mediaId + '"]') : null;

        if (mediaNode.hasAttribute('hidden')) {
          mediaNode.removeAttribute('hidden');
        }

        if (thumbnail && thumbnail.hasAttribute('hidden')) {
          thumbnail.removeAttribute('hidden');
        }

        if (carousel && typeof carousel.select === 'function') {
          var visibleMedia = Array.prototype.slice.call(carousel.querySelectorAll('.product-gallery__media:not([hidden])'));
          var index = visibleMedia.indexOf(mediaNode);

          if (index > -1) {
            carousel.select(index);
            return;
          }
        }

        if (thumbnail) {
          thumbnail.click();
          return;
        }

        mediaNode.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }

      function selectNonVariantGalleryMedia(input) {
        var match = findGalleryMediaForInput(input);

        if (match) {
          selectGalleryMedia(match.gallery, match.mediaNode);
        }
      }

      function getNonVariantImageDetails(input) {
        var imageUrl = input.getAttribute('data-non-variant-image-url') || '';
        var imageAlt = input.getAttribute('data-non-variant-image-alt') || '';
        var mediaId = input.getAttribute('data-non-variant-media-id') || '';

        if (!imageUrl) {
          var match = findGalleryMediaForInput(input);
          var image = match && match.mediaNode ? match.mediaNode.querySelector('img') : null;

          if (image) {
            imageUrl = image.currentSrc || image.getAttribute('src') || '';
            imageAlt = imageAlt || image.getAttribute('alt') || '';
            mediaId = mediaId || match.mediaNode.getAttribute('data-media-id') || '';
          }
        }

        return {
          imageUrl: imageUrl,
          imageAlt: imageAlt || getOptionLabel(input),
          mediaId: mediaId
        };
      }

      function setHiddenCartImageField(field, value, enabled) {
        if (!field) return;

        field.value = value || '';
        field.disabled = !enabled;
      }

      function syncNonVariantCartImage(input) {
        if (!input) return;

        var optionRoot = input.closest('[data-non-variant-option]');
        if (!optionRoot) return;

        var imageField = optionRoot.querySelector('[data-non-variant-cart-image-property]');
        if (!imageField) return;

        var imageAltField = optionRoot.querySelector('[data-non-variant-cart-image-alt-property]');
        var mediaIdField = optionRoot.querySelector('[data-non-variant-cart-media-id-property]');
        var details = getNonVariantImageDetails(input);
        var hasImage = Boolean(details.imageUrl);

        setHiddenCartImageField(imageField, details.imageUrl, hasImage);
        setHiddenCartImageField(imageAltField, details.imageAlt, hasImage && Boolean(details.imageAlt));
        setHiddenCartImageField(mediaIdField, details.mediaId, hasImage && Boolean(details.mediaId));
      }

      function findCheckedInput(picker, optionPosition) {
        var formId = picker.getAttribute('form-id');
        var selector = 'input[type="radio"][data-option-position="' + optionPosition + '"]:checked';

        if (formId) {
          var scopedInput = mainProductSection.querySelector(selector + '[form="' + formId + '"]');
          if (scopedInput) return scopedInput;
        }

        return picker.querySelector(selector);
      }

      function updateNonVariantPicker(picker) {
        picker.querySelectorAll('[data-non-variant-option]').forEach(function (optionRoot) {
          var checkedInput = optionRoot.querySelector('input[type="radio"][name^="properties["]:checked');
          var label = getOptionLabel(checkedInput);

          if (!label) return;

          optionRoot.querySelectorAll('[data-lc-selected-non-variant-label]').forEach(function (target) {
            target.textContent = label;
          });

          syncNonVariantCartImage(checkedInput);
        });
      }

      function updatePicker(picker) {
        picker.querySelectorAll('[data-lc-selected-option-label][data-option-position]').forEach(function (target) {
          var input = findCheckedInput(picker, target.getAttribute('data-option-position'));
          var label = getOptionLabel(input);

          if (label) {
            target.textContent = label;
          }
        });

        updateNonVariantPicker(picker);
      }

      function updateAllPickers() {
        mainProductSection.querySelectorAll('variant-picker').forEach(updatePicker);
        updateNonVariantPicker(mainProductSection);
      }

      mainProductSection.addEventListener('change', function (event) {
        if (event.target && event.target.matches('[data-non-variant-option] input[type="radio"][name^="properties["]')) {
          storeNonVariantSelection(event.target);
          syncNonVariantCartImage(event.target);
          updateAllPickers();
          selectNonVariantGalleryMedia(event.target);
        }

        if (event.target && event.target.matches('input[type="radio"][data-option-position]')) {
          updateAllPickers();
          setTimeout(updateAllPickers, 120);
        }
      });

      mainProductSection.addEventListener(
        'product:rerender',
        function () {
          captureNonVariantSelections(mainProductSection);
          setTimeout(function () {
            var restoredInputs = restoreNonVariantSelections();
            updateAllPickers();
            restoredInputs.forEach(syncNonVariantCartImage);
            restoredInputs.forEach(selectNonVariantGalleryMedia);
          }, 0);
        },
        true
      );

      mainProductSection.addEventListener('variant:change', function () {
        setTimeout(function () {
          var restoredInputs = restoreNonVariantSelections();
          updateAllPickers();
          restoredInputs.forEach(syncNonVariantCartImage);
          restoredInputs.forEach(selectNonVariantGalleryMedia);
        }, 0);
      });

      captureNonVariantSelections(mainProductSection);
      updateAllPickers();

      getNonVariantInputs(mainProductSection).forEach(function (input) {
        if (input.checked) {
          syncNonVariantCartImage(input);
          selectNonVariantGalleryMedia(input);
        }
      });
    })();


    // =========================================================================
    // 3. VARIANT SIZE / PACK META IN PRICE ROW
    // =========================================================================
    (function lcInitVariantPriceRowMeta() {
      var priceRow = mainProductSection.querySelector('[data-lc-price-row]');
      if (!priceRow) return;

      var metaTarget = priceRow.querySelector('[data-variant-meta]');
      var metaScript = priceRow.querySelector('[data-variant-price-row-meta]');
      var packProperty = mainProductSection.querySelector('[data-variant-pack-property]');
      if (!metaTarget || !metaScript) return;

      var meta = {};

      try {
        meta = JSON.parse(metaScript.textContent || '{}');
      } catch (e) {
        meta = {};
      }

      function getVariantIdFromForm() {
        var input = mainProductSection.querySelector('form[action*="/cart/add"] input[name="id"]');
        return input ? input.value : null;
      }

      function extractPack(text) {
        var match = String(text || '').match(/\b(?:pack\s*(?:of)?|set\s*(?:of)?)\s*\d+\b|\b\d+\s*(?:per\s*pack|pack)\b/i);
        if (!match) return '';

        var packText = match[0].replace(/\s+/g, ' ').trim();
        return packText.replace(/^pack\s+(\d+)$/i, 'Pack of $1').replace(/^set\s+(\d+)$/i, 'Set of $1');
      }

      function inferPackFromOptions(variantMeta, fallback) {
        var optionTexts = [];

        if (variantMeta && Array.isArray(variantMeta.options)) {
          variantMeta.options.forEach(function (option) {
            if (option && option.value) optionTexts.push(String(option.value));
          });
        }

        if (variantMeta && variantMeta.title) optionTexts.push(String(variantMeta.title));
        if (fallback && fallback.productTitle) optionTexts.push(String(fallback.productTitle));

        var inferredPack = '';

        optionTexts.some(function (text) {
          inferredPack = extractPack(text);
          return Boolean(inferredPack);
        });

        return inferredPack;
      }

      function buildMetaText(variantId) {
        var variantMeta = variantId && meta.variants ? meta.variants[String(variantId)] : null;
        var fallback = meta.fallback || {};
        var packConfiguration = variantMeta && variantMeta.pack_configuration;
        var legacyPack = (variantMeta && variantMeta.pack) || fallback.pack || inferPackFromOptions(variantMeta, fallback) || '';
        var pack = packConfiguration || legacyPack || '';

        return pack;
      }

      function updateMeta(variantId) {
        var text = buildMetaText(variantId || getVariantIdFromForm());

        if (packProperty) {
          packProperty.value = text || '';
          packProperty.disabled = !text;
        }

        if (text) {
          metaTarget.textContent = text;
          metaTarget.hidden = false;
        } else {
          metaTarget.textContent = '';
          metaTarget.hidden = true;
        }
      }

      mainProductSection.addEventListener('variant:change', function (event) {
        updateMeta(event.detail && event.detail.variant && event.detail.variant.id);
      });

      updateMeta(getVariantIdFromForm());
    })();

    // =========================================================================
    // 4. SATIN STITCH PICKER
    // =========================================================================
    (function lcInitSatinPicker() {
      var stitchSection = document.getElementById('SatinStitchSection');
      if (!stitchSection) return;

      var stitchInput = document.getElementById('lc-satin-stitch-property');
      var didForceNoSatinOnLoad = false;

      function normalise(str) {
        return (str || '')
          .toLowerCase()
          .replace(/-/g, ' ')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function setRequiredState(isRequired) {
        if (stitchInput) stitchInput.disabled = !isRequired;
      }

      function clearStitchSelection() {
        if (stitchInput) {
          stitchInput.value = '';
          stitchInput.disabled = true;
        }

        var label = stitchSection.querySelector('.js-selected-stitch-label');
        if (label) label.innerText = '';

        stitchSection.querySelectorAll('.lc-satin-stitch-picker__swatch').forEach(function (swatch) {
          swatch.classList.remove('is-active', 'is-selected');
        });
      }

      function getStyleOptionPosition() {
        var legends = mainProductSection.querySelectorAll('.variant-picker__option legend, variant-picker legend');

        for (var i = 0; i < legends.length; i++) {
          var text = normalise(legends[i].textContent);

          if (text === 'style' || text.indexOf('style') === 0) {
            var optionRoot = legends[i].closest('.variant-picker__option') || legends[i].parentElement;
            if (!optionRoot) continue;

            var input = optionRoot.querySelector('input[data-option-position]');
            if (input && input.dataset && input.dataset.optionPosition) {
              return parseInt(input.dataset.optionPosition, 10);
            }
          }
        }

        return null;
      }

      var stylePos = getStyleOptionPosition();

      function getSelectedOptionText(optionPos) {
        if (!optionPos) return null;

        var checked = mainProductSection.querySelector(
          'input[type="radio"][data-option-position="' + optionPos + '"]:checked'
        );

        if (checked) {
          var label = mainProductSection.querySelector('label[for="' + checked.id + '"]');
          if (label) return (label.textContent || '').trim();

          return checked.value || null;
        }

        var variantScript = mainProductSection.querySelector('[data-variant]');
        if (variantScript) {
          try {
            var variant = JSON.parse(variantScript.textContent);
            if (variant && variant.options) return variant.options[optionPos - 1] || null;
          } catch (e) {}
        }

        return null;
      }

      function getSelectedStyle() {
        return getSelectedOptionText(stylePos);
      }

      function getRowType(styleText) {
        var style = normalise(styleText);

        if (style.indexOf('one row') > -1 || style.indexOf('1 row') > -1) return 'one row';
        if (style.indexOf('two row') > -1 || style.indexOf('2 row') > -1) return 'two row';

        return '';
      }

      function findGalleryTarget(tokens) {
        var mediaNodes = document.querySelectorAll('product-gallery .product-gallery__media, .product-gallery__media');
        if (!mediaNodes || mediaNodes.length === 0) return null;

        var target = null;

        mediaNodes.forEach(function (node) {
          var img = node.querySelector('img');
          if (!img) return;

          var alt = normalise(img.getAttribute('alt'));
          var src = normalise(img.getAttribute('src') || img.getAttribute('data-src') || '');
          var haystack = alt || src;

          var matches = tokens.every(function (token) {
            return haystack.indexOf(normalise(token)) > -1;
          });

          if (matches) target = node;
        });

        return target;
      }

      function selectGalleryNode(node) {
        if (!node) return;

        var carousel = document.querySelector('scroll-carousel[id^="product-gallery-carousel"]');

        if (carousel && typeof carousel.select === 'function') {
          var items = Array.prototype.slice.call(carousel.querySelectorAll('.product-gallery__media:not([hidden])'));
          var index = items.indexOf(node);

          if (index > -1) {
            carousel.select(index);
            return;
          }
        }

        var id = node.getAttribute('data-media-id');
        if (id) {
          var thumb = document.querySelector('.product-gallery__thumbnail[data-media-id="' + id + '"]');
          if (thumb) {
            thumb.click();
            return;
          }
        }

        node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function jumpToNoSatinImage(styleText) {
        var style = normalise(styleText);
        var tokens = ['no satin stitch'];

        if (style.indexOf('oxford') > -1) tokens.push('oxford');
        if (style.indexOf('plain') > -1) tokens.push('plain');

        var target = findGalleryTarget(tokens) || findGalleryTarget(['no satin stitch']);
        selectGalleryNode(target);
      }

      function jumpToSatinImage(stitchColourLabel, styleText) {
        var row = getRowType(styleText);
        if (!row) return;

        var style = normalise(styleText);
        var baseTokens = [normalise(stitchColourLabel), row, 'satin stitch'];
        var specificTokens = baseTokens.slice();

        if (style.indexOf('oxford') > -1) specificTokens.push('oxford');
        if (style.indexOf('plain') > -1) specificTokens.push('plain');

        var target = findGalleryTarget(specificTokens) || findGalleryTarget(baseTokens);
        selectGalleryNode(target);
      }

      function selectNoSatinStyleOnLoad() {
        if (didForceNoSatinOnLoad || !stylePos) return;

        var currentStyle = getSelectedStyle() || '';
        if (normalise(currentStyle).indexOf('no satin stitch') > -1) {
          didForceNoSatinOnLoad = true;
          return;
        }

        var noSatinRadio = null;

        mainProductSection
          .querySelectorAll('input[type="radio"][data-option-position="' + stylePos + '"]')
          .forEach(function (radio) {
            var label = mainProductSection.querySelector('label[for="' + radio.id + '"]');
            var text = label ? label.textContent : radio.value;

            if (normalise(text).indexOf('no satin stitch') > -1) {
              noSatinRadio = radio;
            }
          });

        if (noSatinRadio && !noSatinRadio.checked && !noSatinRadio.disabled) {
          didForceNoSatinOnLoad = true;
          noSatinRadio.click();
        }
      }

      function selectFirstStitchSwatch() {
        var selected = stitchSection.querySelector('.lc-satin-stitch-picker__swatch.is-selected');
        if (selected) return;

        var firstSwatch = stitchSection.querySelector('.lc-satin-stitch-picker__swatch');
        if (firstSwatch) firstSwatch.click();
      }

      function evaluateSatinStitchDisplay() {
        var hasSwatches = stitchSection.getAttribute('data-has-swatches') !== 'false';

        if (!hasSwatches) {
          stitchSection.style.setProperty('display', 'none', 'important');
          setRequiredState(false);
          clearStitchSelection();
          return;
        }

        var styleText = getSelectedStyle() || '';
        var style = normalise(styleText);

        var requiresSatin =
          style.indexOf('one row satin stitch') > -1 ||
          style.indexOf('1 row satin stitch') > -1 ||
          style.indexOf('two row satin stitch') > -1 ||
          style.indexOf('2 row satin stitch') > -1;

        var noSatin = style.indexOf('no satin stitch') > -1;

        if (requiresSatin && !noSatin) {
          stitchSection.style.setProperty('display', 'block', 'important');
          setRequiredState(true);
          selectFirstStitchSwatch();
        } else {
          stitchSection.style.setProperty('display', 'none', 'important');
          setRequiredState(false);
          clearStitchSelection();

          if (noSatin) {
            jumpToNoSatinImage(styleText);
          }
        }
      }

      stitchSection.addEventListener('click', function (e) {
        var swatch = e.target.closest('.lc-satin-stitch-picker__swatch');
        if (!swatch) return;

        e.preventDefault();

        stitchSection.querySelectorAll('.lc-satin-stitch-picker__swatch').forEach(function (item) {
          item.classList.remove('is-active', 'is-selected');
        });

        swatch.classList.add('is-active', 'is-selected');

        var labelOriginal = (swatch.getAttribute('data-stitch-label') || '').trim();

        if (stitchInput) {
          stitchInput.value = labelOriginal;
          stitchInput.removeAttribute('disabled');
        }

        var labelDisplay = stitchSection.querySelector('.js-selected-stitch-label');
        if (labelDisplay) {
          labelDisplay.innerText = ' - ' + labelOriginal;
          labelDisplay.style.color = '';
        }

        jumpToSatinImage(labelOriginal, getSelectedStyle() || '');
      });

      function scheduleRecalc() {
        setTimeout(evaluateSatinStitchDisplay, 80);
      }

      mainProductSection.addEventListener('change', function (e) {
        if (e.target && e.target.matches('input[type="radio"][data-option-position]')) {
          scheduleRecalc();
        }
      });

      document.addEventListener('variant:changed', scheduleRecalc);
      document.addEventListener('variant:change', scheduleRecalc);

      selectNoSatinStyleOnLoad();
      clearStitchSelection();

      setTimeout(function () {
        evaluateSatinStitchDisplay();
      }, 120);
    })();

    // =========================================================================
    // 5. CLOSURE SELECTOR
    // =========================================================================
    (function lcInitClosureSelector() {
      var closureSection = mainProductSection.querySelector('.closure-selector');
      if (!closureSection) return;

      var checkedInput = closureSection.querySelector('[data-closure-option]:checked');
      var firstInput = closureSection.querySelector('[data-closure-option]');

      function updateClosureSelection(input) {
        if (!input) return;

        closureSection.querySelectorAll('.closure-selector__option').forEach(function (option) {
          option.classList.remove('is-selected');
        });

        var option = input.closest('.closure-selector__option');
        if (option) option.classList.add('is-selected');
      }

      if (!checkedInput && firstInput) {
        firstInput.checked = true;
        checkedInput = firstInput;
      }

      updateClosureSelection(checkedInput);

      closureSection.addEventListener('change', function (e) {
        var input = e.target.closest('[data-closure-option]');
        if (!input) return;

        updateClosureSelection(input);
      });
    })();

    // =========================================================================
    // 6. WISHLIST TOGGLE
    // =========================================================================
    (function lcInitWishlist() {
      if (!window.LinenCoWishlist) return;

      window.LinenCoWishlist.initButtons(document);
    })();

    // =========================================================================
    // 7. COPY LINK
    // =========================================================================
    (function lcInitCopyLink() {
      var copyBtns = document.querySelectorAll('[data-copy-link]');
      if (!copyBtns.length) return;

      function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).catch(function () {
            return fallbackCopy(text);
          });
        }

        return fallbackCopy(text);
      }

      function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          document.execCommand('copy');
        } catch (err) {}

        document.body.removeChild(textarea);
        return Promise.resolve();
      }

      function setCopiedState(btn, isCopied) {
        var label = btn.querySelector('.lc-action-btn__copy-label');

        btn.classList.toggle('is-copied', isCopied);
        btn.setAttribute('aria-pressed', isCopied ? 'true' : 'false');
        btn.setAttribute('aria-label', isCopied ? 'Product link copied' : 'Copy product link');

        if (label) {
          label.textContent = isCopied ? 'Copied' : 'Copy Link';
        }
      }

      copyBtns.forEach(function (btn) {
        btn.setAttribute('aria-pressed', 'false');
        setCopiedState(btn, false);

        btn.addEventListener('click', function (e) {
          e.preventDefault();

          var copyUrl = btn.getAttribute('data-copy-url') || window.location.href;

          copyText(copyUrl).then(function () {
            setCopiedState(btn, true);

            clearTimeout(btn._lcCopyTimer);
            btn._lcCopyTimer = setTimeout(function () {
              setCopiedState(btn, false);
            }, 1800);
          });
        });
      });
    })();

    // =========================================================================
    // 8. DESKTOP GALLERY THUMBNAIL RAIL
    // =========================================================================
    (function lcInitGalleryThumbnailRail() {
      var railSelector = '.product-gallery__thumbnail-list--with-rail-controls';
      var scrollerSelector = '.product-gallery__thumbnail-scroller';
      var buttonSelector = '[data-lc-thumbnail-rail]';
      var boundScrollers = new WeakSet();
      var updateFrame = null;

      function getRailParts(rail) {
        if (!rail) return null;

        return {
          rail: rail,
          scroller: rail.querySelector(scrollerSelector),
          prev: rail.querySelector('[data-lc-thumbnail-rail="prev"]'),
          next: rail.querySelector('[data-lc-thumbnail-rail="next"]')
        };
      }

      function updateRail(rail) {
        var parts = getRailParts(rail);
        if (!(parts && parts.scroller && parts.prev && parts.next)) return;

        var maxScroll = Math.max(0, parts.scroller.scrollHeight - parts.scroller.clientHeight);
        var hasOverflow = maxScroll > 2;
        var atStart = parts.scroller.scrollTop <= 2;
        var atEnd = parts.scroller.scrollTop >= maxScroll - 2;

        parts.prev.hidden = !hasOverflow;
        parts.next.hidden = !hasOverflow;
        parts.prev.disabled = !hasOverflow || atStart;
        parts.next.disabled = !hasOverflow || atEnd;
      }

      function scheduleRailUpdate(rail) {
        if (!rail) return;

        window.cancelAnimationFrame(updateFrame);
        updateFrame = window.requestAnimationFrame(function () {
          updateRail(rail);
        });
      }

      function bindRail(rail) {
        var parts = getRailParts(rail);
        if (!(parts && parts.scroller)) return;

        if (!boundScrollers.has(parts.scroller)) {
          boundScrollers.add(parts.scroller);

          parts.scroller.addEventListener(
            'scroll',
            function () {
              scheduleRailUpdate(rail);
            },
            { passive: true }
          );
        }

        scheduleRailUpdate(rail);
      }

      function bindRails() {
        Array.prototype.forEach.call(mainProductSection.querySelectorAll(railSelector), bindRail);
      }

      function getScrollDistance(scroller, direction) {
        var fallback = scroller.clientHeight * 0.78;
        var visibleThumbs = Array.prototype.filter.call(scroller.querySelectorAll('.product-gallery__thumbnail'), function (thumb) {
          return !thumb.hidden;
        });

        if (!visibleThumbs.length) return fallback;

        var referenceThumb = direction === 'prev' ? visibleThumbs[0] : visibleThumbs[visibleThumbs.length - 1];
        var thumbHeight = referenceThumb.getBoundingClientRect().height;
        var styles = window.getComputedStyle(scroller);
        var gap = parseFloat(styles.rowGap || styles.gap) || 0;

        return Math.max(fallback, (thumbHeight + gap) * 3);
      }

      mainProductSection.addEventListener('click', function (event) {
        var button = event.target.closest(buttonSelector);
        if (!button) return;

        var rail = button.closest(railSelector);
        var parts = getRailParts(rail);
        if (!(parts && parts.scroller)) return;

        var direction = button.getAttribute('data-lc-thumbnail-rail') === 'prev' ? 'prev' : 'next';
        var distance = getScrollDistance(parts.scroller, direction) * (direction === 'prev' ? -1 : 1);

        event.preventDefault();
        parts.scroller.scrollBy({
          top: distance,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
      });

      window.addEventListener('resize', bindRails);

      if ('MutationObserver' in window) {
        new MutationObserver(function (records) {
          records.forEach(function (record) {
            var rail =
              record.target.closest && record.target.closest(railSelector) ||
              record.target.querySelector && record.target.querySelector(railSelector);

            if (rail) bindRail(rail);
          });
        }).observe(mainProductSection, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
      }

      bindRails();
    })();
  });
})();
