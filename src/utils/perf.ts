/**
 * Performance Utilities
 * 
 * Tools for measuring and logging performance
 */

// Enable/disable logging (set to false in production)
const PERF_ENABLED = import.meta.env.DEV;

interface PerfEntry {
  name: string;
  start: number;
  end?: number;
  duration?: number;
}

const perfLog: PerfEntry[] = [];

/**
 * Start timing an operation
 */
export function perfStart(name: string): () => number {
  if (!PERF_ENABLED) return () => 0;
  
  const start = performance.now();
  const entry: PerfEntry = { name, start };
  perfLog.push(entry);
  
  // Return stop function
  return () => {
    const end = performance.now();
    entry.end = end;
    entry.duration = end - start;
    
    // Color-coded logging based on duration
    const duration = entry.duration;
    const color = duration < 50 ? 'green' : duration < 200 ? 'orange' : 'red';
    console.log(
      `%c⏱ ${name}: ${duration.toFixed(2)}ms`,
      `color: ${color}; font-weight: bold`
    );
    
    return duration;
  };
}

/**
 * Measure async function
 */
export async function perfMeasure<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const stop = perfStart(name);
  try {
    const result = await fn();
    stop();
    return result;
  } catch (error) {
    stop();
    throw error;
  }
}

/**
 * Get performance summary
 */
export function perfSummary(): void {
  if (!PERF_ENABLED || perfLog.length === 0) return;
  
  console.group('📊 Performance Summary');
  
  const completed = perfLog.filter(e => e.duration !== undefined);
  const sorted = [...completed].sort((a, b) => (b.duration || 0) - (a.duration || 0));
  
  console.table(sorted.slice(0, 10).map(e => ({
    Operation: e.name,
    'Duration (ms)': e.duration?.toFixed(2),
  })));
  
  const total = completed.reduce((sum, e) => sum + (e.duration || 0), 0);
  console.log(`Total: ${total.toFixed(2)}ms across ${completed.length} operations`);
  
  console.groupEnd();
}

/**
 * Clear performance log
 */
export function perfClear(): void {
  perfLog.length = 0;
}

/**
 * HOC to measure component render time
 */
export function withPerfLogging<P extends object>(
  Component: React.ComponentType<P>,
  name: string
): React.FC<P> {
  if (!PERF_ENABLED) return Component as React.FC<P>;
  
  return function WrappedComponent(props: P) {
    const start = performance.now();
    const result = Component(props);
    const duration = performance.now() - start;
    
    if (duration > 5) { // Only log if render takes > 5ms
      console.log(`%c🔄 Render ${name}: ${duration.toFixed(2)}ms`, 'color: purple');
    }
    
    return result;
  };
}
