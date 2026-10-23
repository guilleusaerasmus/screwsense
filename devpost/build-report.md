# ScrewSense build report

**Status: partial. Phase 1 is built and was checked in the preview. Phases 2 and 3 are not built. The LEAF tests are written but have not been run, so no done criterion has a passing test yet.**

Lens Studio stopped responding (Windows reports "not responding") while I was trying to list and run the LEAF scenarios. I waited more than 30 minutes and it did not recover. I did not kill it, because the scene edits made through the tools are unsaved in the open editor. Nothing after that point could be compiled, run or tested.

## What was built, per phase

### Phase 1: Core (built, checked by compile, runtime log and screenshots)
- **Table and surroundings**: 120 x 60 cm table, 75 cm high, built from boxes. The top is 22 cm below the eyes and 70 cm ahead. The whole rig places itself relative to the user's head position and heading at start (`ScrewSenseMain.placeInFrontOfUser`).
- **Flat-pack panels**: bottom, two sides, top and back, lying in a stacked pile on the left half of the table. Each is a raw core plus a lighter finish plate. The bottom panel starts "face down" (reserved for the Phase 2 flip check).
- **Parts dish**: front-centre, with screw A (30 mm), screw B (12 mm) and dowel C (35 mm) at real size. Each part has a collider larger than the part and can be grabbed with Spectacles Interaction Kit (SIK) grab.
- **Outline tray**: floats above the front-right edge, tilted 30 degrees toward the user, with three life-size outlines labelled "A  30 mm", "B  12 mm" and "C  35 mm".
- **Matching**:
  - Releasing the right part over its outline turns the outline green, snaps the part in, plays a high tone and makes the holes glow on the receiving panels. The tray then hides.
  - Releasing a wrong part over an outline makes the outline shake red, plays a low tone and lights the correct outline as a hint. The part returns to the dish and nothing advances. Both cases are handled: a part over the wrong-size outline, and a part that fits its own outline but is not the one the step needs.
- **Steps 1 to 4** with the step card ("Step N of 4" plus one line), a big round Done button and a smaller Back button, all built from UI Kit.
  - Done animates the step's panels into the assembled bedside table.
  - Back undoes the last state, in this order: matched, then identify the part again, then the previous step.
  - After step 4 the panels turn solid and "Assembled!" shows.
- **Sounds** generated locally: `ScrewMatchHigh`, `ScrewWrongLow`, `ScrewSnap`, `ScrewChime` (the chime is not used yet).
- **Scene** (authored through the tools): `ScrewSense` (main script) holds `World` (3D content, with anchors `PileAnchor`, `DishAnchor`, `TrayAnchor`, `CabinetAnchor`, `ManualAnchor`) and `UI` (card, Done, Back and message anchors). `LeafIndex` registers the scenarios.

### Phase 2: Hologram placement (not built)
No translucent hologram, no panel slots, no drag-to-snap and no flipped-panel check or Flip button. The hooks are in place (`panelsDraggable`, `startsFlipped`, `cabinetAnchor`, and `ScrewSenseConfig` holds the panel poses) but none of it is wired or tested.

### Phase 3: Wow layer (not built)
No paper manual, no Scan button or transformation, and no rewind slider. The experience currently starts step 1 immediately (`autoStart = true`).

### Also not built
The off-view arrow and soft chime from "When things show". The chime sound exists but is not used.

## LEAF results per done criterion

| # | Done criterion | Result |
|---|---|---|
| 1 | Table, manual, flat parts, dish and Scan button in view at start | **No test.** The manual and Scan button do not exist yet (Phase 3). |
| 2 | Pinching Scan turns the drawing into the hologram and shows the Step 1 card | **No test.** Not built (Phase 3). |
| 3 | Dowel C over outline C snaps in, outline green, holes glow on both side panels | **Not run.** Scenario `c3-right-match` is written. It never ran because Lens Studio froze. |
| 4 | Wrong part: outline shakes red, low tone, correct outline lights up, no advance | **Not run.** Scenario `c4-wrong-match` is written. It covers both wrong cases. |
| 5 | Panel drag to slot, flipped panel with red edge, Flip button | **No test.** Not built (Phase 2). |
| 6 | Done shows the next card beside the next panel; after step 4 the finished table and "Assembled!" | **Not run.** Scenario `c6-flow-to-finish` is written (Phase 1 version: no panel dragging, no Scan). |
| 7 | Rewind slider scrubs exploded to assembled and returns on release | **No test.** Not built (Phase 3). |

**None of the seven criteria has a passing LEAF test.**

The LEAF scenarios use a closed-loop drag (`Assets/Leaf/ScrewSenseLeafInteractor.ts`, `dragTo`) written on top of LEAF's protected interactor members. It compiles but has never run, so it may need changes.

## What was verified
- `RecompileTypeScriptTool`: clean, including the LEAF files.
- `RunAndCollectLogsTool`: no errors with the scene running, before `LeafIndex` was added.
- Preview screenshots from several camera poses: the table, pile, dish with parts, tray with labelled outlines, step card, Done and Back all render. The step card shows "Step 1 of 4".
- LEAF registers the three scenarios at lens load (seen in the Lens Studio log).
- The match, wrong-match, Done, Back and finish logic has **not** been exercised by any run.

## Known issues
- **Lens Studio froze** while the LEAF panel was open and `list_leaf_scenarios` was being called repeatedly. Before the first `list_leaf_scenarios` call, enabling `LeafIndex` already kept the preview from confirming it was ready. The preview was fine once `LeafIndex` was disabled. This is probably LEAF load time plus panel reloads, but I did not find the cause.
- **The scene is unsaved in the open editor.** All scene changes went through the tools and are not in `Assets/Scene.scene`. If Lens Studio is closed without saving, the scene (not the scripts, assets or sounds) is lost and has to be recreated. The hierarchy and wiring are described in Phase 1 above; the `@input`s of each script are listed in the script headers.
- The step card and Done/Back are small and use the UI Kit default dark plates. On an additive display, dark UI may not read well.
- The preview panel is narrow and portrait with a narrow field of view, so from the default pose only part of the table is in view. You have to turn your head to see the pile, the dish and the tray together. Criterion 1 ("in view in front of the user") is therefore only partly met in the default pose.
- The hologram, rewind and flip logic does not exist yet.
- The pile of five panels overlaps heavily. They fit on the left half only as a stack, so the top panel hides the others until it is moved.
- `tempAssetGen/gen_sfx_screwsense.js` is the one-off script that generated the sounds. It can be deleted.

## Check by hand in the preview
1. Open the project, save the scene, and check Lens Studio responds before touching the LEAF panel. If `LeafIndex` blocks loading, disable it and re-enable only when you want to run tests.
2. Run the preview in Interactive mode with the SPECS 27 device, look down with right-drag and walk around with WASD.
3. Grab dowel C from the dish and release it over the C outline. Expect a green outline, a high tone, glowing holes on the two side panels, and the tray hiding.
4. Grab screw A and release it over outline C. Expect a red shake, a low tone and a yellow hint on outline A.
5. Click Done. The side panels should fly to the right half of the table. Repeat for steps 2 to 4. "Assembled!" should appear and the panels turn solid.
6. Click Back at different points to confirm it undoes one state at a time.
7. Judge by eye: whether the step card and buttons are readable and reachable, whether the 3 cm parts are catchable with the mouse, and whether the card sits where you want it relative to the pile.

Labels: **logic proven**: none (nothing has been run). **Feel unproven**: everything, including grabbing tiny parts with real hands and how the cyan overlays read on a real additive display.

## Suggested next steps
Reopen Lens Studio if it stays frozen, save the scene, and run the three Phase 1 scenarios one at a time. Then build Phase 2, then Phase 3, testing after each.
