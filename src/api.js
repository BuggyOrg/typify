
import * as Graph from '@buggyorg/graphtools'

import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'

export function IsGenericPort (port) {
  return port.type === 'generic'
}

export function TypifySpecializingEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (Rewrite.isGenericPort(edge.sourcePort) && Rewrite.isGenericPort(edge.targetPort) === false) {
          return edge
        } else {
          return false
        }
      },
      (edge, graph) => {
        var line = 'typifying specializing edge from ' +
        edge.source.name + '@' + edge.sourcePort.port +
        ' to ' +
        edge.target.name + '@' + edge.targetPort.port
        console.log(line)
        var node = Graph.node(edge.source, graph)
        var port = _.assign(_.cloneDeep(edge.sourcePort), {
          type: edge.targetPort.type
        })
        return Rewrite.replacePort(node, edge.sourcePort, port, graph)
      })
}

export function TypifyGeneralizingEdge () {
  return Rewrite.applyEdge(
      (edge, graph) => {
        if (Rewrite.isGenericPort(edge.sourcePort) === false && Rewrite.isGenericPort(edge.targetPort)) {
          return edge
        } else {
          return false
        }
      },
      (edge, graph) => {
        var line = 'typifying generalizing edge from ' +
        edge.source.name + '@' + edge.sourcePort.port +
        ' to ' +
        edge.target.name + '@' + edge.targetPort.port
        console.log(line)
        var node = Graph.node(edge.target, graph)
        var port = _.assign(_.cloneDeep(edge.targetPort), {
          type: edge.sourcePort.type
        })
        return Rewrite.replacePort(node, edge.targetPort, port, graph)
      })
}

export function TypifyCollectingNode () {
  return Rewrite.applyNode(
      (node, graph) => {
        var ports = Graph.Node.inputPorts(node)
        var genericPorts = _.filter(ports, (p) => Rewrite.isGenericPort(p))
        var specificPorts = _.filter(ports, (p) => Rewrite.isGenericPort(p) === false)
        if (genericPorts.length === 0) {
          return false
        } else if (specificPorts.length === 0) {
          return false
        }
        var type = specificPorts[0].type
        if (_.every(specificPorts, (p) => p.type === type) === false) {
          return false
        }
        return {
          node: node,
          type: type
        }
      },
      (match, graph) => {
        var line = 'typifying collecting node ' + match.node.name
        console.log(line)
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

export function TypifyDistributingNode () {
  return Rewrite.applyNode(
      (node, graph) => false,
      (match, graph) => { })
}

export function TypifyRecursiveNode () {
  return Rewrite.applyNode(
      (node, graph) => false,
      (match, graph) => { })
}
