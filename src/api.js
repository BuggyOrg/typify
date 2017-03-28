
import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'

const Rewrites = require('./rewrites.js')
const Utils = require('./utils.js')

function postfixGenericType (type, postfix) {
  if (typeof (type) === 'string' && isGenericTypeName(type)) {
    return type + postfix
  } else if (typeof (type) === 'object') {
    return Object.assign({}, type, {data: type.data.map((t) => postfixGenericType(t, postfix))})
  }
  return type
}

/**
 * Generates a graph rewriter using all six default rules
 * @return {Boolean} a rewrite function that takes a graph and returns a new one
 */
export function TypifyAll (graph, iterations = Infinity) {
  if (!graph) throw new Error('no graph')
  for (let node of Graph.nodesDeep(graph)) {
    const ports = _.filter(Graph.Node.ports(node), Utils.IsGenericPort)
    for (const port of ports) {
      var newType = postfixGenericType(port.type, '.' + node.id)
      let newPort = _.assign(_.cloneDeep(port), {
        type: newType
      })
      graph = Graph.replacePort(port, newPort, graph)
      node = Graph.node(node.id, graph)
    }
  }
  graph = Rewrite.rewrite([
    Rewrites.TypifyNode(),
    Rewrites.TypifyEdge(),
    Rewrites.typifyLambdaOutput()
    // Rewrites.TypifyRecursion()
  ], iterations)(graph)
  graph = applyAssignments(graph)
  return graph
}

export function assignedType (type, graph) {
  if (isGenericTypeName(type) && type in (graph.assignments || {})) {
    return graph.assignments[type]
  } else if (typeof (type) === 'object') {
    return Object.assign({}, type, {data: type.data.map((t) => assignedType(t, graph))})
  } else {
    return type
  }
}

function applyAssignments (graph) {
  if (!graph) throw new Error('no graph')
  if (!graph.assignments) return graph // nothing to apply
  for (let node of Graph.nodesDeep(graph)) {
    for (let port of Graph.Node.ports(node)) {
      if (IsGenericType(port.type)) {
        var assType = assignedType(port.type, graph)
        var newPort = _.assign(_.cloneDeep(port), {
          type: _.cloneDeep(assType)
        })
        graph = Graph.replacePort(port, newPort, graph)
        node = Graph.node(node.id, graph)
      }
    }
  }
  return graph
}

function IsValidType (t) {
  if (!t) return false
  if (typeof t === 'string') return true
  if (!t.data) return false
  return t.data.every(IsValidType)
}

function isTypeObject (t) {
  return typeof (t) === 'object' && t.data
}

export function IsGenericType (t) {
  if (!IsValidType(t)) return false
  if (isTypeObject(t)) {
    return t.data.some(IsGenericType)
  }
  return isGenericTypeName(t)
}

function isGenericTypeName (t) {
  return (typeof (t) === 'string') && IsLowerCase((t.name || t).charAt(0))
}

function IsLowerCase (c) {
  return c === c.toLowerCase()
}

export function areUnifyable (t1, t2, graph) {
  if (!graph) throw new Error('[typify] areUnifyable requires a graph as the third parameter to resolve assignments.')
  try {
    UnifyTypes(t1, t2, graph)
    return true
  } catch (err) {
    return false
  }
}

/**
 * Finds an assignment to unify the given types. An assignment assigns to every generic type
 * its unified type. E.g. `{ a: 'Number' }` assigns the type `Number` to `a`.
 * @param {Type} t1 The first type
 * @param {Type} t2 Second type
 * @param {Portgraph} graph The base graph
 * @returns {Assignment} The assignment for the given types
 * @throws {Error} If the types are not assignable.
 */
export function UnifyTypes (t1b, t2b, graph) {
  if (!graph) throw new Error('[typify] UnifyTypes requires a graph as the third parameter to resolve assignments.')
  var t1 = assignedType(t1b, graph)
  var t2 = assignedType(t2b, graph)
  var assignments = {}
  if (!IsValidType(t1)) throw new Error('invalid type t1: ' + JSON.stringify(t1))
  if (!IsValidType(t2)) throw new Error('invalid type t2: ' + JSON.stringify(t2))
  if ((t1.name || t1) in assignments) t1 = assignments[t1.name || t1]
  if ((t2.name || t2) in assignments) t2 = assignments[t2.name || t2]
  const g1 = isGenericTypeName(t1)
  const g2 = isGenericTypeName(t2)
  if (!g1 && !g2) {
    if (typeof t1 === 'string' && typeof t2 === 'string') {
      // TODO: should this throw an error, if the types are not equal?
      // Or more precisely, we would perhaps need information about the types.
      // e.g. if t1 ⊑ t2 everything is fine (but not if t1 ⋢ t2)
      if (t1 !== t2) throw new Error('Types are not unifyable: "' + t1 + '" and "' + t2 + '"')
      return {}
    }
    // if (t1.name !== t2.name) throw new Error('type unification error: ' + t1.name + ' has a different name than ' + t2.name)
    let f1 = t1.data
    let f2 = t2.data
    if (f1.length !== f2.length) throw new Error('type unification error: number of fields differ')
    for (let i = 0; i < f1.length; ++i) {
      Object.assign(assignments, UnifyTypes(f1[i], f2[i], graph))
    }
    return assignments
  } else if (g1 && g2) {
    if (t1 !== t2) throw new Error('Types are not unifyable: "' + JSON.stringify(t1) + '" and "' + JSON.stringify(t2) + '"')
    return assignments
  } else {
    if (g1) assignments[t1.name || t1] = _.cloneDeep(t2)
    if (g2) assignments[t2.name || t2] = _.cloneDeep(t1)
    return assignments
  }
  // if (typeof t1 !== 'string') t1.assignments = assignments.concat(t1.assignment)
  // if (typeof t2 !== 'string') t2.assignments = assignments.concat(t2.assignment)
}

export function isFullyTyped (graph) {
  for (const node of Graph.nodesDeep(graph)) {
    for (const port of Graph.Node.ports(node)) {
      if (Utils.IsGenericPort(port)) return false
    }
  }
  return true
}

