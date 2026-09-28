const variants = {
  primary: 'bg-[#245b49] text-white hover:bg-[#194a39] focus-visible:ring-[#82b9a0]',
  secondary: 'border border-[#d7dfd8] bg-white text-[#34413b] hover:bg-[#f7f9f7] focus-visible:ring-[#b9c9bd]',
  ghost: 'text-[#5d6b63] hover:bg-[#edf2ed] focus-visible:ring-[#b9c9bd]',
  dark: 'bg-[#202a27] text-white hover:bg-[#313d38] focus-visible:ring-[#9da9a1]',
};

export default function Button({ children, className = '', variant = 'primary', type = 'button', ...props }) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}