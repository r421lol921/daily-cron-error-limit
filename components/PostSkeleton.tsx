export default function PostSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border animate-pulse">
      {/* Avatar skeleton */}
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted" />

      <div className="flex flex-col flex-1 gap-2">
        {/* Header skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-4/5 bg-muted rounded" />
        </div>

        {/* Actions skeleton */}
        <div className="flex items-center gap-12 mt-2">
          <div className="h-5 w-12 bg-muted rounded" />
          <div className="h-5 w-12 bg-muted rounded" />
          <div className="h-5 w-12 bg-muted rounded" />
          <div className="h-5 w-12 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}
