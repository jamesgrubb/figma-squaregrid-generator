declare module '@create-figma-plugin/ui' {
    namespace EventHandler {
      type AnyFunction = (...args: unknown[]) => unknown;
      
      interface EventHandlerObject<T> extends AnyFunction {
        (event: T): void;
        handleEvent?(event: T): void;
      }
  
      type FirstArgument<T> = T extends AnyFunction ? Parameters<T>[0] : never;
    }
  }