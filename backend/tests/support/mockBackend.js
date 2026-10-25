'use strict';
// Dependency-free Firestore/Auth and Express Router doubles for security checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness() {
  const routes = [];
  const state = {
    users: new Map(),
    sell: new Map(),
    moderationEvents: new Map(),
    authUsers: new Map(),
    batchCommits: 0,
    failBatchNumber: 0
  };
  let nextId = 0;
  const newId = () => `id_${++nextId}`;
  function snapshot(id, value) {
    return {
      id,
      exists: value !== undefined,
      data: () => value,
      ref: reference('', id)
    };
  }
  function reference(collection, id) {
    return {
      id,
      collection,
      async get() {
        const value = state[collection]?.get(id);
        return { id, ref: this, exists: value !== undefined, data: () => value };
      },
      async set(value, opts) {
        apply({ type: 'set', ref: this, value, opts });
      },
      async create(value) {
        apply({ type: 'create', ref: this, value });
      },
      async update(value) {
        apply({ type: 'update', ref: this, value });
      }
    };
  }
  function apply(op) {
    const current = state[op.ref.collection].get(op.ref.id);
    if (op.type === 'create' && current !== undefined) {
      throw Error('Already exists');
    }
    state[op.ref.collection].set(op.ref.id,
      op.type === 'set' && !op.opts?.merge ? op.value : { ...(current || {}), ...op.value });
  }
  function writer(batch = false) {
    const operations = [];
    return {
      async get(ref) { return ref.get(); },
      set(ref, value, opts) { operations.push({ type: 'set', ref, value, opts }); },
      update(ref, value) { operations.push({ type: 'update', ref, value }); },
      create(ref, value) { operations.push({ type: 'create', ref, value }); },
      async commit() {
        if (batch) {
          state.batchCommits++;
          if (state.batchCommits === state.failBatchNumber) throw Error('Simulated batch failure');
        }
        operations.forEach(apply);
      }
    };
  }
  const db = {
    collection(name) {
      return {
        doc(id) { return reference(name, id || newId()); },
        where(field, operator, value) {
          assert.equal(operator, '==');
          return {
            async get() {
              const docs = [...state[name].entries()]
                .filter(([, item]) => item[field] === value)
                .map(([id, item]) => ({ id, ref: reference(name, id), data: () => item }));
              return { docs, empty: docs.length === 0, size: docs.length };
            }
          };
        }
      };
    },
    batch() { return writer(true); },
    async runTransaction(callback) {
      const transaction = writer();
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    }
  };
  const auth = {
    async verifyIdToken(token, checkRevoked) {
      assert.equal(checkRevoked, true, 'Auth must check disabled and revoked credentials');
      const account = state.authUsers.get(token);
      if (!account) throw Object.assign(Error('Unknown token'), { code: 'auth/id-token-expired' });
      if (account.disabled) {
        throw Object.assign(Error('Disabled account'), { code: 'auth/user-disabled' });
      }
      return { uid: token, email: account.email, email_verified: true };
    },
    async getUser(uid) {
      const account = state.authUsers.get(uid);
      if (!account) throw Error('Missing account');
      return { uid, ...account };
    },
    async deleteUser(uid) { state.authUsers.delete(uid); },
    async updateUser(uid, data) {
      state.authUsers.set(uid, { ...state.authUsers.get(uid), ...data });
    }
  };
  function createRouter() {
    const localRoutes = [];
    const router = { _routes: localRoutes, disable() {}, use(...handlers) {
      for (const handler of handlers) {
        if (handler && Array.isArray(handler._routes)) localRoutes.push(...handler._routes);
      }
    } };
    for (const method of ['get','post','put','patch','delete']) {
      router[method] = (pattern,...handlers) => localRoutes.push({method,pattern,handlers});
    }
    return router;
  }
  function express() {
    const app = createRouter();
    const originalUse = app.use;
    app.use = (...handlers) => {
      originalUse(...handlers);
      routes.splice(0, routes.length, ...app._routes);
    };
    return app;
  }
  express.Router = createRouter;
  express.json = () => () => {};
  const realRequire = require;
  const replacements = {
    express,
    cors: () => () => {},
    dotenv: { config() {} },
    'firebase-admin/app': { getApps: () => [true], initializeApp() {} },
    'firebase-admin/firestore': { getFirestore: () => db, FieldPath: { documentId: () => '__name__' } },
    'firebase-admin/auth': { getAuth: () => auth }
  };
  const loadedModules = new Map();
  function loadModule(filename) {
    const absolutePath = path.resolve(filename);
    if (loadedModules.has(absolutePath)) return loadedModules.get(absolutePath).exports;
    const moduleObject = { exports: {} };
    loadedModules.set(absolutePath, moduleObject);
    const source = fs.readFileSync(absolutePath, 'utf8');
    const localRequire = specifier => {
      if (Object.hasOwn(replacements, specifier)) return replacements[specifier];
      if (specifier.startsWith('.')) {
        return loadModule(path.resolve(path.dirname(absolutePath), specifier + '.js'));
      }
      return realRequire(specifier);
    };
    vm.runInNewContext(source, {
      require: localRequire, module: moduleObject, exports: moduleObject.exports, URL,
      console: { error() {} }, process: { env: { ADMIN_UIDS: 'root' } }, Date, Map, Set
    }, { filename: path.relative(path.join(__dirname, '..', '..'), absolutePath) });
    return moduleObject.exports;
  }
  loadModule(path.join(__dirname, '..', '..', 'index.js'));
  async function request(method, route, uid, params = {}, body = {}, query = {}) {
    const found = routes.find(item => item.method === method && item.pattern === route);
    assert.ok(found, `Route ${method.toUpperCase()} ${route} exists`);
    const req = {
      method: method.toUpperCase(),
      params,
      body,
      query,
      get: header => header === 'authorization' ? `Bearer ${uid}` : ''
    };
    const res = {
      statusCode: 200,
      status(value) { this.statusCode = value; return this; },
      json(value) { this.body = value; return this; },
      set() { return this; }
    };
    async function run(index) {
      if (index < found.handlers.length) {
        return found.handlers[index](req, res, () => run(index + 1));
      }
    }
    await run(0);
    return res;
  }
  state.authUsers.set('root', { email: 'root@example.test', emailVerified: true });
  state.users.set('root', { uid: 'root', suspended: false });
  return { state, request, routes };
}


module.exports = { harness };
