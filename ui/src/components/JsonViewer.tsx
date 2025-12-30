import { cn } from "@/lib/utils"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"

interface JsonViewerProps {
  data: any
  className?: string
  showLineNumbers?: boolean
}

export function JsonViewer({ data, className, showLineNumbers = false }: JsonViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlight = (json: string) => {
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "json-number"
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "json-key"
          } else {
            cls = "json-string"
          }
        } else if (/true|false/.test(match)) {
          cls = "json-boolean"
        } else if (/null/.test(match)) {
          cls = "json-null"
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
  }

  const formattedJson = JSON.stringify(data, null, 2)
  const lines = formattedJson.split('\n')

  return (
    <div className={cn("group relative rounded-lg bg-muted/50 border", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
      <div className="overflow-x-auto p-4">
        {showLineNumbers ? (
          <table className="w-full">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="leading-relaxed">
                  <td className="select-none pr-4 text-right text-xs text-muted-foreground/50 font-mono">
                    {index + 1}
                  </td>
                  <td>
                    <code
                      className="font-mono text-sm"
                      dangerouslySetInnerHTML={{ __html: highlight(line) }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre
            className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlight(formattedJson) }}
          />
        )}
      </div>
    </div>
  )
}
