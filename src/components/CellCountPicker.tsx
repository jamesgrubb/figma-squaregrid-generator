import { h } from 'preact'
import { Dropdown, DropdownOption } from '@create-figma-plugin/ui'
import '../../src/input.css'

export const CellCountPicker = ({ cellCountOptions, dropdownCellCountChange, dropdownValue }: { 
    cellCountOptions: Array<DropdownOption>, 
    dropdownCellCountChange: (event: h.JSX.TargetedEvent<HTMLInputElement>) => void, 
    dropdownValue: string | null
}) => {
    return (
        <Dropdown onChange={dropdownCellCountChange} options={cellCountOptions} value={dropdownValue} variant='underline'/>
  )
}