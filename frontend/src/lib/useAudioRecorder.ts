import { useCallback, useEffect, useRef, useState } from 'react'
import { feedback } from './feedback'

export interface AudioRecorderState {
  isRecording: boolean
  isTranscribing: boolean
  level: number
  error?: string
  isSupported: boolean
}

export interface UseAudioRecorderOptions {
  onTranscribe?: (blob: Blob) => Promise<string | void>
  onResult?: (text: string) => void
  onError?: (err: string) => void
  maxDurationMs?: number
  silenceTimeoutMs?: number
}

function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
    '',
  ]
  for (const mime of candidates) {
    if (!mime || MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

export function useAudioRecorder({
  onTranscribe,
  onResult,
  onError,
  maxDurationMs = 15000,
  silenceTimeoutMs = 1500,
}: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [level, setLevel] = useState(0)
  const [error, setErrorState] = useState<string>()

  const setError = useCallback((err?: string) => {
    setErrorState(err)
    if (err && onError) onError(err)
  }, [onError])

  const isSupported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hadSpeechRef = useRef(false)

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = null
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current)
    maxTimerRef.current = null
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }

    analyserRef.current = null
    setLevel(0)
    hadSpeechRef.current = false
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      feedback.vibrate(15)
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    cleanup()
  }, [cleanup])

  const start = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser.')
      return
    }

    try {
      setError(undefined)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      // Web Audio API analyzer for waveform
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        const audioCtx = new AudioCtx()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateLevel = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
          const avg = sum / dataArray.length
          const normalized = Math.min(1, Math.max(0, avg / 128))
          setLevel(normalized)

          // Silence detection
          if (normalized > 0.12) {
            hadSpeechRef.current = true
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current)
              silenceTimerRef.current = null
            }
          } else if (hadSpeechRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              stop()
            }, silenceTimeoutMs)
          }

          animFrameRef.current = requestAnimationFrame(updateLevel)
        }
        animFrameRef.current = requestAnimationFrame(updateLevel)
      }

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const audioMime = mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: audioMime })
        chunksRef.current = []

        if (audioBlob.size < 500) {
          // Too short or empty
          return
        }

        if (onTranscribe) {
          setIsTranscribing(true)
          try {
            const text = await onTranscribe(audioBlob)
            if (text && onResult) onResult(text)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Transcription failed')
          } finally {
            setIsTranscribing(false)
          }
        }
      }

      recorder.start(100) // 100ms timeslices
      setIsRecording(true)
      feedback.add()

      maxTimerRef.current = setTimeout(() => {
        stop()
      }, maxDurationMs)
    } catch (err) {
      cleanup()
      setIsRecording(false)
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Microphone access was denied. Please allow microphone access to speak to Hunch.')
      } else {
        setError('Could not access microphone.')
      }
    }
  }, [cleanup, isSupported, maxDurationMs, onResult, onTranscribe, setError, silenceTimeoutMs, stop])

  const toggle = useCallback(() => {
    if (isRecording) {
      stop()
    } else {
      void start()
    }
  }, [isRecording, start, stop])

  return {
    isRecording,
    isTranscribing,
    level,
    error,
    isSupported,
    start,
    stop,
    toggle,
    setError,
  }
}
