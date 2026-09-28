export default function Input({ label, hint, error, className = '', id, ...props }) {
  const inputId = id || props.name;

  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#34413b]" htmlFor={inputId}>
      {label && <span>{label}</span>}
      <input
        className={`min-h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-[#202a27] outline-none transition placeholder:text-[#9aa59e] focus:border-[#54866e] focus:ring-3 focus:ring-[#dcebe1] ${error ? 'border-[#cc6855]' : 'border-[#d7dfd8]'} ${className}`}
        id={inputId}
        {...props}
      />
      {error ? <span className="text-xs font-normal text-[#a84436]">{error}</span> : hint && <span className="text-xs font-normal text-[#77837c]">{hint}</span>}
    </label>
  );
}