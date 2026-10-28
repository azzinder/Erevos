import type { CallWindow, MatrixCallsSpace } from './matrix-calls';

// Element Call is not in the web app or on the computer yet: Matrix calls are made on Android only
// (lib/element-call-window.ts).

export function elementCall(): { window: CallWindow; space: MatrixCallsSpace; stop(): void } | null {
  return null;
}

export function canElementCall(): boolean {
  return false;
}
