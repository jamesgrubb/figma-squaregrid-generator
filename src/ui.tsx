import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import '!./output.css';
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
  IconInfo32,  
  TextboxNumeric,
  Muted,
  Bold,
} from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import { FrameSelectionHandler, PossibleCellCountsHandler, CellCountHandler, ExactFitHandler } from './types'
import { CellCountPicker } from './components/CellCountPicker';

function Plugin() {
  const [cellCount, setCellCount] = useState<number | null>(null);
  const [steps, setSteps] = useState<number[]>([])
  const [isEnabled, setIsEnabled] = useState<boolean>(false);  
  const [isGridCreated, setIsGridCreated] = useState(false);  
  const [dropdownValue, setDropdownValue] = useState<null | string>(null);
  const [dropdownOptions, setDropdownOptions] = useState<Array<{ value: string }>>([{ value: '0' },]);
  const [isExactFitEnabled, setIsExactFitEnabled] = useState(false);
  const [originalExactFits, setOriginalExactFits] = useState<number[]>([]);
  const [evenRowsColumns, setEvenRowsColumns] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [perfectFitNumber, setPerfectFitNumber] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);



  const handleCellCountChange = (value: string) => {
    const numberValue = parseInt(value, 10);
    const nearestValue = findClosestStep(numberValue);
    setCellCount(nearestValue);
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
  }

  
  const findClosestStep = (value: number): number => {
    if (steps.length === 0) return value;
    
    return steps.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
  };
  

  useEffect(() => {
    on<FrameSelectionHandler>('FRAME_SELECTED', (event) => {
       setIsEnabled(event.isFrameSelected);     
    });
  }, [isEnabled]);

  

  useEffect(() => {
    const cellCountHandler = (event: { 
      possibleCellCounts: number[], 
      exactFitCounts: number[],
      evenGridCounts: number[] 
    } | undefined) => {
      console.log('Received cell count event:', event);
      
      if (event?.possibleCellCounts && Array.isArray(event.possibleCellCounts)) {
        setSteps(event.possibleCellCounts);
        
        // Handle exact fits first
        if (event.exactFitCounts && Array.isArray(event.exactFitCounts)) {
          console.log('Setting exact fits:', event.exactFitCounts);
          setOriginalExactFits(prev => {
            console.log('Previous exact fits:', prev);
            console.log('New exact fits:', event.exactFitCounts);
            return event.exactFitCounts;
          });
          
          // If there's exactly one perfect fit
          if (event.exactFitCounts.length === 1) {
            setPerfectFitNumber(event.exactFitCounts[0]);
          } else {
            setPerfectFitNumber(null);
          }
        }
        
        // Set initial cell count if needed
        if (cellCount === null || !event.possibleCellCounts.includes(cellCount)) {
          const initialCount = event.possibleCellCounts[0];
          setCellCount(initialCount);
          emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: initialCount.toString() });
        }
      }
    };

    on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', cellCountHandler);
  }, []);

  // Add effect to monitor originalExactFits changes
  useEffect(() => {
    console.log('originalExactFits updated:', originalExactFits);
  }, [originalExactFits]);

  const handleDropdownCellCountChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    const newValue = target?.value;
    setDropdownValue(newValue);
    setCellCount(parseInt(newValue));
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: newValue });
  };


  // ... rest of your component code

  
  const handleExactFitChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    const newValue = target?.checked;
    setIsExactFitEnabled(newValue);
  
    if (newValue) {
      // Switching to dropdown (exact fit)
      if (originalExactFits.length > 0) {
        const nearestExactFit = originalExactFits.reduce((prev, curr) => 
          Math.abs(curr - (cellCount ?? 0)) < Math.abs(prev - (cellCount ?? 0)) ? curr : prev
        );
        setCellCount(nearestExactFit);
        setDropdownValue(nearestExactFit.toString());
        emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestExactFit.toString() });
      }
    } else {
      // Switching to range slider
      const nearestValue = findClosestStep(cellCount ?? 0);
      setCellCount(nearestValue);
      emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
    }
  
    
    emit<ExactFitHandler>('EXACT_FIT', { exactFit: newValue });
  }

  function handleCreateGrid() {
    emit('CREATE_GRID', { cellCount });
    setIsGridCreated(true);
    
    // Reset exact fit state when creating new grid
    setIsExactFitEnabled(false);
    setOriginalExactFits([]);
    setPerfectFitNumber(null);
  }




  // Add this effect to handle the interaction between evenRowsColumns and exactFit
  useEffect(() => {
    if (isExactFitEnabled) {
      const exactFits = evenRowsColumns 
        ? originalExactFits.filter(num => {
            const sqrt = Math.sqrt(num);
            return Number.isInteger(sqrt) && sqrt % 2 === 0;
          })
        : originalExactFits;
      
      setDropdownOptions(exactFits.map(count => ({ value: count.toString() })));
      
      // If no exact fits are available, disable exact fit mode
      if (exactFits.length === 0) {
        setIsExactFitEnabled(false);
        emit<ExactFitHandler>('EXACT_FIT', { exactFit: false });
        
        // Switch to nearest non-exact value
        const nearestValue = findClosestStep(cellCount ?? 0);
        setCellCount(nearestValue);
        emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
      } else {
        // Update to nearest valid value
        const currentValue = parseInt(dropdownValue || '0');
        const nearestValue = exactFits.reduce((prev, curr) => 
          Math.abs(curr - currentValue) < Math.abs(prev - currentValue) ? curr : prev
        );
        setDropdownValue(nearestValue.toString());
        setCellCount(nearestValue);
        emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
      }
    }
  }, [evenRowsColumns, isExactFitEnabled, originalExactFits]);

  useEffect(() => {
    // Update UI when evenRowsColumns changes
    emit('EVEN_GRID', { evenGrid: evenRowsColumns });
    
    // Force recalculation of grid and update UI
    if (cellCount && cellCount > 0) {
      emit('CREATE_GRID', { cellCount});
    }
  }, [evenRowsColumns]);

  const handleEvenRowsColumnsChange = (e: h.JSX.TargetedEvent<HTMLInputElement>) => {
    try {
      const newValue = e.currentTarget.checked;
      setEvenRowsColumns(newValue);
      setIsLoading(true);
      
      // Get valid counts for even rows/columns
      const validCounts = steps.filter(step => {
        const sqrt = Math.sqrt(step);
        // Check if it's a perfect square AND the square root is even
        return Number.isInteger(sqrt) && (sqrt % 2 === 0);
      });

      if (newValue && cellCount !== null) {
        // Check if there are valid exact fits with even rows/columns
        const validExactFits = originalExactFits.filter(num => {
          const sqrt = Math.sqrt(num);
          return Number.isInteger(sqrt) && sqrt % 2 === 0;
        });

        // Only disable exact fit if there are no valid exact fits
        if (isExactFitEnabled && validExactFits.length === 0) {
          setIsExactFitEnabled(false);
        }

        // If current count isn't valid, update to nearest valid count
        if (!validCounts.includes(cellCount)) {            
          const nearestCount = validCounts.reduce((prev, curr) => 
            Math.abs(curr - cellCount) < Math.abs(prev - cellCount) ? curr : prev,
            validCounts[0]
          );
          
          setCellCount(nearestCount);
          emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestCount.toString() });
        }
      }

      emit('CREATE_GRID', { cellCount });
    } catch (error) {
      console.error('Error in handleEvenRowsColumnsChange:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add an effect to handle state updates when steps change
  useEffect(() => {
    if (evenRowsColumns) {
      const validCounts = steps.filter(step => {
        const sqrt = Math.sqrt(step);
        return Number.isInteger(sqrt) && sqrt % 2 === 0;
      });

      // Update cell count if needed
          if (!validCounts.includes(cellCount ?? 0)) {
        const nearestCount = validCounts.reduce((prev, curr) => 
          Math.abs(curr - (cellCount ?? 0)) < Math.abs(prev - (cellCount ?? 0)) ? curr : prev
        );
        setCellCount(nearestCount);
        emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestCount.toString() });
      }

      // Update perfect fit state
      if (perfectFitNumber && !validCounts.includes(perfectFitNumber)) {
        setPerfectFitNumber(null);
        setIsExactFitEnabled(false);
      }
    }
  }, [steps, evenRowsColumns]);

  // Add this effect to handle resize updates
  useEffect(() => {
    const handleResize = (event: { 
      possibleCellCounts: number[], 
      exactFitCounts: number[],
      evenGridCounts: number[] 
    }) => {
      console.log('Handling resize update:', event);
      
      setIsResizing(true);
      
      // Update the arrays
      setSteps(event.possibleCellCounts);
      setOriginalExactFits(event.exactFitCounts);
      
      // If exact fit is enabled but no exact fits available, disable it
      if (isExactFitEnabled && event.exactFitCounts.length === 0) {
        setIsExactFitEnabled(false);
        emit<ExactFitHandler>('EXACT_FIT', { exactFit: false });
        
        // Switch to nearest non-exact value
        const nearestValue = findClosestStep(cellCount ?? 0);
        setCellCount(nearestValue);
        emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
      }
      
      // Update perfect fit number if applicable
      if (event.exactFitCounts.length === 1) {
        setPerfectFitNumber(event.exactFitCounts[0]);
      } else {
        setPerfectFitNumber(null);
      }
      
      setIsResizing(false);
    };

    on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', handleResize);
  }, [isExactFitEnabled, cellCount]); // Add dependencies

  // Update shouldShowExactFitToggle
  const shouldShowExactFitToggle = () => {
    console.log('Checking toggle visibility:', {
      originalExactFits,
      evenRowsColumns,
      isResizing,
      exactFitsLength: originalExactFits.length
    });
    
    // Don't show while calculating
    if (isResizing) {
      return false;
    }
    
    // Check for exact fits
    if (!originalExactFits || originalExactFits.length === 0) {
      return false;
    }
    
    // If even rows/columns is enabled, check for valid exact fits
    if (evenRowsColumns) {
      const evenSquareExactFits = originalExactFits.filter(num => {
        const sqrt = Math.sqrt(num);
        return Number.isInteger(sqrt) && sqrt % 2 === 0;
      });
      return evenSquareExactFits.length > 0;
    }
    
    // Show toggle if we have any exact fits
    return originalExactFits.length > 0;
  };

  return (
    <div className="relative h-full text-balance">
      {isGridCreated && <Container space="medium">
      
        <div className="flex flex-col justify-between h-full gap-2 pt-2 pb-4">
          <div> 
            <Text><Bold>Cell Count</Bold></Text>        
            <VerticalSpace space="small" />

          
          {!isExactFitEnabled ? (
            <div>
              <TextboxNumeric
                icon={<IconTidyGrid32 />}     
                variant='border'
                maximum={Math.max(...steps, 300)}
                minimum={Math.min(...steps, 1)}
                onValueInput={handleCellCountChange}
                value={cellCount?.toString() ?? '0'}
              />
              <RangeSlider
                maximum={Math.max(...steps, 300)}
                minimum={Math.min(...steps, 1)}
                value={cellCount?.toString() ?? '0'}
                onValueInput={(value) => {
                  const numericValue = parseInt(value, 10);
                  const closestStep = findClosestStep(numericValue);
                  setCellCount(closestStep);
                  emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: closestStep.toString() });
                }}
              />
              <VerticalSpace space="small" />
            </div>
          ) : (
            <div>
              {perfectFitNumber ? (
                
                  <div>                    
                  <TextboxNumeric
                    icon={<IconTidyGrid32 />}
                    variant='border'
                    disabled={true}
                    value={perfectFitNumber.toString()} /><VerticalSpace space="small" /></div>
                
              ) : (
                <CellCountPicker 
                  cellCountOptions={dropdownOptions} 
                  dropdownCellCountChange={handleDropdownCellCountChange}  
                  dropdownValue={dropdownValue}
                />
              )}
            </div>
          )}
          </div>

          <div className="flex flex-col space-y-1">
            <Text className="mb-1"><Bold>Options</Bold></Text>
            <Toggle
              onChange={handleEvenRowsColumnsChange}
              value={evenRowsColumns}
              disabled={isLoading}
            >
              <Text>{isLoading ? 'Calculating...' : 'Even rows and columns'}</Text>
            </Toggle>

            {!isResizing && originalExactFits.length > 0 && (
              <Toggle
                onChange={handleExactFitChange}
                value={isExactFitEnabled}
                disabled={isResizing}
              >
                <Text>
                  {isResizing ? 'Calculating...' : 'Match frame size'}
                </Text>
              </Toggle>
            )}
          </div>
        </div>
      </Container>}

      {!isGridCreated && (
        <Container className="absolute inset-0 flex flex-col justify-between p-4" space="medium">    
          
          
          {isEnabled ? (
            <div className="flex flex-col justify-around h-full">
            <Button 
              className="mt-4" 
              fullWidth 
              onClick={handleCreateGrid}
            >
              Create
            </Button>
            <Text className="text-center"><Muted>This tool creates a grid based on the size of your selected frame.</Muted></Text>
            </div>
          ) : (
            <div className="z-10 flex h-full rounded-md overflow-clip bg-slate-400">
              <Banner  icon={<IconInfo32 />} >      
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