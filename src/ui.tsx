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
    if (steps.length === 0) return value; // Return the input value if no steps are available
    return steps.reduce((prev, curr) => 
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
    const cellCountHandler = (event: { possibleCellCounts: number[], exactFitCounts: number[] } | undefined) => {
      if (event?.possibleCellCounts && Array.isArray(event.possibleCellCounts) && event.possibleCellCounts.length > 0) {
        console.log('Received possible cell counts:', event.possibleCellCounts);
        console.log('Received exact fit cell counts:', event.exactFitCounts);
        
        setSteps(event.possibleCellCounts);
        
        if (event.exactFitCounts.length > 0) {
          setExactFit(true);
          setDropdownOptions(event.exactFitCounts.map(cellCount => ({ value: cellCount.toString() })));
          setDropdownValue(event.exactFitCounts[0].toString());
          setExactFitCount(event.exactFitCounts.length === 1 ? event.exactFitCounts[0] : null);
          setShowDropdown(isExactFitEnabled); // Show dropdown only if exact fit is enabled
        } else {
          setExactFit(false);
          setDropdownOptions([]);
          setDropdownValue(null);
          setExactFitCount(null);
          setShowDropdown(false); // Hide dropdown when there are no exact fits
          setIsExactFitEnabled(false); // Disable exact fit toggle
        }
        
        // Set initial cell count only if it hasn't been set yet
        if (cellCount === 0) {
          setCellCount(event.possibleCellCounts[0]);
        } else {
          // Find the nearest valid cell count
          const nearestCellCount = findClosestStep(cellCount);
          setCellCount(nearestCellCount);
        }
      }
    }
  
    on<PossibleCellCountsHandler>('POSSIBLE_CELL_COUNTS', cellCountHandler);
    
  
    // Clean up the event listeners on component unmount
    return () => {
      // Remove the event listeners
      // You might need to use a method provided by your event system to remove listeners
      // For example:
      // off('POSSIBLE_CELL_COUNTS', cellCountHandler);
      // off('COLORS_UPDATED', colorUpdateHandler);
    };
  }, [cellCount, isExactFitEnabled, findClosestStep]);

  

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

  return (
    <div className="relative h-full text-balance">
    {!isGridCreated && <Container space="medium">
      
      <VerticalSpace space="large" />

      <Columns className="flex items-center justify-between">
        <div>
            <Text>Grid Cells</Text>
        </div>
        { exactFit && <div>
          <Toggle onChange={handleExactFitChange} value={isExactFitEnabled}>
                <Text>{exactFitCount !== null ? `Show 1 perfect fit` : 'Show perfect fits'}</Text>
            </Toggle>
        </div>}
      </Columns>
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
     
      
    {isGridCreated && <Container className="absolute inset-0 flex flex-col gap-4 p-4" space="medium">    
    { isEnabled && <div> <Text className="h-min"><Muted>This tool lets you create a customizable grid by setting the number of cells and padding. Adjust the values using the sliders or type directly, with inputs snapping to valid options. Start by selecting or creating a frame, then click "Create Grid" to unlock the settings. You can also enable the auto-fill option for easier grid population.</Muted></Text>
    <Button className="" disabled={!isEnabled} fullWidth onClick={handleCreateGrid}>Get Started</Button> </div>}
    </Container>}
    {isGridCreated && <Container className="grid items-end h-full p-4" space="medium">
{!isEnabled &&    <div>
    <svg
  width={"100%"}
  height={"100%"}
  viewBox="0 0 208 208"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect width={208} height={174} rx={5} fill="#F5F5F5" />
  <g clipPath="url(#clip0_5_79)">
    <rect width={208} height={208} fill="white" />
    <rect width={26} height={26} fill="#2A5256" />
    <rect width={26} height={26} transform="translate(26)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(52)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(78)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(104)" fill="#B1371B" />
    <rect width={26} height={26} transform="translate(130)" fill="#2A5256" />
    <rect width={26} height={26} transform="translate(156)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(182)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(0 26)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(26 26)" fill="#B1371B" />
    <rect width={26} height={26} transform="translate(52 26)" fill="#2A5256" />
    <rect width={26} height={26} transform="translate(78 26)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(104 26)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(130 26)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(156 26)" fill="#B1371B" />
    <rect width={26} height={26} transform="translate(182 26)" fill="#2A5256" />
    <rect width={26} height={26} transform="translate(0 52)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(26 52)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(52 52)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(78 52)" fill="#B1371B" />
    <rect width={26} height={26} transform="translate(104 52)" fill="#2A5256" />
    <rect width={26} height={26} transform="translate(130 52)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(156 52)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(182 52)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(0 78)" fill="#B1371B" />
    <rect width={26} height={26} transform="translate(26 78)" fill="#2A5256" />
    <rect width={26} height={26} transform="translate(52 78)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(78 78)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(104 78)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(130 78)" fill="#B1371B" />
    <rect width={26} height={26} transform="translate(156 78)" fill="#2A5256" />
    <rect width={26} height={26} transform="translate(182 78)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(0 104)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(26 104)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(52 104)" fill="#B1371B" />
    <rect width={26} height={26} transform="translate(78 104)" fill="#2A5256" />
    <rect
      width={26}
      height={26}
      transform="translate(104 104)"
      fill="#CAC578"
    />
    <rect
      width={26}
      height={26}
      transform="translate(130 104)"
      fill="#C69A94"
    />
    <rect
      width={26}
      height={26}
      transform="translate(156 104)"
      fill="#57B59C"
    />
    <rect
      width={26}
      height={26}
      transform="translate(182 104)"
      fill="#B1371B"
    />
    <rect width={26} height={26} transform="translate(0 130)" fill="#2A5256" />
    <rect width={26} height={26} transform="translate(26 130)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(52 130)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(78 130)" fill="#57B59C" />
    <rect
      width={26}
      height={26}
      transform="translate(104 130)"
      fill="#B1371B"
    />
    <rect
      width={26}
      height={26}
      transform="translate(130 130)"
      fill="#2A5256"
    />
    <rect
      width={26}
      height={26}
      transform="translate(156 130)"
      fill="#CAC578"
    />
    <rect
      width={26}
      height={26}
      transform="translate(182 130)"
      fill="#C69A94"
    />
    <rect width={26} height={26} transform="translate(0 156)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(26 156)" fill="#B1371B" />
    <rect width={26} height={26} transform="translate(52 156)" fill="#2A5256" />
    <rect width={26} height={26} transform="translate(78 156)" fill="#CAC578" />
    <rect
      width={26}
      height={26}
      transform="translate(104 156)"
      fill="#C69A94"
    />
    <rect
      width={26}
      height={26}
      transform="translate(130 156)"
      fill="#57B59C"
    />
    <rect
      width={26}
      height={26}
      transform="translate(156 156)"
      fill="#B1371B"
    />
    <rect
      width={26}
      height={26}
      transform="translate(182 156)"
      fill="#2A5256"
    />
    <rect width={26} height={26} transform="translate(0 182)" fill="#CAC578" />
    <rect width={26} height={26} transform="translate(26 182)" fill="#C69A94" />
    <rect width={26} height={26} transform="translate(52 182)" fill="#57B59C" />
    <rect width={26} height={26} transform="translate(78 182)" fill="#B1371B" />
    <rect
      width={26}
      height={26}
      transform="translate(104 182)"
      fill="#2A5256"
    />
    <rect
      width={26}
      height={26}
      transform="translate(130 182)"
      fill="#CAC578"
    />
    <rect
      width={26}
      height={26}
      transform="translate(156 182)"
      fill="#C69A94"
    />
    <rect
      width={26}
      height={26}
      transform="translate(182 182)"
      fill="#57B59C"
    />
    <path
      d="M142.206 174.221C139.738 174.221 138.781 172.84 138.357 172.84C138.228 172.84 138.173 172.95 138.173 173.208V174H136.737V170.041H138.173C138.56 171.256 140.051 172.6 141.819 172.6C142.924 172.6 143.55 172.103 143.55 171.275C143.55 168.549 136.681 169.82 136.681 165.456C136.681 163.227 138.449 161.994 140.806 161.994C143.163 161.994 143.955 163.283 144.342 163.283C144.471 163.283 144.526 163.191 144.526 162.896V162.215H145.962V166.266H144.526C144.176 164.83 142.887 163.633 141.248 163.633C140.125 163.633 139.351 164.148 139.351 164.958C139.351 167.297 146.239 166.155 146.239 170.704C146.239 172.803 144.876 174.221 142.206 174.221ZM152.366 177.315V176.155C154.189 176.155 154.226 175.989 154.226 174.387V172.785C153.619 173.576 152.661 174.166 151.243 174.166C148.868 174.166 147.45 172.416 147.45 169.525C147.45 166.616 148.849 164.866 151.206 164.866C152.569 164.866 153.563 165.419 154.226 166.303V165.032H158.185V166.192C156.657 166.192 156.62 166.358 156.62 167.96V174.387C156.62 175.97 156.657 176.155 158.185 176.155V177.315H152.366ZM152.182 172.508C153.545 172.508 154.3 171.385 154.3 169.525C154.3 167.665 153.545 166.542 152.182 166.542C150.838 166.542 150.12 167.629 150.12 169.525C150.12 171.422 150.838 172.508 152.182 172.508ZM163.32 174.203C161.441 174.203 160.3 172.877 160.3 170.262V167.96C160.3 166.376 160.281 166.192 158.753 166.192V165.032H162.694V169.875C162.694 171.919 163.356 172.49 164.204 172.49C165.18 172.49 166.119 171.625 166.119 169.636V167.96C166.119 166.376 166.1 166.192 164.572 166.192V165.032H168.513V171.072C168.513 172.656 168.549 172.84 170.078 172.84V174H166.192V172.416C165.695 173.355 164.793 174.203 163.32 174.203ZM174.138 174.258C172.278 174.258 171.173 173.245 171.173 171.735C171.173 168.31 176.955 169.986 176.955 167.684C176.955 166.745 176.108 166.376 175.077 166.376C174.064 166.376 173.438 166.745 173.438 167.187C173.438 167.389 173.604 167.573 174.083 167.573V168.531H171.523C170.805 166.137 172.996 164.811 175.464 164.811C177.342 164.811 179.331 165.548 179.331 167.868V171.404C179.331 172.398 179.46 172.711 179.773 172.711C180.141 172.711 180.27 172.287 180.178 170.925H181.356C181.541 173.042 180.988 174.221 179.276 174.221C178.06 174.221 177.471 173.687 177.213 172.803C176.679 173.576 175.703 174.258 174.138 174.258ZM175.003 172.693C176.164 172.693 176.955 171.717 176.955 170.299V169.507C176.071 170.501 173.733 170.022 173.733 171.588C173.733 172.343 174.304 172.693 175.003 172.693ZM181.974 174V172.84C183.502 172.84 183.521 172.674 183.521 171.072V167.96C183.521 166.376 183.502 166.192 181.974 166.192V165.032H185.841V166.597C186.32 165.492 187.222 164.83 188.474 164.83C190.076 164.83 190.831 166.1 190.831 167.279C190.831 168.052 190.5 168.844 189.892 169.157H187.94V168.199C188.327 168.199 188.53 167.831 188.53 167.463C188.53 167.021 188.217 166.579 187.609 166.579C186.467 166.579 185.915 167.85 185.915 169.47V171.072C185.915 172.656 185.933 172.84 187.775 172.84V174H181.974ZM196.584 174.258C193.821 174.258 191.796 172.545 191.796 169.599C191.796 166.745 193.748 164.793 196.547 164.793C199.732 164.793 201.095 167.205 200.911 170.022H194.337C194.411 171.717 195.295 172.637 196.823 172.637C198.259 172.637 198.941 171.698 199.125 171.183H200.782C200.58 172.453 199.327 174.258 196.584 174.258ZM194.355 168.697H198.462C198.462 167.316 197.799 166.376 196.51 166.376C195.313 166.376 194.484 167.205 194.355 168.697Z"
      fill="white"
    />
  </g>
  <defs>
    <clipPath id="clip0_5_79">
      <rect width={208} height={208} fill="white" />
    </clipPath>
  </defs>
</svg>

    </div>}
      {!isEnabled && <div className="z-10 backdrop-blur"><Banner className="" icon={<IconWarning32 />} variant="warning">      
      Please select or create a frame to begin
    </Banner></div>}
    </Container>}
    </div>
    
  )
}


export default render(Plugin)