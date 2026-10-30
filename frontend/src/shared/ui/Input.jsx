import { useId } from 'react';

export default function Input({ label, error, icon: Icon, id, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const errorText = Array.isArray(error) ? error.join(' ') : error;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="group relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary-500" />
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={errorText ? errorId : undefined}
          className={`input ${
            errorText ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''
          } ${Icon ? 'pl-11' : ''} ${className}`}
          {...props}
        />
      </div>
      {errorText && (
        <p id={errorId} className="mt-1.5 animate-fade-in text-sm text-red-600">
          {errorText}
        </p>
      )}
    </div>
  );
}
