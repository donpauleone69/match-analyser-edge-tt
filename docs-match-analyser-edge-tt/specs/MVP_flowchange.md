lets examine the next part of the app prior to building and update the spec the flow and the interface to make it better.... having been using the apps workflow so far, my user testing suggests the following flow:

1. Do part1 (match framework) - mark the entire video basically creating the match framework. However, instead of its own screen layout I would use the same screen framework that is used in part 2, (removing the timeline below the video) but having the "Match Panel" on the left, and speed controls on the right. The spacebar and cursor inputs create the rally structure in the left "Match Panel" frame as it goes. In addition to the cursor forward to mark the rally end and speed up the playback, there should be an end of set Button+keyboard shortcut that places an end of set timeStamp in the left panel, the logic for this is that it can be pressed after a point is marked as complete, but not otherwise.

To improve on this "Match Framework stage", the user must do a couple of things FIRST to set the "Match Details" of the Match Framework video. This starts with answering the first set of modal questions: Current Score at beginning of video Set (default 0-0), Current Points Score (default 0-0). (i'm considering even moving Player details questions here as well! Player 1, Player 2.) Match Format, Tournament, etc...) and then finally manually locating the first serve in the video using the videoplayer, adding its timestamp and identifying the first server here at this point.... this removes all the dead air in the video which will often be filming a long time before the match start. 

These details should be entered at the top of the "Match Panel" before the first rally as "Match Details" Box (colapsed). And the first "Point Details" Box can be populated with the first entry "Server Name" with the Serve timestamp. 

Note : This creates the initial framework required for the match enabling inference from this data and rules logic that could speed up data entry later. 

Also Note: These details, can infer future serve order based on table tennis rules. It can also infer by calculating backwards (number of points played) from the current server who started serving the set, and therefore who starts serving in the next set. Logic rules such as this should be defined in clear modules in the code. 

From here the user will then start marking the shots and point ends as described at the beginning of this section, until he is complete. (default speed for tagging should be x0.25, with slower options being 0.125 or faster option being 0.5 0.75 or 1x) The fastforward speed used between points should be default to 1x but also be able to speed up and slow down x0.5 x2 x3 x4 x5) whatever makes sense with the player

There may or may not be a complete match video, with it truncated beginning or end (or even in the middle... edge case)

As such, once all shots are marked in this phase, it would be good to put in the "match completion details" which finishes the entire Match framework (even if not all points in the match are recorded from video data) This would be a modal asking Match Result, Set Score, Point Score. This bookends the Left Panel with "Match Result"

Once complete we move onto the next part (same window layout though).

2. The concept here is to combine the current review phase and the shot tagging phase together on a per rally basis. Basically, you only focus on the active rally in the left "Point Details" Box in the Match Framework side panel. The other Boxes should have their details hidden (like a folded tree structure) 

Workflow through a rally: Editing the timestamp position would work much the same way (except you would get an extra maybe 0.2s played at the end of the "shot preview loop video" so you can see the shot result clearly, this however would not change the timestamp of the next shot, as its just for the preview. The "shot preview loop video" should also probably play at 0.5x speed default, but with an option on the interface to increase or decreases that speed).

Its structured with much more sequencing, you move/edit/delete the timestamp and then sequentially answer the specific shot questions for that shot in a quick entry modal format before moving onto the next shot. You do this for serve and each subsequent shot until the final timestamp in a point which is the "end of point" timestamp. We would adjust this timestamp position like the others (although this one doesn't loop, its just a still frame as we are not examing a shot, but rather clarifying the end of a point) we confirm it, and then clarify the end of point conditions through a final quick set of modal questions, starting with who won the point and the natural follow ups based on the point logic in the spec, and details from the previous shot tags (Starting with who won the point). Then a final confirmation, as the entire point is now tagged end to end.

Then the Point is stored, that "Point Details" Box folds, and the Next opens and the process continues until all is done. 

Note: It would be nice to show Rally x of y in the rally header, so user knows how much more to do in the process.

This should be end to end for a match in the most streamlined way I can think of.


Also: Lets examine the questions per shot.... I think I want to introduce a super simple one which only captures essential key details incase it becomes too slow to tag a match.