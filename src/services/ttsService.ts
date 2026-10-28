export class TtsService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null
  private static spanishVoice: SpeechSynthesisVoice | null = null
  private static isSpeaking = false
  private static isEnabled = true
  private static lastSpokenText = ''
  private static lastSpokenTime = 0

  public static init(): void {
    if (!this.synth) return

    const loadVoices = () => {
      const voices = this.synth?.getVoices() || []
      if (!voices || voices.length === 0) return

      // Priorizar voces en español natural: mexicano/latinoamericano (es-MX, es-419, es-US) o español (es-ES, es)
      const latamVoice = voices.find(v => v.lang === 'es-MX' || v.lang === 'es-419' || v.lang === 'es-US')
      const anySpanishVoice = voices.find(v => v.lang.toLowerCase().startsWith('es'))

      this.spanishVoice = latamVoice || anySpanishVoice || null
    }

    loadVoices()
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices
    }

    // Reintento en 500ms por compatibilidad con navegadores móviles donde getVoices() es asíncrono
    setTimeout(loadVoices, 500)
    setTimeout(loadVoices, 1500)
  }

  public static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled) {
      this.stop()
    }
  }

  public static getEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * Pronuncia un texto de señalética, letrero u orientación asistiva.
   * Evita repeticiones continuas en periodos menores a 3 segundos si no es forzado.
   */
  public static speak(text: string, force = false): void {
    if (!this.synth || !this.isEnabled) return
    const now = Date.now()

    if (!force && text === this.lastSpokenText && now - this.lastSpokenTime < 3500) {
      return
    }

    this.lastSpokenText = text
    this.lastSpokenTime = now

    // Reanudar sintetizador si el navegador lo puso en pausa en segundo plano
    if (this.synth.paused) {
      try {
        this.synth.resume()
      } catch {
        // Ignorar
      }
    }

    // Cancelar locución previa para dar paso a la alerta actual
    this.synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = this.spanishVoice?.lang || 'es-MX'
    utterance.rate = 1.0 // Cadencia natural y comprensible
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

    // Un retraso de 25ms evita que Chromium/Android dropee el speak tras un cancel inmediato
    setTimeout(() => {
      if (this.synth && this.isEnabled) {
        try {
          this.synth.speak(utterance)
        } catch {
          this.isSpeaking = false
        }
      }
    }, 25)
  }

  public static stop(): void {
    if (this.synth) {
      try {
        this.synth.cancel()
      } catch {
        // Ignorar
      }
    }
    this.isSpeaking = false
  }

  public static isBusy(): boolean {
    return this.isSpeaking
  }
}
