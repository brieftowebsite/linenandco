import { PhotoSwipeLightbox } from "vendor";

class LcProfileZoomGallery extends HTMLElement {
  connectedCallback() {
    if (this._lightbox) return;

    this._lightbox = new PhotoSwipeLightbox({
      gallery: this,
      children: "a[data-lc-profile-zoom]",
      pswpModule: () => import("photoswipe"),
      bgOpacity: 1,
      initialZoomLevel: "fit",
      secondaryZoomLevel: 2,
      maxZoomLevel: 4,
      closeTitle: window.themeVariables?.strings?.closeGallery || "Close gallery",
      zoomTitle: window.themeVariables?.strings?.zoomGallery || "Zoom image",
      errorMsg: window.themeVariables?.strings?.errorGallery || "The image could not be loaded"
    });

    this._lightbox.init();
  }

  disconnectedCallback() {
    this._lightbox?.destroy();
    this._lightbox = null;
  }
}

if (!customElements.get("lc-profile-zoom-gallery")) {
  customElements.define("lc-profile-zoom-gallery", LcProfileZoomGallery);
}
