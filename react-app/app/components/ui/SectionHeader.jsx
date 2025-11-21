/**
 * Reusable Section Header component with Tailwind styling
 * Replaces .section-header, .section-title, .section-subtitle from legacy CSS
 */

export function SectionHeader({ title, subtitle, className = '' }) {
  return (
    <div className={`text-center mb-12 md:mb-16 ${className}`}>
      <h2 className="font-display text-4xl md:text-5xl font-normal mb-4 text-[#2c3e50] tracking-wide">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg md:text-xl text-[#666] max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
