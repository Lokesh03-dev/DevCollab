export default function LoadingSpinner({ label = 'Loading', size = 'md' }) {
  const dimensions = size === 'sm' ? 'size-4 border-2' : 'size-7 border-[3px]';

  return (
    <span className="inline-flex items-center gap-2 text-sm text-[#627168]" role="status">
      <span aria-hidden="true" className={`${dimensions} animate-spin rounded-full border-[#d8e2da] border-t-[#32715a]`} />
      <span>{label}</span>
    </span>
  );
}