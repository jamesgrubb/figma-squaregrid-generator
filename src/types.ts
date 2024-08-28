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
  handler: (options: { isFrameSelected: boolean }) => void
}