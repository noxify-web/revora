/** Hide SSR Polaris markup until polaris.js upgrades custom elements. */
export const POLARIS_BOOT_STYLES = `
html:not(.polaris-ready) [data-revora-app] {
  display: none;
}

html.polaris-ready #revora-polaris-boot {
  display: none;
}

#revora-polaris-boot {
  align-items: center;
  box-sizing: border-box;
  color: #616161;
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.875rem;
  justify-content: center;
  line-height: 1.25rem;
  min-height: 12rem;
  padding: 1.5rem;
}

#revora-polaris-boot::before {
  animation: revora-polaris-spin 0.8s linear infinite;
  border: 2px solid #e3e3e3;
  border-radius: 50%;
  border-top-color: #8a8a8a;
  content: "";
  height: 1.25rem;
  margin-right: 0.625rem;
  width: 1.25rem;
}

@keyframes revora-polaris-spin {
  to {
    transform: rotate(360deg);
  }
}
`;

export const POLARIS_BOOT_SCRIPT = `
(function () {
  var root = document.documentElement;
  var booted = false;

  function markPolarisReady() {
    if (booted) {
      return;
    }

    booted = true;
    root.classList.add("polaris-ready");

    var boot = document.getElementById("revora-polaris-boot");
    if (boot) {
      boot.setAttribute("aria-busy", "false");
    }
  }

  if (window.customElements && window.customElements.get("s-page")) {
    markPolarisReady();
    return;
  }

  if (window.customElements && window.customElements.whenDefined) {
    window.customElements.whenDefined("s-page").then(markPolarisReady);
  }

  window.setTimeout(markPolarisReady, 4000);
})();
`;
