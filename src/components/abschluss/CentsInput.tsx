import { useEffect, useState } from 'react'
import { formatCents, parseEuroInput } from '../../accounting/money'

interface CentsInputProps {
  valueCents: number
  onChange: (cents: number) => void
  id?: string
  'aria-label'?: string
  allowNegative?: boolean
}

/** Euro-Eingabe ↔ Cent; leeres Feld = 0. */
export function CentsInput({
  valueCents,
  onChange,
  id,
  'aria-label': ariaLabel,
  allowNegative = true,
}: CentsInputProps) {
  const [text, setText] = useState(() => formatInput(valueCents))

  useEffect(() => {
    setText(formatInput(valueCents))
  }, [valueCents])

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      className="cents-input"
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        if (next.trim() === '') {
          onChange(0)
          return
        }
        const parsed = parseEuroInput(next)
        if (parsed === null) return
        if (!allowNegative && parsed < 0) return
        onChange(parsed)
      }}
      onBlur={() => setText(formatInput(valueCents))}
    />
  )
}

function formatInput(cents: number): string {
  if (cents === 0) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function formatCentsLabel(cents: number): string {
  return formatCents(cents)
}
