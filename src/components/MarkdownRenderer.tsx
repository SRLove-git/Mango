import { useMemo, useState, createElement, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import TurndownService from 'turndown'
import 'katex/dist/katex.min.css'
import type { Components } from 'react-markdown'

interface Props {
  content: string
  className?: string
  /** @default 'auto' — 自动检测 HTML，将 WordPress HTML 转换为 markdown 再渲染 */
  mode?: 'auto' | 'markdown' | 'html'
}

/** 从 react-markdown 的 children 节点中提取纯文本 */
function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) {
    return children.map((c) => extractText(c)).join('')
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as ReactElement).props.children)
  }
  return ''
}

/**
 * macOS 风格代码块组件：交通灯顶栏 + 语言标签 + 复制 + 代码高亮
 */
function CodeBlockMac({
  lang,
  code,
}: {
  lang: string
  code: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = code
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block-mac">
      <div className="code-block-mac-header">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
        <span className="lang-label">{lang || 'code'}</span>
      </div>
      <button
        className={`copy-btn${copied ? ' copied' : ''}`}
        onClick={handleCopy}
        title="复制代码"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            <span>已复制</span>
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
            <span>复制</span>
          </>
        )}
      </button>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        showLineNumbers={false}
        customStyle={{
          margin: 0,
          padding: '12px 14px',
          borderRadius: 0,
          fontSize: '12px',
          lineHeight: 1.5,
          background: '#1a1b1d',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'var(--font-mono)',
            background: '#1a1b1d',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

/** slugify 文本生成 HTML ID */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/^-+|-+$/g, '') || 'heading'
}

/** 生成带 ID 的 heading 组件 */
function createHeading(level: number) {
  return function Heading({ children, ...props }: { children?: ReactNode; [key: string]: any }) {
    const text = extractText(children)
    const id = slugify(text)
    return createElement(`h${level}`, { id, ...props }, children)
  }
}

const components: Components = {
  a: ({ href, children, ...props }) => {
    const isExternal = href?.startsWith('http')
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'external nofollow noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    )
  },
  img: ({ src, alt, ...props }) => (
    <img src={src} alt={alt || ''} loading="lazy" {...props} />
  ),
  // macOS 风格代码块 + 语法高亮（统一 markdown 和 WordPress 代码块样式）
  pre: ({ children, ...props }) => {
    let lang = ''
    let code = ''

    if (children && typeof children === 'object' && 'props' in children) {
      const el = children as ReactElement
      const cls = (el.props.className as string) || ''
      if (cls.startsWith('language-')) {
        lang = cls.replace('language-', '')
      }
      code = extractText(el.props.children)
    }

    if (code) return <CodeBlockMac lang={lang} code={code} />

    return <pre {...props}>{children}</pre>
  },
  table: ({ children, ...props }) => (
    <div className="table-wrapper">
      <table {...props}>{children}</table>
    </div>
  ),
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
}

// ───────── WordPress HTML → markdown 转换 ─────────

/** 懒初始化 turndown 实例，复用避免重复创建 */
let _td: TurndownService | null = null
function getTurndown(): TurndownService {
  if (!_td) {
    _td = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-',
    })

    // 移除 turndown 内置的 table blankRule，替换为自定义表格转换
    _td.remove('table')

    // 自定义表格规则：将 <table> 转换为 GFM 表格 markdown
    _td.addRule('table', {
      filter: 'table',
      replacement: (_content, node) => {
        const table = node as HTMLTableElement
        let md = ''
        let headerDone = false
        let rowIndex = 0

        table.querySelectorAll('tr').forEach((row) => {
          const cells = Array.from(row.querySelectorAll('th, td'))
            .map((cell) => (cell.textContent || '').trim())

          if (cells.length === 0) return

          md += '| ' + cells.join(' | ') + ' |\n'

          if (!headerDone) {
            const isHeaderRow = row.closest('thead') !== null || row.querySelector('th') !== null
            if (isHeaderRow || rowIndex === 0) {
              md += '| ' + cells.map(() => '---').join(' | ') + ' |\n'
              headerDone = true
            }
          }
          rowIndex++
        })

        return '\n\n' + md + '\n'
      },
    })

    // 确保图片被正确转换为 ![](url)
    _td.addRule('img', {
      filter: 'img',
      replacement: (_content, node) => {
        const el = node as HTMLImageElement
        const alt = el.getAttribute('alt') || ''
        const src = el.getAttribute('src') || ''
        return src ? `![${alt}](${src})` : ''
      },
    })
    // 处理 Gutenberg 的 figure 包裹（图片/表格等）
    _td.addRule('figure', {
      filter: 'figure',
      replacement: (content) => content,
    })
    // 处理 <br> 标签
    _td.addRule('br', {
      filter: 'br',
      replacement: () => '\n',
    })
  }
  return _td
}

// ───────── 数学块保护（防止 turndown 转义 LaTeX 字符）─────────

/**
 * 将 WordPress 的 MathML 块（.wp-block-math）转为标准 LaTeX 分隔符。
 * WordPress 输出的格式：
 *   <div class="wp-block-math"><math display="block"><annotation encoding="application/x-tex">\sqrt{e}</annotation></math></div>
 */
function convertMathML(html: string): string {
  if (typeof document === 'undefined') return html
  const container = document.createElement('div')
  container.innerHTML = html

  container.querySelectorAll('.wp-block-math').forEach((el) => {
    const annotation = el.querySelector('annotation[encoding="application/x-tex"]')
    if (!annotation) return

    const tex = (annotation.textContent || '').trim()
    if (!tex) return

    const mathEl = el.querySelector('math')
    const isBlock = mathEl?.getAttribute('display') !== 'inline'

    // 替换为 $$...$$（块级）或 $...$（行内）
    const replacement = isBlock ? `$$${tex}$$` : `$${tex}$`
    el.parentNode?.replaceChild(document.createTextNode(replacement), el)
  })

  return container.innerHTML
}

function protectMath(html: string): { html: string; mathBlocks: string[] } {
  const blocks: string[] = []

  let result = html
    // 先处理 $$...$$（多行），再处理 $...$（单行），避免 $$ 被 $ 误匹配
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      blocks.push('$$' + math + '$$')
      return `ZZMATH${blocks.length - 1}ZZ`
    })
    .replace(/\$([^$\n]+?)\$/g, (_, math) => {
      blocks.push('$' + math + '$')
      return `ZZMATH${blocks.length - 1}ZZ`
    })
    // WordPress 可能使用 \(...\) 和 \[...\] 作为 LaTeX 分隔符
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      blocks.push('$$' + math + '$$')
      return `ZZMATH${blocks.length - 1}ZZ`
    })
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
      blocks.push('$' + math + '$')
      return `ZZMATH${blocks.length - 1}ZZ`
    })

  return { html: result, mathBlocks: blocks }
}

function restoreMath(md: string, blocks: string[]): string {
  let result = md
  blocks.forEach((math, i) => {
    result = result.replace(`ZZMATH${i}ZZ`, math)
  })
  return result
}

function htmlToMarkdown(html: string): string {
  // 0. 将 WordPress MathML 块转为 $$...$$ / $...$ 格式
  const htmlWithMath = convertMathML(html)

  // 1. 保护数学块，防止 turndown 转义 LaTeX 中的 _ \ 等字符
  const { html: protectedHtml, mathBlocks } = protectMath(htmlWithMath)

  // 2. turndown 处理
  const td = getTurndown()
  let md = td.turndown(protectedHtml)

  // 3. 还原数学块
  md = restoreMath(md, mathBlocks)

  // 修复 WordPress texturize 产生的智能引号
  md = md
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2026/g, '...')
    // em dash → --
    .replace(/\u2014/g, '--')
    // en dash → -
    .replace(/\u2013/g, '-')
    // turndown 会转义反引号 ` → \`，需先还原才能用正则匹配代码围栏
    .replace(/\\(`)/g, '$1')
    // 还原被 turndown 转义的 markdown 行首标记（标题、列表等）
    .replace(/^\\(#{1,6}\s)/gm, '$1')
    .replace(/^\\([-*+>]\s)/gm, '$1')
    // WordPress texturize 把 ```lang 转成 "`lang（只剩一个反引号），还原为代码围栏
    .replace(/^"`(\w*)/gm, (_, lang) => '```' + lang)

  return md
}

function containsHTML(text: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(text)
}

export default function MarkdownRenderer({ content, className = '', mode = 'auto' }: Props) {
  const markdown = useMemo(() => {
    if (!content) return ''

    if (mode === 'html' || (mode === 'auto' && containsHTML(content))) {
      return htmlToMarkdown(content)
    }

    return content
  }, [content, mode])

  return (
    <div className={`detail-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
