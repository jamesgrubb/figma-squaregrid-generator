import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { 
  Button,
  Container,
  RangeSlider,
  Text,
  VerticalSpace,
  render
} from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'

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

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>Number of cells: {cellCount}</Text>
      <RangeSlider
        maximum={100}
        minimum={1}
        onValueInput={handleCellCountChange}
        value={cellCount.toString()}
      />
      <VerticalSpace space="medium" />
      <Text>Padding: {padding}%</Text>
      <RangeSlider
        maximum={50}
        minimum={0}
        onValueInput={handlePaddingChange}
        value={padding.toString()}
      />
      <VerticalSpace space="large" />
    </Container>
  )
}

export default render(Plugin)
