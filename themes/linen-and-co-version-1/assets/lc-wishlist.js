(function () {
  'use strict';

  var STORAGE_KEY = 'lc_wishlist';

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function stableValue(value) {
    if (Array.isArray(value)) {
      return value.map(stableValue);
    }

    if (value && typeof value === 'object') {
      return Object.keys(value).sort().reduce(function (next, key) {
        next[key] = stableValue(value[key]);
        return next;
      }, {});
    }

    return value;
  }

  function stableStringify(value) {
    return JSON.stringify(stableValue(value));
  }

  function normaliseOptions(options) {
    if (!Array.isArray(options)) return [];

    return options.map(function (option) {
      if (!option || typeof option !== 'object') return null;

      var label = cleanText(option.label || option.name);
      var value = cleanText(option.value);

      if (!label || !value || value.toLowerCase() === 'default title') return null;

      return { label: label, value: value };
    }).filter(Boolean);
  }

  function normalisePropertyKey(key) {
    var cleanKey = cleanText(key);
    var lowerKey = cleanKey.toLowerCase();

    if (lowerKey === 'pack size' || lowerKey === 'pack configuration' || lowerKey === 'pack') {
      return 'Pack size';
    }

    if (lowerKey === 'mattress length') return 'Mattress Length';

    return cleanKey;
  }

  function normaliseProperties(properties) {
    if (!properties || typeof properties !== 'object') return {};

    return Object.keys(properties).sort().reduce(function (next, key) {
      var originalKey = cleanText(key);
      var cleanKey = normalisePropertyKey(originalKey);
      var value = properties[key];

      if (!originalKey || originalKey.charAt(0) === '_' || !cleanKey) return next;
      if (cleanKey.toLowerCase() === 'pack quantity') return next;
      if (Array.isArray(value)) value = value.join(', ');

      value = cleanText(value);
      if (!value) return next;

      next[cleanKey] = value;
      return next;
    }, {});
  }

  function buildKey(item) {
    var base = item.handle || item.id || '';
    var hasConfiguration = Boolean(
      item.variantId ||
      item.options.length ||
      Object.keys(item.properties).length
    );

    if (!hasConfiguration) return 'product:' + base;

    return [
      'product:' + base,
      'variant:' + (item.variantId || ''),
      'options:' + stableStringify(item.options),
      'properties:' + stableStringify(item.properties)
    ].join('|');
  }

  function normaliseItem(item) {
    if (!item) return null;

    if (typeof item === 'string' || typeof item === 'number') {
      item = { id: item.toString() };
    }

    if (typeof item !== 'object') return null;

    var id = item.id ? item.id.toString() : '';
    var handle = item.handle ? item.handle.toString() : '';

    if (!id && !handle) return null;

    var normalised = {
      id: id,
      handle: handle,
      title: item.title || '',
      url: item.url || (handle ? '/products/' + handle : ''),
      image: item.image || '',
      price: item.price || '',
      variantId: item.variantId || item.variant_id ? String(item.variantId || item.variant_id) : '',
      variantTitle: item.variantTitle || item.variant_title || '',
      options: normaliseOptions(item.options),
      properties: normaliseProperties(item.properties),
      quantity: Math.max(1, parseInt(item.quantity || 1, 10) || 1)
    };

    normalised.key = item.key ? String(item.key) : buildKey(normalised);

    return normalised;
  }

  function dedupe(list) {
    var seen = {};

    return list.filter(function (item) {
      var key = item.key || item.handle || item.id;
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function read() {
    var parsed = [];

    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      parsed = [];
    }

    if (!Array.isArray(parsed)) return [];

    return dedupe(parsed.map(normaliseItem).filter(Boolean));
  }

  function write(list) {
    var cleanList = dedupe((list || []).map(normaliseItem).filter(Boolean));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
    document.dispatchEvent(new CustomEvent('lc:wishlist:updated', { detail: { wishlist: cleanList } }));
    updateCounts(cleanList);
    return cleanList;
  }

  function handleFromUrl(url) {
    var match = (url || '').match(/\/products\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function getProductForm(button) {
    var formId = button.getAttribute('data-product-form-id');

    if (formId) {
      var form = document.getElementById(formId);
      if (form) return form;
    }

    return button.closest('form[action*="/cart/add"]') ||
      button.closest('.product-info, #lc-main-product, product-rerender')?.querySelector('form[action*="/cart/add"]') ||
      null;
  }

  function getVariantPicker(form) {
    if (!form || !form.id) return null;

    var pickers = Array.prototype.slice.call(document.querySelectorAll('variant-picker'));

    return pickers.find(function (picker) {
      return picker.getAttribute('form-id') === form.id;
    }) || null;
  }

  function getCurrentVariant(form) {
    var picker = getVariantPicker(form);
    var script = picker ? picker.querySelector('script[data-variant]') : null;

    if (!script) return null;

    try {
      return JSON.parse(script.textContent || '{}');
    } catch (e) {
      return null;
    }
  }

  function getInputLabel(input) {
    if (!input) return '';

    if (input.labels && input.labels.length) {
      return cleanText(input.labels[0].textContent);
    }

    return cleanText(input.getAttribute('aria-label') || input.value);
  }

  function getOptionName(optionRoot) {
    var legend = optionRoot.querySelector('legend');

    if (legend) {
      return cleanText(legend.textContent).replace(/:$/, '');
    }

    var labels = optionRoot.querySelectorAll('.variant-picker__option-info span');
    if (labels.length > 1) return cleanText(labels[0].textContent).replace(/:$/, '');

    return '';
  }

  function getOptionValue(optionRoot, form) {
    var checked = optionRoot.querySelector('input[type="radio"][data-option-position]:checked');

    if (!checked && form && form.id) {
      var firstInput = optionRoot.querySelector('input[type="radio"][data-option-position]');
      var optionPosition = firstInput ? firstInput.getAttribute('data-option-position') : '';

      if (optionPosition) {
        checked = document.querySelector('input[type="radio"][form="' + form.id + '"][data-option-position="' + optionPosition + '"]:checked');
      }
    }

    if (checked) return getInputLabel(checked);

    var selectedLabel = optionRoot.querySelector('[data-lc-selected-option-label]');
    if (selectedLabel) return cleanText(selectedLabel.textContent);

    var labels = optionRoot.querySelectorAll('.variant-picker__option-info span');
    if (labels.length > 1) return cleanText(labels[labels.length - 1].textContent);

    return '';
  }

  function collectSelectedOptions(form) {
    var picker = getVariantPicker(form);
    if (!picker) return [];

    return Array.prototype.slice.call(picker.querySelectorAll('.variant-picker__option')).map(function (optionRoot) {
      var label = getOptionName(optionRoot);
      var value = getOptionValue(optionRoot, form);

      if (!label || !value) return null;

      return { label: label, value: value };
    }).filter(Boolean);
  }

  function collectProperties(form) {
    if (!form || !form.elements) return {};

    return Array.prototype.slice.call(form.elements).reduce(function (properties, field) {
      var match = field.name && field.name.match(/^properties\[(.+)\]$/);
      if (!match || field.disabled) return properties;

      if ((field.type === 'radio' || field.type === 'checkbox') && !field.checked) {
        return properties;
      }

      properties[match[1]] = field.value;
      return properties;
    }, {});
  }

  function collectQuantity(form) {
    if (!form) return 1;

    var quantityInput = form.querySelector('[name="quantity"]');
    return Math.max(1, parseInt(quantityInput && quantityInput.value || 1, 10) || 1);
  }

  function withVariantUrl(url, variantId) {
    if (!url || !variantId) return url;

    var cleanedUrl = url.replace(/[?&]variant=\d+/, '');
    var separator = cleanedUrl.indexOf('?') > -1 ? '&' : '?';

    return cleanedUrl + separator + 'variant=' + encodeURIComponent(variantId);
  }

  function getButtonItem(button) {
    var analyticsProduct = window.ShopifyAnalytics &&
      window.ShopifyAnalytics.meta &&
      window.ShopifyAnalytics.meta.product;
    var url = button.getAttribute('data-product-url') || '';
    var handle = button.getAttribute('data-product-handle') || handleFromUrl(url);
    var form = getProductForm(button);
    var variant = form ? getCurrentVariant(form) : null;
    var variantId = form?.querySelector('[name="id"]')?.value || (variant && variant.id) || '';
    var variantTitle = variant && variant.title && variant.title !== 'Default Title' ? variant.title : '';
    var options = form ? collectSelectedOptions(form) : [];
    var properties = form ? collectProperties(form) : {};
    var quantity = form ? collectQuantity(form) : 1;

    return normaliseItem({
      id: button.getAttribute('data-product-id') ||
        button.getAttribute('data-computed-pid') ||
        (analyticsProduct && analyticsProduct.id ? analyticsProduct.id : ''),
      handle: handle,
      title: button.getAttribute('data-product-title') || '',
      url: withVariantUrl(url, variantId),
      image: button.getAttribute('data-product-image') || '',
      price: button.getAttribute('data-product-price') || '',
      variantId: variantId,
      variantTitle: variantTitle,
      options: options,
      properties: properties,
      quantity: quantity
    });
  }

  function isConfiguredItem(item) {
    return Boolean(item && (item.variantId || item.options.length || Object.keys(item.properties).length));
  }

  function itemMatches(item, target) {
    if (!item || !target) return false;

    if (item.key && target.key) return item.key === target.key;

    if (!isConfiguredItem(item) && !isConfiguredItem(target)) {
      return Boolean((target.handle && item.handle === target.handle) || (target.id && item.id === target.id));
    }

    return false;
  }

  function has(item) {
    return read().some(function (wishlistItem) {
      return itemMatches(wishlistItem, item);
    });
  }

  function mergeSavedItem(savedItem, buttonItem) {
    return normaliseItem({
      id: savedItem.id || buttonItem.id,
      handle: savedItem.handle || buttonItem.handle,
      title: savedItem.title || buttonItem.title,
      url: savedItem.url || buttonItem.url,
      image: savedItem.image || buttonItem.image,
      price: savedItem.price || buttonItem.price,
      variantId: savedItem.variantId || buttonItem.variantId,
      variantTitle: savedItem.variantTitle || buttonItem.variantTitle,
      options: savedItem.options.length ? savedItem.options : buttonItem.options,
      properties: Object.keys(savedItem.properties).length ? savedItem.properties : buttonItem.properties,
      quantity: savedItem.quantity || buttonItem.quantity
    });
  }

  function hydrateSavedItem(buttonItem) {
    var list = read();
    var changed = false;
    var nextList = list.map(function (savedItem) {
      if (!itemMatches(savedItem, buttonItem)) return savedItem;

      var mergedItem = mergeSavedItem(savedItem, buttonItem);
      if (!mergedItem) return savedItem;

      if (stableStringify(mergedItem) !== stableStringify(savedItem)) {
        changed = true;
      }

      return mergedItem;
    });

    if (changed) write(nextList);
  }

  function add(item) {
    var normalisedItem = normaliseItem(item);
    if (!normalisedItem) return read();

    var list = read();

    if (!list.some(function (wishlistItem) { return itemMatches(wishlistItem, normalisedItem); })) {
      list.push(normalisedItem);
    }

    return write(list);
  }

  function remove(item) {
    var normalisedItem = normaliseItem(item);
    if (!normalisedItem) return read();

    return write(read().filter(function (wishlistItem) {
      return !itemMatches(wishlistItem, normalisedItem);
    }));
  }

  function setButtonState(button, saved) {
    var label = button.querySelector('.lc-action-btn__wishlist-label, .lc-buy-now-wishlist-share__wishlist-label');

    button.classList.toggle('is-saved', saved);
    button.classList.toggle('is-wishlisted', saved);
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    button.setAttribute('aria-label', saved ? 'Remove from wishlist' : 'Add to wishlist');

    if (label) {
      label.textContent = saved ? 'Wishlisted' : 'Add to wishlist';
    }
  }

  function updateButtons(root) {
    (root || document).querySelectorAll('[data-wishlist-toggle], .product-wishlist-btn').forEach(function (button) {
      var item = getButtonItem(button);
      if (!item) return;
      var saved = has(item);

      if (saved) hydrateSavedItem(item);

      setButtonState(button, saved);
    });
  }

  function updateCounts(list) {
    var count = (list || read()).length;

    document.querySelectorAll('[data-wishlist-count]').forEach(function (el) {
      el.textContent = count.toString();
      el.classList.toggle('is-visible', count > 0);
      el.setAttribute('aria-hidden', count > 0 ? 'false' : 'true');
    });
  }

  function initButtons(root) {
    updateButtons(root);
    updateCounts();
  }

  function scheduleInit(root) {
    window.requestAnimationFrame(function () {
      initButtons(root || document);
    });
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-wishlist-toggle], .product-wishlist-btn');
    if (!button) return;

    var item = getButtonItem(button);
    if (!item) return;

    event.preventDefault();

    if (has(item)) {
      remove(item);
    } else {
      add(item);
    }

    updateButtons(document);
  });

  document.addEventListener('DOMContentLoaded', function () {
    initButtons(document);
  });

  document.addEventListener('lc:wishlist:updated', function () {
    updateButtons(document);
  });

  document.addEventListener('variant:change', function () {
    scheduleInit(document);
  }, true);

  document.addEventListener('product:rerender', function (event) {
    scheduleInit(event.target || document);
  }, true);

  document.addEventListener('shopify:section:load', function (event) {
    scheduleInit(event.target || document);
  });

  document.addEventListener('shopify:section:select', function (event) {
    scheduleInit(event.target || document);
  });

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY) return;
    initButtons(document);
    document.dispatchEvent(new CustomEvent('lc:wishlist:updated', { detail: { wishlist: read() } }));
  });

  window.LinenCoWishlist = {
    add: add,
    has: has,
    read: read,
    remove: remove,
    write: write,
    initButtons: initButtons,
    updateCounts: updateCounts
  };
})();
