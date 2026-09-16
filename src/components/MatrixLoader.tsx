interface MatrixLoaderProps {
  size?: 'sm' | 'md'
  className?: string
}

export default function MatrixLoader({ size = 'sm', className = '' }: MatrixLoaderProps) {
  const dotSize = size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'
  const delays = [0, 80, 160, 80, 160, 240, 160, 240, 320]

  return (
    <span
      className={`inline-grid grid-cols-3 ${gap} items-center justify-center flex-shrink-0 ${className}`}
      aria-label="Loading"
      role="status"
    >
      {delays.map((delay, idx) => (
        <span
          key={idx}
          className={`${dotSize} rounded-[1px] bg-current`}
          style={{
            animation: 'matrixPulse 900ms ease-in-out infinite',
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </span>
  )
}
