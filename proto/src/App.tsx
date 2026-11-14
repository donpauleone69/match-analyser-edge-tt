import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { ScrollToTop } from '@/layout/ScrollToTop'
import { GatePage } from '@/pages/GatePage'
import { HomePage } from '@/pages/HomePage'
import { FindPage } from '@/pages/FindPage'
import {
  MatchPage,
  MatchIndexRedirect,
  MatchInsightsSection,
  MatchDetailsStub,
  MatchTagStub,
  MatchTagSetStub,
} from '@/pages/MatchPage'
import { InsightsPage, InsightsSectionPage } from '@/pages/InsightsPage'
import { AccountPage } from '@/pages/AccountPage'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<GatePage />} />
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/find" element={<FindPage />} />
          <Route path="/matches/:matchId" element={<MatchPage />}>
            <Route index element={<MatchIndexRedirect />} />
            <Route path="insights" element={<Navigate to="summary" replace />} />
            <Route path="insights/:section" element={<MatchInsightsSection />} />
            <Route path="details" element={<MatchDetailsStub />} />
            <Route path="tag" element={<MatchTagStub />} />
            <Route path="tag/:setId" element={<MatchTagSetStub />} />
          </Route>
          <Route path="/insights" element={<InsightsPage />}>
            <Route index element={<Navigate to="summary" replace />} />
            <Route path="story" element={<Navigate to="/insights/summary" replace />} />
            <Route path="reels" element={<Navigate to="/insights/summary" replace />} />
            <Route path="scope" element={<Navigate to="/insights/improve" replace />} />
            <Route path=":section" element={<InsightsSectionPage />} />
          </Route>
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
