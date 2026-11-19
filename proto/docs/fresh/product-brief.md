# Edge TT Match Analyser: product brief

Updated 19 Nov 2026. Conflicts and sources: [product-brief-review.md](../product-brief-review.md).

## 1. Goal and users

Edge TT Match Analyser lets a table tennis player tag their own match and match video quickly and accurately, turning the tags into insights. These insights can be viewed per match or globally, as data and as clips that play back as short video reels.

It is for players who film their matches (players first, then coaches), and it is phone first for input and review. The product wins when tagging is fast, painless and accurate, and the data and insights are valuable for coaching, improvement and tracking improvement. The video reels show strengths and weaknesses to watch, download and share with a coach, alongside statistics and data over time.

## 2. Core workflow

- **Start:** a match with optional context (opponent, event, date, result) and local video files.
- **Tag** one rally at a time: tap each contact live; the video pauses, then one question per shot: Serve (length and landing corner), each later shot (BH or FH, Attack or Control), then End. The last answer saves.
- **Fix** from the Rally Row: Not a shot, server toggle, Edit, Star, review marks.
- **Get back** match and global Insights (Summary, Serve, Receive, Improve), each with reels to watch and download.
- **Later:** archive video down to the tagged rallies.

## 3. Shared product concepts

- **Structure:** Match, Set, Rally, Shot (one contact). Videos are an ordered list per match, not mapped to sets. Sides are You and Them.
- **Captured:** contact times in source video seconds, video files, optional context and entered scores.
- **Tagged:** serve length and corner; wing and Attack or Control from shot 2; End (Winner, Net, Long); Star; review marks; server toggle.
- **Derived:** hitters, shot count, winner, score, server, first attack, Counter (attack after attack, saved as Attack), rally parts (Opening, Attack, Rally, End), reels.
- **Rules:**
  - Tags stay with their contacts; any contact change recomputes everything derived.
  - No inaccurate data: a blank never reads as an answer, and comparison tags sit at a fixed slot on every rally.
  - Incomplete rallies stay out of stats. Lets are dropped.
  - Continuity and score mismatches are flagged, not silently fixed.
  - No duplicate tagging. Right-handers only for now.
  - Insights lead to reels, never dead-end numbers.

## 4. Current focus and success

- **Now:** prototype tagging is agreed (`proto/` on `cursor/mvp-proto-shell-d372`, v0.16.1). Current step: phone portrait and landscape layout and theme, pending Paul's style guide sign-off. Repo docs and `app/` describe the older MVP.
- **Success:** Paul tags a real match on his iPhone end to end, looking away only to answer, and the reels show him what to work on.
- **Open decisions:**
  - Port the prototype into `app/` or grow `proto/`? Proto keeps no match data across reloads.
  - Durable storage: local first, Supabase later.
  - Real insights: proto Insights are stubs.
  - Wide as an End option; forced or unforced error as a new field.
  - Basic and Advanced completeness flags per rally.
  - Left-handers, placement, after-rally detail: parked.
