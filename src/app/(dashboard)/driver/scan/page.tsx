'use client'

import { useState, useRef, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  QrCode,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  User,
  School,
  AlertTriangle,
  Camera,
  Keyboard,
  RotateCcw,
  ShieldCheck,
  Video,
  VideoOff
} from 'lucide-react'

type BarcodeDetectorResult = { rawValue?: string }
type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]> }
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor
  }
}

interface ScanResult {
  valid: boolean
  outcome: 'green' | 'red'
  message: string
  scan?: {
    boardingRecorded: boolean
    routeId: string | null
    notifiedParent: boolean
    pickupVerified?: boolean
  }
  guardian?: {
    id: string
    name: string
    relationship: string
    phone?: string | null
  }
  pupil?: {
    id: string
    fullName: string
    identityCode?: string
    yearLevel: string
    school: string
    specialRequirements: string | null
    parentName: string
    parentPhone: string | null
    parentEmail: string | null
    pupilPhone: string | null
  }
}

interface Schedule {
  id: string
  routeName: string
  departureTime: string
  seatAssignments?: Array<{ pupil: { id: string; fullName: string; yearLevel?: string | null } }>
}

export default function DriverScanPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [scanMode, setScanMode] = useState<'manual' | 'camera'>('manual')
  const [manualInput, setManualInput] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [history, setHistory] = useState<Array<{ result: ScanResult; time: string }>>([])
  const [pickupPupilId, setPickupPupilId] = useState('')
  const [pickupCode, setPickupCode] = useState('')
  const [pickupResult, setPickupResult] = useState<ScanResult | null>(null)
  const [pickupLoading, setPickupLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraLoopRef = useRef<number | null>(null)
  const processingRef = useRef(false)

  useEffect(() => { fetchSchedules() }, [])

  useEffect(() => {
    if (scanMode !== 'camera') {
      stopCamera()
      return
    }
    return () => stopCamera()
  }, [scanMode])

  async function fetchSchedules() {
    try {
      const res = await fetch('/api/driver/schedule')
      const data = await res.json()
      setSchedules(data.schedules || [])
      if (data.schedules?.length > 0) {
        setSelectedScheduleId(data.schedules[0].id)
        setPickupPupilId(data.schedules[0].seatAssignments?.[0]?.pupil?.id || '')
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function processQrData(rawData: string) {
    if (!rawData.trim() || processingRef.current) return
    processingRef.current = true
    setScanning(true)
    setResult(null)
    try {
      const res = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: rawData,
          scheduleId: selectedScheduleId || undefined
        })
      })
      const data = await res.json()
      setResult(data)
      setHistory(prev => [{ result: data, time: new Date().toLocaleTimeString('en-GB') }, ...prev.slice(0, 9)])
      setManualInput('')
      if (data.outcome === 'green') stopCamera()
    } catch {
      setResult({
        valid: false,
        outcome: 'red',
        message: 'Failed to process QR code. Please try again.'
      })
    } finally {
      setScanning(false)
      processingRef.current = false
    }
  }

  async function startCamera() {
    setCameraError(null)
    if (!window.BarcodeDetector) {
      setCameraError('This browser does not support native camera QR detection. Use manual mode or a USB scanner on this device.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not available on this device. Use manual mode or a USB scanner.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      cameraLoopRef.current = window.setInterval(async () => {
        if (!videoRef.current || processingRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          const rawValue = codes[0]?.rawValue
          if (rawValue) await processQrData(rawValue)
        } catch (error) {
          console.error('Camera QR detection error:', error)
        }
      }, 800)
    } catch (error) {
      console.error(error)
      setCameraError('Camera permission was denied or the camera could not be opened. Please allow camera access or use manual mode.')
      stopCamera()
    }
  }

  function stopCamera() {
    if (cameraLoopRef.current) {
      window.clearInterval(cameraLoopRef.current)
      cameraLoopRef.current = null
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    processQrData(manualInput)
  }

  async function verifyPickup(e: React.FormEvent) {
    e.preventDefault()
    setPickupLoading(true)
    setPickupResult(null)
    try {
      const res = await fetch('/api/driver/guardian-pickup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: selectedScheduleId || undefined,
          pupilId: pickupPupilId || undefined,
          verificationCode: pickupCode,
        })
      })
      const data = await res.json()
      setPickupResult(data)
      setHistory(prev => [{ result: data, time: new Date().toLocaleTimeString('en-GB') }, ...prev.slice(0, 9)])
      if (res.ok) setPickupCode('')
    } catch {
      setPickupResult({ valid: false, outcome: 'red', message: 'Failed to verify guardian pickup. Please try again.' })
    } finally {
      setPickupLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setManualInput('')
    if (scanMode === 'manual') inputRef.current?.focus()
  }

  return (
    <DashboardLayout title="QR Boarding Scanner">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">QR Boarding Scanner</h1>
          <p className="text-slate-500">Scan pupil QR codes to verify booking status and record boarding</p>
        </div>

        <Card>
          <CardContent className="pt-4">
            <Label>Select Route (optional)</Label>
            <select
              className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedScheduleId}
              onChange={e => {
                setSelectedScheduleId(e.target.value)
                const nextSchedule = schedules.find(schedule => schedule.id === e.target.value)
                setPickupPupilId(nextSchedule?.seatAssignments?.[0]?.pupil?.id || '')
              }}
            >
              <option value="">No specific route</option>
              {schedules.map(s => (
                <option key={s.id} value={s.id}>
                  {s.routeName} ({s.departureTime})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Selecting a route enables booking verification against that specific trip
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant={scanMode === 'manual' ? 'default' : 'outline'}
            onClick={() => setScanMode('manual')}
            className="flex-1"
          >
            <Keyboard className="w-4 h-4 mr-2" /> Manual / USB Scanner
          </Button>
          <Button
            variant={scanMode === 'camera' ? 'default' : 'outline'}
            onClick={() => setScanMode('camera')}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" /> Camera
          </Button>
        </div>

        {scanMode === 'manual' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="w-5 h-5" /> Scan or Paste QR Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <Label>QR Code Data</Label>
                  <Input
                    ref={inputRef}
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    placeholder="Scan QR code, paste JSON data, or enter the 20-character identity code..."
                    className="font-mono text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Connect a USB QR scanner or manually type the pupil identity code if scanning is unavailable
                  </p>
                </div>
                <Button type="submit" disabled={scanning || !manualInput} className="w-full">
                  {scanning ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" /> Verify Boarding
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {scanMode === 'camera' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="w-5 h-5" /> Camera QR Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative overflow-hidden rounded-lg bg-slate-950 aspect-video border border-slate-200 dark:border-slate-800">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white/80">
                    <Camera className="w-12 h-12 mb-3" />
                    <p className="font-medium">Start the camera and point it at the pupil QR code.</p>
                    <p className="text-xs mt-1 text-white/60">The scan will verify the booking, record boarding, and notify the parent when successful.</p>
                  </div>
                )}
                {cameraActive && (
                  <div className="absolute inset-8 border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
                )}
              </div>

              {cameraError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={startCamera} disabled={cameraActive || scanning} className="flex-1">
                  <Video className="w-4 h-4 mr-2" /> Start Camera
                </Button>
                <Button onClick={stopCamera} disabled={!cameraActive} variant="outline" className="flex-1">
                  <VideoOff className="w-4 h-4 mr-2" /> Stop
                </Button>
              </div>
              <Button onClick={() => setScanMode('manual')} variant="ghost" className="w-full">
                Switch to Manual / USB Scanner
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="w-5 h-5" /> Guardian Pickup Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={verifyPickup} className="space-y-3">
              <div>
                <Label>Pupil being released</Label>
                <select
                  className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={pickupPupilId}
                  onChange={e => setPickupPupilId(e.target.value)}
                >
                  <option value="">Select pupil on this route</option>
                  {(schedules.find(schedule => schedule.id === selectedScheduleId)?.seatAssignments || []).map(assignment => (
                    <option key={assignment.pupil.id} value={assignment.pupil.id}>{assignment.pupil.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Guardian PIN or QR payload</Label>
                <Input value={pickupCode} onChange={e => setPickupCode(e.target.value)} placeholder="Enter guardian PIN or paste/scan guardian QR data" className="font-mono text-sm" />
                <p className="text-xs text-slate-400 mt-1">A successful verification records a DROPPED trip log and queues the parent drop-off notification.</p>
              </div>
              <Button type="submit" disabled={pickupLoading || !pickupPupilId || !pickupCode} className="w-full">
                {pickupLoading ? 'Verifying...' : 'Verify Guardian and Release'}
              </Button>
            </form>
            {pickupResult && (
              <div className={`mt-4 rounded-lg border p-3 text-sm ${pickupResult.outcome === 'green' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
                <p className="font-semibold">{pickupResult.message}</p>
                {pickupResult.guardian && <p>Guardian: {pickupResult.guardian.name} ({pickupResult.guardian.relationship})</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card className={`border-2 ${result.outcome === 'green' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                {result.outcome === 'green' ? (
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
                )}
                <p className={`text-lg font-bold ${result.outcome === 'green' ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
                {result.scan?.boardingRecorded && (
                  <p className="text-xs text-green-700 mt-2">
                    {result.scan.pickupVerified ? 'Pickup release recorded' : 'Boarding recorded'}{result.scan.notifiedParent ? ' and parent notification queued.' : '.'}
                  </p>
                )}
              </div>

              {result.pupil && (
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{result.pupil.fullName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Year {result.pupil.yearLevel}</p>
                    </div>
                  </div>

                  {result.pupil.identityCode && (
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Manual identity code</p>
                      <p className="font-mono text-sm tracking-[0.18em] text-slate-900 dark:text-white">{result.pupil.identityCode}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <School className="w-4 h-4" />
                    {result.pupil.school}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <User className="w-4 h-4" />
                    Parent: {result.pupil.parentName}
                  </div>

                  {result.pupil.parentPhone && (
                    <a href={`tel:${result.pupil.parentPhone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                      <Phone className="w-4 h-4" />
                      {result.pupil.parentPhone}
                    </a>
                  )}

                  {result.pupil.parentEmail && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Mail className="w-4 h-4" />
                      {result.pupil.parentEmail}
                    </div>
                  )}

                  {result.pupil.pupilPhone && (
                    <a href={`tel:${result.pupil.pupilPhone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                      <Phone className="w-4 h-4" />
                      Pupil: {result.pupil.pupilPhone}
                    </a>
                  )}

                  {result.pupil.specialRequirements && (
                    <div className="flex items-start gap-2 text-sm bg-amber-50 p-2 rounded text-amber-700">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{result.pupil.specialRequirements}</span>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={reset} className="w-full mt-4" variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" /> Scan Next
              </Button>
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Scans ({history.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      {h.result.outcome === 'green' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium">{h.result.pupil?.fullName || 'Unknown'}</span>
                      <Badge className={h.result.outcome === 'green' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {h.result.scan?.pickupVerified ? 'RELEASED' : h.result.outcome === 'green' ? 'BOARDED' : 'REJECTED'}
                      </Badge>
                    </div>
                    <span className="text-slate-400">{h.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
