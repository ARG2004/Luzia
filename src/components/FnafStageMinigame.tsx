import React, { useState, useEffect } from 'react'
import { RefreshCw, Lightbulb, Video } from 'lucide-react'
import { AudioFeedbackService } from '../services/audioFeedbackService'
import { HapticsService } from '../services/hapticsService'

interface FnafStageMinigameProps {
  isStrobeAlert?: boolean
  hasObstacleAlert?: boolean
  strobeHz?: number
  onTriggerSimulatedSign?: (text: string) => void
  onToggleRealCamera?: () => void
  isRealCameraActive?: boolean
}

export const FnafStageMinigame: React.FC<FnafStageMinigameProps> = ({
  isStrobeAlert = false,
  hasObstacleAlert = false,
  strobeHz = 0,
  onTriggerSimulatedSign,
  onToggleRealCamera,
  isRealCameraActive = false,
}) => {
  const [activeCam, setActiveCam] = useState<'CAM_1A' | 'CAM_1B' | 'HAPPIEST_DAY' | 'CAM_2B'>('CAM_1A')
  const [isFlickering, setIsFlickering] = useState(false)
  const [animatronicTwitch, setAnimatronicTwitch] = useState(false)
  const [stageLightsOn, setStageLightsOn] = useState(true)
  const [cakeCelebrated, setCakeCelebrated] = useState(false)

  // Switch camera with retro static sound
  const switchCam = (cam: 'CAM_1A' | 'CAM_1B' | 'HAPPIEST_DAY' | 'CAM_2B') => {
    setActiveCam(cam)
    AudioFeedbackService.playCameraSwitchStatic()
    HapticsService.tap()
    setIsFlickering(true)
    setTimeout(() => setIsFlickering(false), 220)
  }

  // Strobe flicker / twitch effect
  useEffect(() => {
    if (isStrobeAlert) {
      const interval = setInterval(() => {
        setAnimatronicTwitch((prev: boolean) => !prev)
      }, 90)
      return () => clearInterval(interval)
    } else {
      setAnimatronicTwitch(false)
    }
  }, [isStrobeAlert])

  return (
    <div className="w-full bg-[#0d0b1a] border-4 border-[#3c3468] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.95)] relative font-crt select-none">
      {/* Top CRT Camera Info Bar */}
      <div className="bg-[#080712] px-3 sm:px-4 py-2 border-b-4 border-[#3c3468] flex flex-wrap items-center justify-between text-xs text-green-400 gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-1.5 font-pixel text-[10px] sm:text-xs text-[#00ff66]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
            REC
          </span>
          <span className="font-pixel text-[9px] sm:text-[11px] text-white bg-[#191536] px-2 py-1 rounded border border-[#483e7e]">
            {activeCam === 'CAM_1A' && 'CAM 1A - SHOW STAGE'}
            {activeCam === 'CAM_1B' && 'CAM 1B - FREDBEAR DINER'}
            {activeCam === 'HAPPIEST_DAY' && 'MINIGAME: HAPPIEST DAY'}
            {activeCam === 'CAM_2B' && 'CAM 2B - WEST HALL'}
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
            onClick={() => switchCam('CAM_1B')}
            className={`px-2 py-1 font-pixel text-[9px] rounded border transition-all ${
              activeCam === 'CAM_1B'
                ? 'bg-amber-500/25 text-amber-300 border-amber-400 shadow-[0_0_10px_#f59e0b]'
                : 'bg-black/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            CAM 1B
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
            onClick={() => switchCam('CAM_2B')}
            className={`px-2 py-1 font-pixel text-[9px] rounded border transition-all ${
              activeCam === 'CAM_2B'
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-[0_0_10px_#22d3ee]'
                : 'bg-black/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            CAM 2B
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

      {/* Main 8-bit Stage Area */}
      <div className="relative w-full aspect-[16/9] min-h-[340px] sm:min-h-[440px] bg-[#161329] overflow-hidden flex items-center justify-center">
        {/* CRT Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none z-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-80" />

        {/* Static CRT Flash on Switch */}
        {isFlickering && (
          <div className="absolute inset-0 bg-white/25 z-40 pointer-events-none animate-pulse" />
        )}

        {/* Spotlight Darkness when Lights Off */}
        {!stageLightsOn && (
          <div className="absolute inset-0 bg-black/75 z-20 pointer-events-none transition-opacity duration-300 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
        )}

        {/* ============================================================== */}
        {/* SCENE 1: CAM 1A - SHOW STAGE (IMAGE 3 EXACT ATARI 8-BIT) */}
        {/* ============================================================== */}
        {activeCam === 'CAM_1A' && (
          <div className="absolute inset-0 flex flex-col justify-end bg-[#161329]">
            {/* Dark Checkerboard Floor (Identical to User Image 3) */}
            <div
              className="absolute inset-x-0 bottom-0 h-[68%] z-0"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #0a0a0f 25%, transparent 25%), 
                  linear-gradient(-45deg, #0a0a0f 25%, transparent 25%), 
                  linear-gradient(45deg, transparent 75%, #0a0a0f 75%), 
                  linear-gradient(-45deg, transparent 75%, #0a0a0f 75%)
                `,
                backgroundColor: '#1c1c24',
                backgroundSize: '42px 42px',
                backgroundPosition: '0 0, 0 21px, 21px -21px, -21px 0px',
              }}
            >
              {/* Floor debris/pixel dots from Image 3 */}
              <div className="absolute top-6 left-12 w-3 h-2 bg-[#33333d]" />
              <div className="absolute top-16 right-16 w-4 h-2 bg-[#33333d]" />
              <div className="absolute bottom-12 left-1/4 w-5 h-2 bg-[#444452]" />
            </div>

            {/* Stage Platform with Bonnie, Freddy, Chica */}
            <div className="relative z-10 w-[88%] max-w-2xl mx-auto mb-4 sm:mb-6 flex flex-col items-center">
              {/* Animatronics Sprites Container */}
              <div className="w-full flex items-end justify-center gap-6 sm:gap-14 pb-1">
                {/* Bonnie (Blue/Cyan Bunny with Red Bowtie - Image 3) */}
                <div
                  className={`flex flex-col items-center transition-transform ${
                    animatronicTwitch ? 'translate-x-1 rotate-1' : ''
                  }`}
                >
                  <svg width="78" height="122" viewBox="0 0 28 44" className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] [image-rendering:pixelated]">
                    {/* Ears with joints */}
                    <rect x="5" y="0" width="4" height="11" fill="#1b7899" />
                    <rect x="6" y="2" width="2" height="7" fill="#0d4e66" />
                    <rect x="19" y="0" width="4" height="11" fill="#1b7899" />
                    <rect x="20" y="2" width="2" height="7" fill="#0d4e66" />
                    {/* Head */}
                    <rect x="4" y="9" width="20" height="14" fill="#1b7899" />
                    {/* Eyes (Black sockets with magenta/red dots) */}
                    <rect x="7" y="12" width="4" height="3" fill="#051520" />
                    <rect x="8" y="13" width="2" height="2" fill="#d9385b" />
                    <rect x="17" y="12" width="4" height="3" fill="#051520" />
                    <rect x="18" y="13" width="2" height="2" fill="#d9385b" />
                    {/* Snout & Teeth */}
                    <rect x="9" y="17" width="10" height="5" fill="#125770" />
                    <rect x="10" y="20" width="2" height="2" fill="#ffffff" />
                    <rect x="13" y="20" width="2" height="2" fill="#ffffff" />
                    <rect x="16" y="20" width="2" height="2" fill="#ffffff" />
                    <rect x="13" y="17" width="2" height="2" fill="#000000" />
                    {/* Red Bowtie */}
                    <rect x="10" y="23" width="8" height="3" fill="#b02626" />
                    <rect x="13" y="22" width="2" height="5" fill="#7d1313" />
                    {/* Torso */}
                    <rect x="6" y="25" width="16" height="12" fill="#1b7899" />
                    <rect x="9" y="26" width="10" height="8" fill="#125770" />
                    {/* Arms */}
                    <rect x="2" y="25" width="4" height="11" fill="#155d78" />
                    <rect x="22" y="25" width="4" height="11" fill="#155d78" />
                    {/* Legs */}
                    <rect x="8" y="37" width="4" height="7" fill="#0d4e66" />
                    <rect x="16" y="37" width="4" height="7" fill="#0d4e66" />
                  </svg>
                  <span className="font-pixel text-[9px] text-cyan-300 mt-1">BONNIE</span>
                </div>

                {/* Freddy Fazbear (Golden Brown Bear with Top Hat & Bowtie - Image 3) */}
                <div
                  className={`flex flex-col items-center transition-transform ${
                    animatronicTwitch ? '-translate-y-1' : ''
                  }`}
                >
                  <svg width="84" height="128" viewBox="0 0 30 46" className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.95)] [image-rendering:pixelated]">
                    {/* Top Hat */}
                    <rect x="11" y="0" width="8" height="7" fill="#141414" />
                    <rect x="9" y="6" width="12" height="2" fill="#292929" />
                    {/* Ears */}
                    <rect x="3" y="7" width="5" height="5" fill="#755010" />
                    <rect x="22" y="7" width="5" height="5" fill="#755010" />
                    {/* Head */}
                    <rect x="5" y="9" width="20" height="14" fill="#916416" />
                    {/* Eyes (Black sockets with white or blue glow) */}
                    <rect x="8" y="12" width="4" height="3" fill="#111111" />
                    <rect x="9" y="13" width="2" height="2" fill={isStrobeAlert ? '#00f0ff' : '#ffffff'} />
                    <rect x="18" y="12" width="4" height="3" fill="#111111" />
                    <rect x="19" y="13" width="2" height="2" fill={isStrobeAlert ? '#00f0ff' : '#ffffff'} />
                    {/* Muzzle */}
                    <rect x="8" y="17" width="14" height="5" fill="#5e410f" />
                    <rect x="13" y="17" width="4" height="2" fill="#111111" />
                    {/* Black Bowtie */}
                    <rect x="11" y="24" width="8" height="3" fill="#141414" />
                    <rect x="14" y="23" width="2" height="5" fill="#292929" />
                    {/* Torso */}
                    <rect x="6" y="26" width="18" height="13" fill="#916416" />
                    <rect x="10" y="28" width="10" height="9" fill="#5e410f" />
                    {/* Arms */}
                    <rect x="2" y="26" width="4" height="12" fill="#5e410f" />
                    <rect x="24" y="26" width="4" height="12" fill="#5e410f" />
                    {/* Legs */}
                    <rect x="8" y="39" width="5" height="7" fill="#47310b" />
                    <rect x="17" y="39" width="5" height="7" fill="#47310b" />
                  </svg>
                  <span className="font-pixel text-[9px] text-amber-300 mt-1">FREDDY</span>
                </div>

                {/* Chica (Yellow Chicken with Pink Cupcake - Image 3) */}
                <div
                  className={`flex flex-col items-center transition-transform ${
                    animatronicTwitch ? '-translate-x-1 rotate-1' : ''
                  }`}
                >
                  <svg width="80" height="122" viewBox="0 0 28 44" className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] [image-rendering:pixelated]">
                    {/* Feathers on head */}
                    <rect x="12" y="2" width="4" height="6" fill="#c49012" />
                    {/* Head */}
                    <rect x="4" y="8" width="20" height="14" fill="#cca31a" />
                    {/* Eyes */}
                    <rect x="7" y="12" width="4" height="3" fill="#120520" />
                    <rect x="8" y="13" width="2" height="2" fill="#b03ad4" />
                    <rect x="17" y="12" width="4" height="3" fill="#120520" />
                    <rect x="18" y="13" width="2" height="2" fill="#b03ad4" />
                    {/* Beak with teeth */}
                    <rect x="9" y="17" width="10" height="4" fill="#c95710" />
                    <rect x="11" y="20" width="6" height="2" fill="#ffffff" />
                    {/* Bib / Apron */}
                    <rect x="7" y="23" width="14" height="5" fill="#f5f5f5" />
                    <rect x="8" y="24" width="12" height="2" fill="#cc3333" />
                    {/* Torso */}
                    <rect x="6" y="25" width="16" height="11" fill="#cca31a" />
                    {/* Pink Cupcake held in hand with candle */}
                    <rect x="22" y="22" width="2" height="3" fill="#fcd34d" />
                    <rect x="21" y="25" width="6" height="5" fill="#e86b8b" />
                    <rect x="20" y="30" width="8" height="2" fill="#888888" />
                    {/* Arms */}
                    <rect x="2" y="25" width="4" height="9" fill="#9e7a0e" />
                    {/* Orange Legs */}
                    <rect x="8" y="36" width="4" height="8" fill="#c95710" />
                    <rect x="16" y="36" width="4" height="8" fill="#c95710" />
                  </svg>
                  <span className="font-pixel text-[9px] text-yellow-300 mt-1">CHICA</span>
                </div>
              </div>

              {/* Stone Stage Platform Base (Gray with studs from Image 3) */}
              <div className="w-full h-11 bg-[#57555c] border-t-4 border-[#7d7985] border-b-4 border-[#2d2b30] rounded-sm relative shadow-2xl flex items-center justify-around px-4">
                <div className="w-8 h-3 bg-[#3a383d] rounded-sm" />
                <div className="w-8 h-3 bg-[#3a383d] rounded-sm" />
                <div className="w-8 h-3 bg-[#3a383d] rounded-sm" />
                <div className="w-8 h-3 bg-[#3a383d] rounded-sm" />
              </div>

              {/* Pixel Radar Wave Effect */}
              <div className="relative mt-2 flex flex-col items-center">
                <div className="w-44 h-8 border-2 border-cyan-400 rounded-full animate-ping opacity-60 pointer-events-none" />
                <span className="font-pixel text-[9px] sm:text-[10px] text-cyan-300 tracking-wider mt-1 bg-black/85 px-3 py-1 rounded border border-cyan-500/50">
                  {isStrobeAlert ? `⚠️ ESTROBO DETECTADO: ${strobeHz} HZ` : 'ESCENARIO FAZBEAR · RADAR LUZÍA ACTIVO'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCENE 2: CAM 1B - FREDBEAR'S DINER STAGE (IMAGE 2 TOP) */}
        {/* ============================================================== */}
        {activeCam === 'CAM_1B' && (
          <div className="absolute inset-0 bg-[#161226] flex flex-col justify-between overflow-hidden">
            {/* Ceiling Garlands & Streamers (From User Image 2 Top) */}
            <div className="w-full h-8 flex justify-around items-start pt-1 z-10">
              <div className="w-16 h-12 border-b-4 border-dashed border-red-500 rounded-b-full opacity-80" />
              <div className="w-20 h-10 border-b-4 border-dashed border-purple-500 rounded-b-full opacity-80" />
              <div className="w-20 h-12 border-b-4 border-dashed border-amber-400 rounded-b-full opacity-80" />
              <div className="w-16 h-10 border-b-4 border-dashed border-green-500 rounded-b-full opacity-80" />
            </div>

            {/* Back Wall with Shadows, Balloons, and Red Door */}
            <div className="relative flex-1 flex items-center justify-around px-6">
              {/* Fredbear & Spring Bonnie Stage on Left */}
              <div className="flex flex-col items-center">
                <div className="flex items-end gap-3 pb-1">
                  {/* Spring Bonnie (Golden Yellow Rabbit with Purple Bowtie) */}
                  <div className="flex flex-col items-center">
                    <svg width="50" height="85" viewBox="0 0 24 38" className="[image-rendering:pixelated]">
                      <rect x="4" y="0" width="3" height="9" fill="#a87f18" />
                      <rect x="17" y="0" width="3" height="9" fill="#a87f18" />
                      <rect x="3" y="8" width="18" height="12" fill="#ba8f23" />
                      <rect x="6" y="11" width="3" height="3" fill="#ffffff" />
                      <rect x="15" y="11" width="3" height="3" fill="#ffffff" />
                      <rect x="8" y="15" width="8" height="4" fill="#8c6810" />
                      <rect x="8" y="20" width="8" height="3" fill="#7e22ce" />
                      <rect x="5" y="22" width="14" height="10" fill="#ba8f23" />
                      <rect x="6" y="32" width="4" height="6" fill="#8c6810" />
                      <rect x="14" y="32" width="4" height="6" fill="#8c6810" />
                    </svg>
                    <span className="font-pixel text-[8px] text-amber-200">SPRING BONNIE</span>
                  </div>

                  {/* Fredbear (Golden Bear with Purple Top Hat & Bowtie) */}
                  <div className="flex flex-col items-center">
                    <svg width="54" height="90" viewBox="0 0 26 40" className="[image-rendering:pixelated]">
                      <rect x="9" y="0" width="8" height="6" fill="#7e22ce" />
                      <rect x="8" y="5" width="10" height="2" fill="#581c87" />
                      <rect x="2" y="6" width="4" height="4" fill="#a87f18" />
                      <rect x="20" y="6" width="4" height="4" fill="#a87f18" />
                      <rect x="4" y="8" width="18" height="13" fill="#ba8f23" />
                      <rect x="7" y="11" width="3" height="3" fill="#ffffff" />
                      <rect x="16" y="11" width="3" height="3" fill="#ffffff" />
                      <rect x="8" y="16" width="10" height="4" fill="#8c6810" />
                      <rect x="9" y="21" width="8" height="3" fill="#7e22ce" />
                      <rect x="5" y="23" width="16" height="11" fill="#ba8f23" />
                      <rect x="7" y="34" width="4" height="6" fill="#8c6810" />
                      <rect x="15" y="34" width="4" height="6" fill="#8c6810" />
                    </svg>
                    <span className="font-pixel text-[8px] text-yellow-300">FREDBEAR</span>
                  </div>
                </div>
                <div className="w-44 h-6 bg-[#69542a] border-t-2 border-[#8f743c] rounded-t-sm" />
              </div>

              {/* Shadow Silhouettes (Shadow Freddy / Bonnie from Image 2) */}
              <div className="opacity-40 flex items-end gap-2">
                <div className="w-10 h-24 bg-[#1f0f33] rounded-t-lg" />
                <div className="w-12 h-26 bg-[#1f0f33] rounded-t-lg" />
              </div>

              {/* Balloon Bunches (From User Image 2 Top) */}
              <div className="flex flex-col items-center">
                <div className="flex gap-1 mb-1">
                  <div className="w-5 h-7 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444]" />
                  <div className="w-5 h-7 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                  <div className="w-5 h-7 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                  <div className="w-5 h-7 rounded-full bg-purple-600 shadow-[0_0_8px_#a855f7]" />
                </div>
                <div className="w-0.5 h-12 bg-gray-400" />
                <div className="w-16 h-3 bg-[#4a2e12] border-t-2 border-[#69421b]" />
              </div>

              {/* Red Double Security Doors (From User Image 2 Top) */}
              <div className="w-24 h-32 bg-[#701616] border-4 border-[#3b0b0b] rounded-t-sm flex items-center justify-center p-1 relative shadow-xl">
                <div className="w-full h-full border border-red-900 flex justify-between px-2 items-center">
                  <div className="w-1.5 h-6 bg-yellow-500" />
                  <div className="w-1.5 h-6 bg-yellow-500" />
                </div>
                <span className="absolute -top-6 font-pixel text-[8px] text-red-300">STAGE DOORS</span>
              </div>
            </div>

            {/* Checkered Confetti Floor */}
            <div className="w-full h-14 bg-[#141224] border-t-4 border-[#2b274c] relative flex items-center justify-around px-4">
              <span className="font-pixel text-[9px] text-amber-300">
                FAZBEAR HISTORIC ARCHIVE · 1983
              </span>
              <button
                onClick={() => {
                  HapticsService.tap()
                  AudioFeedbackService.playSuccessChime()
                  onTriggerSimulatedSign?.('FREDBEAR DINER - PROTOCOLO HISTORICO')
                }}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-black font-pixel text-[8px] rounded transition-all"
              >
                PROBAR SENSOR EN SALA
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCENE 3: MINIGAME HAPPIEST DAY (IMAGE 2 BOTTOM EXACT) */}
        {/* ============================================================== */}
        {activeCam === 'HAPPIEST_DAY' && (
          <div className="absolute inset-0 bg-[#090812] flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
            {/* Title: HAPPIEST DAY */}
            <div className="text-left pl-2">
              <h3 className="font-pixel text-xs sm:text-sm text-gray-200 tracking-widest">
                HAPPIEST DAY
              </h3>
            </div>

            {/* The Gray Box Boundary (Identical to Image 2 Bottom) */}
            <div className="w-full border-4 border-[#94949e] bg-[#000000] p-3 sm:p-4 rounded-sm flex flex-col justify-between min-h-[190px] relative">
              {/* Floating Balloons Across the Room */}
              <div className="w-full flex justify-around items-center pt-1">
                <div className="w-4 h-6 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-bounce" />
                <div className="w-4 h-6 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15] animate-bounce [animation-delay:0.2s]" />
                <div className="w-4 h-6 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-bounce [animation-delay:0.4s]" />
                <div className="w-4 h-6 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-bounce [animation-delay:0.1s]" />
                <div className="w-4 h-6 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7] animate-bounce [animation-delay:0.5s]" />
                <div className="w-4 h-6 rounded-full bg-yellow-300 shadow-[0_0_8px_#fde047] animate-bounce [animation-delay:0.3s]" />
                <div className="w-4 h-6 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-bounce [animation-delay:0.6s]" />
              </div>

              {/* Party Room Floor with EXIT, Tables, Cakes, and Kids with Masks */}
              <div className="flex items-end justify-between w-full pt-4">
                {/* EXIT Sign on Left (Image 2 Bottom) */}
                <div className="border border-gray-400 bg-gray-900 px-1 py-0.5 text-center">
                  <span className="font-pixel text-[7px] text-gray-200 block">EXIT</span>
                  <div className="w-4 h-4 bg-gray-700 mx-auto mt-0.5" />
                </div>

                {/* Table 1 with Cake & Mask Kids */}
                <div className="flex items-end gap-1">
                  <div className="w-4 h-7 bg-[#2563eb] rounded-t-sm flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#16a34a] rounded-sm" />
                  </div>
                  <div className="flex flex-col items-center">
                    {/* 3-Tier Birthday Cake with Lit Candles */}
                    <div className="flex gap-0.5 mb-0.5">
                      <div className="w-1 h-2 bg-yellow-400 animate-pulse" />
                      <div className="w-1 h-2 bg-yellow-400 animate-pulse" />
                      <div className="w-1 h-2 bg-yellow-400 animate-pulse" />
                    </div>
                    <div className="w-8 h-3 bg-pink-500 border border-pink-300 rounded-t-sm" />
                    <div className="w-10 h-3 bg-amber-300 border border-amber-400" />
                    <div className="w-12 h-3 bg-pink-600 border border-pink-400" />
                    <div className="w-16 h-2 bg-[#2563eb] border-t-2 border-[#1d4ed8]" />
                  </div>
                  <div className="w-4 h-7 bg-[#2563eb] rounded-t-sm flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#f97316] rounded-sm" />
                  </div>
                </div>

                {/* Table 2 with Cake & Mask Kids */}
                <div className="flex items-end gap-1 hidden sm:flex">
                  <div className="w-4 h-7 bg-[#2563eb] rounded-t-sm flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#9333ea] rounded-sm" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex gap-0.5 mb-0.5">
                      <div className="w-1 h-2 bg-yellow-400 animate-pulse" />
                      <div className="w-1 h-2 bg-yellow-400 animate-pulse" />
                      <div className="w-1 h-2 bg-yellow-400 animate-pulse" />
                    </div>
                    <div className="w-8 h-3 bg-pink-500 border border-pink-300 rounded-t-sm" />
                    <div className="w-10 h-3 bg-amber-300 border border-amber-400" />
                    <div className="w-12 h-3 bg-pink-600 border border-pink-400" />
                    <div className="w-16 h-2 bg-[#2563eb] border-t-2 border-[#1d4ed8]" />
                  </div>
                  <div className="w-4 h-7 bg-[#2563eb] rounded-t-sm flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#06b6d4] rounded-sm" />
                  </div>
                </div>

                {/* Children with Masks lined up for Puppet (Image 2 Bottom Right) */}
                <div className="flex items-end gap-1.5">
                  <div className="w-3 h-8 bg-gray-400 rounded-t-sm flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-gray-200 rounded-full" />
                  </div>
                  <div className="w-3 h-8 bg-gray-400 rounded-t-sm flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-gray-200 rounded-full" />
                  </div>
                  {/* Puppet / Marionette Mask */}
                  <div className="w-3.5 h-9 bg-black border border-white rounded-t-sm flex flex-col items-center">
                    <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                      <div className="w-1 h-1 bg-red-600 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Controls for Happiest Day */}
            <div className="flex justify-between items-center pt-2">
              <span className="font-pixel text-[8px] text-gray-400">
                SALA DE CELEBRACIÓN Y SALIDA SEGURA LUZÍA
              </span>
              <button
                onClick={() => {
                  setCakeCelebrated(true)
                  HapticsService.signDetected()
                  AudioFeedbackService.playSuccessChime()
                  onTriggerSimulatedSign?.('HAPPIEST DAY: RUTA LIBERADA')
                  setTimeout(() => setCakeCelebrated(false), 2000)
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-pixel text-[9px] rounded shadow-[0_0_12px_#f59e0b] transition-all"
              >
                ★ {cakeCelebrated ? '¡RUTA CELEBRADA!' : 'DAR PASTEL Y LIBERAR'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCENE 4: CAM 2B - WEST HALL (RADAR DE SUELO Y CABLES) */}
        {/* ============================================================== */}
        {activeCam === 'CAM_2B' && (
          <div className="absolute inset-0 bg-[#0e0c18] flex flex-col justify-between p-4 sm:p-6">
            <div className="w-full flex justify-between items-start z-10">
              <div className="bg-black/90 p-2 rounded border border-green-500/60">
                <span className="font-pixel text-[10px] text-green-400 block">CAM 2B - PASILLO OESTE</span>
                <span className="font-crt text-xs text-gray-300">Detección de Cables Expuestos & Desniveles</span>
              </div>

              {/* Exit Sign with OCR detection */}
              <div className="bg-[#0b3818] border-2 border-[#1cd957] p-2 rounded shadow-[0_0_20px_#1cd957] text-center animate-pulse">
                <span className="font-pixel text-[10px] text-white tracking-widest block">
                  SALIDA / EXIT
                </span>
                <span className="font-crt text-[11px] text-[#00ff66]">OCR: RUTA SEGURA IDENTIFICADA</span>
              </div>
            </div>

            {/* Hallway Perspective with Cables and Obstacle Radar */}
            <div className="w-full max-w-lg mx-auto h-44 bg-[#14121e] border-2 border-green-500/50 rounded-lg relative overflow-hidden flex flex-col items-center justify-center p-4 shadow-[inset_0_0_40px_#000000]">
              {/* Floor Cables (Red Warning) */}
              <div className="absolute bottom-4 inset-x-8 h-2 bg-red-600/80 rounded animate-pulse" />
              <div className="absolute bottom-7 left-12 w-28 h-1.5 bg-amber-500/80 rounded" />

              <div className="text-center font-pixel z-10">
                <span className="text-[10px] text-green-300 block mb-1">
                  [RADAR DE SUELO ON-DEVICE]
                </span>
                <span className={`text-[9px] block ${hasObstacleAlert ? 'text-red-400 animate-bounce' : 'text-gray-300'}`}>
                  {hasObstacleAlert ? '⚠️ ¡CABLE EXPUESTO A 1.2M! VIBRANDO...' : 'Suelo despejado · Sin obstáculos'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center z-10">
              <span className="font-pixel text-[8px] text-cyan-400">
                SENSOR HÁPTICO: 100% OPERATIVO
              </span>
              <button
                onClick={() => {
                  HapticsService.strobeWarning()
                  AudioFeedbackService.playCameraSwitchStatic()
                  onTriggerSimulatedSign?.('SALIDA DE EMERGENCIA')
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-pixel text-[9px] rounded transition-all shadow-[0_0_12px_#10b981]"
              >
                PROBAR SENSOR PASILLO
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Fazbear Security Office Controls */}
      <div className="p-3 bg-[#0a0816] border-t-4 border-[#3c3468] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
          <span className="font-pixel text-[8px] sm:text-[9px] text-gray-300">
            FREDDY FAZBEAR'S PIZZA · PROTOCOLO LUZÍA
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Stage Lights Toggle */}
          <button
            onClick={() => {
              setStageLightsOn((prev: boolean) => !prev)
              AudioFeedbackService.playCameraSwitchStatic()
              HapticsService.tap()
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-pixel text-[8px] border transition-all ${
              stageLightsOn
                ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            <Lightbulb className="w-3 h-3" />
            <span>{stageLightsOn ? 'LUCES: ON' : 'LUCES: OFF'}</span>
          </button>

          {/* CRT Noise Reset */}
          <button
            onClick={() => {
              AudioFeedbackService.playCameraSwitchStatic()
              HapticsService.tap()
              setIsFlickering(true)
              setTimeout(() => setIsFlickering(false), 300)
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 text-purple-200 font-pixel text-[8px] transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            <span>ESTÁTICA CRT</span>
          </button>
        </div>
      </div>
    </div>
  )
}
