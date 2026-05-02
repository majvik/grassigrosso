interface LegacyContentPageProps {
  html: string
}

export function LegacyContentPage({ html }: LegacyContentPageProps) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
