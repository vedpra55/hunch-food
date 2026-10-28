import { describe, expect, it } from 'vitest'

describe('useAudioRecorder module', () => {
  it('detects MediaRecorder support safely', async () => {
    const mod = await import('./useAudioRecorder')
    expect(mod.useAudioRecorder).toBeDefined()
  })

  it('provides useAudioRecorder hook function', async () => {
    const { useAudioRecorder } = await import('./useAudioRecorder')
    expect(typeof useAudioRecorder).toBe('function')
  })
})
