
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
export function TypifyEdge (types) {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (!Graph.Edge.isBetweenPorts(edge) || !API.areUnifyable(edge.from.type, edge.to.type)) return false
        // check wether edge goes from generic to specific
        let assign = { }
        let type = API.UnifyTypes(edge.from.type, edge.to.type, types, assign)
        let diff = _.difference(Object.keys(assign), Object.keys(graph.assignments || {}))
        if (Object.keys(diff).length === 0 && _.isEqual(type, edge.from.type) && _.isEqual(type, edge.to.type)) {
          return false
        } else {
          return [edge, type, assign]
        }
      },
      ([edge, type, assign], graph) => {
        Object.assign(graph.assignments, assign)
        for (const p of [edge.from, edge.to]) {
          graph = Graph.replacePort(p, _.assign(_.cloneDeep(p), { type: type }), graph)
        }
        Graph.debug(graph)
        return graph
      }, {noIsomorphCheck: true})
}

/**
 * Generates a graph rewriter that typifies all atomic nodes (ie. make all input and outputs of the same type)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function TypifyNode (types) {
  return Rewrite.applyNode(
      (node, graph) => {
        if (!Graph.Node.isAtomic(node)) return false
        let ports = Graph.Node.ports(node, true)
        for (const p1 of ports) {
          for (const p2 of ports) {
            if (p1 === p2) continue
            if (!API.areUnifyable(p1.type, p2.type)) continue
            let assign = { }
            let type = API.UnifyTypes(p1.type, p2.type, types, assign)
            let diff = _.difference(Object.keys(assign), Object.keys(graph.assignments || {}))
            if (Object.keys(diff).length === 0 && _.every(ports, p => _.isEqual(p.type, type))) {
              return false
            } else {
              return [node, type, assign]
            }
          }
        }
        return false
      },
      ([node, type, assign], graph) => {
        var line = 'typifying atomic node ' + node.id + ' with ' + JSON.stringify(assign)
        Utils.Log(line)
        Object.assign(graph.assignments, assign)
        for (const p of Graph.Node.ports(node, true)) {
          graph = Graph.replacePort(p, _.assign(_.cloneDeep(p), { type: type }), graph)
        }
        Graph.debug(graph)
        return graph
      }, {noIsomorphCheck: true})
}

export function checkEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (!edge.from) return false
        if (!edge.to) return false
        if (!edge.from.type) return false
        if (!edge.to.type) return false
        if (API.areUnifyable(edge.from.type, edge.to.type, graph)) {
          return false
        }
        return edge
      },
      (edge, graph) => {
        throw new Error('type conflict: cannot unify ' + JSON.stringify(edge.from.type) + ' and ' + JSON.stringify(edge.to.type))
      },
      { noIsomorphCheck: true })
}

export function typifyConstants () {
  return Rewrite.applyNode(
    (node, graph) => {
      if (node.componentId !== 'std/const' || !API.IsGenericType(Node.outputPorts(node)[0].type)) return false

      const assignments = API.UnifyTypes(Node.outputPorts(node)[0].type, Graph.meta(node).parameters.type, graph)
      const diff = _.difference(Object.keys(assignments), Object.keys(graph.assignments || {}))
      if (diff.length === 0) {
        return false
      } else {
        return assignments
      }
    },
    (assignments, graph) => {
      Object.assign(graph.assignments, assignments)
      return graph
    }, {noIsomorphCheck: true})
}

export function typifyLambdaInputs () {
  return Rewrite.applyNode(
    (node, graph) => {
      if (!Lambda.isValid(node)) return false
      const out = Node.outputPorts(node)[0]
      if (!API.IsGenericType(out.type)) return false
      const impl = Lambda.implementation(node)
      const implPorts = Node.inputPorts(impl)
      const lambdaArgs = Lambda.typeArguments(out.type)
      if (implPorts.length !== lambdaArgs.length) {
        throw new Error('Function type does not match the given lambda implementation for: ' + Node.id(node))
      }
      const assignments = _.zip(implPorts, lambdaArgs)
        .reduce((ass, [port, type]) => {
          if (!API.areUnifyable(port.type, type, graph)) return ass
          return Object.assign(ass, API.UnifyTypes(type, port.type))
        }, {})
      const diff = _.difference(Object.keys(assignments), Object.keys(graph.assignments || {}))
      if (diff.length === 0) {
        return false
      } else {
        return [node, assignments]
      }
    },
    ([node, assignments], graph) => {
      Object.assign(graph.assignments, assignments)
      return graph
    },
    {noIsomorphCheck: true}
  )
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
          return Object.assign(ass, API.UnifyTypes(port.type, type))
        }, {})
      const diff = _.difference(Object.keys(assignments), Object.keys(graph.assignments || {}))
      if (diff.length === 0) {
        return false
      } else {
        return [node, assignments]
      }
    },
    ([node, assignments], graph) => {
      Object.assign(graph.assignments, assignments)
      return graph
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
        if (edge.layer !== 'recursion') return false
        var ref = _.find([edge.source, edge.target], (n) => !n.settings.recursiveRoot)
        if (!ref) return false
        var root = _.find([edge.source, edge.target], (n) => n.settings.recursiveRoot)
        if (!root) return false
        var ports = _.intersectionBy([
          Graph.Node.ports(ref),
          Graph.Node.ports(root)],
          (p) => p.port)[0]
        if (_.every(ports, (p) => !API.IsGenericType(p.type))) return false
        const assignments = ports.reduce((ass, p) => {
          var refPort = Graph.Node.port(p.port, ref)
          var rootPort = Graph.Node.port(p.port, root)
          return Object.assign({}, ass, API.UnifyTypes(refPort.type, rootPort.type))
        })
        const diff = _.difference(Object.keys(assignments), Object.keys(graph.assignments || {}))
        if (diff.length === 0) {
          return false
        } else {
          return assignments
        }
      },
      (assignments, graph) => {
        Object.assign(graph.assignments, assignments)
        return graph
      }, {noIsomorphCheck: true})
}
