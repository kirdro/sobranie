Effector.dev Documentation
---

# FAQ

## FAQ

### Why do we need babel/swc plugin for SSR?

Effector plugins inserts special tags - SIDs - into the code, it help to automate serialization and deserialization of stores, so users doesn't have to think about it. See article about sids for more info.

### Why do we need to give names to events, effects etc. ?

This will help in the future, in the development of the effector devtools, and now it is used in the [playground](https://share.effector.dev) on the left sidebar.
If you don't want to do it, you can use the [babel plugin](https://www.npmjs.com/package/@effector/babel-plugin). It will automatically generate the name for events and effects from the variable name.


# Isolated scopes

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import SideBySide from "@components/SideBySide/SideBySide.astro";

## Isolated scopes

With scopes you can work with isolated instance for the entire application, which contains an independent clone of all units (including connections between them) and basic methods to access them:

```ts "fork" "allSettled"
import { fork, allSettled } from "effector";

// create a new scope
const scope = fork();

const $counter = scope.createStore(0);
const increment = scope.createEvent();

$counter.on(increment, (state) => state + 1);

// trigger the event and wait for the entire chain to complete
await allSettled(increment, { scope });

console.log(scope.getState($counter)); // 1
console.log($counter.getState()); // 0 - the original store remains unchanged
```

Using fork, we create a new scope, and with allSettled we run a chain of events and effects inside the specified scope and wait for it to complete.

> INFO Scope Independence:
>
> There is no mechanism for sharing data between scopes; each instance is fully isolated and operates independently.

### Why do we need a scope?

In effector, all state is stored globally. In a client-side application (SPA), this is not a problem: each user gets their own instance of the code and works with their own state. But with server-side rendering (SSR) or parallel testing, global state becomes a problem: data from one request or test can “leak” into another. That’s why we need a scope.

* **SSR** — the server runs as a single process and serves requests from many users. For each request, you can create a scope that isolates data from effector’s global scope and prevents one user’s state from leaking into another user’s request.
* **Testing** — when running tests in parallel, data races and state collisions may occur. A scope allows each test to run with its own isolated state.

We provide detailed guides on working with server-side rendering (SSR) and testing. Here, we’ll focus on the core principles of using scopes, their rules, and how to avoid common mistakes.

### Rules for working with scopes

To ensure scopes work correctly, there are a few rules to prevent scope loss:

#### Effect and promise calls

For effect handlers that call other effects, ensure to only call effects, not common asynchronous functions. Furthermore, effect calls should be awaited.

Imperative calls of effects are safe because effector remembers the scope in which the imperative call of the effect began and restores it after the call, allowing for another call in sequence.

You can call methods like `Promise.all([fx1(), fx2()])` and others from the standard JavaScript API because in these cases, the calls to effects still happen synchronously, and the scope is safely preserved.

<SideBySide>

<Fragment slot="left">

```ts wrap data-border="good" data-height="full"
// ✅ correct usage for an effect without inner effects
const delayFx = createEffect(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
});

// ✅ correct usage for an effect with inner effects
const authFx = createEffect(async () => {
  await loginFx();

  await Promise.all([loadProfileFx(), loadSettingsFx()]);
});
```

</Fragment>

  <Fragment slot="right">

```ts wrap data-border="bad" data-height="full"
// ❌ incorrect usage for an effect with inner effects

const sendWithAuthFx = createEffect(async () => {
  await authUserFx();

  // incorrect! This should be wrapped in an effect.
  await new Promise((resolve) => setTimeout(resolve, 80));

  // scope is lost here.
  await sendMessageFx();
});
```

</Fragment>

</SideBySide>

> INFO get attached:
>
> For scenarios where an effect might call another effect or perform asynchronous computations, but not both, consider utilizing the attach method instead for more succinct imperative calls.

#### Using units with frameworks

Always use the `useUnit` hook with frameworks so effector can invoke the unit in the correct scope:

```tsx wrap "useUnit"
import { useUnit } from "effector-react";
import { $counter, increased, sendToServerFx } from "./model";

const Component = () => {
  const [counter, increase, sendToServer] = useUnit([$counter, increased, sendToServerFx]);

  return (
    <div>
      <button onClick={increase}>{counter}</button>
      <button onClick={sendToServer}>send data to server</button>
    </div>
  );
};
```

Alright, just show me how it works already.

### Using in SSR

Imagine a website with SSR, where the profile page shows a list of the user’s personal notifications. If we don’t use a scope, here’s what happens:

* User A makes a request → their notifications load into `$notifications` on the server.
* Almost at the same time, User B makes a request → the store is overwritten with their data.
* As a result, both users see User B’s notifications.

Not what we want, right? This is a [race condition](https://en.wikipedia.org/wiki/Race_condition), which leads to a leak of private data.

With a scope, we get an isolated context that only works for the current user:
A request is made → a scope is created → we update state only inside this scope. This works for each request.

<Tabs>
  <TabItem label="Server">

```tsx "fork" "allSettled" "serialize"
// server.tsx
import { renderToString } from "react-dom/server";
import { fork, serialize, allSettled } from "effector";
import { Provider } from "effector-react";
import { fetchNotificationsFx } from "./model";

async function serverRender() {
  const scope = fork();

  // Load data on the server
  await allSettled(fetchNotificationsFx, { scope });

  // Render the app
  const html = renderToString(
    <Provider value={scope}>
      <App />
    </Provider>,
  );

  // Serialize state to send to the client
  const data = serialize(scope);

  return `
	<html>
	  <body>
		<div id="root">${html}</div>
		<script>window.INITIAL_DATA = ${data}</script>
	  </body>
	</html>
`;
}
```

</TabItem>
<TabItem label="Client">

```tsx
// client.tsx
import { hydrateRoot } from "react-dom/client";
import { fork } from "effector";

// hydrate scope with initial values
const scope = fork({
  values: window.INITIAL_DATA,
});

hydrateRoot(
  document.getElementById("root"),
  <Provider value={scope}>
    <App />
  </Provider>,
);
```

</TabItem>
</Tabs>

Things to note in this example:

1. We serialized data using serialize to correctly transfer it to the client.
2. On the client, we hydrated the stores using the .

### Related APIs and Articles

* **API**

    * Scope – Description of scope and its methods
    * scopeBind – Method for binding a unit to a scope
    * fork – Operator for creating a scope
    * allSettled – Method for running a unit in a given scope and waiting for the entire chain of effects to complete
    * serialize – Method for obtaining serialized store values
    * hydrate – Method for hydrating serialized data

* **Articles**

    * What is scope loss and how to fix it
    * SSR guide
    * Testing guide
    * The importance of SIDs for store hydration


# Effector React Gate

*Gate* is a hook for conditional rendering, based on the current value (or values) in props. It can solve problems such as compiling all required data when a component mounts, or showing an alternative component if there is insufficient data in props. Gate is also useful for routing or animations, similar to ReactTransitionGroup.

This enables the creation of a feedback loop by sending props back to a *Store*.

Gate can be integrated via the useGate hook or as a component with props. Gate stores and events function as standard units within an application.

Gate has two potential states:

* **Opened**, indicating the component is mounted.
* **Closed**, indicating the component is unmounted.

<br/>

**Example of using Gate as a component:**

```tsx
<Gate history={history} />
```

## Properties

### `.state` Store

> WARNING Important:
>
> Do not modify the `state` value! It is a derived store and should remain in a predictable state.

`Store<Props>`: DerivedStore containing the current state of the gate. This state derives from the second argument of useGate and from props when rendering the gate as a component.

#### Example

```tsx
import { createGate, useGate } from "effector-react";

const Gate = createGate();

Gate.state.watch((state) => console.info("gate state updated", state));

function App() {
  useGate(Gate, { props: "yep" });
  return <div>Example</div>;
}

ReactDOM.render(<App />, root);
// => gate state updated { props: "yep" }
```

### `.open` Event

> INFO Important:
>
> Do not manually invoke this event. It is an event that is triggered based on the gate's state.

Event: Event fired upon gate mounting.

### `.close` Event

> INFO Important:
>
> Do not manually invoke this event. It is an event that is triggered based on the gate's state.

Event: Event fired upon gate unmounting.

### `.status` Store

> WARNING Important:
>
> Do not modify the `status` value! It is a derived store and should remain in a predictable state.

Store: Boolean DerivedStore indicating whether the gate is mounted.

#### Example

```tsx
import { createGate, useGate } from "effector-react";

const Gate = createGate();

Gate.status.watch((opened) => console.info("is Gate opened?", opened));
// => is Gate opened? false

function App() {
  useGate(Gate);
  return <div>Example</div>;
}

ReactDOM.render(<App />, root);
// => is Gate opened? true
```


# Provider

React `Context.Provider` component, which takes any Scope in its `value` prop and makes all hooks in the subtree work with this scope:

* `useUnit($store)` (and etc.) will read the state and subscribe to updates of the `$store` in this scope
* `useUnit(event)` (and etc.) will bind provided event or effect to this scope

## Usage

### Example Usage

Here is an example of `<Provider />` usage.

```tsx
import { createEvent, createStore, fork } from "effector";
import { useUnit, Provider } from "effector-react";
import { render } from "react-dom";

const buttonClicked = createEvent();
const $count = createStore(0);

$count.on(buttonClicked, (counter) => counter + 1);

const App = () => {
  const [count, handleClick] = useUnit([$count, buttonClicked]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => handleClick()}>increment</button>
    </>
  );
};

const myScope = fork({
  values: [[$count, 42]],
});

render(
  <Provider value={myScope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```

The `<App />` component is placed in the subtree of `<Provider value={myScope} />`, so its `useUnit([$count, inc])` call will return

* State of the `$count` store in the `myScope`
* Version of `buttonClicked` event, which is bound to the `myScope`, which, if called, updates the `$count` state in the `myScope`

### Multiple Providers Usage

There can be as many `<Provider />` instances in the tree, as you may need.

```tsx
import { fork } from "effector";
import { Provider } from "effector-react";
import { App } from "@/app";

const scopeA = fork();
const scopeB = fork();

const ParallelWidgets = () => (
  <>
    <Provider value={scopeA}>
      <App />
    </Provider>
    <Provider value={scopeB}>
      <App />
    </Provider>
  </>
);
```

## Provider Properties

### `value`

`Scope`: any Scope. All hooks in the subtree will work with this scope.


# connect

```ts
import { connect } from "effector-react";
```

> WARNING Deprecated:
>
> since [effector-react 23.0.0](https://changelog.effector.dev/#effector-react-23-0-0).
>
> Consider using hooks api in modern projects.

Wrapper for useUnit to use during migration from redux and class-based projects. Will merge store value fields to component props.

## Methods

### `connect($store)(Component)`

#### Formulae

```ts
connect($store: Store<T>)(Component): Component
```

#### Arguments

1. `$store` (Store): store or object with stores

#### Returns

`(Component) => Component`: Function, which accepts react component and return component with store fields merged into props

### `connect(Component)($store)`

#### Formulae

```ts
connect(Component)($store: Store<T>): Component
```

#### Arguments

1. `Component` (React.ComponentType): react component

#### Returns

`($store: Store<T>) => Component`: Function, which accepts a store and returns component with store fields merged into props


# createComponent

```ts
import { createComponent } from "effector-react";
```

> WARNING Deprecated:
>
> since [effector-react 23.0.0](https://changelog.effector.dev/#effector-react-23-0-0).
>
> You can use hooks api in `createComponent` since [effector-react@20.3.0](https://changelog.effector.dev/#effector-20-3-0).

## Methods

### `createComponent($store, render)`

Creates a store-based React component. The `createComponent` method is useful for transferring logic and data of state to your View component.

#### Arguments

1. `$store` (*Store | Object*): `Store` or object of `Store`
2. `render` (*Function*): Render function which will be called with props and state

#### Returns

(*`React.Component`*): Returns a React component.

#### Example

```jsx
import { createStore, createEvent } from "effector";
import { createComponent } from "effector-react";

const increment = createEvent();

const $counter = createStore(0).on(increment, (n) => n + 1);

const MyCounter = createComponent($counter, (props, state) => (
  <div>
    Counter: {state}
    <button onClick={increment}>increment</button>
  </div>
));

const MyOwnComponent = () => {
  // any stuff here
  return <MyCounter />;
};
```

Try it


# createGate

```ts
import { createGate, type Gate } from "effector-react";
```

## Methods

### `createGate(name?)`

Creates a

#### Formulae

```ts
createGate(name?: string): Gate<T>
```

#### Arguments

1. `name?` (*string*): Optional name which will be used as the name of a created React component

#### Returns

Gate\<T>

#### Examples

##### Basic Usage

```jsx
import React from "react";
import ReactDOM from "react-dom";
import { createGate } from "effector-react";

const Gate = createGate("gate with props");

const App = () => (
  <section>
    <Gate foo="bar" />
  </section>
);

Gate.state.watch((state) => {
  console.log("current state", state);
});
// => current state {}

ReactDOM.render(<App />, document.getElementById("root"));
// => current state {foo: 'bar'}

ReactDOM.unmountComponentAtNode(document.getElementById("root"));
// => current state {}
```

Try it

### `createGate(config?)`

Creates a , if `defaultState` is defined, Gate.state will be created with passed value.

#### Formulae

```ts
createGate({ defaultState?: T, domain?: Domain, name?: string }): Gate<T>
```

#### Arguments

`config` (*Object*): Optional configuration object

* `defaultState?`: Optional default state for Gate.state
* `domain?` (): Optional domain which will be used to create gate units (Gate.open event, Gate.state store, and so on)
* `name?` (*string*): Optional name which will be used as the name of a created React component

#### Returns

Gate\<T>


# createStoreConsumer

```ts
import { createStoreConsumer } from "effector-react";
```

> WARNING Deprecated:
>
> since [effector-react 23.0.0](https://changelog.effector.dev/#effector-react-23-0-0).
>
> Consider using hooks api in modern projects.

## Methods

### `createStoreConsumer($store)`

Creates a store-based React component which is watching for changes in the store. Based on *Render Props* technique.

#### Arguments

1. `$store` (Store)

#### Returns

(`React.Component`)

#### Examples

```jsx
import { createStore } from "effector";
import { createStoreConsumer } from "effector-react";

const $firstName = createStore("Alan");

const FirstName = createStoreConsumer($firstName);

const App = () => <FirstName>{(name) => <h1>{name}</h1>}</FirstName>;
```

Try it


# effector-react

Effector bindings for ReactJS.

## Hooks

* useUnit(units)
* useList(store, renderItem)
* useStoreMap({ store, keys, fn })
* useStore(store)
* useEvent(unit)

## Components

* Provider

## Gate API

* Gate
* createGate()
* useGate(GateComponent, props)

## Higher Order Components API

* createComponent(store, render)
* createStoreConsumer(store) renders props style
* connect(store)(Component) "connect" style

## Import map

Package `effector-react` provides couple different entry points for different purposes:

* effector-react/compat
* effector-react/scope


# effector-react/scope

```ts
import {} from "effector-react/scope";
```

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) the core team recommends using main module of `effector-react` instead.

Provides all exports from effector-react, but enforces application to use Scope for all components.

### Usage

You can use this module in the same way as effector-react, but it will require passing Scope to Provider component.

```jsx
// main.js
import { fork } from "effector";
import { Provider } from "effector-react/scope";

import React from "react";
import ReactDOM from "react-dom/client";

const scope = fork();
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <Provider value={scope}>
    <Application />
  </Provider>,
);
```

### Migration

Since `effector-react/scope` is deprecated, it is better to migrate to effector-react by removing `scope` from import path.

```diff
+ import { Provider } from "effector-react";
- import { Provider } from "effector-react/scope";
```

> WARNING Continues migration:
>
> `effector-react` and `effector-react/scope` do not share any code, so you have to migrate all your code to `effector-react` in the same time, because otherwise you will get runtime errors. These errors will be thrown because `effector-react` and `effector-react/scope` will use different instances `Provider` and do not have access to each other's `Provider`.

If you use [Babel](https://babeljs.io/), you need to remove parameter reactSsr from `babel-plugin` configuration.

```diff
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
-        "reactSsr": true
      }
    ]
  ]
}
```

If you use SWC, you need to remove [`bindings.react.scopeReplace`](https://github.com/effector/swc-plugin#bindings) parameter from `@effector/swc-plugin` configuration.

```diff
{
  "$schema": "https://json.schemastore.org/swcrc",
  "jsc": {
    "experimental": {
      "plugins": [
        "@effector/swc-plugin",
        {
          "bindings": {
            "react": {
-             "scopeReplace": true
            }
          }
        }
      ]
    }
  }
}
```

### Scope Enforcement

All modern hooks of `effector-react` are designed to work with Scope. If you want to imitate the behavior of `effector-react/scope` module, you can use the second parameter of hooks with an option `forceScope: true`. In this case, the hook will throw an error if the Scope is not passed to Provider.

```diff
- import { useUnit } from 'effector-react/scope'
+ import { useUnit } from 'effector-react'


function Example() {
-  const { text } = useUnit({ text: $text })
+  const { text } = useUnit({ text: $text }, { forceScope: true })

  return <p>{text}</p>
}
```


# effector-react/compat

```ts
import {} from "effector-react/compat";
```

The library provides a separate module with compatibility up to IE11 and Chrome 47 (browser for Smart TV devices).

> WARNING Bundler, Not Transpiler:
>
> Since third-party libraries can import `effector-react` directly, you **should not** use transpilers like Babel to replace `effector-react` with `effector-react/compat` in your code because by default, Babel will not transform third-party code.
>
> **Use a bundler instead**, as it will replace `effector-react` with `effector-react/compat` in all modules, including those from third parties.

Since `effector-react` uses `effector` under the hood, you need to use the compat-version of `effector` as well. Please, read effector/compat for details.

### Required Polyfills

You need to install polyfills for these objects:

* `Promise`
* `Object.assign`
* `Array.prototype.flat`
* `Map`
* `Set`

In most cases, a bundler can automatically add polyfills.

#### Vite

<details>
<summary>Vite Configuration Example</summary>

```js
import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    legacy({
      polyfills: ["es.promise", "es.object.assign", "es.array.flat", "es.map", "es.set"],
    }),
  ],
});
```

</details>

## Usage

### Manual Usage

You can use it instead of the `effector-react` package if you need to support old browsers.

```diff
- import {useUnit} from 'effector-react'
+ import {useUnit} from 'effector-react/compat'
```

### Automatic Replacement

However, you can set up your bundler to automatically replace `effector` with `effector/compat` in your code.

#### Webpack

```js
module.exports = {
  resolve: {
    alias: {
      effector: "effector/compat",
      "effector-react": "effector-react/compat",
    },
  },
};
```

#### Vite

```js
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      effector: "effector/compat",
      "effector-react": "effector-react/compat",
    },
  },
});
```


# useEvent

```ts
import { useEvent } from "effector-react";
```

> INFO since:
>
> `useEvent` introduced in [effector-react 20.9.0](https://changelog.effector.dev/#effector-20-9-0)

> WARNING This is API is deprecated:
>
> Prefer useUnit hook instead.

Bind event to current  to use in dom event handlers.<br/>
Only `effector-react/scope` version works this way, `useEvent` of `effector-react` is a no-op and does not require `Provider` with scope.

> INFO Note:
>
> Useful only if you have server-side rendering or writing tests for React-components.

## Methods

### `useEvent(unit)`

#### Arguments

1. `unit` ( or ): Event or effect which will be bound to current `scope`

#### Returns

(Function): Function to pass to event handlers. Will trigger a given unit in the current scope.

#### Examples

##### Basic Usage

```jsx
import ReactDOM from "react-dom";
import { createEvent, createStore, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (counter) => counter + 1);

const App = () => {
  const count = useStore($count);
  const handleIncrement = useEvent(incremented);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => handleIncrement()}>increment</button>
    </>
  );
};

const scope = fork();

ReactDOM.render(
  <Provider value={scope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```

Try it

### `useEvent(shape)`

#### Arguments

1. `shape` Object or array of ( or ): Events or effects as values which will be bound to the current `scope`

#### Returns

(Object or Array): List of functions with the same names or keys as an argument to pass to event handlers. Will trigger a given unit in the current scope.

#### Examples

##### Object Usage

```jsx
import ReactDOM from "react-dom";
import { createStore, createEvent, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const incremented = createEvent();
const decremented = createEvent();

const $count = createStore(0);

$count.on(incremented, (counter) => counter + 1);
$count.on(decremented, (counter) => counter - 1);

const App = () => {
  const counter = useStore($count);
  const handler = useEvent({ incremented, decremented });
  // or
  const [handleIncrement, handleDecrement] = useEvent([incremented, decremented]);

  return (
    <>
      <p>Count: {counter}</p>
      <button onClick={() => handler.incremented()}>increment</button>
      <button onClick={() => handler.decremented()}>decrement</button>
    </>
  );
};

const scope = fork();

ReactDOM.render(
  <Provider value={scope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```


# useGate

```ts
import { useGate } from "effector-react";
```

## Methods

### `useGate(Gate, props?)`

Hook for passing data to .
#### Formulae

```ts
const CustomGate: Gate<T>;

useGate(CustomGate, props?: T): void;
```

#### Arguments

1. `Gate` (Gate\<T>)
2. `props` (`T`)

#### Returns

(`void`)

#### Examples

##### Basic

```js
import { createGate, useGate } from "effector-react";
import { Route } from "react-router";

const PageGate = createGate("page");

PageGate.state.watch(({ match }) => {
  console.log(match);
});

const Home = (props) => {
  useGate(PageGate, props);

  return <section>Home</section>;
};

const App = () => <Route component={Home} />;
```


# useList

```ts
import { useList } from "effector-react";
```

> INFO since:
>
> `useList` introduced in [effector-react 20.1.1](https://changelog.effector.dev/#effector-react-20-1-1)

Hook function for efficient rendering of list store.
Every item will be memoized and updated only when their data change.

## When should you use `useList`?

`useList` is designed to solve the specific task of efficiently rendering lists. With `useList`, you don’t need to manually set `key` for list components, and it implements a more optimized re-rendering process. If you feel that something else is needed, it means the feature has outgrown `useList`, and you should use useStoreMap. With `useStoreMap`, you can extract specific data from the store in an optimal way, especially if you don’t need the entire store, but only a part of it

## API

### `useList($store, fn)`

Using `index` as `key` for each element in the list.

#### Formulae

```ts
useList(
  $store: Store<T[]>,
  fn: (value: T, index: number) => React.ReactNode,
): React.ReactNode;
```

#### Arguments

1. `$store` (Store\<T>): Store with an array of items
2. `fn` (*Function*): Render function which will be called for every item in list

#### Returns

(`React.Node`)

#### Examples

##### Basic

```jsx
import { createStore } from "effector";
import { useList } from "effector-react";

const $users = createStore([
  { id: 1, name: "Yung" },
  { id: 2, name: "Lean" },
  { id: 3, name: "Kyoto" },
  { id: 4, name: "Sesh" },
]);

const App = () => {
  // we don't need keys here any more
  const list = useList($users, ({ name }, index) => (
    <li>
      [{index}] {name}
    </li>
  ));

  return <ul>{list}</ul>;
};
```

Try it

##### With store updates

```jsx
import { createStore, createEvent } from "effector";
import { useList, useUnit } from "effector-react";

const todoSubmitted = createEvent();
const todoToggled = createEvent();

const $todoList = createStore([
  { text: "write useList example", done: true },
  { text: "update readme", done: false },
]);

$todoList.on(todoToggled, (list, id) =>
  list.map((todo, index) => {
    if (index === id)
      return {
        ...todo,
        done: !todo.done,
      };
    return todo;
  }),
);

$todoList.on(todoSubmitted, (list, text) => [...list, { text, done: false }]);

todoSubmitted.watch((e) => {
  e.preventDefault();
});

const TodoList = () => {
  const [onTodoToggle] = useUnit([todoToggled]);
  return useList($todoList, ({ text, done }, index) => {
    const todo = done ? (
      <del>
        <span>{text}</span>
      </del>
    ) : (
      <span>{text}</span>
    );

    return <li onClick={() => onTodoToggle(index)}>{todo}</li>;
  });
};

const App = () => {
  const [onTodoSubmit] = useUnit([todoSubmitted]);

  function handleSubmit(e) {
    e.preventDefault();
    onTodoSubmit(e.currentTarget.elements.content.value);
  }

  return (
    <div>
      <h1>todo list</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="content">New todo</label>
        <input type="text" name="content" required />
        <input type="submit" value="Add" />
      </form>
      <ul>
        <TodoList />
      </ul>
    </div>
  );
};
```

Try it

### `useList($store, config)`

Used when you need to pass dependencies to react (to update items when some of its dependencies are changed).

By default, `useList` rerenders only when some of its items were changed.
However, sometimes we need to update items when some external value (e.g. props field or state of another store) changes.
In such case, we need to tell React about our dependencies and pass keys explicitly.

#### Formulae

```ts
useList(
  $store: Store<T[]>,
  config: {
    keys: any[],
    getKey?: (value: T) => React.Key,
    fn: (value: T, index: number) => React.ReactNode,
    placeholder?: React.ReactNode,
  }
): React.ReactNode;
```

#### Arguments

1. `$store` (Store\<T>): Store with an array of items
2. `config` (`Object`)
    * `keys` (`Array`): Array of dependencies, which will be passed to react by `useList`
    * `fn` (`(value: T) => React.ReactNode`): Render function which will be called for every item in list
    * `getKey` (`(value) => React.Key`): Optional function to compute key for every item of list
    * `placeholder` (`React.ReactNode`): Optional react node to render instead of an empty list

> INFO since:
>
> `getKey` option introduced in [effector-react@21.3.0](https://changelog.effector.dev/#effector-react-21-3-0)

> INFO since:
>
> `placeholder` option introduced in [effector-react@22.1.0](https://changelog.effector.dev/#effector-react-22-1-0)

#### Returns

(`React.Node`)

#### Examples

##### Basic

```jsx
import ReactDOM from "react-dom";
import { createEvent, createStore, restore } from "effector";
import { useUnit, useList } from "effector-react";

const renameUser = createEvent();

const $user = createStore("alice");
const $friends = createStore(["bob"]);

$user.on(renameUser, (_, name) => name);

const App = () => {
  const user = useUnit($user);

  return useList($friends, {
    keys: [user],
    fn: (friend) => (
      <div>
        {friend} is a friend of {user}
      </div>
    ),
  });
};

ReactDOM.render(<App />, document.getElementById("root"));
// => <div> bob is a friend of alice </div>

setTimeout(() => {
  renameUser("carol");
  // => <div> bob is a friend of carol </div>
}, 500);
```

Try it


# useProvidedScope

```ts
import { useProvidedScope } from "effector-react";
```

Low-level React Hook, which returns current Scope from Provider.

> WARNING This is a Low-Level API:
>
> The `useProvidedScope` hook is a low-level API for library developers and **is not intended to be used in production code** directly.
>
> For production `effector-react` usage, see the useUnit hook.

## Methods

### `useProvidedScope()`

#### Formulae

```ts
useProvidedScope(): Scope | null
```

#### Returns

(Scope | null) — if no Scope provided, returns `null`.

#### Examples

This hook can be used in library internals to handle various edge-cases, where `createWatch` and `scopeBind` APIs are also needed.

For production code usage, see the useUnit hook instead.

```tsx
const useCustomLibraryInternals = () => {
  const scope = useProvidedScope();

  // ...
};
```


# useStore

```ts
import { useStore } from "effector-react";
```

React hook, which subscribes to a store and returns its current value, so when the store is updated, the component will update automatically.

> WARNING This is API is deprecated:
>
> Prefer useUnit hook instead.

## Methods

### `useStore($store): State`

#### Formulae

```ts
useStore($store: Store<State>): State
```

#### Arguments

1. `$store`: Store

#### Returns

(*`State`*): The value from the store

#### Examples

```jsx
import { createStore } from "effector";
import { useStore, useEvent } from "effector-react";

const $counter = createStore(0);

const { incrementClicked, decrementClicked } = createApi($counter, {
  incrementClicked: (state) => state + 1,
  decrementClicked: (state) => state - 1,
});

const App = () => {
  const counter = useStore($counter);
  const [onIncrement, onDecrement] = useEvent([incrementClicked, decrementClicked]);

  return (
    <div>
      {counter}
      <button onClick={onIncrement}>Increment</button>
      <button onClick={onDecrement}>Decrement</button>
    </div>
  );
};
```

Try it


# useStoreMap

```ts
import { useStoreMap } from "effector-react";
```

> INFO since:
>
> `useStoreMap` introduced in [effector-react 19.1.2](https://changelog.effector.dev/#effector-react-19-1-2)

React hook, which subscribes to a store and transforms its value with a given function. The component will update only when the selector function result will change.

You can read the motivation in the [issue](https://github.com/effector/effector/issues/118).

> WARNING Important:
>
> When the selector function returns `undefined`, the hook will skip the state update.
> This can be problematic for example when working with optional properties. To handle such cases, use `defaultValue` option or transform `undefined` values in selector.

## Methods

### `useStoreMap($store, fn)`

> INFO since:
>
> Short version of `useStoreMap` introduced in [effector-react@21.3.0](https://changelog.effector.dev/#effector-react-21-3-0)

Common use case: subscribe to changes in selected part of store only

#### Formulae

```ts
useStoreMap(
  $store: Store<State>,
  fn: (state: State) => Result,
): Result
```

#### Arguments

1. `$store`: Source Store\<State>
2. `fn` (`(state: State) => Result`): Selector function to receive part of source store

#### Returns

(`Result`): Value from the `fn` function call.

#### Examples

TBD

### `useStoreMap(config)`

Overload used when you need to pass dependencies to react (to update items when some of its dependencies are changed)

#### Formulae

```ts
useStoreMap({
  store: Store<State>,
  keys: any[],
  fn: (state: State, keys: any[]) => Result,
  updateFilter?: (newResult: Result, oldResult: Result) => boolean,
  defaultValue?: Result,
}): Result;
```

#### Arguments

1. `config` (*Object*): Configuration object
    * `store`: Source Store\<State>
    * `keys` (*Array*): This argument will be passed to React.useMemo to avoid unnecessary updates
    * `fn` (`(state: State, keys: any[]) => Result`): Selector function to receive part of source store
    * `updateFilter` (`(newResult, oldResult) => boolean`): *Optional* function used to compare old and new updates to prevent unnecessary rerenders. Uses createStore updateFilter option under the hood
    * `defaultValue`: Optional default value, used whenever `fn` returns undefined

> INFO since:
>
> `updateFilter` option introduced in [effector-react@21.3.0](https://changelog.effector.dev/#effector-react-21-3-0)

> INFO since:
>
> `defaultValue` option introduced in [effector-react@22.1.0](https://changelog.effector.dev/#effector-react-22-1-0)

#### Returns

(`Result`): Value from the `fn` function call, or the `defaultValue`.

#### Examples

##### Basic

This hook is useful for working with lists, especially with large ones

```jsx
import { createStore } from "effector";
import { useList, useStoreMap } from "effector-react";

const usersRaw = [
  {
    id: 1,
    name: "Yung",
  },
  {
    id: 2,
    name: "Lean",
  },
  {
    id: 3,
    name: "Kyoto",
  },
  {
    id: 4,
    name: "Sesh",
  },
];

const $users = createStore(usersRaw);
const $ids = createStore(usersRaw.map(({ id }) => id));

const User = ({ id }) => {
  const user = useStoreMap({
    store: $users,
    keys: [id],
    fn: (users, [userId]) => users.find(({ id }) => id === userId) ?? null,
  });

  return (
    <div>
      <strong>[{user.id}]</strong> {user.name}
    </div>
  );
};

const UserList = () => {
  return useList($ids, (id) => <User id={id} />);
};
```

Try it


# useUnit

```ts
import { useUnit } from "effector-react";
```

> INFO since:
>
> `useUnit` introduced in [effector-react 22.1.0](https://changelog.effector.dev/#effector-react-22-1-0)

React hook, which takes any unit or shape of units.

In the case of stores, it subscribes the component to the provided store and returns its current value, so when the store updates, the component will update automatically.

In the case of events/effects – it binds to the current  to use in DOM event handlers.
Only the `effector-react/scope` version works this way; the `useUnit` of `effector-react` is no-op for events and does not require a `Provider` with scope.

## Methods

### `useUnit(unit)`

Creates function that calls original unit but bounded to Scope if provided.

#### Formulae

```ts
useUnit(event: EventCallable<T>): (payload: T) => T;
useUnit(effect: Effect<Params, Done, any>): (payload: Params) => Promise<Done>;
```

#### Arguments

1. `unit` (EventCallable\<T> or Effect\<Params, Done, Fail>): Event or effect which will be bound to the current `scope`.

#### Returns

(Function): Function to pass to event handlers. Will trigger the given unit in the current scope.

#### Examples

##### Basic

```jsx
import { createEvent, createStore, fork } from "effector";
import { useUnit, Provider } from "effector-react";
import { render } from "react-dom";

const incrementClicked = createEvent();
const $count = createStore(0);

$count.on(incrementClicked, (count) => count + 1);

const App = () => {
  const [count, onIncrement] = useUnit([$count, incrementClicked]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => onIncrement()}>increment</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```

### `useUnit($store)`

Reads value from the `$store` and rerenders component when `$store` updates in Scope if provided.

#### Formulae

```ts
useUnit($store: Store<T>): T;
```

#### Arguments

1. `$store`: effector ()

#### Returns

Current value of the store.

#### Examples

##### Basic

```js
import { createStore, createApi } from "effector";
import { useUnit } from "effector-react";

const $counter = createStore(0);

const { incrementClicked, decrementClicked } = createApi($counter, {
  incrementClicked: (count) => count + 1,
  decrementClicked: (count) => count - 1,
});

const App = () => {
  const counter = useUnit($counter);
  const [onIncrement, onDecrement] = useUnit([incrementClicked, decrementClicked]);

  return (
    <div>
      {counter}
      <button onClick={onIncrement}>Increment</button>
      <button onClick={onDecrement}>Decrement</button>
    </div>
  );
};
```

### `useUnit(shape)`

#### Formulae

```ts
useUnit({ a: Store<A>, b: Event<B>, ... }): { a: A, b: (payload: B) => B; ... }

useUnit([Store<A>, Event<B>, ... ]): [A, (payload: B) => B, ... ]
```

#### Arguments

1. `shape`: Object or array of (EventCallable, Effect, or Store)

#### Returns

(`Object` or `Array`):

* If passed `EventCallable` or `Effect`: Functions with the same names or keys as the argument to pass to event handlers. Will trigger the given unit in the current scope. <br/>
  *Note: events or effects will be bound to `Scope` **only** if component wrapped into Provider.*
* If passed `Store`: The current value of the store.

#### Examples

##### Basic

```jsx
import { createStore, createEvent, fork } from "effector";
import { useUnit, Provider } from "effector-react";

const incremented = createEvent();
const decremented = createEvent();

const $count = createStore(0);

$count.on(incremented, (count) => count + 1);
$count.on(decremented, (count) => count - 1);

const App = () => {
  const count = useUnit($count);
  const on = useUnit({ incremented, decremented });
  // or
  const [a, b] = useUnit([incremented, decremented]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => on.incremented()}>increment</button>
      <button onClick={() => on.decremented()}>decrement</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```


# Effector Solid Gate

*Gate* is a hook for conditional rendering, based on current value (or values) in props.
An example of a problem that Gate can solve – you can put together all required data when component was mounted, or show another component if there is not enough data in props.
Gate also looks good for Routing or animation.

This allows you to send props back to *Store* to create a feedback loop.

Gate can be used via the useGate hook or as a component with props (`<Gate history={history} />`).
Gate stores and events can be used in the application as regular units.

Gate can have two states:

* **Open**, which means mounted
* **Closed**, which means unmounted

## Properties

### `.state` Store

> WARNING Important:
>
> Do not modify the `state` value! It is a derived store and should be kept in a predictable state.

`Store<Props>`: Derived Store with the current state of the given gate. The state comes from the second argument of useGate and from props when rendering the gate as a component.

### `.open` Event

> INFO Important:
>
> Do not manually call this event. It is an event that depends on a Gate's state.

Event: Event which will be called during the gate's mounting.

### `.close` Event

> INFO Important:
>
> Do not manually call this event. It is an event that depends on a Gate's state.

Event: Event which will be called during the gate's unmounting.

### `.status` Store

> WARNING Important:
>
> Do not modify the `status` value! It is a derived store and should be in a predictable state.

`Store<boolean>`: Boolean Derived Store, which shows if the given gate is mounted.


# createGate

## Methods

### `createGate(config)`

#### Formulae

```ts
createGate(config): Gate
```

#### Arguments

`config` (*Object*): Optional configuration object

* `defaultState?`: Optional default state for Gate.state
* `domain?` (\[*Domain*]/apieffector/Domain)): Optional domain which will be used to create gate units (Gate.open event, Gate.state store and so on)
* `name?` (*string*): Optional name which will be used as name of a created Solid component

#### Returns



#### Examples

TBD

### `createGate(name?)`

#### Formulae

```ts
createGate(name): Gate
```

#### Arguments

1. `name?` (*string*): Optional name which will be used as name of a created Solid component

#### Returns



#### Examples

##### Basic usage

```js
import { createGate } from "effector-solid";
import { render } from "solid-js/web";

const Gate = createGate("gate with props");

const App = () => (
  <section>
    <Gate foo="bar" />
  </section>
);

Gate.state.watch((state) => {
  console.log("current state", state);
});
// => current state {}

const unmount = render(() => <App />, document.getElementById("root"));
// => current state {foo: 'bar'}

unmount();
// => current state {}
```


# effector-solid

Effector bindings for SolidJS.

## Reactive Helpers

* useUnit(unit)
* useStoreMap({ store, keys, fn })

## Gate API

* Gate
* createGate()
* useGate(GateComponent, props)

## Import Map

Package `effector-solid` provides couple different entry points for different purposes:

* effector-solid/scope


# effector-solid/scope

```ts
import {} from "effector-solid/scope";
```

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) the core team recommends using the main module of `effector-solid` instead.

Provides all exports from effector-solid, but enforces the application to use Scope for all components.

### Usage

You can use this module in the same way as effector-solid, but it will require passing Scope to Provider component.

```jsx
// main.js
import { fork } from "effector";
import { Provider } from "effector-solid/scope";
import { render } from "solid-js/web";

const scope = fork();

render(
  <Provider value={scope}>
    <Application />
  </Provider>,
  document.getElementById("root"),
);
```

### Migration

Since `effector-solid/scope` is deprecated, it is recommended to migrate to effector-solid by removing `scope` from the import path.

```diff
+ import { Provider } from "effector-solid";
- import { Provider } from "effector-solid/scope";
```

> WARNING Continued migration:
>
> `effector-solid` and `effector-solid/scope` do not share any code, so you have to migrate all your code to `effector-solid` at the same time, because otherwise, you will get runtime errors. These errors will occur because `effector-solid` and `effector-solid/scope` will use different instances of `Provider` and do not have access to each other's `Provider`.

### Scope enforcement

All modern hooks of `effector-solid` are designed to work with Scope. If you want to imitate the behavior of the `effector-solid/scope` module, you can pass a second parameter to hooks with an option `forceScope: true`. In this case, the hook will throw an error if the Scope is not passed to Provider.

```diff
- import { useUnit } from 'effector-solid/scope'
+ import { useUnit } from 'effector-solid'


function MyComponent() {
-  const { test } = useUnit({ text: $text })
+  const { test } = useUnit({ text: $text }, { forceScope: true })

  return <p>{text}</p>
}
```


# useGate

```ts
import { useGate } from "effector-solid";
```

Function for passing data to .

## Methods

### `useGate(Gate, props)`

#### Formulae

```ts
useGate(Gate: Gate<Props>, props: Props): void;
```

#### Arguments

1. `Gate` (Gate\<Props>)
2. `props` (*Props*)

#### Returns

(`void`)

#### Examples

##### Basic Usage

```jsx
import { createGate, useGate } from "effector-solid";
import { Route, Routes } from "solid-app-router";

const PageGate = createGate("page");

const Home = (props) => {
  useGate(PageGate, props);
  return <section>Home</section>;
};

PageGate.state.watch(({ match }) => {
  console.log(match);
});

const App = () => (
  <Routes>
    <Route element={<Home />} />
  </Routes>
);
```


# useStoreMap

```ts
import { useStoreMap } from "effector-solid";
```

## Methods

### `useStoreMap($store, fn)`

Function, which subscribes to a store and transforms its value with a given function. Signal will update only when the selector function result will change.

Common use case: subscribe to changes in selected part of store only.

#### Formulae

```ts
useStoreMap(
  $store: Store<State>,
  fn: (state: State) => Result,
): Accessor<Result>;
```

#### Arguments

1. `$store`: Source Store\<T>
2. `fn` (`(state: T) => Result`): Selector function to receive part of source store

#### Returns

(`Result`)

#### Examples

TBD

### `useStoreMap(config)`

#### Formulae

```ts
useStoreMap({
  store: Store<State>,
  keys: any[],
  fn: (state: State, keys: any[]) => Result,
  updateFilter? (newResult, oldResult) => boolean,
}): Result;
```

#### Arguments

1. `params` (*Object*): Configuration object
    * `store`: Source store
    * `keys` (*Array*): Will be passed to `fn` selector
    * `fn` (*(state, keys) => result*): Selector function to receive part of the source store
    * `updateFilter` (*(newResult, oldResult) => boolean*): *Optional* function used to compare old and new updates to prevent unnecessary rerenders. Uses createStore updateFilter option under the hood

#### Returns

(`Accessor<Result>`)

#### Examples

This hook is very useful for working with lists, especially large ones.

```jsx
import { createStore } from "effector";
import { useUnit, useStoreMap } from "effector-solid";
import { For } from "solid-js/web";

const usersRaw = [
  {
    id: 1,
    name: "Yung",
  },
  {
    id: 2,
    name: "Lean",
  },
  {
    id: 3,
    name: "Kyoto",
  },
  {
    id: 4,
    name: "Sesh",
  },
];

const $users = createStore(usersRaw);
const $ids = createStore(usersRaw.map(({ id }) => id));

const User = ({ id }) => {
  const user = useStoreMap({
    store: $users,
    keys: [id],
    fn: (users, [userId]) => users.find(({ id }) => id === userId) ?? null,
  });

  return (
    <div>
      <strong>[{user()?.id}]</strong> {user()?.name}
    </div>
  );
};

const UserList = () => {
  const ids = useUnit($ids);

  return <For each={ids()}>{(id) => <User key={id} id={id} />}</For>;
};
```


# useUnit

```ts
import { useUnit } from "effector-solid";
```

Binds effector stores to the Solid reactivity system or, in the case of events/effects – binds to current  to use in dom event handlers.
Only `effector-solid/scope` version works this way, `useUnit` of `effector-solid` is no-op for events and does not require `Provider` with scope.

## Methods

### `useUnit(unit)`

#### Arguments

```ts
useUnit(event: EventCallable<T>): (payload: T) => T;
useUnit(effect: Effect<Params, Done, any>): (payload: Params) => Promise<Done>;
```

#### Arguments

1. `unit` (EventCallable\<T> or Effect\<Params, Done, Fail>): Event or effect which will be bound to current `scope`.

#### Returns

(`Function`): Function to pass to event handlers. Will trigger the given unit in the current scope.

#### Example

A basic Solid component using `useUnit` with events and stores.

```jsx
import { render } from "solid-js/web";
import { createEvent, createStore, fork } from "effector";
import { useUnit, Provider } from "effector-solid";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (count) => count + 1);

const App = () => {
  const [count, handleIncrement] = useUnit([$count, incremented]);

  return (
    <>
      <p>Count: {count()}</p>
      <button onClick={() => handleIncrement()}>Increment</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```

### `useUnit(store)`

#### Formulae

```ts
useUnit($store: Store<State>): Accessor<State>;
```

#### Arguments

1. `$store` effector ().

#### Returns

(`Accessor<State>`) which will subscribe to store state.

#### Example

```jsx
import { createStore, createApi } from "effector";
import { useUnit } from "effector-solid";

const $counter = createStore(0);

const { incremented, decremented } = createApi($counter, {
  incremented: (count) => count + 1,
  decremented: (count) => count - 1,
});

const App = () => {
  const counter = useUnit($counter);
  const [handleIncrement, handleDecrement] = useUnit([incremented, decremented]);

  return (
    <div>
      {counter()}
      <button onClick={incremented}>Increment</button>
      <button onClick={decremented}>Decrement</button>
    </div>
  );
};
```

### `useUnit(shape)`

#### Formulae

```ts
useUnit({ a: Store<A>, b: Event<B>, ... }): { a: Accessor<A>, b: (payload: B) => B; ... }

useUnit([Store<A>, Event<B>, ... ]): [Accessor<A>, (payload: B) => B, ... ]
```

#### Arguments

1. `shape` Object or array of (EventCallable, Effect, or Store): Events, or effects, or stores as accessors which will be bound to the current `scope`.

#### Returns

(`Object` or `Array`):

* If `EventCallable` or `Effect`: functions with the same names or keys as argument to pass to event handlers. Will trigger given unit in current scope *Note: events or effects will be bound **only** if `useUnit` is imported from `effector-solid/scope`*.
* If `Store`: accessor signals which will subscribe to the store state.

#### Examples

```jsx
import { render } from "solid-js/web";
import { createStore, createEvent, fork } from "effector";
import { useUnit, Provider } from "effector-solid/scope";

const incremented = createEvent();
const decremented = createEvent();

const $count = createStore(0)
  .on(incremented, (count) => count + 1)
  .on(decremented, (count) => count - 1);

const App = () => {
  const count = useUnit($count);
  const on = useUnit({ incremented, decremented });
  // or
  const [a, b] = useUnit([incremented, decremented]);

  return (
    <>
      <p>Count: {count()}</p>
      <button onClick={() => on.incremented()}>Increment</button>
      <button onClick={() => on.decremented()}>Decrement</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```


# ComponentOptions

## ComponentOptions (Vue2)

### `effector`

#### Returns

(*`Function | Object | Store`*): `Store` or object of `Store`'s, or function which will be called with the Component instance as `this`.

#### Examples

##### Basic Usage

```js
import Vue from "vue";
import { createStore, combine } from "effector";

const counter = createStore(0);

new Vue({
  data() {
    return {
      foo: "bar",
    };
  },
  effector() {
    // would create `state` in template
    return combine(
      this.$store(() => this.foo),
      counter,
      (foo, counter) => `${foo} + ${counter}`,
    );
  },
});
```

##### Using Object Syntax

```js
import { counter } from "./stores";

new Vue({
  effector: {
    counter, // would create `counter` in template
  },
});
```

##### Using Store Directly

```js
import { counter } from "./stores";

new Vue({
  effector: counter, // would create `state` in template
});
```


# EffectorScopePlugin

The Plugin provides a general scope which needs for read and update effector's stores, call effector's events. Required for SSR.

## Plugins

### `EffectorScopePlugin({ scope, scopeName })`

#### Arguments

1. `scope` Scope
2. `scopeName?` custom scopeName (default: `root`)

#### Examples

##### Basic Usage

```js
import { createSSRApp } from "vue";
import { EffectorScopePlugin } from "effector-vue";
import { fork } from "effector";

const app = createSSRApp(AppComponent);
const scope = fork();

app.use(
  EffectorScopePlugin({
    scope,
    scopeName: "app-scope-name",
  }),
);
```


# Effector Vue Gate

*Gate* is a hook for conditional rendering, based on current value (or values) in props. An example of a problem that Gate can solve – you can put together all required data, when component was mounted.

This allows you to send props back to *Store* to create feedback loop.

Gate can be used via useGate hook. Gate stores and events can be used in the application as regular units

Gate can have two states:

* **Open**, which means mounted
* **Closed**, which means unmounted

## Gate Properties

### `.state`

> WARNING Important:
>
> Do not modify `state` value! It is derived store and should be in predictable state.

`Store<Props>`: DerivedStore with current state of the given gate. The state comes from the second argument of useGate and from props when rendering gate as a component.

### `.open`

> INFO Important:
>
> Do not manually call this event. It is an event that depends on a Gate state.

Event: Event which will be called during gate mounting

### `.close`

> INFO Important:
>
> Do not manually call this event. It is an event that depends on a Gate state.

Event: Event which will be called during a gate unmounting.

### `.status`

> WARNING Important:
>
> Do not modify `status` value! It is derived store and should be in predictable state.

`Store<boolean>`: Boolean DerivedStore, which show if given gate is mounted.


# VueEffector

```ts
import { VueEffector } from "effector-vue/options-vue3";
```

`effector-vue` plugin for vue 3 creates a mixin that takes a binding function from the effector option.

## Methods

### `VueEffector(app)`

#### Arguments

1. `app` (*instance Vue*): Vue instance

#### Returns

(*`void`*)

#### Examples

##### Installation plugin

```js
import { createApp } from "vue";
import { VueEffector } from "effector-vue/options-vue3";

import App from "./App.vue";

const app = createApp(App);

app.use(VueEffector);
```

##### Effector options

```html
<template>
  <div>
    <span v-if="createPending">loading...</span>
    <p>{{ user.name }}</p>
    ...
    <button @click="create">Create<button>
  </div>
</template>
```

```js
import { $user, create, createFx } from 'model'

export default {
  name: 'VueComponent',
  effector: () => ({
    user: $user,
    createDone: createFx.done,
    createPending: createFx.pending,
  }),
  watch: {
    createDone() {
      // do something after the effect is done
    }
  },
  methods: {
    create, // template binding
    createFx,
  },
  ...
}
```


# VueEffector

```ts
import { VueEffector } from "effector-vue";
```

`effector-vue` plugin for vue 2

## Methods

### `VueEffector(Vue, options?)`

#### Arguments

1. `Vue` (*class Vue*): Vue class
2. `options` (*Object*): Plugin options

* TBD

#### Returns

(*`void`*)

#### Examples

```js
import Vue from "vue";
import { VueEffector } from "effector-vue";

Vue.use(VueEffector);
```


# VueSSRPlugin

The Plugin provides a general scope which needs for read and update effector's stores, call effector's events. Required for SSR.

## Plugins

### `VueSSRPlugin({ scope, scopeName })`

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) `VueSSRPlugin` is deprecated. Use EffectorScopePlugin instead.

### Arguments

1. `scope` Scope
2. `scopeName?` custom scopeName (default: `root`)

### Examples

#### Basic usage

```js
import { createSSRApp } from "vue";
import { VueSSRPlugin } from "effector-vue/ssr";
import { fork } from "effector";

const app = createSSRApp(AppComponent);
const scope = fork();

app.use(
  VueSSRPlugin({
    scope,
    scopeName: "app-scope-name",
  }),
);
```


# createComponent

## Methods

### `createComponent(options, store?)`

#### Arguments

1. `options` (*Object*): component options (hooks, methods, computed properties)
2. `store` (*Object*): Store object from effector

#### Returns

(*`vue component`*)

#### Example

```html
<template> {{ $counter }} </template>
```

```js
// component.vue
import { createComponent } from "effector-vue";

const $counter = createStore(0);
const { update } = createApi($counter, {
  update: (_, value: number) => value,
});

export default createComponent(
  {
    name: "Counter",

    methods: {
      update,
      handleClick() {
        const value = this.$counter + 1; // this.$counter <- number ( typescript tips )
        this.update(value);
      },
    },
  },
  { $counter },
);
```


# createGate

Creates a  to consume data from view, designed for vue 3. If `defaultState` is defined, Gate.state will be created with passed value.

## Methods

### `createGate(config?: {defaultState?, domain?, name?})`

#### Arguments

`config` (*Object*): Optional configuration object

* `defaultState?`: Optional default state for Gate.state
* `domain?` (): Optional domain which will be used to create gate units (Gate.open event, Gate.state store, and so on)
* `name?` (*string*): Optional name which will be used as the name of a created Vue component

#### Returns



#### Examples

##### Basic Usage

```js
import { createGate, useGate } from "effector-vue/composition";

const ListGate = createGate({
  name: "Gate with required props",
});

const ListItem = {
  template: `
    <div>
      {{id}}
    </div>
  `,
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    useGate(ListGate, () => props.id);
  },
};

const app = {
  template: `
    <div>
      <ListItem :id="id" />
    </div>
  `,
  components: {
    ListItem,
  },
  setup() {
    const id = ref("1");
    return { id };
  },
};

Gate.state.watch((state) => {
  console.log("current state", state);
});
// => current state null

app.mount("#app");
// => current state 1

app.unmount();
// => current state null
```


# effector-vue

Effector binginds for Vue.

## Top-Level Exports

* VueEffector(Vue, options?)
* createComponent(ComponentOptions, store?)
* EffectorScopePlugin({scope, scopeName?})

## ComponentOptions API

* ComponentOptions\<V>

## Hooks

* useUnit(shape)
* useStore(store)
* useStoreMap({store, keys, fn})
* useVModel(store)

## Gate API

* Gate
* createGate()
* useGate(GateComponent, props)

## Import map

Package `effector-vue` provides couple different entry points for different purposes:

* effector-vue/composition
* effector-vue/ssr


# effector-vue/composition

```ts
import {} from "effector-vue/composition";
```

Provides additional API for effector-vue that allows to use [Composition API](https://v3.vuejs.org/guide/composition-api-introduction.html)

### APIs

* useUnit(shape)
* useStore($store)
* useStoreMap({ store, keys, fn })
* useVModel($store)


# effector-vue/ssr

```ts
import {} from "effector-vue/ssr";
```

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) the core team recommends using main module of `effector-vue` of `effector-vue/composition` instead.

Provides additional API for effector-vue that enforces library to use Scope

### APIs

* useEvent(event)
* VueSSRPlugin


# useEvent

```ts
import { useEvent } from "effector-vue/ssr";
```

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) `useEvent` is deprecated. Use useUnit instead.

Bind event to current fork instance to use in dom event handlers. Used **only** with ssr, in application without forks `useEvent` will do nothing

## Methods

### `useEvent(unit)`

#### Arguments

1. `unit` ( or ): Event or effect which will be bound to current `scope`

#### Returns

(`Function`): Function to pass to event handlers. Will trigger a given unit in current scope

#### Examples

##### Basic

```js
import { createStore, createEvent } from "effector";
import { useEvent } from "effector-vue/ssr";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (x) => x + 1);

export default {
  setup() {
    const counter = useStore($count);
    const onIncrement = useEvent(incremented);

    return {
      onIncrement,
      counter,
    };
  },
};
```


# useGate

```ts
import { useGate } from "effector-vue/composition";
```

## Methods

### `useGate(Gate, props)`

Using a Gate to consume data from view. Designed for Vue 3

#### Arguments

1. `Gate<Props>` ()
2. `props` (*Props*)

#### Returns

(*`void`*)

#### Examples

See example


# useStore

```ts
import { useStore } from "effector-vue/composition";
```

A hook function, which subscribes to watcher, that observes changes in the current **readonly** store, so when recording results, the component will update automatically. You can mutate the store value **only via createEvent**. Designed for vue 3

### `useStore($store)`

#### Arguments

1. `$store` (Store\<State>)

#### Returns

(`readonly(State)`)

#### Example

```js
import { createStore, createApi } from "effector";
import { useStore } from "effector-vue/composition";

const $counter = createStore(0);

const { incremented, decremented } = createApi($counter, {
  incremented: (count) => count + 1,
  decremented: (count) => count - 1,
});

export default {
  setup() {
    const counter = useStore($counter);

    return {
      counter,
      incremented,
      decremented,
    };
  },
};
```


# useStoreMap

```ts
import { useStoreMap } from "effector-vue/composition";
```

Function, which subscribes to store and transforms its value with a given function. Signal will update only when the selector function result will change

## Methods

### `useStoreMap($store, fn)`

#### Formulae

```ts
useStoreMap(
  $store: Store<State>,
  fn: (state: State) => Result,
): ComputedRef<Result>;
```

#### Arguments

1. `$store`: Source Store\<State>
2. `fn` (*(state) => result*): Selector function to receive part of source store

#### Returns

(`ComputedRef<Result>`)

### `useStoreMap(config)`

#### Formulae

```ts
useStoreMap({
  store: Store<State>,
  keys?: () => Keys,
  fn: (state: State, keys: Keys) => Result,
  defaultValue?: Result,
}): ComputedRef<Result>;
```

#### Arguments

1. `params` (*Object*): Configuration object
    * `store`: Source store
    * `keys` (`() => Keys`): Will be passed to `fn` selector
    * `fn` (`(state: State, keys: Keys) => Result`): Selector function to receive part of source store
    * `defaultValue` (`Result`): Optional default value if `fn` returned `undefined`

#### Returns

(`ComputedRef<Result>`)

#### Examples

This hook is very useful for working with lists, especially with large ones

###### User.vue

```js
import { createStore } from "effector";
import { useUnit, useStoreMap } from "effector-vue/composition";

const $users = createStore([
  {
    id: 1,
    name: "Yung",
  },
  {
    id: 2,
    name: "Lean",
  },
  {
    id: 3,
    name: "Kyoto",
  },
  {
    id: 4,
    name: "Sesh",
  },
]);

export default {
  props: {
    id: Number,
  },
  setup(props) {
    const user = useStoreMap({
      store: $users,
      keys: () => props.id,
      fn: (users, userId) => users.find(({ id }) => id === userId),
    });

    return { user };
  },
};
```

```jsx
<div>
  <strong>[{user.id}]</strong> {user.name}
</div>
```

###### App.vue

```js
const $ids = createStore(data.map(({ id }) => id));

export default {
  setup() {
    const ids = useStore($ids);

    return { ids };
  },
};
```

```jsx
<div>
  <User v-for="id in ids" :key="id" :id="id" />
</div>
```


# useUnit

```ts
import { useUnit } from "effector-vue/composition";
```

Bind  to Vue reactivity system or, in the case of / - bind to current  to use in DOM event handlers.

**Designed for Vue 3 and Composition API exclusively.**

> INFO Future:
>
> This API can completely replace the following APIs:
>
> * useStore($store)
> * useEvent(event)
>
> In the future, these APIs can be deprecated and removed.

## Methods

### `useUnit(unit)`

#### Arguments

1. `unit` ( or ): Event or effect which will be bound to current

#### Returns

(`Function`): Function to pass to event handlers. Will trigger given unit in current scope

#### Examples

##### Basic Usage

```js
// model.js
import { createEvent, createStore, fork } from "effector";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (count) => count + 1);
```

```html
// App.vue

<script setup>
  import { useUnit } from "effector-vue/composition";

  import { incremented, $count } from "./model.js";

  const onClick = useUnit(incremented);
</script>

<template>
  <button @click="onClick">increment</button>
</template>
```

#### `useUnit($store)`

##### Arguments

1. `$store` (): Store which will be bound to Vue reactivity system

##### Returns

Reactive value of given

##### Examples

###### Basic Usage

```js
// model.js
import { createEvent, createStore, fork } from "effector";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (count) => count + 1);
```

```html
// App.vue

<script setup>
  import { useUnit } from "effector-vue/composition";

  import { $count } from "./model.js";

  const count = useUnit($count);
</script>

<template>
  <p>Count: {{ count }}</p>
</template>
```

#### `useUnit(shape)`

##### Arguments

1. `shape` Object or array of ( or  or ): Every unit will be processed by `useUnit` and returned as a reactive value in case of  or as a function to pass to event handlers in case of  or .

##### Returns

(Object or Array):

* if  or : functions with the same names or keys as argument to pass to event handlers. Will trigger given unit in current .
* if : reactive value of given  with the same names or keys as argument.

##### Examples

###### Basic Usage

```js
// model.js
import { createEvent, createStore, fork } from "effector";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (count) => count + 1);
```

```html
// App.vue

<script setup>
  import { useUnit } from "effector-vue/composition";

  import { $count, incremented } from "./model.js";

  const { count, handleClick } = useUnit({ count: $count, handleClick: incremented });
</script>

<template>
  <p>Count: {{ count }}</p>
  <button @click="handleClick">increment</button>
</template>
```


# useVModel

```ts
import { useVModel } from "effector-vue/composition";
```

A hook function, which subscribes to a watcher that observes changes in the current store, so when recording results, the component will automatically update. It is primarily used when working with forms (`v-model`) in Vue 3.

## Methods

### `useVModel($store)`

#### Formulae

```ts
useVModel($store: Store<State>): Ref<UnwrapRef<State>>;
```

Designed for Vue 3.

#### Arguments

1. `$store` ()
2. `shape of Stores` ()

#### Returns

(`State`)

#### Examples

##### Single Store

```js
import { createStore, createApi } from "effector";
import { useVModel } from "effector-vue/composition";

const $user = createStore({
  name: "",
  surname: "",
  skills: ["CSS", "HTML"],
});

export default {
  setup() {
    const user = useVModel($user);

    return { user };
  },
};
```

```html
<div id="app">
  <input type="text" v-model="user.name" />
  <input type="text" v-model="user.surname" />

  <div>
    <input type="checkbox" v-model="user.skills" value="HTML" />
    <input type="checkbox" v-model="user.skills" value="CSS" />
    <input type="checkbox" v-model="user.skills" value="JS" />
  </div>
</div>
```

##### Store Shape

```js
import { createStore, createApi } from "effector";
import { useVModel } from "effector-vue/composition";

const $name = createStore("");
const $surname = createStore("");
const $skills = createStore([]);

const model = {
  name: $name,
  surname: $surname,
  skills: $skills,
};

export default {
  setup() {
    const user = useVModel(model);

    return { user };
  },
};
```

```html
<div id="app">
  <input type="text" v-model="user.name" />
  <input type="text" v-model="user.surname" />

  <div>
    <input type="checkbox" v-model="user.skills" value="HTML" />
    <input type="checkbox" v-model="user.skills" value="CSS" />
    <input type="checkbox" v-model="user.skills" value="JS" />
  </div>
</div>
```


# Domain

```ts
import { type Domain } from "effector";
```

Domain is a namespace for your events, stores and effects.

Domain can subscribe to event, effect, store or nested domain creation with `onCreateEvent`, `onCreateStore`, `onCreateEffect`, `onCreateDomain` methods.

It is useful for logging or other side effects.

## Unit creators

> INFO since:
>
> [effector 20.7.0](https://changelog.effector.dev/#effector-20-7-0)

### `createEvent(name?)`

#### Arguments

1. `name`? (*string*): event name

#### Returns

: New event

### `createEffect(handler?)`

Creates an effect with given handler.

#### Arguments

1. `handler`? (*Function*): function to handle effect calls, also can be set with use(handler)

#### Returns

: A container for async function.

> INFO since:
>
> [effector 21.3.0](https://changelog.effector.dev/#effector-21-3-0)

### `createEffect(name?)`

#### Arguments

1. `name`? (*string*): effect name

#### Returns

: A container for async function.

### `createStore(defaultState)`

#### Arguments

1. `defaultState` (*State*): store default state

#### Returns

: New store

### `createDomain(name?)`

#### Arguments

1. `name`? (*string*): domain name

#### Returns

: New domain

### Aliases

#### `event(name?)`

An alias for domain.createEvent

#### `effect(name?)`

An alias for domain.createEffect

#### `store(defaultState)`

An alias for domain.createStore

#### `domain(name?)`

An alias for domain.createDomain

## Domain Properties

### `.history`

Contains mutable read-only sets of units inside a domain.

> INFO since:
>
> [effector 20.3.0](https://changelog.effector.dev/#effector-20-3-0)

#### Formulae

```ts
interface DomainHistory {
  stores: Set<Store<any>>;
  events: Set<Event<any>>;
  domains: Set<Domain>;
  effects: Set<Effect<any, any, any>>;
}

const { stores, events, domains, effects } = domain.history;
```

When any kind of unit created inside a domain, it appears in a set with the name of type(stores, events, domains, effects) in the same order as created.

#### Examples

##### Basic

```js
import { createDomain } from "effector";
const domain = createDomain();
const eventA = domain.event();
const $storeB = domain.store(0);
console.log(domain.history);
// => {stores: Set{storeB}, events: Set{eventA}, domains: Set, effects: Set}
```

Try it

## Domain hooks

### `onCreateEvent(callback)`

#### Formulae

```ts
domain.onCreateEvent((event: Event<any>) => {});
```

* Function passed to `onCreateEvent` called every time, as new event created in `domain`
* Function called with `event` as first argument
* The result of function call is ignored

#### Arguments

1. `callback` ([*Watcher*][_Watcher_]): A function that receives Event and will be called during every domain.createEvent call

#### Returns

[*Subscription*][_Subscription_]: Unsubscribe function.

#### Example

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateEvent((event) => {
  console.log("new event created");
});

const a = domain.createEvent();
// => new event created

const b = domain.createEvent();
// => new event created
```

Try it

### `onCreateEffect(callback)`

#### Formulae

```ts
domain.onCreateEffect((effect: Effect<any, any, any>) => {});
```

* Function passed to `onCreateEffect` called every time, as new effect created in `domain`
* Function called with `effect` as first argument
* The result of function call is ignored

#### Arguments

1. `callback` ([*Watcher*][_Watcher_]): A function that receives Effect and will be called during every domain.createEffect call

#### Returns

[*Subscription*][_Subscription_]: Unsubscribe function.

#### Example

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateEffect((effect) => {
  console.log("new effect created");
});

const fooFx = domain.createEffect();
// => new effect created

const barFx = domain.createEffect();
// => new effect created
```

Try it

### `onCreateStore(callback)`

#### Formulae

```ts
domain.onCreateStore(($store: Store<any>) => {});
```

* Function passed to `onCreateStore` called every time, as new store created in `domain`
* Function called with `$store` as first argument
* The result of function call is ignored

#### Arguments

1. `callback` ([*Watcher*][_Watcher_]): A function that receives Store and will be called during every domain.createStore call

#### Returns

[*Subscription*][_Subscription_]: Unsubscribe function.

#### Example

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateStore((store) => {
  console.log("new store created");
});

const $a = domain.createStore(null);
// => new store created
```

Try it

### `onCreateDomain(callback)`

#### Formulae

```ts
domain.onCreateDomain((domain) => {});
```

* Function passed to `onCreateDomain` called every time, as subdomain created in `domain`
* Function called with `domain` as first argument
* The result of function call is ignored

#### Arguments

1. `callback` ([*Watcher*][_Watcher_]): A function that receives Domain and will be called during every domain.createDomain call

#### Returns

[*Subscription*][_Subscription_]: Unsubscribe function.

#### Example

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateDomain((domain) => {
  console.log("new domain created");
});

const a = domain.createDomain();
// => new domain created

const b = domain.createDomain();
// => new domain created
```

Try it

[_watcher_]: /en/explanation/glossary#watcher

[_subscription_]: /en/explanation/glossary#subscription


# Effect API

[eventTypes]: /en/api/effector/Event#event-types

[storeTypes]: /en/essentials/typescript#store-types

## Effect API

```ts
import { type Effect, createEffect } from "effector";

const effectFx = createEffect();
```

An Effect is a unit designed to handle side effects, whether synchronous or asynchronous. It includes a set of pre-built events and stores that streamline common operations. It is categorized as a unit.

Effects can be called like regular functions (*imperative call*) and can also be connected along with their properties to various API methods including sample and split (*declarative connection*).

> TIP effective effect:
>
> If you're not familiar with effects and how to work with them, check out Asynchronous Operations in effector using Effects.

### Effect Interface

Available methods and properties of effects:
| <div style="width:170px">Method/Property</div> | Description |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| use(handler) | Replaces the effect's handler with a new `handler` function. |
| use.getCurrent() | Returns the current effect handler. |
| watch(watcher) | Adds a listener that calls `watcher` on each effect invocation. |
| map(fn) | Creates a new [derived event][eventTypes] that triggers when the effect is called with the result of calling `fn` on the effect's parameters. |
| prepend(fn) | Creates a new [event][eventTypes] that transforms input data through `fn` before calling the effect. |
| filterMap(fn) | Creates a new [derived event][eventTypes] that triggers when the effect is called with the result of fn, if it didn't return `undefined`. |
| done | [Derived event][eventTypes] that triggers when the effect completes successfully with params and result. |
| doneData | [Derived event][eventTypes] with the result of successful effect execution with result. |
| fail | [Derived event][eventTypes] that triggers when the effect execution fails with params and error. |
| failData | [Derived event][eventTypes] with the effect's error data. |
| finally | [Derived event][eventTypes] that triggers on any effect completion. |
| pending | [Derived store][storeTypes] `Store<boolean>` with the effect execution status (`true` during execution). |
| inFlight | [Derived store][storeTypes] `Store<number>` with the count of active effect calls. |
| sid | Unique identifier of the unit. |
| shortName | String property containing the variable name in which the effect was declared. |
| compositeName | Composite effect name (including domain and short name) — useful for logging and tracing. |

### Effect Peculiarities

1. When called imperatively, they always return a promise reflecting the side effect execution progress.
2. Effects accept only one argument, just like events.
3. They have built-in stores (pending, inFlight) and events (done, fail, finally, etc.) for convenience.

### Effect Methods

#### `.use(handler)`

> WARNING use is an anti-pattern:
>
> If the implementation value is known immediately, it's better to use `createEffect(handler)`.
>
> The `use(handler)` method is an anti-pattern that degrades type inference.

Defines the effect implementation: the function that will be called when the effect is triggered. Used for cases when the implementation is not set during creation or when testing requires changing the effect's behavior.<br/>
Accepts a `params` argument, which is the data with which the effect was called.

> INFO use takes priority:
>
> If the effect already had an implementation at the time of call, it will be replaced with the new one.

* **Formula**

```ts
const fx: Effect<Params, Done>;
fx.use(handler);
```

* **Type**

```ts
effect.use(handler: (params: Params) => Promise<Done> | Done): Effect<
  Params,
  Done,
  Fail
>
```

* **Examples**

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect();

fetchUserReposFx.use(async ({ name }) => {
  console.log("fetchUserReposFx called for github user", name);

  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

await fetchUserReposFx({ name: "zerobias" });
// => fetchUserReposFx called for github user zerobias
```

Run example

* **Return value**

Returns the current effect.

***

#### `.use.getCurrent()`

Method for getting the current effect implementation. Used for testing.

If the effect doesn't have an implementation set yet, a default function will be returned that throws an error when called.

* **Formula**

```ts
const fx: Effect<Params, Done>;
const handler = fx.use.getCurrent();
```

* **Type**

```ts
effect.use.getCurrent(): (params: Params) => Promise<Done>
```

* **Examples**

```js
const handlerA = () => "A";
const handlerB = () => "B";

const fx = createEffect(handlerA);

console.log(fx.use.getCurrent() === handlerA);
// => true

fx.use(handlerB);
console.log(fx.use.getCurrent() === handlerB);
// => true
```

Run example

* **Return value**

Returns the effect's implementation function that was set through createEffect or using the use method.

***

#### `.watch(watcher)`

Calls an additional function with side effects on each effect trigger. Shouldn't be used for logic, better to replace with sample.

* **Formula**

```ts
const fx: Effect<Params, Done>;
const unwatch = fx.watch(watcher);
```

* **Type**

```ts
effect.watch(watcher: (payload: Params) => any): Subscription
```

* **Examples**

```js
import { createEffect } from "effector";

const fx = createEffect((params) => params);

fx.watch((params) => {
  console.log("effect called with argument", params);
});

await fx(10);
// => effect called with argument 10
```

Run example

* **Return value**

Subscription cancellation function, after calling it the `watcher` stops receiving updates and is removed from memory.

***

#### `.map(fn)`

The map method creates a [derived event][eventTypes]. The event is triggered at the moment the effect is executed, using the same arguments as the effect and the result returned by the `fn` function. Works similarly to Event.map(fn).

* **Formula**

```ts
const fx: Effect<Params, Done>;
const eventB = fx.map(fn);
```

* **Type**

```ts
effect.map<T>(fn: (params: Params) => T): Event<T>
```

* **Examples**

```ts
import { createEffect } from "effector";

interface User {
  // ...
}

const saveUserFx = createEffect(async ({ id, name, email }: User) => {
  // ...
  return response.json();
});

const userNameSaving = saveUserFx.map(({ name }) => {
  console.log("Starting user save: ", name);
  return name;
});

const savingNotification = saveUserFx.map(({ name, email }) => {
  console.log("Save notification");
  return `Saving user: ${name} (${email})`;
});

// When calling the effect, both derived events will trigger
await saveUserFx({ id: 1, name: "John", email: "john@example.com" });
// => Starting user save: John
// => Saving user: John (john@example.com)
```

Run example

* **Return value**

Returns a new [derived event][eventTypes].

***

#### `.prepend(fn)`

Creates a new event to transform data *before* running the effect. Compared to map, it works in the opposite direction. Works similarly to Event.prepend(fn).

* **Formula**

```ts
const fx: Effect<Params, Done>;
const trigger = fx.prepend(fn);
```

* **Type**

```ts
effect.prepend<Before>(fn: (_: Before) => Params): EventCallable<Before>
```

* **Examples**

```js
import { createEffect } from "effector";

const saveFx = createEffect(async (data) => {
  console.log("saveFx called with:", data);
  await api.save(data);
});

// create a trigger event for the effect
const saveForm = saveFx.prepend((form) => ({
  ...form,
  modified: true,
}));

saveForm({ name: "John", email: "john@example.com" });
// => saveFx called with: { name: "John", email: "john@example.com", modified: true }
```

* **Return value**

Returns a new [event][eventTypes].

***

#### `.filterMap(fn)`

The `filterMap` method creates a [derived event][eventTypes]. The `fn` function computation runs simultaneously with the effect, however if the function returns `undefined`, the event doesn't trigger. Works similarly to the .map(fn) method, but with filtering by return value.

* **Formula**

```ts
const fx: Effect<Params, Done>;
const filtered = fx.filterMap(fn);
```

* **Type**

```ts
effect.filterMap<T>(fn: (payload: Params) => T | undefined): Event<T>
```

* **Examples**

```ts
import { createEffect } from "effector";

const validateAndSaveFx = createEffect(async (userData) => {
  if (!userData.isValid) {
    throw new Error("Invalid data");
  }

  return await saveToDatabase(userData);
});

// Create event only for valid data
const validDataProcessing = validateAndSaveFx.filterMap((userData) => {
  if (userData.isValid && userData.priority === "high") {
    return {
      id: userData.id,
      timestamp: Date.now(),
    };
  }
  // If data is invalid or priority is not high, the event won't trigger
});

validDataProcessing.watch(({ id, timestamp }) => {
  console.log(`Processing high-priority data ID: ${id} at ${timestamp}`);
});

// Example calls
await validateAndSaveFx({
  id: 1,
  isValid: true,
  priority: "high",
  role: "user",
});
// => Processing high-priority data ID: 1 at 1703123456789
```

* **Return value**

Returns a new [derived event][eventTypes].

### Effect Properties

#### `.done`

[Derived event][eventTypes] that triggers with the result of effect execution and the argument passed during the call.

* **Type**

```ts
interface Effect<Params, Done> {
  done: Event<{ params: Params; result: Done }>;
}
```

* **Examples**

```js
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.done.watch(({ params, result }) => {
  console.log("Call with argument", params, "completed with value", result);
});

await fx(2);
// => Call with argument 2 completed with value 3
```

Run example.

***

#### `.doneData`

[Derived event][eventTypes] that triggers with the result of successful effect execution.

* **Type**

```ts
interface Effect<any, Done> {
  doneData: Event<Done>;
}
```

* **Examples**

```js
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.doneData.watch((result) => {
  console.log(`Effect completed successfully, returning ${result}`);
});

await fx(2);
// => Effect completed successfully, returning 3
```

Run example.

***

#### `.fail`

[Derived event][eventTypes] that triggers with the error that occurred during effect execution and the argument passed during the call.

* **Type**

```ts
interface Effect<Params, any, Fail> {
  fail: Event<{ params: Params; error: Fail }>;
}
```

* **Examples**

```js
import { createEffect } from "effector";

const fx = createEffect(async (value) => {
  throw Error(value - 1);
});

fx.fail.watch(({ params, error }) => {
  console.log("Call with argument", params, "failed with error", error.message);
});

fx(2);
// => Call with argument 2 failed with error 1
```

Run example.

***

#### `.failData`

[Derived event][eventTypes] that triggers with the error that occurred during effect execution.

* **Type**

```ts
interface Effect<any, any, Fail> {
  failData: Event<Fail>;
}
```

* **Examples**

```js
import { createEffect } from "effector";

const fx = createEffect(async (value) => {
  throw Error(value - 1);
});

fx.failData.watch((error) => {
  console.log(`Call failed with error ${error.message}`);
});

fx(2);
// => Call failed with error 1
```

Run example.

***

#### `.finally`

[Derived event][eventTypes] that triggers on both success and failure of effect completion with detailed information about arguments, results, and execution status.

* **Type**

```ts
interface Effect<Params, Done, Fail> {
  finally: Event<
    | {
        status: "done";
        params: Params;
        result: Done;
      }
    | {
        status: "fail";
        params: Params;
        error: Fail;
      }
  >;
}
```

* **Examples**

```js
import { createEffect } from "effector";

const fetchApiFx = createEffect(async ({ time, ok }) => {
  await new Promise((resolve) => setTimeout(resolve, time));

  if (ok) {
    return `${time} ms`;
  }

  throw Error(`${time} ms`);
});

fetchApiFx.finally.watch((value) => {
  switch (value.status) {
    case "done":
      console.log("Call with argument", value.params, "completed with value", value.result);
      break;
    case "fail":
      console.log("Call with argument", value.params, "failed with error", value.error.message);
      break;
  }
});

await fetchApiFx({ time: 100, ok: true });
// => Call with argument {time: 100, ok: true} completed with value 100 ms

fetchApiFx({ time: 100, ok: false });
// => Call with argument {time: 100, ok: false} failed with error 100 ms
```

Run example.

***

#### `.pending`

[Derived store][storeTypes] that shows whether the effect is currently executing.

* **Type**

```ts
interface Effect<any, any> {
  pending: Store<boolean>;
}
```

* **Detailed description**

This property eliminates the need to write code like this:

```js
const $isRequestPending = createStore(false)
  .on(requestFx, () => true)
  .on(requestFx.done, () => false)
  .on(requestFx.fail, () => false);
```

* **Examples**

```jsx
import React from "react";
import { createEffect } from "effector";
import { useUnit } from "effector-react";

const fetchApiFx = createEffect(async (ms) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
});

fetchApiFx.pending.watch(console.log);
// => false

const App = () => {
  const loading = useUnit(fetchApiFx.pending);
  return <div>{loading ? "Loading..." : "Loading complete"}</div>;
};

fetchApiFx(1000);
// => true
// => false
```

Run example.

***

#### `.inFlight`

[Derived store][storeTypes] that shows the number of running effects that are currently executing. Can be used to limit the number of concurrent requests.

* **Type**

```ts
interface Effect<any, any> {
  inFlight: Store<number>;
}
```

* **Detailed description**

This property eliminates the need to write code like this:

```js
const $requestsInFlight = createStore(0)
  .on(requestFx, (n) => n + 1)
  .on(requestFx.done, (n) => n - 1)
  .on(requestFx.fail, (n) => n - 1);
```

* **Examples**

```js
import { createEffect } from "effector";

const fx = createEffect(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});

fx.inFlight.watch((amount) => {
  console.log("requests in flight:", amount);
});
// => requests in flight: 0

const req1 = fx();
// => requests in flight: 1

const req2 = fx();
// => requests in flight: 2

await Promise.all([req1, req2]);

// => requests in flight: 1
// => requests in flight: 0
```

Run example.

***

#### `.sid`

Unique unit identifier. It's important to note that SID doesn't change on each application run, it's statically written into your application bundle for absolute unit identification. Set automatically through Babel plugin.

* **Type**

```ts
interface Effect<any, any> {
  sid: string | null;
}
```

***

#### `.shortName`

String property containing the variable name in which the effect was declared. Effect name. Set either explicitly through the `name` field in createEffect, or automatically through babel plugin.

* **Type**

```ts
interface Effect<any, any> {
  shortName: string;
}
```

***

#### `.compositeName`

Composite effect name (including domain and short name) — useful for logging and tracing.

* **Type**

```ts
interface Effect<any, any> {
  compositeName: {
    shortName: string;
    fullName: string;
    path: Array<string>;
  };
}
```

* **Examples**

```ts
import { createEffect, createDomain } from "effector";

const first = createEffect();
const domain = createDomain();
const second = domain.createEffect();

console.log(first.compositeName);
// {
//     "shortName": "first",
//     "fullName": "first",
//     "path": [
//         "first"
//      ]
// }

console.log(second.compositeName);
// {
//     "shortName": "second",
//     "fullName": "domain/second",
//     "path": [
//         "domain",
//         "second"
//      ]
// }
```

### Related API and Articles

* **API**
    * createEffect - Creating a new effect
    * Event API - Description of events, their methods and properties
    * Store API - Description of stores, their methods and properties
    * sample - Key operator for building connections between units
    * attach - Creates new effects based on other effects
* **Articles**
    * Working with effects
    * How to type effects and other units
    * Guide to testing effects and other units


# Event

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Event API

```ts
import { type Event, type EventCallable, createEvent } from "effector";

const event = createEvent();
```

An event in Effector represents a user action, a step in the application process, a command to execute, an intention to change something, and much more.
An event acts as an entry point into the reactive data flow — a simple way to tell the app "something happened."

> TIP this is your canonical event:
>
> If you're not familiar with events and how to work with them, start here: What are events and how to use them.

### Event Types

It’s important to understand that there are two types of events:

1. **Events**, created using createEvent or .prepend. These events are of type EventCallable and can be triggered directly or used in the target argument of the sample method.
2. **Derived events**, created using .map, .filter, or .filterMap. These are of type Event and **cannot be triggered or passed into target** — Effector triggers them internally in the correct order. However, you can subscribe to them via sample or watch.

### Event Interface

Available methods and properties:

| <div style="width:170px">Method/Property</div>                           | Description                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| prepend(fn) | Creates a new event, transforms the input using `fn`, and passes it to the original event.       |
| map(fn)                                       | Creates a new derived event triggered with the result of `fn` after the original event is fired. |
| filter({fn})                               | Creates a new derived event that fires only if `fn` returns `true`.                              |
| filterMap(fn)                           | Creates a new derived event triggered with `fn` if it's not `undefined`.                         |
| watch(watcher)                         | Adds a listener called on every event trigger.                                                   |
| subscribe(observer)               | Low-level method to integrate the event with the `Observable` pattern.                           |
| sid                                           | Unique unit identifier.                                                                          |
| shortName                               | The variable name in which the event is declared.                                                |
| compositeName                       | Full composite name (domain + shortName) — useful for logging and tracing.                       |

### Event Methods

#### `.prepend(fn)`

> INFO info:
>
> This method exists **only** for events that are not derived (`EventCallable`)!
> That means it can only be used on events created with createEvent.

Creates a new `EventCallable`, which calls `fn` and passes the transformed data to the original event.

* **Formula**

```ts
const second = first.prepend(fn);
```

* **Type**

```ts
event.prepend<Before = void>(
  fn: (_: Before) => Payload
): EventCallable<Before>
```

* **Examples**

```ts
import { createEvent } from "effector";

// original event
const userPropertyChanged = createEvent();

const changeName = userPropertyChanged.prepend((name) => ({
  field: "name",
  value: name,
}));
const changeRole = userPropertyChanged.prepend((role) => ({
  field: "role",
  value: role.toUpperCase(),
}));

userPropertyChanged.watch(({ field, value }) => {
  console.log(`User property "${field}" changed to ${value}`);
});

changeName("john");
// => User property "name" changed to john

changeRole("admin");
// => User property "role" changed to ADMIN

changeName("alice");
// => User property "name" changed to alice
```

Open example

You can treat this method as a wrapper function. Suppose you need to frequently call a function with an inconvenient API:

```ts
import { sendAnalytics } from "./analytics";

export function reportClick(item: string) {
  const argument = { type: "click", container: { items: [arg] } };
  return sendAnalytics(argument);
}
```

That’s exactly what `.prepend()` does:

```ts
import { sendAnalytics } from "./analytics";

export const reportClick = sendAnalytics.prepend((item: string) => {
  return { type: "click", container: { items: [arg] } };
});

reportClick("example");
// reportClick triggered "example"
// sendAnalytics triggered with { type: "click", container: { items: ["example"] } }
```

* **Detailed description**

Works like a reversed .map. In `.prepend`, data is transformed **before** the event is triggered. In .map, it’s transformed **after**.

If the original event belongs to a domain, the new event will inherit that domain.

* **Return value**

Returns a new event.

***

#### `.map(fn)`

> INFO Cleanliness is our everything!:
>
> The function `fn` **must be pure**.

Creates a new **derived event**, which is triggered after the original event, using the result of function `fn` as its argument.

* **Formula**

```ts
// Works for any event — both regular and derived
const first: Event<T> | EventCallable<T>;
const second: Event<F> = first.map(fn);
```

* **Type**

```ts
event.map<T>(fn: (payload: Payload) => T): Event<T>
```

* **Examples**

```ts
import { createEvent } from "effector";

const userUpdated = createEvent<{ name: string; role: string }>();

// You can split data flow with .map()
const userNameUpdated = userUpdated.map(({ name }) => name);

// Or transform the data
const userRoleUpdated = userUpdated.map((user) => user.role.toUpperCase());

userNameUpdated.watch((name) => console.log(`User name is now [${name}]`));
userRoleUpdated.watch((role) => console.log(`User role is now [${role}]`));

userUpdated({ name: "john", role: "admin" });
// => User name is now [john]
// => User role is now [ADMIN]
```

Open example

* **Detailed description**

The `.map` method allows you to split and control the data flow, extract fields, or transform values within your business logic.

* **Return value**

Returns a new derived event.

***

#### `.filter({ fn })`

> TIP Tip:
>
> sample with the `filter` argument is the preferred method for filtering:
>
> ```ts
> const event = createEvent();
>
> const filteredEvent = sample({
>   clock: event,
>   filter: () => true,
> });
> ```

`.filter` creates a **derived** event, which is triggered **only** if the function `fn` returns `true`. This is helpful for branching the data flow and reacting to specific conditions.

* **Formula**

```ts
const first: Event<T> | EventCallable<T>;
const second: Event<T> = first.filter({ fn });
```

* **Type**

```ts
event.filter(config: {
  fn(payload: Payload): boolean
}): Event<Payload>
```

* **Examples**

<Tabs>
<TabItem label="😕 filter">

```js
import { createEvent, createStore } from "effector";

const numbers = createEvent();
const positiveNumbers = numbers.filter({
  fn: ({ x }) => x > 0,
});

const $lastPositive = createStore(0);

$lastPositive.on(positiveNumbers, (n, { x }) => x);

$lastPositive.watch((x) => {
  console.log("Last positive number:", x);
});

// => Last positive number: 0

numbers({ x: 0 }); // no output
numbers({ x: -10 }); // no output
numbers({ x: 10 }); // => Last positive number: 10
```

Open example

</TabItem>

<TabItem label="🤩 sample + filter">

```js
import { createEvent, createStore, sample } from "effector";

const numbers = createEvent();
const positiveNumbers = sample({
  clock: numbers,
  filter: ({ x }) => x > 0,
});

const $lastPositive = createStore(0);

$lastPositive.on(positiveNumbers, (n, { x }) => x);

$lastPositive.watch((x) => {
  console.log("Last positive number:", x);
});

// => Last positive number: 0

numbers({ x: 0 }); // no output
numbers({ x: -10 }); // no output
numbers({ x: 10 }); // => Last positive number: 10
```

</TabItem>
</Tabs>

* **Return value**

Returns a new derived event.

***

#### `.filterMap(fn)`

> TIP Our beloved sample:
>
> This method can also be replaced with a sample operation using the `filter` + `fn` arguments:
>
> ```ts
> const event = createEvent();
>
> const filteredAndMappedEvent = sample({
>   clock: event,
>   filter: () => true,
>   fn: () => "value",
> });
> ```

This method creates a derived event, which **may** be triggered if the result of `fn` is **not undefined**. It combines filtering and mapping in a single step.

Ideal for working with JavaScript APIs that sometimes return `undefined`.

* **Formula**

```ts
const first: Event<T> | EventCallable<T>;
const second: Event<F> = first.filterMap(fn);
```

* **Type**

```ts
event.filterMap<T>(fn: (payload: Payload) => T | undefined): Event<T>
```

* **Examples**

```tsx
import { createEvent } from "effector";

const listReceived = createEvent<string[]>();

// Array.prototype.find() returns undefined when the element isn't found
const effectorFound = listReceived.filterMap((list) => {
  return list.find((name) => name === "effector");
});

effectorFound.watch((name) => console.info("Found:", name));

listReceived(["redux", "effector", "mobx"]); // => Found: effector
listReceived(["redux", "mobx"]); // no output
```

> INFO Attention:
>
> The function `fn` must return some data. If `undefined` is returned, the derived event call will be skipped.

Open example

* **Return value**

Returns a new derived event.

***

#### `.watch(watcher)`

The `.watch` method calls the provided `watcher` callback **every time** the event is triggered.

> TIP Remember:
>
> The `watch` method does not handle or report exceptions, does not manage the completion of asynchronous operations, and does not resolve data race conditions.
>
> Its primary purpose is for short-term debugging and logging.

Learn more in the Events section.

* **Formula**

```ts
const event: Event<T> | EventCallable<T>;
const unwatch: () => void = event.watch(fn);
```

* **Type**

```ts
event.watch(watcher: (payload: Payload) => any): Subscription
```

* **Examples**

```js
import { createEvent } from "effector";

const sayHi = createEvent();
const unwatch = sayHi.watch((name) => console.log(`${name}, hello!`));

sayHi("Peter"); // => Peter, hello!
unwatch();

sayHi("Drew"); // => nothing happens
```

Open example

* **Return value**

Returns a function to cancel the subscription.

***

#### `.subscribe(observer)`

This is a **low-level** method for integrating events with the standard `Observable` pattern.

Further reading:

* [RxJS Observables](https://rxjs.dev/guide/observable)
* [TC39 proposal for Observables](https://github.com/tc39/proposal-observable)

> INFO Remember:
>
> You don't need to use this method yourself. It's used under the hood by rendering engines and so on.

* **Formula**

```ts
const event = createEvent();

event.subscribe(observer);
```

* **Type**

```ts
event.subscribe(observer: Observer<Payload>): Subscription
```

* **Examples**

```ts
import { createEvent } from "effector";

const userLoggedIn = createEvent<string>();

const subscription = userLoggedIn.subscribe({
  next: (login) => {
    console.log("User login:", login);
  },
});

userLoggedIn("alice"); // => User login: alice

subscription.unsubscribe();
userLoggedIn("bob"); // => nothing happens
```

***

### Event Properties

These properties are mainly set using effector/babel-plugin or @effector/swc-plugin, so they are only available when using Babel or SWC.

#### `.sid`

A **unique identifier** for each event.

SID is **statically recorded** in your application bundle and doesn’t change between app runs. This makes it perfect for identifying units across threads or between client and server.

Example: [examples/worker-rpc](https://github.com/effector/effector/tree/master/examples/worker-rpc)

* **Type**

```ts
interface Event {
  sid: string | null;
}
```

***

#### `.shortName`

Contains the **variable name** in which the event was declared.

```ts
import { createEvent } from "effector";

const demo = createEvent();
// demo.shortName === 'demo'
```

Reassigning the event to another variable doesn’t change this:

```ts
const another = demo;
// another.shortName === 'demo'
```

* **Type**

```ts
interface Event {
  shortName: string;
}
```

***

#### `.compositeName`

Contains the **full path** of the event in your app’s structure. If the event was created inside a domain, its name will reflect that.

> TIP TIP:
>
> Usually, if a long name is required, it's better to pass it explicitly in the `name` field.

```ts
import { createEvent, createDomain } from "effector";

const first = createEvent();
const domain = createDomain();
const second = domain.createEvent();

console.log(first.compositeName);
// {
//   shortName: "first",
//   fullName: "first",
//   path: ["first"]
// }

console.log(second.compositeName);
// {
//   shortName: "second",
//   fullName: "domain/second",
//   path: ["domain", "second"]
// }
```

* **Type**

```ts
interface Event {
  compositeName: {
    shortName: string;
    fullName: string;
    path: Array<string>;
  };
}
```

### Event Peculiarities

1. In Effector, every event supports **only one argument**.
   If you call an event like `someEvent(first, second)`, only the **first argument** will be used — the rest are ignored.
2. Inside event methods, **you must not call other events or effects**.
   All provided functions must be **pure** — no side effects, no async calls.

### Related APIs and Articles

* **API**

    * createEvent — create a new event
    * createApi — create a set of events for a store
    * merge — merge multiple events into one
    * sample — core operator to connect units

* **Articles**

    * How to work with events
    * Thinking in Effector and why events matter
    * TypeScript guide to events and units


# Scope API

## Scope API

```ts
import { type Scope, fork } from "effector";

const scope = fork();
```

`Scope` is a fully isolated instance of application.
The primary purpose of scope includes SSR (Server-Side Rendering) but is not limited to this use case. A `Scope` contains an independent clone of all units (including connections between them) and basic methods to access them.

> TIP scope matters:
>
> If you want to get deeper about scopes then check out great article about isolated scopes.<br/>
> We also have few related guides:
>
> * How to fix lost scope
> * Using scopes with SSR
> * Writing test for units

### Scope peculiarities

1. There are a few rules that must be followed to work successfully with scope.
2. Your scope can be lost to avoid this use .

### Scope methods

#### `.getState($store)`

Returns the value of a store in a given scope:

* **Formula**

```ts
const scope: Scope;
const $value: Store<T> | StoreWritable<T>;

const value: T = scope.getState($value);
```

* **Type**

```ts
scope.getState<T>(store: Store<T>): T;
```

* **Returns**

The value of the store.

* **Examples**

Create two instances of an application, trigger events in them, and test the `$counter` store value in both instances:

```js
import { createStore, createEvent, fork, allSettled } from "effector";

const inc = createEvent();
const dec = createEvent();
const $counter = createStore(0);

$counter.on(inc, (value) => value + 1);
$counter.on(dec, (value) => value - 1);

const scopeA = fork();
const scopeB = fork();

await allSettled(inc, { scope: scopeA });
await allSettled(dec, { scope: scopeB });

console.log($counter.getState()); // => 0
console.log(scopeA.getState($counter)); // => 1
console.log(scopeB.getState($counter)); // => -1
```

Try it.

### Related API and Articles

* **API**
    * scopeBind – Method for binding a unit to a scope
    * fork – Operator for creating a scope
    * allSettled – Method for running a unit in a given scope and waiting for the entire chain of effects to complete
    * serialize – Method for obtaining serialized store values
    * hydrate – Method for hydrating serialized data
* **Articles**
    * How to lose scope and fix it
    * Using scopes with SSR
    * How to test units


# Store API

## Store API

```ts
import { type Store, type StoreWritable, createStore } from "effector";

const $store = createStore();
```

A *Store* is an object that holds the state value. The store updates when the new value is not strictly equal (`!==`) to the current one and is not `undefined` (unless the store is configured with `skipVoid: false`). A store is a Unit. Some stores can be derived.

> TIP What is a store anyway?:
>
> If you're not yet familiar with how to work with a store, feel free to start here.

### Store Interface

Available store methods and properties:

| Method/Property                                       | Description                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| map(fn)                          | Creates a new derived store                                  |
| on(trigger, reducer) | Updates state via a `reducer` when the `trigger` is fired    |
| watch(watcher)            | Calls the `watcher` function every time the store is updated |
| reset(...triggers)       | Resets the store to its initial state                        |
| off(trigger)                | Removes the subscription to the specified trigger            |
| updates()                    | Event that fires when the store updates                      |
| reinit()                      | Event to reinitialize the store                              |
| shortName                  | ID or short name of the store                                |
| defaultState            | Initial state of the store                                   |
| getState()             | Returns the current state                                    |

### Immutability

A store in effector is immutable. This means that updates will only occur if the handler function (such as `combine`, `sample`, or `on`) returns a new object.

For example, before using array methods, you need to create a new reference to it. Here’s how to do it correctly:

```ts
$items.on(addItem, (items, newItem) => {
  const updatedItems = [...items];
  // ✅ .push method is called on a new array
  updatedItems.push(newItem);
  return updatedItems;
});
```

This approach should not be used, as the store **will not be updated**:

```ts
$items.on(addItem, (items, newItem) => {
  // ❌ Error! The array reference remains the same, the store will not be updated
  items.push(newItem);
  return items;
});
```

Updating objects works in a similar way.

A store in effector should be as small as possible, responsible for a specific part of the business logic, unlike, for example, Redux, whose store tends to hold everything together. When the state is atomic, the need for spreading objects becomes less frequent. However, if there is a need to frequently update deeply nested data, it is acceptable to use [immer](https://immerjs.github.io/immer/produce) to simplify repetitive code when updating the state.

### Store Methods

#### `.map(fn)`

Accepts a function `fn` and returns a derived store that automatically updates when the original store changes.

* **Formulae**

```ts
$source.map(fn, config?);
```

* **Type**

```ts
const $derived = $source.map<T>(
  fn: (value: SourceValue) => T,
  config?: {
    skipVoid?: boolean
  }
): Store<T>
```

* **Examples**

Basic usage:

```ts
import { createEvent, createStore } from "effector";

const changed = createEvent<string>();

const $title = createStore("");
const $titleLength = $title.map((title) => title.length);

$title.on(changed, (_, newTitle) => newTitle);

$titleLength.watch((length) => {
  console.log("new length", length);
});

changed("hello");
changed("world");
changed("hello world");
```

Try it

You can pass a config object with `skipVoid: false` to allow the store to accept `undefined`:

```js
const $titleLength = $title.map((title) => title.length, { skipVoid: false });
```

* **Detailed Description**

The `map` method runs the function `fn` with the current store state as input every time the original store updates.
The return value becomes the new state of the derived store.

* **Returns**

Returns a new derived store.

#### `.on(trigger, reducer)`

Updates state using a reducer when the `trigger` is fired.

* **Formulae**

```ts
$store.on(trigger, reducer);
```

* **Type**

```ts
$store.on<T>(
  trigger: Unit<T> | Unit<T>[]
  reducer: (state: State, payload: T) => State | void
): this
```

* **Examples**

```ts
import { createEvent, createStore } from "effector";

const $counter = createStore(0);
const incrementedBy = createEvent<number>();

$counter.on(incrementedBy, (value, incrementor) => value + incrementor);

$counter.watch((value) => {
  console.log("updated", value);
});

incrementedBy(2);
incrementedBy(2);
```

Try it

* **Returns**

Returns the current store.

#### `.watch(watcher)`

Calls the `watcher` function whenever the store updates.

* **Formulae**

```ts
const unwatch = $store.watch(watcher);
```

* **Type**

```ts
$store.watch(watcher: (state: State) => any): Subscription
```

* **Examples**

```ts
import { createEvent, createStore } from "effector";

const add = createEvent<number>();
const $store = createStore(0);

$store.on(add, (state, payload) => state + payload);

$store.watch((value) => console.log(`current value: ${value}`));

add(4);
add(3);
```

Try it

* **Returns**

Returns a subscription cancellation function.

#### `.reset(...triggers)`

Resets the store to its default value when any of the `triggers` fire.

* **Formulae**

```ts
$store.reset(...triggers);
```

* **Type**

```ts
$store.reset(...triggers: Array<Unit<any>>): this
```

* **Examples**

```ts
import { createEvent, createStore } from "effector";

const increment = createEvent();
const reset = createEvent();

const $store = createStore(0)
  .on(increment, (state) => state + 1)
  .reset(reset);

$store.watch((state) => console.log("changed", state));

increment();
increment();
reset();
```

Try it

* **Returns**

Returns the current store.

#### `.off(trigger)`

Removes the reducer for the specified `trigger`.

* **Formulae**

```ts
$store.off(trigger);
```

* **Type**

```ts
$store.off(trigger: Unit<any>): this
```

* **Examples**

```ts
import { createEvent, createStore, merge } from "effector";

const changedA = createEvent();
const changedB = createEvent();

const $store = createStore(0);
const changed = merge([changedA, changedB]);

$store.on(changed, (state, params) => state + params);
$store.off(changed);
```

Try it

* **Returns**

Returns the current store.

### Store Properties

#### `.updates`

An event that fires on every store update.

* **Examples**

```ts
import { createStore, is } from "effector";

const $clicksAmount = createStore(0);
is.event($clicksAmount.updates); // true

$clicksAmount.updates.watch((amount) => {
  console.log(amount);
});
```

Try it

* **Returns**

A derived event representing the store's updates.

#### `.reinit`

Event to reinitialize the store to its default state.

* **Examples**

```ts
import { createStore, createEvent, sample, is } from "effector";

const $counter = createStore(0);
is.event($counter.reinit);

const increment = createEvent();

$counter.reinit();
console.log($counter.getState());
```

Try it

* **Returns**

An event that reinitializes the store.

#### `.shortName`

A string property containing the store's ID or short name.

* **Examples**

```ts
const $store = createStore(0, {
  name: "someName",
});

console.log($store.shortName); // someName
```

Try it

* **Returns**

The store’s ID or short name.

#### `.defaultState`

The store’s default state value.

* **Example**

```ts
const $store = createStore("DEFAULT");

console.log($store.defaultState === "DEFAULT"); // true
```

* **Returns**

The default state value.

### Utility Methods

#### `.getState()`

Returns the current state of the store.

> WARNING Caution!:
>
> Using `getState()` in business logic is not recommended — it's better to pass data through `sample`.

* **Examples**

```ts
import { createEvent, createStore } from "effector";

const add = createEvent<number>();

const $number = createStore(0).on(add, (state, data) => state + data);

add(2);
add(3);

console.log($number.getState());
```

Try it

* **Returns**

The current state of the store.

### Related APIs

* createStore – Creates a new store
* combine – Combines multiple stores into a derived store
* sample – A core operator for connecting units
* createEvent – Creates an event
* createEffect – Creates an effect


# allSettled

## Methods

### `allSettled(unit, {scope, params?})`

Calls the provided unit within the current scope and wait for all triggered effects to complete.

#### Formulae

```ts
allSettled<T>(unit: Event<T>, {scope: Scope, params?: T}): Promise<void>
allSettled<T>(unit: Effect<T, Done, Fail>, {scope: Scope, params?: T}): Promise<
  | {status: 'done'; value: Done}
  | {status: 'fail'; value: Fail}
>
allSettled<T>(unit: Store<T>, {scope: Scope, params?: T}): Promise<void>
```

#### Arguments

1. `unit`:  or  to be called
2. `scope`:
3. `params`: params passed to `unit`

> INFO since:
>
> Return value for effect is supported since [effector 21.4.0](https://changelog.effector.dev/#effector-21-4-0)

#### Examples

> TIP Contribution:
>
> TBD
>
> Please, [open PullRequest](https://github.com/effector/effector) and contribute examples for this section via "Edit this page" link below.

### `allSettled(scope)`

Checks the provided scope for any ongoing computations and wait for their completion.

#### Formulae

```ts
allSettled<T>(scope): Promise<void>
```

#### Arguments

1. `scope`:

> INFO since:
>
> Supported since effector 22.5.0

#### Examples

##### Usage in tests

For example, tests that validate the integration with an external reactive API

```ts
import {createEvent, sample, fork, scopeBind, allSettled} from 'effector'

test('integration with externalSource', async () => {
  const scope = fork()

  const updated = createEvent()

  sample({
    clock: updated,
    target: someOtherLogicStart,
  })

  // 1. Subscribe event to external source
  const externalUpdated = scopeBind(updated, {scope})
  externalSource.listen(() => externalUpdates())

  // 2. Trigger update of external source
  externalSource.trigger()

  // 3. Wait for all triggered computations in effector's scope, even though these were not triggered by effector itself
  await allSettled(scope)

  // 4. Check anything as usual
  expect(...).toBe(...)
})
```


# attach

```ts
import { attach } from "effector";
```

> INFO since:
>
> Available since [effector 20.13.0](https://changelog.effector.dev/#effector-20-13-0).
>
> Since [effector 22.4.0](https://changelog.effector.dev/#effector-encke-22-4-0), it is available to check whether effect is created via `attach` method — is.attached.

Creates new effects based on the other effects, stores. Allows mapping params and handling errors.

Use cases: declarative way to pass values from stores to effects and argument preprocessing. Most useful case is `attach({ source, async effect })`.

> TIP:
>
> The attached effects are the same first-class citizens as the regular effects made by createEffect. You should place them in the same files as regular effects, also you can use the same naming strategy.

## Methods

### `attach({effect})`

> INFO since:
>
> [effector 21.5.0](https://changelog.effector.dev/#effector-21-5-0)

Create effect which will call `effect` with params as it is. That allows creating separate effects with shared behavior.

#### Formulae

```ts
const attachedFx = attach({ effect: originalFx });
```

* When `attachedFx` is triggered, then `originalFx` is triggered too
* When `originalFx` is finished (fail/done), then `attachedFx` must be finished with the same state.

#### Arguments

* `effect` (): Wrapped effect

#### Returns

: New effect

#### Types

```ts
const originalFx: Effect<Params, Done, Fail>;

const attachedFx: Effect<Params, Done, Fail> = attach({
  effect: originalFx,
});
```

In case of this simple variant of `attach`, types of `originalFx` and `attachedFx` will be the same.

#### Examples

It allows to create *local* copy of the effect, to react only on triggers emitted from the current *local* code.

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((word: string) => {
  console.info("Printed:", word);
});

const attachedFx = attach({ effect: originalFx });

originalFx.watch(() => console.log("originalFx"));
originalFx.done.watch(() => console.log("originalFx.done"));

attachedFx.watch(() => console.log("attachedFx"));
attachedFx.done.watch(() => console.log("attachedFx.done"));

originalFx("first");
// => originalFx
// => Printed: first
// => originalFx.done

attachedFx("second");
// => attachedFx
// => originalFx
// Printed: second
// => originalFx.done
// => attachedFx.done
```

Try it

### `attach({source, effect})`

Create effect which will trigger given one with values from `source` stores.

#### Formulae

```ts
const attachedFx = attach({
  source,
  effect: originalFx,
});
```

* When `attachedFx` is triggered, read data from `source`, trigger with the data `originalFx`
* When `originalFx` is finished, pass the same resolution (done/fail) into `attachedFx` and finish it

#### Arguments

* `source` ( | `{[key: string]: Store}`): Store or object with stores, values of which will be passed to the second argument of `mapParams`
* `effect` (): Original effect

#### Returns

: New effect

#### Types

> TIP:
>
> You don't need to explicitly set types for each declaration. The purpose of the following example is to provide a clear understanding.

In most userland code you will write code like this, without explicit types of the `let`/`const`:

```ts
const originalFx = createEffect<OriginalParams, SomeResult, SomeError>(async () => {});
const $store = createStore(initialValue);

const attachedFx = attach({
  source: $store,
  effect: originalFx,
});
```

##### Single store

```ts
const originalFx: Effect<T, Done, Fail>;
const $store: Store<T>;

const attachedFx: Effect<void, Done, Fail> = attach({
  source: $store,
  effect: originalFx,
});
```

[Try it in ts playground](https://tsplay.dev/NBJDDN)

Types of the `source` store and `effect` params must be the same.
But the `attachedFx` will omit the type of params, it means the attached effect not requires any params at all.

##### Shape of stores

```ts
const originalFx: Effect<{ a: A; b: B }, Done, Fail>;
const $a: Store<A>;
const $b: Store<B>;

const attachedFx: Effect<void, Done, Fail> = attach({
  source: { a: $a, b: $b },
  effect: originalFx,
});
```

[Try it in ts playground](https://tsplay.dev/mbE58N)

Types of the `source` object must be the same as `originalFx` params. But the `attachedFx` will omit the type of params, it means the attached effect not requires any params at all.

#### Examples

```ts
import { createEffect, createStore, attach } from "effector";

const requestPageFx = createEffect<{ page: number; size: number }, string[]>(
  async ({ page, size }) => {
    console.log("Requested", page);
    return page * size;
  },
);

const $page = createStore(1);
const $size = createStore(20);

const requestNextPageFx = attach({
  source: { page: $page, size: $size },
  effect: requestPageFx,
});

$page.on(requestNextPageFx.done, (page) => page + 1);

requestPageFx.doneData.watch((position) => console.log("requestPageFx.doneData", position));

await requestNextPageFx();
// => Requested 1
// => requestPageFx.doneData 20

await requestNextPageFx();
// => Requested 2
// => requestPageFx.doneData 40

await requestNextPageFx();
// => Requested 3
// => requestPageFx.doneData 60
```

Try it

### `attach({source, async effect})`

> INFO since:
>
> [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

Creates effect which will call async function with values from the `source` stores.

#### Formulae

```ts
const attachedFx = attach({
  source,
  async effect(source, params) {},
});
```

* When `attachedFx` is triggered, read data from the `source`, call `effect` function.
* When `effect` function returns resolved `Promise`, finish `attachedFx` with the data from the function as `attachedFx.done`.
* When `effect` throws exception, or returns rejected `Promise`, finish `attachedFx` with the data from function as `attachedFx.fail`.

#### Arguments

* `effect` (*Function*): `(source: Source, params: Params) => Promise<Result> | Result`
* `source` ( | `{[key: string]: Store}`): Store or object with stores, values of which will be passed to the first argument of `effect`

#### Returns

: New effect

#### Usage with scope

Any effects called inside `async effect` function will propagate scope.

```ts
const outerFx = createEffect((count: number) => {
  console.log("Hit", count);
});

const $store = createStore(0);
const attachedFx = attach({
  source: $store,
  async effect(count, _: void) {},
});
```

**Scope is lost** if there are any asynchronous function calls made:

```ts
const attachedFx = attach({
  source: $store,
  async effect(source) {
    // Here is ok, the effect is called
    const resultA = await anotherFx();

    // Be careful:
    const resultB = await regularFunction();
    // Here scope is lost.
  },
});
```

To solve this case, you need to just wrap your `regularFunction` into effect:

```ts
const regularFunctionFx = createEffect(regularFunction);
```

#### Types

##### Single store

```ts
const $store: Store<T>;

const attachedFx: Effect<Params, Done, Fail> = attach({
  source: $store,
  async effect(source, params: Params): Done | Promise<Done> {},
});
```

You need to type explicitly only `params` argument. All other types of arguments should be inferred automatically. Also, you may want to explicitly set the return type of the `effect` function.

If you want to remove any arguments from the `attachedFx` you need to just remove second argument from `effect` function:

```ts
const attachedFx: Effect<void, void, Fail> = attach({
  source: $store,
  async effect(source) {},
});
```

##### Multiple stores

> TIP:
>
> For details review previous section of types. Here the same logic.

```ts
// Userland example, without explicit type declarations
const $foo = createStore(100);
const $bar = createStore("demo");

const attachedFx = attach({
  source: { foo: $foo, bar: $bar },
  async effect({ foo, bar }, { baz }: { baz: boolean }) {
    console.log("Hit!", { foo, bar, baz });
  },
});

attachedFx({ baz: true });
// => Hit! { foo: 100, bar: "demo", baz: true }
```

[Try it in ts playground](https://tsplay.dev/m3xjbW)

#### Example

> WARNING TBD:
>
> Please, open pull request via "Edit this page" link.

### `attach({effect, mapParams})`

Creates effect which will trigger given one by transforming params by `mapParams` function.

#### Formulae

```ts
const attachedFx = attach({
  effect: originalFx,
  mapParams,
});
```

* When `attachedFx` triggered, payload passed into `mapParams` function, then the result of it passed into `originalFx`
* When `originalFx` is finished, then `attachedFx` must be finished with the same resolution (done/fail).
* If `mapParams` throws an exception, then `attachedFx` must be finished with the error as `attachedFx.fail`. But `originalFx` will not be triggered at all.

#### Arguments

* `effect` (): Wrapped effect
* `mapParams` (`(newParams) => effectParams`): Function which receives new params and maps them to the params of the wrapped `effect`. Works mostly like event.prepend. Errors happened in `mapParams` function will force attached effect to fail.

#### Returns

: New effect

#### Types

```ts
const originalFx: Effect<A, Done, Fail>;

const attachedFx: Effect<B, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (params: B): A {},
});
```

`mapParams` must return the same type `originalFx` receives as params.

If `attachedFx` must be called without any arguments, then `params` can be safely removed from the `mapParams`:

```ts
const attachedFx: Effect<void, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (): A {},
});
```

[Try it in ts playground](https://tsplay.dev/wXOYoW)

But if `mapParams` function throws an exception, it is on your own to check types compatibility, because of TypeScript.

```ts
const attachedFx: Effect<void, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (): A {
    throw new AnyNonFailType(); // It can be noncompatible with `Fail` type
  },
});
```

#### Examples

##### Map arguments

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((a: { input: number }) => a);

const attachedFx = attach({
  effect: originalFx,
  mapParams(a: number) {
    return { input: a * 100 };
  },
});

originalFx.watch((params) => console.log("originalFx started", params));

attachedFx(1);
// => originalFx { input: 100 }
```

Try it

##### Handle exceptions

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((a: { a: number }) => a);

const attachedFx = attach({
  effect: originalFx,
  mapParams(a: number) {
    throw new Error("custom error");
    return { a };
  },
});

attachedFx.failData.watch((error) => console.log("attachedFx.failData", error));

attachedFx(1);
// => attachedFx.failData
// =>   Error: custom error
```

Try it

### `attach({source, mapParams, effect})`

Creates effect which will read values from `source` stores, pass them with params to `mapParams` function and then call `effect` with the result.

#### Formulae

> TIP Note:
>
> This variant of `attach` mostly works like the attach({effect, mapParams}). The same things are omitted from this section.

```ts
const attachedFx = attach({
  source,
  mapParams,
  effect: originalFx,
});
```

* When `attachedFx` triggered, payload passed into `mapParams` function with value from `source` store, then the result of it passed into `originalFx`
* When `originalFx` is finished, then `attachedFx` must be finished with the same resolution (done/fail).
* If `mapParams` throws an exception, then `attachedFx` must be finished with the error as `attachedFx.fail`. But `originalFx` will not be triggered at all.

#### Arguments

* `source` ( | `{[key: string]: Store}`): Store or object with stores, values of which will be passed to the second argument of `mapParams`
* `mapParams` (`(newParams, values) => effectParams`): Function which receives new params and current value of `source` and combines them to the params of the wrapped `effect`. Errors happened in `mapParams` function will force attached effect to fail
* `effect` (): Wrapped effect

#### Returns

: New effect

#### Types

> WARNING TBD:
>
> Please, open pull request via "Edit this page" link.

#### Examples

##### With factory

```ts
// ./api/request.ts
import { createEffect, createStore } from "effector";

export const backendRequestFx = createEffect(async ({ token, data, resource }) => {
  return fetch(`https://example.com/api${resource}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
});

export const $requestsSent = createStore(0);

$requestsSent.on(backendRequestFx, (total) => total + 1);
```

```ts
// ./api/authorized.ts
import { attach, createStore } from "effector";

const $token = createStore("guest_token");

export const authorizedRequestFx = attach({
  effect: backendRequestFx,
  source: $token,
  mapParams: ({ data, resource }, token) => ({ data, resource, token }),
});

export function createRequest(resource) {
  return attach({
    effect: authorizedRequestFx,
    mapParams: (data) => ({ data, resource }),
  });
}
```

```ts
// ./api/index.ts
import { createRequest } from "./authorized";
import { $requestsSent } from "./request";

const getUserFx = createRequest("/user");
const getPostsFx = createRequest("/posts");

$requestsSent.watch((total) => {
  console.log(`client analytics: sent ${total} requests`);
});

const user = await getUserFx({ name: "alice" });
/*
POST https://example.com/api/user
{"name": "alice"}
Authorization: Bearer guest_token
*/

// => client analytics: sent 1 requests

const posts = await getPostsFx({ user: user.id });
/*
POST https://example.com/api/posts
{"user": 18329}
Authorization: Bearer guest_token
*/

// => client analytics: sent 2 requests
```

To allow factory works correct, add a path to a `./api/authorized` into `factories` option for Babel plugin:

```json5
// .babelrc
{
  plugins: [
    [
      "effector/babel-plugin",
      {
        factories: ["src/path-to-your-entity/api/authorized"],
      },
    ],
  ],
}
```

### Parameters

`attach()` also receives extra parameters, you can use it when you need.

#### `name`

```ts
attach({ name: string });
```

It allows us to explicitly set the name of the created attached effect:

```ts
import { attach } from "effector";

const attachedFx = attach({
  name: "anotherUsefulName",
  source: $store,
  async effect(source, params: Type) {
    // ...
  },
});
attachedFx.shortName; // "anotherUsefulName"
```

This parameter exists in **any variant** of the `attach`.

#### `domain`

```ts
attach({ domain: Domain });
```

It allows to create effect inside specified domain.

> Note: this property can only be used with a plain function `effect`.

```ts
import { createDomain, createStore, attach } from "effector";

const reportErrors = createDomain();
const $counter = createStore(0);

const attachedFx = attach({
  domain: reportErrors,
  source: $counter,
  async effect(counter) {
    // ...
  },
});
```


# Babel plugin

Built-in plugin for babel can be used for ssr and debugging. It inserts a name a Unit,
inferred from variable name and `sid` (Stable IDentifier), computed from the location in the source code.

For example, in case effects without handlers, it improves error messages by
clearly showing in which effect error happened.

```js
import { createEffect } from "effector";

const fetchFx = createEffect();

fetchFx();

// => no handler used in fetchFx
```

Try it

## Usage

In the simplest case, it can be used without any configuration:

```json
// .babelrc
{
  "plugins": ["effector/babel-plugin"]
}
```

## SID

> INFO since:
>
> [effector 20.2.0](https://changelog.effector.dev/#effector-20-2-0)

Stable hash identifier for events, effects, stores and domains, preserved between environments, to handle client-server
interaction within the same codebase.

The crucial value of sid is that it can be autogenerated by `effector/babel-plugin` with default config, and it will be stable between builds.

> TIP Deep dive explanation:
>
> If you need the detailed deep-dive explanation about why we need SIDs and how they are used internally, you can find it by following this link

See [example project](https://github.com/effector/effector/tree/master/examples/worker-rpc)

```js
// common.js
import { createEffect } from "effector";

export const getUser = createEffect({ sid: "GET /user" });
console.log(getUsers.sid);
// => GET /user
```

```js
// worker.js
import { getUsers } from "./common.js";

getUsers.use((userID) => fetch(userID));

getUsers.done.watch(({ result }) => {
  postMessage({ sid: getUsers.sid, result });
});

onmessage = async ({ data }) => {
  if (data.sid !== getUsers.sid) return;
  getUsers(data.userID);
};
```

```js
// client.js
import { createEvent } from "effector";
import { getUsers } from "./common.js";

const onMessage = createEvent();

const worker = new Worker("worker.js");
worker.onmessage = onMessage;

getUsers.use(
  (userID) =>
    new Promise((rs) => {
      worker.postMessage({ sid: getUsers.sid, userID });
      const unwatch = onMessage.watch(({ data }) => {
        if (data.sid !== getUsers.sid) return;
        unwatch();
        rs(data.result);
      });
    }),
);
```

## Configuration

### `hmr`

> INFO since:
>
> [effector 23.4.0](https://changelog.effector.dev/#effector-23.4.0)

Enable Hot Module Replacement (HMR) support to clean up links, subscriptions and side effects managed by Effector. This prevents double-firing of Effects and watchers.

> WARNING Interaction with factories:
>
> HMR support show best results when all factories in project are properly declared, which help plugin and runtime to know which code to clear on hot updates

#### Formulae

```json
"effector/babel-plugin",
  {
    "hmr": "es"
  }
]
```

* Type: `boolean` | `"es"` | `"cjs"`
    * `true`: Use hmr with auto-detection of target case. Based on [supportsStaticESM](https://babeljs.io/docs/options#caller) babel feature with wide support in bundlers
    * `"es"`: Use `import.meta.hot` HMR API in bundlers that are ESM-compliant, like Vite and Rollup
    * `"cjs"`: Use `module.hot` HMR API in bundlers that rely on CommonJS modules, like Webpack, Next.js or React Native
    * `false`: Disable Hot Module Replacement
* Default: `false`

> INFO In Production:
>
> When bundling for production, make sure to set the `hmr` option to `false` or remove it to reduce bundle size and improve runtime performance.

### `forceScope`

> INFO since:
>
> [effector 23.4.0](https://changelog.effector.dev/#effector-23.4.0)

Adds `forceScope` to all hooks from `effector-react`. This prevents mistakes when events called in non-scoped environment.

#### Formulae

```json
"effector/babel-plugin",
  {
    "forceScope": true
  }
```

* Type: `boolean`
    * `true`: Adds `{ forceScope: true }` to hooks like `useUnit`
    * `false`: Do nothing
* Default: `false`

### `importName`

Specifying import name or names to process by plugin. Import should be used in the code as specified.

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "importName": ["effector"]
  }
]
```

* Type: `string | string[]`
* Default: `['effector', 'effector/compat']`

### `factories`

Accepts an array of module names which exports treat as custom factories, therefore, each function call provides a unique prefix for sids of units inside them. Used to
SSR(Server Side Rendering) and it's not required for client-only application.

> INFO since:
>
> [effector 21.6.0](https://changelog.effector.dev/#effector-21-6-0)

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "factories": ["path/here"]
  }
]
```

* Type: `string[]`
* Factories can have any number of arguments.
* Factories can create any number of units.
* Factories can call any effector methods.
* Factories can call other factories from other modules.
* Modules with factories can export any number of functions.
* Factories should be compiled with `effector/babel-plugin` as well as code which use them.

#### Examples

```json
// .babelrc
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
        "factories": ["src/createEffectStatus", "~/createCommonPending"]
      }
    ]
  ]
}
```

```js
// ./src/createEffectStatus.js
import { rootDomain } from "./rootDomain";

export function createEffectStatus(fx) {
  const $status = rootDomain.createStore("init").on(fx.finally, (_, { status }) => status);

  return $status;
}
```

```js
// ./src/statuses.js
import { createEffectStatus } from "./createEffectStatus";
import { fetchUserFx, fetchFriendsFx } from "./api";

export const $fetchUserStatus = createEffectStatus(fetchUserFx);
export const $fetchFriendsStatus = createEffectStatus(fetchFriendsFx);
```

Import `createEffectStatus` from `'./createEffectStatus'` was treated as factory function, so each store created by it
has its own sid and will be handled by serialize
independently, although without `factories` they will share the same `sid`.

### `reactSsr`

Replaces imports from `effector-react` to `effector-react/scope`. Useful for building both server-side and client-side
builds from the same codebase.

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) the core team recommends deleting this option from `babel-plugin` configuration because effector-react supports SSR by default.

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "reactSsr": false
  }
]
```

* Type: `boolean`
* Default: `false`

### `addNames`

Adds name to units factories call. Useful for minification and obfuscation of production builds.

> INFO since:
>
> [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "addNames": true
  }
]
```

* Type: `boolean`
* Default: `true`

### `addLoc`

Adds location to methods' calls. Used by devtools, for example [effector-logger](https://github.com/effector/logger).

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "addLoc": false
  }
]
```

* Type: `boolean`
* Default: `false`

### `debugSids`

Adds a file path and variable name of a unit definition to a sid. Useful for debugging SSR.

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "debugSids": false
  }
]
```

* Type: `boolean`
* Default: `false`

### `transformLegacyDomainMethods`

Allows disabling transforming Unit creators on Domain. This option is useful when these transforms interfere with other libraries or your code.

The `effector/babel-plugin` may misidentify calls to unit creators because it is hard to know which variables are indeed Domains. If your project can't run due to this, you can turn these transforms off with this flag and pass `Domain` as an argument to regular unit creators, which is a better and more stable alternative.

> WARNING:
>
> Disabling this option will prevent units created with `Domain` methods from having a `sid` and other information. If your code relies on these methods, this will cause issues with your existing code.

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "transformLegacyDomainMethods": false
  }
]
```

* Type: `boolean`
* Default: `true`

### `noDefaults`

Option for `effector/babel-plugin` for making custom unit factories with clean configuration.

> INFO since:
>
> [effector 20.2.0](https://changelog.effector.dev/#effector-20-2-0)

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "noDefaults": false
  }
]
```

* Type: `boolean`
* Default: `false`

#### Examples

```json
// .babelrc
{
  "plugins": [
    ["effector/babel-plugin", { "addLoc": true }],
    [
      "effector/babel-plugin",
      {
        "importName": "@lib/createInputField",
        "storeCreators": ["createInputField"],
        "noDefaults": true
      },
      "createInputField"
    ]
  ]
}
```

```js
// @lib/createInputField.js
import { createStore } from "effector";
import { resetForm } from "./form";

export function createInputField(defaultState, { sid, name }) {
  return createStore(defaultState, { sid, name }).reset(resetForm);
}
```

```js
// src/state.js
import { createInputField } from "@lib/createInputField";

const foo = createInputField("-");
/*

will be treated as store creator and compiled to

const foo = createInputField('-', {
  name: 'foo',
  sid: 'z&si65'
})

*/
```

## Usage with Bundlers

### Vite + React (SSR)

To use with `effector/babel-plugin`, you have to following next steps:

1. Install `@vitejs/plugin-react` package.
2. `vite.config.js` should be follows:

> Note: `effector/babel-plugin` is not a package, it is bundled with `effector`

```js
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["effector/babel-plugin"],
        // Use .babelrc files
        babelrc: true,
        // Use babel.config.js files
        configFile: true,
      },
    }),
  ],
});
```


# clearNode

```ts
import { clearNode } from "effector";
```

Method for destroying stores, events, effects, subscriptions, and domains.

## Methods

### `clearNode(unit, config?)`

#### Formulae

```ts
clearNode(unit, config?: {deep?: boolean}): void
```

#### Arguments

1. `unit` (////): unit to be erased.
2. `config: {}` (optional): config object.
    * `deep?: boolean` (optional): erase node *and* all of its computed values.

#### Returns

`void`

#### Examples

##### Simple

```js
import { createStore, createEvent, clearNode } from "effector";

const inc = createEvent();
const $store = createStore(0).on(inc, (x) => x + 1);

inc.watch(() => console.log("inc called"));
$store.watch((x) => console.log("store state: ", x));
// => store state: 0
inc();
// => inc called
// => store state: 1
clearNode($store);
inc();
// => inc called
```

Try it

##### Deep clear

```js
import { createStore, createEvent, clearNode } from "effector";

const inc = createEvent();
const trigger = inc.prepend(() => {});
const $store = createStore(0).on(inc, (x) => x + 1);

trigger.watch(() => console.log("trigger called"));
inc.watch(() => console.log("inc called"));
$store.watch((x) => console.log("store state: ", x));
// => store state: 0
trigger();
// => trigger called
// => inc called
// => store state: 1
clearNode(trigger, { deep: true });
trigger();
// no reaction
inc();
// no reaction!
// all units, which depend on trigger, are erased
// including inc and store, because it depends on inc
```

Try it


# combine

import LiveDemo from "../../../../../components/LiveDemo.jsx";

This method allows retrieving the state from each passed store and combining them into a single value, storing it in a new derived store.
The resulting store will update every time any of the passed stores is updated.

If several stores update simultaneously, the method will process them all at once, meaning that `combine` batches updates, which leads to more efficient operation without unnecessary computations.

> WARNING Caution:
>
> `combine` returns not just a common store. Instead, it returns DerivedStore, it cannot be modified by the events or used as `target` in sample.

## Common formulae

```ts
declare const $a: Store<A>;
declare const $b: Store<B>;

// State transformation

const $c: Store<C> = combine({ a: $a, b: $b }, (values: { a: A; b: B }) => C);

const $c: Store<C> = combine([$a, $b], (values: [A, B]) => C);

const $c: Store<C> = combine($a, $b, (a: A, b: B) => C);

// State combination

const $c: Store<{ a: A; b: B }> = combine({ a: $a, b: $b });

const $c: Store<[A, B]> = combine([$a, $b]);
```

## State transformation

When function is passed to `combine` it will act as state transformation funciton which will be called at every `combine` update.
Result will be saved in created store. This function must be .

`combine` function called synchronously during combine call, if this function will throw an error, application will crash. This will be fixed in [24 release](https://github.com/effector/effector/issues/1163)

### `combine(...stores, fn)`

#### Formulae

```ts
const $a: Store<A>
const $b: StoreWritable<B>
const $c: Store<C> | StoreWritable<C>

$result: Store<D> = combine(
  $a, $b, $c, ...,
  (a: A, b: B, c: C, ...) => result
)
```

* After call `combine`, state of each store is extracted and passed to function arguments, `result` of a function call will be state of store `$result`
* Any number of stores can be passed to `combine`, but the latest argument always should be function-reducer that returns new state
* If function returned the same `result` as previous, store `$result` will not be triggered
* If several stores updated at the same time (during one tick) there will be single call of function and single update of `$result` store
* Function must be&#x20;

#### Returns

: New derived store

#### Examples

import demo\_combineStoresFn from "../../../../demo/combine/stores-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineStoresFn} />

### `combine({ A, B, C }, fn)`

#### Formulae

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<D> = combine(
  { a: $a, b: $b, c: $c },
  ({ a, b, c }: { a: A; b: B; c: C }): D => result,
);
```

* Read state from stores `$a`, `$b`, `$c` and assign it to properties `a`, `b`, `c` accordingly, calls function with that object
* The `result` of the function call saved in `$result` store
* If function returned the same `result` as previous, store `$result` will not be triggered
* If several stores updated at the same time (during one tick) there will be single call of function and single update of `$result` store
* Function must be&#x20;

#### Returns

: New derived store

#### Examples

import demo\_combineObjectFn from "../../../../demo/combine/object-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineObjectFn} />

### `combine([ A, B, C ], fn)`

#### Formulae

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<D> = combine([$a, $b, $c], ([A, B, C]): D => result);
```

* Read state from stores `$a`, `$b`, `$c` and assign it to array with the same order as passed stores, call function with that array
* The `result` of the function call saved in `$result` store
* If function returned the same `result` as previous, store `$result` will not be triggered
* If several stores updated at the same time (during one tick) there will be single call of function and single update of `$result` store
* Function must be&#x20;

#### Returns

: New derived store

#### Examples

import demo\_combineArrayFn from "../../../../demo/combine/array-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineArrayFn} />

## State combination

When there is no function in `combine` it will act as state combinator, creating a store with array or object with fields from given stores

### `combine({ A, B, C })`

> INFO:
>
> Formerly known as `createStoreObject`

#### Formulae

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<{ a: A; b: B; c: C }> = combine({ a: $a, b: $b, c: $c });
```

* Read state from stores `$a`, `$b`, `$c` and assign it to properties `a`, `b`, `c` accordingly, that object will be saved to `$result` store
* Store `$result` contain object `{a, b, c}` and will be updated on each update of passed stores
* If several stores updated at the same time (during one tick) there will be single update of `$result` store

#### Returns

: New derived store

#### Examples

import demo\_combineObject from "../../../../demo/combine/object.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineObject} />

### `combine([ A, B, C ])`

#### Formulae

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<[A, B, C]> = combine([$a, $b, $c]);
```

* Read state from stores `$a`, `$b`, `$c` and assign it to array with the same order as passed stores, that array will be saved to `$result` store
* Store `$result` will be updated on each update of passed stores
* If several stores updated at the same time (during one tick) there will be single update of `$result` store

#### Returns

: New derived store

#### Examples

import demo\_combineArray from "../../../../demo/combine/array.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineArray} />

## `combine` with primitives and objects

Primitives and objects can be used in `combine`, and `combine` will not be triggered. Effector will not track mutations of objects and primitives.

#### Examples

import demo\_combineNonStoresFn from "../../../../demo/combine/non-stores-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineNonStoresFn} />

## Parameters

All overloads of `combine` with `fn` provided are also supporting optional configuration object as the last parameter.

### `.skipVoid`

Flag to control how specifically store should handle `undefined` value *(since `effector 23.0.0`)*. If set to `false` - store will use `undefined` as a value. If set to `true` (deprecated), store will read `undefined` as a "skip update" command and will do nothing

#### Formulae

```ts
combine($a, $b, callback, { skipVoid: true });
```

* Type: `boolean`

#### Examples

```js
const $withFn = combine($a, $b, (a, b) => a || b, { skipVoid: false });
```


# createApi

```ts
import { createApi } from "effector";
```

`createApi` is a shortcut for generating events connected to a store by supplying an object with  for these events. If the source `store` is part of a domain, then the newly created events will also be within that domain.

## Methods

### `createApi(store, api)`

#### Formulae

```ts
createApi(store, api): objectWithEvents
```

#### Arguments

1. `store`
2. `api` (*Object*) An object with

#### Returns

(*Object*) An object with events

#### Examples

```js
import { createStore, createApi } from "effector";

const $playerPosition = createStore(0);

// Creating events and attaching them to the store
const api = createApi($playerPosition, {
  moveLeft: (pos, offset) => pos - offset,
  moveRight: (pos, offset) => pos + offset,
});

$playerPosition.watch((pos) => {
  console.log("position", pos);
});
// => position 0

api.moveRight(10);
// => position 10
api.moveLeft(5);
// => position 5
```

Try it


# createDomain

```ts
import { createDomain, type Domain } from "effector";
```

## Methods

### `createDomain(name?)`

Creates a domain

#### Formulae

```typescript
createDomain(name?): Domain
```

#### Arguments

1. `name`? (*string*): domain name. Useful for debugging

#### Returns

: New domain

#### Examples

```js
import { createDomain } from "effector";

const domain = createDomain(); // Unnamed domain
const httpDomain = createDomain("http"); // Named domain

const statusCodeChanged = httpDomain.createEvent();
const downloadFx = httpDomain.createEffect();
const apiDomain = httpDomain.createDomain(); // nested domain
const $data = httpDomain.createStore({ status: -1 });
```

Try it


# createEffect

## createEffect

```ts
import { createEffect } from "effector";

const effectFx = createEffect();
```

Method for creating effects. Returns a new effect.

### How to Create Effects

The `createEffect` method supports several ways to create effects:

1. With a handler - this is the simplest way.
2. With configuration.
3. Without a handler, which can be set later using the .use(handler) method.

#### With Handler

* **Type**

```ts
createEffect<Params, Done, Fail = Error>(
  handler: (params: Params) => Done | Promise<Done>,
): Effect<Params, Done, Fail>
```

* **Example**

```ts
import { createEffect } from "effector";

const fetchUserReposFx = createEffect(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

fetchUserReposFx.done.watch(({ params, result }) => {
  console.log(result);
});

await fetchUserReposFx({ name: "zerobias" });
```

#### With Configuration

The `name` field is used to improve error messages and debugging.

* **Type**

```ts
export function createEffect<Params, Done, Fail = Error>(config: {
  name?: string;
  handler?: (params: Params) => Promise<Done> | Done;
}): Effect<Params, Done, Fail>;
```

* **Example**

```ts
import { createEffect } from "effector";

const fetchUserReposFx = createEffect({
  name: "fetch user repositories",
  async handler({ name }) {
    const url = `https://api.github.com/users/${name}/repos`;
    const req = await fetch(url);
    return req.json();
  },
});

await fetchUserReposFx({ name: "zerobias" });
```

#### Without Handler

Most commonly used for testing. More detailed information.

> WARNING use is an anti-pattern:
>
> Try to avoid using `.use()`, as it's an anti-pattern and degrades type inference.

* **Example**

```ts
import { createEffect } from "effector";

const fetchUserReposFx = createEffect();

fetchUserReposFx.use(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

await fetchUserReposFx({ name: "zerobias" });
```

### Examples

* **Updating state on effect completion**:

```ts
import { createStore, createEffect } from "effector";

interface Repo {
  // ...
}

const $repos = createStore<Repo[]>([]);

const fetchUserReposFx = createEffect(async (name: string) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

$repos.on(fetchUserReposFx.doneData, (_, repos) => repos);
$repos.watch((repos) => {
  console.log(`${repos.length} repos`);
});
// => 0 repos

await fetchUserReposFx("zerobias");
// => 26 repos
```

Run example

* **Watching effect state**:

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

fetchUserReposFx.pending.watch((pending) => {
  console.log(`effect is pending?: ${pending ? "yes" : "no"}`);
});

fetchUserReposFx.done.watch(({ params, result }) => {
  console.log(params); // {name: 'zerobias'}
  console.log(result); // resolved value, result
});

fetchUserReposFx.fail.watch(({ params, error }) => {
  console.error(params); // {name: 'zerobias'}
  console.error(error); // rejected value, error
});

fetchUserReposFx.finally.watch(({ params, status, result, error }) => {
  console.log(params); // {name: 'zerobias'}
  console.log(`handler status: ${status}`);

  if (error) {
    console.log("handler rejected", error);
  } else {
    console.log("handler resolved", result);
  }
});

await fetchUserReposFx({ name: "zerobias" });
```

Run example

### Common errors

Below is a list of possible errors you may encounter when working with effects:

* no handler used in \[effect name]

### Related API and Articles

* **API**
    * Effect API - Description of effects, their methods and properties
    * sample - Key operator for building connections between units
    * attach - Creates new effects based on other effects
* **Articles**
    * Working with effects
    * How to type effects and other units
    * Guide to testing effects and other units


# createEvent

## createEvent

```ts
import { createEvent } from "effector";

const event = createEvent();
```

Method for creating [events][eventApi].

### Formula

```ts
createEvent<E = void>(eventName?: string): EventCallable<E>
createEvent<E = void>(config: {
  name?: string
  sid?: string
  domain?: Domain
}): EventCallable<E>
```

* **Arguments**

    * `eventName`: Optional argument. Event name for debugging.
    * `config`: Optional argument. Configuration object.

        * `name`: Event name.
        * `sid`: Stable identifier for SSR.
        * `domain`: Domain for the event.

* **Return value**

Returns a new callable [event][eventTypes].

### Examples

Updating state by calling an event:

```js
import { createStore, createEvent } from "effector";

const addNumber = createEvent();

const $counter = createStore(0);

$counter.on(addNumber, (state, number) => state + number);

$counter.watch((state) => {
  console.log("state", state);
});
// => 0

addNumber(10);
// => 10

addNumber(10);
// => 20

addNumber(10);
// => 30
```

Run example

We created the `addNumber` event and the `$counter` store, then subscribed to store updates.<br/>
Notice the function call `addNumber(10)`. Every time you call `addNumber(10)`, you can check the console and see how the state changes.

Processing data with derived events:

```js
import { createEvent } from "effector";

const extractPartOfArray = createEvent();
const array = extractPartOfArray.map((arr) => arr.slice(2));

array.watch((part) => {
  console.log(part);
});
extractPartOfArray([1, 2, 3, 4, 5, 6]);
// => [3, 4, 5, 6]
```

Run example

### Common errors

Below is a list of possible errors you may encounter when working with events:

* call of derived event is not supported, use createEvent instead
* unit call from pure function is not supported, use operators like sample instead

### Related API and Articles

* **API**
    * [`Event API`][eventApi] - Event API, its methods, properties and description
    * [`createApi`][createApi] - Creating a set of events for a store
    * [`merge`][merge] - Method for combining an array of units into one new event
    * [`sample`][sample] - Connecting events with other units
* **Articles**
    * [How to work with events][eventGuide]
    * [How to think in effector and why events matter][mindset]
    * [Guide to typing events and other units][typescript]

[eventApi]: /en/api/effector/Event

[eventTypes]: /en/api/effector/Event#event-types

[merge]: /en/api/effector/merge

[eventGuide]: /en/essentials/events

[mindset]: /en/resources/mindset

[typescript]: /en/essentials/typescript

[sample]: /en/api/effector/sample

[createApi]: /en/api/effector/createApi


# createStore

## createStore

```ts
import { createStore } from "effector";

const $store = createStore();
```

Method for creating [stores][storeApi].

### Formula

```ts
createStore(
  defaultState: State, // Initial store state
  config?: { // Configuration object with additional options
    skipVoid?: boolean; // Controls updates with undefined values
    name?: string; // Store name for debugging
    sid?: string // Stable identifier for SSR
    updateFilter?: (update: State, current: State) => boolean // Update filtering function
    serialize?: // Serialization configuration for SSR
    | 'ignore'
    | {
        write: (state: State) => SerializedState
        read: (json: SerializedState) => State
      }
    domain?: Domain; // Domain to which the store belongs
  },
): StoreWritable<State>
```

* **Arguments**

1. **`defaultState`**: Initial state
2. **`config`**: Optional configuration object

    * **`skipVoid`**: Optional argument. Determines whether the [store][storeApi] skips `undefined` values. Default is `true`. If you pass an `undefined` value to a store with `skipVoid: true`, you'll get [an error in the console][storeUndefinedError].<br/><br/>

    * **`name`**: Optional argument. Store name. [Babel-plugin][babel] can determine it from the store variable name if the name is not explicitly passed in the configuration.<br/><br/>

    * **`sid`**: Optional argument. Unique store identifier. [It's used to distinguish stores between different environments][storeSid]. When using [Babel-plugin][babel], it's set automatically.<br/><br/>

    * **`updateFilter`**:
      Optional argument. A [pure function][pureFn] that prevents store updates if it returns `false`. Should be used when the standard update prevention (if the value to be written to the store equals `undefined` or the current store value) is insufficient.

      <br/>

    * **`serialize`**: Optional argument responsible for store serialization.

        * `'ignore'`: excludes the store from serialization when calling [serialize][serialize].
        * Object with `write` and `read` methods for custom serialization. `write` is called when serialize is invoked and converts the store state to a JSON value – a primitive or simple object/array. `read` is called during fork if the provided `values` are the result of calling [serialize][serialize].

* **Return value**

Returns a new [store][storeApi].

### Examples

Basic store usage:

```js
import { createEvent, createStore } from "effector";

const addTodo = createEvent();
const clearTodos = createEvent();

const $todos = createStore([])
  .on(addTodo, (todos, newTodo) => [...todos, newTodo])
  .reset(clearTodos);

const $selectedTodos = $todos.map((todos) => {
  return todos.filter((todo) => !!todo.selected);
});

$todos.watch((todos) => {
  console.log("todos", todos);
});
```

Run example

Example with custom `serialize` configuration:

```ts
import { createEvent, createStore, serialize, fork, allSettled } from "effector";

const saveDate = createEvent();
const $date = createStore<null | Date>(null, {
  // Date objects are automatically converted to ISO date strings when calling JSON.stringify
  // but are not converted back to Date when calling JSON.parse – the result will be the same ISO date string
  // This will cause state mismatch when hydrating state on the client during server-side rendering
  //
  // Custom `serialize` configuration solves this problem
  serialize: {
    write: (dateOrNull) => (dateOrNull ? dateOrNull.toISOString() : dateOrNull),
    read: (isoStringOrNull) => (isoStringOrNull ? new Date(isoStringOrNull) : isoStringOrNull),
  },
}).on(saveDate, (_, p) => p);

const serverScope = fork();

await allSettled(saveDate, { scope: serverScope, params: new Date() });

const serverValues = serialize(serverScope);
// `serialize.write` for store `$date` was called

console.log(serverValues);
// => { nq1e2rb: "2022-11-05T15:38:53.108Z" }
// Date object from store saved as ISO date

const clientScope = fork({ values: serverValues });
// `serialize.read` for store `$date` was called

const currentDate = clientScope.getState($date);
console.log(currentDate);
// => Date 11/5/2022, 10:40:13 PM
// ISO date string converted back to Date object
```

Run example

### Common Errors

Below is a list of possible errors you may encounter when working with stores:

* [`store: undefined is used to skip updates. To allow undefined as a value provide explicit { skipVoid: false } option`][storeUndefinedError].
* [`serialize: One or more stores dont have sids, their values are omitted`][serializeError].
* [`unit call from pure function is not supported, use operators like sample instead`][unitCallError].

### Related API and Articles

* **API**
    * [`Store API`][storeApi] - Store API, its methods, properties and description
    * [`createApi`][createApi] - Creating a set of events for a store
    * [`combine`][combine] - Creating a new store based on other stores
    * [`sample`][sample] - Connecting stores with other units
* **Articles**
    * [How to manage state][storeGuide]
    * [Guide to working with SSR][ssr]
    * [What is SID and why stores need them][storeSid]
    * [How to type stores and other units][typescript]

[storeApi]: /en/api/effector/Store

[storeUndefinedError]: /en/guides/troubleshooting#store-undefined

[storeSid]: /en/explanation/sids

[ssr]: /en/guides/server-side-rendering

[storeGuide]: /en/essentials/manage-states

[combine]: /en/api/effector/combine

[sample]: /en/api/effector/sample

[createApi]: /en/api/effector/createApi

[serialize]: /en/api/effector/serialize

[typescript]: /en/essentials/typescript

[babel]: /en/api/effector/babel-plugin

[pureFn]: /en/explanation/glossary/#purity

[unitCallError]: /en/guides/troubleshooting#unit-call-from-pure-not-supported

[serializeError]: /en/guides/troubleshooting/#store-without-sid


# createWatch

```ts
import { createWatch } from "effector";
```

## Methods

### `createWatch(config)`

Creates a subscription on unit (store, event, or effect).

#### Formulae

```ts
createWatch<T>(config: {
  unit: Unit<T>
  fn: (payload: T) => void
  scope?: Scope
}): Subscription
```

#### Arguments

1. `config` (*Object*): Configuration
    * `unit` (*Unit*): Target unit (store, event of effect) that will be watched
    * `fn` (*Function*): Function that will be called when the unit is triggered. Accepts the unit's payload as the first argument.
    * `scope` (): An optional scope object (forked instance) to restrict watcher calls on particular scope.

#### Returns

: Unsubscribe function

#### Examples

##### With scope

```js
import { createWatch, createEvent, fork, allSettled } from "effector";

const changeName = createEvent();

const scope = fork();

const unwatch = createWatch({ unit: changeName, scope, fn: console.log });

await allSettled(changeName, { scope, params: "John" }); // output: John
changeName("John"); // no output
```

##### Without scope

```js
import { createWatch, createEvent, fork, allSettled } from "effector";

const changeName = createEvent();

const scope = fork();

const unwatch = createWatch({ unit: changeName, fn: console.log });

await allSettled(changeName, { scope, params: "John" }); // output: John
changeName("John"); // output: John
```


# debug traces

```ts
import "effector/enable_debug_traces";
```

A special import that enables detailed traces for difficult-to-debug errors, such as a Store missing a proper SID during Scope serialization.

> WARNING Performance cost:
>
> Debug traces work by capturing additional information when Stores and Events are created.
> This introduces a performance overhead during module initialization.
>
> We do not recommend using this API in production environments.

## Debug Trace import

To enable debug traces, add `import "effector/enable_debug_traces"` to the entrypoint of your bundle, like this:

```ts
// src/index.ts
import "effector/enable_debug_traces";

// ...rest of your code
```

### When to use it

If you encounter an error that can be diagnosed with this API, you will see a recommendation in the console: `Add "import 'effector/enable_debug_traces'" to your code entry module to see full stack traces`.

Don't forget to remove this import once the issue has been resolved.


# fork

```ts
import { fork, type Scope } from "effector";
```

## Methods

### `fork()`

> INFO since:
>
> introduced in [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

Creates an isolated instance of application.
Primary purposes of this method are SSR and testing.

#### Formulae

```ts
fork(): Scope
```

#### Returns

: New fresh scope

#### Examples

##### Create two instances with independent counter state

```js
import { createStore, createEvent, fork, allSettled } from "effector";

const inc = createEvent();
const dec = createEvent();
const $counter = createStore(0);

$counter.on(inc, (value) => value + 1);
$counter.on(dec, (value) => value - 1);

const scopeA = fork();
const scopeB = fork();

await allSettled(inc, { scope: scopeA });
await allSettled(dec, { scope: scopeB });

console.log($counter.getState()); // => 0
console.log(scopeA.getState($counter)); // => 1
console.log(scopeB.getState($counter)); // => -1
```

Try it

### `fork(options)`

Allows to set values for stores in scope and replace handlers for effects.

> INFO since:
>
> support for array of tuples in `values` and `handlers` introduced in [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

#### Formulae

```ts
fork(options: { values?, handlers? }): Scope
```

#### Arguments

1. `options: { values?, handlers? }` — Object with optional values and handlers

##### `values`

Option to provide initial states for stores.

Can be used in three ways:

1. Array of tuples with stores and values:

```ts
fork({
  values: [
    [$user, "alice"],
    [$age, 21],
  ],
});
```

2. Map with stores and values:

```ts
fork({
  values: new Map().set($user, "alice").set($age, 21),
});
```

3. Plain object: `{[sid: string]: value}`

```ts
fork({
  values: {
    [$user.sid]: "alice",
    [$age.sid]: 21,
  },
});
```

<br />

> INFO Explanation:
>
> Such objects are created by serialize, in application code **array of tuples is preferred**

##### `handlers`

Option to provide handlers for effects.

Can be used in different ways:

1. Array of tuples with effects and handlers:

```ts
fork({
  handlers: [
    [getMessageFx, (params) => ({ id: 0, text: "message" })],
    [getUserFx, async (params) => ({ name: "alice", age: 21 })],
  ],
});
```

2. Map with effects and handlers:

```ts
fork({
  handlers: new Map()
    .set(getMessageFx, (params) => ({ id: 0, text: "message" }))
    .set(getUserFx, async (params) => ({ name: "alice", age: 21 })),
});
```

3. Plain object: `{[sid: string]: handler}`

```ts
fork({
  handlers: {
    [getMessageFx.sid]: (params) => ({ id: 0, text: "message" }),
    [getUserFx.sid]: async (params) => ({ name: "alice", age: 21 }),
  },
});
```

<br />

> WARNING deprecation:
>
> Such objects are deprecated since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) and will be removed in future versions. Array of tuples is preferred.

#### Returns

: New fresh scope

#### Examples

##### Set initial state for store and change handler for effect

This is an example of test, which ensures that after a request to the server, the value of `$friends` is filled.

```ts
import { createEffect, createStore, fork, allSettled } from "effector";

const fetchFriendsFx = createEffect<{ limit: number }, string[]>(async ({ limit }) => {
  /* some client-side data fetching */
  return [];
});
const $user = createStore("guest");
const $friends = createStore([]);

$friends.on(fetchFriendsFx.doneData, (_, result) => result);

const testScope = fork({
  values: [[$user, "alice"]],
  handlers: [[fetchFriendsFx, () => ["bob", "carol"]]],
});

/* trigger computations in scope and await all called effects */
await allSettled(fetchFriendsFx, {
  scope: testScope,
  params: { limit: 10 },
});

/* check value of store in scope */
console.log(testScope.getState($friends));
// => ['bob', 'carol']
```

Try it

### `fork(domain, options?)`

> INFO since:
>
> Introduced in [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0).
>
> `fork` no longer requires `domain` as an argument, because it can automatically track all units starting from [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0).

#### Formulae

```ts
fork(domain: Domain, options?: { values?, handlers? }): Scope
```

#### Arguments

1. `domain` (): Optional domain to fork.
2. `options: { values?, handlers? }` — Object with optional values and handlers

#### Returns

: New fresh scope

#### Examples

TBD


# forward

```ts
import { forward, type Subscription } from "effector";
```

Method to create connection between units in a declarative way. Send updates from one set of units to another.

## Methods

### `forward({ from, to })`

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0).
>
> The core team recommends using sample instead of `forward`.

#### Formulae

```ts
forward({
  from: Unit | Unit[],
  to: Unit | Unit[]
}): Subscription
```

#### Arguments

1. `from` (Unit | Unit\[]): Source of updates. Forward will listen for changes of these units

    * if an [*Event*][_Event_] is passed, `to` will be triggered on each event trigger and receives event argument
    * if a [*Store*][_Store_] is passed, `to` will be triggered on each store **change** and receives new value of the store
    * if an [*Effect*][_Effect_] is passed, `to` will be triggered on each effect call and receives effect parameter
    * if an array of units is passed, `to` will be triggered when any unit in `from` array is triggered

2. `to` (Unit | Unit\[]): Target for updates. `forward` will trigger these units with data from `from`
    * if passed an [*Event*][_Event_], it will be triggered with data from `from` unit
    * if passed a [*Store*][_Store_], data from `from` unit will be written to store and **trigger its update**
    * if passed an [*Effect*][_Effect_], it will be called with data from `from` unit as parameter
    * if `to` is an array of units, each unit in that array will be triggered

#### Returns

Subscription: Unsubscribe function. It breaks connection between `from` and `to`. After call, `to` will not be triggered anymore.

> INFO since:
>
> Arrays of units are supported since [effector 20.6.0](https://changelog.effector.dev/#effector-20-6-0)

#### Examples

##### Send store updates to another store

```js
import { createStore, createEvent, forward } from "effector";

const $store = createStore(1);
const event = createEvent();

forward({
  from: event,
  to: $store,
});

$store.watch((state) => console.log("store changed: ", state));
// => store changed: 1

event(200);
// => store changed: 200
```

Try it

##### Forward between arrays of units

```js
import { createEvent, forward } from "effector";

const firstSource = createEvent();
const secondSource = createEvent();

const firstTarget = createEvent();
const secondTarget = createEvent();

forward({
  from: [firstSource, secondSource],
  to: [firstTarget, secondTarget],
});

firstTarget.watch((e) => console.log("first target", e));
secondTarget.watch((e) => console.log("second target", e));

firstSource("A");
// => first target A
// => second target A
secondSource("B");
// => first target B
// => second target B
```

Try it

[_effect_]: /en/api/effector/Effect

[_store_]: /en/api/effector/Store

[_event_]: /en/api/effector/Event


# fromObservable

```ts
import { fromObservable, type Observable } from "effector";
```

## Methods

### `fromObservable()`

Creates an event containing all items from an Observable.

#### Formulae

```ts
fromObservable<T>(source: Observable<T>): Event<T>
```

#### Arguments

1. `observable` (*Observable*)

#### Returns

: New event

#### Examples

##### Basic use case

```js
import { interval } from "rxjs";
import { fromObservable } from "effector";

//emit value in sequence every 1 second
const source = interval(1000);

const event = fromObservable(source);

//output: 0,1,2,3,4,5....
event.watch(console.log);
```


# guard

```ts
import { guard } from "effector";
```

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0).
>
> The core team recommends using sample instead of `guard`.

Method for conditional event routing.
It provides a way to control one dataflow with the help of another: when the condition and the data are in different places, we can use `guard` with stores as filters to trigger events when condition state is true, thereby modulate signals without mixing them.

## Methods

### `guard({ clock?, source?, filter, target? })`

#### Formulae

```ts
guard({ clock?, source?, filter, target? }): target
```

> INFO:
>
> Either `clock` or `source` is required

When `clock` is triggered, check `filter` for [truthy] and call `target` with data from `source` if `true`.

* If `clock` is not passed, `guard` will be triggered on every `source` update
* If `source` is not passed, call `target` with data from `clock`
* If `target` is not passed, create  with type of `source` and return it from `guard()`
* If `filter` is , check it value for [truthy]
* If `filter` is `Function`, call it with data from `source` and check result for [truthy]

[truthy]: https://developer.mozilla.org/en-US/docs/Glossary/Truthy

> INFO since:
>
> `clock` in `guard` is available since [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

### `guard({source, filter, target?})`

#### Arguments

1. `params` (*Object*): Configuration object

#### Returns

, which fires upon `clock` trigger

#### Examples

##### Basic

```js
import { createStore, createEffect, createEvent, guard } from "effector";

const clickRequest = createEvent();
const fetchRequest = createEffect((n) => new Promise((rs) => setTimeout(rs, 2500, n)));

const $clicks = createStore(0).on(clickRequest, (x) => x + 1);
const $requestsCount = createStore(0).on(fetchRequest, (x) => x + 1);

const $isIdle = fetchRequest.pending.map((pending) => !pending);

/*
1. on clickRequest
2. if $isIdle is true
3. take current $clicks value
4. and call fetchRequest with it
*/
guard({
  clock: clickRequest /* 1 */,
  filter: $isIdle /* 2 */,
  source: $clicks /* 3 */,
  target: fetchRequest /* 4 */,
});
```

See ui visualization

##### Function predicate

```js
import { createEffect, createEvent, guard } from "effector";

const submitForm = createEvent();
const searchUser = createEffect();

guard({
  source: submitForm,
  filter: (user) => user.length > 0,
  target: searchUser,
});

submitForm(""); // nothing happens
submitForm("alice"); // ~> searchUser('alice')
```

Try it

### `guard(source, {filter: booleanStore})`

#### Arguments

1. `source` (//): Source unit. Will trigger given `guard` on updates
2. `filter` (): Filter store

#### Examples

##### Store filter

```js
import { createEvent, createStore, createApi, guard } from "effector";

const trigger = createEvent();
const $unlocked = createStore(true);

const { lock, unlock } = createApi($unlocked, {
  lock: () => false,
  unlock: () => true,
});

const target = guard(trigger, {
  filter: $unlocked,
});

target.watch(console.log);
trigger("A");
lock();
trigger("B"); // nothing happens
unlock();
trigger("C");
```

Try it

### `guard(source, {filter: predicate})`

#### Arguments

1. `source` (//): Source unit. Will trigger given `guard` on updates
2. `filter` (*(payload) => Boolean*): Predicate function, should be&#x20;

#### Examples

##### Predicate function

```js
import { createEvent, guard } from "effector";

const source = createEvent();
const target = guard(source, {
  filter: (x) => x > 0,
});

target.watch(() => {
  console.log("target called");
});

source(0);
// nothing happens
source(1);
// target called
```

Try it


# hydrate

```ts
import { hydrate } from "effector";
```

A companion method for . Hydrates provided values into corresponding stores within a provided domain or scope. The main purpose is an application state hydration on the client side after SSR.

## Methods

### `hydrate(domainOrScope, {values})`

> WARNING:
>
> You need to make sure that the store is created beforehand, otherwise, the hydration might fail. This could be the case if you keep store initialization/hydration scripts separate from stores' creation.

#### Formulae

```ts
hydrate(domainOrScope: Domain | Scope, { values: Map<Store<any>, any> | {[sid: string]: any} }): void
```

#### Arguments

1. `domainOrScope`: domain or scope which will be filled with given `values`
2. `values`: a mapping from store sids to store values or a Map where keys are store objects and values contain initial store value

#### Returns

`void`

#### Examples

Populate store with a predefined value

```js
import { createStore, createDomain, fork, serialize, hydrate } from "effector";

const domain = createDomain();
const $store = domain.createStore(0);

hydrate(domain, {
  values: {
    [$store.sid]: 42,
  },
});

console.log($store.getState()); // 42
```

Try it


# effector

Effector API reference:

### Unit Definitions

* Event\<T>
* Effect\<Params, Done, Fail>
* Store\<T>
* Domain
* Scope

### Unit Creators

* createEvent()
* createStore(default)
* createEffect(handler)
* createDomain()

### Common Methods

* combine(...stores, f)
* attach({effect, mapParams, source})
* sample({clock, source, fn, target})
* merge(\[eventA, eventB])
* split(event, cases)
* createApi(store, api)

### Fork API

* fork()
* serialize(scope)
* allSettled(unit, { scope })
* scopeBind(event)
* hydrate(domain)

### Plugins

* effector/babel-plugin
* @effector-swc-plugin

### Utilities

* is
* fromObservable(observable)

### Low Level API

* clearNode()
* withRegion()
* launch()
* inspect()

### Import Map

Package `effector` provides couple different entry points for different purposes:

* effector/compat
* effector/inspect
* effector/babel-plugin

### Deprecated Methods

* forward({from, to})
* guard({source, filter, target})


# inspect

```ts
import { inspect } from "effector/inspect";
```

Special API methods designed to handle debugging and monitoring use cases without giving too much access to internals of your actual app.

Useful to create developer tools and production monitoring and observability instruments.

## Inspect API

Allows us to track any computations that have happened in the effector's kernel.

### `inspect()`

#### Example

```ts
import { inspect, type Message } from "effector/inspect";

import { someEvent } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

inspect({
  fn: (m) => {
    logInspectMessage(m);
  },
});

someEvent(42);
// will log something like
// [event] someEvent 42
// [on] 42
// [store] $count 1337
// ☝️ let's say that reducer adds 1295 to provided number
//
// and so on, any triggers
```

Scope limits the extent to which computations can be tracked. If no scope is provided - default out-of-scope mode computations will be tracked.

```ts
import { fork, allSettled } from "effector";
import { inspect, type Message } from "effector/inspect";

import { someEvent } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

const myScope = fork();

inspect({
  scope: myScope,
  fn: (m) => {
    logInspectMessage(m);
  },
});

someEvent(42);
// ☝️ No logs! That's because tracking was restricted by myScope

allSettled(someEvent, { scope: myScope, params: 42 });
// [event] someEvent 42
// [on] 42
// [store] $count 1337
```

### Tracing

Adding `trace: true` setting allows looking up previous computations, that led to this specific one. It is useful to debug the specific reason for some events happening

#### Example

```ts
import { fork, allSettled } from "effector";
import { inspect, type Message } from "effector/inspect";

import { someEvent, $count } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

const myScope = fork();

inspect({
  scope: myScope,
  trace: true, // <- explicit setting is needed
  fn: (m) => {
    if (m.kind === "store" && m.sid === $count.sid) {
      m.trace.forEach((tracedMessage) => {
        logInspectMessage(tracedMessage);
        // ☝️ here we are logging the trace of specific store update
      });
    }
  },
});

allSettled(someEvent, { scope: myScope, params: 42 });
// [on] 42
// [event] someEvent 42
// ☝️ traces are provided in backwards order, because we are looking back in time
```

### Errors

Effector does not allow exceptions in pure functions. In such case, branch computation is stopped and an exception is logged. There is also a special message type in such case:

#### Example

```ts
inspect({
  fn: (m) => {
    if (m.type === "error") {
      // do something about it
      console.log(`${m.kind} ${m.name} computation has failed with ${m.error}`);
    }
  },
});
```

## Inspect Graph

Allows us to track declarations of units, factories, and regions.

### Example

```ts
import { createStore } from "effector";
import { inspectGraph, type Declaration } from "effector/inspect";

function printDeclaration(d: Declaration) {
  console.log(`${d.kind} ${d.name}`);
}

inspectGraph({
  fn: (d) => {
    printDeclaration(d);
  },
});

const $count = createStore(0);
// logs "store $count" to console
```

### `withRegion`

Meta-data provided via region's root node is available on declaration.

#### Example

```ts
import { createNode, withRegion, createStore } from "effector";
import { inspectGraph, type Declaration } from "effector/inspect";

function createCustomSomething(config) {
  const $something = createStore(0);

  withRegion(createNode({ meta: { hello: "world" } }), () => {
    // some code
  });

  return $something;
}
inspectGraph({
  fn: (d) => {
    if (d.type === "region") console.log(d.meta.hello);
  },
});

const $some = createCustomSomething({});
// logs "world"
```


# is

```ts
import { is, type Unit } from "effector";
```

Namespace for unit validators.

## Methods

### `is.store(value)`

Checks if given value is

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.store($store);
// => true

is.store(event);
// => false

is.store(fx);
// => false

is.store(createDomain());
// => false

is.store(fx.pending);
// => true

is.store(fx.done);
// => false

is.store($store.updates);
// => false

is.store(null);
// => false
```

Try it

### `is.event(value)`

Checks if given value is

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.event($store);
// => false

is.event(event);
// => true

is.event(fx);
// => false

is.event(createDomain());
// => false

is.event(fx.pending);
// => false

is.event(fx.done);
// => true

is.event($store.updates);
// => true

is.event(null);
// => false
```

Try it

### `is.effect(value)`

Checks if given value is

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.effect($store);
// => false

is.effect(event);
// => false

is.effect(fx);
// => true

is.effect(createDomain());
// => false

is.effect(null);
// => false
```

Try it

### `is.targetable`

Checks if given value can be used in operators target (or be called as a function in case of events)

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect } from "effector";

const $store = createStore(null);
const $mapped = $store.map((x) => x);
const event = createEvent();
const mappedEvent = event.map((x) => x);
const fx = createEffect();

is.targetable($store);
// => true

is.targetable($mapped);
// => false

is.targetable(event);
// => true

is.targetable(mappedEvent);
// => false

is.targetable(fx);
// => true
```

### `is.domain(value)`

Checks if given value is

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.domain($store);
// => false

is.domain(event);
// => false

is.domain(fx);
// => false

is.domain(createDomain());
// => true

is.domain(null);
// => false
```

Try it

### `is.scope(value)`

> INFO since:
>
> [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

Checks if given value is  since [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0).

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { fork } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();
const scope = fork();

is.scope(scope);
// => true

is.scope($store);
// => false

is.scope(event);
// => false

is.scope(fx);
// => false

is.scope(createDomain());
// => false

is.scope(null);
// => false
```

Try it

### `is.unit(value)`

Checks if given value is Unit: Store, Event, Effect, Domain or Scope

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain, fork } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();
const scope = fork();

is.unit(scope);
// => true

is.unit($store);
// => true

is.unit(event);
// => true

is.unit(fx);
// => true

is.unit(createDomain());
// => true

is.unit(fx.pending);
// => true

is.unit(fx.done);
// => true

is.unit($store.updates);
// => true

is.unit(null);
// => false
```

Try it

### `is.attached(value)`

> INFO since:
>
> [effector 22.4.0](https://changelog.effector.dev/#effector-22-4-0)

Checks if given value is  created via  method. If passed not an effect, returns `false`.

#### Returns

`boolean` — Type-guard

#### Usage

Sometimes you need to add an error log on effects failures, but only on effects that have been "localized" via `attach`.
If you leave `onCreateEffect` as it is, without checks, the error log will be duplicated, because it will happen on the parent and the child effect.

```js
import { createDomain, attach, is } from "effector";

const logFailuresDomain = createDomain();

logFailuresDomain.onCreateEffect((effect) => {
  if (is.attached(effect)) {
    effect.fail.watch(({ params, error }) => {
      console.warn(`Effect "${effect.compositeName.fullName}" failed`, params, error);
    });
  }
});

const baseRequestFx = logFailuresDomain.createEffect((path) => {
  throw new Error(`path ${path}`);
});

const loadDataFx = attach({
  mapParams: () => "/data",
  effect: baseRequestFx,
});

const loadListFx = attach({
  mapParams: () => "/list",
  effect: baseRequestFx,
});

loadDataFx();
loadListFx();
```

Try it

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain, attach } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

const childFx = attach({
  effect: fx,
});

is.attached(childFx);
// => true

is.attached(fx);
// => false

is.attached($store);
// => false

is.attached(event);
// => false

is.attached(createDomain());
// => false

is.attached(null);
// => false
```

Try it


# launch

```ts
import { launch, type Unit, type Node } from "effector";
```

> INFO since:
>
> [effector 20.10.0](https://changelog.effector.dev/#effector-20-10-0)

## Methods

### `launch({ target, params })`

Low level method for running computation in units (events, effects or stores). Mostly used by library developers for fine-grained control of computations.

#### Formulae

```ts
launch({
  target,
  params,
  defer?: boolean,
  page?: any,
  scope?: Scope,
  meta?: Record<string, any>,
}): void
```

#### Arguments

TBD

#### Returns

`void`

### `launch(unit, params)`

#### Formulae

```ts
launch(unit: Unit | Node, params: T): void
```

#### Returns

`void`


# merge

```ts
import { merge, type Unit } from "effector";
```

## Methods

### `merge(units)`

> INFO since:
>
> [effector 20.0.0](https://changelog.effector.dev/#effector-20-0-0)

Merges an array of units (events, effects, or stores), returning a new event that triggers upon any of the given units being triggered.

```ts
merge(units: Unit[]): Event<T>
```

#### Arguments

1. `units`: An array of units to be merged.

#### Returns

: A new event that fires when any of the given units is triggered.

> TIP:
>
> In the case of a store, the resulting event will fire upon store updates.

#### Types

TBD

#### Examples

##### Basic Usage

```js
import { createEvent, merge } from "effector";

const foo = createEvent();
const bar = createEvent();
const baz = merge([foo, bar]);
baz.watch((v) => console.log("merged event triggered: ", v));

foo(1);
// => merged event triggered: 1
bar(2);
// => merged event triggered: 2
```

Try it

##### Working with Stores

```js
import { createEvent, createStore, merge } from "effector";

const setFoo = createEvent();
const setBar = createEvent();

const $foo = createStore(0).on(setFoo, (_, v) => v);
const $bar = createStore(100).on(setBar, (_, v) => v);

const anyUpdated = merge([$foo, $bar]);
anyUpdated.watch((v) => console.log(`state changed to: ${v}`));

setFoo(1); // => state changed to: 1
setBar(123); // => state changed to: 123
```

Try it

##### Merging a Store and an Event

```js
import { createEvent, createStore, merge } from "effector";

const setFoo = createEvent();
const otherEvent = createEvent();

const $foo = createStore(0).on(setFoo, (_, v) => v);
const merged = merge([$foo, otherEvent]);

merged.watch((v) => console.log(`merged event payload: ${v}`));

setFoo(999);
// => merged event payload: 999

otherEvent("bar");
// => merged event payload: bar
```

Try it


# effector/babel-plugin

Since Effector allows to automate many common tasks (like setting Stable IDentifiers and providing debug information for Units), there is a built-in plugin for Babel that enhances the developer experience when using the library.

## Usage

Please refer to the Babel plugin documentation for usage examples.


# effector/compat

```ts
import {} from "effector/compat";
```

The library provides a separate module with compatibility up to IE11 and Chrome 47 (browser for Smart TV devices).

> WARNING Bundler, Not Transpiler:
>
> Since third-party libraries can import `effector` directly, you **should not** use transpilers like Babel to replace `effector` with `effector/compat` in your code because by default, Babel will not transform third-party code.
>
> **Use a bundler instead**, as it will replace `effector` with `effector/compat` in all modules, including those from third parties.

### Required Polyfills

You need to install polyfills for these objects:

* `Promise`
* `Object.assign`
* `Array.prototype.flat`
* `Map`
* `Set`

In most cases, a bundler can automatically add polyfills.

#### Vite

<details>
<summary>Vite Configuration Example</summary>

```js
import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    legacy({
      polyfills: ["es.promise", "es.object.assign", "es.array.flat", "es.map", "es.set"],
    }),
  ],
});
```

</details>

## Usage

### Manual Replacement

You can use `effector/compat` instead of the `effector` package if you need to support old browsers.

```diff
- import {createStore} from 'effector'
+ import {createStore} from 'effector/compat'
```

### Automatic Replacement

However, you can set up your bundler to automatically replace `effector` with `effector/compat` in your code.

#### Webpack

<details>
<summary>Webpack Configuration Example</summary>

```js
module.exports = {
  resolve: {
    alias: {
      effector: "effector/compat",
    },
  },
};
```

</details>

#### Vite

<details>
<summary>Vite Configuration Example</summary>

```js
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      effector: "effector/compat",
    },
  },
});
```

</details>


# effector/inspect

Effector has special API methods designed to handle debugging and monitoring use cases without giving too much access to the internals of your actual app — Inspect API.

### Why a Separate Module?

Inspect API is designed to be disposable. By design, any feature that uses Inspect API can be removed from the production build without any side effects. To emphasize this, Inspect API is not included in the main module. Instead, it's available in a separate module `effector/inspect`.

### Usage

Please refer to Inspect API docs for usage examples.


# restore

```ts
import { restore } from "effector";
```

## Methods

### `restore(event, defaultState)`

Creates a  from an . It works like a shortcut for `createStore(defaultState).on(event, (_, payload) => payload)`

> WARNING It is not a derived store:
>
> Restore creates a new store. It is not a DerivedStore. That means you can modify its state via events, and use it as `target` in sample.

#### Formulae

```ts
restore(event: Event<T>, defaultState: T): StoreWritable<T>
```

#### Arguments

1. `event`
2. `defaultState` (*Payload*)

#### Returns

: New store

#### Examples

##### Basic

```js
import { createEvent, restore } from "effector";

const event = createEvent();
const $store = restore(event, "default");

$store.watch((state) => console.log("state: ", state));
// state: default

event("foo");
// state: foo
```

Try it

### `restore(effect, defaultState)`

Creates a  out of successful results of an . It works like a shortcut for `createStore(defaultState).on(effect.done, (_, {result}) => result)`

#### Formulae

```ts
restore(effect: Effect<Params, Done, Fail>, defaultState: Done): StoreWritable<Done>
```

#### Arguments

1. `effect`
2. `defaultState` (*Done*)

#### Returns

: New store

#### Types

Store will have the same type as `Done` from `Effect<Params, Done, Fail>`. Also, `defaultState` should have `Done` type.

#### Examples

##### Effect

```js
import { createEffect, restore } from "effector";

const fx = createEffect(() => "foo");
const $store = restore(fx, "default");

$store.watch((state) => console.log("state: ", state));
// => state: default

await fx();
// => state: foo
```

Try it

### `restore(shape)`

Creates an object with stores from an object with values.

#### Formulae

TBD

#### Arguments

1. `shape` (*State*)

#### Returns

: New store.

#### Examples

##### Object

```js
import { restore } from "effector";

const { foo: $foo, bar: $bar } = restore({
  foo: "foo",
  bar: 0,
});

$foo.watch((foo) => {
  console.log("foo", foo);
});
// => foo 'foo'
$bar.watch((bar) => {
  console.log("bar", bar);
});
// => bar 0
```

Try it


# sample API

[units]: /en/explanation/glossary#common-unit

[eventApi]: /en/api/effector/Event

[storeApi]: /en/api/effector/Store

[effectApi]: /en/api/effector/Effect

[purity]: /en/explanation/glossary/#purity

## `sample` API

```ts
import { sample } from "effector";
```

The `sample` method is used to connect units. Its main purpose is to take data from one place `source` and send it to another `target` when a certain trigger `clock` occurs.

A common use case is when you need to process an event using data from a store. Instead of using `store.getState()`, which can lead to inconsistent state, it's better to use `sample`.

> TIP how to work with sample:
>
> Learn how to compose units and use the&#x20;

### How it works

* When `clock` triggers, the value from `source` is read.
* If a `filter` is specified and returns `true`, or if it's a store with `true` value, processing continues.
* If a `fn` is provided, data is transformed.
* Data is then passed to the `target`.

### Special behavior of `sample`

* If `clock` is not provided, `sample` will trigger on every update of `source`.
* If `target` is not provided, `sample` will create and return a new derived [unit][units].

### Returned unit and value

If `target` is not provided, it will be created at runtime. The type of unit returned depends on this table:

| clock \ source                      |  |  |  |
| ----------------------------------- | --------------------------------- | --------------------------------- | ----------------------------------- |
|    | `Store`                           | `Event`                           | `Event`                             |
|    | `Event`                           | `Event`                           | `Event`                             |
|  | `Event`                           | `Event`                           | `Event`                             |

How to use this table:

1. Pick the type of `clock` (column).
2. Pick the type of `source` (row).
3. The intersecting cell shows the return type.

If `target` is explicitly provided, then that `target` is returned.

Example:

```ts
const event = createEvent();
const $store = createStore();
const $secondStore = createStore();

const $derivedStore = sample({
  clock: $store,
  source: $secondStore,
});
// Returns a derived store because both clock and source are stores

const derivedEvent = sample({
  clock: event,
  source: $store,
});
// Returns a derived event because the clock is an event
```

### Full form

* **Formula**

```ts
sample({
  clock?, // trigger
  source?, // data source
  filter?, // filter predicate
  fn?, // transformation function
  target?, // target unit
  batch?, // batching flag
  name? // unit name
})
```

#### `clock`

A trigger unit that determines when to sample the source.<br/>
Optional.

* **Type**

```ts
sample({
  clock?: Unit<T> | Unit<T>[],
})
```

Can be:

* [`Event<T>`][eventApi] — triggers on event call
* [`Store<T>`][storeApi] — triggers on store update
* [`Effect<T, Done, Fail>`][effectApi] — triggers on effect execution
* `Unit<T>[]` — triggers when any unit in the array is triggered

> INFO either clock or source required:
>
> Although the `clock` argument is optional, when using the `sample` method you must provide either `clock` or source.

```ts
const clicked = createEvent();
const $store = createStore(0);
const fetchFx = createEffect();

sample({
  source: $data,
  clock: clicked,
});

sample({
  source: $data,
  clock: $store,
});

sample({
  source: $data,
  clock: [clicked, fetchFx.done],
});
```

***

#### `source`

The data source to be read when the `clock` unit triggers.
If `clock` is not provided, then `source` is used as the `clock`.
Optional.

* **Type**

```ts
sample({
  source?: Unit<T> | Unit<T>[] | { [key: string]: Unit<T> },
})
```

Can be:

* [`Store<T>`][storeApi] — reads the current value of the store
* [`Event<T>`][eventApi] — takes the most recent payload from the event
* [`Effect<T, Done, Fail>`][effectApi] — takes the most recent payload from the effect call
* Object of [units][units] — for combining multiple sources
* Array of [units][units] — for combining multiple sources

> INFO either source or clock required:
>
> Although the `source` argument is optional, when using the `sample` method you must provide either `source` or clock.

***

#### `filter`

A predicate function or store used to filter the data. If it returns `false` (or is a store that holds `false`), the data will not be passed to `target`.
Optional.

* **Type**

```ts
sample({
  filter?: Store<boolean> | (source: Source, clock: Clock) => (boolean | Store<boolean>),
})
```

Can be:

* [`Store<boolean>`][storeApi] — a boolean store (either base or derived)
* Predicate function — returns a `boolean` value

```ts
const $isUserActive = createStore(false);

sample({
  clock: checkScore,
  source: $score,
  filter: (score) => score > 100,
  target: showWinnerFx,
});

sample({
  clock: action,
  source: $user,
  filter: $isUserActive,
  target: adminActionFx,
});
```

***

#### `fn`

A function used to transform the data before passing it to the `target`.
The function **must be pure**.
Optional.

* **Type**

```ts
sample({
  fn?: (source: Source, clock: Clock) => Target
})
```

> INFO returned data type:
>
> The type of data returned must match the type of data in `target`.

```ts
const $user = createStore<User>({});
const saveUserFx = createEffect((user: User) => {
  // ...
});

sample({
  clock: updateProfile,
  source: $user,
  fn: (user, updates) => ({ ...user, ...updates }),
  target: saveUserFx,
});

sample({
  clock: submit,
  source: $form,
  fn: (form) => form.email,
  target: sendEmailFx,
});
```

***

#### `target`

The destination unit that will receive the data and be triggered.
Optional.

* **Type**

```ts
sample({
  target?: Unit<T> | Unit<T>[],
})
```

Can be:

* EventCallable\<T> — a regular event (not derived) that will be called
* [`Effect<T, Done, Fail>`][effectApi] — an effect that will be triggered
* StoreWritable\<T> — a writable store that will be updated
* `Unit<T>[]` — all units in the array will be called

> INFO target without target:
>
> If `target` is not specified, `sample` returns a new derived unit.

```ts
const targetEvent = createEvent<string>();
const targetFx = createEffect<string, void>();
const $targetStore = createStore("");

// Event as target
sample({
  source: $store,
  clock: trigger,
  target: targetEvent,
});

// Effect as target
sample({
  source: $store,
  clock: trigger,
  target: targetFx,
});

// Store as target
sample({
  source: $store,
  clock: trigger,
  target: $targetStore,
});
```

***

#### `greedy`

> WARNING Deprecated:
>
> As of effector 23.0.0, the `greedy` property is deprecated.
>
> Use `batch` instead of `greedy`.

***

#### `batch`

Enables batching of updates for better performance. Default is `true`.
Optional.

* **Type**

```ts
sample({
  batch?: boolean // Default: true
})
```

***

#### `name`

The `name` field allows you to assign a debug-friendly name to the created unit.
Optional.

* **Type**

```ts
sample({
  name?: string
})
```

### Short Form

* **Formula**

```ts
sample(source, clock, fn?): Unit
```

This is a shorthand version of the `sample` method, which always implicitly returns a `target`.

It supports multiple patterns:

1. All arguments: `sample(source, clock, fn)` — with a transformation function
2. Just `source` and `clock`: `sample(source, clock)` — no transformation function
3. `source` and `fn`: `sample(source, fn)` — no `clock`, so `source` acts as the trigger
4. One argument: `sample(source)` — only `source`, which acts as the trigger and the source

* **Return value**

The return type depends on the combination of units used and the return type of fn, if present. Otherwise, it falls back to the `source`.

***

#### `source`

Acts as the data source when the `clock` triggers.
If no `clock` is provided, `source` is used as the trigger.

* **Type**

```ts
sample(source?: Unit<T> | Unit<T>[])
```

Can be:

* [`Store<T>`][storeApi] — current value of the store
* [`Event<T>`][eventApi] — last triggered payload
* [`Effect<T, Done, Fail>`][effectApi] — last payload sent to the effect
* `Unit<T>[]` — array of [units][units] that triggers when any unit is activated

> INFO behavior without clock:
>
> If `clock` is not specified, then `source` behaves as `clock` - that is, it acts as the trigger.

***

#### `clock`

The unit that acts as the trigger to read from source.
Optional.

* **Type**

```ts
sample(clock?: Unit<T> | Unit<T>[])
```

Can be:

* [`Event<T>`][eventApi] — triggered on event call
* [`Store<T>`][storeApi] — triggered on store update
* [`Effect<T, Done, Fail>`][effectApi] — triggered on effect execution
* `Unit<T>[]` — triggers on any unit in the array

```ts
const clicked = createEvent();
const $store = createStore(0);
const fetchFx = createEffect();

sample($data, clicked);

sample($data, $store);
```

***

#### `fn`

A transformation function to be applied before sending the result to the implicit target.
The function must be [**pure**][purity].
Optional.

* **Type**

```ts
sample(fn: (source: Source, clock: Clock) => result)
```

* **Example**

```ts
const $userName = createStore("john");

const submitForm = createEvent();

const sampleUnit = sample(
  $userName /* 2 */,
  submitForm /* 1 */,
  (name, password) => ({ name, password }) /* 3 */,
);

submitForm(12345678);

// 1. submitForm is triggered with 12345678
// 2. $userName value is read ("john")
// 3. The values are transformed and passed to sampleUnit
```

***

### Related APIs and Articles

* **API**

    * merge — Combines updates from an array of units
    * Store — Store description with methods and properties
    * Event — Event description with methods and properties
    * Effect — Effect description with methods and properties

* **Articles**

    * Typing units and methods
    * Unit composition and working with&#x20;


# scopeBind

```ts
import { scopeBind } from "effector";
```

`scopeBind` is a method to bind a unit (an Event or Effect) to a Scope to be called later. Effector supports imperative calling of events within watchers, however, there are instances where you must explicitly bind events to the scope, such as when triggering events from within `setTimeout` or `setInterval` callbacks.

## Methods

### `scopeBind(event, options?)`

#### Formulae

```ts
scopeBind<T>(event: EventCallable<T>): (payload: T) => void
scopeBind<T>(event: EventCallable<T>, options?: {scope?: Scope, safe?: boolean}): (payload: T) => void
```

#### Arguments

1. `event`  or  to be bound to the scope.
2. `options` (*Object*): Optional configuration.
    * `scope` (*Scope*): Scope to bind event to.
    * `safe` (*Boolean*): Flag for exception suppression if there is no scope.

#### Returns

`(payload: T) => void` — A function with the same types as `event`.

#### Examples

##### Basic Usage

We are going to call `changeLocation` inside `history.listen` callback so there is no way for effector to associate event with corresponding scope, and we should explicitly bind event to scope using `scopeBind`.

```ts
import { createStore, createEvent, attach, scopeBind } from "effector";

const $history = createStore(history);
const initHistory = createEvent();
const changeLocation = createEvent<string>();

const installHistoryFx = attach({
  source: $history,
  effect: (history) => {
    const locationUpdate = scopeBind(changeLocation);

    history.listen((location) => {
      locationUpdate(location);
    });
  },
});

sample({
  clock: initHistory,
  target: installHistoryFx,
});
```

See full example

### `scopeBind(callback, options?)`

Binds arbitrary callback to a scope to be called later. The bound version of the function retains all properties of the original, e.g., if the original function would throw when called with a certain argument, the bound version will also throw under the same circumstances.

> INFO since:
>
> Feature is available since `effector 23.1.0` release.
> Multiple function arguments are supported since `effector 23.3.0`

> WARNING:
>
> To be compatible with the Fork API, callbacks **must** adhere to the same rules as `Effect` handlers:
>
> * Synchronous functions can be used as they are.
> * Asynchronous functions must follow the rules described in "Imperative Effect calls with scope".

#### Formulae

```ts
scopeBind(callback: (...args: Args) => T, options?: { scope?: Scope; safe?: boolean }): (...args: Args) => T;
```

#### Arguments

1. `callback` (*Function*): Any function to be bound to the scope.
2. `options` (*Object*): Optional configuration.
    * `scope` (*Scope*): Scope to bind the event to.
    * `safe` (*Boolean*): Flag for exception suppression if there is no scope.

#### Returns

`(...args: Args) => T` — A function with the same types as `callback`.

#### Examples

```ts
import { createEvent, createStore, attach, scopeBind } from "effector";

const $history = createStore(history);
const locationChanged = createEvent();

const listenToHistoryFx = attach({
  source: $history,
  effect: (history) => {
    return history.listen(
      scopeBind((location) => {
        locationChanged(location);
      }),
    );
  },
});
```


# serialize

```ts
import { serialize, type Scope } from "effector";
```

## Methods

### `serialize(scope, params)`

A companion method for . It allows us to get a serialized value for all the store states within a scope. The main purpose is an application state serialization on the server side during SSR.

> WARNING Requirements:
>
>  or  is required for using this method, as these plugins provide the SIDs for stores, which are required for stable state serialization.
>
> You can find deep-dive explanation here

#### Formulae

```ts
serialize(scope: Scope, { ignore?: Array<Store<any>>; onlyChanges?: boolean }): {[sid: string]: any}
```

#### Arguments

1. `scope` : a scope object (forked instance)
2. `ignore` Optional array of  to be omitted during serialization (added 20.14.0)
3. `onlyChanges` Optional boolean flag to ignore stores which didn't change in fork (prevent default values from being carried over network)

> WARNING Deprecated:
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) property `onlyChanges` is deprecated.

#### Returns

An object with store values using sids as a keys

> WARNING Reminder:
>
> If a store does not have a sid, its value will be omitted during serialization.

#### Examples

##### Serialize forked instance state

```js
import { createStore, createEvent, allSettled, fork, serialize } from "effector";

const inc = createEvent();
const $store = createStore(42);
$store.on(inc, (x) => x + 1);

const scope = fork();

await allSettled(inc, { scope });

console.log(serialize(scope)); // => {[sid]: 43}
```

Try it

##### Using with `onlyChanges`

With `onlyChanges`, this method will serialize only stores which were changed by some trigger during work or defined in `values` field by fork or hydrate(scope). Once being changed, a store will stay marked as changed in given scope even if it was turned back to the default state during work, otherwise client will not update that store on its side, which is unexpected and inconsistent.
This allows us to hydrate client state several times, for example, during route changes in next.js

```js
import { createDomain, fork, serialize, hydrate } from "effector";

const app = createDomain();

/** store which we want to hydrate by server */
const $title = app.createStore("dashboard");

/** store which is not used by server */
const $clientTheme = app.createStore("light");

/** scope in client app */
const clientScope = fork(app, {
  values: new Map([
    [$clientTheme, "dark"],
    [$title, "profile"],
  ]),
});

/** server side scope of chats page created for each request */
const chatsPageScope = fork(app, {
  values: new Map([[$title, "chats"]]),
});

/** this object will contain only $title data
 * as $clientTheme never changed in server scope */
const chatsPageData = serialize(chatsPageScope, { onlyChanges: true });
console.log(chatsPageData);
// => {'-l644hw': 'chats'}

/** thereby, filling values from a server will touch only relevant stores */
hydrate(clientScope, { values: chatsPageData });

console.log(clientScope.getState($clientTheme));
// => dark
```

Try it


# split

```ts
import { split } from "effector";
```

Choose one of cases by given conditions. It "splits" source unit into several events, which fires when payload matches their conditions. Works like pattern matching for payload values and external stores

## Concepts

### Case mode

Mode in which target case is selected by the name of its field. Case could be selected from data in `source` by case function or from external case store which kept current case name. After selection data from `source` will be sent to corresponding `cases[fieldName]` (if there is one), if none of the fields matches, then the data will be sent to `cases.__` (if there is one).

**See also**:

* case store
* case function

### Matching mode

Mode in which each case is sequentially matched by stores and functions in fields of `match` object.
If one of the fields got `true` from store value or return of function, then the data from `source` will be sent to corresponding `cases[fieldName]` (if there is one), if none of the fields matches, then the data will be sent to `cases.__` (if there is one)

**See also**:

* matcher store
* matcher function

### Case store

Store with a string which will be used to choose the case by its name. Placed directly in `match` field.

```ts
split({
  source: Unit<T>
  // case store
  match: Store<'first' | 'second'>,
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Case function

String-returning function which will be called with value from `source` to choose the case by its name. Placed directly in `match` field, should be&#x20;

```ts
split({
  source: Unit<T>
  // case function
  match: (value: T) => 'first' | 'second',
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Matcher store

Boolean store which indicates whether to choose the particular case or try the next one. Placed in fields of `match` object, might be mixed with matcher functions

```ts
split({
  source: Unit<T>
  match: {
    // matcher store
    first: Store<boolean>,
    second: Store<boolean>
  },
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Matcher function

> INFO:
>
> Case store, case function and matcher store are supported since [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

Boolean-returning function which indicates whether to choose the particular case or try the next one. Placed in fields of `match` object, might be mixed with matcher stores, should be&#x20;

```ts
split({
  source: Unit<T>
  match: {
    // matcher function
    first: (value: T) => boolean,
    second: (value: T) => boolean
  },
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

## Methods

### `split({ source, match, cases })`

> INFO since:
>
> [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

#### Formulae

```ts
split({ source, match, cases });
```

```ts
split({
  source: Unit<T>
  // case function
  match: (data: T) => 'a' | 'b',
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
split({
  source: Unit<T>
  // case store
  match: Store<'a' | 'b'>,
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
split({
  source: Unit<T>
  match: {
    // matcher function
    a: (data: T) => boolean,
    // matcher store
    b: Store<boolean>
  },
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

#### Arguments

* `source`: Unit which will trigger computation in `split`
* `match`: Single store with string, single function which returns string or object with boolean stores and functions which returns boolean
* `cases`: Object with units or arrays of units to which data will be passed from `source` after case selection

#### Returns

`void`

#### Examples

##### Basic

```js
import { split, createEffect, createEvent } from "effector";
const messageReceived = createEvent();
const showTextPopup = createEvent();
const playAudio = createEvent();
const reportUnknownMessageTypeFx = createEffect(({ type }) => {
  console.log("unknown message:", type);
});

split({
  source: messageReceived,
  match: {
    text: (msg) => msg.type === "text",
    audio: (msg) => msg.type === "audio",
  },
  cases: {
    text: showTextPopup,
    audio: playAudio,
    __: reportUnknownMessageTypeFx,
  },
});

showTextPopup.watch(({ value }) => {
  console.log("new message:", value);
});

messageReceived({
  type: "text",
  value: "Hello",
});
// => new message: Hello
messageReceived({
  type: "image",
  imageUrl: "...",
});
// => unknown message: image
```

Try it

##### Direct match

You can match directly to store api as well:

```js
import { split, createStore, createEvent, createApi } from "effector";

const messageReceived = createEvent();

const $textContent = createStore([]);

split({
  source: messageReceived,
  match: {
    text: (msg) => msg.type === "text",
    audio: (msg) => msg.type === "audio",
  },
  cases: createApi($textContent, {
    text: (list, { value }) => [...list, value],
    audio: (list, { duration }) => [...list, `audio ${duration} ms`],
    __: (list) => [...list, "unknown message"],
  }),
});

$textContent.watch((messages) => {
  console.log(messages);
});

messageReceived({
  type: "text",
  value: "Hello",
});
// => ['Hello']
messageReceived({
  type: "image",
  imageUrl: "...",
});
// => ['Hello', 'unknown message']
messageReceived({
  type: "audio",
  duration: 500,
});
// => ['Hello', 'unknown message', 'audio 500 ms']
```

Try it

##### Cases with arrays of units

```js
import { createEffect, createEvent, createStore, sample, split } from "effector";

const $verificationCode = createStore("12345");
const $error = createStore("");

const modalToInputUsername = createEvent();
const modalToAuthorizationMethod = createEvent();

const checkVerificationCodeFx = createEffect((code) => {
  throw "500";
});

sample({
  clock: verificationCodeSubmitted,
  source: $verificationCode,
  target: checkVerificationCodeFx,
});

split({
  source: checkVerificationCodeFx.failData,
  match: (value) => (["400", "410"].includes(value) ? "verificationCodeError" : "serverError"),
  cases: {
    verificationCodeError: $verificationCodeError,
    serverError: [$error, modalToAuthorizationMethod],
  },
});

$error.updates.watch((value) => console.log("ERROR: " + value));
modalToAuthorizationMethod.watch(() =>
  console.log("Modal window to the authorization method content."),
);
// => ERROR: 500
// => Modal window to the authorization method content.
```

### `split(source, match)`

> INFO since:
>
> [effector 20.0.0](https://changelog.effector.dev/#effector-20-0-0)

#### Formulae

```ts
split(source, match);
```

#### Arguments

1. `source`: Unit which will trigger computation in `split`
2. `match` (*Object*): Schema of cases, which uses names of resulting events as keys, and matching function\*((value) => Boolean)\*

#### Returns

(Object) – Object, having keys, defined in `match` argument, plus `__`(two underscores) – which stands for `default` (no matches met) case.

#### Examples

##### Basic

```js
import { createEvent, split } from "effector";

const message = createEvent();

const messageByAuthor = split(message, {
  bob: ({ user }) => user === "bob",
  alice: ({ user }) => user === "alice",
});
messageByAuthor.bob.watch(({ text }) => {
  console.log("[bob]: ", text);
});
messageByAuthor.alice.watch(({ text }) => {
  console.log("[alice]: ", text);
});

message({ user: "bob", text: "Hello" });
// => [bob]: Hello
message({ user: "alice", text: "Hi bob" });
// => [alice]: Hi bob

/* default case, triggered if no one condition met */
const { __: guest } = messageByAuthor;
guest.watch(({ text }) => {
  console.log("[guest]: ", text);
});
message({ user: "unregistered", text: "hi" });
// => [guest]: hi
```

Try it

> INFO:
>
> Only the first met match will trigger resulting event

##### Another

```js
import { createEvent, split } from "effector";

const message = createEvent();

const { short, long, medium } = split(message, {
  short: (m) => m.length <= 5,
  medium: (m) => m.length > 5 && m.length <= 10,
  long: (m) => m.length > 10,
});

short.watch((m) => console.log(`short message '${m}'`));
medium.watch((m) => console.log(`medium message '${m}'`));
long.watch((m) => console.log(`long message '${m}'`));

message("Hello, Bob!");
// => long message 'Hello, Bob!'

message("Hi!");
// => short message 'Hi!'
```

Try it

### `split({ source, clock?, match, cases })`

> INFO since:
>
> [effector 22.2.0](https://changelog.effector.dev/#effector-22-2-0)

It works the same as split with cases, however computations in `split` will be started after `clock` is triggered.

#### Formulae

```js
split({source, clock?, match, cases})
```

#### Arguments

TBD

#### Examples

```js
import { createStore, createEvent, createEffect, split } from "effector";

const options = ["save", "delete", "forward"];
const $message = createStore({ id: 1, text: "Bring me a cup of coffee, please!" });
const $mode = createStore("");
const selectedMessageOption = createEvent();
const saveMessageFx = createEffect(() => "save");
const forwardMessageFx = createEffect(() => "forward");
const deleteMessageFx = createEffect(() => "delete");

$mode.on(selectedMessageOption, (mode, opt) => options.find((item) => item === opt) ?? mode);

split({
  source: $message,
  clock: selectedMessageOption,
  match: $mode,
  cases: {
    save: saveMessageFx,
    delete: deleteMessageFx,
    forward: forwardMessageFx,
  },
});

selectedMessageOption("delet"); // nothing happens
selectedMessageOption("delete");
```

Try it


# SWC plugin

An official SWC plugin can be used for SSR and easier debugging experience in SWC-powered projects, like [Next.js](https://nextjs.org) or Vite with [vite-react-swc plugin](https://github.com/vitejs/vite-plugin-react-swc).

The plugin has the same functionality as the built-in babel-plugin.
It provides all Units with unique `SID`s (Stable Identifier) and name, as well as other debug information.

> WARNING Unstable:
>
> This SWC plugin, along with all other SWC plugins, is currently considered experimental and unstable.
>
> SWC and Next.js might not follow semver when it comes to plugin compatibility.

## Installation

Install @effector/swc-plugin using your preferred package manager.

```bash
npm install -ED @effector/swc-plugin
```

### Versioning

To avoid compatibility issues caused by breaking changes in SWC or Next.js, this plugin publishes different ['labels'](https://semver.org/#spec-item-9) for different underlying `@swc/core`. Refer to the table below to choose the correct plugin version for your setup.

> TIP:
>
> For better stability, we recommend pinning both your runtime (like Next.js or `@swc/core`) and the `@effector/swc-plugin` version.
>
> Use the `--exact`/`--save-exact` option in your package manager to install specific, compatible versions. This ensures updates to one dependency don't break your application.

| `@swc/core` version | Next.js version                          | Correct plugin version |
| ------------------- | ---------------------------------------- | ---------------------- |
| `>=1.4.0 <1.6.0`    | `>=14.2.0 <=14.2.15`                     | `@swc1.4.0`            |
| `>=1.6.0 <1.7.0`    | `>=15.0.0-canary.37 <=15.0.0-canary.116` | `@swc1.6.0`            |
| `>=1.7.0 <1.8.0`    | `>=15.0.0-canary.122 <=15.0.2`           | `@swc1.7.0`            |
| `>=1.9.0 <1.10.0`   | `>=15.0.3 <15.2.0`                       | `@swc1.9.0`            |
| `>=1.10.0 <1.11.0`  | `>=15.2.0 <15.2.1`                       | `@swc1.10.0`           |
| `>=1.11.0`          | `>=15.2.1 <15.4.0`                       | `@swc1.11.0`           |
| `>=1.12.0`          | `>=15.4.0`                               | `@swc1.12.0`           |

For more information on compatibility, refer to the SWC documentation on [Selecting the SWC Version](https://swc.rs/docs/plugin/selecting-swc-core) and interactive [compatibility table](https://plugins.swc.rs) on SWC website.

## Usage

To use the plugin, simply add it to your tool's configuration.

### Next.js

If you're using the [Next.js Compiler](https://nextjs.org/docs/architecture/nextjs-compiler) powered by SWC, add this plugin to your `next.config.js`.

```js
const nextConfig = {
  experimental: {
    // even if empty, pass an options object `{}` to the plugin
    swcPlugins: [["@effector/swc-plugin", {}]],
  },
};
```

You'll also need to install the official [`@effector/next`](https://github.com/effector/next) bindings to enable SSR/SSG.

> WARNING Turbopack:
>
> Note that some functionality may be broken when using Turbopack with Next.js, especially with relative . Use at your own risk.

### .swcrc

Add a new entry to `jsc.experimental.plugins` option in your `.swcrc`.

```json
{
  "$schema": "https://json.schemastore.org/swcrc",
  "jsc": {
    "experimental": {
      "plugins": [["@effector/swc-plugin", {}]]
    }
  }
}
```

## Configuration

### `factories`

Specify an array of module names or files to treat as custom factories. When using SSR, factories is required for ensuring unique SIDs across your application.

> TIP:
>
> Community packages ([`patronum`](https://patronum.effector.dev), [`@farfetched/core`](https://ff.effector.dev/), [`atomic-router`](https://atomic-router.github.io/), [`effector-action`](https://github.com/AlexeyDuybo/effector-action) and [`@withease/factories`](https://withease.effector.dev/factories/)) are always enabled, so you don't need to list them explicitly.

#### Formulae

```json
["@effector/swc-plugin", { "factories": ["./path/to/factory", "factory-package"] }]
```

* Type: `string[]`
* Default: `[]`

If you provide a relative path (starting with `./`), the plugin treats it as a local factory relative to your project's root directory. These factories can only be imported using relative imports within your code.

Otherwise, if you specify a package name or TypeScript alias, it's interpreted as an exact import specifier. You must use such import exactly as specified in configuration.

#### Examples

```json
["@effector/swc-plugin", { "factories": ["./src/factory"] }]
```

```ts title="/src/factory.ts"
import { createStore } from "effector";

/* createBooleanStore is a factory */
export const createBooleanStore = () => createStore(true);
```

```ts title="/src/widget/user.ts"
import { createBooleanStore } from "../factory";

const $boolean = createBooleanStore(); /* Treated as a factory! */
```

### `debugSids`

Append the full file path and Unit name to generated `SID`s for easier debugging of SSR issues.

#### Formulae

```json
["@effector/swc-plugin", { "debugSids": false }]
```

* Type: `boolean`
* Default: `false`

### `hmr`

> INFO Since:
>
> `@effector/swc-plugin@0.7.0`

Enable Hot Module Replacement (HMR) support to clean up links, subscriptions and side effects managed by Effector. This prevents double-firing of Effects and watchers.

> WARNING Interaction with factories:
>
> Hot Module Replacement works best when all factories in the project are properly declared. A correct configuration allows the plugin to detect what code should be cleaned up during hot reload.

#### Formulae

```json
["@effector/swc-plugin", { "hmr": "es" }]
```

* Type: `"es"` | `"cjs"` | `false`
    * `"es"`: Use `import.meta.hot` HMR API in bundlers that are ESM-compliant, like Vite and Rollup
    * `"cjs"`: Use `module.hot` HMR API in bundlers that rely on CommonJS modules, like Webpack, Next.js or Metro (React Native)
    * `false`: Disable Hot Module Replacement
* Default: `false`

> INFO In Production:
>
> When bundling for production, make sure to set the `hmr` option to `false` to reduce bundle size and improve runtime performance.

### `addNames`

Add names to Units when calling factories (like `createStore` or `createDomain`). This is helpful for debugging during development and testing, but its recommended to disable it for minification.

#### Formulae

```json
["@effector/swc-plugin", { "addNames": true }]
```

* Type: `boolean`
* Default: `true`

### `addLoc`

Include location information (file paths and line numbers) for Units and factories. This is useful for debugging with tools like [`effector-logger`](https://github.com/effector/logger).

#### Formulae

```json
["@effector/swc-plugin", { "addLoc": true }]
```

* Type: `boolean`
* Default: `false`

### `forceScope`

Inject `forceScope: true` into all hooks or `@effector/reflect` calls to ensure your app always uses `Scope` during rendering. If `Scope` is missing, an error will be thrown, eliminating the need for `/scope` or `/ssr` imports.

> INFO Note:
>
> Read more about Scope enforcement in the `effector-react` documentation.

#### Formulae

```json
[
  "@effector/swc-plugin",
  {
    "forceScope": { "hooks": true, "reflect": false }
  }
]
```

* Type: `boolean | { hooks: boolean, reflect: boolean }`
* Default: `false`

##### `hooks`

Enforces all hooks from effector-react and effector-solid, like `useUnit` and `useList`, to use `Scope` in runtime.

##### `reflect`

> INFO Since:
>
> Supported by `@effector/reflect` since 9.0.0

For [`@effector/reflect`](https://github.com/effector/reflect) users, enforces all components created with `reflect` library use `Scope` in runtime.

### `transformLegacyDomainMethods`

When enabled (default), this option transforms Unit creators in Domains, like `domain.event()` or `domain.createEffect()`. However, this transformation can be unreliable and may affect unrelated code. If that's the case for you, disabling this option can fix these issues.

Disabling this option will **stop** adding SIDs and other debug information to these unit creators. Ensure your code does not depend on domain methods before disabling.

> TIP:
>
> Instead of using unit creators directly on domain, consider using the `domain` argument in regular methods.

#### Formulae

```json
["@effector/swc-plugin", { "transformLegacyDomainMethods": false }]
```

* Type: `boolean`
* Default: `true`


# withRegion

```ts
import { withRegion } from "effector";
```

The method is based on the idea of region-based memory management (see [Region-based memory management](https://en.wikipedia.org/wiki/Region-based_memory_management) for reference).

## Methods

### `withRegion(unit, callback)`

> INFO since:
>
> [effector 20.11.0](https://changelog.effector.dev/#effector-20-11-0)

The method allows to explicitly transfer ownership of all units (including links created with `sample`, `forward`, etc...) defined in the callback to `unit`. As an implication, all the created links will be erased as soon as `clearNode` is called on .

#### Formulae

```ts
withRegion(unit: Unit<T> | Node, callback: () => void): void
```

#### Arguments

1. `unit`: *Unit* | *Node* — which will serve as "local area" or "region" owning all the units created within the provided callback. Usually a node created by low level `createNode` method is optimal for this case.
2. `callback`: `() => void` — The callback where all the relevant units should be defined.

#### Examples

```js
import { createNode, createEvent, restore, withRegion, clearNode } from "effector";

const first = createEvent();
const second = createEvent();
const $store = restore(first, "");
const region = createNode();

withRegion(region, () => {
  // Following links created with `sample` are owned by the provided unit `region`
  // and will be disposed as soon as `clearNode` is called on `region`.
  sample({
    clock: second,
    target: first,
  });
});

$store.watch(console.log);

first("hello");
second("world");

clearNode(region);

second("will not trigger updates of `$store`");
```


# API Reference

import FeatureCard from "@components/FeatureCard.astro";
import IconReact from "@icons/React.astro";
import IconVue from "@icons/Vue.astro";
import IconSolid from "@icons/Solid.astro";
import IconEffector from "@icons/Effector.astro";
import IconNextJs from "@icons/NextJs.astro";
import MostUsefulMethods from "@components/MostUsefulMethods.astro";
import { MOST\_USEFUL } from "src/navigation";

Short overview of most useful methods and packages provided by Effector.

<MostUsefulMethods items={MOST_USEFUL} />


# Protocol @@unitShape

> INFO:
>
> Available since [effector-react 22.4.0](https://changelog.effector.dev/#effector-react-22-4-0), effector-solid 0.22.7

Effector provides a way to use units (Stores, Events, Effects) in UI libraries with a special bindings like `effector-react`, `effector-solid`, etc. Normally, they allow binding any shape of units to a UI-framework:

```ts
import { createStore } from "effector";
import { useUnit } from "effector-react";

const $value = createStore("Hello!");

const Component = () => {
  const { value } = useUnit({ value: $value });

  return <p>{value}</p>;
};
```

But what if you want to create your own library on top of effector with some custom entities? For example, you want to create a router library with a custom `Route` entity, and you want to allow users to use it with `effector-react` bindings:

```ts
import { createRoute } from "my-router-library";
import { useUnit } from "effector-react";

const mainPageRoute = createRoute(/* ... */);

const Component = () => {
  const { params } = useUnit(mainPageRoute);

  return <p>{params.name}</p>;
};
```

It is possible with the `@@unitShape` protocol. It allows defining the shape of a unit in the custom entity and then using it in UI libraries. Just add field `@@unitShape` with a function that return shape of units to your entity:

```ts
function createRoute(/* ... */) {
  const $params = createStore(/* ... */);

  return {
    "@@unitShape": () => ({
      params: $params,
    }),
  };
}
```

### FAQ

***

**Q**: How frequently `@@unitShape`-function is called?

**A**: As many times as `useUnit` itself is called – it depends on a UI-library. For example, `effector-react` calls it as any other hook – once per component render, but `effector-solid` calls `useUnit` once per component mount.

***

**Q**: How can I know what UI-library is used for particular `@@unitShape` call?

**A**: You cannot. `@@unitShape` has to be universal for all UI-libraries either has to check what UI-library is used inside by UI-library methods (like `Context` in React or Solid).


# Events in effector

## Events

The **Event** in effector represents a user action, a step in the application process, a command to execute, or an intention to make modifications, among other things. This unit is designed to be a carrier of information/intention/state within the application, not the holder of a state.

In most situations, it is recommended to create events directly within the module, rather than placing them within conditional statements or classes, in order to maintain simplicity and readability. An exception to this recommendation is the use of factory functions; however, these should also be invoked at the root level of the module.

> INFO important information!:
>
> Event instances persist throughout the entire runtime of the application and inherently represent a portion of the business logic.
>
> Attempting to delete instances and clear memory for the purpose of saving resources is not advised, as it may adversely impact the functionality and performance of the application.

### Calling the event

There are two ways to trigger event: imperative and declarative.

The **imperative** method involves invoking the event as if it were a function:

```ts
import { createEvent } from "effector";

const callHappened = createEvent<void>();

callHappened(); // event triggered
```

The **declarative** approach utilizes the event as a target for operators, such as `sample`, or as an argument when passed into factory functions:

```ts
import { createEvent, sample } from "effector";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});
```

When the `firstTriggered` event is invoked, the `secondTriggered` event will be subsequently called, creating a sequence of events.
Remember, dont call events in pure functions, it's not supported!

> TIP Good to know:
>
> In Effector, any event supports only **a single argument**.
> It is not possible to call an event with two or more arguments, as in `someEvent(first, second)`.

All arguments beyond the first will be ignored.
The core team has implemented this rule for specific reasons related to the design and functionality.
This approach enables the argument to be accessed in any situation without adding types complexity.

If multiple arguments need to be passed, encapsulate them within an object:

```ts
import { createEvent } from "effector";

const requestReceived = createEvent<{ id: number; title: string }>();

requestReceived({ id: 1, title: "example" });
```

This rule also contributes to the clarity of each argument's meaning, both at the call side and subscription side. It promotes clean and organized code, making it easier to understand and maintain.

### Watching the event

To ascertain when an event is called, effector and its ecosystem offer various methods with distinct capabilities. Debugging is the primary use case for this purpose, and we highly recommend using [`patronum/debug`](https://patronum.effector.dev/operators/debug/) to display when an event is triggered and the argument it carries.

```ts
import { createEvent, sample } from "effector";
import { debug } from "patronum";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});

debug(firstTriggered, secondTriggered);

firstTriggered();
// => [event] firstTriggered undefined
// => [event] secondTriggered undefined
```

However, if your environment does not permit the addition of further dependencies, you may use the `createWatch` method, which accepts object in params with properties:

* `unit` — unit or array of units, that you want to start watch
* `fn` — function, that will be called when the unit is triggered. Accepts the unit’s payload as the first argument.
* `scope` — scope, instance of fork to restrict watcher calls on particular scope

```ts
import { createEvent, sample, createWatch } from "effector";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});

const unwatch = createWatch({
  unit: [firstTriggered, secondTriggered],
  fn: (payload) => {
    console.log("[event] triggered");
  },
});

firstTriggered();
// => [event] triggered
// => [event] triggered
```

> TIP Keep in mind:
>
> The `createWatch` method neither handles nor reports exceptions, manages the completion of asynchronous operations, nor addresses data race issues.
>
> Its primary intended use is for short-term debugging and logging purposes, or for tests to ensure that some unit was triggered.

### Working with TypeScript

When an event is invoked, TypeScript will verify that the type of the argument passed matches the type defined in the event, ensuring consistency and type safety within the code.

This is also works for operators like sample or `split`:

```ts
import { sample, createEvent } from "effector";

const someHappened = createEvent<number>();
const anotherHappened = createEvent<string>();

sample({
  // @ts-expect-error error:
  // "clock should extend target type";
  // targets: { clockType: number; targetType: string; }
  clock: someHappened,
  target: anotherHappened,
});
```

### Working with multiple events

Events in effector can be combined in various ways to create more complex logic. Let's look at the main approaches:

#### Creating derived events

You can create a new event based on an existing one using the `map` method, which will be fired after original event:

```ts mark={5}
import { createEvent, createStore } from "effector";

const userClicked = createEvent<{ id: number; name: string }>();
// Creating an event that will trigger only with the user's name
const userNameSelected = userClicked.map(({ name }) => name);
const $userName = createStore("").on(userNameSelected, (_, newName) => newName);

// Usage
userClicked({ id: 1, name: "John" });
// userNameSelected will get 'John'
```

> INFO Derived events:
>
> You cannot call derived events directly, but you can still subscribe to them for state changes or triggering other units.

#### Filtering events

If you wanna create a new event that triggers only when a certain condition is met, you can use `sample` method and `filter` param:

```ts
import { sample, createEvent } from "effector";

type User = { id: number; role: "admin" | "user" };
type Admin = { id: number; role: "admin" };

const userClicked = createEvent<User>();

// Event will trigger only for admins
const adminClicked = sample({
  clock: userClicked,
  filter: ({ role }) => role === "admin",
});

// Creating type-safe event
const typeSafeAdminClicked = sample({
  clock: userClicked,
  filter: (user): user is Admin => user.role === "admin",
});
```

#### Merging multiple events

You can use the `merge` method, which combines an array of units into a single event that will
trigger when any of the array elements is called:

```ts mark={6}
const buttonClicked = createEvent();
const linkClicked = createEvent();
const iconClicked = createEvent();

// Any of these events will trigger someActionHappened
const anyClicked = merge([buttonClicked, linkClicked, iconClicked]);

sample({
  clock: anyClicked,
  target: someActionHappened,
});
```

Or you can use `sample` with array in `clock`, which under the hood use the same method `merge` for arrays.

```ts mark={7}
const buttonClicked = createEvent();
const linkClicked = createEvent();
const iconClicked = createEvent();

// Any of these events will trigger someActionHappened
sample({
  clock: [buttonClicked, linkClicked, iconClicked],
  target: someActionHappened,
});
```

#### Creating a pre-handler for an event

`event.prepend` is a method that creates a new event which will trigger the original event with preliminary data transformation.

Let's say your application encounters different errors with different structures, but the error handling should happen centrally:

```ts wrap
import { createEvent } from "effector";

// Main error handling event
const showError = createEvent<string>();

// Subscribe to error displays
sample({
  clock: showError,
  target: processErrorFx, // we'll skip the effect implementation
});

// Create special events for different types of errors
const showNetworkError = showError.prepend((code: number) => `Network error: ${code}`);

const showValidationError = showError.prepend(
  (field: string) => `Field ${field} is filled incorrectly`,
);

// Usage
showNetworkError(404); // 🔴 Error: Network error: 404
showValidationError("email"); // 🔴 Error: Field email is filled incorrectly
```

In this example:

1. We have a main showError event that accepts a string
2. Using `prepend` we create two new events, each of which:

* Accepts its own data type
* Transforms this data into a string
* Passes the result to the main showError event

#### Conditional event triggering

The action chain when calling an event can trigger based on store states:

```ts mark={7}
const buttonClicked = createEvent<void>();
const $isEnabled = createStore(true);

// Event will trigger only if $isEnabled is true
sample({
  clock: buttonClicked,
  filter: $isEnabled,
  target: actionExecuted,
});
```

> TIP Tip:
>
> Combining events through `sample` is preferred over directly calling events inside `watch` or other handlers, as it makes the data flow more explicit and predictable.

API reference for Event.


# Splitting Data Streams with split

import { Image } from "astro> ASSETS:&#x20;";
import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import ThemeImage from "@components/ThemeImage.astro";

## Splitting Data Streams with `split`

The `split` method is designed to divide logic into multiple data streams.
For example, you might need to route data differently depending on its content, much like a railway switch that directs trains to different tracks:

* If a form is filled incorrectly — display an error.
* If everything is correct — send a request.

> INFO Condition Checking Order:
>
> Conditions in `split` are checked sequentially from top to bottom. Once a condition matches, subsequent ones are not evaluated. Keep this in mind when crafting your conditions.

### Basic Usage of `split`

Let's look at a simple example — processing messages of different types:

```ts
import { createEvent, split } from "effector";

const updateUserStatus = createEvent();

const { activeUserUpdated, idleUserUpdated, inactiveUserUpdated } = split(updateUserStatus, {
  activeUserUpdated: (userStatus) => userStatus === "active",
  idleUserUpdated: (userStatus) => userStatus === "idle",
  inactiveUserUpdated: (userStatus) => userStatus === "inactive",
});
```

The logic here is straightforward. When the `updateUserStatus` event is triggered, it enters `split`, which evaluates each condition from top to bottom until a match is found, then triggers the corresponding event in `effector`.

Each condition is defined by a predicate — a function returning `true` or `false`.

You might wonder, "Why use this when I could handle conditions with `if/else` in the UI?" The answer lies in Effector's philosophy of **separating business logic** from the UI.

> TIP:
>
> Think of `split` as a reactive `switch` for units.

### Default Case

When using `split`, there might be situations where no conditions match. For such cases, there's a special default case: `__`.

Here's the same example as before, now including a default case:

```ts
import { createEvent, split } from "effector";

const updateUserStatus = createEvent();

const { activeUserUpdated, idleUserUpdated, inactiveUserUpdated, __ } = split(updateUserStatus, {
  activeUserUpdated: (userStatus) => userStatus === "active",
  idleUserUpdated: (userStatus) => userStatus === "idle",
  inactiveUserUpdated: (userStatus) => userStatus === "inactive",
});

__.watch((defaultStatus) => console.log("default case with status:", defaultStatus));
activeUserUpdated.watch(() => console.log("active user"));

updateUserStatus("whatever");
updateUserStatus("active");
updateUserStatus("default case");

// Console output:
// default case with status: whatever
// active user
// default case with status: default case
```

> INFO Default Handling:
>
> If no conditions match, the default case `__` will be triggered.

### Short Form

The `split` method supports multiple usage patterns based on your needs.

The shortest usage involves passing a unit as the first argument serving as a trigger and an object with cases as the second argument.

Let's look at an example with GitHub's "Star" and "Watch" buttons:

<ThemeImage
alt='Button "Star" for repo i github'
lightImage="/images/split/github-repo-buttons.png"
darkImage="/images/split/github-repo-buttons-dark.png"
height={20}
width={650}
/>

```ts
import { createStore, createEvent, split } from "effector";

type Repo = {
  // ... other properties
  isStarred: boolean;
  isWatched: boolean;
};

const toggleStar = createEvent<string>();
const toggleWatch = createEvent<string>();

const $repo = createStore<null | Repo>(null)
  .on(toggleStar, (repo) => ({
    ...repo,
    isStarred: !repo.isStarred,
  }))
  .on(toggleWatch, (repo) => ({ ...repo, isWatched: !repo.isWatched }));

const { starredRepo, unstarredRepo, __ } = split($repo, {
  starredRepo: (repo) => repo.isStarred,
  unstarredRepo: (repo) => !repo.isStarred,
});

// Debug default case
__.watch((repo) => console.log("[split toggleStar] Default case triggered with value ", repo));

// Somewhere in the app
toggleStar();
```

This usage returns an object with derived events, which can trigger reactive chains of actions.

> TIP:
>
> Use this pattern when:
>
> * There are no dependencies on external data (e.g., stores).
> * You need simple, readable code.

### Expanded Form

Using the `split` method in this variation doesn't return any value but provides several new capabilities:

1. You can depend on external data, such as stores, using the `match` parameter.
2. Trigger multiple units when a case matches by passing an array.
3. Add a data source using `source` and a trigger using `clock`.

For example, imagine a scenario where your application has two modes: `user` and `admin`. When an event is triggered, different actions occur depending on whether the mode is `user` or `admin`:

```ts
import { createStore, createEvent, createEffect, split } from "effector";

const adminActionFx = createEffect();
const secondAdminActionFx = createEffect();
const userActionFx = createEffect();
const defaultActionFx = createEffect();
// UI event
const buttonClicked = createEvent();

// Current application mode
const $appMode = createStore<"admin" | "user">("user");

// Different actions for different modes
split({
  source: buttonClicked,
  match: $appMode, // Logic depends on the current mode
  cases: {
    admin: [adminActionFx, secondAdminActionFx],
    user: userActionFx,
    __: defaultActionFx,
  },
});

// Clicking the same button performs different actions
// depending on the application mode
buttonClicked();
// -> "Performing user action" (when $appMode = 'user')
// -> "Performing admin action" (when $appMode = 'admin')
```

Additionally, you can include a `clock` property that works like in sample, acting as a trigger, while `source` provides the data to be passed into the respective case. Here's an extended example:

```ts
// Extending the previous code

const adminActionFx = createEffect((currentUser) => {
  // ...
});
const secondAdminActionFx = createEffect((currentUser) => {
  // ...
});

// Adding a new store
const $currentUser = createStore({
  id: 1,
  name: "Donald",
});

const $appMode = createStore<"admin" | "user">("user");

split({
  clock: buttonClicked,
  // Passing the new store as a data source
  source: $currentUser,
  match: $appMode,
  cases: {
    admin: [adminActionFx, secondAdminActionFx],
    user: userActionFx,
    __: defaultActionFx,
  },
});
```

> WARNING Default Case:
>
> If you need a default case, you must explicitly define it in the `cases` object, otherwise, it won' t be processed!

In this scenario, the logic for handling cases is determined at runtime based on `$appMode`, unlike the earlier example where it was defined during `split` creation.

> INFO Usage Notes:
>
> When using `match`, it can accept units, functions, or objects with specific constraints:
>
> * **Store**: If using a store, **it must store a string value**.
> * **Function**: If passing a function, **it must return a string value and be pure**.
> * **Object with stores**: If passing an object of stores, **each store must hold a boolean value**.
> * **Object with functions**: If passing an object of functions, **each function must return a boolean value and be pure**.

#### `match` as a Store

When `match` is a store, the value in the store is used as a key to select the corresponding case:

```ts
const $currentTab = createStore("home");

split({
  source: pageNavigated,
  match: $currentTab,
  cases: {
    home: loadHomeDataFx,
    profile: loadProfileDataFx,
    settings: loadSettingsDataFx,
  },
});
```

#### `match` as a Function

When using a function for `match`, it must return a string to be used as the case key:

```ts
const userActionRequested = createEvent<{ type: string; payload: any }>();

split({
  source: userActionRequested,
  match: (action) => action.type, // The function returns a string
  cases: {
    update: updateUserDataFx,
    delete: deleteUserDataFx,
    create: createUserDataFx,
  },
});
```

#### `match` as an Object with Stores

When `match` is an object of stores, each store must hold a boolean value. The case whose store contains true will execute:

```ts
const $isAdmin = createStore(false);
const $isModerator = createStore(false);

split({
  source: postCreated,
  match: {
    admin: $isAdmin,
    moderator: $isModerator,
  },
  cases: {
    admin: createAdminPostFx,
    moderator: createModeratorPostFx,
    __: createUserPostFx,
  },
});
```

#### `match` as an Object with Functions

If using an object of functions, each function must return a boolean. The first case with a `true` function will execute:

```ts
split({
  source: paymentReceived,
  match: {
    lowAmount: ({ amount }) => amount < 100,
    mediumAmount: ({ amount }) => amount >= 100 && amount < 1000,
    highAmount: ({ amount }) => amount >= 1000,
  },
  cases: {
    lowAmount: processLowPaymentFx,
    mediumAmount: processMediumPaymentFx,
    highAmount: processHighPaymentFx,
  },
});
```

> WARNING Attention:
>
> Ensure your conditions in `match` are mutually exclusive. Overlapping conditions may cause unexpected behavior. Always verify the logic to avoid conflicts.

### Practical Examples

#### Handling forms with split

```ts
const showFormErrorsFx = createEffect(() => {
  // Logic to display errors
});
const submitFormFx = createEffect(() => {
  // Logic to submit the form
});

const submitForm = createEvent();

const $form = createStore({
  name: "",
  email: "",
  age: 0,
}).on(submitForm, (_, submittedForm) => ({ ...submittedForm }));
// Separate store for errors
const $formErrors = createStore({
  name: "",
  email: "",
  age: "",
}).reset(submitForm);

// Validate fields and collect errors
sample({
  clock: submitForm,
  source: $form,
  fn: (form) => ({
    name: !form.name.trim() ? "Name is required" : "",
    email: !isValidEmail(form.email) ? "Invalid email" : "",
    age: form.age < 18 ? "Age must be 18+" : "",
  }),
  target: $formErrors,
});

// Use split for routing based on validation results
split({
  source: $formErrors,
  match: {
    hasErrors: (errors) => Object.values(errors).some((error) => error !== ""),
  },
  cases: {
    hasErrors: showFormErrorsFx,
    __: submitFormFx,
  },
});
```

Explanation:

Two effects are created: one to display errors and one to submit the form.

Two stores are defined: `$form` for form data and `$formErrors` for errors.
On form submission `submitForm`, two things happen:

1. Form data is updated in the `$form` store.
2. All fields are validated using `sample`, and errors are stored in `$formErrors`.

The `split` method determines the next step:

* If any field has an error – ❌ display the errors.
* If all fields are valid – ✅ submit the form.


# State Management in effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import SideBySide from "@components/SideBySide/SideBySide.astro";

## State Management

State in effector is managed through stores - special objects that hold values and update them when receiving events. Stores are created using the createStore function.

> INFO Data immutability:
>
> Store data in effector is immutable, which means you should not mutate arrays or objects directly, but create new instances when updating them.
>
> <SideBySide>
>
> <Fragment slot="left">
>
> ```ts wrap data-border="good" data-height="full"
> // ✅ good
>
> // update array
> $users.on(userAdded, (users, newUser) => [...users, newUser]);
>
> //update object
> $user.on(nameChanged, (user, newName) => ({
>   ...user,
>   name: newName,
> }));
> ```
>
> </Fragment>
>
>   <Fragment slot="right">
>
> ```ts wrap data-border="bad" data-height="full"
> // ❌ bad
>
> // update array
> $users.on(userAdded, (users, newUser) => {
>   users.push(newUser); // mutation!
>   return users;
> });
>
> // update object
> $user.on(nameChanged, (user, newName) => {
>   user.name = newName; // mutation!
>   return user;
> });
> ```
>
> </Fragment>
>
> </SideBySide>

### Store Creation

You can create new store via createStore:

```ts
import { createStore } from "effector";

// Create store with initial value
const $counter = createStore(0);
// with explicit typing
const $user = createStore<{ name: "Bob"; age: 25 } | null>(null);
const $posts = createStore<Post[]>([]);
```

> TIP Store naming:
>
> In effector it's conventional to use the `$` prefix for stores. This helps distinguish them from other entities and improves code readability.

### Reading Values

There are several ways to get the current value of a store:

1. Using framework integration hooks `useUnit` (📘 React, 📗 Vue, 📘 Solid):

<Tabs>
  <TabItem label="React">

```ts
import { useUnit } from 'effector-react'
import { $counter } from './model.js'

const Counter = () => {
  const counter = useUnit($counter)

  return <div>{counter}</div>
}
```

  </TabItem>
  <TabItem label="Vue">

```html
<script setup>
  import { useUnit } from "effector-vue/composition";
  import { $counter } from "./model.js";
  const counter = useUnit($counter);
</script>
```

  </TabItem>
  <TabItem label="Solid">

```ts
import { useUnit } from 'effector-solid'
import { $counter } from './model.js'

const Counter = () => {
  const counter = useUnit($counter)

  return <div>{counter()}</div>
}
```

  </TabItem>
</Tabs>

2. Subscribe to changes via `watch` - only for debug or integration needs

```ts
$counter.watch((counter) => {
  console.log("Counter changed:", counter);
});
```

3. `getState()` method - only for integration needs

```ts
console.log($counter.getState()); // 0
```

### Store Updates

In effector, state updates are done via events. You can change the state by subscribing to an event via `.on` or by using the sample method.

> INFO Optimizing updates:
>
> Store state is updated when it receives a value that is not equal (!==) to the current value, and also not equal to `undefined`.

#### Updating via Events

The simplest and correct way to update a store is to bind it to an event:

```ts
import { createStore, createEvent } from "effector";

const incremented = createEvent();
const decremented = createEvent();
const resetCounter = createEvent();

const $counter = createStore(0)
  // Increase value by 1 each time the event is called
  .on(incremented, (counterValue) => counterValue + 1)
  // Decrease value by 1 each time the event is called
  .on(decremented, (counterValue) => counterValue - 1)
  // Reset value to 0
  .reset(resetCounter);

$counter.watch((counterValue) => console.log(counterValue));

// Usage
incremented();
incremented();
decremented();

resetCounter();

// Console output
// 0 - output on initialization
// 1
// 2
// 1
// 0 - reset
```

> INFO What are events?:
>
> If you are not familiar with `createEvent` and events, you will learn how to work with them on next page.

#### Updating with Event parameters

You can update a store using event parameters by passing data to the event like a regular function and using it in the handler:

```ts mark={12}
import { createStore, createEvent } from "effector";

const userUpdated = createEvent<{ name: string }>();

const $user = createStore({ name: "Bob" });

$user.on(userUpdated, (user, changedUser) => ({
  ...user,
  ...changedUser,
}));

userUpdated({ name: "Alice" });
```

#### Complex Update Logic

Using the `on` method, we can update store state for simple cases when an event occurs, either by passing data from the event or updating based on the previous value.

However, this doesn't always cover all needs. For more complex state update logic, we can use the sample method, which helps us when:

* We need to control store updates using an event
* We need to update a store based on values from other stores
* We need data transformation before updating the store with access to current values of other stores

For example:

```ts
import { createEvent, createStore, sample } from "effector";

const updateItems = createEvent();

const $items = createStore([1, 2, 3]);
const $filteredItems = createStore([]);
const $filter = createStore("even");

// sample automatically provides access to current values
// of all connected stores at the moment the event triggers
sample({
  clock: updateItems,
  source: { items: $items, filter: $filter },
  fn: ({ items, filter }) => {
    if (filter === "even") {
      return items.filter((n) => n % 2 === 0);
    }

    return items.filter((n) => n % 2 === 1);
  },
  target: $filteredItems,
});
```

> INFO What is sample?:
>
> To learn more about what `sample` is, how to use this method, and its detailed description, you can read about it here.

Advantages of using `sample` for state updates:

1. Access to current values of all stores
2. Atomic updates of multiple stores
3. Control over update timing through `clock`
4. Ability to filter updates using `filter`
5. Convenient data transformation through the `fn` function

#### Store Creation via `restore` method

If your store work involves replacing the old state with a new one when an event is called, you can use the restore method:

```ts mark={5}
import { restore, createEvent } from "effector";

const nameChanged = createEvent<string>();

const $counter = restore(nameChanged, "");
```

The code above is equivalent to the code below:

```ts mark={5}
import { createStore, createEvent } from "effector";

const nameChanged = createEvent<string>();

const $counter = createStore("").on(nameChanged, (_, newName) => newName);
```

You can also use `restore` method with an effect. In this case, the store will receive data from the effect's doneData event, and the default store value should match the return value type:

> INFO What are effects?:
>
> If you are not familiar with `createEffect` and effects, you will learn how to work with them on this page.

```ts
import { restore, createEffect } from "effector";

// omit type realization
const createUserFx = createEffect<string, User>((id) => {
  // effect logic

  return {
    id: 4,
    name: "Bob",
    age: 18,
  };
});

const $newUser = restore(createUserFx, {
  id: 0,
  name: "",
  age: -1,
});

createUserFx();

// After successful completion of the effect
// $newUser will be:
// {
// 	 id: 4,
// 	 name: "Bob",
// 	 age: 18,
// }
```

#### Multiple Store Updates

A store isn't limited to a single event subscription - you can subscribe to as many events as you need, and different stores can subscribe to the same event:

```ts "categoryChanged"
const categoryChanged = createEvent<string>();
const searchQueryChanged = createEvent<string>();
const filtersReset = createEvent();

const $lastUsedFilter = createStore<string | null>(null);
const $filters = createStore({
  category: "all",
  searchQuery: "",
});

// subscribe two different stores to the same event
$lastUsedFilter.on(categoryChanged, (_, category) => category);
$filters.on(categoryChanged, (filters, category) => ({
  ...filters,
  category,
}));

$filters.on(searchQueryChanged, (filters, searchQuery) => ({
  ...filters,
  searchQuery,
}));

$filters.reset(filtersReset);
```

In this example, we subscribe the `$filters` store to multiple events, and multiple stores to the same event `categoryChanged`.

#### Simplified Updates with `createApi`

When you need to create multiple handlers for one store, instead of creating separate events and subscribing to them, you can use createApi. This function creates a set of events for updating the store in one place.<br/>
The following code examples are equivalent:

<SideBySide>

<Fragment slot="left">

```ts wrap data-height="full"
// with  createApi

import { createStore, createApi } from "effector";

const $counter = createStore(0);

const { increment, decrement, reset } = createApi($counter, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
  reset: () => 0,
});

// usage
increment(); // 1
reset(); // 0
```

</Fragment>

  <Fragment slot="right">

```ts wrap data-height="full"
// basic usage

import { createStore, createEvent } from "effector";

const $counter = createStore(0);

const incrementClicked = createEvent();
const decrementClicked = createEvent();
const resetClicked = createEvent();

$counter
  .on(incrementClicked, (state) => state + 1)
  .on(decrementClicked, (state) => state - 1)
  .reset(resetClicked);

// usage
increment(); // 1
reset(); // 0
```

  </Fragment>

</SideBySide>

### Derived Stores

Often you need to create a store whose value depends on other stores. For this, the map method is used:

```ts
import { createStore, combine } from "effector";

const $currentUser = createStore({
  id: 1,
  name: "Winnie Pooh",
});
const $users = createStore<User[]>([]);

// Filtered list
const $activeUsers = $users.map((users) => users.filter((user) => user.active));

// Computed value
const $totalUsersCount = $users.map((users) => users.length);
const $activeUsersCount = $activeUsers.map((users) => users.length);

// Combining multiple stores
const $friendsList = combine($users, $currentUser, (users, currentUser) =>
  users.filter((user) => user.friendIds.includes(currentUser.id)),
);
```

We also used the combine method here, which allows us to combine values from multiple stores into one.<br/>
You can also combine stores into an object:

```ts
import { combine } from "effector";

const $form = combine({
  name: $name,
  age: $age,
  city: $city,
});

// or with additional transformation
const $formValidation = combine($name, $age, (name, age) => ({
  isValid: name.length > 0 && age >= 18,
  errors: {
    name: name.length === 0 ? "Required" : null,
    age: age < 18 ? "Must be 18+" : null,
  },
}));
```

> INFO Important note:
>
> Derived stores update automatically when source stores change. You **don't** need to manually synchronize their values.

### Resetting State

You can reset store to default state via `reset` method:

```ts
const formSubmitted = createEvent();
const formReset = createEvent();

const $form = createStore({ email: "", password: "" })
  // Clear form on submit and on explicit reset too
  .reset(formSubmitted, formReset)
  // or
  .reset([formSubmitted, formReset]);
```

### `undefined` Values

By default, effector skips updates with undefined value. This is done so that you don't have to return anything from reducers if store update is not required:

```ts
const $store = createStore(0).on(event, (_, newValue) => {
  if (newValue % 2 === 0) {
    return;
  }

  return newValue;
});
```

> WARNING Attention!:
>
> This behavior will be disabled in the future!
> Practice has shown that it would be better to simply return the previous store value.

If you need to use `undefined` as a valid value, you need to explicitly specify it using `skipVoid: false` when creating the store:

```ts
import { createStore, createEvent } from "effector";

const setVoidValue = createEvent<number>();

// ❌ undefined will be skipped
const $store = createStore(13).on(setVoidValue, (_, voidValue) => voidValue);

// ✅ undefined allowed as values
const $store = createStore(13, {
  skipVoid: false,
}).on(setVoidValue, (_, voidValue) => voidValue);

setVoidValue(null);
```

> TIP null instead of undefined:
>
> You can use `null` instead of `undefined` for missing values.

Full API reference for store


# TypeScript in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## TypeScript in effector

Effector provides first-class TypeScript support out of the box, giving you reliable typing and excellent development experience when working with the library. In this section, we'll look at both basic typing concepts and advanced techniques for working with types in effector.

### Typing Events

Events in Effector can be typed by passing a type to the generic function. However, if nothing is passed, the event will have the type `EventCallable<void>`:

```ts
import { createEvent } from "effector";

// Event without parameters
const clicked = createEvent();
// EventCallable<void>

// Event with parameter
const userNameChanged = createEvent<string>();
// EventCallable<string>

// Event with complex parameter
const formSubmitted = createEvent<{
  username: string;
  password: string;
}>();
// EventCallable<{ username: string; password: string; }>
```

#### Event Types

In Effector, events can have several types, where `T` is the stored value type:

* `EventCallable<T>` - an event that can be called.
* `Event<T>` - a derived event that cannot be called manually.

#### Typing Event Methods

##### event.prepend

To add types to events created using event.prepend, you need to add the type either in the prepend function argument or as a generic:

```ts
const message = createEvent<string>();

const userMessage = message.prepend((text: string) => text);
// userMessage has type EventCallable<string>

const warningMessage = message.prepend<string>((warnMessage) => warnMessage);
// warningMessage has type EventCallable<string>
```

### Typing Stores

Stores can also be typed by passing a type to the generic function, or by specifying a default value during initialization, then TypeScript will infer the type from this value:

```ts
import { createStore } from "effector";

// Basic store with primitive value
// StoreWritable<number>
const $counter = createStore(0);

// Store with complex object type
interface User {
  id: number;
  name: string;
  role: "admin" | "user";
}

// StoreWritable<User>
const $user = createStore<User>({
  id: 1,
  name: "Bob",
  role: "user",
});

// Store<string>
const $userNameAndRole = $user.map((user) => `User name and role: ${user.name} and ${user.role}`);
```

#### Store Types

In Effector, there are two types of stores, where T is the stored value type:

* `Store<T>` - derived store type that cannot have new data written to it.
* `StoreWritable<T>` - store type that can have new data written using on or sample.

### Typing Effects

In normal usage, TypeScript will infer types based on the function's return result and its arguments.
However, `createEffect` supports typing of input parameters, return result, and errors through generics:

<Tabs>
  <TabItem label="Common usage">

```ts
import { createEffect } from "effector";

// Base effect
// Effect<string, User, Error>
const fetchUserFx = createEffect(async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  const result = await response.json();

  return result as User;
});
```

  </TabItem>

  <TabItem label="With generics">

```ts
import { createEffect } from "effector";

// Base effect
// Effect<string, User, Error>
const fetchUserFx = createEffect<string, User>(async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  const result = await response.json();

  return result;
});
```

  </TabItem>
</Tabs>

#### Typing Handler Function Outside Effect

If the handler function is defined outside the effect, you'll need to pass that function's type:

```ts
const sendMessage = async (params: { text: string }) => {
  // ...
  return "ok";
};

const sendMessageFx = createEffect<typeof sendMessage, AxiosError>(sendMessage);
// => Effect<{text: string}, string, AxiosError>
```

#### Custom Effect Errors

Some code may only throw certain types of exceptions. In effects, the third generic `Fail` is used to describe error types:

```ts
// Define API error types
interface ApiError {
  code: number;
  message: string;
}

// Create typed effect
const fetchUserFx = createEffect<string, User, ApiError>(async (userId) => {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    throw {
      code: response.status,
      message: "Failed to fetch user",
    } as ApiError;
  }

  return response.json();
});
```

### Typing Methods

#### `sample`

##### Typing `filter`

If you need to get a specific type, you'll need to manually specify the expected type, which can be done using [type predicates](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates):

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();
const userMessage = createEvent<UserMessage>();

sample({
  clock: message,
  filter: (msg): msg is UserMessage => msg.kind === "user",
  target: userMessage,
});
```

If you need to check for data existence in `filter`, you can simply pass `Boolean`:

```ts
import { createEvent, createStore, sample } from "effector";

interface User {
  id: string;
  name: string;
  email: string;
}

// Events
const formSubmitted = createEvent();
const userDataSaved = createEvent<User>();

// States
const $currentUser = createStore<User | null>(null);

// On form submit, send data only if user exists
sample({
  clock: formSubmitted,
  source: $currentUser,
  filter: Boolean, // filter out null
  target: userDataSaved,
});

// Now userDataSaved will only receive existing user data
```

##### Typing `filter` and `fn`

As mentioned above, using type predicates in `filter` will work correctly and the correct type will reach the `target`.
However, this mechanism won't work as needed when using `filter` and `fn` together. In this case, you'll need to manually specify the data type of `filter` parameters and add type predicates. This happens because TypeScript cannot correctly infer the type in `fn` after `filter` if the type isn't explicitly specified. This is a limitation of TypeScript's type system.

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };
type Message = UserMessage | WarnMessage;

const message = createEvent<Message>();
const userText = createEvent<string>();

sample({
  clock: message,
  filter: (msg: Message): msg is UserMessage => msg.kind === "user",
  fn: (msg) => msg.text,
  target: userText,
});

// userMessage has type Event<string>
```

> TIP It got smarter!:
>
> Starting from TypeScript version >= 5.5, you don't need to write type predicates, just specify the argument type and TypeScript will understand what needs to be inferred:
> `filter: (msg: Message) => msg.kind === "user"`

#### attach

To allow TypeScript to infer the types of the created effect, you can add a type to the first argument of `mapParams`, which will become the `Params` generic of the result:

```ts
const sendTextFx = createEffect<{ message: string }, "ok">(() => {
  // ...

  return "ok";
});

const sendWarningFx = attach({
  effect: sendTextFx,
  mapParams: (warningMessage: string) => ({ message: warningMessage }),
});
// sendWarningFx has type Effect<{message: string}, 'ok'>
```

#### split

<Tabs>
  <TabItem label="Before TS 5.5">

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();

const { userMessage, warnMessage } = split(message, {
  userMessage: (msg): msg is UserMessage => msg.kind === "user",
  warnMessage: (msg): msg is WarnMessage => msg.kind === "warn",
});
// userMessage имеет тип Event<UserMessage>
// warnMessage имеет тип Event<WarnMessage>
```

  </TabItem>

  <TabItem label="After TS 5.5">

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();

const { userMessage, warnMessage } = split(message, {
  userMessage: (msg) => msg.kind === "user",
  warnMessage: (msg) => msg.kind === "warn",
});
// userMessage имеет тип Event<UserMessage>
// warnMessage имеет тип Event<WarnMessage>
```

  </TabItem>
</Tabs>

#### `createApi`

To allow TypeScript to infer types of created events, adding a type to second argument of given reducers

```typescript
const $count = createStore(0);

const { add, sub } = createApi($count, {
  add: (x, add: number) => x + add,
  sub: (x, sub: number) => x - sub,
});

// add has type Event<number>
// sub has type Event<number>
```

#### `is`

`is` methods can help to infer a unit type (thereby `is` methods acts as [TypeScript type guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types)) which can help to write strongly-typed helper functions

```typescript
export function getUnitType(unit: unknown) {
  if (is.event(unit)) {
    // here unit has Event<any> type
    return "event";
  }
  if (is.effect(unit)) {
    // here unit has Effect<any, any> type
    return "effect";
  }
  if (is.store(unit)) {
    // here unit has Store<any> type
    return "store";
  }
}
```

#### `merge`

When we wanna merge events we can get their union types:

```ts
import { createEvent, merge } from "effector";

const firstEvent = createEvent<string>();
const secondEvent = createEvent<number>();

const merged = merge([firstEvent, secondEvent]);
// Event<string | number>

// You can also combine events with the same types
const buttonClicked = createEvent<MouseEvent>();
const linkClicked = createEvent<MouseEvent>();

const anyClick = merge([buttonClicked, linkClicked]);
// Event<MouseEvent>
```

`merge` accepts generic, where you can use what type do you expect from events:

```ts
import { createEvent, merge } from "effector";

const firstEvent = createEvent<string>();
const secondEvent = createEvent<number>();

const merged = merge<number>([firstEvent, secondEvent]);
//                                ^
// Type 'EventCallable<string>' is not assignable to type 'Unit<number>'.
```

### Type Utilities

Effector provides a set of utility types for working with unit types:

#### UnitValue

The `UnitValue` type is used to extract the data type from units:

```ts
import { UnitValue, createEffect, createStore, createEvent } from "effector";

const event = createEvent<{ id: string; name?: string } | { id: string }>();
type UnitEventType = UnitValue<typeof event>;
// {id: string; name?: string | undefined} | {id: string}

const $store = createStore([false, true]);
type UnitStoreType = UnitValue<typeof $store>;
// boolean[]

const effect = createEffect<{ token: string }, any, string>(() => {});
type UnitEffectType = UnitValue<typeof effect>;
// {token: string}

const scope = fork();
type UnitScopeType = UnitValue<typeof scope>;
// any
```

#### StoreValue

`StoreValue` is essentially similar to `UnitValue`, but works only with stores:

```ts
import { createStore, StoreValue } from "effector";

const $store = createStore(true);

type StoreValueType = StoreValue<typeof $store>;
// boolean
```

#### EventPayload

Extracts the data type from events.
Similar to `UnitValue`, but only for events:

```ts
import { createEvent, EventPayload } from "effector";

const event = createEvent<{ id: string }>();

type EventPayloadType = EventPayload<typeof event>;
// {id: string}
```

#### EffectParams

Takes an effect type as a generic parameter, allows getting the parameter type of an effect.

```ts
import { createEffect, EffectParams } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => {
  // ...
  return { name: "Alice", isAdmin: false };
});

type EffectParamsType = EffectParams<typeof fx>;
// {id: string}
```

#### EffectResult

Takes an effect type as a generic parameter, allows getting the return value type of an effect.

```ts
import { createEffect, EffectResult } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => ({ name: "Alice", isAdmin: false }));

type EffectResultType = EffectResult<typeof fx>;
// {name: string; isAdmin: boolean}
```

#### EffectError

Takes an effect type as a generic parameter, allows getting the error type of an effect.

```ts
import { createEffect, EffectError } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => ({ name: "Alice", isAdmin: false }));

type EffectErrorType = EffectError<typeof fx>;
// {statusText: string; status: number}
```


# Unit Composition

## Unit Composition in Effector

Effector has two powerful methods for connecting units together: `sample` and `attach`. While they may seem similar, each has its own characteristics and use cases.

### Sample: Connecting Data and Events

`sample` is a universal method for connecting units. Its main task is to take data from one place `source` and pass it to another place `target` when a specific trigger `clock` fires.

The general pattern of the sample method works as follows:

1. Trigger when `clock` is called
2. Take data from `source`
3. `filter` the data, if everything is correct, return `true` and continue the chain, otherwise `false`
4. Transform the data using `fn`
5. Pass the data to `target`

#### Basic Usage of Sample

```ts
import { createStore, createEvent, sample, createEffect } from "effector";

const buttonClicked = createEvent();

const $userName = createStore("Bob");

const fetchUserFx = createEffect((userName) => {
  // logic
});

// Get current name when button is clicked
sample({
  clock: buttonClicked,
  source: $userName,
  target: fetchUserFx,
});
```

> TIP Versatility of sample:
>
> If you don't specify `clock`, then `source` can also serve as the trigger. You must use at least one of these properties in the argument!

```ts
import { createStore, sample } from "effector";

const $currentUser = createStore({ name: "Bob", age: 25 });

// creates a derived store that updates when source changes
const $userAge = sample({
  source: $currentUser,
  fn: (user) => user.age,
});
// equivalent to
const $userAgeViaMap = $currentUser.map((currentUser) => currentUser.age);
```

As you can see, the sample method is very flexible and can be used in various scenarios:

* When you need to take data from a store at the moment of an event
* For data transformation before sending
* For conditional processing via filter
* For synchronizing multiple data sources
* Sequential chain of unit launches

#### Data Filtering

You may need to start a call chain when some conditions occurs. For such situations, the `sample` method allows filtering data using the `filter` parameter:

```ts
import { createEvent, createStore, sample, createEffect } from "effector";

type UserFormData = {
  username: string;
  age: number;
};

const submitForm = createEvent();

const $formData = createStore<UserFormData>({ username: "", age: 0 });

const submitToServerFx = createEffect((formData: UserFormData) => {
  // logic
});

sample({
  clock: submitForm,
  source: $formData,
  filter: (form) => form.age >= 18 && form.username.length > 0,
  target: submitToServerFx,
});

submitForm();
```

When `submitForm` is called, we take data from `source`, check conditions in `filter`, if the check passes successfully, we return `true` and call `target`, otherwise `false` and do nothing more.

> WARNING Important information:
>
> The `fn` and `filter` functions must be pure functions! A pure function is a function that always returns the same result for the same input data and produces no side effects (doesn't change data outside its scope).

#### Data Transformation

Often you need to not just pass data, but also transform it. The `fn` parameter is used for this:

```ts
import { createEvent, createStore, sample } from "effector";

const buttonClicked = createEvent();
const $user = createStore({ name: "Bob", age: 25 });
const $userInfo = createStore("");

sample({
  clock: buttonClicked,
  source: $user,
  fn: (user) => `${user.name} is ${user.age} years old`,
  target: $userInfo,
});
```

#### Multiple Data Sources

You can use multiple stores as data sources:

```ts
import { createEvent, createStore, sample, createEffect } from "effector";

type SubmitSearch = {
  query: string;
  filters: Array<string>;
};

const submitSearchFx = createEffect((params: SubmitSearch) => {
  /// logic
});

const searchClicked = createEvent();

const $searchQuery = createStore("");
const $filters = createStore<string[]>([]);

sample({
  clock: searchClicked,
  source: {
    query: $searchQuery,
    filters: $filters,
  },
  target: submitSearchFx,
});
```

#### Multiple triggers for sample

`sample` allows you to use an array of events as a `clock`, which is very convenient when we need to process several different triggers in the same way. This helps avoid code duplication and makes the logic more centralized:

```ts
import { createEvent, createStore, sample } from "effector";

// Events for different user actions
const saveButtonClicked = createEvent();
const ctrlSPressed = createEvent();
const autoSaveTriggered = createEvent();

// Common data storage
const $formData = createStore({ text: "" });

// Save effect
const saveDocumentFx = createEffect((data: { text: string }) => {
  // Save logic
});

// Single point for document saving that triggers from any source
sample({
  // All these events will trigger saving
  clock: [saveButtonClicked, ctrlSPressed, autoSaveTriggered],
  source: $formData,
  target: saveDocumentFx,
});
```

#### Array of targets in sample

`sample` allows you to pass an array of units to `target`, which is useful when you need to send the same data to multiple destinations simultaneously. You can pass an array of any units - events, effects, or stores to `target`.

```ts
import { createEvent, createStore, createEffect, sample } from "effector";

// Create units where data will be directed
const userDataReceived = createEvent<User>();
const $lastUserData = createStore<User | null>(null);
const saveUserFx = createEffect<User, void>((user) => {
  // Save user
});
const logUserFx = createEffect<User, void>((user) => {
  // Log user actions
});

const userUpdated = createEvent<User>();

// When user is updated:
// - Save data through saveUserFx
// - Send to logging system through logUserFx
// - Update store $lastUserData
// - Trigger userDataReceived event
sample({
  clock: userUpdated,
  target: [saveUserFx, logUserFx, $lastUserData, userDataReceived],
});
```

Key points:

* All units in target must be type-compatible with data from `source`/`clock`
* The execution order of targets is guaranteed - they will be called in the order written
* You can combine different types of units in the target array

#### Return Value of Sample

`sample` returns a unit whose type depends on the configuration:

##### With Target

If `target` is specified, `sample` will return that same `target`:

```ts
const $store = createStore(0);
const submitted = createEvent();
const sendData = createEvent<number>();

// result will have type EventCallable<number>
const result = sample({
  clock: submitted,
  source: $store,
  target: sendData,
});
```

##### Without Target

<!-- todo add link to Manage stores page about derived stores -->

When `target` is not specified, the return value type depends on the parameters passed.<br/>
If `filter` is **NOT** specified, and both `clock` and `source` **are stores**, then the result will be a **derived store** with the data type from `source`.

```ts
import { createStore, sample } from "effector";

const $store = createStore("");
const $secondStore = createStore(0);

const $derived = sample({
  clock: $secondStore,
  source: $store,
});
// $derived will be Store<string>

const $secondDerived = sample({
  clock: $secondStore,
  source: $store,
  fn: () => false,
});
// $secondDerived will be Store<boolean>
```

If `fn` is used, the return value type will correspond to the function's result.

<!-- todo add link to Events page about derived events -->

In other cases, the return value will be a **derived event** with a data type depending on `source`, which cannot be called manually but can be subscribed to!

> INFO sample typing:
>
> The `sample` method is fully typed and accepts types depending on the parameters passed!

```ts
import { createStore, createEvent, sample } from "effector";

const $store = createStore(0);

const submitted = createEvent<string>();

const event = sample({
  clock: submitted,
  source: $store,
});
// event has type Event<number>

const secondSampleEvent = sample({
  clock: submitted,
  source: $store,
  fn: () => true,
});
// Event<true>
```

#### Practical Example

Let's look at case, when we select user id and we want to check if user is admin, and based on selected user id create new derived store with data about user:

```ts
import { createStore, createEvent, sample } from "effector";

type User = {
  id: number;
  role: string;
};

const userSelected = createEvent<number>();

const $users = createStore<User[]>([]);

// Create derived store, which will be keep selectedUser
const $selectedUser = sample({
  clock: userSelected,
  source: $users,
  fn: (users, id) => users.find((user) => user.id === id) || null,
});
// $selectedUser has type Store<User | null>

// Create derived event, which will fire only for admins
// if selected user is admin, then event will fire instantly
const adminSelected = sample({
  clock: userSelected,
  source: $users,
  // will worked only if user found and he is admin
  filter: (users, id) => !!users.find((user) => user.id === id && user.role === "admin"),
  fn: (users, id) => users.find((user) => user.id === id)!,
});
// adminSelected has type Event<User>

userSelected(2);
```

Full API for&#x20;

### Attach: Effect Specialization

`attach` is a method for creating new effects based on existing ones, with access to data from stores. This is especially useful when you need to:

* Add context to an effect
* Reuse effect logic with different parameters
* Encapsulate store access

```ts
import { attach, createEffect, createStore } from "effector";

type SendMessageParams = { text: string; token: string };

// Base effect for sending data
const baseSendMessageFx = createEffect<SendMessageParams, void>(async ({ text, token }) => {
  await fetch("/api/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
});

// Store with authentication token
const $authToken = createStore("default-token");

// Create a specialized effect that automatically uses the token
const sendMessageFx = attach({
  effect: baseSendMessageFx,
  source: $authToken,
  mapParams: (text: string, token) => ({
    text,
    token,
  }),
});

// Now you can call the effect with just the message text
sendMessageFx("Hello!"); // token will be added automatically
```

It's very convenient to use `attach` for logic reuse:

```ts
const fetchDataFx = createEffect<{ endpoint: string; token: string }, any>();

// Create specialized effects for different endpoints
const fetchUsersFx = attach({
  effect: fetchDataFx,
  mapParams: (_, token) => ({
    endpoint: "/users",
    token,
  }),
  source: $authToken,
});

const fetchProductsFx = attach({
  effect: fetchDataFx,
  mapParams: (_, token) => ({
    endpoint: "/products",
    token,
  }),
  source: $authToken,
});
```

Full API for&#x20;


# Asynchronous Operations in effector

## Asynchronous Operations in effector using Effects

Asynchronous operations are a fundamental part of any modern application, and Effector provides convenient tools to handle them. Using effects (createEffect), you can build predictable logic for working with asynchronous data.

> TIP Effect naming:
>
> The Effector team recommends using the `Fx` postfix for naming effects. This is not a mandatory requirement but a usage recommendation, read more.

### What are Effects?

Effects are Effector's tool for working with external APIs or side effects in your application, for example:

* Asynchronous server requests
* Working with `localStorage`/`indexedDB`
* Any operations that might fail or take time to complete

> TIP good to know:
>
> The effect can be either async or sync.

### Main Effect States

Effector automatically tracks the state of effect execution:

* `pending` — is a store that indicates whether the effect is running, useful for displaying loading states
* `done` — is an event that triggers on successful completion
* `fail` — is an event that triggers on error
* `finally` — is an event that triggers when the effect is completed, either with success or error

You can find the complete effect API here.

> WARNING Important note:
>
> Don't call events or modify effect states manually, effector will handle this automatically.

```ts
const fetchUserFx = createEffect(() => {
  /* external api call */
});

fetchUserFx.pending.watch((isPending) => console.log("Pending:", isPending));

fetchUserFx.done.watch(({ params, result }) => console.log(`Fetched user ${params}:`, result));

fetchUserFx.finally.watch((value) => {
  if (value.status === "done") {
    console.log("fetchUserFx resolved ", value.result);
  } else {
    console.log("fetchUserFx rejected ", value.error);
  }
});

fetchUserFx.fail.watch(({ params, error }) =>
  console.error(`Failed to fetch user ${params}:`, error),
);

fetchUserFx();
```

### Binding Effects to Events and Stores

#### Updating Store Data When Effect Completes

Let's say we want effector to take the data returned by the effect when it completes and update the store with new data. This can be done quite easily using effect events:

```ts
import { createStore, createEffect } from "effector";

const fetchUserNameFx = createEffect(async (userId: string) => {
  const userData = await fetch(`/api/users/${userId}`);
  return userData.name;
});

const $error = createStore<string | null>(null);
const $userName = createStore("");
const $isLoading = fetchUserNameFx.pending.map((isPending) => isPending);

$error.reset(fetchUserNameFx.done);

$userName.on(fetchUserNameFx.done, (_, { params, result }) => result);
$error.on(fetchUserNameFx.fail, (_, { params, error }) => error.message);
// or 🔃
$userName.on(fetchUserNameFx.doneData, (_, result) => result);
$error.on(fetchUserNameFx.failData, (_, error) => error.message);

$isLoading.watch((isLoading) => console.log("Is loading:", isLoading));
```

`doneData` and `failData` are events that are identical to `done` and `fail` respectively, except that they only receive result and error in their parameters.

#### Triggering Effects on Event

In most cases, you'll want to trigger an effect when some event occurs, like form submission or button click. In such cases, the `sample` method will help you, which will call target when clock triggers.

> INFO `sample` function:
>
> The sample function is a key function for connecting stores, effects, and events. It allows you to flexibly and easily configure the reactive logic of your application.
>
> <!-- todo add link to page about sample -->

```ts
import { createEvent, sample, createEffect } from "effector";

const userLoginFx = createEffect(() => {
  // some logic
});

// Event for data loading
const formSubmitted = createEvent();

// Connect event with effect
sample({
  clock: formSubmitted, // When this triggers
  target: userLoginFx, // Run this
});

// somewhere in application
formSubmitted();
```

### Error handling in Effects

Effects in Effector provide robust error handling capabilities. When an error occurs during effect execution, it's automatically caught and processed through the `fail` event.

To type an error in an effect you need to pass a specific type to the generic of the `createEffect` function:

```ts
import { createEffect } from "effector";

class CustomError extends Error {
  // implementation
}

const effect = createEffect<Params, ReturnValue, CustomError>(() => {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    // You can throw custom errors that will be caught by .fail handler
    throw new CustomError(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
});
```

If you throw an error of a different type, the typescript will show the error to you.

### Practical Example

```ts
import { createStore, createEvent, createEffect, sample } from "effector";

// Effect for data loading
const fetchUserFx = createEffect(async (id: number) => {
  const response = await fetch(`/api/user/${id}`);

  if (!response.ok) {
    // you can modify the error before it reaches fail/failData
    throw new Error("User not found");
  }

  return response.json();
});

const setId = createEvent<number>();
const submit = createEvent();

const $id = createStore(0);
const $user = createStore<{ name: string } | null>(null);
const $error = createStore<string | null>(null);
const $isLoading = fetchUserFx.pending;

$id.on(setId, (_, id) => id);
$user.on(fetchUserFx.doneData, (_, user) => user);
$error.on(fetchUserFx.fail, (_, { error }) => error.message);
$error.reset(fetchUserFx.done);

// Loading logic: run fetchUserFx on submit
sample({
  clock: submit,
  source: $id,
  target: fetchUserFx,
});

// Usage
setId(1); // Set ID
submit(); // Load data
```

<!-- todo You can read about how to test effects on the [Testing page](/en/essentials/testing). -->

Full API reference for effects


# Computation priority

For sure, you've noticed that function should be pure... or watch if there is a place
for side effect. We will talk about this in the current section – **Computation priority**

A real example of queue priority — people waiting for medical treatment in a hospital, extreme emergency cases will have
the highest priority and move to the start of the queue and less significant to the end.

Computation priority allows us to have side effects, and it's one of the main reasons to create this concept:

* Letting pure functions to execute first.
* Side effects can follow a consistent state of the application.

Actually, pure computation cannot be observed out of the scope, therefore, the definition of ***pure computation*** used
in this library gives us an opportunity to optimize grouping.

Priority:

[Source code](https://github.com/effector/effector/blob/master/src/effector/kernel.ts#L169)

```
1. child -> forward
2. pure -> map, on
3. sampler -> sample, guard, combine
4. effect -> watch, effect handler
```

> Whenever you allow side effects in pure computations, the library will work by the worst scenario. Thereby, increasing non-consistency of application and breaking pure computations. Don't ignore that.

Let's consider prioritizing in the example below.

```js
let count = 0;
const fx = createEffect(() => {
  // side effect 1
  count += 1;
});

fx.done.watch(() => {
  // side effect 1 already executed
  console.log("expect count to be 1", count === 1);
  // side effect 2
  count += 1;
});

fx();
// side effect 1 already executed
// side effect 2 already executed as well
// that's what we expected to happen
// that's watchmen effect
console.log("expect count to be 2", count === 2);
// example which violated that agreement: setState in react
// which defer any side effect long after setState call itself
```

Try it

> INFO:
>
> Whenever a library notices side effect in a pure function it moves it to the end of the [**priority queue**](https://en.wikipedia.org/wiki/Priority_queue).

We hope that this information cleared some things on how the library works.


# Glossary

Glossary of basic terms in effector.

### Event

*Event* is a function you can subscribe to. It can be an intention to change the store, indication of something happening in the application, a command to be executed, aggregated analytics trigger and so on.

Event in api documentation

### Store

*Store* is an object that holds state.
There can be multiple stores.

Store in api documentation

### Effect

*Effect* is a container for (possibly async) side effects.
It exposes special events and stores, such as `.pending`, `.done`, `.fail`, `.finally`, etc...

It can be safely used in place of the original async function.

It returns promise with the result of a function call.

The only requirement for the function:

* **Must** have zero or one argument

Effect in api documentation

### Domain

*Domain* is a namespace for your events, stores and effects.

Domains are notified when events, stores, effects, or nested domains are created via `.onCreateEvent`, `.onCreateStore`, `.onCreateEffect`, `.onCreateDomain` methods.

It is useful for logging or other side effects.

Domain in api documentation

### Unit

Data type used to describe business logic of applications. Most of the effector methods deal with unit processing.
There are five unit types: Store, Event, Effect, Domain and Scope.

### Common unit

Common units can be used to trigger updates of other units. There are three common unit types: Store, Event and Effect. **When a method accepts units, it means that it accepts events, effects, and stores** as a source of reactive updates.

### Purity

Most of the functions in api must not call other events or effects: it's easier to reason about application's data flow when imperative triggers are grouped inside watchers and effect handlers rather than spread across entire business logic.

**Correct**, imperative:

```js
import { createStore, createEvent } from "effector";

const submitLoginSize = createEvent();

const $login = createStore("guest");
const $loginSize = $login.map((login) => login.length);

$loginSize.watch((size) => {
  submitLoginSize(size);
});
```

Try it

Reference: Store.map, Store.watch

**Better**, declarative:

```js
import { createStore, createEvent, sample } from "effector";

const submitLoginSize = createEvent();

const $login = createStore("guest");
const $loginSize = $login.map((login) => login.length);

sample({
  clock: $loginSize,
  target: submitLoginSize,
});
```

Try it

Reference: sample

**Incorrect**:

```js
import { createStore, createEvent } from "effector";

const submitLoginSize = createEvent();

const $login = createStore("guest");
const $loginSize = $login.map((login) => {
  // no! use `sample` instead
  submitLoginSize(login.length);
  return login.length;
});
```

### Reducer

```typescript
type StoreReducer<State, E> = (state: State, payload: E) => State | void;
type EventOrEffectReducer<T, E> = (state: T, payload: E) => T;
```

*Reducer* calculates a new state given the previous state and an event's payload. For stores, if reducer returns undefined or the same state (`===`), then there will be no update for a given store.

### Watcher

```typescript
type Watcher<T> = (update: T) => any;
```

*Watcher* is used for **side effects**. Accepted by Event.watch, Store.watch and Domain.onCreate\* hooks. Return value of a watcher is ignored.

### Subscription

```ts
import { type Subscription } from "effector";
```

Looks like:

```typescript
type Subscription = {
  (): void;
  unsubscribe(): void;
};
```

**Function**, returned by forward, Event.watch, Store.watch and some other methods. Used for cancelling a subscription. After the first call, subscription will do nothing.

> WARNING:
>
> **Managing subscriptions manually distracts from business logic improvements.** <br/><br/>
> Effector provides a wide range of features to minimize the need to remove subscriptions. This sets it apart from most other reactive libraries.

[effect]: /en/api/effector/Effect

[store]: /en/api/effector/Store

[event]: /en/api/effector/Event

[domain]: /en/api/effector/Domain

[scope]: /en/api/effector/Scope


# Prior Art

### Papers

* **Functional Pearl. Weaving a Web** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/weaver+zipper.pdf) *Ralf Hinze and Johan Jeuring*
* **A graph model of data and workflow provenance** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/A+graph+model+of+data+and+workflow+provenance.pdf) <br/> *Umut Acar, Peter Buneman, James Cheney, Jan Van den Bussche, Natalia Kwasnikowska and Stijn Vansummeren*
* **An Applicative Control-Flow Graph Based on Huet’s Zipper** [\[pdf\]](http://zero-bias-papers.s3-website-eu-west-1.amazonaws.com/zipcfg.pdf) <br/> *Norman Ramsey and Joao Dias*
* **Elm: Concurrent FRP for Functional GUIs** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/elm-concurrent-frp.pdf) <br/> *Evan Czaplicki*
* **Inductive Graphs and Functional Graph Algorithms** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Inductive+Graphs+and+Functional+Graph+Algorithms.pdf) <br/> *Martin Erwig*
* **Notes on Graph Algorithms Used in Optimizing Compilers** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Graph+Algorithms+Used+in+Optimizing+Compilers.pdf) <br/> *Carl D. Offner*
* **Backtracking, Interleaving, and Terminating Monad Transformers** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Backtracking%2C+Interleaving%2C+and+Terminating+Monad+Transformers.pdf) <br/> *Oleg Kiselyov, Chung-chieh Shan, Daniel P. Friedman and Amr Sabry*
* **Typed Tagless Final Interpreters** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Typed+Tagless+Final+Interpreters.pdf) *Oleg Kiselyov*

### Books

* **Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions** [\[book\]](https://www.amazon.com/o/asin/0321200683/ref=nosim/enterpriseint-20), [\[messaging patterns overview\]](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) <br/> *Gregor Hohpe and Bobby Woolf*

### API

* [re-frame](https://github.com/day8/re-frame)
* [flux](https://facebook.github.io/flux/)
* [redux](https://redux.js.org/)
* [redux-act](https://github.com/pauldijou/redux-act)
* [most](https://github.com/cujojs/most)
* nodejs [events](https://nodejs.org/dist/latest-v12.x/docs/api/events.html#events_emitter_on_eventname_listener)


# SIDs

Effector is based on idea of atomic store. It means that any application does not have some centralized state controller or other entry point to collect all states in one place.

So, there is the question — how to distinguish units between different environments? For example, if we ran an application on the server and serialize its state to JSON, how do we know which part of the JSON should be filled in a particular store on the client?

Let's discuss how this problem solved by other state managers.

### Other state managers

#### Single store

In the state manager with single store (e.g. Redux), this problem does not exist at all. It is a single store, which can be serialized and deserialized without any additional information.

> INFO:
>
> Actually, single store forces you to create unique names of each part of it implicitly. In any object you won't be able to create duplicate keys, so the path to store slice is a unique identifier of this slice.

```ts
// server.ts
import { createStore } from "single-store-state-manager";

function handlerRequest() {
  const store = createStore({ initialValue: null });

  return {
    // It is possible to just serialize the whole store
    state: JSON.stringify(store.getState()),
  };
}

// client.ts
import { createStore } from "single-store-state-manager";

// Let's assume that server put the state into the HTML
const serverState = readServerStateFromWindow();

const store = createStore({
  // Just parse the whole state and use it as client state
  initialValue: JSON.parse(serverState),
});
```

It's great that you do not need any additional tools for serialization and deserialization, but single store has a few problems:

* It does not support tree-shaking and code-splitting, you have to load the whole store anyway
* Because its architecture, it requires some additional tools for fixing performance (like `reselect`)
* It does not support any kind of micro-frontends and stuff which is getting bigger recently

#### Multi stores

Unfortunately, state managers that built around idea of multi stores do not solve this problem good. Some tools offer single store like solutions (MobX), some does not try to solve this issue at all (Recoil, Zustand).

> INFO:
>
> E.g., the common pattern to solve serialization problem in MobX is [Root Store Pattern](https://dev.to/ivandotv/mobx-root-store-pattern-with-react-hooks-318d) which is destroying the whole idea of multi stores.

So, we are considering SSR as a first class citizen of modern web applications, and we are going to support code-splitting or micro-frontends.

### Unique identifiers for every store

Because of multi-store architecture, Effector requires a unique identifier for every store. It is a string that is used to distinguish stores between different environments. In Effector's world this kind of strings are called `sid`.

\:::tip TL;DR

`sid` is a unique identifier of a store. It is used to distinguish stores between different environments.

\:::

Let's add it to some stores:

```ts
const $name = createStore(null, { sid: "name" });
const $age = createStore(null, { sid: "age" });
```

Now, we can serialize and deserialize stores:

```ts
// server.ts
async function handlerRequest() {
  // create isolated instance of application
  const scope = fork();

  // fill some data to stores
  await allSettled($name, { scope, params: "Igor" });
  await allSettled($age, { scope, params: 25 });

  const state = JSON.serialize(serialize(scope));
  // -> { "name": "Igor", "age": 25 }

  return { state };
}
```

After this code, we have a serialized state of our application. It is a plain object with stores' values. We can put it back to the stores on the client:

```ts
// Let's assume that server put the state into the HTML
const serverState = readServerStateFromWindow();

const scope = fork({
  // Just parse the whole state and use it as client state
  values: JSON.parse(serverState),
});
```

Of course, it's a lot of boring jobs to write `sid` for every store. Effector provides a way to do it automatically with code transformation plugins.

#### Automatic way

For sure, manually creating unique ids is a quite boring job.

Thankfully, there are effector/babel-plugin and @effector/swc-plugin, which will provide SIDs automatically.

Because code-transpilation tools are working at the file level and are run before bundling happens – it is possible to make SIDs **stable** for every environment.

> TIP:
>
> It is preferable to use effector/babel-plugin or @effector/swc-plugin instead of adding SIDs manually.

**Code example**

Notice, that there is no central point at all – any event of any "feature" can be triggered from anywhere and the rest of them will react accordingly.

```tsx
// src/features/first-name/model.ts
import { createStore, createEvent } from "effector";

export const firstNameChanged = createEvent<string>();
export const $firstName = createStore("");

$firstName.on(firstNameChanged, (_, firstName) => firstName);

// src/features/last-name/model.ts
import { createStore, createEvent } from "effector";

export const lastNameChanged = createEvent<string>();
export const $lastName = createStore("");

$lastName.on(lastNameChanged, (_, lastName) => lastName);

// src/features/form/model.ts
import { createEvent, sample, combine } from "effector";

import { $firstName, firstNameChanged } from "@/features/first-name";
import { $lastName, lastNameChanged } from "@/features/last-name";

export const formValuesFilled = createEvent<{ firstName: string; lastName: string }>();

export const $fullName = combine($firstName, $lastName, (first, last) => `${first} ${last}`);

sample({
  clock: formValuesFilled,
  fn: (values) => values.firstName,
  target: firstNameChanged,
});

sample({
  clock: formValuesFilled,
  fn: (values) => values.lastName,
  target: lastNameChanged,
});
```

If this application was a SPA or any other kind of client-only app — this would be the end of the article.

#### Serialization boundary

But in the case of Server Side Rendering, there is always a **serialization boundary** — a point, where all state is stringified, added to a server response, and sent to a client browser.

##### Problem

And at this point we **still need to collect the states of all stores of the app** somehow!

Also, after the client browser has received a page — we need to "hydrate" everything back: unpack these values at the client and add this "server-calculated" state to client-side instances of all stores.

##### Solution

This is a hard problem and to solve this, `effector` needs a way to connect the "server-calculated" state of some store with its client-side instance.

While **it could be** done by introducing a "root store" or something like that, which would manage store instances and their state for us, it would also bring to us all the downsides of this approach, e.g. much more complicated code-splitting – so this is still undesirable.

This is where SIDs will help us a lot.
Because SID is, by definition, the same for the same store in any environment, `effector` can simply rely on it to handle state serializing and hydration.

##### Example

This is a generic server-side rendering handler. The `renderHtmlToString` function is an implementation detail, which will depend on the framework you use.

```tsx
// src/server/handler.ts
import { fork, allSettled, serialize } from "effector";

import { formValuesFilled } from "@/features/form";

async function handleServerRequest(req) {
  const scope = fork(); // creates isolated container for application state

  // calculates the state of the app in this scope
  await allSettled(formValuesFilled, {
    scope,
    params: {
      firstName: "John",
      lastName: "Doe",
    },
  });

  // extract scope values to simple js object of `{[storeSid]: storeState}`
  const values = serialize(scope);

  const serializedState = JSON.stringify(values);

  return renderHtmlToString({
    scripts: [
      `
        <script>
            self._SERVER_STATE_ = ${serializedState}
        </script>
      `,
    ],
  });
}
```

Notice, that there are no direct imports of any stores of the application here.
The state is collected automatically and its serialized version already has all the information, which will be needed for hydration.

When the generated response arrives in a client browser, the server state must be hydrated to the client stores.
Thanks to SIDs, state hydration also works automatically:

```tsx
// src/client/index.ts
import { Provider } from "effector-react";

const serverState = window._SERVER_STATE_;

const clientScope = fork({
  values: serverState, // simply assign server state to scope
});

clientScope.getState($lastName); // "Doe"

hydrateApp(
  <Provider value={clientScope}>
    <App />
  </Provider>,
);
```

At this point, the state of all stores in the `clientScope` is the same, as it was at the server and there was **zero** manual work to do it.

### Unique SIDs

The stability of SIDs is ensured by the fact, that they are added to the code before any bundling has happened.

But since both `babel` and `swc` plugins are able "to see" contents of one file at each moment, there is a case, where SIDs will be stable, but **might not be unique**

To understand why, we need to dive a bit deeper into plugin internals.

Both `effector` plugins use the same approach to code transformation. Basically, they do two things:

1. Add `sid`-s and any other meta-information to raw Effector's factories calls, like `createStore` or `createEvent`.
2. Wrap any custom factories with `withFactory` helper that allows you to make `sid`-s of inner units unique as well.

#### Built-in unit factories

Let's take a look at the first case. For the following source code:

```ts
const $name = createStore(null);
```

The plugin will apply these transformations:

```ts
const $name = createStore(null, { sid: "j3l44" });
```

> TIP:
>
> Plugins create `sid`-s as a hash of the location in the source code of a unit. It allows making `sid`-s unique and stable.

#### Custom factories

The second case is about custom factories. These are usually created to abstract away some common pattern.

Examples of custom factories:

* `createQuery`, `createMutation` from [`farfetched`](https://ff.effector.dev/)
* `debounce`, `throttle`, etc from [`patronum`](https://patronum.effector.dev/)
* Any custom factory in your code, e.g. factory of a [feature-flag entity](https://ff.effector.dev/recipes/feature_flags.html)

> TIP:
>
> farfetched, patronum, @effector/reflect, atomic-router and @withease/factories are supported by default and doesn't need additional configuration

For this explanation, we will create a very simple factory:

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null);

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { createName } from "@/shared/lib/create-name";

const personOne = createName();
const personTwo = createName();
```

First, the plugin will add `sid` to the inner stores of the factory

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null, { sid: "ffds2" });

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { createName } from "@/shared/lib/create-name";

const personOne = createName();
const personTwo = createName();
```

But it's not enough, because we can create two instances of `createName` and internal stores of both of these instances will have the same SIDs!
These SIDs will be stable, but not unique.

To fix it we need to inform the plugin about our custom factory:

```json
// .babelrc
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
        "factories": ["@/shared/lib/create-name"]
      }
    ]
  ]
}
```

Since the plugin "sees" only one file at a time, we need to provide it with the actual import path used in the module.

> TIP:
>
> If relative import paths are used in the module, then the full path from the project root must be added to the `factories` list, so the plugin could resolve it.
>
> If absolute or aliased (like in the example) paths are used, then specifically this aliased path must be added to the `factories` list.
>
> Most of the popular ecosystem projects are already included in plugin's default settings.

Now the plugin knows about our factory and it will wrap `createName` with the internal `withFactory` helper:

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null, { sid: "ffds2" });

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { withFactory } from "effector";
import { createName } from "@/shared/lib/create-name";

const personOne = withFactory({
  sid: "gre24f",
  fn: () => createName(),
});
const personTwo = withFactory({
  sid: "lpefgd",
  fn: () => createName(),
});
```

Thanks to that `sid`-s of inner units of a factory are also unique, and we can safely serialize and deserialize them.

```ts
personOne.$name.sid; // gre24f|ffds2
personTwo.$name.sid; // lpefgd|ffds2
```

#### How `withFactory` works

`withFactory` is a helper that allows to create unique `sid`-s for inner units. It is a function that accepts an object with `sid` and `fn` properties. `sid` is a unique identifier of the factory, and `fn` is a function that creates units.

Internal implementation of `withFactory` is pretty simple, it puts received `sid` to the global scope before `fn` call, and removes it after. Any Effector's creator function tries to read this global value while creating and append its value to the `sid` of the unit.

```ts
let globalSid = null;

function withFactory({ sid, fn }) {
  globalSid = sid;

  const result = fn();

  globalSid = null;

  return result;
}

function createStore(initialValue, { sid }) {
  if (globalSid) {
    sid = `${globalSid}|${sid}`;
  }

  // ...
}
```

Because of single thread nature of JavaScript, it is safe to use global variables for this purpose.

> INFO:
>
> Of course, the real implementation is a bit more complicated, but the idea is the same.

### Summary

1. Any multi-store state manager requires unique identifiers for every store to distinguish them between different environments.
2. In Effector's world this kind of strings are called `sid`.
3. Plugins for code transformations add `sid`-s and meta-information to raw Effector's units creation, like `createStore` or `createEvent`.
4. Plugins for code transformations wrap custom factories with `withFactory` helper that allow to make `sid`-s of inner units unique as well.


# Best Practices and Recommendations in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Best Practices in Effector

This section contains recommendations for effective work with Effector, based on community experience and the development team.

### Keep Stores Small

Unlike Redux, in Effector it's recommended to make stores as atomic as possible. Let's explore why this is important and what advantages it provides.

Large stores with multiple fields create several problems:

* Unnecessary re-renders: When any field changes, all components subscribed to the store update
* Heavy computations: Each update requires copying the entire object
* Unnecessary calculations: if you have derived stores depending on a large store, they will be recalculated

Atomic stores allow:

* Updating only what actually changed
* Subscribing only to needed data
* More efficient work with reactive dependencies

```ts
// ❌ Big store - any change triggers update of everything
const $bigStore = createStore({
profile: {/* many fields */},
settings: {/* many fields */},
posts: [ /* many posts */ ]
})

// ✅ Atomic stores - precise updates
const $userName = createStore('')
const $userEmail = createStore('')
const $posts = createStore<Post[]>([])
const $settings = createStore<Settings>({})

// Component subscribes only to needed data
const UserName = () => {
const name = useUnit($userName) // Updates only when name changes
return <h1>{name}</h1>
}
```

Rules for atomic stores:

* One store = one responsibility
* Store should be indivisible
* Stores can be combined using combine
* Store update should not affect other data

### Immer for Complex Objects

If your store contains nested structures, you can use the beloved Immer for simplified updates:

```ts
import { createStore } from "effector";
import { produce } from "immer";

const $users = createStore<User[]>([]);

$users.on(userUpdated, (users, updatedUser) =>
  produce(users, (draft) => {
    const user = draft.find((u) => u.id === updatedUser.id);
    if (user) {
      user.profile.settings.theme = updatedUser.profile.settings.theme;
    }
  }),
);
```

### Explicit Application Start

We recommend using explicit application start through special events to initialize your application.

Why it matters:

1. Full control over application lifecycle
2. Simplified testing
3. Predictable application behavior
4. Ability to control initialization order

```ts
export const appStarted = createEvent();
```

call event and subscribe on it:

<Tabs>
  <TabItem label="Without Scopes">

```ts
import { sample } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

appStarted();
```

  </TabItem>
  <TabItem label="With Scopes">

```ts
import { sample, allSettled } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

allSettled(appStarted, { scope });
```

  </TabItem>

</Tabs>

### Use `scope`

The effector team recommends always using Scope, even if your application doesn't use SSR.
This is necessary so that in the future you can easily migrate to working with `Scope`.

### `useUnit` Hook

Using the useUnit hook is the recommended way to work with units when using frameworks (📘React, 📗Vue, and 📘Solid).
Why you should use `useUnit`:

* Correct work with stores
* Optimized updates
* Automatic work with `Scope` – units know which scope they were called in

### Pure Functions

Use pure functions everywhere except effects for data processing, this ensures:

* Deterministic result
* No side effects
* Easier to test
* Easier to maintain

> TIP This is work for effects:
>
> If your code can throw an error or can end in success/failure - that's an excellent place for effects.

### Debugging

We strongly recommend using the patronum library and the debug method.

```ts
import { createStore, createEvent, createEffect } from "effector";
import { debug } from "patronum/debug";

const event = createEvent();
const effect = createEffect().use((payload) => Promise.resolve("result" + payload));
const $store = createStore(0)
  .on(event, (state, value) => state + value)
  .on(effect.done, (state) => state * 10);

debug($store, event, effect);

event(5);
effect("demo");

// => [store] $store 1
// => [event] event 5
// => [store] $store 6
// => [effect] effect demo
// => [effect] effect.done {"params":"demo", "result": "resultdemo"}
// => [store] $store 60
```

However, nothing prevents you from using `.watch` or createWatch for debugging.

### Factories

Factory creation is a common pattern when working with effector, it makes it easier to use similar code. However, you may encounter a problem with identical sids that can interfere with SSR.

To avoid this problem, we recommend using the [@withease/factories](https://withease.effector.dev/factories/) library.

If your environment does not allow adding additional dependencies, you can create your own factory following these guidelines.

### Working with Network

For convenient effector work with network requests, you can use farfetched.
Farfetched provides:

* Mutations and queries
* Ready API for caching and more
* Framework independence

### Effector Utils

The Effector ecosystem includes the [patronum](https://patronum.effector.dev/operators/) library, which provides ready solutions for working with units:

* State management (`condition`, `status`, etc.)
* Working with time (`debounce`, `interval`, etc.)
* Predicate functions (`not`, `or`, `once`, etc.)

### Simplifying Complex Logic with `createAction`

[`effector-action`](https://github.com/AlexeyDuybo/effector-action) is a library that allows you to write imperative code for complex conditional logic while maintaining effector's declarative nature.

Moreover, `effector-action` helps make your code more readable:

<Tabs>
  <TabItem label="❌ Complex sample">

```ts
import { sample } from "effector";

sample({
  clock: formSubmitted,
  source: {
    form: $form,
    settings: $settings,
    user: $user,
  },
  filter: ({ form }) => form.isValid,
  fn: ({ form, settings, user }) => ({
    data: form,
    theme: settings.theme,
  }),
  target: submitFormFx,
});

sample({
  clock: formSubmitted,
  source: $form,
  filter: (form) => !form.isValid,
  target: showErrorMessageFx,
});

sample({
  clock: submitFormFx.done,
  source: $settings,
  filter: (settings) => settings.sendNotifications,
  target: sendNotificationFx,
});
```

  </TabItem>

<TabItem label="✅ With createAction">

```ts
import { createAction } from "effector-action";

const submitForm = createAction({
  source: {
    form: $form,
    settings: $settings,
    user: $user,
  },
  target: {
    submitFormFx,
    showErrorMessageFx,
    sendNotificationFx,
  },
  fn: (target, { form, settings, user }) => {
    if (!form.isValid) {
      target.showErrorMessageFx(form.errors);
      return;
    }

    target.submitFormFx({
      data: form,
      theme: settings.theme,
    });
  },
});

createAction(submitFormFx.done, {
  source: $settings,
  target: sendNotificationFx,
  fn: (sendNotification, settings) => {
    if (settings.sendNotifications) {
      sendNotification();
    }
  },
});

submitForm();
```

  </TabItem>
</Tabs>

### Naming

Use accepted naming conventions:

* For stores – prefix `$`
* For effects – postfix `fx`, this will help you distinguish your effects from events
* For events – no rules, however, we suggest naming events that directly trigger store updates as if they've already happened.

```ts
const updateUserNameFx = createEffect(() => {});

const userNameUpdated = createEvent();

const $userName = createStore("JS");

$userName.on(userNameUpdated, (_, newName) => newName);

userNameUpdated("TS");
```

> INFO Naming Convention:
>
> The choice between prefix or postfix is mainly a matter of personal preference. This is necessary to improve the search experience in your IDE.

### Anti-patterns

#### Using watch for Logic

watch should only be used for debugging. For logic, use sample, guard, or effects.

<Tabs>
  <TabItem label="❌ Incorrect">

```ts
// logic in watch
$user.watch((user) => {
  localStorage.setItem("user", JSON.stringify(user));
  api.trackUserUpdate(user);
  someEvent(user.id);
});
```

  </TabItem>
  <TabItem label="✅ Correct">

```ts
// separate effects for side effects
const saveToStorageFx = createEffect((user: User) =>
  localStorage.setItem("user", JSON.stringify(user)),
);

const trackUpdateFx = createEffect((user: User) => api.trackUserUpdate(user));

// connect through sample
sample({
  clock: $user,
  target: [saveToStorageFx, trackUpdateFx],
});

// for events also use sample
sample({
  clock: $user,
  fn: (user) => user.id,
  target: someEvent,
});
```

</TabItem>
</Tabs>

#### Complex Nested samples

Avoid complex and nested chains of sample.

#### Abstract Names in Callbacks

Use meaningful names instead of abstract `value`, `data`, `item`.

<Tabs>
  <TabItem label="❌ Incorrect">

```ts
$users.on(userAdded, (state, payload) => [...state, payload]);

sample({
  clock: buttonClicked,
  source: $data,
  fn: (data) => data,
  target: someFx,
});
```

  </TabItem>
  <TabItem label="✅ Correct">

```ts
$users.on(userAdded, (users, newUser) => [...users, newUser]);

sample({
  clock: buttonClicked,
  source: $userData,
  fn: (userData) => userData,
  target: updateUserFx,
});
```

  </TabItem>
</Tabs>

#### Imperative Calls in Effects

Don't call events or effects imperatively inside other effects, instead use declarative style.

<Tabs>
  <TabItem label="❌ Incorrect">

```ts
const loginFx = createEffect(async (params) => {
  const user = await api.login(params);

  // imperative calls
  setUser(user);
  redirectFx("/dashboard");
  showNotification("Welcome!");

  return user;
});
```

  </TabItem>
  <TabItem label="✅ Correct">

```ts
const loginFx = createEffect((params) => api.login(params));
// Connect through sample
sample({
  clock: loginFx.doneData,
  target: [
    $user, // update store
    redirectToDashboardFx,
    showWelcomeNotificationFx,
  ],
});
```

 </TabItem>
</Tabs>

#### Using getState

Don't use `$store.getState` to get values. If you need to get data from some store, pass it there, for example in `source` in `sample`:

<Tabs>
  <TabItem label="❌ Incorrect">

```ts
const submitFormFx = createEffect((formData) => {
  // get values through getState
  const user = $user.getState();
  const settings = $settings.getState();

  return api.submit({
    ...formData,
    userId: user.id,
    theme: settings.theme,
  });
});
```

</TabItem>
  <TabItem label="✅ Correct">

```ts
// get values through parameters
const submitFormFx = createEffect(({ form, userId, theme }) => {});

// get all necessary data through sample
sample({
  clock: formSubmitted,
  source: {
    form: $form,
    user: $user,
    settings: $settings,
  },
  fn: ({ form, user, settings }) => ({
    form,
    userId: user.id,
    theme: settings.theme,
  }),
  target: submitFormFx,
});
```

  </TabItem>
</Tabs>

#### Business Logic in UI

Don't put your logic in UI elements, this is the main philosophy of effector and what effector tries to free you from, namely the dependency of logic on UI.

Brief summary of anti-patterns:

1. Don't use `watch` for logic, only for debugging
2. Avoid direct mutations in stores
3. Don't create complex nested `sample`, they're hard to read
4. Don't use large stores, use an atomic approach
5. Use meaningful parameter names, not abstract ones
6. Don't call events inside effects imperatively
7. Don't use `$store.getState` for work
8. Don't put logic in UI


# Migration guide

This guide covers the steps required to migrate to Effector 23 from a previous version.
Several features were declared deprecated in this release:

* `forward` and `guard` operators
* `greedy` option of `sample` was renamed into `batch`
* "derived" and "callable" unit types are officially separated now
* the ability to use `undefined` as a magic "skip" value in reducers

### Deprecation of `forward` and `guard`

Those operators are pretty old and lived through many releases of Effector.
But all of their use-cases are already covered by `sample` now, so it is their time to go. You will see a deprecation warning in console for every call of those operators in your code.

> TIP:
>
> You can migrate from both of them by using the official [Effector's ESLint plugin](https://eslint.effector.dev/), which has `no-forward` and `no-guard` rules with built-in [auto-fix feature](https://eslint.org/docs/latest/use/command-line-interface#fix-problems).

### `greedy` to `batch`

The `sample` operator had `greedy` option to disable updates batching in rare edge-cases.
But the name "greedy" wasn't that obvious for the users, so it is renamed into `batch` and it's signature is reversed.

You will see a deprecation warning in console for every usage of `greedy` option in your code.

> TIP:
>
> You can migrate from one to the other by simply running "Find and Replace" from `greedy: true` to `batch: false` in your favorite IDE.

### Separate types for derived and callable units

Derived units now fully separated from "callable/writable" ones:

* Main factories `createEvent` and `createStore` now return types `EventCallable` and `StoreWritable` (because you can call and write to these units at any moment).
* Methods and operators like `unit.map(...)` or `combine(...)` now return types `Event` and `Store`, which are "read-only" i.e. you can only use them as `clock` or `source`, but not as a `target`.
* `EventCallable` type is assignable to `Event`, but not the other way around, same for stores.
* There are also runtime exceptions for types mismatch.

Most likely you will not need to do anything, you will just get better types.

But you might have issues with external libraries, **which are not updated to Effector 23 yet**:

* Most of the libraries are just *accepting* units as clocks and sources – those cases are ok.
* If some operator from the external library is accepting some unit as a `target`, you still will see an good-old `Event` type in this case, so you will not have a type error here even if there is actually an issue.
* If some *factory* returns an event, which you are expected to call in your own code, then you will get a type error and you will need to typecast this event to `EventCallable`.

> TIP:
>
> If you run into any of these cases, just create an issue in the repo of this library with a request to support Effector 23 version.
> Owners of the project will see relevant type errors in their own source code and tests, once they update Effector in their repo.

If you have these issues in your own custom factories or libraries, then you should already see a relevant type errors in the source code of your library.
Just replace `Event` with `EventCallable`, `Store` with `StoreWritable` or `Unit` with `UnitTargetable` everywhere it is relevant (i.e. you are going to call or write into these units somehow).

### Magic `undefined` skip is deprecated

There is an old feature in Effector: `undefined` is used as a "magic" value to skip updates in reducers in rare cases, e.g.

```ts
const $value = createStore(0).on(newValueReceived, (_oldValue, newValue) => newValue);
```

☝️ if `newValue` is `undefined`, then update will be skipped.

The idea of making each mapper and reducer work as a sort of `filterMap` was considered useful in early Effector, but is very rarely used properly, and is confusing and distracting, so it should be deprecated and removed.

To do so each and every store factory now supports special `skipVoid` configuration setting, which controls, how specifically store should handle `undefined` value. If set to `false` – store will use `undefined` as a value.
If set to `true` (deprecated), store will read `undefined` as a "skip update" command and will do nothing.

You will see a warning for each return of undefined in your mappers or reducers in your code, with a requirement to provide an explicit `skipVoid` setting on your store.

> TIP:
>
> If you do want to skip store update in certain cases, then it is better to explicitly return previous state, when possible.

It is recommended to use `{skipVoid: false}` at all times, so you are able to use an `undefined` as a normal value.

If you do need `undefined` as a "magic skip" value – then you can use `{skipVoid: true}` to preserve current behavior. You still will get a deprecation warning though, but only one for declaration instead of one for every such update.

The `skipVoid` setting is temporary and only needed as a way to properly deprecate this feature from Effector. In Effector 24 `skipVoid` itself will be deprecated and then removed.

### `useStore` and `useEvent` to `useUnit` in `effector-react`

We merged two old hooks into one, its advantage is that you can pass many units to it at once and it batches all the stores' updates into one single update.

It's safe to just swap the calls of the old hooks with the new one:

```ts
const Component = () => {
  const foo = useStore($foo);
  const bar = useStore($bar);
  const onSubmit = useEvent(triggerSubmit);
};
```

Becomes:

```ts
const Component = () => {
  const foo = useUnit($foo);
  const bar = useUnit($bar);
  const onSubmit = useUnit(triggerSubmit);
};
```

Or shorter:

```ts
const Component = () => {
  const [foo, bar, onSubmit] = useUnit([$foo, $bar, triggerSubmit]);
};
```


# Scope loss

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import SideBySide from "@components/SideBySide/SideBySide.astro";

## Scope loss

The execution of units in Effector always happens within a scope — either the global one or an isolated one created with fork(). In the global case, the context cannot be lost, since it’s used by default. With an isolated scope, things are trickier: if the scope is lost, operations will start executing in the global mode, and all data updates will **not** enter the scope in which the work was conducted. As a result, an inconsistent state will be sent to the client.

Typical places where this happens:

* `setTimeout` / `setInterval`
* `addEventListener`
* WebSocket
* direct promise calls inside effects
* third-party libraries with async APIs or callbacks.

### Example of the problem

We’ll create a simple timer in React, although the same behavior applies to any framework or runtime when scope loss occurs:

<Tabs>

<TabItem label='timer.tsx'>

```tsx
import React from "react";
import { createEvent, createStore, createEffect, scopeBind } from "effector";
import { useUnit } from "effector-react";

const tick = createEvent();
const $timer = createStore(0);

$timer.on(tick, (s) => s + 1);

export function Timer() {
  const [timer, startTimer] = useUnit([$timer, startTimerFx]);

  return (
    <div className="App">
      <div>Timer:{timer} sec</div>
      <button onClick={startTimer}>Start timer</button>
    </div>
  );
}
```

</TabItem>

<TabItem label='app.tsx'>

```tsx
import { Provider } from "effector-react";
import { fork } from "effector";
import { Timer } from "./timer";

export const scope = fork();

export default function App() {
  return (
    <Provider value={scope}>
      <Timer />
    </Provider>
  );
}
```

</TabItem> 
</Tabs>

Now let’s add an effect that calls `tick` every second:

```ts
const startTimerFx = createEffect(() => {
  setInterval(() => {
    tick();
  }, 1000);
});
```

[Playground](https://codesandbox.io/p/sandbox/nrqw96).<br/>

At first glance, the code looks fine, but if you start the timer, you’ll notice that the UI doesn’t update. This happens because timer changes occur in the global scope, while our app is running in the isolated scope we passed to \<Provider>. You can observe this in the console.

### How to fix scope loss?

To fix scope loss, you need to use the scopeBind function. This method returns a function bound to the scope in which it was called, and can later be safely executed:

```ts ins={2} "bindedTick"
const startTimerFx = createEffect(() => {
  const bindedTick = scopeBind(tick);

  setInterval(() => {
    bindedTick();
  }, 1000);
});
```

[Updated code example](https://codesandbox.io/p/devbox/scope-loss-forked-vx4r9x?workspaceId=ws_BJxLCP4FhfNzjg1qXth95S).

Note that scopeBind automatically works with the currently used scope. However, if needed, you can pass the desired scope explicitly as the second argument:

```ts
scopeBind(tick, { scope });
```

> TIP Clearing Intervals:
>
> Don’t forget to clear `setInterval` after finishing work to avoid memory leaks. You can handle this with a separate effect, return the interval ID from the first effect and store it in a dedicated store.

### Why does scope loss happen?

Let’s illustrate how scope works in effector:

```ts
// our active scope
let scope;

function process() {
  try {
    scope = "effector";
    asyncProcess();
  } finally {
    scope = undefined;
    console.log("our scope is undefined now");
  }
}

async function asyncProcess() {
  console.log("we have scope", scope); // effector

  await 1;

  // here we already lost the context
  console.log("but here scope is gone", scope); // undefined
}

process();

// Output:
// we have scope effector
// our scope is undefined now
// but here scope is gone undefined
```

You might be wondering **"Is this specifically an Effector problem?"**, but this is a general principle of working with asynchronicity in JavaScript. All technologies that face the need to preserve the context in which calls occur somehow work around this difficulty. The most characteristic example is [zone.js](https://github.com/angular/angular/tree/main/packages/zone.js),
which wraps all asynchronous global functions like `setTimeout` or `Promise.resolve` to preserve context. Other solutions to this problem include using generators or `ctx.schedule(() => asyncCall())`.

> INFO Future solution:
>
> JavaScript is preparing a proposal [Async Context](https://github.com/tc39/proposal-async-context), which aims to solve the context loss problem at the language level. This will allow:
>
> Automatically preserving context through all asynchronous calls
> Eliminating the need for explicit use of scopeBind
> Getting more predictable behavior of asynchronous code
>
> Once this proposal enters the language and receives wide support, Effector will be updated to use this native solution.

### Related API and articles

* **API**
    * Effect - Description of effects, their methods and properties
    * Scope - Description of scopes and their methods
    * scopeBind - Method for binding a unit to a scope
    * fork - Operator for creating a scope
    * allSettled - Method for calling a unit in a given scope and awaiting the full effect chain
* **Articles**
    * Isolated scopes
    * SSR guide
    * Guide to testing
    * The importance of SIDs for store hydration


# Server Side Rendering

Server-side rendering (SSR) means that the content of your site is generated on the server and then sent to the browser – which these days is achieved in very different ways and forms.

> INFO:
>
> Generally, if the rendering happens at the runtime – it is called SSR. If the rendering happens at the build-time – it is usually called Server Side Generation (SSG), which in fact is basically a subset of SSR.
>
> This difference it is not important for this guide, everything said applies both to SSR and SSG.

In this guide we will cover two main kinds of Server Side Rendering patterns and how effector should be used in these cases.

### Non-Isomorphic SSR

You don't need to do anything special to support non-isomorphic SSR/SSG workflow.

This way initial HTML is usually generated separately, by using some sort of template engine, which is quite often run with different (not JS) programming language.
The frontend code in this case works only at the client browser and **is not used in any way** to generate the server response.

This approach works for effector, as well as any javascript code. Any SPA application is basically an edge-case of it, as its HTML template does not contain any content, except for `<script src="my-app.js" />` link.

> TIP:
>
> If you have non-isomorphic SSR – just use effector the way you would for an SPA app.

### Isomorphic SSR

When you have an isomorphic SSR application, **most of the frontend code is shared with server** and **is used to generate the response** HTML.

You can also think of it as an approach, where your app **starts at the server** – and then gets transferred over the network to the client browser, where it **continues** the work it started doing at the server.

That's where the name comes from – despite the fact, that the code is bundled for and run in different environments, its output remains (mostly) the same, if given the same input.

There are a lot of different frameworks, which are built upon this approach – e.g. Next.js, Remix.run, Razzle.js, Nuxt.js, Astro, etc

> TIP Next.js:
>
> Next.js does SSR/SSG in the special way, which requires a bit of custom handling on the effector side.
>
> This is done via dedicated [`@effector/next`](https://github.com/effector/next) package – use it, if you want to use effector with Next.js.

For this guide we will not focus on any specific framework or server implementation – these details will be abstracted away.

#### SIDs

To handle isomorphic SSR with effector we need a reliable way to serialize state, to pass it over the network. This where we need to have Stable IDentifiers for each store in our app.

> INFO:
>
> Deep-dive explanation about SIDs can be found here.

To add SIDs – just use one of effector's plugins.

#### Common application code

The main feature of isomorphic SSR – the same code is used to both server render and client app.

For sake of example we will use a very simple React-based counter app – all of it will be contained in one module:

```tsx
// app.tsx
import React from "react";
import { createEvent, createStore, createEffect, sample, combine } from "effector";
import { useUnit } from "effector-react";

// model
export const appStarted = createEvent();
export const $pathname = createStore<string | null>(null);

const $counter = createStore<number | null>(null);

const fetchUserCounterFx = createEffect(async () => {
  await sleep(100); // in real life it would be some api request

  return Math.floor(Math.random() * 100);
});

const buttonClicked = createEvent();
const saveUserCounterFx = createEffect(async (count: number) => {
  await sleep(100); // in real life it would be some api request
});

sample({
  clock: appStarted,
  source: $counter,
  filter: (count) => count === null, // if count is already fetched - do not fetch it again
  target: fetchUserCounterFx,
});

sample({
  clock: fetchUserCounterFx.doneData,
  target: $counter,
});

sample({
  clock: buttonClicked,
  source: $counter,
  fn: (count) => count + 1,
  target: [$counter, saveUserCounterFx],
});

const $countUpdatePending = combine(
  [fetchUserCounterFx.pending, saveUserCounterFx.pending],
  (updates) => updates.some((upd) => upd === true),
);

const $isClient = createStore(typeof document !== "undefined", {
  /**
   * Here we're explicitly telling effector, that this store, which depends on the environment,
   * should be never included in serialization
   * as it's should be always calculated based on actual current env
   *
   * This is not actually necessary, because only diff of state changes is included into serialization
   * and this store is not going to be changed.
   *
   * But it is good to add this setting anyway - to highlight the intention
   */
  serialize: "ignore",
});

const notifyFx = createEffect((message: string) => {
  alert(message);
});

sample({
  clock: [
    saveUserCounterFx.done.map(() => "Counter update is saved successfully"),
    saveUserCounterFx.fail.map(() => "Could not save the counter update :("),
  ],
  // It is totally ok to have some splits in the app's logic based on current environment
  //
  // Here we want to trigger notification alert only at the client
  filter: $isClient,
  target: notifyFx,
});

// ui
export function App() {
  const clickButton = useUnit(buttonClicked);
  const { count, updatePending } = useUnit({
    count: $counter,
    updatePending: $countUpdatePending,
  });

  return (
    <div>
      <h1>Counter App</h1>
      <h2>{updatePending ? "Counter is updating" : `Current count is ${count ?? "unknown"}`}</h2>
      <button onClick={() => clickButton()}>Update counter</button>
    </div>
  );
}
```

This is our app's code which will be used to both server-side render and to handle client's needs.

> TIP:
>
> Notice, that it is important, that all of effector units – stores, events, etc – are "bound" to the react component via `useUnit` hook.
>
> You can use the official eslint plugin of effector to validate that and to follow other best practices – checkout the [eslint.effector.dev](https://eslint.effector.dev/) website.

### Server entrypoint

The way of the `<App />` to the client browsers starts at the server. For this we need to create **separate entrypoint** for the specific server-related code, which will also handle the server-side render part.

In this example we're not going to dive deep into various possible server implementations – we will focus on the request handler itself instead.

> INFO:
>
> Alongside with basic SSR needs, like calculating the final state of the app and serializing it, effector also handles **the isolation of user's data between requests**.
>
> It is very important feature, as Node.js servers usually handle more than one user request at the same moment of time.
>
> Since JS-based platforms, including Node.js, usually have single "main" thread – all logical computations are happening in the same context, with the same memory available.
> So, if state is not properly isolated, one user may receive the data, prepared for another user, which is very undesirable.
>
> effector handles this problem automatically inside the `fork` feature. Read the relevant docs for details.

This is the code for server request handler, which contains all server-specific stuff that need to be done.
Notice, that for meaningful parts of our app we are still using the "shared" `app.tsx` code.

```tsx
// server.tsx
import { renderToString } from "react-dom/server";
import { Provider } from "effector-react";
import { fork, allSettled, serialize } from "effector";

import { appStarted, App, $pathname } from "./app";

export async function handleRequest(req) {
  // 1. create separate instance of effector's state - special `Scope` object
  const scope = fork({
    values: [
      // some parts of app's state can be immediately set to relevant states,
      // before any computations started
      [$pathname, req.pathname],
    ],
  });

  // 2. start app's logic - all computations will be performed according to the model's logic,
  // as well as any required effects
  await allSettled(appStarted, {
    scope,
  });

  // 3. Serialize the calculated state, so it can be passed over the network
  const storesValues = serialize(scope);

  // 4. Render the app - also into some serializable version
  const app = renderToString(
    // by using Provider with the scope we tell the <App />, which state of the stores it should use
    <Provider value={scope}>
      <App />
    </Provider>,
  );

  // 5. prepare serialized HTML response
  //
  // This is serialization (or network) boundary
  // The point, where all state is stringified to be sent over the network
  //
  // effectors state is stored as a `<script>`, which will set the state into global object
  // `react`'s state is stored as a part of the DOM tree.
  return `
    <html>
      <head>
        <script>
          self._SERVER_STATE_ = ${JSON.stringify(storesValues)}
        </script>
        <link rel="stylesheet" href="styles.css" />
        <script defer src="app.js" />
      </head>
      <body>
        <div id="app">
          ${app}
        </div>
      </body>
    </html>
  `;
}
```

☝️ In this code we have created the HTML string, which user will receive over the network and which contains serialized state of the whole app.

### Client entrypoint

When the generated HTML string reaches the client browser, has been processed by the parser and all the required assets have been loaded – our application code starts working on the client.

At this point `<App />` needs to restore its past state (which was computed on the server), so that it doesn't start from scratch, but starts from the same point the work reached on the server.

The process of restoring the server state at the client is usually called **hydration** and this is what client entrypoint should actually do:

```tsx
// client.tsx
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { fork, allSettled } from "effector";
import { Provider } from "effector-react";

import { App, appStarted } from "./app";

/**
 * 1. Find, where the server state is stored and retrieve it
 *
 * See the server handler code to find out, where it was saved in the HTML
 */
const effectorState = globalThis._SERVER_STATE_;
const reactRoot = document.querySelector("#app");

/**
 * 2. Initiate the client scope of effector with server-calculated values
 */
const clientScope = fork({
  values: effectorState,
});

/**
 * 3. "Hydrate" React state in the DOM tree
 */
hydrateRoot(
  reactRoot,
  <Provider value={clientScope}>
    <App />
  </Provider>,
);

/**
 * 4. Call the same starting event at the client
 *
 * This is optional and actually depends on how your app's logic is organized
 */
allSettled(appStarted, { scope: clientScope });
```

☝️ At this point the App is ready to use!

### Recap

1. You don't need to do anything special for **non-isomorphic** SSR, all SPA-like patterns will work.
2. Isomorphic SSR requires a bit of special preparation – you will need SIDs for stores.
3. Common code of the **isomorphic** SSR app handles all meaningful parts – how the UI should look, how state should be calculated, when and which effects should be run.
4. Server-specific code calculates and **serializes** all of the app's state into the HTML string.
5. Client-specific code retrieves this state and uses it to **"hydrate"** the app on the client.


# Testing in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Writing Tests

Testing state management logic is one of Effector’s strengths. Thanks to isolated contexts (fork api) and controlled asynchronous processes allSettled, you can test application behavior without having to emulate the entire lifecycle.

> INFO What does fork do?:
>
> By calling the fork function, we create a scope, which can be considered an independent instance of our Effector application.

### Basics of Testing

Effector provides built-in tools for:

* State isolation: Each testable state can be created in its own context, preventing side effects.
* Asynchronous execution: All effects and events can be executed and verified using allSettled.

#### Store Testing

Testing stores in Effector is straightforward since they are pure functions that manage state.

<Tabs>

  <TabItem label="counter.test.js">

```ts
import { counterIncremented, $counter } from "./counter.js";

test("counter should increase by 1", async () => {
  const scope = fork();

  expect(scope.getState($counter)).toEqual(0);

  await allSettled(counterIncremented, { scope });

  expect(scope.getState($counter)).toEqual(1);
});
```

  </TabItem>

```
<TabItem label="counter.js">
```

```ts
import { createStore, createEvent } from "effector";

const counterIncremented = createEvent();

const $counter = createStore(0);

$counter.on(counterIncremented, (counter) => counter + 1);
```

  </TabItem>
</Tabs>

For isolated state logic testing, fork is used. This allows testing stores and events without affecting global state.

#### Events Testing

To test whether an event was triggered and how many times, you can use the `createWatch` method, which will create a subscription to the passed unit:

```ts
import { createEvent, createWatch, fork } from "effector";
import { userUpdated } from "../";

test("should handle user update with scope", async () => {
  const scope = fork();
  const fn = jest.fn();

  // Create a watcher in the specific scope
  const unwatch = createWatch({
    unit: userUpdated,
    fn,
    scope,
  });

  // Trigger the event in scope
  await allSettled(userUpdated, {
    scope,
  });

  expect(fn).toHaveBeenCalledTimes(1);
});
```

> INFO Why not watch?:
>
> We didn't use the `watch` property of events because during parallel tests we might trigger the same event, which could cause conflicts.

#### Effect Testing

Effects can be tested by verifying their successful execution or error handling. In unit testing, we often want to prevent effects from making real API calls. This can be achieved by passing a configuration object with a handlers property to fork, where you define mock handlers for specific effects.

<Tabs>

  <TabItem label="effect.test.js">

```ts
import { fork, allSettled } from "effector";
import { getUserProjectsFx } from "./effect.js";

test("effect executes correctly", async () => {
  const scope = fork({
    handlers: [
      // List of [effect, mock handler] pairs
      [getUserProjectsFx, () => "user projects data"],
    ],
  });

  const result = await allSettled(getUserProjectsFx, { scope });

  expect(result.status).toBe("done");
  expect(result.value).toBe("user projects data");
});
```

  </TabItem>

```
<TabItem label="effect.js">
```

```ts
import { createEffect } from "effector";

const getUserProjectsFx = async () => {
  const result = await fetch("/users/projects/2");

  return result.json();
};
```

  </TabItem>
</Tabs>

### A Complete Example of Testing

Let’s consider a typical counter with asynchronous validation via our backend. Suppose we have the following requirements:

* When a user clicks a button, we check if the counter is less than 100, then validate the click through our backend API.
* If validation succeeds, increment the counter by 1.
* If validation fails, reset the counter to zero.

```ts
import { createEvent, createStore, createEffect, sample } from "effector";

export const buttonClicked = createEvent();

export const validateClickFx = createEffect(async () => {
  /* external API call */
});

export const $clicksCount = createStore(0);

sample({
  clock: buttonClicked,
  source: $clicksCount,
  filter: (count) => count < 100,
  target: validateClickFx,
});

sample({
  clock: validateClickFx.done,
  source: $clicksCount,
  fn: (count) => count + 1,
  target: $clicksCount,
});

sample({
  clock: validateClickFx.fail,
  fn: () => 0,
  target: $clicksCount,
});
```

#### Test Setup

Here’s our main scenario:

1. The user clicks the button.
2. Validation completes successfully.
3. The counter increments by 1.

Let’s test it:

1. Create a new Scope instance by calling fork.
2. Check that the initial counter value is 0.
3. Simulate the buttonClicked event using allSettled—a promise that resolves once all computations finish.
4. Verify that the final state is as expected.

```ts
import { fork, allSettled } from "effector";

import { $clicksCount, buttonClicked, validateClickFx } from "./model";

test("main case", async () => {
  const scope = fork(); // 1

  expect(scope.getState($clicksCount)).toEqual(0); // 2

  await allSettled(buttonClicked, { scope }); // 3

  expect(scope.getState($clicksCount)).toEqual(1); // 4
});
```

However, this test has an issue—it uses a real backend API. Since this is a unit test, we should mock the backend call.

#### Custom Effect Handlers

To avoid real server requests, we can mock the server response by providing a custom handler via the fork configuration.

```ts
test("main case", async () => {
  const scope = fork({
    handlers: [
      // List of [effect, mock handler] pairs
      [validateClickFx, () => true],
    ],
  });

  expect(scope.getState($clicksCount)).toEqual(0);

  await allSettled(buttonClicked, { scope });

  expect(scope.getState($clicksCount)).toEqual(1);
});
```

#### Custom Store Values

Another scenario:

1. The counter already exceeds 100.
2. The user clicks the button.
3. The effect should not be triggered.

In this case, we need to set an initial state where the counter is greater than 100. This can be done using custom initial values via the fork configuration.

```ts
test("bad case", async () => {
  const MOCK_VALUE = 101;
  const mockFunction = jest.fn();

  const scope = fork({
    values: [
      // List of [store, mockValue] pairs
      [$clicksCount, MOCK_VALUE],
    ],
    handlers: [
      // List of [effect, mock handler] pairs
      [
        validateClickFx,
        () => {
          mockFunction();

          return false;
        },
      ],
    ],
  });

  expect(scope.getState($clicksCount)).toEqual(MOCK_VALUE);

  await allSettled(buttonClicked, { scope });

  expect(scope.getState($clicksCount)).toEqual(MOCK_VALUE);
  expect(mockFunction).toHaveBeenCalledTimes(0);
});
```

This is how you can test every use case you want to validate.


# Troubleshooting in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import SideBySide from "@components/SideBySide/SideBySide.astro";

## Troubleshooting Effector

### Common Errors

#### `store: undefined is used to skip updates. To allow undefined as a value provide explicit { skipVoid: false } option`

This error indicates that you are trying to pass `undefined` as a value to your store, which might not be the intended behavior.

If you really need to store `undefined`, pass an object with `{ skipVoid: false }` as the second argument to `createStore`:

```ts
const $store = createStore(0, {
  skipVoid: false,
});
```

#### `no handler used in [effect name]`

This error occurs when calling an effect without a handler. Make sure you passed a handler to the `createEffect` method during creation, or later when using the `.use(handler)` method.

#### `serialize: One or more stores dont have sids, their values are omitted`

> INFO Before version 23.3.0:
>
> Before version 23.3.0, this error was also known as: `There is a store without sid in this scope, its value is omitted`.

This error commonly occurs in SSR scenarios due to the absence of an `sid` (stable id), which is required for proper hydration of store data from the server to the client.

To fix this, add an `sid` to your store. You can do this in one of the following ways:

1. Use the Babel or SWC plugin to handle it automatically.
2. Manually specify an `sid` by providing an object with a `sid` property as the second argument to `createStore`:

   ```ts
   const $store = createStore(0, {
     sid: "unique id",
   });
   ```

For more details, see Understanding .

#### `scopeBind: scope not found`

This error occurs when a scope is lost at some point in execution, preventing `scopeBind` from associating an event or effect with the correct execution scope.<br/>
It may be caused by:
1. Using a "scope-free" mode where scopes are not present in your application.
2. Calling units outside of a scope.

Possible Solutions:

1. Ensure `scopeBind` is used within effects:

   ```ts
   const event = createEvent();

   // ❌ - Do not call scopeBind inside callbacks
   const effectFx = createEffect(() => {
     setTimeout(() => {
       scopeBind(event)();
     }, 1111);
   });

   // ✅ - Use scopeBind inside the effect
   const effectFx = createEffect(() => {
     const scopeEvent = scopeBind(event);

     setTimeout(() => {
       scopeEvent();
     }, 1111);
   });
   ```

2. Ensure that your units are used inside a scope:
    * When working with a framework, use `useUnit`.
    * If calling an event or effect outside a framework, use `allSettled` and provide the appropriate `scope` as an argument.

If necessary, and you want to suppress the error, you can pass `{ safe: true }` as an option:

```ts
const scopeEvent = scopeBind(event, {
  safe: true,
});
```

#### `call of derived event is not supported, use createEvent instead`

This error occurs when you try to call a derived event as a function. Derived events are created by methods like `.map()`, `.filter()`, `.filterMap()`, as well as the `sample` operator.

To fix this, use an event created via `createEvent`.

#### `unit call from pure function is not supported, use operators like sample instead`

This error occurs when you try to call events or effects from pure functions in Effector:

* **Calling events in event methods**<br/>
  When you try to call one event inside another event's `.map()`, `.filter()`, `.filterMap()`, or `.prepend()` methods.

* **Calling events in store handlers**<br/>
  When attempting to call an event in a .on() handler, inside the .map() method, or in the updateFilter() configuration property of a store.

* **Calling events in `sample` functions**<br/>
  When calling an event in the `fn` or `filter` function of the `sample` operator.

How to fix: Instead of calling events in pure functions, use declarative operators, for example, `sample`.

### Gotchas

#### `sample.fn` does not narrow the type passed from `sample.filter`

A common type-related issue with `sample` occurs when a check is performed in `filter`, but `fn` does not receive the correctly narrowed type. To resolve this, you can add type predicates or use the [`effector-action`](https://github.com/AlexeyDuybo/effector-action) library, which helps simplify conditional types:

<SideBySide>
<Fragment slot="left">

```tsx wrap data-height="full"
import { sample } from "effector";

const messageSent = createEvent<Message>();
const userText = createEvent<string>();

sample({
  clock: messageSent,
  filter: (msg: Message): msg is UserMessage => msg.kind === "user",
  fn: (msg) => msg.text,
  target: userText,
});
```

</Fragment>
<Fragment slot="right">

```tsx wrap data-height="full"
import { createAction } from "effector-action";

const userText = createEvent<string>();

const messageSent = createAction({
  target: userText,
  fn: (userText, msg: Message) => {
    if (msg.kind === "user") {
      userText(msg.txt);
    }
  },
});
```

</Fragment>
</SideBySide>

#### My state did not change

If your state does not update as expected, you are likely working with scopes and, at some point, the active scope was lost. As a result, your unit executed in the global scope instead.<br/>

Typical places where this happens:

* `setTimeout` / `setInterval`
* `addEventListener`
* WebSocket
* direct promise calls inside effects
* third-party libraries with async APIs or callbacks.

**Solution**:
Bind your event or effect to the current scope using :

<SideBySide>
<Fragment slot="left">

```tsx wrap data-border="good" data-height="full" ins={6} "scopedEvent"
// ✅ correct way

const event = createEvent();

const effectFx = createEffect(() => {
  const scopedEvent = scopeBind(event);

  setTimeout(() => {
    scopedEvent();
  }, 1000);
});
```

</Fragment>
<Fragment slot="right">

```tsx wrap data-border="bad" data-height="full"
// ❌ event will execute in the global scope

const event = createEvent();

const effectFx = createEffect(() => {
  setTimeout(() => {
    event();
  }, 1000);
});
```

</Fragment>
</SideBySide>

##### Using units without `useUnit`

If you're using events or effects in a framework without `useUnit`, this may also lead to scope loss.<br/>
To fix this, pass the unit to the `useUnit` hook and use the returned value:

<SideBySide>
<Fragment slot="left">

```tsx wrap data-border="good" data-height="full" ins={4,7} "onEvent"
// ✅ hook used

import { event } from "./model.js";
import { useUnit } from "effector-react";

const Component = () => {
  const onEvent = useUnit(event);

  return <button onClick={() => onEvent()}>click me</button>;
};
```

</Fragment>
<Fragment slot="right">

```tsx wrap data-border="bad" data-height="full"
// ❌ direct unit call

import { event } from "./model.js";

const Component = () => {
  return <button onClick={() => event()}>click me</button>;
};
```

</Fragment>
</SideBySide>

> INFO Best Practice:
>
> Using  for working with units.

### No Answer to Your Question?

If you couldn't find the answer to your question, you can always ask the community:

* [RU Telegram](https://t.me/effector_ru)
* [EN Telegram](https://t.me/effector_en)
* [Discord](https://discord.gg/t3KkcQdt)
* [Reddit](https://www.reddit.com/r/effectorjs/)


# Setting up WebSocket with Effector

## Working with WebSocket in Effector

In this guide, we'll look at how to properly organize work with WebSocket connection using Effector.

> INFO WebSocket and Data Types:
>
> WebSocket API supports data transmission in the form of strings or binary data (`Blob`/`ArrayBuffer`). In this guide, we'll focus on working with strings, as this is the most common case when exchanging data. When working with binary data is needed, you can adapt the examples to the required format.

### Basic Model

Let's create a simple but working WebSocket client model. First, let's define the basic events and states:

```ts
import { createStore, createEvent, createEffect, sample } from "effector";

// Events for working with socket
const disconnected = createEvent();
const messageSent = createEvent<string>();
const rawMessageReceived = createEvent<string>();

const $connection = createStore<WebSocket | null>(null)
  .on(connectWebSocketFx.doneData, (_, ws) => ws)
  .reset(disconnected);
```

Then create an effect for establishing connection:

```ts
const connectWebSocketFx = createEffect((url: string): Promise<WebSocket> => {
  const ws = new WebSocket(url);

  const scopeDisconnected = scopeBind(disconnected);
  const scopeRawMessageReceived = scopeBind(rawMessageReceived);

  return new Promise((res, rej) => {
    ws.onopen = () => {
      res(ws);
    };

    ws.onmessage = (event) => {
      scopeRawMessageReceived(event.data);
    };

    ws.onclose = () => {
      scopeDisconnected();
    };

    ws.onerror = (err) => {
      scopeDisconnected();
      rej(err);
    };
  });
});
```

Note that we used the scopeBind function here to bind units with the current execution scope, as we don't know when `scopeMessageReceived` will be called inside `socket.onmessage`. Otherwise, the event will end up in the global scope.
Read more.

> WARNING Working in scope-less mode:
>
> If you're working in scope-less mode for some reason, you don't need to use `scopeBind`.<br/>
> Keep in mind that working with scope is the recommended way!

### Message Handling

Let's create a store for the last received message:

```ts
const $lastMessage = createStore<string>("");

$lastMessage.on(rawMessageReceived, (_, newMessage) => newMessage);
```

And also implement an effect for sending messages:

```ts
const sendMessageFx = createEffect((params: { socket: WebSocket; message: string }) => {
  params.socket.send(params.message);
});

// Link message sending with current socket
sample({
  clock: messageSent,
  source: $connection,
  filter: Boolean, // Send only if connection exists
  fn: (socket, message) => ({
    socket,
    message,
  }),
  target: sendMessageFx,
});
```

> TIP Connection States:
>
> WebSocket has several connection states (`CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`). In the basic model, we simplify this to a simple Boolean check, but in a real application, more detailed state tracking might be needed.

### Error Handling

When working with WebSocket, it's important to properly handle different types of errors to ensure application reliability.

Let's extend our basic model by adding error handling:

```ts
const TIMEOUT = 5_000;

// Add events for errors
const socketError = createEvent<Error>();

const connectWebSocketFx = createEffect((url: string): Promise<WebSocket> => {
  const ws = new WebSocket(url);

  const scopeDisconnected = scopeBind(disconnected);
  const scopeRawMessageReceived = scopeBind(rawMessageReceived);
  const scopeSocketError = scopeBind(socketError);

  return new Promise((res, rej) => {
    const timeout = setTimeout(() => {
      const error = new Error("Connection timeout");

      scopeSocketError(error);
      reject(error);
      socket.close();
    }, TIMEOUT);

    ws.onopen = () => {
      clearTimeout(timeout);
      res(ws);
    };

    ws.onmessage = (event) => {
      scopeRawMessageReceived(event.data);
    };

    ws.onclose = () => {
      disconnected();
    };

    ws.onerror = (err) => {
      const error = new Error("WebSocket error");
      scopeDisconnected();
      scopeSocketError(error);
      rej(err);
    };
  });
});

// Store for error storage
const $error = createStore("")
  .on(socketError, (_, error) => error.message)
  .reset(connectWebSocketFx.done);
```

> WARNING Error Handling:
>
> Always handle WebSocket connection errors, as they can occur for many reasons: network issues, timeouts, invalid data, etc.

### Typed Messages

When working with WebSocket, ensuring type safety is crucial. This prevents errors during development and enhances the reliability of your application when handling various message types.

For this purpose, we'll use the [Zod](https://zod.dev/) library, though you can use any validation library of your choice.

> INFO TypeScript and Type Checking:
>
> Even if you don't use Zod or another validation library, you can implement basic typing for WebSocket messages using standard TypeScript interfaces. However, remember that these only check types during compilation and won't protect you from unexpected data at runtime.

Let's say we expect two types of messages: `balanceChanged` and `reportGenerated`, containing the following fields:

```ts
export const messagesSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("balanceChanged"),
    balance: z.number(),
  }),
  z.object({
    type: z.literal("reportGenerated"),
    reportId: z.string(),
    reportName: z.string(),
  }),
]);

// Get type from schema
type MessagesSchema = z.infer<typeof messagesSchema>;
```

Now add a message handling effect to ensure that messages match the expected types, along with the logic of receiving them:

```ts
const parsedMessageReceived = createEvent<MessagesSchema>();

const parseFx = createEffect((message: unknown): MessagesSchema => {
  return messagesSchema.parse(JSON.parse(typeof message === "string" ? message : "{}"));
});

// Parse the message when received
sample({
  clock: rawMessageReceived,
  target: parseFx,
});

// If parsing succeeds, forward the message
sample({
  clock: parseFx.doneData,
  target: parsedMessageReceived,
});
```

We should also handle cases where a message doesn't match the schema:

```ts
const validationError = createEvent<Error>();

// If parsing fails, handle the error
sample({
  clock: parseFx.failData,
  target: validationError,
});
```

That's it! Now all incoming messages will be validated against the schema before processing.

> TIP Typing Outgoing Messages:
>
> You can apply the same approach to outgoing messages. This allows you to validate their structure before sending and avoid errors.

If you want more granular control, you can create an event that triggers only for a specific message type:

```ts
type MessageType<T extends MessagesSchema["type"]> = Extract<MessagesSchema, { type: T }>;

export const messageReceivedByType = <T extends MessagesSchema["type"]>(type: T) => {
  return sample({
    clock: parsedMessageReceived,
    filter: (message): message is MessageType<T> => {
      return message.type === type;
    },
  });
};
```

Usage example:

```ts
sample({
  clock: messageReceivedByType("balanceChanged"),
  fn: (message) => {
    // TypeScript knows the structure of message
  },
  target: doWhateverYouWant,
});
```

> INFO Return Values from sample:
>
> If you're not sure what data `sample` returns, we recommend checking the sample.

### Working with `Socket.IO`

[Socket.IO](https://socket.io/) provides a higher-level API for working with WebSocket, adding many useful features "out of the box".

> INFO Socket.IO Advantages:
>
> * Automatic reconnection
> * Support for rooms and namespaces
> * Fallback to HTTP Long-polling if WebSocket is unavailable
> * Built-in support for events and acknowledgments
> * Automatic data serialization/deserialization

```ts
import { io, Socket } from "socket.io-client";
import { createStore, createEvent, createEffect, sample } from "effector";

const API_URL = "wss://your.ws.server";

// Events
const connected = createEvent();
const disconnected = createEvent();
const socketError = createEvent<Error>();

// Types for events
type ChatMessage = {
  room: string;
  message: string;
  author: string;
};

const messageSent = createEvent<ChatMessage>();
const messageReceived = createEvent<ChatMessage>();
const socketConnected = createEvent();
const connectSocket = createEvent();

const connectFx = createEffect((): Promise<Socket> => {
  const socket = io(API_URL, {
    //... your configuration
  });

  // needed for correct work with scopes
  const scopeConnected = scopeBind(connected);
  const scopeDisconnected = scopeBind(disconnected);
  const scopeSocketError = scopeBind(socketError);
  const scopeMessageReceived = scopeBind(messageReceived);

  return new Promise((resolve, reject) => {
    socket.on("connect", () => {
      scopeConnected();
      resolve(socket);
    });

    socket.on("disconnect", () => scopeDisconnected());
    socket.on("connect_error", (error) => scopeSocketError(error));
    socket.on("chat message", (msg: ChatMessage) => scopeMessageReceived(msg));
  });
});

const sendMessageFx = createEffect(
  ({
    socket,
    name,
    payload,
  }: SocketResponse<any> & {
    socket: Socket;
  }) => {
    socket.emit(name, payload);
  },
);

// States
const $socket = createStore<Socket | null>(null)
  .on(connectFx.doneData, (_, socket) => socket)
  .reset(disconnected);

// initialize connection
sample({
  clock: connectSocket,
  target: connectFx,
});

// trigger event after successful connection
sample({
  clock: connectSocketFx.doneData,
  target: socketConnected,
});
```


# Community

### Articles

* [dev.to/effector](https://dev.to/effector) — space on the public platform
* [community.effector.dev](https://community.effector.dev) — personal space
* [reddit.com/r/effectorjs](https://reddit.com/r/effectorjs) — subreddit
* [twitter.com/effectorJS](https://twitter.com/effectorJS) — retweets, releases, announces

### Videos

* [Youtube Channel](https://www.youtube.com/channel/UCm8PRc_yjz3jXHH0JylVw1Q)

### Where can I ask a question?

1. First of all, you can review the [issues](https://github.com/effector/effector/issues) and [discussions](https://github.com/effector/effector/discussions) of the repository
2. We have some chat spaces:
    * Telegram — [t.me/effector\_en](https://t.me/effector_en)
    * Discord — [discord.gg/t3KkcQdt](https://discord.gg/t3KkcQdt)
    * Reddit — [reddit.com/r/effectorjs](https://www.reddit.com/r/effectorjs/)
    * Gitter — [gitter.im/effector/community](https://gitter.im/effector/community)

### Russian-speaking community

* Ask a question — [t.me/effector\_ru](https://t.me/effector_ru)
* News and announces — [t.me/effector\_news](https://t.me/effector_news)
* Videos:
    * Effector Meetup 1 — [youtube.com/watch?v=IacUIo9fXhI](https://www.youtube.com/watch?v=IacUIo9fXhI)
    * Effector Meetup 2 — [youtube.com/watch?v=nLYc4PaTXYk](https://www.youtube.com/watch?v=nLYc4PaTXYk)
    * Implement feature in the project — [youtube.com/watch?v=dtrWzH8O\_4k](https://www.youtube.com/watch?v=dtrWzH8O_4k)
    * How aviasales migrate on effector — [youtube.com/watch?v=HYaSnVEZiFk](https://www.youtube.com/watch?v=HYaSnVEZiFk)
    * Let’s write a game — [youtube.com/watch?v=tjjxIQd0E8c](https://www.youtube.com/watch?v=tjjxIQd0E8c)
    * Effector 22.2.0 Halley — [youtube.com/watch?v=pTq9AbmS0FI](https://www.youtube.com/watch?v=pTq9AbmS0FI)
    * Effector 22.4.0 Encke — [youtube.com/watch?v=9UjgcNn0K\_o](https://www.youtube.com/watch?v=9UjgcNn0K_o)

### Support and sponsor

* OpenCollective — [opencollective.com/effector](https://opencollective.com/effector)
* Patreon — [patreon.com/zero\_bias](https://www.patreon.com/zero_bias)

<br /><br />

### Meet the Effector Team

The Effector Team members work full time on the projects which use effector to solve business tasks.
Each member uses the library every day as a user and tries to improve the user experience as a core team member.

#### Dmitry Boldyrev

<img width="256" src="https://avatars.githubusercontent.com/u/15912112?v=4" />

[Github](https://github.com/zerobias) • [Twitter](https://twitter.com/zero__bias) • [Commits](https://github.com/effector/effector/commits?author=zerobias)

Dmitry made the first version of effector in 2018 to solve reactive event-driver architecture in the messenger.
Now his main focus is to improve the UX in the effector itself and speed up the kernel.

#### Sergey Sova

<img width="256" src="https://avatars.githubusercontent.com/u/5620073?v=4" />

[Github](https://github.com/sergeysova) • [Twitter](https://twitter.com/_sergeysova) • [Commits](https://github.com/effector/effector/commits?author=sergeysova)

Since 2018, Sergey has made some ecosystem packages: [patronum](https://github.com/effector/patronum), [logger](https://github.com/effector/logger), [inspector](https://github.com/effector/inspector).
His main task is to improve the UX through the ecosystem and documentation.

#### Alexandr Horoshih

<img width="256" src="https://avatars.githubusercontent.com/u/32790736?v=4" />

[Github](https://github.com/AlexandrHoroshih) • [Telegram](https://t.me/AlexandrHoroshih) • [Commits](https://github.com/effector/effector/commits?author=AlexandrHoroshih)

Alexander contributed to each package of effector core and org repository.
He reviewed contributions and improved the DX of the core functionality.

#### Kirill Mironov

<img width="256" src="https://i.imgur.com/JFaZkm9.jpg" />

[Github](https://github.com/Drevoed) • [Telegram](https://t.me/vetrokm)

Kirill made the [swc-plugin](https://github.com/effector/swc-plugin), the [bindings for SolidJS](https://github.com/effector/effector/tree/master/packages/effector-solid),
and now improves ecosystem and core functionality.

#### Igor Kamyşev

<img width="256" src="https://avatars.githubusercontent.com/u/26767722?v=4" />

[Github](https://github.com/igorkamyshev) • [Telegram](https://t.me/igorkamyshev) • [Commits](https://github.com/effector/effector/commits?author=igorkamyshev)

Igor is working on [Farfetched](https://ff.effector.dev) is the advanced data fetching tool.
Igor made [eslint-plugin-effector](https://eslint.effector.dev) and reviewed many of the PRs and issues of the effector and ecosystem packages.

#### Yan Lobaty

<img width="256" src="https://i.imgur.com/DomL22D.jpg" />

[Github](https://github.com/YanLobat) • [Telegram](https://t.me/lobatik) • [Commits](https://github.com/effector/effector/commits?author=YanLobat)

Yan made many contributions with fixes and improvements to all effector repositories.
Yan helps us to write explanations and reference documentation. You may hear about the workshop Yan made about effector.

#### Egor Guscha

<img width="256" src="https://avatars.githubusercontent.com/u/22044607?v=4" />

[Github](https://github.com/egorguscha) • [Twitter](https://twitter.com/simpleigich)

Since 2019, working in the effector core team on documentation, learning materials, and ecosystem improving.

<br /><br />

### Acknowledgments

#### Ilya Lesik

<img width="256" src="https://avatars.githubusercontent.com/u/1270648?v=4" />

[Github](https://github.com/ilyalesik) • [Twitter](https://twitter.com/ilialesik)

Ilya made the list of awesome packages of effector ecosystem.

#### Evgeniy Fedotov

<img width="256" src="https://avatars.githubusercontent.com/u/18236014?v=4" />

[Github](https://github.com/EvgenyiFedotov) • [Telegram](https://t.me/evgeniyfedotov)

Evgeniy made [effector-reflect](https://github.com/effector/reflect) and helps us write documentation.

#### Valeriy Kobzar

<img width="256" src="https://avatars.githubusercontent.com/u/1615093?v=4" />

[Github](https://github.com/kobzarvs) • [Telegram](https://t.me/ValeryKobzar) • [Commits](https://github.com/effector/effector/commits?author=kobzarvs)

Valeriy developed server-side code for [REPL](https://share.effector.dev) and wrote many documentation pages.

#### Anton Kosykh

<img width="256" src="https://i.imgur.com/GD0zWpH.jpg" />

[Github](https://github.com/Kelin2025) • [Telegram](https://t.me/kelin2025)

One of the earliest users of effector, working on [Atomic Router](https://atomic-router.github.io/) and ecosystem packages like [effector-history](https://github.com/kelin2025/effector-history),
[effector-pagination](https://github.com/kelin2025/effector-pagination) and [effector-factorio](https://github.com/Kelin2025/effector-factorio)

#### Andrei Tshurotshkin

[Github](https://github.com/goodmind)

Andrei was at the origin of the effector. He wrote all the first documentation, implemented the first REPL version, and featured many core methods.

#### Roman Titov

[Github](https://github.com/popuguytheparrot) • [Telegram](https://t.me/popuguy)

Roman promotes effector among the front-end community and works on documentation.

*This list is not exhaustive.*

<br /><br />

### Contributors

Please, open [README.md](https://github.com/effector/effector#contributors) to see the full list of our contributors.
We have the [github action](https://github.com/effector/effector/blob/master/.github/workflows/contributors.yml) to regenerate this list.
Also, you can open the [Insights page](https://github.com/effector/effector/graphs/contributors) on the main repository.

We’d like to give thanks to all contributors for effector and the ecosystem.

Thank you for your support and love over all this time \:heart:


# Effector Core concepts

## Core concepts

Effector is a modern state management library that enables developers to build scalable and predictable reactive applications.

At its core, Effector is built around the concept of **units**—independent building blocks of an application. Each unit—whether a store, an event, or an effect — has a specific role.
By combining these units, developers can construct complex yet intuitive data flows within their applications.

Effector development is based on two key principles:

* 📝 **Declarativity**: You define *what* should happen, not *how* it should work.
* 🚀 **Reactivity**: Changes propagate automatically throughout the application.

Effector employs an intelligent dependency-tracking system that ensures only the necessary parts of the application update when data changes. This provides several benefits:

* No need for manual subscription management
* High performance even at scale
* A predictable and clear data flow

### Units

A unit is a fundamental concept in Effector. Store, Event, and Effect are all units—core building blocks for constructing an application's business logic. Each unit is an independent entity that can be:

* Connected with other units
* Subscribed to changes of other units
* Used to create new units

```ts
import { createStore, createEvent, createEffect, is } from "effector";

const $counter = createStore(0);
const event = createEvent();
const fx = createEffect(() => {});

// Check if value is a unit
is.unit($counter); // true
is.unit(event); // true
is.unit(fx); // true
is.unit({}); // false
```

#### Event

An event (Event) in Effector serves as an entry point into the reactive data flow. Simply put, it is a way to signal that "something has happened" within the application.

##### Event features

* Simplicity: Events are minimalistic and can be easily created using createEvent.
* Composition: Events can be combined, filtered, transformed, and forwarded to other handlers or stores.

```js
import { createEvent } from "effector";

// create event
const formSubmitted = createEvent();

// subscribe to the event
formSubmitted.watch(() => console.log("Form submitted!"));

// Trigger the event
formSubmitted();

// Output:
// "Form submitted!"
```

#### Store

A store (Store) holds the application's data. It acts as a reactive value, providing strict control over state changes and data flow.

##### Store features

* You can have as many stores as needed.
* Stores are reactive — changes automatically propagate to all subscribed components.
* Effector optimizes re-renders, minimizing unnecessary updates for subscribed components.
* Store data is immutable.
* There is no `setState`, state changes occur through events.

```js
import { createStore, createEvent } from "effector";

// create event
const superAdded = createEvent();

// create store
const $supers = createStore([
  {
    name: "Spider-man",
    role: "hero",
  },
  {
    name: "Green goblin",
    role: "villain",
  },
]);

// update store on event triggered
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// trigger event
superAdded({
  name: "Rhino",
  role: "villain",
});
```

#### Effect

An effect (Effect) is designed to handle side effects — interactions with the external world, such as making HTTP requests or working with timers.

##### Effect features

* Effects have built-in states like `pending` and emit events such as `done` and `fail`, making it easier to track operation statuses.
* Logic related to external interactions is isolated, improving testability and making the code more predictable.
* Can be either asynchronous or synchronous.

```js
import { createEffect } from "effector";

// Create an effect
const fetchUserFx = createEffect(async (userId) => {
  const response = await fetch(`/api/user/${userId}`);
  return response.json();
});

// Subscribe to effect results
fetchUserFx.done.watch(({ result }) => console.log("User data:", result));
// If effect throw error we will catch it via fail event
fetchUserFx.fail.watch(({ error }) => console.log("Error occurred! ", error));

// Trigger effect
fetchUserFx(1);
```

### Reactivity

As mentioned at the beginning, Effector is built on the principles of reactivity, where changes **automatically** propagate throughout the application. Instead of an imperative approach, where you explicitly define how and when to update data, Effector allows you to declaratively describe relationships between different parts of your application.

#### How Reactivity Works in Effector

Let's revisit the example from the **Stores** section, where we have a store containing an array of superhumans. Now, suppose we need to separate heroes and villains into distinct lists. This can be easily achieved using derived stores:

```ts
import { createStore, createEvent } from "effector";

// Create an event
const superAdded = createEvent();

// Create a store
const $supers = createStore([
  {
    name: "Spider-Man",
    role: "hero",
  },
  {
    name: "Green Goblin",
    role: "villain",
  },
]);

// Create derived stores based on $supers
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

// Update the store when the event is triggered
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// Add a new character
superAdded({
  name: "Rhino",
  role: "villain",
});
```

In this example, we created derived stores `$superHeroes` and `$superVillains`, which depend on the original `$supers` store. Whenever the original store updates, the derived stores automatically update as well — this is **reactivity** in action! 🚀

### How it all works together?

And now let's see how all this works together. All our concepts come together in a powerful, reactive data flow:

1. **Events** initiate changes (e.g., button clicks).
2. These changes update **Stores**, which manage application state.
3. **Effects** handle side effects like interacting with external APIs.

For example, we will take the same code with superheroes as before, but we will modify it slightly by adding an effect to load initial data, just like in real applications:

```ts
import { createStore, createEvent, createEffect } from "effector";

// Define our stores
const $supers = createStore([]);
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

// Create events
const superAdded = createEvent();

// Create effects for fetching data
const getSupersFx = createEffect(async () => {
  const res = await fetch("/server/api/supers");
  if (!res.ok) {
    throw new Error("something went wrong");
  }
  const data = await res.json();
  return data;
});

// Create effects for saving new data
const saveNewSuperFx = createEffect(async (newSuper) => {
  // Simulate saving a new super
  await new Promise((res) => setTimeout(res, 1500));
  return newSuper;
});

// When the data fetch is successful, set the data
$supers.on(getSupersFx.done, ({ result }) => result);
// Add a new super
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// Trigger the data fetch
getSupersFx();
```

> INFO Why use $ and Fx?:
>
> Effector naming conventions use `$` for stores (e.g., `$counter`) and `Fx` for effects (e.g., `fetchUserDataFx`). Learn more about naming conventions here.

#### Connecting Units into a Single Flow

All that remains is to somehow connect the `superAdded` event and its saving via `saveNewSuperFx`, and then request fresh data from the server after a successful save. <br/>
Here, the sample method comes to our aid. If units are the building blocks, then `sample` is the glue that binds your units together.

> INFO About sample:
>
> `sample` is the primary method for working with units, allowing you to declaratively trigger a chain of actions.

```ts ins={27-37}
import { createStore, createEvent, createEffect, sample } from "effector";

const $supers = createStore([]);
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

const superAdded = createEvent();

const getSupersFx = createEffect(async () => {
  const res = await fetch("/server/api/supers");
  if (!res.ok) {
    throw new Error("something went wrong");
  }
  const data = await res.json();
  return data;
});

const saveNewSuperFx = createEffect(async (newSuper) => {
  // Simulate saving a new super
  await new Promise((res) => setTimeout(res, 1500));
  return newSuper;
});

$supers.on(getSupersFx.done, ({ result }) => result);
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// when clock triggered called target and pass data
sample({
  clock: superAdded,
  target: saveNewSuperFx,
});

// when saveNewSuperFx successfully done called getSupersFx
sample({
  clock: saveNewSuperFx.done,
  target: getSupersFx,
});

// Trigger the data fetch
getSupersFx();
```

Just like that, we easily and simply wrote part of the business logic for our application, leaving the part that displays this data to the UI framework.


# Ecosystem

Packages and templates of effector ecosystem

More content in [awesome-effector repository](https://github.com/effector/awesome)

> INFO Legend:
>
> Stage 4. 💚 — Stable, supported, awesome<br/>
> Stage 3. 🛠️ — Stable, but still in development, v0.x<br/>
> Stage 2. ☢️️ — Unstable/Incomplete, works in most cases, may be redesigned<br/>
> Stage 1. 🧨 — Breaks in most cases, it must be redesigned, do not use in production<br/>
> Stage 0. ⛔️ — Abandoned/Needs maintainer, may be broken; it must be migrated from<br/>

### Packages

* [patronum](https://github.com/effector/patronum) 💚 — Effector utility library delivering modularity and convenience.
* [@effector/reflect](https://github.com/effector/reflect) 💚 — Classic HOCs redesigned to connect React components to Effector units in an efficient, composable and (sort of) "fine-grained reactive" way.
* [@withease/redux](https://withease.effector.dev/redux/) 💚 — Smooth migration from redux to effector.
* [@withease/i18next](https://withease.effector.dev/i18next) 💚 — A powerful internationalization framework bindings.
* [@withease/web-api](https://withease.effector.dev/web-api/) 💚 — Web API bindings — network status, tab visibility, and more.
* [@withease/factories](https://withease.effector.dev/factories/) 💚 — Set of helpers to create factories in your application.
* [effector-storage](https://github.com/yumauri/effector-storage) 💚 - Small module to sync stores with all kinds of storages (local/session storage, IndexedDB, cookies, server side storage, etc).
* [farfetched](https://ff.effector.dev) 🛠 — The advanced data fetching tool for web applications.
* [@effector/next](https://github.com/effector/next) 🛠 - Official bindings for Next.js
* [effector-localstorage](https://github.com/lessmess-dev/effector-localstorage) 🛠 — Module for effector that sync stores with localStorage.
* [effector-hotkey](https://github.com/kelin2025/effector-hotkey) 🛠 — Hotkeys made easy.
* [atomic-router](https://github.com/atomic-router/atomic-router) 🛠️ — View-library agnostic router.
* [effector-undo](https://github.com/tanyaisinmybed/effector-undo) ☢️ — Simple undo/redo functionality.
* [forest](https://github.com/effector/effector/tree/master/packages/forest) ☢️ — Reactive UI engine for web.

### DX

* [eslint-plugin-effector](https://eslint.effector.dev) 💚 — Enforcing best practices.
* [@effector/swc-plugin](https://github.com/effector/swc-plugin) 💚 — An official SWC plugin for Effector.
* [effector-logger](https://github.com/effector/logger) 🛠 — Simple logger for stores, events, effects and domains.
* [@effector/redux-devtools-adapter](https://github.com/effector/redux-devtools-adapter) 🛠 - Simple adapter, which logs updates to Redux DevTools.

### Form management

* [effector-final-form](https://github.com/binjospookie/effector-final-form) ☢️ – Effector bindings for Final Form.
* [filledout](https://filledout.github.io) ☢️ — Form manager with easy-to-use yup validation
* [effector-forms](https://github.com/aanation/effector-forms) ☢️ — Form manager for effector.
* [effector-react-form](https://github.com/GTOsss/effector-react-form) ☢️ — Connect your forms with state manager.
* [efform](https://github.com/tehSLy/efform) ⛔ — Form manager based on a state manager, designed for high-quality DX.
* [effector-reform](https://github.com/movpushmov/effector-reform) ☢️ — Form manager implementing the concept of composite forms.

### Templates

* [ViteJS+React Template](https://github.com/effector/vite-react-template) 💚 — Try effector with React and TypeScript in seconds!
* [ViteJS+TypeScript Template](https://github.com/mmnkuh/effector-vite-template) 🛠 — Another ViteJS + TypeScript template.


# Examples

It's difficult to overestimate the learning curve for any technology.
That's why effector provides you a few simple examples that may cover your basic needs and also give more confidence for the users for upcoming projects using effector.

### Simple examples

#### UI loading

To display loader during effects resolving

#### Effects sequence

We'll need it when second request to the server requires resolved data from the first one

<!-- TODO write example with abort with farfetched

### [Abort effect](https://share.effector.dev/W4I0ghLt)

When we need to cancel our effect since it's pointless at the time

-->

#### Modal dialog

To connect react modal with state

#### Range input

To connect a custom range input component with state

### More examples

* [Snake game (interactive A\* algorithm visualisation)](https://dmitryshelomanov.github.io/snake/) ([source code](https://github.com/dmitryshelomanov/snake))
* [Ballcraft game](https://ballcraft.now.sh/) ([source code](https://github.com/kobzarvs/effector-craftball))
* [Client-server interaction with effects](https://github.com/effector/effector/tree/master/examples/worker-rpc) GitHub
* Tree folder structure
* Reddit reader With effects for data fetching and effector-react hooks <!-- Reddit api is disabled, example not working! -->
  <!-- - [Lists rendering](https://share.effector.dev/OlakwECa) With `useList` hook Example with forbidden event calls in pure functions -->
  <!-- - [Dynamic typing status](https://share.effector.dev/tAnzG5oJ) example with watch calls in effect for aborting -->
* Conditional filtering
  <!-- - [Request cancellation](https://share.effector.dev/W4I0ghLt) just rewrite it in farfetched -->
  <!-- - [Dynamic form fields, saving and loading from localStorage with effects](https://share.effector.dev/Qxt0zAdd) rewrite it with models -->
  <!-- - [Loading initial state from localStorage with domains](https://share.effector.dev/YbiBnyAD) rewrite it with effector-storage -->
* Dynamic page selection with useStoreMap
* Update on scroll
* Night theme switcher component

<!-- - [Computed bounce menu animation](https://share.effector.dev/ZXEtGBBq) on with derived store -->

* Values history
* Read default state from backend
  <!-- - [Requests cache](https://share.effector.dev/jvE7r0By) rewrite with farfetched -->
  <!-- - [Watch last two store state values](https://share.effector.dev/LRVsYhIc) -->
  <!-- - [Basic todolist example](https://codesandbox.io/s/vmx6wxww43) Codesandbox update example -->
* [Recent users projects](https://github.com/effector/effector/network/dependents)
* [BallSort game](https://ballsort.sova.dev/) with [source code](https://github.com/sergeysova/ballsort)
* [Sudoku game](https://sudoku-effector.pages.dev/) with [source code](https://github.com/Shiyan7/sudoku-effector)

<!-- - [RealWorld app](https://github.com/mg901/react-effector-realworld-example-app) ([RealWorld apps](https://github.com/gothinkster/realworld)) -->


# Getting Started with Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Quick start with Effector

Effector is a powerful state manager that offers a fundamentally new approach to data management in applications. Unlike traditional solutions where state is changed directly through actions, Effector uses a reactive and declarative approach.

### How to Work with Documentation

Before diving in, it's worth mentioning that we support `llms.txt` for using AI assistants like [ChatGPT](https://chatgpt.com/), [Claude](https://claude.ai/), [Gemini](https://gemini.google.com) and others. You simply need to share the link in the chat or upload the documentation to an IDE like [Cursor](https://www.cursor.com/en).

Currently, the following documents are available:

* https://effector.dev/docs/llms.txt
* https://effector.dev/docs/llms-full.txt

Additionally, we offer a [ChatGPT effector assistant](https://chatgpt.com/g/g-thabaCJlt-effector-assistant), a repository on [DeepWiki](https://deepwiki.com/effector/effector), and uploaded documentation on [Context7](https://context7.com/effector/effector). These resources are designed to help you understand and work more effectively with Effector, with AI-powered support guiding you through the process.

### Effector Features

* Effector is reactive 🚀: Effector automatically tracks dependencies and updates all related parts of the application, eliminating the need to manually manage updates.
* Declarative code 📝: You describe the relationships between data and their transformations, while Effector takes care of how and when to perform these transformations.
* Predictable testing ✅: Isolated contexts make testing business logic simple and reliable.
* Flexible architecture 🏗️: Effector works equally well for both small applications and large enterprise systems.
* Versatility 🔄: While Effector integrates perfectly with popular frameworks, it can be used in any JavaScript environment.

More about effector core concepts you can read here

### Install effector

To get started, install Effector using your favorite package manager:

<Tabs>
  <TabItem label="npm">

```bash
npm install effector
```

  </TabItem>
  <TabItem label="yarn">

```bash
yarn install effector
```

  </TabItem>
  <TabItem label="pnpm">

```bash
pnpm install effector
```

  </TabItem>
</Tabs>

#### Creating Your First Store

Now, let’s create a store, which represents a state of your application:

```ts
// counter.js
import { createStore } from "effector";

const $counter = createStore(0);
```

#### Adding events

Next, let’s create some events, that will update our store when triggered:

```ts ins={3-4}
// counter.js
import { createStore, createEvent } from "effector";

const incremented = createEvent();
const decremented = createEvent();

const $counter = createStore(0);
```

#### Connecting Events to Store

And link the events to the store:

```ts ins={9-10}
// counter.js
import { createEvent, createStore } from "effector";

const $counter = createStore(0);

const incremented = createEvent();
const decremented = createEvent();

$counter.on(incremented, (counter) => counter + 1);
$counter.on(decremented, (counter) => counter - 1);

// and call it somewhere in your app
incremented();
// counter will increase by 1
decremented();
// counter will decrease by -1
decremented();
// counter will decrease by -1
```

### Framework Integration

#### Installation

If you want to use Effector with a specific framework, you’ll need to install an additional package:

<Tabs syncId="framework-choice">
  <TabItem label="React">

```bash
npm install effector effector-react
```

  </TabItem>
  <TabItem label="Vue">

```bash
npm install effector effector-vue
```

  </TabItem>
  <TabItem label="Solid">

```bash
npm install effector effector-solid
```

  </TabItem>
</Tabs>

#### Usage examples

And use it like this:

<Tabs syncId="framework-choice">
  <TabItem label="React">

```jsx
import { useUnit } from "effector-react";
import { createEvent, createStore } from "effector";
import { $counter, incremented, decremented } from "./counter.js";

export const Counter = () => {
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // or
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // or
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);

  return (
    <div>
      <h1>Count: {counter}</h1>
      <button onClick={onIncremented}>Increment</button>
      <button onClick={onDecremented}>Decrement</button>
    </div>
  );
};
```

  </TabItem>
  <TabItem label="Vue">

```html
<script setup>
  import { useUnit } from "@effector-vue/composition";
  import { $counter, incremented, decremented } from "./counter.js";
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // or
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // or
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);
</script>

<template>
  <div>
    <h1>Count: {{ counter }}</h1>
    <button @click="onIncremented">Increment</button>
    <button @click="onDecremented">Decrement</button>
  </div>
</template>
```

  </TabItem>
  <TabItem label="Solid">

```jsx
import { createEvent, createStore } from "effector";
import { useUnit } from "effector-solid";
import { $counter, incremented, decremented } from "./counter.js";

const Counter = () => {
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // or
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // or
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);

  return (
    <div>
      <h1>Count: {counter()}</h1>
      <button onClick={onIncremented}>Increment</button>
      <button onClick={onDecremented}>Decrement</button>
    </div>
  );
};

export default Counter;
```

  </TabItem>
</Tabs>

> INFO What about Svelte ?:
>
> No additional packages are required to use Effector with Svelte. It works seamlessly with the base Effector package.


# Installation

import Tabs from "../../../../components/Tabs/Tabs.astro";
import TabItem from "../../../../components/Tabs/TabItem.astro";

## Installation

### Via package manager

Effector doesn't depend on NPM, you can use any package manager you want.<br/>

<Tabs>
  <TabItem label="npm">

```bash
npm install effector
```

  </TabItem>
  <TabItem label="yarn">

```bash
yarn install effector
```

  </TabItem>
  <TabItem label="pnpm">

```bash
pnpm install effector
```

  </TabItem>
</Tabs>

### Supported Frameworks

Additionally, to ensure proper integration with popular frameworks, you can also install an additional package.

<Tabs>
  <TabItem label="React">

```bash
npm install effector effector-react
```

  </TabItem>
  <TabItem label="Vue">

```bash
npm install effector effector-vue
```

  </TabItem>
  <TabItem label="Solid">

```bash
npm install effector effector-solid
```

  </TabItem>
</Tabs>

> INFO About Svelte:
>
> Svelte works with effector out of the box, no additional packages needed.

Also, you can start from [Stackblitz template](https://stackblitz.com/fork/github/effector/vite-react-template) with [TypeScript](https://typescriptlang.org/), [ViteJS](https://vitejs.dev/), and [React](https://reactjs.org/) already set up.

### Online playground

Examples in this documentation are running in [our online playground](https://share.effector.dev), which allows someone to test and share ideas quickly, without install. Code sharing, TypeScript and React supported out of the box. [Project repository](https://github.com/effector/repl).

### Deno

> INFO since:
>
> [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

Just import `effector.mjs` from any CDN.

```typescript
import { createStore } from "https://cdn.jsdelivr.net/npm/effector/effector.mjs";
```

Sample CDNS:

* https://www.jsdelivr.com/package/npm/effector
* https://cdn.jsdelivr.net/npm/effector/effector.cjs.js
* https://cdn.jsdelivr.net/npm/effector/effector.mjs
* https://cdn.jsdelivr.net/npm/effector-react/effector-react.cjs.js
* https://cdn.jsdelivr.net/npm/effector-vue/effector-vue.cjs.js

### DevTools

Use [effector-logger](https://github.com/effector/logger) for printing updates to console, displaying current store values with browser ui and connecting application to familiar redux devtools.

For server-side rendering and writing test you may need plugins for your compiler toolkit:

#### Babel

To use Babel plugin, you don't need to install additional packages, plugin bundled to `effector` package.

Read this for more details.

#### SWC

```bash
npm install -ED @effector/swc-plugin @swc/core
```

Documentation.

### Compatibility

The library provides separate modules with compatibility up to IE11 and Chrome 47 (browser for Smart TV devices): `effector/compat`, `effector-react/compat`, and `effector-vue/compat`

Usage with manual import replacement:

```diff
- import {createStore} from 'effector'
+ import {createStore} from 'effector/compat'
```

Usage with [babel-plugin-module-resolver](https://github.com/tleunen/babel-plugin-module-resolver) in your `.babelrc`:

```json
{
  "plugins": [
    [
      "babel-plugin-module-resolver",
      {
        "alias": {
          "^effector$": "effector/compat",
          "^effector-react$": "effector-react/compat"
        }
      }
    ]
  ]
}
```

#### Polyfills

Effector uses some APIs and objects that older browsers may not have, so you may need to install them yourself if you intend to support such browsers.

You may need to install the following polyfills:

* `Promise`
* `Object.assign`
* `Array.prototype.flat`


# Motivation

## Motivation

Modern web application development is becoming more complex every day. Multiple frameworks, complex business logic, different approaches to state management — all of this creates additional challenges for developers. Effector offers an elegant solution to these problems.

### Why Effector?

Effector was designed to describe application business logic in a simple and clear language using three basic primitives:

* Event — for describing events
* Store — for state management
* Effect — for handling side effects

At the same time, user interface logic is handled by the framework.
Let each framework efficiently address its specific task.

### Separation of Concerns

In modern development, business logic and user interface are clearly separated:

**Business Logic** — is the essence of your application, the reason it exists. It can be complex and based on reactive principles, but it defines how your product works.

**UI Logic** — is how users interact with business logic through the interface. These are buttons, forms, and other control elements.

### This is Why Effector!

In real projects, tasks from product managers rarely contain interface implementation details. Instead, they describe user interaction scenarios with the system. Effector allows you to describe these scenarios in the same language that the development team uses:

* Users interact with the application → Event
* See changes on the page → Store
* Application interacts with the outside world → Effect

### Framework agnostic

Despite React, Angular, and Vue having different approaches to development, application business logic remains unchanged. Effector allows you to describe it uniformly, regardless of the chosen framework.
This means you can:

1. Focus on business logic, not framework specifics
2. Easily reuse code between different parts of the application
3. Create more maintainable and scalable solutions


# Countdown timer on setTimeout

Sometimes we need a simple countdown. The next example allows us to handle each tick and abort the timer.

Link to a playground

Task:

1. Execute tick every `timeout` milliseconds
2. Each tick should send left seconds to listeners
3. Countdown can be stopped (`abort` argument)
4. Countdown can't be started if already started

```js
function createCountdown(name, { start, abort = createEvent(`${name}Reset`), timeout = 1000 }) {
  // tick every 1 second
  const $working = createStore(true, { name: `${name}Working` });
  const tick = createEvent(`${name}Tick`);
  const timerFx = createEffect(`${name}Timer`).use(() => wait(timeout));

  $working.on(abort, () => false).on(start, () => true);

  sample({
    source: start,
    filter: timerFx.pending.map((is) => !is),
    target: tick,
  });

  sample({
    clock: tick,
    target: timerFx,
  });

  const willTick = sample({
    source: timerFx.done.map(({ params }) => params - 1),
    filter: (seconds) => seconds >= 0,
  });

  sample({
    source: willTick,
    filter: $working,
    target: tick,
  });

  return { tick };
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
```

Usage:

```js
const startCountdown = createEvent();
const abortCountdown = createEvent();

const countdown = createCountdown("simple", {
  start: startCountdown,
  abort: abortCountdown,
});

// handle each tick
countdown.tick.watch((remainSeconds) => {
  console.info("Tick. Remain seconds: ", remainSeconds);
});

// let's start
startCountdown(15); // 15 ticks to count down, 1 tick per second

// abort after 5 second
setTimeout(abortCountdown, 5000);
```


# Integrate Next.js with effector

There is the official Next.js bindings package - [`@effector/next`](https://github.com/effector/next). Follow its documentation to find out, how to integrate Next.js with effector.


# Integrate with Next.js router

> TIP:
>
> There is the official Next.js bindings package - [`@effector/next`](https://github.com/effector/next). Follow its documentation to find out, how to integrate Next.js with effector.

This is a simplified example of integration with the Next.js router.
We create a similar model for storing the router instance:

```js
import { attach, createEvent, createStore, sample } from 'effector'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

const routerAttached = createEvent<AppRouterInstance>()
const navigationTriggered = createEvent<string>()

const $router = createStore<AppRouterInstance | null>(null).on(
  routerAttached,
  (_, router) => router,
)

const navigateFx = attach({
  source: $router,
  effect: (router, path) => {
    if (!router) return
    return router.push(path)
  },
})

sample({
  clock: navigationTriggered,
  target: navigateFx,
})

export { navigationTriggered, routerAttached }

```

We make provider:

```js
import { useUnit } from 'effector-react';
import { useRouter } from 'next/navigation'

export function EffectorRouterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const attachRouter = useUnit(routerAttached)

  useEffect(() => {
    attachRouter(router)
  }, [router, attachRouter])

  return <>{children}</>
}
```

We use provider:

```js
import { EffectorRouterProvider } from '@/providers/effector-router-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <EffectorRouterProvider>
          {children}
        </EffectorRouterProvider>
      </body>
    </html>
  );
}
```

And we use it in our models:

```js
import { sample } from 'effector';

    ...

sample({
    clock: getUserFx.done,
    fn: () => '/home',
    target: navigationTriggered,
});

```

or in components:

```js
'use client';

import { useUnit } from 'effector-react';
import { navigationTriggered } from '@/your-path-name';

    ...

export function goToSomeRouteNameButton() {
  const goToSomeRouteName = useUnit(navigationTriggered);

  return (
    <button onClick={() => goToSomeRouteName('/some-route-name')}>
      do it!
    </button>
  );
}


```


# Use scopeBind in Next.js

> TIP:
>
> There is the official Next.js bindings package - [`@effector/next`](https://github.com/effector/next). Follow its documentation to find out, how to integrate Next.js with effector.

There are situations when we need to get values from external libraries through callbacks.
If we directly bind events, then we will face the loss of the scope.
To solve this problem, we can use scopeBind.

We have some external library that returns us the status of our connection.
Let's call it an instance in the store and call it *$service*, and we will take the status through an event.

```js
import { createEvent, createStore } from "effector";

const $connectStatus = createStore("close");
const connectEv = createEvent();

sample({
  clock: connectEv,
  targt: $connectStatus,
});
```

Next, we need to create an effect, within which we will connect our event and *service*.

```js
import { attach, scopeBind } from "effector";

const connectFx = attach({
  source: {
    service: $service,
  },
  async effect({ service }) {
    /**
     * `scopeBind` will automatically derive current scope, if called inside of an Effect
     */
    const serviceStarted = scopeBind(connectEv);

    return await service.on("service_start", serviceStarted);
  },
});
```

After calling our effect, the event will be tied to the scope and will be able to take the current value from our *service*.


# AsyncStorage Counter on React Native

The following example is a React Native counter that stores data to AsyncStorage. It uses store, events and effects.

```js
import * as React from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-community/async-storage";

import { createStore, createEvent, createEffect, sample } from "effector";
import { useUnit } from "effector-react";

const init = createEvent();
const increment = createEvent();
const decrement = createEvent();
const reset = createEvent();

const fetchCountFromAsyncStorageFx = createEffect(async () => {
  const value = parseInt(await AsyncStorage.getItem("count"));
  return !isNaN(value) ? value : 0;
});

const updateCountInAsyncStorageFx = createEffect(async (count) => {
  try {
    await AsyncStorage.setItem("count", `${count}`, (err) => {
      if (err) console.error(err);
    });
  } catch (err) {
    console.error(err);
  }
});

const $counter = createStore(0);

sample({
  clock: fetchCountFromAsyncStorageFx.doneData,
  target: init,
});

$counter
  .on(init, (state, value) => value)
  .on(increment, (state) => state + 1)
  .on(decrement, (state) => state - 1)
  .reset(reset);

sample({
  clock: $counter,
  target: updateCountInAsyncStorageFx,
});

fetchCountFromAsyncStorageFx();

export default () => {
  const count = useUnit(counter);

  return (
    <View style={styles.container}>
      <Text style={styles.paragraph}>{count}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity key="dec" onPress={decrement} style={styles.button}>
          <Text style={styles.label}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity key="reset" onPress={reset} style={styles.button}>
          <Text style={styles.label}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity key="inc" onPress={increment} style={styles.button}>
          <Text style={styles.label}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 20,
    backgroundColor: "#ecf0f1",
    padding: 8,
  },
  paragraph: {
    margin: 24,
    fontSize: 60,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttons: {
    flexDirection: "row",
    alignSelf: "center",
    justifyContent: "space-between",
  },
  button: {
    marginHorizontal: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#4287f5",
    borderRadius: 5,
  },
  label: {
    fontSize: 30,
    color: "#ffffff",
    fontWeight: "bold",
  },
});
```


# React Counter

```js
import React from "react";
import ReactDOM from "react-dom";
import { createEvent, createStore, combine } from "effector";
import { useUnit } from "effector-react";

const plus = createEvent();

const $counter = createStore(1);

const $counterText = $counter.map((count) => `current value = ${count}`);
const $counterCombined = combine({ counter: $counter, text: $counterText });

$counter.on(plus, (count) => count + 1);

function App() {
  const counter = useUnit($counter);
  const counterText = useUnit($counterText);
  const counterCombined = useUnit($counterCombined);

  return (
    <div>
      <button onClick={plus}>Plus</button>
      <div>counter: {counter}</div>
      <div>counterText: ${counterText}</div>
      <div>
        counterCombined: {counterCombined.counter}, {counterCombined.text}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it


# Dynamic form schema

Try it

```js
import { createEvent, createEffect, createStore, createApi, sample } from "effector";
import { useList, useUnit } from "effector-react";

const submitForm = createEvent();
const addMessage = createEvent();
const changeFieldType = createEvent();

const showTooltipFx = createEffect(() => new Promise((rs) => setTimeout(rs, 1500)));

const saveFormFx = createEffect((data) => {
  localStorage.setItem("form_state/2", JSON.stringify(data, null, 2));
});
const loadFormFx = createEffect(() => {
  return JSON.parse(localStorage.getItem("form_state/2"));
});

const $fieldType = createStore("text");
const $message = createStore("done");
const $mainForm = createStore({});
const $types = createStore({
  username: "text",
  email: "text",
  password: "text",
});

const $fields = $types.map((state) => Object.keys(state));

$message.on(addMessage, (_, message) => message);

$mainForm.on(loadFormFx.doneData, (form, result) => {
  let changed = false;

  form = { ...form };
  for (const key in result) {
    const { value } = result[key];
    if (value == null) continue;
    if (form[key] === value) continue;
    changed = true;
    form[key] = value;
  }
  if (!changed) return;

  return form;
});

const mainFormApi = createApi($mainForm, {
  upsertField(form, name) {
    if (name in form) return;

    return { ...form, [name]: "" };
  },
  changeField(form, [name, value]) {
    if (form[name] === value) return;

    return { ...form, [name]: value };
  },
  addField(form, [name, value = ""]) {
    if (form[name] === value) return;

    return { ...form, [name]: value };
  },
  deleteField(form, name) {
    if (!(name in form)) return;
    form = { ...form };
    delete form[name];

    return form;
  },
});

$types.on(mainFormApi.addField, (state, [name, value, type]) => {
  if (state[name] === type) return;

  return { ...state, [name]: value };
});
$types.on(mainFormApi.deleteField, (state, name) => {
  if (!(name in state)) return;
  state = { ...state };
  delete state[name];

  return state;
});
$types.on(loadFormFx.doneData, (state, result) => {
  let changed = false;

  state = { ...state };
  for (const key in result) {
    const { type } = result[key];

    if (type == null) continue;
    if (state[key] === type) continue;
    changed = true;
    state[key] = type;
  }
  if (!changed) return;

  return state;
});

const changeFieldInput = mainFormApi.changeField.prepend((e) => [
  e.currentTarget.name,
  e.currentTarget.type === "checkbox" ? e.currentTarget.checked : e.currentTarget.value,
]);

const submitField = mainFormApi.addField.prepend((e) => [
  e.currentTarget.fieldname.value,
  e.currentTarget.fieldtype.value === "checkbox"
    ? e.currentTarget.fieldvalue.checked
    : e.currentTarget.fieldvalue.value,
  e.currentTarget.fieldtype.value,
]);

const submitRemoveField = mainFormApi.deleteField.prepend((e) => e.currentTarget.field.value);

$fieldType.on(changeFieldType, (_, e) => e.currentTarget.value);
$fieldType.reset(submitField);

submitForm.watch((e) => {
  e.preventDefault();
});
submitField.watch((e) => {
  e.preventDefault();
  e.currentTarget.reset();
});
submitRemoveField.watch((e) => {
  e.preventDefault();
});

sample({
  clock: [submitForm, submitField, submitRemoveField],
  source: { values: $mainForm, types: $types },
  target: saveFormFx,
  fn({ values, types }) {
    const form = {};

    for (const [key, value] of Object.entries(values)) {
      form[key] = {
        value,
        type: types[key],
      };
    }

    return form;
  },
});

sample({
  clock: addMessage,
  target: showTooltipFx,
});
sample({
  clock: submitField,
  fn: () => "added",
  target: addMessage,
});
sample({
  clock: submitRemoveField,
  fn: () => "removed",
  target: addMessage,
});
sample({
  clock: submitForm,
  fn: () => "saved",
  target: addMessage,
});

loadFormFx.finally.watch(() => {
  ReactDOM.render(<App />, document.getElementById("root"));
});

function useFormField(name) {
  const type = useStoreMap({
    store: $types,
    keys: [name],
    fn(state, [field]) {
      if (field in state) return state[field];

      return "text";
    },
  });
  const value = useStoreMap({
    store: $mainForm,
    keys: [name],
    fn(state, [field]) {
      if (field in state) return state[field];

      return "";
    },
  });
  mainFormApi.upsertField(name);

  return [value, type];
}

function Form() {
  const pending = useUnit(saveFormFx.pending);

  return (
    <form onSubmit={submitForm} data-form autocomplete="off">
      <header>
        <h4>Form</h4>
      </header>
      {useList($fields, (name) => (
        <InputField name={name} />
      ))}

      <input type="submit" value="save form" disabled={pending} />
    </form>
  );
}

function InputField({ name }) {
  const [value, type] = useFormField(name);
  let input = null;

  switch (type) {
    case "checkbox":
      input = (
        <input
          id={name}
          name={name}
          value={name}
          checked={value}
          onChange={changeFieldInput}
          type="checkbox"
        />
      );
      break;
    case "text":
    default:
      input = <input id={name} name={name} value={value} onChange={changeFieldInput} type="text" />;
  }

  return (
    <>
      <label htmlFor={name} style={{ display: "block" }}>
        <strong>{name}</strong>
      </label>
      {input}
    </>
  );
}

function FieldForm() {
  const currentFieldType = useUnit($fieldType);
  const fieldValue =
    currentFieldType === "checkbox" ? (
      <input id="fieldvalue" name="fieldvalue" type="checkbox" />
    ) : (
      <input id="fieldvalue" name="fieldvalue" type="text" defaultValue="" />
    );

  return (
    <form onSubmit={submitField} autocomplete="off" data-form>
      <header>
        <h4>Insert new field</h4>
      </header>
      <label htmlFor="fieldname">
        <strong>name</strong>
      </label>
      <input id="fieldname" name="fieldname" type="text" required defaultValue="" />
      <label htmlFor="fieldvalue">
        <strong>value</strong>
      </label>
      {fieldValue}
      <label htmlFor="fieldtype">
        <strong>type</strong>
      </label>
      <select id="fieldtype" name="fieldtype" onChange={changeFieldType}>
        <option value="text">text</option>
        <option value="checkbox">checkbox</option>
      </select>
      <input type="submit" value="insert" />
    </form>
  );
}

function RemoveFieldForm() {
  return (
    <form onSubmit={submitRemoveField} data-form>
      <header>
        <h4>Remove field</h4>
      </header>
      <label htmlFor="field">
        <strong>name</strong>
      </label>
      <select id="field" name="field" required>
        {useList($fields, (name) => (
          <option value={name}>{name}</option>
        ))}
      </select>
      <input type="submit" value="remove" />
    </form>
  );
}

const Tooltip = () => {
  const [visible, text] = useUnit([showTooltipFx.pending, $message]);

  return <span data-tooltip={text} data-visible={visible} />;
};

const App = () => (
  <>
    <Tooltip />
    <div id="app">
      <Form />
      <FieldForm />
      <RemoveFieldForm />
    </div>
  </>
);

await loadFormFx();

css`
  [data-tooltip]:before {
    display: block;
    background: white;
    width: min-content;
    content: attr(data-tooltip);
    position: sticky;
    top: 0;
    left: 50%;
    color: darkgreen;
    font-family: sans-serif;
    font-weight: 800;
    font-size: 20px;
    padding: 5px 5px;
    transition: transform 100ms ease-out;
  }

  [data-tooltip][data-visible="true"]:before {
    transform: translate(0px, 0.5em);
  }

  [data-tooltip][data-visible="false"]:before {
    transform: translate(0px, -2em);
  }

  [data-form] {
    display: contents;
  }

  [data-form] > header {
    grid-column: 1 / span 2;
  }

  [data-form] > header > h4 {
    margin-block-end: 0;
  }

  [data-form] label {
    grid-column: 1;
    justify-self: end;
  }

  [data-form] input:not([type="submit"]),
  [data-form] select {
    grid-column: 2;
  }

  [data-form] input[type="submit"] {
    grid-column: 2;
    justify-self: end;
    width: fit-content;
  }

  #app {
    width: min-content;
    display: grid;
    grid-column-gap: 5px;
    grid-row-gap: 8px;
    grid-template-columns: repeat(2, 3fr);
  }
`;

function css(tags, ...attrs) {
  const value = style(tags, ...attrs);
  const node = document.createElement("style");
  node.id = "insertedStyle";
  node.appendChild(document.createTextNode(value));
  const sheet = document.getElementById("insertedStyle");

  if (sheet) {
    sheet.disabled = true;
    sheet.parentNode.removeChild(sheet);
  }
  document.head.appendChild(node);

  function style(tags, ...attrs) {
    if (tags.length === 0) return "";
    let result = " " + tags[0];

    for (let i = 0; i < attrs.length; i++) {
      result += attrs[i];
      result += tags[i + 1];
    }

    return result;
  }
}
```


# Effects with React

```js
import React from "react";
import ReactDOM from "react-dom";
import { createEffect, createStore, sample } from "effector";
import { useUnit } from "effector-react";

const url =
  "https://gist.githubusercontent.com/" +
  "zerobias/24bc72aa8394157549e0b566ac5059a4/raw/" +
  "b55eb74b06afd709e2d1d19f9703272b4d753386/data.json";

const loadUserClicked = createEvent();

const fetchUserFx = createEffect((url) => fetch(url).then((req) => req.json()));

const $user = createStore(null);

sample({
  clock: loadUserClicked,
  fn: () => url,
  target: fetchUserFx,
});

$user.on(fetchUserFx.doneData, (_, user) => user.username);

const App = () => {
  const [user, pending] = useUnit([$user, fetchUserFx.pending]);
  const handleUserLoad = useUnit(loadUserClicked);
  return (
    <div>
      {user ? <div>current user: {user}</div> : <div>no current user</div>}
      <button disable={pending} onClick={handleUserLoad}>
        load user
      </button>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it


# Forms

### Example 1

```jsx
import React from "react";
import ReactDOM from "react-dom";
import { createEffect, createStore, createEvent, sample } from "effector";
import { useStoreMap } from "effector-react";

const formSubmitted = createEvent();
const fieldUpdate = createEvent();

const sendFormFx = createEffect((params) => {
  console.log(params);
});

const $form = createStore({});

$form.on(fieldUpdate, (form, { key, value }) => ({
  ...form,
  [key]: value,
}));

sample({
  clock: formSubmitted,
  source: $form,
  target: sendFormFx,
});

const handleChange = fieldUpdate.prepend((event) => ({
  key: event.target.name,
  value: event.target.value,
}));

const Field = ({ name, type, label }) => {
  const value = useStoreMap({
    store: $form,
    keys: [name],
    fn: (values) => values[name] ?? "",
  });
  return (
    <div>
      {label} <input name={name} type={type} value={value} onChange={handleChange} />
    </div>
  );
};

const App = () => (
  <form onSubmit={formSubmitted}>
    <Field name="login" label="Login" />
    <Field name="password" type="password" label="Password" />
    <button type="submit">Submit!</button>
  </form>
);

formSubmitted.watch((e) => {
  e.preventDefault();
});

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it

Let's break down the code above.

These are just events & effects definitions.

```js
const sendFormFx = createEffect((params) => {
  console.log(params);
});
const formSubmitted = createEvent(); // will be used further, and indicates, we have an intention to submit form
const fieldUpdate = createEvent(); //has intention to change $form's state in a way, defined in reducer further
const $form = createStore({});

$form.on(fieldUpdate, (form, { key, value }) => ({
  ...form,
  [key]: value,
}));
```

The next piece of code shows how we can obtain a state in effector in the right way. This kind of state retrieving provides state consistency, and removes any possible race conditions, which can occur in some cases, when using `getState`.

```js
sample({
  clock: formSubmitted, // when `formSubmitted` is triggered
  source: $form, // Take LATEST state from $form, and
  target: sendFormFx, // pass it to `sendFormFx`, in other words -> sendFormFx(state)
  //fn: (sourceState, clockParams) => transformedData // we could additionally transform data here, but if we need just pass source's value, we may omit this property
});
```

So far, so good, we've almost set up our model (events, effects and stores). Next thing is to create event, which will be used as `onChange` callback, which requires some data transformation, before data appear in `fieldUpdate` event.

```js
const handleChange = fieldUpdate.prepend((event) => ({
  key: event.target.name,
  value: event.target.value,
})); // upon trigger `handleChange`, passed data will be transformed in a way, described in function above, and returning value will be passed to original `setField` event.
```

Next, we have to deal with how inputs should work. useStoreMap hook here prevents component rerender upon non-relevant changes.

```jsx
const Field = ({ name, type, label }) => {
  const value = useStoreMap({
    store: $form, // take $form's state
    keys: [name], // watch for changes of `name`
    fn: (values) => values[name] ?? "", // retrieve data from $form's state in this way (note: there will be an error, if undefined is returned)
  });

  return (
    <div>
      {label}{" "}
      <input
        name={name}
        type={type}
        value={value}
        onChange={handleChange /*note, bound event is here!*/}
      />
    </div>
  );
};
```

And, finally, the `App` itself! Note, how we got rid of any business-logic in view layer. It's simpler to debug, to share logic, and even more: logic is framework independent now.

```jsx
const App = () => (
  <form onSubmit={submitted /*note, there is an event, which is `clock` for `sample`*/}>
    <Field name="login" label="Login" />
    <Field name="password" type="password" label="Password" />
    <button type="submit">Submit!</button>
  </form>
);
```

Prevent the default html form submit behavior using react event from `submitted`:

```js
submitted.watch((e) => {
  e.preventDefault();
});
```

### Example 2

This example demonstrates how to manage state by using an uncontrolled form, handle data loading, create components that depend on stores, and transform data passed between events.

```jsx
import React from "react";
import ReactDOM from "react-dom";
import { createEffect, createStore } from "effector";
import { useUnit } from "effector-react";

//defining simple Effect, which results a string in 3 seconds
const sendFormFx = createEffect(
  (formData) => new Promise((rs) => setTimeout(rs, 1000, `Signed in as [${formData.get("name")}]`)),
);

const Loader = () => {
  //typeof loading === "boolean"
  const loading = useUnit(sendFormFx.pending);
  return loading ? <div>Loading...</div> : null;
};

const SubmitButton = (props) => {
  const loading = useUnit(sendFormFx.pending);
  return (
    <button disabled={loading} type="submit">
      Submit
    </button>
  );
};

//transforming upcoming data, from DOM Event to FormData
const onSubmit = sendFormFx.prepend((e) => new FormData(e.target));

const App = () => {
  const submit = useUnit(onSubmit);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e);
      }}
    >
      Login: <input name="name" />
      <br />
      Password: <input name="password" type="password" />
      <br />
      <Loader />
      <SubmitButton />
    </form>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it


# Gate

Gate is a bridge between props and stores.

Imagine you have the task of transferring something from React props to the effector store.
Suppose you pass the history object from the react-router to the store, or pass some callbacks from render-props.
In a such situation Gate will help.

```js
import { createStore, createEffect, sample } from "effector";
import { useUnit, createGate } from "effector-react";

// Effect for api request
const getTodoFx = createEffect(async ({ id }) => {
  const req = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
  return req.json();
});

// Our main store
const $todo = createStore(null);
const TodoGate = createGate();

$todo.on(getTodoFx.doneData, (_, todo) => todo);

// We call getTodoFx effect every time Gate updates its state.
sample({ clock: TodoGate.state, target: getTodoFx });

TodoGate.open.watch(() => {
  //called each time when TodoGate is mounted
});
TodoGate.close.watch(() => {
  //called each time when TodoGate is unmounted
});

function Todo() {
  const [todo, loading] = useUnit([$todo, getTodoFx.pending]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!todo || Object.keys(todo).length === 0) {
    return <div>empty</div>;
  }

  return (
    <div>
      <p>title: {todo.title}</p>
      <p>id: {todo.id}</p>
    </div>
  );
}

const App = () => {
  // value which need to be accessed outside from react
  const [id, setId] = React.useState(0);

  return (
    <>
      <button onClick={() => setId(id + 1)}>Get next Todo</button>
      {/*In this situation, we have the ability to simultaneously
      render a component and make a request, rather than wait for the component*/}
      <TodoGate id={id} />
      <Todo />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it


# Slots

A slot is a place in a component where you can insert any unknown component. It's a well-known abstraction used by frameworks
such as Vue.js and Svelte.

Slots aren't present in the React. With React, you can achieve this goal using props or `React.Context`.
In large projects, this is not convenient, because it generates "props hell" or smears the logic.

Using React with effector, we can achieve slot goals without the problems described above.

* [Slots proposal](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Slots-Proposal)
* [Vue.js docs](https://v3.vuejs.org/guide/component-slots.html)
* [Svelte docs](https://svelte.dev/docs#slot)
* [@space307/effector-react-slots](https://github.com/space307/effector-react-slots)

[Open ReplIt](https://replit.com/@binjospookie/effector-react-slots-example)

```tsx
import { createApi, createStore, createEvent, sample, split } from "effector";
import { useStoreMap } from "effector-react";
import React from "react";

import type { ReactElement, PropsWithChildren } from "react";

type Component<S> = (props: PropsWithChildren<S>) => ReactElement | null;
type Store<S> = {
  readonly component: Component<S>;
};

function createSlotFactory<Id>({ slots }: { readonly slots: Record<string, Id> }) {
  const api = {
    remove: createEvent<{ readonly id: Id }>(),
    set: createEvent<{ readonly id: Id; readonly component: Component<any> }>(),
  };

  function createSlot<P>({ id }: { readonly id: Id }) {
    const defaultToStore: Store<P> = {
      component: () => null,
    };
    const $slot = createStore<Store<P>>(defaultToStore);
    const slotApi = createApi($slot, {
      remove: (state) => ({ ...state, component: defaultToStore.component }),
      set: (state, payload: Component<P>) => ({ ...state, component: payload }),
    });
    const isSlotEventCalling = (payload: { readonly id: Id }) => payload.id === id;

    sample({
      clock: api.remove,
      filter: isSlotEventCalling,
      target: slotApi.remove,
    });

    sample({
      clock: api.set,
      filter: isSlotEventCalling,
      fn: ({ component }) => component,
      target: slotApi.set,
    });

    function Slot(props: P = {} as P) {
      const Component = useStoreMap({
        store: $slot,
        fn: ({ component }) => component,
        keys: [],
      });

      return <Component {...props} />;
    }

    return {
      $slot,
    };
  }

  return {
    api,
    createSlot,
  };
}

const SLOTS = { FOO: "foo" } as const;

const { api, createSlot } = createSlotFactory({ slots: SLOTS });

const { Slot: FooSlot } = createSlot({ id: SLOTS.FOO });

const ComponentWithSlot = () => (
  <>
    <h1>Hello, Slots!</h1>
    <FooSlot />
  </>
);

const updateFeatures = createEvent<string>("");
const $featureToggle = createStore<string>("");

const MyAwesomeFeature = () => <p>Look at my horse</p>;
const VeryAwesomeFeature = () => <p>My horse is amaizing</p>;

$featureToggle.on(updateFeatures, (_, feature) => feature);

split({
  source: $featureToggle,
  match: {
    awesome: (data) => data === "awesome",
    veryAwesome: (data) => data === "veryAwesome",
    hideAll: (data) => data === "hideAll",
  },
  cases: {
    awesome: api.set.prepend(() => ({
      id: SLOTS.FOO,
      component: MyAwesomeFeature,
    })),
    veryAwesome: api.set.prepend(() => ({
      id: SLOTS.FOO,
      component: VeryAwesomeFeature,
    })),
    hideAll: api.remove.prepend(() => ({ id: SLOTS.FOO })),
  },
});

// updateFeatures('awesome'); // render MyAwesomeFeature in slot
// updateFeatures('veryAwesome'); // render VeryAwesomeFeature in slot
// updateFeatures('hideAll'); // render nothing in slot
```


# ToDo creator

Try it

```tsx
import React from "react";
import ReactDOM from "react-dom";
import { createStore, createEvent, sample } from "effector";
import { useUnit, useList } from "effector-react";

function createTodoListApi(initial: string[] = []) {
  const insert = createEvent<string>();
  const remove = createEvent<number>();
  const change = createEvent<string>();
  const reset = createEvent<void>();

  const $input = createStore<string>("");
  const $todos = createStore<string[]>(initial);

  $input.on(change, (_, value) => value);

  $input.reset(insert);
  $todos.on(insert, (todos, newTodo) => [...todos, newTodo]);

  $todos.on(remove, (todos, index) => todos.filter((_, i) => i !== index));

  $input.reset(reset);

  const submit = createEvent<React.SyntheticEvent>();
  submit.watch((event) => event.preventDefault());

  sample({
    clock: submit,
    source: $input,
    target: insert,
  });

  return {
    submit,
    remove,
    change,
    reset,
    $todos,
    $input,
  };
}

const firstTodoList = createTodoListApi(["hello, world!"]);
const secondTodoList = createTodoListApi(["hello, world!"]);

function TodoList({ label, model }) {
  const input = useUnit(model.$input);

  const todos = useList(model.$todos, (value, index) => (
    <li>
      {value}{" "}
      <button type="button" onClick={() => model.remove(index)}>
        Remove
      </button>
    </li>
  ));

  return (
    <>
      <h1>{label}</h1>
      <ul>{todos}</ul>
      <form>
        <label>Insert todo: </label>
        <input
          type="text"
          value={input}
          onChange={(event) => model.change(event.currentTarget.value)}
        />
        <input type="submit" onClick={model.submit} value="Insert" />
      </form>
    </>
  );
}

function App() {
  return (
    <>
      <TodoList label="First todo list" model={firstTodoList} />
      <TodoList label="Second todo list" model={secondTodoList} />
    </>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
```


# TODO list with input validation

Try it

```js
import { createEvent, createStore, createEffect, restore, combine, sample } from "effector";
import { useUnit, useList } from "effector-react";

const submit = createEvent();
const submitted = createEvent();
const completed = createEvent();
const changed = createEvent();
const removed = createEvent();

const validateFx = createEffect(([todo, todos]) => {
  if (todos.some((item) => item.text === todo)) throw "This todo is already on the list";
  if (!todo.trim().length) throw "Required field";
  return null;
});

const $todo = createStore("");
const $todos = createStore([]);
const $error = createStore("");

$todo.on(changed, (_, todo) => todo);
$error.reset(changed);

$todos.on(completed, (list, index) =>
  list.map((todo, foundIndex) => ({
    ...todo,
    completed: index === foundIndex ? !todo.completed : todo.completed,
  })),
);
$todos.on(removed, (state, index) => state.filter((_, i) => i !== index));

sample({
  clock: submit,
  source: [$todo, $todos],
  target: validateFx,
});

sample({
  clock: validateFx.done,
  source: $todo,
  target: submitted,
});

$todos.on(submitted, (list, text) => [...list, { text, completed: false }]);
$todo.reset(submitted);

$error.on(validateFx.failData, (_, error) => error);

submit.watch((e) => e.preventDefault());

const App = () => {
  const [todo, error] = useUnit([$todo, $error]);
  const list = useList($todos, (todo, index) => (
    <li style={{ textDecoration: todo.completed ? "line-through" : "" }}>
      <input type="checkbox" checked={todo.completed} onChange={() => completed(index)} />
      {todo.text}
      <button type="button" onClick={() => removed(index)} className="delete">
        x
      </button>
    </li>
  ));
  return (
    <div>
      <h1>Todos</h1>
      <form>
        <input
          className="text"
          type="text"
          name="todo"
          value={todo}
          onChange={(e) => changed(e.target.value)}
        />
        <button type="submit" onClick={submit} className="submit">
          Submit
        </button>
        {error && <div className="error">{error}</div>}
      </form>

      <ul style={{ listStyle: "none" }}>{list}</ul>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```


# How to Think in the Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## How to Think in the Effector Paradigm

Effector is not just a state manager — it's also a powerful tool for building application logic. Here, we'll go over best practices for writing code and how to approach thinking when using Effector.

### How to approach development with Effector in the right way

To use Effector effectively, it's important to grasp a few key principles.

#### Events as the Source of Truth

An application is a stream of changes. Every change is an event. It's crucial to understand that an event **does not decide what to do** — it simply records that something happened. This is a key point that helps avoid tight dependencies.

* **An event is just a fact**: "something happened."
* **Events contain no logic** — they only declare an occurrence but do not decide how to respond.
* **One fact can lead to multiple consequences** — a single event can trigger several independent processes.

Example:

```ts
// Don't think about implementation yet — just declare the fact
const searchInputChanged = createEvent();
const buttonClicked = createEvent();
```

> TIP Use Meaningful Names:
>
> Give events meaningful names. For example, if you need to load data upon a certain action, the event should be tied to the action, not its implementation:
>
> ```ts
> ❌ const fetchData = createEvent();
> ✅ const appStarted = createEvent();
> ```

#### Business Logic and UI Are Separate

A good architectural approach is to keep business logic separate from the user interface. Effector makes this easy, keeping the UI simple and the logic clean and reusable.

* The UI only displays data.
* Effector manages state and logic.

### How Does This Look in a Real Application?

Let's take GitHub as an example, with buttons like "Watch," "Fork," and "Star." Every user action is an event:

![GitHub repository action buttons](/images/github-repo-actions.png)

* The user toggled a star - `repoStarToggled`
* The search input in the repository changed - `repoFileSearchChanged`
* The repository was forked - `repoForked`

The logic is built around events and their reactions. The UI simply announces an action, while its handling is part of the business logic.

A simplified example of the logic behind the star button:

<Tabs>  
<TabItem label="Business Logic">

```ts
// repo.model.ts

// Event – fact of an action
const repoStarToggled = createEvent();

// Effects as additional reactions to events
// (assuming effects return updated values)
const starRepoFx = createEffect(() => {});
const unstarRepoFx = createEffect(() => {});

// Application state
const $isRepoStarred = createStore(false);
const $repoStarsCount = createStore(0);

// Toggle star logic
sample({
  clock: repoStarToggled,
  source: $isRepoStarred,
  fn: (isRepoStarred) => !isRepoStarred,
  target: $isRepoStarred,
});

// Send request to server when star is toggled
sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred) => isRepoStarred,
  target: starRepoFx,
});

sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred) => !isRepoStarred,
  target: unstarRepoFx,
});

// Update the star count
sample({
  clock: [starRepoFx.doneData, unstarRepoFx.doneData],
  target: $repoStarsCount,
});
```

</TabItem>  
<TabItem label="UI">

```tsx
import { repoStarToggled, $isRepoStarred, $repoStarsCount } from "./repo.model.ts";

const RepoStarButton = () => {
  const [onStarToggle, isRepoStarred, repoStarsCount] = useUnit([
    repoStarToggled,
    $isRepoStarred,
    $repoStarsCount,
  ]);

  return (
    <div>
      <button onClick={onStarToggle}>{isRepoStarred ? "unstar" : "star"}</button>
      <span>{repoStarsCount}</span>
    </div>
  );
};
```

</TabItem>  
</Tabs>

At the same time, the UI doesn't need to know what's happening internally — it's only responsible for triggering events and displaying data.


# Releases policy

## Releases policy

The main goal of effector is to **make developer experience better**, as a part of this strategy we are committing to some rules of effector releases.

### No breaking changes without prior deprecation

Before each breaking change, the effector must provide a deprecation warning for **at least a year before.**

For example:

* When version 22 was released, feature "A" was marked as deprecated. The library gives a warning to the console when it is used.
* A year later, in version 23 release, feature "A" is removed.

### Release cycle

Major updates (i.e. with breaking changes) of the effector are released **no more than once a year.**

Minor and patch updates (i.e., with fixes and new features) are released when ready. If a new feature requires breaking changes – it is also released in a major update.

This is necessary to allow developers to plan their work smoothly, taking into account possible changes in effector.

It also obliges effector maintainers to be extremely careful when designing new features and breaking changes to old library features, because the opportunity to remove or heavily modify something in the public API only appears once every two years.


# Usage with effector-react

**TypeScript** is a typed superset of JavaScript. It became popular
recently in applications due to the benefits it can bring. If you are new to
TypeScript, it is highly recommended to become familiar with it first, before
proceeding. You can check out its documentation
[here](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html).

TypeScript has a potential to bring the following benefits to application:

1. Type safety for state, stores and events
2. Easy refactoring of typed code
3. A superior developer experience in a team environment

**A Practical Example**

We will be going through a simplistic chat application to demonstrate a
possible approach to include static typing. This chat application will have API mock that load and saves data from localStorage.

The full source code is available on
[github](https://github.com/effector/effector/tree/master/examples/react-and-ts).
Note that, by going through this example yourself, you will experience some benefits of using TypeScript.

### Let's create API mock

There is a directory structure inherited from the [feature-sliced](https://feature-sliced.github.io/documentation/) methodology.

Let's define a simple type, that our improvised API will return.

```ts
// File: /src/shared/api/message.ts
interface Author {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  author: Author;
  text: string;
  timestamp: number;
}
```

Our API will load and save data to `localStorage`, and we need some functions to load data:

```ts
// File: /src/shared/api/message.ts
const LocalStorageKey = "effector-example-history";

function loadHistory(): Message[] | void {
  const source = localStorage.getItem(LocalStorageKey);
  if (source) {
    return JSON.parse(source);
  }
  return undefined;
}
function saveHistory(messages: Message[]) {
  localStorage.setItem(LocalStorageKey, JSON.stringify(messages));
}
```

I also created some libraries to generate identifiers and wait to simulate network requests.

```ts
// File: /src/shared/lib/oid.ts
export const createOid = () =>
  ((new Date().getTime() / 1000) | 0).toString(16) +
  "xxxxxxxxxxxxxxxx".replace(/[x]/g, () => ((Math.random() * 16) | 0).toString(16)).toLowerCase();
```

```ts
// File: /src/shared/lib/wait.ts
export function wait(timeout = Math.random() * 1500) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
```

OK. Now we can create effects that will load messages.

```ts
// File: /src/shared/api/message.ts
// Here effect defined with static types. void defines no arguments.
// Second type argument defines a successful result type.
// Third argument is optional and defines a failure result type.
export const messagesLoadFx = createEffect<void, Message[], Error>(async () => {
  const history = loadHistory();
  await wait();
  return history ?? [];
});

interface SendMessage {
  text: string;
  author: Author;
}

// But we can use type inferring and set arguments types in the handler defintion.
// Hover your cursor on `messagesLoadFx` to see the inferred types:
// `Effect<{ text: string; authorId: string; authorName: string }, void, Error>`
export const messageSendFx = createEffect(async ({ text, author }: SendMessage) => {
  const message: Message = {
    id: createOid(),
    author,
    timestamp: Date.now(),
    text,
  };
  const history = await messagesLoadFx();
  saveHistory([...history, message]);
  await wait();
});

// Please, note that we will `wait()` for `messagesLoadFx` and `wait()` in the current effect
// Also, note that `saveHistory` and `loadHistory` can throw exceptions,
// in that case effect will trigger `messageDeleteFx.fail` event.
export const messageDeleteFx = createEffect(async (message: Message) => {
  const history = await messagesLoadFx();
  const updated = history.filter((found) => found.id !== message.id);
  await wait();
  saveHistory(updated);
});
```

OK, now we are done with the messages, let's create effects to manage user session.

Really, I prefer to start design code from implementing interfaces:

```ts
// File: /src/shared/api/session.ts
// It is called session because it describes current user session, not the User at all.
export interface Session {
  id: string;
  name: string;
}
```

Also, to generate usernames and don't require to type it by themselves, import `unique-names-generator`:

```ts
// File: /src/shared/api/session.ts
import { uniqueNamesGenerator, Config, starWars } from "unique-names-generator";

const nameGenerator: Config = { dictionaries: [starWars] };
const createName = () => uniqueNamesGenerator(nameGenerator);
```

Let's create effects to manage session:

```ts
// File: /src/shared/api/session.ts
const LocalStorageKey = "effector-example-session";

// Note, that we need explicit types definition in that case, because `JSON.parse()` returns `any`
export const sessionLoadFx = createEffect<void, Session | null>(async () => {
  const source = localStorage.getItem(LocalStorageKey);
  await wait();
  if (!source) {
    return null;
  }
  return JSON.parse(source);
});

// By default, if there are no arguments, no explicit type arguments, and no return statement provided
// effect will have type: `Effect<void, void, Error>`
export const sessionDeleteFx = createEffect(async () => {
  localStorage.removeItem(LocalStorageKey);
  await wait();
});

// Look at the type of the `sessionCreateFx` constant.
// It will be `Effect<void, Session, Error>` because TypeScript can infer type from `session` constant
export const sessionCreateFx = createEffect(async () => {
  // I explicitly set type for the next constant, because it allows TypeScript help me
  // If I forgot to set property, I'll see error in the place of definition
  // Also it allows IDE to autocomplete property names
  const session: Session = {
    id: createOid(),
    name: createName(),
  };
  localStorage.setItem(LocalStorageKey, JSON.stringify(session));
  return session;
});
```

How we need to import these effects?

I surely recommend writing short imports and using reexports.
It allows to securely refactor code structure inside `shared/api` and the same slices,
and don't worry about refactoring other imports and unnecessary changes in the git history.

```ts
// File: /src/shared/api/index.ts
export * as messageApi from "./message";
export * as sessionApi from "./session";

// Types reexports made just for convenience
export type { Message } from "./message";
export type { Session } from "./session";
```

### Create a page with the logic

Typical structure of the pages:

```
src/
  pages/
    <page-name>/
      page.tsx — just the View layer
      model.ts — a business-logic code
      index.ts — reexports, sometimes there will be a connection-glue code
```

I recommend writing code in the view layer from the top to bottom, more common code at the top.
Let's model our view layer. We will have two main sections at the page: messages history and a message form.

```tsx
// File: /src/pages/chat/page.tsx
export function ChatPage() {
  return (
    <div className="parent">
      <ChatHistory />
      <MessageForm />
    </div>
  );
}

function ChatHistory() {
  return (
    <div className="chat-history">
      <div>There will be messages list</div>
    </div>
  );
}

function MessageForm() {
  return (
    <div className="message-form">
      <div>There will be message form</div>
    </div>
  );
}
```

OK. Now we know what kind of structure we have, and we can start to model business-logic processes.
The view layer should do two tasks: render data from stores and report events to the model.
The view layer doesn't know how data are loaded, how it should be converted and sent back.

```ts
// File: /src/pages/chat/model.ts
import { createEvent, createStore } from "effector";

// And the events report just what happened
export const messageDeleteClicked = createEvent<Message>();
export const messageSendClicked = createEvent();
export const messageEnterPressed = createEvent();
export const messageTextChanged = createEvent<string>();
export const loginClicked = createEvent();
export const logoutClicked = createEvent();

// At the moment, there is just raw data without any knowledge how to load
export const $loggedIn = createStore<boolean>(false);
export const $userName = createStore("");
export const $messages = createStore<Message[]>([]);
export const $messageText = createStore("");

// Page should NOT know where the data came from.
// That's why we just reexport them.
// We can rewrite this code to `combine` or independent store,
// page should NOT be changed, just because we changed the implementation
export const $messageDeleting = messageApi.messageDeleteFx.pending;
export const $messageSending = messageApi.messageSendFx.pending;
```

Now we can implement components.

```tsx
// File: /src/pages/chat/page.tsx
import { useList, useUnit } from "effector-react";
import * as model from "./model";

// export function ChatPage { ... }

function ChatHistory() {
  const [messageDeleting, onMessageDelete] = useUnit([
    model.$messageDeleting,
    model.messageDeleteClicked,
  ]);

  // Hook `useList` allows React not rerender messages really doesn't changed
  const messages = useList(model.$messages, (message) => (
    <div className="message-item" key={message.timestamp}>
      <h3>From: {message.author.name}</h3>
      <p>{message.text}</p>
      <button onClick={() => onMessageDelete(message)} disabled={messageDeleting}>
        {messageDeleting ? "Deleting" : "Delete"}
      </button>
    </div>
  ));
  // We don't need `useCallback` here because we pass function to an HTML-element, not a custom component

  return <div className="chat-history">{messages}</div>;
}
```

I split `MessageForm` to the different components, to simplify code:

```tsx
// File: /src/pages/chat/page.tsx
function MessageForm() {
  const isLogged = useUnit(model.$loggedIn);
  return isLogged ? <SendMessage /> : <LoginForm />;
}

function SendMessage() {
  const [userName, messageText, messageSending] = useUnit([
    model.$userName,
    model.$messageText,
    model.$messageSending,
  ]);

  const [handleLogout, handleTextChange, handleEnterPress, handleSendClick] = useUnit([
    model.logoutClicked,
    model.messageTextChanged,
    model.messageEnterPressed,
    model.messageSendClicked,
  ]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleEnterPress();
    }
  };

  return (
    <div className="message-form">
      <h3>{userName}</h3>
      <input
        value={messageText}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyPress={handleKeyPress}
        className="chat-input"
        placeholder="Type a message..."
      />
      <button onClick={() => handleSendClick()} disabled={messageSending}>
        {messageSending ? "Sending..." : "Send"}
      </button>
      <button onClick={() => handleLogout()}>Log out</button>
    </div>
  );
}

function LoginForm() {
  const handleLogin = useUnit(model.loginClicked);

  return (
    <div className="message-form">
      <div>Please, log in to be able to send messages</div>
      <button onClick={() => handleLogin()}>Login as a random user</button>
    </div>
  );
}
```

### Manage user session like a Pro

Let's create a session entity. An entity is a business unit.

```ts
// File: /src/entities/session/index.ts
import { Session } from "shared/api";
import { createStore } from "effector";

// Entity just stores session and some internal knowledge about it
export const $session = createStore<Session | null>(null);
// When store `$session` is updated, store `$isLogged` will be updated too
// They are in sync. Derived store are depends on data from original.
export const $isLogged = $session.map((session) => session !== null);
```

Now we can implement login or logout features on the page. Why not here?
If we place login logic here, we will have a very implicit scenario,
when you call `sessionCreateFx` you won't see code called after effect.
But consequences will be visible in the DevTools and application behaviour.

Try to write the code in as obvious a way as possible in one file,
so that you and any teammate can trace the sequence of execution.

### Implement logic

OK. Now we can load a user session and the messages lists on the page mount.
But, we don't have any event when we can start. Let's fix it.

You can use Gate, but I prefer to use explicit events.

```ts
// File: /src/pages/chat/model.ts
// Just add a new event
export const pageMounted = createEvent();
```

Just add `useEffect` and call bound event inside.

```tsx
// File: /src/pages/chat/page.tsx
export function ChatPage() {
  const handlePageMount = useUnit(model.pageMounted);

  React.useEffect(() => {
    handlePageMount();
  }, [handlePageMount]);

  return (
    <div className="parent">
      <ChatHistory />
      <MessageForm />
    </div>
  );
}
```

> Note: if you don't plan to write tests for effector code and/or implement SSR you can omit any usage of `useEvent`.

At the moment we can load a session and the messages list.

Just add reaction to the event, and any other code should be written in chronological order after each event:

```ts
// File: /src/pages/chat/model.ts
// Don't forget to import { sample } from "effector"
import { Message, messageApi, sessionApi } from "shared/api";
import { $session } from "entities/session";

// export stores
// export events

// Here the logic place

// You can read this code like:
// When page mounted, call messages load and session load simultaneously
sample({
  clock: pageMounted,
  target: [messageApi.messagesLoadFx, sessionApi.sessionLoadFx],
});
```

After that we need to define reactions on `messagesLoadFx.done` and `messagesLoadFx.fail`, and the same for `sessionLoadFx`.

```ts
// File: /src/pages/chat/model.ts
// `.doneData` is a shortcut for `.done`, because `.done` returns `{ params, result }`
// Do not name your arguments like `state` or `payload`
// Use explicit names of the content they contain
$messages.on(messageApi.messagesLoadFx.doneData, (_, messages) => messages);

$session.on(sessionApi.sessionLoadFx.doneData, (_, session) => session);
```

OK. Session and messages loaded. Let's allow the users to log in.

```ts
// File: /src/pages/chat/model.ts
// When login clicked we need to create a new session
sample({
  clock: loginClicked,
  target: sessionApi.sessionCreateFx,
});
// When session created, just write it to a session store
sample({
  clock: sessionApi.sessionCreateFx.doneData,
  target: $session,
});
// If session create is failed, just reset the session
sample({
  clock: sessionApi.sessionCreateFx.fail,
  fn: () => null,
  target: $session,
});
```

Now we'll implement a logout process:

```ts
// File: /src/pages/chat/model.ts
// When logout clicked we need to reset session and clear our storage
sample({
  clock: logoutClicked,
  target: sessionApi.sessionDeleteFx,
});
// In any case, failed or not, we need to reset session store
sample({
  clock: sessionApi.sessionDeleteFx.finally,
  fn: () => null,
  target: $session,
});
```

> Note: most of the comments wrote just for educational purpose. In real life, application code will be self-describable

But if we start the dev server and try to log in, we see nothing changed.
This is because we created `$loggedIn` store in the model, but don't change it. Let's fix:

```ts
// File: /src/pages/chat/model.ts
import { $isLogged, $session } from "entities/session";

// At the moment, there is just raw data without any knowledge how to load
export const $loggedIn = $isLogged;
export const $userName = $session.map((session) => session?.name ?? "");
```

Here we just reexported our custom store from the session entity, but our View layer doesn't change.
The same situation with `$userName` store. Just reload the page, and you'll see, that session loaded correctly.

### Send message

Now we can log in and log out. I think you want to send a message. This is pretty simple:

```ts
// File: /src/pages/chat/model.ts
$messageText.on(messageTextChanged, (_, text) => text);

// We have two different events to send message
// Let event `messageSend` react on any of them
const messageSend = merge([messageEnterPressed, messageSendClicked]);

// We need to take a message text and author info then send it to the effect
sample({
  clock: messageSend,
  source: { author: $session, text: $messageText },
  target: messageApi.messageSendFx,
});
```

But if in the `tsconfig.json` you set `"strictNullChecks": true`, you will see the error there.
It is because store `$session` contains `Session | null` and `messageSendFx` wants `Author` in the arguments.
`Author` and `Session` are compatible, but not the `null`.

To fix this strange behaviour, we need to use `filter` there:

```ts
// File: /src/pages/chat/model.ts
sample({
  clock: messageSend,
  source: { author: $session, text: $messageText },
  filter: (form): form is { author: Session; text: string } => {
    return form.author !== null;
  },
  target: messageApi.messageSendFx,
});
```

I want to focus your attention on the return type `form is {author: Session; text: string}`.
This feature called [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
and allows TypeScript to reduce `Session | null` type to more specific `Session` via condition inside the function.

Now we can read this like: when a message should be sent, take session and message text, check that session exists, and send it.

OK. Now we can write a new message to a server.
But if we don't call `messagesLoadFx` again we didn't see any changes,
because `$messages` store didn't update. We can write generic code for this case.
The easiest way is to return the sent message from the effect.

```ts
// File: /src/shared/api/message.ts
export const messageSendFx = createEffect(async ({ text, author }: SendMessage) => {
  const message: Message = {
    id: createOid(),
    author,
    timestamp: Date.now(),
    text,
  };
  const history = await messagesLoadFx();
  await wait();
  saveHistory([...history, message]);
  return message;
});
```

Now we can just append a message to the end of the list:

```ts
// File: /src/pages/chat/model.ts
$messages.on(messageApi.messageSendFx.doneData, (messages, newMessage) => [
  ...messages,
  newMessage,
]);
```

But at the moment, sent a message still left in the input.

```ts
// File: /src/pages/chat/model.ts
$messageText.on(messageSendFx, () => "");

// If message sending is failed, just restore the message
sample({
  clock: messageSendFx.fail,
  fn: ({ params }) => params.text,
  target: $messageText,
});
```

### Deleting the message

It is pretty simple.

```ts
// File: /src/pages/chat/model.ts
sample({
  clock: messageDeleteClicked,
  target: messageApi.messageDeleteFx,
});

$messages.on(messageApi.messageDeleteFx.done, (messages, { params: toDelete }) =>
  messages.filter((message) => message.id !== toDelete.id),
);
```

But you can see the bug, when "Deleting" state doesn't disable.
This is because `useList` caches renders, and doesn't know about dependency on `messageDeleting` state.
To fix it, we need to provide `keys`:

```tsx
// File: /src/pages/chat/page.tsx
const messages = useList(model.$messages, {
  keys: [messageDeleting],
  fn: (message) => (
    <div className="message-item" key={message.timestamp}>
      <h3>From: {message.author.name}</h3>
      <p>{message.text}</p>
      <button onClick={() => handleMessageDelete(message)} disabled={messageDeleting}>
        {messageDeleting ? "Deleting" : "Delete"}
      </button>
    </div>
  ),
});
```

### Conclusion

This is a simple example of an application on effector with React and TypeScript.

You can clone this [effector/examples/react-and-ts](https://github.com/effector/effector/tree/master/examples/react-and-ts) and run this example on your computer.


# FAQ

## Часто задаваемые вопросы про Effector

### Зачем нужны плагины для babel/swc для SSR?

Плагины эффектора вставляют в код специальные метки - SID, это позволяет автоматизировать сериализацию и десериализацию сторов, так что юзерам не требуется думать о ручной сериализации. Более глубокое объяснение в статье про sid.

### Зачем нам нужно давать имена событиям, эффектам и т.д.?

Это поможет в будущем, при разработке инструментов Effector Devtools, и сейчас используется в [плейграунде](https://share.effector.dev) на боковой панели слева.\
Если вы не хотите этого делать, вы можете использовать [Babel плагин](https://www.npmjs.com/package/@effector/babel-plugin). Он автоматически сгенерирует имя для событий и эффектов из имени переменной.


# Изолированный контекст

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import SideBySide from "@components/SideBySide/SideBySide.astro";

## Изолированный контекст

С помощью скоупов вы можете создать изолированный экземпляр всего приложения, который содержит независимую копию всех юнитов (включая их связи), а также базовые методы для работы с ними:

```ts "fork" "allSettled"
import { fork, allSettled } from "effector";

// Создаем новый скоуп
const scope = fork();

const $counter = scope.createStore(0);
const increment = scope.createEvent();

$counter.on(increment, (state) => state + 1);

// Запускаем событие и дожидаемся всей цепочки выполнения
await allSettled(increment, { scope });

console.log(scope.getState($counter)); // 1
console.log($counter.getState()); // 0 - оригинальный стор остается без изменений
```

С помощью fork мы создаем новый скоуп, а с помощью allSettled — запускаем цепочку событий внутри указанного скоупа и дожидаемся ее завершения.

> INFO Независимость скоупов:
>
> Не существует механизма для обмена данными между скоупами; каждый экземпляр полностью изолирован и работает самостоятельно.

### Зачем нужен cкоуп?

В effector все состояние хранится глобально. В клиентском приложении (SPA) это не проблема: каждый пользователь получает собственный экземпляр кода и работает со своим состоянием. Но при серверном рендеринге (SSR) или параллельном тестировании глобальное состояние становится проблемой: данные одного запроса или теста могут “протечь” в другой. Поэтому нам необходим скоуп.

* **SSR** — сервер работает как единый процесс и обслуживает запросы множества пользователей. Для каждого запроса можно создать скоуп, который изолирует данные от глобального контекста Effector и предотвращает утечку состояния одного пользователя в запрос другого.
* **Тестирование** — при параллельном запуске тестов возможны гонки данных и коллизии состояний. Скоуп позволяет каждому тесту выполняться со своим собственным изолированным состоянием.

У нас есть подробные гайды по работе с серверным рендерингом (SSR) и тестировании, а здесь мы сосредоточимся на основных принципах работы со скоупом, его правилах и способах избежать распространенных ошибок.

### Правила работы со скоупом

Для корректной работы со скоупом имеется ряд правил, чтобы избежать потери скоупа:

#### Вызов эффектов и промисов

Для обработчиков эффектов, которые вызывают другие эффекты, убедитесь, что вы вызываете только эффекты, а не обычные асинхронные функции. Кроме того, вызовы эффектов должны быть ожидаемыми (`awaited`).

Императивные вызовы эффектов в этом плане безопасны, потому что effector запоминает скоуп в котором начинался императивный вызов эффекта и при завершении вызова восстанавливает его обратно, что позволяет сделать ещё один вызов подряд.

Можно вызывать методы `Promise.all([fx1(), fx2()])` и прочие из стандартного api javascript, потому что в этих случаях вызовы эффектов по прежнему происходят синхронно и скоуп безопасно сохраняется.

<SideBySide>

<Fragment slot="left">

```ts wrap data-border="good" data-height="full"
// ✅ правильное использование эффекта без вложенных эффектов
const delayFx = createEffect(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
});

// ✅ правильное использование эффекта с вложенными эффектами
const authFx = createEffect(async () => {
  await loginFx();

  await Promise.all([loadProfileFx(), loadSettingsFx()]);
});
```

</Fragment>

  <Fragment slot="right">

```ts wrap data-border="bad" data-height="full"
// ❌ неправильное использование эффекта с вложенными эффектами

const sendWithAuthFx = createEffect(async () => {
  await authUserFx();

  //неправильно! Это должно быть обернуто в эффект.
  await new Promise((resolve) => setTimeout(resolve, 80));

  // здесь скоуп теряется.
  await sendMessageFx();
});
```

</Fragment>

</SideBySide>

> INFO attach в деле:
>
> Для сценариев, когда эффект может вызывать другой эффект или выполнять асинхронные вычисления, но не то и другое одновременно, рассмотрите использование метода attach для более лаконичных императивных вызовов.

#### Использование юнитов с фреймворками

Всегда используйте хук `useUnit` в связке с фреймворками, чтобы effector сам вызвал юнит в нужном ему скоупе:

```tsx wrap "useUnit"
import { useUnit } from "effector-react";
import { $counter, increased, sendToServerFx } from "./model";

const Component = () => {
  const [counter, increase, sendToServer] = useUnit([$counter, increased, sendToServerFx]);

  return (
    <div>
      <button onClick={increase}>{counter}</button>
      <button onClick={sendToServer}>send data to server</button>
    </div>
  );
};
```

Ну все, хватит слов, давайте посмотри на то как это работает.

### Использование в SSR

Представим ситуацию: у нас есть сайт с SSR, где на странице профиля показывается список личных уведомлений пользователя. Если мы не будем использовать скоуп, то получится следующее:

* Пользователь А делает запрос → на сервере в `$notifications` загружаются его уведомления.
* Почти одновременно Пользователь B делает запрос → стор перезаписывается его данными.
* В результате оба получат список уведомлений Пользователя B.

Получилось явно не то, что мы хотели, да ? Это и есть [состояние гонки](https://ru.wikipedia.org/wiki/%D0%A1%D0%BE%D1%81%D1%82%D0%BE%D1%8F%D0%BD%D0%B8%D0%B5_%D0%B3%D0%BE%D0%BD%D0%BA%D0%B8), ведущее к утечке приватных данных.
В этой ситуации скоуп обеспечит нам изолированный контекст, который будет работать только для текущего пользователя: Пользователь сделал запрос -> создался скоуп и теперь мы меняем состояние только в нашем скоупе, так будет работать для каждого запроса.

<Tabs>
  <TabItem label="Сервер">

```tsx "fork" "allSettled" "serialize"
// server.tsx
import { renderToString } from "react-dom/server";
import { fork, serialize, allSettled } from "effector";
import { Provider } from "effector-react";
import { fetchNotificationsFx } from "./model";

async function serverRender() {
  const scope = fork();

  // Загружаем данные на сервере
  await allSettled(fetchNotificationsFx, { scope });

  // Рендерим приложение
  const html = renderToString(
    <Provider value={scope}>
      <App />
    </Provider>,
  );

  // Сериализуем состояние для передачи на клиент
  const data = serialize(scope);

  return `
	<html>
	  <body>
		<div id="root">${html}</div>
		<script>window.INITIAL_DATA = ${data}</script>
	  </body>
	</html>
`;
}
```

</TabItem>
<TabItem label="Клиент">

```tsx
// client.tsx
import { hydrateRoot } from "react-dom/client";
import { fork } from "effector";

// гидрируем скоуп начальными значениями
const scope = fork({
  values: window.INITIAL_DATA,
});

hydrateRoot(
  document.getElementById("root"),
  <Provider value={scope}>
    <App />
  </Provider>,
);
```

</TabItem>
</Tabs>

Что стоит отметить в этом примере:

1. Мы сериализовали данные с помощью метода serialize, чтобы корректно передать их на клиент.
2. На клиенте мы гидрировали сторы с помощью аргумента конфигурации .

### Связанные API и статьи

* **API**
    * Scope - Описание скоупа и его методов
    * scopeBind - Метод для привязки юнита к скоупу
    * fork - Оператор для создания скоупа
    * allSettled - Метод для вызова юнита в предоставленном скоупе и ожидания завершения всей цепочки эффектов
    * serialize - Метод для получения сериализованного значения сторов
    * hydrate - Метод для гидрации сериализованных данных
* **Статьи**
    * Что такое потеря скоупа и как исправить эту проблему
    * Гайд по работе с SSR
    * Гайд по тестированию
    * Важность SID для гидрации сторов


# Справочник по API

Перечень основных методов API, по группам

### Хуки

* useStore(store)
* useStoreMap({ store, keys, fn })
* useList(store, renderItem)
* useUnit(units)
* useEvent(unit)

### Gate API

* Gate
* createGate()
* useGate(GateComponent, props)

### Higher Order Components API

* createComponent(store, render)
* createStoreConsumer(store)
* connect(store)(Component)


# useEvent

> WARNING Устаревшее API :
>
> Рекомендуется использовать хук useUnit.

Реакт-хук, который привязывает событие к текущему scope для использования в обработчиках событий

Используется с серверным рендерингом и в тестировании, импортируется из `effector-react/scope`

### *useEvent(unit)*

Привязывает юнит к скоупу компонента

#### Формула

```ts
declare const event: Event<T>
declare const fx: Effect<T, S>

const eventFn = useEvent(/*unit*/ event)
-> (data: T) => T

const fxFn = useEvent(/*unit*/ fx)
-> (data: T) => Promise<S>
```

#### Аргументы

1. **`unit`**: Событие или эффект для привязки к скоупу компонента

#### Возвращает

Функцию для запуска юнита в скоупе компонента

#### Пример

```jsx
import ReactDOM from "react-dom";
import { createEvent, createStore, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const inc = createEvent();
const $count = createStore(0).on(inc, (x) => x + 1);

const App = () => {
  const count = useStore($count);
  const incFn = useEvent(inc);
  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => incFn()}>increment</button>
    </>
  );
};

const scope = fork();

ReactDOM.render(
  <Provider value={scope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```

Запустить пример

### *useEvent(\[a, b])*

Привязывает массив событий или эффектов к скоупу компонента

#### Формула

```ts
declare const a: Event<T>
declare const bFx: Effect<T, S>

const [aFn, bFn] = useEvent(/*list*/ [a, bFx])
-> [(data: T) => T, (data: T) => Promise<S>]
```

#### Аргументы

1. **`list`**: Массив событий или эффектов

#### Возвращает

Массив функций для запуска юнитов в скоупе компонента

#### Пример

```jsx
import ReactDOM from "react-dom";
import { createEvent, createStore, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const inc = createEvent();
const dec = createEvent();
const $count = createStore(0)
  .on(inc, (x) => x + 1)
  .on(dec, (x) => x - 1);

const App = () => {
  const count = useStore($count);
  const [incFn, decFn] = useEvent([inc, dec]);
  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => incFn()}>increment</button>
      <button onClick={() => decFn()}>decrement</button>
    </>
  );
};

const scope = fork();

ReactDOM.render(
  <Provider value={scope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```

Запустить пример

### *useEvent({a, b})*

Привязывает объект событий или эффектов к скоупу компонента

#### Формула

```ts
declare const a: Event<T>
declare const bFx: Effect<T, S>

const {a: aFn, b: bFn} = useEvent(/*shape*/ {a, b: bFx})
-> {a: (data: T) => T, b: (data: T) => Promise<S>}
```

#### Аргументы

1. **`shape`**: Объект событий или эффектов

#### Возвращает

Объект функций для запуска юнитов в скоупе компонента

#### Пример

```jsx
import ReactDOM from "react-dom";
import { createEvent, createStore, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const inc = createEvent();
const dec = createEvent();
const $count = createStore(0)
  .on(inc, (x) => x + 1)
  .on(dec, (x) => x - 1);

const App = () => {
  const count = useStore($count);
  const handlers = useEvent({ inc, dec });
  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => handlers.inc()}>increment</button>
      <button onClick={() => handlers.dec()}>decrement</button>
    </>
  );
};

const scope = fork();

ReactDOM.render(
  <Provider value={scope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```

Запустить пример


# useList

> INFO since:
>
> `useList` появился в [effector-react 20.1.1](https://changelog.effector.dev/#effector-react-20-1-1)

React-хук для эффективного рендеринга сторов хранящих массивы данных.
Каждый элемент будет мемоизирован и обновлен только при изменении его данных

## Когда нужно использовать `useList`?

`useList` решает конкретную задачу эффективного рендера списков, с `useList` можно не проставлять key у списков компонентов и там реализован более оптимальный ререндер. Если есть ощущение что требуется что-то еще, то значит фича переросла `useList` и стоит использовать useStoreMap. С `useStoreMap` можно взять конкретные данные из стора оптимальным образом, если нужен не весь стор, а только его часть

## API

### Сокращённая запись

#### Формула

```ts
function useList(store: Store<T[]>, fn: (item: T, key: number) => React.ReactNode): React.ReactNode;
```

#### Аргументы

1. **`store`**: Стор с массивом данных
2. **`fn`**: `(item: T, key: number) => React.ReactNode`

   Рендер-функция для отображения в ui отдельного элемента массива. Явная простановка `key` реакт-элементам внутри рендер-функции не требуется, ключ элемента проставляется автоматически

   **Аргументы**

    * **`item`**: Элемент массива
    * **`key`**: Индекс элемента, выступает как ключ для React

   **Возвращает**: `React.ReactNode`

#### Возвращает

`React.ReactNode`

### Полная запись

Используется, когда необходимо вычислять ключ элемента или обновлять элементы при изменении какого-либо внешнего значения, доступного только через React (например, поля props из замыкания компонента или состояния другого стора)

По умолчанию `useList` обновляется только тогда, когда некоторые из его элементов были изменены.
Однако иногда необходимо обновлять элементы при изменении какого-либо внешнего значения (например, поля props или состояния другого стора).
В таком случае нужно сообщить React о дополнительных зависимостях, в таком случае элемент будет перерендерен и в случае их изменения

#### Формула

```ts
function useList(
  store: Store<T[]>,
  config: {
    keys: any[];
    fn: (item: T, key: React.Key) => React.ReactNode;
    getKey?: (item: T) => React.Key;
  },
): React.ReactNode;
```

#### Аргументы

1. **`store`**: Стор с массивом данных
2. **`config`**: Объект конфигурации

    * **`keys`**: Массив зависимостей, которые будут переданы в React

    * **`fn`**: `(item: T, key: React.Key) => React.ReactNode`

      Рендер-функция для отображения в ui отдельного элемента массива. Явная простановка `key` реакт-элементам внутри рендер-функции не требуется, ключ элемента проставляется автоматически

      **Аргументы**

        * **`item`**: Элемент массива
        * **`key`**: Ключ элемента, вычисляется с помощью `getKey`, если есть, в противном случае используется индекс элемента

      **Возвращает**: `React.ReactNode`

    * **`getKey?`**: `(item: T) => React.Key`

      Функция для вычисления ключа элемента на основе данных. Полученный ключ будет передан в React

      **Аргументы**

        * **`item`**: Элемент массива

      **Возвращает**: `React.Key`

    * **`placeholder?`**: `React.ReactNode` Опциональный реакт-элемент который будет использован в случае пустого массива

#### Возвращает

`React.ReactNode`

> INFO:
>
> Опция `getKey` добавлена в effector-react 21.3.0

> INFO:
>
> Опция `placeholder` добавлена в effector-react 22.1.0

### Примеры

#### Пример 1

```jsx
import { createStore } from "effector";
import { useList } from "effector-react";

const $users = createStore([
  { id: 1, name: "Yung" },
  { id: 2, name: "Lean" },
  { id: 3, name: "Kyoto" },
  { id: 4, name: "Sesh" },
]);

const App = () => {
  const list = useList($users, ({ name }, index) => (
    <li>
      [{index}] {name}
    </li>
  ));

  return <ul>{list}</ul>;
};
```

Запустить пример

#### Пример 2

```jsx
import { createStore, createEvent } from "effector";
import { useList } from "effector-react";

const addTodo = createEvent();
const toggleTodo = createEvent();

const $todoList = createStore([
  { text: "write useList example", done: true },
  { text: "update readme", done: false },
])
  .on(toggleTodo, (list, id) =>
    list.map((todo, i) => {
      if (i === id)
        return {
          ...todo,
          done: !todo.done,
        };
      return todo;
    }),
  )
  .on(addTodo, (list, e) => [
    ...list,
    {
      text: e.currentTarget.elements.content.value,
      done: false,
    },
  ]);

addTodo.watch((e) => {
  e.preventDefault();
});

const TodoList = () =>
  useList($todoList, ({ text, done }, i) => {
    const todo = done ? (
      <del>
        <span>{text}</span>
      </del>
    ) : (
      <span>{text}</span>
    );
    return <li onClick={() => toggleTodo(i)}>{todo}</li>;
  });
const App = () => (
  <div>
    <h1>todo list</h1>
    <form onSubmit={addTodo}>
      <label htmlFor="content">New todo</label>
      <input type="text" name="content" required />
      <input type="submit" value="Add" />
    </form>
    <ul>
      <TodoList />
    </ul>
  </div>
);
```

Запустить пример

#### Пример с конфигурацией

```jsx
import ReactDOM from "react-dom";
import { createEvent, createStore, restore } from "effector";
import { useUnit, useList } from "effector-react";

const renameUser = createEvent();
const $user = restore(renameUser, "alice");
const $friends = createStore(["bob"]);

const App = () => {
  const user = useUnit($user);
  return useList($friends, {
    keys: [user],
    fn: (friend) => (
      <div>
        {friend} is a friend of {user}
      </div>
    ),
  });
};

ReactDOM.render(<App />, document.getElementById("root"));
// => <div> bob is a friend of alice </div>

setTimeout(() => {
  renameUser("carol");
  // => <div> bob is a friend of carol </div>
}, 500);
```

Запустить пример


# useProvidedScope

Низкоуровневый Реакт хук, который возвращает текущий Scope из Provider.

> WARNING Это низкоуровневый API:
>
> Хук `useProvidedScope` это низкоуровневый API для разработчиков библиотек и не предназначен для использования в продакшен коде напрямую.
>
> Для использования `effector-react` в продакшен коде используейте хук useUnit.

### `useProvidedScope()`

#### Возвращает

* Scope или `null`, если `Scope` не передан.

#### Пример

Этот хук может быть использован внутри библиотеки для обработки различных крайних случаев, где также необходимы `createWatch` и `scopeBind`.

Для продакшен кода используйте useUnit хук.

```tsx
const useCustomLibraryInternals = () => {
  const scope = useProvidedScope();

  // ...
};
```


# useStore

> WARNING Устаревшее API :
>
> Рекомендуется использовать хук useUnit.

Реакт-хук, который подписывается на стор и возвращает его текущее значение, поэтому при обновлении стора, компонент также будет автоматически обновлён

```ts
useStore(store: Store<T>): T
```

**Аргументы**

1. `store`: Store

**Возвращает**

(*`State`*): Значение из стора

#### Пример

```jsx
import { createStore, createApi } from "effector";
import { useStore } from "effector-react";

const $counter = createStore(0);

const { increment, decrement } = createApi($counter, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
});

const App = () => {
  const counter = useStore($counter);
  return (
    <div>
      {counter}
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
};
```

Запустить пример


# useStoreMap

Реакт-хук, который подписывается на стор и трансформирует его значение с переданной функцией. Компонент будет обновляться только когда результат функции будет отличаться от предыдущего

Типичный вариант использования: подписаться на изменения отдельного поля в сторе

```ts
useStoreMap<State, Result>(
  store: Store<State>,
  fn: (state: State) => Result
): Result
```

> INFO:
>
> Краткая форма `useStoreMap` добавлена в `effector-react@21.3.0`

**Аргументы**

1. `store`: Используемый стор
2. `fn` (*(state) => result*): Функция-селектор

**Возвращает**

(*Result*)

```ts
useStoreMap<Source, Result>({
  store: Store<Source>;
  keys: any[];
  fn: (state: Source, keys: any[]) => Result;
  updateFilter?: (newResult: Result, oldResult: Result) => boolean;
  defaultValue?: Result;
}): Result
```

Перегрузка для случаев, когда требуется передать зависимости в React (для обновления элементов при изменении этих зависимостей)

**Аргументы**

1. `params` (*Object*): Объект конфигурации
    * `store`: Используемый стор
    * `keys` (*Array*): Массив, который будет передан в React.useMemo
    * `fn` (*(state, keys) => result*): Функция-селектор
    * `updateFilter` (*(newResult, oldResult) => boolean*): *Опционально* функция, используемая для сравнения старого и нового результата работы хука, предназначено для избежания лишних ререндеров. Реализация опции для работы использует createStore updateFilter
    * `defaultValue`: Опциональное значение по умолчанию, используется когда `fn` возвращает undefined

**Возвращает**

(*Result*)

> INFO:
>
> Опция `updateFilter` добавлена в `effector-react@21.3.0`

> INFO:
>
> Опция `defaultValue` добавлена в `effector-react@22.1.0`

##### Пример

Этот хук полезен для работы со списками, особенно с большими

```jsx
import { createStore } from "effector";
import { useUnit, useStoreMap } from "effector-react";

const data = [
  {
    id: 1,
    name: "Yung",
  },
  {
    id: 2,
    name: "Lean",
  },
  {
    id: 3,
    name: "Kyoto",
  },
  {
    id: 4,
    name: "Sesh",
  },
];

const $users = createStore(data);
const $ids = createStore(data.map(({ id }) => id));

const User = ({ id }) => {
  const user = useStoreMap({
    store: $users,
    keys: [id],
    fn: (users, [userId]) => users.find(({ id }) => id === userId),
  });

  return (
    <div>
      <strong>[{user.id}]</strong> {user.name}
    </div>
  );
};

const UserList = () => {
  const ids = useUnit($ids);
  return ids.map((id) => <User key={id} id={id} />);
};
```

Запустить пример


# useUnit

React hook, который принимает любой юнит (стор, событие или эффект) или любой объект с юнитами в качестве значений.

В случае сторов этот хук подписывает компонент на предоставленный стор и возвращает его текущее значение, поэтому при обновлении стора компонент будет обновлен автоматически.

В случае событий или эффектов – привязка к текущему  для использования в обработчиках браузерных событий.
Только версия `effector-react/scope` работает таким образом, `useUnit` из `effector-react` является no-op для событий и не требует `Provider` с scope.

> INFO:
>
> Метод `useUnit` добавлен в effector-react 22.1.0

### `useUnit(unit)`

#### Arguments

1. `unit` Событие или эффект для привязки к скоупу.

**Returns**

(Function): Функция для запуска юнита в скоупе компонента

#### Example

```jsx
import { createEvent, createStore, fork } from "effector";
import { useUnit, Provider } from "effector-react";

const inc = createEvent();
const $count = createStore(0).on(inc, (x) => x + 1);

const App = () => {
  const [count, incFn] = useUnit([$count, inc]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => incFn()}>increment</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```

### `useUnit(store)`

#### Arguments

1. `store` ()

**Returns**

Текущее значение стора.

##### Example

```js
import { createStore, createApi } from "effector";
import { useUnit } from "effector-react";

const $counter = createStore(0);

const { increment, decrement } = createApi($counter, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
});

const App = () => {
  const counter = useUnit($counter);

  return (
    <div>
      {counter}
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
};
```

### `useUnit(shape)`

#### Arguments

1. `shape` Объект или массив содержащий любые (,  или )

**Returns**

(Объект или Массив):

* В случае событий и эффектов: функции с теми же именами или ключами в качестве аргумента для передачи обработчикам событий. Эти функции запустят события и эффекты в текущем скоупе. *Примечание: события или эффекты будут привязаны к скоупу **только**, если `useUnit` импортирован из `effector-react/scope`*.
* В случае сторов: текущее значение стора.

#### Example

```jsx
import { createStore, createEvent, fork } from "effector";
import { useUnit, Provider } from "effector-react";

const inc = createEvent();
const dec = createEvent();

const $count = createStore(0)
  .on(inc, (x) => x + 1)
  .on(dec, (x) => x - 1);

const App = () => {
  const count = useUnit($count);
  const handler = useUnit({ inc, dec });
  // or
  const [a, b] = useUnit([inc, dec]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => handler.inc()}>increment</button>
      <button onClick={() => handler.dec()}>decrement</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```


# Domain

*Domain (домен)* - это способ группировки и массовой обработки юнитов.

Домен может подписываться на создание события, эффекта, стор или вложенного домена с помощью методов `onCreateEvent`, `onCreateStore`, `onCreateEffect`, `onCreateDomain`.

Может использоваться для логирования или других сайд эффектов.

## Методы для создания юнитов

> INFO since:
>
> [effector 20.7.0](https://changelog.effector.dev/#effector-20-7-0)

### `createEvent(name?)`

#### Аргументы

1. `name`? (*string*): имя события

**Возвращает**

: Новое событие

### `createEffect(handler?)`

Создает эффект с переданным обработчиком

#### Аргументы

1. `handler`? (*Function*): функция для обработки вызова эффектов, также может быть установленна с помощью use(handler)

**Возвращает**

: Контейнер для асинхронных функций.

> INFO since:
>
> [effector 21.3.0](https://changelog.effector.dev/#effector-21-3-0)

### `createEffect(name?)`

#### Аргументы

1. `name`? (*string*): имя эффекта

**Возвращает**

: Контейнер для асинхронных функций.

### `createStore(defaultState)`

#### Аргументы

1. `defaultState` (*State*): дефолтное состояние стора

**Возвращает**

: Новый стор

### `createDomain(name?)`

#### Аргументы

1. `name`? (*string*): имя домена

**Возвращает**

: Новый домен

### `history`

Содержит изменяемый набор юнитов только для чтения внутри домена.

#### Формула

```ts
const { stores, events, domains, effects } = domain.history;
```

* Когда любой из юнитов создается внутри домена, он появляется в наборе с именем типа в порядке создания.

> INFO since:
>
> [effector 20.3.0](https://changelog.effector.dev/#effector-20-3-0)

```js
import { createDomain } from "effector";
const domain = createDomain();
const eventA = domain.event();
const $storeB = domain.store(0);
console.log(domain.history);
// => {stores: Set{storeB}, events: Set{eventA}, domains: Set, effects: Set}
```

Запустить пример

### Псевдонимы

#### `event(name?)`

Псевдоним для domain.createEvent

#### `effect(name?)`

Псевдоним для domain.createEffect

#### `store(defaultState)`

Псевдоним для domain.createStore

#### `domain(name?)`

Псевдоним для domain.createDomain

## Хуки доменов

### `onCreateEvent(hook)`

#### Формула

```ts
domain.onCreateEvent((event) => {});
```

* Функция переданная в `onCreateEvent` вызывается каждый раз, когда создается новое событие в `domain`
* Первый аргумент вызываемой функции `event`
* Результат вызова функции игнорируется

#### Аргументы

1. `hook` ([*Watcher*][_Watcher_]): Функция, которая принимает Event и будет вызвана во время каждого вызова domain.createEvent

**Возвращает**

[*Subscription*][_Subscription_]: Функция для отписки.

#### Пример

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateEvent((event) => {
  console.log("новое событие создано");
});

const a = domain.createEvent();
// => новое событие создано

const b = domain.createEvent();
// => новое событие создано
```

Запустить пример

### `onCreateEffect(hook)`

#### Формула

```ts
domain.onCreateEffect((effect) => {});
```

* Функция переданная в `onCreateEffect` вызывается каждый раз, когда создается новый эффект в `domain`
* Первый аргумент вызываемой функции `effect`
* Результат вызова функции игнорируется

#### Аргументы

1. `hook` ([*Watcher*][_Watcher_]): Функция, которая принимает Effect и будет вызвана во время каждого вызова domain.createEffect

**Возвращает**

[*Subscription*][_Subscription_]: Функция для отписки.

#### Пример

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateEffect((effect) => {
  console.log("новый эффект создан");
});

const fooFx = domain.createEffect();
// => новый эффект создан

const barFx = domain.createEffect();
// => новый эффект создан
```

Запустить пример

### `onCreateStore(hook)`

#### Формула

```ts
domain.onCreateStore(($store) => {});
```

* Функция переданная в `onCreateStore` вызывается каждый раз, когда создается новый стор в `domain`
* Первый аргумент вызываемой функции `$store`
* Результат вызова функции игнорируется

#### Аргументы

1. `hook` ([*Watcher*][_Watcher_]): Функция, которая принимает Store и будет вызвана во время каждого вызова domain.createStore

**Возвращает**

[*Subscription*][_Subscription_]: Функция для отписки.

#### Пример

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateStore((store) => {
  console.log("новый стор создан");
});

const $a = domain.createStore(null);
// => новый стор создан
```

Запустить пример

### `onCreateDomain(hook)`

#### Формула

```ts
domain.onCreateDomain((domain) => {});
```

* Функция переданная в `onCreateDomain` вызывается каждый раз, когда создается новый поддомен в `domain`
* Первый аргумент вызываемой функции `domain`
* Результат вызова функции игнорируется

#### Аргументы

1. `hook` ([*Watcher*][_Watcher_]): Функция, которая принимает Domain и будет вызвана во время каждого вызова domain.createDomain

**Возвращает**

[*Subscription*][_Subscription_]: Функция для отписки.

#### Пример

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateDomain((domain) => {
  console.log("новый домен создан");
});

const a = domain.createDomain();
// => новый домен создан

const b = domain.createDomain();
// => новый домен создан
```

Запустить пример

[_watcher_]: /ru/explanation/glossary#watcher

[_subscription_]: /ru/explanation/glossary#subscription


# Effect API

[eventTypes]: /ru/api/effector/Event#event-types

[storeTypes]: /ru/essentials/typescript#store-types

## Effect API

```ts
import { type Effect, createEffect } from "effector";

const effectFx = createEffect();
```

Эффект – это контейнер для сайд-эффектов, как синхронных, так и асинхронных. В комплекте имеет ряд заранее созданных событий и сторов, облегчающих стандартные действия. Является юнитом.

Эффекты можно вызывать как обычные функции (*императивный вызов*) а также подключать их и их свойства в различные методы api включая sample, и split (*декларативное подключение*).

> TIP эффективный эффект:
>
> Если вы не знакомы с эффектами и способами работы с ними, то вам сюда Асинхронность в effector с помощью эффектов.

### Интерфейс Effect

Доступные методы и свойства событий:
| <div style="width:170px">Метод/Свойство</div> | Описание |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| use(handler) | Заменяет обработчик эффекта на новую функцию `handler`. |
| use.getCurrent() | Возвращает текущий обработчик эффекта. |
| watch(watcher) | Добавляет слушатель, вызывающий `watcher` при каждом вызове эффекта. |
| map(fn) | Создаёт новое [производное событие][eventTypes], срабатывает при вызове эффекта с результатом вызова `fn` для параметров эффекта. |
| prepend(fn) | Создаёт новое [событие][eventTypes] , трансформирующее входные данные через `fn` перед вызовом эффекта. |
| filterMap(fn) | Создаёт новое [производное событие][eventTypes], срабатывает при вызове эффекта с результатом `fn`, если тот не вернул `undefined`. |
| done | [Производное событие][eventTypes] `Event<{Params, Done}>`, срабатывающее при успешном завершении эффекта. |
| doneData | [Производное событие][eventTypes] `Event<Done>` с результатом успешного выполнения эффекта. |
| fail | [Производное событие][eventTypes] `Event<{Params, Fail}>`, срабатывающее при ошибке выполнения эффекта. |
| failData | [Производное событие][eventTypes] `Event<Fail>` с данными ошибки эффекта. |
| finally | [Производное событие][eventTypes] `Event<{Params, status, Done?, Fail?}>`, срабатывающее при любом завершении эффекта. |
| pending | [Производный стор][storeTypes] `Store<boolean>` со статусом выполнения эффекта (`true` во время выполнения). |
| inFlight | [Производный стор][storeTypes] `Store<number>` с количеством активных вызовов эффекта. |
| sid | Уникальный идентификатор юнита. |
| shortName | Свойство типа `string`, содержащее имя переменной, в которой объявлен эффект. |
| compositeName | Комплексное имя эффекта (включая домен и короткое имя) — удобно для логирования и трассировки. |

### Особенности эффекта

1. При императивном вызове всегда возвращают промис, отражающий ход выполнения сайд-эффекта.
2. Эффекты принимают только один аргумент, как и события.
3. Имеют встроенные сторы (pending, inFlight) и события (done, fail, finally и др.) для удобства работы.

### Методы эффектов

#### `.use(handler)`

> WARNING use - это антипаттерн:
>
> Если значение имплементации известно сразу, то оптимальнее использовать `createEffect(handler)`.
>
> Метод `use(handler)` – это антипаттерн, который ухудшает вывод типов.

Определяет имплементацию эффекта: функцию, которая будет вызвана при срабатывании. Используется для случаев когда имплементация не установлена при создании или когда требуется изменение поведения эффекта при тестировании.<br/>
Принимает аргумент `params`, который является данные, с которыми был вызван эффект.

> INFO use в приоритете:
>
> Если на момент вызова эффект уже имел имплементацию, то она будет заменена на новую.

* **Формула**

```ts
const fx: Effect<Params, Done>;
fx.use(handler);
```

* **Тип**

```ts
effect.use(handler: (params: Params) => Promise<Done> | Done): Effect<
  Params,
  Done,
  Fail
>
```

* **Примеры**

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect();

fetchUserReposFx.use(async ({ name }) => {
  console.log("fetchUserReposFx вызван для github пользователя", name);

  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

await fetchUserReposFx({ name: "zerobias" });
// => fetchUserReposFx вызван для github пользователя zerobias
```

Запустить пример

* **Возвращаемое значение**

Возвращает текущий эффект.

***

#### `.use.getCurrent()`

Метод для получения текущей имплементации эффекта. Используется для тестирования.

Если у эффекта ещё не была установлена имплементация, то будет возвращена функция по умолчанию, при срабатывании она выбрасывает ошибку.

* **Формула**

```ts
const fx: Effect<Params, Done>;
const handler = fx.use.getCurrent();
```

* **Тип**

```ts
effect.use.getCurrent(): (params: Params) => Promise<Done>
```

* **Примеры**

```js
const handlerA = () => "A";
const handlerB = () => "B";

const fx = createEffect(handlerA);

console.log(fx.use.getCurrent() === handlerA);
// => true

fx.use(handlerB);
console.log(fx.use.getCurrent() === handlerB);
// => true
```

Запустить пример

* **Возвращаемое значение**

Возвращает функцию-имплементацию эффекта, которая была установлена через createEffect или с помощью метода use.

***

#### `.watch(watcher)`

Вызывает дополнительную функцию с сайд-эффектами при каждом срабатывании эффекта. Не стоит использовать для логики, лучше заменить на sample.

* **Формула**

```ts
const fx: Effect<Params, Done>;
const unwatch = fx.watch(watcher);
```

* **Тип**

```ts
effect.watch(watcher: (payload: Params) => any): Subscription
```

* **Примеры**

```js
import { createEffect } from "effector";

const fx = createEffect((params) => params);

fx.watch((params) => {
  console.log("эффект вызван с аргументом", params);
});

await fx(10);
// => эффект вызван с аргументом 10
```

Запустить пример

* **Возвращаемое значение**

Функция отмены подписки, после её вызова `watcher` перестаёт получать обновления и удаляется из памяти.

***

#### `.map(fn)`

Метод `map` создает [производное событие][eventTypes]. Событие вызывается в момент выполнения эффекта, с теми же аргументами, что и у эффекта, и результатом, возвращаемым функцией `fn`. Работает по аналогии с Event.map(fn).

* **Формула**

```ts
const fx: Effect<Params, Done>;
const eventB = fx.map(fn);
```

* **Тип**

```ts
effect.map<T>(fn: (params: Params) => T): Event<T>
```

* **Примеры**

```ts
import { createEffect } from "effector";

interface User {
  // ...
}

const saveUserFx = createEffect(async ({ id, name, email }: User) => {
  // ...
  return response.json();
});

const userNameSaving = saveUserFx.map(({ name }) => {
  console.log("Начинаем сохранение пользователя: ", name);
  return name;
});

const savingNotification = saveUserFx.map(({ name, email }) => {
  console.log("Оповещение о сохранении");
  return `Сохранение пользователя: ${name} (${email})`;
});

// При вызове эффекта сработают оба производных события
await saveUserFx({ id: 1, name: "Иван", email: "ivan@example.com" });
// => Начинаем сохранение пользователя: Иван
// => Сохранение пользователя: Иван (ivan@example.com)
```

Запустить пример

* **Возвращаемое значение**

Возвращает новое [производное событие][eventTypes].

***

#### `.prepend(fn)`

Создаёт новое событие для преобразования данных *перед* запуском эффекта. По сравнению с map, работает в обратном направлении. Работает по аналогии с Event.prepend(fn).

* **Формула**

```ts
const fx: Effect<Params, Done>;
const trigger = fx.prepend(fn);
```

* **Тип**

```ts
effect.prepend<Before>(fn: (_: Before) => Params): EventCallable<Before>
```

* **Примеры**

```js
import { createEffect } from "effector";

const saveFx = createEffect(async (data) => {
  console.log('saveFx вызван с: 'data)
  await api.save(data);
});

// создаем событие-триггер для эффекта
const saveForm = saveFx.prepend((form) => ({
  ...form,
  modified: true
}));

saveForm({ name: "John", email: "john@example.com" });
// => saveFx вызван с : { name: "John", email: "john@example.com", modified: true }
```

* **Возвращаемое значение**

Возвращает новое [событие][eventTypes].

***

#### `.filterMap(fn)`

Метод `filterMap` создаёт [производное событие][eventTypes]. Вычисление функции `fn` запускается одновременно с эффектом, однако если функция возвращает `undefined`, событие не срабатывает. Работает аналогично методу .map(fn), но с фильтрацией по возвращаемому значению.

* **Формула**

```ts
const fx: Effect<Params, Done>;
const filtered = fx.filterMap(fn);
```

* **Тип**

```ts
effect.filterMap<T>(fn: (payload: Params) => T | undefined): Event<T>
```

* **Примеры**

```js
import { createEffect } from "effector";

const validateAndSaveFx = createEffect(async (userData) => {
  if (!userData.isValid) {
    throw new Error("Invalid data");
  }

  return await saveToDatabase(userData);
});

// Создаем событие только для валидных данных
const validDataProcessing = validateAndSaveFx.filterMap((userData) => {
  if (userData.isValid && userData.priority === "high") {
    return {
      id: userData.id,
      timestamp: Date.now(),
    };
  }
  // Если данные не валидны или приоритет не высокий, событие не сработает
});

validDataProcessing.watch(({ id, timestamp }) => {
  console.log(`Обработка высокоприоритетных данных ID: ${id} в ${timestamp}`);
});

// Примеры вызовов
await validateAndSaveFx({
  id: 1,
  isValid: true,
  priority: "high",
  role: "user",
});
// => Обработка высокоприоритетных данных ID: 1 в 1703123456789
```

* **Возвращаемое значение**

Возвращает новое [производное событие][eventTypes].

### Свойства эффектов

#### `.done`

[Производное событие][eventTypes], которое срабатывает с результатом выполнения эффекта и аргументом, переданным при вызове.

* **Тип**

```ts
interface Effect<Params, Done> {
  done: Event<{ params: Params; result: Done }>;
}
```

* **Примеры**

```js
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.done.watch(({ params, result }) => {
  console.log("Вызов с аргументом", params, "завершён со значением", result);
});

await fx(2);
// => Вызов с аргументом 2 завершён со значением 3
```

Запустить пример.

***

#### `.doneData`

[Производное событие][eventTypes], которое срабатывает с результатом успешного выполнения эффекта.

* **Тип**

```ts
interface Effect<any, Done> {
  doneData: Event<Done>;
}
```

* **Примеры**

```js
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.doneData.watch((result) => {
  console.log(`Эффект успешно выполнился, вернув ${result}`);
});

await fx(2);
// => Эффект успешно выполнился, вернув 3
```

Запустить пример.

***

#### `.fail`

[Производное событие][eventTypes], которое срабатывает с ошибкой, возникшей при выполнении эффекта и аргументом, переданным при вызове.

* **Тип**

```ts
interface Effect<Params, any, Fail> {
  fail: Event<{ params: Params; error: Fail }>;
}
```

* **Примеры**

```js
import { createEffect } from "effector";

const fx = createEffect(async (value) => {
  throw new Error(value - 1);
});

fx.fail.watch(({ params, error }) => {
  console.log("Вызов с аргументом", params, "завершился с ошибкой", error.message);
});

fx(2);
// => Вызов с аргументом 2 завершился с ошибкой 1
```

Запустить пример.

***

#### `.failData`

[Производное событие][eventTypes], которое срабатывает с ошибкой, возникшей при выполнении эффекта.

* **Тип**

```ts
interface Effect<any, any, Fail> {
  failData: Event<Fail>;
}
```

* **Примеры**

```js
import { createEffect } from "effector";

const fx = createEffect(async (value) => {
  throw new Error(value - 1);
});

fx.failData.watch((error) => {
  console.log(`Вызов завершился с ошибкой ${error.message}`);
});

fx(2);
// => Вызов завершился с ошибкой 1
```

Запустить пример.

***

#### `.finally`

[Производное событие][eventTypes], которое срабатывает как при успехе, так и в случае ошибки завершении эффекта с подробной информацией об аргументах, результатах и статусе выполнения.

* **Тип**

```ts
interface Effect<Params, Done, Fail> {
  finally: Event<
    | {
        status: "done";
        params: Params;
        result: Done;
      }
    | {
        status: "fail";
        params: Params;
        error: Fail;
      }
  >;
}
```

* **Примеры**

```js
import { createEffect } from "effector";

const fetchApiFx = createEffect(async ({ time, ok }) => {
  await new Promise((resolve) => setTimeout(resolve, time));

  if (ok) {
    return `${time} ms`;
  }

  throw Error(`${time} ms`);
});

fetchApiFx.finally.watch((value) => {
  switch (value.status) {
    case "done":
      console.log("Вызов с аргументом", value.params, "завершён со значением", value.result);
      break;
    case "fail":
      console.log("Вызов с аргументом", value.params, "завершён с ошибкой", value.error.message);
      break;
  }
});

await fetchApiFx({ time: 100, ok: true });
// => Вызов с аргументом {time: 100, ok: true} завершён со значением 100 ms

fetchApiFx({ time: 100, ok: false });
// => Вызов с аргументом {time: 100, ok: false} завершён с ошибкой 100 ms
```

Запустить пример.

***

#### `.pending`

[Производный стор][storeTypes], который показывает, что эффект находится в процессе выполнения.

* **Тип**

```ts
interface Effect<any, any> {
  pending: Store<boolean>;
}
```

* **Детальное описание**

Это свойство избавляет от необходимости писать подобный код:

```js
const $isRequestPending = createStore(false)
  .on(requestFx, () => true)
  .on(requestFx.done, () => false)
  .on(requestFx.fail, () => false);
```

* **Примеры**

```jsx
import React from "react";
import { createEffect } from "effector";
import { useUnit } from "effector-react";

const fetchApiFx = createEffect(async (ms) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
});

fetchApiFx.pending.watch(console.log);
// => false

const App = () => {
  const loading = useUnit(fetchApiFx.pending);
  return <div>{loading ? "Загрузка..." : "Загрузка завершена"}</div>;
};

fetchApiFx(1000);
// => true
// => false
```

Запустить пример.

***

#### `.inFlight`

[Производный стор][storeTypes], который показывает число запущенных эффектов, которые находятся в процессе выполнения. Может использоваться для ограничения числа одновременных запросов.

* **Тип**

```ts
interface Effect<any, any> {
  inFlight: Store<number>;
}
```

* **Детальное описание**

Это свойство избавляет от необходимости писать подобный код:

```js
const $requestsInFlight = createStore(0)
  .on(requestFx, (n) => n + 1)
  .on(requestFx.done, (n) => n - 1)
  .on(requestFx.fail, (n) => n - 1);
```

* **Примеры**

```js
import { createEffect } from "effector";

const fx = createEffect(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});

fx.inFlight.watch((amount) => {
  console.log("выполняется запросов:", amount);
});
// => выполняется запросов: 0

const req1 = fx();
// => выполняется запросов: 1

const req2 = fx();
// => выполняется запросов: 2

await Promise.all([req1, req2]);

// => выполняется запросов: 1
// => выполняется запросов: 0
```

Запустить пример.

***

#### `.sid`

Уникальный идентификатор юнита. Важно отметить, что SID не изменяется при каждом запуске приложения, он статически записывается в пакет вашего приложения для абсолютной идентификации юнитов. Задаётся автоматически через Babel plugin.

* **Тип**

```ts
interface Effect<any, any> {
  sid: string | null;
}
```

***

#### `.shortName`

Свойство типа `string`, содержащее имя переменной, в которой объявлен эффект. Имя эффекта. Задаётся либо явно, через поле `name` в createEffect, либо автоматически через babel plugin.

* **Тип**

```ts
interface Effect<any, any> {
  shortName: string;
}
```

***

#### `.compositeName`

Комплексное имя эффекта (включая домен и короткое имя) — удобно для логирования и трассировки.

* **Тип**

```ts
interface Effect<any, any> {
  compositeName: {
    shortName: string;
    fullName: string;
    path: Array<string>;
  };
}
```

* **Примеры**

```ts
import { createEffect, createDomain } from "effector";

const first = createEffect();
const domain = createDomain();
const second = domain.createEffect();

console.log(first.compositeName);
// {
//     "shortName": "first",
//     "fullName": "first",
//     "path": [
//         "first"
//      ]
// }

console.log(second.compositeName);
// {
//     "shortName": "second",
//     "fullName": "domain/second",
//     "path": [
//         "domain",
//         "second"
//      ]
// }
```

### Связанные API и статьи

* **API**
    * createEffect - Создание нового эффекта
    * Event API - Описание событий, его методов и свойств
    * Store API - Описание сторов, его методов и свойств
    * sample - Ключевой оператор для построения связей между юнитами
    * attach - Создает новые эффекты на основе других эффектов
* **Статьи**
    * Работа с эффектами
    * Как типизировать эффекты и не только
    * Гайд по тестированию эффектов и других юнитов


# Event

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Event API

```ts
import { type Event, type EventCallable, createEvent } from "effector";

const event = createEvent();
```

Событие в effector представляет действие пользователя, шаг в процессе приложения, команду к выполнению или намерение внести изменения и многое другое. <br/>
Событие служит как точка входа в реактивный поток данных — простой способ сказать приложению "что-то произошло".

> TIP это ваше каноничное событие:
>
> Если вы не знакомы с событиями и способами работы с ними, то вам сюда Что такое события и как работать с ними.

### Типы событий

Важно понять, что существуют два типа событий:

1. **Обычное событие**, которое создается с помощью createEvent, .prepend; эти события имеют тип EventCallable и могут быть вызваны, либо использованы в target метода sample.
2. **Производное событие**, который создается с помощью .map, .filter, .filterMap. Такие события имеют тип Event и их **нельзя вызывать или передавать в target**, effector сам вызовет их в нужном порядке, однако вы можете подписываться на эти события с помощью sample или watch.

### Интерфейс Event

Доступные методы и свойства событий:

| <div style="width:170px">Метод/Свойство</div>                            | Описание                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| prepend(fn) | Создаёт новое событие `EventCallable`, трансформируют входные данные через `fn` и передает в исходное событие. |
| map(fn)                                       | Создаёт новое событие типа `Event` с результатом вызова `fn` после срабатывания исходного события.             |
| filter({fn})                              | Создаёт новое событие типа `Event`, срабатывающий только если `fn` возвращает `true`.                          |
| filterMap(fn)                           | Создаёт событие типа `Event`, срабатывающий с результатом `fn`, если тот не вернул `undefined`.                |
| watch(watcher)                         | Добавляет слушатель, вызывающий `watcher` при каждом срабатывании события.                                     |
| subscribe(observer)               | Низкоуровневый метод для интеграции события со стандартным шаблоном `Observable`.                              |
| sid                                           | Уникальный идентификатор юнита (`unit`).                                                                       |
| shortName                               | Свойство типа `string`, содержащее имя переменной, в которой объявлено событие.                                |
| compositeName                       | Комплексное имя Event (включая домен и короткое имя) — удобно для логирования и трассировки.                   |

### Методы событий

#### `.prepend(fn)`

> INFO информация:
>
> Этот метод существует **только** для обычных событий (`EventCallable`)! Это значит что этот метод может использоваться только на событиях созданных с помощью createEvent.

Создает новое событие `EventCallable`, который можно вызвать. При его срабатывании вызвает `fn` и передает преобразованные данные в исходное событие.

* **Формула**

```ts
const second = first.prepend(fn);
```

* **Тип**

```ts
event.prepend<Before = void>(
  fn: (_: Before) => Payload
): EventCallable<Before>
```

* **Примеры**

```ts
import { createEvent } from "effector";

// исходное событие
const userPropertyChanged = createEvent();

const changeName = userPropertyChanged.prepend((name) => ({
  field: "name",
  value: name,
}));
const changeRole = userPropertyChanged.prepend((role) => ({
  field: "role",
  value: role.toUpperCase(),
}));

userPropertyChanged.watch(({ field, value }) => {
  console.log(`Свойство пользователя "${field}" изменилось на ${value}`);
});

changeName("john");
// => Свойство пользователя "name" изменилось на john

changeRole("admin");
// => Свойство пользователя "role" изменилось на ADMIN

changeName("alice");
// => Свойство пользователя "name" изменилось на alice
```

Открыть пример

Вы можете считать этот метод функцией-обёрткой. Допустим, у нас есть функция с неидеальным API, но нам нужно часто её вызывать:

```ts
import { sendAnalytics } from "./analytics";

export function reportClick(item: string) {
  const argument = { type: "click", container: { items: [arg] } };
  return sendAnalytics(argument);
}
```

Это именно то, как работает `.prepend()`:

```ts
import { sendAnalytics } from "./analytics";

export const reportClick = sendAnalytics.prepend((item: string) => {
  return { type: "click", container: { items: [arg] } };
});

reportClick("example");
// reportClick сработал "example"
// sendAnalytics сработал с { type: "click", container: { items: ["example"] } }
```

* **Детальное описание**

Работает как обратный .map. В случае `.prepend` данные преобразуются **до срабатывания** исходного события, а в случае .map данные преобразуются **после срабатывания**.

Если исходное событие принадлежит какому-либо домену, то новое событие также будет ему принадлежать.

* **Возвращаемое значение**

Возвращает новое событие `EventCallable`.

Ознакомьтесь со всеми другими методами в Event.

***

#### `.map(fn)`

Создает новое производное событие, которое будет вызвано после того, как будет вызвано исходное событие, используя результат функции `fn` в качестве его аргумента.

> INFO Чистота наше все!:
>
> Функция `fn` **должна быть чистой**.

* **Формула**

```ts
// Событие любого типа, как производное так и обычное
const first: Event<T> | EventCallable<T>;
const second: Event<F> = first.map(fn);
```

* **Тип**

```ts
event.map<T>(fn: (payload: Payload) => T): Event<T>
```

* **Примеры**

```ts
import { createEvent } from "effector";

const userUpdated = createEvent<{ name: string; role: string }>();

// вы можете разбить поток данных с помощью метода .map()
const userNameUpdated = userUpdated.map(({ user }) => name);

// либо преобразовать данные
const userRoleUpdated = userUpdated.map((user) => user.role.toUpperCase());

userNameUpdated.watch((name) => console.log(`Имя пользователя теперь [${name}]`));
userRoleUpdated.watch((role) => console.log(`Роль пользователя теперь [${role}]`));

userUpdated({ name: "john", role: "admin" });
// => Имя пользователя теперь [john]
// => Роль пользователя теперь [ADMIN]
```

Открыть пример

* **Детальное описание**

Метод `.map` позволяет вам разбивать и управлять потоком данных, а также извлекать или преобразовывать данные в рамках вашей модели бизнес-логики.

* **Возвращаемое значение**

Возвращает новое производное событие.

***

#### `.filter({ fn })`

> TIP совет:
>
> sample с аргументом `filter` является предпочтительным методом фильтрации:
>
> ```ts
> const event = createEvent();
>
> const filteredEvent = sample({
>   clock: event,
>   filter: () => true,
> });
> ```

Метод `.filter` генерирует новое производное событие, которое будет вызвано после исходного события,в случае если функция `fn` вернет `true`. Эта специальная функция позволяет вам разбить поток данных на ветви и подписаться на них в рамках модели бизнес-логики.<br />
Это очень удобно, если мы хотим на события которые срабатывают по условию.

* **Формула**

```ts
// Событие любого типа, как производное так и обычное
const first: Event<T> | EventCallable<T>;
const second: Event<T> = first.filter({ fn });
```

* **Тип**

```ts
event.filter(config: {
  fn(payload: Payload): boolean
}): Event<Payload>
```

* **Примеры**

<Tabs>
<TabItem label="😕 filter">

```js
import { createEvent, createStore } from "effector";

const numbers = createEvent();
const positiveNumbers = numbers.filter({
  fn: ({ x }) => x > 0,
});

const $lastPositive = createStore(0);

$lastPositive.on(positiveNumbers, (n, { x }) => x);

$lastPositive.watch((x) => {
  console.log("последнее положительное:", x);
});

// => последнее положительное: 0

numbers({ x: 0 });
// нет реакции

numbers({ x: -10 });
// нет реакции

numbers({ x: 10 });
// => последнее положительное: 10
```

<br />
[Открыть пример](https://share.effector.dev/H2Iu4iJH)

</TabItem>
<TabItem label="🤩 sample + filter">

```js
import { createEvent, createStore, sample } from "effector";

const numbers = createEvent();
const positiveNumbers = sample({
  clock: numbers,
  filter: ({ x }) => x > 0,
});

const $lastPositive = createStore(0);

$lastPositive.on(positiveNumbers, (n, { x }) => x);

$lastPositive.watch((x) => {
  console.log("последнее положительное:", x);
});

// => последнее положительное: 0

numbers({ x: 0 });
// нет реакции

numbers({ x: -10 });
// нет реакции

numbers({ x: 10 });
// => последнее положительное: 10
```

</TabItem>
</Tabs>

* **Возвращаемое значение**

Возвращает новое производное событие.

***

#### `.filterMap(fn)`

> TIP наш любимый sample:
>
> Этот метод также можно заменить на операцию sample с аргументами `filter` + `fn`:
>
> ```ts
> const event = createEvent();
>
> const filteredAndMappedEvent = sample({
>   clock: event,
>   filter: () => true,
>   fn: () => "value",
> });
> ```

Этот метод генерирует новое производное событие, которое **может быть вызвано** после исходного события, но с преобразованным аргументом. Этот специальный метод позволяет одновременно преобразовывать данные и фильтровать срабатывание события.

Этот метод наиболее полезен с API JavaScript, которые иногда возвращают `undefined`.

* **Формула**

```ts
// Событие любого типа, как производное так и обычное
const first: Event<T> | EventCallable<T>;
const second: Event<F> = first.filterMap(fn);
```

* **Тип**

```ts
event.filterMap<T>(fn: (payload: Payload) => T | undefined): Event<T>
```

* **Примеры**

```tsx
import { createEvent } from "effector";

const listReceived = createEvent<string[]>();

// Array.prototype.find() возвращает `undefined`, когда элемент не найден
const effectorFound = listReceived.filterMap((list) => {
  return list.find((name) => name === "effector");
});

effectorFound.watch((name) => console.info("найден", name));

listReceived(["redux", "effector", "mobx"]); // => найден effector
listReceived(["redux", "mobx"]);
```

> INFO Внимание:
>
> Функция `fn` должна возвращать некоторые данные. Если возвращается `undefined`, вызов производного события будет пропущено.

Открыть пример

* **Возвращаемое значение**

Возвращает новое производное событие.

***

#### `.watch(watcher)`

Метод `.watch` вызывается колбэк `watcher` каждый раз при срабатывании события.

> TIP Помните:
>
> Метод `watch` не обрабатывает и не сообщает о исключениях, не управляет завершением асинхронных операций и не решает проблемы гонки данных.
>
> Его основное предназначение — для краткосрочного отладки и логирования.

Подробнее в разделе изучения.

* **Формула**

```ts
// Событие любого типа, как производное так и обычное
const event: Event<T> | EventCallable<T>;
const unwatch: () => void = event.watch(fn);
```

* **Тип**

```ts
  event.watch(watcher: (payload: Payload) => any): Subscription
```

* **Примеры**

```js
import { createEvent } from "effector";

const sayHi = createEvent();
const unwatch = sayHi.watch((name) => console.log(`${name}, привет!`));

sayHi("Питер"); // => Питер, привет!
unwatch();

sayHi("Дрю"); // => ничего не произошло
```

Открыть пример

* **Возвращаемое значение**

Возвращает функцию для отмены подписки.

***

#### `.subscribe(observer)`

Это низкоуровневый метод для интеграции события со стандартным шаблоном `Observable`.

Подробнее:

* https://rxjs.dev/guide/observable
* https://github.com/tc39/proposal-observable

> INFO Помните:
>
> Вам не нужно использовать этот метод самостоятельно. Он используется под капотом движками рендеринга и так далее.

* **Формула**

```ts
const event = createEvent();

event.subscribe(observer);
```

* **Тип**

```ts
event.subscribe(observer: Observer<Payload>): Subscription
```

* **Примеры**

```ts
import { createEvent } from "effector";

const userLoggedIn = createEvent<string>();

const subscription = userLoggedIn.subscribe({
  next: (login) => {
    console.log("User login:", login);
  },
});

userLoggedIn("alice"); // => User login: alice

subscription.unsubscribe();
userLoggedIn("bob"); // ничего не произойдет
```

### Свойства

Этот набор свойств в основном задается с помощью effector/babel-plugin или @effector/swc-plugin. Таким образом, они существуют только при использовании Babel или SWC.

#### `.sid`

Это уникальный идентификатор для каждого события.

Важно отметить, что SID не изменяется при каждом запуске приложения, он статически записывается в пакет вашего приложения для абсолютной идентификации юнитов.

Это может быть полезно для отправки событий между рабочими или
сервером/браузером: [examples/worker-rpc](https://github.com/effector/effector/tree/master/examples/worker-rpc).

* **Тип**

```ts
interface Event {
  sid: string | null;
}
```

***

#### `.shortName`

Это свойство содержащее имя переменной, в которой объявлено событие.

```ts
import { createEvent } from "effector";

const demo = createEvent();
// demo.shortName === 'demo'
```

Но переопределение события в другую переменную ничего не изменит:

```ts
const another = demo;
// another.shortName === 'demo'
```

* **Тип**

```ts
interface Event {
  shortName: string;
}
```

***

#### `.compositeName`

Это свойство содержит полную внутреннюю цепочку юнитов. Например, событие может быть создано доменом, поэтому составное имя будет содержать имя домена внутри него.

> TIP Помните:
>
> Обычно, если требуется длинное имя, лучше передать его явно в поле `name`.

```ts
import { createEvent, createDomain } from "effector";

const first = createEvent();
const domain = createDomain();
const second = domain.createEvent();

console.log(first.compositeName);
// {
//     "shortName": "first",
//     "fullName": "first",
//     "path": [
//         "first"
//      ]
// }

console.log(second.compositeName);
// {
//     "shortName": "second",
//     "fullName": "domain/second",
//     "path": [
//         "domain",
//         "second"
//      ]
// }
```

* **Тип**

```ts
interface Event {
  compositeName: {
    shortName: string;
    fullName: string;
    path: Array<string>;
  };
}
```

### Особенности Event

1. В Effector любое событие поддерживает только **один аргумент**.
   Вызов события с двумя или более аргументами, как в случае `someEvent(first, second)`, будет игнорировать все аргументы кроме первого.
2. В методах событий нельзя вызывать другие события или эффекты - **функции должны быть чистыми**

### Связанные API и статьи

* **API**
    * createEvent - Создание нового события
    * createApi - Создание набора событий для стора
    * merge - Слияние событий в одно
    * sample - Ключевой оператор для построения связей между юнитами
* **Статьи**
    * Как работать с событиями
    * Как мыслить в effector и почему события важны
    * Гайд по типизации событий и юнитов


# Scope API

## Scope API

```ts
import { type Scope, fork } from "effector";

const scope = fork();
```

`Scope` — это полностью изолированный экземпляр приложения.
Основное назначение скоупа связано с SSR (Server-Side Rendering), но не ограничивается только этим случаем использования.
Скоуп содержит независимую копию всех юнитов (включая связи между ними), а также базовые методы для работы с ними.

> TIP скоуп важен:
>
> Если вы хотите глубже разобраться в скоупах, ознакомьтесь с отличной статьёй про изолированыне контексты.<br/>
> У нас также есть несколько гайдов связанных со скоупом:
>
> * Как исправить потерянный скоуп
> * Использование скоупов с SSR
> * Написание тестов

### Особенности скоупов

1. Существует несколько правил, которые нужно соблюдать, чтобы успешно работать со скоупом.
2. Скоуп можно потерять — чтобы этого избежать, используйте .

### Методы скоупа

#### `.getState($store)`

Возвращает значение стора в данном скоупе:

* **Формула**

```ts
const scope: Scope;
const $value: Store<T> | StoreWritable<T>;

const value: T = scope.getState($value);
```

* **Тип**

```ts
scope.getState<T>(store: Store<T>): T;
```

* **Возвращает**

Значение стора.

* **Пример**

Создадим два экземпляра приложения, вызовем события в каждом из них и проверим значение стора `$counter` в обоих случаях:

```js
import { createStore, createEvent, fork, allSettled } from "effector";

const inc = createEvent();
const dec = createEvent();
const $counter = createStore(0);

$counter.on(inc, (value) => value + 1);
$counter.on(dec, (value) => value - 1);

const scopeA = fork();
const scopeB = fork();

await allSettled(inc, { scope: scopeA });
await allSettled(dec, { scope: scopeB });

console.log($counter.getState()); // => 0
console.log(scopeA.getState($counter)); // => 1
console.log(scopeB.getState($counter)); // => -1
```

Попробовать.

### Связанные API и статьи

* **API**

    * scopeBind – Метод для привязки юнита к скоупу
    * fork – Оператор для создания скоупа
    * allSettled – Метод для вызова юнита в указанном скоупе и ожидания завершения всей цепочки эффектов
    * serialize – Метод для получения сериализованных значений сторов
    * hydrate – Метод для гидрации сериализованных данных

* **Статьи**

    * Что такое потеря скоупа и как её исправить
    * Использование скоупов с SSR
    * Как тестировать юниты


# Store API

## Store API

```ts
import { type Store, type StoreWritable, createStore } from "effector";

const $store = createStore();
```

*Store* — это объект, который хранит значение состояния. Обновление стора происходит когда новое значение не равно (`!==`) текущему, а также когда не равно `undefined` (если в конфигурации стора не указан `skipVoid:false`). Стор является Unit. Некоторые сторы могут быть производными.

> TIP Кто такой этот ваш стор?:
>
> Если вы еще не знакомы как работать со стором, то добро пожаловать сюда.

### Интерфейс стора

Доступные методы и свойства стора:

| Метод/Свойство                                         | Описание                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| map(fn)                           | Создает новый производный стор                                |
| on(trigger, reducer) | Обновление стейта c помощью `reducer`, когда вызван `trigger` |
| watch(watcher)             | Вызывает функцию `watcher` каждый раз, когда стор обновляется |
| reset(...triggers)        | Метод для сброса к начальному состоянию                       |
| off(trigger)                 | Удаляет подписку на указанный триггер                         |
| updates()                     | Событие срабатывающие при обновление стора                    |
| reinit()                       | Событие для реинициализации стора                             |
| shortName                   | ID или короткое имя store                                     |
| defaultState             | Начальное состояние стора                                     |
| getState()              | Возвращает текущий стейт                                      |

### Иммутабельность

Store в effector иммутабелен. Это значит, что обновления в нём будут происходить только если в функции-обработчике (например `combine`, `sample` или `on`) вернуть новый объект

Например, прежде чем использовать методы массива, нужно создать новую ссылку на него. Как правильно:

```ts
$items.on(addItem, (items, newItem) => {
  const updatedItems = [...items];
  // ✅ метод .push вызывается на новом массиве
  updatedItems.push(newItem);
  return updatedItems;
});
```

Так делать нельзя, обновления стора **не произойдёт**

```ts
$items.on(addItem, (items, newItem) => {
  // ❌ ошибка! Ссылка на массив осталась та же, обновления стора не произойдёт
  items.push(newItem);
  return items;
});
```

Обновление объектов происходит аналогичным образом

Сторы в effector должен быть размером как можно меньше, чтобы отвечать за конкретную часть в бизнес логике, в отличии от например redux стора, который имеет тенденцию к тому чтобы держать рядом всё и сразу. Когда состояние атомарное, то необходимости в спредах объектов становится меньше. Однако, если возникает потребность часто обновлять сильно вложенные данные, для обновления состояния допустимо применять [immer](https://immerjs.github.io/immer/produce) чтобы упростить повторяющийся код

### Методы стора

#### `.map(fn)`

Принимает функцию `fn` и возвращает производный стор, который автоматически обновляется, когда исходный стор изменяется.

* **Формула**

```ts
$source.map(fn, config?);
```

* **Тип**

```ts
const $derived = $source.map<T>(
  fn: (value: SourceValue) => T,
  config?: {
    skipVoid?: boolean
  }
): Store<T>
```

* **Примеры**

Базовое использование:

```ts
import { createEvent, createStore } from "effector";

const changed = createEvent<string>();

const $title = createStore("");
const $titleLength = $title.map((title) => title.length);

$title.on(changed, (_, newTitle) => newTitle);

$titleLength.watch((length) => {
  console.log("new length", length);
});

changed("hello");
changed("world");
changed("hello world");
```

Попробовать

Вторым аргументом можно передать объект конфига со значением `skipVoid:false`, тогда стор сможет принимать `undefined` значения:

```js
const $titleLength = $title.map((title) => title.length, { skipVoid: false });
```

* **Детальное описание**

Метод `map` вызывает переданную функцию `fn` с состоянием исходного стора в аргументе, каждый раз когда оригинальный стор обновляется.<br/>
Результат выполнения функции используется как значение стора.

* **Возвращаемое значение**

Возвращает новый производный стор.

#### `.on(trigger, reducer)`

Обновляет состояние используя reducer, при срабатывании `trigger`.

* **Формула**

```ts
$store.on(trigger, reducer);
```

* **Тип**

```ts
$store.on<T>(
  trigger: Unit<T> | Unit<T>[]
  reducer: (state: State, payload: T) => State | void
): this
```

* **Примеры**

```ts
import { createEvent, createStore } from "effector";

const $counter = createStore(0);
const incrementedBy = createEvent<number>();

$counter.on(incrementedBy, (value, incrementor) => value + incrementor);

$counter.watch((value) => {
  console.log("updated", value);
});

incrementedBy(2);
incrementedBy(2);
```

Попробовать

* **Возвращаемое значение**

Возвращает текущий стор.

#### `.watch(watcher)`

Вызывает функцию `watcher` каждый раз, когда стор обновляется.

* **Формула**

```ts
const unwatch = $store.watch(watcher);
```

* **Тип**

```ts
$store.watch(watcher: (state: State) => any): Subscription
```

* **Примеры**

```ts
import { createEvent, createStore } from "effector";

const add = createEvent<number>();
const $store = createStore(0);

$store.on(add, (state, payload) => state + payload);

$store.watch((value) => console.log(`current value: ${value}`));

add(4);
add(3);
```

Попробовать

* **Возвращаемое значение**

Возвращает функцию для отмены подписки.

#### `.reset(...triggers)`

Сбрасывает состояние стора до значения по умолчанию при срабатывании любого `trigger`.

* **Формула**

```ts
$store.reset(...triggers);
```

* **Тип**

```ts
$store.reset(...triggers: Array<Unit<any>>): this
```

* **Примеры**

```ts
import { createEvent, createStore } from "effector";

const increment = createEvent();
const reset = createEvent();

const $store = createStore(0)
  .on(increment, (state) => state + 1)
  .reset(reset);

$store.watch((state) => console.log("changed", state));

increment();
increment();
reset();
```

Попробовать

* **Возвращаемое значение**

Возвращает текущий стор.

#### `.off(trigger)`

Удаляет reducer для указанного `trigger`.

* **Формула**

```ts
$store.off(trigger);
```

* **Тип**

```ts
$store.off(trigger: Unit<any>): this
```

* **Примеры**

```ts
import { createEvent, createStore, merge } from "effector";

const changedA = createEvent();
const changedB = createEvent();

const $store = createStore(0);
const changed = merge([changedA, changedB]);

$store.on(changed, (state, params) => state + params);
$store.off(changed);
```

Попробовать

* **Возвращаемое значение**

Возвращает текущий стор.

### Свойства стора

#### `.updates`

Событие срабатывающие при обновление стора.

* **Примеры**

```ts
import { createStore, is } from "effector";

const $clicksAmount = createStore(0);
is.event($clicksAmount.updates); // true

$clicksAmount.updates.watch((amount) => {
  console.log(amount);
});
```

Попробовать

* **Возвращаемое значение**

Производное событие, представляющее обновления данного стора.

#### `.reinit`

Событие для реинициализации стора.

* **Примеры**

```ts
import { createStore, createEvent, sample, is } from "effector";

const $counter = createStore(0);
is.event($counter.reinit);

const increment = createEvent();

$counter.reinit();
console.log($counter.getState());
```

Попробовать

* **Возвращаемое значение**

Событие, которое может реинициализировать стор до значения по умолчанию.

#### `.shortName`

Cтроковое свойство, которое содержит ID или короткое имя стора.

* **Примеры**

```ts
const $store = createStore(0, {
  name: "someName",
});

console.log($store.shortName); // someName
```

Попробовать

* **Возвращаемое значение**

ID или короткое имя store.

#### `.defaultState`

Свойство, которое содержит значение состояния по умолчанию стора.

* **Пример**

```ts
const $store = createStore("DEFAULT");

console.log($store.defaultState === "DEFAULT"); // true
```

* **Возвращаемое значение**

Значение состояния по умолчанию.

### Вспомогательные методы

#### `.getState()`

Метод, который возвращает текущее состояние стора.

> WARNING Осторожно!:
>
> `getState()` не рекомендуется использовать в бизнес-логике - лучше передавать данные через `sample`.

* **Примеры**

```ts
import { createEvent, createStore } from "effector";

const add = createEvent<number>();

const $number = createStore(0).on(add, (state, data) => state + data);

add(2);
add(3);

console.log($number.getState());
```

Попробовать

* **Возвращаемое значение**

Текущее состояние стора.

### Связанные API

* createStore - Создает новый стор
* combine - Комбинирует несколько сторов и возращает новый производный стор
* sample - Ключевой оператор для построения связей между юнитами
* createEvent - Создает события
* createEffect - Создает эффекты


# allSettled

## Методы

### `allSettled(unit, {scope, params?})`

Вызывает предоставленный юнит в переданном скоупе и ожидает завершения всех запущенных юнитов.

#### Формула

```ts
allSettled<T>(unit: Event<T>, {scope: Scope, params?: T}): Promise<void>
allSettled<T>(unit: Effect<T, Done, Fail>, {scope: Scope, params?: T}): Promise<
  | {status: 'done'; value: Done}
  | {status: 'fail'; value: Fail}
>
allSettled<T>(unit: Store<T>, {scope: Scope, params?: T}): Promise<void>
```

#### Аргументы

1. `unit`:  или , который нужно вызвать.
2. `scope`:  — скоуп.
3. `params`: параметры, передаваемые в `unit`.

> INFO Обратите внимание:
>
> Возвращаемое значение для эффекта поддерживается с версии [effector 21.4.0](https://changelog.effector.dev/#effector-21-4-0).

#### Примеры

```ts
const scope = fork();
const event = createEvent<number>();

event.watch(console.log);

await allSettled(event, { scope, params: 123 }); // в консоль выведется 123
```

```ts
const scopeA = fork();
const scopeB = fork();

const $store = createStore(0);
const inc = createEvent<number>();

await allSettled($store, { scope: scopeA, params: 5 });
await allSettled($store, { scope: scopeB, params: -5 });

$store.watch(console.log);

await allSettled(inc, { scope: scopeA, params: 2 }); // в консоль выведется 7
await allSettled(inc, { scope: scopeB, params: 2 }); // в консоль выведется -3
```

### `allSettled(scope)`

Проверяет предоставленный скоуп на наличие текущих вычислений и ожидает их завершения.

#### Формула

```ts
allSettled<T>(scope): Promise<void>
```

#### Аргументы

1. `scope`:  — скоуп.

> INFO Начиная с:
>
> effector 22.5.0.

#### Примеры

##### Использование в тестах

Тесты, которые проверяют интеграцию с внешним реактивным API.

```ts
import {createEvent, sample, fork, scopeBind, allSettled} from 'effector'

test('интеграция с externalSource', async () => {
  const scope = fork()

  const updated = createEvent()

  sample({
    clock: updated,
    target: someOtherLogicStart,
  })

  // 1. Подписываем событие на внешний источник
  const externalUpdated = scopeBind(updated, {scope})
  externalSource.listen(() => externalUpdates())

  // 2. Запускаем обновление внешнего источника
  externalSource.trigger()

  // 3. Ожидаем завершения всех запущенных вычислений в области видимости effector, даже если они были запущены не самим effector
  await allSettled(scope)

  // 4. Проверяем что-либо как обычно
  expect(...).toBe(...)
})
```


# attach

```ts
import { attach } from "effector";
```

> INFO Начиная с:
>
> [effector 20.13.0](https://changelog.effector.dev/#effector-20-13-0).
>
> С версии [effector 22.4.0](https://changelog.effector.dev/#effector-encke-22-4-0) можно проверить, создан ли эффект через метод `attach` — is.attached.

Создает новые эффекты на основе других эффектов и сторов. Позволяет маппить параметры и обрабатывать ошибки.

Основные случаи использования: декларативный способ передачи значений из сторов в эффекты и предобработка аргументов. Наиболее полезный случай — `attach({ source, async effect })`.

> TIP Примечание:
>
> Прикрепленные эффекты являются такими же полноценными объектами, как и обычные эффекты, созданные через createEffect. Вы должны размещать их в тех же файлах, что и обычные эффекты, а также можете использовать ту же стратегию именования.

## Методы

### `attach({effect})`

> INFO Начиная с:
>
> [effector 21.5.0](https://changelog.effector.dev/#effector-21-5-0)

Создает эффект, который будет вызывать `effect` с переданными параметрами как есть. Это позволяет создавать отдельные эффекты с общим поведением.

#### Формула

```ts
const attachedFx = attach({ effect: originalFx });
```

* Когда `attachedFx` вызывается, `originalFx` также вызывается.
* Когда `originalFx` завершается (успешно/с ошибкой), `attachedFx` завершается с тем же состоянием.

#### Аргументы

* `effect` (): Обернутый эффект.

#### Возвращает

: Новый эффект.

#### Типы

```ts
const originalFx: Effect<Params, Done, Fail>;

const attachedFx: Effect<Params, Done, Fail> = attach({
  effect: originalFx,
});
```

В этом простом варианте `attach` типы `originalFx` и `attachedFx` будут одинаковыми.

#### Примеры

Это позволяет создать *локальную* копию эффекта, чтобы реагировать только на вызовы из текущего *локального* кода.

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((word: string) => {
  console.info("Напечатано:", word);
});

const attachedFx = attach({ effect: originalFx });

originalFx.watch(() => console.log("originalFx"));
originalFx.done.watch(() => console.log("originalFx.done"));

attachedFx.watch(() => console.log("attachedFx"));
attachedFx.done.watch(() => console.log("attachedFx.done"));

originalFx("первый");
// => originalFx
// => Напечатано: первый
// => originalFx.done

attachedFx("второй");
// => attachedFx
// => originalFx
// Напечатано: второй
// => originalFx.done
// => attachedFx.done
```

Запустить пример

### `attach({source, effect})`

Создает эффект, который будет вызывать указанный эффект с данными из `source` стора.

#### Формула

```ts
const attachedFx = attach({
  source,
  effect: originalFx,
});
```

* Когда `attachedFx` вызывается, данные из `source` читаются, и `originalFx` вызывается с этими данными.
* Когда `originalFx` завершается, то же состояние (успех/ошибка) передается в `attachedFx`, и он завершается.

#### Аргументы

* `source` ( | `{[key: string]: Store}`): Стор или объект с сторами, значения которых будут переданы во второй аргумент `mapParams`.
* `effect` (): Исходный эффект.

#### Возвращает

: Новый эффект.

#### Типы

> TIP Примечание:
>
> Вам не нужно явно указывать типы для каждого объявления. Следующий пример предназначен для лучшего понимания.

В большинстве случаев вы будете писать код так, без явных типов для `let`/`const`:

```ts
const originalFx = createEffect<OriginalParams, SomeResult, SomeError>(async () => {});
const $store = createStore(initialValue);

const attachedFx = attach({
  source: $store,
  effect: originalFx,
});
```

##### Один стор

```ts
const originalFx: Effect<T, Done, Fail>;
const $store: Store<T>;

const attachedFx: Effect<void, Done, Fail> = attach({
  source: $store,
  effect: originalFx,
});
```

[Попробуйте в песочнице TypeScript](https://tsplay.dev/NBJDDN)

Типы стора в `source` и параметров `effect` должны совпадать.
Но `attachedFx` будет опускать тип параметров, что означает, что прикрепленный эффект не требует никаких параметров.

##### Объект стора

```ts
const originalFx: Effect<{ a: A; b: B }, Done, Fail>;
const $a: Store<A>;
const $b: Store<B>;

const attachedFx: Effect<void, Done, Fail> = attach({
  source: { a: $a, b: $b },
  effect: originalFx,
});
```

[Попробуйте в песочнице TypeScript](https://tsplay.dev/mbE58N)

Типы объекта `source` должны совпадать с параметрами `originalFx`. Но `attachedFx` будет опускать тип параметров, что означает, что прикрепленный эффект не требует никаких параметров.

#### Примеры

```ts
import { createEffect, createStore, attach } from "effector";

const requestPageFx = createEffect<{ page: number; size: number }, string[]>(
  async ({ page, size }) => {
    console.log("Запрошено", page);
    return page * size;
  },
);

const $page = createStore(1);
const $size = createStore(20);

const requestNextPageFx = attach({
  source: { page: $page, size: $size },
  effect: requestPageFx,
});

$page.on(requestNextPageFx.done, (page) => page + 1);

requestPageFx.doneData.watch((position) => console.log("requestPageFx.doneData", position));

await requestNextPageFx();
// => Запрошено 1
// => requestPageFx.doneData 20

await requestNextPageFx();
// => Запрошено 2
// => requestPageFx.doneData 40

await requestNextPageFx();
// => Запрошено 3
// => requestPageFx.doneData 60
```

Запустить пример

### `attach({source, async effect})`

> INFO Начиная с:
>
> [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

Создает эффект, который будет вызывать асинхронную функцию с данными из `source` стора.

#### Формула

```ts
const attachedFx = attach({
  source,
  async effect(source, params) {},
});
```

* Когда `attachedFx` вызывается, данные из `source` читаются, и вызывается функция `effect`.
* Когда функция `effect` возвращает успешный `Promise`, `attachedFx` завершается с данными из функции как `attachedFx.done`.
* Когда функция `effect` выбрасывает исключение или возвращает отклоненный `Promise`, `attachedFx` завершается с данными из функции как `attachedFx.fail`.

#### Аргументы

* `effect` (*Function*): `(source: Source, params: Params) => Promise<Result> | Result`
* `source` ( | `{[key: string]: Store}`): Стор или объект с сторами, значения которых будут переданы в первый аргумент `effect`.

#### Возвращает

: Новый эффект.

#### Использование с областью видимости

Любые эффекты, вызванные внутри функции `async effect`, будут распространять область видимости.

```ts
const outerFx = createEffect((count: number) => {
  console.log("Попадание", count);
});

const $store = createStore(0);
const attachedFx = attach({
  source: $store,
  async effect(count, _: void) {},
});
```

**Область видимости теряется**, если есть любые асинхронные вызовы функций:

```ts
const attachedFx = attach({
  source: $store,
  async effect(source) {
    // Здесь всё в порядке, эффект вызывается
    const resultA = await anotherFx();

    // Будьте осторожны:
    const resultB = await regularFunction();
    // Здесь область видимости потеряна.
  },
});
```

Чтобы решить эту проблему, просто оберните вашу `regularFunction` в эффект:

```ts
const regularFunctionFx = createEffect(regularFunction);
```

#### Типы

##### Один стор

```ts
const $store: Store<T>;

const attachedFx: Effect<Params, Done, Fail> = attach({
  source: $store,
  async effect(source, params: Params): Done | Promise<Done> {},
});
```

Вам нужно явно указать только аргумент `params`. Все остальные типы аргументов должны быть выведены автоматически. Также вы можете явно указать тип возвращаемого значения функции `effect`.

Если вы хотите удалить любые аргументы из `attachedFx`, просто удалите второй аргумент из функции `effect`:

```ts
const attachedFx: Effect<void, void, Fail> = attach({
  source: $store,
  async effect(source) {},
});
```

##### Несколько сторов

> TIP Примечание:
>
> Для подробностей ознакомьтесь с предыдущим разделом типов. Здесь та же логика.

```ts
// Пример пользовательского кода без явных объявлений типов
const $foo = createStore(100);
const $bar = createStore("demo");

const attachedFx = attach({
  source: { foo: $foo, bar: $bar },
  async effect({ foo, bar }, { baz }: { baz: boolean }) {
    console.log("Попадание!", { foo, bar, baz });
  },
});

attachedFx({ baz: true });
// => Попадание! { foo: 100, bar: "demo", baz: true }
```

[Попробуйте в песочнице TypeScript](https://tsplay.dev/m3xjbW)

#### Пример

> WARNING TBD:
>
> Пожалуйста, создайте pull request через ссылку "Edit this page".

### `attach({effect, mapParams})`

Создает эффект, который будет вызывать указанный эффект, преобразуя параметры с помощью функции `mapParams`.

#### Формула

```ts
const attachedFx = attach({
  effect: originalFx,
  mapParams,
});
```

* Когда `attachedFx` вызывается, параметры передаются в функцию `mapParams`, затем результат передается в `originalFx`.
* Когда `originalFx` завершается, `attachedFx` завершается с тем же состоянием (успех/ошибка).
* Если `mapParams` выбрасывает исключение, `attachedFx` завершается с ошибкой как `attachedFx.fail`. Но `originalFx` не будет вызван.

#### Аргументы

* `effect` (): Обернутый эффект.
* `mapParams` (`(newParams) => effectParams`): Функция, которая принимает новые параметры и преобразует их в параметры для обернутого `effect`. Работает аналогично event.prepend. Ошибки в функции `mapParams` приведут к завершению прикрепленного эффекта с ошибкой.

#### Возвращает

: Новый эффект.

#### Типы

```ts
const originalFx: Effect<A, Done, Fail>;

const attachedFx: Effect<B, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (params: B): A {},
});
```

`mapParams` должна возвращать тот же тип, который принимает `originalFx` в качестве параметров.

Если `attachedFx` должен вызываться без аргументов, то `params` можно безопасно удалить из `mapParams`:

```ts
const attachedFx: Effect<void, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (): A {},
});
```

[Попробуйте в песочнице TypeScript](https://tsplay.dev/wXOYoW)

Но если функция `mapParams` выбрасывает исключение, вам нужно самостоятельно проверять совместимость типов, так как TypeScript не поможет.

```ts
const attachedFx: Effect<void, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (): A {
    throw new AnyNonFailType(); // Это может быть несовместимо с типом `Fail`.
  },
});
```

#### Примеры

##### Преобразование аргументов

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((a: { input: number }) => a);

const attachedFx = attach({
  effect: originalFx,
  mapParams(a: number) {
    return { input: a * 100 };
  },
});

originalFx.watch((params) => console.log("originalFx started", params));

attachedFx(1);
// => originalFx { input: 100 }
```

Запустить пример

##### Обработка исключений

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((a: { a: number }) => a);

const attachedFx = attach({
  effect: originalFx,
  mapParams(a: number) {
    throw new Error("custom error");
    return { a };
  },
});

attachedFx.failData.watch((error) => console.log("attachedFx.failData", error));

attachedFx(1);
// => attachedFx.failData
// =>   Error: custom error
```

Запустить пример

### `attach({source, mapParams, effect})`

Создает эффект, который будет читать значения из `source` стора, передавать их с параметрами в функцию `mapParams`, а затем вызывать `effect` с результатом.

#### Формула

> TIP Примечание:
>
> Этот вариант `attach` работает аналогично attach({effect, mapParams}). Поэтому некоторые вещи опущены в этом разделе.

```ts
const attachedFx = attach({
  source,
  mapParams,
  effect: originalFx,
});
```

* Когда `attachedFx` вызывается, параметры передаются в функцию `mapParams` вместе с данными из `source`, затем результат передается в `originalFx`.
* Когда `originalFx` завершается, `attachedFx` завершается с тем же состоянием (успех/ошибка).
* Если `mapParams` выбрасывает исключение, `attachedFx` завершается с ошибкой как `attachedFx.fail`. Но `originalFx` не будет вызван.

#### Аргументы

* `source` ( | `{[key: string]: Store}`): Стор или объект с сторами, значения которых будут переданы во второй аргумент `mapParams`.
* `mapParams` (`(newParams, values) => effectParams`): Функция, которая принимает новые параметры и текущее значение `source` и объединяет их в параметры для обернутого `effect`. Ошибки в функции `mapParams` приведут к завершению прикрепленного эффекта с ошибкой.
* `effect` (): Обернутый эффект.

#### Возвращает

: Новый эффект.

#### Типы

> WARNING TBD:
>
> Пожалуйста, создайте pull request через ссылку "Edit this page".

#### Примеры

##### С фабрикой

```ts
// ./api/request.ts
import { createEffect, createStore } from "effector";

export const backendRequestFx = createEffect(async ({ token, data, resource }) => {
  return fetch(`https://example.com/api${resource}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
});

export const $requestsSent = createStore(0);

$requestsSent.on(backendRequestFx, (total) => total + 1);
```

```ts
// ./api/authorized.ts
import { attach, createStore } from "effector";

const $token = createStore("guest_token");

export const authorizedRequestFx = attach({
  effect: backendRequestFx,
  source: $token,
  mapParams: ({ data, resource }, token) => ({ data, resource, token }),
});

export function createRequest(resource) {
  return attach({
    effect: authorizedRequestFx,
    mapParams: (data) => ({ data, resource }),
  });
}
```

```ts
// ./api/index.ts
import { createRequest } from "./authorized";
import { $requestsSent } from "./request";

const getUserFx = createRequest("/user");
const getPostsFx = createRequest("/posts");

$requestsSent.watch((total) => {
  console.log(`Аналитика клиента: отправлено ${total} запросов`);
});

const user = await getUserFx({ name: "alice" });
/*
POST https://example.com/api/user
{"name": "alice"}
Authorization: Bearer guest_token
*/

// => Аналитика клиента: отправлено 1 запросов

const posts = await getPostsFx({ user: user.id });
/*
POST https://example.com/api/posts
{"user": 18329}
Authorization: Bearer guest_token
*/

// => Аналитика клиента: отправлено 2 запросов
```

Чтобы фабрика работала корректно, добавьте путь к `./api/authorized` в опцию `factories` для Babel плагина:

```json5
// .babelrc
{
  plugins: [
    [
      "effector/babel-plugin",
      {
        factories: ["src/path-to-your-entity/api/authorized"],
      },
    ],
  ],
}
```

### Параметры

`attach()` также принимает дополнительные параметры, которые можно использовать при необходимости.

#### `name`

```ts
attach({ name: string });
```

Позволяет явно задать имя созданного прикрепленного эффекта:

```ts
import { attach } from "effector";

const attachedFx = attach({
  name: "anotherUsefulName",
  source: $store,
  async effect(source, params: Type) {
    // ...
  },
});

attachedFx.shortName; // "anotherUsefulName"
```

Этот параметр доступен в **любом варианте** `attach`.

#### `domain`

```ts
attach({ domain: Domain });
```

Позволяет создать эффект внутри указанного домена.

> Примечание: это свойство может использоваться только с обычной функцией `effect`.

```ts
import { createDomain, createStore, attach } from "effector";

const reportErrors = createDomain();
const $counter = createStore(0);

const attachedFx = attach({
  domain: reportErrors,
  source: $counter,
  async effect(counter) {
    // ...
  },
});
```


# Babel плагин

Встроенный плагин для Babel может использоваться для SSR и отладки. Он добавляет имя юнита,
выведенное из имени переменной, и `sid` (Стабильный Идентификатор), вычисленный из местоположения в исходном коде.

Например, в случае эффектов без обработчиков, это улучшает сообщения об ошибках,
показывая, в каком именно эффекте произошла ошибка.

```js
import { createEffect } from "effector";

const fetchFx = createEffect();

fetchFx();

// => no handler used in fetchFx
```

Запустить пример

## Использование

В простейшем случае его можно использовать без какой-либо конфигурации:

```json
// .babelrc
{
  "plugins": ["effector/babel-plugin"]
}
```

## SID

> INFO Начиная с:
>
> [effector 20.2.0](https://changelog.effector.dev/#effector-20-2-0)

Стабильный хэш-идентификатор для событий, эффектов, сторов и доменов, сохраняемый между окружениями, для обработки взаимодействия клиент-сервер
в рамках одной кодовой базы.

Ключевое значение sid заключается в том, что он может быть автоматически сгенерирован `effector/babel-plugin` с конфигурацией по умолчанию, и он будет стабильным между сборками.

> TIP Подробное объяснение:
>
> Если вам нужно подробное объяснение о том, зачем нужны SID и как они используются внутри, вы можете найти его, перейдя по этой ссылке

Смотрите [пример проекта](https://github.com/effector/effector/tree/master/examples/worker-rpc)

```js
// common.js
import { createEffect } from "effector";

export const getUser = createEffect({ sid: "GET /user" });
console.log(getUsers.sid);
// => GET /user
```

```js
// worker.js
import { getUsers } from "./common.js";

getUsers.use((userID) => fetch(userID));

getUsers.done.watch(({ result }) => {
  postMessage({ sid: getUsers.sid, result });
});

onmessage = async ({ data }) => {
  if (data.sid !== getUsers.sid) return;
  getUsers(data.userID);
};
```

```js
// client.js
import { createEvent } from "effector";
import { getUsers } from "./common.js";

const onMessage = createEvent();

const worker = new Worker("worker.js");
worker.onmessage = onMessage;

getUsers.use(
  (userID) =>
    new Promise((rs) => {
      worker.postMessage({ sid: getUsers.sid, userID });
      const unwatch = onMessage.watch(({ data }) => {
        if (data.sid !== getUsers.sid) return;
        unwatch();
        rs(data.result);
      });
    }),
);
```

## Конфигурация

### `hmr`

> INFO Начиная с:
>
> [effector 23.4.0](https://changelog.effector.dev/#effector-23.4.0)

Включите поддержку Hot Module Replacement (HMR) для очистки связей, подписок и побочных эффектов, управляемых Effector. Это предотвращает двойное срабатывание эффектов и подписок

> WARNING Взаимодействие с фабриками:
>
> Поддержка HMR показывает наилучшие результаты когда все фабрики в проекте правильно описаны, это помогает плагину и рантайму понимать, какой код нужно удалять при обновлении

#### Формула

```json
"effector/babel-plugin",
  {
    "hmr": "es"
  }
]
```

* Тип: `boolean` | `"es"` | `"cjs"`
    * `true`: Использует API HMR с автоопределением необходимого варианта работы. Работает на базе функциональности бабеля [supportsStaticESM](https://babeljs.io/docs/options#caller), которая широко поддерживается в сборщиках
    * `"es"`: Использует API HMR `import.meta.hot` в сборщиках, соответствующих ESM, таких как Vite и Rollup
    * `"cjs"`: Использует API HMR `module.hot` в сборщиках, использующих CommonJS модули, таких как Webpack, Next.js и React Native
    * `false`: Отключает Hot Module Replacement.
* По умолчанию: `false`

> INFO Сборка для продакшна:
>
> При сборке для продакшена убедитесь, что задали опции `hmr` значение `false` или удалили опцию полностью, чтобы уменьшить размер бандла и улучшить производительность в runtime.

### `importName`

Указание имени или имен импорта для обработки плагином. Импорт должен использоваться в коде как указано.

#### Формула

```json
[
  "effector/babel-plugin",
  {
    "importName": ["effector"]
  }
]
```

* Тип: `string | string[]`
* По умолчанию: `['effector', 'effector/compat']`

### `factories`

Принимает массив имен модулей, экспорты которых рассматриваются как пользовательские фабрики, поэтому каждый вызов функции предоставляет уникальный префикс для sids юнитов внутри них. Используется для
SSR (серверный рендеринг) и не требуется для клиентских приложений.

> INFO с:
>
> [effector 21.6.0](https://changelog.effector.dev/#effector-21-6-0)

#### Формула

```json
[
  "effector/babel-plugin",
  {
    "factories": ["path/here"]
  }
]
```

* Тип: `string[]`
* Фабрики могут иметь любое количество аргументов.
* Фабрики могут создавать любое количество юнитов.
* Фабрики могут вызывать любые методы effector.
* Фабрики могут вызывать другие фабрики из других модулей.
* Модули с фабриками могут экспортировать любое количество функций.
* Фабрики должны быть скомпилированы с `effector/babel-plugin`, как и код, который их использует.

#### Примеры

```json
// .babelrc
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
        "factories": ["src/createEffectStatus", "~/createCommonPending"]
      }
    ]
  ]
}
```

```js
// ./src/createEffectStatus.js
import { rootDomain } from "./rootDomain";

export function createEffectStatus(fx) {
  const $status = rootDomain.createStore("init").on(fx.finally, (_, { status }) => status);

  return $status;
}
```

```js
// ./src/statuses.js
import { createEffectStatus } from "./createEffectStatus";
import { fetchUserFx, fetchFriendsFx } from "./api";

export const $fetchUserStatus = createEffectStatus(fetchUserFx);
export const $fetchFriendsStatus = createEffectStatus(fetchFriendsFx);
```

Импорт `createEffectStatus` из `'./createEffectStatus'` рассматривался как фабричная функция, поэтому каждый стор, созданный ею,
имеет свой собственный sid и будет обрабатываться serialize
независимо, хотя без `factories` они будут использовать один и тот же `sid`.

### `reactSsr`

Заменяет импорты из `effector-react` на `effector-react/scope`. Полезно для сборки как серверных, так и клиентских
сборок из одной кодовой базы.

> WARNING Устарело:
>
> С [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) команда разработчиков рекомендует удалить эту опцию из конфигурации `babel-plugin`, потому что effector-react поддерживает SSR по умолчанию.

#### Формула

```json
[
  "effector/babel-plugin",
  {
    "reactSsr": false
  }
]
```

* Тип: `boolean`
* По умолчанию: `false`

### `addNames`

Добавляет имя к вызовам фабрик юнитов. Полезно для минификации и обфускации production сборок.

> INFO Начиная с:
>
> [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

#### Формула

```json
[
  "effector/babel-plugin",
  {
    "addNames": true
  }
]
```

* Тип: `boolean`
* По умолчанию: `true`

### `addLoc`

Добавляет местоположение к вызовам методов. Используется devtools, например [effector-logger](https://github.com/effector/logger).

#### Формула

```json
[
  "effector/babel-plugin",
  {
    "addLoc": false
  }
]
```

* Тип: `boolean`
* По умолчанию: `false`

### `debugSids`

Добавляет путь к файлу и имя переменной определения юнита к sid. Полезно для отладки SSR.

#### Формула

```json
[
  "effector/babel-plugin",
  {
    "debugSids": false
  }
]
```

* Тип: `boolean`
* По умолчанию: `false`

### `noDefaults`

Опция для `effector/babel-plugin` для создания пользовательских фабрик юнитов с чистой конфигурацией.

> INFO с:
>
> [effector 20.2.0](https://changelog.effector.dev/#effector-20-2-0)

#### Формула

```json
[
  "effector/babel-plugin",
  {
    "noDefaults": false
  }
]
```

* Тип: `boolean`
* По умолчанию: `false`

#### Примеры

```json
// .babelrc
{
  "plugins": [
    ["effector/babel-plugin", { "addLoc": true }],
    [
      "effector/babel-plugin",
      {
        "importName": "@lib/createInputField",
        "storeCreators": ["createInputField"],
        "noDefaults": true
      },
      "createInputField"
    ]
  ]
}
```

```js
// @lib/createInputField.js
import { createStore } from "effector";
import { resetForm } from "./form";

export function createInputField(defaultState, { sid, name }) {
  return createStore(defaultState, { sid, name }).reset(resetForm);
}
```

```js
// src/state.js
import { createInputField } from "@lib/createInputField";

const foo = createInputField("-");
/*

будет обработано как создатель стор и скомпилировано в

const foo = createInputField('-', {
  name: 'foo',
  sid: 'z&si65'
})

*/
```

## Использование со сборщиками

### Vite + React (SSR)

Для использования с `effector/babel-plugin`, необходимо выполнить следующие шаги:

1. Установите пакет `@vitejs/plugin-react`.
2. `vite.config.js` должен выглядеть следующим образом:

> Примечание: `effector/babel-plugin` не является отдельным пакетом, он входит в состав `effector`

```js
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["effector/babel-plugin"],
        // Использовать .babelrc файлы
        babelrc: true,
        // Использовать babel.config.js файлы
        configFile: true,
      },
    }),
  ],
});
```


# clearNode

Низкоуровневый метод для уничтожения юнитов и их связей

### Формула

```ts
clearNode(unit: Unit): void
clearNode(unit: Unit, config: {deep?: boolean}): void
```

#### Аргументы

1. **`unit`**: Любой юнит включая домены и scope. Переданный юнит будет уничтожен и удалён из памяти
2. **`config?`**: Объект конфигурации

    * **`deep?`**: *boolean*

      Глубокое удаление. Уничтожает юнит и *все* его производные

#### Возвращает

*void*

### Примеры

#### Пример удаления стора

```js
import { createStore, createEvent, clearNode } from "effector";

const inc = createEvent();
const store = createStore(0).on(inc, (x) => x + 1);
inc.watch(() => console.log("inc called"));
store.watch((x) => console.log("store state: ", x));
// => store state: 0
inc();
// => inc called
// => store state: 1
clearNode(store);
inc();
// => inc called
```

Запустить пример

#### Пример с deep

```js
import { createStore, createEvent, clearNode } from "effector";

const inc = createEvent();
const trigger = inc.prepend(() => {});
const store = createStore(0).on(inc, (x) => x + 1);
trigger.watch(() => console.log("trigger called"));
inc.watch(() => console.log("inc called"));
store.watch((x) => console.log("store state: ", x));
// => store state: 0
trigger();
// => trigger called
// => inc called
// => store state: 1
clearNode(trigger, { deep: true });
trigger();
// no reaction
inc();
// no reaction!
// all units, which depend on trigger, are erased
// including inc and store, because it depends on inc
```

Запустить пример


# combine

import LiveDemo from "../../../../../components/LiveDemo.jsx";

Этот метод позволяет получить состояние из каждого переданного сторов и комбинировать их в одно значение, сохраняя в новом производном сторе.
Полученный стор будет обновляться каждый раз, как обновляется любой из переданных сторов

Если несколько сторов обновятся одновременно, то метод обработает их всех разом, то есть `combine` батчит обновления, что приводит к более эффективной работе без излишних вычислений

> WARNING Внимание:
>
> `combine` возвращает не просто обычный стор, он возвращает производный стор, который нельзя изменять через события или использовать в качестве `target` в sample.

## Общая формула

```ts
declare const $a: Store<A>;
declare const $b: Store<B>;

// Трансформация состояний

const $c: Store<C> = combine({ a: $a, b: $b }, (values: { a: A; b: B }) => C);

const $c: Store<C> = combine([$a, $b], (values: [A, B]) => C);

const $c: Store<C> = combine($a, $b, (a: A, b: B) => C);

// Комбинирование состояний

const $c: Store<{ a: A; b: B }> = combine({ a: $a, b: $b });

const $c: Store<[A, B]> = combine([$a, $b]);
```

## Преобразование состояния

Когда в `combine` передается функция, она будет действовать как функция трансформации состояния и вызываться при каждом обновлении `combine`.
Результат будет сохранен в созданном сторе. Эта функция должна быть .

Функция `combine` вызывается синхронно во время вызова `combine`. Если эта функция вызовет ошибку, приложение завершится сбоем. Это будет исправлено в [24 релизе](https://github.com/effector/effector/issues/1163).

### `combine(...stores, fn)`

#### Формула

```ts
const $a: Store<A>
const $b: StoreWritable<B>
const $c: Store<C> | StoreWritable<C>

$result: Store<D> = combine(
  $a, $b, $c, ...,
  (a: A, b: B, c: C, ...) => result
)
```

* После вызова `combine` состояние каждого стор извлекается и передается в качестве аргументов функции, результат вызова функции станет состоянием стор `$result`.
* В `combine` можно передавать любое количество сторов, но последним аргументом всегда должна быть функция-редуктор, возвращающая новое состояние.
* Если функция вернула то же значение `result`, что и предыдущее, стор `$result` не будет обновлен.
* Если несколько сторов обновляются одновременно (за один тик), будет единый вызов функции и единое обновление стора `$result`.
* Функция должна быть .

#### Возвращает

: Новый производный стор.

#### Примеры

import demo\_combineStoresFn from "../../../../demo/combine/stores-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineStoresFn} />

### `combine({ A, B, C }, fn)`

#### Формула

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<D> = combine(
  { a: $a, b: $b, c: $c },
  ({ a, b, c }: { a: A; b: B; c: C }): D => result,
);
```

* Читает состояние из сторов `$a`, `$b`, `$c` и присваивает его соответствующим полям `a`, `b`, `c`, затем вызывает функцию с этим объектом.
* Результат вызова функции сохраняется в сторе `$result`.
* Если функция вернула то же значение `result`, что и предыдущее, стор `$result` не будет обновлен.
* Если несколько сторов обновляются одновременно (за один тик), будет единый вызов функции и единое обновление стор `$result`.
* Функция должна быть .

#### Возвращает

: Новый производный стор.

#### Примеры

import demo\_combineObjectFn from "../../../../demo/combine/object-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineObjectFn} />

### `combine([ A, B, C ], fn)`

#### Формула

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<D> = combine([$a, $b, $c], ([A, B, C]): D => result);
```

* Читает состояние из сторов `$a`, `$b`, `$c` и присваивает его массиву в том порядке, в котором сторы были переданы, затем вызывает функцию с этим массивом.
* Результат вызова функции сохраняется в сторе `$result`.
* Если функция вернула то же значение `result`, что и предыдущее, стор `$result` не будет обновлен.
* Если несколько сторов обновляются одновременно (за один тик), будет единый вызов функции и единое обновление стор `$result`.
* Функция должна быть .

#### Возвращает

: Новый производный стор.

#### Примеры

import demo\_combineArrayFn from "../../../../demo/combine/array-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineArrayFn} />

## Комбинирование состояний

Когда в `combine` не передается функция, он действует как комбинатор состояний, создавая стор с массивом или объектом, содержащим поля переданных сторов.

### `combine({ A, B, C })`

> INFO:
>
> Ранее известен как `createStoreObject`.

#### Формула

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<{ a: A; b: B; c: C }> = combine({ a: $a, b: $b, c: $c });
```

* Читает состояние из сторов `$a`, `$b`, `$c` и присваивает его соответствующим полям `a`, `b`, `c`, этот объект сохраняется в сторе `$result`.
* Стор `$result` содержит объект `{a, b, c}` и будет обновляться при каждом обновлении переданных сторов.
* Если несколько сторов обновляются одновременно (за один тик), будет единое обновление стор `$result`.

#### Возвращает

: Новый производный стор.

#### Примеры

import demo\_combineObject from "../../../../demo/combine/object.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineObject} />

### `combine([ A, B, C ])`

#### Формула

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<[A, B, C]> = combine([$a, $b, $c]);
```

* Читает состояние из сторов `$a`, `$b`, `$c` и присваивает его массиву в том порядке, в котором сторы были переданы, этот массив сохраняется в сторе `$result`.
* Стор `$result` будет обновляться при каждом обновлении переданных сторов.
* Если несколько сторов обновляются одновременно (за один тик), будет единое обновление стор `$result`.

#### Возвращает

: Новый производный стор.

#### Примеры

import demo\_combineArray from "../../../../demo/combine/array.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineArray} />

## `combine` с примитивами и объектами

Примитивы и объекты могут использоваться в `combine`, и `combine` не будет реагировать на их

изменения. Effector не отслеживает мутации объектов и примитивов.

#### Примеры

import demo\_combineNonStoresFn from "../../../../demo/combine/non-stores-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineNonStoresFn} />

## Параметры

Все перегрузки `combine` с функцией поддерживают опциональный объект конфигурации в качестве последнего параметра.

### `.skipVoid`

Флаг для контроля обработки значений `undefined` в сторе *(начиная с версии `effector 23.0.0`)*. Если установить в `false`, стор будет использовать `undefined` как значение. Если установить в `true` (устарело), стор будет интерпретировать `undefined` как команду «пропустить обновление» и ничего не делать.

#### Формула

```ts
combine($a, $b, callback, { skipVoid: true });
```

* Тип: `boolean`

#### Примеры

```js
const $withFn = combine($a, $b, (a, b) => a || b, { skipVoid: false });
```


# createApi

Способ массового создания событий-команд для обновления стора на основе объекта с функциями-обработчиками. Если стор принадлежит какому-либо домену, то новые события также будут принадлежать ему

### Формула

```ts
declare const $store: Store<T>; // управляемый стор

const api: {
  event1: Event<S>; // созданное событие-команда
  event2: Event<Q>; // созданное событие-команда
} = createApi(
  /*store*/ $store,
  /*handlers*/ {
    event1: /*handler*/ (state: T, data: S) => T,
    event2: /*handler*/ (state: T, data: Q) => T,
  },
);
```

#### Аргументы

1. **`store`**: Стор, чьим значением требуется управлять
2. **`handlers`**: Объект с функциями-обработчиками, на каждую функцию будет создано по событию

   **`handler`**: `(state: T, data: S) => T`

   Функция-обработчик, которая будет вычислять новое состояние `стора` на основе его предыдущего состояния и данных, отправленных в полученное событие-команду, должна быть&#x20;

   **Аргументы**

    * **`state`**: Текущее состояние стора
    * **`data`**: Значение, с которым было вызвано событие

   **Возвращает**

   Новое значение для хранения в `сторе`. Если функция возвращает undefined или текущее состояние стора, то обновления не будет

#### Возвращает

Объект с событиями, по событию на каждый переданный обработчик

### Примеры

#### Управление позицией игрока

```js
import { createStore, createApi } from "effector";

const playerPosition = createStore(0);

const api = createApi(playerPosition, {
  moveLeft: (pos, n) => pos - n,
  moveRight: (pos, n) => pos + n,
});

playerPosition.watch((pos) => {
  console.log("position", pos);
});
// => position 0

api.moveRight(10);
// => position 10

api.moveLeft(5);
// => position 5
```

Запустить пример


# createDomain

Метод для создания доменов

```typescript
createDomain(name?)
```

**Аргументы**

1. `name`? (*string*): имя домена

**Возвращает**

: Новый домен

#### Пример

```js
import { createDomain } from "effector";

const domain = createDomain(); // безымянный домен
const httpDomain = createDomain("http"); // именованный домен

const statusCodeChanged = httpDomain.createEvent();
const downloadFx = httpDomain.createEffect();
const apiDomain = httpDomain.createDomain(); // вложенный домен
const $data = httpDomain.createStore({ status: -1 });
```

Запустить пример


# createEffect

## createEffect

```ts
import { createEffect } from "effector";

const effectFx = createEffect();
```

Метод для создания эффектов. Возвращает новый эффект.

### Способы создания эффектов

Метод `createEffect` поддерживает несколько способов создания эффектов:

1. С обработчиком - это самый простой способ.
2. С конфигурацией.
3. А также без обработчика, его можно будет задать позже с помощью метода .use(handler).

#### С обработчиком

* **Тип**

```ts
createEffect<Params, Done, Fail = Error>(
  handler: (params: Params) => Done | Promise<Done>,
): Effect<Params, Done, Fail>
```

* **Пример**

```ts
import { createEffect } from "effector";

const fetchUserReposFx = createEffect(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

fetchUserReposFx.done.watch(({ params, result }) => {
  console.log(result);
});

await fetchUserReposFx({ name: "zerobias" });
```

#### С конфигурацией

Поле `name` используется для улучшения сообщений об ошибках и отладки.

* **Тип**

```ts
export function createEffect<Params, Done, Fail = Error>(config: {
  name?: string;
  handler?: (params: Params) => Promise<Done> | Done;
}): Effect<Params, Done, Fail>;
```

* **Пример**

```ts
import { createEffect } from "effector";

const fetchUserReposFx = createEffect({
  name: "fetch user repositories",
  async handler({ name }) {
    const url = `https://api.github.com/users/${name}/repos`;
    const req = await fetch(url);
    return req.json();
  },
});

await fetchUserReposFx({ name: "zerobias" });
```

#### Без обработчика

Чаще всего используется для тестов. Более подробная информация.

> WARNING use - это антипаттерн:
>
> Старайтесь не использовать `.use()`, так как это является антипаттерном и ухудшает вывод типов.

* **Пример**

```ts
import { createEffect } from "effector";

const fetchUserReposFx = createEffect();

fetchUserReposFx.use(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

await fetchUserReposFx({ name: "zerobias" });
```

### Примеры

* **Изменение состояния по завершению эффекта**:

```ts
import { createStore, createEffect } from "effector";

interface Repo {
  // ...
}

const $repos = createStore<Repo[]>([]);

const fetchUserReposFx = createEffect(async (name: string) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

$repos.on(fetchUserReposFx.doneData, (_, repos) => repos);

$repos.watch((repos) => {
  console.log(`${repos.length} repos`);
});
// => 0 репозиториев

await fetchUserReposFx("zerobias");
// => 26 репозиториев
```

Запустить пример

* **Наблюдение за состоянием эффекта**:

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

fetchUserReposFx.pending.watch((pending) => {
  console.log(`effect is pending?: ${pending ? "yes" : "no"}`);
});

fetchUserReposFx.done.watch(({ params, result }) => {
  console.log(params); // {name: 'zerobias'}
  console.log(result); // разрешенное значение, результат
});

fetchUserReposFx.fail.watch(({ params, error }) => {
  console.error(params); // {name: 'zerobias'}
  console.error(error); //  отклоненное значение, ошибка
});

fetchUserReposFx.finally.watch(({ params, status, result, error }) => {
  console.log(params); // {name: 'zerobias'}
  console.log(`handler status: ${status}`);

  if (error) {
    console.log("handler rejected", error);
  } else {
    console.log("handler resolved", result);
  }
});

await fetchUserReposFx({ name: "zerobias" });
```

Запустить пример

### Основные ошибки

Ниже приведен список возможных ошибок, с которыми вы можете столкнуться при работе с эффектами:

* no handler used in \[effect name]

### Связанные API и статьи

* **API**
    * Effect API - Описание эффектов, его методов и свойств
    * sample - Ключевой оператор для построения связей между юнитами
    * attach - Создает новые эффекты на основе других эффектов
* **Статьи**
    * Работа с эффектами
    * Как типизировать эффекты и не только
    * Гайд по тестированию эффектов и других юнитов


# createEvent

## createEvent

```ts
import { createEvent } from "effector";

const event = createEvent();
```

Метод для создания [событий][eventApi].

### Формула

```ts
createEvent<E = void>(eventName?: string): EventCallable<E>
createEvent<E = void>(config: {
  name?: string
  sid?: string
  domain?: Domain
}): EventCallable<E>
```

* **Аргументы**

    * `eventName`: Опциональный аргумент. Имя события для отладки.
    * `config`: Опциональный аргумент. Объект конфигурации.

        * `name`: Имя события.
        * `sid`: Стабильный идентификатор для SSR.
        * `domain`: Домен для события.

* **Возвращаемое значение**

Возвращает новое вызываемое [событие][eventTypes].

### Примеры

Обновление состояния с помощью вызова события:

```js
import { createStore, createEvent } from "effector";

const addNumber = createEvent();

const $counter = createStore(0);

$counter.on(addNumber, (state, number) => state + number);

$counter.watch((state) => {
  console.log("state", state);
});
// => 0

addNumber(10);
// => 10

addNumber(10);
// => 20

addNumber(10);
// => 30
```

Запустить пример

Мы создали событие `addNumber` и стор `$counter`, после чего подписались на обновления стора.<br/>
Обратите внимание на вызов функции `addNumber(10)`. Всякий раз, когда вы будете вызывать `addNumber(10)`, вы можете посмотреть в консоль и увидеть, как меняется состояние.

Обработка данных с помощью производных событий:

```js
import { createEvent } from "effector";

const extractPartOfArray = createEvent();
const array = extractPartOfArray.map((arr) => arr.slice(2));

array.watch((part) => {
  console.log(part);
});
extractPartOfArray([1, 2, 3, 4, 5, 6]);
// => [3, 4, 5, 6]
```

Запустить пример

### Основные ошибки

Ниже приведён список возможных ошибок, с которыми вы можете столкнуться при работе с событиями:

* call of derived event is not supported, use createEvent instead
* unit call from pure function is not supported, use operators like sample instead

### Связанные API и статьи

* **API**
    * [`Event API`][eventApi] - API стора, его методы, свойства и описание
    * [`createApi`][createApi] - Создание набора событий для стора
    * [`merge`][merge] - Метод для объединения массива юнитов в одно новое событие
    * [`sample`][sample] - Связывание событий с другими юнитами
* **Статьи**
    * [Как работать с событиями][eventGuide]
    * [Как мыслить в effector и почему события важны][mindset]
    * [Гайд по типизации событий и других юнитов][typescript]

[eventApi]: /ru/api/effector/Event

[eventTypes]: /ru/api/effector/Event#event-types

[merge]: /ru/api/effector/merge

[eventGuide]: /ru/essentials/events

[mindset]: /ru/resources/mindset

[mindset]: /ru/resources/mindset

[typescript]: /ru/essentials/typescript

[sample]: /ru/api/effector/sample

[createApi]: /ru/api/effector/createApi


# createStore

## createStore

```ts
import { createStore } from "effector";

const $store = createStore();
```

Метод для создания [стора][storeApi].

### Формула

```ts
createStore(
  defaultState: State, // Исходное состояние стора
  config?: { // Объект конфигурации с дополнительными опциями
    skipVoid?: boolean; // Контролирует обновления со значением undefined
    name?: string; // Имя стора для отладки
    sid?: string // Стабильный идентификатор для SSR
    updateFilter?: (update: State, current: State) => boolean // Функция фильтрации обновлений
    serialize?: // Конфигурация сериализации для SSR
    | 'ignore'
    | {
        write: (state: State) => SerializedState
        read: (json: SerializedState) => State
      }
    domain?: Domain; // Домен, к которому принадлежит стор
  },
): StoreWritable<State>
```

* **Аргументы**

1. **`defaultState`**: Исходное состояние
2. **`config`**: Опциональный объект конфигурации

    * **`skipVoid`**: Опциональный аргумент. Определяет пропускает ли [стор][storeApi] `undefined` значения. По умолчанию `true`. В случае если передать в стор, у которого `skipVoid:true`, значение `undefined`, тогда вы получите [ошибку в консоль][storeUndefinedError].<br/><br/>

    * **`name`**: Опциональный аргумент. Имя стора. [Babel-plugin][babel] может определить его из имени переменной стора, если имя не передано явно в конфигурации.<br/><br/>

    * **`sid`**: Опциональный аргумент. Уникальный идентификатор стора. [Он используется для различения сторов между разными окружениями][storeSid]. При использовании [Babel-plugin][babel] проставляется автоматически.<br/><br/>

    * **`updateFilter`**:
      Опциональный аргумент. [Чистая функция][pureFn], которая предотвращает обновление стора, если она возвращает `false`. Следует использовать для случаев, когда стандартного запрета на обновление (если значение, которое предполагается записать в стор, равняется `undefined` или текущему значению стора) недостаточно. Если вызывать юниты внутри, то можно столкнуться с [ошибкой][unitCallError].

      <br/>

    * **`serialize`**: Опциональный аргумент отвечающий за сериализацию стора.

        * `'ignore'`: исключает стор из сериализации при вызовах [serialize][serialize].
        * Объект с методами `write` и `read` для кастомной сериализации. `write` вызывается при вызове serialize и приводит состояние стор к JSON-значению – примитив или простой объект/массив. `read` вызывается при fork, если предоставленные `values` – результат вызова [serialize][serialize].

* **Возвращаемое значение**

Возвращает новый [стор][storeApi].

### Примеры

Базовое использование стора:

```js
import { createEvent, createStore } from "effector";

const addTodo = createEvent();
const clearTodos = createEvent();

const $todos = createStore([])
  .on(addTodo, (todos, newTodo) => [...todos, newTodo])
  .reset(clearTodos);

const $selectedTodos = $todos.map((todos) => {
  return todos.filter((todo) => !!todo.selected);
});

$todos.watch((todos) => {
  console.log("todos", todos);
});
```

Запустить пример

Пример с кастомной конфигурацией `serialize`:

```ts
import { createEvent, createStore, serialize, fork, allSettled } from "effector";

const saveDate = createEvent();
const $date = createStore<null | Date>(null, {
  // Объект Date автоматически приводится в строку ISO-даты при вызове JSON.stringify
  // но не приводится обратно к Date при вызове JSON.parse – результатом будет та же строка ISO-даты
  // Это приведет к расхождению состояния стора при гидрации состояния на клиенте при серверном рендеринге
  //
  // Кастомная конфигурация `serialize` решает эту проблему
  serialize: {
    write: (dateOrNull) => (dateOrNull ? dateOrNull.toISOString() : dateOrNull),
    read: (isoStringOrNull) => (isoStringOrNull ? new Date(isoStringOrNull) : isoStringOrNull),
  },
}).on(saveDate, (_, p) => p);

const serverScope = fork();

await allSettled(saveDate, { scope: serverScope, params: new Date() });

const serverValues = serialize(serverScope);
// `serialize.write` стор `$date` был вызван

console.log(serverValues);
// => { nq1e2rb: "2022-11-05T15:38:53.108Z" }
// Объект Date из стора сохранен как ISO-дата

const clientScope = fork({ values: serverValues });
// `serialize.read` стор `$date` был вызван

const currentDate = clientScope.getState($date);
console.log(currentDate);
// => Date 11/5/2022, 10:40:13 PM
// Строка ISO-даты приведена обратно к объекту Date
```

Запустить пример

### Типичные ошибки

Ниже приведен список возможных ошибок, с которыми вы можете столкнуться при работе со сторами:

* [`store: undefined is used to skip updates. To allow undefined as a value provide explicit { skipVoid: false } option`][storeUndefinedError].
* [`serialize: One or more stores dont have sids, their values are omitted`][serializeError].
* [`unit call from pure function is not supported, use operators like sample instead`][unitCallError].

### Связанные API и статьи

* **API**
    * [`Store API`][storeApi] - API стора, его методы, свойства и описание
    * [`createApi`][createApi] - Создание набора событий для стора
    * [`combine`][combine] - Создание нового стора на основе других сторов
    * [`sample`][sample] - Связывание сторов с другими юнитами
* **Статьи**
    * [Как управлять состоянием][storeGuide]
    * [Гайд по работе с SSR][ssr]
    * [Что такое SID и зачем они нужны сторам][storeSid]
    * [Как типизировать сторы и другие юниты][typescript]

[storeApi]: /ru/api/effector/Store

[storeUndefinedError]: /ru/guides/troubleshooting#store-undefined

[storeSid]: /ru/explanation/sids

[ssr]: /ru/guides/server-side-rendering

[storeGuide]: /ru/essentials/manage-states

[combine]: /ru/api/effector/combine

[sample]: /ru/api/effector/sample

[createApi]: /ru/api/effector/createApi

[serialize]: /ru/api/effector/serialize

[typescript]: /ru/essentials/typescript

[babel]: /ru/api/effector/babel-plugin

[pureFn]: /ru/explanation/glossary/#purity

[unitCallError]: /ru/guides/troubleshooting#unit-call-from-pure-not-supported

[serializeError]: /ru/guides/troubleshooting/#store-without-sid


# createWatch

Создает подписку на юнит (store, ивент или эффект).

```ts
createWatch<T>(config: {
  unit: Unit<T>
  fn: (payload: T) => void
  scope?: Scope
}): Subscription
```

**Аргументы**

1. `config` (*Object*): Конфигурация
    * `unit` (*Unit*): Целевой юнит (store, ивент или эффект), за которым нужно наблюдать
    * `fn` (*Function*): Функция, которая будет вызываться при каждом обновлении юнита. Первым аргументом получает содержимое обновления.
    * `scope` (): Опциональный скоуп. Если передан, то функция будет вызываться только при обновлении юнита именно на этом скоупе.

**Возвращает**

: Функция отмены подписки

##### Пример (со скоупом)

```js
import { createWatch, createEvent, fork, allSettled } from "effector";

const changeName = createEvent();

const scope = fork();

const unwatch = createWatch({ unit: changeName, scope, fn: console.log });

await allSettled(changeName, { scope, params: "Иван" }); // output: Иван
changeName("Иван"); // no output
```

##### Пример (без скоупа)

```js
import { createWatch, createEvent, fork, allSettled } from "effector";

const changeName = createEvent();

const scope = fork();

const unwatch = createWatch({ unit: changeName, fn: console.log });

await allSettled(changeName, { scope, params: "Иван" }); // output: Иван
changeName("Иван"); // output: Иван
```


# fork

```ts
import { fork, type Scope } from "effector";
```

## Методы

### `fork()`

> INFO Время добавления:
>
> введен в [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

Создает изолированный экземпляр приложения.
Основные цели этого метода — SSR и тестирование.

#### Формула

```ts
fork(): Scope
```

#### Возвращает

: Новый чистый scope

#### Примеры

##### Создание двух экземпляров с независимым состоянием счетчика

```js
import { createStore, createEvent, fork, allSettled } from "effector";

const inc = createEvent();
const dec = createEvent();
const $counter = createStore(0);

$counter.on(inc, (value) => value + 1);
$counter.on(dec, (value) => value - 1);

const scopeA = fork();
const scopeB = fork();

await allSettled(inc, { scope: scopeA });
await allSettled(dec, { scope: scopeB });

console.log($counter.getState()); // => 0
console.log(scopeA.getState($counter)); // => 1
console.log(scopeB.getState($counter)); // => -1
```

Попробовать

### `fork(options)`

Позволяет задать значения для сторов в scope и заменить обработчики для effects.

> INFO Время добавления:
>
> поддержка массива кортежей в `values` и `handlers` введена в [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

#### Формула

```ts
fork(options: { values?, handlers? }): Scope
```

#### Аргументы

1. `options: { values?, handlers? }` — Объект с необязательными значениями и обработчиками

##### `values`

Опция для предоставления начальных состояний для сторов.

Может использоваться тремя способами:

1. Массив кортежей со сторами и значениями:

```ts
fork({
  values: [
    [$user, "alice"],
    [$age, 21],
  ],
});
```

2. Map со сторами и значениями:

```ts
fork({
  values: new Map().set($user, "alice").set($age, 21),
});
```

3. Обычный объект: `{[sid: string]: value}`

```ts
fork({
  values: {
    [$user.sid]: "alice",
    [$age.sid]: 21,
  },
});
```

<br />

> INFO Примечание:
>
> Такие объекты создаются с помощью serialize, в коде приложения **предпочтителен массив кортежей**

##### `handlers`

Опция для предоставления обработчиков для effects.

Может использоваться по-разному:

1. Массив кортежей с effects и обработчиками:

```ts
fork({
  handlers: [
    [getMessageFx, (params) => ({ id: 0, text: "message" })],
    [getUserFx, async (params) => ({ name: "alice", age: 21 })],
  ],
});
```

2. Map с effects и обработчиками:

```ts
fork({
  handlers: new Map()
    .set(getMessageFx, (params) => ({ id: 0, text: "message" }))
    .set(getUserFx, async (params) => ({ name: "alice", age: 21 })),
});
```

3. Обычный объект: `{[sid: string]: handler}`

```ts
fork({
  handlers: {
    [getMessageFx.sid]: (params) => ({ id: 0, text: "message" }),
    [getUserFx.sid]: async (params) => ({ name: "alice", age: 21 }),
  },
});
```

<br />

> WARNING Устарело:
>
> Такие объекты устарели с [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) и будут удалены в будущих версиях. Предпочтителен массив кортежей.

#### Возвращает

: Новый чистый scope

#### Примеры

##### Задание начального состояния для стора и изменение обработчика для effect

Это пример теста, который проверяет, что после запроса к серверу значение `$friends` заполняется.

```ts
import { createEffect, createStore, fork, allSettled } from "effector";

const fetchFriendsFx = createEffect<{ limit: number }, string[]>(async ({ limit }) => {
  /* получение данных на стороне клиента */
  return [];
});
const $user = createStore("guest");
const $friends = createStore([]);

$friends.on(fetchFriendsFx.doneData, (_, result) => result);

const testScope = fork({
  values: [[$user, "alice"]],
  handlers: [[fetchFriendsFx, () => ["bob", "carol"]]],
});

/* запускаем вычисления в scope и ожидаем завершения всех вызванных effects */
await allSettled(fetchFriendsFx, {
  scope: testScope,
  params: { limit: 10 },
});

/* проверяем значение стора в scope */
console.log(testScope.getState($friends));
// => ['bob', 'carol']
```

Попробовать

### `fork(domain, options?)`

> INFO Время добавления:
>
> Введен в [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

> WARNING Устарело:
>
> С [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0).
>
> `fork` больше не требует `domain` в качестве аргумента, так как с [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0) он может автоматически отслеживать все юниты.

#### Формула

```ts
fork(domain: Domain, options?: { values?, handlers? }): Scope
```

#### Аргументы

1. `domain` (): Необязательный domain для fork.
2. `options: { values?, handlers? }` — Объект с необязательными values и handlers

#### Возвращает

: Новый чистый scope

#### Примеры

TBD


# forward

> INFO since:
>
> С версии [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0) рекомендуется использовать sample вместо `forward`.

Метод для создания связи между юнитами в декларативной форме. Отправляет обновления из одного набора юнитов в другой

### Формула

```ts
declare const a: Event<T>
declare const fxA: Effect<T, any>
declare const $a: Store<T>

declare const b: Event<T>
declare const fxB: Effect<T, any>
declare const $b: Store<T>

forward({from: a, to: b})
forward({
  from: fxA,
  to:   [b, fxB, $b]
})
forward({
  from: [a, fxA, $a],
  to:   fxB
})
forward({
  from: [a, fxA, $a],
  to:   [b, fxB, $b]
})
-> Subscription
```

```

    from -> to

```

#### Аргументы

1. **`config`**: Объект конфигурации

    * **`from`**: Юнит или массив юнитов

      **Разновидности**:

        * **событие или эффект**: срабатывание этого события/эффекта будет запускать юниты `to`
        * **стор**: обновление этого стора будет запускать юниты `to`
        * **массив юнитов**: срабатывание любого из юнитов будет запускать юниты `to`

    * **`to`**: Юнит или массив юнитов

      **Разновидности**:

        * **событие или эффект**: при срабатывании `from` будет вызван данный юнит
        * **стор**: при срабатывании `from` состояние юнита будет обновлено
        * **массив юнитов**: при срабатывании `from` будут запущены все юниты

#### Возвращает

Subscription: Функция отмены подписки, после её вызова реактивная связь между `from` и `to` разрушается

> INFO:
>
> Массивы юнитов поддерживаются с [effector 20.6.0](https://changelog.effector.dev/#effector-20-6-0)

Для наилучшей типизации при использовании массивов юнитов, типы значений должны совпадать либо быть явно приведены к общему базису

### Примеры

#### Сохранение в сторе данных из события

```js
import { createStore, createEvent, forward } from "effector";

const $store = createStore(1);
const event = createEvent();

forward({
  from: event,
  to: $store,
});

$store.watch((state) => console.log("store changed: ", state));
// => store changed: 1

event(200);
// => store changed: 200
```

Запустить пример

#### Создание связи между массивами юнитов

```js
import { createEvent, forward } from "effector";

const firstSource = createEvent();
const secondSource = createEvent();

const firstTarget = createEvent();
const secondTarget = createEvent();

forward({
  from: [firstSource, secondSource],
  to: [firstTarget, secondTarget],
});

firstTarget.watch((e) => console.log("first target", e));
secondTarget.watch((e) => console.log("second target", e));

firstSource("A");
// => first target A
// => second target A
secondSource("B");
// => first target B
// => second target B
```

Запустить пример


# fromObservable

Создаёт событие, которое будет срабатывать при каждом обновлении переданного observable. Применяется для реализации взаимодействия с библиотеками на основе стримов, например `rxjs` и `most`

Для обратного действия подписки стримов на юниты эффектора можно воспользоваться методами вроде `from` из `rxjs`: юниты эффектора распознаются как сущности, на которые можно подписаться

### Формула

```ts
function fromObservable(stream: Observable<T>): Event<T>;
```

#### Аргументы

1. **`observable`**: Observable

#### Возвращает

Новое событие

### Пример

```js
import { interval } from "rxjs";
import { fromObservable } from "effector";

//emit value in sequence every 1 second
const source = interval(1000);

const event = fromObservable(source);

//output: 0,1,2,3,4,5....
event.watch(console.log);
```


# guard

> INFO:
>
> C effector 22.2.0 предпочтительнее использовать sample

> INFO:
>
> Добавлен в effector 20.4.0

Метод для запуска юнитов по условию, условием может быть функция-предикат или отдельный стор. Позволяет описывать бизнес-правила независимо от других сущностей.
Типичный вариант использования – когда необходимо запускать события лишь когда в определённом сторе значение равно `true`. Тем самым обеспечивается управление потоками данных без их смешивания

### Формула

```ts
guard({clock?, source?, filter, target?}): target
```

> INFO:
>
> `clock` или `source` обязателен

При срабатывании `clock`, после проверки `filter` на [истинность](https://developer.mozilla.org/ru/docs/Glossary/Truthy), вызывается `target` с данными из `source`

* Если `clock` не передан, `guard` будет срабатывать при каждом обновлении `source`
* Если `source` не передан, `target` будет вызван с данными из `clock`
* Если `target` не передан, будет создано новое событие и возвращено в качестве результата
* Если `filter` это стор, то его значение будет проверено на [истинность](https://developer.mozilla.org/ru/docs/Glossary/Truthy)
* Если `filter` это функция-предикат, то она будет вызвана с данными из `source` и `clock`, а результат проверен на [истинность](https://developer.mozilla.org/ru/docs/Glossary/Truthy)

> INFO:
>
> `clock` добавлен в effector 21.8.0

### `guard({clock?, source?, filter, target?})`

Основная запись метода

**Аргументы**

`params` (*Object*): Объект конфигурации

* **`filter`**: Стор или функция-предикат

  **Разновидности**:

    * **стор**: `target` будет запущен только если в этом сторе [истинное значение](https://developer.mozilla.org/ru/docs/Glossary/Truthy)
    * **функция-предикат** `(source, clock) => boolean`: `target` будет запущен только если эта функция вернёт [истинное значение](https://developer.mozilla.org/ru/docs/Glossary/Truthy). Функция должна быть&#x20;

* **`clock?`**: Юнит или массив юнитов

  **Разновидности**:

    * **событие или эффект**: срабатывание этого события/эффекта, после проверки условия в `filter` будет запускать `target`
    * **стор**: обновление этого стора, после проверки условия в `filter` будет запускать `target`
    * **массив юнитов**: срабатывание любого из юнитов, после проверки условия в `filter` будет запускать `target`. Сокращение для вызова merge
    * **поле отсутствует**: `source` будет использоваться в качестве `clock`

* **`source?`**: Юнит или массив/объект со сторами

  **Разновидности**:

    * **событие или эффект**: при срабатывании `clock` будет взято последнее значение с которым запускался этот юнит (перед этим он должен будет запуститься хотя бы раз)
    * **стор**: при срабатывании `clock` будет взято текущее значение этого стора
    * **массив или объект со сторами**: при срабатывании `clock` будут взяты текущие значения из заданных сторов, объединенных в объект или массив. Сокращение для вызова combine
    * **поле отсутствует**: `clock` будет использоваться в качестве `source`

* **`target?`**: Юнит или массив юнитов

  **Разновидности**:

    * **событие или эффект**: при срабатывании `clock`, после проверки условия в `filter` будет вызван данный юнит
    * **стор**: при срабатывании `clock`, после проверки условия в `filter` состояние юнита будет обновлено
    * **массив юнитов**: при срабатывании `clock`, после проверки условия в `filter` будут запущены все юниты
    * **поле отсутствует**: новое событие будет создано и возвращено в результате вызова `guard`

**Возвращает**

, событие, которое будет срабатывать после проверки условия в `filter`

#### Пример со стором в `filter`

```js
import { createStore, createEffect, createEvent, guard } from "effector";

const clickRequest = createEvent();
const fetchRequest = createEffect((n) => new Promise((rs) => setTimeout(rs, 2500, n)));

const clicks = createStore(0).on(clickRequest, (x) => x + 1);
const requests = createStore(0).on(fetchRequest, (x) => x + 1);

const isIdle = fetchRequest.pending.map((pending) => !pending);

/*
1. при срабатывании clickRequest
2. если значение isIdle равно true
3. прочитать значение из clicks
4. и вызвать с ним эффект fetchRequest
*/
guard({
  clock: clickRequest /* 1 */,
  filter: isIdle /* 2 */,
  source: clicks /* 3 */,
  target: fetchRequest /* 4 */,
});
```

Пример rate limiting

#### Пример с функцией-предикатом в `filter`

```js
import { createEffect, createEvent, guard } from "effector";

const searchUser = createEffect();
const submitForm = createEvent();

guard({
  source: submitForm,
  filter: (user) => user.length > 0,
  target: searchUser,
});

submitForm(""); // ничего не произошло
submitForm("alice"); // ~> searchUser('alice')
```

Запустить пример

### `guard(source, {filter})`

Альтернативная запись метода

**Аргументы**

* **`source`**: Юнит
* **`filter`**: Стор или функция-предикат

  **Разновидности**:

    * **стор**: `target` будет запущен только если в этом сторе [истинное значение](https://developer.mozilla.org/ru/docs/Glossary/Truthy)
    * **функция-предикат** `(source) => boolean`: `target` будет запущен только если эта функция вернёт [истинное значение](https://developer.mozilla.org/ru/docs/Glossary/Truthy). Функция должна быть&#x20;

##### Пример со стором в `filter`

```js
import { createEvent, createStore, createApi, guard } from "effector";

const trigger = createEvent();
const $unlocked = createStore(true);
const { lock, unlock } = createApi($unlocked, {
  lock: () => false,
  unlock: () => true,
});

const target = guard(trigger, {
  filter: $unlocked,
});

target.watch(console.log);
trigger("A");
lock();
trigger("B"); // ничего не произошло
unlock();
trigger("C");
```

Запустить пример

##### Пример с функцией-предикатом в `filter`

```js
import { createEvent, guard } from "effector";

const source = createEvent();
const target = guard(source, {
  filter: (x) => x > 0,
});

target.watch(() => {
  console.log("target вызван");
});

source(0);
// ничего не произошло
source(1);
// target вызван
```

Запустить пример


# hydrate

```ts
import { hydrate } from "effector";
```

Сопутствующий метод для . Гидрирует предоставленные значения в соответствующие сторы в рамках предоставленного домена или скоупа. Основная цель — гидрация состояния приложения на стороне клиента после SSR (Server-Side Rendering).

### Методы

#### `hydrate(domainOrScope, { values })`

> WARNING Важно:
>
> Необходимо убедиться, что стор создан заранее, иначе гидрация может завершиться неудачей. Это может произойти, если вы разделяете скрипты инициализации/гидрации сторов от их создания.

##### Формула

```ts
hydrate(domainOrScope: Domain | Scope, { values: Map<Store<any>, any> | {[sid: string]: any} }): void
```

##### Аргументы (methods-hydrate-domainOrScope-values-arguments)

1. **`domainOrScope`**: домен или область видимости, который будет заполнен предоставленными `values`.
2. **`values`**: отображение из sid (идентификаторов сторов) в значения сторов или `Map`, где ключи — это объекты сторов, а значения содержат начальное значение стора.

##### Возвращает

`void`

##### Примеры

Заполнение стора предопределенным значением:

```js
import { createStore, createDomain, fork, serialize, hydrate } from "effector";

const domain = createDomain();
const $store = domain.createStore(0);

hydrate(domain, {
  values: {
    [$store.sid]: 42,
  },
});

console.log($store.getState()); // 42
```

Запустить пример


# effector

Перечень методов API, по группам:

### Типы юнитов

* Event\<T>
* Effect\<Params, Done, Fail>
* Store\<T>
* Domain
* Scope

### Создание юнитов

* createEvent()
* createStore(default)
* createEffect(handler)
* createDomain()

### Основные методы библиотеки

* combine(...stores, f)
* attach({effect, mapParams?, source?})
* sample({clock, source, fn, target})
* merge(\[eventA, eventB])
* split(event, cases)
* createApi(store, api)

### Fork API

* fork()
* serialize(scope)
* allSettled(unit, { scope })
* scopeBind(event)
* hydrate(domain)

### Плагины для компилятора

* effector/babel-plugin
* @effector-swc-plugin

### Служебные функции

* is
* fromObservable(observable)

### Низкоуровневый API

* clearNode()
* withRegion()
* launch()
* inspect()

### Import Map

Пакет `effector` предоставляет несколько дополнительных модулей, которые могут быть полезны в различных сценариях:

* effector/compat
* effector/inspect
* effector/babel-plugin

### Устаревшие методы

* forward({from, to})
* guard({source, filter, target})


# inspect

```ts
import { inspect } from "effector/inspect";
```

Специальные методы API, предназначенные для обработки сценариев отладки и мониторинга, не предоставляя слишком много доступа к внутренностям вашего приложения.

Полезны для создания девтулз, мониторинга и наблюдения в production.

## Inspect API

Позволяет отслеживать любые вычисления, происходящие в ядре effector.

### `inspect()`

#### Пример

```ts
import { inspect, type Message } from "effector/inspect";

import { someEvent } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

inspect({
  fn: (m) => {
    logInspectMessage(m);
  },
});

someEvent(42);
// выведет что-то вроде
// [event] someEvent 42
// [on] 42
// [store] $count 1337
// ☝️ допустим, что редьюсер добавляет 1295 к предоставленному числу
//
// и так далее, любые триггеры
```

Scope ограничивает область, в которой можно отслеживать вычисления. Если scope не предоставлен — будут отслеживаться вычисления вне scope.

```ts
import { fork, allSettled } from "effector";
import { inspect, type Message } from "effector/inspect";

import { someEvent } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

const myScope = fork();

inspect({
  scope: myScope,
  fn: (m) => {
    logInspectMessage(m);
  },
});

someEvent(42);
// ☝️ Нет логов! Это потому, что отслеживание было ограничено myScope

allSettled(someEvent, { scope: myScope, params: 42 });
// [event] someEvent 42
// [on] 42
// [store] $count 1337
```

### Трассировка

Добавление настройки `trace: true` позволяет просматривать предыдущие вычисления, которые привели к текущему. Это полезно для отладки конкретной причины возникновения некоторых событий.

#### Пример

```ts
import { fork, allSettled } from "effector";
import { inspect, type Message } from "effector/inspect";

import { someEvent, $count } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

const myScope = fork();

inspect({
  scope: myScope,
  trace: true, // <- явная настройка
  fn: (m) => {
    if (m.kind === "store" && m.sid === $count.sid) {
      m.trace.forEach((tracedMessage) => {
        logInspectMessage(tracedMessage);
        // ☝️ здесь мы логируем трассировку обновления конкретного стора
      });
    }
  },
});

allSettled(someEvent, { scope: myScope, params: 42 });
// [on] 42
// [event] someEvent 42
// ☝️ трассировки предоставляются в обратном порядке, так как мы смотрим назад во времени
```

### Ошибки

Effector не допускает исключений в чистых функциях. В таком случае вычисление ветви останавливается, и исключение логируется. Также в таком случае есть специальный тип сообщения:

#### Пример

```ts
inspect({
  fn: (m) => {
    if (m.type === "error") {
      // сделать что-то с этим
      console.log(`${m.kind} ${m.name} computation has failed with ${m.error}`);
    }
  },
});
```

## Inspect Graph

Позволяет отслеживать объявления юнитов, фабрик и регионов.

### Пример

```ts
import { createStore } from "effector";
import { inspectGraph, type Declaration } from "effector/inspect";

function printDeclaration(d: Declaration) {
  console.log(`${d.kind} ${d.name}`);
}

inspectGraph({
  fn: (d) => {
    printDeclaration(d);
  },
});

const $count = createStore(0);
// выведет "store $count" в консоль
```

### `withRegion`

Метаданные, предоставленные через корневой узел региона, доступны при объявлении.

#### Пример

```ts
import { createNode, withRegion, createStore } from "effector";
import { inspectGraph, type Declaration } from "effector/inspect";

function createCustomSomething(config) {
  const $something = createStore(0);

  withRegion(createNode({ meta: { hello: "world" } }), () => {
    // какой-то код
  });

  return $something;
}
inspectGraph({
  fn: (d) => {
    if (d.type === "region") console.log(d.meta.hello);
  },
});

const $some = createCustomSomething({});
// выведет "world"
```


# is

Объект с валидаторами юнитов

### `is.store(value)`

Проверяет, является ли переданное значение

**Возвращает**

boolean

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.store(store);
// => true

is.store(event);
// => false

is.store(fx);
// => false

is.store(createDomain());
// => false

is.store(fx.pending);
// => true

is.store(fx.done);
// => false

is.store(store.updates);
// => false

is.store(null);
// => false
```

Запустить пример

### `is.event(value)`

Проверяет, является ли переданное значение

**Возвращает**

boolean

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.event(store);
// => false

is.event(event);
// => true

is.event(fx);
// => false

is.event(createDomain());
// => false

is.event(fx.pending);
// => false

is.event(fx.done);
// => true

is.event(store.updates);
// => true

is.event(null);
// => false
```

Запустить пример

### `is.effect(value)`

Проверяет, является ли переданное значение

**Возвращает**

boolean

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.effect(store);
// => false

is.effect(event);
// => false

is.effect(fx);
// => true

is.effect(createDomain());
// => false

is.effect(null);
// => false
```

Запустить пример

### `is.domain(value)`

Проверяет, является ли переданное значение

**Возвращает**

boolean

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.domain(store);
// => false

is.domain(event);
// => false

is.domain(fx);
// => false

is.domain(createDomain());
// => true

is.domain(null);
// => false
```

Запустить пример

### `is.scope(value)`

> INFO:
>
> Добавлен в effector 22.0.0

Проверяет, является ли переданное значение

**Возвращает**

boolean

```js
import { fork } from "effector";

const store = createStore(null);
const event = createEvent();
const fx = createEffect();
const scope = fork();

is.scope(scope);
// => true

is.scope(store);
// => false

is.scope(event);
// => false

is.scope(fx);
// => false

is.scope(createDomain());
// => false

is.scope(null);
// => false
```

Запустить пример

### `is.unit(value)`

Проверяет, является ли переданное значение юнитом: стором, эвентом, эффектом, доменом или скоупом

**Возвращает**

boolean

```js
import { is, createStore, createEvent, createEffect, createDomain, fork } from "effector";

const store = createStore(null);
const event = createEvent();
const fx = createEffect();
const scope = fork();

is.unit(scope);
// => true

is.unit(store);
// => true

is.unit(event);
// => true

is.unit(fx);
// => true

is.unit(createDomain());
// => true

is.unit(fx.pending);
// => true

is.unit(fx.done);
// => true

is.unit(store.updates);
// => true

is.unit(null);
// => false
```

Запустить пример

### `is.attached(value)`

> INFO:
>
> Добавлен в effector 22.4.0

Проверяет, что переданный  был создан с помощью метода .
Если в качестве аргумента был передан не effect, возвращает `false`.

**Возвращает**

boolean

```js
import { is, createStore, createEvent, createEffect, createDomain, attach } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

const childFx = attach({
  effect: fx,
});

is.attached(childFx);
// => true

is.attached(fx);
// => false

is.attached($store);
// => false

is.attached(event);
// => false

is.attached(createDomain());
// => false

is.attached(null);
// => false
```

Запустить пример

#### Пример использования

Иногда нужно добавить отображение ошибок на эффекты, но только на те, которые были "локализованы" через `attach`.
Если оставить `onCreateEffect` как есть, без проверок, то лог ошибки будет задублирован.

```js
import { createDomain, attach, is } from "effector";

const logFailuresDomain = createDomain();

logFailuresDomain.onCreateEffect((effect) => {
  if (is.attached(effect)) {
    effect.fail.watch(({ params, error }) => {
      console.warn(`Effect "${effect.compositeName.fullName}" failed`, params, error);
    });
  }
});

const baseRequestFx = logFailuresDomain.createEffect((path) => {
  throw new Error(`path ${path}`);
});

const loadDataFx = attach({
  mapParams: () => "/data",
  effect: baseRequestFx,
});

const loadListFx = attach({
  mapParams: () => "/list",
  effect: baseRequestFx,
});

loadDataFx();
loadListFx();
```

Запустить пример


# launch

Низкоуровневый метод для запуска вычислений в юнитах. В основном используется разработчиками библиотек для тонкого контроля вычислений

> INFO:
>
> Добавлен в effector 20.10.0

### Формула

```ts
declare const $store: Store<T>
declare const event: Event<T>
declare const fx: Effect<T, any>

launch({target: $store, params: T}): void
launch({target: event, params: T}): void
launch({target: fx, params: T}): void
```


# merge

Объединяет апдейты массива юнитов в новое событие, которое будет срабатывать при запуске любой из переданных сущностей

> INFO:
>
> Добавлено в effector 20.0.0

### Формула

```ts
declare const $store: Store<T>; // триггер
declare const event: Event<T>; // триггер
declare const fx: Effect<T, any>; // триггер

const result: Event<T> = merge(/*clock*/ [$store, event, fx]);
```

#### Аргументы

* **`clock`**: Массив юнитов для объединения

#### Возвращает

: Новое событие

> TIP:
>
> В случае передачи стора, итоговое событие будет срабатывать при обновлении этого стора

### Примеры

##### Пример 1

```js
import { createEvent, merge } from "effector";

const foo = createEvent();
const bar = createEvent();
const baz = merge([foo, bar]);
baz.watch((v) => console.log("merged event triggered: ", v));

foo(1);
// => merged event triggered: 1
bar(2);
// => merged event triggered: 2
```

Запустить пример

##### Пример 2

```js
import { createEvent, createStore, merge } from "effector";

const setFoo = createEvent();
const setBar = createEvent();

const $foo = createStore(0).on(setFoo, (_, v) => v);

const $bar = createStore(100).on(setBar, (_, v) => v);

const anyUpdated = merge([$foo, $bar]);
anyUpdated.watch((v) => console.log(`state changed to: ${v}`));

setFoo(1); // => state changed to: 1
setBar(123); // => state changed to: 123
```

Запустить пример

##### Пример 3

```js
import { createEvent, createStore, merge } from "effector";

const setFoo = createEvent();
const otherEvent = createEvent();

const $foo = createStore(0).on(setFoo, (_, v) => v);

const merged = merge([$foo, otherEvent]);

merged.watch((v) => console.log(`merged event payload: ${v}`));

setFoo(999);
// => merged event payload: 999

otherEvent("bar");
// => merged event payload: bar
```

Запустить пример


# effector/babel-plugin

Поскольку Effector позволяет автоматизировать множество стандартных задач (например, задавание стабильных идентификаторов и предоставление отладочной информации для юнитов), существует встроенный плагин для Babel, который улучшает опыт разработчика при использовании библиотеки.

## Использование

Пожалуйста, обратитесь к документации Babel plugin для примеров использования.


# effector/compat

```ts
import {} from "effector/compat";
```

Библиотека предоставляет отдельный модуль с поддержкой совместимости до IE11 и Chrome 47 (браузер для устройств Smart TV).

> WARNING Бандлер, а не транспилятор:
>
> Поскольку сторонние библиотеки могут импортировать `effector` напрямую, вам **не следует** использовать транспиляторы, такие как Babel, для замены `effector` на `effector/compat` в вашем коде, так как по умолчанию Babel не преобразует сторонний код.
>
> **Используйте бандлер**, так как он заменит `effector` на `effector/compat` во всех модулях, включая модули из сторонних библиотек.

### Необходимые полифиллы

Вам нужно установить полифиллы для этих объектов:

* `Promise`
* `Object.assign`
* `Array.prototype.flat`
* `Map`
* `Set`

В большинстве случаев бандлер может автоматически добавить полифиллы.

#### Vite

<details>
<summary>Пример конфигурации Vite</summary>

```js
import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    legacy({
      polyfills: ["es.promise", "es.object.assign", "es.array.flat", "es.map", "es.set"],
    }),
  ],
});
```

</details>

## Использование

### Ручная замена

Вы можете использовать `effector/compat` вместо пакета `effector`, если вам нужно поддерживать старые браузеры.

```diff
- import {createStore} from 'effector'
+ import {createStore} from 'effector/compat'
```

### Автоматическая замена

Однако вы можете настроить ваш бандлер для автоматической замены `effector` на `effector/compat` в вашем коде.

#### Webpack

<details>
<summary>Пример конфигурации Webpack</summary>

```js
module.exports = {
  resolve: {
    alias: {
      effector: "effector/compat",
    },
  },
};
```

</details>

#### Vite

<details>
<summary>Пример конфигурации Vite</summary>

```js
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      effector: "effector/compat",
    },
  },
});
```

</details>


# effector/inspect

Effector предоставляет специальные методы API, предназначенные для обработки задач отладки и мониторинга, не предоставляя слишком много доступа к внутренней логике вашего приложения — Inspect API.

### Почему отдельный модуль?

Inspect API разработан как опциональный модуль. По задумке, любая функциональность, использующая Inspect API, может быть удалена из production-сборки без каких-либо побочных эффектов. Чтобы подчеркнуть это, Inspect API не включён в основной модуль. Вместо этого он доступен в отдельном модуле `effector/inspect`.

### Использование

Пожалуйста, обратитесь к документации Inspect API для примеров использования.


# restore

```ts
import { restore } from "effector";
```

## Методы

### `restore(event, defaultState)`

Создает  из . Работает как сокращение для `createStore(defaultState).on(event, (_, payload) => payload)`.

> WARNING Это не производный стор:
>
> `restore` создает новый стор. Это не производный стор. Это означает, что вы можете изменять его состояние через события и использовать его как `target` в sample.

#### Формула

```ts
restore(event: Event<T>, defaultState: T): StoreWritable<T>
```

#### Аргументы

1. `event`
2. `defaultState` (*Payload*)

#### Возвращает

: Новый стор.

#### Примеры

##### Базовый пример

```js
import { createEvent, restore } from "effector";

const event = createEvent();
const $store = restore(event, "default");

$store.watch((state) => console.log("state: ", state));
// state: default

event("foo");
// state: foo
```

Запустить пример

### `restore(effect, defaultState)`

Создает  из успешных результатов . Работает как сокращение для `createStore(defaultState).on(effect.done, (_, {result}) => result)`.

#### Формула

```ts
restore(effect: Effect<Params, Done, Fail>, defaultState: Done): StoreWritable<Done>
```

#### Аргументы

1. `effect`
2. `defaultState` (*Done*)

#### Возвращает

: Новый стор.

#### Типы

Store будет иметь тот же тип, что и `Done` из `Effect<Params, Done, Fail>`. Также `defaultState` должен иметь тип `Done`.

#### Примеры

##### Эффект

```js
import { createEffect, restore } from "effector";

const fx = createEffect(() => "foo");
const $store = restore(fx, "default");

$store.watch((state) => console.log("state: ", state));
// => state: default

await fx();
// => state: foo
```

Запустить пример

### `restore(shape)`

Создает объект с сторами из объекта с значениями.

#### Формула

TBD

#### Аргументы

1. `shape` (*State*)

#### Возвращает

: Новый стор.

#### Примеры

##### Объект

```js
import { restore } from "effector";

const { foo: $foo, bar: $bar } = restore({
  foo: "foo",
  bar: 0,
});

$foo.watch((foo) => {
  console.log("foo", foo);
});
// => foo 'foo'
$bar.watch((bar) => {
  console.log("bar", bar);
});
// => bar 0
```

Запустить пример


# sample API

[units]: /ru/explanation/glossary#common-unit

[eventApi]: /ru/api/effector/Event

[storeApi]: /ru/api/effector/Store

[effectApi]: /ru/api/effector/Effect

[purity]: /ru/explanation/glossary/#purity

## `sample` API

```ts
import { sample } from "effector";
```

Метод для связывания юнитов. Его главная задача - брать данные из одного места `source` и передавать их в другое место `target` при срабатывании определённого триггера `clock`.

Типичный вариант использования – когда необходимо обработать какое-либо событие используя данные из стора. Вместо использования `store.getState()`, которое может вызвать несогласованность состояния, лучше использовать метод `sample`.

> TIP как работать с sample:
>
> Узнайте как композировать юниты и работать с методом&#x20;

### Алгоритм работы

* При срабатывании `clock` прочитать значение из `source`
* Если указан `filter`, и результат функции вернул `true` или стор со значением `true`, то продолжить
* Если указан `fn`, то преобразовать данные
* И передать данные в `target`.

### Особенности работы `sample`

* Если `clock` не передан, `sample` будет срабатывать при каждом обновлении `source`.
* Если `target` не передан, то `sample` создаст и вернёт новый производный юнит

### Возвращаемый юнит и значение

Если `target` не передан, то он будет создан при вызове. Тип создаваемого юнита описан в данной таблице:

| clock \ source                      |  |  |  |
| ----------------------------------- | --------------------------------- | --------------------------------- | ----------------------------------- |
|    | `Store`                           | `Event`                           | `Event`                             |
|    | `Event`                           | `Event`                           | `Event`                             |
|  | `Event`                           | `Event`                           | `Event`                             |

Использование таблицы:

1. Выбираем тип источника `clock`, это столбец
2. Тип `source` – это строка
3. Устанавливаем соответствие между столбцом и строкой

В случае, если `target` передан явно, то возвращаемым значением будет тот же самый `target`.

Например:

```ts
const event = createEvent();
const $store = createStore();
const $secondStore = createStore();

const $derivedStore = sample({
  clock: $store,
  source: $secondStore,
});
// Результатом будет производный стор,
// так как `source` и `clock` являются сторами

const derivedEvent = sample({
  clock: event,
  source: $store,
});
// Результатом будет производное событие, так как `clock` – событие
```

### Полная форма

* **Формула**

```ts
sample({
  clock?, // триггер
  source?, // источник данных
  filter?, // фильтр
  fn?, // функция-трансформатор
  target?, // целевой юнит
  batch?, // флаг батчинга
  name? // имя sample юнита
})
```

#### `clock`

Аргумент `clock` является триггером, определяющий момент взятия данных из source.<br/>
Является опциональным.

* **Тип**

```ts
sample({
  clock?: Unit<T> | Unit<T>[],
})
```

Может иметь сигнатуру:

* [`Event<T>`][eventApi] - срабатывает при вызове события
* [`Store<T>`][storeApi] - срабатывает при изменении стора
* [`Effect<T, Done, Fail>`][effectApi] - срабатывает при вызове эффекта
* `Unit<T>[]`- массив [юнитов][units] срабатывает при активации любого из них

> INFO либо clock либо source:
>
> Хотя аргумент `clock` является опциональным, при использовании метода `sample` необходимо указать либо `clock`, либо source.

```ts
const clicked = createEvent();
const $store = createStore(0);
const fetchFx = createEffect();

// Event как clock
sample({
  source: $data,
  clock: clicked,
});

// Store как clock
sample({
  source: $data,
  clock: $store,
});

// Массив как clock
sample({
  source: $data,
  clock: [clicked, fetchFx.done],
});
```

***

#### `source`

Является источником данных, откуда берутся данные при срабатывании `clock`. Если `clock` не указан, тогда `source` используется как `clock`. <br/>
Является опциональным.

* **Тип**

```ts
sample({
  source?: Unit<T> | Unit<T>[] | {[key: string]: Unit<T>},
})
```

Может иметь сигнатуру:

* [`Store<T>`][storeApi] - данные берутся из текущего значения стора
* [`Event<T>`][eventApi] - возьмется последнее значение, с которым запускалось событие
* [`Effect<T, Done, Fail>`][effectApi] - возьмется последнее значение, с которым запускался эффект
* Объект с [юнитами][units] - для комбинирования нескольких источников
* Массив с [юнитами][units] - для комбинирования нескольких источников

> INFO либо source либо clock:
>
> Хотя аргумент `source` является опциональным, при использовании метода `sample` необходимо указать либо `source`, либо clock.

***

#### `filter`

Функция-предикат для фильтрации. Если возвращает `false` или стор со значением `false`, данные не будут переданы в `target`.<br/>
Является опциональным.

* **Тип**

```ts
sample({
  filter?: Store<boolean> | (source: Source, clock: Clock) => (boolean | Store<boolean>),
})
```

Может иметь сигнатуру:

* [`Store<boolean>`][storeApi] – стор с `boolean` значением, как производный так и базовый
* Функция-предикат – функция возвращающая `boolean` значение

```ts
const $isUserActive = createStore(false);

sample({
  clock: checkScore,
  source: $score,
  filter: (score) => score > 100,
  target: showWinnerFx,
});

sample({
  clock: action,
  source: $user,
  filter: $isUserActive,
  target: adminActionFx,
});
```

***

#### `fn`

Функция для трансформации данных перед передачей в `target`. Функция [**должна быть чистой**][purity].<br/>
Является опциональным.

* **Тип**

```ts
sample({
  fn?: (source: Source, clock: Clock) => Target
})
```

> INFO возвращаемый тип данных:
>
> Тип возвращаемых данных должен совпадать с типом данных в `target`.

```ts
const $user = createStore<User>({});
const saveUserFx = createEffect((user: User) => {
  // ...
});

sample({
  clock: updateProfile,
  source: $user,
  fn: (user, updates) => ({ ...user, ...updates }),
  target: saveUserFx,
});

sample({
  clock: submit,
  source: $form,
  fn: (form) => form.email,
  target: sendEmailFx,
});
```

***

#### `target`

Целевой юнит, который получит данные и будет вызван.<br/>
Является опциональным.

* **Тип**

```ts
sample({
  target?: Unit<T> | Unit<T>[],
})
```

Может иметь сигнатуру:

* EventCallable\<T> - событие (не производное) будет вызвано с данными
* [`Effect<T, Done, Fail>`][effectApi] - эффект будет вызван с данными
* StoreWritable\<T> - стор (не производный) будет обновлён данными
* Массив с [юнитами][units] - будет вызван каждый юнит в массиве

> INFO target без target:
>
> Если `target` не указан, `sample` возвращает новый производный юнит.

```ts
const targetEvent = createEvent<string>();
const targetFx = createEffect<string, void>();
const $targetStore = createStore("");

// Event как target
sample({
  source: $store,
  clock: trigger,
  target: targetEvent,
});

// Effect как target
sample({
  source: $store,
  clock: trigger,
  target: targetFx,
});

// Store как target
sample({
  source: $store,
  clock: trigger,
  target: $targetStore,
});
```

***

#### `greedy`

> WARNING Deprecated:
>
> Начиная с effector 23.0.0 свойство `greedy` устарело.
>
> Используйте `batch` вместо `greedy`.

***

#### `batch`

Группирует обновления для лучшей производительности. По умолчанию `true`.<br/>
Является опциональным.

* **Тип**

```ts
sample({
  batch?: boolean // По умолчанию true
})
```

***

#### `name`

Свойство `name` позволяет задать имя создаваемому юниту. Это имя используется для отладки.<br/>
Является опциональным.

* **Тип**

```ts
sample({
  name?: string
})
```

### Краткая форма

* **Формула**

```ts
sample(source, clock, fn?): Unit
```

Альтернативная запись метода, всегда имеет неявный `target`.

Краткая форма также имеет несколько паттернов написания:

1. Все аргументы: `sample(source, clock, fn)` - с функцией-трансформером
2. `source` и `clock`: `sample(source, clock)` - без функции-трансформера
3. `source` и `fn`: `sample(source, fn)` - с функцией-трансформером, но без`clock`, тогда `source`ведет как`clock`
4. Один аргумент: `sample(source)` - только `source`, тогда `source` ведет как `clock`

* **Возвращаемое значение**

Возвращаемое значение зависит от переданных юнитов, а тип данных от fn, если присутствует, иначе от `source`.

#### `source`

Является источником данных, откуда берутся данные при срабатывании `clock`. Если `clock` не указан, тогда `source` используется как `clock`.

* **Тип**

```ts
sample(source?: Unit<T> | Unit<T>[])
```

Может иметь сигнатуру:

* [`Store<T>`][storeApi] - данные берутся из текущего значения стора
* [`Event<T>`][eventApi] - возьмется последнее значение, с которым запускалось событие
* [`Effect<T, Done, Fail>`][effectApi] - возьмется последнее значение, с которым запускался эффект
* `Unit<T>[]`- массив [юнитов][units] срабатывает при активации любого из них

> INFO поведение без clock:
>
> Если `clock` не указан, тогда `source` ведет себя как `clock` - то есть является триггером.

***

#### `clock`

Аргумент `clock` является триггером, определяющий момент взятия данных из source.<br/>
Является опциональным.

* **Тип**

```ts
sample(clock?: Unit<T> | Unit<T>[])
```

Может иметь сигнатуру:

* [`Event<T>`][eventApi] - срабатывает при вызове события
* [`Store<T>`][storeApi] - срабатывает при изменении стора
* [`Effect<T, Done, Fail>`][effectApi] - срабатывает при вызове эффекта
* `Unit<T>[]`- массив [юнитов][units] срабатывает при активации любого из них

```ts
const clicked = createEvent();
const $store = createStore(0);
const fetchFx = createEffect();

sample($data, clicked);

sample($data, $store);
```

***

#### `fn`

Функция для трансформации данных перед передачей в `target`. Функция [**должна быть чистой**][purity].<br/> Является опциональным.

* **Тип**

```ts
sample(fn: (source: Source, clock: Clock) => result)
```

* **Пример**

```ts
const $userName = createStore("john");

const submitForm = createEvent();

const sampleUnit = sample(
  $userName /* 2 */,
  submitForm /* 1 */,
  (name, password) => ({ name, password }) /* 3 */,
);

submitForm(12345678);

// 1. при вызове submitForm с аргументом 12345678
// 2. прочитать значение из стора $userName ('john')
// 3. преобразовать значение из submitForm (1) и $userName (2) и вызвать sampleUnit
```

### Связанные API и статьи

* **API**
    * merge - Объединяет апдейты массива юнитов
    * Store - Описание стора, а также его методов и свойств
    * Event - Описание событий, а также его методов и свойств
    * Effect - Описание эффектов, а также его методов и свойств
* **Статьи**
    * Типизация юнитов и методов
    * Композиция юнитов и работа с методов&#x20;


# scopeBind

```ts
import { scopeBind } from "effector";
```

`scopeBind` — метод для привязки юнита (эвента или эффекта) к скоупу, который может быть вызван позже. Эффектор поддерживает императивный вызов эвентов внутри обработчиков, однако существуют случаи, когда необходимо явно привязать эвенты к скоупу — например, при вызове эвентов из колбэков `setTimeout` или `setInterval`.

## Методы

### `scopeBind(event, options?)`

#### Формула

```ts
scopeBind<T>(event: EventCallable<T>): (payload: T) => void
scopeBind<T>(event: EventCallable<T>, options?: {scope?: Scope, safe?: boolean}): (payload: T) => void
```

#### Аргументы

1. `event`  или  для привязки к скоупу.
2. `options` (*Object*): опциональные настройки
    * `scope` (*Scope*): скоуп, к которому нужно привязать эвент
    * `safe` (*Boolean*): флаг для подавления исключений, если скоуп отсутствует

#### Возвращает

`(payload: T) => void` — функция с теми же типами, что и у `event`.

#### Примеры

##### Базовый пример

Мы собираемся вызвать `changeLocation` внутри колбэка `history.listen`, поэтому нет способа для эффектора ассоциировать эвент с соответствующим скоупом. Нам нужно явно привязать эвент к скоупу, используя `scopeBind`.

```ts
import { createStore, createEvent, attach, scopeBind } from "effector";

const $history = createStore(history);
const initHistory = createEvent();
const changeLocation = createEvent<string>();

const installHistoryFx = attach({
  source: $history,
  effect: (history) => {
    const locationUpdate = scopeBind(changeLocation);

    history.listen((location) => {
      locationUpdate(location);
    });
  },
});

sample({
  clock: initHistory,
  target: installHistoryFx,
});
```

Запустить пример

### `scopeBind(callback, options?)`

Привязывает произвольный колбэк к скоупу, чтобы его можно было вызвать позже. Полученная привязанная версия функции сохраняет все свойства оригинала — например, если оригинальная функция выбрасывала ошибку при определённых аргументах, то привязанная версия также будет выбрасывать ошибку при тех же условиях.

> INFO since:
>
> Функциональность доступна, начиная с релиза `effector 23.1.0`.
> Поддержка нескольких аргументов функции появилась в `effector 23.3.0`.

> WARNING:
>
> Чтобы быть совместимыми с Fork API, колбэки должны соблюдать те же правила, что и хендлеры эффектов:
>
> * Синхронные функции можно использовать как есть.
> * Асинхронные функции должны соответствовать правилам при работе с скоупом.

#### Формула

```ts
scopeBind(callback: (...args: Args) => T, options?: { scope?: Scope; safe?: boolean }): (...args: Args) => T;
```

#### Аргументы

1. `callback` (*Function*): любая функция, которую нужно привязать к скоупу.
2. `options` (*Object*): необязательные настройки.
    * `scope` (*Scope*): скоуп, к которому нужно привязать эвент.
    * `safe` (*Boolean*): флаг для подавления исключений, если скоуп отсутствует.

#### Возвращает

`(...args: Args) => T` — функция с теми же типами, что и у `callback`.

#### Примеры

```ts
import { createEvent, createStore, attach, scopeBind } from "effector";

const $history = createStore(history);
const locationChanged = createEvent();

const listenToHistoryFx = attach({
  source: $history,
  effect: (history) => {
    return history.listen(
      scopeBind((location) => {
        locationChanged(location);
      }),
    );
  },
});
```


# serialize

```ts
import { serialize, type Scope } from "effector";
```

## Методы

### `serialize(scope, params)`

Сопутствующий метод для . Позволяет получить сериализованное значение всех сторов в пределах scope. Основная цель — сериализация состояния приложения на стороне сервера во время SSR.

> WARNING Внимание:
>
> Для использования этого метода требуется  или , так как эти плагины предоставляют sid для сторов, которые необходимы для стабильной сериализации состояния.
>
> Подробное объяснение можно найти здесь.

#### Формула

```ts
serialize(scope: Scope, { ignore?: Array<Store<any>>; onlyChanges?: boolean }): {[sid: string]: any}
```

#### Аргументы

1. `scope` : объект scope (форкнутый экземпляр)
2. `ignore` Опциональный массив , который будет пропущен при сериализации (добавлено в 20.14.0)
3. `onlyChanges` Опциональный флаг, чтобы игнорировать сторы, которые не изменились в форке (предотвращает передачу значений по умолчанию по сети)

> WARNING Устарело:
>
> Начиная с [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0), свойство `onlyChanges` устарело.

#### Возвращает

Объект со значениями сторов, использующий sid в качестве ключей.

> WARNING Внимание:
>
> Если у стора нет сида, его значение будет пропущено при сериализации.

#### Примеры

##### Сериализация состояния форкнутого экземпляра

```ts
import { createStore, createEvent, allSettled, fork, serialize } from "effector";

const inc = createEvent();
const $store = createStore(42);
$store.on(inc, (x) => x + 1);

const scope = fork();

await allSettled(inc, { scope });

console.log(serialize(scope)); // => {[sid]: 43}
```

Запустить пример

##### Использование с `onlyChanges`

С `onlyChanges` этот метод будет сериализовать только те сторы, которые были изменены каким-либо триггером во время работы или определены в поле `values` с помощью fork или hydrate(scope). После изменения стор останется помеченным как измененное в данном scope, даже если оно вернется к состоянию по умолчанию во время работы, иначе клиент не обновит этот стор на своей стороне, что является неожиданным и непоследовательным.
Это позволяет нам гидрировать состояние клиента несколько раз, например, во время смены маршрутов в next.js.

```ts
import { createDomain, fork, serialize, hydrate } from "effector";

const app = createDomain();

/** стор, который мы хотим гидрировать с сервера */
const $title = app.createStore("dashboard");

/** стор, который не используется сервером */
const $clientTheme = app.createStore("light");

/** скоуп в клиентском приложении */
const clientScope = fork(app, {
  values: new Map([
    [$clientTheme, "dark"],
    [$title, "profile"],
  ]),
});

/** scope на стороне сервера для страницы чатов, созданный для каждого запроса */
const chatsPageScope = fork(app, {
  values: new Map([[$title, "chats"]]),
});

/** этот объект будет содержать только данные $title
 * так как $clientTheme никогда не изменялся в server scope */
const chatsPageData = serialize(chatsPageScope, { onlyChanges: true });
console.log(chatsPageData);
// => {'-l644hw': 'chats'}

/** таким образом, заполнение значений с сервера затронет только соответствующие сторы */
hydrate(clientScope, { values: chatsPageData });

console.log(clientScope.getState($clientTheme));
// => dark
```

Запустить пример


# split

```ts
import { split } from "effector";
```

Выберите один из кейсов по заданным условиям. Эта функция "разделяет" исходный юнит на несколько событий, которые срабатывают, когда полезная нагрузка соответствует их условиям. Работает как сопоставление с образцом для значений полезной нагрузки и внешних сторов.

## Режимы

### "Case" режим

Режим, в котором кейс выбирается его имени. Кейс может быть выбран из данных в `source` с помощью функции кейса или из внешнего стора кейса, которое хранит текущее имя кейса. После выбора данные из `source` будут отправлены в соответствующий `cases[fieldName]` (если он есть), если ни одно из полей не совпадает, то данные будут отправлены в `cases.__` (если он есть).

**Смотрите также**:

* store кейса
* функция кейса

### Режим сопоставления

Режим, в котором каждый кейс последовательно сопоставляется с сторами и функциями в полях объекта `match`.
Если одно из полей получает `true` из значения стора или возврата функции, то данные из `source` будут отправлены в соответствующий `cases[fieldName]` (если он есть), если ни одно из полей не совпадает, то данные будут отправлены в `cases.__` (если он есть).

**Смотрите также**:

* store сопоставления
* функция сопоставления

### Стор кейса

Store со строкой, который будет использоваться для выбора итогового кейса по его имени. Размещается непосредственно в поле `match`.

```ts
split({
  source: Unit<T>
  // стор кейса
  match: Store<'first' | 'second'>,
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Функция кейса

Функция, возвращающая строку, которая будет вызвана со значением из `source` для выбора итогового кейса по его имени. Размещается непосредственно в поле `match`, должна быть .

```ts
split({
  source: Unit<T>
  // функция кейса
  match: (value: T) => 'first' | 'second',
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Стор сопоставления

`Boolean` store, который указывает, следует ли выбрать конкретный кейс или попробовать следующий. Размещается в полях объекта `match`, может быть смешано с функциями сопоставления.

```ts
split({
  source: Unit<T>
  match: {
    // стор сопоставления
    first: Store<boolean>,
    second: Store<boolean>
  },
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Функция сопоставления

> INFO Обратите внимание:
>
> Стор кейса, функция кейса и стор сопоставления поддерживаются с [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

Функция, возвращающая `boolean` значение, которое указывает, следует ли выбрать конкретный кейс или попробовать следующий. Размещается в полях объекта `match`, может быть смешано с store сопоставления, должна быть .

```ts
split({
  source: Unit<T>
  match: {
    // функция сопоставления
    first: (value: T) => boolean,
    second: (value: T) => boolean
  },
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

## Методы

### `split({ source, match, cases })`

> INFO Начиная с:
>
> [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

#### Формула

```ts
split({ source, match, cases });
```

```ts
split({
  source: Unit<T>
  // функция кейса
  match: (data: T) => 'a' | 'b',
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
split({
  source: Unit<T>
  // стор кейса
  match: Store<'a' | 'b'>,
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
split({
  source: Unit<T>
  match: {
    // функция сопоставления
    a: (data: T) => boolean,
    // стор сопоставления
    b: Store<boolean>
  },
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

#### Аргументы

* `source`: Юнит, который будет запускать вычисления в `split`
* `match`: Одиночное store со строкой, одиночная функция, возвращающая строку или объект с boolean сторами и функциями, возвращающими boolean значение
* `cases`: Объект с юнитами или массивами юнитов, в которые будут переданы данные из `source` после выбора кейса

#### Возвращает

`void`

#### Примеры

##### Базовый

```js
import { split, createEffect, createEvent } from "effector";
const messageReceived = createEvent();
const showTextPopup = createEvent();
const playAudio = createEvent();
const reportUnknownMessageTypeFx = createEffect(({ type }) => {
  console.log("неизвестное сообщение:", type);
});

split({
  source: messageReceived,
  match: {
    text: (msg) => msg.type === "text",
    audio: (msg) => msg.type === "audio",
  },
  cases: {
    text: showTextPopup,
    audio: playAudio,
    __: reportUnknownMessageTypeFx,
  },
});

showTextPopup.watch(({ value }) => {
  console.log("новое сообщение:", value);
});

messageReceived({
  type: "text",
  value: "Привет",
});
// => новое сообщение: Привет
messageReceived({
  type: "image",
  imageUrl: "...",
});
// => неизвестное сообщение: image
```

Попробуйте

##### Прямое сопоставление

Вы также можете сопоставлять напрямую с API хранилища:

```js
import { split, createStore, createEvent, createApi } from "effector";

const messageReceived = createEvent();

const $textContent = createStore([]);

split({
  source: messageReceived,
  match: {
    text: (msg) => msg.type === "text",
    audio: (msg) => msg.type === "audio",
  },
  cases: createApi($textContent, {
    text: (list, { value }) => [...list, value],
    audio: (list, { duration }) => [...list, `аудио ${duration} мс`],
    __: (list) => [...list, "неизвестное сообщение"],
  }),
});

$textContent.watch((messages) => {
  console.log(messages);
});

messageReceived({
  type: "text",
  value: "Привет",
});
// => ['Привет']
messageReceived({
  type: "image",
  imageUrl: "...",
});
// => ['Привет', 'неизвестное сообщение']
messageReceived({
  type: "audio",
  duration: 500,
});
// => ['Привет', 'неизвестное сообщение', 'аудио 500 мс']
```

Попробуйте

##### Кейс с массивами юнитов

```js
import { createEffect, createEvent, createStore, sample, split } from "effector";

const $verificationCode = createStore("12345");
const $error = createStore("");

const modalToInputUsername = createEvent();
const modalToAuthorizationMethod = createEvent();

const checkVerificationCodeFx = createEffect((code) => {
  throw "500";
});

sample({
  clock: verificationCodeSubmitted,
  source: $verificationCode,
  target: checkVerificationCodeFx,
});

split({
  source: checkVerificationCodeFx.failData,
  match: (value) => (["400", "410"].includes(value) ? "verificationCodeError" : "serverError"),
  cases: {
    verificationCodeError: $verificationCodeError,
    serverError: [$error, modalToAuthorizationMethod],
  },
});

$error.updates.watch((value) => console.log("ОШИБКА: " + value));
modalToAuthorizationMethod.watch(() =>
  console.log("Модальное окно с содержимым метода авторизации."),
);
// => ОШИБКА: 500
// => Модальное окно с содержимым метода авторизации.
```

### `split(source, match)`

> INFO Начиная с:
>
> [effector 20.0.0](https://changelog.effector.dev/#effector-20-0-0)

#### Формула

```ts
split(source, match);
```

#### Аргументы

1. `source`: Юнит, который будет запускать вычисления в `split`
2. `match` (*Объект*): Схема кейсов, которая использует имена результирующих событий как ключи и функцию сопоставления\*((value) => Boolean)\*

#### Возвращает

(Объект) – Объект, имеющий ключи, определенные в аргументе `match`, плюс `__`(два подчеркивания) – который обозначает кейс по умолчанию (если ни одно из условий не выполнено).

#### Примеры

##### Базовый

```js
import { createEvent, split } from "effector";

const message = createEvent();

const messageByAuthor = split(message, {
  bob: ({ user }) => user === "bob",
  alice: ({ user }) => user === "alice",
});
messageByAuthor.bob.watch(({ text }) => {
  console.log("[bob]: ", text);
});
messageByAuthor.alice.watch(({ text }) => {
  console.log("[alice]: ", text);
});

message({ user: "bob", text: "Привет" });
// => [bob]: Привет
message({ user: "alice", text: "Привет, bob" });
// => [alice]: Привет, bob

/* кейс по умолчанию, срабатывает, если ни одно из условий не выполнено */
const { __: guest } = messageByAuthor;
guest.watch(({ text }) => {
  console.log("[гость]: ", text);
});
message({ user: "незарегистрированный", text: "привет" });
// => [гость]: привет
```

Попробуйте

> INFO Обратите внимание:
>
> Только первое выполненное сопоставление вызовет результирующее событие

##### Другой пример

```js
import { createEvent, split } from "effector";

const message = createEvent();

const { short, long, medium } = split(message, {
  short: (m) => m.length <= 5,
  medium: (m) => m.length > 5 && m.length <= 10,
  long: (m) => m.length > 10,
});

short.watch((m) => console.log(`короткое сообщение '${m}'`));
medium.watch((m) => console.log(`среднее сообщение '${m}'`));
long.watch((m) => console.log(`длинное сообщение '${m}'`));

message("Привет, Боб!");
// => длинное сообщение 'Привет, Боб!'

message("Привет!");
// => короткое сообщение 'Привет!'
```

Попробуйте

### `split({ source, clock?, match, cases })`

> INFO Начиная с:
>
> [effector 22.2.0](https://changelog.effector.dev/#effector-22-2-0)

Работает так же, как split с кейсами, однако вычисления в `split` будут запущены после срабатывания `clock`.

#### Формула

```js
split({source, clock?, match, cases})
```

#### Аргументы

TBD

#### Примеры

```js
import { createStore, createEvent, createEffect, split } from "effector";

const options = ["save", "delete", "forward"];
const $message = createStore({ id: 1, text: "Принесите мне чашку кофе, пожалуйста!" });
const $mode = createStore("");
const selectedMessageOption = createEvent();
const saveMessageFx = createEffect(() => "save");
const forwardMessageFx = createEffect(() => "forward");
const deleteMessageFx = createEffect(() => "delete");

$mode.on(selectedMessageOption, (mode, opt) => options.find((item) => item === opt) ?? mode);

split({
  source: $message,
  clock: selectedMessageOption,
  match: $mode,
  cases: {
    save: saveMessageFx,
    delete: deleteMessageFx,
    forward: forwardMessageFx,
  },
});

selectedMessageOption("delete"); // ничего не происходит
selectedMessageOption("delete");
```

Попробуйте


# SWC плагин

Официальный SWC плагин может быть использован для SSR и более удобного опыта отладки в проектах, использующих SWC, таких как [Next.js](https://nextjs.org) или Vite с плагином [vite-react-swc](https://github.com/vitejs/vite-plugin-react-swc).

Плагин обладает той же функциональностью, что и встроенный babel-plugin.\
Он предоставляет всем Юнитам уникальные `сиды` (Стабильные Идентификаторы) и имена, а также другую отладочную информацию.

> WARNING Нестабильно:
>
> Этот SWC плагин, как и все другие SWC плагины, в настоящее время считается экспериментальным и нестабильным.
>
> SWC и Next.js могут не следовать semver, когда речь идет о совместимости плагинов.

## Установка

Установите @effector/swc-plugin с помощью предпочитаемого менеджера пакетов.

```bash
npm install -ED @effector/swc-plugin
```

### Версионирование

Чтобы избежать проблем с совместимостью, вызванных критическими изменениями в SWC или Next.js, этот плагин публикует разные ['метки'](https://semver.org/#spec-item-9) для разных версий `@swc/core`. Обратитесь к таблице ниже, чтобы выбрать правильную версию плагина для вашей настройки.

> TIP Примечание:
>
> Для большей стабильности мы рекомендуем зафиксировать версии как вашей среды выполнения (например, Next.js или `@swc/core`), так и версию `@effector/swc-plugin`.
>
> Используйте опцию `--exact`/`--save-exact` в вашем менеджере пакетов, чтобы установить конкретные, совместимые версии. Это гарантирует, что обновления одной зависимости не сломают ваше приложение.

| `@swc/core` version | Next.js version                          | Correct plugin version |
| ------------------- | ---------------------------------------- | ---------------------- |
| `>=1.4.0 <1.6.0`    | `>=14.2.0 <=14.2.15`                     | `@swc1.4.0`            |
| `>=1.6.0 <1.7.0`    | `>=15.0.0-canary.37 <=15.0.0-canary.116` | `@swc1.6.0`            |
| `>=1.7.0 <1.8.0`    | `>=15.0.0-canary.122 <=15.0.2`           | `@swc1.7.0`            |
| `>=1.9.0 <1.10.0`   | `>=15.0.3 <15.2.0`                       | `@swc1.9.0`            |
| `>=1.10.0 <1.11.0`  | `>=15.2.0 <15.2.1`                       | `@swc1.10.0`           |
| `>=1.11.0`          | `>=15.2.1 <15.4.0`                       | `@swc1.11.0`           |
| `>=1.12.0`          | `>=15.4.0`                               | `@swc1.12.0`           |

Для получения дополнительной информации о совместимости обратитесь к документации SWC по [Выбору версии SWC](https://swc.rs/docs/plugin/selecting-swc-core) и интерактивной [таблице совместимости](https://plugins.swc.rs) на сайте SWC.

## Использование

Чтобы использовать плагин, просто добавьте его в конфигурацию вашего инструмента.

### Next.js

Если вы используете [Next.js Compiler](https://nextjs.org/docs/architecture/nextjs-compiler), работающий на SWC, добавьте этот плагин в ваш `next.config.js`.

```js
const nextConfig = {
  experimental: {
    // даже если конфигурация не нужна, передайте объект опций `{}` в плагин
    swcPlugins: [["@effector/swc-plugin", {}]],
  },
};
```

Вам также нужно установить официальные [`@effector/next`](https://github.com/effector/next) привязки, чтобы включить SSR/SSG.

> WARNING Turbopack:
>
> Обратите внимание, что некоторые функции могут не работать при использовании Turbopack с Next.js, особенно с относительными путями в . Используйте на свой страх и риск.

### .swcrc

Добавьте новую запись в опцию `jsc.experimental.plugins` в вашем `.swcrc`.

```json
{
  "$schema": "https://json.schemastore.org/swcrc",
  "jsc": {
    "experimental": {
      "plugins": [["@effector/swc-plugin", {}]]
    }
  }
}
```

## Конфигурация

### `factories`

Укажите массив имен модулей или файлов, которые следует рассматривать как пользовательские фабрики. При использовании SSR фабрики необходимы для обеспечения уникальных SID по всему вашему приложению.

> TIP Примечание:
>
> Пакеты ([`patronum`](https://patronum.effector.dev), [`@farfetched/core`](https://ff.effector.dev/), [`atomic-router`](https://atomic-router.github.io/), [`effector-action`](https://github.com/AlexeyDuybo/effector-action) и [`@withease/factories`](https://withease.effector.dev/factories/)) включены в список фабрик по умолчанию, поэтому вам не нужно явно их перечислять.

#### Формула

```json
["@effector/swc-plugin", { "factories": ["./path/to/factory", "factory-package"] }]
```

* Тип: `string[]`
* По умолчанию: `[]`

Если вы предоставляете относительный путь (начинающийся с `./`), плагин рассматривает его как локальную фабрику относительно корневой директории вашего проекта. Эти фабрики могут быть импортированы только с использованием относительных импортов в вашем коде.

В противном случае, если вы указываете имя пакета или алиас TypeScript, это интерпретируется как точный спецификатор импорта. Вы должны использовать такой импорт точно так, как указано в конфигурации.

#### Примеры

```json
["@effector/swc-plugin", { "factories": ["./src/factory"] }]
```

```ts title="/src/factory.ts"
import { createStore } from "effector";

/* createBooleanStore — это фабрика */
export const createBooleanStore = () => createStore(true);
```

```ts title="/src/widget/user.ts"
import { createBooleanStore } from "../factory";

const $boolean = createBooleanStore(); /* Рассматривается как фабрика! */
```

### `debugSids`

Добавляет полный путь к файлу и имя Юнита к сгенерированным сидам для более удобной отладки проблем с SSR.

#### Формула

```json
["@effector/swc-plugin", { "debugSids": false }]
```

* Тип: `boolean`
* По умолчанию: `false`

### `hmr`

> INFO Начиная с:
>
> `@effector/swc-plugin@0.7.0`

Включите поддержку Hot Module Replacement (HMR) для очистки связей, подписок и побочных эффектов, управляемых Effector. Это предотвращает двойное срабатывание эффектов и наблюдателей.

> WARNING Взаимодействие с фабриками:
>
> Hot Module Replacement работает лучше, когда все фабрики в проекте правильно описаны. Правильная конфигурация фабрик помогает плагину понять, какие подписки нужно удалять при обновлении.

#### Формула

```json
["@effector/swc-plugin", { "hmr": "es" }]
```

* Тип: `"es"` | `"cjs"` | `false`
    * `"es"`: Использует API HMR `import.meta.hot` в сборщиках, основанных на ESM, таких как Vite и Rollup
    * `"cjs"`: Использует API HMR `module.hot` в сборщиках, использующих CommonJS модули, таких как Webpack, Next.js или Metro (React Native)
    * `false`: Отключает Hot Module Replacement.
* По умолчанию: `false`

> INFO Обратите внимание:
>
> При сборке для продакшена убедитесь, что установили опцию `hmr` в `false`, чтобы уменьшить размер бандла и улучшить производительность в runtime.

### `addNames`

Добавляет имена к Юнитам при вызове фабрик (таких как `createStore` или `createDomain`). Это полезно для отладки во время разработки и тестирования, но рекомендуется отключать это для минификации.

#### Формула

```json
["@effector/swc-plugin", { "addNames": true }]
```

* Тип: `boolean`
* По умолчанию: `true`

### `addLoc`

Включает информацию о местоположении (пути к файлам и номера строк) для Юнитов и фабрик. Это полезно для отладки с такими инструментами, как [`effector-logger`](https://github.com/effector/logger).

#### Формула

```json
["@effector/swc-plugin", { "addLoc": true }]
```

* Тип: `boolean`
* По умолчанию: `false`

### `forceScope`

Внедряет `forceScope: true` во все хуки или вызовы `@effector/reflect`, чтобы гарантировать, что ваше приложение всегда использует `Scope` во время рендеринга. Если `Scope` отсутствует, будет выброшена ошибка, что устраняет необходимость в импортах `/scope` или `/ssr`.

> INFO Примечание:
>
> Подробнее о принудительном использовании Scope в документации `effector-react`.

#### Формула

```json
[
  "@effector/swc-plugin",
  {
    "forceScope": { "hooks": true, "reflect": false }
  }
]
```

* Тип: `boolean | { hooks: boolean, reflect: boolean }`
* По умолчанию: `false`

##### `hooks`

Принудительно заставляет все хуки из effector-react и effector-solid, такие как `useUnit` и `useList`, использовать `Scope` в runtime.

##### `reflect`

> INFO Начиная с:
>
> Поддерживается библиотекой `@effector/reflect` начиная с версии `9.0.0`

Для пользователей [`@effector/reflect`](https://github.com/effector/reflect) принудительно заставляет все компоненты, созданные с помощью библиотеки `reflect`, использовать `Scope` в runtime.

### `transformLegacyDomainMethods`

Если включено (по умолчанию), эта опция преобразует создатели Юнитов в Доменах, такие как `domain.event()` или `domain.createEffect()`. Однако это преобразование может быть ненадежным и может повлиять на несвязанный код. Если это ваш случай, отключение этой опции может исправить эти проблемы.

Отключение этой опции **остановит** добавление SID и другой отладочной информации к этим создателям юнитов. Убедитесь, что ваш код не зависит от методов домена перед отключением.

> TIP:
>
> Вместо использования создателей юнитов напрямую на домене, рассмотрите использование аргумента `domain` в обычных методах.

#### Формула

```json
["@effector/swc-plugin", { "transformLegacyDomainMethods": false }]
```

* Тип: `boolean`
* По умолчанию: `true`


# withRegion

```ts
import { withRegion } from "effector";
```

Метод основан на идее управления памятью на основе регионов (см. [Region-based memory management](https://en.wikipedia.org/wiki/Region-based_memory_management) для справки).

## Методы

### `withRegion(unit, callback)`

> INFO Начиная с:
>
> [effector 20.11.0](https://changelog.effector.dev/#effector-20-11-0)

Метод позволяет явно передать владение всеми юнитами (включая связи, созданные с помощью `sample`, `forward` и т.д.), определенными в callback, на `unit`. Как следствие, все созданные связи будут удалены, как только будет вызван `clearNode` на .

#### Формула

```ts
withRegion(unit: Unit<T> | Node, callback: () => void): void
```

#### Аргументы

1. `unit`: *Unit* | *Node* — который будет служить "локальной областью" или "регионом", владеющим всеми юнитами, созданными внутри предоставленного callback. Обычно узел, созданный методом низкого уровня `createNode`, оптимален для этого случая.
2. `callback`: `() => void` — Callback, в котором должны быть определены все соответствующие юниты.

#### Примеры

```js
import { createNode, createEvent, restore, withRegion, clearNode } from "effector";

const first = createEvent();
const second = createEvent();
const $store = restore(first, "");
const region = createNode();

withRegion(region, () => {
  // Следующие связи, созданные с помощью `sample`, принадлежат предоставленному юниту `region`
  // и будут удалены, как только будет вызван `clearNode` на `region`.
  sample({
    clock: second,
    target: first,
  });
});

$store.watch(console.log);

first("привет");
second("мир");

clearNode(region);

second("не вызовет обновлений `$store`");
```


# Справочник API

import FeatureCard from "@components/FeatureCard.astro";
import IconReact from "@icons/React.astro";
import IconVue from "@icons/Vue.astro";
import IconSolid from "@icons/Solid.astro";
import IconEffector from "@icons/Effector.astro";
import IconNextJs from "@icons/NextJs.astro";
import MostUsefulMethods from "@components/MostUsefulMethods.astro";
import { MOST\_USEFUL } from "src/navigation";

Самые часто используемые операторы из пакетов effector.

<MostUsefulMethods items={MOST_USEFUL} />


# Протокол @@unitShape

> INFO Начиная с:
>
> [effector-react 22.4.0](https://changelog.effector.dev/#effector-react-22-4-0), effector-solid 0.22.7

Effector предоставляет способ использования юнитов (Store, Event, Effect) в UI-библиотеках с помощью специальных библиотек, таких как `effector-react`, `effector-solid` и т.д. Обычно они позволяют привязывать любые юниты к UI-фреймворку:

```ts
import { createStore } from "effector";
import { useUnit } from "effector-react";

const $value = createStore("Привет!");

const Component = () => {
  const { value } = useUnit({ value: $value });

  return <p>{value}</p>;
};
```

Но что, если вы хотите создать свою собственную библиотеку на основе effector с какими-то пользовательскими сущностями? Например, вы хотите создать библиотеку маршрутизации с пользовательской сущностью `Route`, и вы хотите позволить пользователям использовать её с привязками `effector-react`:

```ts
import { createRoute } from "my-router-library";
import { useUnit } from "effector-react";

const mainPageRoute = createRoute(/* ... */);

const Component = () => {
  const { params } = useUnit(mainPageRoute);

  return <p>{params.name}</p>;
};
```

Это возможно с помощью протокола `@@unitShape`. Он позволяет определить форму юнита в пользовательской сущности и затем использовать её в UI-библиотеках. Просто добавьте поле `@@unitShape` с функцией, которая возвращает форму юнитов, в вашу сущность:

```ts
function createRoute(/* ... */) {
  const $params = createStore(/* ... */);

  return {
    "@@unitShape": () => ({
      params: $params,
    }),
  };
}
```

### FAQ

***

**Вопрос**: Как часто вызывается функция `@@unitShape`?

**Ответ**: Столько же раз, сколько вызывается сам `useUnit` – это зависит от UI-библиотеки. Например, `effector-react` вызывает её как любой другой хук – один раз за рендер компонента, но `effector-solid` вызывает `useUnit` один раз за монтирование компонента.

***

**Вопрос**: Как я могу узнать, какая UI-библиотека используется для конкретного вызова `@@unitShape`?

**Ответ**: Вы не можете. `@@unitShape` должен быть универсальным для всех UI-библиотек или должен проверять, какая UI-библиотека используется внутри, с помощью методов UI-библиотеки (например, `Context` в React или Solid).


# События в эффекторе

## События

Событие в effector представляет собой действие пользователя, шаг в процессе работы приложения, команду для выполнения или намерение внести изменения. Этот юнит спроектирован как переносчик информации/намерения/состояния внутри приложения, а не как хранилище состояния.

В большинстве случаев рекомендуется создавать события непосредственно внутри модуля, а не размещать их внутри условных операторов или классов, чтобы сохранить простоту и читаемость кода. Исключением из этой рекомендации является использование фабричных функций, однако они также должны вызываться на корневом уровне модуля.

> WARNING Важная информация!:
>
> Экземпляры событий существуют на протяжении всего времени работы приложения и по своей сути представляют часть бизнес-логики.
> Попытки удалить экземпляры и очистить память с целью экономии ресурсов не рекомендуются, так как это может негативно повлиять на функциональность и производительность приложения.

### Вызов события

Существует два способа вызвать событие: императивный и декларативный.
**Императивный** метод подразумевает вызов события как функции:

```ts
import { createEvent } from "effector";

const callHappened = createEvent<void>();

callHappened(); // событие вызвано
```

**Декларативный** подход использует событие как цель для операторов, таких как sample, или как аргумент при передаче в фабричные функции:

```ts
import { createEvent, sample } from "effector";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});
```

Когда вызывается событие `firstTriggered`, событие `secondTriggered` будет вызвано следом, создавая последовательность событий.<br/>
Помните, что не стоит вызывать события в чистых функциях, это не поддерживается!

> TIP Полезно знать:
>
> В Effector любое событие поддерживает только один аргумент.
> Невозможно вызвать событие с двумя или более аргументами, как в `someEvent(first, second)`.

Все аргументы после первого будут проигнорированы.
Команда разработчиков реализовала это правило по определенным причинам, связанным с дизайном и функциональностью.
Такой подход позволяет получить доступ к аргументу в любой ситуации без усложнения типизации.

Если необходимо передать несколько аргументов, объедините их в объект:

```ts
import { createEvent } from "effector";

const requestReceived = createEvent<{ id: number; title: string }>();

requestReceived({ id: 1, title: "example" });
```

Это правило также способствует ясности значения каждого аргумента как на стороне вызова, так и на стороне подписки. Оно способствует чистоте и организованности кода, облегчая его понимание и сопровождение.

> TIP Наименование событий:
>
> Мы предлагаем вам называть события, которые напрямую запускают обновления сторов, как будто они уже произошли, например userChang**ed**.
> Это улучшает читабельность кода.

### Отслеживание события

Для определения момента вызова события effector и его экосистема предлагают различные методы с разными возможностями. Отладка является основным случаем использования, и мы настоятельно рекомендуем использовать [`patronum/debug`](https://patronum.effector.dev/operators/debug/) для отображения момента вызова события и передаваемого им аргумента.

```ts
import { createEvent, sample } from "effector";
import { debug } from "patronum";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});

debug(firstTriggered, secondTriggered);

firstTriggered();
// => [event] firstTriggered undefined
// => [event] secondTriggered undefined
```

Однако, если ваша среда не позволяет добавлять дополнительные зависимости, вы можете использовать метод `createWatch`, который в аргумент принимает объект со значениями

* `unit` — юнит или массив юнитов, за которым вы хотите начать следить
* `fn` — функция, которая вызывается при изменениях юнита, принимает обновленное значение в аргументе
* `scope` — изолированный контекст, инстанс fork'а, для изолированного выполнения

```ts
import { createEvent, sample, createWatch } from "effector";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});

userClicked("value");

const unwatch = createWatch({
  unit: [firstTriggered, secondTriggered],
  fn: (payload) => {
    console.log("[event] triggered");
  },
});

firstTriggered();

// => [event] triggered
// => [event] triggered
```

> INFO Имейте в виду:
>
> Метод `createWatch` не обрабатывает и не сообщает об исключениях, не управляет завершением асинхронных операций и не решает проблемы гонки данных.
> Его основное предназначение - краткосрочная отладка и логирование, или для тестирования, чтобы убедиться, что какой-нибудь юнит был задействован.

### Работа с TypeScript

Когда событие вызывается, TypeScript проверяет, что тип переданного аргумента соответствует типу, определенному в событии, обеспечивая согласованность и безопасность типов в коде.

```ts
import { sample, createEvent } from "effector";

const someHappened = createEvent<number>();
const anotherHappened = createEvent<string>();

sample({
  // @ts-expect-error error:
  // "clock should extend target type";
  // targets: { clockType: number; targetType: string; }
  clock: someHappened,
  target: anotherHappened,
});
```

### Работа с несколькими событиями

События в effector можно комбинировать разными способами для создания более сложной логики. Рассмотрим основные способы:

#### Создание производных событий

Вы можете создать новое событие на основе существующего с помощью метода `map`, которое вызовется после того, как оригинальное событие было вызвано:

```ts mark={5}
import { createEvent, createStore } from "effector";

const userClicked = createEvent<{ id: number; name: string }>();
// Создаем событие, которое будет срабатывать только с именем пользователя
const userNameSelected = userClicked.map(({ name }) => name);
const $userName = createStore("").on(userNameSelected, (_, newName) => newName);

// Примеры использования
userClicked({ id: 1, name: "John" });
// userNameSelected получит значение 'John'
```

> INFO Производные события:
>
> Вы не можете вызывать производные события сами, но вы все еще можете подписываться на них для имзенений состояния или триггера других юнитов.

#### Фильтрация событий

Метод `filter` позволяет создать новое событие, которое срабатывает только при выполнении определенного условия:

```ts mark={11,17}
import { sample, createEvent } from "effector";

type User = { id: number; role: "admin" | "user" };
type Admin = { id: number; role: "admin" };

const userClicked = createEvent<User>();

// Событие вызовется только для admin
const adminClicked = sample({
  clock: userClicked,
  filter: ({ role }) => role === "admin",
});

// Создаем типизированное событие
const typeSafeAdminClicked = sample({
  clock: userClicked,
  filter: (user): user is Admin => user.role === "admin",
});
```

#### Объединение нескольких событий

Вы можете использовать метод `merge`, который объединяет массив юнитов в одно событие, которое будет тригерится при вызове одного из элементов массива:

```ts mark={6}
const buttonClicked = createEvent();
const linkClicked = createEvent();
const iconClicked = createEvent();

// Любое из этих событий вызовет someActionHappened
const anyClicked = merge([buttonClicked, linkClicked, iconClicked]);

sample({
  clock: anyClicked,
  target: someActionHappened,
});
```

Либо можно использовать `sample` с массивом в `clock`, который под капотом также обрабатывает массив с помощью `merge`:

```ts mark={7}
const buttonClicked = createEvent();
const linkClicked = createEvent();
const iconClicked = createEvent();

// Любое из этих событий вызовет someActionHappened
sample({
  clock: [buttonClicked, linkClicked, iconClicked],
  target: someActionHappened,
});
```

#### Создание пред-обработчика события

`event.prepend` - это метод, который создает новое событие, которое будет триггерить исходное событие с предварительным преобразованием данных.

Предположим у вас происходят разные ошибки в приложении с разной структурой, но обработка этих ошибок должна происходить централизованно:

```ts wrap
import { createEvent } from "effector";

// Основное событие обработки ошибок
const showError = createEvent<string>();

// Подписываемся на показ ошибок
sample({
  clock: showError,
  target: processErrorFx, // упустим реализацию эффекта
});

// Создаем специальные события для разных типов ошибок
const showNetworkError = showError.prepend((code: number) => `Ошибка сети: ${code}`);

const showValidationError = showError.prepend((field: string) => `Поле ${field} заполнено неверно`);

// Использование
showNetworkError(404); // 🔴 Ошибка: Ошибка сети: 404
showValidationError("email"); // 🔴 Ошибка: Поле email заполнено неверно
```

В этом примере:

1. Мы имеем основное событие для обработки ошибок, которое принимает строку
2. Используя `prepend` мы создаем два новых события, каждое из которых:

* Принимает свой тип данных
* Преобразовывает эти данные к строке
* Отдает результат основному событию

#### Условное срабатывание событий

Цепочка действий при вызове события может срабатывать на основе состояния сторов:

```ts mark={7}
const buttonClicked = createEvent<void>();
const $isEnabled = createStore(true);

// Событие сработает только если $isEnabled равно true
sample({
  clock: buttonClicked,
  filter: $isEnabled,
  target: actionExecuted,
});
```

> TIP Примечание:
>
> Использование событий через `sample` предпочтительнее прямого вызова событий внутри `watch` или других обработчиков, так как это делает поток данных более явным и предсказуемым.

Ознакомиться с полным API для Event.


# Разделение потоков данных с помощью split

import { Image } from "astro> ASSETS:&#x20;";
import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import ThemeImage from "@components/ThemeImage.astro";

## Разделение потоков данных с помощью split

Метод `split` был создан с целью разделения логики на несколько потоков данных.
Например, вам может потребоваться направить данные по разным путям в зависимости от их содержимого. Это похоже на железнодорожную стрелку, которая направляет поезда по разным путям:

* если форма заполнена неправильно – показать ошибку
* если все корректно – отправить запрос

> INFO Порядок проверки условий:
>
> Условия в `split` проверяются последовательно сверху вниз. Когда находится первое подходящее условие, остальные не проверяются. Учитывайте это при составлении условий.

### Базовое использование `split`

Давайте посмотрим на простой пример – разбор сообщений разных типов:

```ts
import { createEvent, split } from "effector";

const updateUserStatus = createEvent();

const { activeUserUpdated, idleUserUpdated, inactiveUserUpdated } = split(updateUserStatus, {
  activeUserUpdated: (userStatus) => userStatus === "active",
  idleUserUpdated: (userStatus) => userStatus === "idle",
  inactiveUserUpdated: (userStatus) => userStatus === "inactive",
});
```

Логика этого кусочка кода максимально простая. При вызове события `updateUserStatus` мы попадаем в `split`, где проходимся по каждому условию сверху вниз до первого совпадения, а затем `effector` вызывает нужное нам событие.

Учтите, что каждое условие описывается предикатом – функцией, которая возвращает `true` или `false`.

Возможно вы подумали, зачем мне это, если я могу вызывать нужное событие при определенном условии в UI интерфейсе с использованием `if/else`. Однако это то, от чего effector старается избавить вашу UI часть, а именно **бизнес-логика**.

> TIP Примечание:
>
> Вы можете относится к `split` как к реактивному `switch` для юнитов.

### Случай по умолчанию

При использовании метода `split` может произойти ситуация, когда ни один случай не подошел, для того, чтобы обработать такую ситуацию существует специальный случай по умолчанию `__`.

Рассмотрим тот же пример, что и выше, но с использованием случая по умолчанию:

```ts
import { createEvent, split } from "effector";

const updateUserStatus = createEvent();

const { activeUserUpdated, idleUserUpdated, inactiveUserUpdated, __ } = split(updateUserStatus, {
  activeUserUpdated: (userStatus) => userStatus === "active",
  idleUserUpdated: (userStatus) => userStatus === "idle",
  inactiveUserUpdated: (userStatus) => userStatus === "inactive",
});

__.watch((defaultStatus) => console.log("default case with status:", defaultStatus));
activeUserUpdated.watch(() => console.log("active user"));

updateUserStatus("whatever");
updateUserStatus("active");
updateUserStatus("default case");

// Вывод в консоль:
// default case with status: whatever
// active user
// default case with status: default case
```

> INFO По умолчанию отработает 'по умолчанию':
>
> Если ни одно условие не сработает, то в таком случае отработает случай по умолчанию `__`.

### Короткая запись

Метод `split` поддерживает разные методы использование, в зависимости от того, что вам нужно.

Самый короткий способ использования метода `split` – это передать первым аргументом юнит, который служит триггером, а вторым аргументом объект со случаями.

Рассмотрим пример с кнопкой Star и Watch как у гитхаба, :

<ThemeImage
alt='Кнопка "Добавить звезду" для репозитория на гитхабе'
lightImage="/images/split/github-repo-buttons.png"
darkImage="/images/split/github-repo-buttons-dark.png"
height={20}
width={650}
/>

```ts
import { createStore, createEvent, split } from "effector";

type Repo = {
  // ... другие свойства
  isStarred: boolean;
  isWatched: boolean;
};

const toggleStar = createEvent<string>();
const toggleWatch = createEvent<string>();

const $repo = createStore<null | Repo>(null)
  .on(toggleStar, (repo) => ({
    ...repo,
    isStarred: !repo.isStarred,
  }))
  .on(toggleWatch, (repo) => ({ ...repo, isWatched: !repo.isWatched }));

const { starredRepo, unstarredRepo, __ } = split($repo, {
  starredRepo: (repo) => repo.isStarred,
  unstarredRepo: (repo) => !repo.isStarred,
});

// следим за случаем по умолчанию для дебага
__.watch((repo) =>
  console.log("[split toggleStar] Случай по умолчанию отработал со значением ", repo),
);

// где-то в приложении
toggleStar();
```

В этом случае `split` вернет нам объект с **производными событиями**, на которые мы можем подписаться для запуска реактивной цепочки действий.

> TIP Примечание:
>
> Используйте этот вариант, когда у ваc:
>
> * нету зависимости от внешних данных, например от сторов
> * нужен простой и понятный код

### Расширенная запись

Использовании метода `split` в этом варианте нам ничего не возвращает, однако у нас появляется несколько новых возможностей:

1. Мы можем зависить от внешних данных, например от сторов, при помощи параметра `match`
2. Вызов нескольких юнитов при срабатывании кейса передав массив
3. Добавление источника данных через `source` и триггера срабатывания через `clock`

Возьмем в пример случай, когда у нас имеется два режима приложения `user` и `admin`. При срабатывании события в режиме `user` и `admin` у нас происходят разные действия:

```ts
import { createStore, createEvent, split } from "effector";

const adminActionFx = createEffect();
const secondAdminActionFx = createEffect();
const userActionFx = createEffect();
const defaultActionFx = createEffect();
// События для UI
const buttonClicked = createEvent();

// Текущий режим приложения
const $appMode = createStore<"admin" | "user">("user");

// Разные события для разных режимов
split({
  source: buttonClicked,
  match: $appMode, // Логика зависит от текущего режима
  cases: {
    admin: [adminActionFx, secondAdminActionFx],
    user: userActionFx,
    __: defaultActionFx,
  },
});

// При клике одна и та же кнопка делает разные вещи
// в зависимости от режима приложения
buttonClicked();
// -> "Выполняем пользовательское действие" (когда $appMode = 'user')
// -> "Выполняем админское действие" (когда $appMode = 'admin')
```

Более того, вы можете также добавить свойство `clock`, которое работает также как у sample, и будет триггером для срабатывания, а в `source` передать данные стора, которые передадутся в нужный case.
Дополним предыдущий пример следующим кодом:

```ts
// дополним предыдущий код

const adminActionFx = createEffect((currentUser) => {
  // ...
});
const secondAdminActionFx = createEffect((currentUser) => {
  // ...
});

// добавим новый стор
const $currentUser = createStore({
  id: 1,
  name: "Donald",
});

const $appMode = createStore<"admin" | "user">("user");

split({
  clock: buttonClicked,
  // и передадим его как источник данных
  source: $currentUser,
  match: $appMode,
  cases: {
    admin: [adminActionFx, secondAdminActionFx],
    user: userActionFx,
    __: defaultActionFx,
  },
});
```

> WARNING Случай по умолчанию:
>
> Обратите внимание, если вам нужен случай по умолчанию, то вам нужно описать его в объекте `cases`, иначе он не обработается!

В этом случае у нас не получится определить логику работы в момент создания `split`, как в предыдущем примере, он определяется в runtime в зависимости от `$appMode`.

> INFO Особенности использования:
>
> В этом варианте использование `match` принимает в себя юниты, функции и объект, но с определенными условиями:
>
> * **Стор**: если вы используете стор, тогда этот **store должен хранить в себе строковое значение**
> * **Функция:** если вы передаете функцию, то эта **фунция должна вернуть строковое значение, а также быть чистой**!
> * **Объект с сторами**: если вы передаете объект с сторами, тогда вам нужно, чтобы **каждый стор был с булевым значением**
> * **Объект с функциями**: если вы передаете объект с функциями, то **каждая функция должна возвращать булевое значение, и быть чистой**!

#### `match` как стор

Когда `match` принимает стор, значение из этого стора используется как ключ для выбора нужного case:

```ts
const $currentTab = createStore("home");

split({
  source: pageNavigated,
  match: $currentTab,
  cases: {
    home: loadHomeDataFx,
    profile: loadProfileDataFx,
    settings: loadSettingsDataFx,
  },
});
```

#### `match` как функция

При использовании функции в `match`, она должна возвращать строку, которая будет использоваться как ключ case:

```ts
const userActionRequested = createEvent<{ type: string; payload: any }>();

split({
  source: userActionRequested,
  match: (action) => action.type, // Функция возвращает строку
  cases: {
    update: updateUserDataFx,
    delete: deleteUserDataFx,
    create: createUserDataFx,
  },
});
```

#### `match` как объект с сторами

Когда `match` - это объект с сторами, каждый стор должен содержать булево значение. Сработает тот case, чей стор содержит `true`:

```ts
const $isAdmin = createStore(false);
const $isModerator = createStore(false);

split({
  source: postCreated,
  match: {
    admin: $isAdmin,
    moderator: $isModerator,
  },
  cases: {
    admin: createAdminPostFx,
    moderator: createModeratorPostFx,
    __: createUserPostFx,
  },
});
```

#### `match` как объект с функциями

При использовании объекта с функциями, каждая функция должна возвращать булево значение. Сработает первый case, чья функция вернула `true`:

```ts
split({
  source: paymentReceived,
  match: {
    lowAmount: ({ amount }) => amount < 100,
    mediumAmount: ({ amount }) => amount >= 100 && amount < 1000,
    highAmount: ({ amount }) => amount >= 1000,
  },
  cases: {
    lowAmount: processLowPaymentFx,
    mediumAmount: processMediumPaymentFx,
    highAmount: processHighPaymentFx,
  },
});
```

> WARNING Внимание:
>
> Ваши условия в `match` должны быть взаимоисключающие, иначе данные могут пойти не по тому пути, который вы ожидаете. Всегда проверяйте, что условия не пересекаются.

### Практические примеры

#### Работа с формами

```ts
const showFormErrorsFx = createEffect(() => {
  // логика отображение ошибки
});
const submitFormFx = createEffect(() => {
  // логика отображение ошибки
});

const submitForm = createEvent();

const $form = createStore({
  name: "",
  email: "",
  age: 0,
}).on(submitForm, (_, submittedForm) => ({ ...submittedForm }));
// Отдельный стор для ошибок
const $formErrors = createStore({
  name: "",
  email: "",
  age: "",
}).reset(submitForm);

// Проверяем все поля и собираем все ошибки
sample({
  clock: submitForm,
  source: $form,
  fn: (form) => ({
    name: !form.name.trim() ? "Имя обязательно" : "",
    email: !isValidEmail(form.email) ? "Неверный email" : "",
    age: form.age < 18 ? "Возраст должен быть 18+" : "",
  }),
  target: $formErrors,
});

// И только после этого используем split для маршрутизации
split({
  source: $formErrors,
  match: {
    hasErrors: (errors) => Object.values(errors).some((error) => error !== ""),
  },
  cases: {
    hasErrors: showFormErrorsFx,
    __: submitFormFx,
  },
});
```

Давайте разберем этот пример:

Для начала создаём два эффекта: один для показа ошибок, другой для отправки формы. Потом нам нужно где-то хранить данные формы и отдельно ошибки - для этого создаем два стора `$form` и `$formErrors`.
Когда пользователь нажимает "Отправить", срабатывает событие `submitForm`. В этот момент происходят две вещи:

1. Обновляются данные в сторе формы
2. Запускается проверка всех полей на ошибки через sample

В процессе проверки мы смотрим каждое поле и валидируем его.

Все найденные ошибки сохраняются в сторе `$formErrors`.
И вот тут в игру вступает `split`. Он смотрит на все ошибки и решает:

* Если хотя бы в одном поле есть ошибка - ❌ показываем все ошибки пользователю
* Если все поля заполнены правильно - ✅ отправляем форму


# Управление состоянием в effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import SideBySide from "@components/SideBySide/SideBySide.astro";

## Управление состоянием

Состояние в effector управляется через сторы (Store) - специальные объекты, которые хранят значения и обновляют их при получении событий. Сторы создаются с помощью функции createStore.

> INFO Иммутабельность данных:
>
> Данные сторов в effector иммутабельные – это значит, что вы не должны мутировать массивы или объекты напрямую, а создавать новые инстансы при обновлениях.
>
> <SideBySide>
>
> <Fragment slot="left">
>
> ```ts wrap data-border="good" data-height="full"
> // ✅ Правильно
>
> // обновление массива данных
> $users.on(userAdded, (users, newUser) => [...users, newUser]);
>
> //обновление объекта
> $user.on(nameChanged, (user, newName) => ({
>   ...user,
>   name: newName,
> }));
> ```
>
> </Fragment>
>
>   <Fragment slot="right">
>
> ```ts wrap data-border="bad" data-height="full"
> // ❌ Неправильно
>
> $users.on(userAdded, (users, newUser) => {
>   users.push(newUser); // Мутация!
>   return users;
> });
>
> $user.on(nameChanged, (user, newName) => {
>   user.name = newName; // Мутация!
>   return user;
> });
> ```
>
> </Fragment>
>
> </SideBySide>

### Создание стора

Создать новый стор можно при помощи метода createStore:

```ts
import { createStore } from "effector";

// Создание стора с начальным значением
const $counter = createStore(0);
// с явной типизацией
const $user = createStore<{ name: "Bob"; age: 25 } | null>(null);
const $posts = createStore<Post[]>([]);
```

> TIP Наименование сторов:
>
> В effector принято использовать префикс `$` для сторов. Это улучшает ориентацию в коде и опыт поиска в вашей IDE.

### Чтение значений

Получить текущее значение стора можно несколькими способами:

1. При помощи интеграцией фреймворков и хука `useUnit` (📘 React, 📗 Vue, 📘 Solid):

<Tabs>
  <TabItem label="React">

```ts
import { useUnit } from 'effector-react'
import { $counter } from './model.js'

const Counter = () => {
  const counter = useUnit($counter)

  return <div>{counter}</div>
}
```

  </TabItem>
  <TabItem label="Vue">

```html
<script setup>
  import { useUnit } from "effector-vue/composition";
  import { $counter } from "./model.js";
  const counter = useUnit($counter);
</script>
```

  </TabItem>
  <TabItem label="Solid">

```ts
import { useUnit } from 'effector-solid'
import { $counter } from './model.js'

const Counter = () => {
  const counter = useUnit($counter)

  return <div>{counter()}</div>
}
```

  </TabItem>
</Tabs>

2. Подписка на изменения через `watch` - только для дебага или интеграций

```ts
$counter.watch((counter) => {
  console.log("Counter changed:", counter);
});
```

3. Метод `getState()` - только для интеграций

```ts
console.log($counter.getState()); // 0
```

### Обновление состояния

В effector обновление состояния происходит через события. Вы можете изменить состояние подписавшись на событие через `.on` или при помощи метода sample.

> INFO Оптимизация обновлений:
>
> Состояние стора обновляется когда получает значение, которое не равно (!==) текущему, а также не равно `undefined`.

#### Обновление через события

Самый простой и верный способ обновить стор - это привязать его к событию:

```ts
import { createStore, createEvent } from "effector";

const incremented = createEvent();
const decremented = createEvent();
const resetCounter = createEvent();

const $counter = createStore(0)
  // Увеличиваем значение на 1 при каждом вызове события
  .on(incremented, (counterValue) => counterValue + 1)
  // Уменьшаем значение на 1 при каждом вызове события
  .on(decremented, (counterValue) => counterValue - 1)
  // Сбрасываем значение в 0
  .reset(resetCounter);

$counter.watch((counterValue) => console.log(counterValue));

// Использование
incremented();
incremented();
decremented();

resetCounter();

// Вывод в консоль
// 0 - вывод при инициализации
// 1
// 2
// 1
// 0 - сбросили состояние
```

> INFO Что такое события?:
>
> Если вы не знакомы с `createEvent` и событиями, то вы узнаете как работать с ними на следующей странице.

#### Обновление с параметрами

Обновить стор можно и с помощью параметров события, достаточно лишь передать данные в событие, как у обычной функции, и использовать в обработчике:

```ts mark={12}
import { createStore, createEvent } from "effector";

const userUpdated = createEvent<{ name: string }>();

const $user = createStore({ name: "Bob" });

$user.on(userUpdated, (user, changedUser) => ({
  ...user,
  ...changedUser,
}));

userUpdated({ name: "Alice" });
```

#### Сложная логика обновления

При помощи метода `on` мы можем обновить состояние стора для простых случаев, при срабатывании какого-то события, передав данные из события либо обновить на основе предыдущего значения.

Однако это не всегда покрывает все нужды. Для более сложной логики обновления состояния мы можем воспользоваться методом sample, который помогает нам в случае когда:

* Нужно контролировать обновление стора при помощи события
* Требуется обновить стор на основе значений других сторов
* Нужна трансформация данных перед обновлением стора с доступом к актуальным значениям других сторов

Например:

```ts
import { createEvent, createStore, sample } from "effector";

const updateItems = createEvent();

const $items = createStore([1, 2, 3]);
const $filteredItems = createStore([]);
const $filter = createStore("even");

// sample автоматически предоставляет доступ к актуальным значениям
// всех связанных сторов в момент срабатывания события
sample({
  clock: updateItems,
  source: { items: $items, filter: $filter },
  fn: ({ items, filter }) => {
    if (filter === "even") {
      return items.filter((n) => n % 2 === 0);
    }

    return items.filter((n) => n % 2 === 1);
  },
  target: $filteredItems,
});
```

> INFO Что такое sample?:
>
> О том, что такое `sample`, как использовать этот метод и подробное его описание вы можете познакомиться здесь.

Преимущества `sample` для обновления состояния:

1. Доступ к актуальным значениям всех сторов
2. Атомарность обновлений нескольких сторов
3. Контроль момента обновления через `clock`
4. Возможность фильтрации обновлений через `filter`
5. Удобная трансформация данных через функцию `fn`

#### Создание стора при помощи метода `restore`

Если у вас работа со стором подразумевает замену старого состояние на новое при вызове события, то вы можете использовать метод restore:

```ts mark={5}
import { restore, createEvent } from "effector";

const nameChanged = createEvent<string>();

const $counter = restore(nameChanged, "");
```

Код выше эквивалентен коду ниже:

```ts mark={5}
import { createStore, createEvent } from "effector";

const nameChanged = createEvent<string>();

const $counter = createStore("").on(nameChanged, (_, newName) => newName);
```

Также метод `restore` можно использовать и с эффектом, в таком случае в стор попадут данные из события эффекта doneData, а дефолтное значение стора должно соответствовать возвращаемому значению:

> INFO Что такое эффекты?:
>
> Если вы не знакомы с `createEffect` и эффектами, то вы узнаете как работать с ними на этой странице.
```ts
import { restore, createEffect } from "effector";

// упустим реализацию типов
const createUserFx = createEffect<string, User>((id) => {
  return {
    id: 4,
    name: "Bob",
    age: 18,
  };
});

const $newUser = restore(createUserFx, {
  id: 0,
  name: "",
  age: -1,
});

createUserFx();

// После успешного завершения работы эффекта
// $newUser будет:
//   {
// 		id: 4,
// 		name: "Bob",
// 		age: 18,
//   }
```

#### Множественные обновления

Стор не ограничен одной подпиской на событие, вы можете подписаться на столько событий, сколько вам нужно, а также подписываться на одно и то же событие разными сторами:

```ts "categoryChanged"
import { createEvent, createStore } from "effector";

const categoryChanged = createEvent<string>();
const searchQueryChanged = createEvent<string>();
const filtersReset = createEvent();

const $lastUsedFilter = createStore<string | null>(null);
const $filters = createStore({
  category: "all",
  searchQuery: "",
});

// подписываемся двумя разными сторами на одно и то же событие
$lastUsedFilter.on(categoryChanged, (_, categoty) => category);
$filters.on(categoryChanged, (filters, category) => ({
  ...filters,
  category,
}));

$filters.on(searchQueryChanged, (filters, searchQuery) => ({
  ...filters,
  searchQuery,
}));

$filters.reset(filtersReset);
```

В этом примере мы подписываемся стором `$filters` на несколько событий, а также двумя сторами `$filters` и `$lastUsedFilter` на одно и то же событие `categoryChanged`.

#### Упрощение обновлений с `createApi`

Когда вам нужно создать множество обработчиков для одного стора, вместо создания отдельных событий и подписки на них, вы можете использовать createApi. Эта функция создает набор событий для обновления стора в одном месте.<br/>
Следующие примеры кода эквиваленты:

<SideBySide>

<Fragment slot="left">

```ts wrap data-height="full"
// createApi

import { createStore, createApi } from "effector";

const $counter = createStore(0);

const { increment, decrement, reset } = createApi($counter, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
  reset: () => 0,
});

// Использование
increment(); // 1
reset(); // 0
```

</Fragment>

  <Fragment slot="right">

```ts wrap data-height="full"
// Обычное использование

import { createStore, createEvent } from "effector";

const $counter = createStore(0);

const incrementClicked = createEvent();
const decrementClicked = createEvent();
const resetClicked = createEvent();

$counter
  .on(incrementClicked, (state) => state + 1)
  .on(decrementClicked, (state) => state - 1)
  .reset(resetClicked);

// Использование
increment(); // 1
reset(); // 0
```

  </Fragment>

</SideBySide>

### Производные сторы

Часто нужно создать стор, значение которого зависит от других состояний. Для этого используется метод map:

```ts
import { createStore, combine } from "effector";

const $currentUser = createStore({
  id: 1,
  name: "Winnie Pooh",
});
const $users = createStore<User[]>([]);

// Отфильтрованный список
const $activeUsers = $users.map((users) => users.filter((user) => user.active));

// Вычисляемое значение
const $totalUsersCount = $users.map((users) => users.length);
const $activeUsersCount = $activeUsers.map((users) => users.length);

// Комбинация нескольких сторов
const $friendsList = combine($users, $currentUser, (users, currentUser) =>
  users.filter((user) => user.friendIds.includes(currentUser.id)),
);
```

Мы также использовали здесь метод combine, который позволяет нам объединить значение нескольких сторов в одно.<br/>
Также можно комбинировать сторы в объект:

```ts
import { combine } from "effector";

const $form = combine({
  name: $name,
  age: $age,
  city: $city,
});

// или с дополнительной трансформацией
const $formValidation = combine($name, $age, (name, age) => ({
  isValid: name.length > 0 && age >= 18,
  errors: {
    name: name.length === 0 ? "Required" : null,
    age: age < 18 ? "Must be 18+" : null,
  },
}));
```

> WARNING Важно про производные состояния:
>
> Производные сторы обновляются автоматически при изменении исходных сторов. **Не нужно** вручную синхронизировать их значения.

### Сброс состояния

Вы можете сбросить состояние стора до исходного при помощи метода `reset`:

```ts
const formSubmitted = createEvent();
const formReset = createEvent();

const $form = createStore({ email: "", password: "" })
  // очищаем форму при сабмите и явном сбросе
  .reset(formReset, formSubmitted);
  // или
  .reset([formReset, formSubmitted]);
```

### Значения `undefined`

По умолчанию effector пропускает обновления со значением `undefined`. Это сделано для того, чтобы можно было ничего не возвращать из редьюсеров, если обновление стора не требуется:

```ts
const $store = createStore(0).on(event, (_, newValue) => {
  if (newValue % 2 === 0) {
    return;
  }

  return newValue;
});
```

> WARNING Внимание!:
>
> Это поведение будет отключено в будущем!
> Как показала практика, будет лучше просто возвращать предыдущее значение стора.

Если вам нужно использовать `undefined` как валидное значение, необходимо явно указать с помощью `skipVoid: false` при создании стора:

```ts
import { createStore, createEvent } from "effector";

const setVoidValue = createEvent<number>();

// ❌ undefined будут пропущены
const $store = createStore(13).on(setVoidValue, (_, voidValue) => voidValue);

// ✅ undefined разрешены как значения
const $store = createStore(13, {
  skipVoid: false,
}).on(setVoidValue, (_, voidValue) => voidValue);

setVoidValue(null);
```

> TIP null вместо undefined:
>
> Вы можете использовать `null` вместо `undefined` для отсутствующих значений.

Познакомиться с полным API для сторов тут


# TypeScript в effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## TypeScript в effector

Effector предоставляет первоклассную поддержку TypeScript из коробки, что дает вам надежную типизацию и отличный опыт разработки при работе с библиотекой. В этом разделе мы рассмотрим как базовые концепции типизации, так и продвинутые техники работы с типами в effector.

### Типизация событий

События в effector могут быть типизированы при помощи передачи типа в дженерик функции, однако если не передавать ничего, то в таком случае событие будет с типом `EventCallable<void>`:

```ts
import { createEvent } from "effector";

// Событие без параметров
const clicked = createEvent();
// EventCallable<void>

// Событие с параметром
const userNameChanged = createEvent<string>();
// EventCallable<string>

// Событие со сложным параметром
const formSubmitted = createEvent<{
  username: string;
  password: string;
}>();
// EventCallable<{ username: string;password: string; }>
```

#### Типы событий

В effector для событий может быть несколько типов, где `T` - тип хранимого значения:

1. `EventCallable<T>` - событие, которое может вызвать.
2. `Event<T>` - производное событие, которое нельзя вызвать в ручную.

#### Типизация методов событий

##### `event.prepend`

Чтобы добавить типы к событиям, созданным с помощью event.prepend, необходимо добавить тип либо в аргумент функции `prepend`, либо как дженерик

```typescript
const message = createEvent<string>();

const userMessage = message.prepend((text: string) => text);
// userMessage имеет тип EventCallable<string>

const warningMessage = message.prepend<string>((warnMessage) => warnMessage);
// warningMessage имеет тип EventCallable<string>
```

### Типизация сторов

Сторы также можно типизировать при помощи передачи типа в дженерик функции, либо указав дефолтное значение при инициализации, тогда ts будет выводить тип из этого значения:

```ts
import { createStore } from "effector";

// Базовый стор с примитивным значением
// StoreWritable<number>
const $counter = createStore(0);

// Стор со сложным объектным типом
interface User {
  id: number;
  name: string;
  role: "admin" | "user";
}

// StoreWritable<User>
const $user = createStore<User>({
  id: 1,
  name: "Bob",
  role: "user",
});

// Store<string>
const $userNameAndRole = $user.map((user) => `User name and role: ${user.name} and ${user.role}`);
```

#### Типы сторов

В эффектор существуют два типа сторов, где `T` - тип хранимого значения:

1. `Store<T>` - тип производного стора, в который нельзя записать новые данные.
2. `StoreWritable<T>` - тип стора, в который можно записывать новые данные при помощи `on` или `sample`.

### Типизация эффектов

При обычном использовании TypeScript будет выводить типы в зависимости от возвращаемого результата функции, а также ее аргументов.<br/>
Однако, `createEffect` поддерживает типизацию входных параметров, возвращаемого результата и ошибок через дженерик:

<Tabs>
  <TabItem label="Обычное использование">

```ts
import { createEffect } from "effector";

// Базовый эффект
// Effect<string, User, Error>
const fetchUserFx = createEffect(async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  const result = await response.json();

  return result as User;
});
```

  </TabItem>

  <TabItem label="Типизация через дженерик">

```ts
import { createEffect } from "effector";

// Базовый эффект
// Effect<string, User, Error>
const fetchUserFx = createEffect<string, User>(async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  const result = await response.json();

  return result;
});
```

  </TabItem>
</Tabs>

#### Типизация функции обработчика вне эффекта

В случае, если функция обработчик определен вне эффекта, то для типизации вам нужно будет передать тип этой функции:

```ts
const sendMessage = async (params: { text: string }) => {
  // ...
  return "ok";
};

const sendMessageFx = createEffect<typeof sendMessage, AxiosError>(sendMessage);
// => Effect<{text: string}, string, AxiosError>
```

#### Кастомные ошибки эффекта

Некоторый код может выдать исключения только некоторых типов. В эффектах для описания типов ошибок используется третий дженерик `Fail`.

```ts
// Определяем типы ошибок API
interface ApiError {
  code: number;
  message: string;
}

// Создаём типизированный эффект
const fetchUserFx = createEffect<string, User, ApiError>(async (userId) => {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    throw {
      code: response.status,
      message: "Failed to fetch user",
    } as ApiError;
  }

  return response.json();
});
```

### Типизация методов

#### `sample`

##### Типизация `filter`

Если вам необходимо получить конкретный тип, то для этого вам нужно в ручную указать ожидаемый тип, сделать это можно при помощи [типов придикатов](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates):

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();
const userMessage = createEvent<UserMessage>();

sample({
  clock: message,
  filter: (msg): msg is UserMessage => msg.kind === "user",
  target: userMessage,
});
```

Если вам нужно произвести проверку в `filter` на существование данных, то вы можете просто передать `Boolean`:

```ts
import { createEvent, createStore, sample } from "effector";

interface User {
  id: string;
  name: string;
  email: string;
}

// События
const formSubmitted = createEvent();
const userDataSaved = createEvent<User>();

// Состояния
const $currentUser = createStore<User | null>(null);

// При сабмите формы отправляем данные только если юзер существует
sample({
  clock: formSubmitted,
  source: $currentUser,
  filter: Boolean, // отфильтровываем null
  target: userDataSaved,
});

// Теперь userDataSaved получит только существующие данные пользователя
```

##### Типизация `filter` и `fn`

Как упоминалось выше, если использовать предикаты типов в `filter`, то все отработает корректно и в `target` попадет нужный тип.<br/>
Однако, такая механика не отработает как нужно при использовании `filter` и `fn` вместе. В таком случае вам потребуется в ручную указать тип данных параметров `filter`, а также добавить [предикаты типов](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates). Это происходит из-за того, что TypeScript не может корректно вывести тип в `fn` после `filter`, если тип не указан явно. Это ограничение системы типов TypeScript.

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };
type Message = UserMessage | WarnMessage;

const message = createEvent<Message>();
const userText = createEvent<string>();

sample({
  clock: message,
  filter: (msg: Message): msg is UserMessage => msg.kind === "user",
  fn: (msg) => msg.text,
  target: userText,
});

// userMessage has type Event<string>
```

> TIP Оно стало умнее!:
>
> Начиная с TypeScript версии >= 5.5 вы можете не писать предикаты типов, а просто указать тип аргумента, а TypeScript сам поймет, что нужно вывести:
> `filter: (msg: Message) => msg.kind === "user"`,

#### `attach`

Чтобы позволить TypeScript выводить типы создаваемого эффекта, можно добавить тип к первому аргументу `mapParams`, который станет дженериком `Params` у результата:

```ts
const sendTextFx = createEffect<{ message: string }, "ok">(() => {
  // ...

  return "ok";
});

const sendWarningFx = attach({
  effect: sendTextFx,
  mapParams: (warningMessage: string) => ({ message: warningMessage }),
});
// sendWarningFx имеет тип Effect<{message: string}, 'ok'>
```

#### `split`

Вы можете использовать [предикаты типов](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates) для разделения исходного типа события на несколько вариантов:

<Tabs>
  <TabItem label="до 5.5 версии TS">

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();

const { userMessage, warnMessage } = split(message, {
  userMessage: (msg): msg is UserMessage => msg.kind === "user",
  warnMessage: (msg): msg is WarnMessage => msg.kind === "warn",
});
// userMessage имеет тип Event<UserMessage>
// warnMessage имеет тип Event<WarnMessage>
```

  </TabItem>

  <TabItem label="после 5.5 версии TS">

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();

const { userMessage, warnMessage } = split(message, {
  userMessage: (msg) => msg.kind === "user",
  warnMessage: (msg) => msg.kind === "warn",
});
// userMessage имеет тип Event<UserMessage>
// warnMessage имеет тип Event<WarnMessage>
```

  </TabItem>
</Tabs>

#### `createApi`

Чтобы позволить TypeScript выводить типы создаваемых событий, можно добавить тип ко второму аргументу обработчиков

```typescript
const $count = createStore(0);

const { add, sub } = createApi($count, {
  add: (x, add: number) => x + add,
  sub: (x, sub: number) => x - sub,
});

// add имеет тип Event<number>
// sub имеет тип Event<number>
```

#### `is`

Методы группы is могут помочь вывести тип юнита, то есть они действуют как [TypeScript type guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types). Это применяется в написании типизированных утилит:

```ts
export function getUnitType(unit: unknown) {
  if (is.event(unit)) {
    // здесь юнит имеет тип Event<any>
    return "event";
  }
  if (is.effect(unit)) {
    // здесь юнит имеет тип Effect<any, any>
    return "effect";
  }
  if (is.store(unit)) {
    // здесь юнит имеет тип Store<any>
    return "store";
  }
}
```

#### `merge`

При объединении событий можно получить союз их типов:

```ts
import { createEvent, merge } from "effector";

const firstEvent = createEvent<string>();
const secondEvent = createEvent<number>();

const merged = merge([firstEvent, secondEvent]);
// Event<string | number>

// Можно также объединять события с одинаковыми типами
const buttonClicked = createEvent<MouseEvent>();
const linkClicked = createEvent<MouseEvent>();

const anyClick = merge([buttonClicked, linkClicked]);
// Event<MouseEvent>
```

`merge` принимает дженерик параметр, где можно указать какого типа событий он ожидает:

```ts
import { createEvent, merge } from "effector";

const firstEvent = createEvent<string>();
const secondEvent = createEvent<number>();

const merged = merge<number>([firstEvent, secondEvent]);
//                                ^
// Type 'EventCallable<string>' is not assignable to type 'Unit<number>'.
```

### Утилиты для типов

Effector предоставляет набор утилитных типов для работы с типами юнитов:

#### UnitValue

Тип `UnitValue` служит для извлечение типа данных из юнитов:

```ts
import { UnitValue, createEffect, createStore, createEvent } from "effector";

const event = createEvent<{ id: string; name?: string } | { id: string }>();
type UnitEventType = UnitValue<typeof event>;
// {id: string; name?: string | undefined} | {id: string}

const $store = createStore([false, true]);
type UnitStoreType = UnitValue<typeof $store>;
// boolean[]

const effect = createEffect<{ token: string }, any, string>(() => {});
type UnitEffectType = UnitValue<typeof effect>;
// {token: string}

const scope = fork();
type UnitScopeType = UnitValue<typeof scope>;
// any
```

#### StoreValue

`StoreValue` по своей сути похож на `UnitValue`, но работает только со стором:

```ts
import { createStore, StoreValue } from "effector";

const $store = createStore(true);

type StoreValueType = StoreValue<typeof $store>;
// boolean
```

#### EventPayload

Извлекает тип данных из событий.
Похож на `UnitValue`, но только для событий

```ts
import { createEvent, EventPayload } from "effector";

const event = createEvent<{ id: string }>();

type EventPayloadType = EventPayload<typeof event>;
// {id: string}
```

#### EffectParams

Принимает тип эффекта в параметры дженерика, позволяет получить тип параметров эффекта.

```ts
import { createEffect, EffectParams } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => {
  // ...
  return { name: "Alice", isAdmin: false };
});

type EffectParamsType = EffectParams<typeof fx>;
// {id: string}
```

#### EffectResult

Принимает тип эффекта в параметры дженерика, позволяет получить тип возвращаемого значения эффекта.

```ts
import { createEffect, EffectResult } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => ({ name: "Alice", isAdmin: false }));

type EffectResultType = EffectResult<typeof fx>;
// {name: string; isAdmin: boolean}
```

#### EffectError

Принимает тип эффекта в параметры дженерика, позволяет получить тип ошибки эффекта.

```ts
import { createEffect, EffectError } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => ({ name: "Alice", isAdmin: false }));

type EffectErrorType = EffectError<typeof fx>;
// {statusText: string; status: number}
```


# Объединение юнитов

## Композиция юнитов в effector

В Effector есть два мощных инструмента для связывания юнитов между собой: `sample` и `attach`. Хотя они могут показаться похожими, у каждого из них есть свои особенности и сценарии использования.

### Sample: связь данных и событий

`sample` - это универсальный инструмент для связывания юнитов. Его главная задача - брать данные из одного места `source` и передавать их в другое место `target` при срабатывании определённого триггера `clock`.

Общий паттерн работы метода `sample` следующий:

1. Сработай при вызове тригера `clock`
2. Возьми данные из `source`
3. Отфильтруй данные, если все корректно, то верни `true` и иди дальше по цепочке, иначе `false`
4. Преобразуй данные при помощи `fn`
5. Отдай данные в `target`.

#### Базовое использование sample

```ts
import { createStore, createEvent, sample, createEffect } from "effector";

const buttonClicked = createEvent();

const $userName = createStore("Bob");

const fetchUserFx = createEffect((userName) => {
  // логика
});

// При клике на кнопку получаем текущее имя
sample({
  clock: buttonClicked,
  source: $userName,
  target: fetchUserFx,
});
```

> TIP Универсальность sample:
>
> Если вы не укажете `clock`, то источником вызова также может послужить и `source`. Вы должны использовать хотя бы один из этих свойств аргумента!

```ts
import { createStore, sample } from "effector";

const $currentUser = createStore({ name: "Bob", age: 25 });

// создает производный стор, который обновляется, когда source меняется
const $userAge = sample({
  source: $currentUser,
  fn: (user) => user.age,
});
// эквивалентно
const $userAgeViaMap = $currentUser.map((currentUser) => currentUser.age);
```

Как вы можете заметить метод `sample` очень гибкий и может использоваться в различных сценариях:

* Когда нужно взять данные из стора в момент события
* Для трансформации данных перед отправкой
* Для условной обработки через filter
* Для синхронизации нескольких источников данных
* Последовательная цепочка запуска юнитов

#### Фильтрация данных

Вам может потребоваться запустить цепочку вызова, при выполнение каких-то условий, для таких ситуаций метод `sample` позволяет фильтровать данные с помощью параметра `filter`:

```ts
import { createEvent, createStore, sample, createEffect } from "effector";

type UserFormData = {
  username: string;
  age: number;
};

const submitForm = createEvent();

const $formData = createStore<UserFormData>({ username: "", age: 0 });

const submitToServerFx = createEffect((formData: UserFormData) => {
  // логика
});

sample({
  clock: submitForm,
  source: $formData,
  filter: (form) => form.age >= 18 && form.username.length > 0,
  target: submitToServerFx,
});

submitForm();
```

При вызове `submitForm` мы берем данные из source, проверем в `filter` по условиям, если проверка прошла успешно, то возвращаем `true` и вызываем `target`, в ином случае `false` и ничего больше не делаем.

> WARNING Важная информация:
>
> Функции `fn` и `filter` **должны быть чистыми функциями**! Чистая функция - это функция, которая всегда возвращает один и тот же результат для одинаковых входных данных и не производит никаких побочных эффектов (не изменяет данные вне своей области видимости).

#### Трансформация данных

Часто нужно не просто передать данные, но и преобразовать их. Для этого используется параметр `fn`:

```ts
import { createEvent, createStore, sample } from "effector";

const buttonClicked = createEvent();
const $user = createStore({ name: "Bob", age: 25 });
const $userInfo = createStore("");

sample({
  clock: buttonClicked,
  source: $user,
  fn: (user) => `${user.name} is ${user.age} years old`,
  target: $userInfo,
});
```

#### Несколько источников данных

Можно использовать несколько сторов как источник данных:

```ts
import { createEvent, createStore, sample, createEffect } from "effector";

type SubmitSearch = {
  query: string;
  filters: Array<string>;
};

const submitSearchFx = createEffect((params: SubmitSearch) => {
  /// логика
});

const searchClicked = createEvent();

const $searchQuery = createStore("");
const $filters = createStore<string[]>([]);

sample({
  clock: searchClicked,
  source: {
    query: $searchQuery,
    filters: $filters,
  },
  target: submitSearchFx,
});
```

#### Несколько источников вызова `sample`

`sample` позволяет использовать массив событий в качестве `clock`, что очень удобно когда нам нужно обработать одинаковым образом несколько разных триггеров. Это помогает избежать дублирования кода и делает логику более централизованной.

```ts
import { createEvent, createStore, sample } from "effector";

// События для разных действий пользователя
const saveButtonClicked = createEvent();
const ctrlSPressed = createEvent();
const autoSaveTriggered = createEvent();

// Общее хранилище данных
const $formData = createStore({ text: "" });

// Эффект сохранения
const saveDocumentFx = createEffect((data: { text: string }) => {
  // Логика сохранения
});

// Единая точка сохранения документа, которая срабатывает от любого триггера
sample({
  // Все эти события будут вызывать сохранение
  clock: [saveButtonClicked, ctrlSPressed, autoSaveTriggered],
  source: $formData,
  target: saveDocumentFx,
});
```

<!-- todo add link to page about merge and add info block about sample using merge under the hood -->

#### Массив `target` в sample

`sample` позволяет передавать массив юнитов в `target`, что полезно когда одни и те же данные нужно направить в несколько мест одновременно. В `target` можно передать массив любых юнитов - событий, эффектов или сторов.

```ts
import { createEvent, createStore, createEffect, sample } from "effector";

// Создаем юниты куда будут направляться данные
const userDataReceived = createEvent<User>();
const $lastUserData = createStore<User | null>(null);
const saveUserFx = createEffect<User, void>((user) => {
  // Сохраняем пользователя
});
const logUserFx = createEffect<User, void>((user) => {
  // Логируем действия с пользователем
});

const userUpdated = createEvent<User>();

// При обновлении пользователя:
// - Сохраняем данные через saveUserFx
// - Отправляем в систему логирования через logUserFx
// - Обновляем стор $lastUserData
// - Вызываем событие userDataReceived
sample({
  clock: userUpdated,
  target: [saveUserFx, logUserFx, $lastUserData, userDataReceived],
});
```

Важные моменты:

* Все юниты в target должны быть совместимы по типу с данными из `source`/`clock`
* Порядок выполнения целей гарантирован - они будут вызваны в порядке написания
* Можно комбинировать разные типы юнитов в массиве `target`

#### Возвращаемое значение sample

`sample` возвращает юнит, тип которого зависит от конфигурации:

##### С target

Если указан `target`, `sample` вернёт этот же `target`:

```typescript
const $store = createStore(0);
const submitted = createEvent();
const sendData = createEvent<number>();

// result будет иметь тип EventCallable<number>
const result = sample({
  clock: submitted,
  source: $store,
  target: sendData,
});
```

##### Без target

<!-- todo add link to Manage stores page about derived stores -->

Когда `target` не указан, то тип возвращаемого значения зависит от передаваемых параметров.<br/>
Если **НЕ** указан `filter`, а также `clock` и `source` **являются сторами**, то результат будет **производным стором** с типом данных из `source`.<br/>

```ts
import { createStore, sample } from "effector";

const $store = createStore("");
const $secondStore = createStore(0);

const $derived = sample({
  clock: $secondStore,
  source: $store,
});
// $derived будет Store<string>

const $secondDerived = sample({
  clock: $secondStore,
  source: $store,
  fn: () => false,
});
// $secondDerived будет Store<boolean>
```

Если используется `fn`, то тип возвращаемого значения будет соответствовать результату функции.

<!-- todo add link to Events page about derived events -->

В остальных же случаях возвращаемое значение будет **производным событием** с типом данных зависящий от `source`, которое нельзя вызвать самому, однако можно подписаться на него!

> INFO типизация sample:
>
> Метод `sample` полностью типизирован, и принимает тип в зависимости от передаваемых параметров!

```ts
import { createStore, createEvent, sample } from "effector";

const $store = createStore(0);

const submitted = createEvent<string>();

const event = sample({
  clock: submitted,
  source: $store,
});
// event имеет тип Event<number>

const secondSampleEvent = sample({
  clock: submitted,
  source: $store,
  fn: () => true,
});
// Event<true>
```

#### Практический пример

Давайте рассмотрим практический пример, когда при выборе id пользователя нам нужно проверить является ли он админом, сохранить выбранного пользователя в сторе, и на основе выбранного id создать производный стор с данными о пользователе

```ts
import { createStore, createEvent, sample } from "effector";

type User = {
  id: number;
  role: string;
};

const userSelected = createEvent<number>();

const $users = createStore<User[]>([]);

// Создаём производный стор, который будет хранить выбранного пользователя
const $selectedUser = sample({
  clock: userSelected,
  source: $users,
  fn: (users, id) => users.find((user) => user.id === id) || null,
});
// $selectedUser имеет тип Store<User | null>

// Создаём производное событие, которое будет срабатывать только для админов
// если выбранный пользователь админ, то событие сработает сразу
const adminSelected = sample({
  clock: userSelected,
  source: $users,
  // сработает только если пользователь найден и он админ
  filter: (users, id) => !!users.find((user) => user.id === id && user.role === "admin"),
  fn: (users, id) => users.find((user) => user.id === id)!,
});
// adminSelected имеет тип Event<User>

userSelected(2);
```

Полное API для&#x20;

### Attach: специализация эффектов

`attach` - это инструмент для создания новых эффектов на основе существующих, с доступом к данным из сторов. Это особенно полезно когда нужно:

* Добавить контекст к эффекту
* Переиспользовать логику эффекта с разными параметрами
* Инкапсулировать доступ к стору

```ts
import { attach, createEffect, createStore } from "effector";

type SendMessageParams = { text: string; token: string };

// Базовый эффект для отправки данных
const baseSendMessageFx = createEffect<SendMessageParams, void>(async ({ text, token }) => {
  await fetch("/api/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
});

// Стор с токеном авторизации
const $authToken = createStore("default-token");

// Создаём специализированный эффект, который автоматически использует токен
const sendMessageFx = attach({
  effect: baseSendMessageFx,
  source: $authToken,
  mapParams: (text: string, token) => ({
    text,
    token,
  }),
});

// Теперь можно вызывать эффект только с текстом сообщения
sendMessageFx("Hello!"); // токен будет добавлен автоматически
```

Очень удобно использовать `attach` для переиспользования логики:

```ts
const fetchDataFx = createEffect<{ endpoint: string; token: string }, any>();

// Создаём специализированные эффекты для разных эндпоинтов
const fetchUsersFx = attach({
  effect: fetchDataFx,
  mapParams: (_, token) => ({
    endpoint: "/users",
    token,
  }),
  source: $authToken,
});

const fetchProductsFx = attach({
  effect: fetchDataFx,
  mapParams: (_, token) => ({
    endpoint: "/products",
    token,
  }),
  source: $authToken,
});
```

Полное API для&#x20;


# Асинхронность в effector

## Асинхронность в effector с помощью эффектов

Асинхронность — это базовая часть любого современного приложения, и Effector предоставляет удобные инструменты для её обработки. С помощью эффектов (createEffect) можно построить предсказуемую логику работы с асинхронными данными.

> TIP Наименование эффектов:
>
> Команда Effector рекомендует использовать `Fx` постфикс для названия эффектов, это не является обязательным требованием, а рекомендацией к использованию.

### Что такое эффекты?

Эффекты (Effect) — это инструмент Effector для работы с внешними api, или для сторонних эффектов вашего приложения, например:

* Асинхронные запросы на сервер
* Работа с `localStorage`/`indexedDB`
* Любые операции, которые могут либо выполниться либо выкинуть ошибку, или выполняться какое-то время

> TIP полезно знать:
>
> Эффект может быть как асинхронный, так и синхронный.

### Основные состояния эффектов

Работать с эффектами очень удобно благодаря встроенным состояниям и событиям, которые автоматически отслеживает состояние выполнения эффекта:

* `pending` — является стором указывает, выполняется ли эффект, полезно для отображения загрузки.
* `done` — является событием, срабатывает при успешном завершении.
* `fail` — является событием, срабатывает при ошибке.
* `finally` — является событием, срабатывает когда эффект заверешен с ошибкой или успешно.

С полным api `effect` можно познакомиться здесь.

> WARNING Важная заметка:
>
> Не стоит вызывать события или модифицировать состояния эффекта в ручную, effector сам сделает это.

```ts
const fetchUserFx = createEffect(() => {
  /* вызов внешнего api */
});

fetchUserFx.pending.watch((isPending) => console.log("Pending:", isPending));

fetchUserFx.done.watch(({ params, result }) => console.log(`Fetched user ${params}:`, result));

fetchUserFx.finally.watch((value) => {
  if (value.status === "done") {
    console.log("fetchUserFx resolved ", value.result);
  } else {
    console.log("fetchUserFx rejected ", value.error);
  }
});

fetchUserFx.fail.watch(({ params, error }) =>
  console.error(`Failed to fetch user ${params}:`, error),
);

fetchUserFx();
```

### Привязка эффектов к событиям и сторам

#### Заполнить стор данными при завершении эффекта

Допустим мы хотим, чтобы при завершении работы эффекта effector взял данные, которые вернул эффект, и обновил стор с новыми данными, сделать это довольно просто при помощи событий эффекта:

```ts
import { createStore, createEffect } from "effector";

const fetchUserNameFx = createEffect(async (userId: string) => {
  const userData = await fetch(`/api/users/${userId}`);

  return userData.name;
});

const $error = createStore<string | null>(null);
const $userName = createStore("");
const $isLoading = fetchUserNameFx.pending.map((isPending) => isPending);

$error.reset(fetchUserNameFx.done);

$userName.on(fetchUserNameFx.done, (_, { params, result }) => result);
$error.on(fetchUserNameFx.fail, (_, { params, error }) => error.message);
// или 🔃
$userName.on(fetchUserNameFx.doneData, (_, result) => result);
$error.on(fetchUserNameFx.failData, (_, error) => error.message);

$isLoading.watch((loading) => console.log("Is loading:", loading));
```

`doneData` и `failData` являются событиями, которые идентичны `done` и `fail` соответственно, за исключением того, что они получают только `result` и `error` в свои параметры.

#### Вызов эффекта при срабатывании события

В большинстве случаев вы захотите вызвать эффект при срабатывании какого-нибудь события, например подтверждение формы, или нажатие на кнопку, в таких случаях вам поможет метод `sample`, который вызовет `target`, при срабатывании `clock`.

> INFO Функция sample:
>
> Функция `sample` является ключевым элементом для связывания юнитов. Она позволяет вам гибко и легко настроить реактивную логику вашего приложения.
>
> <!-- todo add link to page about sample -->

```ts
import { createEvent, sample } from "effector";

const userLoginFx = createEffect(() => {
  // какая-то логика
});

// Событие для загрузки данных
const formSubmitted = createEvent();

// Связываем событие с эффектом
sample({
  clock: formSubmitted, // Когда сработает
  target: userLoginFx, // Запусти это
});

// где-то в приложении
formSubmitted();
```

### Обработка ошибок в эффектах

Effector предоставляет надежные возможности обработки ошибок. Когда во время выполнения эффекта происходит ошибка, она автоматически перехватывается и обрабатывается через событие `fail`.

Чтобы типизировать ошибку в эффекте, необходимо передать определенный тип в generic третьим параметром функции `createEffect`:

```ts
import { createEffect } from "effector";

class CustomError extends Error {
  // реализация
}

const effect = createEffect<Params, ReturnValue, CustomError>(async () => {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    // Вы можете выбрасывать ошибки, которые будут перехвачены обработчиком .fail
    throw new CustomError(`Не удалось загрузить пользователя: ${response.statusText}`);
  }

  return response.json();
});
```

Если вы выбросите ошибку другого типа, TypeScript покажет вам ошибку.

### Практический пример

Рассмотрим реальный пример, где пользователь вводит ID, а по нажатию кнопки загружаются данные о нём.

```ts
import { createStore, createEvent, createEffect, sample } from "effector";

// Эффект для загрузки данных
const fetchUserFx = createEffect(async (id: number) => {
  const response = await fetch(`/api/user/${id}`);

  if (!response.ok) {
    // можно модифицировать ошибку, прежде чем она попадет в fail/failData
    throw new Error("User not found");
  }

  return response.json();
});

const setId = createEvent<number>();
const submit = createEvent();

const $id = createStore(0);
const $user = createStore<{ name: string } | null>(null);
const $error = createStore<string | null>(null);
const $isLoading = fetchUserFx.pending;

$id.on(setId, (_, id) => id);
$user.on(fetchUserFx.doneData, (_, user) => user);
$error.on(fetchUserFx.fail, (_, { error }) => error.message);
$error.reset(fetchUserFx.done);

// Логика загрузки: запускаем fetchUserFx при submit
sample({
  clock: submit,
  source: $id,
  target: fetchUserFx,
});

// Использование
setId(1); // Устанавливаем ID
submit(); // Загружаем данные
```

<!-- todo О том, как тестировать эффекты вы можете прочитать на странице [Тестирование](/ru/essentials/testing) -->

Ознакомиться с полным API для эффектов


# Приоритет вычислений

Наверняка вы заметили, что функция должна быть чистой... или следить за тем, чтобы в ней не было побочных эффектов. Мы поговорим об этом в текущем разделе – **Приоритет вычислений**.

Реальный пример приоритета в очереди — люди, ожидающие медицинской помощи в больнице, экстренные случаи будут иметь наивысший приоритет и перемещаться в начало очереди, а менее значительные — в конец.

Приоритет вычислений позволяет нам иметь побочные эффекты, и это одна из основных причин создания этой концепции:

* Позволяет сначала выполнить чистые функции.
* Побочные эффекты могут следовать за согласованным состоянием приложения.

На самом деле, чистое вычисление не может быть наблюдаемо вне своей области видимости, поэтому определение ***чистого вычисления***, используемое в этой библиотеке, дает нам возможность оптимизировать группировку.

Приоритет:

[Исходный код](https://github.com/effector/effector/blob/master/src/effector/kernel.ts#L169)

```
1. child -> forward
2. pure -> map, on
3. sampler -> sample, guard, combine
4. effect -> watch, обработчик эффекта
```

> Всякий раз, когда вы разрешаете побочные эффекты в чистых вычислениях, библиотека будет работать по наихудшему сценарию. Тем самым увеличивая несогласованность приложения и нарушая чистые вычисления. Не игнорируйте это.

Давайте рассмотрим приоритизацию на примере ниже.

```js
let count = 0;
const fx = createEffect(() => {
  // побочный эффект 1
  count += 1;
});

fx.done.watch(() => {
  // побочный эффект 1 уже выполнен
  console.log("ожидаем, что count будет 1", count === 1);
  // побочный эффект 2
  count += 1;
});

fx();
// побочный эффект 1 уже выполнен
// побочный эффект 2 также уже выполнен
// это то, что мы ожидали
// это эффект watchmen
console.log("ожидаем, что count будет 2", count === 2);
// пример, который нарушает это соглашение: setState в react
// который откладывает любой побочный эффект на долгое время после вызова setState
```

Запустить пример

> INFO Обратите внимание:
>
> Всякий раз, когда библиотека замечает побочный эффект в чистой функции, она перемещает его в конец [**очереди приоритетов**](https://en.wikipedia.org/wiki/Priority_queue).

Мы надеемся, что эта информация прояснила некоторые моменты в том, как работает библиотека.


# Глоссарий

### Event

*Event* (*событие*, *ивент*) это функция, на вызовы которой можно подписаться. Она может обозначать намерение изменить состояния в приложении, указанием на то, что происходит в приложении, быть командой для управления сущностями, триггером вычислений и так далее.

Event в документации.

### Store

*Store* (*состояние*, *стор*) это объект который хранит состояние. В приложении могут совместно существовать множество состояний

Store в документации.

### Effect

*Effect* это контейнер для сайд-эффектов, возможно асинхронных. В комплекте имеет ряд заранее созданных эвентов и сторов, облегчающих стандартные действия

При императивном вызове всегда возвращает Promise с результатом.

Может иметь один аргумент или не иметь ни одного

Effect в документации

### Domain

*Domain* это способ группировки и применения массовых обработок к юнитам. Домены получают уведомления о создании событий, сторов, эффектов и вложенных доменов. Часто используются для логирования и SSR

Domain в документации

### Unit

Тип данных, используемый для описания бизнес-логики приложений. Большинство методов эффектора имеют дело с обработкой юнитов.
Существует пять типов юнитов: , Event, Effect, Domain и

### Common unit

Обычные юниты можно использовать для запуска обновлений других юнитов. Существует три типа обычных юнитов: Store (стор), Event (событие) и Effect (эффект). **Когда метод принимает юниты, это означает, что он принимает события, эффекты и сторы** в качестве источника реактивных обновлений

### Purity

Большинство функций, передаваемых в методы api не должны вызывать другие события или эффекты: легче рассуждать о потоке данных приложения, когда императивные триггеры сгруппированы внутри обработчиков эффектов, а не рассредоточены по всей бизнес-логике

**Правильно**, императивно:

```js
import { createStore, createEvent } from "effector";

const login = createStore("guest");

const loginSize = login.map((login) => login.length);

const submitLoginSize = createEvent();

loginSize.watch((size) => {
  submitLoginSize(size);
});
```

Запустить пример

`store.map` в документации

`store.watch` в документации

**Правильно**, декларативно:

```js
import { createStore, createEvent, sample } from "effector";

const login = createStore("guest");

const loginSize = login.map((login) => login.length);

const submitLoginSize = createEvent();

sample({
  clock: loginSize,
  target: submitLoginSize,
});
```

Запустить пример

sample в документации

**Неправильно**:

```js
import { createStore, createEvent } from "effector";

const submitLoginSize = createEvent();

const login = createStore("guest");
const loginSize = login.map((login) => {
  // лучше переместить этот вызов в watch или эффект
  submitLoginSize(login.length);
  return login.length;
});
```

### Reducer

```typescript
type StoreReducer<State, E> = (state: State, payload: E) => State | void;
type EventOrEffectReducer<T, E> = (state: T, payload: E) => T;
```

*Reducer* вычисляет новое состояние, учитывая предыдущее состояние и данные из события. Для сторов, если reducer возвращает undefined или то же состояние (===), то обновления не будет

### Watcher

```typescript
type Watcher<T> = (update: T) => any;
```

*Watcher* – функция с сайд-эффектами, для работы которых не нужны возможности по перехвату ошибок и уведомления подписчиков об завершении асинхронной работы. Используется в event.watch, store.watch и хуках домена. Возвращаемое значение игнорируется

### Subscription

```typescript
type Subscription = {
  (): void;
  unsubscribe(): void;
};
```

Функция отмены подписки, после её вызова watcher перестаёт получать обновления и удаляется из памяти. Повторные вызовы функции отмены подписки не делают ничего

> WARNING Предупреждение:
>
> **Ручное управление подписками мешает сосредоточиться на управлении данными и бизнес-логикой** <br/><br/>
> Эффектор предоставляет широкий набор возможностей, чтобы свести необходимость удаления подписок к минимуму. Это отличает его от большинства других реактивных библиотек

[effect]: /ru/api/effector/Effect

[store]: /ru/api/effector/Store

[event]: /ru/api/effector/Event

[domain]: /ru/api/effector/Domain

[scope]: /ru/api/effector/Scope


# Prior Art

### Пейперы

* **Functional Pearl. Weaving a Web** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/weaver+zipper.pdf) *Ralf Hinze and Johan Jeuring*
* **A graph model of data and workflow provenance** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/A+graph+model+of+data+and+workflow+provenance.pdf) <br/> *Umut Acar, Peter Buneman, James Cheney, Jan Van den Bussche, Natalia Kwasnikowska and Stijn Vansummeren*
* **An Applicative Control-Flow Graph Based on Huet’s Zipper** [\[pdf\]](http://zero-bias-papers.s3-website-eu-west-1.amazonaws.com/zipcfg.pdf) <br/> *Norman Ramsey and Joao Dias*
* **Elm: Concurrent FRP for Functional GUIs** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/elm-concurrent-frp.pdf) <br/> *Evan Czaplicki*
* **Inductive Graphs and Functional Graph Algorithms** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Inductive+Graphs+and+Functional+Graph+Algorithms.pdf) <br/> *Martin Erwig*
* **Notes on Graph Algorithms Used in Optimizing Compilers** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Graph+Algorithms+Used+in+Optimizing+Compilers.pdf) <br/> *Carl D. Offner*
* **Backtracking, Interleaving, and Terminating Monad Transformers** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Backtracking%2C+Interleaving%2C+and+Terminating+Monad+Transformers.pdf) <br/> *Oleg Kiselyov, Chung-chieh Shan, Daniel P. Friedman and Amr Sabry*
* **Typed Tagless Final Interpreters** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Typed+Tagless+Final+Interpreters.pdf) *Oleg Kiselyov*

### Книги

* **Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions** [\[book\]](https://www.amazon.com/o/asin/0321200683/ref=nosim/enterpriseint-20), [\[messaging patterns overview\]](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) <br/> *Gregor Hohpe and Bobby Woolf*

### API

* [re-frame](https://github.com/day8/re-frame)
* [flux](https://facebook.github.io/flux/)
* [redux](https://redux.js.org/)
* [redux-act](https://github.com/pauldijou/redux-act)
* [most](https://github.com/cujojs/most)
* nodejs [events](https://nodejs.org/dist/latest-v12.x/docs/api/events.html#events_emitter_on_eventname_listener)


# Sids

## Сторы и их sid

Effector основан на идее атомарного стора. Это означает, что в приложении нет централизованного контроллера состояния или другой точки входа для сбора всех состояний в одном месте.

Итак, возникает вопрос — как отличать юниты между разными окружениями? Например, если мы запускаем приложение на сервере и сериализуем его состояние в JSON, как узнать, какая часть этого JSON должна быть помещена в конкретный стор на клиенте?

Давайте обсудим, как эта проблема решается другими менеджерами состояний.

### Другие менеджеры состояний

#### Один стор

В менеджере состояний с одним стором (например, Redux) этой проблемы вообще не существует. Это один стор, который можно сериализовать и десериализовать без какой-либо дополнительной информации.

> INFO:
>
> Фактически, один стор принуждает вас к созданию уникальных имен для каждой его части неявным образом. В любом объекте вы не сможете создать дублирующие ключи, так что путь к части стора — это уникальный идентификатор этой части.

```ts
// server.ts
import { createStore } from "single-store-state-manager";

function handlerRequest() {
  const store = createStore({ initialValue: null });

  return {
    // Можно просто сериализовать весь стор
    state: JSON.stringify(store.getState()),
  };
}

// client.ts
import { createStore } from "single-store-state-manager";

// Предположим, что сервер поместил состояние в HTML
const serverState = readServerStateFromWindow();

const store = createStore({
  // Просто парсим все состояние и используем его как состояние клиента
  initialValue: JSON.parse(serverState),
});
```

Это здорово, что не нужно никаких дополнительных инструментов для сериализации и десериализации, но у одного стора есть несколько проблем:

* Он не поддерживает tree-shaking и code-splitting, вам все равно придется загружать весь стор
* Из-за своей архитектуры он требует дополнительных инструментов для исправления производительности (например, `reselect`)
* Он не поддерживает микрофронтенды и другие вещи, которые становятся все более популярными

#### Множественные сторы

К сожалению, менеджеры состояний, построенные вокруг идеи множественных сторов, плохо решают эту проблему. Некоторые инструменты предлагают решения, подобные одному стору (MobX), некоторые вообще не пытаются решить эту проблему (Recoil, Zustand).

> INFO:
>
> Например, общий паттерн для решения проблемы сериализации в MobX — это [Root Store Pattern](https://dev.to/ivandotv/mobx-root-store-pattern-with-react-hooks-318d), который разрушает всю идею множественных сторов.

Мы рассматриваем SSR как первоклассного гражданина современных веб-приложений и собираемся поддерживать code-splitting или микрофронтенды.

### Уникальные идентификаторы для каждого стора

Из-за архитектуры с множественными сторов, Effector требует уникального идентификатора для каждого стора. Это строка, которая используется для различения сторов между разными окружениями. В мире Effector такие строки называются `sid`.

\:::tip TL;DR

`sid` — это уникальный идентификатор стора. Он используется для различения сторов между разными окружениями.

\:::

Давайте добавим его в некоторые сторы:

```ts
const $name = createStore(null, { sid: "name" });
const $age = createStore(null, { sid: "age" });
```

Теперь мы можем сериализовать и десериализовать сторы:

```ts
// server.ts
async function handlerRequest() {
  // создаем изолированный экземпляр приложения
  const scope = fork();

  // заполняем сторы данными
  await allSettled($name, { scope, params: "Igor" });
  await allSettled($age, { scope, params: 25 });

  const state = JSON.serialize(serialize(scope));
  // -> { "name": "Igor", "age": 25 }

  return { state };
}
```

После этого кода у нас есть сериализованное состояние нашего приложения. Это простой объект со значениями сторов. Мы можем вернуть его обратно в сторы на клиенте:

```ts
// Предположим, что сервер поместил состояние в HTML
const serverState = readServerStateFromWindow();

const scope = fork({
  // Просто парсим все состояние и используем его как состояние клиента
  values: JSON.parse(serverState),
});
```

Конечно, написание `sid` для каждого стора — это скучная работа. Effector предоставляет способ сделать это автоматически с помощью плагинов для трансформации кода.

#### Автоматический способ

Безусловно, создание уникальных идентификаторов вручную — это довольно скучная работа.

К счастью, существуют effector/babel-plugin и @effector/swc-plugin, которые автоматически создадут sid.

Поскольку инструменты трансляции кода работают на уровне файла и запускаются до этапа сборки, возможно сделать sid **стабильными** для каждого окружения.

> TIP:
>
> Предпочтительно использовать effector/babel-plugin или @effector/swc-plugin вместо добавления sid вручную.

**Пример кода**

Обратите внимание, что здесь нет никакой центральной точки — любое событие любой "фичи" может быть вызвано из любого места, и остальные части будут реагировать соответствующим образом.

```tsx
// src/features/first-name/model.ts
import { createStore, createEvent } from "effector";

export const firstNameChanged = createEvent<string>();
export const $firstName = createStore("");

$firstName.on(firstNameChanged, (_, firstName) => firstName);

// src/features/last-name/model.ts
import { createStore, createEvent } from "effector";

export const lastNameChanged = createEvent<string>();
export const $lastName = createStore("");

$lastName.on(lastNameChanged, (_, lastName) => lastName);

// src/features/form/model.ts
import { createEvent, sample, combine } from "effector";

import { $firstName, firstNameChanged } from "@/features/first-name";
import { $lastName, lastNameChanged } from "@/features/last-name";

export const formValuesFilled = createEvent<{ firstName: string; lastName: string }>();

export const $fullName = combine($firstName, $lastName, (first, last) => `${first} ${last}`);

sample({
  clock: formValuesFilled,
  fn: (values) => values.firstName,
  target: firstNameChanged,
});

sample({
  clock: formValuesFilled,
  fn: (values) => values.lastName,
  target: lastNameChanged,
});
```

Если это приложение было бы SPA или каким-либо другим клиентским приложением, на этом статья была бы закончена.

#### Граница сериализации

Но в случае с рендерингом на стороне сервера всегда есть **граница сериализации** — точка, где все состояние преобразуется в строку, добавляется в ответ сервера и отправляется в браузер клиента.

##### Проблема

И в этот момент нам **все еще нужно собрать состояния всех сторов приложения** каким-то образом!

Кроме того, после того как клиентский браузер получил страницу, нам нужно "гидрировать" все обратно: распаковать эти значения на клиенте и добавить это "серверное" состояние в клиентские экземпляры всех сторов.

##### Решение

Это сложная проблема, и для ее решения effector нужен способ связать "серверное" состояние какого-то стора с его клиентским экземпляром.

Хотя **это можно было бы** сделать путем введения "корневого стора" или чего-то подобного, что управляло бы экземплярами сторов и их состоянием за нас, это также принесло бы нам все минусы этого подхода, например, гораздо более сложный code-splitting — поэтому это все еще нежелательно.

Здесь нам очень помогут сиды. Поскольку сид, по определению, одинаков для одного и того же стора в любом окружении, effector может просто полагаться на него для обработки сериализации состояния и гидрации.

##### Пример

Это универсальный обработчик рендеринга на стороне сервера. Функция `renderHtmlToString` — это деталь реализации, которая будет зависеть от используемого вами фреймворка.

```tsx
// src/server/handler.ts
import { fork, allSettled, serialize } from "effector";

import { formValuesFilled } from "@/features/form";

async function handleServerRequest(req) {
  const scope = fork(); // создает изолированный контейнер для состояния приложения

  // вычисляем состояние приложения в этом scope
  await allSettled(formValuesFilled, {
    scope,
    params: {
      firstName: "John",
      lastName: "Doe",
    },
  });

  // извлекаем значения scope в простой js объект `{[storeSid]: storeState}`
  const values = serialize(scope);

  const serializedState = JSON.stringify(values);

  return renderHtmlToString({
    scripts: [
      `
        <script>
            self._SERVER_STATE_ = ${serializedState}
        </script>
      `,
    ],
  });
}
```

Обратите внимание, что здесь нет прямого импорта каких-либо сторов приложения.
Состояние собирается автоматически, и его сериализованная версия уже содержит всю информацию, которая понадобится для гидрации.

Когда сгенерированный ответ поступает в браузер клиента, серверное состояние должно быть гидрировано в клиентские сторы.
Благодаря сидам, гидрация состояния также работает автоматически:

```tsx
// src/client/index.ts
import { Provider } from "effector-react";

const serverState = window._SERVER_STATE_;

const clientScope = fork({
  values: serverState, // просто назначаем серверное состояние на scope
});

clientScope.getState($lastName); // "Doe"

hydrateApp(
  <Provider value={clientScope}>
    <App />
  </Provider>,
);
```

На этом этапе состояние всех сторов в `clientScope` такое же, как было на сервере, и для этого не потребовалось **никакой** ручной работы.

### Уникальные sid

Стабильность sid'а обеспечивается тем, что они добавляются в код до того, как произойдет какая-либо сборка.

Но поскольку оба плагина, и `babel`, и `swc`, могут "видеть" содержимое только одного файла в каждый момент времени, есть случай, когда sid будут стабильными, но **могут быть не уникальными**.

Чтобы понять почему, нам нужно углубиться немного дальше во внутренности плагинов.

Оба плагина `effector` используют один и тот же подход к трансформации кода. По сути, они делают две вещи:

1. Добавляют `sid` и любую другую мета-информацию к вызовам фабрик Effector, таким как `createStore` или `createEvent`.
2. Оборачивают любые кастомные фабрики с помощью вспомогательной функции `withFactory`, которая позволяет сделать `sid` внутренних юнитов также уникальными.

#### Встроенные фабрики юнитов

Рассмотрим первый случай. Для следующего исходного кода:

```ts
const $name = createStore(null);
```

Плагин применит следующие трансформации:

```ts
const $name = createStore(null, { sid: "j3l44" });
```

> TIP:
>
> Плагины создают `sid` как хэш от местоположения юнита в исходном коде. Это позволяет сделать `sid` уникальными и стабильными.

#### Кастомные фабрики

Второй случай касается кастомных фабрик. Эти фабрики обычно создаются для абстрагирования какого-то общего паттерна.

Примеры кастомных фабрик:

* `createQuery`, `createMutation` из [`farfetched`](https://ff.effector.dev/)
* `debounce`, `throttle` и т.д. из [`patronum`](https://patronum.effector.dev/)
* Любая кастомная фабрика в вашем коде, например фабрика сущности [feature-flag](https://ff.effector.dev/recipes/feature_flags.html)

> TIP:
>
> farfetched, patronum, @effector/reflect, atomic-router и @withease/factories поддерживаются по умолчанию и не требуют дополнительной настройки.

Для этого объяснения мы создадим очень простую фабрику:

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null);

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { createName } from "@/shared/lib/create-name";

const personOne = createName();
const personTwo = createName();
```

Сначала плагин добавит `sid` во внутренние сторы фабрики:

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null, { sid: "ffds2" });

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { createName } from "@/shared/lib/create-name";

const personOne = createName();
const personTwo = createName();
```

Но этого недостаточно, потому что мы можем создать два экземпляра `createName`, и внутренние сторы обоих этих экземпляров будут иметь одинаковые sid!
Эти sid будут стабильными, но не уникальными.

Чтобы исправить это, нам нужно сообщить плагину о нашей кастомной фабрике:

```json
// .babelrc
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
        "factories": ["@/shared/lib/create-name"]
      }
    ]
  ]
}
```

Поскольку плагин "видит" только один файл за раз, нам нужно предоставить ему фактический путь импорта, используемый в модуле.

> TIP:
>
> Если в модуле используются относительные пути импорта, то полный путь от корня проекта должен быть добавлен в список `factories`, чтобы плагин мог его разрешить.
>
> Если используются абсолютные или псевдонимы путей (как в примере), то именно этот псевдонимный путь должен быть добавлен в список `factories`.
>
> Большинство популярных проектов экосистемы уже включены в настройки плагина по умолчанию.

Теперь плагин знает о нашей фабрике, и он обернет `createName` внутренней функцией `withFactory`:

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null, { sid: "ffds2" });

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { withFactory } from "effector";
import { createName } from "@/shared/lib/create-name";

const personOne = withFactory({
  sid: "gre24f",
  fn: () => createName(),
});
const personTwo = withFactory({
  sid: "lpefgd",
  fn: () => createName(),
});
```

Благодаря этому sid внутренних юнитов фабрики также уникальны, и мы можем безопасно сериализовать и десериализовать их.

```ts
personOne.$name.sid; // gre24f|ffds2
personTwo.$name.sid; // lpefgd|ffds2
```

#### Как работает `withFactory`

`withFactory` — это вспомогательная функция, которая позволяет создавать уникальные `sid` для внутренних юнитов. Это функция, которая принимает объект с `sid` и `fn` свойствами. `sid` — это уникальный идентификатор фабрики, а `fn` — функция, которая создает юниты.

Внутренняя реализация `withFactory` довольно проста: она помещает полученный `sid` в глобальную область видимости перед вызовом `fn` и удаляет его после. Любая функция создателя Effector пытается прочитать это глобальное значение при создании и добавляет его значение к `sid` юнита.

```ts
let globalSid = null;

function withFactory({ sid, fn }) {
  globalSid = sid;

  const result = fn();

  globalSid = null;

  return result;
}

function createStore(initialValue, { sid }) {
  if (globalSid) {
    sid = `${globalSid}|${sid}`;
  }

  // ...
}
```

Из-за однопоточной природы JavaScript, использование глобальных переменных для этой цели безопасно.

> INFO:
>
> Конечно, реальная реализация немного сложнее, но идея остается той же.

### Резюме

1. Любой менеджер состояний с множественными сторами требует уникальных идентификаторов для каждого стора, чтобы различать их между разными окружениями.
2. В мире Effector такие строки называются `sid`.
3. Плагины для трансформации кода добавляют `sid` и мета-информацию к созданию юнитов Effector, таких как `createStore` или `createEvent`.
4. Плагины для трансформации кода оборачивают кастомные фабрики вспомогательной функцией `withFactory`, которая позволяет сделать `sid` внутренних юнитов уникальными.


# Лучшие практики и рекомендации в effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Лучшие практики в Effector

В этом разделе собраны рекомендации по эффективной работе с Effector, основанные на опыте сообщества и команды разработчиков.

### Создавайте маленькие сторы

В отличие от Redux, в Effector рекомендуется делать сторы максимально атомарными. Давайте разберем, почему это важно и какие преимущества это дает.

Большие сторы с множеством полей создают несколько проблем:

* Лишние ре-рендеры: При изменении любого поля обновляются все компоненты, подписанные на стор
* Тяжелые вычисления: Каждое обновление требует копирования всего объекта
* Лишние вычисления: если вы имеете производные сторы зависящие от большого стора, то они будут перевычисляться

Атомарные сторы позволяют:

* Обновлять только то, что действительно изменилось
* Подписываться только на нужные данные
* Эффективнее работать с реактивными зависимостями

```ts
// ❌ Большой стор - любое изменение вызывает обновление всего
const $bigStore = createStore({
  profile: { /* много полей */ },
  settings: { /* много полей */ },
  posts: [ /* много постов */ ]
})

// ✅ Атомарные сторы - точечные обновления
const $userName = createStore('')
const $userEmail = createStore('')
const $posts = createStore<Post[]>([])
const $settings = createStore<Settings>({})

// Компонент подписывается только на нужные данные
const UserName = () => {
  const name = useUnit($userName) // Обновляется только при изменении имени
  return <h1>{name}</h1>
}
```

Правила атомарных сторов:

* Один стор = одна ответственность
* Стор должен быть неделимым
* Сторы можно объединять через combine
* Обновление стора не должно затрагивать другие данные

### Immer для сложных объектов

Если ваш стор содержит в себе вложенные структуры, то вы можете использовать всеми любимый [Immer](https://github.com/immerjs/immer) для упрощенного обновления:

```ts
import { createStore } from "effector";
import { produce } from "immer";

const $users = createStore<User[]>([]);

$users.on(userUpdated, (users, updatedUser) =>
  produce(users, (draft) => {
    const user = draft.find((u) => u.id === updatedUser.id);
    if (user) {
      user.profile.settings.theme = updatedUser.profile.settings.theme;
    }
  }),
);
```

### Явный старт приложения

Мы рекомендуем использовать явный старт приложения через специальные события, чтобы запустить инициализацию.

Почему это важно:

1. Контроль жизненного цикла приложения
2. Возможность корректного тестирования
3. Предсказуемое поведение приложения
4. Возможность явного запуска инициализации

```ts
export const appStarted = createEvent();
```

а также подписаться и запустить событие:

<Tabs>
  <TabItem label="Без скоупов">

```ts
import { sample } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

appStarted();
```

  </TabItem>
  <TabItem label="Со скоупами">

```ts
import { sample, allSettled } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

allSettled(appStarted, { scope });
```

  </TabItem>

</Tabs>

### Используйте `scope`

Команда effector рекомендует всегда использовать `Scope`, даже если ваше приложение не использует SSR.
Это необходимо, чтобы в будущем вы могли спокойно мигрировать на режим работы со `Scope`.

### Хук `useUnit`

Использование хука `useUnit` является рекомендуемым способом для работы с юнитами при использовании фреймворков (📘React, 📗Vue и 📘Solid).
Почему нужно использовать `useUnit`:

* Корректная работа со сторами
* Оптимизированные обновления
* Автоматическая работа со  – юниты сами знают в каком скоупе они были вызваны

### Чистые функции

Используйте чистые функции везде, кроме эффектов, для обработки данных, это обеспечивает:

* Детерминированный результат
* Отсутствие сайд-эффектов
* Проще для тестирования
* Легче поддерживать

> TIP Эта работа для эффектов:
>
> Если ваш код может выбросить ошибку или может закончится успехом/неуспехом - то это отличное место для эффектов.

### Отладка

Мы настоятельно рекомендуем вам использовать библиотеку [`patronum`](https://patronum.effector.dev/operators/) и метод [`debug`](https://patronum.effector.dev/operators/debug/).

```ts
import { createStore, createEvent, createEffect } from "effector";
import { debug } from "patronum/debug";

const event = createEvent();
const effect = createEffect().use((payload) => Promise.resolve("result" + payload));
const $store = createStore(0)
  .on(event, (state, value) => state + value)
  .on(effect.done, (state) => state * 10);

debug($store, event, effect);

event(5);
effect("demo");

// => [store] $store 1
// => [event] event 5
// => [store] $store 6
// => [effect] effect demo
// => [effect] effect.done {"params":"demo", "result": "resultdemo"}
// => [store] $store 60
```

Однако вам никто не запрещает использовать `.watch` или createWatch для отладки.

### Фабрики

Создание фабрик это частый паттерн при работе с effector, он облегчает использование однотипного кода. Однако вы можете столкнуться с проблемой одинаковых sid, которые могу помешать при работе с SSR.

Чтобы избежать этой проблемы, мы рекомендуем использовать библиотеку [@withease/factories](https://withease.effector.dev/factories/).

Если если ваша среда не позволяет добавлять дополнительные зависимости, то вы можете создать свою собственную фабрику следуя этим указаниями.

### Работа с сетью

Для удобной работы effector с запросами по сети вы можете использовать [farfetched](https://ff.effector.dev/).

Farfetched предоставляет:

* Мутации и квери
* Готовое апи для кеширование и др.
* Независимость от фреймворков

### Утилиты для работы с effector

В экосистеме Effector находится библиотека [patronum](https://patronum.effector.dev/operators/), которая предоставляет готовые решения для работы с юнитами:

* Управление состоянием (`condition`, `status` и др.)
* Работа со временем (`debounce`, `interval` и др.)
* Функции предикаты (`not`, `or`, `once` и др.)

### Упрощение сложной логики с `createAction`

[`effector-action`](https://github.com/AlexeyDuybo/effector-action) - это библиотека, которая позволяет писать императивный код для сложной условной логики, сохраняя при этом декларативную природу effector.
При этом `effector-action` помогает сделать ваш код более читабельным:

<Tabs>
  <TabItem label="❌ Сложный sample">

```ts
import { sample } from "effector";

sample({
  clock: formSubmitted,
  source: {
    form: $form,
    settings: $settings,
    user: $user,
  },
  filter: ({ form }) => form.isValid,
  fn: ({ form, settings, user }) => ({
    data: form,
    theme: settings.theme,
  }),
  target: submitFormFx,
});

sample({
  clock: formSubmitted,
  source: $form,
  filter: (form) => !form.isValid,
  target: showErrorMessageFx,
});

sample({
  clock: submitFormFx.done,
  source: $settings,
  filter: (settings) => settings.sendNotifications,
  target: sendNotificationFx,
});
```

  </TabItem>

<TabItem label="✅ С createAction">

```ts
import { createAction } from "effector-action";

const submitForm = createAction({
  source: {
    form: $form,
    settings: $settings,
    user: $user,
  },
  target: {
    submitFormFx,
    showErrorMessageFx,
    sendNotificationFx,
  },
  fn: (target, { form, settings, user }) => {
    if (!form.isValid) {
      target.showErrorMessageFx(form.errors);
      return;
    }

    target.submitFormFx({
      data: form,
      theme: settings.theme,
    });
  },
});

createAction(submitFormFx.done, {
  source: $settings,
  target: sendNotificationFx,
  fn: (sendNotification, settings) => {
    if (settings.sendNotifications) {
      sendNotification();
    }
  },
});

submitForm();
```

  </TabItem>
</Tabs>

### Именование

Используйте принятые соглашения об именовании:

* Для сторов – префикс `$`
* Для эффектов – постфикс `fx`, это позволит вам отличать ваши эффекты от событий
* Для событий – правил нет, однако мы предлагаем вам называть события, которые напрямую запускают обновления сторов, как будто они уже произошли.

```ts
const updateUserNameFx = createEffect(() => {});

const userNameUpdated = createEvent();

const $userName = createStore("JS");

$userName.on(userNameUpdated, (_, newName) => newName);

userNameUpdated("TS");
```

> INFO Соглашение об именовании:
>
> Выбор между префиксом или постфиксом в основном является вопросом личных предпочтений. Это необходимо для улучшения опыта поиска в вашей IDE.

### Антипаттерны

#### Использование watch для логики

`watch` следует использовать только для отладки.

<Tabs>
  <TabItem label="❌ Неправильно">

```ts
// Логика в watch
$user.watch((user) => {
  localStorage.setItem("user", JSON.stringify(user));
  api.trackUserUpdate(user);
  someEvent(user.id);
});
```

  </TabItem>
  <TabItem label="✅ Правильно">

```ts
// Отдельные эффекты для сайд-эффектов
const saveToStorageFx = createEffect((user: User) =>
  localStorage.setItem("user", JSON.stringify(user)),
);

const trackUpdateFx = createEffect((user: User) => api.trackUserUpdate(user));

// Связываем через sample
sample({
  clock: $user,
  target: [saveToStorageFx, trackUpdateFx],
});

// Для событий тоже используем sample
sample({
  clock: $user,
  fn: (user) => user.id,
  target: someEvent,
});
```

</TabItem>
</Tabs>

#### Сложные вложенные sample

Избегайте сложных и вложенных цепочек `sample`.

#### Абстрактные названия в колбеках

Используйте осмысленные имена вместо абстрактных `value`, `data`, `item`.

<Tabs>
  <TabItem label="❌ Неправильно">

```ts
$users.on(userAdded, (state, payload) => [...state, payload]);

sample({
  clock: buttonClicked,
  source: $data,
  fn: (data) => data,
  target: someFx,
});
```

  </TabItem>
  <TabItem label="✅ Правильно">

```ts
$users.on(userAdded, (users, newUser) => [...users, newUser]);

sample({
  clock: buttonClicked,
  source: $userData,
  fn: (userData) => userData,
  target: updateUserFx,
});
```

  </TabItem>
</Tabs>

#### Императивные вызовы в эффектах

Не вызывайте события или эффекты императивно внутри других эффектов, вместо этого используйте декларативный стиль.

<Tabs>
  <TabItem label="❌ Неправильно">

```ts
const loginFx = createEffect(async (params) => {
  const user = await api.login(params);

  // Императивные вызовы
  setUser(user);
  redirectFx("/dashboard");
  showNotification("Welcome!");

  return user;
});
```

  </TabItem>
  <TabItem label="✅ Правильно">

```ts
const loginFx = createEffect((params) => api.login(params));
// Связываем через sample
sample({
  clock: loginFx.doneData,
  target: [
    $user, // Обновляем стор
    redirectToDashboardFx,
    showWelcomeNotificationFx,
  ],
});
```

 </TabItem>
</Tabs>

#### Использование getState

Не используйте `$store.getState` для получения значений. Если вам нужно получить данные какого-то стора, то передайте его туда, например в `source` у `sample`:

<Tabs>
  <TabItem label="❌ Неправильно">

```ts
const submitFormFx = createEffect((formData) => {
  // Получаем значения через getState
  const user = $user.getState();
  const settings = $settings.getState();

  return api.submit({
    ...formData,
    userId: user.id,
    theme: settings.theme,
  });
});
```

</TabItem>
  <TabItem label="✅ Правильно">

```ts
// Получаем значения через параметры
const submitFormFx = createEffect(({ form, userId, theme }) => {});

// Получаем все необходимые данные через sample
sample({
  clock: formSubmitted,
  source: {
    form: $form,
    user: $user,
    settings: $settings,
  },
  fn: ({ form, user, settings }) => ({
    form,
    userId: user.id,
    theme: settings.theme,
  }),
  target: submitFormFx,
});
```

  </TabItem>
</Tabs>

#### Бизнес-логика в UI

Не тащите вашу логику в UI элементы, это основная философия effector и то, от чего effector пытается избавить вас, а именно зависимость логики от UI.

Кратко об антипаттернах:

1. Не используйте `watch` для логики, только для отладки
2. Избегайте прямых мутаций в сторах
3. Не создавайте сложные вложенные `sample`, их сложно читать
4. Не используйте большие сторы, используйте атомарный подход
5. Используйте осмысленные названия параметров, а не абстрактные
6. Не вызывайте события внутри эффектов императивно
7. Не используйте `$store.getState` для работы
8. Не тащите логику в UI


# Руководство по миграции

Это руководство охватывает шаги, необходимые для перехода на Effector 23 с предыдущей версии.
В этом релизе несколько функций были объявлены устаревшими:

* Операторы `forward` и `guard`
* Опция `greedy` в `sample` была переименована в `batch`
* Типы "производных" и "вызываемых" юнитов теперь официально разделены
* Возможность использовать `undefined` как магическое значение "пропуска" в редьюсерах

### Устаревание `forward` и `guard`

Эти операторы довольно старые и прошли через множество релизов Effector.
Но все их случаи использования уже покрываются оператором `sample`, поэтому пришло время их убрать. Вы увидите предупреждение об устаревании в консоли для каждого вызова этих операторов в вашем коде.

> TIP Примечание:
>
> Вы можете мигрировать с обоих операторов, используя официальный [ESLint-плагин Effector](https://eslint.effector.dev/), который имеет правила `no-forward` и `no-guard` со встроенной [функцией авто-исправления](https://eslint.org/docs/latest/use/command-line-interface#fix-problems).

### Переименование `greedy` в `batch`

Оператор `sample` имел опцию `greedy` для отключения батчинга обновлений в редких крайних случаях.
Но название "greedy" не было очевидным для пользователей, поэтому оно было переименовано в `batch`, и его сигнатура была инвертирована.

Вы увидите предупреждение об устаревании в консоли для каждого использования опции `greedy` в вашем коде.

> TIP Примечание:
>
> Вы можете мигрировать с одного на другое, просто выполнив "Найти и заменить" от `greedy: true` к `batch: false` в IDE.

### Разделение типов для производных и вызываемых юнитов

Производные юниты теперь полностью отделены от "вызываемых/записываемых":

* Основные фабрики `createEvent` и `createStore` теперь возвращают типы `EventCallable` и `StoreWritable` (поскольку вы можете вызывать и записывать в эти юниты в любой момент).
* Методы и операторы, такие как `unit.map(...)` или `combine(...)`, теперь возвращают типы `Event` и `Store`, которые являются "только для чтения", т.е. вы можете использовать их только как `clock` или `source`, но не как `target`.
* Тип `EventCallable` может быть присвоен типу `Event`, но не наоборот, то же самое для сторов.
* Также есть исключения в рантайме для несоответствия типов.

Скорее всего, вам не нужно будет ничего делать, вы просто получите улучшенные типы.

Но у вас могут возникнуть проблемы с внешними библиотеками, **которые еще не обновлены до Effector 23**:

* Большинство библиотек просто *принимают* юниты как `clock` и `source` – в таком случае всё в порядке.
* Если какой-то оператор из внешней библиотеки принимает юнит как `target`, вы всё равно увидите старый добрый тип `Event` в этом случае, поэтому у вас не будет ошибки типа, даже если на самом деле есть проблема.
* Если какая-то *фабрика* возвращает событие, которое вы должны вызывать в своем коде, то вы получите ошибку типа, и вам нужно будет привести это событие к типу `EventCallable`.

> TIP Примечание:
>
> Если вы столкнулись с любым из этих случаев, просто создайте issue в репозитории этой библиотеки с запросом на поддержку версии Effector 23.
> Владельцы проекта увидят соответствующие ошибки типов в своем исходном коде и тестах, как только обновят Effector в своем репозитории.

Если у вас есть эти проблемы в ваших собственных фабриках или библиотеках, то вы уже должны видеть соответствующие ошибки типов в исходном коде вашей библиотеки.
Просто замените `Event` на `EventCallable`, `Store` на `StoreWritable` или `Unit` на `UnitTargetable` везде, где это уместно (т.е. вы собираетесь вызывать или записывать в эти юниты каким-то образом).

### Устаревание магического `undefined` для пропуска

В Effector есть старая функция: `undefined` используется как "магическое" значение для пропуска обновлений в редьюсерах в редких случаях, например:

```ts
const $value = createStore(0).on(newValueReceived, (_oldValue, newValue) => newValue);
```

☝️ если `newValue` равно `undefined`, то обновление будет пропущено.

Идея сделать каждый маппер и редьюсер работающим как своего рода `filterMap` считалась полезной в ранних версиях Effector, но очень редко используется правильно, а также сбивает с толку и отвлекает, поэтому она должна быть устаревшей и удалена.

Для этого каждая фабрика сторов теперь поддерживает специальную настройку `skipVoid`, которая контролирует, как именно стор должен обрабатывать значение `undefined`. Если установлено `false` – стор будет использовать `undefined` как значение.
Если установлено `true` (устаревшее), стор будет интерпретировать `undefined` как команду "пропустить обновление" и ничего не делать.

Вы увидите предупреждение для каждого возврата `undefined` в ваших мапперах или редьюсерах в вашем коде, с требованием указать явную настройку `skipVoid` для вашего стора.

> TIP Примечание:
>
> Если вы хотите пропустить обновление стора в определенных случаях, то лучше явно вернуть предыдущее состояние, когда это возможно.

Рекомендуется использовать `{skipVoid: false}` всегда, чтобы вы могли использовать `undefined` как обычное значение.

Если вам действительно нужно `undefined` как "магическое значение пропуска" – тогда вы можете использовать `{skipVoid: true}`, чтобы сохранить текущее поведение. Вы всё равно получите предупреждение об устаревании, но только одно для объявления вместо одного для каждого такого обновления.

Настройка `skipVoid` временная и нужна только как способ правильно устареть от этой функции в Effector. В Effector 24 `skipVoid` сам будет устаревшим, а затем удален.

### `useStore` и `useEvent` заменены на `useUnit` в `effector-react`

Мы объединили два старых хука в один, его преимущество в том, что вы можете передать много юнитов сразу, и он батчит все обновления сторов в одно обновление.

Можно безопасно заменить вызовы старых хуков на новый:

```ts
const Component = () => {
  const foo = useStore($foo);
  const bar = useStore($bar);
  const onSubmit = useEvent(triggerSubmit);
};
```

Превращается в:

```ts
const Component = () => {
  const foo = useUnit($foo);
  const bar = useUnit($bar);
  const onSubmit = useUnit(triggerSubmit);
};
```

Или короче:

```ts
const Component = () => {
  const [foo, bar, onSubmit] = useUnit([$foo, $bar, triggerSubmit]);
};
```


# Потеря скоупа

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import SideBySide from "@components/SideBySide/SideBySide.astro";

## Потеря скоупа

Работа юнитов в effector всегда происходит внутри скоупа — глобального или изолированного, созданного через fork(). В глобальном случае контекст потерять невозможно, так как он используется по умолчанию. С изолированным скоупом всё сложнее: при потере скоупа операции начнут выполняться в глобальном режиме, а все обновления данных **не попадут** в скоуп в котором велась работа, и как следствие, клиенту отправится неконсистентное состояние.

Типичные места, где это проявляется:

* `setTimeout` / `setInterval`
* `addEventListener`
* WebSocket
* прямой вызов промисов в эффектах
* сторонние библиотеки с асинхронными API или колбэки.

### Пример проблемы

Мы создадим простой таймер на React, хотя такая же модель поведения при потере скоупа будет соответствовать для любого фреймворка или среды:

<Tabs>

<TabItem label='timer.tsx'>

```tsx
import React from "react";
import { createEvent, createStore, createEffect, scopeBind } from "effector";
import { useUnit } from "effector-react";

const tick = createEvent();
const $timer = createStore(0);

$timer.on(tick, (s) => s + 1);

export function Timer() {
  const [timer, startTimer] = useUnit([$timer, startTimerFx]);

  return (
    <div className="App">
      <div>Timer:{timer} sec</div>
      <button onClick={startTimer}>Start timer</button>
    </div>
  );
}
```

</TabItem>
<TabItem label='app.tsx'>

```tsx
import React from "react";
import { Provider } from "effector-react";
import { fork } from "effector";
import { Timer } from "./timer";

export const scope = fork();

export default function App() {
  return (
    <Provider value={scope}>
      <Timer />
    </Provider>
  );
}
```

</TabItem>

</Tabs>

Теперь добавим эффект, который каждую секунду вызывает `tick`:

```ts
const startTimerFx = createEffect(() => {
  setInterval(() => {
    tick();
  }, 1000);
});
```

[Вот здесь можно потыкать пример](https://codesandbox.io/p/sandbox/nrqw96).<br/>
На первый взгляд мы написали вполне рабочий код, но если запустить таймер, то вы заметите, что UI не обновляется. Это из-за того, что изменения таймера происходят в глобальном скоупе, а наше приложение работает в изолированном, который мы передали в \<Provider>, вы можете это заметить по логам в консоли.

### Как исправить потерю скоупа ?

Чтобы исправить исправить потерю скоупа нужно использовать функцию scopeBind. Этот метод возвращает функцию, привязанную к скоупу в котором метод был вызван, которую в последствии можно безопасно вызывать:

```ts ins={2} "bindedTick"
const startTimerFx = createEffect(() => {
  const bindedTick = scopeBind(tick);

  setInterval(() => {
    bindedTick();
  }, 1000);
});
```

[Обновленный пример кода](https://codesandbox.io/p/devbox/scope-loss-forked-vx4r9x?workspaceId=ws_BJxLCP4FhfNzjg1qXth95S).

Заметьте, что метод scopeBind сам умеет работать с текущим используемым скоупом. Однако, если вам нужно, то вы можете передать нужный скоуп в конфигурационный объект вторым аргументом.

```ts
scopeBind(tick, { scope });
```

> TIP Очистка интервалов:
>
> Не забывайте очищать `setInterval` после завершения работы во избежания утечек памяти. Очищать `setInterval` можно отдельным эффектом, предварительно вернув из первого эффекта его id и сохранив в отдельный стор.

### Почему происходит потеря скоупа?

Давайте представим, то как работает скоуп в effector:

```ts
// наш активный скоуп
let scope;

function process() {
  try {
    scope = "effector";
    asyncProcess();
  } finally {
    scope = undefined;
    console.log("наш скоуп undefined");
  }
}

async function asyncProcess() {
  console.log("у нас есть скоуп", scope); // effector

  await 1;

  // тут мы уже потеряли контекст
  console.log("а здесь скоупа уже нет ", scope); // undefined
}

process();

// Вывод:
// у нас есть скоуп effector
// наш скоуп undefined
// а здесь скоупа уже нет undefined
```

Возможно вас интересует вопрос **"Это проблема именно эффектора?"**, однако это общий принцип работы с асинхронностью в JavaScript, все технологии, которые сталкиваются с необходимостью сохранения контекста в котором происходят вызовы так или иначе обходят это затруднение. Самый характерный пример это [zone.js](https://github.com/angular/angular/tree/main/packages/zone.js),
который для сохранения контекста оборачивает все асинхронные глобальные функции вроде `setTimeout` или `Promise.resolve`. Также способами решения этой проблемы бывает использование генераторов или `ctx.schedule(() => asyncCall())`.

> INFO Будущее решение:
>
> В JavaScript готовится proposal [Async Context](https://github.com/tc39/proposal-async-context), который призван решить проблему потери контекста на уровне языка. Это позволит:
>
> * Сохранять контекст автоматически через все асинхронные вызовы
> * Избавиться от необходимости явного использования scopeBind
> * Получить более предсказуемое поведение асинхронного кода
>
> Как только это предложение войдет в язык и получит широкую поддержку, effector будет обновлен для использования этого нативного решения.

### Связанные API и статьи

* **API**
    * Effect - Описание эффекта, его методов и свойств
    * Scope - Описание скоупа и его методов
    * scopeBind - Метод для привязки юнита к скоупу
    * fork - Оператор для создания скоупа
    * allSettled - Метод для вызова юнита в предоставленном скоупе и ожидания завершения всей цепочки эффектов
* **Статьи**
    * Изолированные контексты
    * Гайд по работе с SSR
    * Гайд по тестированию
    * Важность SID для гидрации сторов


# Рендеринг на стороне сервера (SSR)

Рендеринг на стороне сервера (SSR) означает, что содержимое вашего сайта генерируется на сервере, а затем отправляется в браузер – в наши дни это достигается различными способами.

> INFO Обратите внимание:
>
> Обычно, если рендеринг происходит во время выполнения – это называется SSR. Если рендеринг происходит во время сборки – это обычно называется генерацией на стороне сервера (SSG), что, по сути, является подмножеством SSR.
>
> Эта разница не важна для данного руководства, всё сказанное применимо как к SSR, так и к SSG.

В этом руководстве мы рассмотрим два основных вида шаблонов рендеринга на стороне сервера и то, как effector должен использоваться в этих случаях.

### Неизоморфный SSR

Вам не нужно делать ничего особенного для поддержки неизоморфного SSR/SSG.

В этом случае начальный HTML обычно генерируется отдельно с использованием какого-либо шаблонизатора, который часто работает на другом языке программирования (не JS). Клиентский код в этом случае работает только в браузере клиента и **не используется никаким образом** для генерации ответа сервера.

Этот подход работает для effector, как и для любого другого JavaScript-кода. Любое SPA-приложение, по сути, является крайним случаем этого, так как его HTML-шаблон не содержит никакого контента, кроме ссылки `<script src="my-app.js" />`.

> TIP Примечание:
>
> Если у вас неизоморфный SSR – просто используйте effector так же, как и для SPA-приложения.

### Изоморфный SSR

Когда у вас изоморфное SSR-приложение, **большая часть клиентского кода используется совместно с серверным кодом** и **используется для генерации HTML-ответа**.

Вы также можете думать об этом как о подходе, при котором ваше приложение **начинается на сервере** – а затем передается по сети в браузер клиента, где оно **продолжает** работу, начатую на сервере.

Отсюда и название – несмотря на то, что код собирается и выполняется в разных средах, его вывод остается (в основном) одинаковым при одинаковых входных данных.

Существует множество различных фреймворков, построенных на этом подходе – например, Next.js, Remix.run, Razzle.js, Nuxt.js, Astro и т.д.

> TIP Next.js:
>
> Next.js выполняет SSR/SSG особым образом, что требует некоторой кастомной обработки на стороне effector.
>
> Это делается с помощью специального пакета [`@effector/next`](https://github.com/effector/next) – используйте его, если хотите использовать effector с Next.js.

В этом руководстве мы не будем фокусироваться на каком-либо конкретном фреймворке или реализации сервера – эти детали будут абстрагированы.

#### Sid (Стабильные Идентификаторы)

Для обработки изоморфного SSR с effector нам нужен надежный способ сериализации состояния, чтобы передать его по сети. Для этого нам нужно иметь стабильные идентификаторы (сиды) для каждого стора в нашем приложении.

> INFO Обратите внимание:
>
> Подробное объяснение о sid можно найти здесь.

Чтобы добавить sid'ы – просто используйте один из плагинов effector.

#### Общий код приложения

Основная особенность изоморфного SSR – один и тот же код используется как для серверного, так и для клиентского приложения.

Для примера мы будем использовать очень простое React-приложение счетчик – весь код будет содержаться в одном модуле:

```tsx
// app.tsx
import React from "react";
import { createEvent, createStore, createEffect, sample, combine } from "effector";
import { useUnit } from "effector-react";

// модель
export const appStarted = createEvent();
export const $pathname = createStore<string | null>(null);

const $counter = createStore<number | null>(null);

const fetchUserCounterFx = createEffect(async () => {
  await sleep(100); // в реальной жизни это был бы какой-то API-запрос

  return Math.floor(Math.random() * 100);
});

const buttonClicked = createEvent();
const saveUserCounterFx = createEffect(async (count: number) => {
  await sleep(100); // в реальной жизни это был бы какой-то API-запрос
});

sample({
  clock: appStarted,
  source: $counter,
  filter: (count) => count === null, // если счетчик уже загружен – не загружать его снова
  target: fetchUserCounterFx,
});

sample({
  clock: fetchUserCounterFx.doneData,
  target: $counter,
});

sample({
  clock: buttonClicked,
  source: $counter,
  fn: (count) => count + 1,
  target: [$counter, saveUserCounterFx],
});

const $countUpdatePending = combine(
  [fetchUserCounterFx.pending, saveUserCounterFx.pending],
  (updates) => updates.some((upd) => upd === true),
);

const $isClient = createStore(typeof document !== "undefined", {
  /**
   * Здесь мы явно указываем effector, что это стор, которое зависит от окружения,
   * никогда не должно включаться в сериализацию,
   * так как оно должно всегда вычисляться на основе текущего окружения.
   *
   * Это не обязательно, так как в сериализацию включается только разница изменений состояния,
   * и этот стор не будет изменяться.
   *
   * Но всё же хорошо добавить эту настройку – чтобы подчеркнуть намерение.
   */
  serialize: "ignore",
});

const notifyFx = createEffect((message: string) => {
  alert(message);
});

sample({
  clock: [
    saveUserCounterFx.done.map(() => "Обновление счетчика успешно сохранено"),
    saveUserCounterFx.fail.map(() => "Не удалось сохранить обновление счетчика :("),
  ],
  // Совершенно нормально иметь некоторые ветвления в логике приложения в зависимости от текущего окружения.
  //
  // Здесь мы хотим вызвать уведомление только на клиенте.
  filter: $isClient,
  target: notifyFx,
});

// UI
export function App() {
  const clickButton = useUnit(buttonClicked);
  const { count, updatePending } = useUnit({
    count: $counter,
    updatePending: $countUpdatePending,
  });

  return (
    <div>
      <h1>Приложение-счетчик</h1>
      <h2>
        {updatePending ? "Счетчик обновляется" : `Текущее значение: ${count ?? "неизвестно"}`}
      </h2>
      <button onClick={() => clickButton()}>Обновить счетчик</button>
    </div>
  );
}
```

Это код нашего приложения, который будет использоваться как для рендеринга на стороне сервера, так и для обработки нужд клиента.

> TIP Примечание:
>
> Обратите внимание, что важно, чтобы все юниты effector – сторы, события и т.д. – были "привязаны" к React-компоненту через хук `useUnit`.
>
> Вы можете использовать официальный eslint-плагин effector для проверки этого и следования другим лучшим практикам – посетите сайт [eslint.effector.dev](https://eslint.effector.dev/).

### Точка входа сервера

Путь `<App />` к браузерам клиентов начинается на сервере. Для этого нам нужно создать **отдельную точку входа** для специфического серверного кода, который также будет обрабатывать рендеринг на стороне сервера.

В этом примере мы не будем углубляться в различные возможные реализации серверов – вместо этого мы сосредоточимся на самом обработчике запросов.

> INFO Обратите внимание:
>
> Помимо базовых нужд SSR, таких как вычисление конечного состояния приложения и его сериализация, effector также обрабатывает **изоляцию данных пользователей между запросами**.
>
> Это очень важная функция, так как серверы на Node.js обычно обрабатывают более одного пользовательского запроса одновременно.
>
> Поскольку платформы на основе JS, включая Node.js, обычно имеют один "главный" поток – все логические вычисления происходят в одном контексте, с одной и той же доступной памятью.
> Таким образом, если состояние не изолировано должным образом, один пользователь может получить данные, подготовленные для другого пользователя, что крайне нежелательно.
>
> effector автоматически обрабатывает эту проблему внутри функции `fork`. Подробнее читайте в соответствующей документации.

Это код для обработчика запросов сервера, который содержит всё специфичное для сервера, что нужно сделать.
Обратите внимание, что для значимых частей нашего приложения мы всё ещё используем "общий" код `app.tsx`.

```tsx
// server.tsx
import { renderToString } from "react-dom/server";
import { Provider } from "effector-react";
import { fork, allSettled, serialize } from "effector";

import { appStarted, App, $pathname } from "./app";

export async function handleRequest(req) {
  // 1. Создаем отдельный экземпляр состояния effector – специальный объект `Scope`.
  const scope = fork({
    values: [
      // некоторые части состояния приложения могут быть сразу установлены в нужные значения,
      // до начала любых вычислений.
      [$pathname, req.pathname],
    ],
  });

  // 2. Запускаем логику приложения – все вычисления будут выполнены в соответствии с логикой модели,
  // а также любые необходимые эффекты.
  await allSettled(appStarted, {
    scope,
  });

  // 3. Сериализуем вычисленное состояние, чтобы его можно было передать по сети.
  const storesValues = serialize(scope);

  // 4. Рендерим приложение – также в сериализуемую версию.
  const app = renderToString(
    // Используя Provider с scope, мы указываем <App />, какое состояние сторов использовать.
    <Provider value={scope}>
      <App />
    </Provider>,
  );

  // 5. Подготавливаем сериализованный HTML-ответ.
  //
  // Это граница сериализации (или сети).
  // Точка, в которой всё состояние преобразуется в строку для отправки по сети.
  //
  // Состояние effector сохраняется в виде `<script>`, который установит состояние в глобальный объект.
  // Состояние `react` сохраняется как часть DOM-дерева.
  return `
    <html>
      <head>
        <script>
          self._SERVER_STATE_ = ${JSON.stringify(storesValues)}
        </script>
        <link rel="stylesheet" href="styles.css" />
        <script defer src="app.js" />
      </head>
      <body>
        <div id="app">
          ${app}
        </div>
      </body>
    </html>
  `;
}
```

☝️ В этом коде мы создали HTML-строку, которую пользователь получит по сети и которая содержит сериализованное состояние всего приложения.

### Точка входа клиента

Когда сгенерированная HTML-строка достигает браузера клиента, обрабатывается парсером и все необходимые ресурсы загружены – наш код приложения начинает работать на клиенте.

На этом этапе `<App />` должен восстановить своё предыдущее состояние (которое было вычислено на сервере), чтобы не начинать с нуля, а продолжить с того же места, где работа остановилась на сервере.

Процесс восстановления состояния сервера на клиенте обычно называется **гидрацией**, и это то, что должна делать точка входа клиента:

```tsx
// client.tsx
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { fork, allSettled } from "effector";
import { Provider } from "effector-react";

import { App, appStarted } from "./app";

/**
 * 1. Находим, где сохранено состояние сервера, и извлекаем его.
 *
 * Смотрите код обработчика сервера, чтобы узнать, где оно было сохранено в HTML.
 */
const effectorState = globalThis._SERVER_STATE_;
const reactRoot = document.querySelector("#app");

/**
 * 2. Инициализируем клиентский scope effector с вычисленными на сервере значениями.
 */
const clientScope = fork({
  values: effectorState,
});

/**
 * 3. "Гидрируем" состояние React в DOM-дереве.
 */
hydrateRoot(
  reactRoot,
  <Provider value={clientScope}>
    <App />
  </Provider>,
);

/**
 * 4. Вызываем то же стартовое событие на клиенте.
 *
 * Это необязательно и зависит от того, как организована логика вашего приложения.
 */
allSettled(appStarted, { scope: clientScope });
```

☝️ На этом этапе приложение готово к использованию!

### Итог

1. Вам не нужно делать ничего особенного для **неизоморфного** SSR, все шаблоны, как в SPA, будут работать.
2. Изоморфный SSR требует небольшой специальной подготовки – вам понадобятся sid для сторов.
3. Общий код **изоморфного** SSR-приложения обрабатывает все значимые части – как должен выглядеть UI, как должно вычисляться состояние, когда и какие эффекты должны выполняться.
4. Серверный код вычисляет и **сериализует** всё состояние приложения в HTML-строку.
5. Клиентский код извлекает это состояние и использует его для **"гидрации"** приложения на клиенте.


# Тестирование в effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Написание тестов

Тестирование логики управления состоянием — одна из сильных сторон Effector. Благодаря изолированным контекстам (fork) и контролируемым асинхронным процессам (allSettled), вы можете проверять поведение приложения без необходимости эмулировать весь его цикл работы.

> INFO Что делает fork?:
>
> При помощи вызова функции `fork` мы создаем scope, который можно рассматривать как независимый экземпляр нашего приложения Effector

### Основы тестирования

Effector предоставляет встроенные инструменты для:

* Изоляции состояния: Каждое тестируемое состояние может быть создано в своём собственном контексте. Это предотвращает побочные эффекты.
* Асинхронного выполнения: Все эффекты и события могут быть выполнены и проверены с помощью allSettled.

#### Тестирование сторов

Сторы в Effector тестируются очень просто, так как они представляют собой чистую функцию, управляющую состоянием.

<Tabs>

  <TabItem label="counter.test.js">

```ts
import { counterIncremented, $counter } from "./counter.js";

test("counter should increase by 1", async () => {
  const scope = fork();

  expect(scope.getState($counter)).toEqual(0);

  await allSettled(counterIncremented, { scope });

  expect(scope.getState($counter)).toEqual(1);
});
```

  </TabItem>

```
<TabItem label="counter.js">
```

```ts
import { createStore, createEvent } from "effector";

const counterIncremented = createEvent();

const $counter = createStore(0);

$counter.on(counterIncremented, (counter) => counter + 1);
```

  </TabItem>
</Tabs>

Для изолированного тестирования логики состояния используется fork. Это позволяет тестировать сторы и события **без влияния** на глобальное состояние.

#### Тестирование событий

Для того, чтобы протестировать было ли вызвано событие и сколько раз, можно воспользоваться методом `createWatch`, который создаст подписку на переданный юнит:

```ts
import { createEvent, createWatch, fork } from "effector";
import { userUpdated } from "../";

test("should handle user update with scope", async () => {
  const scope = fork();
  const fn = jest.fn();

  // Создаем watcher в конкретном scope
  const unwatch = createWatch({
    unit: userUpdated,
    fn,
    scope,
  });

  // Запускаем событие в scope
  await allSettled(userUpdated, {
    scope,
  });

  expect(fn).toHaveBeenCalledTimes(1);
});
```

> INFO Почему не watch?:
>
> Мы не использовали `watch` свойство событий, потому что при параллельных тестах мы можем вызывать одно и то же событие, что может вызвать конфликты.

#### Тестирование эффектов

Эффекты можно тестировать, проверяя их успешное выполнение или обработку ошибок.
В случае unit тестирования мы не хотим, чтобы наши эффекты действительно отправляли запрос на сервер, чтобы избежать этого поведения мы можем передать в `fork` дополнительный объект параметр, где в свойство `handlers` добавить список пар `[эффект, замоканный обработчик]`.

<Tabs>

  <TabItem label="effect.test.js">

```ts
import { fork, allSettled } from "effector";
import { getUserProjectsFx } from "./effect.js";

test("effect executes correctly", async () => {
  const scope = fork({
    handlers: [
      // Список [эффект, моковый обработчик] пар
      [getUserProjectsFx, () => "user projects data"],
    ],
  });

  const result = await allSettled(getUserProjectsFx, { scope });

  expect(result.status).toBe("done");
  expect(result.value).toBe("user projects data");
});
```

  </TabItem>

```
<TabItem label="effect.js">
```

```ts
import { createEffect } from "effector";

const getUserProjectsFx = async () => {
  const result = await fetch("/users/projects/2");

  return result.json();
};
```

  </TabItem>
</Tabs>

### Полноценный пример тестирования

Например, у нас есть типичный счетчик, но с асинхронной проверкой через наш бэкэнд. Предположим, у нас следующие требования:

* Когда пользователь нажимает кнопку, мы проверяем, меньше ли текущий счетчик чем 100, и затем проверяем этот клик через наш API бэкэнда.
* Если валидация успешна, увеличиваем счетчик на 1.
* Если проверка не пройдена, нужно сбросить счетчик до нуля.

```ts
import { createEvent, createStore, createEffect, sample } from "effector";

export const buttonClicked = createEvent();

export const validateClickFx = createEffect(async () => {
  /* вызов внешнего api */
});

export const $clicksCount = createStore(0);

sample({
  clock: buttonClicked,
  source: $clicksCount,
  filter: (count) => count < 100,
  target: validateClickFx,
});

sample({
  clock: validateClickFx.done,
  source: $clicksCount,
  fn: (count) => count + 1,
  target: $clicksCount,
});

sample({
  clock: validateClickFx.fail,
  fn: () => 0,
  target: $clicksCount,
});
```

#### Настройка тестов

Наш основной сценарий следующий:

1. Пользователь нажимает на кнопку.
2. Валидация заканчивается успешно.
3. Счетчик увеличивается на 1.

Давайте протестируем это:

1. Создадим новый экземпляр Scope посредством вызова `fork`.
2. Проверим, что изначально счет равен `0`.
3. Затем сымитируем событие `buttonClicked` с использованием `allSettled` – этот промис будет разрешен после завершения всех вычислений.
4. Проверим, что в конце у нас имеется нужное состояние.

```ts
import { fork, allSettled } from "effector";

import { $clicksCount, buttonClicked, validateClickFx } from "./model";

test("main case", async () => {
  const scope = fork(); // 1

  expect(scope.getState($clicksCount)).toEqual(0); // 2

  await allSettled(buttonClicked, { scope }); // 3

  expect(scope.getState($clicksCount)).toEqual(1); // 4
});
```

Однако в этом тесте есть проблема — он использует реальный API бэкенда. Но поскольку это юнит тест, нам следует каким-то образом подменить этот запрос.

#### Кастомные обработчики эффектов

Для того, чтобы нам избежать реального запроса на сервер, мы можем замокать ответ от сервера предоставив кастомный обработчик через конфигурацию `fork`.

```ts
test("main case", async () => {
  const scope = fork({
    handlers: [
      // Список пар [effect, mock handler]
      [validateClickFx, () => true],
    ],
  });

  expect(scope.getState($clicksCount)).toEqual(0);

  await allSettled(buttonClicked, { scope });

  expect(scope.getState($clicksCount)).toEqual(1);
});
```

#### Кастомные значения стора

У нас есть еще один сценарий:

1. Счетчик уже больше 100.
2. Пользователь нажимает кнопку.
3. Должен отсутствовать вызов эффекта.

Для этого случая нам потребуется как-то подменить начальное состояние «больше 100» каким-то образом.

Мы также можем предоставить кастомное начальное значение через конфигурацию `fork`.

```ts
test("bad case", async () => {
  const MOCK_VALUE = 101;
  const mockFunction = testRunner.fn();

  const scope = fork({
    values: [
      // Список пар [store, mockValue]
      [$clicksCount, MOCK_VALUE],
    ],
    handlers: [
      // Список пар [effect, mock handler]
      [
        validateClickFx,
        () => {
          mockFunction();

          return false;
        },
      ],
    ],
  });

  expect(scope.getState($clicksCount)).toEqual(MOCK_VALUE);

  await allSettled(buttonClicked, { scope });

  expect(scope.getState($clicksCount)).toEqual(MOCK_VALUE);
  expect(mockFunction).toHaveBeenCalledTimes(0);
});
```

Вот так мы можем протестировать каждый случай использования, который хотим проверить.


# Исправление ошибок в Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import SideBySide from "@components/SideBySide/SideBySide.astro";

## Исправление ошибок

### Основные ошибки

#### `store: undefined is used to skip updates. To allow undefined as a value provide explicit { skipVoid: false } option`

Эта ошибка сообщает вам о том, что вы пытаетесь передать в ваш стор значение `undefined`, что, возможно, является некорректным поведением.

Если вам действительно нужно передать в ваш стор значение `undefined`, то вам надо вторым аргументом в `createStore` передать объект со свойством `skipVoid: false`.

```ts
const $store = createStore(0, {
  skipVoid: false,
});
```

#### `no handler used in [effect name]`

Эта ошибка возникает при вызове эффекта без обработчика. Убедитесь, что вы передали обработчик в метод `createEffect` при создании, или позже при использовании метода `.use(handler)`.

#### `serialize: One or more stores dont have sids, their values are omitted`

> INFO До версии 23.3.0:
>
> До версии 23.3.0 эта ошибка также известна как: `There is a store without sid in this scope, its value is omitted`.

Эта ошибка часто встречается при работе с SSR, она связана с тем, что у вашего стора отсутствует `сид` (stable id), который необходим для корректной гидрации данных с сервера на клиент.
Чтобы исправить эту проблему вам нужно добавить этот `сид`.<br/>
Сделать это вы можете несколькими способами:

1. Использовать babel или SWC плагин, который сделает все за вас
2. Или добавить `сид` в ручную, передав во второй аргумент `createStore` объект со свойством `sid`:

   ```ts
   const $store = createStore(0, {
     sid: "unique id",
   });
   ```

Более подробно про .

#### `scopeBind: scope not found`

Эта ошибка случается когда скоуп потерялся на каком-то из этапов выполнения и `scopeBind` не может связать событие или эффект с нужным скоупом выполнения.<br/>
Эта ошибка могла быть вызвана:

1. Вы используете режим работы 'без скоупа' и у вас их нет в приложении
2. Ваши юниты были вызваны вне скоупа

Возможные решения:

1. Используйте `scopeBind` внутри эффектов:

   ```ts
   const event = createEvent();

   // ❌ - не вызывайте scopeBind внутри колбеков
   const effectFx = createEffect(() => {
     setTimeout(() => {
       scopeBind(event)();
     }, 1111);
   });

   // ✅ - используйте scopeBind внутри эффекта
   const effectFx = createEffect(() => {
     const scopeEvent = scopeBind(event);

     setTimeout(() => {
       scopeEvent();
     }, 1111);
   });
   ```

2. Ваши юниты должны быть вызваны внутри скоупа:
    * При работе с фреймворком используйте `useUnit`
    * Если у вас происходит вызов события или эффекта вне фреймворка, то используйте `allSettled` и передайте нужный `scope` в аргумент

Если того требует ваша реализация, а от ошибки нужно избавиться, то вы можете передать свойство `safe:true` во второй аргумент метода.

```ts
const scopeEvent = scopeBind(event, {
  safe: true,
});
```

#### `call of derived event is not supported, use createEvent instead`

Эта ошибка возникает, когда вы пытаетесь вызвать производное событие как функцию. Производные события создаются методами как `.map()`, `.filter()`, `.filterMap()`, а также оператором `sample`.

Чтобы исправить используйте событие созданное через `createEvent`.

#### `unit call from pure function is not supported, use operators like sample instead`

Эта ошибка возникает, когда вы пытаетесь вызвать события или эффекты из чистых функций в Effector:

* **Вызов событий в методах событий**<br/>
  Когда вы пытаетесь вызвать одно событие внутри `.map()`, `.filter()`, `.filterMap()` или `.prepend()` другого события.

* **Вызов событий в обработчиках сторов**<br/>
  При попытке вызвать событие в обработчике .on(), внутри метода .map(), или свойства конфигурации updateFilter() стора.

* **Вызов событий в функциях `sample`**<br/>
  При вызове события в функции `fn` или `filter` оператора `sample`.

Как исправить: Вместо вызова событий в чистых функциях используйте декларативные операторы, например `sample`.

### Частые проблемы

#### `sample.fn` не сужает тип, который приходит из `sample.filter`

Частая проблема с типизацией `sample` происходит когда мы делаем проверку в `filter` на что-то, но не получаем необходимый тип в `fn`. Чтобы это исправить вы можете добавить предикаты типов или использовать [`effector-action`](https://github.com/AlexeyDuybo/effector-action) билблиотеку, которая поможет проще работать с условными типами:

<SideBySide>
<Fragment slot="left">

```tsx wrap data-height="full"
import { sample } from "effector";

const messageSent = createEvent<Message>();
const userText = createEvent<string>();

sample({
  clock: messageSent,
  filter: (msg: Message): msg is UserMessage => msg.kind === "user",
  fn: (msg) => msg.text,
  target: userText,
});
```

</Fragment>
<Fragment slot="right">

```tsx wrap data-height="full"
import { createAction } from "effector-action";

const userText = createEvent<string>();

const messageSent = createAction({
  target: userText,
  fn: (userText, msg: Message) => {
    if (msg.kind === "user") {
      userText(msg.txt);
    }
  },
});
```

</Fragment>
</SideBySide>

#### Мое состояние не изменилось

Если ваше состояние не изменилось, то скорее всего вы работаете со скоупами и в какой-то момент активный скоуп потерялся и ваш юнит выполнился в глобальной области.<br/>

Типичные места, где это проявляется:

* `setTimeout` / `setInterval`
* `addEventListener`
* WebSocket
* прямой вызов промисов в эффектах
* сторонние библиотеки с асинхронными API или колбэки.

**Решение**: Привяжите ваше событие или эффект к текущему скоупу при помощи :

<SideBySide>
<Fragment slot="left">

```tsx wrap data-border="good" data-height="full" mark={6} "scopedEvent"
// ✅ все отработает корректно

const event = createEvent();

const effectFx = createEffect(() => {
  const scopedEvent = scopeBind(event);

  setTimeout(() => {
    scopedEvent();
  }, 1000);
});
```

</Fragment>
<Fragment slot="right">

```tsx wrap data-border="bad" data-height="full"
// ❌ событие вызовется в глобальном скоупе

const event = createEvent();

const effectFx = createEffect(() => {
  setTimeout(() => {
    event();
  }, 1000);
});
```

</Fragment>
</SideBySide>

##### Использование юнитов без `useUnit`

Если вы используете события или эффекты во фреймворках без использования хука `useUnit`, что может также повлиять на потерю скоупа.<br/>
Чтобы исправить это поведение передайте нужный юнит в `useUnit` хук и используйте возвращаемое значение:

<SideBySide>
<Fragment slot="left">

```tsx wrap data-border="good" data-height="full" "useUnit"
// ✅ использование хука

import { event } from "./model.js";
import { useUnit } from "effector-react";

const Component = () => {
  const onEvent = useUnit(event);

  return <button onClick={() => onEvent()}>click me</button>;
};
```

</Fragment>
<Fragment slot="right">

```tsx wrap data-border="bad" data-height="full"
// ❌ прямой вызов юнита

import { event } from "./model.js";

const Component = () => {
  return <button onClick={() => event()}>click me</button>;
};
```

</Fragment>
</SideBySide>

> INFO Информация:
>
> Использования хука  с юнитами.

### Не нашли ответ на свой вопрос ?

Если вы не нашли ответ на свой вопрос, то вы всегда можете задать сообществу:

* [RU Telegram](https://t.me/effector_ru)
* [EN Telegram](https://t.me/effector_en)
* [Discord](https://discord.gg/t3KkcQdt)
* [Reddit](https://www.reddit.com/r/effectorjs/)


# Настройка работы WebSocket с Effector

## Работа с WebSocket в Effector

В этом руководстве мы рассмотрим как правильно организовать работу с WebSocket соединением используя Effector.

> INFO WebSocket и типы данных:
>
> WebSocket API поддерживает передачу данных в виде строк или бинарных данных (`Blob`/`ArrayBuffer`). В этом руководстве мы сфокусируемся на работе со строками, так как это наиболее распространённый случай при обмене данными. При необходимости работы с бинарными данными, можно адаптировать примеры под нужный формат.

### Базовая модель

Создадим простую, но рабочую модель WebSocket клиента. Для начала определим основные события и состояния:

```ts
import { createStore, createEvent, createEffect, sample } from "effector";

// События для работы с сокетом
const disconnected = createEvent();
const messageSent = createEvent<string>();
const rawMessageReceived = createEvent<string>();

const $connection = createStore<WebSocket | null>(null)
  .on(connectWebSocketFx.doneData, (_, ws) => ws)
  .reset(disconnected);
```

Создадим эффект для установки соединения:

```ts
const connectWebSocketFx = createEffect((url: string): Promise<WebSocket> => {
  const ws = new WebSocket(url);

  const scopeDisconnected = scopeBind(disconnected);
  const scopeRawMessageReceived = scopeBind(rawMessageReceived);

  return new Promise((res, rej) => {
    ws.onopen = () => {
      res(ws);
    };

    ws.onmessage = (event) => {
      scopeRawMessageReceived(event.data);
    };

    ws.onclose = () => {
      scopeDisconnected();
    };

    ws.onerror = (err) => {
      scopeDisconnected();
      rej(err);
    };
  });
});
```

Обратите внимание, что мы использовали здесь функцию scopeBind, чтобы связать юниты с текущим скоупом выполнения, так как мы не знаем когда вызовется `scopeMessageReceived` внутри `socket.onmessage`. Иначе событие попадет в глобальный скоуп.
Читать более подробно.

> WARNING Работа в режиме 'без скоупа':
>
> Если вы по какой-то причине работаете в режиме без скоупа, то вам не нужно использовать `scopeBind`.<br/>
> Учитывайте, что работа со скоупом это рекомундуемый вариант работы!

### Обработка сообщений

Создадим стор для последнего полученного сообщения:

```ts
const $lastMessage = createStore("");

$lastMessage.on(messageReceived, (_, newMessage) => newMessage);
```

А также реализуем эффект для отправки сообщения:

```ts
const sendMessageFx = createEffect((params: { socket: WebSocket; message: string }) => {
  params.socket.send(params.message);
});

// Связываем отправку сообщения с текущим сокетом
sample({
  clock: messageSent,
  source: $connection,
  filter: Boolean, // Отправляем только если есть соединение
  fn: (socket, message) => ({
    socket,
    message,
  }),
  target: sendMessageFx,
});
```

> TIP Состояния соединения:
>
> WebSocket имеет несколько состояний подключения (`CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`). В базовой модели мы упрощаем это до простой проверки через `Boolean`, но в реальном приложении может потребоваться более детальное отслеживание состояния.

### Обработка ошибок

При работе с WebSocket важно корректно обрабатывать различные типы ошибок для обеспечения надежности приложения.

Расширим нашу базовую модель добавив обработку ошибок:

```ts
const TIMEOUT = 5_000;

// Добавляем события для ошибок
const socketError = createEvent<Error>();

const connectWebSocketFx = createEffect((url: string): Promise<WebSocket> => {
  const ws = new WebSocket(url);

  const scopeDisconnected = scopeBind(disconnected);
  const scopeRawMessageReceived = scopeBind(rawMessageReceived);
  const scopeSocketError = scopeBind(socketError);

  return new Promise((res, rej) => {
    const timeout = setTimeout(() => {
      const error = new Error("Connection timeout");

      socketError(error);
      reject(error);
      socket.close();
    }, TIMEOUT);

    ws.onopen = () => {
      clearTimeout(timeout);
      res(ws);
    };

    ws.onmessage = (event) => {
      scopeMessageReceived(event.data);
    };

    ws.onclose = () => {
      disconnected();
    };

    ws.onerror = (err) => {
      const error = new Error("WebSocket error");
      scopeDisconnected();
      scopeSocketError(error);
      rej(err);
    };
  });
});

// Стор для хранения ошибки
const $error = createStore("")
  .on(socketError, (_, error) => error.message)
  .reset(connectWebSocketFx.done);
```

> WARNING Обработка ошибок:
>
> Всегда обрабатывайте ошибки WebSocket соединения, так как они могут возникнуть по множеству причин: проблемы с сетью, таймауты, невалидные данные и т.д.

### Типизация сообщений

При работе с WebSocket важно обеспечить типобезопасность данных. Это позволяет предотвратить ошибки на этапе разработки и повысить надёжность приложения при обработке различных типов сообщений.

Для этого воспользуемся библиотекой [Zod](https://zod.dev/), хотя можно использовать любую другую библиотеку для валидации.

> INFO TypeScript и проверка типов:
>
> Даже если вы не используете Zod или другую библиотеку валидации, базовую типизацию WebSocket сообщений можно реализовать и с помощью обычных TypeScript-интерфейсов. Но помните — они проверяют типы только на этапе компиляции и не защитят вас от неожиданных данных во время выполнения.

Предположим, что мы ожидаем два типа сообщений: `balanceChanged` и `reportGenerated`, содержащие следующие поля:

```ts
export const messagesSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("balanceChanged"),
    balance: z.number(),
  }),
  z.object({
    type: z.literal("reportGenerated"),
    reportId: z.string(),
    reportName: z.string(),
  }),
]);

// Получаем тип из схемы
type MessagesSchema = z.infer<typeof messagesSchema>;
```

Теперь добавим эффект обработки сообщений, чтобы гарантировать, что они соответствуют ожидаемым типам, а также логику получения сообщений:

```ts
const parsedMessageReceived = createEvent<MessagesSchema>();

const parseFx = createEffect((message: unknown): MessagesSchema => {
  return messagesSchema.parse(JSON.parse(typeof message === "string" ? message : "{}"));
});

// Парсим сообщение при его получении
sample({
  clock: rawMessageReceived,
  target: parseFx,
});

// Если парсинг удался — отправляем сообщение дальше
sample({
  clock: parseFx.doneData,
  target: parsedMessageReceived,
});
```

Мы также должны обработать ситуацию, когда сообщение не соответствует схеме:

```ts
const validationError = createEvent<Error>();

// Если парсинг не удался — обрабатываем ошибку
sample({
  clock: parseFx.failData,
  target: validationError,
});
```

Вот и всё, теперь все входящие сообщения будут проверяться на соответствие схеме перед их обработкой, а также иметь типизацию.

> TIP Типизация отправляемых сообщений:
>
> Такой же подход можно применить и для исходящих сообщений. Это позволит проверять их структуру перед отправкой и избежать ошибок.

Если хочется более точечного контроля, можно сделать событие, которое будет срабатывать только для определенного типа сообщений:

```ts
type MessageType<T extends MessagesSchema["type"]> = Extract<MessagesSchema, { type: T }>;

export const messageReceivedByType = <T extends MessagesSchema["type"]>(type: T) => {
  return sample({
    clock: parsedMessageReceived,
    filter: (message): message is MessageType<T> => {
      return message.type === type;
    },
  });
};
```

Пример использования:

```ts
sample({
  clock: messageReceivedByType("balanceChanged"),
  fn: (message) => {
    // Typescript знает структуру message
  },
  target: doWhateverYouWant,
});
```

> INFO Возвращаемые значения sample:
>
> Если вы не уверены, какие данные возвращает sample, рекомендуем ознакомиться с документацией по sample.

### Работа с `Socket.IO`

[Socket.IO](https://socket.io/) предоставляет более высокоуровневый API для работы с WebSocket, добавляя множество полезных возможностей "из коробки".

> INFO Преимущества Socket.IO:
>
> * Автоматическое переподключение
> * Поддержка комнат и пространств имён
> * Fallback на HTTP Long-polling если WebSocket недоступен
> * Встроенная поддержка событий и подтверждений (acknowledgments)
> * Автоматическая сериализация/десериализация данных

```ts
import { io, Socket } from "socket.io-client";
import { createStore, createEvent, createEffect, sample } from "effector";

const API_URL = "wss://your.ws.server";

// События
const connected = createEvent();
const disconnected = createEvent();
const socketError = createEvent<Error>();

// Типизация для событий
type ChatMessage = {
  room: string;
  message: string;
  author: string;
};

const messageSent = createEvent<ChatMessage>();
const messageReceived = createEvent<ChatMessage>();
const socketConnected = createEvent();
const connectSocket = createEvent();

const connectFx = createEffect((): Promise<Socket> => {
  const socket = io(API_URL, {
    //... ваша конфигурация
  });

  // нужно для корректной работы со скоупами
  const scopeConnected = scopeBind(connected);
  const scopeDisconnected = scopeBind(disconnected);
  const scopeSocketError = scopeBind(socketError);
  const scopeMessageReceived = scopeBind(messageReceived);

  return new Promise((resolve, reject) => {
    socket.on("connect", () => {
      scopeConnected();
      resolve(socket);
    });

    socket.on("disconnect", () => scopeDisconnected());
    socket.on("connect_error", (error) => scopeSocketError(error));
    socket.on("chat message", (msg: ChatMessage) => scopeMessageReceived(msg));
  });
});

const sendMessageFx = createEffect(
  ({
    socket,
    name,
    payload,
  }: SocketResponse<any> & {
    socket: Socket;
  }) => {
    socket.emit(name, payload);
  },
);

// Состояния
const $socket = createStore<Socket | null>(null)
  .on(connectFx.doneData, (_, socket) => socket)
  .reset(disconnected);

// инициализация подключения
sample({
  clock: connectSocket,
  target: connectFx,
});

// вызываем событие после успешного подключения
sample({
  clock: connectSocketFx.doneData,
  target: socketConnected,
});
```


# Сообщество

### Материалы

* [dev.to/effector](https://dev.to/effector) — пространство на публичной платформе
* [reddit.com/r/effectorjs](https://reddit.com/r/effectorjs) — сабреддит
* [twitter.com/effectorJS](https://twitter.com/effectorJS) — ретвиты, релизы, анонсы
### Видео

* [Канал на Youtube](https://www.youtube.com/channel/UCm8PRc_yjz3jXHH0JylVw1Q)

### Где я могу задать вопрос?

1. Прежде всего, вы можете посмотреть [ишью](https://github.com/effector/effector/issues) и [дискуссии](https://github.com/effector/effector/discussions) в репозитории
2. У нас есть несколько чатов:
    * Telegram — [t.me/effector\_en](https://t.me/effector_en)
    * Discord — [discord.gg/t3KkcQdt](https://discord.gg/t3KkcQdt)
    * Reddit — [reddit.com/r/effectorjs](https://www.reddit.com/r/effectorjs/)
    * Gitter — [gitter.im/effector/community](https://gitter.im/effector/community)

### Русскоязычное сообщество

* Задать вопрос — [t.me/effector\_ru](https://t.me/effector_ru)
* Новости и анонсы — [t.me/effector\_news](https://t.me/effector_news)
* Видео:
    * Effector Meetup 1 — [youtube.com/watch?v=IacUIo9fXhI](https://www.youtube.com/watch?v=IacUIo9fXhI)
    * Effector Meetup 2 — [youtube.com/watch?v=nLYc4PaTXYk](https://www.youtube.com/watch?v=nLYc4PaTXYk)
    * Пишем фичу в проекте с EffectorJS — [youtube.com/watch?v=dtrWzH8O\_4k](https://www.youtube.com/watch?v=dtrWzH8O_4k)
    * Как и зачем мы мигрировали Авиасейлс на Effector — [youtube.com/watch?v=HYaSnVEZiFk](https://www.youtube.com/watch?v=HYaSnVEZiFk)
    * Делаем игру — [youtube.com/watch?v=tjjxIQd0E8c](https://www.youtube.com/watch?v=tjjxIQd0E8c)
    * Effector 22.2.0 Halley — [youtube.com/watch?v=pTq9AbmS0FI](https://www.youtube.com/watch?v=pTq9AbmS0FI)
    * Effector 22.4.0 Encke — [youtube.com/watch?v=9UjgcNn0K\_o](https://www.youtube.com/watch?v=9UjgcNn0K_o)

### Поддержка и спонсирование

* Sponsr — [sponsr.ru/effector](https://sponsr.ru/effector/)
* OpenCollective — [opencollective.com/effector](https://opencollective.com/effector)
* Patreon — [patreon.com/zero\_bias](https://www.patreon.com/zero_bias)

<br /><br />

### Познакомьтесь с командой Effector

Команда Effector постоянно работает над проектами, которые используют Effector для решения бизнес-задач.
Каждый участник команды использует библиотеку ежедневно как пользователь и пытается улучшить пользовательский опыт как основной член команды.

#### Дмитрий Болдырев

<img width="256" src="https://avatars.githubusercontent.com/u/15912112?v=4" />

[Github](https://github.com/zerobias) • [Twitter](https://twitter.com/zero__bias) • [Commits](https://github.com/effector/effector/commits?author=zerobias)

Дмитрий создал первую версию Effector в 2018 году, чтобы решить проблему реактивной архитектуры, управляемой событиями, в мессенджере.
Теперь его основная цель - улучшить пользовательский опыт самого Effector и ускорить ядро.

#### Сергей Сова

<img width="256" src="https://avatars.githubusercontent.com/u/5620073?v=4" />

[Github](https://github.com/sergeysova) • [Twitter](https://twitter.com/_sergeysova) • [Commits](https://github.com/effector/effector/commits?author=sergeysova)

С 2018 года Сергей создал несколько пакетов экосистемы: [patronum](https://github.com/effector/patronum), [logger](https://github.com/effector/logger), [inspector](https://github.com/effector/inspector).
Его основная задача - улучшать пользовательский опыт через экосистему и документацию.

#### Александр Хороших

<img width="256" src="https://avatars.githubusercontent.com/u/32790736?v=4" />

[Github](https://github.com/AlexandrHoroshih) • [Telegram](https://t.me/AlexandrHoroshih) • [Commits](https://github.com/effector/effector/commits?author=AlexandrHoroshih)

Александр внес вклад в каждый пакет ядра и репозитория Effector.
Он рассматривал вклады и улучшал DX основной функциональности.

#### Кирилл Миронов

<img width="256" src="https://i.imgur.com/JFaZkm9.jpg" />

[Github](https://github.com/Drevoed) • [Telegram](https://t.me/vetrokm)

Кирилл сделал [swc-plugin](https://github.com/effector/swc-plugin), [биндинги для SolidJS](https://github.com/effector/effector/tree/master/packages/effector-solid),
и теперь улучшает экосистему и основную функциональность.

#### Игорь Камышев

<img width="256" src="https://avatars.githubusercontent.com/u/26767722?v=4" />

[Github](https://github.com/igorkamyshev) • [Telegram](https://t.me/igorkamyshev) • [Commits](https://github.com/effector/effector/commits?author=igorkamyshev)

Игорь работает над [Farfetched](https://ff.effector.dev) - это продвинутый инструмент для получения данных.
Игорь сделал [eslint-plugin-effector](https://eslint.effector.dev) и ревьюит многие PR и ишью пакетов effector и экосистемы.

#### Ян Лобатый

<img width="256" src="https://i.imgur.com/DomL22D.jpg" />

[Github](https://github.com/YanLobat) • [Telegram](https://t.me/lobatik) • [Commits](https://github.com/effector/effector/commits?author=YanLobat)

Ян внес многочисленные исправления и улучшения во все репозитории Effector.
Ян помогает нам писать объяснения и справочную документацию. Возможно вы слышали о воркшопе, который провел Ян по Effector.

#### Егор Гуща

<img width="256" src="https://avatars.githubusercontent.com/u/22044607?v=4" />

[Github](https://github.com/egorguscha) • [Twitter](https://twitter.com/simpleigich)

С 2019 года работает в команде ядра Effector над документацией, учебными материалами и улучшением экосистемы.

<br /><br />

### Благодарности

#### Илья Лесик

<img width="256" src="https://avatars.githubusercontent.com/u/1270648?v=4" />

[Github](https://github.com/ilyalesik) • [Twitter](https://twitter.com/ilialesik)

Илья составил список замечательных пакетов экосистемы Effector.

#### Евгений Федотов

<img width="256" src="https://avatars.githubusercontent.com/u/18236014?v=4" />

[Github](https://github.com/EvgenyiFedotov) • [Telegram](https://t.me/evgeniyfedotov)

Евгений создал [effector-reflect](https://github.com/effector/reflect) и помогает нам писать документацию.

#### Валерий Кобзарь

<img width="256" src="https://avatars.githubusercontent.com/u/1615093?v=4" />

[Github](https://github.com/kobzarvs) • [Telegram](https://t.me/ValeryKobzar) • [Commits](https://github.com/effector/effector/commits?author=kobzarvs)

Валерий разработал серверный код для [REPL](https://share.effector.dev) и написал множество страниц документации.

#### Антон Косых

<img width="256" src="https://i.imgur.com/GD0zWpH.jpg" />

[Github](https://github.com/Kelin2025) • [Telegram](https://t.me/kelin2025)

Один из первых пользователей Effector, работающий над [Atomic Router](https://atomic-router.github.io/) и пакетами экосистемы, такими как [effector-history](https://github.com/kelin2025/effector-history),
[effector-pagination](https://github.com/kelin2025/effector-pagination) и [effector-factorio](https://github.com/Kelin2025/effector-factorio).

#### Андрей Чурочкин

[Github](https://github.com/goodmind)

Андрей стоял у истоков Effector. Он написал всю первую документацию, реализовал первую версию REPL и внедрил многие основные методы.

#### Роман Титов

[Github](https://github.com/popuguytheparrot) • [Telegram](https://t.me/popuguy)

Роман продвигает Effector среди сообщества фронтенд-разработчиков и работает над документацией.

*Этот список не является исчерпывающим.*

<br /><br />

### Участники

Пожалуйста, откройте [README.md](https://github.com/effector/effector#contributors), чтобы увидеть полный список наших участников.
У нас есть [GitHub экшн](https://github.com/effector/effector/blob/master/.github/workflows/contributors.yml), который генерирует этот список.
Также вы можете открыть страницу [Insights](https://github.com/effector/effector/graphs/contributors) на основном репозитории.

Мы хотели бы поблагодарить всех участников за Effector и экосистему.

Спасибо за вашу поддержку и любовь на протяжении всего этого времени \:heart:


# Основные концепции эффектора

## Основные концепции

Effector – это современная библиотека для работы с состоянием приложения, которая позволяет разработчикам создавать масштабируемые и предсказуемые реактивные приложения.

В основе Effector лежит концепция **юнитов** - независимых строительных блоков приложения. Каждый юнит: стор (store), событие (event) или эффект (effect), выполняет свою конкретную роль. <br/>
Объединяя эти юниты, разработчики могут создавать сложные, но понятные потоки данных в приложении.

Разработка с Effector строится на двух ключевых принципах:

* 📝 **Декларативность**: вы описываете *что* должно произойти, а не *как* это должно работать
* 🚀 **Реактивность**: изменения автоматически распространяются по всему приложению

Effector использует умную систему отслеживания зависимостей, которая гарантирует, что при изменении данных обновятся только действительно зависимые части приложения. Благодаря этому:

* Разработчикам не нужно вручную управлять подписками
* Производительность остается высокой даже при масштабировании
* Поток данных остается предсказуемым и понятным

### Юниты

Юнит - это базовое понятие в Effector. Store, Event и Effect – это все юниты, то есть базовые строительные блоки для создания бизнес-логики приложения. Каждый юнит представляет собой независимую сущность, которая может быть:

* Связана с другими юнитами
* Подписана на изменения других юнитов
* Использована для создания новых юнитов

```ts
import { createStore, createEvent, createEffect, is } from "effector";

const $counter = createStore(0);
const event = createEvent();
const fx = createEffect(() => {});

// Проверка, является ли значение юнитом
is.unit($counter); // true
is.unit(event); // true
is.unit(fx); // true
is.unit({}); // false
```

#### Событие (##event)

Событие (Event) — Событие в Effector представляет собой точку входа в реактивный поток данных, проще говоря это способ сказать приложению "что-то произошло".

##### Особенности события

* Простота: События в Effector являются минималистичными и легко создаются с помощью createEvent.
* Композиция: Вы можете комбинировать события, фильтровать их, изменять данные и передавать их в другие обработчики или сторы.

```js
import { createEvent } from "effector";

// Создаем событие
const formSubmitted = createEvent();

// Подписываемся на событие
formSubmitted.watch(() => console.log("Форма отправлена!"));

formSubmitted();

// Вывод в консоль:
// "Форма отправлена!"
```

#### Стор

Стор (Store) — это место, где живут данные вашего приложения. Он представляет собой реактивное значение, обеспечивающую строгий контроль над мутациями и потоком данных.

##### Особенности сторов

* У вас может быть столько сторов, сколько вам нужно
* Стор поддерживает реактивность — изменения автоматически распространяются на все подписанные компоненты
* Effector оптимизирует ререндеры компонентов, подписанных на сторы, минимизируя лишние обновления
* Данные в сторе иммутабельнные
* Здесь нет `setState`, изменение состояния происходит через события

```ts
import { createStore, createEvent } from "effector";

// Создаем событие
const superAdded = createEvent();

// Создаем стор
const $supers = createStore([
  {
    name: "Человек-паук",
    role: "hero",
  },
  {
    name: "Зеленый гоблин",
    role: "villain",
  },
]);

// Обновляем стор при срабатывании события
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// Вызываем событие
superAdded({
  name: "Носорог",
  role: "villain",
});
```

#### Эффект

Эффект (Effect) — Эффекты предназначены для обработки побочных действий — то есть для взаимодействия с внешним миром, например с http запросами, или для работы с таймерами.<br/>

##### Особенности эффекта

* У эффекта есть встроенные состояния `pending` и события `done`, `fail`, которые облегчают отслеживание выполнения операций.
* Логика, связанная с взаимодействием с внешним миром, вынесена за пределы основной логики приложения. Это упрощает тестирование и делает код более предсказуемым.
* Может быть как асинхронным, так и синхронным

```js
import { createEffect } from "effector";

const fetchUserFx = createEffect(async (userId) => {
  const response = await fetch(`/api/user/${userId}`);
  return response.json();
});

// Подписываемся на результат эффекта
fetchUserFx.done.watch(({ result }) => console.log("Данные пользователя:", result));
// Если эффект выкинет ошибку, то мы отловим ее при помощи события fail
fetchUserFx.fail.watch(({ error }) => console.log("Произошла ошибка! ", error));

// Запускаем эффект
fetchUserFx(1);
```

### Реактивность

Как мы говорили в самом начале effector основан на принципах реактивности, где изменения **автоматически** распространяются через приложение. При этом вместо императивного подхода, где вы явно указываете как и когда обновлять данные, вы декларативно описываете связи между различными частями приложения.

#### Как работает реактивность в Effector

Рассмотрим пример из части про сторы, где мы имеем стор с массивом суперлюдей. Допустим у нас появилось новое требование это выводить отдельно друг от друга героев и злодеев. Реализовать это будет очень просто при помощи производных сторов:

```ts
import { createStore, createEvent } from "effector";

// Создаем событие
const superAdded = createEvent();

// Создаем стор
const $supers = createStore([
  {
    name: "Человек-паук",
    role: "hero",
  },
  {
    name: "Зеленый гоблин",
    role: "villain",
  },
]);

// Создали производные сторы, которые зависят от $supers
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

// Обновляем стор при срабатывании события
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// Добавляем супера
superAdded({
  name: "Носорог",
  role: "villain",
});
```

В этом примере мы создали производные сторы `$superHeroes` и `$superVillains`, которые будут зависеть от оригинального `$supers`. При этом изменяя оригинальный стор, у нас также будут изменяться и производные – это и есть реактивность!

### Как это все работает вместе?

А теперь давайте посмотрим как все это работает вместе.
Все наши концепции объединяются в мощный, реактивный поток данных:

1. **Событие** инициирует изменения (например, нажатие кнопки).
2. Эти изменения влияют на **стор**, обновляя состояние приложения.
3. При необходимости, **Эффекты** выполняют побочные действия, такие как взаимодействие с сервером.

Для примера мы все также возьмем код выше с суперами, однако немного изменим его добавив эффект с загрузкой первоначальных данных, как и в реальных приложениях:

```ts
import { createStore, createEvent, createEffect } from "effector";

// определяем наши сторы
const $supers = createStore([]);
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

// создаем события
const superAdded = createEvent();

// создаем эффекты для получения данных
const getSupersFx = createEffect(async () => {
  const res = await fetch("/server/api/supers");
  if (!res.ok) {
    throw new Error("something went wrong");
  }
  const data = await res.json();
  return data;
});

// создаем эффекты для получения данных
const saveNewSuperFx = createEffect(async (newSuper) => {
  // симуляция сохранения нового супера
  await new Promise((res) => setTimeout(res, 1500));
  return newSuper;
});

// когда загрузка завершилась успешно, устанавливаем данные
$supers.on(getSupersFx.done, ({ result }) => result);
// добавляем нового супера
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// вызываем загрузку данных
getSupersFx();
```

> INFO Почему $ и Fx?:
>
> Это рекомендации команды effector использовать `$` для сторов и `fx` для эффектов.
> Более подробно об этом можно почитать здесь.

#### Связываем юниты в единый поток

Все что нам осталось сделать это как-то связать вызов события `superAdded` и его сохранение `saveNewSuperFx`, а также после успешного сохранения запросить свежие данные с сервера. <br/>
Здесь нам на помощь приходит метод sample. Если юниты это строительные блоки, то `sample` – это клей, который связывает ваши юниты вместе.

> INFO о sample:
>
> `sample` является основным методом работы с юнитами, который позволяет декларативно запустить цепочку действий.

```ts ins={27-37}
import { createStore, createEvent, createEffect, sample } from "effector";

const $supers = createStore([]);
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

const superAdded = createEvent();

const getSupersFx = createEffect(async () => {
  const res = await fetch("/server/api/supers");
  if (!res.ok) {
    throw new Error("something went wrong");
  }
  const data = await res.json();
  return data;
});

const saveNewSuperFx = createEffect(async (newSuper) => {
  // симуляция сохранения нового супера
  await new Promise((res) => setTimeout(res, 1500));
  return newSuper;
});

$supers.on(getSupersFx.done, ({ result }) => result);
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// здесь мы говорим, при запуске clock вызови target и передай туда данные
sample({
  clock: superAdded,
  target: saveNewSuperFx,
});

// когда эффект saveNewSuperFx завершится успешно, то вызови getSupersFx
sample({
  clock: saveNewSuperFx.done,
  target: getSupersFx,
});

// вызываем загрузку данных
getSupersFx();
```

Вот так вот легко и незамысловато мы написали часть бизнес-логики нашего приложения, а часть с отображением этих данных оставили на UI фреймворк.


# Экосистема effector

Пакеты и шаблоны экосистемы effector

Больше контента - [awesome-effector repository](https://github.com/effector/awesome)

> INFO Условные обозначения:
>
> Stage 4: 💚 — стабильный, поддерживается, крутой<br/>
> Stage 3: 🛠️ — стабильный, находиться в разработке, v0.x<br/>
> Stage 2: ☢️️ — Нестабильный/неполный, в большинстве случаев работает, может быть переработан.<br/>
> Stage 1: 🧨 — Ломается в большинстве случаев, надо переделывать, не использовать в production<br/>
> Stage 0: ⛔️ — Заброшен/нужен maintainer, может быть сломан<br/>

### Пакеты

* [patronum](https://github.com/effector/patronum) 💚 — Библиотека утилит Effector, обеспечивающая модульность и удобства.
* [@effector/reflect](https://github.com/effector/reflect) 💚 — Классические HOC переработаны для соединения компонентов React с модулями, компонуемым и (своего рода) «мелкозернистым реактивным» способом..
* [@withease/redux](https://withease.effector.dev/redux/) 💚 — Плавный переход от redux к effector.
* [@withease/i18next](https://withease.effector.dev/i18next) 💚 — Мощные привязки структуры интернационализации.
* [@withease/web-api](https://withease.effector.dev/web-api/) 💚 — Web API - состояние сети, видимость вкладок и многое другое.
* [@withease/factories](https://withease.effector.dev/factories/) 💚 — Набор помощников для создания фабрик в вашем приложении.
* [effector-storage](https://github.com/yumauri/effector-storage) 💚 - Небольшой модуль для синхронизации хранилищ со всеми типами хранилищ (локальное/сессионное хранилище, IndexedDB, файлы cookie, серверное хранилище и т. д.).
* [farfetched](https://ff.effector.dev) 🛠 — Усовершенствованный инструмент получения данных для веб-приложений..
* [@effector/next](https://github.com/effector/next) 🛠 - Официальные привязки для Next.js
* [effector-localstorage](https://github.com/lessmess-dev/effector-localstorage) 🛠 — Модуль для effector, который синхронизирует хранилища с localStorage.
* [effector-hotkey](https://github.com/kelin2025/effector-hotkey) 🛠 — Горячие клавиши — это просто.
* [atomic-router](https://github.com/atomic-router/atomic-router) 🛠 — Роутер, не привязанный к view.
* [effector-undo](https://github.com/tanyaisinmybed/effector-undo) ☢️ — Простая функция отмены/повтора.
* [forest](https://github.com/effector/effector/tree/master/packages/forest) ☢️ — Реактивный движок ui для веб-приложений.
* [effector-utils](https://github.com/Kelin2025/effector-utils) ⛔ — Библиотека утилит Effector.

### DX

* [eslint-plugin-effector](https://eslint.effector.dev) 💚 — Применение лучших практик.
* [@effector/swc-plugin](https://github.com/effector/swc-plugin) 💚 — Официальный SWC-плагин для Effector.
* [effector-logger](https://github.com/effector/logger) 🛠 — Простой логгер сторов, событий, эффектов и доменов.
* [@effector/redux-devtools-adapter](https://github.com/effector/redux-devtools-adapter) 🛠 - Простой адаптер, который логгирует обновления в Redux DevTools.

### Управление формами

* [effector-final-form](https://github.com/binjospookie/effector-final-form) 🛠️ – Привязки effector для Final Form.
* [filledout](https://filledout.github.io) ☢️ — Менеджер форм с простой в использовании проверкой.
* [effector-forms](https://github.com/aanation/effector-forms) ☢️ — Менеджер форм для effector.
* [effector-react-form](https://github.com/GTOsss/effector-react-form) ☢️ — Подключите свои формы к state-менеджеру.
* [efform](https://github.com/tehSLy/efform) ⛔ — Менеджер форм, основанный на менеджере состояний, предназначенный для высококачественного DX.
* [effector-reform](https://github.com/movpushmov/effector-reform) ☢️️ — Менеджер форм, реализующий концепцию составных форм.

### Шаблоны

* [ViteJS+React Template](https://github.com/effector/vite-react-template) 💚 — Попробуйте эффектор с React и TypeScript за считанные секунды!
* [ViteJS+TypeScript Template](https://github.com/mmnkuh/effector-vite-template) 🛠 — Еще один шаблон ViteJS + TypeScript.


# Примеры

* Индикатор загрузки: отображение индикатора загрузки во время выполнения эффектов
* Последовательность эффектов: когда второй запрос к серверу требует данных из первого
* Отмена эффекта: когда пропадает необходимость в результатах эффекта, который ещё выполняется
* Модальное окно: связывание модального окна отображаемого через React с состоянием в сторе
* Вход диапазона: подключение компонента ввода диапазона к состоянию


# Начало работы с effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Быстрый старт

Effector — это мощный менеджер состояний, который предлагает принципиально новый подход к управлению данными в приложениях. В отличие от традиционных решений, где состояние изменяется напрямую через действия, Effector использует реактивный и декларативный подход.

### Как работать с документацией

Прежде чем начать погружение стоит сказать, что мы поддерживаем `llms.txt` для возможности использования AI-помощников [ChatGPT](https://chatgpt.com/), [Claude](https://claude.ai/), [Gemini](https://gemini.google.com) и других. Вам просто нужно скинуть ссылку в чат, либо загрузить документацию в IDE типа [Cursor](https://www.cursor.com/en).
На текущий момент доступны следующие документы:

* https://effector.dev/ru/llms-full.txt
* https://effector.dev/docs/llms.txt
* https://effector.dev/docs/llms-full.txt

Помимо прочего у нас также существует [ChatGPT effector ассистент](https://chatgpt.com/g/g-thabaCJlt-effector-assistant), [репозиторий загруженный в DeepWiki](https://deepwiki.com/effector/effector), и загруженную документацию на [Context7](https://context7.com/effector/effector).

### Особенности Effector

* **Effector реактивный 🚀**: Effector автоматически отслеживает зависимости и обновляет все связанные части приложения, избавляя вас от необходимости вручную управлять обновлениями.
* **Декларативный код 📝**: Вы описываете связи между данными и их трансформации, а Effector сам заботится о том, как и когда выполнять эти преобразования.
* **Предсказуемое тестирование** ✅: Изолированные контексты делают тестирование бизнес-логики простым и надёжным.
* **Гибкая архитектура** 🏗️: Effector одинаково хорошо подходит как для небольших приложений, так и для крупных корпоративных систем.
* **Универсальность** 🔄: Хотя Effector прекрасно интегрируется с популярными фреймворками, он может использоваться в любой JavaScript-среде.

Больше о ключевых особенностях эффектора вы можете прочитать здесь

### Установка effector

Для начала установим effector при помощи вашего любимого пакетного менеджера

<Tabs>
  <TabItem label="npm">

```bash
npm install effector
```

  </TabItem>
  <TabItem label="yarn">

```bash
yarn install effector
```

  </TabItem>
  <TabItem label="pnpm">

```bash
pnpm install effector
```

  </TabItem>
</Tabs>

#### Создаем ваш первый стор

Теперь давайте создадим стор, который является состоянием вашего приложения.

```ts
// counter.js
import { createStore } from "effector";

const $counter = createStore(0);
```

#### Добавление событий

Дальше давайте добавим события, при вызове которых, мы будем обновлять данные стора.

```ts ins={3-4}
// counter.js
import { createEvent } from "effector";

const incremented = createEvent();
const decremented = createEvent();
```

#### Подписываем стор на событие

И свяжем событие вместе с стором.

```ts ins={9-10}
// counter.js
import { createEvent, createStore } from "effector";

const $counter = createStore(0);

const incremented = createEvent();
const decremented = createEvent();

$counter.on(incremented, (counter) => counter + 1);
$counter.on(decremented, (counter) => counter - 1);

// и вызовите событие в вашем приложении
incremented();
// counter увеличится на 1
decremented();
// counter уменьшится на -1
decremented();
// counter уменьшится на -1
```

### Интеграция с фреймворками

#### Установка

Если вы хотите использовать **effector** вместе с фреймворком, то для этого вам потребуется установить дополнительный пакет:

<Tabs syncId="framework-choice">
  <TabItem label="React">

```bash
npm install effector effector-react
```

  </TabItem>
  <TabItem label="Vue">

```bash
npm install effector effector-vue
```

  </TabItem>
  <TabItem label="Solid">

```bash
npm install effector effector-solid
```

  </TabItem>
</Tabs>

#### Примеры использования

И использовать

<Tabs syncId="framework-choice">
  <TabItem label="React">

```jsx
import { useUnit } from "effector-react";
import { createEvent, createStore } from "effector";
import { $counter, incremented, decremented } from "./counter.js";

export const Counter = () => {
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // или
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // или
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);

  return (
    <div>
      <h1>Count: {counter}</h1>
      <button onClick={onIncremented}>Increment</button>
      <button onClick={onDecremented}>Decrement</button>
    </div>
  );
};
```

  </TabItem>
  <TabItem label="Vue">

```html
<script setup>
  import { useUnit } from "@effector-vue/composition";
  import { $counter, incremented, decremented } from "./counter.js";
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // или
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // или
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);
</script>

<template>
  <div>
    <h1>Count: {{ counter }}</h1>
    <button @click="onIncremented">Increment</button>
    <button @click="onDecremented">Decrement</button>
  </div>
</template>
```

  </TabItem>
  <TabItem label="Solid">

```jsx
import { createEvent, createStore } from "effector";
import { useUnit } from "effector-solid";
import { $counter, incremented, decremented } from "./counter.js";

const Counter = () => {
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // или
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // или
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);

  return (
    <div>
      <h1>Count: {counter()}</h1>
      <button onClick={onIncremented}>Increment</button>
      <button onClick={onDecremented}>Decrement</button>
    </div>
  );
};

export default Counter;
```

  </TabItem>
</Tabs>

> INFO А где Svelte ?:
>
> Для работы со Svelte не требуется дополнительные пакеты, он прекрасно работает с базовым пакетом effector.


# Установка

### С помощью пакетного менеджера

Effector не требует использования какого-то одного пакетного менеджера, можете использовать любой на свой выбор.<br/>
Например: [yarn](https://yarnpkg.com/), [pnpm](https://pnpm.io/).

```bash
npm install effector
```

#### React

```bash
npm install effector effector-react
```

Вы можете начать использовать effector онлайн с помощью [шаблона Stackblitz](https://stackblitz.com/fork/github/effector/vite-react-template) внутри которого уже настроен [TypeScript](https://typescriptlang.org/), [ViteJS](https://vitejs.dev/) и [React](https://reactjs.org/).

#### Vue

```bash
npm install effector effector-vue
```

#### Solid

```bash
npm install effector effector-solid
```

#### Svelte

Svelte работает с effector без установки дополнительных пакетов.

### Online playground

Все примеры в этой документации запускаются в [нашей онлайн песочнице](https://share.effector.dev). Она позволяет запускать, тестировать и распространять свои идеи бесплатно и без установки. React и синтаксис TypeScript поддерживаются без дополнительной настройки. [Репозиторий проекта](https://github.com/effector/repl).

### Deno

> INFO поддерживается с версии:
>
> [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

Чтобы использовать effector, просто импортируйте `effector.mjs` из любого CDN.

```typescript
import { createStore } from "https://cdn.jsdelivr.net/npm/effector/effector.mjs";
```

Примеры CDN:

* https://www.jsdelivr.com/package/npm/effector
* https://cdn.jsdelivr.net/npm/effector/effector.cjs.js
* https://cdn.jsdelivr.net/npm/effector/effector.mjs
* https://cdn.jsdelivr.net/npm/effector-react/effector-react.cjs.js
* https://cdn.jsdelivr.net/npm/effector-vue/effector-vue.cjs.js

### DevTools

Используйте [effector-logger](https://github.com/effector/logger) для вывода изменений сторов в консоль, вывода их значений в браузерный интерфейс и подключения к Redux Dev Tools.

Для рендеринга на сервере и написания тестов вам понадобятся плагины для компилятора:

#### Babel

Плагин для Babel включен в поставку основного пакета `effector` и не требует установки.

Читайте детали по ссылке.

#### SWC

```bash
npm install -ED @effector/swc-plugin @swc/core
```

Документация плагина.

### Совместимость

Для совместимости с устаревшими версиями браузеров до IE11 и Chrome 47 (версия браузера для Smart TV) используйте импорты из файлов: `effector/compat`, `effector-react/compat` и `effector-vue/compat`.

Вы можете заменить импорты вручную:

```diff
- import {createStore} from 'effector'
+ import {createStore} from 'effector/compat'
```

А также используя плагин [babel-plugin-module-resolver](https://github.com/tleunen/babel-plugin-module-resolver).
Примерная конфигурация в `.babelrc`:

```json
{
  "plugins": [
    [
      "babel-plugin-module-resolver",
      {
        "alias": {
          "^effector$": "effector/compat",
          "^effector-react$": "effector-react/compat"
        }
      }
    ]
  ]
}
```

#### Polyfills

Effector использует некоторые глобальные объекты, в старых версиях браузеров их может не быть, поэтому вам может понадобиться установить их самостоятельно, если вы собираетесь поддерживать такие браузеры.

Вам может понадобиться установить следующие полифиллы:

* `Promise`
* `Object.assign`
* `Array.prototype.flat`


# Мотивация

## Мотивация

Разработка современных веб-приложений становится сложнее с каждым днем. Множество фреймворков, сложная бизнес-логика, различные подходы к управлению состоянием — все это создает дополнительные сложности для разработчиков. Effector предлагает элегантное решение этих проблем.

### Почему Effector?

Effector был разработан с целью описывать бизнес-логику приложения простым и понятным языком, используя три базовых примитива:

* Событие (Event) — для описания событий
* Стор (Store) — для управления состоянием
* Эффект (Effect) — для работы с сайд эффектами

В то же время логика пользовательского интерфейса остается ответственностью фреймворка.
Пусть каждый фреймворк решает свою задачу настолько эффективно, насколько это возможно.

### Принцип разделения ответственности

В современной разработке существует четкое разделение между бизнес-логикой и пользовательским интерфейсом:

**Бизнес-логика** — это суть вашего приложения, то ради чего оно создается. Она может быть сложной и основанной на реактивных принципах, но именно она определяет, как работает ваш продукт.

**UI-логика** — это то, как пользователи взаимодействуют с бизнес-логикой через интерфейс. Это кнопоки, формы и другие элементы управления.

### Вот почему Effector!

В реальных проектах задачи от менеджера продукта редко содержат детали реализации интерфейса. Вместо этого они описывают сценарии взаимодействия пользователя с системой. Effector позволяет описывать эти сценарии на том же языке, на котором общается команда разработки:

* Пользователи взаимодействуют с приложением → Events
* Видят изменения на странице → Store
* Приложение взаимодействует с внешним миром → Effects

### Независимость от фреймворков

Несмотря на то, что React, Angular и Vue имеют разные подходы к разработке, бизнес-логика приложения остается неизменной. Effector позволяет описать её единообразно, независимо от выбранного фреймворка.
Это означает, что вы можете:

1. Сфокусироваться на бизнес-логике, а не на особенностях фреймворка
2. Легко переиспользовать код между разными частями приложения
3. Создавать более поддерживаемые и масштабируемые решения


# Как мыслить в парадигме Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Как мыслить в парадигме Effector

Effector — это не просто «менеджер состояния», а также мощный инструмент для построения логики приложения. Здесь мы рассмотрим рекомендации по написанию кода, а также как стоит мыслить при использовании эффектора.

### Как правильно подходить к разработке с Effector?

Чтобы эффективно использовать Effector, важно освоить несколько ключевых принципов.

#### События — основа всего

Приложение — это поток изменений. Каждое изменение — это событие. Важно понимать, что событие не решает, что делать, оно лишь фиксирует факт произошедшего. Это ключевой момент, который помогает избежать жёстких зависимостей.

* **Событие — это просто факт**: «что-то произошло».
* **События не содержат логику** — они только объявляют событие, но не решают, как на него реагировать.
* **Один факт может привести к разным последствиям** — одно событие может запускать несколько независимых процессов.

Пример:

```ts
// Не думайте о реализации сейчас — только объявите факт
const searchInputChanged = createEvent();
const buttonClicked = createEvent();
```

> TIP Давайте осмысленные названия:
>
> Давайте событиям осмысленные название. Например, если вам надо загрузить данные при каком-то действии, то событие связано с действием, а не реализацией:
>
> ```ts
> ❌ const fetchData = createEvent()
> ✅ const appStarted = createEvent()
> ```

#### Бизнес-логика и UI — это разные вещи

Правильный подход к архитектуре — держать бизнес-логику отдельно от интерфейса. Effector позволяет это сделать, сохраняя UI простым, а логику — чистой и переиспользуемой.

* UI только отображает данные.
* Effector управляет состоянием и логикой.

### Как это выглядит в реальном приложении?

Возьмём в пример GitHub с кнопками «Watch», «Fork» и «Star». Каждое действие пользователя — это событие:

![кнопки действий для репозитория в гитхаб](/images/github-repo-actions.png)

* Пользователь поставил/убрал звездочку - `repoStarToggled`
* Строка поиска по репозиторию изменилась - `repoFileSearchChanged`
* Репозиторий был форкнут - `repoForked`

Логика строится вокруг событий и реакций на них. UI просто сообщает о действии, а их обработка это уже часть бизнес-логики.

Упрощенный пример логики с кнопкой звездочки:

<Tabs>
<TabItem label="Бизнес-логика">

```ts
// repo.model.ts

// событие – факт действия
const repoStarToggled = createEvent();

// эффекты как дополнительная реакция на события
// (предположим эффекты возвращают обновленное значение)
const starRepoFx = createEffect(() => {});
const unstarRepoFx = createEffect(() => {});

// состояние приложения
const $isRepoStarred = createStore(false);
const $repoStarsCount = createStore(0);

// логика переключения звездочки
sample({
  clock: repoStarToggled,
  source: $isRepoStarred,
  fn: (isRepoStarred) => !isRepoStarred,
  target: $isRepoStarred,
});

// отправка запроса на сервер при переключении звезды
sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred) => isRepoStarred,
  target: starRepoFx,
});

sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred) => !isRepoStarred,
  target: unstarRepoFx,
});

// обновляем счетчик
sample({
  clock: [starRepoFx.doneData, unstarRepoFx.doneData],
  target: $repoStarsCount,
});
```

</TabItem>
<TabItem label="UI">

```tsx
import { repoStarToggled, $isRepoStarred, $repoStarsCount } from "./repo.model.ts";

const RepoStarButton = () => {
  const [onStarToggle, isRepoStarred, repoStarsCount] = useUnit([
    repoStarToggled,
    $isRepoStarred,
    $repoStarsCount,
  ]);

  return (
    <div>
      <button onClick={onStarToggle}>{isRepoStarred ? "unstar" : "star"}</button>
      <span>{repoStarsCount}</span>
    </div>
  );
};
```

</TabItem>
</Tabs>

При этом UI не знает что там будет происходить внутри, все за что он отвечает – это вызов событий и отображение данных.


# Политика релизов

## Политика релизов

Основная цель effector - **улучшить опыт разработчиков**, и как часть этой стратегии мы следуем определенным правилам выпуска релизов effector.

### Никаких критических изменений без предварительной пометки об устаревании

Перед каждым критическим изменением effector должен предоставить предупреждение об устаревании **как минимум за год до этого.**

Например:

* Когда была выпущена версия 22, функция "A" была помечена как устаревшая. Библиотека выводит предупреждение в консоль при её использовании.
* Через год, в релизе версии 23, функция "A" удаляется.

### Цикл релизов

Мажорные обновления (т.е. с критическими изменениями) effector выпускаются **не чаще одного раза в год.**

Минорные обновления и патчи (т.е. с исправлениями и новыми функциями) выпускаются по мере готовности. Если новая функция требует критических изменений – она также выпускается в мажорном обновлении.

Это необходимо, чтобы разработчики могли плавно планировать свою работу, учитывая возможные изменения в effector.

Это также обязывает мейнтейнеров effector быть крайне осторожными при проектировании новых функций и внесении критических изменений в старые функции библиотеки, поскольку возможность удалить или серьезно изменить что-то в публичном API появляется только раз в два года.


# Использование с пакетом effector-react

**TypeScript** - это типизированное расширение JavaScript. Он стал популярным
в последнее время благодаря преимуществам, которые он может принести. Если вы новичок в TypeScript,
рекомендуется сначала ознакомиться с ним, прежде чем продолжить.
Вы можете ознакомиться с документацей
[здесь](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html).

Какие преимущества Typescript может принести вашему приложению:

1. Безопасность типов для состояний, сторов и событий
2. Простой рефакторинг типизированного кода
3. Превосходный опыт разработчика в командной среде

**Практический пример**

Мы пройдемся по упрощенному приложению чата,
чтобы продемонстрировать возможный подход к включению статической типизации. Это приложение для чата будет иметь API-модель, которая загружает и сохраняет данные из локального хранилища localStorage.

Полный исходный код можно посмотреть на
[github](https://github.com/effector/effector/tree/master/examples/react-and-ts).
Обратите внимание, что, следуя этому примеру самостоятельно, вы ощутите пользу от использования TypeScript.

### Давайте создадим API-модель

Здесь будет использоваться структура каталогов на основе методологии [feature-sliced](https://feature-sliced.design).

Давайте определим простой тип, который наша импровизированная API будет возвращать.

```ts
// Файл: /src/shared/api/message.ts
interface Author {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  author: Author;
  text: string;
  timestamp: number;
}
```

Наша API будет загружать и сохранять данные в `localStorage`, и нам нужны некоторые функции для загрузки данных:

```ts
// Файл: /src/shared/api/message.ts
const LocalStorageKey = "effector-example-history";

function loadHistory(): Message[] | void {
  const source = localStorage.getItem(LocalStorageKey);
  if (source) {
    return JSON.parse(source);
  }
  return undefined;
}
function saveHistory(messages: Message[]) {
  localStorage.setItem(LocalStorageKey, JSON.stringify(messages));
}
```

Также нам надо создать несколько библиотек для генерации идентификатров и ожидания для имитации сетевых запросов.

```ts
// Файл: /src/shared/lib/oid.ts
export const createOid = () =>
  ((new Date().getTime() / 1000) | 0).toString(16) +
  "xxxxxxxxxxxxxxxx".replace(/[x]/g, () => ((Math.random() * 16) | 0).toString(16)).toLowerCase();
```

```ts
// Файл: /src/shared/lib/wait.ts
export function wait(timeout = Math.random() * 1500) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
```

Отлично! Теперь мы можем создать эффекты, которые будут загружать сообщения.

```ts
// Файл: /src/shared/api/message.ts
// Здесь эффект определен со статическими типами. Void определяет отсутствие аргументов.
// Второй аргумент в типе определяет тип успешного результата.
// Третий аргумент является необязательным и определяет тип неудачного результата.
export const messagesLoadFx = createEffect<void, Message[], Error>(async () => {
  const history = loadHistory();
  await wait();
  return history ?? [];
});

interface SendMessage {
  text: string;
  author: Author;
}

// Но мы можем использовать вывод типов и задавать типы аргументов в определении обработчика.
// Наведите курсор на `messagesLoadFx`, чтобы увидеть выведенные типы:
// `Effect<{ text: string; authorId: string; authorName: string }, void, Error>`
export const messageSendFx = createEffect(async ({ text, author }: SendMessage) => {
  const message: Message = {
    id: createOid(),
    author,
    timestamp: Date.now(),
    text,
  };
  const history = await messagesLoadFx();
  saveHistory([...history, message]);
  await wait();
});

// Пожалуйста, обратите внимание, что мы будем использовать `wait()` для `messagesLoadFx` и `wait()` в текущем эффекте
// Также, обратите внимание, что `saveHistory` и `loadHistory` могут выбрасывать исключения,
// в этом случае эффект вызовет событие `messageDeleteFx.fail`.
export const messageDeleteFx = createEffect(async (message: Message) => {
  const history = await messagesLoadFx();
  const updated = history.filter((found) => found.id !== message.id);
  await wait();
  saveHistory(updated);
});
```

Отлично, теперь мы закончили с сообщениями, давайте создадим эффекты для управления сессией пользователя.

На самом деле я предпочитаю начинать написание кода с реализации интерфейсов:

```ts
// Файл: /src/shared/api/session.ts
// Это называется сессией, потому что описывает текущую сессию пользователя, а не Пользователя в целом.
export interface Session {
  id: string;
  name: string;
}
```

Кроме того, чтобы генерировать уникальные имена пользователей и не требовать от них ввода вручную, импортируйте `unique-names-generator`:

```ts
// Файл: /src/shared/api/session.ts
import { uniqueNamesGenerator, Config, starWars } from "unique-names-generator";

const nameGenerator: Config = { dictionaries: [starWars] };
const createName = () => uniqueNamesGenerator(nameGenerator);
```

Создадим эффекты для управления сессией:

```ts
// Файл: /src/shared/api/session.ts
const LocalStorageKey = "effector-example-session";

// Обратите внимание, что в этом случае требуется явное определение типов, поскольку `JSON.parse()` возвращает `any`
export const sessionLoadFx = createEffect<void, Session | null>(async () => {
  const source = localStorage.getItem(LocalStorageKey);
  await wait();
  if (!source) {
    return null;
  }
  return JSON.parse(source);
});

// По умолчанияю, если нет аргументов, не предоставлены явные аргументы типа и нет оператора `return`,
// эффект будет иметь тип: `Effect<void, void, Error>`
export const sessionDeleteFx = createEffect(async () => {
  localStorage.removeItem(LocalStorageKey);
  await wait();
});

// Взгляните на тип переменной `sessionCreateFx`.
// Там будет `Effect<void, Session, Error>` потому что TypeScript может вывести тип из переменной `session`
export const sessionCreateFx = createEffect(async () => {
  // Я явно установил тип для следующей переменной, это позволит TypeScript помочь мне
  // Если я забуду установить свойство, то я увижу ошибку в месте определения
  // Это также позволяет IDE автоматически дополнять и завершать имена свойств
  const session: Session = {
    id: createOid(),
    name: createName(),
  };
  localStorage.setItem(LocalStorageKey, JSON.stringify(session));
  return session;
});
```

Как нам нужно импортировать эти эффекты?

Я настоятельно рекомендую писать короткие импорты и использовать реэкспорты.
Это позволяет безопасно рефакторить структуру кода внутри `shared/api` и тех же слайсов,
и не беспокоиться о рефакторинге других импортов и ненужных изменениях в истории git.

```ts
// Файл: /src/shared/api/index.ts
export * as messageApi from "./message";
export * as sessionApi from "./session";

// Types reexports made just for convenience
export type { Message } from "./message";
export type { Session } from "./session";
```

### Создадим страницу с логикой

Типичная структура страниц:

```
src/
  pages/
    <page-name>/
      page.tsx — только View-слой (представление)
      model.ts — код бизнес-логики (модель)
      index.ts — реэкспорт, иногда здесь может быть связующий код
```

Я рекомендую писать код в слое представления сверху вниз, более общий код - сверху.
Моделируем наш слой представления. На странице у нас будет два основных раздела: история сообщений и форма сообщения.

```tsx
// Файл: /src/pages/chat/page.tsx
export function ChatPage() {
  return (
    <div className="parent">
      <ChatHistory />
      <MessageForm />
    </div>
  );
}

function ChatHistory() {
  return (
    <div className="chat-history">
      <div>Тут будет список сообщений</div>
    </div>
  );
}

function MessageForm() {
  return (
    <div className="message-form">
      <div>Тут будет форма сообщения</div>
    </div>
  );
}
```

Отлично. Теперь мы знаем, какую структуру мы имеем, и мы можем начать моделировать процессы бизнес-логики.
Слой представления должен выполнять две задачи: отображать данные из хранилищ и сообщать события модели.
Слой представления не знает, как загружаются данные, как их следует преобразовывать и отправлять обратно.

```ts
// Файл: /src/pages/chat/model.ts
import { createEvent, createStore } from "effector";

// События просто сообщают о том, что что-то произошло
export const messageDeleteClicked = createEvent<Message>();
export const messageSendClicked = createEvent();
export const messageEnterPressed = createEvent();
export const messageTextChanged = createEvent<string>();
export const loginClicked = createEvent();
export const logoutClicked = createEvent();

// В данный момент есть только сырые данные без каких-либо знаний о том, как их загрузить.
export const $loggedIn = createStore<boolean>(false);
export const $userName = createStore("");
export const $messages = createStore<Message[]>([]);
export const $messageText = createStore("");

// Страница НЕ должна знать, откуда пришли данные.
// Поэтому мы просто реэкспортируем их.
// Мы можем переписать этот код с использованием `combine` или оставить независимые хранилища,
// страница НЕ должна меняться, просто потому что мы изменили реализацию
export const $messageDeleting = messageApi.messageDeleteFx.pending;
export const $messageSending = messageApi.messageSendFx.pending;
```

Теперь мы можем реализовать компоненты.

```tsx
// Файл: /src/pages/chat/page.tsx
import { useList, useUnit } from "effector-react";
import * as model from "./model";

// export function ChatPage { ... }

function ChatHistory() {
  const [messageDeleting, onMessageDelete] = useUnit([
    model.$messageDeleting,
    model.messageDeleteClicked,
  ]);

  // Хук `useList` позволяет React не перерендерить сообщения, которые действительно не изменились.
  const messages = useList(model.$messages, (message) => (
    <div className="message-item" key={message.timestamp}>
      <h3>From: {message.author.name}</h3>
      <p>{message.text}</p>
      <button onClick={() => onMessageDelete(message)} disabled={messageDeleting}>
        {messageDeleting ? "Deleting" : "Delete"}
      </button>
    </div>
  ));
  // Здесь не нужен `useCallback` потому что мы передаем функцию в HTML-элемент, а не в кастомный компонент

  return <div className="chat-history">{messages}</div>;
}
```

Я разделил `MessageForm` на разные компоненты, чтобы упростить код:

```tsx
// Файл: /src/pages/chat/page.tsx
function MessageForm() {
  const isLogged = useUnit(model.$loggedIn);
  return isLogged ? <SendMessage /> : <LoginForm />;
}

function SendMessage() {
  const [userName, messageText, messageSending] = useUnit([
    model.$userName,
    model.$messageText,
    model.$messageSending,
  ]);

  const [handleLogout, handleTextChange, handleEnterPress, handleSendClick] = useUnit([
    model.logoutClicked,
    model.messageTextChanged,
    model.messageEnterPressed,
    model.messageSendClicked,
  ]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleEnterPress();
    }
  };

  return (
    <div className="message-form">
      <h3>{userName}</h3>
      <input
        value={messageText}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyPress={handleKeyPress}
        className="chat-input"
        placeholder="Type a message..."
      />
      <button onClick={() => handleSendClick()} disabled={messageSending}>
        {messageSending ? "Sending..." : "Send"}
      </button>
      <button onClick={() => handleLogout()}>Log out</button>
    </div>
  );
}

function LoginForm() {
  const handleLogin = useUnit(model.loginClicked);

  return (
    <div className="message-form">
      <div>Please, log in to be able to send messages</div>
      <button onClick={() => handleLogin()}>Login as a random user</button>
    </div>
  );
}
```

### Управляем сессией пользователя как Про

Создадим сущность сессии. Сущность (entity) - это бизнес-юнит.

```ts
// Файл: /src/entities/session/index.ts
import { Session } from "shared/api";
import { createStore } from "effector";

// Сущность просто хранит сессию и некоторую внутреннюю информацию о ней
export const $session = createStore<Session | null>(null);
// Когда стор `$session` обновляется, то стор `$isLogged` тоже будет обновлен
// Они синхронизированы. Производный стор зависит от данных из исходного
export const $isLogged = $session.map((session) => session !== null);
```

Теперь мы можем реализовать функции входа в систему или выхода на странице. Почему не здесь?
Если мы разместим логику входа здесь, у нас будет очень неявная ситуация,
когда вы вызываете `sessionCreateFx` вы не увидите код, который вызывается после эффекта.
Но последствия будут видны в DevTools и поведении приложения.

Попробуйте написать код таким очевидным способом в одном файле,
чтобы вы и любой член команды могли отследить последовательность выполнения.

### Реализуем логику

Отлично. Теперь мы можем загрузить сеанс пользователя и список сообщений на странице.
Но у нас нет никакого события, когда мы можем начать это делать. Давайте исправим это.

Вы можете использовать Gate, но я предпочитаю использовать явные события.

```ts
// Файл: /src/pages/chat/model.ts
// Просто добавьте новое событие
export const pageMounted = createEvent();
```

Просто добавте `useEffect` и вызовите связанное событие внутри.

```tsx
// Файл: /src/pages/chat/page.tsx
export function ChatPage() {
  const handlePageMount = useUnit(model.pageMounted);

  React.useEffect(() => {
    handlePageMount();
  }, [handlePageMount]);

  return (
    <div className="parent">
      <ChatHistory />
      <MessageForm />
    </div>
  );
}
```

> Примечание: если вы не планируете писать тесты для кода эффектора и/или реализовывать SSR, вы можете опустить любое использование `useEvent`.

В данный момент мы можем загрузить сеанс и список сообщений.

Просто добавьте реакцию на событие, и любой другой код должен быть написан в хронологическом порядке после каждого события:

```ts
// Файл: /src/pages/chat/model.ts
// Не забудьте про import { sample } from "effector"
import { Message, messageApi, sessionApi } from "shared/api";
import { $session } from "entities/session";

// export stores
// export events

// Здесь место для логики

// Вы можете прочитать этот код так:
// При загрузке страницы, одновременно вызываются загрузка сообщений и сессия пользователя
sample({
  clock: pageMounted,
  target: [messageApi.messagesLoadFx, sessionApi.sessionLoadFx],
});
```

После этого нужно определить реакции на `messagesLoadFx.done` и `messagesLoadFx.fail`, а также то же самое для `sessionLoadFx`.

```ts
// Файл: /src/pages/chat/model.ts
// `.doneData` это сокращение для `.done`, поскольку `.done` returns `{ params, result }`
// Постарайтесь не называть свои аргументы как `state` или `payload`
// Используйте явные имена для содержимого
$messages.on(messageApi.messagesLoadFx.doneData, (_, messages) => messages);

$session.on(sessionApi.sessionLoadFx.doneData, (_, session) => session);
```

Отлично. Сессия и сообщения получены. Давайте позволим пользователям войти.

```ts
// Файл: /src/pages/chat/model.ts
// Когда пользователь нажимает кнопку входа, нам нужно создать новую сессию
sample({
  clock: loginClicked,
  target: sessionApi.sessionCreateFx,
});
// Когда сессия создана, просто положите его в хранилище сессий
sample({
  clock: sessionApi.sessionCreateFx.doneData,
  target: $session,
});
// Если создание сессии не удалось, просто сбросьте сессию
sample({
  clock: sessionApi.sessionCreateFx.fail,
  fn: () => null,
  target: $session,
});
```

Давайте реализуем процесс выхода:

```ts
// Файл: /src/pages/chat/model.ts
// Когда пользователь нажал на кнопку выхода, нам нужно сбросить сессию и очистить наше хранилище
sample({
  clock: logoutClicked,
  target: sessionApi.sessionDeleteFx,
});
// В любом случае, успешно или нет, нам нужно сбросить хранилище сессий
sample({
  clock: sessionApi.sessionDeleteFx.finally,
  fn: () => null,
  target: $session,
});
```

> Примечание: большинство комментариев написано только для образовательных целей. В реальной жизни код приложения будет самодокументируемым

Но если мы запустим dev-сервер и попытаемся войти в систему, то мы ничего не увидим.
Это связано с тем, что мы создали стор `$loggedIn` в модели, но не изменяем его. Давайте исправим:

```ts
// Файл: /src/pages/chat/model.ts
import { $isLogged, $session } from "entities/session";

// В данный момент есть только сырые данные без каких-либо знаний о том, как их загрузить
export const $loggedIn = $isLogged;
export const $userName = $session.map((session) => session?.name ?? "");
```

Здесь мы просто реэкспортировали наш собственный стор из сущности сессии, но слой представления не меняется.
Такая же ситуация и со стором `$userName`. Просто перезагрузите страницу, и вы увидите, что сессия загружена правильно.

### Отправка сообщений

Теперь мы можем войти в систему и выйти из нее. Думаю, что вы захотите отправить сообщение. Это довольно просто:

```ts
// Файл: /src/pages/chat/model.ts
$messageText.on(messageTextChanged, (_, text) => text);

// У нас есть два разных события для отправки сообщения
// Пусть событие `messageSend` реагирует на любое из них
const messageSend = merge([messageEnterPressed, messageSendClicked]);

// Нам нужно взять текст сообщения и информацию об авторе, а затем отправить ее в эффект
sample({
  clock: messageSend,
  source: { author: $session, text: $messageText },
  target: messageApi.messageSendFx,
});
```

Но если в файле `tsconfig.json` вы установите `"strictNullChecks": true`, вы получите ошибку.
Это связано с тем, что стор `$session` содержит `Session | null`, а `messageSendFx` хочет `Author` в аргументах.
`Author` и `Session` совместимы, но не должны быть `null`.

Чтобы исправить странное поведение, нам нужно использовать `filter`:

```ts
// Файл: /src/pages/chat/model.ts
sample({
  clock: messageSend,
  source: { author: $session, text: $messageText },
  filter: (form): form is { author: Session; text: string } => {
    return form.author !== null;
  },
  target: messageApi.messageSendFx,
});
```

Я хочу обратить ваше внимание на тип возвращаемого значения `form is {author: Session; text: string}`.
Эта функция называется [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
и позволяет TypeScript сузить тип `Session | null` до более конкретного `Session` через условие внутри функции.

Теперь мы можем прочитать это так: когда сообщение должно быть отправлено, возьмите сессию и текст сообщения, проверьте, существует ли сессия, и отправьте его.

Отлично. Теперь мы можем отправить новое сообщение на сервер.
Но если мы не вызовем `messagesLoadFx` снова, мы не увидим никаких изменений,
потому что стор `$messages` не обновился. Мы можем написать универсальный код для этого случая.
Самый простой способ - вернуть отправленное сообщение из эффекта.

```ts
// Файл: /src/shared/api/message.ts
export const messageSendFx = createEffect(async ({ text, author }: SendMessage) => {
  const message: Message = {
    id: createOid(),
    author,
    timestamp: Date.now(),
    text,
  };
  const history = await messagesLoadFx();
  await wait();
  saveHistory([...history, message]);
  return message;
});
```

Теперь мы можем просто добавить сообщение в конец списка:

```ts
// Файл: /src/pages/chat/model.ts
$messages.on(messageApi.messageSendFx.doneData, (messages, newMessage) => [
  ...messages,
  newMessage,
]);
```

Но в данный момент отправленное сообщение все еще остается в поле ввода.

```ts
// Файл: /src/pages/chat/model.ts
$messageText.on(messageSendFx, () => "");

// Если отправка сообщения не удалась, просто восстановите сообщение
sample({
  clock: messageSendFx.fail,
  fn: ({ params }) => params.text,
  target: $messageText,
});
```

### Удаление сообщения

Это довольно просто.

```ts
// Файл: /src/pages/chat/model.ts
sample({
  clock: messageDeleteClicked,
  target: messageApi.messageDeleteFx,
});

$messages.on(messageApi.messageDeleteFx.done, (messages, { params: toDelete }) =>
  messages.filter((message) => message.id !== toDelete.id),
);
```

Но вы можете заметить ошибку, когда состояние "Deleting" не отклчено.
Это связано с тем, что `useList` кэширует рендеры, и не знает о зависимости от состояния `messageDeleting`.
Чтобы исправить это, нам нужно предоставить `keys`:

```tsx
// Файл: /src/pages/chat/page.tsx
const messages = useList(model.$messages, {
  keys: [messageDeleting],
  fn: (message) => (
    <div className="message-item" key={message.timestamp}>
      <h3>From: {message.author.name}</h3>
      <p>{message.text}</p>
      <button onClick={() => handleMessageDelete(message)} disabled={messageDeleting}>
        {messageDeleting ? "Deleting" : "Delete"}
      </button>
    </div>
  ),
});
```

### Заключение

Это простой пример приложения на эффекторе с использованием React и TypeScript.

Вы можете склонировать себе репозиторий [effector/examples/react-and-ts](https://github.com/effector/effector/tree/master/examples/react-and-ts) и запустить пример самостоятельно на собственном компьютере.

