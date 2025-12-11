# Next MVP Steps

> **Version:** 1.0  
> **Last Updated:** 2025-12-11  
> **Status:** Active Development Plan

This document outlines the immediate next steps for the MVP, prioritized by impact and dependencies.

---

## Phase 1: Essential Fixes & Improvements

**Timeline:** 1-2 weeks  
**Goal:** Fix critical issues preventing smooth tagging workflow

### 1. Video Player Improvements ⚠️ CRITICAL

**Problem:** Video player is janky during tagging phases, slowing down workflow.

**Quick Fixes:**
- [ ] Improve playback responsiveness (remove lag/stutter)
- [ ] Fix seek accuracy (precise frame navigation)
- [ ] Optimize constrained playback loop (Phase 2)
- [ ] Better keyboard shortcut handling (no missed inputs)
- [ ] Improve playback speed switching (instant, no delay)
- [ ] Fix video loading/buffering issues
- [ ] Add visual feedback for all video state changes
- [ ] Test and optimize for different video formats/sizes

**Impact:** HIGH — Enables fast, efficient tagging  
**Effort:** LOW-MEDIUM — Many small, targeted fixes  
**Priority:** P0 — Must fix before production use

---

### 2. Data Validation & Consistency Fixes

**Problem:** Inconsistencies between match-level data and tagging data.

**Fixes Needed:**
- [ ] Validate match scores vs. tagged rallies (point count mismatch)
- [ ] Check set scores vs. rally assignments
- [ ] Verify server rotation matches expected pattern
- [ ] Fix shot timestamps that fall outside rally bounds
- [ ] Ensure rally end reasons align with shot data
- [ ] Validate player assignments across shots
- [ ] Add data integrity checks on save
- [ ] Create repair utilities for existing bad data

**Implementation:**
- Add validation rules in `rules/validate/`
- Create data audit report in data viewer
- Auto-fix where possible, flag where manual review needed
- Add pre-save validation to prevent future inconsistencies

**Impact:** HIGH — Ensures accurate analytics  
**Effort:** MEDIUM — Need thorough validation logic  
**Priority:** P0 — Critical for data quality

---

### 3. UI/UX Polish & Theming

**Problem:** Disconnected, disjointed styling across the app.

**Tasks:**
- [ ] Define consistent color palette (primary, secondary, accent)
- [ ] Standardize spacing/padding system (4px/8px/16px grid)
- [ ] Consistent typography (font sizes, weights, line heights)
- [ ] Unified component styling (buttons, cards, inputs)
- [ ] Consistent border radius and shadows
- [ ] Dark mode support (optional but nice)
- [ ] Smooth transitions and animations
- [ ] Professional loading states and error messages
- [ ] Polish all modals and dialogs
- [ ] Responsive design improvements

**Reference:** Update `DesignSystem.md` with finalized tokens

**Impact:** MEDIUM — Professional appearance  
**Effort:** MEDIUM — Systematic component updates  
**Priority:** P1 — Important for user experience

---

## Phase 2: Architecture Evolution

**Timeline:** 2-3 weeks  
**Goal:** Shift to flexible, modular tagging system

### 4. Flexible Tagging Modules

**Current:** Phase 1 → Phase 2 → Phase 3 (prescribed order)  
**New:** Phase 1 (required) + optional modules (user choice)

**Architecture Changes:**

#### Phase 1 (Compulsory - No Change)
- Match setup
- Framework tagging (timestamps only)
- Creates baseline data

#### Optional Tagging Modules (New)

**Basic Module** (Replaces Phase 2 Essential):
- Intent (offensive/neutral/defensive)
- Quality (good/average/weak)
- Shot type (9 core types)
- Shot result (in/error type)
- **Sufficient for inference engine to work**

**Footwork Module:**
- Player position at contact
- Movement type (lateral/forward/back)
- Balance/weight transfer

**Distance Module:**
- Distance from table (contact point)
- Court position (FH/middle/BH)

**Timing Module:**
- Contact timing (early/mid/late)
- Timing relative to bounce (rising/peak/falling)

**Advanced Attributes Module:**
- Spin (detailed spin grid)
- Direction (cross-court/down-line)
- Placement (landing zone grid)
- Pressure level

**Implementation:**
- [ ] Redesign Phase 2 UI as module selector
- [ ] Allow users to pick which modules to tag
- [ ] Save module completion state per match
- [ ] Analytics adapt to available data modules
- [ ] Inference engine uses whatever data is available
- [ ] Allow tagging same match multiple times (add modules)

**Benefits:**
- Users study what interests them
- Faster tagging (do only what you need)
- Data richness grows over time
- Better UX (no forced workflow)
- Richer analytics as more modules tagged

**Impact:** HIGH — Better UX, richer data  
**Effort:** HIGH — Significant refactor  
**Priority:** P1 — Next major feature

---

## Phase 3: Production Readiness

**Timeline:** 3-4 weeks  
**Goal:** Deploy production app with authentication

### 5. Authentication & User Context

**Problem:** System doesn't know who the current user is.

**Features:**
- [ ] Supabase Auth integration
- [ ] Login/signup flow
- [ ] User profile linked to Player entity
- [ ] Current user context in stores
- [ ] Analytics defaults to current user as "player of interest"
- [ ] Role-based access (minimal restrictions, all data shared)
- [ ] User preferences/settings

**Impact:** HIGH — Personalized experience  
**Effort:** MEDIUM — Supabase Auth is well-documented  
**Priority:** P1 — Required for production

---

### 6. Supabase Migration

**Goal:** Cloud storage with offline-first approach.

**Status:** Much upfront work already done.

**Tasks:**
- [ ] Set up Supabase project
- [ ] Define database schema (PostgreSQL)
- [ ] Migrate entity types to Supabase tables
- [ ] Convert slug IDs to UUIDs (keep slugs as indexed fields)
- [ ] Set up TanStack Query for server state
- [ ] Implement sync strategy:
  - Local tagging uses Dexie (fast, offline)
  - Auto-save to Supabase when online
  - Optimistic updates
  - Conflict resolution
- [ ] Keep Dexie as cache layer
- [ ] Test offline → online sync
- [ ] Migration script for existing local data

**Reference:** See DataSchema.md Section 8 for migration guide

**Impact:** HIGH — Cloud storage, multi-device access  
**Effort:** HIGH — Complex migration  
**Priority:** P1 — Required for production

---

### 7. Vercel Deployment

**Goal:** Production deployment for public use.

**Prerequisites:**
- ✅ Video player optimizations complete
- ✅ Data validation fixes complete
- ✅ UI/UX polish complete
- ✅ Authentication implemented
- ✅ Supabase migration complete

**Tasks:**
- [ ] Set up Vercel project
- [ ] Configure environment variables
- [ ] Set up CI/CD pipeline
- [ ] Configure custom domain (optional)
- [ ] Set up error monitoring (Sentry)
- [ ] Set up analytics (Plausible/Vercel Analytics)
- [ ] Production build optimization
- [ ] Deploy and test
- [ ] Create user documentation

**Impact:** HIGH — App goes live!  
**Effort:** LOW-MEDIUM — Vercel makes deployment easy  
**Priority:** P1 — Final step

---

## Priority Summary

| Task | Priority | Effort | Impact | Dependencies |
|------|----------|--------|--------|--------------|
| Video Player Improvements | P0 | Low-Med | High | None |
| Data Validation Fixes | P0 | Medium | High | None |
| UI/UX Polish | P1 | Medium | Medium | None |
| Flexible Tagging Modules | P1 | High | High | None |
| Authentication & User Context | P1 | Medium | High | None |
| Supabase Migration | P1 | High | High | Authentication |
| Vercel Deployment | P1 | Low-Med | High | All above |

---

## Execution Strategy

### Week 1-2: Quick Wins
1. Video player fixes (P0)
2. Data validation fixes (P0)
3. Start UI/UX polish (P1)

### Week 3-4: Architecture
1. Flexible tagging modules design (P1)
2. Begin implementation
3. Continue UI/UX polish

### Week 5-6: User Features
1. Authentication & user context (P1)
2. Begin Supabase migration (P1)

### Week 7-8: Production
1. Complete Supabase migration (P1)
2. Testing and polish
3. Vercel deployment (P1)
4. Launch! 🚀

---

## Success Criteria

### Phase 1 Complete When:
- ✅ Video player is smooth and responsive
- ✅ No data inconsistencies between match and tagging data
- ✅ UI looks professional and cohesive

### Phase 2 Complete When:
- ✅ Users can choose which modules to tag
- ✅ Analytics work with any combination of modules
- ✅ Tagging workflow is flexible and intuitive

### Phase 3 Complete When:
- ✅ Users can create accounts and log in
- ✅ Data syncs to Supabase
- ✅ App deployed to Vercel and accessible to public
- ✅ System is stable and performant

---

## Notes

- **Video player fixes** should be prioritized — they're essential for efficient tagging
- **Data validation** prevents garbage data from affecting analytics
- **Flexible modules** is a major architectural change but offers huge UX benefits
- **Supabase migration** is the biggest single task — break into smaller pieces
- **Launch date:** Aiming for 8 weeks from now (early Feb 2026)

---

*This document will be updated as tasks are completed and priorities shift.*  
*See specAddendumMVP.md for detailed change history.*

