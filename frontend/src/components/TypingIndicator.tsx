interface TypingIndicatorProps {
  typingUserEmail: string | null
}

export function TypingIndicator({ typingUserEmail }: TypingIndicatorProps) {
  if (!typingUserEmail) return null

  return (
    <div className="px-4 py-1 text-sm text-gray-500 italic">
      {typingUserEmail} is typing...
    </div>
  )
}
