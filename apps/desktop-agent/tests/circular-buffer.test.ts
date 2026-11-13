import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../src/services/circular-buffer';

describe('CircularBuffer', () => {
  it('throws on non-positive capacity', () => {
    expect(() => new CircularBuffer<number>(0)).toThrow();
    expect(() => new CircularBuffer<number>(-1)).toThrow();
  });

  it('starts empty', () => {
    const buf = new CircularBuffer<number>(5);
    expect(buf.size).toBe(0);
    expect(buf.isFull()).toBe(false);
    expect(buf.toArray()).toEqual([]);
  });

  it('appends in order under capacity', () => {
    const buf = new CircularBuffer<number>(5);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.toArray()).toEqual([1, 2, 3]);
    expect(buf.size).toBe(3);
    expect(buf.isFull()).toBe(false);
  });

  it('reports full at exact capacity', () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.isFull()).toBe(true);
    expect(buf.size).toBe(3);
  });

  it('never exceeds capacity (overflow overwrites oldest)', () => {
    const buf = new CircularBuffer<number>(3);
    for (let i = 1; i <= 10; i++) buf.push(i);
    expect(buf.size).toBe(3);
    expect(buf.toArray()).toEqual([8, 9, 10]);
  });

  it('wraps around multiple times and keeps chronological order', () => {
    const buf = new CircularBuffer<number>(4);
    // capacity*3 + 1 pushes — forces head to wrap past the array boundary repeatedly
    for (let i = 1; i <= 13; i++) buf.push(i);
    expect(buf.size).toBe(4);
    expect(buf.toArray()).toEqual([10, 11, 12, 13]);
  });

  it('wrap-around preserves order with non-multiple overflow counts', () => {
    const buf = new CircularBuffer<string>(5);
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (const item of items) buf.push(item);
    // last 5: d,e,f,g,h
    expect(buf.toArray()).toEqual(['d', 'e', 'f', 'g', 'h']);
  });

  it('at() returns correct element by logical index after wrap', () => {
    const buf = new CircularBuffer<number>(3);
    for (let i = 1; i <= 5; i++) buf.push(i); // buffer holds 3,4,5
    expect(buf.at(0)).toBe(3);
    expect(buf.at(1)).toBe(4);
    expect(buf.at(2)).toBe(5);
    expect(buf.at(3)).toBeUndefined();
    expect(buf.at(-1)).toBeUndefined();
  });

  it('clear() resets to empty and capacity is preserved', () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
    buf.push(9);
    expect(buf.toArray()).toEqual([9]);
    expect(buf.maxCapacity).toBe(3);
  });

  it('is iterable via for-of in chronological order', () => {
    const buf = new CircularBuffer<number>(3);
    for (let i = 1; i <= 5; i++) buf.push(i); // holds 3,4,5
    const collected: number[] = [];
    for (const v of buf) collected.push(v);
    expect(collected).toEqual([3, 4, 5]);
  });

  it('spreads correctly via Array.from (iterator protocol)', () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    expect(Array.from(buf)).toEqual([1, 2]);
  });

  it('handles capacity of 1 (every push overwrites)', () => {
    const buf = new CircularBuffer<number>(1);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.size).toBe(1);
    expect(buf.toArray()).toEqual([3]);
  });

  it('exposes maxCapacity unchanged after pushes', () => {
    const buf = new CircularBuffer<number>(7);
    for (let i = 0; i < 20; i++) buf.push(i);
    expect(buf.maxCapacity).toBe(7);
  });
});
