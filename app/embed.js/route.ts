const script = String.raw`
(function () {
  "use strict";
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

    var frame = document.createElement("iframe");
    frame.title = "Support chat";
    frame.src = base + "/widget?theme=" + encodeURIComponent(theme) + "&parentOrigin=" + encodeURIComponent(location.origin);
    frame.allow = "clipboard-write";
    frame.style.cssText = "display:none;position:fixed;bottom:84px;" + side + ":20px;width:min(" + width + "px,calc(100vw - 24px));height:min(" + height + "px,calc(100dvh - 104px));border:0;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.2);background:transparent;z-index:2147483646;";

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "orcha-support-frame");
    button.setAttribute("aria-label", "Open support chat");
    button.style.cssText = "position:fixed;bottom:20px;" + side + ":20px;width:52px;height:52px;border:0;border-radius:50%;padding:0;cursor:pointer;color:#fff;background:#5b5bd6;box-shadow:0 8px 28px rgba(0,0,0,.22);z-index:2147483647;font:600 24px/1 system-ui;transition:transform .15s ease;";
    button.textContent = "✦";
    frame.id = "orcha-support-frame";

    function setOpen(value) {
      open = value;
      frame.style.display = open ? "block" : "none";
      button.textContent = open ? "×" : "✦";
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", (open ? "Close" : "Open") + " support chat");
      if (open) frame.focus();
    }
    button.addEventListener("click", function () { setOpen(!open); });

    window.addEventListener("message", function (event) {
      if (event.origin !== base || event.source !== frame.contentWindow || !event.data) return;
      if (event.data.type === "orcha-support:ready") {
        if (typeof event.data.name === "string") {
          frame.title = event.data.name;
          button.setAttribute("aria-label", "Open " + event.data.name);
        }
        if (typeof event.data.accent === "string" && /^#[0-9a-f]{6}$/i.test(event.data.accent)) {
          button.style.background = event.data.accent;
        }
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
    }).then(function (config) {
      if (!config) return;
      if (config.name) frame.title = config.name;
      if (/^#[0-9a-f]{6}$/i.test(config.accent || "")) button.style.background = config.accent;
    }).catch(function () {});

    instance = { open: function () { setOpen(true); }, close: function () { setOpen(false); }, destroy: function () { frame.remove(); button.remove(); instance = null; } };
    return instance;
  }

  window.OrchaSupport = { init: init };
  if (scriptElement && scriptElement.dataset.autoInit !== "false") {
    init({
      baseUrl: scriptElement.dataset.baseUrl,
      position: scriptElement.dataset.position,
      width: scriptElement.dataset.width,
      height: scriptElement.dataset.height,
      theme: scriptElement.dataset.theme
    });
  }
})();
`;

export function GET(): Response {
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
