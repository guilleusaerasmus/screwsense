// Done criterion 3: grabbing dowel C and releasing it over outline C snaps it in,
// turns the outline green and makes the dowel holes on both side panels glow.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"
import {begin, dropPart, sys} from "./ScrewSenseLeafKit"

@component
export class ScrewSenseP1MatchScenario extends Scenario {
  async run(): Promise<void> {
    const ix = new ScrewSenseLeafInteractor()
    await begin(ix)
    const world = sys().world
    const matchBefore = sys().playCount("match")

    expect(world.isTrayVisible()).toBe(true)
    expect(world.holesGlowing("sideL")).toBe(false)

    await dropPart(ix, "C", "C")
    await sleep(300)

    expect(world.getOutlineState("C")).toBe("match")
    expect(world.partWorldPos("C").distance(world.outlineWorldPos("C"))).toBeLessThan(2)
    expect(world.holesGlowing("sideL")).toBe(true)
    expect(world.holesGlowing("sideR")).toBe(true)
    expect(world.holesGlowing("bottom")).toBe(false)
    expect(sys().playCount("match")).toBe(matchBefore + 1)
    expect(sys().getPhase()).toBe("place")
    await sleep(1000)
    expect(world.isTrayVisible()).toBe(false)
  }
}
