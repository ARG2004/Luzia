import React, { useState, useEffect } from 'react'
import { X, Play, Square, Zap, AlertTriangle, FileText, Sparkles, Tv } from 'lucide-react'
import { HapticsService } from '../services/hapticsService'
import { AudioFeedbackService } from '../services/audioFeedbackService'

interface HorrorSimulatorModalProps {
  isOpen: boolean
  onClose: () => void
  onInjectSimulatedSign: (text: string) => void
}

export const HorrorSimulatorModal: React.FC<HorrorSimulatorModalProps> = ({
  isOpen,
  onClose,
  onInjectSimulatedSign,
}) => {
  const [isStrobing, setIsStrobing] = useState(false)
  const [strobeHz, setStrobeHz] = useState<number>(12)
  const [strobeFlashState, setStrobeFlashState] = useState(false)

  // Efecto de parpadeo estroboscópico en el simulador
  useEffect(() => {
    if (!isStrobing) {
      setStrobeFlashState(false)
      return
    }

    const intervalMs = 1000 / (strobeHz * 2) // Medio ciclo
    const timer = setInterval(() => {
      setStrobeFlashState(prev => !prev)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isStrobing, strobeHz])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-xl bg-[#0b0e17] border border-purple-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-300">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black font-heading text-white tracking-wide">
                SIMULADOR DE EVENTOS DE TERROR
              </h2>
              <p className="text-xs text-purple-300 font-mono">
                Entorno de pruebas y validación sensorial para pitch y demos
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              HapticsService.tap()
              setIsStrobing(false)
              onClose()
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sección 1: Simulador de Luces Estroboscópicas */}
        <div className="mb-6 p-4 rounded-2xl bg-black/60 border border-red-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-mono text-red-400 flex items-center gap-1.5 uppercase">
              <AlertTriangle className="w-4 h-4" />
              1. TEST DE DESTELLOS ESTROBOSCÓPICOS
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              Frecuencia seleccionada: <b className="text-red-400">{strobeHz} Hz</b>
            </span>
          </div>

          <p className="text-xs text-gray-300 mb-3">
            Genera un destello visual estroboscópico de alta frecuencia para validar la detección de
            fotosensibilidad de Luzía y la alerta háptica.
          </p>

          {/* Cuadro de destello estroboscópico */}
          <div
            className={`w-full h-24 rounded-xl border-2 flex items-center justify-center transition-none mb-3 ${
              isStrobing && strobeFlashState
                ? 'bg-white text-black border-red-500 shadow-[0_0_35px_#ffffff]'
                : isStrobing && !strobeFlashState
                ? 'bg-black text-gray-500 border-red-950'
                : 'bg-zinc-950 border-white/10 text-gray-400'
            }`}
          >
            {isStrobing ? (
              <span className="font-mono text-sm font-black tracking-widest animate-pulse">
                ⚡ DESTELLO EMITIENDO A {strobeHz} Hz ⚡
              </span>
            ) : (
              <span className="font-mono text-xs text-gray-500">
                PULSE INICIAR PARA ACTIVAR PARPADEO
              </span>
            )}
          </div>

          {/* Selectores de Frecuencia */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {[6, 12, 18, 24].map(hz => (
                <button
                  key={hz}
                  onClick={() => {
                    HapticsService.tap()
                    setStrobeHz(hz)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    strobeHz === hz
                      ? 'bg-red-600 text-white shadow-[0_0_10px_#ff1e42]'
                      : 'bg-zinc-900 text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  {hz} Hz
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                HapticsService.tap()
                setIsStrobing(prev => !prev)
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-extrabold flex items-center gap-2 transition-all ${
                isStrobing
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200'
              }`}
            >
              {isStrobing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isStrobing ? 'DETENER ESTROBO' : 'INICIAR ESTROBO'}
            </button>
          </div>
        </div>

        {/* Sección 2: Simulador de Señalética Nocturna */}
        {/* Sección 2: Simulador de Señalética Nocturna */}
        <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-mono text-cyan-400 flex items-center gap-1.5 uppercase">
              <FileText className="w-4 h-4" />
              2. TEST DE SEÑALÉTICA EN PENUMBRA (OCR + VOZ)
            </span>
          </div>

          <p className="text-xs text-gray-300 mb-3">
            Haga clic en cualquiera de estas señales comunes de casas del terror y festivales para
            inyectar la captura al motor OCR de Luzía y escuchar la orientación asistiva:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                HapticsService.tap()
                onInjectSimulatedSign('SALIDA DE EMERGENCIA')
                onClose()
              }}
              className="p-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-left transition-all group"
            >
              <span className="text-xs font-black font-mono text-emerald-300 block mb-0.5 group-hover:underline">
                [SALIDA DE EMERGENCIA]
              </span>
              <span className="text-[11px] text-gray-400 block font-mono">
                Ruta de escape principal
              </span>
            </button>

            <button
              onClick={() => {
                HapticsService.tap()
                onInjectSimulatedSign('RUTA DE EVACUACIÓN')
                onClose()
              }}
              className="p-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-left transition-all group"
            >
              <span className="text-xs font-black font-mono text-emerald-300 block mb-0.5 group-hover:underline">
                [RUTA DE EVACUACIÓN]
              </span>
              <span className="text-[11px] text-gray-400 block font-mono">
                Orientación en penumbra
              </span>
            </button>

            <button
              onClick={() => {
                HapticsService.tap()
                onInjectSimulatedSign('PELIGRO ALTO VOLTAJE')
                onClose()
              }}
              className="p-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-left transition-all group"
            >
              <span className="text-xs font-black font-mono text-red-300 block mb-0.5 group-hover:underline">
                [PELIGRO: ALTO VOLTAJE]
              </span>
              <span className="text-[11px] text-gray-400 block font-mono">
                Instalación eléctrica expuesta
              </span>
            </button>

            <button
              onClick={() => {
                HapticsService.tap()
                onInjectSimulatedSign('SANITARIOS')
                onClose()
              }}
              className="p-3 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/50 text-left transition-all group"
            >
              <span className="text-xs font-black font-mono text-blue-300 block mb-0.5 group-hover:underline">
                [SANITARIOS / BAÑOS]
              </span>
              <span className="text-[11px] text-gray-400 block font-mono">
                Servicios del festival
              </span>
            </button>
          </div>
        </div>

        {/* Sección 3: MODO FAZBEAR RETRO 8-BITS (FNAF MINIGAMES) */}
        <div className="p-4 rounded-2xl bg-zinc-950/90 border-2 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black font-mono text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Tv className="w-4 h-4 text-amber-400 animate-pulse" />
              3. MODO FAZBEAR SECURITY (FNAF 8-BIT)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              MINIJUEGO RETRO
            </span>
          </div>

          <p className="text-xs text-gray-300 mb-3 font-mono">
            Simula las cámaras de seguridad y señalética de la pizzería con sonido de estática CRT y alerta sensorial háptica:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                HapticsService.strobeWarning()
                AudioFeedbackService.playCameraSwitchStatic()
                onInjectSimulatedSign('CAM 1A - SHOW STAGE')
                onClose()
              }}
              className="p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/60 text-left transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black font-mono text-amber-300 group-hover:underline">
                  [CAM 1A - SHOW STAGE]
                </span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </div>
              <span className="text-[11px] text-amber-200/80 block font-mono">
                Freddy, Bonnie y Chica activos en tarima
              </span>
            </button>

            <button
              onClick={() => {
                HapticsService.strobeWarning()
                AudioFeedbackService.playCameraSwitchStatic()
                onInjectSimulatedSign('CAM 2B - WEST HALL')
                onClose()
              }}
              className="p-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/60 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black font-mono text-purple-300 group-hover:underline">
                  [CAM 2B - WEST HALL]
                </span>
                <span className="w-2 h-2 rounded-full bg-purple-400" />
              </div>
              <span className="text-[11px] text-purple-200/80 block font-mono">
                Pasillo oscuro y suelo con cables
              </span>
            </button>

            <button
              onClick={() => {
                HapticsService.tap()
                AudioFeedbackService.playCameraSwitchStatic()
                onInjectSimulatedSign('PIRATE COVE - OUT OF ORDER')
                onClose()
              }}
              className="p-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/60 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black font-mono text-red-300 block mb-0.5 group-hover:underline">
                  [PIRATE COVE: FUERA DE SERVICIO]
                </span>
                <span className="text-[11px] text-red-200/80 block font-mono">
                  Señalética de advertencia Foxy
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                HapticsService.signDetected()
                AudioFeedbackService.playCameraSwitchStatic()
                onInjectSimulatedSign('HAPPIEST DAY - SALIDA')
                onClose()
              }}
              className="p-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/60 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black font-mono text-cyan-300 block mb-0.5 group-hover:underline">
                  [HAPPIEST DAY - SALIDA DE SEGURIDAD]
                </span>
              </div>
              <span className="text-[11px] text-cyan-200/80 block font-mono">
                Evacuación con globos y celebración
              </span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-gray-500">
          <span>Luzía v1.0.0 · MVP Acelerado (14 Días)</span>
          <span className="flex items-center gap-1 text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
            100% Funcional Offline
          </span>
        </div>
      </div>
    </div>
  )
}
