// Re-export centralized Firebase module to avoid duplication.
// This file remains for backwards compatibility with imports that reference
// the repository root `firebase-config.js` path.
export * from './src/config/firebase';
export { default } from './src/config/firebase';
