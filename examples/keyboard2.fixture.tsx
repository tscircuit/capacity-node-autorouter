import { InteractiveGraphics } from "graphics-debug/react"
import gkSample191 from "./assets/growing-grid-keyboard-sample-sample191-unrouted_simple_route.json"
import { CapacityMeshSolver } from "lib/solvers/CapacityMeshSolver/CapacityMeshSolver"
import type { SimpleRouteJson } from "lib/types"
import { useState, useRef } from "react"
import { combineVisualizations } from "lib/utils/combineVisualizations"

export default () => {
  const [solver] = useState(
    () =>
      new CapacityMeshSolver(gkSample191 as unknown as SimpleRouteJson, {
        capacityDepth: 7,
      }),
  )
  const [, forceUpdate] = useState({})
  const failedHdSolvers = solver.highDensityRouteSolver?.failedSolvers
  const animationInterval = useRef<number | undefined>(undefined)

  const stopAnimation = () => {
    if (animationInterval.current) {
      clearInterval(animationInterval.current)
      animationInterval.current = undefined
    }
  }

  const animateToNextSolver = () => {
    stopAnimation()
    const currentSolver = solver.activeSolver
    animationInterval.current = window.setInterval(() => {
      solver.step()
      forceUpdate({})
      if (!solver.activeSolver || solver.activeSolver !== currentSolver) {
        stopAnimation()
      }
    }, 10)
  }

  const animateUntilSolved = () => {
    stopAnimation()
    let stepsOfSameSolver = 0
    let lastSolver = solver.activeSolver
    animationInterval.current = window.setInterval(() => {
      for (let i = 0; i < 10 + stepsOfSameSolver / 100; i++) {
        if (solver.activeSolver === lastSolver) {
          stepsOfSameSolver++
        } else {
          stepsOfSameSolver = 0
          lastSolver = solver.activeSolver
        }
        solver.step()
      }
      forceUpdate({})
      if (solver.solved || solver.failed) {
        stopAnimation()
      }
    }, 10)
  }

  return (
    <>
      <div className="border p-1 m-1">Iterations {solver.iterations}</div>
      <button
        className="border m-2 p-2"
        onClick={() => {
          solver.step()
          forceUpdate({})
        }}
      >
        Step
      </button>
      <button className="border m-2 p-2" onClick={animateToNextSolver}>
        Animate to next solver
      </button>
      <button className="border m-2 p-2" onClick={animateUntilSolved}>
        Animate until solved
      </button>
      <button className="border m-2 p-2" onClick={stopAnimation}>
        Stop Animation
      </button>
      <InteractiveGraphics
        graphics={
          solver.solved || solver.failed
            ? solver.visualize()
            : // Fixes dumb animation bug
              combineVisualizations({}, solver.visualize())
        }
      />
      {failedHdSolvers?.map((s) => (
        <button
          className="border m-2 p-2"
          key={s.nodeWithPortPoints.capacityMeshNodeId}
          onClick={() => {
            const json = JSON.stringify({
              nodeWithPortPoints: s.nodeWithPortPoints,
            })
            navigator.clipboard.writeText(json)
            alert("Copied to clipboard")
          }}
        >
          {s.nodeWithPortPoints.capacityMeshNodeId}
        </button>
      ))}
    </>
  )
}
