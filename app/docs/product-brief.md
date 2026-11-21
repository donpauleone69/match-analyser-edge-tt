# Edge TT Match Analyser: product brief

Updated 20 Nov 2026. Conflicts and sources: [product-brief-review.md](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/docs/product-brief-review.md) in Context.

## 1. Goal and users

Edge TT Match Analyser lets a table tennis player tag their own match and match video quickly and accurately, turning the tags into insights. These insights can be viewed per match or globally, as data and short video reels.

It is for players who film their matches (players first, then coaches), and it is phone first for input and review. The product wins when tagging is fast, painless and accurate, and the data and insights are valuable for coaching, improvement and tracking improvement. The video reels show strengths and weaknesses to watch, download and share with a coach, alongside statistics and data over time.

## 2. Key user flows

**Match setup.** A new match opens on Details. Opponent, event, date, result and set scores are optional, any time. Scores that disagree with tagging are flagged.

**Tag page.** A match's videos and sets in one place. Videos sit in play order, one card each with a timeline, under a preview player. Each set is marked by dragging its start and end, with its number and whether it was fully filmed. A set may run onto the next video. Each set has one button: Tag, Continue or Open.

**Set Tagger.** Tags one set, a rally at a time, eyes on the video. Pick who serves, tap each contact live, then answer a few quick questions on large thumb regions; the last answer saves the rally. When the set is won, Save set returns to the Tag page. Edit Set steps through rallies to edit or delete, and through gaps to insert a missed rally. Score and server follow every edit.

**Insights.** Not built yet, but core. One screen for a match or all matches, with filters. Each section shows a few stats backed by reels to watch and download.

Status: prototype v0.17.4. Edit Set gaps is built, not merged. Set marking in the cards and Save set exit are planned.

## 3. Shared product concepts

- **Structure:** Match, Set, Rally, Shot (one contact). Videos are in play order; each set has one mark on them. Sides are You and Them.
- **Captured:** video, contact times, set marks, optional match context and scores.
- **Tagged:** a few answers per shot and rally, asked the same way every rally so rallies compare, plus optional marks.
- **Derived:** everything that follows from contacts and answers: hitters, winner, score, server, rally phases, stats and reels. Never asked, never stored as answers.
- **Rules:**
  - Accuracy over volume. Leave data out rather than collect it badly, and a blank never counts as an answer.
  - Tags stay with their contacts. Any edit recomputes everything derived.
  - Incomplete rallies stay out of stats.
  - Mistakes are expected: problems are flagged and easy to fix, not silently corrected.
  - A match is tagged once.
  - Insights lead to reels, never dead-end numbers.
