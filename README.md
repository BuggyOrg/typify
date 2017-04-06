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
g1 = Typify.TypifyEdge()(g)
g2 = Typify.typifyLambdaOutput()(g1)
// g3 = Typify.TypifyRecursion()(g2) // not yet implemented..
```

where

<ul>
<li>`TypifyEdge` typifies a edge from mixed generic/nongeneric source/target</li>
<li>`typifyLambdaOutput` Identifies the Lambda implementation with the lambda function type</li>
<li>`TypifyRecursion` typifies a recursion node</li>
</ul>

generic types are indicated by a lower case first character
(ie 'generic' and 'a' are considered generic, 'Number' and 'A' aren't)

all types are strings or should follow this format:

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
