"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FileText, Upload, ShieldCheck, Car, Users, X, Download, Trash2, Eye,
  Calendar, Loader2, CheckCircle, AlertTriangle, File, Link as LinkIcon
} from "lucide-react"
import toast from "react-hot-toast"

interface Doc {
  id: string
  entityType: string
  entityId: string
  docType: string
  fileName: string
  fileUrl: string
  expiryDate: string | null
  uploadedBy: string | null
  createdAt: string
}

interface DriverOption { id: string; name: string; licenceNumber: string | null }
interface VehicleOption { id: string; regPlate: string; model: string }

const DOC_TYPES = [
  { type: "DBS Certificates", key: "DBS", icon: ShieldCheck, desc: "Driver background check certificates", entity: "DRIVER" },
  { type: "Vehicle MOT Records", key: "MOT", icon: Car, desc: "MOT certificates and history", entity: "VEHICLE" },
  { type: "Insurance Documents", key: "INSURANCE", icon: FileText, desc: "Company insurance policies", entity: "VEHICLE" },
  { type: "Driver Licences", key: "LICENCE", icon: Users, desc: "Scanned driver licence copies", entity: "DRIVER" },
]

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewType, setViewType] = useState<string | null>(null)
  const [uploadType, setUploadType] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [expiryDate, setExpiryDate] = useState("")
  const [selectedEntityId, setSelectedEntityId] = useState("")
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropFileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocs = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/documents")
      .then(r => r.json())
      .then(d => { setDocuments(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  // Fetch drivers and vehicles for linking
  useEffect(() => {
    fetch("/api/admin/drivers")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setDrivers(d.map((dr: any) => ({ id: dr.id, name: dr.user?.name || dr.name || "Unknown", licenceNumber: dr.licenceNumber })))
        }
      })
      .catch(() => {})

    fetch("/api/admin/vehicles")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setVehicles(d.map((v: any) => ({ id: v.id, regPlate: v.regPlate, model: v.model || "" })))
        }
      })
      .catch(() => {})
  }, [])

  function countByType(key: string) {
    return documents.filter(d => d.docType === key).length
  }

  function docsByType(key: string) {
    return documents.filter(d => d.docType === key)
  }

  function getEntityLabel(doc: Doc) {
    if (doc.entityType === "DRIVER") {
      const driver = drivers.find(d => d.id === doc.entityId)
      return driver ? driver.name : null
    }
    if (doc.entityType === "VEHICLE") {
      const vehicle = vehicles.find(v => v.id === doc.entityId)
      return vehicle ? vehicle.regPlate : null
    }
    return null
  }

  async function handleFileUpload(file: globalThis.File, docType: string) {
    if (!file) return

    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, JPEG, PNG, and WebP files are allowed")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB")
      return
    }

    // Determine entity type from docType
    const docDef = DOC_TYPES.find(d => d.key === docType)
    const entityType = docDef?.entity || "GENERAL"

    // Require entity selection for driver/vehicle docs
    if ((entityType === "DRIVER" || entityType === "VEHICLE") && !selectedEntityId) {
      toast.error("Please select a " + (entityType === "DRIVER" ? "driver" : "vehicle") + " first")
      return
    }

    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileData: dataUrl,
          docType,
          entityType,
          entityId: selectedEntityId || undefined,
          expiryDate: expiryDate || null,
        }),
      })

      if (res.ok) {
        toast.success('"' + file.name + '" uploaded successfully')
        setExpiryDate("")
        setSelectedEntityId("")
        setUploadType(null)
        fetchDocs()
      } else {
        const err = await res.json()
        toast.error(err.error || "Upload failed")
      }
    } catch {
      toast.error("Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  function fileToDataUrl(file: globalThis.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm('Delete "' + name + '"? This cannot be undone.')) return
    try {
      const res = await fetch("/api/admin/documents?id=" + id, { method: "DELETE" })
      if (res.ok) {
        toast.success("Document deleted")
        fetchDocs()
      } else {
        toast.error("Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    }
  }

  function handleDownload(doc: Doc) {
    const link = document.createElement("a")
    link.href = doc.fileUrl
    link.download = doc.fileName
    link.click()
  }

  function handleView(doc: Doc) {
    const win = window.open()
    if (win) {
      if (doc.fileUrl.startsWith("data:application/pdf")) {
        win.document.write('<iframe src="' + doc.fileUrl + '" style="width:100%;height:100%;border:none;" title="' + doc.fileName + '"></iframe>')
      } else {
        win.document.write('<img src="' + doc.fileUrl + '" alt="' + doc.fileName + '" style="max-width:100%;height:auto;" />')
      }
      win.document.title = doc.fileName
    }
  }

  function isExpiringSoon(date: string | null) {
    if (!date) return false
    const diff = new Date(date).getTime() - Date.now()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
  }

  function isExpired(date: string | null) {
    if (!date) return false
    return new Date(date).getTime() < Date.now()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setUploadType("GENERAL")
      handleFileUpload(file, "GENERAL")
    }
  }

  // Determine whether upload needs driver or vehicle selector
  const uploadDocDef = DOC_TYPES.find(d => d.key === uploadType)
  const needsDriverSelect = uploadDocDef?.entity === "DRIVER"
  const needsVehicleSelect = uploadDocDef?.entity === "VEHICLE"

  return (
    <DashboardLayout title="Document Vault">
      <div className="space-y-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Securely store DBS certificates, insurance documents, vehicle MOT records, and driver licences with expiry tracking.
        </p>

        {/* Category Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {DOC_TYPES.map((dt, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <dt.icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div>
                      <span className="font-semibold block">{dt.type}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 block">{dt.desc}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 block mt-0.5">
                        <LinkIcon className="h-3 w-3 inline mr-1" />
                        Linked to {dt.entity === "DRIVER" ? "drivers" : "vehicles"}
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600">{countByType(dt.key)}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setUploadType(dt.key); setSelectedEntityId("") }}
                    className="text-xs"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />Upload New
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewType(dt.key)}
                    className="text-xs"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />View All
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* General Upload Drop Zone */}
        <Card
          className={"border-dashed border-2 cursor-pointer transition-colors " + (
            dragOver
              ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800"
              : "border-gray-200 dark:border-gray-700"
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => dropFileInputRef.current?.click()}
        >
          <CardContent className="p-12 text-center">
            <Upload className={"h-10 w-10 mx-auto mb-3 " + (dragOver ? "text-black dark:text-white" : "text-gray-300 dark:text-gray-600")} />
            <span className="font-medium text-gray-600 dark:text-gray-400 block">Upload Document</span>
            <span className="text-sm text-gray-400 dark:text-gray-500 mt-1 block">Drag and drop or click to upload PDF, JPG, PNG files</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">Max file size: 10MB</span>
            <input
              ref={dropFileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  setUploadType("GENERAL")
                  handleFileUpload(file, "GENERAL")
                }
                e.target.value = ""
              }}
            />
          </CardContent>
        </Card>

        {/* Upload Modal */}
        {uploadType && (
          <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" onClick={() => { setUploadType(null); setSelectedEntityId("") }}>
            <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[calc(100vh-2rem)] overflow-y-auto my-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                  Upload {uploadDocDef?.type || "Document"}
                </h3>
                <button onClick={() => { setUploadType(null); setSelectedEntityId("") }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Driver selector for DBS / LICENCE */}
                {needsDriverSelect && (
                  <div className="space-y-1">
                    <Label>Select Driver <span className="text-red-500">*</span></Label>
                    <select
                      value={selectedEntityId}
                      onChange={e => setSelectedEntityId(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    >
                      <option value="">-- Choose a driver --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}{d.licenceNumber ? " (" + d.licenceNumber + ")" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Vehicle selector for MOT / INSURANCE */}
                {needsVehicleSelect && (
                  <div className="space-y-1">
                    <Label>Select Vehicle <span className="text-red-500">*</span></Label>
                    <select
                      value={selectedEntityId}
                      onChange={e => setSelectedEntityId(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    >
                      <option value="">-- Choose a vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.regPlate}{v.model ? " - " + v.model : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Expiry Date (optional)</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                  />
                </div>

                <div
                  className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-black dark:hover:border-white transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 block">Click to select a file</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 block mt-1">PDF, JPEG, PNG, WebP (max 10MB)</span>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, uploadType)
                    e.target.value = ""
                  }}
                />
              </div>
              </div>
            </div>
          </div>
        )}

        {/* View All Modal */}
        {viewType && (
          <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" onClick={() => setViewType(null)}>
            <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden my-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                  {DOC_TYPES.find(d => d.key === viewType)?.type || "Documents"}
                </h3>
                <button onClick={() => setViewType(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {docsByType(viewType).length === 0 ? (
                  <div className="text-center py-12">
                    <File className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <span className="text-gray-500 dark:text-gray-400 block">No documents uploaded yet</span>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => { setViewType(null); setUploadType(viewType); setSelectedEntityId("") }}
                    >
                      <Upload className="h-4 w-4 mr-1" />Upload First Document
                    </Button>
                  </div>
                ) : (
                  docsByType(viewType).map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        {doc.fileUrl.startsWith("data:application/pdf")
                          ? <FileText className="h-5 w-5 text-red-500" />
                          : <File className="h-5 w-5 text-blue-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm truncate block">{doc.fileName}</span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                          </span>
                          {getEntityLabel(doc) && (
                            <>
                              <span className="text-xs text-gray-300 dark:text-gray-600">{"\u2022"}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                <LinkIcon className="h-2.5 w-2.5 mr-0.5 inline" />
                                {getEntityLabel(doc)}
                              </Badge>
                            </>
                          )}
                          {doc.expiryDate && (
                            <>
                              <span className="text-xs text-gray-300 dark:text-gray-600">{"\u2022"}</span>
                              {isExpired(doc.expiryDate) ? (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Expired</Badge>
                              ) : isExpiringSoon(doc.expiryDate) ? (
                                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5 inline" />
                                  Expires {new Date(doc.expiryDate).toLocaleDateString("en-GB")}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  <Calendar className="h-2.5 w-2.5 mr-0.5 inline" />
                                  Expires {new Date(doc.expiryDate).toLocaleDateString("en-GB")}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(doc)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="View"
                        >
                          <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Download"
                        >
                          <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.fileName)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {docsByType(viewType).length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {docsByType(viewType).length} document{docsByType(viewType).length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setViewType(null); setUploadType(viewType); setSelectedEntityId("") }}
                  >
                    <Upload className="h-4 w-4 mr-1" />Upload More
                  </Button>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
