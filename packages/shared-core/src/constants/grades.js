const grades = [
  {
    value: 'A+',
    label: 'Grade A+ – Jak nowy',
    description: 'Brak jakichkolwiek śladów użytkowania',
    color: '#16A34A',   // ciemna zieleń
    emoji: '🟢',
  },
  {
    value: 'A',
    label: 'Grade A – Bardzo dobry',
    description: 'Bardzo dobry stan wizualny, praktycznie bez śladów',
    color: '#1DB954',   // zielony
    emoji: '🟢',
  },
  {
    value: 'A-',
    label: 'Grade A- – Delikatne ślady',
    description: 'Delikatne ślady użytkowania, niewidoczne z odległości',
    color: '#4ADE80',   // jasna zieleń
    emoji: '🟢',
  },
  {
    value: 'B+',
    label: 'Grade B+ – Dobry',
    description: 'Stan wizualny dobry, drobne rysy',
    color: '#2563EB',   // ciemny niebieski
    emoji: '🔵',
  },
  {
    value: 'B',
    label: 'Grade B – Dobry',
    description: 'Drobne ryski niewidoczne z odległości 30cm',
    color: '#3B82F6',   // niebieski
    emoji: '🔵',
  },
  {
    value: 'B-',
    label: 'Grade B- – Zadowalający',
    description: 'Wyraźniejsze ślady użytkowania, bez wpływu na działanie',
    color: '#60A5FA',   // jasny niebieski
    emoji: '🔵',
  },
  {
    value: 'C+',
    label: 'Grade C+ – Przeciętny',
    description: 'Widoczne ryski, ślady użytkowania',
    color: '#D97706',   // ciemny żółty/pomarańcz
    emoji: '🟡',
  },
  {
    value: 'C',
    label: 'Grade C – Przeciętny',
    description: 'Widoczne ryski, ślady użytkowania, brak pęknięć',
    color: '#F59E0B',   // żółty
    emoji: '🟡',
  },
  {
    value: 'C-',
    label: 'Grade C- – Mocno wyeksploatowany',
    description: 'Liczne ryski i ślady, mocno wyeksploatowany wizualnie',
    color: '#FBBF24',   // jasny żółty
    emoji: '🟡',
  },
  {
    value: 'D',
    label: 'Grade D – Uszkodzony',
    description: 'Pęknięcia, głębokie ryski, uszkodzenia mechaniczne',
    color: '#FF4C4C',   // czerwony
    emoji: '🔴',
  },
];

export const gradeColors = grades.reduce((acc, g) => {
  acc[g.value] = g.color;
  return acc;
}, {});

export const gradeEmojis = grades.reduce((acc, g) => {
  acc[g.value] = g.emoji;
  return acc;
}, {});

export default grades;
