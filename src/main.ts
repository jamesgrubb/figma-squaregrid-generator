/// <reference types="@figma/plugin-typings" />

import { showUI, on, emit } from '@create-figma-plugin/utilities';
import { GridHandler, FrameSelectionHandler, AutoPopulateHandler, CreateGridHandler, UpdateColorsHandler, CellCountHandler, ExactFitHandler, PerfectFitsHandler, SinglePerfectFitHandler, RandomizeColorsHandler } from './types';
import { EventHandler } from '@create-figma-plugin/utilities';
import debounce from 'lodash/debounce';
let selectedFrame: FrameNode | null = null;
let lastWidth: number = 0;
let lastHeight: number = 0;
let lastCells: number = 0;
let lastPadding: number = 0;
let autoPopulate: boolean = false;
let selectedFrameId: string | null = null;
let isNewFrameSelected: boolean = false;
let isGridCreated: boolean = false;
let selectedColors: string[] = ['2a5256','cac578','c69a94','57b59c','b1371b'];
let selectedOpacities: string[] = ['100%','100%','100%','100%','100%'];
let randomizeColors: boolean = false;

export default function () {
  showUI({
    height: 280,
    width: 240
  });

  type PossibleCellCountsHandler =EventHandler &{
    possibleCellCounts: number[];
};

const debouncedUpdateColors = debounce((hexColors: string[], opacityPercent: string[]) => {
  selectedColors = hexColors;
  selectedOpacities = opacityPercent;
  if (selectedFrame && !isNewFrameSelected) {
    updateGrid(lastCells, lastPadding);
  }
}, 300); 

const debouncedUpdateGrid = debounce((cellCount: number, padding: number) => {
  updateGrid(cellCount, padding);
}, 100);

  const initialIsFrameSelected = checkSelectionWithoutSideEffects();
  emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected: initialIsFrameSelected });

  figma.on('selectionchange', () => {
    const isFrameSelected = checkSelectionWithoutSideEffects();
    emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected });
  });

  on<RandomizeColorsHandler>('RANDOMIZE_COLORS', function({ randomize }) {
    randomizeColors = randomize;
    if (selectedFrame && !isNewFrameSelected) {
      updateGrid(lastCells, lastPadding);
    }
  });


  on<GridHandler>('UPDATE_GRID', function({ cellCount, padding }) {
    if (isGridCreated && checkSelection()) {
      debouncedUpdateGrid(cellCount, padding);
      lastCells = cellCount;
      lastPadding = padding;
    }
  });

  on<AutoPopulateHandler>('AUTO_POPULATE', function({ autoPopulate: newAutoPopulate }) {
    autoPopulate = newAutoPopulate;
    if (selectedFrame && !isNewFrameSelected) {
      updateGrid(lastCells, lastPadding);
    }
  });

  on<CreateGridHandler>('CREATE_GRID', function({ cellCount, padding }) {
    if (checkSelection()) {
      isNewFrameSelected = false;
      updateGrid(cellCount, padding);
      lastCells = cellCount;
      lastPadding = padding;
      isGridCreated = true;
      
      const { possibleCounts, exactFitCounts } = getPossibleCellCounts(lastWidth, lastHeight, 300);
      console.log('from main exactFitCounts', exactFitCounts)
      
    emit<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', { possibleCellCounts: possibleCounts, exactFitCounts });
    }
  });

  on<ExactFitHandler>('EXACT_FIT', (data) => {
    // Handle the exactFit change here
    console.log('Exact fit changed:', data.exactFit);
    // Add your logic to handle the exact fit change
  });

  on<CellCountHandler>('CELL_COUNT_CHANGE', function({ cellCount }) {
    if (isGridCreated && checkSelection()) {
      const numericCellCount = parseInt(cellCount, 10);
      updateGrid(numericCellCount, lastPadding);
      lastCells = numericCellCount;
    }
  });

  on<UpdateColorsHandler>('UPDATE_COLORS', function({ hexColors, opacityPercent }) {
    debouncedUpdateColors(hexColors, opacityPercent);
    // selectedColors = hexColors
    // selectedOpacities = opacityPercent
    // if (selectedFrame && !isNewFrameSelected) {
    //   updateGrid(lastCells, lastPadding)
    // }
  })

  figma.on('selectionchange', () => {
    const isFrameSelected = checkSelectionWithoutSideEffects();
    emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected });

    if (!isFrameSelected && selectedFrame !== null) {
      console.log('Frame deselected. Closing plugin.');
      figma.notify('Frame deselected. The plugin will now close.');
      figma.closePlugin();
    }
  });

  figma.on('documentchange', (event) => {
    if (isGridCreated && selectedFrame && !isNewFrameSelected) {
      if (!figma.getNodeById(selectedFrame.id)) {
        console.log('Selected frame has been removed');
        emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected: false });
        figma.notify('The selected frame has been removed. The plugin will now close.');
        figma.closePlugin();
        return;
      }
  
      const currentWidth = selectedFrame.width;
      const currentHeight = selectedFrame.height;
      if (currentWidth !== lastWidth || currentHeight !== lastHeight) {
        lastWidth = currentWidth;
        lastHeight = currentHeight;
        updateGrid(lastCells, lastPadding);
  
        // Recalculate possible cell counts and exact fit counts
        const { possibleCounts, exactFitCounts } = getPossibleCellCounts(lastWidth, lastHeight, 300);
        console.log('Frame resized. New exactFitCounts:', exactFitCounts);
        
        // Find the single perfect fit
        const singlePerfectFit = findSinglePerfectFit(exactFitCounts);
        
        // Emit the updated counts to the UI
        emit<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', { possibleCellCounts: possibleCounts, exactFitCounts });
        
        // Emit the updated perfect fits
        emit<PerfectFitsHandler>('PERFECT_FITS', { perfectFits: exactFitCounts });
        
        // Emit the single perfect fit
        emit<SinglePerfectFitHandler>('SINGLE_PERFECT_FIT', { singlePerfectFit });
      }
    }
  });
}

function findSinglePerfectFit(exactFitCounts: number[]): number | null {
  return exactFitCounts.length === 1 ? exactFitCounts[0] : null;
}

function checkSelectionWithoutSideEffects(): boolean {
  if (!figma.currentPage.selection.length) {
    return false;
  }

  let frame = figma.currentPage.selection[0];
  return frame.type === 'FRAME';
}

function checkSelection(): boolean {
  if (!figma.currentPage.selection.length) {
    console.log('No selection');
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
  console.log('autoPopulate', autoPopulate);
  if (!selectedFrame || !figma.getNodeById(selectedFrame.id)) {
    console.log('No selected frame');
    return;
  }

  const frameWidth = Math.floor(selectedFrame.width);
  const frameHeight = Math.floor(selectedFrame.height);

  if (isNaN(frameWidth) || isNaN(frameHeight) || frameWidth <= 0 || frameHeight <= 0) {
    console.log('Invalid frame dimensions:', frameWidth, frameHeight);
    return;
  }

  const paddingValue = padding / 100; // Convert percentage to decimal
  const availableWidth = frameWidth * (1 - paddingValue);
  const availableHeight = frameHeight * (1 - paddingValue);

  const grid = fitSquaresInRectangle(availableWidth, availableHeight, cells);
  const nrows = grid.nrows;
  const ncols = grid.ncols;
  const cell_size = grid.cell_size;
  const gridWidth = grid.used_width;
  const gridHeight = grid.used_height;

  if (isNaN(gridWidth) || isNaN(gridHeight) || gridWidth <= 0 || gridHeight <= 0) {
    console.log('Invalid grid dimensions:', gridWidth, gridHeight);
    return;
  }

  const existingGridFrame = selectedFrame.findChild(n => n.name === 'GridFrame');
  if (existingGridFrame) {
    existingGridFrame.remove();
  }

  const gridFrame = figma.createFrame();
  gridFrame.name = 'GridFrame';

  if (gridWidth > 0 && gridHeight > 0) {
    gridFrame.resize(gridWidth, gridHeight);
  }

  gridFrame.x = Math.floor((frameWidth - gridWidth) / 2);
  gridFrame.y = Math.floor((frameHeight - gridHeight) / 2);

  try {
    selectedFrame.appendChild(gridFrame);
  } catch (error) {
    console.log('Error appending gridFrame to selectedFrame:', error);
    return;
  }

  if (autoPopulate) {
    const existingCells = gridFrame.findChildren(n => n.type === 'FRAME');
    let colorIndex = 0;
    let colorOrder = Array.from({ length: selectedColors.length }, (_, i) => i);
    console.log('colorOrder', colorOrder);
    const applyColor = (cell: SceneNode) => {
      if ('fills' in cell) {
        const currentColorIndex = colorOrder[colorIndex];
        const opacityValue = parseFloat(selectedOpacities[currentColorIndex]);
        cell.fills = [{
          type: 'SOLID',
          color: hexToRgb(selectedColors[currentColorIndex]),
          opacity: isNaN(opacityValue) ? 1 : opacityValue / 100
        }];
      }
      
      colorIndex = (colorIndex + 1) % selectedColors.length;
      if (randomizeColors && colorIndex === 0) {
        colorOrder = colorOrder.sort(() => Math.random() - 0.5);
      }
    };
    if (existingCells.length === 0) {
      for (let i = 0; i < nrows; i++) {
        for (let j = 0; j < ncols; j++) {
          const cell = figma.createFrame();
          cell.resize(cell_size, cell_size);
          cell.x = j * cell_size;
          cell.y = i * cell_size;
          applyColor(cell);
          gridFrame.appendChild(cell);          
        }
      }
    } else {
      existingCells.forEach(applyColor);
    }
  }

  let layoutGrids: LayoutGrid[] = [
    {
      pattern: 'GRID',
      sectionSize: cell_size,
      visible: true,
      color: { r: 0.1, g: 0.1, b: 0.1, a: 0.1 }
    }
  ];

  gridFrame.layoutGrids = layoutGrids;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      }
    : { r: 0, g: 0, b: 0 };
}

function generateGreyRedColor(): { r: number, g: number, b: number } {
  const isGrey = Math.random() < 0.7;

  if (isGrey) {
    const value = Math.random() * 0.8 + 0.1;
    return { r: 0.1, g: 0, b: value };
  } else {
    const value = Math.random() * 0.6 + 0.4;
    return { r: 0.5, g: 0, b: value };
  }
}

function getPossibleCellCounts(width: number, height: number, maxCells: number): {possibleCounts: number[], exactFitCounts: number[]} {
  const possibleCounts: number[] = [];
  const exactFitCounts: number[] = [];
  for (let i = 1; i <= maxCells; i++) {
    const grid = fitSquaresInRectangle(width, height, i);
    if (grid.nrows * grid.ncols === i) {
      possibleCounts.push(i);
    } if (grid.used_width === Math.floor(width) && 
    grid.used_height === Math.floor(height)) {
      exactFitCounts.push(i);
    }
  }
  console.log('possibleCounts',possibleCounts,'exactFitCounts',exactFitCounts)
  return {possibleCounts, exactFitCounts};
}


function fitSquaresInRectangle(x: number, y: number, n: number) {
  const adjustedX = Math.floor(x);
  const adjustedY = Math.floor(y);

  var ratio = adjustedX / adjustedY;
  var ncols_float = Math.sqrt(n * ratio);
  var nrows_float = n / ncols_float;

  var nrows1 = Math.floor(nrows_float);
  var ncols1 = Math.ceil(n / nrows1);
  var cell_size1 = Math.floor(Math.min(adjustedX / ncols1, adjustedY / nrows1));

  var ncols2 = Math.floor(ncols_float);
  var nrows2 = Math.ceil(n / ncols2);
  var cell_size2 = Math.floor(Math.min(adjustedX / ncols2, adjustedY / nrows2));

  if (cell_size1 % 2 !== 0) cell_size1--;
  if (cell_size2 % 2 !== 0) cell_size2--;

  var used_width1 = ncols1 * cell_size1;
  var used_height1 = nrows1 * cell_size1;

  var used_width2 = ncols2 * cell_size2;
  var used_height2 = nrows2 * cell_size2;

  if (used_width1 <= adjustedX && used_height1 <= adjustedY && cell_size1 > 0) {
    return {
      nrows: nrows1,
      ncols: ncols1,
      cell_size: cell_size1,
      used_width: used_width1,
      used_height: used_height1
    };
  } else {
    return {
      nrows: nrows2,
      ncols: ncols2,
      cell_size: cell_size2,
      used_width: used_width2,
      used_height: used_height2
    };
  }
}
