declare module '@create-figma-plugin/ui' {
  namespace EventHandler {
    type EventHandlerObject<Event> = {
      handleEvent(event: Event): void;
    }

    type EventHandler<Event> = ((event: Event) => void) | EventHandlerObject<Event>

    interface TargetedEvent<Target> {
      currentTarget: Target
      target: Target
    }

    type FocusEventHandler<Target> = EventHandler<FocusEvent & TargetedEvent<Target>>
    type MouseEventHandler<Target> = EventHandler<MouseEvent & TargetedEvent<Target>>
    type KeyboardEventHandler<Target> = EventHandler<KeyboardEvent & TargetedEvent<Target>>
    type DragEventHandler<Target> = EventHandler<DragEvent & TargetedEvent<Target>>
    type InputEventHandler<Target> = EventHandler<InputEvent & TargetedEvent<Target>>
    type ClipboardEventHandler<Target> = EventHandler<ClipboardEvent & TargetedEvent<Target>>
    type GenericEventHandler<Target> = EventHandler<Event & TargetedEvent<Target>>

    interface FirstArgument<T> extends Function {
      (...args: any[]): any
    }

    // Event handler interfaces
    interface onBlur<Target extends EventTarget> extends FocusEventHandler<Target> {}
    interface onChange<Target extends EventTarget> extends GenericEventHandler<Target> {}
    interface onClick<Target extends EventTarget> extends MouseEventHandler<Target> {}
    interface onDragEnd<Target extends EventTarget> extends DragEventHandler<Target> {}
    interface onDragEnter<Target extends EventTarget> extends DragEventHandler<Target> {}
    interface onDragOver<Target extends EventTarget> extends DragEventHandler<Target> {}
    interface onDrop<Target extends EventTarget> extends DragEventHandler<Target> {}
    interface onFocus<Target extends EventTarget> extends FocusEventHandler<Target> {}
    interface onInput<Target extends EventTarget> extends InputEventHandler<Target> {}
    interface onKeyDown<Target extends EventTarget> extends KeyboardEventHandler<Target> {}
    interface onMouseDown<Target extends EventTarget> extends MouseEventHandler<Target> {}
    interface onMouseMove<Target extends EventTarget> extends MouseEventHandler<Target> {}
    interface onMouseUp<Target extends EventTarget> extends MouseEventHandler<Target> {}
    interface onPaste<Target extends EventTarget> extends ClipboardEventHandler<Target> {}
  }
}