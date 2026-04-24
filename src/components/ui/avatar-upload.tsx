'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Trash2, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AvatarUploadProps {
  currentImage?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  onSuccess?: (imageUrl: string | null) => void
}

const SIZES = {
  sm: { container: 'w-16 h-16', text: 'text-xl', icon: 'w-4 h-4' },
  md: { container: 'w-24 h-24', text: 'text-3xl', icon: 'w-5 h-5' },
  lg: { container: 'w-32 h-32', text: 'text-4xl', icon: 'w-6 h-6' },
}

export default function AvatarUpload({
  currentImage,
  name,
  size = 'lg',
  onSuccess,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const s = SIZES[size]

  const handleFile = useCallback((file: File) => {
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      await uploadImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [])

  const uploadImage = async (dataUrl: string) => {
    setUploading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Upload failed.')
        setPreview(currentImage ?? null)
        return
      }
      onSuccess?.(data.image)
    } catch {
      setError('Network error. Please try again.')
      setPreview(currentImage ?? null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' })
      if (res.ok) {
        setPreview(null)
        onSuccess?.(null)
      }
    } catch {
      setError('Failed to remove photo.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div
        className={`relative ${s.container} rounded-full group cursor-pointer`}
        onClick={() => !uploading && fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        title="Click to change photo"
      >
        {preview ? (
          <img
            src={preview}
            alt={name ?? 'Profile'}
            className="w-full h-full rounded-full object-cover border-4 border-white shadow-md"
          />
        ) : (
          <div className={`w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-4 border-white shadow-md`}>
            <span className={`${s.text} font-bold text-white`}>{initials}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className={`${s.icon} text-white animate-spin`} />
          ) : (
            <Camera className={`${s.icon} text-white`} />
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="text-xs"
        >
          <Upload className="w-3 h-3 mr-1" />
          {preview ? 'Change Photo' : 'Upload Photo'}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={handleRemove}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          // reset so same file can be re-selected
          e.target.value = ''
        }}
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 text-center max-w-48">{error}</p>
      )}

      <p className="text-xs text-slate-400">JPG, PNG, GIF or WebP · max 2 MB</p>
    </div>
  )
}
