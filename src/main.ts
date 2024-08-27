/// <reference types="@figma/plugin-typings" />


import { showUI, on } from '@create-figma-plugin/utilities'

import { GridHandler } from './types'
export default function () {
  on<GridHandler>('MAKE_GRID', function( cells: number ) {
    console.log( cells )
    if (!figma.currentPage.selection.length || figma.currentPage.selection[0].type !== 'FRAME') {
      figma.notify('Please select a frame');
      return;
    }
    const selectedFrame = figma.currentPage.selection[0] as FrameNode;
    const frameWidth = selectedFrame.width;
    const frameHeight = selectedFrame.height;
    
    var grid = fitSquaresInRectangle(frameWidth, frameHeight, cells);
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
    selectedFrame.appendChild(gridFrame);

    let LayoutGrids: LayoutGrid[] = [
      {
        pattern: 'GRID',
        sectionSize: cell_size,
        visible: true,
        color: { r: 0.1, g: 0.1, b: 0.1, a: 0.1 }
      }
    ];

    gridFrame.layoutGrids = LayoutGrids;

    figma.notify('Grid created successfully');
  })
  
  showUI({
    height: 160,
    width: 240
  })
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