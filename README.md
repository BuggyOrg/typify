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
g1 = Typify.TypifyEdge()(g)
g3 = Typify.TypifyAtomicNode()(g)
g4 = Typify.TypifyRecursion()(g)
</code></pre>

where

<ul>
<li><code>TypifyEdge</code> typifies a edge from mixed generic/nongeneric source/target</li>
<li><code>TypifyNode</code> typifies a node with mixed generic/nongeneric ports</li>
<li><code>TypifyRecursion</code> typifies a recursion node</li>
</ul>

generic types are indicated by a lower case first character (ie 'generic' and 'a' are considered generic, 'Number' and 'A' aren't)