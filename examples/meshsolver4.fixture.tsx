import { InteractiveGraphics } from "graphics-debug/react"
import { CapacityMeshNodeSolver } from "../lib/solvers/CapacityMeshSolver/CapacityMeshNodeSolver"
import type { SimpleRouteJson } from "lib/types"
import { CapacityMeshEdgeSolver } from "lib/solvers/CapacityMeshSolver/CapacityMeshEdgeSolver"

const simpleSrj = {
  bounds: {
    minX: 0,
    maxX: 100,
    minY: 0,
    maxY: 100,
  },
  layerCount: 1,
  minTraceWidth: 1,
  obstacles: [
    {
      center: {
        x: 50,
        y: 50,
      },
      width: 20,
      height: 10,
      type: "rect",
      layers: ["top", "bottom"],
      connectedTo: [],
    },
    {
      center: {
        x: 55,
        y: 90,
      },
      width: 20,
      height: 10,
      type: "rect",
      layers: ["top", "bottom"],
      connectedTo: [],
    },
  ],
  connections: [
    {
      name: "trace1",
      pointsToConnect: [
        {
          x: 15,
          y: 10,
          layer: "top",
        },
        {
          x: 55,
          y: 90,
          layer: "top",
        },
      ],
    },
  ],
} as SimpleRouteJson

export default () => {
  // Solve for mesh nodes using the CapacityMeshNodeSolver
  const nodeSolver = new CapacityMeshNodeSolver(simpleSrj)
  while (!nodeSolver.solved) {
    nodeSolver.step()
  }

  // Combine finished and unfinished nodes for edge solving
  const allNodes = [...nodeSolver.finishedNodes, ...nodeSolver.unfinishedNodes]

  // Solve for mesh edges
  const edgeSolver = new CapacityMeshEdgeSolver(allNodes)
  edgeSolver.solve()
  return <InteractiveGraphics graphics={edgeSolver.visualize()} />
}
