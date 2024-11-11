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
  IconWarning32,
  TextboxNumeric,
  Muted,
  Columns // We'll create this component
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
  const [exactFit, setExactFit] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [exactFitCount, setExactFitCount] = useState<number | null>(null);
  const [isExactFitEnabled, setIsExactFitEnabled] = useState(false);
  
  const [evenFitsOnly, setEvenFitsOnly] = useState<boolean>(false);
  const [originalExactFits, setOriginalExactFits] = useState<number[]>([]);
  const [evenRowsColumns, setEvenRowsColumns] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [evenExactFits, setEvenExactFits] = useState<number[]>([]);
  const [perfectFitNumber, setPerfectFitNumber] = useState<number | null>(null);



 

  const handleCellCountChange = (value: string) => {
    const numberValue = parseInt(value, 10);
    const nearestValue = findClosestStep(numberValue);
    setCellCount(nearestValue);
    emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
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
    on<FrameSelectionHandler>('FRAME_SELECTED', (event) => {
       console.log('Frame selected event received:', event);
      setIsEnabled(event.isFrameSelected);     
    });
  }, [isEnabled]);

  

  useEffect(() => {
    const cellCountHandler = (event: { possibleCellCounts: number[], exactFitCounts: number[] } | undefined) => {
      if (event?.possibleCellCounts && Array.isArray(event.possibleCellCounts)) {
        console.log('Initial Cell Count Handler:', {
          possibleCounts: event.possibleCellCounts,
          exactFitCounts: event.exactFitCounts,
          currentCount: cellCount
        });
        
        setSteps(event.possibleCellCounts);
        
        // Set initial cell count only if it hasn't been set or is invalid
        if (cellCount === null || !event.possibleCellCounts.includes(cellCount)) {
          const initialCount = event.possibleCellCounts[0];
          console.log('Setting initial cell count:', initialCount);
          setCellCount(initialCount);
          emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: initialCount.toString() });
        }

        // Handle exact fits
        if (event.exactFitCounts) {
          setOriginalExactFits(event.exactFitCounts);
          if (event.exactFitCounts.length === 1) {
            setPerfectFitNumber(event.exactFitCounts[0]);
          }
        }
      }
    };

    on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', cellCountHandler);
  }, []); // Only run once on mount

  

  console.log('dropdown values',dropdownValue)

  const handleDropdownCellCountChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    const newValue = target?.value;
    console.log('newValue', newValue)
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
      let newCellCount: number;
      if (dropdownOptions.length > 0 && dropdownOptions[0].value !== 'No exact fits') {
        // Find the nearest exact fit value to the current cellCount
        const nearestOption = dropdownOptions.reduce((prev, curr) => {
          const prevValue = parseInt(prev.value, 10);
          const currValue = parseInt(curr.value, 10);
          return Math.abs(currValue - (cellCount ?? 0)) < Math.abs(prevValue - (cellCount ?? 0)) ? curr : prev;
        });
        newCellCount = parseInt(nearestOption.value, 10);
      } else {
        // If no exact fits, keep the current cellCount, defaulting to 0 if null
        newCellCount = cellCount ?? 0;
      }
      setCellCount(newCellCount);
      setDropdownValue(newCellCount.toString());
      emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: newCellCount.toString() });
    } else {
      // Switching to range slider
      const nearestValue = findClosestStep(cellCount ?? 0);
      setCellCount(nearestValue);
      emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: nearestValue.toString() });
    }
  
    setShowDropdown(newValue);
    emit<ExactFitHandler>('EXACT_FIT', { exactFit: newValue });
  }

  function handleCreateGrid() {
    emit('CREATE_GRID', { cellCount })
    setIsGridCreated(true);
  }
  const currentStepIndex = steps.indexOf(cellCount ?? 0);
  console.log('currentStepIndex', currentStepIndex)



  const minStep = steps.length > 0 ? Math.min(...steps) : 0; // Fallback to 0 if no steps
  const maxStep = steps.length > 0 ? Math.max(...steps) : 300; // Fallback to 300 if no steps




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
      
      // Update to nearest valid value
      if (exactFits.length > 0) {
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

      console.log('Valid even grid counts:', validCounts);

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

      console.log('Steps update:', {
        validCounts,
        currentCount: cellCount,
        perfectFitNumber,
        isExactFitEnabled
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

  // Add this effect to track state changes
  useEffect(() => {
    console.log('State Debug:', {
      originalExactFits,
      evenRowsColumns,
      perfectFitNumber,
      isExactFitEnabled
    });
  }, [originalExactFits, evenRowsColumns, perfectFitNumber, isExactFitEnabled]);

  // Update the shouldShowExactFitToggle function
  const shouldShowExactFitToggle = () => {
    // No exact fits available at all
    if (originalExactFits.length === 0) return false;
    
    if (evenRowsColumns) {
      // Filter exact fits that have even square roots
      const evenSquareExactFits = originalExactFits.filter(num => {
        const sqrt = Math.sqrt(num);
        return Number.isInteger(sqrt) && sqrt % 2 === 0;
      });
      
      console.log('Even square exact fits:', evenSquareExactFits);
      
      // Show toggle if we have valid even square exact fits
      return evenSquareExactFits.length > 0;
    }
    
    // Show toggle for normal case
    return true;
  };

  return (
    <div className="relative h-full text-balance">
    {isGridCreated && <Container space="medium">
      
      <VerticalSpace space="large" />

      <div className="flex flex-col gap-2">
        
        <Toggle 
          onChange={handleEvenRowsColumnsChange}
          value={evenRowsColumns}
          disabled={isLoading}
        >
          <Text>{isLoading ? 'Calculating...' : 'Even rows and columns'}</Text>
        </Toggle>

        {shouldShowExactFitToggle() && (
          <Toggle 
            onChange={handleExactFitChange} 
            value={isExactFitEnabled}
          >
            <Text>
              {perfectFitNumber ? 'Show 1 perfect fit' : 'Show perfect fits'}
            </Text>
          </Toggle>
        )}

        {/* Cell count input - either dropdown, numeric input with slider, or single perfect fit input */}
        {isExactFitEnabled ? (
          perfectFitNumber ? (
            // Single perfect fit case
            <TextboxNumeric
              icon={<IconTidyGrid32 />}     
              variant='border'
              disabled={true}
              value={perfectFitNumber.toString()}
            />
          ) : (
            // Multiple perfect fits case
            <CellCountPicker 
              cellCountOptions={dropdownOptions} 
              dropdownCellCountChange={handleDropdownCellCountChange}  
              dropdownValue={dropdownValue}
            />
          )
        ) : (
          // Regular numeric input case
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
          </div>
        )}
      </div>
    </Container>}

    {!isGridCreated && (
        <Container className="absolute inset-0 flex flex-col justify-between p-4" space="medium">    
          <div>
            <Text className="h-min">
              <Muted>This tool forces a square grid based on the size of its outer frame.</Muted>
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