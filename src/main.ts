/// <reference types="@figma/plugin-typings" />


import { showUI, on } from '@create-figma-plugin/utilities'

import { GridHandler } from './types'

export default function () {
  checkSelection()

  on<GridHandler>('UPDATE_GRID', function({ cellCount, padding }) {
    if (checkSelection()) {
      updateGrid(cellCount, padding)
    }
  })
  
  showUI({
    height: 240,
    width: 240
  })
}

function checkSelection(): boolean {
  if (!figma.currentPage.selection.length) {
    figma.notify('Please select a frame');
    return false;
  }

  let selectedFrame = figma.currentPage.selection[0];

  if (selectedFrame.type !== 'FRAME') {
    figma.notify('Please select a frame, not another type of element');
    return false;
  }

  return true;
}

function updateGrid(cells: number, padding: number) {
  let selectedFrame = figma.currentPage.selection[0] as FrameNode;

  // Check if the selected frame is the GridFrame and select its parent if so
  if (selectedFrame.name === 'GridFrame' && selectedFrame.parent && selectedFrame.parent.type === 'FRAME') {
    selectedFrame = selectedFrame.parent as FrameNode;
    figma.currentPage.selection = [selectedFrame];
  }

  const frameWidth = selectedFrame.width;
  const frameHeight = selectedFrame.height;
  
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

  // Convert selected frame to auto layout with fixed size
  selectedFrame.layoutMode = 'HORIZONTAL';
  selectedFrame.primaryAxisAlignItems = 'CENTER';
  selectedFrame.counterAxisAlignItems = 'CENTER';
  selectedFrame.primaryAxisSizingMode = 'FIXED';
  selectedFrame.counterAxisSizingMode = 'FIXED';
  selectedFrame.resize(frameWidth, frameHeight);

  // Remove existing grid frame if it exists
  const existingGridFrame = selectedFrame.findChild(n => n.name === 'GridFrame');
  if (existingGridFrame) {
    existingGridFrame.remove();
  }

  // Create new child frame for grid
  const gridFrame = figma.createFrame();
  gridFrame.name = 'GridFrame';
  gridFrame.resize(gridWidth, gridHeight);
  gridFrame.x = (frameWidth - gridWidth) / 2;
  gridFrame.y = (frameHeight - gridHeight) / 2;
  selectedFrame.appendChild(gridFrame);

  // Create cells
  for (let i = 0; i < nrows; i++) {
    for (let j = 0; j < ncols; j++) {
      const cell = figma.createFrame();
      cell.resize(cell_size, cell_size);
      cell.x = j * cell_size;
      cell.y = i * cell_size;
      gridFrame.appendChild(cell);
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

  figma.notify('Grid updated');
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