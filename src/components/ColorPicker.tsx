import { h } from 'preact'
import { useState } from 'preact/hooks'
import { TextboxColor } from '@create-figma-plugin/ui'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

function hexToRgb(hex: string): string {
  const rgb = parseInt(hex.replace(/^#/, ''), 16);
  return `${(rgb >> 16) & 255}, ${(rgb >> 8) & 255}, ${rgb & 255}`;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [isEditing, setIsEditing] = useState(false)
console.log('color', color)
  return (
    <div className="relative">
      <div
       className="dynamic-color"
       style={{ '--dynamic-bg-color': color } as React.CSSProperties}
        onClick={() => setIsEditing(true)}
      />
      {isEditing && (
        <div className="absolute left-0 z-10 mt-1 top-full">
          <TextboxColor
            hexColor={`rgb(${hexToRgb(color)})`}
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