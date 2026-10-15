interface PeriodControlsProps {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  label?: string
}

export function PeriodControls({
  from,
  to,
  onFromChange,
  onToChange,
  label = 'Zeitraum',
}: PeriodControlsProps) {
  return (
    <div className="sales-toolbar" role="group" aria-label={label}>
      <label className="form-field">
        <span>Von</span>
        <input
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
        />
      </label>
      <label className="form-field">
        <span>Bis</span>
        <input
          type="date"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
        />
      </label>
    </div>
  )
}

interface AsOfControlProps {
  asOf: string
  onChange: (value: string) => void
}

export function AsOfControl({ asOf, onChange }: AsOfControlProps) {
  return (
    <div className="sales-toolbar" role="group" aria-label="Stichtag">
      <label className="form-field">
        <span>Stichtag</span>
        <input
          type="date"
          value={asOf}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  )
}
