import { toDomainDate, toDomainDateTime, type DomainDate } from '../domain'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function todayDomainDate(now = new Date()): DomainDate {
  return toDomainDate(
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  )
}

export function currentDomainDateTime(now = new Date()) {
  return toDomainDateTime(now.toISOString())
}

export function currentMonthRange(now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()

  return {
    from: toDomainDate(`${year}-${pad(month + 1)}-01`),
    to: toDomainDate(`${year}-${pad(month + 1)}-${pad(lastDay)}`),
  }
}

