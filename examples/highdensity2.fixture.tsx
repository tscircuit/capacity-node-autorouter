import React from "react"
import { InteractiveGraphics } from "graphics-debug/react"
import { SingleIntraNodeRouteSolver } from "../lib/solvers/HighDensitySolver/SingleIntraNodeRouteSolver"

const nodeWithPortPoints = {
  capacityMeshNodeId: "node1",
  center: { x: 5, y: 5 },
  width: 10,
  height: 10,
  portPoints: [
    { connectionName: "A", x: 2, y: 0 },
    { connectionName: "A", x: 8, y: 10 },
    { connectionName: "B", x: 5, y: 0 },
    { connectionName: "B", x: 0, y: 10 },
  ],
}

export default () => {
  const solver = new SingleIntraNodeRouteSolver({
    nodeWithPortPoints,
    colorMap: { test: "green" },
  })

  solver.solve()

  const graphics =
    solver.solvedRoutes.length > 0 ? solver.visualize() : { lines: [] }

  if (solver.failedSolvers.length > 0) {
    return (
      <InteractiveGraphics graphics={solver.failedSolvers[0].visualize()} />
    )
  }

  return <InteractiveGraphics graphics={graphics} />
}
