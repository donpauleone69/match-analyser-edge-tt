/**
 * Portable match file — download a match as JSON, import one back.
 * Same bundle as cloud sync, so a file restores without any account.
 * Video files travel separately (or via the cloud) and re-link by asset id.
 */

import { readMatchBundle, writeMatchBundle } from './bundleStore'
import { parseMatchBundle, summarizeMatchBundle, type MatchBundle } from './matchBundle'

export async function downloadMatchBundle(matchId: string): Promise<void> {
  const bundle = await readMatchBundle(matchId)
  if (!bundle) throw new Error('Match not found')
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `match_${matchId}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function importMatchBundleFile(file: File): Promise<{ bundle: MatchBundle; title: string }> {
  const text = await file.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('That file is not a match file')
  }
  const bundle = parseMatchBundle(json)
  await writeMatchBundle(bundle)
  const s = summarizeMatchBundle(bundle)
  return { bundle, title: `${s.heroName} vs ${s.villainName}` }
}
