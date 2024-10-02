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
  handler: (counts: { possibleCellCounts: number[], exactFitCounts: number[] }) => void
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
