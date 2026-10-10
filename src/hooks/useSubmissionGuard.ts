import { useCallback, useState } from 'react'

export interface SubmissionGate {
  readonly isRunning: () => boolean
  readonly run: (task: () => Promise<void>) => Promise<boolean>
}

export function createSubmissionGate(): SubmissionGate {
  let running = false

  return {
    isRunning: () => running,
    run: async (task) => {
      if (running) return false
      running = true

      try {
        await task()
        return true
      } finally {
        running = false
      }
    },
  }
}

export function useSubmissionGuard() {
  const [gate] = useState(createSubmissionGate)
  const [submitting, setSubmitting] = useState(false)

  const run = useCallback(async (task: () => Promise<void>) => {
    return gate.run(async () => {
      setSubmitting(true)
      try {
        await task()
      } finally {
        setSubmitting(false)
      }
    })
  }, [gate])

  return { submitting, run } as const
}
