import { EventHandler } from "@create-figma-plugin/utilities";

export interface GridHandler {
  name: 'UPDATE_GRID'
  handler: (options: { cellCount: number, padding: number }) => void
}

export interface AutoPopulateHandler {
  name: 'AUTO_POPULATE'
  handler: (options: { autoPopulate: boolean }) => void
}

export interface FrameSelectionHandler {
  name: 'FRAME_SELECTED'
  handler: (options: { isFrameSelected: boolean} ) => void
}

export interface PossibleCellCountsHandler {
  name: 'POSSIBLE_CELL_COUNTS'
  handler: (counts: {
    possibleCellCounts: number[]
    exactFitCounts: number[]
    evenGridCounts: number[]
  }) => void
}

export interface CreateGridHandler {
  name: 'CREATE_GRID'
  handler: (options: { cellCount: number, padding: number }) => void
}

export interface UpdateColorsHandler extends EventHandler {
  name: 'UPDATE_COLORS'
  handler: (data: { hexColors: string[], opacityPercent: string[] }) => void
}

export interface CellCountHandler {
  name: 'CELL_COUNT_CHANGE'
  handler: (data: { cellCount: string }) => void
}

export interface ExactFitHandler {
  name: 'EXACT_FIT'
  handler: (data: { exactFit: boolean }) => void
}

export interface PerfectFitsHandler extends EventHandler {
  name: 'PERFECT_FITS'
  handler: (data: { perfectFits: number[] }) => void
}

export interface SinglePerfectFitHandler extends EventHandler {
  name: 'SINGLE_PERFECT_FIT'
  handler: (data: { singlePerfectFit: number | null }) => void
}

export interface RandomizeColorsHandler {
  name: 'RANDOMIZE_COLORS'
  handler: (data: { randomize: boolean }) => void
}

export interface EvenGridHandler {
  name: 'EVEN_GRID'
  handler: (options: { evenGrid: boolean }) => void
}

export interface EvenGridHandler {
  name: 'EVEN_GRID'
  handler: (data: { evenGrid: boolean }) => void
}