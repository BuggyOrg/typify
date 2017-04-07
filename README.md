# Typify
Applies a type scheme to a weakly typed buggy graph.
Typify offers six rules that can be applied selectively or all at once.
Uses rewrite library to iteratively search for candidates and apply the rules.

# Usage

To typify the graph completely, use<br/>

```js
g1 = Typify.TypifyAll(g, maxIterations)
```

where `maxIterations` is optional (default: Infinity)
To apply single rules, use

```js
Graph.flow(
  Typify.TypifyConstants(),
  Typify.TypifyEdge(),
  Typify.typifyLambdaOutput(),
  Typify.typifyLambdaOutput()
  // Typify.TypifyRecursion() // not yet implemented..
)(graph)
```

where

 - `TypifyConstants` deduces the type of all constants and sets the port types accordingly.
 - `TypifyEdge` typifies a edge from mixed generic/nongeneric source/target
 - `typifyLambdaOutput` Identifies the Lambda implementation with the lambda function type
 - `TypifyRecursion` typifies a recursion node

Generic types or *type names* are indicated by a lower case first character
(i.e. 'generic' and 'a' are considered generic, 'Number' and 'A' aren't).
For arrays there is a rest parameter indicated by the `...` prefix.

All types are strings or should follow this format:

```js
var type = {
  name: 'Specific'
  data: [
    'genOutput' // list of data types
  ]
}
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
