'use strict';
// Print registered routes from the actual installed Express router stack.
const app = require('../index');
function walk(stack, results) {
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        results.push(`${method.toUpperCase()} ${layer.route.path}`);
      }
    }
    else if (layer.handle && Array.isArray(layer.handle.stack)) {
      // Every subrouter is mounted at the root.
      walk(layer.handle.stack, results);
    }
  }
}
const stack = app._router?.stack || app.router?.stack;
if (!Array.isArray(stack))
  throw new Error('Express route stack unavailable');
const found = [];
walk(stack, found);
console.log(found.join('\n'));
console.log(`Total registered routes: ${found.length}`);
