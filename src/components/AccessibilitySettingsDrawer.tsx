import React from 'react'
import { X, Sliders, Vibrate, Volume2, Mic, Eye, ShieldAlert } from 'lucide-react'
import { HapticsService } from '../services/hapticsService'

interface AccessibilitySettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  isHapticEnabled: boolean
  onToggleHaptic: () => void
  isAudioEnabled: boolean
  onToggleAudio: () => void
  isTtsEnabled: boolean
  onToggleTts: () => void
  highSensitivityStrobe: boolean
  onToggleStrobeSensitivity: () => void
  onApplyProfile: (profile: 'LOW_VISION' | 'STROBE_CRITICAL' | 'SILENT_HAPTIC') => void
}

export const AccessibilitySettingsDrawer: React.FC<AccessibilitySettingsDrawerProps> = ({
  isOpen,
  onClose,
  isHapticEnabled,
  onToggleHaptic,
  isAudioEnabled,
  onToggleAudio,
  isTtsEnabled,
  onToggleTts,
  highSensitivityStrobe,
  onToggleStrobeSensitivity,
  onApplyProfile,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#0c101a] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <h2 className="text-base font-extrabold font-heading text-white tracking-wide uppercase">
              AJUSTES DE ACCESIBILIDAD Y SENSORES
            </h2>
          </div>
          <button
            onClick={() => {
              HapticsService.tap()
              onClose()
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Perfiles Rápidos de Accesibilidad */}
        <div className="mb-5">
          <span className="text-xs font-mono font-bold text-gray-400 uppercase block mb-2">
            PERFILES RÁPIDOS ADAPTATIVOS
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => {
                HapticsService.tap()
                onApplyProfile('LOW_VISION')
              }}
              className="p-3 rounded-xl bg-black/40 hover:bg-black/70 border border-emerald-500/40 text-left transition-all"
            >
              <Eye className="w-4 h-4 text-emerald-400 mb-1" />
              <div className="text-xs font-bold text-emerald-300 font-mono">BAJA VISIÓN</div>
              <div className="text-[10px] text-gray-400">Bordes neón + sónar</div>
            </button>

            <button
              onClick={() => {
                HapticsService.tap()
                onApplyProfile('STROBE_CRITICAL')
              }}
              className="p-3 rounded-xl bg-black/40 hover:bg-black/70 border border-red-500/40 text-left transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-red-400 mb-1" />
              <div className="text-xs font-bold text-red-300 font-mono">FOTOSENSIBLE</div>
              <div className="text-[10px] text-gray-400">Alerta anticipada</div>
            </button>

            <button
              onClick={() => {
                HapticsService.tap()
                onApplyProfile('SILENT_HAPTIC')
              }}
              className="p-3 rounded-xl bg-black/40 hover:bg-black/70 border border-cyan-500/40 text-left transition-all"
            >
              <Vibrate className="w-4 h-4 text-cyan-400 mb-1" />
              <div className="text-xs font-bold text-cyan-300 font-mono">SILENCIOSO</div>
              <div className="text-[10px] text-gray-400">100% vibración</div>
            </button>
          </div>
        </div>

        {/* Canales Sensoriales */}
        <div className="space-y-3 mb-5">
          <span className="text-xs font-mono font-bold text-gray-400 uppercase block">
            CANALES DE RETROALIMENTACIÓN SENSORIAL
          </span>

          {/* Háptico */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-3">
              <Vibrate className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-sm font-bold text-white">Motor de Vibración Háptica</div>
                <div className="text-xs text-gray-400">Pulsos mecánicos de alerta y proximidad</div>
              </div>
            </div>
            <button
              onClick={() => {
                HapticsService.tap()
                onToggleHaptic()
              }}
              className={`w-12 h-6 rounded-full transition-all p-0.5 ${
                isHapticEnabled ? 'bg-cyan-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-all ${
                  isHapticEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Audio Beeps */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-sm font-bold text-white">Beeps de Proximidad y Alarma</div>
                <div className="text-xs text-gray-400">Sónar acústico para cables y desniveles</div>
              </div>
            </div>
            <button
              onClick={() => {
                HapticsService.tap()
                onToggleAudio()
              }}
              className={`w-12 h-6 rounded-full transition-all p-0.5 ${
                isAudioEnabled ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-all ${
                  isAudioEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* TTS Voz */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-bold text-white">Voz Sintética Asistiva (TTS)</div>
                <div className="text-xs text-gray-400">Lectura instantánea de letreros de evacuación</div>
              </div>
            </div>
            <button
              onClick={() => {
                HapticsService.tap()
                onToggleTts()
              }}
              className={`w-12 h-6 rounded-full transition-all p-0.5 ${
                isTtsEnabled ? 'bg-amber-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-all ${
                  isTtsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sensibilidad Estroboscópica */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <div>
                <div className="text-sm font-bold text-white">Sensibilidad Fotosensible Alta</div>
                <div className="text-xs text-gray-400">
                  {highSensitivityStrobe
                    ? 'Rango ampliado (2 Hz - 35 Hz con umbral bajo)'
                    : 'Rango estándar clínico (3 Hz - 30 Hz)'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                HapticsService.tap()
                onToggleStrobeSensitivity()
              }}
              className={`w-12 h-6 rounded-full transition-all p-0.5 ${
                highSensitivityStrobe ? 'bg-red-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-all ${
                  highSensitivityStrobe ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            HapticsService.tap()
            onClose()
          }}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
        >
          GUARDAR Y CONTINUAR NAVEGACIÓN
        </button>
      </div>
    </div>
  )
}
