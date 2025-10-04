
import { EventEmitter } from 'events';

// Since we're in a single-process Next.js environment (both client and server),
// we can rely on a simple in-memory event emitter.
export const errorEmitter = new EventEmitter();
