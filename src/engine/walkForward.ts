import type { BacktestPoint, Draw, ModelResult } from './types'

export interface PredictorModel {
  id: string
  name: string
  minHistory: number
  predict(history: readonly Draw[], poolMax: number, pickCount: number): number[]
}

function intersectionCount(a: readonly number[], b: readonly number[]): number {
  const set = new Set(a)
  let matches = 0
  for (const value of b) if (set.has(value)) matches++
  return matches
}

export function walkForward(
  draws: readonly Draw[],
  model: PredictorModel,
  poolMax: number,
  pickCount: number,
): ModelResult {
  const points: BacktestPoint[] = []

  for (let index = model.minHistory; index < draws.length; index++) {
    const history = draws.slice(0, index)
    const target = draws[index]
    const predicted = model.predict(history, poolMax, pickCount).slice(0, pickCount)
    points.push({
      date: target.date,
      actual: target.main,
      predicted,
      matches: intersectionCount(predicted, target.main),
      modelId: model.id,
    })
  }

  const evaluated = points.length
  const score = evaluated === 0 ? 0 : points.reduce((sum, point) => sum + point.matches, 0) / evaluated
  const recent = points.slice(-Math.min(50, points.length))
  const rollingScore = recent.length === 0 ? 0 : recent.reduce((sum, point) => sum + point.matches, 0) / recent.length

  return {
    id: model.id,
    name: model.name,
    score,
    rollingScore,
    evaluated,
    points,
  }
}

export function runTournament(
  draws: readonly Draw[],
  models: readonly PredictorModel[],
  poolMax: number,
  pickCount: number,
): ModelResult[] {
  return models
    .map((model) => walkForward(draws, model, poolMax, pickCount))
    .sort((a, b) => b.rollingScore - a.rollingScore || b.score - a.score)
}
