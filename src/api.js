
import * as Graph from '@buggyorg/graphtools'

import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'
import debug from 'debug'

function Log (line) {
  debug('[typify]', line)
  //console.log(line)
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
    TypifyRecursiveNode()
  ], iterations)(graph)
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

export function UnifyTypes (t1, t2, assignments = []) {
  if (!IsValidType(t1)) throw new Error('invalid type t1: ' + JSON.stringify(t1))
  if (!IsValidType(t2)) throw new Error('invalid type t2: ' + JSON.stringify(t2))
  const g1 = IsGenericType(t1)
  const g2 = IsGenericType(t2)
  if (!g1 && !g2) {
    if (typeof t1 === 'string' && typeof t2 === 'string') {
      return t1 === t2
    }
    if (t1.name !== t2.name) throw new Error('type unification error: ' + t1.name + ' has a different name than ' + t2.name)
    const f1 = t1.data.sort(t => t.name || t)
    const f2 = t2.data.sort(t => t.name || t)
    if (f1.length !== f2.length) throw new Error('type unification error: number of fields differ')
    for (var i = 0; i < f1.length; ++i) {
      UnifyTypes(f1[i], f2[i], assignments)
    }
  } else {
    if (g1) assignments.push({ key: t1.name || t1, value: _.cloneDeep(t2) })
    if (g2) assignments.push({ key: t2.name || t2, value: _.cloneDeep(t1) })
  }
  if (typeof t1 !== 'string') t1.assignments = _.merge(t1.assignment, assignments)
  if (typeof t2 !== 'string') t2.assignments = _.merge(t2.assignment, assignments)
}

export function TryUnifyTypes (t1, t2, assignment = {}) {
  try {
    UnifyTypes(t1, t2, assignment)
  } catch (error) {
    return false
  }
  return true
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
        var node = Graph.node(edge.source, graph)
        var port = _.assign(_.cloneDeep(edge.sourcePort), {
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
        var node = Graph.node(edge.target, graph)
        var port = _.assign(_.cloneDeep(edge.targetPort), {
          type: _.cloneDeep(edge.sourcePort.type)
        })
        return Rewrite.replacePort(node, edge.targetPort, port, graph)
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
