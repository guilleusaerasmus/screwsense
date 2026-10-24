# ScrewSense build report

**LEAF status (session 4, 24 Oct 2026): criteria 1 to 7 all PASSED, see "Session 4" below.** Older status text follows.

**Status (session 3, 24 Oct): all three phases are built and compile. Phase 3 (manual, Scan, transformation, rewind slider) was checked in the preview with screenshots. No LEAF scenario was run in this session (by agreement), so criteria 1, 2 and 7 have a written but unrun LEAF test, and criteria 3, 4 and 6 rest on LEAF runs from earlier sessions, before this session's changes. Criterion 5 (panel drag, flip) is still not verified at all.** The editor stayed responsive for the whole session (no freeze).

## Session 4 (24 Oct): LEAF verification, final result
**All 7 criteria PASSED in LEAF on 24 Oct 2026 (preview, Phase 2/3 flow with Scan), one scenario at a time, in this order:** c1-start-view PASSED, c2-scan-to-hologram PASSED (4 s), c3-right-match FAILED then PASSED after the fix below, c4-wrong-match PASSED, c5-panels-and-flip PASSED, c7-rewind-slider PASSED (26 s, real knob drag with the interactor), c6-flow-to-finish PASSED (91 s). No freeze; the editor stayed responsive. (An earlier attempt the same day was blocked because the LEAF panel was closed; the panel was then opened once with `open_leaf_panel`.)

**What changed:** only the test kit, `Assets/Leaf/ScrewSenseLeafKit.ts`: the drag tolerance in `dropPart` and `dragPanel` went from 0.8 cm to 2 cm. Cause of the c3 failure: `dragTo: stopped 0.9 cm from the destination`, three attempts. The app snaps within `SNAP_CM = 5`, so the test was too strict (the closed-loop drag stalls at about 0.9 cm), not the app. Only c3 was re-run after the recompile (then c4, c5, c7, c6 ran on the new build; c1 and c2 ran before it and are unaffected by the kit change). No app code or scene change. The slider knob was grabbed by the simulated hand this time, so it did not need to be made bigger; a larger knob would still be good design for real hands (not done).

**State left:** `LeafIndex` disabled, project saved. The LEAF panel is still open: there is no tool or editor API to close it, close it by hand if wanted. Lens needs a refresh after a recompile; the first `run_leaf_scenario` call for c6 timed out at the tool level but the scenario ran and passed (see log, 91 s).

The statuses below in "Session 3" and the table are from the earlier session; **the LEAF results above supersede them.**

## Session 3: what was done
Project folder: `C:\Users\guill\LensProjects\lens` (outside OneDrive). `LeafIndex` stayed disabled, the LEAF panel was never opened, no scenario was run, no git command was run. Scene saved with `project.save()` after each scene change.

### A. Phase 2 check and the `dragTo` timeout
- `RecompileTypeScriptTool` clean, `RunAndCollectLogsTool` (refresh) shows no errors, only `SceneMaterialBatcher ... batching retries exhausted` warnings (SIK cursor and outline bars, harmless) and the 4 scenario registrations.
- Phase 2 scene in preview and in runtime-view captures: table, both panel rows, dish with three parts, outline tray, step card, Done/Back and the cyan hologram with its slot outlines are all present. **Only the static scene was checked.** Drag-to-snap and Flip were not exercised (see criterion 5).
- Bug found and fixed: the step card plate came up dark and see-through when the card was first shown after the Scan (the plate resets its colour the first time it is enabled, and the old fix only ran once at start). `showCard(true)` now recolours the plate again. Checked in a preview screenshot: "Step 1 of 4 / Push dowels C into both side panels" on a light plate.
- `ScrewSenseLeafInteractor.dragTo` now has a hard time limit (`timeoutMs` + 8 s) around the whole gesture (hover, grab, drag, release). A drag event that never fires makes the call throw `dragTo: timed out` and resets the interactor instead of hanging the scenario. Same limit on the new `dragSlider`. **Compiles, not run.**

### B. Phase 3 (built)
- **Table** is now 160 x 130 cm (was 160 x 100), 30 cm longer towards the user, so the manual fits in front of the panels. The brief said 120 x 60; this is the second change to the default.
- **Paper manual:** an A4 page (21 x 29.7 cm) with a title and a line drawing of the bedside table (oblique view, 13 line segments) lies at the front-left of the table, in front of the flat panels (`ManualAnchor` at x -60, z 58 in table space).
- **Scan button:** round, 8 cm, light cyan, to the right of the page (`scanPos` on `ScrewSenseMain`). It is a UI Kit `RoundButton` named `ScanButton`.
- **Scan transformation (2 s, `SCAN_SECONDS`):** the drawing lifts off the page (up to 14 cm), turns from ink to light, grows from 40% to life size while standing up, and travels to the front of the hologram position. In the last 15% the hologram slots fade in and the drawing fades out; the page stays blank. Then the "Step 1 of 4" card, tray, Done and Back appear and the slider appears.
- **`autoStart` is off** (set in the scene and as the script default). Before the Scan only the table, manual, flat panels, dish with parts and Scan button show: no hologram, tray, card or slider. With `autoStart` on, the old behaviour comes back (hologram and slider at once, no Scan).
- **Rewind slider:** UI Kit `Slider`, 30 cm track, along the front edge under the hologram (`sliderPos`), labelled "Rewind", "Exploded" (left) and "Assembled" (right). Grabbing it shows a model of the whole bedside table (five solid pieces with glowing edges) at the slider value, 0 = exploded, 1 = assembled; the real hologram and placed panels step aside. The step, phase and placed panels are never touched. On release the model slides to the current progress (completed steps / 4, 1 when finished) and hides, and the knob springs back to that value. At rest the knob shows the progress.
- `ScrewSenseMain` got `scan()`, `getProgress()`, `rewindTo()`, `rewindRelease()` and the test queries used by the new scenarios. `ScrewSenseWorld` got the manual, the scan tween and the rewind model. `ScrewSenseUI` got the Scan button and the slider.

### How Phase 3 was verified
- **Start state:** preview screenshots (several camera positions) and runtime-view isometric captures.
- **Scan:** triggered with the real input path: `PreviewInteractTool` Hover + Pinch at the button's position (a Pinch by `uniqueId` is refused with "obstructed by Collider" because of the button's own collider, so it is done by position). For the moments, `SCAN_SECONDS` was set to 14 s temporarily and **put back to 2.0** afterwards; six runtime-view frames show: drawing lifting off the page with glow, tilting, growing, standing, travelling, then the hologram with the drawing gone and the page blank. Final state in screenshots: hologram, tray, Done/Back, slider, and the card.
- **Rewind:** the real knob drag with the simulated hand did not move the knob (the hand tool held the pinch but did not grab the knob), so the slider was **driven from code**: a temporary `debugRewind` input on `ScrewSenseMain` (now removed) called `setSliderValue` + `rewindTo` after the Scan and `rewindRelease` after 12 s. Captured: value 0.4 (pieces apart, knob at 0.4, hologram hidden), value 0 (fully exploded), and the return after release (model gone, hologram back, knob back at 0 = progress, step 1 unchanged). Value 1 was not captured on its own.

## Result per done criterion

| # | Done criterion | Result |
|---|---|---|
| 1 | Table, manual, flat parts, dish and Scan button in view at start | **Screenshot-verified now** (framing from the camera positions I used; in the default preview framing the content is a small band, see Known issues). LEAF `c1-start-view` written (checks start state and that each item is within 25 degrees of the view direction), **not run**. |
| 2 | Pinching Scan turns the drawing into the hologram and shows the Step 1 card | **Screenshot-verified now** (real pinch, six moments of the transformation, final state, card). LEAF `c2-scan-to-hologram` written, **not run**. |
| 3 | Dowel C over outline C snaps in, outline green, holes glow | **LEAF-proven earlier** (`c3-right-match`, three runs, Phase 1 mode). Not re-run since the table change and the Scan start. |
| 4 | Wrong part: outline shakes red, low tone, correct outline lights up, no advance | **LEAF-proven once earlier** (`c4-wrong-match`). Not re-run. |
| 5 | Panel drag to slot, flipped panel with red edge, Flip button | **Not verified.** `c5-panels-and-flip` is kept, compiles and registers, but has never completed (hung once, froze the editor once). Only the static Phase 2 scene was seen. |
| 6 | Done shows next card beside next panel; after step 4 finished table and "Assembled!" | **LEAF-proven once earlier** (`c6-flow-to-finish`, Phase 1 mode, 32 s; failed in 3 other runs on the first drag). Not run in Phase 2 mode, not re-run. After this session the first action of the flow is the Scan. |
| 7 | Rewind slider scrubs exploded to assembled and returns on release | **Screenshot-verified now, driven from code** (values 0 and 0.4 and the return). A real drag of the knob by hand/mouse is **not verified**. LEAF `c7-rewind-slider` written (drags the knob with the interactor), **not run**. |

**Summary:** LEAF-proven (earlier sessions): 3, 4, 6 (6 once). Screenshot-verified now: 1, 2, 7 (7 driven from code). Not verified: 5. Written but never run: LEAF c1, c2, c7 and the retried c5.

## Known issues
- **Nothing in Phase 2 or Phase 3 has a passing LEAF run.** LEAF results for 3, 4 and 6 predate this session's table, UI and start-flow changes.
- **Real knob drag unverified.** The simulated hand did not move the slider knob; the slider's own drag logic (`onKnobMoved` while held, release on trigger-up) is untested. If it fails, check `ScrewSenseUI.buildSlider`.
- **`dragTo`/`dragSlider` timeout never executed.**
- **The preview panel is 1392 x 4096 (tall and narrow).** Only a vertical slice of the view shows, and the default start framing (table about 270 cm away, camera level) shows the table as a thin band. Checking it needs camera moves (`MovePreviewCamera`) or the runtime-view capture.
- **Camera moves and lens reloads:** the rig is placed from the preview camera at lens start. Reset the camera to the default before refreshing, move it only afterwards.
- **UI scale is 1.6 in the scene** (the previous report said 3). Anything sized in the UI (card, Done, Back, Flip) is smaller than that report assumed. Scan and slider are sized in world cm (they divide by the UI scale).
- **A 10 cm Scan button rendered with distorted corners** in a close-up; 8 cm renders as a clean ellipse, so the default is 8 cm.
- **New script inputs are saved into the scene** the first time the scene is saved; changing a default in the script later does not change the scene value (this bit `scanSize` and `sliderLength`). Edit them in the Inspector.
- **Rewind while placing:** the model replaces the placed panels and hologram while it is shown; on release it slides to the progress value and then the real state reappears (a small pop if progress is between full steps).
- **Everything is far away at the start** (preview framing choice; the 3 cm parts are tiny until you walk closer with WASD).
- **Scenarios cannot be run right after a recompile** (first `run_leaf_scenario` times out, later calls cancel and restart a running scenario). Run one at a time, make one call and watch the log.
- Not built: the off-view arrow and soft chime from "When things show".
- `tempAssetGen/gen_sfx_screwsense.js` is the one-off sound generator and can be deleted.

## Manual test script (preview, Interactive mode, SPECS 27)
Walk with WASD, Q/E for down/up, right-drag to look. Click acts as a pinch. At start the table is far away; walk forward and look down.
1. **Start (criterion 1).** You should see the table, an A4 page with a line drawing at the front-left, a cyan **Scan** button to its right, the five flat panels (grey bottom, two rows), and the dish with three small parts. No cyan hologram, no outline tray, no step card, no slider.
2. **Scan (criterion 2).** Click Scan. In about 2 s the drawing lifts off the page, glows, grows, stands up and settles at the right half of the table as a translucent cyan cabinet with slot outlines; the page is left blank. Then the card "Step 1 of 4" appears with Done and Back, the outline tray appears and the Rewind slider appears at the front edge.
3. **Right match (criterion 3).** Grab dowel C (the thickest part, brown) and release it over outline C in the tray: outline turns green, high tone, glowing yellow holes on both side panels.
4. **Wrong match (criterion 4).** In step 2 (after Done), grab screw B or dowel C and release it over another outline: red shake, low tone, the correct outline blinks yellow, the step does not advance. (Same in step 1 with screw A over outline C.)
5. **Panels (criterion 5).** In step 1 drag a side panel to its pulsing yellow slot: within about 5 cm it snaps and turns solid; released far away it goes back. Press Done before both are placed: it refuses. In step 2 drag the grey bottom panel to its slot: red edge and a Flip button; click Flip, the panel turns over and the red goes; then Done.
6. **Flow (criterion 6).** Click Done after each step: the next card appears next to the next panel. After step 4: finished solid bedside table and "Assembled!". Back undoes one state at a time.
7. **Rewind (criterion 7).** After the Scan, drag the Rewind knob from left to right: the whole bedside table (solid pieces) goes from fully exploded (knob left) to assembled (knob right) while the step card and step number do not change. Let go: the knob returns to your progress (left at step 1, a quarter along at step 2, and so on) and the normal hologram comes back.
8. **Judge by eye:** text size at the start distance, whether the card sits well next to the panel, whether the 3 cm parts are catchable, and how the translucent hologram would read on an additive display (feel unproven).

Labels: **logic proven** (earlier LEAF, Phase 1 mode): right match, wrong match, four-step flow. **Logic verified by screenshot only:** start view, Scan transformation, rewind scrub and return. **Logic unproven:** panel drag/snap/flip (Phase 2), real slider drag, everything LEAF c1/c2/c5/c7. **Feel unproven:** everything, including grabbing tiny parts with real hands, the additive look of the cyan overlays and light UI, and the view distance.

## Suggested next steps
1. Enable `LeafIndex`, run **one** scenario at a time with `run_leaf_scenario` and watch the log: `c2-scan-to-hologram`, `c1-start-view`, `c7-rewind-slider`, then `c5-panels-and-flip`, `c6-flow-to-finish`, `c3`, `c4`. Disable `LeafIndex` afterwards.
2. Do the manual test script above by hand, especially steps 5 and 7 (the only things not seen working at all).
3. If the real knob drag fails, check `Slider.onKnobMoved` against `ScrewSenseUI.buildSlider` first.
