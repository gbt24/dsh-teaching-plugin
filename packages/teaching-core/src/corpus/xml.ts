/**
 * OOXML（.docx/.pptx）解析辅助：zip 解包、命名空间无关的 XML 树、关系与样式表。
 *
 * Office 文档本质是 zip + XML；这里不依赖 Office/LibreOffice 安装，也不改写原文件。
 */
import { XMLParser } from 'fast-xml-parser'
import { unzipSync } from 'fflate'
import { CorpusParseError } from './errors.ts'

/** 解包 OOXML zip；非法 zip 抛 CorruptParseError。 */
export function unzipDocument(bytes: Uint8Array): Record<string, Uint8Array> {
  try {
    return unzipSync(bytes)
  } catch (cause) {
    throw new CorpusParseError(
      `无法读取 Office zip 结构：${cause instanceof Error ? cause.message : String(cause)}`,
      'corrupt-zip',
    )
  }
}

/** UTF-8 解码（容忍 BOM）。 */
export function decodeUtf8(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/** 命名空间已移除的 XML 树节点。 */
export interface XmlNode {
  /** 标签名（已移除 w:/a:/m: 等前缀；文本节点为 #text）。 */
  readonly name: string
  /** 属性（键已移除命名空间前缀）。 */
  readonly attrs: Readonly<Record<string, string>>
  readonly children: readonly XmlNode[]
}

interface RawXmlNode {
  readonly [key: string]: unknown
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  preserveOrder: true,
  trimValues: false,
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: true,
  htmlEntities: true,
})

function toXmlNodes(rawNodes: readonly unknown[]): XmlNode[] {
  const nodes: XmlNode[] = []
  for (const raw of rawNodes) {
    if (typeof raw !== 'object' || raw === null) continue
    const record = raw as RawXmlNode
    const keys = Object.keys(record)
    if (keys.length === 0) continue
    const name = keys[0] as string
    if (name === '#text') {
      const value = record['#text']
      nodes.push({
        name: '#text',
        attrs: {},
        children: [],
        ...(typeof value === 'string' ? { text: value } : {}),
      } as XmlNode & { text: string })
      continue
    }
    const attrsRaw = record[':@']
    const attrs: Record<string, string> = {}
    if (typeof attrsRaw === 'object' && attrsRaw !== null) {
      for (const [key, value] of Object.entries(attrsRaw)) {
        if (value !== undefined && value !== null) attrs[key] = String(value)
      }
    }
    const childrenRaw = record[name]
    const children = Array.isArray(childrenRaw) ? toXmlNodes(childrenRaw) : []
    nodes.push({ name, attrs, children })
  }
  return nodes
}

/** 解析文档根下的 XML 树（返回根的子节点列表，便于遍历）。 */
export function parseXmlTree(xml: string): XmlNode[] {
  let raw: unknown
  try {
    raw = xmlParser.parse(xml) as unknown
  } catch (cause) {
    throw new CorpusParseError(
      `XML 解析失败：${cause instanceof Error ? cause.message : String(cause)}`,
      'corrupt-xml',
    )
  }
  return Array.isArray(raw) ? toXmlNodes(raw) : []
}

/** 读取属性（依次尝试多个候选键，兼容是否移除前缀的差异）。 */
export function attr(node: XmlNode, ...names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = node.attrs[name]
    if (value !== undefined) return value
  }
  return undefined
}

/** 子元素（排除文本节点）。 */
export function childElements(node: XmlNode): XmlNode[] {
  return node.children.filter(child => child.name !== '#text')
}

/** 直接子元素中查找指定名字的第一个。 */
export function firstChild(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find(child => child.name === name)
}

/** 递归查找第一个指定名字的后代（深度优先）。 */
export function findDescendant(node: XmlNode, name: string): XmlNode | undefined {
  for (const child of node.children) {
    if (child.name === name) return child
    const found = findDescendant(child, name)
    if (found !== undefined) return found
  }
  return undefined
}

/** 收集所有指定名字的后代。 */
export function collectDescendants(node: XmlNode, name: string): XmlNode[] {
  const out: XmlNode[] = []
  const walk = (current: XmlNode): void => {
    for (const child of current.children) {
      if (child.name === name) out.push(child)
      walk(child)
    }
  }
  walk(node)
  return out
}

/** 文本节点的文本（直接子节点）。 */
export function ownText(node: XmlNode): string {
  let text = ''
  for (const child of node.children) {
    if (child.name === '#text' && typeof (child as XmlNode & { text?: string }).text === 'string') {
      text += (child as XmlNode & { text: string }).text
    }
  }
  return text
}

/** 递归拼接节点内所有文本（含后代文本节点）。 */
export function textOfNode(node: XmlNode): string {
  let text = ownText(node)
  for (const child of node.children) {
    if (child.name !== '#text') text += textOfNode(child)
  }
  return text
}

/** 解压后文件按名称查找（大小写不敏感、允许前导斜杠）。 */
export function findZipEntry(
  files: Record<string, Uint8Array>,
  name: string,
): Uint8Array | undefined {
  const normalized = name.replace(/^\/+/, '')
  if (files[normalized] !== undefined) return files[normalized]
  const lower = normalized.toLowerCase()
  for (const [key, value] of Object.entries(files)) {
    if (key.replace(/^\/+/, '').toLowerCase() === lower) return value
  }
  return undefined
}

/** OOXML 关系（rels）记录。 */
export interface Relationship {
  readonly id: string
  readonly target: string
  readonly type: string
}

/** 解析 .rels 文件得到 id → 关系。 */
export function parseRelationships(xml: string | undefined): Map<string, Relationship> {
  const map = new Map<string, Relationship>()
  if (xml === undefined) return map
  const roots = parseXmlTree(xml)
  for (const root of roots) {
    const walk = (node: XmlNode): void => {
      if (node.name === 'Relationship') {
        const id = attr(node, 'Id', 'id')
        const target = attr(node, 'Target', 'target')
        const type = attr(node, 'Type', 'type') ?? ''
        if (id !== undefined && target !== undefined) map.set(id, { id, target, type })
      }
      for (const child of node.children) walk(child)
    }
    walk(root)
  }
  return map
}

/** 按相对 target 解析 zip 内路径（target 相对 rels 所在目录）。 */
export function resolvePartPath(baseDir: string, target: string): string {
  if (target.startsWith('/')) return target.replace(/^\/+/, '')
  const baseParts = baseDir === '' ? [] : baseDir.split('/')
  for (const part of target.split('/')) {
    if (part === '..') baseParts.pop()
    else if (part !== '.' && part !== '') baseParts.push(part)
  }
  return baseParts.join('/')
}

/** docx 样式 id → 样式名（小写）。 */
export function parseStyleNames(xml: string | undefined): Map<string, string> {
  const map = new Map<string, string>()
  if (xml === undefined) return map
  for (const root of parseXmlTree(xml)) {
    const walk = (node: XmlNode): void => {
      if (node.name === 'style') {
        const id = attr(node, 'styleId', 'StyleId', 'id')
        const nameNode = firstChild(node, 'name')
        const name = nameNode !== undefined ? attr(nameNode, 'val', 'Val') : undefined
        if (id !== undefined && name !== undefined) map.set(id.toLowerCase(), name.toLowerCase())
      }
      for (const child of node.children) walk(child)
    }
    walk(root)
  }
  return map
}
