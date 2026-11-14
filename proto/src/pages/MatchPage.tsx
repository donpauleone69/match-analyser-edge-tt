import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { WfBadge, WfEmpty, WfField, WfRow } from '@/layout/Wireframe'

/** Match hub: Insights, Details, Tag. */
export function MatchPage() {
  const { matchId = 'demo-1' } = useParams()
  const base = `/matches/${matchId}`

  return (
    <div>
      <PageHeader title="Match" subtitle={`Demo vs Opponent · ${matchId}`} />
      <HubTabs
        ariaLabel="Match sections"
        tabs={[
          { to: `${base}/insights`, label: 'Match Insights' },
          { to: `${base}/details`, label: 'Details' },
          { to: `${base}/tag`, label: 'Tag' },
        ]}
      />
      <Outlet />
    </div>
  )
}

export function MatchInsightsStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Match Insights</h2>
          <WfBadge>this match</WfBadge>
        </div>
        <p className="text-sm text-muted">Story and reels for this match.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="space-y-2">
          <CardTitle>Summary</CardTitle>
          <CardDescription>Set 1 11-7 · Set 2 open · FA 58% stub</CardDescription>
          <Button size="sm" disabled>
            Open Summary playlist (stub)
          </Button>
        </Card>
        <Card className="space-y-2">
          <CardTitle>Serve / Receive</CardTitle>
          <CardDescription>Categories B / C stub counts</CardDescription>
          <Button size="sm" disabled>
            Open S/R reel (stub)
          </Button>
        </Card>
        <Card className="space-y-2">
          <CardTitle>Work on</CardTitle>
          <CardDescription>Short-ball receive · 6 points</CardDescription>
          <Button size="sm" disabled>
            Open Work-on reel (stub)
          </Button>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="film" size="sm" className="text-brand" />
            <CardTitle>Reels</CardTitle>
          </div>
          <WfBadge>watch + download</WfBadge>
        </div>
        <CardDescription>Auto from tags. Clip nudge lives on Tag.</CardDescription>
        <ul className="space-y-2">
          <WfRow
            title="Highlight"
            meta="8 clips"
            trailing={
              <div className="flex gap-1">
                <Button size="sm" disabled>
                  Watch
                </Button>
                <Button size="sm" variant="secondary" disabled>
                  <Icon name="download" size="xs" />
                  Download
                </Button>
              </div>
            }
          />
          <WfRow
            title="Work on · short receive"
            meta="6 points"
            trailing={
              <div className="flex gap-1">
                <Button size="sm" disabled>
                  Watch
                </Button>
                <Button size="sm" variant="secondary" disabled>
                  Download
                </Button>
              </div>
            }
          />
          <WfRow title="Nothing tagged yet" meta="Empty until Pass 1 saves" trailing={<WfBadge>empty</WfBadge>} />
        </ul>
      </Card>

      <WfEmpty title="No point data" body="Summary / Work on / Reels empty until tagged." />
    </div>
  )
}

export function MatchDetailsStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Details</h2>
          <WfBadge>context + video</WfBadge>
        </div>
        <p className="text-sm text-muted">Opponent, event, scores, source video.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Match context</CardTitle>
          <div className="space-y-2">
            <WfField label="Opponent" value="Demo Opponent" />
            <WfField label="Handedness" placeholder="Right / Left" />
            <WfField label="Tournament / event" value="Club league" />
            <WfField label="Date" value="2026-11-08" />
          </div>
          <Button size="sm" disabled>
            Save context (stub)
          </Button>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Scores</CardTitle>
          <div className="grid grid-cols-2 gap-2">
            <WfField label="Set 1" value="11-7" />
            <WfField label="Set 2" value="In progress" />
            <WfField label="Set 3" placeholder="-" />
            <WfField label="Match result" placeholder="Best of 5" />
          </div>
          <Button size="sm" disabled>
            Save scores (stub)
          </Button>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="upload" size="sm" className="text-brand" />
            <CardTitle>Source video</CardTitle>
          </div>
          <WfBadge>attach here</WfBadge>
        </div>
        <CardDescription>Required before tagging.</CardDescription>
        <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-8 text-center space-y-2">
          <p className="text-sm font-semibold text-primary">demo-match.mp4</p>
          <p className="text-xs text-muted">~42 min · placeholder path</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled>
            <Icon name="upload" size="xs" />
            Attach video (stub)
          </Button>
          <Button variant="secondary" disabled>
            Replace video (stub)
          </Button>
          <Button variant="ghost" disabled>
            Remove (stub)
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function MatchTagStub() {
  const navigate = useNavigate()
  const { matchId = 'demo-1' } = useParams()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Tag</h2>
          <WfBadge>Job 1</WfBadge>
        </div>
        <p className="text-sm text-muted">Pass 1, rallies, clip timestamps.</p>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Pass 1 · set 2</CardTitle>
          <WfBadge>steps</WfBadge>
        </div>
        <ol className="space-y-2 list-decimal pl-5 text-sm text-primary">
          <li>
            <span className="font-semibold">Contacts</span>
          </li>
          <li>
            <span className="font-semibold">Key moments / phases</span>
            <span className="text-muted"> · end · FA or No Attack</span>
          </li>
          <li>
            <span className="font-semibold">Required shot details</span>
          </li>
          <li>
            <span className="font-semibold">Optional extras</span>
            <span className="text-muted"> · L/R · Review · ★</span>
          </li>
          <li>
            <span className="font-semibold">Save</span>
            <span className="text-muted"> · next rally or Done</span>
          </li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button disabled>Start Pass 1 (stub)</Button>
          <Button variant="secondary" disabled>
            Continue tagging (stub)
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/matches/${matchId}/insights`)}>
            Done to Insights
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Rallies</CardTitle>
          <ul className="space-y-2">
            <WfRow title="R1 · 0-0" meta="Won · FA" trailing={<WfBadge>edit</WfBadge>} />
            <WfRow title="R2 · 1-0" meta="Lost · No Attack" trailing={<WfBadge>edit</WfBadge>} />
            <WfRow title="R3 · open" meta="Resume Contacts" trailing={<WfBadge>active</WfBadge>} />
          </ul>
          <Button size="sm" disabled>
            Edit rally (stub)
          </Button>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="target" size="sm" className="text-brand" />
            <CardTitle>Clip timestamps</CardTitle>
          </div>
          <CardDescription>Nudge on source time.</CardDescription>
          <ul className="space-y-2">
            <WfRow title="R1 contact 1" meta="t=04:12.3" trailing={<WfBadge>stub</WfBadge>} />
            <WfRow title="R1 end" meta="t=04:18.0" trailing={<WfBadge>stub</WfBadge>} />
            <WfRow title="Highlight mark" meta="t=04:15.2" />
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled>
              Nudge -0.1s (stub)
            </Button>
            <Button size="sm" disabled>
              Nudge +0.1s (stub)
            </Button>
            <Button size="sm" variant="ghost" disabled>
              Jump to time (stub)
            </Button>
          </div>
        </Card>
      </div>

      <WfEmpty title="No video" body="Attach source video on Details first." />
    </div>
  )
}
