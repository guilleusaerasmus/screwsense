// Done criterion 7: dragging the rewind slider moves the whole bedside table between fully
// exploded and fully assembled, and releasing it returns to the user's current progress.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"
import {begin, matchCurrentStep, must, placeStepPanels, sys, tap} from "./ScrewSenseLeafKit"
import {PANELS} from "../Scripts/ScrewSenseConfig"

// Largest distance (cm) of a model piece from where it stands in the finished table.
function spread(): number {
  const world = sys().world
  let worst = 0
  for (const def of PANELS) {
    worst = Math.max(worst, world.rewindPieceWorldPos(def.id).distance(world.panelAssembledWorldPos(def.id)))
  }
  return worst
}

@component
export class ScrewSenseP3RewindScenario extends Scenario {
  async run(): Promise<void> {
    const ix = new ScrewSenseLeafInteractor()
    await begin(ix)
    const world = sys().world
    const ui = sys().ui

    // Make some progress: step 1 done, now on step 2 (progress 1/4).
    await matchCurrentStep(ix, "C")
    if (world.panelsDraggable) await placeStepPanels(ix, 0)
    await tap(ix, "DoneButton")
    await sleep(1800)
    expect(sys().getStepIndex()).toBe(1)
    expect(sys().getPhase()).toBe("match")
    expect(ui.isSliderVisible()).toBe(true)
    expect(Math.abs(ui.getSliderValue() - 0.25)).toBeLessThan(0.05)

    const slider = must("RewindSlider")
    const read = (): number => ui.getSliderValue()
    const length = ui.sliderLength

    // Fully exploded: the pieces are away from their assembled places.
    await ix.dragSlider(slider, read, 0, length, async () => {
      await sleep(300)
      expect(sys().isRewinding()).toBe(true)
      expect(world.isRewindShown()).toBe(true)
      expect(spread()).toBeGreaterThan(20)
    })
    await sleep(900)

    // Fully assembled: every piece is in place. The user's progress never changed.
    await ix.dragSlider(slider, read, 1, length, async () => {
      await sleep(300)
      expect(world.isRewindShown()).toBe(true)
      expect(spread()).toBeLessThan(1)
      expect(sys().getStepIndex()).toBe(1)
      expect(sys().getPhase()).toBe("match")
    })
    await sleep(900)

    // Released: the model is gone and the knob is back at the current progress.
    expect(world.isRewindShown()).toBe(false)
    expect(sys().isRewinding()).toBe(false)
    expect(Math.abs(ui.getSliderValue() - 0.25)).toBeLessThan(0.05)
    expect(sys().getStepIndex()).toBe(1)
    expect(sys().getPhase()).toBe("match")
  }
}
