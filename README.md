# **typify**
Applies a type scheme to a weakly typed buggy graph.
Typify offers six rules that can be applied selectively or all at once
Uses rewrite library to iteratively search for candidates and apply the rules.

# **Usage**

To typify the graph completely, use

const g1 = CreateGraph()
const g2 = API.TypifyAll(g1, maxIterations)

where maxIterations is optional (default: Infinity)
To apply single rules, use

const g1 = CreateGraph()
const g2 = API.TypifySpecializingEdge()(g1) // typify edges of type generic > specific
const g3 = API.TypifyGeneralizingEdge()(g1) // typify edges of type specific > generic
const g4 = API.TypifyAtomicNode()(g1) // typify in- and out-ports of atomic nodes together
const g5 = API.TypifyCollectingNode()(g1) // typify in-ports of non-atomic nodes
const g6 = API.TypifyDistributingNode()(g1) // typify out-ports of non-atomic nodes
const g7 = API.TypifyRecursiveNode()(g1) // match ports of recursion nodes with parent

(note additional brackets)
