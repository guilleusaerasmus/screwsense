# ScrewSense build report

**Status: partial. Phase 1 is built, fixed and partly proven by LEAF (criteria 3, 4 and 6 each passed at least once). Phase 2 is written and compiles but has never run. Phase 3 is not built. Lens Studio stopped responding three times in this session and was still frozen when I stopped.**

## What happened to the editor
Lens Studio (Windows: "not responding") froze three times. I did not open the LEAF panel and I never called `list_leaf_scenarios`.
1. About 4 minutes, after I launched two scenarios at the same time and recompiled while one was running. This was my mistake. It recovered by itself.
2. About 100 seconds, after another recompile while a `c4-wrong-match` run was still pending. It recovered by itself.
3. At 21:42, right after I enabled Phase 2 (`panelsDraggable = true` on `World`), saved and refreshed the preview. The log fills with `MessageEvent: pending message cap (256) reached, dropping oldest message` (about 6000 lines). It was still frozen more than 4 minutes later, so I stopped, as agreed, and wrote this report instead of waiting.

I do not know the cause of the third freeze. Either of these could be responsible, and I could not separate them:
- the new Phase 2 scene (five panels with Interactables and hologram slots), or
- the LEAF plugin reloading its scenarios when scripts or the scene change (the same signature as the freeze in the first session; the plugin registers the scenarios at every lens reload even while `LeafIndex` is disabled).

**If the project hangs when you open it:** open it, and as soon as it responds untick `panelsDraggable` on the `World` object (this turns Phase 2 off and returns to the Phase 1 behaviour that LEAF proved), then save. The last successful save was at 21:42 with `panelsDraggable` on and `LeafIndex` disabled.

## What was built, per phase

### Phase 1: Core (built, fixed, tested in preview)
Everything from the first build still works (table, flat panels, dish and parts, outline tray, right/wrong matches, steps 1 to 4, Done/Back, sounds, "Assembled!"). Changes in this session:
- **Light UI.** The step card is a bright plate (very light blue) with dark navy text. Done is light green and Back is light blue-white, both with dark labels. Button labels are 40% larger. Checked in a preview screenshot: the card reads clearly.
- **Panels spread out.** The five panels no longer stack. They lie in two rows on the left half of the table, each fully visible except the back panel:
  - back row: the two side panels, turned 90 degrees;
  - front row: bottom (starts face down, grey) and top;
  - the thin back panel lies underneath, peeking out along the front edge. It is the last panel used, and by then the others have left.
- **Bigger table.** The five panels cover about 7800 cm² and the left half of the original 120 x 60 cm table only 3500 cm², so they cannot lie flat without overlapping. The table is now 160 x 100 cm. This is the one change to the brief's defaults.
- **Default start pose.** The preview camera starts level and ignores the rotation set in the editor, and its field of view is narrow (about 44 degrees tall). To see the table, panels, step card, dish and tray together, the rig starts 270 cm in front of the user and 36 cm below the eyes (`World` at 16, -36, -270), and the UI is scaled by 3 (`uiScale` on `ScrewSenseUI`). Checked in a preview screenshot: table, both panel rows, step card with Done and Back, the dish with its three parts and the outline tray are all in view at start. The dish moved to x = 14 so it clears the top panel, and the tray moved to x = 30 over the middle of the table.
- **Tests only:** `playCount()` on `ScrewSenseMain` replaces `AudioComponent.isPlaying()` in the scenarios (the tone ends before the test checks it), and `dropPart` retries a drag up to three times (see Known issues).

### Phase 2: Hologram placement (written, compiles, never run)
Written and compiled clean once; nothing of it has run, because the editor froze on its first load.
- **Hologram.** Each panel has a slot at its assembled position in the cabinet: a translucent cyan ghost with a glowing outline. The slots of the current step pulse yellow and the others rest dimmed. After step 4 the hologram hides and the finished table stands solid.
- **Drag to snap.** The panels have SIK grab. Releasing the current step's panel within 5 cm of its slot snaps it in, plays the snap sound and turns it solid. Released further away, or a panel from another step, it returns to the pile. A panel of a finished step that is released goes back to its slot.
- **Flipped panel.** The bottom panel starts face down. Placed in its slot it keeps its red edge and a Flip button appears next to it. Pinching Flip turns it over (0.4 s) and the red edge goes away. Done is refused ("Place the panels in their slots" or "Flip the panel first") until every panel of the step is in place and the right way up.
- Done now just moves on (the panels are already in the hologram). Back from the placing state sends that step's panels back to the pile and asks for the part match again.
- It is switched on by the `panelsDraggable` input on `World` (now on). With it off, the Phase 1 behaviour (Done flies the panels into the cabinet) is unchanged.
- LEAF scenario `c5-panels-and-flip` is written and registered in `LeafIndex`, and `c6-flow-to-finish` places the panels and flips when `panelsDraggable` is on. **Neither has been compiled or run.**

### Phase 3: Wow layer (not built)
No paper manual, no Scan button or transformation and no rewind slider. I did not start it: the task said to build it only if the editor was stable, and it was not. The experience still starts step 1 immediately (`autoStart = true`). The manual anchor exists at the front-left corner of the table.

### Also not built
The off-view arrow and soft chime from "When things show".

## LEAF results per done criterion

| # | Done criterion | Result |
|---|---|---|
| 1 | Table, manual, flat parts, dish and Scan button in view at start | **No test.** The manual and Scan do not exist (Phase 3). By screenshot, the table, panels, dish, tray and step card are in view at start. |
| 2 | Pinching Scan turns the drawing into the hologram and shows the Step 1 card | **No test.** Not built. |
| 3 | Dowel C over outline C snaps in, outline green, holes glow on both side panels | **Passed** (`c3-right-match`, three separate runs, Phase 1 mode). |
| 4 | Wrong part: outline shakes red, low tone, correct outline lights up, no advance | **Passed** once (`c4-wrong-match`, after fixing the test's sound check). A later re-run was left pending when the editor froze, so it is not counted. |
| 5 | Panel drag to slot, flipped panel with red edge, Flip button | **Not run.** Scenario `c5-panels-and-flip` written, not compiled. |
| 6 | Done shows the next card beside the next panel; after step 4 the finished table and "Assembled!" | **Passed once** (`c6-flow-to-finish`, 32 s, Phase 1 mode, all four steps). It also failed in 3 other runs, always on the first drag (see Known issues). Not run in Phase 2 mode. |
| 7 | Rewind slider scrubs exploded to assembled and returns on release | **No test.** Not built. |

**Proven by LEAF: criteria 3 and 4 (reliably for 3), and 6 once. Criteria 1, 2, 5 and 7 have no passing test.**

## What was verified
- `RecompileTypeScriptTool` clean after the Phase 2 code (not after the new scenario and the `c6` edit).
- Preview screenshots for the Phase 1 layout and the light UI (card, Done, Back).
- LEAF runs as in the table. Each pass is a `PASSED` line in the Lens Studio log.
- Phase 2 logic has not been exercised by any run.

## Known issues
- **The editor froze three times** (see the top). The cause of the third is not known.
- **The `dragTo` drag in the LEAF interactor is flaky.** About half of the runs, the first drag diverged (the part ended 58 cm or 19915 cm away from the target) and the scenario failed on it. Re-running usually passed. I added retries in `dropPart` and `dragPanel` but have not run the retried version.
- **Scenarios cannot be run right after a recompile.** The first `run_leaf_scenario` after a script change times out, and a second one often works. Running scenarios one at a time and waiting between a recompile and a run helps.
- **The scene must be saved by hand** if you change anything in the editor. I saved through `project.save()` after each scene change.
- **Everything is far away at the start.** To fit it all in the narrow preview, the table is 270 cm away, so the 3 cm parts are tiny until you walk closer with WASD. That is a preview-framing choice, not how a real user would stand.
- **A 160 x 100 cm table** is larger than the brief's 120 x 60 cm, because the panels cannot lie flat on half of the smaller one.
- The back panel lies under the bottom and top panels. Only a strip along the front edge shows until they are used.
- The hologram, rewind and flip logic has never run. The rewind does not exist.
- `tempAssetGen/gen_sfx_screwsense.js` is the one-off script that generated the sounds. It can be deleted.

## Check by hand in the preview
1. Open the project. If it hangs, wait for it to answer, untick `panelsDraggable` on `World` and save (Phase 1 mode, proven).
2. Run the preview in Interactive mode with the SPECS 27 device. At start you should see the table with the two rows of panels, the light step card with Done and Back, the dish and the outline tray. Walk forward with WASD and look down with right-drag.
3. Grab dowel C from the dish and release it over outline C: green outline, high tone, glowing holes on both side panels. Try screw A over outline C: red shake, low tone, yellow hint on outline A.
4. **Phase 2 (`panelsDraggable` on):** drag each side panel to its pulsing slot in the hologram (right half of the table). It should snap and turn solid within about 5 cm and return to the pile if released far away. Press Done early: it should refuse. In step 2 drag the grey bottom panel to its slot: it should show a red edge and a Flip button. Pinch Flip, then Done.
5. Click Back at different points to confirm it undoes one state at a time. After step 4: "Assembled!" with solid panels.
6. Judge by eye: text size at the start distance, whether the panels' two rows read as "spread out", where the card hangs relative to the panel, and whether the 3 cm parts are catchable.
7. To run LEAF again: enable `LeafIndex`, run one scenario with `run_leaf_scenario`, disable it. Do not open the LEAF panel or run scenarios in parallel.

Labels: **logic proven** (Phase 1, in preview): the right match, the wrong match and the full four-step flow. **Logic unproven:** the whole Phase 2 (hologram, snapping, flip) and anything in Phase 3. **Feel unproven:** everything, including grabbing tiny parts with real hands, how the cyan overlays and the light UI read on a real additive display, and the view distance.

## Suggested next steps
Reopen Lens Studio, untick `panelsDraggable` if it hangs, and save. Compile the new scenario, then run `c5-panels-and-flip` and `c6-flow-to-finish` one at a time, with `panelsDraggable` on. Re-test `c4-wrong-match` once. Then build Phase 3 (manual, Scan, rewind slider) only once a few full runs go through without a freeze.
