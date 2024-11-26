declare module '@create-figma-plugin/ui' {
    export type EventHandlerObject<Event> = (event: Event) => void
  
    export interface FirstArgument<T extends (...args: unknown[]) => unknown> {
      (...args: Parameters<T>): ReturnType<T>
    }
  }