import { useState, useEffect } from 'react';
import useSettings from '../store/useSettings';
import './SettingsPage.css';

export default function SettingsPage() {
  const settings = useSettings();
  const updateSettings = useSettings((s) => s.updateSettings);

  const [shopName, setShopName] = useState(settings.shopName);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Ustawienia wczytują się asynchronicznie z Firestore (mogą przyjść PO
  // pierwszym renderze tego komponentu) – synchronizujemy pola formularza,
  // gdy faktyczne dane się załadują, żeby nie zostać przy wartościach domyślnych
  useEffect(() => {
    if (settings._loaded) {
      setShopName(settings.shopName);
      setShopAddress(settings.shopAddress);
      setShopPhone(settings.shopPhone);
    }
  }, [settings._loaded]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await updateSettings({ shopName, shopAddress, shopPhone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // Najczęstsza przyczyna: reguły Firestore blokują zapis (np. rola
      // konta nie jest zsynchronizowana, albo reguły nie zostały wdrożone
      // po zmianie w kodzie) – pokazujemy to wprost, zamiast cichego
      // niepowodzenia, które wygląda jak zapisany, ale znika po odświeżeniu.
      console.error('Błąd zapisu ustawień:', err);
      setSaveError(
        err?.code === 'permission-denied'
          ? 'Brak uprawnień do zapisu (sprawdź rolę konta i reguły Firestore).'
          : 'Nie udało się zapisać ustawień. Spróbuj ponownie.'
      );
    }
  };

  return (
    <div className="se-page">
      <h1 className="se-title">Ustawienia</h1>

      <div className="se-notice">
        ℹ️ Te ustawienia są współdzielone z aplikacją mobilną — zmiana tutaj
        jest widoczna wszędzie, w czasie rzeczywistym.
      </div>

      <form className="se-card" onSubmit={handleSave}>
        <h2 className="se-section-title">Dane serwisu</h2>
        <label className="se-field">
          <span className="se-label">Nazwa serwisu</span>
          <input className="se-input" value={shopName} onChange={(e) => setShopName(e.target.value)} />
        </label>
        <label className="se-field">
          <span className="se-label">Adres</span>
          <input className="se-input" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
        </label>
        <label className="se-field">
          <span className="se-label">Telefon</span>
          <input className="se-input" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} />
        </label>

        {saveError && (
          <div className="se-error" role="alert">⚠️ {saveError}</div>
        )}

        <button className="se-submit" type="submit">{saved ? '✓ Zapisano' : 'Zapisz'}</button>
      </form>
    </div>
  );
}
