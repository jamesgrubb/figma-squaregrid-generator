import { h } from 'preact'
import { useState } from 'preact/hooks'
import { TextboxColor } from '@create-figma-plugin/ui'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="relative">
      <div
        className="w-8 h-8 rounded cursor-pointer"
        style={{ backgroundColor: color }}
        onClick={() => setIsEditing(true)}
      />
      {isEditing && (
        <div className="absolute left-0 z-10 mt-1 top-full">
          <TextboxColor
            hexColor={color}
            opacity="100%"
            onHexColorInput={(event) => {
              onChange(event.currentTarget.value)
            }}
            onOpacityInput={() => {}}
          />
        </div>
      )}
    </div>
  )
}