const BOLD_PATTERN = /\*\*(.+?)\*\*/g

export function appendHelpInlineBold(parent: HTMLElement, text: string): void {
  const source = String(text || '')
  if (!source) return

  BOLD_PATTERN.lastIndex = 0
  let lastIndex = 0
  let match = BOLD_PATTERN.exec(source)
  while (match) {
    const index = match.index
    if (index > lastIndex) {
      parent.appendChild(document.createTextNode(source.slice(lastIndex, index)))
    }
    const strong = document.createElement('strong')
    strong.textContent = match[1]
    parent.appendChild(strong)
    lastIndex = index + match[0].length
    match = BOLD_PATTERN.exec(source)
  }

  if (lastIndex < source.length) {
    parent.appendChild(document.createTextNode(source.slice(lastIndex)))
  }
}
