import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Video, Users, Wifi } from 'lucide-react'
import { Header } from '../components/layout'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Badge } from '../components/ui'
import { useTaggingStore } from '../stores/taggingStore'
import { isMobileDevice } from '../helpers/videoFileHelpers'

export function MatchSetup() {
  const navigate = useNavigate()
  const { initMatch, reset } = useTaggingStore()
  
  const [player1Name, setPlayer1Name] = useState('')
  const [player2Name, setPlayer2Name] = useState('')
  const [firstServer, setFirstServer] = useState<'player1' | 'player2'>('player1')
  const [hasVideo, setHasVideo] = useState(true)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const isMobile = isMobileDevice()

  // Clean up video URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoUrl])

  // Create object URL when video file changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile)
      setVideoUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setVideoUrl(null)
    }
  }, [videoFile])

  const canProceed = player1Name.trim() && player2Name.trim() && (hasVideo ? videoFile : true)

  const handleSubmit = () => {
    // Reset any previous session
    reset()
    
    // Initialize the new match
    initMatch(
      player1Name.trim(),
      player2Name.trim(),
      firstServer,
      videoUrl
    )
    
    // Navigate to appropriate screen
    if (hasVideo) {
      navigate('/matches/new/tagging')
    } else {
      navigate('/matches/new/scores')
    }
  }

  return (
    <div className="min-h-screen">
      <Header title="Match Setup" showBack />
      
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Players Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-primary" />
              Players
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Player 1"
              placeholder="Enter player name"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
            />
            <Input
              label="Player 2"
              placeholder="Enter player name"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* First Server Selection */}
        <Card>
          <CardHeader>
            <CardTitle>First Server</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => setFirstServer('player1')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  firstServer === 'player1'
                    ? 'border-brand-primary bg-brand-primary-muted'
                    : 'border-neutral-600 hover:border-neutral-500'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-neutral-100">
                    {player1Name || 'Player 1'}
                  </div>
                  {firstServer === 'player1' && (
                    <Badge variant="brand" className="mt-2">Serving</Badge>
                  )}
                </div>
              </button>
              <button
                onClick={() => setFirstServer('player2')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  firstServer === 'player2'
                    ? 'border-brand-primary bg-brand-primary-muted'
                    : 'border-neutral-600 hover:border-neutral-500'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-neutral-100">
                    {player2Name || 'Player 2'}
                  </div>
                  {firstServer === 'player2' && (
                    <Badge variant="brand" className="mt-2">Serving</Badge>
                  )}
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Video Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-brand-primary" />
              Match Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Has Video Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVideo}
                onChange={(e) => {
                  setHasVideo(e.target.checked)
                  if (!e.target.checked) {
                    setVideoFile(null)
                  }
                }}
                className="w-5 h-5 rounded border-neutral-600 bg-neutral-700 text-brand-primary focus:ring-brand-primary focus:ring-offset-bg-card"
              />
              <span className="text-neutral-100">Match has video recording</span>
            </label>

            {hasVideo && (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      videoFile
                        ? 'border-success bg-success-muted'
                        : 'border-neutral-600 hover:border-brand-primary hover:bg-brand-primary-muted'
                    }`}
                  >
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/*"
                      className="hidden"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    />
                    {videoFile ? (
                      <div className="space-y-2">
                        <Video className="h-10 w-10 mx-auto text-success" />
                        <div className="font-medium text-neutral-100">{videoFile.name}</div>
                        <div className="text-sm text-neutral-400">
                          {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            setVideoFile(null)
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-10 w-10 mx-auto text-neutral-500" />
                        <div className="font-medium text-neutral-300">
                          Click to select video file
                        </div>
                        <div className="text-sm text-neutral-500">
                          MP4, MOV, or WebM
                        </div>
                        <div className="text-xs text-neutral-600 mt-3">
                          📱 On mobile: Choose from Photo Library or Files
                        </div>
                      </div>
                    )}
                  </div>
                </label>
                
                {!videoFile && isMobile && (
                  <div className="space-y-2">
                    <div className="px-4 py-3 rounded-lg bg-brand-primary-muted border border-brand-primary/30">
                      <div className="flex items-start gap-2">
                        <div className="text-lg mt-0.5 flex-shrink-0">⚡</div>
                        <div className="flex-1">
                          <p className="text-xs text-brand-primary font-medium">
                            iOS Speed Tip
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            Use <strong className="text-neutral-200">"Choose File"</strong> instead of "Photo Library" 
                            for instant loading (no transcoding wait).
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700">
                      <div className="flex items-start gap-2">
                        <Wifi className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-neutral-300 font-medium">
                            Why Photo Library is Slow
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            iOS must convert HEVC videos to MP4 (1-2 min). This happens locally on your device - no upload occurs.
                          </p>
                          <details className="mt-2">
                            <summary className="text-xs text-brand-primary cursor-pointer hover:underline">
                              How to speed this up →
                            </summary>
                            <div className="mt-2 text-xs text-neutral-500 space-y-1.5">
                              <p><strong className="text-neutral-400">1. Export to Files:</strong></p>
                              <p className="pl-3">• Open Photos app → Select video</p>
                              <p className="pl-3">• Tap Share → Save to Files</p>
                              <p className="pl-3">• Then use "Choose File" option</p>
                              <p className="mt-2"><strong className="text-neutral-400">2. Use Google Drive/iCloud:</strong></p>
                              <p className="pl-3">• Upload once, access anytime</p>
                              <p className="pl-3">• Already in MP4 format</p>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasVideo && videoFile && (
              <div className="p-4 rounded-lg bg-brand-primary-muted border border-brand-primary/30">
                <p className="text-sm text-brand-primary font-medium">
                  🔒 Your video stays on this device
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  No upload to servers. All processing happens locally.
                </p>
              </div>
            )}
            
            {!hasVideo && (
              <div className="p-4 rounded-lg bg-warning-muted border border-warning/30">
                <p className="text-sm text-warning">
                  Without video, you'll only be able to enter game scores (no shot tagging).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!canProceed}
            onClick={handleSubmit}
          >
            {hasVideo ? 'Start Step 1 (Tag Contacts)' : 'Enter Match Results'}
          </Button>
        </div>
      </div>
    </div>
  )
}
