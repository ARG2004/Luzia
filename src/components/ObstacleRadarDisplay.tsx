import React from 'react'
import { Footprints, AlertTriangle, Radio, Boxes, User, Zap, ScanText, AlertCircle } from 'lucide-react'
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
  const floorPercent = Math.round(analysis.floorDensity * 100)
  const frontalPercent = Math.round(analysis.frontalDensity * 100)

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
            ESCÁNER DE SUELO Y OBJETOS ALREDEDOR
          </h2>
        </div>

        {analysis.entityType === 'HUMAN' ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-400 text-black font-mono text-xs font-black shadow-[0_0_12px_rgba(34,211,238,0.7)]">
            <User className="w-3.5 h-3.5" />
            PERSONA DETECTADA
          </span>
        ) : analysis.entityType === 'CABLE' ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-black font-mono text-xs font-black animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.7)]">
            <Zap className="w-3.5 h-3.5" />
            CABLEADO EN SUELO
          </span>
        ) : analysis.entityType === 'SIGN' ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400 text-black font-mono text-xs font-black animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.7)]">
            <ScanText className="w-3.5 h-3.5" />
            LETRERO / SEÑAL
          </span>
        ) : analysis.entityType === 'OBJECT' ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500 text-black font-mono text-xs font-black animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.7)]">
            <AlertTriangle className="w-3.5 h-3.5" />
            {analysis.floorDensity >= analysis.frontalDensity ? 'OBJETO EN EL SUELO' : 'OBJETO / ESTRUCTURA'}
          </span>
        ) : analysis.entityType === 'UNCLEAR' || analysis.hasHazard ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-mono text-xs font-black animate-pulse shadow-[0_0_12px_rgba(250,204,21,0.7)]">
            <AlertCircle className="w-3.5 h-3.5" />
            ELEMENTO NO DETERMINADO
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-600/30 font-mono text-xs font-medium">
            ÁREA DESPEJADA
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
          BORDES NEÓN (SUELO + ENTORNO)
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
        <div className="sm:col-span-2 bg-black/40 rounded-xl p-3 border border-white/5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-gray-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              PROXIMIDAD SÓNAR / CADENCIA HÁPTICA
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

          {/* Sub-barras duales: Suelo vs Frente */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
            <div className="p-1.5 rounded bg-black/50 border border-emerald-500/20 flex justify-between items-center">
              <span className="text-emerald-400 flex items-center gap-1">
                <Footprints className="w-3 h-3" /> Suelo/Cables:
              </span>
              <span className="font-bold text-white">{floorPercent}%</span>
            </div>
            <div className="p-1.5 rounded bg-black/50 border border-cyan-500/20 flex justify-between items-center">
              <span className="text-cyan-400 flex items-center gap-1">
                <Boxes className="w-3 h-3" /> Objetos/Frente:
              </span>
              <span className="font-bold text-white">{frontalPercent}%</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-300 font-mono">
            {analysis.detectedDetails ||
              (analysis.hasHazard
                ? 'Pulsos de vibración y sónar activos. Reduzca velocidad al caminar.'
                : 'Superficie de suelo y entorno despejados de obstáculos.')}
          </p>
        </div>

        {/* Matriz Espacial Táctica (Profundidad + Dirección) */}
        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col justify-between space-y-2">
          {/* Fila 1: Profundidad (Adelante, Centro, Atrás) */}
          <div>
            <span className="text-[9px] font-mono text-gray-400 block mb-1">
              PROFUNDIDAD
            </span>
            <div className="grid grid-cols-3 gap-1">
              <div
                className={`py-1 rounded text-center font-mono text-[9px] font-bold border transition-all ${
                  analysis.spatialDepth === 'FRONT'
                    ? 'bg-red-500/30 border-red-400 text-red-200 shadow-[0_0_8px_#ff1e42]'
                    : 'bg-black/40 border-white/5 text-gray-600'
                }`}
              >
                ADELANTE
              </div>
              <div
                className={`py-1 rounded text-center font-mono text-[9px] font-bold border transition-all ${
                  analysis.spatialDepth === 'CENTER'
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_8px_#00f0ff]'
                    : 'bg-black/40 border-white/5 text-gray-600'
                }`}
              >
                CENTRO
              </div>
              <div
                className={`py-1 rounded text-center font-mono text-[9px] font-bold border transition-all ${
                  analysis.spatialDepth === 'BACK'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_8px_#ffaa00]'
                    : 'bg-black/40 border-white/5 text-gray-600'
                }`}
              >
                ATRÁS
              </div>
            </div>
          </div>

          {/* Fila 2: Dirección (Izquierda, Centro, Derecha) */}
          <div>
            <span className="text-[9px] font-mono text-gray-400 block mb-1">
              DIRECCIÓN
            </span>
            <div className="grid grid-cols-3 gap-1">
              <div
                className={`py-1 rounded text-center font-mono text-[9px] font-bold border transition-all ${
                  analysis.hazardZone === 'LEFT'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_8px_#ffaa00]'
                    : 'bg-black/40 border-white/5 text-gray-600'
                }`}
              >
                IZQ
              </div>
              <div
                className={`py-1 rounded text-center font-mono text-[9px] font-bold border transition-all ${
                  analysis.hazardZone === 'CENTER'
                    ? 'bg-red-500/30 border-red-400 text-red-200 shadow-[0_0_8px_#ff1e42]'
                    : 'bg-black/40 border-white/5 text-gray-600'
                }`}
              >
                CENTRO
              </div>
              <div
                className={`py-1 rounded text-center font-mono text-[9px] font-bold border transition-all ${
                  analysis.hazardZone === 'RIGHT'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_8px_#ffaa00]'
                    : 'bg-black/40 border-white/5 text-gray-600'
                }`}
              >
                DER
              </div>
            </div>
          </div>

          <span className="text-[10px] text-cyan-300 font-mono text-center block pt-0.5 truncate font-semibold">
            {analysis.entityType === 'NONE'
              ? 'Área libre'
              : `${analysis.spatialDepth === 'FRONT' ? 'ADELANTE' : analysis.spatialDepth === 'BACK' ? 'ATRÁS' : 'CENTRO'} • ${
                  analysis.hazardZone === 'LEFT' ? 'IZQUIERDA' : analysis.hazardZone === 'RIGHT' ? 'DERECHA' : 'CENTRO'
                }`}
          </span>
        </div>
      </div>
    </div>
  )
}
