
import * as Graph from '@buggyorg/graphtools'

import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'

const API = require('./api.js')
const Utils = require('./utils.js')
const Unify = require('./unify.js')
const Fixpoint = require('./fixpoint.js')
const Node = Graph.Node
const Lambda = Graph.Lambda

export function hasBottom (type) {
  if (typeof type === 'object') return _.some(type.data, t => hasBottom(t))
  else return type === 'bottom'
}

/**
 * Generates a graph rewriter that typifies all specializing edges (ie. from generic to specific ports)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function typifyEdge (types) {
  return Rewrite.applyEdge(
      (edge, graph) => {
          try {
            if (!Graph.Edge.isBetweenPorts(edge)) return false
            let assign = { }
            let type = Unify.UnifyTypes(edge.from.type, edge.to.type, types, assign)
            if (hasBottom(type)) return false
            let diff = _.difference(Object.keys(assign), Object.keys(graph.assignments || {}))
            if (Object.keys(diff).length === 0) return false
            return [edge, type, assign]
          } catch (error) {
            return false
          }
      },
      ([edge, type, assign], graph) => {
        //console.log('typifying edge ' + edge.from.port + '@' + edge.from.node + ' - ' + edge.to.port + '@' + edge.to.node + ' with ' + JSON.stringify(assign))
        Object.assign(graph.assignments, assign)
        graph = API.applyAssignments(graph)
        Graph.debug(API.relabelToTypes(_.cloneDeep(graph)))
        return graph
      }, {noIsomorphCheck: true})
}

/**
 * Generates a graph rewriter that typifies all catamorphism nodes
 * @param {Types} types a collection of atomic types
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function typifyCatamorphism (types) {
  return Rewrite.applyNode(
      (node, graph) => {
        if (!Graph.Node.isAtomic(node)) return false
        if (node.componentId !== 'functional/catamorphism') return false

        let inputs = Graph.Node.inputPorts(node)
        let outputs = Graph.Node.outputPorts(node)

        if (inputs.length !== 2) return false
        if (outputs.length !== 1) return false

        let inType = inputs[0].type
        let outType = outputs[0].type
        let fType = inputs[1].type

        if (!API.isFunctionType(fType)) return false
        if (fType.data.length !== 2) return false
        if (!Fixpoint.isFixpointType(inType)) return false

        let unfoldedType = Fixpoint.unfoldType(inType)
        var assign = { }

        let unify1 = Unify.UnifyTypes(unfoldedType, fType.data[0].data[0], types, assign)
        let unify2 = Unify.UnifyTypes(outType, fType.data[0].data[1], types, assign)
        let unify3 = Unify.UnifyTypes(outType, fType.data[1].data[0], types, assign)

        if (hasBottom(unify1)) return false
        if (hasBottom(unify2)) return false
        if (hasBottom(unify3)) return false

        let diff = _.difference(Object.keys(assign), Object.keys(graph.assignments || {}))
        if (assign.length === 0 || diff.length === 0) return false
        return [node, assign]
      },
      ([node, assign], graph) => {
        Object.assign(graph.assignments, assign)
        graph = API.applyAssignments(graph)
        Graph.debug(API.relabelToTypes(_.cloneDeep(graph)))
        return graph
      }, {noIsomorphCheck: true})
}

/**
 * Generates a graph rewriter that typifies all atomic nodes (ie. make all input and outputs of the same type)
 * @return {Func} a rewrite function that takes a graph and returns a new one
 */
export function typifyNode (types) {
  return Rewrite.applyNode(
      (node, graph) => {
        if (!Graph.Node.isAtomic(node)) return false
        let ports = Graph.Node.ports(node, true)
        for (const p1 of ports) {
          for (const p2 of ports) {
            if (p1 === p2) continue
            try {
              let assign = { }
              let type = Unify.UnifyTypes(p1.type, p2.type, types, assign)
              if (hasBottom(type)) return false
              let diff = _.difference(Object.keys(assign), Object.keys(graph.assignments || {}))
              if (Object.keys(diff).length === 0) return false
              return [node, type, assign]
            } catch (error) {
              return false
            }
          }
        }
        return false
      },
      ([node, type, assign], graph) => {
        // console.log('typifying atomic node ' + node.id + ' with ' + JSON.stringify(assign))
        Object.assign(graph.assignments, assign)
        graph = API.applyAssignments(graph)
        Graph.debug(API.relabelToTypes(_.cloneDeep(graph)))
        return graph
      }, {noIsomorphCheck: true})
}

export function checkEdge (types) {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (!edge.from) return false
        if (!edge.to) return false
        if (!edge.from.type) return false
        if (!edge.to.type) return false
        try {
          let assign = { }
          let type = Unify.UnifyTypes(edge.from.type, edge.to.type, types, assign)
          if (!hasBottom(type)) return false
        } catch (error) {
          return false
        }
        return edge
      },
      (edge, graph) => {
        let assign = { }
        let type = Unify.UnifyTypes(edge.from.type, edge.to.type, types, assign)
        throw new Error('type conflict: cannot unify '
        + JSON.stringify(edge.from.node) + ' @ ' + JSON.stringify(edge.from.port) + ' :: ' + JSON.stringify(edge.from.type)
        + ' and '
        + JSON.stringify(edge.to.node) + ' @ ' + JSON.stringify(edge.to.port) + ' :: ' + JSON.stringify(edge.to.type))
        Graph.debug(API.relabelToTypes(_.cloneDeep(graph)))
      },
      { noIsomorphCheck: true })
}

export function typifyConstants (types) {
  return Rewrite.applyNode(
    (node, graph) => {
      if (node.componentId !== 'std/const' || !API.IsGenericType(Node.outputPorts(node)[0].type)) return false

      const assignments = Unify.UnifyTypes(Node.outputPorts(node)[0].type, Graph.meta(node).parameters.type, graph)
      const diff = _.difference(Object.keys(assignments), Object.keys(graph.assignments || {}))
      if (diff.length === 0) {
        return false
      } else {
        return assignments
      }
    },
    (assignments, graph) => {
      Object.assign(graph.assignments, assignments)
      Graph.debug(API.relabelToTypes(_.cloneDeep(graph)))
      return graph
    }, {noIsomorphCheck: true})
}

export function typifyLambdaInputs (atomics = null) {
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
      let assign = { }
      _.zipWith(implPorts, lambdaArgs, (port, type) => {
        // if (!API.areUnifyable(port.type, type, atomics, ass)) return ass
        Unify.UnifyTypes(type, port.type, atomics, assign)
      })
      const diff = _.difference(Object.keys(assign), Object.keys(graph.assignments || {}))
      if (diff.length === 0) {
        return false
      } else {
        return [node, assign]
      }
    },
    ([node, assign], graph) => {
      Object.assign(graph.assignments, assign)
      graph = API.applyAssignments(graph)
      Graph.debug(API.relabelToTypes(_.cloneDeep(graph)))
      return graph
    },
    {noIsomorphCheck: true}
  )
}

export function typifyLambdaOutput (atomics = null) {
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
      let assign = { }
      _.zipWith(implPorts, lambdaRets, (port, type) => {
        Unify.UnifyTypes(type, port.type, atomics, assign)
      })
      const diff = _.difference(Object.keys(assign), Object.keys(graph.assignments || {}))
      if (diff.length === 0) {
        return false
      } else {
        return [node, assign]
      }
    },
    ([node, assignments], graph) => {
      Object.assign(graph.assignments, assignments)
      Graph.debug(API.relabelToTypes(_.cloneDeep(graph)))
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
          return Object.assign({}, ass, Unify.UnifyTypes(refPort.type, rootPort.type))
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
        Graph.debug(API.relabelToTypes(_.cloneDeep(graph)))
        return graph
      }, {noIsomorphCheck: true})
}
