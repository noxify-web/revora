"use client";

import { useEffect } from "react";

import { APP_NAV_HTML } from "@/lib/shopify/app-nav-html";

function ensureAppNav() {
  if (document.querySelector("ui-nav-menu")) {
    return;
  }

  const template = document.createElement("template");
  template.innerHTML = APP_NAV_HTML.trim();
  const menu = template.content.firstElementChild;

  if (menu) {
    document.body.insertBefore(menu, document.body.firstChild);
  }
}

export function AppNav() {
  useEffect(() => {
    ensureAppNav();
  }, []);

  return null;
}
