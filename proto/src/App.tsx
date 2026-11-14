import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { GatePage } from '@/pages/GatePage'
import { HomePage } from '@/pages/HomePage'
import { FindPage } from '@/pages/FindPage'
import {
  MatchPage,
  MatchInsightsStub,
  MatchDetailsStub,
  MatchTagStub,
} from '@/pages/MatchPage'
import {
  InsightsPage,
  InsightsStoryStub,
  InsightsReelsStub,
  InsightsScopeStub,
} from '@/pages/InsightsPage'
import { AccountPage } from '@/pages/AccountPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GatePage />} />
      <Route element={<AppShell />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/find" element={<FindPage />} />
        <Route path="/matches/:matchId" element={<MatchPage />}>
          <Route index element={<Navigate to="insights" replace />} />
          <Route path="insights" element={<MatchInsightsStub />} />
          <Route path="details" element={<MatchDetailsStub />} />
          <Route path="tag" element={<MatchTagStub />} />
        </Route>
        <Route path="/insights" element={<InsightsPage />}>
          <Route index element={<Navigate to="story" replace />} />
          <Route path="story" element={<InsightsStoryStub />} />
          <Route path="reels" element={<InsightsReelsStub />} />
          <Route path="scope" element={<InsightsScopeStub />} />
        </Route>
        <Route path="/account" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
