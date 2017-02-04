# Typify
Applies a type scheme to a weakly typed buggy graph.
Typify offers six rules that can be applied selectively or all at once.
Uses rewrite library to iteratively search for candidates and apply the rules.

# Usage

To typify the graph completely, use<br/>

<pre><code>
g1 = Typify.TypifyAll(g, maxIterations)
</code></pre>

where <code>maxIterations</code> is optional (default: Infinity)
To apply single rules, use

<pre><code>
g1 = Typify.TypifySpecializingEdge()(g)
g2 = Typify.TypifyGeneralizingEdge()(g)
g3 = Typify.TypifyAtomicNode()(g)
g4 = Typify.TypifyRecursiveNode()(g)
</code></pre>

where

<ul>
<li><code>TypifySpecializingEdge</code> typifies an edge from a generic to a nongeneric ports</li>
<li><code>TypifyGeneralizingEdge</code> typifies an edge from a nongeneric to a generic ports</li>
<li><code>TypifyAtomicNode</code> typifies an atomic node with mixed nongeneric and generic ports</li>
<li><code>TypifyRecursiveNode</code> typifies a recursive node</li>
</ul>
