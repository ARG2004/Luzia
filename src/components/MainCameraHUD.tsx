import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, Video, AlertCircle } from 'lucide-react'
import { StrobeDetector, type StrobeStatus } from '../services/strobeDetector'
import { ObstacleScanner, type ObstacleAnalysisResult, type VisualFilterMode } from '../services/obstacleScanner'
import { HapticsService } from '../services/hapticsService'
import { AudioFeedbackService } from '../services/audioFeedbackService'
import { OcrService, type OcrResult } from '../services/ocrService'


interface MainCameraHUDProps {
  filterMode: VisualFilterMode
  onStrobeUpdate: (status: StrobeStatus) => void
  onObstacleUpdate: (analysis: ObstacleAnalysisResult) => void
  onFpsUpdate: (fps: number) => void
  externalSignToProcess?: string | null
  onSignProcessed?: (result: OcrResult) => void
  registerOcrTrigger: (fn: () => Promise<OcrResult | null>) => void
}

export const MainCameraHUD: React.FC<MainCameraHUDProps> = ({
  filterMode,
  onStrobeUpdate,
  onObstacleUpdate,
  onFpsUpdate,
  externalSignToProcess,
  onSignProcessed,
  registerOcrTrigger,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isUsingSimulatedFeed, setIsUsingSimulatedFeed] = useState(false)

  // Animación del feed simulado cuando no hay cámara web física disponible
  const simFrameRef = useRef<number>(0)
  const lastDangerSoundTimeRef = useRef<number>(0)

  // Iniciar Stream de Cámara
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador no soporta acceso a cámara directa.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Cámara trasera del celular por defecto
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setHasCameraPermission(true)
        setIsUsingSimulatedFeed(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara.'
      setCameraError(msg)
      setHasCameraPermission(false)
      setIsUsingSimulatedFeed(true) // Fallback al simulador inmersivo de terror
    }
  }, [])

  useEffect(() => {
    startCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [startCamera])

  // Inyectar letrero simulado si viene de fuera
  useEffect(() => {
    if (externalSignToProcess) {
      const mockResult: OcrResult = {
        text: externalSignToProcess,
        confidence: 96,
        guidanceMessage:
          externalSignToProcess.includes('SALIDA')
            ? 'Salida localizada al frente. Continúe con precaución.'
            : externalSignToProcess.includes('EVACUACIÓN')
            ? 'Ruta de evacuación identificada.'
            : externalSignToProcess.includes('PELIGRO')
            ? '¡Atención! Zona de peligro por instalaciones eléctricas.'
            : `Letrero detectado: ${externalSignToProcess}`,
      }
      onSignProcessed?.(mockResult)
    }
  }, [externalSignToProcess, onSignProcessed])

  // Método de escaneo OCR expuesto
  const triggerOcrScan = useCallback(async (): Promise<OcrResult | null> => {
    const canvas = displayCanvasRef.current || sourceCanvasRef.current
    if (!canvas) return null
    return await OcrService.recognizeText(canvas)
  }, [])

  useEffect(() => {
    registerOcrTrigger(triggerOcrScan)
  }, [registerOcrTrigger, triggerOcrScan])

  // Loop de procesamiento de fotogramas (60 FPS)
  useEffect(() => {
    let animationFrameId: number
    let frameCount = 0
    let lastFpsTime = performance.now()

    const processLoop = () => {
      const now = performance.now()
      frameCount++

      if (now - lastFpsTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime))
        onFpsUpdate(currentFps)
        frameCount = 0
        lastFpsTime = now
      }

      const video = videoRef.current
      const sourceCanvas = sourceCanvasRef.current
      const displayCanvas = displayCanvasRef.current

      if (sourceCanvas && displayCanvas) {
        const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
        const dCtx = displayCanvas.getContext('2d')

        if (sCtx && dCtx) {
          const w = sourceCanvas.width
          const h = sourceCanvas.height

          if (!isUsingSimulatedFeed && video && video.readyState >= 2) {
            // Dibujar video real en canvas fuente
            sCtx.drawImage(video, 0, 0, w, h)
          } else {
            // Renderizar Escenario de Terror Simulado (Penumbra, Cables en suelo, Paredes)
            simFrameRef.current++
            sCtx.fillStyle = '#06070a'
            sCtx.fillRect(0, 0, w, h)

            // Paredes y techo en penumbra
            sCtx.fillStyle = '#11141c'
            sCtx.beginPath()
            sCtx.moveTo(0, 0)
            sCtx.lineTo(w, 0)
            sCtx.lineTo(w * 0.8, h * 0.45)
            sCtx.lineTo(w * 0.2, h * 0.45)
            sCtx.closePath()
            sCtx.fill()

            // Suelo de la casa del terror
            sCtx.fillStyle = '#0a0d14'
            sCtx.fillRect(0, h * 0.45, w, h * 0.55)

            // Simular Cables cruzados en el suelo (Obstáculos dinámicos)
            sCtx.strokeStyle = '#2b303d'
            sCtx.lineWidth = 6
            sCtx.beginPath()
            sCtx.moveTo(w * 0.1, h * 0.95)
            sCtx.bezierCurveTo(w * 0.4, h * 0.85, w * 0.6, h * 0.92, w * 0.9, h * 0.75)
            sCtx.stroke()

            sCtx.lineWidth = 4
            sCtx.beginPath()
            sCtx.moveTo(w * 0.2, h * 0.65)
            sCtx.lineTo(w * 0.7, h * 0.82)
            sCtx.stroke()

            // Simular un desnivel/escalón
            sCtx.strokeStyle = '#3a4052'
            sCtx.lineWidth = 5
            sCtx.beginPath()
            sCtx.moveTo(w * 0.15, h * 0.7)
            sCtx.lineTo(w * 0.85, h * 0.7)
            sCtx.stroke()

            // Simular un letrero luminoso de salida al fondo en penumbra
            sCtx.fillStyle = '#004018'
            sCtx.fillRect(w * 0.38, h * 0.22, w * 0.24, h * 0.12)
            sCtx.fillStyle = '#00ff66'
            sCtx.font = 'bold 14px monospace'
            sCtx.textAlign = 'center'
            sCtx.fillText('SALIDA', w * 0.5, h * 0.29)
          }

          // 1. Análisis de Fotosensibilidad Estroboscópica
          const strobeStatus = StrobeDetector.analyzeFrame(sCtx, w, h, now)
          onStrobeUpdate(strobeStatus)

          if (strobeStatus.isDangerous) {
            // Feedback háptico y sonoro
            HapticsService.strobeWarning()
            if (now - lastDangerSoundTimeRef.current > 400) {
              AudioFeedbackService.playStrobeAlarm()
              lastDangerSoundTimeRef.current = now
            }
          }

          // 2. Procesamiento de Bordes de Alto Contraste y Escáner de Suelo
          const obstacleAnalysis = ObstacleScanner.processFrame(sCtx, dCtx, w, h, filterMode, 34)
          onObstacleUpdate(obstacleAnalysis)

          if (obstacleAnalysis.hasHazard && !strobeStatus.isDangerous) {
            // Pulso háptico y beep de proximidad proporcional a la distancia
            HapticsService.obstaclePulse(obstacleAnalysis.proximityIndex)
            AudioFeedbackService.playObstacleProximityBeep(obstacleAnalysis.proximityIndex)
          }
        }
      }

      animationFrameId = requestAnimationFrame(processLoop)
    }

    animationFrameId = requestAnimationFrame(processLoop)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [filterMode, isUsingSimulatedFeed, onFpsUpdate, onObstacleUpdate, onStrobeUpdate])

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-video max-h-[58vh] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)] select-none">
      {/* Video oculto para captura de cámara */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Canvas oculto para muestreo */}
      <canvas
        ref={sourceCanvasRef}
        width={360}
        height={270}
        className="hidden"
      />

      {/* Canvas principal procesado y visible */}
      <canvas
        ref={displayCanvasRef}
        width={360}
        height={270}
        className="w-full h-full object-cover block"
      />

      {/* Capa de Efectos de Visión Nocturna / Scanlines */}
      <div className="absolute inset-0 scanlines-overlay opacity-60 pointer-events-none" />

      {/* Retícula Táctica de Escaneo HUD */}
      <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
        {/* Esquinas tácticas */}
        <div className="flex justify-between items-start">
          <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
          <div className="text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-cyan-300 border border-cyan-500/30">
            {isUsingSimulatedFeed ? 'MODO: SIMULADOR DE TERROR' : 'STREAM: CÁMARA TRASERA'}
          </div>
          <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
        </div>

        {/* Zona Central: Retícula de Enfoque para Señalética */}
        <div className="self-center relative flex items-center justify-center">
          <div className="w-32 h-20 border border-dashed border-cyan-400/40 rounded-lg flex items-center justify-center">
            <span className="text-[9px] font-mono text-cyan-300/80 uppercase">
              ENFOCAR SEÑAL
            </span>
          </div>
          <div className="absolute w-2 h-2 rounded-full bg-cyan-400" />
        </div>

        {/* Zona Inferior: Retícula de Suelo y Obstáculos */}
        <div className="relative">
          <div className="w-full border-t border-dashed border-amber-500/40 mb-1 flex justify-between text-[9px] font-mono text-amber-400 px-1">
            <span>◄ SECTOR DE PISO / CABLES</span>
            <span>DETECCIÓN DE DESNIVELES ►</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="w-6 h-6 border-b-2 border-l-2 border-amber-400" />
            <div className="w-6 h-6 border-b-2 border-r-2 border-amber-400" />
          </div>
        </div>
      </div>

      {/* Controles Flotantes sobre la Cámara */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
        <button
          onClick={() => {
            HapticsService.tap()
            if (isUsingSimulatedFeed) {
              startCamera()
            } else {
              setIsUsingSimulatedFeed(true)
            }
          }}
          className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center gap-1.5 backdrop-blur-md transition-all"
        >
          {isUsingSimulatedFeed ? <Camera className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          <span>{isUsingSimulatedFeed ? 'ACTIVAR CÁMARA' : 'SIMULAR ENTORNO'}</span>
        </button>
      </div>

      {/* Mensaje si la cámara falló */}
      {cameraError && hasCameraPermission === false && (
        <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/80 border border-amber-500/40 text-amber-300 text-[11px] font-mono flex items-center gap-2 z-20 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Cámara no disponible en este dispositivo ({cameraError}). Modo simulación interactiva
            activado para pruebas sensoriales.
          </span>
        </div>
      )}
    </div>
  )
}
