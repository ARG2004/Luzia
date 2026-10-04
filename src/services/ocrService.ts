import { createWorker, type Worker } from 'tesseract.js'
import { HapticsService } from './hapticsService'
import { TtsService } from './ttsService'
import { AudioFeedbackService } from './audioFeedbackService'

export interface OcrResult {
  text: string
  confidence: number
  matchedEmergencyKeyword?: string
  guidanceMessage?: string
}

const EMERGENCY_KEYWORDS: Record<string, string> = {
  SALIDA: 'Salida localizada al frente. Continúe con precaución.',
  EXIT: 'Salida localizada al frente.',
  EMERGENCIA: 'Señal de Emergencia detectada.',
  EVACUACION: 'Ruta de evacuación identificada.',
  EVACUACIÓN: 'Ruta de evacuación identificada.',
  SANITARIOS: 'Área de sanitarios identificada.',
  BAÑOS: 'Área de sanitarios identificada.',
  EXTINTOR: 'Punto con extintor de emergencia.',
  PELIGRO: '¡Atención! Señal de peligro al frente.',
  CUIDADO: '¡Atención! Zona de precaución.',
  NO_PASAR: 'Acceso restringido. No continúe por este camino.',
  ACCESO: 'Acceso identificado.',
  ESCALERAS: 'Precaución: escalones o desnivel.',
}

export class OcrService {
  private static worker: Worker | null = null
  private static isInitializing = false
  private static isProcessing = false

  public static async initWorker(): Promise<void> {
    if (this.worker || this.isInitializing) return
    this.isInitializing = true
    try {
      // Inicializar worker local de Tesseract
      this.worker = await createWorker('spa')
    } catch {
      // Fallback
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * Pre-procesa la imagen para maximizar la legibilidad en penumbra:
   * Aumenta contraste, normaliza luminancia y aplica umbral adaptativo.
   */
  public static preprocessForOcr(
    canvas: HTMLCanvasElement,
    cropX: number,
    cropY: number,
    cropW: number,
    cropH: number
  ): HTMLCanvasElement {
    const ocrCanvas = document.createElement('canvas')
    ocrCanvas.width = cropW
    ocrCanvas.height = cropH
    const ctx = ocrCanvas.getContext('2d')
    if (!ctx) return canvas

    // Copiar recorte
    ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    const imgData = ctx.getImageData(0, 0, cropW, cropH)
    const data = imgData.data

    // Calcular media de brillo para umbral dinámico
    let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3
    }
    const avg = sum / (data.length / 4)
    const threshold = Math.max(70, Math.min(190, avg * 1.15))

    // Binarización de alto contraste (letras claras sobre fondo oscuro o viceversa)
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const val = lum >= threshold ? 255 : 0
      data[i] = val
      data[i + 1] = val
      data[i + 2] = val
    }

    ctx.putImageData(imgData, 0, 0)
    return ocrCanvas
  }

  /**
   * Ejecuta el reconocimiento sobre el canvas y pronuncia el resultado si es relevante
   */
  public static async recognizeText(
    sourceCanvas: HTMLCanvasElement,
    cropRect?: { x: number; y: number; w: number; h: number }
  ): Promise<OcrResult | null> {
    if (this.isProcessing) return null

    this.isProcessing = true
    try {
      if (!this.worker) {
        await this.initWorker()
      }
      if (!this.worker) {
        this.isProcessing = false
        return null
      }

      const rect = cropRect || {
        x: Math.floor(sourceCanvas.width * 0.15),
        y: Math.floor(sourceCanvas.height * 0.2),
        w: Math.floor(sourceCanvas.width * 0.7),
        h: Math.floor(sourceCanvas.height * 0.6),
      }

      const preprocessed = this.preprocessForOcr(sourceCanvas, rect.x, rect.y, rect.w, rect.h)

      const ret = await this.worker.recognize(preprocessed)
      const rawText = ret.data.text.trim()
      const confidence = ret.data.confidence

      if (!rawText || rawText.length < 2) {
        return null
      }

      // Normalizar texto
      const cleanUpper = rawText.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9\s]/g, '')
      const words = cleanUpper.split(/\s+/)

      let matchedKeyword: string | undefined
      let guidanceMessage: string | undefined

      for (const word of words) {
        if (EMERGENCY_KEYWORDS[word]) {
          matchedKeyword = word
          guidanceMessage = EMERGENCY_KEYWORDS[word]
          break
        }
      }

      // Si no coincide con palabra exacta, buscar frases contenidas
      if (!guidanceMessage) {
        for (const [key, msg] of Object.entries(EMERGENCY_KEYWORDS)) {
          if (cleanUpper.includes(key)) {
            matchedKeyword = key
            guidanceMessage = msg
            break
          }
        }
      }

      const messageToSpeak = guidanceMessage || `Letrero detectado: ${rawText}`

      // Feedback háptico y auditivo inmediato
      AudioFeedbackService.playSuccessChime()
      HapticsService.signDetected()
      TtsService.speak(messageToSpeak)

      return {
        text: rawText,
        confidence,
        matchedEmergencyKeyword: matchedKeyword,
        guidanceMessage: messageToSpeak,
      }
    } catch {
      return null
    } finally {
      this.isProcessing = false
    }
  }

  public static isWorking(): boolean {
    return this.isProcessing || this.isInitializing
  }
}
