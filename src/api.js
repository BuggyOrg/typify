
import * as Graph from '@buggyorg/graphtools'

import * as Rewrite from '@buggyorg/rewrite'
import _ from 'lodash'
import debug from 'debug'

export const TypifyAll = Rewrite.rewrite([
  TypifySpecializingEdge(),
  TypifyGeneralizingEdge(),
  TypifyAtomicNode(),
  TypifyCollectingNode(),
  TypifyDistributingNode(),
  TypifyRecursiveNode()
])

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
        edge.source.id + '@' + edge.sourcePort.port +
        ' to ' +
        edge.target.id + '@' + edge.targetPort.port
        debug('[typify]', line)
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
        debug('[typify]', line)
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
        if (Graph.Node.isAtomic(node)) {
          return false // atomic nodes are typified seperately
        }
        var ports = Graph.Node.inputPorts(node, true)
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
        debug('[typify]', line)
        var newNode = _.assign(_.cloneDeep(match.node), {
          ports: _.map((match.node.ports), (p) => {
            if (Graph.Port.isOutputPort(p)) {
              return p
            } else {
              return _.assign(_.cloneDeep(p), {
                type: match.type
              })
            }
          })
        })
        return Graph.replaceNode(match.node, newNode, graph)
      })
}

export function TypifyDistributingNode () {
  return Rewrite.applyNode(
      (node, graph) => {
        if (Graph.Node.isAtomic(node)) {
          return false // atomic nodes are typified seperately
        }
        var ports = Graph.Node.outputPorts(node, true)
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
        var line = 'typifying distributing node ' + match.node.name
        debug('[typify]', line)
        var newNode = _.assign(_.cloneDeep(match.node), {
          ports: _.map((match.node.ports), (p) => {
            if (Graph.Port.isInputPort(p)) {
              return p
            } else {
              return _.assign(_.cloneDeep(p), {
                type: match.type
              })
            }
          })
        })
        return Graph.replaceNode(match.node, newNode, graph)
      })
}

export function TypifyAtomicNode () {
  return Rewrite.applyNode(
      (node, graph) => {
        if (Graph.Node.isAtomic(node) === false) {
          return false
        }
        var ports = Graph.Node.ports(node, true)
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
        var line = 'typifying atomic node ' + match.node.name
        debug('[typify]', line)
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

export function TypifyRecursiveNode () {
  return Rewrite.applyNode(
      (node, graph) => {
        if (node.isRecursive === false) {
          return false
        }
        _.filter(Graph.edges(graph), (e) => e.layer === 'recursion')
        .forEach((e) => {
          var src = Graph.node(e.from)
          var dst = Graph.node(e.to)
          var ref = _.find([src, dst], (n) => n.isRecursiveRoot === false)
          var root = _.find([src, dst], (n) => n.isRecursiveRoot)
          if (ref && root) {
            return {
              ref: ref,
              root: root
            }
          }
        })
        return false
      },
      (match, graph) => {
        debug('[typify]', 'typifying generalizing edge from ' + match.ref.name + ' to ' + match.root.name)
        return graph
      })
}
