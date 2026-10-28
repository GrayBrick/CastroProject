import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

/** Renders model formatting without enabling raw HTML. Soft newlines stay visible. */
export default function MarkdownMessage({ text }: { text: string }) {
  return <div className="markdown-message"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{text}</ReactMarkdown></div>
}
