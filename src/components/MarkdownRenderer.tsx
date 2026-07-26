import { useMemo, useState, createElement, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
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
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        showLineNumbers={false}
        customStyle={{
          margin: 0,
          padding: '8px 12px',
          borderRadius: 0,
          fontSize: '12px',
          lineHeight: 1,
          background: 'transparent',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'var(--font-mono)',
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
  // macOS 风格代码块 + 语法高亮
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

    if (!lang) return <pre {...props}>{children}</pre>

    return <CodeBlockMac lang={lang} code={code} />
  },
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
}

// ───────── WordPress HTML → markdown 转换 ─────────

function htmlToText(html: string): string {
  if (typeof document === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html

  div.querySelectorAll('br').forEach((br) => {
    br.replaceWith('\n')
  })

  // 处理列表项：<li> → "- 内容\n"
  div.querySelectorAll('li').forEach((li) => {
    const isOrdered = li.closest('ol') !== null
    li.before(isOrdered ? '1. ' : '- ')
    li.after('\n')
    li.replaceWith(...Array.from(li.childNodes))
  })

  // 处理 <ul>/<ol>：前后加空行分隔
  div.querySelectorAll('ul, ol').forEach((list) => {
    list.before('\n')
    list.after('\n')
    list.replaceWith(...Array.from(list.childNodes))
  })

  const blockSelectors = 'p, div, h1, h2, h3, h4, h5, h6, tr, blockquote, pre, hr'
  div.querySelectorAll(blockSelectors).forEach((el) => {
    el.after('\n\n')
    el.replaceWith(...Array.from(el.childNodes))
  })

  return div.textContent || ''
}

function fixWpTexturize(text: string): string {
  const SMART_LQUOTE = '\u201c'
  const SMART_RQUOTE = '\u201d'

  let result = text.replace(
    new RegExp(`[${SMART_LQUOTE}${SMART_RQUOTE}]\`(\\w*)`, 'g'),
    (_match, lang) => (lang ? `\`\`\`${lang}` : '\`\`\`')
  )

  result = result
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')

  result = result.replace(/\u2026/g, '...')

  // WordPress 把用户输入的连字符 "---" 和 "--" 转成短破折号/长破折号
  // 把 –（en dash U+2013, &#8211;）转回普通连字符，以便 markdown 列表识别
  result = result.replace(/\u2013/g, '-')
  // 把 —（em dash U+2014, &#8212;）转回 --
  result = result.replace(/\u2014/g, '--')

  return result
}

function containsHTML(text: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(text)
}

export default function MarkdownRenderer({ content, className = '', mode = 'auto' }: Props) {
  const markdown = useMemo(() => {
    if (!content) return ''

    if (mode === 'html' || (mode === 'auto' && containsHTML(content))) {
      const text = htmlToText(content)
      return fixWpTexturize(text)
    }

    return content
  }, [content, mode])

  return (
    <div className={`detail-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
