import { render, IconPlus32, Container, IconButton } from '@create-figma-plugin/ui'
import {emit} from '@create-figma-plugin/utilities'
import { useCallback, useState } from 'preact/hooks'
import { h } from 'preact'
import '!./output.css'
import { GridHandler } from './types'

function Plugin () {

const [cells,setCells] = useState(10)
const handleCellIncrement = useCallback(

  function() {
    setCells(cells + 1)
    emit<GridHandler>('MAKE_GRID', cells)
  },
  [cells]
)
  return (
    <Container className="flex flex-row" space='medium' >
      <div>
    <h1 class="text-3xl font-bold underline">
      Hello, World!
    </h1>
    </div>
    <IconButton onClick={handleCellIncrement}><IconPlus32 /></IconButton>
    </Container>
  )
}

export default render(Plugin)
