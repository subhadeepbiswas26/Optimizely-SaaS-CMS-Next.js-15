import ContentAreaMapper from '@/components/content-area/mapper'
import DraftModeHomePage from '@/components/draft/draft-mode-homepage'
import { DraftModeLoader } from '@/components/draft/draft-mode-loader'
import { optimizely } from '@/lib/optimizely/fetch'
import { getValidLocale } from '@/lib/optimizely/utils/language'
import { generateAlternates } from '@/lib/utils/metadata'
import { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { Suspense } from 'react'

function getStartPageKey() {
  const key = process.env.OPTIMIZELY_START_PAGE_KEY
  if (!key) {
    throw new Error('Missing OPTIMIZELY_START_PAGE_KEY environment variable')
  }

  return key
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await props.params
  const locales = getValidLocale(locale)
  const key = getStartPageKey()
  const pageResp = await optimizely.GetStartPage({ locales, key } as never)
  const startPage = (pageResp as any).data?._Content?.item

  if (startPage?.__typename !== 'StartPage') {
    return {}
  }

  return {
    title: startPage.title,
    description: startPage.shortDescription || '',
    keywords: startPage.keywords ?? '',
    alternates: generateAlternates(locale, '/'),
  }
}

export default async function HomePage(props: Readonly<{
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await props.params
  const locales = getValidLocale(locale)
  const key = getStartPageKey()
  const { isEnabled: isDraftModeEnabled } = await draftMode()
  if (isDraftModeEnabled) {
    return (
      <Suspense fallback={<DraftModeLoader />}>
        <DraftModeHomePage locales={locales} />
      </Suspense>
    )
  }

  const pageResponse = await optimizely.GetStartPage({ locales, key } as never)

  const startPage = (pageResponse as any).data?._Content?.item
  const blocks = (startPage?.blocks ?? []).filter(
    (block: unknown) => block !== null && block !== undefined
  )

  return (
    <Suspense>
      <ContentAreaMapper blocks={blocks} />
    </Suspense>
  )
}
