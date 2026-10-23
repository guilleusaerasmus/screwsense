// Done criterion 4: releasing a wrong part over an outline makes the outline shake red,
// plays a low tone and lights up the correct outline; the step does not advance.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"
import {begin, dropPart, sys} from "./ScrewSenseLeafKit"

@component
export class ScrewSenseP1WrongScenario extends Scenario {
  async run(): Promise<void> {
    const ix = new ScrewSenseLeafInteractor()
    await begin(ix)
    const world = sys().world

    // Screw A released over outline C: does not fit.
    await dropPart(ix, "A", "C")
    await sleep(100)
    expect(world.getOutlineState("C")).toBe("wrong")
    expect(world.getOutlineState("A")).toBe("hint")
    expect(sys().audio["wrong"].isPlaying()).toBe(true)
    expect(sys().getPhase()).toBe("match")
    expect(sys().getStepIndex()).toBe(0)
    expect(world.holesGlowing("sideL")).toBe(false)

    // The part goes back to the dish.
    await sleep(900)
    expect(world.partWorldPos("A").distance(world.partHomeWorldPos("A"))).toBeLessThan(1)

    // Screw A fits outline A but step 1 needs dowel C: still wrong, hint points to C.
    await dropPart(ix, "A", "A")
    await sleep(100)
    expect(world.getOutlineState("A")).toBe("wrong")
    expect(world.getOutlineState("C")).toBe("hint")
    expect(sys().getPhase()).toBe("match")
    expect(sys().getStepIndex()).toBe(0)
  }
}
