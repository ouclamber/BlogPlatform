import { passwordStrength } from '@/shared/lib/password';

const colors = ['bg-red-400', 'bg-red-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-500'];

export default function PasswordStrength({ password }) {
  const { score, label } = passwordStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2 animate-fade-in" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < Math.max(1, score) ? colors[score] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">Надёжность: {label}</p>
    </div>
  );
}
