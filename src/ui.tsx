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
  const [evenFitsOnly, setEvenFitsOnly] = useState<boolean>(false);
  const [originalExactFits, setOriginalExactFits] = useState<number[]>([]);
  const [evenRowsColumns, setEvenRowsColumns] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  
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
    
    const validSteps = evenFitsOnly 
      ? steps.filter(step => step % 2 === 0)
      : steps;
    
    return validSteps.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
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
    console.log('evenFitsOnly changed to:', evenFitsOnly);
    console.log('current steps:', steps);
    
    const filteredSteps = evenFitsOnly 
      ? steps.filter(step => step % 2 === 0)
      : steps;
    
    if (filteredSteps.length > 0) {
      const nearestStep = findClosestStep(cellCount);
      if (nearestStep !== cellCount) {
        setCellCount(nearestStep);
      }
    }
    
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: cellCount.toString() });
  }, [evenFitsOnly]);

  useEffect(() => {
    const cellCountHandler = (event: { possibleCellCounts: number[], exactFitCounts: number[] } | undefined) => {
      if (event?.possibleCellCounts && Array.isArray(event.possibleCellCounts)) {
        console.log('Received possible cell counts:', event.possibleCellCounts);
        
        // Store original exact fits
        if (event.exactFitCounts) {
          setOriginalExactFits(event.exactFitCounts);
        }
        
        // Filter steps based on evenFitsOnly
        const filteredSteps = evenFitsOnly 
          ? event.possibleCellCounts.filter(count => count % 2 === 0)
          : event.possibleCellCounts;
        
        setSteps(filteredSteps);
        
        // Filter exact fits
        const filteredExactCounts = evenFitsOnly 
          ? event.exactFitCounts.filter(count => count % 2 === 0)
          : event.exactFitCounts;

        if (filteredExactCounts?.length > 0) {
          setExactFit(true);
          setDropdownOptions(filteredExactCounts.map(count => ({ value: count.toString() })));
          setDropdownValue(filteredExactCounts[0]?.toString() || null);
          setExactFitCount(filteredExactCounts.length === 1 ? filteredExactCounts[0] : null);
        }
        
        // Adjust current cell count if needed
        if (cellCount === 0 && filteredSteps.length > 0) {
          setCellCount(filteredSteps[0]);
        } else if (filteredSteps.length > 0) {
          const nearestCellCount = findClosestStep(cellCount);
          if (nearestCellCount !== cellCount) {
            setCellCount(nearestCellCount);
          }
        }
      }
    };

    on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', cellCountHandler);
  }, [cellCount, evenFitsOnly]);

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
  
    if (newValue) {
      // Switching to dropdown (exact fit)
      let newCellCount: number;
      if (dropdownOptions.length > 0 && dropdownOptions[0].value !== 'No exact fits') {
        // Find the nearest exact fit value to the current cellCount
        const nearestOption = dropdownOptions.reduce((prev, curr) => {
          const prevValue = parseInt(prev.value, 10);
          const currValue = parseInt(curr.value, 10);
          return Math.abs(currValue - cellCount) < Math.abs(prevValue - cellCount) ? curr : prev;
        });
        newCellCount = parseInt(nearestOption.value, 10);
      } else {
        // If no exact fits, keep the current cellCount
        newCellCount = cellCount;
      }
      setCellCount(newCellCount);
      setDropdownValue(newCellCount.toString());
      emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: newCellCount.toString() });
    } else {
      // Switching to range slider
      const nearestValue = findClosestStep(cellCount);
      setCellCount(nearestValue);
      emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
    }
  
    setShowDropdown(newValue);
    emit<ExactFitHandler>('EXACT_FIT', { exactFit: newValue });
  }

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
    // Re-emit the cell count to trigger recalculation with new evenFitsOnly value
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: cellCount.toString() });
  }, [evenFitsOnly]);

  function handleEvenFitsChange(event: h.JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.checked;
    setEvenFitsOnly(newValue);
    // This will trigger the effect above
  }

  // Add this effect to handle the interaction between evenFitsOnly and exactFit
  useEffect(() => {
    if (isExactFitEnabled) {
      const exactFits = evenFitsOnly 
        ? originalExactFits.filter(count => count % 2 === 0)
        : originalExactFits;
      
      setDropdownOptions(exactFits.map(count => ({ value: count.toString() })));
      
      // Update to nearest valid value
      if (exactFits.length > 0) {
        const currentValue = parseInt(dropdownValue || '0');
        const nearestValue = exactFits.reduce((prev, curr) => 
          Math.abs(curr - currentValue) < Math.abs(prev - currentValue) ? curr : prev
        );
        setDropdownValue(nearestValue.toString());
        setCellCount(nearestValue);
      }
    }
  }, [evenFitsOnly, isExactFitEnabled]);

  useEffect(() => {
    // Update UI when evenRowsColumns changes
    emit('EVEN_GRID', { evenGrid: evenRowsColumns });
    
    // Force recalculation of grid and update UI
    if (cellCount > 0) {
      emit('CREATE_GRID', { cellCount, padding });
    }
  }, [evenRowsColumns]);

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
          console.log('Toggle clicked, new value:', e.currentTarget.checked);
          setEvenFitsOnly(e.currentTarget.checked);
        }} value={evenFitsOnly}>
          <Text>Even fits only</Text>
        </Toggle>
        
        <Toggle 
          onChange={(e) => {
            const newValue = e.currentTarget.checked;
            setIsLoading(true);
            setEvenRowsColumns(newValue);
            
            // Use requestAnimationFrame to prevent UI blocking
            requestAnimationFrame(() => {
              if (cellCount > 0) {
                emit('CREATE_GRID', { cellCount, padding });
              }
              setIsLoading(false);
            });
          }} 
          value={evenRowsColumns}
          disabled={isLoading}
        >
          <Text>{isLoading ? 'Calculating...' : 'Even rows and columns'}</Text>
        </Toggle>

        {exactFit && !evenRowsColumns && 
          <Toggle onChange={handleExactFitChange} value={isExactFitEnabled}>
            <Text>{exactFitCount !== null ? `Show 1 perfect fit` : 'Show perfect fits'}</Text>
          </Toggle>
        }
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
          maximum={Math.max(...steps, 300)} // Use the maximum of the largest step or 300
          minimum={Math.min(...steps, 1)} // Use the minimum of the smallest step or 1
          onValueInput={handleCellCountChange}
          value={cellCount.toString()}
          disabled={isGridCreated} // Disable based on state
        />}
      {!isExactFitEnabled && <VerticalSpace space="small" />}
      <div>
      {!isExactFitEnabled && <RangeSlider
       maximum={Math.max(...steps, 300)} // Use the maximum of the largest step or 300
       minimum={Math.min(...steps, 1)} // Use the minimum of the smallest step or 1
        value={cellCount.toString()}
        onValueInput={(value) => {
          const numericValue = parseInt(value, 10);
          const closestStep = findClosestStep(numericValue);
          setCellCount(closestStep);
          emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: closestStep.toString() });
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