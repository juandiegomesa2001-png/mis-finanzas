import { AlertCircle, CheckCircle2, Inbox } from 'lucide-react'

export function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <div className="feedback feedback-error" role="alert">
      <AlertCircle aria-hidden="true" size={18} />
      <span>{message}</span>
    </div>
  )
}

export function SuccessMessage({ message }: { readonly message: string }) {
  return (
    <div className="feedback feedback-success" role="status">
      <CheckCircle2 aria-hidden="true" size={18} />
      <span>{message}</span>
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  readonly title: string
  readonly description: string
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox aria-hidden="true" size={24} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

