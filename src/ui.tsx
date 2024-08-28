import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { 
  Toggle,
  Button,
  Container,
  RangeSlider,
  Text,
  VerticalSpace,
  render
} from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import { FrameSelectionHandler, AutoPopulateHandler } from './types'

function Plugin() {
  const [cellCount, setCellCount] = useState(4)
  const [padding, setPadding] = useState(0)

  useEffect(() => {
    emit('UPDATE_GRID', { cellCount, padding })
  }, [cellCount, padding])

  const handleCellCountChange = (value: string) => {
    setCellCount(parseInt(value, 10))
  }

  const handlePaddingChange = (value: string) => {
    setPadding(parseInt(value, 10))
  }

  const [isEnabled, setIsEnabled] = useState(false);
  const [autoPopulate, setAutoPopulate] = useState(false);
console.log(isEnabled)
  useEffect(() => {
    // window.onmessage = (event) => {
    //   const message = event.data.pluginMessage;
    //   if (message.type === 'SELECTION_CHANGED') {
    //     setIsEnabled(message.isValid);
    //   }
    // };
    on<FrameSelectionHandler>('FRAME_SELECTED', (event) => {
      setIsEnabled(event.isFrameSelected);
    });
  }, []);
  const handleAutoPopulateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const newValue = target?.checked;
    console.log(newValue)
    setAutoPopulate(newValue);
    emit<AutoPopulateHandler>('AUTO_POPULATE', { autoPopulate: newValue });
  };

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>Number of cells: {cellCount}</Text>
      <VerticalSpace space="large" />
      <RangeSlider
        maximum={100}
        minimum={1}
        onValueInput={handleCellCountChange}
        value={cellCount.toString()}
      />
      <VerticalSpace space="medium" />
      <Text>Padding: {padding}%</Text>
      <VerticalSpace space="large" />
      <RangeSlider
        maximum={50}
        minimum={0}
        onValueInput={handlePaddingChange}
        value={padding.toString()}
      />
      <VerticalSpace space="large" />
      <div>
      <Toggle onChange={handleAutoPopulateChange} value={autoPopulate}>
      <Text>Auto-populate new frames</Text>
    </Toggle>
       
      </div>
      <VerticalSpace space="large" />
      <Text>Frame selected: {isEnabled ? 'Yes' : 'No'}</Text>
    </Container>
  )
}

export default render(Plugin)
