
import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import * as Unify from './unify'
import * as Rewrites from './rewrites'
import * as Utils from './utils'
import _ from 'lodash'
// import debug from 'debug'

function postfixGenericType (type, postfix) {
  if (typeof (type) === 'string' && Unify.isGenericTypeName(type)) {
    return type + postfix
  } else if (typeof (type) === 'object') {
    /* TODO Volker 170505
    i.A. sollte type.data eine Liste sein und nicht selbst ein String
    aber im partial test is type.data === "rest"
    */
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
    for (var i = 0; i < node.ports.length; i++) {
      const port = node.ports[i]
      if (!Utils.IsGenericPort(port)) continue
      var newType = postfixGenericType(port.type, '.' + node.id)
      let newPort = _.assign(_.cloneDeep(port), {
        type: newType
      })
      node.ports[i] = newPort
    }
  }
  graph.assignments = {}
  graph = Rewrite.rewrite([
    // Rewrites.TypifyNode(),
    Rewrites.typifyConstants(),
    Rewrites.TypifyEdge(),
    Rewrites.typifyLambdaInputs(),
    Rewrites.typifyLambdaOutput(),
    Rewrites.TypifyRecursion(),
    Rewrites.checkEdge()
  ], iterations)(graph)
  graph = applyAssignments(graph)
  return graph
}

export function assignedType (type, graph) {
  if (!graph) throw new Error('no graph')
  if (!graph.assignments) return type
  const tName = Unify.typeName(type)
  if (Unify.isGenericTypeName(type) && tName in graph.assignments) {
    if (!Array.isArray(graph.assignments[tName])) {
      return graph.assignments[tName]
    } else {
      return graph.assignments[tName].map((a) => assignedType(a, graph))
    }
  } else if (typeof (type) === 'object') {
    if (typeof (type.data) === 'string') {
      return Object.assign({}, _.omit(type, 'data'), {data: assignedType(type.data, graph)})
    } else {
      return Object.assign({}, _.omit(type, 'data'), {data: _.flatten(type.data.map((t) => assignedType(t, graph)))})
    }
  } else {
    return type
  }
}

function typeNames (node) {
  return _.uniq(_.flatten(Graph.Node.ports(node)
    .map((p) => Unify.typeNames(p.type))))
}

function applyAssignments (graph) {
  if (!graph) throw new Error('no graph')
  if (!graph.assignments) return graph // nothing to apply
  for (let node of Graph.nodesDeep(graph)) {
    typeNames(node).forEach((t) =>
      _.set(node, 'metaInformation.parameters.typings.' + Unify.genericName(t), assignedType(t, graph)))
    /*
    graph = Graph.flow(typeNames(node).map((t) =>
      (graph) => Graph.updateNodeMetaKey('parameters.typings.' + Unify.genericName(t), assignedType(t, graph), node, graph))
    )(graph)
    */
    for (var i = 0; i < node.ports.length; i++) {
      const port = node.ports[i]
      if (IsGenericType(port.type)) {
        var assType = assignedType(port.type, graph)
        var newPort = _.assign(_.cloneDeep(_.omit(port, 'type')), {
          type: _.cloneDeep(assType)
        })
        node.ports[i] = newPort
        // graph = Graph.replacePort(port, newPort, graph)
        // node = Graph.node(node.id, graph)
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

function typeName (type) {
  if (typeof (type) === 'string') return type
  if (type.type === 'Function' || type.name === 'Function') {
    var inputs, outputs
    if (!type.data || !type.data[0] || !Array.isArray(type.data[0].data)) {
      inputs = '?'
    } else {
      inputs = type.data[0].data.map(typeName).join(', ')
    }
    if (!type.data || !type.data[1] || !Array.isArray(type.data[1].data)) {
      outputs = '?'
    } else {
      outputs = type.data[1].data.map(typeName).join(', ')
    }
    return 'Function(' + inputs + ' → ' + outputs + ')'
  } else if (type.name && type.data) {
    return type.name + '<' + type.data.map(typeName).join(', ') + '>'
  } else return typeName(type.type || type.name || 'complex...')
}

export function isFullyTyped (graph) {
  var typed = true
  var newGraph = graph
  const debugging = !!process.env.DEBUG
  for (const node of Graph.nodesDeep(graph)) {
    for (const port of Graph.Node.ports(node)) {
      if (Utils.IsGenericPort(port)) {
        Utils.Log(JSON.stringify(port.type, null, 2))
        Utils.Log(JSON.stringify(graph.assignments))
        typed = false
      }
    }
    if (debugging) {
      const Node = Graph.Node
      var n = Graph.node(node.id, newGraph)
      n.componentId = Node.inputPorts(n).map((p) => typeName(p.type)).join(', ') +
        '\\n – ' + Node.outputPorts(n).map((p) => typeName(p.type))
      newGraph = Graph.replaceNode(n.id, n, newGraph)
    }
  }
  return typed
}

export function relabelToTypes (graph) {
  for (const node of Graph.nodesDeep(graph)) {
    const Node = Graph.Node
    var n = Graph.node(node.id, graph)
    n.componentId = Node.inputPorts(n).map((p) => typeName(p.type)).join(', ') +
      '\\n – ' + Node.outputPorts(n).map((p) => typeName(p.type))
    graph = Graph.replaceNode(n.id, n, graph)
  }
  return graph
}
