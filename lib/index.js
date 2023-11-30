/* eslint-disable no-unused-vars */
/* eslint-disable max-classes-per-file */
/* eslint-disable lines-between-class-members */

'use strict';

const apply                       = Symbol.for('/prixi/ProxyClass/apply');
const callable                    = Symbol.for('/prixi/ProxyClass/callable');
const construct                   = Symbol.for('/prixi/ProxyClass/construct');
const defineProperty              = Symbol.for('/prixi/ProxyClass/defineProperty');
const deleteProperty              = Symbol.for('/prixi/ProxyClass/deleteProperty');
const get                         = Symbol.for('/prixi/ProxyClass/get');
const getOwnPropertyDescriptor    = Symbol.for('/prixi/ProxyClass/getOwnPropertyDescriptor');
const getPrototypeOf              = Symbol.for('/prixi/ProxyClass/getPrototypeOf');
const has                         = Symbol.for('/prixi/ProxyClass/has');
const isExtensible                = Symbol.for('/prixi/ProxyClass/isExtensible');
const missing                     = Symbol.for('/prixi/ProxyClass/missing');
const ownKeys                     = Symbol.for('/prixi/ProxyClass/ownKeys');
const preventExtensions           = Symbol.for('/prixi/ProxyClass/preventExtensions');
const set                         = Symbol.for('/prixi/ProxyClass/set');
const setPrototypeOf              = Symbol.for('/prixi/ProxyClass/setPrototypeOf');

// Not intended for outsider consumption
const PROXY                       = Symbol.for('/_prixi/ProxyClass/proxy');
const TARGET                      = Symbol.for('/_prixi/ProxyClass/target');
const SELF                        = Symbol.for('/_prixi/ProxyClass/rootInstance');
const AUTO_CALL_CALLER            = Symbol.for('/_prixi/ProxyClass/autoCallCaller');
const AUTO_CALL_CALLED            = Symbol.for('/_prixi/ProxyClass/autoCallCalled');
const AUTO_CALL                   = Symbol.for('/_prixi/ProxyClass/autoCall');

function shouldSkipProxy(prop) {
  if (prop === 'bind' || prop === 'call' || prop === 'apply')
    return true;

  if (prop === PROXY || prop === TARGET || prop === SELF || prop === AUTO_CALL_CALLER || prop === AUTO_CALL_CALLED || prop === AUTO_CALL)
    return true;

  if (prop in Object.prototype)
    return true;

  return false;
}

/// This is essentially a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
/// converted into class form. What that means is that instead of defining a
/// proxy by passing it a "handlers" object to it, this instead *is* the handler
/// for all classes that inherit from it. Just like a `Proxy`, inheriting from
/// this class will allow the child-class to intercept property gets and sets,
/// intercept method calls, property deletion, etc...
///
/// It works by returning `this` inside the `constructor` wrapped in a
/// `Proxy`. The `Proxy` it creates is then managed by the class instance itself.
/// For example, during key access, if a key the user is requesting is not found,
/// the proxy will call the instance method `missing` on the class. This allows
/// the child class to provide a method for `missing`, and then respond to key
/// access for keys that don't actually exist on the instance.
///
/// That is just one example of many. This class provides full `Proxy` support,
/// and so has methods (or stubs) for every feature available natively to a `Proxy`.
/// Instance methods are keyed by symbols. This is to try and reduce the chance
/// of a name collision... keeping this class useful for many scenarios. For example,
/// the `missing` method above is actually `Symbol.for('/prixi/ProxyClass/missing')`,
/// that is assigned to the constant <see>ProxyClass.missing</see>.
class ProxyClass {
  static apply = apply;
  static callable = callable;
  static construct = construct;
  static defineProperty = defineProperty;
  static deleteProperty = deleteProperty;
  static get = get;
  static getOwnPropertyDescriptor = getOwnPropertyDescriptor;
  static getPrototypeOf = getPrototypeOf;
  static has = has;
  static isExtensible = isExtensible;
  static missing = missing;
  static ownKeys = ownKeys;
  static preventExtensions = preventExtensions;
  static set = set;
  static setPrototypeOf = setPrototypeOf;
  static PROXY = PROXY;
  static TARGET = TARGET;
  static SELF = SELF;
  static AUTO_CALL_CALLER = AUTO_CALL_CALLER;
  static AUTO_CALL_CALLED = AUTO_CALL_CALLED;
  static AUTO_CALL = AUTO_CALL;

  static shouldSkipProxy = shouldSkipProxy;

  static autoCall(func) {
    Object.defineProperties(func, {
      [AUTO_CALL]: {
        writable:     true,
        enumerable:   false,
        configurable: true,
        value:        true,
      },
    });

    return func;
  }

  static createProxy(_proxyTarget, forceSpecifiedContext) {
    let me = (forceSpecifiedContext) ? this : (this[SELF] || this);
    let proxyTarget = _proxyTarget || me[callable] || me;

    let proxy = new Proxy(proxyTarget, {
      apply: function(target, thisArg, argumentsList) {
        return me[apply].call(me, target, thisArg, argumentsList);
      },
      construct: function(target, argumentsList, newTarget) {
        return me[construct].call(me, target, argumentsList, newTarget);
      },
      defineProperty: function(target, key, descriptor) {
        return me[defineProperty].call(me, target, key, descriptor);
      },
      deleteProperty: function(target, prop) {
        return me[deleteProperty].call(me, target, prop);
      },
      get: function(target, prop, receiver) {
        if (shouldSkipProxy(prop))
          return me[prop];

        if (typeof prop !== 'symbol' && prop !== '__autoCall' && prop !== '__call') {
          let autoCall = me[AUTO_CALL_CALLER];
          if (typeof autoCall === 'function' && me[AUTO_CALL_CALLED] === false) {
            me[AUTO_CALL_CALLED] = true;
            let result = autoCall.call(me);
            if (result !== undefined)
              me = result;
          }
        }

        if (prop in me) {
          let value = me[get].call(me, target, prop, receiver);

          if (typeof value === 'function' && value[AUTO_CALL] === true)
            return me.constructor.createProxy.call(Object.create(me), value, true).__autoCall(value);

          return value;
        }

        return me[missing].call(me, target, prop, receiver);
      },
      getOwnPropertyDescriptor: function(target, prop) {
        return me[getOwnPropertyDescriptor].call(me, target, prop);
      },
      getPrototypeOf: function(target) {
        return me[getPrototypeOf].call(me, target);
      },
      has: function(target, prop) {
        return me[has].call(me, target, prop);
      },
      isExtensible: function(target) {
        return me[isExtensible].call(me, target);
      },
      ownKeys: function(target) {
        return me[ownKeys].call(me, target);
      },
      preventExtensions: function(target) {
        return me[preventExtensions].call(me, target);
      },
      set: function(target, prop, value, receiver) {
        if (typeof prop !== 'symbol' && prop !== '__autoCall' && prop !== '__call') {
          let autoCall = me[AUTO_CALL_CALLER];
          if (typeof autoCall === 'function' && me[AUTO_CALL_CALLED] === false) {
            me[AUTO_CALL_CALLED] = true;
            autoCall.call(me);
          }
        }

        return me[set].call(me, target, prop, value, receiver);
      },
      setPrototypeOf: function(target, prototype) {
        return me[setPrototypeOf].call(me, target, prototype);
      },
    });

    Object.defineProperties(me, {
      [PROXY]: {
        writable:     true,
        enumerable:   false,
        configurable: true,
        value:        proxy,
      },
      [TARGET]: {
        writable:     true,
        enumerable:   false,
        configurable: true,
        value:        proxyTarget,
      },
      [SELF]: {
        writable:     true,
        enumerable:   false,
        configurable: true,
        value:        me,
      },
    });

    return proxy;
  }

  /// Construct the class instance, with
  /// `this` returned wrapped in a `Proxy`.
  constructor(...args) {
    Object.defineProperties(this, {
      [AUTO_CALL_CALLER]: {
        writable:     true,
        enumerable:   false,
        configurable: true,
        value:        null,
      },
      [AUTO_CALL_CALLED]: {
        writable:     true,
        enumerable:   false,
        configurable: true,
        value:        false,
      },
    });

    let proxy = ProxyClass.createProxy.call(this);
    if (typeof this.construct === 'function') {
      let result = this.construct.call(this, proxy, ...args);
      if (result != null)
        proxy = result;
    }

    return proxy;
  }

  /// Any method of the instance wrapped in an
  /// `__autoCall` factory will be automatically
  /// called by the engine if not called by the user.
  ///
  /// This works by the `ProxyClass` pushing the auto-call
  /// into a queue when the method key is accessed. If another
  /// key is accessed (any other key), then the `ProxyClass` will
  /// check if the auto-call method has been called yet. If it
  /// hasn't, then the `ProxyClass` will call it, providing no
  /// arguments, and using the return value of the call for the
  /// pending key access. If the auto-call method is simply called,
  /// then the queue is cleared, and the return value simply returned
  /// to the user.
  ///
  /// Example:
  ///   class Greeter extends ProxyClass {
  ///     greet = this.__autoCall((name) => {
  ///       if (arguments.length === 0) {
  ///         // An auto-call, or the user didn't
  ///         // provide any arguments.
  ///         console.log('Hello whoever you are!');
  ///       } else {
  ///         // Was definitely called by the user
  ///         console.log(`Hello ${name}!`);
  ///       }
  ///     });
  ///
  ///     finish() {
  ///       // finish operation
  ///     }
  ///   }
  ///
  ///   // Example 1
  ///   let greeter = new Greeter();
  ///   greeter.greet.finish();
  ///   //           ^---- Auto call happens here
  ///   // output: Hello whoever you are!
  ///
  ///   // Example 2
  ///   greeter.greet('Wyatt Greenway').finish();
  ///   // No auto-call happens... this is a manual call.
  ///   // output: Hello Wyatt Greenway!
  ///
  /// Note:
  ///   For an auto-call to work, a key access attempt must happen
  ///   after the auto-call method is accessed. This is almost always
  ///   the case, because in interacting with the object you are almost
  ///   guaranteed to access a key again, i.e. `.toString` if converting
  ///   to a string, `.toJSON` if converting to JSON, iterator access,
  ///   or even debugging the object.
  ///
  /// Arguments:
  ///   caller: Function
  ///     The method implementation for the class. This method will
  ///     be used by the factory to create an auto-call method for
  ///     the class.
  ///
  /// Return: Function
  ///   The `caller` method provided, wrapped into an auto-call factory method.
  __autoCall(caller) {
    this[AUTO_CALL_CALLER] = caller;
    this[AUTO_CALL_CALLED] = false;

    return this;
  }

  /// This is a factory much like <see>ProxyClass.__autoCall</see>
  /// for creating instance methods. It differs however in that
  /// the method returned by this factory isn't auto-called, but
  /// instead an *optional* call.
  ///
  /// The way it works is that the method provided is returned,
  /// itself wrapped in a `Proxy`. If it is called, then the
  /// `Proxy` will pass the call through to the method, and return
  /// the result. Being a `Proxy`, it passes all key access back
  /// to the original class instance, allowing the method itself
  /// to mimic the class instance. This allows for instance methods
  /// that can *optionally* be called, but if they aren't called,
  /// will act as though you are still interacting with the instance
  /// of the class itself.
  ///
  /// Example:
  ///   class Greeter extends ProxyClass {
  ///     constructor() {
  ///       super();
  ///
  ///       this.greetName = undefined;
  ///     }
  ///
  ///     name = this.__call((name) => {
  ///       this.greetName = name;
  ///     });
  ///
  ///     greet() {
  ///       if (this.greetName) {
  ///         console.log(`Hello ${this.greetName}!`);
  ///       } else {
  ///         console.log('Hello whoever you are!');
  ///       }
  ///     }
  ///   }
  ///
  ///   // Example 1
  ///   let greeter = new Greeter();
  ///   greeter.name.greet();
  ///   //          ^---- optional call here
  ///   // output: Hello whoever you are!
  ///
  ///   // Example 2
  ///   greeter.name('Wyatt Greenway').greet();
  ///   // output: Hello Wyatt Greenway!
  ///
  /// Arguments:
  ///   caller: Function
  ///     The method implementation for the class. This method will
  ///     be used by the factory to create an optional call method for
  ///     the class.
  ///
  /// Return: Function
  ///   The `caller` method provided, wrapped into an optional call factory method.
  __call(caller) {
    return ProxyClass.createProxy.call(this, caller.bind(this[PROXY]));
  }

  [apply](target, thisArg, argumentsList) {
    return target.apply(thisArg, argumentsList);
  }

  [construct](target, argumentsList, newTarget) {
    let self = Object.create(target.prototype);
    let result = newTarget.apply(self, argumentsList);

    if (!result || typeof result !== 'object')
      return self;

    return result;
  }

  [defineProperty](target, key, descriptor) {
    return Object.defineProperty(this, key, descriptor);
  }

  [deleteProperty](target, prop) {
    return delete this[prop];
  }

  [get](target, prop) {
    return this[prop];
  }

  [getOwnPropertyDescriptor](target, prop) {
    return Object.getOwnPropertyDescriptor(target, prop);
  }

  [getPrototypeOf](target) {
    return Object.getPrototypeOf(this);
  }

  [has](target, prop) {
    return (prop in this);
  }

  [isExtensible](target) {
    return Object.isExtensible(this);
  }

  [missing]() {
  }

  [ownKeys](target) {
    return Reflect.ownKeys(this);
  }

  [preventExtensions](target) {
    return Object.preventExtensions(this);
  }

  [set](target, prop, value) {
    this[prop] = value;
    return true;
  }

  [setPrototypeOf](target, prototype) {
    return Object.setPrototypeOf(this, prototype);
  }
}

module.exports = ProxyClass;
