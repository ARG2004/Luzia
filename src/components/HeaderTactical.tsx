import React from 'react'
import { Eye, Volume2, VolumeX, AlertTriangle, ShieldCheck, Zap } from 'lucide-react'
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
    <header className="w-full bg-[#07090e]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between z-30 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/30 to-amber-500/20 border border-red-500/40 shadow-[0_0_15px_rgba(255,30,66,0.3)]">
          <Eye className="w-6 h-6 text-[#ff1e42] animate-pulse" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#00ff66] border-2 border-[#07090e] shadow-[0_0_8px_#00ff66]" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-wider font-heading text-white">
              LUZÍA
            </h1>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-950/70 border border-red-500/40 text-red-300 font-bold">
              HORROR-SENSORY
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-ping" />
            PROTECCIÓN LOCAL ACTIVA · {fps} FPS
          </p>
        </div>
      </div>

      {/* Quick Actions & Status */}
      <div className="flex items-center gap-2">
        {/* Status Pills */}
        {isStrobeAlert && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-red-600/30 text-red-200 border border-red-500 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>ESTROBO!</span>
          </div>
        )}

        {hasObstacleAlert && !isStrobeAlert && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-amber-600/30 text-amber-200 border border-amber-500 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>OBSTÁCULO</span>
          </div>
        )}

        {!isStrobeAlert && !hasObstacleAlert && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-600/40">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SEGURO</span>
          </div>
        )}

        {/* Simulador de Terror Button */}
        <button
          onClick={() => {
            HapticsService.tap()
            onOpenSimulator()
          }}
          className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
          title="Abrir Simulador de Pruebas de Terror"
        >
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="hidden xs:inline">TEST DE</span> TERROR
        </button>

        {/* Audio Mute/Unmute */}
        <button
          onClick={() => {
            HapticsService.tap()
            onToggleMute()
          }}
          className={`p-2 rounded-lg border transition-all ${
            isMuted
              ? 'bg-gray-800/80 border-gray-700 text-gray-400'
              : 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
          }`}
          aria-label={isMuted ? 'Activar audio' : 'Silenciar audio'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Botón de Pánico / SOS */}
        <button
          onClick={() => {
            HapticsService.tap()
            onTogglePanic()
          }}
          className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 border transition-all ${
            isPanicActive
              ? 'bg-red-600 text-white border-red-400 animate-pulse-danger shadow-[0_0_20px_#ff1e42]'
              : 'bg-red-950/60 hover:bg-red-900/80 border-red-500/50 text-red-300'
          }`}
          title="Botón de Pánico / Baliza de Auxilio"
        >
          <AlertTriangle className={`w-4 h-4 ${isPanicActive ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">AUXILIO</span> SOS
        </button>
      </div>
    </header>
  )
}
