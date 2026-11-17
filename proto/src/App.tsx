import { Navigate, Route, Routes } from 'react-router-dom'
import { APP_VERSION } from '@/version'
import { AppShell } from '@/layout/AppShell'
import { ScrollToTop } from '@/layout/ScrollToTop'
import { GatePage } from '@/pages/GatePage'
import { HomePage } from '@/pages/HomePage'
import { FindPage } from '@/pages/FindPage'
import {
  MatchPage,
  MatchIndexRedirect,
  MatchInsightsSection,
} from '@/pages/MatchPage'
import { TagSetScreen } from '@/features/tagging/TagSetScreen'
import { MatchDetails } from '@/features/match/MatchDetails'
import { MatchTagChecklist } from '@/features/match/MatchTagChecklist'
import { ArchiveRunner } from '@/features/match/archiveJobs'
import { DiscardUntouched } from '@/layout/DiscardUntouched'
import { InsightsPage, InsightsSectionPage } from '@/pages/InsightsPage'
import { AccountPage } from '@/pages/AccountPage'

export default function App() {
  return (
    <>
      <p
        data-build-version=""
        className="pointer-events-none fixed top-1 right-2 z-50 text-[10px] font-medium leading-none text-muted"
      >
        {APP_VERSION}
      </p>
      <ScrollToTop />
      <DiscardUntouched />
      <ArchiveRunner />
      <Routes>
        <Route path="/" element={<GatePage />} />
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/find" element={<FindPage />} />
          <Route path="/matches/:matchId" element={<MatchPage />}>
            <Route index element={<MatchIndexRedirect />} />
            <Route path="insights" element={<Navigate to="summary" replace />} />
            <Route path="insights/:section" element={<MatchInsightsSection />} />
            <Route path="details" element={<MatchDetails />} />
            <Route path="tag" element={<MatchTagChecklist />} />
            <Route path="tag/:setId" element={<TagSetScreen />} />
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
