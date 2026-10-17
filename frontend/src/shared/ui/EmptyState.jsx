import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function EmptyState({
  icon: Icon = DocumentTextIcon,
  title,
  description,
  action,
}) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
}