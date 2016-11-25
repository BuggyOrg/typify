
import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'

export function IsGenericPort (port) {
  return port.type === 'generic'
}

export function TypifySpecializingEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        var src = Graph.Node.port(edge.from.port, Graph.node(edge.from.node, graph))
        console.log(JSON.stringify(src, null, 2))
        console.log(JSON.stringify(edge.from, null, 2))
        var dst = Graph.Node.port(edge.to.port, Graph.node(edge.to.node, graph))
        if (Rewrite.IsGenericPort(src) === false && Rewrite.IsGenericPort(dst)) {
          return edge
        } else {
          return false
        }
      },
      (edge, graph) => {
        console.log('typifying specializing edge')
        console.log(JSON.stringify(edge, null, 2))
        var node = Graph.node(edge.from.node, graph)
        var port = _.assign(_.cloneDeep(edge.from.port), {
          type: edge.to.port.type
        })
        return Rewrite.replacePort(node, edge.from.port, port, graph)
      })
}

export function TypifyGeneralizingEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (Rewrite.IsGenericPort(edge.from.port) && Rewrite.IsGenericPort(edge.to.port) === false) {
          return edge
        } else {
          return false
        }
      },
      (edge, graph) => {
        console.log('typifying generalizing edge')
        console.log(JSON.stringify(edge, null, 2))
        var node = Graph.node(edge.to.node, graph)
        var port = _.assign(_.cloneDeep(edge.to.port), {
          type: edge.from.port.type
        })
        return Rewrite.replacePort(node, edge.to.port, port, graph)
      })
}

export function TypifyCollectingEdge () {
  return Rewrite.applyPort(
      (node, port, graph) => {
        var succ = Graph.successors(port, graph)
        if (succ.length < 2) {
          return false
        }
        var specificEdge = _.find(succ, (n) => false)
        return specificEdge || false
      },
      (match, graph) => {
        console.log(JSON.stringify(match, null, 2))
      })
}

export function TypifyDistributingEdge () {
  return Rewrite.applyNode(
      (node, graph) => false,
      (match, graph) => { })
}

export function TypifyRecursiveEdge () {
  return Rewrite.applyNode(
      (node, graph) => false,
      (match, graph) => { })
}
