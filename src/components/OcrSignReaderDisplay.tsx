import React, { useState } from 'react'
import { ScanText, Volume2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import type { OcrResult } from '../services/ocrService'
import { TtsService } from '../services/ttsService'
import { HapticsService } from '../services/hapticsService'

interface OcrSignReaderDisplayProps {
  onTriggerScan: () => Promise<OcrResult | null>
  lastOcrResult: OcrResult | null
  isScanning: boolean
}

export const OcrSignReaderDisplay: React.FC<OcrSignReaderDisplayProps> = ({
  onTriggerScan,
  lastOcrResult,
  isScanning,
}) => {
  const [localFeedback, setLocalFeedback] = useState<string | null>(null)

  const handleScan = async () => {
    HapticsService.tap()
    setLocalFeedback('Enfocando letrero y procesando contraste...')
    const res = await onTriggerScan()
    if (!res) {
      setLocalFeedback('No se detectó texto legible. Ajuste el encuadre o active la luz.')
      TtsService.speak('No se detectó señalética legible. Apunte de nuevo.')
    } else {
      setLocalFeedback(null)
    }
  }

  const handleRepeatVoice = () => {
    if (lastOcrResult?.guidanceMessage) {
      HapticsService.tap()
      TtsService.speak(lastOcrResult.guidanceMessage, true)
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScanText className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-extrabold tracking-wide uppercase font-mono text-white">
            LECTOR DE SEÑALÉTICA NOCTURNA (OCR + VOZ)
          </h2>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
          MOTOR LOCAL (ON-DEVICE)
        </span>
      </div>

      {/* Botón Principal Accesible para Lector de Señal */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <button
          onClick={handleScan}
          disabled={isScanning}
          className={`flex-1 py-3 px-4 rounded-xl font-heading font-black tracking-wide text-sm flex items-center justify-center gap-2 transition-all shadow-lg select-none active:scale-95 ${
            isScanning
              ? 'bg-cyan-900/60 border border-cyan-400 text-cyan-200 animate-pulse'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(0,240,255,0.3)] border border-cyan-400/50'
          }`}
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>ANALIZANDO ROTULADO...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-cyan-200" />
              <span>LEER SEÑAL AL FRENTE (VOZ)</span>
            </>
          )}
        </button>

        {lastOcrResult?.guidanceMessage && (
          <button
            onClick={handleRepeatVoice}
            className="py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-white/10 text-cyan-300 flex items-center justify-center gap-2 transition-all"
            title="Repetir indicación por voz"
          >
            <Volume2 className="w-5 h-5" />
            <span className="text-xs font-mono font-bold">REPETIR</span>
          </button>
        )}
      </div>

      {/* Retroalimentación o Mensaje */}
      {localFeedback && (
        <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-gray-300 text-xs font-mono mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{localFeedback}</span>
        </div>
      )}

      {/* Resultado Reconocido */}
      {lastOcrResult && (
        <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/40 text-cyan-200">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-1">
            <span>TEXTO EXTRAÍDO</span>
            <span>FIABILIDAD: {Math.round(lastOcrResult.confidence)}%</span>
          </div>

          <div className="text-lg font-black font-mono text-white tracking-wide mb-1">
            "{lastOcrResult.text}"
          </div>

          {lastOcrResult.guidanceMessage && (
            <div className="text-xs font-mono text-[#00ff66] flex items-center gap-1.5 pt-1 border-t border-white/5">
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>Orientación: {lastOcrResult.guidanceMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Atajos de Señalética de Emergencia habitual en eventos de terror */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1.5">
          SEÑALES PRIORITARIAS RECONOCIDAS AL INSTANTE:
        </span>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-gray-400">
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            SALIDA DE EMERGENCIA
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            RUTA DE EVACUACIÓN
          </span>
          <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30 text-red-300">
            PELIGRO / ALTO VOLTAJE
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300">
            SANITARIOS
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
            EXTINTOR
          </span>
        </div>
      </div>
    </div>
  )
}
