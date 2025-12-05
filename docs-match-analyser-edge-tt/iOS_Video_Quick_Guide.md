# iOS Video Loading - Quick Reference Guide

> **TL;DR:** Use **"Choose File"** instead of **"Photo Library"** for instant video loading on iOS!

---

## The 4 Options iOS Shows You

When you tap the video file picker on iOS, you see:

| Option | Speed | Why |
|--------|-------|-----|
| **1. Photo Library** | ❌ Slow (1-2 min) | iOS must transcode HEVC → MP4 |
| **2. Take Video** | ⚠️ Varies | Depends on camera recording format |
| **3. Choose File** | ✅ **Fast (instant!)** | Direct MP4, no transcoding |
| **4. Google Drive / iCloud** | ✅ Fast | Already MP4 format |

---

## Recommended Workflow

### **Option A: Use Files App (Fastest)** ⚡

**One-time setup:**
1. Open **Photos** app
2. Select your match video
3. Tap **Share** button (square with arrow)
4. Choose **Save to Files**
5. Save to "On My iPhone" or iCloud Drive

**Every time you tag:**
1. Tap video picker
2. Choose **"Choose File"**
3. Navigate to saved video
4. **Loads instantly!** ✨

### **Option B: Use Cloud Storage** ☁️

**Setup:**
1. Upload video to Google Drive or iCloud Drive
2. Video is automatically in MP4 format

**Usage:**
1. Tap video picker
2. Choose **Google Drive** or **iCloud**
3. Select video
4. Loads fast!

### **Option C: Photo Library (If You Must)** 🐌

**When to use:**
- First time only
- Don't mind waiting 1-2 minutes
- Can't use Files app

**What happens:**
1. iOS transcodes HEVC → MP4 (1-2 min wait)
2. Shows "preparing" progress indicator
3. **Happens on your device** - no upload!
4. Eventually loads

---

## Why Photo Library is Slow

### **Technical Explanation**

**iOS stores videos as:**
- Codec: HEVC/H.265 (Apple's format)
- Optimized for storage (smaller file size)
- Not universally supported in browsers

**Browsers need:**
- Codec: H.264 (standard MP4)
- Widely supported format
- Larger file size but better compatibility

**iOS must convert:**
```
HEVC Video (in Photos)
    ↓
iOS Transcoder (1-2 min, CPU-intensive)
    ↓
H.264 MP4 (in browser memory)
    ↓
Ready to play!
```

**Factors affecting transcode time:**
- Video length (5 min ≈ 1-2 min transcode)
- Resolution (4K takes longer)
- iPhone model (older = slower)
- Battery level (low battery = throttled CPU)

---

## File Format Compatibility

### **What Works Best**

| Format | Container | Codec | iOS Browser Support |
|--------|-----------|-------|---------------------|
| **MP4** | MP4 | H.264 | ✅ Perfect (instant) |
| **MOV** | QuickTime | H.264 | ✅ Good (usually instant) |
| **WebM** | WebM | VP8/VP9 | ⚠️ Limited (Safari may struggle) |
| **HEVC/H.265** | MP4 | HEVC | ❌ Requires transcoding |

### **How to Check Your Video Format**

**On iPhone:**
1. Open **Files** app
2. Long-press video file
3. Tap **Info** → Shows codec

**On Computer:**
1. Right-click video → Properties (Windows) or Get Info (Mac)
2. Look for "Codec" or "Video Codec"

---

## Optimizing Video for Tagging

### **Best Practices**

**1. Export from Camera Roll:**
- Use iOS **Shortcuts** app to batch convert
- Or use **iMovie** to export as MP4
- Saves to Files as H.264 (instant loading)

**2. Compress Large Videos:**
- Videos > 1GB may be slow on mobile
- Use **Video Compressor** app
- Target: 720p or 1080p, 10-15 Mbps bitrate

**3. Record in Compatible Format:**
- iPhone Settings → Camera → Formats
- Choose **"Most Compatible"** (not "High Efficiency")
- Records in H.264 instead of HEVC
- Slightly larger files but no transcoding needed

---

## Troubleshooting

### **"Preparing" Takes Forever (5+ minutes)**

**Causes:**
- Very large video (> 2GB)
- 4K resolution
- Old iPhone model
- Low battery (CPU throttled)

**Solutions:**
1. ✅ Use Files app instead (see Option A above)
2. ✅ Compress video before importing
3. ✅ Charge iPhone to 100%
4. ✅ Close other apps to free memory

### **Video Loads But Won't Play**

**Causes:**
- Unsupported codec
- Corrupted file
- Browser out of memory

**Solutions:**
1. Check file format (should be MP4/H.264)
2. Try different video file
3. Restart browser
4. Use desktop browser if available

### **File Picker Shows "Photo Library" Only**

**Cause:**
- File input restricted to photos/videos

**Solution:**
- This is normal iOS behavior
- Still shows "Choose File" option
- Use that instead!

---

## Performance Comparison

### **Real-World Examples**

**5-minute match video (500MB):**
| Method | Time to Load |
|--------|--------------|
| Photo Library | 1-2 minutes ⏳ |
| Choose File (MP4) | < 1 second ⚡ |
| Google Drive | 2-5 seconds ☁️ |

**15-minute match video (1.5GB):**
| Method | Time to Load |
|--------|--------------|
| Photo Library | 3-5 minutes ⏳ |
| Choose File (MP4) | < 1 second ⚡ |
| Google Drive | 5-10 seconds ☁️ |

---

## Summary

### **Quick Decision Tree**

```
Do you have the video in Files app already?
  ↓ YES → Use "Choose File" (instant!)
  ↓ NO  → Continue...

Can you export to Files app now?
  ↓ YES → Export, then use "Choose File" (worth it!)
  ↓ NO  → Continue...

Can you use Google Drive/iCloud?
  ↓ YES → Upload once, use forever (good option)
  ↓ NO  → Use Photo Library (wait 1-2 min)
```

### **Best Practice Recommendation**

**For serious tagging work:**
1. Set up Files app workflow (5 min setup, saves hours)
2. Keep match videos in "TT Videos" folder
3. Always use "Choose File" option
4. Enjoy instant loading! 🚀

---

*Last updated: 2025-12-05*


