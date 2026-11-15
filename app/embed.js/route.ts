import { widgetConfig } from "@/config/widget";

export const dynamic = "force-dynamic";

function buildEmbedScript(): string {
  const defaults = JSON.stringify({
    name: widgetConfig.name,
    accent: widgetConfig.accent,
    icon: widgetConfig.icon,
    launcherLabel: widgetConfig.launcherLabel,
  });

  return String.raw`
(function () {
  "use strict";
  var DEFAULTS = ${defaults};
  var scriptElement = document.currentScript;
  var scriptOrigin = scriptElement && scriptElement.src ? new URL(scriptElement.src, document.baseURI).origin : "";
  var instance;

  function safeBase(value) {
    var url = new URL(value || scriptOrigin, document.baseURI);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(url.hostname))) {
      throw new Error("OrchaSupport baseUrl must use HTTPS");
    }
    return url.origin;
  }

  function resolveIconUrl(base, icon) {
    if (!icon || typeof icon !== "string") return "";
    try {
      return new URL(icon, base + "/").href;
    } catch (_) {
      return "";
    }
  }

  function number(value, fallback, min, max) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  function init(options) {
    if (instance) return instance;
    options = options || {};
    var base = safeBase(options.baseUrl);
    var position = options.position === "bottom-left" ? "bottom-left" : "bottom-right";
    var width = number(options.width, 400, 320, 720);
    var height = number(options.height, 600, 420, 900);
    var theme = /^(light|dark|system)$/.test(options.theme) ? options.theme : "system";
    var side = position === "bottom-left" ? "left" : "right";
    var open = false;
    var currentName = DEFAULTS.name || "Support chat";
    var currentLabel = DEFAULTS.launcherLabel || ("Open " + currentName);
    var currentIcon = resolveIconUrl(base, options.icon || DEFAULTS.icon);

    var frame = document.createElement("iframe");
    frame.id = "orcha-support-frame";
    frame.title = currentName;
    frame.src = base + "/widget?theme=" + encodeURIComponent(theme) + "&parentOrigin=" + encodeURIComponent(location.origin);
    frame.allow = "clipboard-read; clipboard-write";
    frame.style.cssText = "display:none;position:fixed;bottom:84px;" + side + ":20px;width:min(" + width + "px,calc(100vw - 24px));height:min(" + height + "px,calc(100dvh - 104px));border:0;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.2);background:transparent;z-index:2147483646;";

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "orcha-support-frame");
    button.setAttribute("aria-label", currentLabel);
    button.style.cssText = "position:fixed;bottom:20px;" + side + ":20px;width:52px;height:52px;border:0;border-radius:16px;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#fff;background:" + (/^#[0-9a-f]{6}$/i.test(DEFAULTS.accent) ? DEFAULTS.accent : "#5b5bd6") + ";box-shadow:0 8px 28px rgba(0,0,0,.22);z-index:2147483647;font:500 24px/1 system-ui;transition:transform .15s ease,box-shadow .15s ease;";

    var iconImg = document.createElement("img");
    iconImg.alt = currentName;
    iconImg.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;";

    var closeGlyph = document.createElement("span");
    closeGlyph.textContent = "×";
    closeGlyph.style.cssText = "display:none;font:500 26px/1 system-ui;color:#fff;pointer-events:none;";

    function syncButtonVisual() {
      if (open) {
        iconImg.style.display = "none";
        closeGlyph.style.display = "block";
      } else if (currentIcon) {
        if (iconImg.src !== currentIcon) iconImg.src = currentIcon;
        iconImg.style.display = "block";
        closeGlyph.style.display = "none";
      } else {
        iconImg.style.display = "none";
        closeGlyph.textContent = "✦";
        closeGlyph.style.display = "block";
      }
      if (!open) closeGlyph.textContent = "×";
    }

    button.appendChild(iconImg);
    button.appendChild(closeGlyph);
    syncButtonVisual();

    function applyConfig(cfg) {
      if (!cfg) return;
      if (typeof cfg.name === "string" && cfg.name) {
        currentName = cfg.name;
        frame.title = cfg.name;
        iconImg.alt = cfg.name;
      }
      if (typeof cfg.launcherLabel === "string" && cfg.launcherLabel) {
        currentLabel = cfg.launcherLabel;
      }
      if (typeof cfg.accent === "string" && /^#[0-9a-f]{6}$/i.test(cfg.accent)) {
        button.style.background = cfg.accent;
      }
      if (typeof cfg.icon === "string" && cfg.icon && !options.icon) {
        currentIcon = resolveIconUrl(base, cfg.icon);
      }
      button.setAttribute("aria-label", open ? ("Close " + currentName) : currentLabel);
      syncButtonVisual();
    }

    function setOpen(value) {
      open = value;
      frame.style.display = open ? "block" : "none";
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? ("Close " + currentName) : currentLabel);
      syncButtonVisual();
      if (open) frame.focus();
    }
    button.addEventListener("click", function () { setOpen(!open); });

    window.addEventListener("message", function (event) {
      if (event.origin !== base || event.source !== frame.contentWindow || !event.data) return;
      if (event.data.type === "orcha-support:ready") {
        applyConfig(event.data);
      }
      if (event.data.type === "orcha-support:close") setOpen(false);
    });

    function mount() {
      if (!frame.isConnected) document.body.appendChild(frame);
      if (!button.isConnected) document.body.appendChild(button);
    }
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });

    fetch(base + "/api/config").then(function (response) {
      return response.ok ? response.json() : null;
    }).then(applyConfig).catch(function () {});

    instance = {
      open: function () { setOpen(true); },
      close: function () { setOpen(false); },
      destroy: function () { frame.remove(); button.remove(); instance = null; }
    };
    return instance;
  }

  window.OrchaSupport = { init: init };
  if (scriptElement && scriptElement.dataset.autoInit !== "false") {
    init({
      baseUrl: scriptElement.dataset.baseUrl,
      position: scriptElement.dataset.position,
      width: scriptElement.dataset.width,
      height: scriptElement.dataset.height,
      theme: scriptElement.dataset.theme,
      icon: scriptElement.dataset.icon
    });
  }
})();
`;
}

export function GET(): Response {
  return new Response(buildEmbedScript(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
