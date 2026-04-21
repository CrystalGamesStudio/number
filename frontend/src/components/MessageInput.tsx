import { useState, useRef, FormEvent, useEffect } from 'react'
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
    <form ref={formRef} onSubmit={handleSubmit} className="p-4 border-t relative">
      {uploading && pendingFile && (
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
          <div className="flex-1">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
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
          className="px-2 py-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300"
          aria-label="Attach file"
        >
          Attach
        </button>
        <button
          type="button"
          onClick={() => setShowPicker(v => !v)}
          className="px-2 py-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300"
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
          className="flex-1 px-3 py-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        />
        <button
          type="submit"
          disabled={disabled || !content.trim() || uploading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </form>
  )
}
