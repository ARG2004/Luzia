export class TtsService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null
  private static spanishVoice: SpeechSynthesisVoice | null = null
  private static isSpeaking = false
  private static lastSpokenText = ''
  private static lastSpokenTime = 0

  public static init(): void {
    if (!this.synth) return

    const loadVoices = () => {
      const voices = this.synth?.getVoices() || []
      // Buscar voz en español prioritariamente (es-ES, es-MX, etc.)
      const esVoice = voices.find(v => v.lang.startsWith('es') || v.lang.includes('es-'))
      if (esVoice) {
        this.spanishVoice = esVoice
      }
    }

    loadVoices()
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices
    }
  }

  /**
   * Pronuncia un texto de señalética de emergencia o indicación asistiva.
   * Evita repeticiones continuas en periodos menores a 3 segundos.
   */
  public static speak(text: string, force = false): void {
    if (!this.synth) return
    const now = Date.now()

    if (!force && text === this.lastSpokenText && now - this.lastSpokenTime < 3500) {
      return
    }

    this.lastSpokenText = text
    this.lastSpokenTime = now

    // Cancelar el anterior si es urgente
    this.synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = 1.05 // Ligeramente dinámico para emergencias
    utterance.pitch = 1.0

    if (this.spanishVoice) {
      utterance.voice = this.spanishVoice
    }

    utterance.onstart = () => {
      this.isSpeaking = true
    }
    utterance.onend = () => {
      this.isSpeaking = false
    }
    utterance.onerror = () => {
      this.isSpeaking = false
    }

    this.synth.speak(utterance)
  }

  public static stop(): void {
    if (this.synth) {
      this.synth.cancel()
    }
    this.isSpeaking = false
  }

  public static isBusy(): boolean {
    return this.isSpeaking
  }
}
