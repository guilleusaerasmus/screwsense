// LEAF interactor for ScrewSense: SIK interactions driven by the test, plus a
// closed-loop drag that steers a grabbed object onto a world position and
// releases it there (one continuous grab, like a real user).

import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {awaitEventOnce, nextFrame, sleep as sleepMs, withTimeout} from "Leaf.lspkg/Utils/common/Utils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractorTriggerType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"

export class ScrewSenseLeafInteractor extends DefaultLeafInteractor {
  /**
   * Grab `target`, move it until its world position is within `tolCm` of `dest`, then release.
   * Throws if it cannot get there before `timeoutMs`. The whole gesture (hover, grab, drag,
   * release) also has a hard limit of `timeoutMs` + 8 s: a drag event that never fires fails
   * the call instead of hanging the scenario, and the interactor is reset.
   */
  async dragTo(target: Interactable, dest: vec3, tolCm: number = 0.8, timeoutMs: number = 5000): Promise<void> {
    try {
      await withTimeout(
        this.dragToUnbounded(target, dest, tolCm, timeoutMs),
        timeoutMs + 8000,
        "dragTo: timed out (a drag event never fired)"
      )
    } catch (e) {
      this.setTriggerType(InteractorTriggerType.None)
      this.resetStartEndPoint()
      this.overrideDragVector = undefined
      throw e
    }
  }

  private async dragToUnbounded(target: Interactable, dest: vec3, tolCm: number, timeoutMs: number): Promise<void> {
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

  /**
   * Grab a slider and drag it along its own +X axis until `read()` is within `tol` of `goal`
   * (values are 0..1), run `whileHeld`, then release. `worldLength` is the track length in cm.
   * Has the same hard time limit as dragTo.
   */
  async dragSlider(
    target: Interactable,
    read: () => number,
    goal: number,
    worldLength: number,
    whileHeld?: () => Promise<void>,
    tol: number = 0.03,
    timeoutMs: number = 6000
  ): Promise<void> {
    try {
      await withTimeout(
        this.dragSliderUnbounded(target, read, goal, worldLength, whileHeld, tol, timeoutMs),
        timeoutMs + 8000,
        "dragSlider: timed out (a drag event never fired)"
      )
    } catch (e) {
      this.setTriggerType(InteractorTriggerType.None)
      this.resetStartEndPoint()
      this.overrideDragVector = undefined
      throw e
    }
  }

  /**
   * One continuous slider grab for the demo: drag the knob through each goal in turn, pausing
   * `holdMs` at each, then release. Same hard time limit per goal as dragSlider.
   */
  async dragSliderThrough(
    target: Interactable,
    read: () => number,
    goals: number[],
    worldLength: number,
    holdMs: number,
    tol: number = 0.03,
    timeoutMs: number = 8000
  ): Promise<void> {
    try {
      await withTimeout(
        this.dragSliderThroughUnbounded(target, read, goals, worldLength, holdMs, tol, timeoutMs),
        goals.length * (timeoutMs + holdMs) + 8000,
        "dragSliderThrough: timed out (a drag event never fired)"
      )
    } catch (e) {
      this.setTriggerType(InteractorTriggerType.None)
      this.resetStartEndPoint()
      this.overrideDragVector = undefined
      throw e
    }
  }

  private async dragSliderThroughUnbounded(
    target: Interactable,
    read: () => number,
    goals: number[],
    worldLength: number,
    holdMs: number,
    tol: number,
    timeoutMs: number
  ): Promise<void> {
    const dragStarted = awaitEventOnce(target.onDragStart)
    const dragEnded = awaitEventOnce(target.onDragEnd)
    await this.enterHover(target)
    await nextFrame()
    await nextFrame()
    this.setTriggerType(InteractorTriggerType.Select)
    await nextFrame()
    this.overrideDragVector = new vec3(0.001, 0, 0)
    await dragStarted

    const axis = target.getTransform().right
    let goal = goals[0]
    const unsubscribe = target.onDragUpdate.add(() => {
      const err = goal - read()
      const step = axis.uniformScale(Math.max(-1, Math.min(1, err * worldLength * 0.4)))
      this.startPoint = this.startPoint.add(step)
      this.endPoint = this.endPoint.add(step)
    })

    let worst = 0
    for (const g of goals) {
      goal = g
      const t0 = getTime()
      let settled = 0
      while (getTime() - t0 < timeoutMs / 1000) {
        await awaitEventOnce(target.onTriggerUpdate)
        if (Math.abs(read() - goal) < tol) {
          settled++
          if (settled >= 3) break
        } else {
          settled = 0
        }
      }
      worst = Math.max(worst, Math.abs(read() - goal))
      await sleepMs(holdMs)
    }
    unsubscribe()
    this.setTriggerType(InteractorTriggerType.None)
    await dragEnded
    this.resetStartEndPoint()
    this.overrideDragVector = undefined
    await this.exitHover()
    if (worst >= tol) {
      throw new Error("dragSliderThrough: missed a goal by " + worst.toFixed(2))
    }
  }

  private async dragSliderUnbounded(
    target: Interactable,
    read: () => number,
    goal: number,
    worldLength: number,
    whileHeld: (() => Promise<void>) | undefined,
    tol: number,
    timeoutMs: number
  ): Promise<void> {
    const dragStarted = awaitEventOnce(target.onDragStart)
    const dragEnded = awaitEventOnce(target.onDragEnd)
    await this.enterHover(target)
    await nextFrame()
    await nextFrame()
    this.setTriggerType(InteractorTriggerType.Select)
    await nextFrame()
    this.overrideDragVector = new vec3(0.001, 0, 0)
    await dragStarted

    const axis = target.getTransform().right
    const unsubscribe = target.onDragUpdate.add(() => {
      const err = goal - read()
      const step = axis.uniformScale(Math.max(-2, Math.min(2, err * worldLength * 0.6)))
      this.startPoint = this.startPoint.add(step)
      this.endPoint = this.endPoint.add(step)
    })

    const t0 = getTime()
    let settled = 0
    while (getTime() - t0 < timeoutMs / 1000) {
      await awaitEventOnce(target.onTriggerUpdate)
      if (Math.abs(read() - goal) < tol) {
        settled++
        if (settled >= 3) break
      } else {
        settled = 0
      }
    }
    unsubscribe()
    const reached = read()
    if (whileHeld && Math.abs(reached - goal) < tol) await whileHeld()
    this.setTriggerType(InteractorTriggerType.None)
    await dragEnded
    this.resetStartEndPoint()
    this.overrideDragVector = undefined
    await this.exitHover()
    if (Math.abs(reached - goal) >= tol) {
      throw new Error("dragSlider: stopped at " + reached.toFixed(2) + " instead of " + goal.toFixed(2))
    }
  }
}
