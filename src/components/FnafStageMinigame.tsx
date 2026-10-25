import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  RefreshCw,
  Lightbulb,
  Video,
  Shield,
  Eye,
  EyeOff,
  Scan,
  Volume2,
  VolumeX,
  Play,
  Pause,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { AudioFeedbackService } from '../services/audioFeedbackService'
import { HapticsService } from '../services/hapticsService'
import { TtsService } from '../services/ttsService'

interface FnafStageMinigameProps {
  isStrobeAlert?: boolean
  hasObstacleAlert?: boolean
  strobeHz?: number
  onTriggerSimulatedSign?: (text: string) => void
  onToggleRealCamera?: () => void
  isRealCameraActive?: boolean
}

type CameraId = 'CAM_1A' | 'CAM_1B' | 'HAPPIEST_DAY' | 'CAM_2B'
type HazardZone = 'NONE' | 'LEFT' | 'CENTER' | 'RIGHT'

interface HazardObstacle {
  id: string
  name: string
  x: number // 0 - 100 percentage
  y: number // 0 - 100 percentage
  width: number
  height: number
  type: 'CABLE' | 'DEBRIS' | 'STAGE_EDGE' | 'CAKE'
  description: string
}

interface SignTarget {
  id: string
  x: number
  y: number
  text: string
  label: string
}

// Static hazards definitions per room outside component to avoid re-creations
const HAZARDS_BY_CAM: Record<CameraId, HazardObstacle[]> = {
  CAM_1A: [
    { id: 'c1', name: 'Cable de Alta Tensión', x: 26, y: 74, width: 14, height: 5, type: 'CABLE', description: 'Cable de amplificador expuesto' },
    { id: 'c2', name: 'Caja de Bocina', x: 74, y: 76, width: 10, height: 6, type: 'DEBRIS', description: 'Bocina de retorno en suelo' },
    { id: 'c3', name: 'Borde de Tarima', x: 50, y: 64, width: 40, height: 4, type: 'STAGE_EDGE', description: 'Desnivel de 30cm del escenario' },
  ],
  CAM_2B: [
    { id: 'h1', name: 'Mazo de Cables 220V', x: 34, y: 72, width: 18, height: 4, type: 'CABLE', description: 'Cables de iluminación colapsados' },
    { id: 'h2', name: 'Señal Suelo Húmedo', x: 64, y: 80, width: 8, height: 6, type: 'DEBRIS', description: 'Cono de limpieza caído' },
  ],
  CAM_1B: [
    { id: 'd1', name: 'Cable Micrófono 1983', x: 42, y: 78, width: 16, height: 4, type: 'CABLE', description: 'Cableado antiguo degradado' },
    { id: 'd2', name: 'Caja Registradora', x: 78, y: 72, width: 10, height: 6, type: 'DEBRIS', description: 'Mobiliario fuera de lugar' },
  ],
  HAPPIEST_DAY: [
    { id: 'k1', name: 'Pastel de Cumpleaños', x: 50, y: 72, width: 12, height: 8, type: 'CAKE', description: 'Mesa de celebración segura' },
  ],
}

// Static sign targets per room for OCR reading
const SIGNS_BY_CAM: Record<CameraId, SignTarget[]> = {
  CAM_1A: [
    { id: 's1', x: 88, y: 68, text: 'SALIDA DE EMERGENCIA A ESCENARIO', label: 'PUERTA LATERAL' },
  ],
  CAM_2B: [
    { id: 's2', x: 86, y: 56, text: 'SALIDA DE EMERGENCIA - RUTA EVACUACIÓN', label: 'SEÑAL LUMINOSA' },
  ],
  CAM_1B: [
    { id: 's3', x: 86, y: 62, text: 'PUERTA DE SERVICIO Y ARCHIVO HISTORICO', label: 'ACCESO RESTRINGIDO' },
  ],
  HAPPIEST_DAY: [
    { id: 's4', x: 14, y: 68, text: 'EXIT - RUTA LIBERADA DE SEGURIDAD', label: 'SALIDA HAPPIEST DAY' },
  ],
}

// Waypoints per room for autonomous AI simulation
const WAYPOINTS_BY_CAM: Record<CameraId, { x: number; y: number; action?: 'SCAN' | 'SHIELD' | 'SWITCH' }[]> = {
  CAM_1A: [
    { x: 30, y: 82 },
    { x: 26, y: 76 },
    { x: 42, y: 86 },
    { x: 60, y: 78 },
    { x: 50, y: 72, action: 'SHIELD' },
    { x: 82, y: 70 },
    { x: 88, y: 68, action: 'SCAN' },
    { x: 50, y: 84, action: 'SWITCH' },
  ],
  CAM_2B: [
    { x: 36, y: 74 },
    { x: 48, y: 84 },
    { x: 70, y: 76 },
    { x: 84, y: 58, action: 'SCAN' },
    { x: 50, y: 84, action: 'SWITCH' },
  ],
  CAM_1B: [
    { x: 40, y: 78 },
    { x: 60, y: 82 },
    { x: 84, y: 64, action: 'SCAN' },
    { x: 50, y: 84, action: 'SWITCH' },
  ],
  HAPPIEST_DAY: [
    { x: 48, y: 74 },
    { x: 20, y: 70 },
    { x: 14, y: 68, action: 'SCAN' },
    { x: 50, y: 84, action: 'SWITCH' },
  ],
}

export const FnafStageMinigame: React.FC<FnafStageMinigameProps> = ({
  isStrobeAlert = false,
  hasObstacleAlert = false,
  strobeHz = 0,
  onTriggerSimulatedSign,
  onToggleRealCamera,
  isRealCameraActive = false,
}) => {
  // Navigation & View
  const [activeCam, setActiveCam] = useState<CameraId>('CAM_1A')
  const [isFlickering, setIsFlickering] = useState(false)
  const [animatronicTwitch, setAnimatronicTwitch] = useState(false)
  const [stageLightsOn, setStageLightsOn] = useState(true)

  // Game Engine State
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 78 })
  const [, setPlayerFacing] = useState<'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>('UP')
  const [isWalking, setIsWalking] = useState(false)
  const [isShieldingEyes, setIsShieldingEyes] = useState(false)
  const [isAssistiveVision, setIsAssistiveVision] = useState(true) // Sobel/Neon Edge AI Filter
  const [isAutoPilot, setIsAutoPilot] = useState(false) // Autonomous AI Demo Mode
  const [isMuted, setIsMuted] = useState(false)

  // Real-time Hazard Tracking
  const [closestHazardDist, setClosestHazardDist] = useState<number | null>(null)
  const [hazardDirection, setHazardDirection] = useState<HazardZone>('NONE')
  const [nearbySign, setNearbySign] = useState<SignTarget | null>(null)
  const [isScanningSign, setIsScanningSign] = useState(false)
  const [simulatedStrobeActive, setSimulatedStrobeActive] = useState(false)

  // Gamification & Telemetry Metrics
  const [stats, setStats] = useState({
    obstaclesAvoided: 0,
    strobesPrevented: 0,
    signsScanned: 0,
    stepsCount: 0,
  })

  // Autonomous Waypoint tracking
  const autoPilotIndexRef = useRef(0)
  const autoPilotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Key tracking state
  const keysPressed = useRef<{ [key: string]: boolean }>({})

  // Initialize Speech Services
  useEffect(() => {
    TtsService.init()
  }, [])

  // Switch camera with retro static sound
  const switchCam = useCallback((cam: CameraId) => {
    setActiveCam(cam)
    AudioFeedbackService.playCameraSwitchStatic()
    HapticsService.tap()
    setIsFlickering(true)
    setTimeout(() => setIsFlickering(false), 220)
    // Reset player position closer to entry in new room
    setPlayerPos({ x: 50, y: 84 })
    autoPilotIndexRef.current = 0
  }, [])

  // Toggle Mute
  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    AudioFeedbackService.setMuted(next)
    HapticsService.tap()
  }

  // Toggle Simulated Strobe
  const toggleSimulatedStrobe = () => {
    const next = !simulatedStrobeActive
    setSimulatedStrobeActive(next)
    if (next) {
      AudioFeedbackService.playStrobeAlarm()
      HapticsService.strobeWarning()
      TtsService.speak('Alerta: Parpadeo estroboscópico detectado en escenario. Desvíe la mirada.')
    }
  }

  // Check if any strobe is firing (external prop or local toggle)
  const activeStrobe = isStrobeAlert || simulatedStrobeActive
  const effectiveHz = strobeHz > 0 ? strobeHz : (activeStrobe ? 14 : 0)

  // Strobe flicker / twitch effect
  useEffect(() => {
    if (!activeStrobe) return

    const interval = setInterval(() => {
      setAnimatronicTwitch((prev) => !prev)
    }, 85)

    return () => {
      clearInterval(interval)
    }
  }, [activeStrobe])

  // ==============================================================
  // BACKEND REAL-TIME PHYSICS & SENSORY PROXIMITY ENGINE
  // ==============================================================
  const evaluateSensoryProximity = useCallback((px: number, py: number) => {
    const currentHazards = HAZARDS_BY_CAM[activeCam] || []
    let minDistance = 999
    let targetHazard: HazardObstacle | null = null

    for (const h of currentHazards) {
      // Euclidean distance in percentage units
      const dx = px - (h.x + h.width / 2)
      const dy = py - (h.y + h.height / 2)
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDistance) {
        minDistance = dist
        targetHazard = h
      }
    }

    // Detection threshold: within 24 units (~ 1.5 - 2.0 meters scale)
    if (targetHazard && minDistance < 24) {
      setClosestHazardDist(minDistance)
      const dx = (targetHazard.x + targetHazard.width / 2) - px
      const dir: HazardZone = dx < -5 ? 'LEFT' : dx > 5 ? 'RIGHT' : 'CENTER'
      setHazardDirection(dir)

      // Intensity from 0 (edge of radar 24 units) to 1 (contact at 4 units)
      const intensity = Math.max(0.1, Math.min(1.0, 1 - (minDistance / 24)))
      AudioFeedbackService.playObstacleProximityBeep(intensity, dir)
      HapticsService.obstaclePulse(intensity)

      // If extremely close, record hazard avoided
      if (minDistance < 10) {
        setStats(prev => ({ ...prev, obstaclesAvoided: prev.obstaclesAvoided + 1 }))
      }
    } else {
      setClosestHazardDist(null)
      setHazardDirection('NONE')
    }

    // Check OCR Sign proximity (within 16 units)
    const currentSigns = SIGNS_BY_CAM[activeCam] || []
    const sign = currentSigns.find(s => {
      const dist = Math.sqrt(Math.pow(px - s.x, 2) + Math.pow(py - s.y, 2))
      return dist < 16
    })

    setNearbySign(sign || null)
  }, [activeCam])

  // Move Player Function with boundary constraints
  const movePlayer = useCallback((dx: number, dy: number, facing: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    setPlayerFacing(facing)
    setIsWalking(true)

    setPlayerPos(prev => {
      // Constrain inside playable floor: X: 8 to 92, Y: 56 to 92
      const newX = Math.max(8, Math.min(92, prev.x + dx))
      const newY = Math.max(56, Math.min(92, prev.y + dy))

      // Trigger sensory calculations
      evaluateSensoryProximity(newX, newY)

      return { x: newX, y: newY }
    })

    setStats(prev => ({ ...prev, stepsCount: prev.stepsCount + 1 }))
  }, [evaluateSensoryProximity])

  // Trigger OCR scan on the nearby sign
  const handlePerformOcrScan = useCallback(() => {
    if (!nearbySign || isScanningSign) return

    setIsScanningSign(true)
    AudioFeedbackService.playSuccessChime()
    HapticsService.signDetected()

    const scanText = nearbySign.text
    TtsService.speak(`Lectura de visión asistida: ${scanText}. Ruta despejada.`, true)
    onTriggerSimulatedSign?.(scanText)

    setStats(prev => ({ ...prev, signsScanned: prev.signsScanned + 1 }))

    setTimeout(() => {
      setIsScanningSign(false)
    }, 1800)
  }, [nearbySign, isScanningSign, onTriggerSimulatedSign])

  // Trigger Desviar Mirada (Shielding Eyes from Strobe)
  const handleShieldAction = useCallback(() => {
    setIsShieldingEyes(true)
    HapticsService.tap()
    if (activeStrobe) {
      setStats(prev => ({ ...prev, strobesPrevented: prev.strobesPrevented + 1 }))
      TtsService.speak('Protección activada. Mirada desviada del estrobo con éxito.')
    }
    setTimeout(() => {
      setIsShieldingEyes(false)
    }, 1400)
  }, [activeStrobe])

  // ==============================================================
  // AUTONOMOUS SIMULATION ENGINE (AUTO-PILOT WALKTHROUGH)
  // ==============================================================
  useEffect(() => {
    if (!isAutoPilot) {
      if (autoPilotTimerRef.current) clearInterval(autoPilotTimerRef.current)
      return
    }

    const currentWaypoints = WAYPOINTS_BY_CAM[activeCam] || WAYPOINTS_BY_CAM.CAM_1A

    autoPilotTimerRef.current = setInterval(() => {
      const idx = autoPilotIndexRef.current
      if (idx >= currentWaypoints.length) {
        autoPilotIndexRef.current = 0
        return
      }

      const wp = currentWaypoints[idx]
      setPlayerPos(prev => {
        // Smoothly interpolate towards waypoint
        const dx = (wp.x - prev.x) * 0.28
        const dy = (wp.y - prev.y) * 0.28
        const nextX = Math.abs(wp.x - prev.x) < 2 ? wp.x : prev.x + dx
        const nextY = Math.abs(wp.y - prev.y) < 2 ? wp.y : prev.y + dy

        const facing = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'RIGHT' : 'LEFT')
          : (dy > 0 ? 'DOWN' : 'UP')
        setPlayerFacing(facing)
        setIsWalking(true)

        evaluateSensoryProximity(nextX, nextY)

        // Check if reached waypoint
        if (Math.hypot(nextX - wp.x, nextY - wp.y) < 3) {
          if (wp.action === 'SCAN') {
            handlePerformOcrScan()
          } else if (wp.action === 'SHIELD') {
            handleShieldAction()
          } else if (wp.action === 'SWITCH') {
            const camOrder: CameraId[] = ['CAM_1A', 'CAM_2B', 'HAPPIEST_DAY', 'CAM_1B']
            const nextIdx = (camOrder.indexOf(activeCam) + 1) % camOrder.length
            switchCam(camOrder[nextIdx])
            return { x: 50, y: 84 }
          }
          autoPilotIndexRef.current = (idx + 1) % currentWaypoints.length
        }

        return { x: nextX, y: nextY }
      })
    }, 180)

    return () => {
      if (autoPilotTimerRef.current) clearInterval(autoPilotTimerRef.current)
    }
  }, [isAutoPilot, activeCam, evaluateSensoryProximity, handleShieldAction, handlePerformOcrScan, switchCam])

  // ==============================================================
  // KEYBOARD INPUT ENGINE (WASD, ARROWS, SPACE, E, Q)
  // ==============================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      keysPressed.current[e.key.toLowerCase()] = true

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        handleShieldAction()
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault()
        handlePerformOcrScan()
      } else if (e.key.toLowerCase() === 'q') {
        e.preventDefault()
        setIsAssistiveVision(prev => !prev)
        AudioFeedbackService.playCameraSwitchStatic()
        HapticsService.tap()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false
      const isAnyMove = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(
        k => keysPressed.current[k]
      )
      if (!isAnyMove) {
        setIsWalking(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const loopInterval = setInterval(() => {
      if (isAutoPilot) return

      const speed = 2.2
      const kp = keysPressed.current
      if (kp['w'] || kp['arrowup']) movePlayer(0, -speed, 'UP')
      else if (kp['s'] || kp['arrowdown']) movePlayer(0, speed, 'DOWN')
      else if (kp['a'] || kp['arrowleft']) movePlayer(-speed, 0, 'LEFT')
      else if (kp['d'] || kp['arrowright']) movePlayer(speed, 0, 'RIGHT')
    }, 45)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearInterval(loopInterval)
    }
  }, [isAutoPilot, movePlayer, handleShieldAction, handlePerformOcrScan])

  // Current room hazards & signs
  const currentHazards = useMemo(() => HAZARDS_BY_CAM[activeCam] || [], [activeCam])
  const currentSigns = useMemo(() => SIGNS_BY_CAM[activeCam] || [], [activeCam])

  // Combine local or parent obstacle alerts
  const isFloorHazardActive = hasObstacleAlert || (closestHazardDist !== null && closestHazardDist < 20)

  return (
    <div className="w-full bg-[#090815] border-4 border-[#3c3468] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.95)] relative font-crt select-none">
      {/* ============================================================== */}
      {/* TOP CRT CONTROLS & CAMERA SELECTOR */}
      {/* ============================================================== */}
      <div className="bg-[#06050e] px-3 sm:px-4 py-2 border-b-4 border-[#3c3468] flex flex-wrap items-center justify-between text-xs text-green-400 gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-1.5 font-pixel text-[10px] sm:text-xs text-[#00ff66]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
            LIVE SIM
          </span>
          <span className="font-pixel text-[9px] sm:text-[11px] text-white bg-[#191536] px-2 py-1 rounded border border-[#483e7e] flex items-center gap-1">
            {activeCam === 'CAM_1A' && 'CAM 1A - SHOW STAGE'}
            {activeCam === 'CAM_2B' && 'CAM 2B - WEST HALLWAY (CABLES)'}
            {activeCam === 'HAPPIEST_DAY' && 'MINIGAME: HAPPIEST DAY'}
            {activeCam === 'CAM_1B' && 'CAM 1B - FREDBEAR DINER 1983'}
          </span>
        </div>

        {/* Cam selectors */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => switchCam('CAM_1A')}
            className={`px-2 py-1 font-pixel text-[9px] rounded border transition-all ${
              activeCam === 'CAM_1A'
                ? 'bg-green-500/25 text-green-300 border-green-400 shadow-[0_0_10px_#00ff66]'
                : 'bg-black/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            CAM 1A
          </button>
          <button
            onClick={() => switchCam('CAM_2B')}
            className={`px-2 py-1 font-pixel text-[9px] rounded border transition-all ${
              activeCam === 'CAM_2B'
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-[0_0_10px_#22d3ee]'
                : 'bg-black/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            CAM 2B
          </button>
          <button
            onClick={() => switchCam('HAPPIEST_DAY')}
            className={`px-2 py-1 font-pixel text-[9px] rounded border transition-all ${
              activeCam === 'HAPPIEST_DAY'
                ? 'bg-purple-500/25 text-purple-300 border-purple-400 shadow-[0_0_10px_#c084fc]'
                : 'bg-black/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            HAPPIEST DAY
          </button>
          <button
            onClick={() => switchCam('CAM_1B')}
            className={`px-2 py-1 font-pixel text-[9px] rounded border transition-all ${
              activeCam === 'CAM_1B'
                ? 'bg-amber-500/25 text-amber-300 border-amber-400 shadow-[0_0_10px_#f59e0b]'
                : 'bg-black/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            CAM 1B
          </button>

          {onToggleRealCamera && (
            <button
              onClick={() => {
                AudioFeedbackService.playCameraSwitchStatic()
                HapticsService.tap()
                onToggleRealCamera()
              }}
              className={`px-2 py-1 font-pixel text-[9px] rounded border transition-all flex items-center gap-1 ${
                isRealCameraActive
                  ? 'bg-red-500/30 text-red-200 border-red-500 animate-pulse'
                  : 'bg-blue-950/60 text-blue-300 border-blue-600/50 hover:bg-blue-900/60'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>{isRealCameraActive ? '8-BIT' : 'WEBCAM'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECONDARY INNOVATION BAR: MODES & ASSISTIVE SENSORS */}
      {/* ============================================================== */}
      <div className="bg-[#121024] px-3 sm:px-4 py-1.5 border-b-2 border-[#2b254c] flex flex-wrap items-center justify-between text-[10px] text-gray-300 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Toggle: Manual vs Auto Simulation */}
          <button
            onClick={() => {
              const next = !isAutoPilot
              setIsAutoPilot(next)
              AudioFeedbackService.playSuccessChime()
              HapticsService.tap()
              TtsService.speak(next ? 'Modo simulación autónoma activado. El agente inteligente navegará el entorno.' : 'Modo control manual activado.')
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-pixel text-[9px] border transition-all ${
              isAutoPilot
                ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_#06b6d4]'
                : 'bg-black/60 text-gray-300 border-gray-700 hover:text-white'
            }`}
          >
            {isAutoPilot ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
            <span>{isAutoPilot ? 'SIMULACIÓN AUTÓNOMA (ON)' : 'CONTROL MANUAL (WASD)'}</span>
          </button>

          {/* Luzía Assistive Edge Vision Filter (Neon vs Realistic Penumbra) */}
          <button
            onClick={() => {
              setIsAssistiveVision(prev => !prev)
              AudioFeedbackService.playCameraSwitchStatic()
              HapticsService.tap()
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-pixel text-[9px] border transition-all ${
              isAssistiveVision
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 shadow-[0_0_10px_#10b981]'
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            {isAssistiveVision ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-gray-400" />}
            <span>{isAssistiveVision ? 'VISIÓN LUZÍA: SOBEL ON' : 'PENUMBRA REALISTA'}</span>
          </button>

          {/* Simulated Strobe Test Button */}
          <button
            onClick={toggleSimulatedStrobe}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-pixel text-[9px] border transition-all ${
              activeStrobe
                ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-[0_0_15px_#ef4444]'
                : 'bg-black/60 text-amber-300 border-amber-600/60 hover:bg-amber-950/40'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{activeStrobe ? `ESTROBO ${effectiveHz}Hz (PELIGRO)` : 'SIMULAR ESTROBO 14Hz'}</span>
          </button>
        </div>

        {/* Audio Mute & Telemetry Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1 rounded bg-black/60 border border-gray-700 text-gray-400 hover:text-white"
            title={isMuted ? 'Activar Sonido Sónar' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-green-400" />}
          </button>
          <div className="hidden sm:flex items-center gap-1.5 font-pixel text-[9px] bg-black/80 px-2 py-0.5 rounded border border-[#3b3464] text-cyan-300">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            <span>RADAR SÓNAR 3D ACTIVO</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN 8-BIT INTERACTIVE SIMULATION STAGE (CANVAS CONTAINER) */}
      {/* ============================================================== */}
      <div className={`relative w-full aspect-[16/9] min-h-[360px] sm:min-h-[460px] bg-[#120f24] overflow-hidden select-none ${
        activeStrobe && !isShieldingEyes ? 'animate-[pulse_0.07s_infinite]' : ''
      }`}>
        {/* CRT Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none z-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-75" />

        {/* Static CRT Flash on Switch */}
        {isFlickering && (
          <div className="absolute inset-0 bg-white/30 z-40 pointer-events-none animate-pulse" />
        )}

        {/* Strobe Danger Red Vignette Flash */}
        {activeStrobe && (
          <div className={`absolute inset-0 z-20 pointer-events-none border-[12px] border-red-600/60 shadow-[inset_0_0_60px_#ef4444] ${
            isShieldingEyes ? 'opacity-30' : 'opacity-90 animate-pulse'
          }`} />
        )}

        {/* Realistic Darkness Penumbra Layer when Assistive Vision is OFF */}
        {(!isAssistiveVision || !stageLightsOn) && (
          <div className="absolute inset-0 bg-black/75 z-10 pointer-events-none transition-opacity duration-300 flex items-center justify-center">
            {/* Flashlight Beam centered on player */}
            <div
              className="absolute w-44 h-44 rounded-full bg-cyan-400/20 blur-xl pointer-events-none transition-all duration-75"
              style={{ left: `${playerPos.x}%`, top: `${playerPos.y}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* ROOM 1: CAM 1A - SHOW STAGE */}
        {/* ============================================================== */}
        {activeCam === 'CAM_1A' && (
          <div className="absolute inset-0 flex flex-col justify-end bg-[#141126]">
            {/* Dark Checkerboard Floor */}
            <div
              className={`absolute inset-x-0 bottom-0 h-[68%] z-0 transition-all ${
                isAssistiveVision ? 'brightness-125 contrast-125' : 'brightness-75'
              }`}
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #0a0a0f 25%, transparent 25%), 
                  linear-gradient(-45deg, #0a0a0f 25%, transparent 25%), 
                  linear-gradient(45deg, transparent 75%, #0a0a0f 75%), 
                  linear-gradient(-45deg, transparent 75%, #0a0a0f 75%)
                `,
                backgroundColor: '#1b1b26',
                backgroundSize: '42px 42px',
                backgroundPosition: '0 0, 0 21px, 21px -21px, -21px 0px',
              }}
            />

            {/* Animatronics Stage on Top Center */}
            <div className="absolute top-4 inset-x-0 flex flex-col items-center pointer-events-none z-5">
              <div className="flex items-end justify-center gap-8 sm:gap-14 pb-1">
                {/* Bonnie */}
                <div className={`flex flex-col items-center transition-transform ${animatronicTwitch ? 'translate-x-1 rotate-2' : ''}`}>
                  <svg width="68" height="105" viewBox="0 0 28 44" className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] [image-rendering:pixelated]">
                    <rect x="5" y="0" width="4" height="11" fill="#1b7899" />
                    <rect x="19" y="0" width="4" height="11" fill="#1b7899" />
                    <rect x="4" y="9" width="20" height="14" fill="#1b7899" />
                    <rect x="7" y="12" width="4" height="3" fill="#051520" />
                    <rect x="8" y="13" width="2" height="2" fill="#d9385b" />
                    <rect x="17" y="12" width="4" height="3" fill="#051520" />
                    <rect x="18" y="13" width="2" height="2" fill="#d9385b" />
                    <rect x="9" y="17" width="10" height="5" fill="#125770" />
                    <rect x="10" y="23" width="8" height="3" fill="#b02626" />
                    <rect x="6" y="25" width="16" height="12" fill="#1b7899" />
                  </svg>
                  <span className="font-pixel text-[8px] text-cyan-300">BONNIE</span>
                </div>

                {/* Freddy Fazbear */}
                <div className={`flex flex-col items-center transition-transform ${animatronicTwitch ? '-translate-y-1' : ''}`}>
                  <svg width="74" height="112" viewBox="0 0 30 46" className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.95)] [image-rendering:pixelated]">
                    <rect x="11" y="0" width="8" height="7" fill="#141414" />
                    <rect x="9" y="6" width="12" height="2" fill="#292929" />
                    <rect x="3" y="7" width="5" height="5" fill="#755010" />
                    <rect x="22" y="7" width="5" height="5" fill="#755010" />
                    <rect x="5" y="9" width="20" height="14" fill="#916416" />
                    <rect x="8" y="12" width="4" height="3" fill="#111111" />
                    <rect x="9" y="13" width="2" height="2" fill={activeStrobe ? '#ef4444' : '#ffffff'} />
                    <rect x="18" y="12" width="4" height="3" fill="#111111" />
                    <rect x="19" y="13" width="2" height="2" fill={activeStrobe ? '#ef4444' : '#ffffff'} />
                    <rect x="8" y="17" width="14" height="5" fill="#5e410f" />
                    <rect x="11" y="24" width="8" height="3" fill="#141414" />
                    <rect x="6" y="26" width="18" height="13" fill="#916416" />
                  </svg>
                  <span className="font-pixel text-[8px] text-amber-300">FREDDY</span>
                </div>

                {/* Chica */}
                <div className={`flex flex-col items-center transition-transform ${animatronicTwitch ? '-translate-x-1 rotate-1' : ''}`}>
                  <svg width="70" height="105" viewBox="0 0 28 44" className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] [image-rendering:pixelated]">
                    <rect x="12" y="2" width="4" height="6" fill="#c49012" />
                    <rect x="4" y="8" width="20" height="14" fill="#cca31a" />
                    <rect x="7" y="12" width="4" height="3" fill="#120520" />
                    <rect x="8" y="13" width="2" height="2" fill="#b03ad4" />
                    <rect x="17" y="12" width="4" height="3" fill="#120520" />
                    <rect x="18" y="13" width="2" height="2" fill="#b03ad4" />
                    <rect x="9" y="17" width="10" height="4" fill="#c95710" />
                    <rect x="7" y="23" width="14" height="5" fill="#f5f5f5" />
                    <rect x="6" y="25" width="16" height="11" fill="#cca31a" />
                  </svg>
                  <span className="font-pixel text-[8px] text-yellow-300">CHICA</span>
                </div>
              </div>

              {/* Stage Platform Base */}
              <div className="w-[86%] max-w-xl h-8 bg-[#444249] border-t-4 border-[#6e6b76] border-b-2 border-[#201e22] rounded-sm flex items-center justify-around px-4">
                <div className="w-8 h-2 bg-[#252427] rounded-sm" />
                <div className="w-8 h-2 bg-[#252427] rounded-sm" />
                <div className="w-8 h-2 bg-[#252427] rounded-sm" />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ROOM 2: CAM 2B - WEST HALL (CABLES AND DESNIVELES) */}
        {/* ============================================================== */}
        {activeCam === 'CAM_2B' && (
          <div className="absolute inset-0 bg-[#0c0a18] flex flex-col justify-between overflow-hidden">
            {/* Ceiling fluorescent lamps with potential strobe flicker */}
            <div className="w-full flex justify-around pt-2 z-5">
              <div className={`w-32 h-2 rounded bg-white shadow-[0_0_15px_#ffffff] ${activeStrobe ? 'animate-ping' : 'opacity-80'}`} />
              <div className={`w-32 h-2 rounded bg-white shadow-[0_0_15px_#ffffff] ${activeStrobe ? 'animate-ping' : 'opacity-80'}`} />
            </div>

            {/* Hallway Perspective lines */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#1a162b] to-black" />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ROOM 3: HAPPIEST DAY */}
        {/* ============================================================== */}
        {activeCam === 'HAPPIEST_DAY' && (
          <div className="absolute inset-0 bg-[#080712] flex flex-col justify-between p-4 overflow-hidden">
            {/* Balloons Floating */}
            <div className="w-full flex justify-around items-center pt-2 z-5 pointer-events-none">
              <div className="w-4 h-6 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-bounce" />
              <div className="w-4 h-6 rounded-full bg-yellow-400 shadow-[0_0_10px_#facc15] animate-bounce [animation-delay:0.2s]" />
              <div className="w-4 h-6 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-bounce [animation-delay:0.4s]" />
              <div className="w-4 h-6 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-bounce [animation-delay:0.1s]" />
              <div className="w-4 h-6 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7] animate-bounce [animation-delay:0.5s]" />
            </div>

            {/* Kids with Masks */}
            <div className="absolute right-12 bottom-16 flex items-end gap-2 pointer-events-none opacity-90">
              <div className="w-4 h-10 bg-gray-500 rounded-t-sm flex flex-col items-center">
                <div className="w-3 h-3 bg-gray-200 rounded-full" />
              </div>
              <div className="w-4 h-10 bg-gray-500 rounded-t-sm flex flex-col items-center">
                <div className="w-3 h-3 bg-gray-200 rounded-full" />
              </div>
              <div className="w-4 h-12 bg-black border border-white rounded-t-sm flex flex-col items-center">
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ROOM 4: CAM 1B - FREDBEAR DINER 1983 */}
        {/* ============================================================== */}
        {activeCam === 'CAM_1B' && (
          <div className="absolute inset-0 bg-[#161228] flex flex-col justify-between overflow-hidden">
            {/* Streamers */}
            <div className="w-full h-8 flex justify-around items-start pt-1 z-5 pointer-events-none">
              <div className="w-16 h-10 border-b-4 border-dashed border-red-500 rounded-b-full opacity-80" />
              <div className="w-20 h-10 border-b-4 border-dashed border-amber-400 rounded-b-full opacity-80" />
              <div className="w-16 h-10 border-b-4 border-dashed border-purple-500 rounded-b-full opacity-80" />
            </div>
            {/* Spring Bonnie & Fredbear */}
            <div className="absolute top-8 left-16 flex items-end gap-4 pointer-events-none opacity-85">
              <div className="w-12 h-20 bg-[#ba8f23] rounded-t-md flex flex-col items-center p-1">
                <span className="font-pixel text-[7px] text-white">S.BONNIE</span>
              </div>
              <div className="w-14 h-22 bg-[#966b12] rounded-t-md flex flex-col items-center p-1">
                <span className="font-pixel text-[7px] text-purple-300">FREDBEAR</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* DYNAMIC HAZARDS RENDERER (CABLES, DEBRIS, STAGES) */}
        {/* ============================================================== */}
        {currentHazards.map((h) => {
          const isTargeted = closestHazardDist !== null && closestHazardDist < 20
          return (
            <div
              key={h.id}
              className={`absolute z-10 transition-transform ${
                isAssistiveVision
                  ? 'border-2 border-red-500 bg-red-600/30 shadow-[0_0_15px_#ef4444]'
                  : 'bg-[#18161f] border border-gray-700/60'
              } rounded flex items-center justify-center`}
              style={{
                left: `${h.x}%`,
                top: `${h.y}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Cable visual pattern */}
              {h.type === 'CABLE' && (
                <div className="w-full h-1 bg-red-500/90 rounded-full animate-pulse flex items-center justify-between px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                </div>
              )}

              {/* Cake visual pattern in Happiest Day */}
              {h.type === 'CAKE' && (
                <div className="flex flex-col items-center">
                  <div className="flex gap-1 mb-0.5">
                    <span className="w-1 h-2 bg-yellow-400 animate-pulse" />
                    <span className="w-1 h-2 bg-yellow-400 animate-pulse" />
                  </div>
                  <div className="w-8 h-3 bg-pink-500 border border-pink-300 rounded-t-sm" />
                </div>
              )}

              {/* Assistive Label when Luzía Vision is active */}
              {isAssistiveVision && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-pixel text-[8px] bg-red-950/90 text-red-300 px-1.5 py-0.5 rounded border border-red-500 whitespace-nowrap shadow-[0_0_8px_#ef4444]">
                  ⚠️ {h.name}
                </span>
              )}

              {/* Ping Ring if user is within detection range */}
              {isTargeted && (
                <div className="absolute inset-0 border-2 border-yellow-400 rounded-full animate-ping pointer-events-none" />
              )}
            </div>
          )
        })}

        {/* ============================================================== */}
        {/* INTERACTIVE OCR SIGNAGE TARGETS */}
        {/* ============================================================== */}
        {currentSigns.map((s) => {
          const isNearby = nearbySign?.id === s.id
          return (
            <div
              key={s.id}
              onClick={handlePerformOcrScan}
              className={`absolute z-15 cursor-pointer transition-all ${
                isNearby
                  ? 'scale-110 border-2 border-[#00ff66] bg-[#0b3818] shadow-[0_0_20px_#00ff66] animate-bounce'
                  : 'border border-gray-500 bg-black/80'
              } px-2 py-1 rounded text-center`}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="font-pixel text-[8px] text-white tracking-wider block">
                {s.label}
              </span>
              <span className="font-crt text-[9px] text-[#00ff66] flex items-center justify-center gap-1">
                <Scan className="w-3 h-3" />
                {isNearby ? 'PULSA [E] O CLICK' : 'OCR DETECTABLE'}
              </span>

              {/* Scan Reticle Animation when scanning */}
              {isScanningSign && isNearby && (
                <div className="absolute inset-0 border-2 border-cyan-400 rounded bg-cyan-500/20 animate-pulse flex items-center justify-center">
                  <div className="w-full h-0.5 bg-cyan-300 shadow-[0_0_8px_#22d3ee] animate-[bounce_1s_infinite]" />
                </div>
              )}
            </div>
          )
        })}

        {/* ============================================================== */}
        {/* INTERACTIVE 8-BIT PLAYER SPRITE (NIGHT VISITOR WITH LUZÍA) */}
        {/* ============================================================== */}
        <div
          className="absolute z-25 pointer-events-none transition-transform duration-75 flex flex-col items-center"
          style={{
            left: `${playerPos.x}%`,
            top: `${playerPos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Luzía Edge Radar Wave emitting from player */}
          {isAssistiveVision && (
            <div
              className={`absolute -inset-10 border-2 rounded-full pointer-events-none transition-all ${
                closestHazardDist !== null && closestHazardDist < 16
                  ? 'border-red-500/80 animate-ping shadow-[0_0_25px_#ef4444]'
                  : 'border-cyan-400/50 animate-[ping_1.8s_infinite] shadow-[0_0_15px_#06b6d4]'
              }`}
            />
          )}

          {/* Player Shield Effect when Space is pressed */}
          {isShieldingEyes && (
            <div className="absolute -top-7 font-pixel text-[8px] bg-cyan-900 text-cyan-200 px-2 py-0.5 rounded border border-cyan-400 shadow-[0_0_10px_#22d3ee] animate-bounce whitespace-nowrap">
              🛡️ MIRADA DESVIADA (PROTEGIDO)
            </div>
          )}

          {/* 8-bit Character Sprite SVG */}
          <div className={`relative ${isWalking ? 'animate-pulse' : ''}`}>
            <svg width="42" height="58" viewBox="0 0 20 28" className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] [image-rendering:pixelated]">
              {/* Hair / Cap */}
              <rect x="5" y="0" width="10" height="4" fill="#3b2d54" />
              {/* Face */}
              <rect x="5" y="4" width="10" height="7" fill="#fcd34d" />
              {/* Luzía Smart Glasses (Cyan Neon Line across eyes) */}
              <rect x="4" y="6" width="12" height="3" fill="#00f0ff" />
              <rect x="6" y="7" width="3" height="1" fill="#ffffff" />
              <rect x="11" y="7" width="3" height="1" fill="#ffffff" />
              {/* Torso / Jacket */}
              <rect x="4" y="11" width="12" height="9" fill="#2563eb" />
              <rect x="8" y="11" width="4" height="9" fill="#1e3a8a" />
              {/* Walking Cane / Mobility Sensor in Hand */}
              <rect x="16" y="12" width="2" height="15" fill="#f5f5f5" />
              <rect x="15" y="25" width="4" height="2" fill="#ef4444" />
              {/* Legs */}
              <rect x="5" y="20" width="4" height="8" fill="#1e1b4b" />
              <rect x="11" y="20" width="4" height="8" fill="#1e1b4b" />
              {/* Shoes */}
              <rect x="4" y="26" width="5" height="2" fill="#000000" />
              <rect x="11" y="26" width="5" height="2" fill="#000000" />
            </svg>
          </div>

          {/* Player Name Pill */}
          <span className="font-pixel text-[7px] text-cyan-300 mt-1 bg-black/90 px-1.5 py-0.5 rounded border border-cyan-500/50">
            USUARIO LUZÍA
          </span>
        </div>

        {/* ============================================================== */}
        {/* HUD TELEMETRY OVERLAY (DISTANCE, AZIMUTH, CADENCE) */}
        {/* ============================================================== */}
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5 pointer-events-none">
          {/* Obstacle Proximity Radar Card */}
          <div className={`p-2 rounded border backdrop-blur-md transition-all ${
            isFloorHazardActive
              ? 'bg-red-950/85 border-red-500/80 text-red-200 shadow-[0_0_15px_#ef4444]'
              : 'bg-black/75 border-[#3b3468] text-gray-300'
          }`}>
            <div className="flex items-center gap-1.5 font-pixel text-[9px]">
              <span className={`w-2 h-2 rounded-full ${isFloorHazardActive ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
              <span>RADAR DE SUELO 3D</span>
            </div>
            <div className="font-crt text-xs mt-0.5">
              {closestHazardDist !== null ? (
                <>
                  <div className="text-white font-bold">
                    CABLE DETECTADO: {(closestHazardDist * 0.08).toFixed(2)}m
                  </div>
                  <div className="text-[11px] text-yellow-300">
                    DIRECCIÓN: {hazardDirection === 'LEFT' ? '← IZQUIERDA' : hazardDirection === 'RIGHT' ? 'DERECHA →' : '▲ AL FRENTE'}
                  </div>
                </>
              ) : isFloorHazardActive ? (
                <div className="text-red-300 font-bold">⚠️ OBSTÁCULO PROXIMO EN RUTA</div>
              ) : (
                <span className="text-emerald-400">Paso despejado (sin obstáculos)</span>
              )}
            </div>
          </div>

          {/* Strobe Warning Card */}
          {activeStrobe && (
            <div className="p-2 rounded border border-red-500 bg-red-950/90 text-white backdrop-blur-md shadow-[0_0_20px_#ef4444] animate-pulse">
              <span className="font-pixel text-[9px] text-yellow-300 block">
                ⚠️ ALERTA FOTOSENSIBLE {effectiveHz} Hz
              </span>
              <span className="font-crt text-xs">
                {isShieldingEyes ? '✓ Mirada desviada (Protegido)' : '¡Presiona [ESPACIO] o botón para protegerte!'}
              </span>
            </div>
          )}
        </div>

        {/* OCR Action Notification at Bottom Center */}
        {nearbySign && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 animate-bounce">
            <button
              onClick={handlePerformOcrScan}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-xs rounded-lg shadow-[0_0_25px_#10b981] border-2 border-white flex items-center gap-2 transition-all active:scale-95"
            >
              <Scan className="w-4 h-4" />
              <span>🔍 [E] ESCANEAR SEÑAL CON OCR</span>
            </button>
            <span className="font-crt text-[11px] text-emerald-200 bg-black/80 px-2 py-0.5 rounded">
              {nearbySign.label}: "{nearbySign.text}"
            </span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* BOTTOM CONTROLS & VIRTUAL D-PAD FOR MOBILE & TOUCH */}
      {/* ============================================================== */}
      <div className="p-3 bg-[#070611] border-t-4 border-[#3c3468] flex flex-wrap items-center justify-between gap-3">
        {/* Real-time Game Statistics Telemetry */}
        <div className="flex items-center gap-3 font-pixel text-[9px] text-gray-300 flex-wrap">
          <div className="bg-[#141229] px-2.5 py-1.5 rounded border border-[#3b3464]">
            <span className="text-gray-400">PASOS: </span>
            <span className="text-cyan-300">{stats.stepsCount}</span>
          </div>
          <div className="bg-[#141229] px-2.5 py-1.5 rounded border border-[#3b3464]">
            <span className="text-gray-400">OBSTÁCULOS EVITADOS: </span>
            <span className="text-emerald-400">{stats.obstaclesAvoided}</span>
          </div>
          <div className="bg-[#141229] px-2.5 py-1.5 rounded border border-[#3b3464]">
            <span className="text-gray-400">ESTROBOS BLOQUEADOS: </span>
            <span className="text-amber-400">{stats.strobesPrevented}</span>
          </div>
          <div className="bg-[#141229] px-2.5 py-1.5 rounded border border-[#3b3464]">
            <span className="text-gray-400">OCR RUTAS: </span>
            <span className="text-purple-400">{stats.signsScanned}</span>
          </div>
        </div>

        {/* Action Buttons: Shield & Stage Light & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Desviar Mirada Button */}
          <button
            onClick={handleShieldAction}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-pixel text-[9px] border transition-all active:scale-95 ${
              isShieldingEyes
                ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_15px_#06b6d4]'
                : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/60 text-cyan-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>DESVIAR MIRADA [ESPACIO]</span>
          </button>

          {/* Stage Lights Toggle */}
          <button
            onClick={() => {
              setStageLightsOn(prev => !prev)
              AudioFeedbackService.playCameraSwitchStatic()
              HapticsService.tap()
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-pixel text-[9px] border transition-all ${
              stageLightsOn
                ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            <Lightbulb className="w-3 h-3" />
            <span>{stageLightsOn ? 'FOCOS: ON' : 'FOCOS: OFF'}</span>
          </button>

          {/* CRT Noise Reset */}
          <button
            onClick={() => {
              AudioFeedbackService.playCameraSwitchStatic()
              HapticsService.tap()
              setIsFlickering(true)
              setTimeout(() => setIsFlickering(false), 250)
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 text-purple-200 font-pixel text-[9px] transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            <span>ESTÁTICA</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RETRO VIRTUAL D-PAD FOR TOUCH / MOBILE SCREENS */}
      {/* ============================================================== */}
      <div className="bg-[#04030a] p-3 border-t-2 border-[#2b254c] flex flex-wrap items-center justify-between gap-4">
        <div className="text-[10px] text-gray-400 font-pixel max-w-sm">
          <span className="text-cyan-300 block mb-1">🕹️ CONTROLES INTERACTIVOS:</span>
          <span>Teclado: </span>
          <span className="text-white bg-[#191536] px-1 py-0.5 rounded border border-[#3c3468]">WASD</span> o <span className="text-white bg-[#191536] px-1 py-0.5 rounded border border-[#3c3468]">Flechas</span> para caminar · <span className="text-white bg-[#191536] px-1 py-0.5 rounded border border-[#3c3468]">Espacio</span> desviar mirada · <span className="text-white bg-[#191536] px-1 py-0.5 rounded border border-[#3c3468]">E</span> escanear OCR · <span className="text-white bg-[#191536] px-1 py-0.5 rounded border border-[#3c3468]">Q</span> filtro visión.
        </div>

        {/* Touch D-Pad */}
        <div className="flex items-center gap-4">
          <div className="grid grid-cols-3 gap-1 w-28 h-28 p-1 bg-[#100e20] rounded-xl border border-[#3b3464]">
            <div />
            <button
              onPointerDown={() => movePlayer(0, -3.5, 'UP')}
              className="bg-[#241f48] hover:bg-cyan-600 active:bg-cyan-500 text-white rounded flex items-center justify-center transition-all active:scale-95 border border-[#483e7e]"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div />
            <button
              onPointerDown={() => movePlayer(-3.5, 0, 'LEFT')}
              className="bg-[#241f48] hover:bg-cyan-600 active:bg-cyan-500 text-white rounded flex items-center justify-center transition-all active:scale-95 border border-[#483e7e]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            </div>
            <button
              onPointerDown={() => movePlayer(3.5, 0, 'RIGHT')}
              className="bg-[#241f48] hover:bg-cyan-600 active:bg-cyan-500 text-white rounded flex items-center justify-center transition-all active:scale-95 border border-[#483e7e]"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <div />
            <button
              onPointerDown={() => movePlayer(0, 3.5, 'DOWN')}
              className="bg-[#241f48] hover:bg-cyan-600 active:bg-cyan-500 text-white rounded flex items-center justify-center transition-all active:scale-95 border border-[#483e7e]"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <div />
          </div>

          {/* Touch Fast Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handlePerformOcrScan}
              disabled={!nearbySign}
              className={`px-3 py-2 rounded-lg font-pixel text-[9px] border transition-all flex items-center gap-1.5 ${
                nearbySign
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_#10b981] animate-bounce'
                  : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>BOTÓN OCR</span>
            </button>
            <button
              onClick={handleShieldAction}
              className="px-3 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-500/60 font-pixel text-[9px] transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>DESVIAR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
