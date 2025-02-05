import { BaseSolver } from "../BaseSolver"
import type { HighDensityIntraNodeRoute } from "lib/types/high-density-types"
import { distance, pointToSegmentDistance } from "@tscircuit/math-utils"
import type { GraphicsObject } from "graphics-debug"

type Node = {
  x: number
  y: number
  z: number

  g: number
  h: number
  f: number

  parent: Node | null
}

export class SingleHighDensityRouteSolver extends BaseSolver {
  obstacleRoutes: HighDensityIntraNodeRoute[]
  A: { x: number; y: number; z: number }
  B: { x: number; y: number; z: number }
  straightLineDistance: number
  viaPenaltyDistance: number

  viaDiameter: number
  traceThickness: number
  obstacleMargin: number
  layerCount: number
  gridSize = 0.05

  exploredNodes: Set<string>

  candidates: Node[]

  connectionName: string
  solvedPath: HighDensityIntraNodeRoute | null = null

  constructor(opts: {
    connectionName: string
    obstacleRoutes: HighDensityIntraNodeRoute[]
    A: { x: number; y: number; z: number }
    B: { x: number; y: number; z: number }
    viaDiameter?: number
    traceThickness?: number
    obstacleMargin?: number
    layerCount?: number
  }) {
    super()
    this.connectionName = opts.connectionName
    this.obstacleRoutes = opts.obstacleRoutes
    this.A = opts.A
    this.B = opts.B
    this.viaDiameter = opts.viaDiameter ?? 0.6
    this.traceThickness = opts.traceThickness ?? 0.15
    this.obstacleMargin = opts.obstacleMargin ?? 0.1
    this.layerCount = opts.layerCount ?? 2
    this.exploredNodes = new Set()
    this.candidates = [
      {
        ...opts.A,
        z: 0,
        g: 0,
        h: 0,
        f: 0,
        parent: null,
      },
    ]
    this.straightLineDistance = distance(this.A, this.B)
    this.viaPenaltyDistance = this.gridSize + this.straightLineDistance / 2
    this.MAX_ITERATIONS = 1000

    // TODO should be provided by the caller and be the node size
    const bounds = {
      minX: Math.min(this.A.x, this.B.x),
      maxX: Math.max(this.A.x, this.B.x),
      minY: Math.min(this.A.y, this.B.y),
      maxY: Math.max(this.A.y, this.B.y),
      width: 0,
      height: 0,
    }
    for (const route of this.obstacleRoutes) {
      for (const point of route.route) {
        bounds.minX = Math.min(bounds.minX, point.x)
        bounds.maxX = Math.max(bounds.maxX, point.x)
        bounds.minY = Math.min(bounds.minY, point.y)
        bounds.maxY = Math.max(bounds.maxY, point.y)
      }
    }
    bounds.width = bounds.maxX - bounds.minX
    bounds.height = bounds.maxY - bounds.minY
    // You don't need a large grid if there aren't a lot of wires, in general
    // we can bound the number of cells to (viaDiameter / gridSize * numRoutes) ** 2
    const numRoutes = this.obstacleRoutes.length
    const bestRowOrColumnCount = Math.ceil(
      (this.viaDiameter / this.gridSize) * numRoutes,
    )
    let numXCells = bounds.width / this.gridSize
    let numYCells = bounds.height / this.gridSize
    while (numXCells * numYCells > bestRowOrColumnCount ** 2) {
      this.gridSize *= 2
      numXCells = bounds.width / this.gridSize
      numYCells = bounds.height / this.gridSize
    }
  }

  isNodeTooCloseToObstacle(node: Node, margin?: number) {
    margin ??= this.obstacleMargin
    for (const route of this.obstacleRoutes) {
      const pointPairs = getSameLayerPointPairs(route)
      for (const pointPair of pointPairs) {
        if (
          pointPair.z === node.z &&
          pointToSegmentDistance(node, pointPair.A, pointPair.B) <
            this.traceThickness + margin
        ) {
          return true
        }
      }
      for (const via of route.vias) {
        if (distance(node, via) < this.viaDiameter + margin) {
          return true
        }
      }
    }

    return false
  }

  computeH(node: Node) {
    return (
      distance(node, this.B) +
      // via penalty
      Math.abs(node.z - this.B.z) * this.viaPenaltyDistance
    )
  }

  computeG(node: Node) {
    return (
      (node.parent?.g ?? 0) +
      (node.z === 0 ? 0 : this.viaPenaltyDistance) +
      distance(node, node.parent!)
    )
  }

  getNeighbors(node: Node) {
    const neighbors: Node[] = []

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        if (x === 0 && y === 0) continue

        const neighbor = {
          ...node,
          parent: node,
          x: node.x + x * this.obstacleMargin,
          y: node.y + y * this.obstacleMargin,
        }

        if (
          this.exploredNodes.has(`${neighbor.x},${neighbor.y},${neighbor.z}`)
        ) {
          continue
        }

        if (this.isNodeTooCloseToObstacle(neighbor)) {
          continue
        }

        neighbor.g = this.computeG(neighbor)
        neighbor.h = this.computeH(neighbor)
        neighbor.f = neighbor.g + neighbor.h

        neighbors.push(neighbor)
      }
    }

    const viaNeighbor = {
      ...node,
      parent: node,
      z: node.z === 0 ? this.layerCount - 1 : 0,
    }

    if (
      !this.exploredNodes.has(
        `${viaNeighbor.x},${viaNeighbor.y},${viaNeighbor.z}`,
      ) &&
      this.isNodeTooCloseToObstacle(
        viaNeighbor,
        this.viaDiameter + this.obstacleMargin,
      )
    ) {
      viaNeighbor.g = this.computeG(viaNeighbor)
      viaNeighbor.h = this.computeH(viaNeighbor)
      viaNeighbor.f = viaNeighbor.g + viaNeighbor.h

      neighbors.push(viaNeighbor)
    }

    return neighbors
  }

  setSolvedPath(node: Node) {
    const path: Node[] = []
    while (node) {
      path.push(node)
      node = node.parent!
    }
    path.reverse()

    const vias: { x: number; y: number }[] = []
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i].z !== path[i + 1].z) {
        vias.push({ x: path[i].x, y: path[i].y })
      }
    }

    this.solvedPath = {
      connectionName: this.connectionName,
      traceThickness: this.traceThickness,
      viaDiameter: this.viaDiameter,
      route: path.map((node) => ({ x: node.x, y: node.y, z: node.z })),
      vias,
    }
  }

  step() {
    this.candidates.sort((a, b) => b.f - a.f)
    const currentNode = this.candidates.pop()
    if (!currentNode) {
      console.log("no candidates remaining")
      return
    }
    this.exploredNodes.add(`${currentNode.x},${currentNode.y},${currentNode.z}`)

    if (distance(currentNode, this.B) <= this.gridSize) {
      this.solved = true
      this.setSolvedPath(currentNode)
    }

    const neighbors = this.getNeighbors(currentNode)
    for (const neighbor of neighbors) {
      this.candidates.push(neighbor)
    }
  }

  visualize(): GraphicsObject {
    const graphics: GraphicsObject = {
      lines: [],
      points: [],
      rects: [],
      circles: [],
    }

    graphics.lines!.push({
      points: [this.A, this.B],
      strokeColor: "red",
    })

    for (const route of this.obstacleRoutes) {
      graphics.lines!.push({
        points: route.route,
        strokeColor: "blue",
      })
    }

    return graphics
  }
}

function getSameLayerPointPairs(route: HighDensityIntraNodeRoute) {
  const pointPairs: {
    z: number
    A: { x: number; y: number; z: number }
    B: { x: number; y: number; z: number }
  }[] = []

  for (let i = 0; i < route.route.length - 1; i++) {
    if (route.route[i].z === route.route[i + 1].z) {
      pointPairs.push({
        z: route.route[i].z,
        A: route.route[i],
        B: route.route[i + 1],
      })
    }
  }

  return pointPairs
}
