"use client";

import { useEffect } from "react";

// PWA/service worker REMOVIDO — causava tela branca no Chromium do Raspberry.
// Este componente agora só faz a faxina: remove qualquer service worker antigo
// e limpa os caches, pra nenhum aparelho ficar preso num estado velho.
export default function RegistrarPWA() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
    if ("caches" in window) {
      caches
        .keys()
        .then((ks) => ks.forEach((k) => caches.delete(k)))
        .catch(() => {});
    }
  }, []);
  return null;
}
