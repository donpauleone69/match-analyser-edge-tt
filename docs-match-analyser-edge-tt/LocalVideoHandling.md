# Local Video File Handling Architecture

> **Last Updated:** 2025-12-05  
> **Status:** ✅ Production Ready

---

## Overview

The Edge TT Match Analyser handles video files **entirely locally** on each device. Videos are never uploaded to any server, ensuring privacy, speed, and offline capability.

---

## Architecture Principles

### 1. Local-First Video Processing

```
User selects video file
    ↓
Browser creates File object (in device memory)
    ↓
App creates blob URL using URL.createObjectURL()
    ↓
Video player uses blob URL as src
    ↓
Video plays from device memory
    ↓
Blob URL revoked on cleanup (prevents memory leaks)
```

**Key Points:**
- ✅ No network upload occurs
- ✅ Video stays in device memory only
- ✅ Works offline after file selection
- ✅ Fast - no waiting for upload/download

### 2. Data Sync Strategy (Future Supabase)

**What WILL be synced to Supabase:**
- ✅ Match metadata (players, date, scores)
- ✅ Tagging data (rallies, shots, timestamps)
- ✅ Video metadata (filename, duration, file size)

**What WILL NOT be synced:**
- ❌ Actual video file content
- ❌ Blob URLs (ephemeral, can't be persisted)
- ❌ File paths (device-specific)

**Cross-Device Workflow:**
```
Device A: User tags match with video → data syncs to Supabase
Device B: User opens match → sees data, prompted to select same video file
```

User must manually transfer video file between devices if needed (AirDrop, cloud storage, etc.)

---

## iOS Photo Library Behavior

### What Users See

When selecting a video from iOS Photo Library:
1. User taps "Photo Library" in file picker
2. User selects a video
3. iOS shows "preparing" progress indicator
4. After ~5-10 seconds, video loads in app

### What's Actually Happening

**The "preparing" indicator is iOS doing LOCAL processing:**

1. **Video Storage Format:**
   - iOS stores videos in HEVC/H.265 format with proprietary metadata
   - Browsers require standard MP4/H.264 format

2. **Local Transcoding:**
   - iOS transcodes HEVC → MP4 **on your iPhone**
   - Creates temporary file in device memory
   - Hands File object to browser
   - **No network upload occurs**

3. **Why It Takes Time:**
   - 5-minute video ≈ 500MB-1GB file
   - Transcoding at ~30-60 FPS
   - CPU-intensive operation on mobile
   - All happens locally on device

### Proof It's Not Uploading

**Test 1: Airplane Mode**
- Enable Airplane Mode on iPhone
- Keep WiFi ON (for local network to dev server)
- Select video from Photo Library
- Video still loads → PROVES no internet upload

**Test 2: File Size vs Time**
- 500MB video would take 30+ seconds to upload over WiFi
- iOS "preparing" completes in ~5-10 seconds
- That's transcoding time, not upload time

**Test 3: Network Monitor**
- Check laptop dev server logs
- No large POST/PUT requests when video is selected
- Only small HTML/JS/CSS requests from browser

---

## Implementation Details

### Blob URL Lifecycle

```typescript
// 1. User selects video file
const file: File = fileInputElement.files[0]

// 2. Create blob URL (instant, local operation)
const blobUrl = URL.createObjectURL(file)
// Returns: "blob:http://localhost:5173/abc-123-def-456"

// 3. Pass to video player
<video src={blobUrl} />

// 4. Clean up when done
useEffect(() => {
  return () => {
    URL.revokeObjectURL(blobUrl)
  }
}, [blobUrl])
```

### Why Blob URLs Can't Be Persisted

```typescript
// ❌ This WILL NOT work across sessions:
localStorage.setItem('videoUrl', blobUrl)
// On page reload, blob URL is invalid (points to nothing)

// ✅ This WILL work:
localStorage.setItem('videoMetadata', JSON.stringify({
  fileName: file.name,
  fileSize: file.size,
  lastModified: file.lastModified
}))
```

**Blob URLs are ephemeral:**
- Valid only for current browser session
- Revoked when `URL.revokeObjectURL()` is called
- Automatically freed when tab closes
- Cannot be shared between devices/sessions

### Storage Architecture

| Data Type | Storage Location | Persisted? | Synced to Supabase? |
|-----------|------------------|------------|---------------------|
| Video file content | Device memory | ❌ No | ❌ No |
| Blob URL | JavaScript memory | ❌ No | ❌ No |
| File object | Browser memory | ❌ No | ❌ No |
| Video metadata | localStorage | ✅ Yes | ✅ Yes |
| Tagging data | localStorage | ✅ Yes | ✅ Yes |
| Match metadata | localStorage | ✅ Yes | ✅ Yes |

---

## Session Recovery Strategy

### Current Behavior (v0.9.x)

**Problem:**
- User selects video → starts tagging
- User closes browser tab
- User returns → tagging data exists, but no video
- User must re-select video file manually

**Why This Happens:**
- Blob URLs can't be persisted to localStorage
- File object references are lost on page unload
- Security: browsers don't allow automatic file access

### Planned Improvement (Post-MVP)

**Solution: Video Metadata + Smart Prompts**

```typescript
// On first video selection:
{
  videoFileName: "match_2025_12_05.mp4",
  videoFileSize: 156789234,
  videoFileHash: "abc123...", // SHA-256 for validation
  videoDuration: 1234.56,
  lastModified: 1701781234567
}

// On session recovery:
if (match.hasVideo && !videoUrl) {
  showBanner({
    message: "This match requires video: match_2025_12_05.mp4 (149.5 MB)",
    action: "Select Same Video File",
    onSelect: (file) => {
      // Validate file matches metadata
      if (file.name === metadata.fileName && 
          file.size === metadata.fileSize) {
        // Good to go!
        setVideoUrl(URL.createObjectURL(file))
      } else {
        showError("Please select the original video file")
      }
    }
  })
}
```

**Enhanced with File Hash Validation:**
- On first load, compute SHA-256 hash of video file
- Store hash in localStorage
- On re-selection, recompute hash and compare
- Guarantees user selected exact same video

---

## User Experience Improvements (v0.9.6)

### Mobile UX Enhancements

**Added Processing Indicator:**
```tsx
{isProcessingFile ? (
  <div>
    <Spinner />
    <p>Processing video...</p>
    <p>📱 On mobile? Your device is preparing the video for playback.</p>
    <p className="text-muted">This happens locally - no upload!</p>
  </div>
) : (
  <FilePickerUI />
)}
```

**Added Pre-Selection Guidance:**
```tsx
{isMobile && !videoFile && (
  <InfoPanel>
    💡 iOS Tip: When selecting from Photo Library, iOS may show a 
    "preparing" indicator. This is your device converting the video 
    for browser playback - not uploading anywhere!
  </InfoPanel>
)}
```

**Added Post-Selection Reassurance:**
```tsx
{videoFile && (
  <Badge>
    🔒 Your video stays on this device
    No upload to servers. All processing happens locally.
  </Badge>
)}
```

### Desktop UX

**Added Privacy Messaging:**
```tsx
<p className="text-xs text-neutral-600">
  🔒 Videos stay on your device
</p>
```

---

## Browser Compatibility

### Desktop Browsers

| Browser | File API | Blob URLs | Status |
|---------|----------|-----------|--------|
| Chrome 90+ | ✅ | ✅ | Full support |
| Firefox 88+ | ✅ | ✅ | Full support |
| Safari 14+ | ✅ | ✅ | Full support |
| Edge 90+ | ✅ | ✅ | Full support |

### Mobile Browsers

| Browser | File API | Blob URLs | Photo Library Access | Status |
|---------|----------|-----------|---------------------|--------|
| iOS Safari 14+ | ✅ | ✅ | ✅ | Full support* |
| iOS Chrome | ✅ | ✅ | ✅ | Full support* |
| Android Chrome | ✅ | ✅ | ✅ | Full support |
| Android Firefox | ✅ | ✅ | ✅ | Full support |

\* *Requires iOS to transcode HEVC videos (shown as "preparing" indicator)*

---

## Performance Characteristics

### File Selection Time

| Device | Video Length | File Size | iOS Transcoding | Blob URL Creation | Total Time |
|--------|--------------|-----------|-----------------|-------------------|------------|
| iPhone 12 | 5 min | 500 MB | ~5-7 sec | <100 ms | ~5-7 sec |
| iPhone 12 | 15 min | 1.5 GB | ~15-20 sec | <100 ms | ~15-20 sec |
| Desktop | Any | Any | N/A (direct MP4) | <100 ms | <1 sec |

### Memory Usage

| Video Size | Memory Impact | Notes |
|------------|---------------|-------|
| < 500 MB | Low | Safe for mobile |
| 500 MB - 2 GB | Medium | Works on modern phones |
| > 2 GB | High | May cause mobile browser crashes |

**Recommendations:**
- Suggest users compress videos before import if > 1GB
- Consider adding file size warnings in UI
- iOS automatically compresses when sharing from Photos app

---

## Security Considerations

### Blob URL Security

**Why blob URLs are safe:**
- ✅ Only accessible within same browser tab
- ✅ Can't be shared across origins
- ✅ Revoked when no longer needed
- ✅ No persistent storage

**Blob URL format:**
```
blob:http://localhost:5173/abc-123-def-456
       ↑                     ↑
    Origin (same as app)   Unique ID (unguessable)
```

### File Access Restrictions

**What browsers ALLOW:**
- ✅ User explicitly selects file via `<input type="file">`
- ✅ App creates blob URL from File object
- ✅ Video plays in `<video>` element

**What browsers BLOCK:**
- ❌ Automatic file access without user interaction
- ❌ Reading files outside user selection
- ❌ Persisting file access across sessions
- ❌ Accessing file system paths directly

---

## Troubleshooting

### iOS "Preparing" Takes Too Long

**Symptoms:**
- iOS shows "preparing" for 30+ seconds
- Progress bar seems stuck

**Causes:**
- Very large video file (> 2GB)
- High-resolution 4K video
- Low battery / throttled CPU
- Old iPhone model

**Solutions:**
1. Use iPhone's built-in video compression
2. Export video at lower resolution (1080p)
3. Charge device before transcoding
4. Use desktop browser instead

### Video Doesn't Load After Selection

**Symptoms:**
- File selected but video player shows empty
- No error message shown

**Debugging:**
1. Check browser console for errors
2. Verify file is actually a video (MIME type check)
3. Try different video file
4. Check file isn't corrupted

**Common Causes:**
- Unsupported codec (rare with MP4/MOV)
- Corrupted video file
- Browser out of memory
- File too large (> 4GB)

### Session Lost After Reload

**Expected Behavior:**
- Tagging data persists ✅
- Video URL does NOT persist ❌

**Why:**
- Blob URLs can't survive page reload
- Browser security restriction

**Solution:**
- User must re-select same video file
- Future: video metadata validation will help

---

## Future Enhancements

### Phase 1: Enhanced Session Recovery (Post-MVP)

**Features:**
- Store video file metadata (name, size, hash)
- Smart re-selection prompt with validation
- Prevent loading wrong video file

**Implementation:**
```typescript
// helpers/videoSessionRecovery.ts
export async function validateVideoFile(
  file: File,
  expectedMetadata: VideoMetadata
): Promise<boolean> {
  // Check basic metadata
  if (file.name !== expectedMetadata.fileName) return false
  if (file.size !== expectedMetadata.fileSize) return false
  
  // Compute hash for absolute certainty
  const hash = await computeFileHash(file)
  return hash === expectedMetadata.fileHash
}
```

### Phase 2: FileSystem Access API (Chrome/Edge Only)

**Benefits:**
- Store persistent file handle
- Automatic video re-access across sessions
- No need to re-select file

**Limitations:**
- Chrome/Edge only (not Safari/Firefox)
- Requires user permission grant
- Desktop only (not mobile)

**Fallback Strategy:**
- Feature detect FileSystem Access API
- Use for Chrome/Edge desktop users
- Fall back to manual re-selection for others

### Phase 3: IndexedDB Video Caching (Optional)

**Use Case:**
- Cache video chunks in IndexedDB
- Faster load on session recovery
- True offline capability

**Considerations:**
- Storage quota limits (~1-2GB typical)
- Only cache smaller videos (< 500MB)
- Add "Clear Cache" management UI
- User can opt-in/out

---

## API Reference

### Video File Helpers

See `app/src/helpers/videoFileHelpers.ts` for full implementation.

```typescript
// Format file size for display
formatFileSize(bytes: number): string
// Example: formatFileSize(156789234) → "149.5 MB"

// Extract video metadata
getVideoMetadata(file: File): VideoMetadata
// Returns: { fileName, fileSize, fileSizeFormatted, lastModified, type }

// Validate video file
validateVideoFile(file: File, maxSizeGB?: number): VideoValidation
// Returns: { isValid: boolean, error?: string }

// Estimate duration from file size
estimateVideoDuration(fileSizeBytes: number): string
// Example: estimateVideoDuration(156789234) → "~8m 30s"

// Detect mobile device
isMobileDevice(): boolean
// Returns: true on mobile browsers

// Get device-specific hint
getVideoPickerHint(): string
// Returns: Custom message for iOS/Android/Desktop
```

---

## Related Documentation

- **Architecture:** See `docs-match-analyser-edge-tt/Architecture.md`
- **Data Schema:** See `docs-match-analyser-edge-tt/DataSchema.md`
- **Change Log:** See `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` (2025-12-05 entry)

---

*Document Version: 1.0*  
*Last Updated: 2025-12-05*



