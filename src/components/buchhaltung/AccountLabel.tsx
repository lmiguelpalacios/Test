import { getAccountMap } from '../../data/chart-of-accounts'

const accountMap = getAccountMap()

interface AccountLabelProps {
  number: string
}

export function AccountLabel({ number }: AccountLabelProps) {
  const account = accountMap.get(number)
  if (!account) {
    return <code>{number}</code>
  }
  return (
    <span className="account-label">
      <code>{account.number}</code>
      <span>{account.name}</span>
    </span>
  )
}
