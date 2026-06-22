(() => {
  if (document.querySelector("ui-nav-menu")) {
    return;
  }

  const menu = document.createElement("ui-nav-menu");

  const home = document.createElement("a");
  home.href = "/";
  home.rel = "home";
  home.textContent = "Dashboard";
  menu.appendChild(home);

  for (const item of [
    { href: "/reviews", label: "Reviews" },
    { href: "/export", label: "Export" },
  ]) {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    menu.appendChild(link);
  }

  function mount() {
    if (!document.body || document.querySelector("ui-nav-menu")) {
      return;
    }

    document.body.insertBefore(menu, document.body.firstChild);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
