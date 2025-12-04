NotesTestingMVP

Step 1

Clicking new match can take you directly to Tag Contacts as the Match Setup in there makes the dedicated Match Setup Page redundent, so that page can be deleted.

Match Setup

Tournament field should be a dropdown. Friendly, Club, Regional, National (goes in the database)

Match format is a drop down with Best of 1, 3, 5 or 7. 5 is default

Video start score needs Set field for Player 1 and Player 2, also a Set score for each.

P0: When i click mark first serve button in match settings, it is actually the first ball contact of the match. Therefore it should create the first rally container in the left hand panel with the serve as the first contact/shot recorded in that panel. (The left Panel on this page is wrong, it should be the one used in shot tagging)

When I click start tagging

P0 I expect the video to start playing in tagging mode from the first serve marked point in the previous section.

Contact Tagging section

P0: Critical: Rally containers and contacts/shots are not added to the left pane during contact marking.... this is essential, (again this pane should be the one from the shot tagging phase.) This left pane should basically be pesistent through this entire process.

Critical: Can't mark contacts with video playing, can't play video while marking contacts! Expected behaviour video should run and spacebar should mark contacts forward arrow should mark endofpoint and move into FF mode (default x1).

Critical: It doesn't need to ask who won the point (the modal) during the first part, rally tagging.... we don't need to know the point winner yet... we are just fast forwarding to set the next serve (which opens a new Point container and puts the serve contact in here).

make default tagging speed 0.5x, not 0.25x


After clicking Complete Part 1: Start Shot Tagging

It correctly asks for Match Framework, only need final set score, Match Result and video coverage (where is this data stored though?)

Then Start Shot Tagging Page

The left Panel on this side should be the one used in all sections...

Video is not playing (no video loop) for any shot. The video doesnt autoprogress once a shot is tagged, it just seems not hooked up.

The left right cursor button doesn't nudge the start contact point.

NOTE

The Left Pane (Currently Labelled points) should go from top to bottom of the screen, it should pesist and be upto date for the whole process for this page. The match section at the top is not required, instead the first entry in the Left side pane should be the Match Details.

The Points Label should not be the Pane is sort of nested as follows:
- Match Details (Start)
    - Set 1
        - Point 1
            - Serve
            - Return
            - Shot 3
            - Shot 4
        - End of Point
        - Point 2
            - Serve
            - Return
            ...etc
        - End of Point
        ...etc
    End of Set 1
    ...etc
Match Complete (Result recorded in final modal)

This should be updated whenever anything in any of these stages would add or remove to this list.

This pane should have some high level edit functionality such as a X to delete a rally. 

The End of Point should have a timestamp (not currently shown). The Point Header Summary that shows how many shots in it, should also show the winner of the Rally once this is known