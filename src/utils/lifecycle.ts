/**
 * Lifecycle Registry — Manages background intervals and subscriptions.
 * 
 * This ensures that when the app reloads or resets, we don't leave 
 * ghost processes running in the background wasting memory.
 */

type CleanUpFn = () => void;

class LifecycleRegistry {
  private static tasks: Map<string, CleanUpFn> = new Map();

  /**
   * Registers a task to be cleared on cleanup.
   * If a task with the same name exists, it is cleared first.
   */
  static register(name: string, cleanup: CleanUpFn): void {
    if (this.tasks.has(name)) {
      this.clear(name);
    }
    this.tasks.set(name, cleanup);
  }

  /**
   * Clears a specific task by name.
   */
  static clear(name: string): void {
    const cleanup = this.tasks.get(name);
    if (cleanup) {
      try {
        cleanup();
      } catch (err) {
        console.warn(`Failed to cleanup task [${name}]:`, err);
      }
      this.tasks.delete(name);
    }
  }

  /**
   * Clears all registered tasks.
   */
  static clearAll(): void {
    this.tasks.forEach((cleanup, name) => {
      this.clear(name);
    });
  }

  /**
   * Utility to register an interval and automatically wrap its disposal.
   */
  static setInterval(name: string, fn: () => void, ms: number): void {
    const id = setInterval(fn, ms);
    this.register(name, () => clearInterval(id));
  }
}

export default LifecycleRegistry;
