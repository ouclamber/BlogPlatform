import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function EmptyState({ icon: Icon = DocumentTextIcon, title, description, action }) {
  return (
    <div className="animate-fade-in-up py-16 text-center">
      <div className="relative mx-auto mb-6 h-24 w-24">
        <div className="absolute inset-0 animate-float rounded-3xl bg-gradient-to-br from-primary-200 to-primary-100 blur-md" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white bg-gradient-to-br from-primary-50 to-white shadow-soft">
          <Icon className="h-11 w-11 text-primary-500" />
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mx-auto mb-6 max-w-md text-gray-500">{description}</p>}
      {action}
    </div>
  );
}
