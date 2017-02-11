
import * as Graph from '@buggyorg/graphtools'

import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'

const API = require('./api.js')
const Utils = require('./utils.js')

/**
 * Generates a graph rewriter that typifies all specializing edges (ie. from generic to specific ports)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (!edge.sourcePort) return false
        if (!edge.targetPort) return false
        // check wether edge goes from generic to specific
        var a1 = {}
        var a2 = {}
        var unifies = API.TryUnifyTypes(edge.sourcePort.type, edge.targetPort.type, a1, a2)
        a1 = _.omit(a1, _.keys(edge.sourcePort.assignments))
        a2 = _.omit(a2, _.keys(edge.targetPort.assignments))
        if (!unifies) {
          return false
        } else if (_.keys(a1).length === 0 && _.keys(a2).length === 0) {
          return false
        } else {
          return [edge, a1, a2]
        }
      },
      (match, graph) => {
        var edge = match[0]
        var a1 = match[1]
        var a2 = match[2]
        const line = 'typifying edge from ' +
        edge.source.name + '@' + edge.sourcePort.port +
        ' to ' +
        edge.target.name + '@' + edge.targetPort.port +
        ' with ' +
        JSON.stringify(a1) +
        ' and ' +
        JSON.stringify(a2)
        Utils.Log(line)
        // replace source type with target type
        var newSourcePort = _.assign(_.cloneDeep(edge.sourcePort), {
          assignments: _.assign(a1, edge.source.assignments)
        })
        var newTargetPort = _.assign(_.cloneDeep(edge.targetPort), {
          assignments: _.assign(a2, edge.targetPort.assignments)
        })
        graph = Rewrite.replacePort(edge.source, edge.sourcePort, newSourcePort, graph)
        graph = Rewrite.replacePort(edge.target, edge.targetPort, newTargetPort, graph)
        return graph
      })
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
            var a1 = []
            var a2 = []
            var unifies = API.TryUnifyTypes(p1.type, p2.type, a1, a2)
            a1 = _.omit(a1, _.keys(p1.assignments))
            a2 = _.omit(a2, _.keys(p2.assignments))
            Utils.Log(JSON.stringify(a1) + JSON.stringify(a2))
            if (!unifies) {
              return false
            } else if (_.keys(a1).length === 0 && _.keys(a2).length === 0) {
              return false
            } else {
              return [node, p1, p2, a1, a2]
            }
          }
        }
        return false
      },
      (match, graph) => {
        const node = match[0]
        const p1 = match[1]
        const p2 = match[2]
        const a1 = match[3]
        const a2 = match[4]
        var line = 'typifying atomic node ' + node.id
        Utils.Log(line)
        let newP1 = _.assign(_.cloneDeep(p1), {
          assignments: a1
        })
        let newP2 = _.assign(_.cloneDeep(p2), {
          assignments: a2
        })
        graph = Rewrite.replacePort(node, p1, newP1, graph)
        graph = Rewrite.replacePort(node, p2, newP2, graph)
        return graph
      })
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
      })
}
