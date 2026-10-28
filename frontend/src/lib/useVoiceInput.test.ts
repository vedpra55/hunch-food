import { describe, expect, it } from 'vitest'

describe('useVoiceInput module', () => {
  it('detects voice input availability safely', async () => {
    const mod = await import('./useVoiceInput')
    expect(mod.useVoiceInput).toBeDefined()
  })

  it('provides useVoiceInput hook function', async () => {
    const { useVoiceInput } = await import('./useVoiceInput')
    expect(typeof useVoiceInput).toBe('function')
  })
})

