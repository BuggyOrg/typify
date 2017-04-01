
import * as Graph from '@buggyorg/graphtools'

import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'

const API = require('./api.js')
const Utils = require('./utils.js')
const Node = Graph.Node
const Lambda = Graph.Lambda

/**
 * Generates a graph rewriter that typifies all specializing edges (ie. from generic to specific ports)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (!Graph.Edge.isBetweenPorts(edge) || !API.areUnifyable(edge.from.type, edge.to.type, graph)) return false
        // check wether edge goes from generic to specific
        const assignments = API.UnifyTypes(edge.from.type, edge.to.type, graph)
        const diff = _.difference(Object.keys(assignments), Object.keys(graph.assignments || {}))
        if (diff.length === 0) {
          return false
        } else {
          return [edge, assignments]
        }
      },
      ([edge, assignments], graph) => {
        const line = 'typifying edge from ' +
        (edge.source.id || edge.source.name || edge.source) +
        '@' + edge.from.port +
        ' to ' +
        (edge.target.id || edge.target.name || edge.target) + '@' + edge.to.port +
        ' with ' +
        JSON.stringify(assignments)
        Utils.Log(line)
        // replace source type with target type
        return _.merge(_.cloneDeep(graph), {assignments})
      }, {noIsomorphCheck: true})
}

/**
 * Generates a graph rewriter that typifies all atomic nodes (ie. make all input and outputs of the same type)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyNode () {
  return Rewrite.applyNode(
      (node, graph) => {
        // if (!Graph.Node.isAtomic(node)) return false
        var ports = Graph.Node.ports(node, true)
        for (const p1 of ports) {
          for (const p2 of ports) {
            if (p1 === p2) continue
            if (!API.areUnifyable(p1.type, p2.type, graph)) continue
            const assignments = API.UnifyTypes(p1.type, p2.type, graph)
            const diff = _.difference(Object.keys(assignments), Object.keys(graph.assignments || {}))
            if (Object.keys(diff).length === 0) {
              return false
            } else {
              return [node, assignments]
            }
          }
        }
        return false
      },
      ([node, assignments], graph) => {
        var line = 'typifying atomic node ' + node.id +
        ' with ' + JSON.stringify(assignments)
        Utils.Log(line)
        return _.merge(_.cloneDeep(graph), {assignments})
      }, {noIsomorphCheck: true})
}

export function typifyLambdaOutput () {
  return Rewrite.applyNode(
    (node, graph) => {
      if (!Lambda.isValid(node)) return false
      const out = Node.outputPorts(node)[0]
      if (!API.IsGenericType(out.type)) return false
      const impl = Lambda.implementation(node)
      const implPorts = Node.outputPorts(impl)
      const lambdaRets = Lambda.typeReturns(out.type)
      if (implPorts.length !== lambdaRets.length) {
        throw new Error('Function type does not match the given lambda implementation for: ' + Node.id(node))
      }
      const assignments = _.zip(implPorts, lambdaRets)
        .reduce((ass, [port, type]) => {
          if (!API.areUnifyable(port.type, type, graph)) return ass
          return Object.assign(ass, API.UnifyTypes(port.type, type, graph))
        }, {})
      const diff = _.difference(Object.keys(assignments), Object.keys(graph.assignments || {}))
      if (diff.length === 0) {
        return false
      } else {
        return [node, assignments]
      }
    },
    ([node, assignments], graph) => {
      return _.merge(_.cloneDeep(graph), {assignments})
    },
    {noIsomorphCheck: true}
  )
}

/**
 * Generates a graph rewriter that typifies all recursive nodes (ie. make all input and outputs of the same type)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyRecursion () {
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
        if (_.every(ports, (p) => !API.IsGenericType(p.type))) return false
        ports = _.filter(ports, (p) => {
          var refPort = Graph.Node.port(p.port, ref)
          if (!refPort) return false
          var rootPort = Graph.Node.port(p.port, root)
          if (!rootPort) return false
          if (API.IsGenericType(refPort.type) === API.IsGenericType(rootPort.type)) return false
          if (API.IsGenericType(rootPort.type)) {
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
        // var line = 'typifying recursion edge from ' + match.ref.name + ' to ' + match.root.name
        // Log(line)
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
        graph = Graph.replaceNode(match.ref, newRef, graph)
        graph = Graph.replaceNode(match.root, newRoot, graph)
        return graph
      }, {noIsomorphCheck: true})
}
