# Typify
Applies a type scheme to a weakly typed buggy graph.
Typify offers six rules that can be applied selectively or all at once.
Uses rewrite library to iteratively search for candidates and apply the rules.

# Usage

To typify the graph completely, use<br/>

<pre><code>
g1 = API.TypifyAll(g, maxIterations)
</code></pre>

where <code>maxIterations</code> is optional (default: Infinity)
To apply single rules, use

<pre><code>
g1 = API.TypifySpecializingEdge()(g)
g2 = API.TypifyGeneralizingEdge()(g)
g3 = API.TypifyAtomicNode()(g)
g6 = API.TypifyRecursiveNode()(g)
</code></pre>

where

<ul>
<li><code>TypifySpecializingEdge</code> typifies all edges from generic to nongeneric ports</li>
<li><code>TypifyGeneralizingEdge</code> typifies all edges from nongeneric to generic ports</li>
<li><code>TypifyAtomicNode</code> typifies all atomic nodes with mixed nongeneric and generic ports typified</li>
<li><code>TypifyRecursiveNode</code> typifies all recursive</li>
</ul>

> Written with [StackEdit](https://stackedit.io/).
