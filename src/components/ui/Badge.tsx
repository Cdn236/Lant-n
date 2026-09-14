interface BadgeProps {
  variant?: 'teal' | 'amber' | 'red' | 'green' | 'stone' | 'blue';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  teal: 'bg-teal-100 text-teal-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  stone: 'bg-stone-100 text-stone-600',
  blue: 'bg-blue-100 text-blue-700',
};

export function Badge({ variant = 'stone', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
