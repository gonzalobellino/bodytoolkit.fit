import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import "./app.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaSwInfo {
  status: "idle" | "registering" | "registered" | "failed";
  error?: string;
  scope?: string;
  scriptURL?: string;
}

declare global {
  interface Window {
    __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    __pwaSwInfo?: PwaSwInfo;
  }
}

if (typeof window !== "undefined") {
  window.__pwaDeferredPrompt = window.__pwaDeferredPrompt ?? null;
  window.__pwaSwInfo = window.__pwaSwInfo ?? { status: "idle" };

  if ("serviceWorker" in navigator) {
    window.__pwaSwInfo = { status: "registering" };
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        const scriptURL =
          registration.active?.scriptURL ??
          registration.installing?.scriptURL ??
          registration.waiting?.scriptURL ??
          "";
        window.__pwaSwInfo = {
          status: "registered",
          scope: registration.scope,
          scriptURL,
        };
        window.dispatchEvent(new Event("pwa:swstatus"));

        if (!navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(() => {
            const reloaded = sessionStorage.getItem("sw:reloaded");
            if (!reloaded) {
              sessionStorage.setItem("sw:reloaded", "1");
              window.location.reload();
            }
          });
        }
      })
      .catch((error) => {
        window.__pwaSwInfo = {
          status: "failed",
          error: String(error),
        };
        window.dispatchEvent(new Event("pwa:swstatus"));
      });
  }

  window.addEventListener("beforeinstallprompt", (event: Event) => {
    event.preventDefault();
    window.__pwaDeferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("pwa:deferredprompt"));
  });
  window.addEventListener("appinstalled", () => {
    window.__pwaDeferredPrompt = null;
    window.dispatchEvent(new Event("pwa:appinstalled"));
  });
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

createRoot(container).render(
  <>
    <App />
    <Analytics />
  </>
);
