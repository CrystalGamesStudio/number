import { useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import Picker from 'emoji-picker-react'

interface MessageInputProps {
  onSend: (content: string) => void
  onFileUpload?: (file: File) => Promise<void>
  disabled?: boolean
  onInputChange?: () => void
}

export function MessageInput({ onSend, onFileUpload, disabled = false, onInputChange }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (content.trim()) {
      onSend(content.trim())
      setContent('')
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !onFileUpload) return

    setPendingFile(file.name)
    setUploading(true)
    try {
      await onFileUpload(file)
    } finally {
      setUploading(false)
      setPendingFile(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleCancelUpload() {
    setUploading(false)
    setPendingFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleEmojiClick(emojiData: { emoji: string }) {
    setContent(prev => prev + emojiData.emoji)
    onInputChange?.()
    const recent = JSON.parse(localStorage.getItem('recent-emojis') || '[]') as string[]
    const updated = [emojiData.emoji, ...recent.filter((e: string) => e !== emojiData.emoji)].slice(0, 10)
    localStorage.setItem('recent-emojis', JSON.stringify(updated))
  }

  useEffect(() => {
    if (!showPicker) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowPicker(false)
    }
    function handleClickOutside(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="p-4 border-t border-theme relative">
      {uploading && pendingFile && (
        <div className="flex items-center gap-2 mb-2 text-sm text-secondary">
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <span className="text-xs mt-1 block">{pendingFile}</span>
          </div>
          <button
            type="button"
            onClick={handleCancelUpload}
            className="text-red-500 hover:text-red-700 text-sm"
            aria-label="Cancel upload"
          >
            Cancel
          </button>
        </div>
      )}
      {showPicker && (
        <div role="dialog" aria-label="Emoji picker" className="absolute bottom-full left-0 mb-2">
          <Picker onEmojiClick={handleEmojiClick} />
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="px-3 py-2 text-sm text-secondary hover:text-green disabled:text-muted rounded-xl transition-colors"
          aria-label="Attach file"
        >
          Attach
        </button>
        <button
          type="button"
          onClick={() => setShowPicker(v => !v)}
          className="px-3 py-2 text-sm text-secondary hover:text-green disabled:text-muted rounded-xl transition-colors"
          aria-label="Emoji picker"
        >
          Emoji
        </button>
        <input
          type="text"
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            onInputChange?.()
          }}
          disabled={disabled || uploading}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-theme rounded-xl focus:border-green focus:ring-2 focus:ring-green/20 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={disabled || !content.trim() || uploading}
          className="px-4 py-2 bg-green text-white rounded-xl hover:bg-green-hover disabled:bg-muted disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  )
}
