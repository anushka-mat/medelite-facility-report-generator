import { NextResponse } from 'next/server'

type CmsFacility = {
  [key: string]: string | number | null | undefined
}

const CMS_PROVIDER_INFO_ENDPOINT =
  'https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0'

function cleanValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not available'
  return String(value)
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getField(record: CmsFacility | null, fieldName: string): string {
  if (!record) return 'Not available'

  const exactValue = record[fieldName]

  if (exactValue !== undefined && exactValue !== null && exactValue !== '') {
    return cleanValue(exactValue)
  }

  const targetKey = normalizeKey(fieldName)
  const matchingKey = Object.keys(record).find((key) => normalizeKey(key) === targetKey)

  if (!matchingKey) return 'Not available'

  return cleanValue(record[matchingKey])
}

function parseCmsRows(json: unknown): CmsFacility[] {
  if (Array.isArray(json)) return json as CmsFacility[]

  if (json && typeof json === 'object') {
    const obj = json as {
      results?: CmsFacility[]
      data?: CmsFacility[]
      rows?: CmsFacility[]
    }

    if (Array.isArray(obj.results)) return obj.results
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.rows)) return obj.rows
  }

  return []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ccn = searchParams.get('ccn')?.trim()

  if (!ccn) {
    return NextResponse.json(
      { error: 'Please enter a valid CCN.' },
      { status: 400 }
    )
  }

  try {
    const url = new URL(CMS_PROVIDER_INFO_ENDPOINT)
    url.searchParams.append('conditions[0][property]', 'cms_certification_number_ccn')
    url.searchParams.append('conditions[0][value]', ccn)
    url.searchParams.append('conditions[0][operator]', '=')

    const response = await fetch(url.toString(), {
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `CMS API request failed with status ${response.status}.` },
        { status: 502 }
      )
    }

    const json = await response.json()
    const rows = parseCmsRows(json)

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: `No CMS facility record found for CCN ${ccn}.` },
        { status: 404 }
      )
    }

    const matchingRow =
      rows.find((row) => getField(row, 'CMS Certification Number (CCN)') === ccn) ??
      rows[0]

    const returnedCcn = getField(matchingRow, 'CMS Certification Number (CCN)')

    if (returnedCcn !== ccn) {
      return NextResponse.json(
        {
          error: `CMS returned data, but it did not match CCN ${ccn}. Returned CCN was ${returnedCcn}.`,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      facility: matchingRow,
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not fetch CMS data from the CMS Provider Data Catalog.' },
      { status: 500 }
    )
  }
}