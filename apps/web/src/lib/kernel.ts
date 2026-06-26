import { createKernel } from '@apex-os/kernel';

let kernelInstance: ReturnType<typeof createKernel> | null = null;
let bootPromise: Promise<void> | null = null;

export function getKernel() {
  if (!kernelInstance) {
    kernelInstance = createKernel();
    bootPromise = kernelInstance.boot();
  }
  return { kernel: kernelInstance, ready: bootPromise! };
}
