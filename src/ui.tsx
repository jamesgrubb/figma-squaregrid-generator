import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import '!./output.css';
import debounce from 'lodash/debounce';
import { 
  IconTidyGrid32,
  Toggle,
  Button,
  Container,
  RangeSlider,
  Text,
  VerticalSpace,
  render,
  Banner,
  IconWarning32,
  TextboxNumeric,
  Muted,
  Columns // We'll create this component
} from '@create-figma-plugin/ui'
import { ColorPicker } from './components/ColorPicker'
import { CellCountPicker } from './components/CellCountPicker'
import { emit, on } from '@create-figma-plugin/utilities'
import { FrameSelectionHandler, AutoPopulateHandler, PossibleCellCountsHandler, UpdateColorsHandler, CellCountHandler, ExactFitHandler } from './types'

// Add interface for grid options
interface GridOptions {
  target: {
    cellCount: number;
    padding: number;
  };
  option1: Record<string, any>;
  option2: Record<string, any>;
}

function Plugin() {
  const [cellCount, setCellCount] = useState<number>(0)
  const [padding, setPadding] = useState<number>(0)
  const [steps, setSteps] = useState<number[]>([])
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [autoPopulate, setAutoPopulate] = useState<boolean>(false);
  const [isGridCreated, setIsGridCreated] = useState(true);
  const defaultColors = ['2a5256','cac578','c69a94','57b59c','b1371b'];
  const [hexColors, setHexColors] = useState<string[]>(() => defaultColors.slice(0, 5));
  const [opacityPercent, setOpacityPercent] = useState<string[]>(() => Array(5).fill('100%'));
  const [dropdownValue, setDropdownValue] = useState<null | string>(null);
  const [dropdownOptions, setDropdownOptions] = useState<Array<{ value: string }>>([{ value: '0' },]);
  const [exactFit, setExactFit] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [exactFitCount, setExactFitCount] = useState<number | null>(null);
  const [isExactFitEnabled, setIsExactFitEnabled] = useState(false);
  const [randomizeColors, setRandomizeColors] = useState(false)
  const [originalExactFits, setOriginalExactFits] = useState<number[]>([]);
  const [evenRowsColumns, setEvenRowsColumns] = useState<boolean>(false);
  
  const numColorPickers = Math.min(cellCount, 5);

  const updateColors = (newHexColors: string[], newOpacityPercent: string[]) => {
    console.log('updateColors called with:', { newHexColors, newOpacityPercent });
    emit<UpdateColorsHandler>('UPDATE_COLORS', { hexColors: newHexColors, opacityPercent: newOpacityPercent });
  };


  useEffect(() => {
    emit('UPDATE_GRID', { cellCount, padding })
   
    console.log('Emitting UPDATE_GRID and UPDATE_COLORS');
  }, [cellCount, padding, hexColors, opacityPercent])

  useEffect(() => {
    console.log('Color effect running. hexColors:', hexColors, 'opacityPercent:', opacityPercent);
    if (hexColors.length > 0 && opacityPercent.length > 0) {
      updateColors(hexColors, opacityPercent);
    }
  }, [hexColors, opacityPercent]);

  const handleCellCountChange = (value: string) => {
    const numberValue = parseInt(value, 10);
    const nearestValue = findClosestStep(numberValue);
    setCellCount(nearestValue);
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
  }

  const handlePaddingChange = (value: string) => {
    setPadding(parseInt(value, 10))
  }
  const findClosestStep = (value: number): number => {
    if (steps.length === 0) return value;
    
    const validSteps = evenRowsColumns 
      ? steps.filter(step => step % 2 === 0)
      : steps;
    
    console.log('Finding closest step:', {
      value,
      validSteps,
      evenRowsColumns,
      currentCellCount: cellCount
    });
    
    const nearestStep = validSteps.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    
    console.log('Found nearest step:', nearestStep);
    return nearestStep;
  };
  
  console.log(isEnabled)

  useEffect(() => {
    emit('RANDOMIZE_COLORS', { randomize: randomizeColors })
  }, [randomizeColors])

  useEffect(() => {   
    on<FrameSelectionHandler>('FRAME_SELECTED', (event) => {
       console.log('Frame selected event received:', event);
      setIsEnabled(event.isFrameSelected);     
    });
  }, [isEnabled]);

  useEffect(() => {
    // Update hexColors and opacityPercent when cellCount changes
    setHexColors(prevColors => {
      const newColors = [...prevColors];
      while (newColors.length < numColorPickers) {
        newColors.push(defaultColors[newColors.length % defaultColors.length]);
      }
      return newColors.slice(0, numColorPickers);
    });

    setOpacityPercent(prevOpacities => {
      const newOpacities = [...prevOpacities];
      while (newOpacities.length < numColorPickers) {
        newOpacities.push('100%');
      }
      return newOpacities.slice(0, numColorPickers);
    });
  }, [cellCount, numColorPickers]);

  useEffect(() => {
    // Emit color updates whenever hexColors or opacityPercent change
    emit('UPDATE_COLORS', { hexColors, opacityPercent });
  }, [hexColors, opacityPercent]);

  useEffect(() => {
    const cellCountHandler = (event: { possibleCellCounts: number[], exactFitCounts: number[] } | undefined) => {
      if (event?.possibleCellCounts && Array.isArray(event.possibleCellCounts)) {
        console.log('Received possible cell counts:', event.possibleCellCounts);
        
        if (event.exactFitCounts) {
          setOriginalExactFits(event.exactFitCounts);
        }
        
        setSteps(event.possibleCellCounts);
        
        const filteredExactCounts = evenRowsColumns 
          ? event.exactFitCounts.filter(count => count % 2 === 0)
          : event.exactFitCounts;

        if (filteredExactCounts?.length > 0) {
          setExactFit(true);
          setDropdownOptions(filteredExactCounts.map(count => ({ value: count.toString() })));
          setDropdownValue(filteredExactCounts[0]?.toString() || null);
          setExactFitCount(filteredExactCounts.length === 1 ? filteredExactCounts[0] : null);
        }
        
        if (cellCount === 0 && event.possibleCellCounts.length > 0) {
          setCellCount(event.possibleCellCounts[0]);
        } else if (event.possibleCellCounts.length > 0) {
          const nearestCellCount = findClosestStep(cellCount);
          if (nearestCellCount !== cellCount) {
            setCellCount(nearestCellCount);
          }
        }
      }
    };

    on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', cellCountHandler);
  }, [cellCount]);

  useEffect(() => {
    on<UpdateColorsHandler>('UPDATE_COLORS', function({ hexColors, opacityPercent }) {
      // Only update the state if the colors have actually changed
      if (JSON.stringify(hexColors) !== JSON.stringify(hexColors) ||
          JSON.stringify(opacityPercent) !== JSON.stringify(opacityPercent)) {
        setHexColors(hexColors);
        setOpacityPercent(opacityPercent);
      }
    });
    
    return () => {
      // Clean up the event listener
      // You might need to use a method provided by your event system to remove listeners
      // For example: off('UPDATE_COLORS', colorUpdateHandler);
    };
  }, []);

  console.log('dropdown values',dropdownValue)
  const debouncedUpdateColors = debounce((newHexColors: string[], newOpacityPercent: string[]) => {
    console.log('Debounced UPDATE_COLORS called with:', { newHexColors, newOpacityPercent });
    emit('UPDATE_COLORS', { hexColors: newHexColors, opacityPercent: newOpacityPercent });
  }, 300);


  const handleDropdownCellCountChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    const newValue = target?.value;
    console.log('newValue', newValue)
    setDropdownValue(newValue);
    setCellCount(parseInt(newValue));
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: newValue });
  };

  const handleAutoPopulateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const newValue = target?.checked;
    console.log(newValue)
    setAutoPopulate(newValue);
    emit<AutoPopulateHandler>('AUTO_POPULATE', { autoPopulate: newValue });
  };

  function handleHexColorInput(index: number, event: h.JSX.TargetedEvent<HTMLInputElement>) {
    const newColor = event.currentTarget.value;
    setHexColors(prevColors => {
      const newColors = [...prevColors];
      newColors[index] = newColor;
      console.log('New hexColors after input:', newColors);
      return newColors;
    });
  }

  function handleOpacityInput(index: number, event: h.JSX.TargetedEvent<HTMLInputElement>) {
    const newOpacity = event.currentTarget.value;
    setOpacityPercent(prevOpacities => {
      const newOpacities = [...prevOpacities];
      newOpacities[index] = newOpacity;
      console.log('New opacityPercent after input:', newOpacities);
      return newOpacities;
    });
  }

  // ... rest of your component code

  
  const handleExactFitChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    const newValue = target?.checked;
    
    setIsExactFitEnabled(newValue);
    setShowDropdown(newValue);

    if (newValue) {
      // When enabling exact fit mode, find nearest valid perfect fit
      if (dropdownOptions.length > 0) {
        const validOptions = evenRowsColumns 
          ? dropdownOptions.filter(opt => parseInt(opt.value) % 2 === 0)
          : dropdownOptions;
          
        if (validOptions.length > 0) {
          // Find nearest perfect fit to current cell count
          const nearestOption = validOptions.reduce((prev, curr) => {
            const prevValue = parseInt(prev.value);
            const currValue = parseInt(curr.value);
            return Math.abs(currValue - cellCount) < Math.abs(prevValue - cellCount) ? curr : prev;
          });
          
          const newCellCount = parseInt(nearestOption.value);
          setCellCount(newCellCount);
          setDropdownValue(nearestOption.value);
          emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: newCellCount.toString() });
        }
      }
    } else {
      // When turning off exact fit mode, reset to first available step
      if (steps.length > 0) {
        const firstStep = steps[0];
        setCellCount(firstStep);
        setDropdownValue(null);
        emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: firstStep.toString() });
      }
    }

    emit<ExactFitHandler>('EXACT_FIT', { exactFit: newValue });
  };

  function handleCreateGrid() {
    emit('CREATE_GRID', { cellCount, padding })
    setIsGridCreated(false);
  }
  const currentStepIndex = steps.indexOf(cellCount);
  console.log('currentStepIndex', currentStepIndex)



  const minStep = steps.length > 0 ? Math.min(...steps) : 0; // Fallback to 0 if no steps
  const maxStep = steps.length > 0 ? Math.max(...steps) : 300; // Fallback to 300 if no steps

  useEffect(() => {
    console.log('Color effect running. hexColors:', hexColors, 'opacityPercent:', opacityPercent);
    debouncedUpdateColors(hexColors, opacityPercent);
  }, [hexColors, opacityPercent]);

  useEffect(() => {
    emit('EVEN_GRID', { evenGrid: evenRowsColumns });
    
    if (evenRowsColumns) {
      // When enabling even rows/columns
      const validExactFits = originalExactFits.filter(count => count % 2 === 0);
      const evenSteps = steps.filter(step => step % 2 === 0);
      
      // Hide perfect fits toggle if no valid fits exist
      if (validExactFits.length === 0) {
        setExactFit(false);
        setIsExactFitEnabled(false);
        setShowDropdown(false);
      }
      
      // Update cell count to nearest valid even step
      if (evenSteps.length > 0) {
        const nearestEvenStep = findClosestStep(cellCount);
        setCellCount(nearestEvenStep);
        emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestEvenStep.toString() });
      }
      
      // Update dropdown options if perfect fits are enabled
      if (isExactFitEnabled && validExactFits.length > 0) {
        setDropdownOptions(validExactFits.map(count => ({ value: count.toString() })));
        setDropdownValue(validExactFits[0].toString());
      }
    } else {
      // When disabling even rows/columns
      if (originalExactFits.length > 0) {
        setExactFit(true);
        if (isExactFitEnabled) {
          setDropdownOptions(originalExactFits.map(count => ({ value: count.toString() })));
          setDropdownValue(originalExactFits[0].toString());
        }
      }
      
      // Update to nearest valid step from all steps
      const nearestStep = findClosestStep(cellCount);
      setCellCount(nearestStep);
      emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestStep.toString() });
    }
  }, [evenRowsColumns]);

  // Create a debounced cell count update
  const debouncedCellCountUpdate = debounce((newCount: number) => {
    setCellCount(newCount);
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: newCount.toString() });
  }, 50);

  // Add validation for grid dimensions
  const validateGridDimensions = (count: number, isEven: boolean) => {
    const validCount = Math.max(2, count);
    const finalCount = isEven && validCount % 2 !== 0 ? validCount + 1 : validCount;
    
    console.log('Validated grid dimensions:', {
      inputCount: count,
      isEven,
      finalCount
    });
    
    return finalCount;
  };

  // Add debug logging
  const updateGridState = (newCellCount: number, newEvenRowsColumns?: boolean) => {
    // Use new evenRowsColumns value if provided, otherwise use current state
    const useEvenRows = newEvenRowsColumns !== undefined ? newEvenRowsColumns : evenRowsColumns;
    
    // Validate dimensions
    const finalCount = Math.max(2, newCellCount);
    const validCount = useEvenRows && finalCount % 2 !== 0 ? finalCount + 1 : finalCount;
    const validPadding = Math.max(0, Math.min(100, padding));

    // Create grid options
    const gridOptions = {
      target: {
        cellCount: validCount,
        padding: validPadding
      },
      option1: {},
      option2: {}
    };

    // Debug log the exact structure
    console.log('Grid update - full details:', {
      gridOptions: JSON.stringify(gridOptions),
      validCount,
      validPadding,
      useEvenRows,
      currentState: {
        cellCount,
        padding,
        evenRowsColumns
      }
    });

    // Update state
    if (newEvenRowsColumns !== undefined) {
      setEvenRowsColumns(newEvenRowsColumns);
    }
    setCellCount(validCount);

    // Emit updates with debug
    console.log('Emitting CELL_COUNT_CHANGE:', { cellCount: validCount.toString() });
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { 
      cellCount: validCount.toString() 
    });

    console.log('Emitting UPDATE_GRID:', gridOptions);
    emit('UPDATE_GRID', gridOptions);
  };

  // Add effect to validate grid dimensions
  useEffect(() => {
    if (cellCount <= 0) {
      console.warn('Invalid cell count:', cellCount);
      return;
    }

    const validCount = validateGridDimensions(cellCount, evenRowsColumns);
    const gridOptions = {
      cellCount: validCount,
      padding: Math.max(0, Math.min(100, padding))
    };

    console.log('Grid effect update with:', gridOptions);
    emit('UPDATE_GRID', gridOptions);
  }, [cellCount, padding, evenRowsColumns]);

  // Add a single source of truth for grid updates
  const updateGrid = (newCellCount: number, newEvenRowsColumns?: boolean) => {
    // Use new evenRowsColumns value if provided, otherwise use current state
    const useEvenRows = newEvenRowsColumns !== undefined ? newEvenRowsColumns : evenRowsColumns;
    
    // Validate dimensions
    const finalCount = Math.max(2, newCellCount);
    const validCount = useEvenRows && finalCount % 2 !== 0 ? finalCount + 1 : finalCount;
    const validPadding = Math.max(0, Math.min(100, padding));

    // Create grid options
    const gridOptions = {
      target: {
        cellCount: validCount,
        padding: validPadding
      },
      option1: {},
      option2: {}
    };

    // Debug log the exact structure
    console.log('Grid update - full details:', {
      gridOptions,
      validCount,
      validPadding,
      useEvenRows,
      currentState: {
        cellCount,
        padding,
        evenRowsColumns
      }
    });

    // Update state in sequence
    if (newEvenRowsColumns !== undefined) {
      setEvenRowsColumns(newEvenRowsColumns);
    }
    setCellCount(validCount);

    // Emit updates
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { 
      cellCount: validCount.toString() 
    });
    
    // Only emit grid update once
    emit('UPDATE_GRID', gridOptions);
  };

  return (
    <div className="relative h-full text-balance">
    {!isGridCreated && <Container space="medium">
      
      <VerticalSpace space="large" />

      <Columns className="flex items-center justify-between">
        <div>
          <Text>Grid Cells</Text>
        </div>
      </Columns>
      <VerticalSpace space="medium" />
      <div className="flex flex-col gap-2">
       
        
        <Toggle onChange={(e) => {
          const newEvenRowsColumns = e.currentTarget.checked;
          console.log('Even grid toggle clicked:', newEvenRowsColumns);
          
          // Get valid steps based on the new setting
          const validSteps = newEvenRowsColumns 
            ? steps.filter(step => step % 2 === 0)
            : steps;
            
          console.log('Valid steps:', {
            validSteps,
            currentCellCount: cellCount,
            newEvenRowsColumns
          });
            
          if (validSteps.length > 0) {
            const nearestStep = validSteps.reduce((prev, curr) => 
              Math.abs(curr - cellCount) < Math.abs(prev - cellCount) ? curr : prev
            );
            
            console.log('Selected nearest step:', nearestStep);
            updateGrid(nearestStep, newEvenRowsColumns);
          }
        }} value={evenRowsColumns}>
          <Text>Even rows and columns</Text>
        </Toggle>

        {exactFit && (!evenRowsColumns || (evenRowsColumns && originalExactFits.some(count => count % 2 === 0))) && (
          <Toggle onChange={handleExactFitChange} value={isExactFitEnabled}>
            <Text>{exactFitCount !== null ? `Show 1 perfect fit` : 'Show perfect fits'}</Text>
          </Toggle>
        )}
      </div>
      {showDropdown && <VerticalSpace space="small" />}
      {showDropdown &&<CellCountPicker 
        cellCountOptions={dropdownOptions} 
        dropdownCellCountChange={handleDropdownCellCountChange}  
        dropdownValue={dropdownValue} />}
        <VerticalSpace space="small" />
      {!isExactFitEnabled && <TextboxNumeric
          icon={<IconTidyGrid32 />}     
          variant='border'
          maximum={Math.max(...steps, 300)}
          minimum={Math.min(...steps, 1)}
          onValueInput={(value) => {
            const numericValue = parseInt(value, 10);
            const nearestStep = findClosestStep(numericValue);
            debouncedCellCountUpdate(nearestStep);
          }}
          value={cellCount.toString()}
          disabled={isGridCreated}
        />}
      {!isExactFitEnabled && <VerticalSpace space="small" />}
      <div>
      {!isExactFitEnabled && <RangeSlider
       maximum={Math.max(...steps, 300)}
       minimum={2}
       value={cellCount.toString()}
       onValueInput={(value) => {
         const numericValue = Math.max(2, parseInt(value, 10));
         const nearestStep = findClosestStep(numericValue);
         updateGrid(nearestStep);
       }}
       disabled={isGridCreated}
      />}
      </div>
      
      <VerticalSpace space="medium" />
      <Text>Padding</Text>
      <VerticalSpace space="small" />
      <TextboxNumeric 
        variant='border'
        maximum={100}
        minimum={0}
        suffix="%"
        onValueInput={handlePaddingChange}
        value={padding.toString()} 
        disabled={isGridCreated} // Disable based on state
        />      
      <VerticalSpace space="small" />
      <RangeSlider
        maximum={100}
        minimum={0}
        onValueInput={handlePaddingChange}
        value={padding.toString()}
        disabled={isGridCreated} // Disable based on state
      />
      <VerticalSpace space="large" />
      <Columns space="small">
  <Toggle onChange={handleAutoPopulateChange} value={autoPopulate}>
    <Text>Fill</Text>
  </Toggle>
  {autoPopulate && cellCount > 5 && (
    <Toggle value={randomizeColors} onValueChange={setRandomizeColors}>
      <Text>Random Pattern</Text>
    </Toggle>
  )}
</Columns>
      <VerticalSpace space="small" />
      {autoPopulate && <div className="flex flex-col justify-between">
  {[...Array(numColorPickers)].map((_, index) => (
    <ColorPicker
      key={index}
      color={hexColors[index] || defaultColors[index % defaultColors.length]}
      opacity={opacityPercent[index] || '100%'}
      handleHexColorInput={(event) => handleHexColorInput(index, event)}
      handleOpacityInput={(event) => handleOpacityInput(index, event)}
    />
  ))}
</div>}
      
    </Container>}
     
      
    {isGridCreated && (
        <Container className="absolute inset-0 flex flex-col justify-between p-4" space="medium">    
          <div>
            <Text className="h-min">
              <Muted>This tool lets you create a customizable grid by setting the number of cells and padding. Adjust the values using the sliders or type directly, with inputs snapping to valid options. Start by selecting or creating a frame, then click "Create Grid" to unlock the settings. You can also enable the auto-fill option for easier grid population.</Muted>
            </Text>
          </div>
          
          {isEnabled ? (
            <Button 
              className="mt-4" 
              fullWidth 
              onClick={handleCreateGrid}
            >
              Create Grid
            </Button>
          ) : (
            <div className="z-10 rounded-md overflow-clip">
              <Banner icon={<IconWarning32 />} variant="warning">      
                Please select or create a frame to begin
              </Banner>
            </div>
          )}
        </Container>
      )}
    </div>
    
  )
}


export default render(Plugin)