// Простая клиентская оценка надёжности пароля (подсказка пользователю).
// Настоящая проверка — на сервере (Django password validators).
export function passwordStrength(password = '') {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-zа-яё]/.test(password) && /[A-ZА-ЯЁ]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^\w\s]/.test(password)) score += 1;
  if (/^\d+$/.test(password)) score = Math.min(score, 1);

  const capped = Math.min(4, score);
  const labels = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Надёжный'];
  return { score: capped, label: labels[capped] };
}
