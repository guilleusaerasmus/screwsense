# Recording the ScrewSense demo video

The `demo-walkthrough` LEAF scenario plays the whole story hands-free, with English caption cards, in about 2 minutes 30 seconds (measured: 150.0 s from the first caption to the end of the last one). You only start it and record the Lens Studio preview. No narration, no mouse use while it runs.

## 1. Before you start
1. Open `lens.esproj` in Lens Studio 5.22 or later. Preview panel: SPECS device, **Interactive** mode.
2. Enable the `LeafIndex` object in the Scene (it is disabled in the saved project). The Lens refreshes and logs `Register scenario: demo-walkthrough`.
3. Open the LEAF panel (menu or the LEAF icon). Close or hide other panels that you do not want in the recording. Do not run anything else while the demo plays.

## 2. Size the preview
The default Preview panel is tall and narrow (about 1392 x 4096); the Lens only fills a horizontal band of it, the rest is the room background. For a clean 16:9 video:
- Pop the Preview panel out into its own window (drag its tab out of the dock; I could not test the pop-out from here).
- Resize the window to roughly **16:9, for example 1280 x 720 or 1600 x 900**, and record that window only (window capture in OBS, or the screen recorder's "record a window" mode).
- If you cannot pop it out, record the docked panel and crop the video to the band that holds the table (in the 1392 x 4096 panel it is the middle band, roughly rows 1600 to 3000 of 4096) in your editor.

Checked: the framing was verified in the docked, tall panel only (screenshots at 1392 x 4096). In a wide window the same scene is shown; I could not resize the window from here, so look at the first caption once before recording and adjust the camera pitch below if the table is cut off.

## 3. Camera position
The scenario places the table for you: when it starts it puts the table **280 cm in front of the preview camera**, tilted towards it by the camera's own pitch, pushed a little down and left in the frame so the caption has room above. So the only thing you set is the camera:
- Reset the camera, then look **down about 35 degrees** (right-drag the mouse down in the Interactive preview; any pitch from 30 to 55 degrees works, the scenario clamps it to that range). Do not move with WASD afterwards.
- Exact pose that was used for the measured run (Inspector coordinates, set with the preview camera tool): position (0, 0, 0), rotation X = 325 (that is pitch -35), Y = 0, Z = 0.
- **Do not touch the preview camera or click inside the preview while the demo runs.** The camera is read once at the start.

## 4. Start the demo (exact action)
1. In the LEAF panel select the scenario **demo-walkthrough**.
2. Start the screen recording.
3. Click **Run** in the LEAF panel (the one action).
4. The Lens reloads for about 15 to 20 seconds (the first Run after a code change can take longer), then the first caption **"ScrewSense: the paper manual comes alive"** appears and the walkthrough begins. Trim the reload at the start in your editor, or start recording only when that first caption shows (the demo does not need you after Run).

## 5. What happens and how long it lasts
Total from the first caption: **150 seconds (2:30)**. The ordering below is approximate; the actions are real interactions of a simulated hand.

| Time | Caption / action |
|---|---|
| 0:00 | "ScrewSense: the paper manual comes alive" - start view, manual on the table |
| 0:08 | "Pinch Scan: the drawing becomes a life-size hologram" - Scan pinched, the drawing lifts off and becomes the hologram |
| 0:20 | "Not sure which screw? Hold it up to the life-size outlines" - outline tray, Step 1 card |
| 0:26 | "Wrong part: it tells you, and shows the right one" - screw A over outline C: red shake, correct outline lights up |
| 0:38 | "Right part: the holes it goes into light up" - dowel C snaps into outline C, green, holes glow |
| 0:48 | "Drag each panel into the hologram. Upside down? Flip it" - side panels, Done, step 2, bottom panel red edge and Flip |
| 1:20 | "One big Done button per step, hands stay on the work" - steps 3 and 4 to "Assembled!" |
| 1:55 | "Rewind the whole assembly, any time" - slider scrubbed exploded, half, assembled, released |
| 2:10 | "Assembled! Built with CLAD, Lens Studio MCP and LEAF" - held until 2:30 |

The times in the table are estimates from the screenshots; the total is measured. The pace of the middle part varies by a few seconds between runs, the last caption absorbs the difference so the total stays between 2:15 and 2:40.

## 6. When to stop recording
Stop **a few seconds after the last caption has been on screen for about 10 seconds**, or when the LEAF panel shows `PASSED` (about 2:30 after the first caption). The last caption stays on screen after the end; you can also freeze on it. The video must stay under 3 minutes: with the Lens reload at the start trimmed it is about 2:30.

## 7. Afterwards
- The captions only exist while the demo runs (a demo flag the scenario sets). Refresh the preview and the Lens is back to normal: no captions.
- Disable `LeafIndex` again and save the project (it must stay disabled in the repo).
- A green LEAF status line ("RUNS: demo-walkthrough ...") is drawn by LEAF over the top of the Lens view for the whole run. It is not part of ScrewSense; crop it out or leave it.
- If the table appears off-centre, re-run: reset the camera, look down about 35 degrees again, run once more. Always run the demo once before the final take.
