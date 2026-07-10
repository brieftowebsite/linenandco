(function () {
  'use strict';

  function money(cents) {
    if (typeof cents !== 'number') return '';

    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: window.Shopify && Shopify.currency ? Shopify.currency.active : 'ZAR'
    }).format(cents / 100);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function parseJson(value, fallback) {
    try {
      return JSON.parse(value || '');
    } catch (e) {
      return fallback;
    }
  }

  function withVariantUrl(url, variantId) {
    if (!url || !variantId) return url;

    var cleanedUrl = url.replace(/[?&]variant=\d+/, '');
    var separator = cleanedUrl.indexOf('?') > -1 ? '&' : '?';

    return cleanedUrl + separator + 'variant=' + encodeURIComponent(variantId);
  }

  function imageUrl(product, variant, fallback) {
    if (variant && variant.featured_image) {
      return variant.featured_image.src || variant.featured_image;
    }

    if (product && product.featured_image) return product.featured_image;
    return fallback || '';
  }

  function findVariant(product, item) {
    if (!product || !product.variants || !product.variants.length) return null;

    if (item.variantId) {
      var matchedVariant = product.variants.find(function (variant) {
        return String(variant.id) === String(item.variantId);
      });

      if (matchedVariant) return matchedVariant;
    }

    return product.variants.find(function (variant) { return variant.available; }) || product.variants[0];
  }

  function renderEmpty(root) {
    root.innerHTML = [
      '<div class="lc-wishlist__empty">',
      '<p>Your wishlist is empty.</p>',
      '<a class="lc-wishlist__button" href="/collections/all">Continue shopping</a>',
      '</div>'
    ].join('');
  }

  function renderSkeleton(root) {
    root.innerHTML = '<div class="lc-wishlist__status">Loading your wishlist...</div>';
  }

  function renderError(root) {
    root.innerHTML = '<div class="lc-wishlist__status">We could not load your wishlist. Please refresh and try again.</div>';
  }

  function itemProperties(item) {
    return item.properties && typeof item.properties === 'object' ? item.properties : {};
  }

  function itemOptions(item) {
    return Array.isArray(item.options) ? item.options : [];
  }

  function cleanText(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function findPackText(value) {
    var text = cleanText(value);
    var match = text.match(/\b(?:pack|set)\s*(?:of)?\s*\d+\b|\b\d+\s*(?:pack|per pack)\b/i);

    if (!match) return '';

    return match[0]
      .replace(/\s+/g, ' ')
      .replace(/^pack\s+(\d+)$/i, 'Pack of $1')
      .replace(/^set\s+(\d+)$/i, 'Set of $1')
      .replace(/^(\d+)\s*pack$/i, 'Pack of $1')
      .trim();
  }

  function normaliseDetailLabel(label) {
    var cleanLabel = cleanText(label);
    var lowerLabel = cleanLabel.toLowerCase();

    if (lowerLabel === 'pack size' || lowerLabel === 'pack configuration' || lowerLabel === 'pack') {
      return 'Pack size';
    }

    if (lowerLabel === 'mattress length') return 'Mattress Length';

    return cleanLabel;
  }

  function shouldHideDetailLabel(label) {
    return cleanText(label).toLowerCase() === 'pack quantity';
  }

  function propertyValue(properties, labels) {
    var lookup = {};

    Object.keys(properties).forEach(function (key) {
      lookup[cleanText(key).toLowerCase()] = properties[key];
    });

    for (var i = 0; i < labels.length; i++) {
      var value = lookup[labels[i].toLowerCase()];
      if (value) return value;
    }

    return '';
  }

  function inferPackSize(item, product, variant) {
    var properties = itemProperties(item);
    var propertyPack = propertyValue(properties, [
      'Pack size',
      'Pack Size',
      'Pack configuration',
      'Pack Configuration',
      'Pack'
    ]);

    if (propertyPack) return propertyPack;

    var sources = [
      item.title,
      product && product.title,
      variant && variant.title,
      variant && variant.name
    ];

    if (product && Array.isArray(product.tags)) {
      sources = sources.concat(product.tags);
    }

    if (product && product.description) {
      sources.push(product.description);
    }

    for (var i = 0; i < sources.length; i++) {
      var packText = findPackText(sources[i]);
      if (packText) return packText;
    }

    return '';
  }

  function detailList(item, product, variant) {
    var details = [];
    var seen = {};

    itemOptions(item).forEach(function (option) {
      if (!option || !option.label || !option.value) return;

      var key = option.label.toLowerCase();
      seen[key] = true;
      details.push({ label: option.label, value: option.value });
    });

    Object.keys(itemProperties(item)).forEach(function (key) {
      var value = item.properties[key];
      var label = normaliseDetailLabel(key);
      var seenKey = label.toLowerCase();

      if (!value) return;
      if (!label || shouldHideDetailLabel(label)) return;
      if (seen[seenKey]) return;

      seen[seenKey] = true;
      details.push({ label: label, value: value });
    });

    var packSize = inferPackSize(item, product, variant);
    if (packSize && !seen['pack size']) {
      seen['pack size'] = true;
      details.push({ label: 'Pack size', value: packSize });
    }

    if (!details.length && variant && variant.title && variant.title !== 'Default Title') {
      details.push({ label: 'Variant', value: variant.title });
    }

    return details;
  }

  function renderDetails(details) {
    if (!details.length) return '';

    return [
      '<dl class="lc-wishlist-card__details">',
      details.map(function (detail) {
        return [
          '<div class="lc-wishlist-card__detail">',
          '<dt>' + escapeHtml(detail.label) + '</dt>',
          '<dd>' + escapeHtml(detail.value) + '</dd>',
          '</div>'
        ].join('');
      }).join(''),
      '</dl>'
    ].join('');
  }

  function renderProducts(root, items) {
    if (!items.length) {
      renderEmpty(root);
      return;
    }

    var itemCount = items.length;
    var itemLabel = itemCount === 1 ? '1 saved item' : itemCount + ' saved items';

    root.innerHTML = [
      '<div class="lc-wishlist__summary-row">',
      '<p class="lc-wishlist__summary">' + escapeHtml(itemLabel) + '</p>',
      '<div class="lc-wishlist__tools">',
      '<button type="button" class="lc-wishlist__button" data-wishlist-add-all>Add all available</button>',
      '<button type="button" class="lc-wishlist__button lc-wishlist__button--secondary" data-wishlist-share>Email / share</button>',
      '</div>',
      '</div>',
      '<div class="lc-wishlist__list">',
      items.map(function (item) {
        var product = item.product || {};
        var variant = findVariant(product, item);
        var variantId = item.variantId || (variant && variant.id ? String(variant.id) : '');
        var title = product.title || item.title || 'Saved product';
        var url = withVariantUrl(product.url || item.url || (item.handle ? '/products/' + item.handle : '#'), variantId);
        var image = imageUrl(product, variant, item.image);
        var unitPrice = variant && typeof variant.price === 'number' ? variant.price : (typeof product.price === 'number' ? product.price : null);
        var available = variant ? variant.available !== false : product.available !== false;
        var canView = url && url !== '#';
        var details = detailList(item, product, variant);
        var propertiesJson = escapeHtml(JSON.stringify(itemProperties(item)));
        var quantity = Math.max(1, parseInt(item.quantity || 1, 10) || 1);
        var price = unitPrice !== null ? money(unitPrice * quantity) : item.price;

        return [
          '<article class="lc-wishlist-card" data-wishlist-card data-wishlist-key="' + escapeHtml(item.key || '') + '" data-product-handle="' + escapeHtml(item.handle || product.handle || '') + '" data-product-id="' + escapeHtml(item.id || product.id || '') + '" data-variant-id="' + escapeHtml(variantId) + '" data-unit-price="' + escapeHtml(unitPrice !== null ? unitPrice : '') + '" data-line-properties="' + propertiesJson + '">',
          canView ? '<a class="lc-wishlist-card__image-link" href="' + escapeHtml(url) + '">' : '<div class="lc-wishlist-card__image-link">',
          image ? '<img class="lc-wishlist-card__image" src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '" loading="lazy">' : '<div class="lc-wishlist-card__image lc-wishlist-card__image--placeholder"></div>',
          canView ? '</a>' : '</div>',
          '<div class="lc-wishlist-card__body">',
          '<div class="lc-wishlist-card__main">',
          canView ? '<a class="lc-wishlist-card__title" href="' + escapeHtml(url) + '">' + escapeHtml(title) + '</a>' : '<p class="lc-wishlist-card__title">' + escapeHtml(title) + '</p>',
          renderDetails(details),
          price ? '<p class="lc-wishlist-card__price" data-wishlist-line-price><span data-wishlist-line-price-amount>' + escapeHtml(price) + '</span><span class="lc-wishlist-card__tax-note">Incl. VAT</span></p>' : '',
          '</div>',
          '<div class="lc-wishlist-card__controls">',
          '<label class="lc-wishlist-card__qty"><span>Qty</span><input type="number" min="1" step="1" value="' + escapeHtml(quantity) + '" aria-label="Quantity for ' + escapeHtml(title) + '" data-wishlist-qty></label>',
          '<div class="lc-wishlist-card__actions">',
          available && variantId ? '<button class="lc-wishlist-card__view" type="button" data-wishlist-add>Add to cart</button>' : (canView ? '<a class="lc-wishlist-card__view" href="' + escapeHtml(url) + '">Choose options</a>' : ''),
          '<button class="lc-wishlist-card__remove" type="button" data-wishlist-remove>Remove</button>',
          '</div>',
          '</div>',
          '</div>',
          '</article>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function fetchProduct(item) {
    if (!item.handle) return Promise.resolve(item);

    return fetch('/products/' + encodeURIComponent(item.handle) + '.js', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    }).then(function (response) {
      if (!response.ok) return item;
      return response.json();
    }).then(function (product) {
      var variant = findVariant(product, item);

      item.product = product;
      item.id = item.id || (product.id ? product.id.toString() : '');
      item.title = product.title || item.title;
      item.variantId = item.variantId || (variant && variant.id ? String(variant.id) : '');
      item.variantTitle = item.variantTitle || (variant && variant.title !== 'Default Title' ? variant.title : '');
      item.url = withVariantUrl(product.url || item.url, item.variantId);
      item.image = imageUrl(product, variant, item.image);
      item.price = variant && typeof variant.price === 'number' ? money(variant.price) : item.price;

      return item;
    }).catch(function () {
      return item;
    });
  }

  function render(root) {
    var api = window.LinenCoWishlist;
    if (!api) return;

    var wishlist = api.read();

    if (!wishlist.length) {
      renderEmpty(root);
      return;
    }

    renderSkeleton(root);

    Promise.all(wishlist.map(fetchProduct)).then(function (items) {
      var displayItems = items.filter(function (item) {
        return item.id || item.handle || item.title || item.product;
      });

      api.write(items);
      renderProducts(root, displayItems);
    }).catch(function () {
      renderError(root);
    });
  }

  function wishlistLines(root) {
    return Array.prototype.slice.call(root.querySelectorAll('[data-wishlist-card]')).map(function (card) {
      var properties = parseJson(card.getAttribute('data-line-properties'), {});
      var line = {
        id: Number(card.getAttribute('data-variant-id')),
        quantity: Math.max(1, Number(card.querySelector('[data-wishlist-qty]')?.value || 1))
      };

      if (Object.keys(properties).length) {
        line.properties = properties;
      }

      return line;
    }).filter(function (line) {
      return line.id;
    });
  }

  function addLinesToCart(lines) {
    if (!lines.length) return Promise.resolve();

    return fetch('/cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ items: lines })
    }).then(function (response) {
      if (!response.ok) throw new Error('Could not add wishlist to cart');
      return response.json();
    });
  }

  function openCart() {
    document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    document.querySelector('cart-drawer')?.show?.();
  }

  function updateCardPrice(card) {
    var priceTarget = card.querySelector('[data-wishlist-line-price]');
    var unitPrice = Number(card.getAttribute('data-unit-price'));
    var qty = Math.max(1, Number(card.querySelector('[data-wishlist-qty]')?.value || 1));

    if (!priceTarget || !unitPrice) return;

    var amountTarget = priceTarget.querySelector('[data-wishlist-line-price-amount]');
    var nextPrice = money(unitPrice * qty);

    if (amountTarget) {
      amountTarget.textContent = nextPrice;
    } else {
      priceTarget.textContent = nextPrice;
    }
  }

  function persistCardQuantity(card) {
    if (!window.LinenCoWishlist) return;

    var key = card.getAttribute('data-wishlist-key') || '';
    if (!key) return;

    var quantity = Math.max(1, Number(card.querySelector('[data-wishlist-qty]')?.value || 1));
    var nextList = window.LinenCoWishlist.read().map(function (item) {
      if (item.key === key) item.quantity = quantity;
      return item;
    });

    window.LinenCoWishlist.write(nextList);
  }

  function shareWishlist(root) {
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-wishlist-card]'));
    var lines = cards.map(function (card) {
      var title = card.querySelector('.lc-wishlist-card__title')?.textContent?.trim() || 'Wishlist product';
      var details = Array.prototype.slice.call(card.querySelectorAll('.lc-wishlist-card__detail')).map(function (detail) {
        var label = detail.querySelector('dt')?.textContent?.trim();
        var value = detail.querySelector('dd')?.textContent?.trim();
        return label && value ? label + ': ' + value : '';
      }).filter(Boolean);
      var link = card.querySelector('.lc-wishlist-card__title')?.href || window.location.origin + '/products/' + card.getAttribute('data-product-handle');
      var qty = card.querySelector('[data-wishlist-qty]')?.value || '1';

      return qty + ' x ' + title + (details.length ? ' (' + details.join(', ') + ')' : '') + ' - ' + link;
    });
    var subject = 'My Linen and Co wishlist';
    var body = 'Here is my Linen and Co wishlist:%0D%0A%0D%0A' + encodeURIComponent(lines.join('\n'));
    window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + body;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-wishlist-page]');
    if (!root) return;

    render(root);

    root.addEventListener('click', function (event) {
      var addButton = event.target.closest('[data-wishlist-add]');
      if (addButton) {
        var addCard = addButton.closest('[data-wishlist-card]');
        addLinesToCart(wishlistLines({ querySelectorAll: function () { return [addCard]; } })).then(openCart).catch(function () {
          alert('We could not add this item to cart. Please open the product and choose options.');
        });
        return;
      }

      if (event.target.closest('[data-wishlist-add-all]')) {
        addLinesToCart(wishlistLines(root)).then(openCart).catch(function () {
          alert('Some wishlist items need options selected before they can be added to cart.');
        });
        return;
      }

      if (event.target.closest('[data-wishlist-share]')) {
        shareWishlist(root);
        return;
      }

      var button = event.target.closest('[data-wishlist-remove]');
      if (!button) return;

      var card = button.closest('[data-wishlist-card]');
      if (!card || !window.LinenCoWishlist) return;

      window.LinenCoWishlist.remove({
        key: card.getAttribute('data-wishlist-key') || '',
        id: card.getAttribute('data-product-id') || '',
        handle: card.getAttribute('data-product-handle') || ''
      });

      render(root);
    });

    root.addEventListener('input', function (event) {
      if (!event.target.matches('[data-wishlist-qty]')) return;

      var card = event.target.closest('[data-wishlist-card]');
      if (card) updateCardPrice(card);
    });

    root.addEventListener('change', function (event) {
      if (!event.target.matches('[data-wishlist-qty]')) return;

      var card = event.target.closest('[data-wishlist-card]');
      if (!card) return;

      updateCardPrice(card);
      persistCardQuantity(card);
    });

  });
})();
