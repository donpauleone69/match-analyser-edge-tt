# How the rally simulator emerged

15 Nov 2026. Times are Europe/Lisbon (UTC+0). Sources: the coordinator transcript, the three worker transcripts named below, the model log, the pass 1 and pass 2 plans, and `git log` on `cursor/mvp-proto-shell-d372`.

The thing Paul later called the rally simulator is the drawn picture in the proto Tag screen: a table, two bats, and a ball on a clock, following a scripted match. Red on attack, bounce dots, and the answer key came the next day.

## Timeline

**13 Nov.** A project preference is recorded: "No real video in git. Agents generate ffmpeg fixture locally for controls/smoke." The fixture used on the real app was a moving dot and a clock. It is not the drawn match.

**14 Nov, after 11:03 PM.** Paul asks for the real app's pass 1 method inside the proto Tag page, built overnight: "the logic and actual tagging functionality is sound... incorporated into the new tagging framework." He does not mention a drawn table or a ball.

**15 Nov, 12:43 AM.** The coordinator (the coordinating chat; the model log records it as Fable 5.2 high) starts worker `bc-c7889599`, also Fable 5.2 high. The brief says the proto "should behave, not just look: tapping contacts against a playing stand-in video timeline" and that the plan must say what is real and what is faked. The brief does not say "drawn table".

**Same night, before the plan is delivered.** In that worker's own notes the stand-in becomes "a requestAnimationFrame clock" plus "an animated ball that bounces between the two ends at scripted contact times, so tapping can be timed against something moving."

**1:08 AM.** The worker delivers `proto-tagging-plan.md`. The faked video is written as: "a stand-in: a drawn table and a ball driven by a clock, following a scripted match (serves, contacts, gaps between points, a break between sets, two videos for Club night). The ball changes direction at each scripted contact, so there is something true to tap against. No file, no sound."

**Just after 1:08 AM.** The coordinator approves the plan and adds two changes. One of them is a real local file as a second picture, played through a blob URL, tagged on the same clock. The drawn stand-in stays the demo.

**1:20 AM.** Commit `f1fa478`. `proto/src/features/tagging/script.ts` lands, headed "Scripted stand-in for match video... so there is something true to tap against. No file, no sound."

**1:33 AM.** Commit `1f8b604`. The set view draws the table and the ball. Same worker, Fable 5.2 high.

**About 1:52 AM.** The coordinator, looking at the builder's screenshots: the plan had a ball driven by a clock, and the pictures show the table and two paddles with no ball in view.

**2:05 AM.** Commit `d532f0d`. Same worker. "demo ball made obvious with a toss and a pause between points."

**3:44 AM.** Commit `9af9a32`. Same worker. The script becomes a whole decided match, so the end of the video is the end of the match.

**After 9:33 AM. The coordinator is acting on the notes by 10:16 AM.** Paul, on desktop at `11b00d2`: "The video simulator you built is very useful though as it gives me and you and agents something to tag. does it actually simulate the rally, if so it could be slightly improved for testing purposes so it indicates more things that could be tagging (examples make the ball red on attack shot, show a dot on the table when the ball bounces) this simulator is what made me realise you misclick with a winner for instance." This is the first time anyone calls it a simulator. The chat message itself has no clock time.

**10:16 AM.** The coordinator sends those notes to the review worker `bc-ac1fd965` (Fable 5.2 high) and adds a starting position Paul had not written: ball colour on attack, a bounce dot, a net or long or wide cue on the end shot, and "an Answer key switch that compares what was tagged with the script per rally... That would also give agents a tagging accuracy score."

**10:41 AM.** The reviewer agrees, and pushes back in `internal/proto-tagging-pass-2-findings.md`: a word such as "Long" gives the answer away. Prefer the physical cues. The script first has to know wing, stroke, and a bounce, which it did not.

**10:42 AM.** The coordinator keeps the answer key in the plan (item 13) because it scores later passes. Item 12 is the picture: red on attack, a bounce dot, a winner that bounces before it passes the bat. Paul agrees the plan. Go is 11:09 AM.

**11:09 AM to 11:53 AM.** The demo job is a fork, `bc-1f74960f`. The coordinator left the model unset, so the fork started on the coordinator's model (Fable). At 11:49 the coordinator stops it and puts it on Sonnet 5.5 high. At 11:53, after Paul names the Cursor usage pool, the coordinator stops it again and puts it on Grok 4.7 high. The agent record fetched later lists `originalModelName` as `grok-4.7-high`.

**11:47 AM.** Commit `b09292d`: "Proto demo video: every shot has a wing, a stroke and a landing point, and the picture shows them." Author time is before the 11:49 stop.

**12:11 PM.** Commit `ed915ff`: the answer key, and seeded rallies start 2 seconds before the serve. The worker reports both commits pushed at 12:12 PM, rebased onto `284a054`. The model log groups `b09292d` and `ed915ff` as the Grok delivery (about 20 minutes on Grok).

**12:29 PM.** A fresh reviewer, `bc-f54d5f97`, Fable 5.2 medium: ready to try, eight faults, none a wrong tag. The coordinator then asks for a wing and stroke caption on the picture, on by default. The morning reviewer had argued against word cues.

**12:51 PM and 12:53 PM.** Same builder, now on Grok 4.7 high. `1ff41ae` (captions, and the key names the worst tap) and `d3ac78d` (a caption stays until the next contact or 0.8s). The 0.2s caption was a mistake in the coordinator's brief. The model log says the builder followed it.

**3:44 PM.** Paul, on tag `proto-tagging-pass-2` (`28babd5`): "The Rally simulator module that is in here.... this is actually amazing. Please extract this as a seperate thing that can be developed. It can be used in another app, or this app as a tactics simulator, replayer for points with tactical errors, replayer for tagged points.... i see the players even play over the table and have forehand and backhand wing." He also asks for a later audit screen, real clip above and generated picture below, and a live side by side view.

**From 3:47 PM.** The pass 3 plan (a fresh Fable 5.2 high worker) records item 1 as "Rally simulator as its own thing", agrees, and leaves it out of the pass. The model log's short line is: "Paul called the Grok-built rally simulator amazing."

## What the record shows

- Paul asked for the real tagging method in the proto, overnight, with no match video in git. He did not ask for a drawn rally.
- The coordinator asked for a playing stand-in timeline and a split between real and faked.
- The Fable 5.2 high builder (`bc-c7889599`) turned that into a drawn table, a scripted ball, and the commits through `9af9a32`.
- Paul named it a simulator the next morning and asked for red on attack and bounce dots, because a winner and a long shot looked alike.
- The coordinator added the answer key in the review brief. The same morning's reviewer (Fable 5.2 high) agreed and preferred physical cues over words.
- The picture commit `b09292d` is timestamped 11:47, before the switch to Grok. The answer key commit `ed915ff` is 12:11, after it. The model log calls both the Grok delivery.
- At 3:44 PM Paul asked to pull the module out as a tactics tool and a replayer. Pass 3 wrote that down and did not build it.

## Inference

The drawn match was the builder's way of meeting "behave, not just look" when the only allowed video was a generated fixture. Nothing in the record shows Paul or the coordinator specifying a table tennis table before that plan. The "amazing" line is about the pass 2 picture (wings, the ball turning, players over the table), which Paul saw after `b09292d`. Calling the whole simulator "Grok-built", as the model log does in one line, folds the overnight Fable drawing into the later trial.

The stand-in existed because a constraint and a one-line brief left a hole, and one builder filled it with something you could tap.
Paul supplied the name, the red ball, the bounce dot, and the later product, after using it for an hour.
The answer key was the coordinator turning that testing complaint into a score the next pass could trust, then a reviewer stopping the picture from reading the score aloud.
