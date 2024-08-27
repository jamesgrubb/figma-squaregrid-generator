import { EventHandler } from "@create-figma-plugin/utilities";

export interface GridHandler {
  name: 'UPDATE_GRID'
  handler: (options: { cellCount: number, padding: number }) => void
}