import { useCallback, useEffect, useRef, useState } from 'react'
import { feedback } from './feedback'

export interface VoiceInputState {
  isListening: boolean
  isProcessing: boolean
  transcript: string
  level: number
  error?: string
  isSupported: boolean
}

export interface UseVoiceInputOptions {
  onAutoSend?: (text: string) => void
  onTranscribeFallback?: (blob: Blob) => Promise<string | void>
  onError?: (err: string) => void
  lang?: string
  silenceTimeoutMs?: number
}

// Type definitions for Web Speech API
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onaudiostart: (() => void) | null
  onsoundstart: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onsoundend: (() => void) | null
  onaudioend: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

type SpeechRecognitionConstructor = new () => IWindowSpeechRecognition

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function useVoiceInput({
  onAutoSend,
  onTranscribeFallback,
  onError,
  lang = 'en-IN',
  silenceTimeoutMs = 1100,
}: UseVoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [level, setLevel] = useState(0)
  const [error, setErrorState] = useState<string>()

  const setError = useCallback((err?: string) => {
    setErrorState(err)
    if (err && onError) onError(err)
  }, [onError])

  const SpeechRecognitionClass = getSpeechRecognitionClass()
  const isSupported = typeof window !== 'undefined' && (!!SpeechRecognitionClass || (!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'))

  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const hadSpeechRef = useRef(false)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isStoppingRef = useRef(false)

  // Cleanup helper
  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = null
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
    autoSendTimerRef.current = null
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
    isStoppingRef.current = false
  }, [])

  useEffect(() => {
    return cleanupAudio
  }, [cleanupAudio])

  const stop = useCallback(() => {
    isStoppingRef.current = true
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }
    setIsListening(false)
    cleanupAudio()
  }, [cleanupAudio])

  // Start audio waveform monitoring
  const setupAudioMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream

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

        const checkLevel = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
          const avg = sum / dataArray.length
          const normalized = Math.min(1, Math.max(0, avg / 80))
          setLevel(normalized)

          // VAD for fallback mode (e.g. Firefox)
          if (!SpeechRecognitionClass) {
            if (normalized > 0.05) {
              hadSpeechRef.current = true
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current)
                silenceTimerRef.current = null
              }
            } else if (hadSpeechRef.current && !silenceTimerRef.current && !isStoppingRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                stop()
              }, silenceTimeoutMs)
            }
          }

          animFrameRef.current = requestAnimationFrame(checkLevel)
        }
        animFrameRef.current = requestAnimationFrame(checkLevel)
      }
      return stream
    } catch {
      return null
    }
  }, [SpeechRecognitionClass, silenceTimeoutMs, stop])

  const start = useCallback(async () => {
    setError(undefined)
    setTranscript('')
    isStoppingRef.current = false

    // 1. Primary Engine: Web Speech API (Chrome, Safari, iOS, Android, Edge)
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = lang
        recognition.maxAlternatives = 1

        let finalAccumulated = ''

        recognition.onresult = event => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i]
            const text = res[0]?.transcript || ''
            if (res.isFinal) {
              finalAccumulated += text
            } else {
              interim += text
            }
          }

          const currentText = (finalAccumulated || interim).trim()
          setTranscript(currentText)

          // If the engine marked this result as final, auto-send immediately!
          if (finalAccumulated.trim()) {
            const sendText = finalAccumulated.trim()
            if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
            autoSendTimerRef.current = setTimeout(() => {
              stop()
              feedback.vibrate(15)
              if (onAutoSend) onAutoSend(sendText)
            }, 300)
          }
        }

        recognition.onspeechend = () => {
          // Speech ended: if we have transcribed words, auto-send
          if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
          autoSendTimerRef.current = setTimeout(() => {
            stop()
          }, 600)
        }

        recognition.onerror = event => {
          if (event.error === 'no-speech') {
            stop()
            return
          }
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setError('Microphone access was denied. Please allow microphone access to speak to Hunch.')
          } else if (event.error !== 'aborted') {
            setError(`Speech recognition error: ${event.error}`)
          }
          stop()
        }

        recognition.onend = () => {
          setIsListening(false)
          cleanupAudio()
        }

        // Start waveform level meter concurrently
        void setupAudioMeter()

        recognition.start()
        recognitionRef.current = recognition
        setIsListening(true)
        feedback.add()
        return
      } catch {
        // Fall back to MediaRecorder if recognition.start() throws
        recognitionRef.current = null
      }
    }

    // 2. Fallback Engine: MediaRecorder + Backend STT (Firefox, etc.)
    try {
      const stream = await setupAudioMeter()
      if (!stream) {
        setError('Microphone access was denied or unavailable.')
        return
      }

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []

        if (audioBlob.size < 400) return

        if (onTranscribeFallback) {
          setIsProcessing(true)
          try {
            const text = await onTranscribeFallback(audioBlob)
            if (text && text.trim()) {
              setTranscript(text.trim())
              feedback.vibrate(15)
              if (onAutoSend) onAutoSend(text.trim())
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Transcription failed')
          } finally {
            setIsProcessing(false)
          }
        }
      }

      recorder.start(100)
      setIsListening(true)
      feedback.add()
    } catch {
      cleanupAudio()
      setIsListening(false)
      setError('Could not start voice recording.')
    }
  }, [SpeechRecognitionClass, cleanupAudio, lang, onAutoSend, onTranscribeFallback, setError, setupAudioMeter, stop])

  const toggle = useCallback(() => {
    if (isListening) {
      stop()
    } else {
      void start()
    }
  }, [isListening, start, stop])

  return {
    isListening,
    isProcessing,
    transcript,
    level,
    error,
    isSupported,
    start,
    stop,
    toggle,
    setError,
  }
}
