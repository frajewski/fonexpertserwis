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
};

export default config;
