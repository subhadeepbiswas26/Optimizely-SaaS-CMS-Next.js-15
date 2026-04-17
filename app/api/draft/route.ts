import { draftMode } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'

import { optimizely } from '@/lib/optimizely/fetch'
import { getValidLocale } from '@/lib/optimizely/utils/language'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('preview_token')
  const context = searchParams.get('ctx')
  const key = searchParams.get('key')
  const ver = searchParams.get('ver')
  const loc = searchParams.get('loc')

  // Optimizely preview links can provide either `ctx` or `preview_token`
  if (!ver || !key || !loc || (!token && !context)) {
    return notFound()
  }

  const normalizedLocale = getValidLocale(loc.split('-')[0])

  const contentResponse = await optimizely.GetContentByKeyAndVersion(
    { key, ver },
    { preview: true }
  )

  if (contentResponse.errors) {
    const errorsMessage = contentResponse.errors
      .map((error) => error.message)
      .join(', ')

    return new NextResponse(errorsMessage, { status: 401 })
  }

  const content = contentResponse.data?._Content?.item
  if (!content) {
    return new NextResponse('Bad Request', { status: 400 })
  }
  ;(await draftMode()).enable()
  let newUrl = ''
  if (content.__typename === '_Experience') {
    newUrl = `/${normalizedLocale}/draft/${ver}/experience/${key}`
  } else if (content.__typename === '_Component') {
    newUrl = `/${normalizedLocale}/draft/${ver}/block/${key}`
  } else {
    // In hierarchical routing, the Start Page in Optimizely does not use "/" as its URL
    // but instead has a path like "/start-page". To normalize the URL and make it relative
    // to the Start Page, we remove the OPTIMIZELY_START_PAGE_URL prefix from the hierarchical URL.
    const hierarchicalUrl = content?._metadata?.url?.hierarchical?.replace(
      process.env.OPTIMIZELY_START_PAGE_URL ?? '',
      ''
    )

    const hierarchicalUrlWithoutLocale = hierarchicalUrl
      ?.replace(`/${loc}/`, '')
      ?.replace(`/${normalizedLocale}/`, '')
      ?.replace(/^\//, '')

    newUrl = hierarchicalUrlWithoutLocale
      ? `/${normalizedLocale}/draft/${ver}/${hierarchicalUrlWithoutLocale}`
      : `/${normalizedLocale}/draft/${ver}`
  }

  redirect(`${newUrl}`)
}
