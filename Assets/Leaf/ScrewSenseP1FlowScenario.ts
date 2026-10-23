// Done criterion 6: Done after a correct step shows the next step card beside the next
// panel; after step 4 the finished bedside table and "Assembled!" appear.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"
import {begin, matchCurrentStep, sys, tap} from "./ScrewSenseLeafKit"

const PARTS = ["C", "A", "A", "B"]
const NEXT_PANEL = ["bottom", "top", "back"]

@component
export class ScrewSenseP1FlowScenario extends Scenario {
  async run(): Promise<void> {
    const ix = new ScrewSenseLeafInteractor()
    await begin(ix)
    const ui = sys().ui
    const world = sys().world

    for (let step = 0; step < 4; step++) {
      expect(sys().getStepIndex()).toBe(step)
      expect(ui.getCardText().includes("Step " + (step + 1) + " of 4")).toBe(true)
      await matchCurrentStep(ix, PARTS[step])
      await tap(ix, "DoneButton")
      await sleep(1800)
      if (step < 3) {
        expect(sys().getStepIndex()).toBe(step + 1)
        expect(sys().getPhase()).toBe("match")
        expect(ui.isCardVisible()).toBe(true)
        // The card hangs next to the next panel to work on.
        const panel = world.panelWorldPos(NEXT_PANEL[step])
        const card = ui.cardAnchor.getTransform().getWorldPosition()
        expect(card.distance(panel)).toBeLessThan(30)
      }
    }
    expect(sys().getPhase()).toBe("finished")
    expect(ui.getMessage()).toBe("Assembled!")
    for (const id of ["sideL", "sideR", "bottom", "top", "back"]) {
      expect(world.panelIsAssembled(id)).toBe(true)
      expect(world.panelWorldPos(id).distance(world.panelAssembledWorldPos(id))).toBeLessThan(0.5)
    }
  }
}
