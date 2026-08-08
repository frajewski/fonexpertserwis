import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.fonexpert.panel',
  appName: 'Fonexpert',
  webDir: 'dist',
  server: {
    // Podczas developmentu (npm run dev + cap run) Capacitor może ładować
    // stronę bezpośrednio z Vite dev servera zamiast zbudowanej wersji –
    // szybszy cykl "zmień kod → zobacz na telefonie" bez każdorazowego builda.
    // Dla produkcyjnego APK ta sekcja jest ignorowana (używane jest webDir).
    androidScheme: 'https',
  },
};

export default config;
