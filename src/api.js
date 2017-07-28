
import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import * as Unify from './unify'
import * as Rewrites from './rewrites'
import * as Subtypes from './subtypes'
import * as Utils from './utils'
import _ from 'lodash'
// import debug from 'debug'

function postfixGenericType (type, postfix) {
  if (typeof (type) === 'string' && isTypeParameter(type)) {
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


export function replaceTypeParameter (type, param, value) {
  if (typeof type === 'string') {
    return type === param ? value : type
  } else if ((type.name || type) === param) {
    return _.cloneDeep(value)
  } else {
    return {
      name: type.name,
      data: _.map(type.data, f => replaceTypeParameter(f, param, value))
    }
  }
}

/**
 * Generates a graph rewriter using all six default rules
 * @return {Boolean} a rewrite function that takes a graph and returns a new one
 */
export function TypifyAll (graph, types = [], iterations = Infinity) {
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
    // Rewrites.TypifyNode(types),
    Rewrites.typifyConstants(types),
    Rewrites.typifyEdge(types),
    Rewrites.typifyLambdaInputs(types),
    Rewrites.typifyLambdaOutput(types),
    // Rewrites.TypifyRecursion(types),
    Rewrites.checkEdge(types)
  ], iterations)(graph)
  // graph = applyAssignments(graph)
  return graph
}

/**
 * Looks up the type assignment in a graph
 * @param {Type} type
 * @param {Graph} graph
 * @return {Type} the type assigned by that graph
 */
export function assignedType (type, graph) {
  if (!graph) throw new Error('no graph')
  if (!graph.assignments) return type
  const tName = typeName(type)
  if (isTypeParameter(type) && tName in graph.assignments) {
    if (!Array.isArray(graph.assignments[tName])) {
      return graph.assignments[tName]
    } else {
      return graph.assignments[tName].map((a) => assignedType(a, graph))
    }
  } else if (typeof (type) === 'object') {
    if (typeof (type.data) === 'string') {
      return Object.assign({}, _.omit(type, 'data'), {data: assignedType(type.data, graph)})
      //return Object.assign({}, _.omit(type, 'data'), {data: assignedType(type.data, graph)})
      type.data = assignedType(type.data, graph)
      return type
    } else {
      // return Object.assign({}, _.omit(type, 'data'), {data: _.flatten(type.data.map((t) => assignedType(t, graph)))})
      type.data = _.flatten(type.data.map(t => assignedType(t, graph)))
      return type
    }
  } else {
    return type
  }
}

function typeNames (node) {
  return _.uniq(_.flatten(Graph.Node.ports(node)
    .map((p) => typeNames(p.type))))
}

/**
 * Applies the assignments stored in a graph
 * @param {Graph} graph 
 * @return {Graph} the graph
 */
export function applyAssignments (graph) {
  if (!graph) throw new Error('no graph')
  if (!graph.assignments) return graph // nothing to apply
  for (let node of Graph.nodesDeep(graph)) {
    typeNames(node).forEach((t) =>
      _.set(node, 'metaInformation.parameters.typings.' + genericName(t), assignedType(t, graph)))
    /*
    graph = Graph.flow(typeNames(node).map((t) =>
      (graph) => Graph.updateNodeMetaKey('parameters.typings.' + genericName(t), assignedType(t, graph), node, graph))
    )(graph)
    */
    for (var i = 0; i < node.ports.length; i++) {
      const port = node.ports[i]
      if (IsGenericType(port.type)) {
        var assType = assignedType(port.type, graph)
        var newPort = _.merge(_.cloneDeep(port), {
          type: _.cloneDeep(assType)
        })
        // node.ports[i] = newPort
        graph = Graph.replacePort(port, newPort, graph)
        node = Graph.node(node.id, graph)
      }
    }
  }
  return graph
}

export function genericName (t) {
  return t.split('.')[0]
}

export function typeNames (t) {
  if (!IsGenericType(t)) return []
  if (isTypeParameter(t)) return [typeName(t)]
  if (typeof (t.data) === 'string') return [typeName(t.data)]
  else return _.flatten(t.data.map(typeNames))
}

function typeName (type) {
  if (typeof (type) === 'string') {
    if (isRest(type)) return restName(type)
    else return type
  }
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
    return type.name + '<' + _.map(type.dat, typeName).join(', ') + '>'
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

/**
 * Unifies two types under some given subtypings and assignments
 * @param {Type} t1 
 * @param {Type} t2 
 * @param {TypeTree} atomics 
 * @param {Object} assign 
 */
export function unifyTypes (t1, t2, atomics, assign) {
  return Unify.UnifyTypes(t1, t2, atomics, assign)
}


/**
 * Unifies two types under some given subtypings and assignments, and applies the assignments in place
 * @param {Type} t1 
 * @param {Type} t2 
 * @param {TypeTree} atomics 
 * @param {Object} assign 
 */
export function unifyAndAssignTypes (t1, t2, atomics, assign) {
  return Unify.UnifyAndAssignTypes(t1, t2, atomics, assign)
}

/**
 * constructs a type tree by deriving supertypes from subtypes and transitive type relations
 * @param {*} types type tree prototype
 * @return type tree result
 */
export function constructTypeTree(types)
{
  return Subtypes.constructTypes(types)
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


export function IsValidType (t) {
  if (!t) return false
  if (typeof t === 'string') return true
  if (!t.data) return false
  return isRest(t.data) || isTypeParameter(t.data) || (Array.isArray(t.data) && t.data.every(IsValidType))
}

function isTypeObject (t) {
  return typeof (t) === 'object' && t.name && t.data
}

export function IsGenericType (t) {
  if (!IsValidType(t)) return false
  if (isTypeObject(t)) {
    return isTypeParameter(t.data) || t.data.some(IsGenericType)
  }
  return isTypeParameter(t)
}

export function isTypeParameter (t) {
  return (typeof t === 'string') && (IsLowerCase((t.name || t).charAt(0)) || isRest(t))
}

function IsLowerCase (c) {
  return c >= 'a' && c <= 'z'
}

export function isRest (type) {
  return (typeof type === 'string') && (type.slice(0, 3) === '...')
}

function restName (type) {
  return type.slice(3)
}