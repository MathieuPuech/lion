# Singleton Manager Rational

We have an app with 2 pages.

- page-a uses overlays 1.x
- page-b uses overlays 2.x (gets installed nested)

```txt
my-app (node_modules)
├── overlays (1.x)
├── page-a
│   └── page-a.js
└── page-b
    ├── node_modules
    │   └── overlays (2.x)
    └── page-b.js
```

The tough part in this case is the OverlaysManager within the overlays package as it needs to be a singleton.

It starts of simplified like this

```js
export class OverlaysManager {
  name = 'OverlayManager 1.x';
  blockBody = false;
  constructor() {
    this._setupBlocker();
  }
  _setupBlocker() {
    /* ... */
  }
  block() {
    this.blockBody = true; // ...
  }

  unBlock() {
    this.blockBody = false; // ...
  }
}
```

## Example A (fail)

See it "fail" e.g. 2 separate OverlaysManager are at work and are "fighting" over the way to block the body.

```bash
npm run start:fail
```

Steps to reproduce:

1. Page A click on block
2. Page B => "Blocked: false" (even when hitting the refresh button)

See [the code](./demo/fail/demo-app.js).

---

## Example B (singleton manager)

The breaking change in `OverlayManager` was renaming of 2 function (which has been deprecated before).

- `block()` => `blockingBody()`
- `unBlock()` => `unBlockingBody()`

knowing that we can create a Manager that is compatible with both via

```js
import { OverlaysManager } from 'overlays';

class CompatibleManager extends OverlaysManager {
  blockingBody() {
    this.block();
  }
  unBlockingBody() {
    this.unBlock();
  }
}
```

all that is left is a to "override" the default instance of the "users"

```js
import { singletonManager } from 'singleton-manager';

const manager = new CompatibleManager();
singletonManager.set('overlays::index.js::1.x', compatibleManager);
singletonManager.set('overlays::index.js::2.x', compatibleManager);
```

See it in action

```bash
npm run start:singleton
```

and [the code](./demo/singleton/demo-app.js).

---

## Example C (singleton and complex patching on app level)

The breaking change in `OverlayManager` was converting a property to a function and a rename of a function.

- `blockBody` => `_blockBody`
- `block()` => `blockBody()`
- `unBlock()` => `unBlockBody()`

e.g. what is impossible to make compatible with a single instance is to have `blockBody` act as a property for 1.x and as a function `blockBody()` for 2.x.

So how do we solve it then?

We will make 2 separate instances of the `OverlayManager`.

```js
compatibleManager1 = new CompatibleManager1(); // 1.x
compatibleManager2 = new CompatibleManager2(); // 2.x
console.log(typeof compatibleManager1.blockBody); // Boolean
console.log(typeof compatibleManager1.blockBody); // Function

// and override
singletonManager.set('overlays::index.js::1.x', compatibleManager1);
singletonManager.set('overlays::index.js::2.x', compatibleManager2);
```

and they are "compatible" to each other because they sync the important data to each other.
e.g. even though there are 2 instances there is only `one` dom element inserted which both can write to.
When syncing data only the initiator will update the dom.
This makes sure even though functions and data is separate it will be always consistent.

See it in action

```bash
npm run start:singleton-complex
```

and [the code](./demo/singleton-complex/demo-app.js).

---

## How does it work?

As a user you can override what the import of `overlays/instance.js` provides.
You do this via a singletonManager and a "magic" string.

- Reason be that you can target ranges of versions

```js
singletonManager.set('overlays::index.js::1.x', compatibleManager1);
singletonManager.set('overlays::index.js::2.x', compatibleManager2);
```

### Details

Potentially we could have "range", "exacts version" and symbol for unique filename.
So you can override with increasing specificity.

## Non Goals

Making sure that there are only 2 versions of a specific packages.
npm is not meant to handle something like this... and it never will

```txt
my-app
├─┬ feat-a@x
│ └── foo@2.x
├─┬ feat-a@x
│ └── foo@2.x
└── foo@1.x
```

dedupe works by moving dependencies up the tree

```txt
// this app
my-app
my-app/node_modules/feat-a/node_modules/foo
my-app/node_modules/foo

// can become if versions match
my-app
my-app/node_modules/foo
```

in there `feat-a` will grab the version of it's "parent" because of the node resolution system...

if however the versions do not match or there is no "common" folder to move it up to... then it needs to be "duplicated" by npm/yarn...

only by using a more controlled way like

- import-maps
- yarn resolve (not sure if npm has an equivalent)

you can "hard" code it to the same versions
