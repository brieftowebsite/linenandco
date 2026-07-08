# LC Curtain Profile install notes

Use this on the unpublished theme:

`Linen and Co - July 2026 V2.1 - AI swatch fix 2026-07-08`

Files:

1. Add section file:
   - Upload `lc-curtain-product-profile.liquid` to `sections/lc-curtain-product-profile.liquid`

2. Update template:
   - Replace `templates/product.lc-ready-made-curtain.json` with `product.lc-ready-made-curtain.updated.json`

What this does:

- Keeps the normal product gallery/info first.
- Adds a no-block curtain-specific profile underneath the product.
- Uses a sticky anchor nav.
- Pulls hero/profile content from `product.metafields.custom.product_profile`.
- Pulls fabric swatches from `product.metafields.shopify.color-pattern`.
- Includes heading comparison, light/privacy, product details, measuring guidance, care, and help CTA.

No section blocks are used.
