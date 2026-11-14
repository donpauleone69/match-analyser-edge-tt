import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { WfBadge, WfEmpty, WfField, WfRow } from '@/layout/Wireframe'

/** Match hub — Match Insights · Details · Tag. */
export function MatchPage() {
  const { matchId = 'demo-1' } = useParams()
  const base = `/matches/${matchId}`

  return (
    <div>
      <PageHeader
        title="Match"
        subtitle={`Demo vs Opponent · stub · ${matchId}`}
      />
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

/** Match-scoped story + reels (watch/download). Not Tag; not cross-match Insights. */
export function MatchInsightsStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Match Insights</h2>
          <WfBadge>this match</WfBadge>
        </div>
        <p className="text-sm text-muted">
          Ascertained story + reels for <em>this</em> match only. Numbers must open a playlist —
          no dead-end grids. Cross-match Story/Reels live on Insights hub.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="space-y-2">
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            Set 1 11–7 · Set 2 in progress · FA win rate stub 58% · opens Highlight reel.
          </CardDescription>
          <Button size="sm" disabled>
            Open Summary playlist — not wired
          </Button>
        </Card>
        <Card className="space-y-2">
          <CardTitle>Serve / Receive</CardTitle>
          <CardDescription>
            Categories B / C for this match (stub counts). Tap → reel of evidence.
          </CardDescription>
          <Button size="sm" disabled>
            Open S/R reel — not wired
          </Button>
        </Card>
        <Card className="space-y-2">
          <CardTitle>Work on (match)</CardTitle>
          <CardDescription>
            Short-ball receive · 6 points · Fix tag door → Tag / Edit rally.
          </CardDescription>
          <Button size="sm" disabled>
            Open Work-on reel — not wired
          </Button>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="film" size="sm" className="text-brand" />
            <CardTitle>Reels · watch + download</CardTitle>
          </div>
          <WfBadge>auto from tags</WfBadge>
        </div>
        <CardDescription>
          Reels are outcomes of tags — not clip timestamp editing (that’s Tag).
        </CardDescription>
        <ul className="space-y-2">
          <WfRow
            title="Highlight"
            meta="Show-reel · 8 clips · this match"
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
            meta="6 points · download for coach"
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
          <WfRow
            title="Nothing tagged yet"
            meta="Empty reel state until Pass 1 saves rallies"
            trailing={<WfBadge>empty</WfBadge>}
          />
        </ul>
      </Card>

      <WfEmpty
        title="No point data"
        body="When this match has nothing tagged: Summary / Work on / Reels show this empty card. Details + Tag stay usable."
      />
    </div>
  )
}

/** Opp / event / scores + raw video attach. */
export function MatchDetailsStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Details</h2>
          <WfBadge>context + video</WfBadge>
        </div>
        <p className="text-sm text-muted">
          Opponent · tournament · scores · date · <strong>raw video upload/attach</strong>. Job 1c
          context lives here (never a blocking gate). Tagging chrome stays on Tag.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Match context</CardTitle>
          <div className="space-y-2">
            <WfField label="Opponent" value="Demo Opponent" />
            <WfField label="Handedness" placeholder="Right / Left (stub)" />
            <WfField label="Tournament / event" value="Club league" />
            <WfField label="Date" value="2026-11-08" />
          </div>
          <Button size="sm" disabled>
            Save context — not wired
          </Button>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Scores</CardTitle>
          <div className="grid grid-cols-2 gap-2">
            <WfField label="Set 1" value="11 – 7" />
            <WfField label="Set 2" value="In progress" />
            <WfField label="Set 3" placeholder="—" />
            <WfField label="Match result" placeholder="Best of 5 (stub)" />
          </div>
          <Button size="sm" disabled>
            Save scores — not wired
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
        <CardDescription>
          Video required before tagging. Attach / replace lives on Details — not Tag, not Insights.
        </CardDescription>
        <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-8 text-center space-y-2">
          <p className="text-sm font-semibold text-primary">demo-match.mp4 (placeholder)</p>
          <p className="text-xs text-muted">~42 min · local / OPFS path stub · not a real file</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled>
            <Icon name="upload" size="xs" />
            Attach video — not wired
          </Button>
          <Button variant="secondary" disabled>
            Replace video — not wired
          </Button>
          <Button variant="ghost" disabled>
            Remove — not wired
          </Button>
        </div>
      </Card>
    </div>
  )
}

/** Tagging steps · rallies · clip timestamp nudge. Not reels. */
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
        <p className="text-sm text-muted">
          Pass 1 tagging · rally list · <strong>clip timestamps</strong> on source video. Clips =
          timestamps (nudge / review here). Reels = auto playlists → Match Insights.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Pass 1 · set 2</CardTitle>
          <WfBadge>steps</WfBadge>
        </div>
        <CardDescription>
          Wireframe of the real loop — no live contacts or shot gates in proto.
        </CardDescription>
        <ol className="space-y-2 list-decimal pl-5 text-sm text-primary">
          <li>
            <span className="font-semibold">Contacts</span>
            <span className="text-muted"> — mark through the point</span>
          </li>
          <li>
            <span className="font-semibold">Key moments / phases</span>
            <span className="text-muted"> — end · FA or No Attack</span>
          </li>
          <li>
            <span className="font-semibold">Required shot details</span>
            <span className="text-muted"> — compulsory gates</span>
          </li>
          <li>
            <span className="font-semibold">Optional extras</span>
            <span className="text-muted"> — phase L/R · Review flag · ★</span>
          </li>
          <li>
            <span className="font-semibold">Save</span>
            <span className="text-muted"> — next rally or Done → Match Insights</span>
          </li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button disabled>
            Start Pass 1 — not wired
          </Button>
          <Button variant="secondary" disabled>
            Continue tagging — not wired
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/matches/${matchId}/insights`)}>
            Done → Match Insights (nav only)
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Rallies (stub list)</CardTitle>
          <ul className="space-y-2">
            <WfRow title="R1 · 0–0" meta="Won · FA · tagged" trailing={<WfBadge>edit</WfBadge>} />
            <WfRow title="R2 · 1–0" meta="Lost · No Attack" trailing={<WfBadge>edit</WfBadge>} />
            <WfRow
              title="R3 · in progress"
              meta="Resume at Contacts"
              trailing={<WfBadge>active</WfBadge>}
            />
          </ul>
          <Button size="sm" disabled>
            Edit rally — not wired
          </Button>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="target" size="sm" className="text-brand" />
            <CardTitle>Clip timestamps · nudge</CardTitle>
          </div>
          <CardDescription>
            Clips are EDLs on source time — review / nudge here, not a top hub.
          </CardDescription>
          <ul className="space-y-2">
            <WfRow title="R1 contact 1" meta="t=04:12.3 · nudge ±0.1s" trailing={<WfBadge>stub</WfBadge>} />
            <WfRow title="R1 end" meta="t=04:18.0 · nudge ±0.1s" trailing={<WfBadge>stub</WfBadge>} />
            <WfRow title="★ Highlight mark" meta="t=04:15.2 · from optional extras" />
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled>
              Nudge −0.1s — not wired
            </Button>
            <Button size="sm" disabled>
              Nudge +0.1s — not wired
            </Button>
            <Button size="sm" variant="ghost" disabled>
              Jump to time — not wired
            </Button>
          </div>
        </Card>
      </div>

      <WfEmpty
        title="No video attached"
        body="Honest empty: cannot tag until Details has source video. CTA → Match Details attach."
      />
    </div>
  )
}
