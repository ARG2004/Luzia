import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export class HapticsService {
  private static isAvailable = false
  private static hasChecked = false

  public static async checkAvailability(): Promise<boolean> {
    if (this.hasChecked) return this.isAvailable
    try {
      // Check if navigator.vibrate is available
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        this.isAvailable = true
      }
      this.hasChecked = true
    } catch {
      this.isAvailable = false
    }
    return this.isAvailable
  }

  /**
   * Alerta severa para luces estroboscópicas fotosensibles (3Hz - 30Hz)
   * Patrón agresivo para que el usuario desvíe la mirada con antelación
   */
  public static async strobeWarning(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // Pulso urgente: vibra 180ms, pausa 70ms, vibra 250ms, pausa 70ms, vibra 400ms
        navigator.vibrate([180, 70, 250, 70, 400])
      }
      await Haptics.notification({ type: NotificationType.Error }).catch(() => {})
    } catch {
      // Fallback silencioso
    }
  }

  /**
   * Pulso de proximidad de obstáculos (cables o desniveles en suelo)
   * La intensidad varía de 0 a 1 según la cercanía
   */
  public static async obstaclePulse(intensity: number): Promise<void> {
    try {
      const duration = Math.max(30, Math.min(180, Math.round(intensity * 180)))
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(duration)
      } else {
        if (intensity > 0.7) {
          await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
        } else if (intensity > 0.3) {
          await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
        } else {
          await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
        }
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Notificación háptica al detectar letrero de orientación o salida
   */
  public static async signDetected(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 60, 120])
      }
      await Haptics.notification({ type: NotificationType.Success }).catch(() => {})
    } catch {
      // Fallback
    }
  }

  /**
   * Toque de confirmación en la UI
   */
  public static async tap(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25)
      }
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    } catch {
      // Fallback
    }
  }
}
