// What the web build uses and Sailfish OS's browser engine (Gecko 91, in Sailfish WebView) lacks.
// sailfish/build-web.sh loads this before the app's own script.
(() => {
  const define = (target, name, value) => {
    if (!(name in target)) Object.defineProperty(target, name, { value, writable: true, configurable: true });
  };
  define(Object, 'hasOwn', (object, key) => Object.prototype.hasOwnProperty.call(object, key));
  define(Array.prototype, 'findLast', function (test, self) {
    for (let i = this.length - 1; i >= 0; i--) if (test.call(self, this[i], i, this)) return this[i];
    return undefined;
  });
  define(Array.prototype, 'findLastIndex', function (test, self) {
    for (let i = this.length - 1; i >= 0; i--) if (test.call(self, this[i], i, this)) return i;
    return -1;
  });
  define(Array.prototype, 'toSorted', function (compare) {
    return [...this].sort(compare);
  });
  define(Array.prototype, 'toReversed', function () {
    return [...this].reverse();
  });
  define(Array.prototype, 'toSpliced', function (...args) {
    const copy = [...this];
    copy.splice(...args);
    return copy;
  });
  define(Array.prototype, 'with', function (index, value) {
    const copy = [...this];
    copy[index < 0 ? copy.length + index : index] = value;
    return copy;
  });
  define(Object, 'groupBy', (items, key) => {
    const groups = Object.create(null);
    let i = 0;
    for (const item of items) (groups[key(item, i++)] ??= []).push(item);
    return groups;
  });
  define(Promise, 'withResolvers', () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    return { promise, resolve, reject };
  });
  if (typeof globalThis.structuredClone !== 'function') {
    // Through a message port, which clones as structuredClone does; synchronous callers get a
    // JSON copy, enough for the plain data the app clones.
    globalThis.structuredClone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
  }
})();
