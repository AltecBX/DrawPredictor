export type GameId = 'powerball' | 'mega-millions'

export interface GameRules {
  id: GameId
  name: string
  mainCount: number
  mainMax: number
  specialMax: number
  drawDays: number[]
}

export interface Draw {
  date: string
  dayOfWeek: number
  main: number[]
  special: number
}

export interface RankedNumber {
  number: number
  probability: number
  score: number
  rank: number
}

export interface Prediction {
  date: string
  game: GameId
  main: RankedNumber[]
  special: RankedNumber[]
  modelId: string
  confidence: number
}

export interface BacktestPoint {
  date: string
  actual: number[]
  predicted: number[]
  matches: number
  modelId: string
}

export interface ModelResult {
  id: string
  name: string
  score: number
  rollingScore: number
  evaluated: number
  points: BacktestPoint[]
}

export const GAMES: Record<GameId, GameRules> = {
  powerball: {
    id: 'powerball',
    name: 'Powerball',
    mainCount: 5,
    mainMax: 69,
    specialMax: 26,
    drawDays: [1, 3, 6],
  },
  'mega-millions': {
    id: 'mega-millions',
    name: 'Mega Millions',
    mainCount: 5,
    mainMax: 70,
    specialMax: 24,
    drawDays: [2, 5],
  },
}
