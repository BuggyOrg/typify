
import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'

const Rewrites = require('./rewrites.js')
const Utils = require('./utils.js')

/**
 * Generates a graph rewriter using all six default rules
 * @return {Boolean} a rewrite function that takes a graph and returns a new one
 */
export function TypifyAll (graph, iterations = Infinity) {
  if (!graph) throw new Error('no graph')
  for (let node of Graph.nodesDeep(graph)) {
    const ports = _.filter(Graph.Node.ports(node), Utils.IsGenericPort)
    for (const port of ports) {
      let newPort = _.assign(_.cloneDeep(port), {
        type: port.type + '.' + node.id
      })
      graph = Rewrite.replacePort(node, port, newPort, graph)
      node = Graph.node(node.id, graph)
    }
  }
  graph = Rewrite.rewrite([
    Rewrites.TypifyNode(),
    Rewrites.TypifyEdge()
    // Rewrites.TypifyRecursion()
  ], iterations)(graph)
  graph = applyAssignments(graph)
  return graph
}

function applyAssignments (graph) {
  if (!graph) throw new Error('no graph')
  if (!graph.assignments) return graph // nothing to apply
  for (let node of Graph.nodesDeep(graph)) {
    for (let port of Graph.Node.ports(node)) {
      if (IsGenericType(port.type)) {
        var assignedType = graph.assignments[port.type]
        if (!assignedType) continue // nothing to apply here
        var newPort = _.assign(_.cloneDeep(port), {
          type: _.cloneDeep(assignedType)
        })
        graph = Rewrite.replacePort(node, port, newPort, graph)
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
  return true
}

export function IsGenericType (t) {
  if (!IsValidType(t)) return false
  return IsLowerCase((t.name || t).charAt(0))
}

function IsLowerCase (c) {
  return c === c.toLowerCase()
}

export function UnifyTypes (t1, t2, assignments = {}) {
  if (!IsValidType(t1)) throw new Error('invalid type t1: ' + JSON.stringify(t1))
  if (!IsValidType(t2)) throw new Error('invalid type t2: ' + JSON.stringify(t2))
  if ((t1.name || t1) in assignments) t1 = assignments[t1.name || t1]
  if ((t2.name || t2) in assignments) t2 = assignments[t2.name || t2]
  const g1 = IsGenericType(t1)
  const g2 = IsGenericType(t2)
  if (!g1 && !g2) {
    if (typeof t1 === 'string' && typeof t2 === 'string') {
      return t1 === t2
    }
    // if (t1.name !== t2.name) throw new Error('type unification error: ' + t1.name + ' has a different name than ' + t2.name)
    let f1 = t1.data
    let f2 = t2.data
    if (f1.length !== f2.length) throw new Error('type unification error: number of fields differ')
    for (let i = 0; i < f1.length; ++i) {
      if (!UnifyTypes(f1[i], f2[i], assignments)) return false
    }
    if (!t1.args && !t2.args) return true
    if (!t1.args || !t2.args) return false
    f1 = t1.args
    f2 = t2.args
    if (f1.length !== f2.length) throw new Error('type unification error: number of fields differ')
    for (let i = 0; i < f1.length; ++i) {
      if (!UnifyTypes(f1[i], f2[i], assignments)) return false
    }
    return true
  } else if (g1 && g2) {
    return t1 === t2
  } else {
    if (g1) assignments[t1.name || t1] = _.cloneDeep(t2)
    if (g2) assignments[t2.name || t2] = _.cloneDeep(t1)
    return true
  }
  // if (typeof t1 !== 'string') t1.assignments = assignments.concat(t1.assignment)
  // if (typeof t2 !== 'string') t2.assignments = assignments.concat(t2.assignment)
}

export function TryUnifyTypes (t1, t2, assignments) {
  try {
    return UnifyTypes(t1, t2, assignments)
  } catch (error) {
    return false
  }
}

