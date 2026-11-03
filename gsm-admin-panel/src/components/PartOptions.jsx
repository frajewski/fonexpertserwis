// Opcje <select> części z magazynu pogrupowane wg kategorii (<optgroup>)
import { PART_CATEGORIES } from '../constants/partCategories';

export default function PartOptions({ parts }) {
  const sorted = [...parts].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const groups = PART_CATEGORIES.map((c) => ({
    ...c,
    items: sorted.filter((p) => (p.category || 'other') === c.id || (c.id === 'other' && !PART_CATEGORIES.some((x) => x.id === p.category))),
  })).filter((g) => g.items.length > 0);
  return groups.map((g) => (
    <optgroup key={g.id} label={`${g.icon} ${g.label}`}>
      {g.items.map((p) => (
        <option key={p.id} value={p.id}>{p.name} (na stanie: {p.quantity || 0})</option>
      ))}
    </optgroup>
  ));
}
