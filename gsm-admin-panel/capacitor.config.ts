import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.fonexpert.serwis',
  appName: 'FonExpert Serwis',
  // Output `vite build` (ten sam folder, który idzie na Firebase Hosting)
  webDir: 'dist',
  server: {
    // Panel w aplikacji działa pod https://localhost. To domyślna wartość
    // w Capacitorze, ale trzymamy ją jawnie: zmiana schematu = inny origin
    // = utrata zapisanej sesji Firebase Auth i localStorage na telefonach.
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      // Aplikacja otwarta: bez systemowego powiadomienia – pokazujemy własne
      // in-app (PushProvider). W tle i po zamknięciu wyświetla je Android.
      presentationOptions: [],
    },
    SplashScreen: {
      // Panel chowa splash sam (SplashScreen.hide()), gdy tylko sprawdzi
      // sesję – zwykle w <1 s. 3 s to wyłącznie górny limit na wypadek,
      // gdyby JS nie wystartował; nie jest to sztuczne opóźnienie.
      launchAutoHide: true,
      launchShowDuration: 3000,
      launchFadeOutDuration: 150,
      backgroundColor: '#11172B',
      showSpinner: false,
    },
    StatusBar: {
      // Panel rysuje się pod paskiem statusu (edge-to-edge, odstępy z
      // --safe-area-inset-*). Kolor ikon (jasne/ciemne) dobiera
      // src/native/statusBar.js do tła, które faktycznie jest pod paskiem.
      overlaysWebView: true,
      style: 'DARK',
    },
  },
};

export default config;
