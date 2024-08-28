/// <reference types="@figma/plugin-typings" />


import { showUI, on , emit} from '@create-figma-plugin/utilities'

import { GridHandler, FrameSelectionHandler, AutoPopulateHandler, CreateGridHandler } from './types'

let selectedFrame: FrameNode | null = null;
let lastWidth: number = 0;
let lastHeight: number = 0;
let lastCells: number = 0;
let lastPadding: number = 0;
let autoPopulate: boolean = false;
let selectedFrameId: string | null = null;
let isNewFrameSelected: boolean = false;

export default function () {
  showUI({
    height: 240,
    width: 240
  })
  
  figma.on('selectionchange', () => {
    const isFrameSelected = checkSelection()
    emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected });})
  checkSelection()

  on<GridHandler>('UPDATE_GRID', function({ cellCount, padding }) {
    if (checkSelection()) {
      
      updateGrid(cellCount, padding)
      lastCells = cellCount;
      lastPadding = padding;
    }
  })
  
  // figma.on('selectionchange', checkSelection)
  on<AutoPopulateHandler>('AUTO_POPULATE', function({ autoPopulate: newAutoPopulate }) {
   
    autoPopulate = newAutoPopulate;
    if(selectedFrame && !isNewFrameSelected) {
      updateGrid(lastCells, lastPadding);
    }
  })
  
  on<CreateGridHandler>('CREATE_GRID', function({ cellCount, padding }) {
    if (checkSelection()) {
      isNewFrameSelected = false;
      updateGrid(cellCount, padding)
      lastCells = cellCount;
      lastPadding = padding;
    }
  })
  // Set up an interval to check for size changes
  setInterval(() => {
    if (selectedFrame && (selectedFrame.width !== lastWidth || selectedFrame.height !== lastHeight)) {
      lastWidth = selectedFrame.width;
      lastHeight = selectedFrame.height;
      updateGrid(lastCells, lastPadding);
    }
  }, 500); // Check every 500ms

}

function checkSelection(): boolean {
  if (!figma.currentPage.selection.length) {
    figma.notify('Please select a frame');
    selectedFrame = null;
    selectedFrameId = null;
    isNewFrameSelected = false;
    return false;
  }

  let frame = figma.currentPage.selection[0];

  if (frame.type !== 'FRAME') {
    figma.notify('Please select a frame, not another type of element');
    selectedFrame = null;
    selectedFrameId = null;
    isNewFrameSelected = false;
    return false;
  }

  if (frame.id !== selectedFrameId) {
    isNewFrameSelected = true;
    selectedFrameId = frame.id;
  } else {
    isNewFrameSelected = false;
  }

  selectedFrame = frame;
  lastWidth = frame.width;
  lastHeight = frame.height;
  return true;
}

function updateGrid(cells: number, padding: number) {
  console.log('autoPopulate', autoPopulate)
  if (!selectedFrame || !figma.getNodeById(selectedFrame.id)) {
    console.log('No selected frame');
    return;
  }

  // Check if the selected frame is the GridFrame and select its parent if so
  if (selectedFrame.name === 'GridFrame' && selectedFrame.parent && selectedFrame.parent.type === 'FRAME') {
    selectedFrame = selectedFrame.parent as FrameNode;
    figma.currentPage.selection = [selectedFrame];
  }

  if (isNewFrameSelected) {
    console.log('New frame selected. Use "Create Grid" to generate a grid.');
    return;
  }

  const frameWidth = selectedFrame.width;
  const frameHeight = selectedFrame.height;

    // Check if frameWidth or frameHeight are valid numbers
    if (isNaN(frameWidth) || isNaN(frameHeight) || frameWidth <= 0 || frameHeight <= 0) {
      console.log('Invalid frame dimensions:', frameWidth, frameHeight);
      return;
    }

  const paddingValue = padding / 100 // Convert percentage to decimal
  const availableWidth = frameWidth * (1 - paddingValue)
  const availableHeight = frameHeight * (1 - paddingValue)
  
  var grid = fitSquaresInRectangle(availableWidth, availableHeight, cells);
  var nrows = grid.nrows;
  var ncols = grid.ncols;
  var cell_size = grid.cell_size;

  // Calculate grid size
  const gridWidth = cell_size * ncols;
  const gridHeight = cell_size * nrows;

    // Check if gridWidth or gridHeight are valid numbers
    if (isNaN(gridWidth) || isNaN(gridHeight) || gridWidth <= 0 || gridHeight <= 0) {
      console.log('Invalid grid dimensions:', gridWidth, gridHeight);
      return;
    }

  // Remove existing grid frame if it exists
  const existingGridFrame = selectedFrame.findChild(n => n.name === 'GridFrame');
  if (existingGridFrame) {
    existingGridFrame.remove();
  }

  // Create new child frame for grid
  const gridFrame = figma.createFrame();
  gridFrame.name = 'GridFrame';

  // Resize gridFrame to fit grid
  if(gridWidth > 0 && gridHeight > 0) {
    try {
      gridFrame.resize(gridWidth, gridHeight);
    } catch (error) {
      console.log('Error resizing gridFrame:', error);
      return;
    }
  }

  gridFrame.x = (frameWidth - gridWidth) / 2;
  gridFrame.y = (frameHeight - gridHeight) / 2;

  try { 
    selectedFrame.appendChild(gridFrame);
  } catch (error) {
    console.log('Error appending gridFrame to selectedFrame:', error);
    return;
  }

  // Create cells with grey and red tones
  const existingCells = gridFrame.findChildren(n => n.type === 'FRAME');
  if (autoPopulate) {
    if (existingCells.length === 0) {
      try {
  for (let i = 0; i < nrows; i++) {
    for (let j = 0; j < ncols; j++) {
      const cell = figma.createFrame();
      cell.resize(cell_size, cell_size);
      cell.x = j * cell_size;
      cell.y = i * cell_size;
      cell.fills = [{ type: 'SOLID', color: generateGreyRedColor() }];
      gridFrame.appendChild(cell);
    }
  }
  } catch (error) {
    console.log('Error populating grid:', error);
    return;
  }
  } else{
    existingCells.forEach(cell => { cell.remove()})
  }
  }
  let LayoutGrids: LayoutGrid[] = [
    {
      pattern: 'GRID',
      sectionSize: cell_size,
      visible: true,
      color: { r: 0.1, g: 0.1, b: 0.1, a: 0.1 }
    }
  ];

  gridFrame.layoutGrids = LayoutGrids;

  

function generateGreyRedColor(): { r: number, g: number, b: number } {
  const isGrey = Math.random() < 0.7; // 70% chance of grey, 30% chance of red

  if (isGrey) {
    const value = Math.random() * 0.8 + 0.1; // Grey value between 0.1 and 0.9
    return { r: value, g: value, b: value };
  } else {
    const value = Math.random() * 0.6 + 0.4; // Red value between 0.4 and 1.0
    return { r: value, g: 0, b: 0 };
  }
}

function fitSquaresInRectangle(x: number, y: number, n: number) {
  var ratio = x / y;
  var ncols_float = Math.sqrt(n * ratio);
  var nrows_float = n / ncols_float;

  var nrows1 = Math.floor(nrows_float);
  var ncols1 = Math.ceil(n / nrows1);
  var cell_size1 = Math.floor(Math.min(x / ncols1, y / nrows1));

  var ncols2 = Math.floor(ncols_float);
  var nrows2 = Math.ceil(n / ncols2);
  var cell_size2 = Math.floor(Math.min(x / ncols2, y / nrows2));

  // Adjust the cell size to an even number
  if (cell_size1 % 2 !== 0) cell_size1--;
  if (cell_size2 % 2 !== 0) cell_size2--;

  if (cell_size1 > cell_size2) {
      return {
          nrows: nrows1,
          ncols: ncols1,
          cell_size: cell_size1
      };
  } else {
      return {
          nrows: nrows2,
          ncols: ncols2,
          cell_size: cell_size2
      };
  }
  }
  } 