import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import '!./output.css'
import { 
  Stack,
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
  Muted
} from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import { FrameSelectionHandler, AutoPopulateHandler, PossibleCellCountsHandler } from './types'

function Plugin() {
  const [cellCount, setCellCount] = useState<number>(0)
  const [padding, setPadding] = useState<number>(0)
  const [steps, setSteps] = useState<number[]>([])
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [autoPopulate, setAutoPopulate] = useState<boolean>(false);
  const [isGridCreated, setIsGridCreated] = useState(true);

  useEffect(() => {
    emit('UPDATE_GRID', { cellCount, padding })
  }, [cellCount, padding])

  const handleCellCountChange = (value: string) => {
    const numberValue = parseInt(value, 10);
  
  // Find the nearest value in steps
  const nearestValue = steps.reduce((prev, curr) => {
    return (Math.abs(curr - numberValue) < Math.abs(prev - numberValue) ? curr : prev);
  }, steps[0]);

  setCellCount(nearestValue);
  }

  const handlePaddingChange = (value: string) => {
    setPadding(parseInt(value, 10))
  }

  
console.log(isEnabled)
  useEffect(() => {   
    on<FrameSelectionHandler>('FRAME_SELECTED', (event) => {
      setIsEnabled(event.isFrameSelected);     
    });
   
  }, []);

  useEffect(() => {
    const handler = (event: { possibleCellCounts: number[] } | undefined) => {
      if (event?.possibleCellCounts && Array.isArray(event.possibleCellCounts) && event.possibleCellCounts.length > 0) {
          console.log('Received possible cell counts:', event.possibleCellCounts);
          setSteps(event.possibleCellCounts);
          setCellCount(event.possibleCellCounts[0]); // Set the initial selected value to the first step
      }
  };

   

    on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', handler);

    // Clean up the event listener on component unmount
    return () => {
      // You might need to use a method to remove the listener if applicable
    };
    // on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', (event) => {
    //   setSteps(event.possibleCellCounts);
    // });
  }, []);

  useEffect(() => {
    console.log(steps)
  }, [steps])

  const handleAutoPopulateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const newValue = target?.checked;
    console.log(newValue)
    setAutoPopulate(newValue);
    emit<AutoPopulateHandler>('AUTO_POPULATE', { autoPopulate: newValue });
  };

  function handleCreateGrid() {
    emit('CREATE_GRID', { cellCount, padding })
    setIsGridCreated(false);
  }
  const currentStepIndex = steps.indexOf(cellCount);
  console.log('currentStepIndex', currentStepIndex)

  const findClosestStep = (value: number): number => {
    if (steps.length === 0) return 0; // Return default if no steps

    return steps.reduce((prev, curr) => {
      return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
    });
  };

  const minStep = steps.length > 0 ? Math.min(...steps) : 0; // Fallback to 0 if no steps
  const maxStep = steps.length > 0 ? Math.max(...steps) : 300; // Fallback to 300 if no steps

  return (
    <div className="relative h-full text-balance">
    {!isGridCreated && <Container space="medium">
      
      <VerticalSpace space="large" />
      <Text>Number of cells</Text>
      <VerticalSpace space="small" />
      <TextboxNumeric
          variant='border'
          maximum={300}
          minimum={1}
          onValueInput={handleCellCountChange}
          value={cellCount.toString()}
          disabled={isGridCreated} // Disable based on state
        />
      <VerticalSpace space="small" />
      <div>
      <RangeSlider
        maximum={maxStep} // Use the calculated maximum value from the steps
        minimum={minStep} // Use the calculated minimum value from the steps
        value={cellCount.toString()}
        onValueInput={(value) => {
          const numericValue = parseInt(value, 10);
          const closestStep = findClosestStep(numericValue);
          setCellCount(closestStep);
        }}
        disabled={isGridCreated} // Disable based on state
      />
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
      
      <Toggle onChange={handleAutoPopulateChange} value={autoPopulate}>
      <Text>Auto-Fill</Text>
    </Toggle>
      
      
    </Container>}
    <Container space="medium">
    <VerticalSpace space="small" />
    <Text><Muted>This tool lets you create a customizable grid by setting the number of cells and padding. Adjust the values using the sliders or type directly, with inputs snapping to valid options. Start by selecting or creating a frame, then click "Create Grid" to unlock the settings. You can also enable the auto-fill option for easier grid population.</Muted></Text>
      {!isEnabled && <div className="absolute bottom-0 left-0 right-0"><Banner icon={<IconWarning32 />} variant="warning">      
      Please select or create a frame to begin
    </Banner></div>}
    <VerticalSpace space="large" />
    {isEnabled && <Button fullWidth onClick={handleCreateGrid}>Get Started</Button>}
    </Container>
    </div>
  )
}

export default render(Plugin)
