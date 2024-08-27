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
    let LayoutGrids: LayoutGrid[] = [];
    console.log(grid.cell_size);

    LayoutGrids = [
      {
        pattern: 'COLUMNS',
        sectionSize: cell_size,
        gutterSize: 0,
        count: ncols,
        alignment: 'CENTER',
      },
      {
        pattern: 'ROWS',
        alignment: 'CENTER',
        gutterSize: 0,
        count: nrows,
        sectionSize: cell_size,
      },
      {
        pattern: 'COLUMNS',
        alignment: 'STRETCH',
        color: { r: 0, g: 1, b: 0, a: 1 },
        // sectionSize: cell_size,
        gutterSize: 0,
        count: (frameWidth - (cell_size * ncols)) / 2 === 0 ? 0 : 1, //was 1,
        offset: (frameWidth - (cell_size * ncols)) / 2,
      },
      {
        pattern: 'ROWS',
        alignment: 'STRETCH',
        color: { r: 0, g: 1, b: 0, a: 1 },
        gutterSize: 0,
        // count: nrows,
        count: (frameHeight - (cell_size * nrows)) / 2 === 0 ? 0 : 1, //was 1
        // sectionSize: cell_size ignored when alignment is STRETCH and throws error,
        offset: (frameHeight - (cell_size * nrows)) / 2,
      }
    ]

    if (LayoutGrids.length > 0){
      frame.layoutGrids = LayoutGrids;
  }

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