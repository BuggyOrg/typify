
import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import * as Unify from './unify'
import _ from 'lodash'

const Rewrites = require('./rewrites.js')
const Utils = require('./utils.js')

function postfixGenericType (type, postfix) {
  if (typeof (type) === 'string' && Unify.isGenericTypeName(type)) {
    return type + postfix
  } else if (typeof (type) === 'object') {
    if (typeof (type.data) === 'string') {
      return Object.assign({}, type, {data: postfixGenericType(type.data, postfix)})
    }
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
    // Rewrites.TypifyNode(),
    Rewrites.TypifyEdge(),
    Rewrites.typifyLambdaOutput()
    // Rewrites.TypifyRecursion()
  ], iterations)(graph)
  graph = applyAssignments(graph)
  return graph
}

export function assignedType (type, graph) {
  const tName = Unify.typeName(type)
  if (Unify.isGenericTypeName(type) && tName in (graph.assignments || {})) {
    return graph.assignments[tName]
  } else if (typeof (type) === 'object') {
    if (typeof (type.data) === 'string') {
      return Object.assign({}, type, {data: assignedType(type.data, graph)})
    } else {
      return Object.assign({}, type, {data: _.flatten(type.data.map((t) => assignedType(t, graph)))})
    }
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

export const IsGenericType = Unify.IsGenericType

export function areUnifyable (t1, t2, graph) {
  if (!graph) throw new Error('[typify] areUnifyable requires a graph as the third parameter to resolve assignments.')
  return Unify.areUnifyable(t1, t2, (type) => assignedType(type, graph))
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
export function UnifyTypes (t1, t2, graph) {
  if (!graph) throw new Error('[typify] areUnifyable requires a graph as the third parameter to resolve assignments.')
  return Unify.UnifyTypes(t1, t2, (type) => assignedType(type, graph))
}

export function isFullyTyped (graph) {
  for (const node of Graph.nodesDeep(graph)) {
    for (const port of Graph.Node.ports(node)) {
      if (Utils.IsGenericPort(port)) {
        console.log(JSON.stringify(port.type, null, 2))
        console.log(JSON.stringify(graph.assignments))
        return false
      }
    }
  }
  return true
}

