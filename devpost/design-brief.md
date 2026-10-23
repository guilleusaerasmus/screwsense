---
status: approved
---

# Design brief: ScrewSense

<!-- Filled in from the learner's interview. Values the learner did not choose are marked (default). -->

## The one spatial moment
I'm kneeling at a low table with a flat-pack bedside table and its paper manual. I tap "Scan" and the drawing peels off the page and becomes a life-size hologram of the finished bedside table, standing exactly where I'm going to build it. Then I pick up a screw I can't tell apart from the others, hold it up to a row of real-size outlines at the table's edge, it snaps into its own outline, and the holes it goes into light up on the panel in front of me.

## Why it belongs on glasses
- Uses: shares your view (it turns the manual you're looking at into instructions in space), draws in the world (a real-size hologram, life-size outlines, glowing holes on the part), leaves your body free (hands stay on the panels and screws).
- Why it's better than the phone or laptop version: a paper manual or a phone is a flat drawing you translate in your head while putting parts down. Here the finished object stands in your room at real size, each instruction sits on the part it is about, you identify a screw by holding it up instead of measuring it, and your eyes stay on the work.

## Product or overlay
- Type: overlay: it guides the assembly of real furniture parts from a real paper manual.
- What the real version would sense: the manual page in view, and where the flat-pack panels are lying on the table. Identifying a screw needs no recognition: the user compares the real screw with a life-size outline.
- Stand-in for the preview:
  - Scanning: a virtual paper manual lies on the table; pinching its big "Scan" button plays the transformation with a hard-coded result (this bedside table, 4 steps).
  - Parts: a virtual table with the bedside table's panels lying flat at real size, and a small dish with grabbable virtual parts (screw A, screw B, dowel C). Releasing a part over an outline is the "holding it up" moment.

## Where things live
- Where the user is looking during the main task: down at the table top, about 60 to 80 cm in front of them (default).
- Virtual table: 75 cm high, 120 x 60 cm, 70 cm in front of the user at start (default).
- Paper manual: an A4 page lying on the front-left of the table, with a large "Scan" button (8 cm) beside it (default).
- Hologram ("ghost") of the finished bedside table: on the right half of the table at real size (about 40 x 35 x 50 cm), translucent light cyan, with a glowing slot outline for each panel (default).
- Flat-pack parts: bottom, two sides, top and back panel lying flat on the left half of the table (default: about 40 x 35 cm panels).
- Parts dish: front-centre of the table, holding screw A (30 mm wood screw), screw B (12 mm screw) and dowel C (35 mm wooden dowel) (default).
- Outline tray: floating 10 cm above the front-right edge of the table, tilted about 30 degrees toward the user, with three life-size outlines labelled A, B and C and their length (default).
- Step card: a small card (about 18 x 10 cm) next to the panel being worked on, showing "Step N of 4" and one short line (default).
- Done and Back buttons: Done is big and round (8 cm) next to the step card; Back is smaller beside it (default).
- Rewind slider: a long slider (30 cm) along the front edge of the table, under the hologram (default).

## Hands and input
- Scan: pinch the big Scan button next to the manual.
- Pick a part: grab it from the dish (SIK grab), with a grab area bigger than the tiny part so it is easy to catch (default).
- Identify it: release it over an outline in the tray.
- Place a panel: grab a panel and drag it into its glowing slot in the hologram; it snaps in when close (default: within 5 cm).
- Fix a flipped panel: pinch the "Flip" button that appears on a panel placed upside down (default).
- Move on: pinch Done. Go back: pinch Back.
- Rewind: drag the slider to scrub the whole assembly as an exploded view, from all parts apart to finished.
- Targets are big and highlight when aimed at.
- Voice: none.

## When things show
- Before scanning: only the table, the manual, the flat parts and the Scan button.
- Scanning: the manual's drawing lifts off the page, grows and settles into the life-size hologram (about 2 seconds), then the "Step 1 of 4" card appears.
- Step card: shows for the current step only, next to that step's panel; hides when the step is done.
- Outline tray: shows only while the current step needs a part; hides after the right part has been matched.
- Right match: the outline turns green, the part snaps into it, a short high tone plays, and the holes glow on the correct panel.
- Wrong match (learner's choice): the outline shakes red, a short low tone plays, and the correct outline for that part lights up as a hint. Nothing advances.
- Panel slot: the slot for the current step's panel pulses; a correctly placed panel turns solid; a flipped panel shows a red edge and the Flip button.
- Step done: the panels for that step animate into their assembled position in the hologram.
- Rewind slider: always available after scanning; moving it never changes the user's progress.
- Finish: after step 4 the finished bedside table stands solid in place of the hologram with an "Assembled!" message.
- If something needs attention out of view: a soft chime and a small arrow at the edge of the view pointing to it (default).

Steps (default):
1. Push dowels C into the two side panels.
2. Join the side panels to the bottom panel with screws A.
3. Fit the top panel with screws A.
4. Fix the back panel with screws B.

## Build phases
Build in this order. Finish and test each phase before starting the next. If a later phase cannot be made to work reliably, leave it out cleanly and keep the earlier phases working.
1. Core: table, flat parts, parts dish, outline tray, step cards, Done and Back, right and wrong matches, glowing holes, steps 1 to 4, "Assembled!".
2. Hologram placement: the life-size hologram with panel slots, drag-to-snap, flipped-panel check with Flip.
3. Wow layer: the paper manual with Scan and the scan transformation; the rewind slider.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. At start, the table with the paper manual, the flat-packed parts, the parts dish and the Scan button are in view in front of the user.
2. Pinching Scan turns the manual's drawing into the life-size translucent hologram on the table and shows the "Step 1 of 4" card.
3. Grabbing dowel C and releasing it over outline C snaps it in, turns the outline green and makes the dowel holes on both side panels glow.
4. Releasing a wrong part over an outline makes the outline shake red, plays a low tone and lights up the correct outline; the step does not advance.
5. Dragging the current step's panel close to its slot snaps it into the hologram; a panel placed flipped shows a red edge and the Flip button, and pinching Flip corrects it.
6. Pinching Done after a correct step shows the next step card beside the next panel; after step 4 the finished bedside table and "Assembled!" appear.
7. Dragging the rewind slider moves the whole bedside table between fully exploded and fully assembled, and releasing it returns to the user's current progress.

## Out of scope
- Real camera recognition of the manual or of real parts.
- Instructions for other furniture; this version has one bedside table.
- Counting individual screws as they go in.
- Voice commands, two-hand gestures and free rotation of panels by hand.

## Risks and open questions
- The learner chose an ambitious version with three layers; the build phases protect the core if a later layer fails.
- Real-size parts are small (a 12 mm screw): grabbing them with the mouse in the preview may be fiddly, so the grab area is larger than the part. Feel unproven: holding real tiny screws up to an outline with real hand tracking.
- Feel unproven: how readable a translucent hologram is on a real additive display in daylight.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail. Follow the build phases.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
