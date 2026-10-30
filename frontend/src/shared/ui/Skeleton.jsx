export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PostCardSkeleton() {
  return (
    <div className="card" data-testid="post-card-skeleton">
      <Skeleton className="aspect-video rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-2 pt-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function PostGridSkeleton({ count = 6, className = 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div className={className} role="status" aria-label="Загрузка постов">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="card flex gap-4 p-4" data-testid="row-skeleton">
      <Skeleton className="h-24 w-32 flex-shrink-0" />
      <div className="flex-1 space-y-3 py-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
