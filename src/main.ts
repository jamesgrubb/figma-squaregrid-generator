/// <reference types="@figma/plugin-typings" />

import { showUI, on, emit } from '@create-figma-plugin/utilities';
import { 
  GridHandler, 
  FrameSelectionHandler, 
  AutoPopulateHandler, 
  CreateGridHandler, 
  UpdateColorsHandler, 
  CellCountHandler, 
  ExactFitHandler, 
  PerfectFitsHandler, 
  SinglePerfectFitHandler, 
  RandomizeColorsHandler, 
  EvenGridHandler 
} from './types';
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
let lastEmittedColors: { hexColors: string[], opacityPercent: string[] } | null = null;
let forceEvenGrid: boolean = false;
export default function () {
  showUI({
    height: 280,
    width: 240
  });

  type PossibleCellCountsHandler = EventHandler & {
    possibleCellCounts: number[];
    exactFitCounts: number[];
    evenGridCounts: number[];
  };

  const debouncedUpdateColors = debounce((hexColors: string[], opacityPercent: string[]) => {
    console.log('Debounced update colors:', { hexColors, opacityPercent });
    
    // Always update if colors have changed or randomization state has changed
    if (JSON.stringify({ hexColors, opacityPercent }) !== JSON.stringify(lastEmittedColors) || randomizeColors) {
      console.log('Colors or randomization changed, applying to nodes');
      lastEmittedColors = { hexColors, opacityPercent };
      
      // Update the selected colors and opacities
      selectedColors = hexColors;
      selectedOpacities = opacityPercent;
      
      // Apply colors to your Figma nodes here
      if (selectedFrame && autoPopulate) {
        applyColorsToNodes(hexColors, opacityPercent);
      }
      
      // Remove this line to prevent the infinite loop
      // emit<UpdateColorsHandler>('UPDATE_COLORS', { hexColors, opacityPercent });
    } else {
      console.log('No change in colors or randomization, skipping update');
    }
  }, 50);

  const debouncedUpdateGrid = debounce((cellCount: number, padding: number) => {
    updateGrid(cellCount, padding);
  }, 50);

  const initialIsFrameSelected = checkSelectionWithoutSideEffects();
  emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected: initialIsFrameSelected });

  figma.on('selectionchange', () => {
    const isFrameSelected = checkSelectionWithoutSideEffects();
    emit<FrameSelectionHandler>('FRAME_SELECTED', { isFrameSelected });
  });

  on<RandomizeColorsHandler>('RANDOMIZE_COLORS', function({ randomize }) {
    console.log('Randomize colors changed to:', randomize);
    randomizeColors = randomize;
    if (selectedFrame && autoPopulate) {
      console.log('Forcing re-application of colors due to randomize change');
      applyColorsToNodes(selectedColors, selectedOpacities);
      // Remove this line to prevent potential loops
      // emit<UpdateColorsHandler>('UPDATE_COLORS', { hexColors: selectedColors, opacityPercent: selectedOpacities });
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
    figma.ui.resize(240, autoPopulate ? 370 : 280);
  });

  on<CreateGridHandler>('CREATE_GRID', function({ cellCount, padding }) {
    if (checkSelection()) {
      isNewFrameSelected = false;
      updateGrid(cellCount, padding);
      lastCells = cellCount;
      lastPadding = padding;
      isGridCreated = true;
      
      const { possibleCounts, exactFitCounts, evenGridCounts } = getPossibleCellCounts(lastWidth, lastHeight, 300, forceEvenGrid);
      console.log('from main exactFitCounts', exactFitCounts)
      
      emit<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', { possibleCellCounts: possibleCounts, exactFitCounts, evenGridCounts });
    }
  });

  on<ExactFitHandler>('EXACT_FIT', (data) => {
    console.log('Exact fit changed:', data.exactFit);
  });

  on<CellCountHandler>('CELL_COUNT_CHANGE', function({ cellCount }) {
    if (isGridCreated && checkSelection()) {
      const numericCellCount = parseInt(cellCount, 10);
      updateGrid(numericCellCount, lastPadding);
      lastCells = numericCellCount;
    }
  });
  
  function applyColorsToNodes(hexColors: string[], opacityPercent: string[]) {
    if (!selectedFrame) {
      console.log('No selected frame, cannot apply colors');
      return;
    }
  
    const gridFrame = selectedFrame.findChild(n => n.name === 'GridFrame') as FrameNode | null;
    if (!gridFrame) {
      console.log('No GridFrame found, cannot apply colors');
      return;
    }
  
    const cells = gridFrame.findChildren(n => n.type === 'FRAME');
    console.log(`Applying colors to ${cells.length} cells`);
    
    // Create a color order array based on the number of cells
    let colorOrder = Array.from({ length: cells.length }, (_, i) => i % hexColors.length);
    
    if (randomizeColors) {
      console.log('Randomizing colors');
      colorOrder = colorOrder.sort(() => Math.random() - 0.5);
    } else {
      console.log('Not randomizing colors');
    }
  
    console.log('Color order:', colorOrder);
  
    cells.forEach((cell, index) => {
      if ('fills' in cell) {
        const colorIndex = colorOrder[index];
        const opacityValue = parseFloat(opacityPercent[colorIndex]);
        const newColor = hexToRgb(hexColors[colorIndex]);
        cell.fills = [{
          type: 'SOLID',
          color: newColor,
          opacity: isNaN(opacityValue) ? 1 : opacityValue / 100
        }];
        console.log(`Cell ${index}: Applied color ${hexColors[colorIndex]} with opacity ${opacityValue}`);
      }
    });
  }

  on<UpdateColorsHandler>('UPDATE_COLORS', function({ hexColors, opacityPercent }) {
    console.log('UPDATE_COLORS received in main thread:', { hexColors, opacityPercent });
    debouncedUpdateColors(hexColors, opacityPercent);
  });

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
        const { possibleCounts, exactFitCounts } = getPossibleCellCounts(lastWidth, lastHeight, 300, forceEvenGrid);
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
      updateGrid(lastCells, lastPadding);
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

  const grid = fitSquaresInRectangle(availableWidth, availableHeight, cells, forceEvenGrid);
  if (!grid) {
    console.log('No valid grid configuration found');
    return;
  }
  
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
    let colorOrder = Array.from({ length: selectedColors.length }, (_, i) => i);
    if (randomizeColors) {
      colorOrder = colorOrder.sort(() => Math.random() - 0.5);
    }
    console.log('colorOrder', colorOrder);
  
    const applyColor = (cell: SceneNode, index: number) => {
      if ('fills' in cell) {
        const colorIndex = colorOrder[index % selectedColors.length];
        const opacityValue = parseFloat(selectedOpacities[colorIndex]);
        cell.fills = [{
          type: 'SOLID',
          color: hexToRgb(selectedColors[colorIndex]),
          opacity: isNaN(opacityValue) ? 1 : opacityValue / 100
        }];
      }
    };
  
    if (existingCells.length === 0) {
      for (let i = 0; i < nrows; i++) {
        for (let j = 0; j < ncols; j++) {
          const cell = figma.createFrame();
          cell.resize(cell_size, cell_size);
          cell.x = j * cell_size;
          cell.y = i * cell_size;
          applyColor(cell, i * ncols + j);
          gridFrame.appendChild(cell);          
        }
      }
    } else {
      existingCells.forEach((cell, index) => applyColor(cell, index));
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
        const hasEvenDimensions = rows % 2 === 0 && cols % 2 === 0;
        
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
