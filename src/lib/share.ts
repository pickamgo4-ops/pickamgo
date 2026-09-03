export async function shareLink({ title, text, url }: { title: string; text?: string; url: string }): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
    window.alert('Link copied to your clipboard.')
    return
  }

  window.prompt('Copy this link:', url)
}
