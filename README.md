# prixi

Beef up your Javascript classes by turning them into proxies!

## Install

```bash
npm i --save prixi
```

## Use

Prixi exports a single class called `ProxyClass`. When you inherit from this class, all instances of your class will be turned into [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) instances.

For the most part, your class instances will now act exactly like a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

Prixi exports a number of symbols that align with the properties of a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) handler, and behave in exactly the same way.

If you want to use the [Proxy.get](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get) handler, you would instead use the Prixi symbol `[ProxyClass.get](target, prop, receiver) {}` for your method name. If instead you would like to use the [Proxy.apply](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/apply) so an instance of your class can be called, then you would instead name your instance method `[ProxyClass.apply](target, thisArg, args) {}`.

You get the idea... just follow the [MDN docs for Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), and instead prefix all names found there with `ProxyClass.{handlerName}`!

## Example

```javascript
const ProxyClass = require('prixi');

class Greet extends ProxyClass {
  construct(proxy, ...args) {
    this._name = null;
  }

  // This isn't part of Proxy...
  // It is instead custom functionality Prixi adds.
  // This is called whenever a property being accessed
  // can not be found on the instance.
  [ProxyClass.missing](target, propName) {
    console.log(`I don't know how to do "${propName}"!`);

    // __call returns an "optional" method
    // that can either be invoked, or
    // it can be ignored, and properties
    // can continued to be chained
    // for further access. This is
    // essentially a High Order No Op (HONO)
    // ... yes, I just came up with that :)
    return this.__call(() => {
      console.log('HONO');
      return this;
    });
  }

  name = this.__call((name) => {
    this._name = name;
    console.log(`Name set to: ${name}`);
    return this;
  }).__autoCall(() => {
    console.log('Not setting name apparently!');
  });

  greet() {
    if (this._name)
      console.log(`Hello ${this._name}!`);
    else
      console.log('Hello whomever you are!');
  }
}

let a = new Greet();
a.name.greet();
// output: Not setting name apparently!
// output: Hello whomever you are!

a.name('John Doe').greet();
// output: Name set to: John Doe
// output: Hello John Doe!

a.name('Thing 1').whatever.greet();
// output: Name set to: Thing 1
// output: I don't know how to do "whatever"!
// output: Hello Thing 1!

a.name('Thing 2').whatever().greet();
// output: Name set to: Thing 2
// output: I don't know how to do "whatever"!
// output: HONO
// output: Hello Thing 2!
```

## Concerns

There are some important thing to understand about Proxy instances...

First, when you call `super` inside your constructor you **must** capture the return value, and return this from your `constructor` call. This *is* the proxy instance, so don't discard it...

For example, the following is incorrect and **very** broken:

```javascript
const ProxyClass = require('prixi');

class Test extends ProxyClass {
  constructor() {
    super();

    // ...

    // WHOOPS! We lost the return
    // from `super()`...
    // BAD BAD BAD!!!
  }
}
```

Instead, do the following, which is correct and **not** broken:

```javascript
const ProxyClass = require('prixi');

class Test extends ProxyClass {
  constructor() {
    let self = super();

    // self.someProp = 'value';
    // ...

    // WHEW! Now we are good!
    return self;
  }
}
```

Because this pattern of remembering to capture the proxy and return it as the class instance can be annoying, `ProxyClass` also looks for a `construct` method on your class, and will call that inside `super()` for you. For example, this is the more convenient way to have a custom "constructor" for your class:

```javascript
const ProxyClass = require('prixi');

class Test extends ProxyClass {
  // call from `super()` looks like:
  // this.construct.call(this, proxy, ...args)
  construct(proxy, ...args) {
    // This is the same as a
    // "constructor" call...
    // but you don't have to
    // remember to return the
    // proxy instance.

    // "this" is the class instance
    // NOT the proxy. If you need
    // the proxy instance, use the
    // provided "proxy" argument
    // instead.
    //
    // This is useful for setting
    // up things on your class instance
    // without the proxy getting involved.

    // this.someProp = 'value';
    // ...

    // No need to worry about a return.
    //
    // HOWEVER! You CAN return another
    // instance here if you want to!
    //
    // i.e. You can return "proxy" if
    // you modify it here.
    //
    // (undefined and null return values are ignored)
  }
}
```

## Optional calling and autocalling

You can always use the special `__call` method of a `ProxyClass` instance to have an optional method call.

For example, if you look at the first example provided in this readme, you will see that the `name` method of the `Greet` class is a `__call` method. This method is optional, and so it is only called if explicitly called. Otherwise, it simply acts like your class instance instead.

An `__autoCall` instead sets up a special "queue" inside the proxy to autocall a method if it wasn't called explicitly. In our `Greet` example above, if the `name` method isn't called explicitly, then it is instead called implicitly when we access the very next property through the proxy.

Autocalls never have arguments... because, well, none can ever be supplied! The return value from an autocall is also ignored, because you are already accessing the next key from your class instance when the autocall happens.

Autocalls aren't actually methods in themselves, but instead can be set on `ProxyClass` instances, which is why we have it chained to the `__call`. The `__call` returns a proxy attached to a method. The proxy simply proxies all property access to your own proxy class... allowing the `__call` method to be optional. If we then chain the returned `__call` proxy with an `__autoCall`, then it will tag the `__call` proxy to be autocallable. So if a property is accessed on the return `__call` method, instead of it being called, then the `__autoCall` is triggered.

This is what the call chain looks like at a high level:

`greetInstance.name -> create __call proxy method -> set __autoCall flag -> return __call proxy method with __autoCall flag set -> |userland| -> either call the method explicitly, in which case __call is called... or access further class instance properties, in which case __autoCall will be invoked instead`

Now, nothing "bad" will happen if you do **neither**, for example:

```javascript
let value = greetingInstance.name;
return value; // some code later on does something with value
```

Now this might at first seem "bad" that the `__call` "method" itself is being returned as your class instance--without being called... however, it actually isn't! Since the returned method is itself a proxy that proxies all calls back to your original instance, this method simply acts like your class instance!

If it is **ever** accessed, then the autocall will be triggered. This is likely, because something is probably going to call `valueOf`, `toString`, or `toJSON` on this instance (at the least). If nothing *ever* again touches the returned "instance", then... no harm no foul, right?!

So either the autocall will happen... or nothing ever again accesses a property on that instance... which would be odd.

## Access the original `this` proxy `target`

Simple! To access the original proxy `target`, simply do:

```javascript
someMethod() {
  let originalTarget = this[ProxyClass.SELF];

  // now we can bypass the proxy entirely
  originalTarget.setSomeValue = true;
}
```
