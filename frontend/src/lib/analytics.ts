/**
 * Minimal, privacy-respecting analytics abstraction.
 *
 * No third-party account/site-ID was available to wire up in this pass, so
 * this ships inert by default (nothing is sent, no script is ever loaded)
 * until NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set in the environment. Once that's
 * configured, set it to your Plausible site domain and events start firing
 * for real -- swap the plausible() call for another provider's SDK if you'd
 * rather use GA or something else; every call site in the app already goes
 * through track(), so that's the only place that needs to change.
 */

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
let scriptLoaded = false;

function ensureScriptLoaded() {
  if (scriptLoaded || !PLAUSIBLE_DOMAIN || typeof document === "undefined") return;
  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = PLAUSIBLE_DOMAIN;
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
  scriptLoaded = true;
}

/** Fire a named product event. No-ops until NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured. */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (!PLAUSIBLE_DOMAIN) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics:noop]", event, props ?? {});
    }
    return;
  }
  ensureScriptLoaded();
  window.plausible?.(event, props ? { props } : undefined);
}
