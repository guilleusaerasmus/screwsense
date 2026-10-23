// LEAF interactor for ScrewSense: SIK interactions driven by the test, plus a
// closed-loop drag that steers a grabbed object onto a world position and
// releases it there (one continuous grab, like a real user).

import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {awaitEventOnce, nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractorTriggerType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"

export class ScrewSenseLeafInteractor extends DefaultLeafInteractor {
  /**
   * Grab `target`, move it until its world position is within `tolCm` of `dest`, then release.
   * Throws if it cannot get there before `timeoutMs`.
   */
  async dragTo(target: Interactable, dest: vec3, tolCm: number = 0.8, timeoutMs: number = 5000): Promise<void> {
    const tr = target.getTransform()
    const dragStarted = awaitEventOnce(target.onDragStart)
    const dragEnded = awaitEventOnce(target.onDragEnd)

    await this.enterHover(target)
    await nextFrame()
    await nextFrame()
    this.setTriggerType(InteractorTriggerType.Select)
    await nextFrame()
    this.overrideDragVector = new vec3(0.001, 0, 0)
    await dragStarted

    const unsubscribe = target.onDragUpdate.add(() => {
      const delta = dest.sub(tr.getWorldPosition())
      const len = delta.length
      const step = len > 3 ? delta.uniformScale(3 / len) : delta.uniformScale(0.7)
      this.startPoint = this.startPoint.add(step)
      this.endPoint = this.endPoint.add(step)
    })

    const t0 = getTime()
    let settled = 0
    while (getTime() - t0 < timeoutMs / 1000) {
      await awaitEventOnce(target.onTriggerUpdate)
      if (dest.distance(tr.getWorldPosition()) < tolCm) {
        settled++
        if (settled >= 3) break
      } else {
        settled = 0
      }
    }
    unsubscribe()
    const reached = dest.distance(tr.getWorldPosition())
    this.setTriggerType(InteractorTriggerType.None)
    await dragEnded
    this.resetStartEndPoint()
    this.overrideDragVector = undefined
    await this.exitHover()
    if (reached >= tolCm) {
      throw new Error("dragTo: stopped " + reached.toFixed(1) + " cm from the destination")
    }
  }
}
