/**
 * Fixed-capacity ring buffer. O(1) push/overwrite via head+count pointers —
 * no Array.shift() (which is O(n) per call, the thing this replaces).
 * When full, push() overwrites the oldest slot and advances head.
 */
export class CircularBuffer<T> implements Iterable<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('CircularBuffer capacity must be > 0');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    const writeIndex = (this.head + this.count) % this.capacity;
    this.buffer[writeIndex] = item;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  at(index: number): T | undefined {
    if (index < 0 || index >= this.count) return undefined;
    return this.buffer[(this.head + index) % this.capacity];
  }

  toArray(): T[] {
    const result: T[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) {
      result[i] = this.buffer[(this.head + i) % this.capacity] as T;
    }
    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.count = 0;
  }

  get size(): number {
    return this.count;
  }

  get maxCapacity(): number {
    return this.capacity;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  [Symbol.iterator](): Iterator<T> {
    let i = 0;
    return {
      next: (): IteratorResult<T> => {
        if (i >= this.count) return { done: true, value: undefined };
        const value = this.buffer[(this.head + i) % this.capacity] as T;
        i++;
        return { done: false, value };
      },
    };
  }
}
