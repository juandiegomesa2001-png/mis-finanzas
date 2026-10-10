import { describe, expect, it } from 'vitest'

import { createSubmissionGate } from './useSubmissionGuard'

describe('protección de envíos', () => {
  it('ignora un segundo envío mientras el primero sigue en curso', async () => {
    let finish: (() => void) | undefined
    let calls = 0
    const gate = createSubmissionGate()
    const first = gate.run(async () => {
      calls += 1
      await new Promise<void>((resolve) => {
        finish = resolve
      })
    })
    const second = gate.run(async () => {
      calls += 1
    })

    expect(await second).toBe(false)
    expect(calls).toBe(1)
    expect(gate.isRunning()).toBe(true)
    finish?.()
    expect(await first).toBe(true)
    expect(gate.isRunning()).toBe(false)
  })
})
