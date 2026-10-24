// demo-walkthrough: the whole ScrewSense story at a calm pace, with caption cards, for
// recording the hackathon video. Hands-free: start it, record the preview, stop at the end.
// Captions are shown only while the demo flag is on (the scenario turns it on and, on a
// failure, off again; a Lens restart also clears it).

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"
import {dropPart, matchCurrentStep, must, placeStepPanels, sys, tap} from "./ScrewSenseLeafKit"

// The video must land between 2:15 and 2:40: the last caption is held until this time.
const TARGET_SECONDS = 150
// Distance from the preview camera to the middle of the table during the demo (cm).
const DEMO_DISTANCE_CM = 280
// How far the table is pushed down in the frame, leaving room for the caption above it (cm).
const DEMO_LOWER_CM = 18
// The table is moved this far left in the frame so the right-hand hologram and rewind model stay inside it (cm).
const DEMO_SHIFT_LEFT_CM = 8

const CAPTIONS = [
  "ScrewSense: the paper manual comes alive",
  "Pinch Scan: the drawing becomes a life-size hologram",
  "Not sure which screw? Hold it up to the life-size outlines",
  "Wrong part: it tells you, and shows the right one",
  "Right part: the holes it goes into light up",
  "Drag each panel into the hologram. Upside down? Flip it",
  "One big Done button per step, hands stay on the work",
  "Rewind the whole assembly, any time",
  "Assembled! Built with CLAD, Lens Studio MCP and LEAF"
]

@component
export class ScrewSenseDemoScenario extends Scenario {
  async run(): Promise<void> {
    try {
      await this.play()
    } catch (e) {
      sys().setDemoMode(false)
      throw e
    }
  }

  private async play(): Promise<void> {
    const ix = new ScrewSenseLeafInteractor()
    const caption = (i: number): void => sys().setCaption(CAPTIONS[i])

    // Frame the table for the recording relative to the preview camera, then reset the Lens state.
    sys().placeForDemo(DEMO_DISTANCE_CM, DEMO_LOWER_CM, DEMO_SHIFT_LEFT_CM)
    sys().restart()
    await sleep(800)
    sys().setDemoMode(true)
    const t0 = Date.now()

    // 1. Start view with the manual.
    caption(0)
    await sleep(8000)

    // 2. Scan: the drawing becomes the hologram.
    caption(1)
    await sleep(1800)
    await ix.trigger(must("ScanButton"))
    await sleep(5500)
    expect(sys().getPhase()).toBe("match")

    // 3. The outline tray.
    caption(2)
    await sleep(5500)

    // 4. Wrong part: red shake, the right outline lights up.
    caption(3)
    await sleep(1500)
    await dropPart(ix, "A", "C")
    await sleep(5000)
    expect(sys().getPhase()).toBe("match")

    // 5. Right part: green, the holes glow.
    caption(4)
    await sleep(1500)
    await matchCurrentStep(ix, "C")
    await sleep(5000)

    // 6. Panels into the hologram, including the flipped bottom panel and Flip.
    caption(5)
    await sleep(2000)
    await placeStepPanels(ix, 0)
    await sleep(1800)
    await tap(ix, "DoneButton")
    await sleep(1800)
    expect(sys().getStepIndex()).toBe(1)
    await matchCurrentStep(ix, "A")
    await sleep(1800)
    await placeStepPanels(ix, 1)
    await sleep(2500)

    // 7. Done through the remaining steps to Assembled!.
    caption(6)
    await sleep(2000)
    await tap(ix, "DoneButton")
    await sleep(1800)
    expect(sys().getStepIndex()).toBe(2)
    await matchCurrentStep(ix, "A")
    await sleep(1500)
    await placeStepPanels(ix, 2)
    await sleep(1800)
    await tap(ix, "DoneButton")
    await sleep(1800)
    expect(sys().getStepIndex()).toBe(3)
    await matchCurrentStep(ix, "B")
    await sleep(1500)
    await placeStepPanels(ix, 3)
    await sleep(1800)
    await tap(ix, "DoneButton")
    await sleep(1800)
    expect(sys().getPhase()).toBe("finished")
    await sleep(3000)

    // 8. Rewind: exploded to assembled in one grab, then released.
    caption(7)
    await sleep(1800)
    const ui = sys().ui
    await ix.dragSliderThrough(must("RewindSlider"), () => ui.getSliderValue(), [0, 0.5, 1], ui.sliderLength, 2500)
    await sleep(1800)
    expect(sys().isRewinding()).toBe(false)

    // 9. Closing card, held until the target length.
    caption(8)
    const elapsed = (Date.now() - t0) / 1000
    print("demo-walkthrough: steps done after " + elapsed.toFixed(1) + " s")
    const hold = Math.max(6, Math.min(25, TARGET_SECONDS - elapsed))
    await sleep(hold * 1000)
    print("demo-walkthrough: " + ((Date.now() - t0) / 1000).toFixed(1) + " s")
  }
}
