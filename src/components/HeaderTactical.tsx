import React from 'react'
import { Volume2, VolumeX, AlertTriangle, ShieldCheck, Zap } from 'lucide-react'
import { HapticsService } from '../services/hapticsService'

interface HeaderTacticalProps {
  isMuted: boolean
  onToggleMute: () => void
  isPanicActive: boolean
  onTogglePanic: () => void
  fps: number
  isStrobeAlert: boolean
  hasObstacleAlert: boolean
  onOpenSettings: () => void
  onOpenSimulator: () => void
}

export const HeaderTactical: React.FC<HeaderTacticalProps> = ({
  isMuted,
  onToggleMute,
  isPanicActive,
  onTogglePanic,
  fps,
  isStrobeAlert,
  hasObstacleAlert,
  onOpenSimulator,
}) => {
  return (
    <header className="w-full bg-[#090814]/95 backdrop-blur-md border-b-4 border-[#3c3468] px-3 sm:px-5 py-2.5 flex items-center justify-between z-30 select-none font-crt">
      {/* Brand & Fazbear Status */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Pixel Freddy Hat / Security Badge */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#1a1636] border-2 border-[#52468f] shadow-[0_0_15px_rgba(82,70,143,0.5)]">
          <svg width="24" height="24" viewBox="0 0 24 24" className="[image-rendering:pixelated]">
            {/* Top Hat */}
            <rect x="8" y="2" width="8" height="6" fill="#141414" />
            <rect x="6" y="7" width="12" height="2" fill="#292929" />
            {/* Ears */}
            <rect x="3" y="8" width="4" height="4" fill="#a8761d" />
            <rect x="17" y="8" width="4" height="4" fill="#a8761d" />
            {/* Head */}
            <rect x="5" y="9" width="14" height="11" fill="#a8761d" />
            {/* Eyes */}
            <rect x="7" y="11" width="3" height="3" fill="#ffffff" />
            <rect x="8" y="12" width="1.5" height="1.5" fill="#00f0ff" />
            <rect x="14" y="11" width="3" height="3" fill="#ffffff" />
            <rect x="15" y="12" width="1.5" height="1.5" fill="#00f0ff" />
            {/* Bowtie */}
            <rect x="9" y="20" width="6" height="2" fill="#111111" />
          </svg>
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00ff66] border border-black shadow-[0_0_8px_#00ff66]" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-pixel text-xs sm:text-sm tracking-wider text-white">
              LUZÍA
            </h1>
            <span className="font-pixel text-[8px] px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-red-300">
              FAZBEAR OS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-green-400 flex items-center gap-1.5 font-crt tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-ping" />
            MONITOREO ACTIVO · NIGHT 1 · {fps} FPS
          </p>
        </div>
      </div>

      {/* Quick Actions & Status */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Status Pills */}
        {isStrobeAlert && (
          <div className="hidden sm:flex items-center gap-1 font-pixel text-[8px] px-2 py-1 rounded bg-red-600/40 text-red-200 border border-red-500 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>¡ESTROBO!</span>
          </div>
        )}

        {hasObstacleAlert && !isStrobeAlert && (
          <div className="hidden sm:flex items-center gap-1 font-pixel text-[8px] px-2 py-1 rounded bg-amber-600/40 text-amber-200 border border-amber-500 animate-pulse">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>OBSTÁCULO</span>
          </div>
        )}

        {!isStrobeAlert && !hasObstacleAlert && (
          <div className="hidden sm:flex items-center gap-1 font-pixel text-[8px] px-2 py-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-600/50">
            <ShieldCheck className="w-3 h-3" />
            <span>SEGURO</span>
          </div>
        )}

        {/* Terror Simulator Button */}
        <button
          onClick={() => {
            HapticsService.tap()
            onOpenSimulator()
          }}
          className="font-pixel text-[8px] px-2.5 py-1.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 text-purple-200 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
          title="Abrir Simulador de Pruebas Fazbear"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span>TEST TERROR</span>
        </button>

        {/* Audio Mute/Unmute */}
        <button
          onClick={() => {
            HapticsService.tap()
            onToggleMute()
          }}
          className={`p-1.5 sm:p-2 rounded border transition-all ${
            isMuted
              ? 'bg-gray-800/90 border-gray-700 text-gray-400'
              : 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
          }`}
          aria-label={isMuted ? 'Activar audio' : 'Silenciar audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Panic SOS Button */}
        <button
          onClick={() => {
            HapticsService.tap()
            onTogglePanic()
          }}
          className={`px-2.5 sm:px-3 py-1.5 rounded font-pixel text-[8px] sm:text-[9px] flex items-center gap-1 border transition-all ${
            isPanicActive
              ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-[0_0_25px_#ff1e42]'
              : 'bg-red-950/80 hover:bg-red-900 border-red-500/60 text-red-300'
          }`}
          title="Botón de Pánico / Alerta de Auxilio"
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${isPanicActive ? 'animate-bounce' : ''}`} />
          <span>SOS</span>
        </button>
      </div>
    </header>
  )
}
