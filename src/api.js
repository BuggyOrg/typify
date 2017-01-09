
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
          type: _.cloneDeep(edge.targetPort.type)
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
          type: _.cloneDeep(edge.sourcePort.type)
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
          type: _.cloneDeep(type)
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
                type: _.cloneDeep(match.type)
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
          type: _.cloneDeep(type)
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
                type: _.cloneDeep(match.type)
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
          type: _.cloneDeep(type)
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
        debug('[typify]', line)
        var newRef = _.assign(_.cloneDeep(match.ref), {
          ports: _.map(match.ref.ports, (p) => {
            var matchPort = _.find(match.ports, (p2) => p2.port === p.port)
            if (!matchPort) return p
            return _.assign(p, { type: matchPort.type })
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

export function TypifyRecursiveNode2 () {
  return Rewrite.applyNode(
      (node, graph) => {
        if (node.isRecursive === false) {
          return false
        }
        var edges = Graph.edges(graph)
        edges = _.filter(edges, (e) => e.layer === 'recursion')
        edges = _.map(edges, (e) => {
          var src = Graph.node(e.from, graph)
          var dst = Graph.node(e.to, graph)
          var ref = _.find([src, dst], (n) => n.isRecursiveRoot === false)
          var root = _.find([src, dst], (n) => n.isRecursiveRoot)
          return {
            ref: ref,
            root: root
          }
        })
        return _.find(edges, (e) => !!e) || false
      },
      (match, graph) => {
        var line = 'typifying recursion edge from ' + match.ref.name + ' to ' + match.root.name
        debug('[typify]', line)
        if (match.ref.type === 'generic') {
          var newRef = _.assign(_.cloneDeep(match.ref), {
            type: match.root.type
          })
          return Graph.replaceNode(match.ref, newRef, graph)
        } else if (match.root.type === 'generic') {
          var newRoot = _.assign(_.cloneDeep(match.root), {
            type: _.cloneDeep(match.ref.type)
          })
          return Graph.replaceNode(match.root, newRoot, graph)
        }
        return graph
      })
}
