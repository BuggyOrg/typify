
import * as Graph from '@buggyorg/graphtools'

import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'
import debug from 'debug'

function Log (line) {
  debug('[typify]', line)
  console.log(line)
}

/**
 * Generates a graph rewriter using all six default rules
 * @return {Boolean} a rewrite function that takes a graph and returns a new one
 */
export function TypifyAll (graph, iterations = Infinity) {
  if (!graph) throw new Error('no graph')
  return Rewrite.rewrite([
    TypifyAtomicNode(),
    TypifySpecializingEdge(),
    TypifyGeneralizingEdge(),
    //TypifyCollectingNode(),
    //TypifyDistributingNode(),
    TypifyRecursiveNode()
  ], iterations)(graph)
}

export function IsGenericType (t) {
  if (!t) return false
  else if (typeof t === 'string') return IsLowerCase(t.charAt(0))
  else if (IsTypeObject(t)) return IsLowerCase(t.name.charAt(0))
  else return false
}

function IsLowerCase (c) {
  return c === c.toLowerCase()
}

export function UnifyTypes (t1, t2, assignment = {}) {
  t1 = CheckType(t1)
  t2 = CheckType(t2)
  if (!IsGenericType(t1) && !IsGenericType(t2)) {
    if (t1.name !== t2.name) throw new Error('type unification error: ' + t1.name + ' has a different name than ' + t2.name)
    const f1 = t1.data.sort(t => t.name || t)
    const f2 = t2.data.sort(t => t.name || t)
    if (f1.length !== f2.length) throw new Error('type unification error: number of fields differ')
    for (var i = 0; i < f1.length; ++i) {
      UnifyTypes(f1[i], f2[i], assignment)
    }
  }
  if (IsGenericType(t2) && !IsGenericType(t1)) {
    assignment[t2.name] = _.cloneDeep(t1)
  }
  if (IsGenericType(t1) && !IsGenericType(t2)) {
    assignment[t1.name] = _.cloneDeep(t2)
  }
  t1.assignment = _.cloneDeep(assignment)
  t2.assignment = _.cloneDeep(assignment)
}

export function TryUnifyTypes (t1, t2, assignment = {}) {
  try {
    UnifyTypes(t1, t2, assignment)
  } catch (error) {
    return false
  }
  return true
}

function CheckType (t) {
  if (!t) throw new Error('missing type definition')
  else if (typeof t === 'string') return MakeTypeObject(t)
  else if (!IsTypeObject(t)) throw new Error('invalid type definition')
  else return t
}

function IsTypeObject (t) {
  return t &&
  t.data &&
  t.name
}

function MakeTypeObject (t) {
  return { name: t, data: [] }
}

/**
 * Generates a graph rewriter that typifies all specializing edges (ie. from generic to specific ports)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifySpecializingEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        // check wether edge goes from generic to specific
        if (Rewrite.isGenericPort(edge.sourcePort) === false) {
          return false
        } else if (Rewrite.isGenericPort(edge.targetPort)) {
          return false
        } else if (edge.source.isRecursive && edge.target.isRecursive) {
          return false
        } else {
          return edge
        }
      },
      (edge, graph) => {
        const line = 'typifying specializing edge from ' +
        edge.source.name + '@' + edge.sourcePort.port +
        ' to ' +
        edge.target.name + '@' + edge.targetPort.port
        Log(line)
        // construct new port with type from source
        const node = Graph.node(edge.source, graph)
        const port = _.assign(_.cloneDeep(edge.sourcePort), {
          type: _.cloneDeep(edge.targetPort.type)
        })
        return Rewrite.replacePort(node, edge.sourcePort, port, graph)
      })
}

/**
 * Generates a graph rewriter that typifies all specializing edges (ie. from specific to generic ports)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyGeneralizingEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        // check wether edge goes from specific to generic
        if (Rewrite.isGenericPort(edge.sourcePort)) {
          return false
        } else if (Rewrite.isGenericPort(edge.targetPort) === false) {
          return false
        } else if (edge.source.isRecursive && edge.target.isRecursive) {
          return false
        } else {
          return edge
        }
      },
      (edge, graph) => {
        const line = 'typifying generalizing edge from ' +
        edge.source.name + '@' + edge.sourcePort.port +
        ' to ' +
        edge.target.name + '@' + edge.targetPort.port
        Log(line)
        // construct new port with type from source
        const node = Graph.node(edge.target, graph)
        const port = _.assign(_.cloneDeep(edge.targetPort), {
          type: _.cloneDeep(edge.sourcePort.type)
        })
        return Rewrite.replacePort(node, edge.targetPort, port, graph)
      })
}

/**
 * Generates a graph rewriter that typifies all collecting nodes (ie. nodes with mixed generic and specific inputs)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyCollectingNode () {
  return Rewrite.applyNode(
      (node, graph) => {
        const ports = Graph.Node.inputPorts(node, true)
        const genericPorts = _.filter(ports, (p) => Rewrite.isGenericPort(p))
        const specificPorts = _.filter(ports, (p) => Rewrite.isGenericPort(p) === false)
        if (genericPorts.length === 0) { // nothing to typify
          return false
        } else if (specificPorts.length === 0) { // nothing to typify from
          return false
        }
        const type = specificPorts[0].type
        for (const p of specificPorts) {
          if (!TryUnifyTypes(p.type, specificPorts[0].type)) {
          //if (p.type !== specificPorts[0].type) {
            throw new Error('conflicting types at node ' +
              (node.name || node.id || 'N/A') + ' between ports' +
              specificPorts[0] + ' and ' + p)
          }
        }
        return {
          node: node,
          type: _.cloneDeep(type)
        }
      },
      (match, graph) => {
        var line = 'typifying collecting node ' + match.node.name
        Log(line)
        // copy specific type to generic ports
        var newNode = _.assign(_.cloneDeep(match.node), {
          ports: _.map((match.node.ports), (p) => {
            if (Graph.Port.isOutputPort(p)) {
              return p
            } else {
              return _.assign(_.cloneDeep(p), {
                type: _.cloneDeep(match.type)
              })
            }
          })
        })
        return Graph.replaceNode(match.node, newNode, graph)
      })
}

/**
 * Generates a graph rewriter that typifies all collecting nodes (ie. nodes with mixed generic and specific outputs)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyDistributingNode () {
  return Rewrite.applyNode(
      (node, graph) => {
        var ports = Graph.Node.outputPorts(node, true)
        var genericPorts = _.filter(ports, (p) => Rewrite.isGenericPort(p))
        var specificPorts = _.filter(ports, (p) => Rewrite.isGenericPort(p) === false)
        if (genericPorts.length === 0) { // nothing to typify
          return false
        } else if (specificPorts.length === 0) { // nothing to typify from
          return false
        }
        const type = specificPorts[0].type
        for (const p of specificPorts) {
          if (!TryUnifyTypes(p.type, specificPorts[0].type)) {
          //if (p.type !== specificPorts[0].type) {
            throw new Error('conflicting types at node ' +
              (node.name || node.id || 'N/A') + ' between ports' +
              specificPorts[0] + ' and ' + p)
          }
        }
        return {
          node: node,
          type: _.cloneDeep(type)
        }
      },
      (match, graph) => {
        var line = 'typifying distributing node ' + match.node.name
        Log(line)
        // copy specific type to generic ports
        var newNode = _.assign(_.cloneDeep(match.node), {
          ports: _.map((match.node.ports), (p) => {
            if (Graph.Port.isInputPort(p)) {
              return p
            } else {
              return _.assign(_.cloneDeep(p), {
                type: _.cloneDeep(match.type)
              })
            }
          })
        })
        return Graph.replaceNode(match.node, newNode, graph)
      })
}

/**
 * Generates a graph rewriter that typifies all atomic nodes (ie. make all input and outputs of the same type)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyAtomicNode () {
  return Rewrite.applyNode(
      (node, graph) => {
        var ports = Graph.Node.ports(node, true)
        var genericPorts = _.filter(ports, (p) => Rewrite.isGenericPort(p))
        var specificPorts = _.filter(ports, (p) => Rewrite.isGenericPort(p) === false)
        if (genericPorts.length === 0) { // nothing to typify
          return false
        } else if (specificPorts.length === 0) { // nothing to typify from
          return false
        }
        const type = specificPorts[0].type
        for (const p of specificPorts) {
          if (!TryUnifyTypes(p.type, specificPorts[0].type)) {
          //if (p.type !== specificPorts[0].type) {
            throw new Error('conflicting types at node ' +
              (node.name || node.id || 'N/A') + ' between ports' +
              specificPorts[0] + ' and ' + p)
          }
        }
        return {
          node: node,
          type: _.cloneDeep(type)
        }
      },
      (match, graph) => {
        var line = 'typifying atomic node ' + match.node.name
        Log(line)
        var newNode = _.assign(_.cloneDeep(match.node), {
          ports: _.map((match.node.ports), (p) => {
            return _.assign(_.cloneDeep(p), {
              type: match.type
            })
          })
        })
        return Graph.replaceNode(match.node, newNode, graph)
      })
}

/**
 * Generates a graph rewriter that typifies all recursive nodes (ie. make all input and outputs of the same type)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyRecursiveNode () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (!edge.source.isRecursive) return false
        if (!edge.target.isRecursive) return false
        var ref = _.find([edge.source, edge.target], (n) => !n.isRecursiveRoot)
        if (!ref) return false
        var root = _.find([edge.source, edge.target], (n) => n.isRecursiveRoot)
        if (!root) return false
        var ports = _.intersectionBy([
          Graph.Node.ports(ref),
          Graph.Node.ports(root)],
          (p) => p.port)[0]
        if (_.every(ports, (p) => !Rewrite.isGenericPort(p))) return false
        ports = _.filter(ports, (p) => {
          var refPort = Graph.Node.port(p.port, ref)
          if (!refPort) return false
          var rootPort = Graph.Node.port(p.port, root)
          if (!rootPort) return false
          if (Rewrite.isGenericPort(refPort) === Rewrite.isGenericPort(rootPort)) return false
          if (Rewrite.isGenericPort(rootPort)) {
            return _.assign(p, {
              type: _.cloneDeep(refPort.type)
            })
          } else {
            return _.assign(p, {
              type: _.cloneDeep(rootPort.type)
            })
          }
        })
        if (_.isEmpty(ports)) return false
        return {
          ref: ref,
          root: root,
          ports: ports
        }
      },
      (match, graph) => {
        var line = 'typifying recursion edge from ' + match.ref.name + ' to ' + match.root.name
        Log(line)
        var newRef = _.assign(_.cloneDeep(match.ref), {
          ports: _.map(match.ref.ports, (p) => {
            var matchPort = _.find(match.ports, (p2) => p2.port === p.port)
            if (!matchPort) return p
            return _.assign(p, { type: _.cloneDeep(matchPort.type) })
          })
        })
        var newRoot = _.assign(_.cloneDeep(match.root), {
          ports: _.map(match.root.ports, (p) => {
            var matchPort = _.find(match.ports, (p2) => p2.port === p.port)
            if (!matchPort) return p
            return _.assign(p, { type: _.cloneDeep(matchPort.type) })
          })
        })
        return Graph
        .replaceNode(match.ref, newRef, graph)
        .replaceNode(match.root, newRoot, graph)
      })
}
