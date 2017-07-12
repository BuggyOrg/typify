# Typify
Applies a type scheme to a weakly typed buggy graph.
Typify offers six rules that can be applied selectively or all at once.
Uses rewrite library to iteratively search for candidates and apply the rules.

# Usage

To typify the graph completely, use<br/>

```js
let typifiedGraph = Typify.TypifyAll(graph, [atomics = null], [maxIterations = Infinity])
```
where

- `graph` is the graph to be typified
- `atomics` is a tree of subtypes
- `maxIterations` limits the number of rewrite applications

To apply single rules, use

```js
Graph.flow(
    Rewrites.typifyEdge(types),
    typifyConstants(types),
    Rewrites.typifyLambdaInputs(types),
    Rewrites.typifyLambdaOutput(types),
    // Rewrites.TypifyRecursion(types),
    Rewrites.checkEdge(types)
)(graph)
```

where

 - `typifyConstants` deduces the type of all constants and sets the port types accordingly.
 - `typifyEdge` typifies a edge from mixed generic/nongeneric source/target
 - `typifyLambdaInputs` and `typifyLambdaOutputs` unify the lambda implementation with the lambda function type
 - `typifyRecursion` typifies a recursion node

*Type parameters* are strings with lower case first character and represent arbitrary types.
Type parameters can be grouped by the `...` prefix, representing zero or more arbitrary types.
*Generic types* is Typify's name for complex types that have some type parameter.

Some examples:

```js
let concreteType = 'Number'
let typeParameter = 'inputType'
let genericType1 = { name: 'GenericType1', data: [concreteType, typeParameter] }
let genericType2 = { name: 'GenericType2', data: ['String', '...andMore'] }
```

Functions have simply a special type name and structure

```js
var fnType = {
  name: 'Function'
  data: [
    {
      name: 'arguments',
      data: ['list', 'of' 'args']
    },
    {
      name: 'returnValues',
      data: ['list', 'of', 'outputs']
    }
  ]
}
```

Rest parameters can be used like this:

```js
import * as Unify from '@buggyorg/typify/lib/unify'
const t1 = {
  name: 'T1'
  data: ['first', '...rest']
}
const t2 = {
  name: 'T2'
  data: ['Number']
}
const t3 = {
  name: 'T3'
  data: ['String', 'Number', 'Boolean']
}

const assign1 = Unify.UnifyTypes(t1, t2)
/*
 assign1 = {
   first: 'Number',
   rest: []
 }
*/

const assign2 = Unify.UnifyTypes(t1, t3)
/*
 assign2 = {
   first: 'String',
   rest: ['Number', 'Boolean']
 }
*/

```