import type { ReactNode } from 'react'

interface PageHeaderProps {
  readonly eyebrow?: string
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {action}
    </header>
  )
}

