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
    const frame = figma.currentPage.selection[0] as FrameNode;
    const frameWidth = frame.width;
    const frameHeight = frame.height;
    
    var grid = fitSquaresInRectangle(frameWidth, frameHeight, cells);
    var nrows = grid.nrows;
    var ncols = grid.ncols;
    var cell_size = grid.cell_size;
    
    // Check if the grid can be perfectly centered
    const horizontalRemainder = frameWidth - (cell_size * ncols);
    const verticalRemainder = frameHeight - (cell_size * nrows);
    
    if (horizontalRemainder % 2 !== 0 || verticalRemainder % 2 !== 0) {
      figma.notify('Cannot create a perfectly centered grid. Skipping.');
      return;
    }
    
    let LayoutGrids: LayoutGrid[] = [
      {
        pattern: 'COLUMNS',
        alignment: 'STRETCH',
        gutterSize: 0,
        count: ncols,
        offset: horizontalRemainder / 2
      },
      {
        pattern: 'ROWS',
        alignment: 'STRETCH',
        gutterSize: 0,
        count: nrows,
        offset: verticalRemainder / 2
      }
    ];

    frame.layoutGrids = LayoutGrids;
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