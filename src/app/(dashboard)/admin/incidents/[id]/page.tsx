'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Download, Loader2, Paperclip, Save, ShieldAlert, Trash2 } from 'lucide-react'

type Attachment = {
  id: string
  fileName: string
  fileType: string
  fileUrl: string
  caption?: string | null
  createdAt: string
}

type Incident = {
  id: string
  reference: string
  incidentType: string
  severity: string
  status: string
  title: string
  description: string
  actionTaken?: string | null
  parentVisible: boolean
  parentNotified: boolean
  parentNotificationSummary?: string | null
  createdAt: string
  resolvedAt?: string | null
  driver?: { user?: { name?: string | null; email?: string | null; phone?: string | null }; company?: { name?: string } | null } | null
  schedule?: { routeName?: string; direction?: string | null; school?: { name?: string; address?: string | null } | null } | null
  pupil?: { fullName?: string; studentNumber?: string; parent?: { user?: { name?: string | null; email?: string | null; phone?: string | null } }; school?: { name?: string } | null } | null
  vehicle?: { regPlate?: string; make?: string | null; model?: string | null; type?: string | null } | null
  tripLog?: { status?: string; timestamp?: string; notes?: string | null; latitude?: number | null; longitude?: number | null } | null
  attachments: Attachment[]
}

function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

function badgeClasses(value: string) {
  if (value === 'CRITICAL') return 'bg-red-700 text-white'
  if (value === 'HIGH') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
  if (value === 'MEDIUM' || value === 'INVESTIGATING') return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
  if (value === 'RESOLVED' || value === 'CLOSED') return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AdminIncidentDetailPage() {
  const params = useParams<{ id: string }>()
  const incidentId = params.id
  const [incident, setIncident] = useState<Incident | null>(null)
  const [status, setStatus] = useState('OPEN')
  const [severity, setSeverity] = useState('MEDIUM')
  const [actionTaken, setActionTaken] = useState('')
  const [parentVisible, setParentVisible] = useState('true')
  const [parentSummary, setParentSummary] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCaption, setUploadCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const parentContact = useMemo(() => incident?.pupil?.parent?.user, [incident])

  async function loadIncident() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/incidents/${incidentId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Incident could not be loaded')
      setIncident(data)
      setStatus(data.status)
      setSeverity(data.severity)
      setActionTaken(data.actionTaken || '')
      setParentVisible(String(Boolean(data.parentVisible)))
      setParentSummary(data.parentNotificationSummary || '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Incident could not be loaded')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (incidentId) loadIncident()
  }, [incidentId])

  async function saveWorkflow() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/incidents/${incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          severity,
          actionTaken,
          parentVisible: parentVisible === 'true',
          parentNotificationSummary: parentSummary,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Workflow update failed')
      setIncident(data.incident)
      setMessage(data.notification?.notified ? `Workflow saved and ${data.notification.recipientCount} parent account(s) notified.` : 'Workflow saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Workflow update failed')
    } finally {
      setSaving(false)
    }
  }

  async function uploadAttachment() {
    if (!uploadFile) return
    if (uploadFile.size > 10 * 1024 * 1024) {
      setError('Attachment must be 10MB or smaller.')
      return
    }

    setUploading(true)
    setError(null)
    setMessage(null)
    try {
      const fileData = await fileToDataUrl(uploadFile)
      const response = await fetch(`/api/admin/incidents/${incidentId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: uploadFile.name, fileData, caption: uploadCaption }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Attachment upload failed')
      setMessage('Attachment uploaded.')
      setUploadFile(null)
      setUploadCaption('')
      await loadIncident()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Attachment upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function deleteAttachment(attachmentId: string) {
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/incidents/${incidentId}/attachments?attachmentId=${attachmentId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Attachment delete failed')
      setMessage('Attachment deleted.')
      await loadIncident()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Attachment delete failed')
    }
  }

  if (loading) {
    return <DashboardLayout title="Incident Review"><div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading incident...</div></DashboardLayout>
  }

  if (!incident) {
    return <DashboardLayout title="Incident Review"><div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error || 'Incident not found.'}</div></DashboardLayout>
  }

  return (
    <DashboardLayout title={`Incident ${incident.reference}`}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/admin/incidents" className="mb-3 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to incident queue</Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{incident.reference}: {incident.title}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Created {new Date(incident.createdAt).toLocaleString()} · {label(incident.incidentType)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClasses(incident.severity)}`}>{incident.severity}</span>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClasses(incident.status)}`}>{label(incident.status)}</span>
          </div>
        </div>

        {(message || error) && (
          <div className={`rounded-lg border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200' : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200'}`}>
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader><CardTitle>Incident narrative</CardTitle><CardDescription>Original report and operational context.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{incident.description}</p>
                {incident.actionTaken && <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900"><p className="text-sm font-semibold">Action already recorded</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{incident.actionTaken}</p></div>}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Info label="Route" value={incident.schedule?.routeName || 'Not linked'} />
                  <Info label="School" value={incident.schedule?.school?.name || incident.pupil?.school?.name || 'Not linked'} />
                  <Info label="Driver" value={incident.driver?.user?.name || 'Not linked'} />
                  <Info label="Vehicle" value={incident.vehicle?.regPlate ? `${incident.vehicle.regPlate} ${incident.vehicle.make || ''} ${incident.vehicle.model || ''}` : 'Not linked'} />
                  <Info label="Pupil" value={incident.pupil?.fullName || 'No individual pupil'} />
                  <Info label="Trip log" value={incident.tripLog ? `${incident.tripLog.status} at ${new Date(incident.tripLog.timestamp || incident.createdAt).toLocaleString()}` : 'Not linked'} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Workflow and parent communication</CardTitle><CardDescription>Changing status on a parent-visible incident sends a parent update when recipient context exists.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OPEN">Open</SelectItem><SelectItem value="INVESTIGATING">Investigating</SelectItem><SelectItem value="RESOLVED">Resolved</SelectItem><SelectItem value="CLOSED">Closed</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Severity</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="CRITICAL">Critical</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Parent visibility</Label><Select value={parentVisible} onValueChange={setParentVisible}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Parent-visible</SelectItem><SelectItem value="false">Internal only</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label htmlFor="action-taken">Action taken / resolution notes</Label><textarea id="action-taken" value={actionTaken} onChange={event => setActionTaken(event.target.value)} className="min-h-28 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Record investigation steps, safeguarding escalation, vehicle recovery, parent contact, or closure rationale." /></div>
                <div className="space-y-2"><Label htmlFor="parent-summary">Parent-facing summary</Label><textarea id="parent-summary" value={parentSummary} onChange={event => setParentSummary(event.target.value)} className="min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Optional concise message to include in parent notifications. Leave blank to use the incident description." /></div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"><ShieldAlert className="mr-2 inline h-4 w-4" /> Parent contact: {parentContact?.name || 'No linked parent'} {parentContact?.phone ? `· ${parentContact.phone}` : ''}. Notification sent: {incident.parentNotified ? 'yes' : 'no'}.</div>
                <Button onClick={saveWorkflow} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save workflow update</Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Evidence attachments</CardTitle><CardDescription>Upload photos or documents up to 10MB. Stored attachments are audited with file content redacted.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="incident-file">Attachment</Label><Input id="incident-file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={event => setUploadFile(event.target.files?.[0] || null)} /></div>
                <div className="space-y-2"><Label htmlFor="incident-caption">Caption</Label><Input id="incident-caption" value={uploadCaption} onChange={event => setUploadCaption(event.target.value)} placeholder="Optional evidence caption" /></div>
                <Button onClick={uploadAttachment} disabled={!uploadFile || uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Upload evidence</Button>

                <div className="space-y-3 pt-2">
                  {incident.attachments.length === 0 ? <p className="text-sm text-gray-500">No attachments uploaded.</p> : incident.attachments.map(attachment => (
                    <div key={attachment.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                      <p className="font-medium">{attachment.fileName}</p>
                      <p className="text-xs text-gray-500">{attachment.fileType} · {new Date(attachment.createdAt).toLocaleString()}</p>
                      {attachment.caption && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{attachment.caption}</p>}
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" asChild><a href={attachment.fileUrl} download={attachment.fileName}><Download className="h-3 w-3" /> Download</a></Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteAttachment(attachment.id)}><Trash2 className="h-3 w-3" /> Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Contact and context</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Parent" value={parentContact?.name || 'Not linked'} />
                <Info label="Parent phone" value={parentContact?.phone || 'Not linked'} />
                <Info label="Parent email" value={parentContact?.email || 'Not linked'} />
                <Info label="Driver phone" value={incident.driver?.user?.phone || 'Not linked'} />
                <Info label="Company" value={incident.driver?.company?.name || 'Not linked'} />
                <Info label="Resolved at" value={incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : 'Not resolved'} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}
