/// <reference types="@figma/plugin-typings" />

import { showUI, on, emit } from '@create-figma-plugin/utilities';
import { 
  GridHandler, 
  FrameSelectionHandler, 
  AutoPopulateHandler, 
  CreateGridHandler, 
  CellCountHandler, 
  ExactFitHandler, 
  PerfectFitsHandler, 
  SinglePerfectFitHandler, 
  EvenGridHandler
} from './types';
import { EventHandler } from '@create-figma-plugin/utilities';
import debounce from 'lodash/debounce';

let selectedFrame: FrameNode | null = null;

let lastWidth: number = 0;
let lastHeight: number = 0;

let lastCells: number = 0;
let autoPopulate: boolean = false;
let selectedFrameId: string | null = null;
let isNewFrameSelected: boolean = false;
let isGridCreated: boolean = false;
let forceEvenGrid: boolean = false;

export default function () {
  showUI({
    height: 148,
    width: 240
  });

  type PossibleCellCountsHandler = EventHandler & {
    possibleCellCounts: number[];
    exactFitCounts: number[];
    evenGridCounts: number[];
  };


  const debouncedUpdateGrid = debounce((cellCount: number,) => {
    updateGrid(cellCount);
  }, 50);

  const initialIsFrameSelected = checkSelectionWithoutSideEffects();
  emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected: initialIsFrameSelected });

  figma.on('selectionchange', () => {
    const isFrameSelected = checkSelectionWithoutSideEffects();
    emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected });
  });

  
  figma.on('selectionchange', () => {
    const selectedNodes = figma.currentPage.selection;
  
    // Check if the selected node is the grid frame
    if (selectedNodes.length === 1 && selectedNodes[0].name === 'GridFrame') {
      // Close the plugin
      figma.closePlugin();
    }
  });

  on<GridHandler>('UPDATE_GRID', function({ cellCount }) {
    if (isGridCreated && checkSelection()) {
      debouncedUpdateGrid(cellCount);
      lastCells = cellCount;      
    }
  });

  on<AutoPopulateHandler>('AUTO_POPULATE', function({ autoPopulate: newAutoPopulate }) {
    autoPopulate = newAutoPopulate;
    if (selectedFrame && !isNewFrameSelected) {
      updateGrid(lastCells);
    }
    figma.ui.resize(240, autoPopulate ? 370 : 280);
  });

  on<CreateGridHandler>('CREATE_GRID', function({ cellCount }) {
    if (checkSelection()) {
      isNewFrameSelected = false;
      updateGrid(cellCount);
      lastCells = cellCount;
      isGridCreated = true;
      
      const { possibleCounts, exactFitCounts, evenGridCounts } = getPossibleCellCounts(lastWidth, lastHeight, 300, forceEvenGrid);
      
      // Find the single perfect fit
      const singlePerfectFit = findSinglePerfectFit(exactFitCounts);
      
      // Emit all necessary updates
      emit<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', { 
        possibleCellCounts: possibleCounts, 
        exactFitCounts,
        evenGridCounts 
      });
      
      emit<PerfectFitsHandler>('PERFECT_FITS', { perfectFits: exactFitCounts });
      emit<SinglePerfectFitHandler>('SINGLE_PERFECT_FIT', { singlePerfectFit });
    }
  });

  on<ExactFitHandler>('EXACT_FIT', () => {
  });

  on<CellCountHandler>('CELL_COUNT_CHANGE', function({ cellCount }) {
    if (isGridCreated && checkSelection()) {
      const numericCellCount = parseInt(cellCount, 10);
      updateGrid(numericCellCount);
      lastCells = numericCellCount;
    }
  });
  
  
  figma.on('selectionchange', () => {
    const isFrameSelected = checkSelectionWithoutSideEffects();
    emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected });

    if (!isFrameSelected && selectedFrame !== null) {
      figma.notify('Frame deselected. The plugin will now close.');
      figma.closePlugin();
    }
  });

  figma.on('documentchange', () => {
    if (isGridCreated && selectedFrame && !isNewFrameSelected) {
      if (!figma.getNodeById(selectedFrame.id)) {
        emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected: false });
        figma.notify('The selected frame has been removed. The plugin will now close.');
        figma.closePlugin();
        return;
      }
  
      const currentWidth = selectedFrame.width;
      const currentHeight = selectedFrame.height;
      
      if (currentWidth !== lastWidth || currentHeight !== lastHeight) {
        console.log('Frame resized:', { currentWidth, currentHeight });
        
        lastWidth = currentWidth;
        lastHeight = currentHeight;
        
        // Recalculate possible cell counts and exact fit counts
        const { possibleCounts, exactFitCounts, evenGridCounts } = getPossibleCellCounts(lastWidth, lastHeight, 300, forceEvenGrid);
        
        console.log('New calculations:', {
          possibleCounts,
          exactFitCounts,
          evenGridCounts
        });
        
        // Emit the updates
        emit<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', { 
          possibleCellCounts: possibleCounts, 
          exactFitCounts,
          evenGridCounts 
        });
        
        // Update grid with current cell count
        updateGrid(lastCells);
      }
    }
  });

  on<EvenGridHandler>('EVEN_GRID', function({ evenGrid }) {
    forceEvenGrid = evenGrid;
    if (selectedFrame && !isNewFrameSelected) {
      // Recalculate possible cell counts with new even grid setting
      const { possibleCounts, exactFitCounts, evenGridCounts } = getPossibleCellCounts(lastWidth, lastHeight, 300, forceEvenGrid);
      
      // Emit updated counts to UI
      emit<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', { 
        possibleCellCounts: possibleCounts, 
        exactFitCounts, 
        evenGridCounts 
      });
      
      // Update the grid
      updateGrid(lastCells);
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

  const frame = figma.currentPage.selection[0];
  return frame.type === 'FRAME';
}

function checkSelection(): boolean {
  if (!figma.currentPage.selection.length) {
    selectedFrame = null;
    selectedFrameId = null;
    isNewFrameSelected = false;
    return false;
  }

  const frame = figma.currentPage.selection[0];

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

function updateGrid(cells: number) {
  if (!selectedFrame || !figma.getNodeById(selectedFrame.id)) {
    return;
  }

  const frameWidth = Math.floor(selectedFrame.width);
  const frameHeight = Math.floor(selectedFrame.height);

  if (isNaN(frameWidth) || isNaN(frameHeight) || frameWidth <= 0 || frameHeight <= 0) {
    return;
  }

  const availableWidth = frameWidth;
  const availableHeight = frameHeight;

  const grid = fitSquaresInRectangle(availableWidth, availableHeight, cells, forceEvenGrid);
  if (!grid) {
    return;
  }

  
  const cell_size = grid.cell_size;
  const gridWidth = grid.used_width;
  const gridHeight = grid.used_height;

  if (isNaN(gridWidth) || isNaN(gridHeight) || gridWidth <= 0 || gridHeight <= 0) {
    return;
  }

  const existingGridFrame = selectedFrame.findChild(n => n.name === 'GridFrame');
  if (existingGridFrame) {
    existingGridFrame.remove();
  }

  const gridFrame = figma.createFrame();
  gridFrame.name = 'GridFrame';
  gridFrame.fills = [{
    type: 'SOLID', 
    color: {r: 0.2, g: 0.243, b: 0.835},
    opacity: 0
  }];
  
  if (gridWidth > 0 && gridHeight > 0) {
    gridFrame.resize(gridWidth, gridHeight);
  }

  gridFrame.x = Math.floor((frameWidth - gridWidth) / 2);
  gridFrame.y = Math.floor((frameHeight - gridHeight) / 2);

  try {
    selectedFrame.appendChild(gridFrame);
  } catch (error) {
    console.error(error);
    return;
  }

  

  const layoutGrids: LayoutGrid[] = [
    {
      pattern: 'GRID',
      sectionSize: cell_size,
      visible: true,
      color: { r: 0.2, g: 0.243, b: 0.835, a: 0.5 }
    }
  ];

  gridFrame.layoutGrids = layoutGrids;
}





function getPossibleCellCounts(width: number, height: number, maxCells: number, forceEvenGrid: boolean = false): {
  possibleCounts: number[], 
  exactFitCounts: number[],
  evenGridCounts: number[]
} {
  // Cache results for performance
  const gridCache = new Map();
  
  function getGridForCount(count: number) {
    const cacheKey = `${count}-${forceEvenGrid}`;
    if (!gridCache.has(cacheKey)) {
      gridCache.set(cacheKey, fitSquaresInRectangle(width, height, count, forceEvenGrid));
    }
    return gridCache.get(cacheKey);
  }

  const targetWidth = Math.floor(width);
  const targetHeight = Math.floor(height);

  // Pre-calculate all possible counts
  const allCounts = Array.from({ length: maxCells }, (_, i) => i + 1);
  
  // Filter counts based on criteria
  const results = allCounts.reduce((acc, count) => {
    const grid = getGridForCount(count);
    const totalCells = grid.nrows * grid.ncols;
    const hasEvenDimensions = grid.nrows % 2 === 0 && grid.ncols % 2 === 0;
    
    if (totalCells === count) {
      if (!forceEvenGrid || hasEvenDimensions) {
        acc.possibleCounts.push(count);
      }
    }

    const isExactFit = grid.used_width === targetWidth && 
                      grid.used_height === targetHeight &&
                      grid.cell_size > 0;
    
    if (isExactFit && (!forceEvenGrid || hasEvenDimensions)) {
      acc.exactFitCounts.push(count);
    }

    if (hasEvenDimensions && totalCells === count) {
      acc.evenGridCounts.push(count);
    }

    return acc;
  }, {
    possibleCounts: [] as number[],
    exactFitCounts: [] as number[],
    evenGridCounts: [] as number[]
  });

  return results;
}

function getFactorPairs(n: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 1; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      pairs.push([i, n / i]);
    }
  }
  return pairs;
}

function fitSquaresInRectangle(x: number, y: number, n: number, forceEvenGrid: boolean = false) {
  // Ensure inputs are valid numbers and greater than 0
  const adjustedX = Math.max(1, Math.floor(x));
  const adjustedY = Math.max(1, Math.floor(y));
  const adjustedN = Math.max(1, Math.floor(n));

  // Default fallback configuration
  const defaultConfig = {
    nrows: 1,
    ncols: 1,
    cell_size: Math.min(adjustedX, adjustedY),
    used_width: Math.min(adjustedX, adjustedY),
    used_height: Math.min(adjustedX, adjustedY)
  };

  if (forceEvenGrid) {
    const pairs = getFactorPairs(adjustedN)
      .filter(([rows, cols]) => {
        // Both dimensions must be even
      
        
        // Get max dimension for each pair
        const maxDim = Math.max(rows, cols);
        const minDim = Math.min(rows, cols);
        
        // Set column limits based on row count (or vice versa)
        if (minDim === 2) return maxDim <= 6;
        if (minDim === 4) return maxDim <= 12;
        if (minDim === 6) return maxDim <= 16;
        if (minDim === 8) return maxDim <= 20;
        if (minDim === 10) return maxDim <= 24;
        if (minDim <= 16) return maxDim <= 30;
        
        return maxDim <= 40; // Absolute maximum for any dimension
      });

    if (pairs.length === 0) {
      return defaultConfig; // Return default if no even pairs found
    }

    const validConfigs = pairs
      .map(([rows, cols]) => ({
        nrows: rows,
        ncols: cols,
        cell_size: Math.floor(Math.min(adjustedX / cols, adjustedY / rows))
      }))
      .map(config => ({
        ...config,
        used_width: config.cell_size * config.ncols,
        used_height: config.cell_size * config.nrows
      }))
      .filter(config => 
        config.used_width <= adjustedX && 
        config.used_height <= adjustedY &&
        config.cell_size > 0
      );

    if (validConfigs.length > 0) {
      return validConfigs.sort((a, b) => 
        (b.used_width * b.used_height) - (a.used_width * a.used_height)
      )[0];
    }
  }

  // Original calculation for non-even grids
  const ratio = adjustedX / adjustedY;
  const ncols_float = Math.sqrt(adjustedN * ratio);
  const nrows_float = adjustedN / ncols_float;

  const nrows = Math.floor(nrows_float);
  const ncols = Math.ceil(adjustedN / nrows);
  const cell_size = Math.floor(Math.min(adjustedX / ncols, adjustedY / nrows));

  return {
    nrows,
    ncols,
    cell_size,
    used_width: cell_size * ncols,
    used_height: cell_size * nrows
  };
}
