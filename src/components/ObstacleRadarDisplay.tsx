import React from 'react'
import { Footprints, AlertTriangle, Radio } from 'lucide-react'
import type { ObstacleAnalysisResult, VisualFilterMode } from '../services/obstacleScanner'
import { HapticsService } from '../services/hapticsService'

interface ObstacleRadarDisplayProps {
  analysis: ObstacleAnalysisResult
  currentFilter: VisualFilterMode
  onSelectFilter: (mode: VisualFilterMode) => void
}

export const ObstacleRadarDisplay: React.FC<ObstacleRadarDisplayProps> = ({
  analysis,
  currentFilter,
  onSelectFilter,
}) => {
  const percentProximity = Math.round(analysis.proximityIndex * 100)

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-300 border ${
        analysis.hasHazard
          ? 'glass-panel-danger border-amber-500/80 shadow-[0_0_20px_rgba(255,170,0,0.3)]'
          : 'glass-panel border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Footprints
            className={`w-5 h-5 ${
              analysis.hasHazard ? 'text-amber-400 animate-pulse' : 'text-emerald-400'
            }`}
          />
          <h2 className="text-sm font-extrabold tracking-wide uppercase font-mono text-white">
            ESCÁNER DE CABLES Y DESNIVELES EN SUELO
          </h2>
        </div>

        {analysis.hasHazard ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-600 text-black font-mono text-xs font-black animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            OBSTÁCULO APROXIMÁNDOSE
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-600/30 font-mono text-xs font-medium">
            SUELO CONTINUO
          </span>
        )}
      </div>

      {/* Selector de Modos de Visión */}
      <div className="flex flex-wrap gap-1.5 mb-3 bg-black/40 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => {
            HapticsService.tap()
            onSelectFilter('NEON_EDGE')
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            currentFilter === 'NEON_EDGE'
              ? 'bg-[#00ff66]/20 border border-[#00ff66] text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          BORDES NEÓN (SUELO)
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            onSelectFilter('NIGHT_VISION')
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            currentFilter === 'NIGHT_VISION'
              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          VISIÓN NOCTURNA
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            onSelectFilter('HIGH_CONTRAST_MONO')
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            currentFilter === 'HIGH_CONTRAST_MONO'
              ? 'bg-white/20 border border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.4)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ALTO CONTRASTE (WCAG)
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            onSelectFilter('RAW')
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            currentFilter === 'RAW'
              ? 'bg-blue-500/20 border border-blue-400 text-blue-300'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ÓPTICA DIRECTA
        </button>
      </div>

      {/* Radar de Proximidad y Distribución Espacial */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Barra de Proximidad Sónar */}
        <div className="sm:col-span-2 bg-black/40 rounded-xl p-3 border border-white/5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-mono text-gray-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              CADENCIA HÁPTICA / PROXIMIDAD
            </span>
            <span
              className={`font-mono text-xs font-black ${
                analysis.hasHazard ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {percentProximity}%
            </span>
          </div>

          <div className="w-full h-3 bg-gray-950 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                percentProximity > 60
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 shadow-[0_0_12px_#ff1e42]'
                  : percentProximity > 25
                  ? 'bg-gradient-to-r from-emerald-500 to-amber-500 shadow-[0_0_10px_#ffaa00]'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${percentProximity}%` }}
            />
          </div>

          <p className="text-[11px] text-gray-400 font-mono mt-2">
            {analysis.hasHazard
              ? 'Pulsos de vibración de alta frecuencia activos. Reduzca velocidad al caminar.'
              : 'Superficie de suelo despejada de cables o desniveles detectables.'}
          </p>
        </div>

        {/* Zona de Peligro Direccional (Izquierda / Centro / Derecha) */}
        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-gray-400 block mb-1">
            ORIENTACIÓN DEL OBSTÁCULO
          </span>

          <div className="grid grid-cols-3 gap-1 py-1">
            <div
              className={`p-2 rounded text-center font-mono text-[10px] font-bold border transition-all ${
                analysis.hazardZone === 'LEFT'
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_10px_#ffaa00]'
                  : 'bg-black/40 border-white/5 text-gray-600'
              }`}
            >
              IZQ
            </div>
            <div
              className={`p-2 rounded text-center font-mono text-[10px] font-bold border transition-all ${
                analysis.hazardZone === 'CENTER'
                  ? 'bg-red-500/30 border-red-400 text-red-200 shadow-[0_0_10px_#ff1e42]'
                  : 'bg-black/40 border-white/5 text-gray-600'
              }`}
            >
              FRENTE
            </div>
            <div
              className={`p-2 rounded text-center font-mono text-[10px] font-bold border transition-all ${
                analysis.hazardZone === 'RIGHT'
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_10px_#ffaa00]'
                  : 'bg-black/40 border-white/5 text-gray-600'
              }`}
            >
              DER
            </div>
          </div>

          <span className="text-[10px] text-gray-500 font-mono text-center block">
            {analysis.hazardZone === 'NONE'
              ? 'Área libre'
              : `Alerta: Sector ${analysis.hazardZone}`}
          </span>
        </div>
      </div>
    </div>
  )
}
