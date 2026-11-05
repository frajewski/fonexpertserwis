// Tytuł, opis i adres kanoniczny każdej podstrony (SPA – ustawiane po wejściu).
// Domyślne wartości są też w index.html (dla podglądów linków bez JS).
import { useEffect } from 'react';

const SITE = 'https://gsm-serwis-klient.web.app';
const DEFAULT_DESC = 'Serwis telefonów w Płońsku (Pasaż Kaufland): zgłoś naprawę online, sprawdź status naprawy, wyceń telefon do skupu. Nowe i używane urządzenia z gwarancją.';

function setMeta(selector, attr, key, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(selector.startsWith('link') ? 'href' : 'content', value);
}

export function usePageMeta({ title, description = DEFAULT_DESC, path, noindex = false }) {
  useEffect(() => {
    const full = title ? `${title} | Fonexpert Płońsk` : 'Fonexpert Płońsk — naprawa, skup i sprzedaż telefonów';
    document.title = full;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', full);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex' : 'index, follow');
    if (path) {
      setMeta('link[rel="canonical"]', 'rel', 'canonical', SITE + path);
      setMeta('meta[property="og:url"]', 'property', 'og:url', SITE + path);
    }
  }, [title, description, path, noindex]);
}
