/**
 * Word (.docx) 与 PowerPoint (.pptx) 抽取器。
 *
 * 直接解析 OOXML（zip + XML），不要求学生安装 Office：
 * - 段落、标题层级、列表、表格；Word 公式（OMML）按纯文本保留并标记不确定；
 * - 幻灯片标题/正文/表格/图片/备注；图片写入派生资产并作为 figure 单元。
 *
 * Office 没有页码，定位使用 `locator.chars`（相对抽取顺序的纯文本字符区间）
 * 与 `locator.sectionPath`（标题路径）；单元 notes 中给出段落序号/幻灯片号。
 */
import { extname } from 'node:path'
import type { ExtractionConfidence, SourceIssue, SourceLocator } from '../../contracts/source.ts'
import { ExtractionBudget } from '../budget.ts'
import type { ParserOutput } from '../budget.ts'
import { CorpusParseError } from '../errors.ts'
import { looksLikeFormula } from '../text-utils.ts'
import type { ParseContext } from './context.ts'
import { addImageAsset } from './context.ts'
import {
  attr, childElements, collectDescendants, decodeUtf8, findZipEntry, firstChild, parseRelationships,
  parseStyleNames, parseXmlTree, resolvePartPath, textOfNode, unzipDocument, type XmlNode,
} from '../xml.ts'

const EXTRACTOR_VERSION = '1.0.0'

type OfficeFile = Record<string, Uint8Array>

function issueOf(
  code: SourceIssue['code'],
  severity: SourceIssue['severity'],
  message: string,
  extra: { locator?: SourceLocator; excerpt?: string; reviewRequired?: boolean } = {},
): SourceIssue {
  return {
    code,
    severity,
    message,
    reviewRequired: extra.reviewRequired ?? false,
    ...(extra.locator !== undefined ? { locator: extra.locator } : {}),
    ...(extra.excerpt !== undefined ? { excerpt: extra.excerpt.slice(0, 240) } : {}),
  }
}

/** 在 OOXML 树中查找第一个指定名字的后代（含直接子节点）。 */
function findNode(node: XmlNode, name: string): XmlNode | undefined {
  for (const child of node.children) {
    if (child.name === name) return child
    const found = findNode(child, name)
    if (found !== undefined) return found
  }
  return undefined
}

/** 把文本节点拼成段落文本（r/t、a:t 等，按文档顺序）。 */
function textNodesText(node: XmlNode): string {
  let text = ''
  for (const child of node.children) {
    if (child.name === '#text') {
      const value = (child as XmlNode & { text?: string }).text
      if (typeof value === 'string') text += value
      continue
    }
    text += textNodesText(child)
  }
  return text
}

/** 解析 docx 图片关系并写入资产。 */
function addDocxImage(
  budget: ExtractionBudget,
  files: OfficeFile,
  slideOrDocumentDir: string,
  rels: Map<string, { target: string }>,
  embedId: string | undefined,
  prefix: string,
): { assetPath?: string; missing?: string } | undefined {
  if (embedId === undefined) return undefined
  const relationship = rels.get(embedId)
  if (relationship === undefined) return { missing: `关系 ${embedId} 不存在` }
  const partPath = resolvePartPath(slideOrDocumentDir, relationship.target)
  const bytes = findZipEntry(files, partPath)
  if (bytes === undefined) return { missing: `图片部件缺失：${partPath}` }
  const extension = extname(partPath).toLowerCase()
  const assetPath = addImageAsset(budget, bytes, extension, prefix)
  return assetPath !== undefined ? { assetPath } : { missing: '图片过大或数量超限' }
}

/* ------------------------------------------------------------------ DOCX */

/** 解析 .docx。 */
export async function parseDocx(context: ParseContext): Promise<ParserOutput> {
  const files = unzipDocument(context.bytes)
  const documentBytes = findZipEntry(files, 'word/document.xml')
  if (documentBytes === undefined) {
    throw new CorpusParseError('不是有效的 Word 文档（缺少 word/document.xml）', 'invalid-docx')
  }
  const roots = parseXmlTree(decodeUtf8(documentBytes))
  const relsBytes = findZipEntry(files, 'word/_rels/document.xml.rels')
  const relationships = parseRelationships(relsBytes !== undefined ? decodeUtf8(relsBytes) : undefined)
  const stylesBytes = findZipEntry(files, 'word/styles.xml')
  const styleNames = parseStyleNames(stylesBytes !== undefined ? decodeUtf8(stylesBytes) : undefined)
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  const sectionPath: string[] = []
  let plainOffset = 0
  let paragraphOrdinal = 0
  let imageOrdinal = 0
  let tableOrdinal = 0

  const advance = (text: string): void => {
    plainOffset += text.length + 1
  }

  const headingLevelOf = (paragraph: XmlNode): number => {
    const pPr = firstChild(paragraph, 'pPr')
    if (pPr === undefined) return 0
    const pStyle = firstChild(pPr, 'pStyle')
    const styleId = pStyle !== undefined ? (attr(pStyle, 'val', 'Val') ?? '') : ''
    const outline = firstChild(pPr, 'outlineLvl')
    if (outline !== undefined) {
      const level = Number(attr(outline, 'val', 'Val') ?? '')
      if (Number.isFinite(level) && level >= 0 && level <= 8) return level + 1
    }
    if (styleId === '') return 0
    const lower = styleId.toLowerCase()
    const named = styleNames.get(lower) ?? ''
    const direct = /^heading\s*(\d)$/.exec(lower) ?? /^标题\s*(\d)$/.exec(lower)
    if (direct !== null) return Number(direct[1])
    const viaStyle = /(?:heading|标题)\s*(\d)/.exec(named)
    if (viaStyle !== null) return Number(viaStyle[1])
    if (lower === 'title' || named === 'title') return 1
    return 0
  }

  const addImageFromParagraph = (paragraph: XmlNode, locator: SourceLocator, caption: string): void => {
    const drawings = collectDescendants(paragraph, 'drawing')
    for (const drawing of drawings) {
      const blips = collectDescendants(drawing, 'blip')
      for (const blip of blips) {
        const embed = attr(blip, 'embed', 'r:embed')
        imageOrdinal += 1
        const result = addDocxImage(budget, files, 'word', relationships, embed, `word-img${imageOrdinal}`)
        const cNvPr = findNode(drawing, 'cNvPr')
        const description = cNvPr !== undefined ? (attr(cNvPr, 'descr', 'title') ?? attr(cNvPr, 'name') ?? '') : ''
        const figureCaption = caption.trim() !== '' ? caption.trim() : description.trim()
        if (result?.assetPath !== undefined) {
          budget.addUnit({
            kind: 'figure',
            locator,
            text: figureCaption !== '' ? figureCaption : `Word 文档第 ${imageOrdinal} 张图片`,
            assetPath: result.assetPath,
            confidence: 'high',
            notes: ['Word 内嵌图片'],
          })
        } else {
          budget.addUnit({
            kind: 'figure',
            locator,
            text: figureCaption !== '' ? figureCaption : `图片（无法读取：${result?.missing ?? '未知原因'}）`,
            confidence: 'unknown',
            notes: [result?.missing ?? '图片无法读取'],
          })
          budget.addIssue(issueOf('figure-unreadable', 'warning',
            'Word 文档中的图片无法读取，学生可打开原文件核对', { locator, reviewRequired: true }))
        }
      }
    }
  }

  const handleParagraph = (paragraph: XmlNode): void => {
    budget.checkAbort()
    paragraphOrdinal += 1
    const paragraphIndex = paragraphOrdinal
    const headingLevel = headingLevelOf(paragraph)
    const hasNumbering = firstChild(firstChild(paragraph, 'pPr') ?? paragraph, 'numPr') !== undefined

    // 排除公式内部的文本，单独作为 formula 单元
    const formulaTexts: string[] = []
    const bodyTexts: string[] = []
    const walkRuns = (node: XmlNode): void => {
      for (const child of node.children) {
        if (child.name === 'oMath') {
          formulaTexts.push(textNodesText(child).trim())
          continue
        }
        if (child.name === 't') {
          bodyTexts.push(textNodesText(child))
          continue
        }
        walkRuns(child)
      }
    }
    walkRuns(paragraph)
    const body = bodyTexts.join('').trim()
    const chars: [number, number] = [plainOffset, plainOffset + Math.max(0, body.length - 1)]
    const locator: SourceLocator = {
      chars,
      ...(sectionPath.length > 0 ? { sectionPath: [...sectionPath] } : {}),
    }
    const paragraphNote = `Word 第 ${paragraphIndex} 段`
    if (headingLevel > 0 && body !== '') {
      sectionPath.length = Math.min(sectionPath.length, headingLevel - 1)
      sectionPath.push(body.slice(0, 120))
      budget.addUnit({
        kind: 'heading',
        locator: { chars, sectionPath: [...sectionPath] },
        text: body,
        confidence: 'high',
        notes: [paragraphNote],
      })
    } else if (body !== '') {
      const kind = hasNumbering ? 'list' : (looksLikeFormula(body) && body.length <= 400 ? 'formula' : 'paragraph')
      const confidence: ExtractionConfidence = kind === 'formula' ? 'medium' : 'high'
      budget.addUnit({
        kind,
        locator,
        text: body,
        confidence,
        notes: [paragraphNote],
      })
      if (kind === 'formula') {
        budget.addIssue(issueOf('formula-uncertain', 'info',
          'Word 段落被识别为公式（启发式判断），请核对原文的符号与条件', { locator, excerpt: body }))
      }
    }
    for (const formula of formulaTexts) {
      if (formula === '') continue
      budget.addUnit({
        kind: 'formula',
        locator,
        text: formula,
        confidence: 'medium',
        notes: [paragraphNote, 'Word 公式（OMML）按纯文本保留，未转换为 TeX'],
      })
      budget.addIssue(issueOf('formula-uncertain', 'info',
        'Word 公式按纯文本保留，复杂公式的结构可能丢失，请核对原文',
        { locator, excerpt: formula }))
    }
    addImageFromParagraph(paragraph, locator, body)
    advance(`${body}${formulaTexts.join('')}`)
  }

  const handleTable = (table: XmlNode): void => {
    budget.checkAbort()
    tableOrdinal += 1
    const rows: string[][] = []
    for (const rowNode of collectDescendants(table, 'tr')) {
      const cells: string[] = []
      for (const cellNode of collectDescendants(rowNode, 'tc')) {
        cells.push(textNodesText(cellNode).trim())
      }
      if (cells.length > 0) rows.push(cells)
    }
    if (rows.length === 0) return
    const text = rows.map(row => row.join(' | ')).join('\n')
    const locator: SourceLocator = {
      chars: [plainOffset, plainOffset + Math.max(0, text.length - 1)],
      ...(sectionPath.length > 0 ? { sectionPath: [...sectionPath] } : {}),
    }
    budget.addUnit({
      kind: 'table',
      locator,
      text,
      confidence: 'high',
      notes: [`Word 第 ${tableOrdinal} 个表格`],
    })
    advance(text)
  }

  const walkBody = (nodes: readonly XmlNode[]): void => {
    for (const node of nodes) {
      if (budget.full || budget.overTextLimit) return
      if (node.name === 'p') {
        handleParagraph(node)
        continue
      }
      if (node.name === 'tbl') {
        handleTable(node)
        continue
      }
      if (node.name === 'sectPr') continue
      walkBody(node.children)
    }
  }
  for (const root of roots) walkBody(root.children)
  if (budget.units.length === 0) {
    budget.addIssue(issueOf('unsupported-content', 'warning',
      'Word 文档中没有抽取到可读正文', { reviewRequired: true }))
  }
  return budget.finalize('docx', undefined, {
    name: 'teaching-corpus/docx',
    version: EXTRACTOR_VERSION,
  })
}

/* ------------------------------------------------------------------ PPTX */

/** 幻灯片顺序：优先按 presentation.xml 的 sldId 顺序，失败时按文件名序号。 */
function orderedSlideParts(files: OfficeFile): string[] {
  const presentationBytes = findZipEntry(files, 'ppt/presentation.xml')
  const relsBytes = findZipEntry(files, 'ppt/_rels/presentation.xml.rels')
  const relationships = parseRelationships(relsBytes !== undefined ? decodeUtf8(relsBytes) : undefined)
  const parts: string[] = []
  if (presentationBytes !== undefined) {
    const xml = decodeUtf8(presentationBytes)
    // 直接正则读取 r:id 顺序，避免命名空间属性歧义
    for (const match of xml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)) {
      const relationship = relationships.get(match[1] ?? '')
      if (relationship !== undefined) {
        const part = resolvePartPath('ppt', relationship.target)
        if (findZipEntry(files, part) !== undefined) parts.push(part)
      }
    }
  }
  if (parts.length > 0) return parts
  return Object.keys(files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numberA = Number(/slide(\d+)\.xml$/.exec(a)?.[1] ?? 0)
      const numberB = Number(/slide(\d+)\.xml$/.exec(b)?.[1] ?? 0)
      return numberA - numberB
    })
}

/** 解析 .pptx。 */
export async function parsePptx(context: ParseContext): Promise<ParserOutput> {
  const files = unzipDocument(context.bytes)
  const slideParts = orderedSlideParts(files)
  if (slideParts.length === 0) {
    throw new CorpusParseError('不是有效的 PowerPoint 文档（没有幻灯片）', 'invalid-pptx')
  }
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  let imageOrdinal = 0
  let tableOrdinal = 0

  for (let index = 0; index < slideParts.length; index += 1) {
    budget.checkAbort()
    if (budget.full || budget.overTextLimit) break
    const slideNumber = index + 1
    const part = slideParts[index] as string
    const slideBytes = findZipEntry(files, part)
    if (slideBytes === undefined) {
      budget.addIssue(issueOf('missing-page', 'warning',
        `第 ${slideNumber} 张幻灯片缺失`, { locator: { slide: slideNumber }, reviewRequired: true }))
      continue
    }
    const roots = parseXmlTree(decodeUtf8(slideBytes))
    const slideDir = part.substring(0, part.lastIndexOf('/'))
    const relsPath = `${slideDir}/_rels/${part.substring(part.lastIndexOf('/') + 1)}.rels`
    const relsBytes = findZipEntry(files, relsPath)
    const relationships = parseRelationships(relsBytes !== undefined ? decodeUtf8(relsBytes) : undefined)
    let slideTitle = ''
    let bodyIndex = 0

    const handleShape = (shape: XmlNode): void => {
      const txBody = findNode(shape, 'txBody')
      if (txBody === undefined) return
      const placeholder = findNode(shape, 'ph')
      const placeholderType = placeholder !== undefined ? (attr(placeholder, 'type', 'Type') ?? '') : ''
      const isTitle = placeholderType === 'title' || placeholderType === 'ctrTitle'
      const paragraphs = txBody.children.filter(child => child.name === 'p')
      const texts: string[] = []
      for (const paragraph of paragraphs) {
        const runs: string[] = []
        for (const child of paragraph.children) {
          if (child.name === 'r' || child.name === 'fld') runs.push(textNodesText(child))
          else if (child.name === 'br') runs.push('\n')
          else if (child.name === 'fld') runs.push(textNodesText(child))
        }
        const text = runs.join('').trim()
        if (text !== '') texts.push(text)
      }
      if (isTitle) {
        slideTitle = texts.join(' ').trim()
        if (slideTitle !== '') {
          budget.addUnit({
            kind: 'heading',
            locator: { slide: slideNumber, ...(slideTitle !== '' ? { sectionPath: [slideTitle] } : {}) },
            text: slideTitle,
            confidence: 'high',
            notes: [`幻灯片 ${slideNumber} 标题`],
          })
        }
        return
      }
      for (const text of texts) {
        bodyIndex += 1
        const isList = /^\s*(?:[•·▪◦-]|\d+[.)])\s+/.test(text)
        const kind = isList ? 'list' : (looksLikeFormula(text) ? 'formula' : 'paragraph')
        const locator: SourceLocator = {
          slide: slideNumber,
          ...(slideTitle !== '' ? { sectionPath: [slideTitle] } : {}),
        }
        budget.addUnit({
          kind,
          locator,
          text,
          confidence: kind === 'formula' ? 'medium' : 'high',
          notes: [`幻灯片 ${slideNumber} 正文 ${bodyIndex}`],
        })
        if (kind === 'formula') {
          budget.addIssue(issueOf('formula-uncertain', 'info',
            '幻灯片中的公式按纯文本保留，请核对原文的符号与条件', { locator, excerpt: text }))
        }
      }
    }

    const handleTable = (table: XmlNode): void => {
      tableOrdinal += 1
      const rows: string[][] = []
      for (const rowNode of collectDescendants(table, 'tr')) {
        const cells: string[] = []
        for (const cellNode of collectDescendants(rowNode, 'tc')) {
          cells.push(textNodesText(cellNode).trim())
        }
        if (cells.length > 0) rows.push(cells)
      }
      if (rows.length === 0) return
      budget.addUnit({
        kind: 'table',
        locator: { slide: slideNumber, ...(slideTitle !== '' ? { sectionPath: [slideTitle] } : {}) },
        text: rows.map(row => row.join(' | ')).join('\n'),
        confidence: 'high',
        notes: [`幻灯片 ${slideNumber} 表格 ${tableOrdinal}`],
      })
    }

    const handlePicture = (picture: XmlNode): void => {
      imageOrdinal += 1
      const blips = collectDescendants(picture, 'blip')
      for (const blip of blips) {
        const embed = attr(blip, 'embed', 'r:embed')
        const result = addDocxImage(budget, files, slideDir, relationships, embed, `slide${slideNumber}-img${imageOrdinal}`)
        const cNvPr = findNode(picture, 'cNvPr')
        const description = cNvPr !== undefined ? (attr(cNvPr, 'descr', 'title') ?? attr(cNvPr, 'name') ?? '') : ''
        const caption = description.trim()
        const locator: SourceLocator = {
          slide: slideNumber,
          ...(slideTitle !== '' ? { sectionPath: [slideTitle] } : {}),
        }
        if (result?.assetPath !== undefined) {
          budget.addUnit({
            kind: 'figure',
            locator,
            text: caption !== '' ? caption : `幻灯片 ${slideNumber} 的图片`,
            assetPath: result.assetPath,
            confidence: 'high',
            notes: [`幻灯片 ${slideNumber} 图片`],
          })
        } else {
          budget.addUnit({
            kind: 'figure',
            locator,
            text: caption !== '' ? caption : `图片（无法读取：${result?.missing ?? '未知原因'}）`,
            confidence: 'unknown',
            notes: [result?.missing ?? '图片无法读取'],
          })
          budget.addIssue(issueOf('figure-unreadable', 'warning',
            '幻灯片中的图片无法读取，可打开原文件核对', { locator, reviewRequired: true }))
        }
      }
    }

    const handleGraphicFrame = (frame: XmlNode): void => {
      const table = findNode(frame, 'tbl')
      if (table !== undefined) {
        handleTable(table)
        return
      }
      if (findNode(frame, 'chart') !== undefined) {
        budget.addIssue(issueOf('unsupported-content', 'info',
          'PPT 图表对象未抽取数据（本版本不做图表数值反解），可回看原幻灯片',
          { locator: { slide: slideNumber }, reviewRequired: false }))
      }
    }

    for (const root of roots) {
      for (const node of collectDescendants(root, 'sp')) handleShape(node)
      for (const node of collectDescendants(root, 'graphicFrame')) handleGraphicFrame(node)
      for (const node of collectDescendants(root, 'pic')) handlePicture(node)
    }

    // 演讲者备注
    const notesRelationship = [...relationships.values()].find(item => item.type.includes('/notesSlide'))
    if (notesRelationship !== undefined) {
      const notesPart = resolvePartPath(slideDir, notesRelationship.target)
      const notesBytes = findZipEntry(files, notesPart)
      if (notesBytes !== undefined) {
        const notesRoots = parseXmlTree(decodeUtf8(notesBytes))
        const notesText = notesRoots.map(root => collectDescendants(root, 't').map(textOfNode).join('')).join('').trim()
        if (notesText !== '') {
          budget.addUnit({
            kind: 'note',
            locator: { slide: slideNumber, ...(slideTitle !== '' ? { sectionPath: [slideTitle] } : {}) },
            text: notesText,
            confidence: 'high',
            notes: [`幻灯片 ${slideNumber} 演讲者备注`],
          })
        }
      }
    }
  }
  if (budget.units.length === 0) {
    budget.addIssue(issueOf('unsupported-content', 'warning',
      '幻灯片中没有抽取到可读文本', { reviewRequired: true }))
  }
  return budget.finalize('pptx', undefined, {
    name: 'teaching-corpus/pptx',
    version: EXTRACTOR_VERSION,
  }, { kind: 'slides', count: slideParts.length })
}

/** 保留：Office 文本节点读取（供测试与调试）。 */
export function officeTextOf(node: XmlNode): string {
  return textNodesText(node)
}

/** 保留：显式子元素遍历（供未来扩展）。 */
export function officeChildren(node: XmlNode): XmlNode[] {
  return childElements(node)
}
