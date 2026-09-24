/**
 * Inline preview for retrieved IPFS bytes.
 * Viewable types render in place; anything else returns null
 * (callers fall back to a force-download).
 */
export function PreviewPane({
  url,
  type,
  name,
}: {
  url: string
  type: string
  name: string
}) {
  if (type.startsWith('image/')) {
    return (
      <img
        src={url}
        alt={name}
        style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }}
      />
    )
  }
  if (type.startsWith('video/')) {
    return (
      <video
        src={url}
        controls
        style={{ maxWidth: '100%', borderRadius: '8px' }}
      />
    )
  }
  if (type.startsWith('audio/')) {
    return <audio src={url} controls style={{ width: '100%' }} />
  }
  if (type === 'application/pdf' || type.startsWith('text/')) {
    return (
      <iframe
        src={url}
        title={name}
        style={{
          width: '100%',
          height: '400px',
          border: '0',
          borderRadius: '8px',
          background: 'white',
        }}
      />
    )
  }
  return null
}
