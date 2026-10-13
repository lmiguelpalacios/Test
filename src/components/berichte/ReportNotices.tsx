export function ReportNotices({ notices }: { notices: string[] }) {
  if (notices.length === 0) return null
  return (
    <ul className="placeholder-list">
      {notices.map((notice) => (
        <li key={notice}>{notice}</li>
      ))}
    </ul>
  )
}

/** Positiv = Sollüberschuss, negativ = Habenüberschuss. */
export function formatSignedBalance(cents: number, formatCents: (c: number) => string) {
  if (cents === 0) return formatCents(0)
  if (cents > 0) return `${formatCents(cents)} S`
  return `${formatCents(-cents)} H`
}
