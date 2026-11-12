/**
 * Resumable (TUS) upload to Supabase Storage — needed for match videos (GBs).
 *
 * Supabase requires 6 MiB chunks. The upload URL is remembered per object +
 * size, so a dropped connection or closed tab resumes from the last chunk.
 */

const CHUNK_SIZE = 6 * 1024 * 1024
const RESUME_PREFIX = 'edgett.tus.'
const MAX_RETRIES = 4

export interface ResumableUploadInput {
  baseUrl: string
  anonKey: string
  accessToken: string
  bucket: string
  objectPath: string
  file: Blob
  contentType: string
  onProgress?: (sent: number, total: number) => void
}

function b64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function resumableUpload(input: ResumableUploadInput): Promise<void> {
  const { baseUrl, anonKey, accessToken, bucket, objectPath, file, contentType, onProgress } = input
  const endpoint = `${baseUrl}/storage/v1/upload/resumable`
  const resumeKey = `${RESUME_PREFIX}${bucket}/${objectPath}:${file.size}`
  const auth = { Authorization: `Bearer ${accessToken}`, apikey: anonKey, 'Tus-Resumable': '1.0.0' }

  // Server-built Location headers may carry an internal host; keep only the upload id
  const toUploadUrl = (location: string) => {
    const marker = '/upload/resumable/'
    const idx = location.indexOf(marker)
    return idx >= 0 ? `${endpoint}/${location.slice(idx + marker.length)}` : location
  }

  async function create(): Promise<string> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...auth,
        'Upload-Length': String(file.size),
        'Upload-Metadata': [
          `bucketName ${b64(bucket)}`,
          `objectName ${b64(objectPath)}`,
          `contentType ${b64(contentType)}`,
          `cacheControl ${b64('3600')}`,
        ].join(','),
        'x-upsert': 'true',
      },
    })
    const location = res.headers.get('Location')
    if (!res.ok || !location) throw new Error(`Upload could not start (${res.status}) ${await res.text()}`)
    const url = toUploadUrl(location)
    localStorage.setItem(resumeKey, url)
    return url
  }

  async function currentOffset(url: string): Promise<number | null> {
    const res = await fetch(url, { method: 'HEAD', headers: auth })
    if (!res.ok) return null
    const offset = Number(res.headers.get('Upload-Offset'))
    return Number.isFinite(offset) ? offset : null
  }

  let uploadUrl = localStorage.getItem(resumeKey)
  let offset = uploadUrl ? await currentOffset(uploadUrl) : null
  if (uploadUrl === null || offset === null) {
    uploadUrl = await create()
    offset = 0
  }
  onProgress?.(offset, file.size)

  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size))
    let attempt = 0
    for (;;) {
      try {
        const res = await fetch(uploadUrl, {
          method: 'PATCH',
          headers: { ...auth, 'Upload-Offset': String(offset), 'Content-Type': 'application/offset+octet-stream' },
          body: chunk,
        })
        if (res.status === 409) {
          const serverOffset = await currentOffset(uploadUrl)
          if (serverOffset === null) throw new Error('Upload expired')
          offset = serverOffset
          break
        }
        if (!res.ok) throw new Error(`Upload failed (${res.status}) ${await res.text()}`)
        offset = Number(res.headers.get('Upload-Offset')) || offset + chunk.size
        break
      } catch (err) {
        if (++attempt > MAX_RETRIES) throw err
        await sleep(1000 * 2 ** attempt)
      }
    }
    onProgress?.(offset, file.size)
  }
  localStorage.removeItem(resumeKey)
}
