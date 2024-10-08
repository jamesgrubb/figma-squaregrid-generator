import { h} from 'preact'
import { useState } from 'preact/hooks'
import { TextboxColor } from '@create-figma-plugin/ui'
import '../../src/input.css'
export const ColorPicker = ({ color, opacity,  handleHexColorInput, handleOpacityInput }: { color: string, opacity: string, handleHexColorInput: (event: h.JSX.TargetedEvent<HTMLInputElement>) => void, handleOpacityInput: (event: h.JSX.TargetedEvent<HTMLInputElement>) => void } ) => {

    
  return (
   
    <TextboxColor hexColor={color} opacity={opacity} onHexColorInput={handleHexColorInput} onOpacityInput={handleOpacityInput} variant="underline" />
   
   
  )
}