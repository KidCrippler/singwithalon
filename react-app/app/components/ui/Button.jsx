'use client'

/**
 * Reusable Button component with Tailwind styling
 * Replaces .btn, .btn-primary, .btn-secondary from legacy CSS
 */

export function ButtonPrimary({ children, href, className = '', ...props }) {
  const baseClasses = "inline-flex items-center gap-2 px-7 py-3 border-0 rounded-[30px] text-base font-semibold no-underline transition-all duration-300 ease-in-out cursor-pointer relative overflow-hidden"
  const primaryClasses = "bg-gradient-to-br from-[#8b5fbf] to-[#b19cd9] text-white shadow-[0_4px_20px_rgba(139,95,191,0.3)] hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgba(139,95,191,0.4)]"

  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} ${primaryClasses} ${className}`}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      className={`${baseClasses} ${primaryClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function ButtonSecondary({ children, href, className = '', ...props }) {
  const baseClasses = "inline-flex items-center gap-2 px-7 py-3 rounded-[30px] text-base font-semibold no-underline transition-all duration-300 ease-in-out cursor-pointer relative overflow-hidden"
  const secondaryClasses = "bg-white/90 text-[#8b5fbf] border-2 border-white/90 backdrop-blur-[5px] hover:bg-[#8b5fbf] hover:text-white hover:border-[#8b5fbf] hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(139,95,191,0.3)]"

  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} ${secondaryClasses} ${className}`}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      className={`${baseClasses} ${secondaryClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
