import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import '!./output.css';
import debounce from 'lodash/debounce';
import { 
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
  const [hexColors, setHexColors] = useState<string[]>(defaultColors);
  const [opacityPercent, setOpacityPercent] = useState<string[]>(['100%','100%','100%','100%','100%']);
  const [dropdownValue, setDropdownValue] = useState<null | string>(null);
  const [dropdownOptions, setDropdownOptions] = useState<Array<{ value: string }>>([{ value: '0' },]);
  const [exactFit, setExactFit] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  
  useEffect(() => {
    emit('UPDATE_GRID', { cellCount, padding })
    emit('UPDATE_COLORS', { hexColors, opacityPercent })
  }, [cellCount, padding, hexColors, opacityPercent])

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
    const handler = (event: { possibleCellCounts: number[], exactFitCounts: number[] } | undefined) => {
      if (event?.possibleCellCounts && Array.isArray(event.possibleCellCounts) && event.possibleCellCounts.length > 0) {
          console.log('Received possible cell counts:', event.possibleCellCounts);
          console.log('Received exact fit cell counts:', event.exactFitCounts);
          let exactFitArray: number[] = [];
          if (event.exactFitCounts.length > 1) {
            exactFitArray = event.exactFitCounts;
            setExactFit(true);
          setDropdownOptions(exactFitArray.map(cellCount => ({ value: cellCount.toString() })));
          setDropdownValue(exactFitArray[0].toString());
          if(event.exactFitCounts.length === 1){
            setCellCount(exactFitArray[0]);
            emit<CellCountHandler>('CELL_COUNT_CHANGE', { cellCount: exactFitArray[0].toString() });
            }
          
          }
          else{
            setDropdownOptions([{value: 'No exact fits'}]);
            setDropdownValue('No exact fits');
          }
          setSteps(event.possibleCellCounts);
          setCellCount(event.possibleCellCounts[0]); // Set the initial selected value to the first step
      }
    }
    

   

    on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', handler);
    on<UpdateColorsHandler>('UPDATE_COLORS', (event) => {
      // setHexColors(event.hexColors);
      // setOpacityPercent(event.opacityPercent);
    });
    // Clean up the event listener on component unmount
    return () => {
      // You might need to use a method to remove the listener if applicable
    };
    // on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', (event) => {
    //   setSteps(event.possibleCellCounts);
    // });
  }, []);


  console.log('dropdown values',dropdownValue)
  const debouncedUpdateColors = debounce((newHexColors: string[], newOpacityPercent: string[]) => {
    emit('UPDATE_COLORS', { hexColors: newHexColors, opacityPercent: newOpacityPercent });
  }, 1000);

  useEffect(() => {
    console.log(steps)
  }, [steps])

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

  function handleHexColorInput(index:number, event: h.JSX.TargetedEvent<HTMLInputElement>) {
    console.log('index',index,'value',event.currentTarget.value)
    const newHexColor = [...hexColors]
    newHexColor[index] = event.currentTarget.value;
    console.log(newHexColor)
    setHexColors(newHexColor);
    debouncedUpdateColors(newHexColor, opacityPercent);
  }

  function handleOpacityInput(index:number, event: h.JSX.TargetedEvent<HTMLInputElement>) {
    console.log('index',index,'value',event.currentTarget.value)
    const newOpacity = [...opacityPercent]
    newOpacity[index] = event.currentTarget.value;
    console.log(newOpacity)
    setOpacityPercent(newOpacity);
    debouncedUpdateColors(hexColors, newOpacity);

  }
    
const handleExactFitChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
  const target = event.currentTarget as HTMLInputElement;
  const newValue = target?.checked;
  console.log(newValue)
  // setExactFit(newValue);
  setShowDropdown(newValue);
  emit<ExactFitHandler>('EXACT_FIT', { exactFit: newValue });
}

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

      <Columns className="flex items-center justify-between">
        <div>
            <Text>Grid Cells</Text>
        </div>
        { exactFit && <div>
            <Toggle onChange={handleExactFitChange} value={showDropdown}>
                <Text>Perfect fit</Text>
            </Toggle>
        </div>}
      </Columns>
      <VerticalSpace space="small" />
      {showDropdown &&<CellCountPicker 
        cellCountOptions={dropdownOptions} 
        dropdownCellCountChange={handleDropdownCellCountChange}  
        dropdownValue={dropdownValue} />}
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
      
      <VerticalSpace space="large" />
      <Text>Fill Colors</Text>
      <VerticalSpace space="small" />
      {autoPopulate && <div className="flex flex-col justify-between">
      {defaultColors.map((_,index)=>{
      return <ColorPicker key={index} color={hexColors[index]} opacity={opacityPercent[index]} handleHexColorInput={(event)=>handleHexColorInput(index,event)} handleOpacityInput={(event)=>handleOpacityInput(index,event)} />
    })}
      </div>}
      
    </Container>}
     
      
    {isGridCreated && <Container className="absolute inset-0 flex flex-col justify-between p-4" space="medium">
    
    <Text className="h-min"><Muted>This tool lets you create a customizable grid by setting the number of cells and padding. Adjust the values using the sliders or type directly, with inputs snapping to valid options. Start by selecting or creating a frame, then click "Create Grid" to unlock the settings. You can also enable the auto-fill option for easier grid population.</Muted></Text>
    <Button className="" disabled={!isEnabled} fullWidth onClick={handleCreateGrid}>Get Started</Button>
      {!isEnabled && <div className="absolute bottom-0 left-0 right-0 z-10"><Banner icon={<IconWarning32 />} variant="warning">      
      Please select or create a frame to begin
    </Banner></div>}
    
    </Container>}
    </div>
    
  )
}


export default render(Plugin)
