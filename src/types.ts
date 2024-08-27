import { EventHandler } from "@create-figma-plugin/utilities";

export interface GridHandler extends EventHandler {
  name: "MAKE_GRID";
  handler: ( cells: number ) => void;
}