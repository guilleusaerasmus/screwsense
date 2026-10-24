# ScrewSense

**The paper manual comes alive.** A SPECS Lens that turns a flat-pack furniture manual into a life-size hologram, identifies screws by holding them up to real-size outlines, and guides each step on the part it is about.

Built for [Learn AR with SPECS](https://learn-specs.devpost.com/) (Devpost × Snap). Planned with the Devpost Learn `plan-lens` skill and built by an AI coding agent through Snap's CLAD plugin, Lens Studio and the Lens Studio MCP. Runs in the Lens Studio preview; no SPECS glasses needed.

## The moment
You kneel at a low table with a flat-pack bedside table and its paper manual. Pinch **Scan** and the drawing lifts off the page and settles into a life-size hologram of the finished bedside table, right where you are going to build it. Pick up a screw you can't tell apart from the others, hold it up to the row of real-size outlines at the table's edge, and it snaps into its own outline while the holes it goes into light up on the panel in front of you.

## Why glasses
- **Shares your view:** the manual you are looking at becomes instructions in space.
- **Draws in the world:** a real-size hologram, life-size screw outlines and glowing holes on the actual part.
- **Leaves your body free:** your hands stay on the panels and screws; one big Done button moves you on.

## What it does
1. **Scan the manual:** the line drawing peels off the A4 page and becomes a translucent, life-size hologram with a slot for every panel.
2. **Identify parts by size:** release a part over the life-size outline tray. Right part: the outline turns green, a high tone plays and the holes glow on the right panels. Wrong part: the outline shakes red, a low tone plays and the correct outline lights up as a hint.
3. **Place panels in the hologram:** drag each panel into its pulsing slot; it snaps in within 5 cm. A panel placed upside down gets a red edge and a **Flip** button.
4. **Four steps** with a step card beside the panel you are working on, a big **Done** and a smaller **Back**, ending with the finished bedside table and "Assembled!".
5. **Rewind:** drag the slider along the table's edge to scrub the whole assembly between exploded and assembled, without losing your progress.

## Run it
1. Install [Lens Studio](https://ar.snap.com/download) 5.22 or later.
2. Open `lens.esproj`.
3. In the Preview panel choose the SPECS device and Interactive mode. Move with WASD, Q/E for down and up, right-drag to look around; a click is a pinch. Walk forward to the table and pinch **Scan**.

## Design and testing
- Design brief from the `plan-lens` interview: [`devpost/design-brief.md`](devpost/design-brief.md).
- Build log, decisions and test results: [`devpost/build-report.md`](devpost/build-report.md).
- Seven done criteria, each covered by a LEAF scenario in `Assets/Leaf/`. **All seven passed in the Lens Studio preview on 24 October 2026.**

| # | Done criterion | LEAF |
|---|---|---|
| 1 | Table, manual, flat parts, parts dish and Scan button in view at start | Passed |
| 2 | Scan turns the drawing into the life-size hologram and shows Step 1 | Passed |
| 3 | Dowel C over outline C snaps in, turns green, holes glow | Passed |
| 4 | Wrong part shakes red, low tone, correct outline lights up | Passed |
| 5 | Panels snap into their hologram slots; a flipped panel needs Flip | Passed |
| 6 | Done moves through all four steps to "Assembled!" | Passed |
| 7 | Rewind slider scrubs exploded to assembled and returns on release | Passed |

## Project layout
- `Assets/Scripts/`: `ScrewSenseMain` (state machine), `ScrewSenseWorld` (table, panels, parts, hologram, manual, scan and rewind), `ScrewSenseUI` (step card, buttons, slider), `ScrewSenseConfig` (steps, parts and poses).
- `Assets/Leaf/`: LEAF scenarios c1 to c7 and the test interactor.
- `Assets/GeneratedSFX/`: match, wrong, snap and chime sounds generated for this project.

## Credits
All brands are fictional; the bedside table, parts and manual are made for this Lens. Built with Lens Studio, Spectacles Interaction Kit, UI Kit, LEAF, Snap's CLAD plugin and Claude Code.
