export function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-[#e9eeea] ${className}`} />;
}

export function MetricSkeleton() {
  return <div className="rounded-xl border border-[#e1e7e1] bg-white p-5"><div className="flex items-center justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="size-9 rounded-lg" /></div><Skeleton className="mt-4 h-8 w-16" /><Skeleton className="mt-2 h-3 w-24" /></div>;
}

export function ProjectCardSkeleton() {
  return <div className="rounded-xl border border-[#e1e7e1] bg-white p-5"><div className="flex justify-between"><Skeleton className="size-11 rounded-lg" /><Skeleton className="h-6 w-16 rounded-full" /></div><Skeleton className="mt-5 h-5 w-2/3" /><Skeleton className="mt-2 h-4 w-full" /><Skeleton className="mt-2 h-4 w-4/5" /><Skeleton className="mt-6 h-px w-full rounded-none" /><Skeleton className="mt-4 h-4 w-1/2" /></div>;
}

export function TaskRowSkeleton() {
  return <div className="flex items-center gap-3 rounded-lg border border-[#e4e9e4] bg-white p-3.5"><Skeleton className="size-6 shrink-0" /><div className="min-w-0 flex-1"><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-2 h-3 w-1/3" /></div><Skeleton className="hidden h-6 w-16 rounded-full sm:block" /><Skeleton className="size-8 rounded-full" /></div>;
}

export function ActivityRowSkeleton() {
  return <div className="flex gap-3 py-4"><Skeleton className="size-8 shrink-0 rounded-lg" /><div className="flex-1"><Skeleton className="h-4 w-4/5" /><Skeleton className="mt-2 h-3 w-2/5" /></div></div>;
}

export function UserRowSkeleton() {
  return <div className="flex items-center gap-3 rounded-lg border border-[#e5eae5] px-3 py-2.5"><Skeleton className="size-9 shrink-0 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-1/2" /><Skeleton className="mt-2 h-3 w-2/3" /></div></div>;
}

export function MessageSkeleton({ own = false }) {
  return <div className={`flex gap-3 ${own ? 'flex-row-reverse' : ''}`}><Skeleton className="size-8 shrink-0 rounded-full" /><div className="max-w-[70%] flex-1"><Skeleton className="h-3 w-24" /><Skeleton className="mt-2 h-12 w-full rounded-xl" /></div></div>;
}
