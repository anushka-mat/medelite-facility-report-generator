'use client'

import { useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'

type CmsFacility = {
  [key: string]: string | number | null | undefined
}

type ManualInputs = {
  overrideName: string
  emr: string
  currentCensus: string
  patientType: string
  previousCoverage: string
  previousPerformance: string
  medicalCoverage: string
}

type ReportRow = {
  label: string
  value: string
  source: 'CMS' | 'Manual' | 'Derived'
}

const initialManualInputs: ManualInputs = {
  overrideName: '',
  emr: 'PCC',
  currentCensus: '112',
  patientType: 'Long-term & Short-term',
  previousCoverage: 'Yes',
  previousPerformance: 'About 30 patients/day',
  medicalCoverage: 'Optometry, PCP, Podiatry',
}

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

function buildLocation(record: CmsFacility | null): string {
  if (!record) return 'Not available'

  const directLocation = getField(record, 'Location')

  if (directLocation !== 'Not available') {
    return directLocation
  }

  const address = getField(record, 'Provider Address')
  const city = getField(record, 'City/Town')
  const state = getField(record, 'State')
  const zip = getField(record, 'ZIP Code')

  const parts = [address, city, state, zip].filter((part) => part !== 'Not available')
  return parts.length > 0 ? parts.join(', ') : 'Not available'
}

function getReportFacilityName(record: CmsFacility | null, overrideName: string): string {
  const trimmedOverride = overrideName.trim()

  if (trimmedOverride.length > 0) {
    return trimmedOverride
  }

  return getField(record, 'Provider Name')
}

function getMedicareUrl(ccn: string): string {
  return `https://www.medicare.gov/care-compare/details/nursing-home/${ccn}/view-all`
}

function isRatingLabel(label: string): boolean {
  return [
    'Overall Star Rating',
    'Health Inspection',
    'Staffing',
    'Quality of Resident Care',
  ].includes(label)
}

function formatRating(value: string): string {
  const rating = Number(value)

  if (!Number.isFinite(rating)) return value

  const rounded = Math.max(0, Math.min(5, Math.round(rating)))
  const filledStars = '★'.repeat(rounded)
  const emptyStars = '☆'.repeat(5 - rounded)

  return `${rating} / 5 ${filledStars}${emptyStars}`
}

function getRatingNumber(value: string): number {
  const rating = Number(value)

  if (!Number.isFinite(rating)) return 0

  return Math.max(0, Math.min(5, rating))
}

function getPdfRowValue(row: ReportRow): string {
  if (!isRatingLabel(row.label)) {
    return row.value
  }

  const rating = row.value.split('/')[0].trim()

  if (!rating || rating === 'Not available') {
    return row.value
  }

  return `${rating} / 5`
}

function RatingCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  const rating = getRatingNumber(value)
  const rounded = Math.round(rating)
  const filledStars = rating ? '★'.repeat(rounded) : ''
  const emptyStars = rating ? '☆'.repeat(5 - rounded) : ''
  const widthPercent = `${(rating / 5) * 100}%`

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-2xl font-bold text-slate-900">
        {rating ? `${rating} / 5` : 'N/A'}
      </div>

      <div className="mt-1 text-sm font-semibold text-yellow-500">
        {rating ? `${filledStars}${emptyStars}` : 'Not available'}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-yellow-500"
          style={{ width: widthPercent }}
        />
      </div>

      <div className="mt-2 text-xs font-medium text-slate-500">
        Source: CMS API
      </div>
    </div>
  )
}

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${compact ? 'gap-2' : 'gap-3'}`}>
      <svg
        width={compact ? '58' : '82'}
        height={compact ? '34' : '46'}
        viewBox="0 0 140 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Infinite logo mark"
      >
        <path
          d="M41 40C25 18 8 23 8 43C8 63 30 68 47 48C56 37 62 26 70 20"
          stroke="#d000b8"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M99 40C115 18 132 23 132 43C132 63 110 68 93 48C84 37 78 26 70 20"
          stroke="#6b7280"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M41 40C51 55 62 59 70 50C78 59 89 55 99 40"
          stroke="#d000b8"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M70 50C78 59 89 55 99 40"
          stroke="#6b7280"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="leading-tight">
        <div
          className={
            compact
              ? 'text-2xl font-bold tracking-[0.24em] text-fuchsia-600'
              : 'text-3xl font-bold tracking-[0.28em] text-fuchsia-600'
          }
        >
          INFINITE
        </div>
        <div
          className={
            compact
              ? 'text-xs font-semibold tracking-wide'
              : 'text-sm font-semibold tracking-wide'
          }
        >
          <span className="font-semibold text-sky-600">Managed by </span>
          <span className="font-bold text-slate-500">MED</span>
          <span className="font-bold text-sky-800">ELITE</span>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [ccn, setCcn] = useState('686123')
  const [facility, setFacility] = useState<CmsFacility | null>(null)
  const [manualInputs, setManualInputs] = useState<ManualInputs>(initialManualInputs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastFetchedCcn, setLastFetchedCcn] = useState('')

  const reportRows: ReportRow[] = useMemo(() => {
    if (!facility) return []

    return [
      {
        label: 'Name of Facility',
        value: getReportFacilityName(facility, manualInputs.overrideName),
        source: manualInputs.overrideName.trim() ? 'Manual' : 'CMS',
      },
      {
        label: 'Location',
        value: buildLocation(facility),
        source: 'CMS',
      },
      {
        label: 'EMR',
        value: cleanValue(manualInputs.emr),
        source: 'Manual',
      },
      {
        label: 'Census Capacity',
        value: getField(facility, 'Number of Certified Beds'),
        source: 'CMS',
      },
      {
        label: 'Current Census',
        value: cleanValue(manualInputs.currentCensus),
        source: 'Manual',
      },
      {
        label: 'Type of Patient',
        value: cleanValue(manualInputs.patientType),
        source: 'Manual',
      },
      {
        label: 'Previous Coverage from Medelite',
        value: cleanValue(manualInputs.previousCoverage),
        source: 'Manual',
      },
      {
        label: 'Previous Provider Performance from Medelite',
        value: cleanValue(manualInputs.previousPerformance),
        source: 'Manual',
      },
      {
        label: 'Medical Coverage',
        value: cleanValue(manualInputs.medicalCoverage),
        source: 'Manual',
      },
      {
        label: 'Overall Star Rating',
        value: formatRating(getField(facility, 'Overall Rating')),
        source: 'CMS',
      },
      {
        label: 'Health Inspection',
        value: formatRating(getField(facility, 'Health Inspection Rating')),
        source: 'CMS',
      },
      {
        label: 'Staffing',
        value: formatRating(getField(facility, 'Staffing Rating')),
        source: 'CMS',
      },
      {
        label: 'Quality of Resident Care',
        value: formatRating(getField(facility, 'QM Rating')),
        source: 'CMS',
      },
    ]
  }, [facility, manualInputs])

  const stateCode = facility ? getField(facility, 'State') : 'STATE'
  const medicareUrl = lastFetchedCcn ? getMedicareUrl(lastFetchedCcn) : ''

  const ratingCards = facility
    ? [
        {
          title: 'Overall Rating',
          value: getField(facility, 'Overall Rating'),
        },
        {
          title: 'Health Inspection',
          value: getField(facility, 'Health Inspection Rating'),
        },
        {
          title: 'Staffing',
          value: getField(facility, 'Staffing Rating'),
        },
        {
          title: 'Quality Care',
          value: getField(facility, 'QM Rating'),
        },
      ]
    : []

  async function fetchFacility() {
    const trimmedCcn = ccn.trim()

    if (!trimmedCcn) {
      setError('Please enter a valid CCN.')
      return
    }

    setLoading(true)
    setError('')
    setFacility(null)

    try {
      const response = await fetch(`/api/facility?ccn=${encodeURIComponent(trimmedCcn)}`)
      const json = (await response.json()) as {
        facility?: CmsFacility
        error?: string
      }

      if (!response.ok) {
        throw new Error(json.error ?? `Request failed with status ${response.status}.`)
      }

      if (!json.facility) {
        throw new Error('No facility data returned.')
      }

      setFacility(json.facility)
      setLastFetchedCcn(trimmedCcn)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not fetch CMS data.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function updateManualInput(field: keyof ManualInputs, value: string) {
    setManualInputs((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function downloadPdf() {
    if (!facility) {
      setError('Fetch a facility before downloading the PDF.')
      return
    }

    const doc = new jsPDF('p', 'pt', 'letter')
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 48
    const tableWidth = pageWidth - margin * 2
    const labelWidth = 260
    const valueWidth = tableWidth - labelWidth
    const rowHeight = 26

    let y = 48

    const logoX = pageWidth / 2 - 140
    const logoY = y - 2

    doc.setLineWidth(2.4)

    doc.setDrawColor(208, 0, 184)
    doc.ellipse(logoX + 14, logoY, 15, 9, 'S')

    doc.setDrawColor(95, 102, 112)
    doc.ellipse(logoX + 37, logoY, 15, 9, 'S')

    doc.setDrawColor(208, 0, 184)
    doc.line(logoX + 24, logoY - 6, logoX + 37, logoY + 6)

    doc.setDrawColor(95, 102, 112)
    doc.line(logoX + 24, logoY + 6, logoX + 37, logoY - 6)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(208, 0, 184)
    doc.setFontSize(22)
    doc.text('INFINITE', logoX + 62, y)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)

    let brandSubX = logoX + 64
    const brandSubY = y + 14

    doc.setTextColor(2, 132, 199)
    doc.text('Managed by ', brandSubX, brandSubY)
    brandSubX += doc.getTextWidth('Managed by ')

    doc.setTextColor(107, 114, 128)
    doc.text('MED', brandSubX, brandSubY)
    brandSubX += doc.getTextWidth('MED')

    doc.setTextColor(3, 105, 161)
    doc.text('ELITE', brandSubX, brandSubY)

    doc.setTextColor(0, 0, 0)

    y += 44
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('FACILITY ASSESSMENT SNAPSHOT', pageWidth / 2, y, { align: 'center' })

    y += 18
    doc.setFontSize(11)
    doc.text(stateCode, pageWidth / 2, y, { align: 'center' })

    y += 24

    reportRows.forEach((row) => {
      if (y > 720) {
        doc.addPage()
        y = 48
      }

      doc.setDrawColor(40)
      doc.rect(margin, y, labelWidth, rowHeight)
      doc.rect(margin + labelWidth, y, valueWidth, rowHeight)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(row.label, margin + 8, y + 17)

      doc.setFont('helvetica', 'normal')
      doc.text(getPdfRowValue(row), margin + labelWidth + 8, y + 17, {
        maxWidth: valueWidth - 16,
      })

      y += rowHeight
    })

    y += 24

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Medicare Care Compare Source:', margin, y)

    y += 16
    doc.setTextColor(0, 0, 255)
    doc.setFont('helvetica', 'normal')
    doc.textWithLink(medicareUrl, margin, y, { url: medicareUrl })
    doc.setTextColor(0, 0, 0)

    y += 28
    doc.setFontSize(8)
    doc.text(
      'Generated from CMS Provider Data Catalog data and manual Medelite operational inputs.',
      margin,
      y
    )

    const fileName = `facility-assessment-${lastFetchedCcn}.pdf`
    doc.save(fileName)
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-center">
            <BrandLogo />

            <h1 className="mt-5 text-2xl font-bold tracking-wide">
              FACILITY ASSESSMENT SNAPSHOT
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              CMS-powered facility report generator for skilled nursing facility assessment.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">1. CMS CCN Lookup</h2>
              <p className="mt-1 text-sm text-slate-600">
                Enter a CMS Certification Number to fetch public facility data.
              </p>

              <label className="mt-4 block text-sm font-semibold">
                CCN
              </label>
              <input
                value={ccn}
                onChange={(event) => setCcn(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-fuchsia-500"
                placeholder="Example: 686123"
              />

              <button
                onClick={fetchFacility}
                disabled={loading}
                className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Fetching CMS Data...' : 'Fetch Facility'}
              </button>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {facility && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  CMS data loaded for {getField(facility, 'Provider Name')}.
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">2. Manual Operational Inputs</h2>
              <p className="mt-1 text-sm text-slate-600">
                These fields are internal Medelite inputs and do not come from CMS.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold">
                    Facility Name Override
                  </label>
                  <input
                    value={manualInputs.overrideName}
                    onChange={(event) =>
                      updateManualInput('overrideName', event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-fuchsia-500"
                    placeholder="Optional custom facility name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold">EMR</label>
                  <input
                    value={manualInputs.emr}
                    onChange={(event) => updateManualInput('emr', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-fuchsia-500"
                    placeholder="PCC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold">
                    Current Census
                  </label>
                  <input
                    value={manualInputs.currentCensus}
                    onChange={(event) =>
                      updateManualInput('currentCensus', event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-fuchsia-500"
                    placeholder="112"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold">
                    Type of Patient
                  </label>
                  <input
                    value={manualInputs.patientType}
                    onChange={(event) =>
                      updateManualInput('patientType', event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-fuchsia-500"
                    placeholder="Long-term & Short-term"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold">
                    Previous Coverage from Medelite
                  </label>
                  <select
                    value={manualInputs.previousCoverage}
                    onChange={(event) =>
                      updateManualInput('previousCoverage', event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-fuchsia-500"
                  >
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold">
                    Previous Provider Performance from Medelite
                  </label>
                  <input
                    value={manualInputs.previousPerformance}
                    onChange={(event) =>
                      updateManualInput('previousPerformance', event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-fuchsia-500"
                    placeholder="About 30 patients/day"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold">
                    Medical Coverage
                  </label>
                  <input
                    value={manualInputs.medicalCoverage}
                    onChange={(event) =>
                      updateManualInput('medicalCoverage', event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-fuchsia-500"
                    placeholder="Optometry, PCP, Podiatry"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold">3. Report Preview</h2>
                <p className="text-sm text-slate-600">
                  Preview the Facility Assessment Snapshot before downloading the PDF.
                </p>
              </div>

              <button
                onClick={downloadPdf}
                disabled={!facility}
                className="rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Download PDF
              </button>
            </div>

            {!facility ? (
              <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Fetch a facility using a valid CCN to generate the report preview.
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-300">
                <div className="border-b border-slate-300 bg-slate-50 px-4 py-5 text-center">
                  <BrandLogo compact />

                  <div className="mt-4 font-bold tracking-wide">
                    FACILITY ASSESSMENT SNAPSHOT
                  </div>
                  <div className="text-sm font-semibold">{stateCode}</div>
                </div>

                <div className="grid gap-3 border-b border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
                  {ratingCards.map((card) => (
                    <RatingCard
                      key={card.title}
                      title={card.title}
                      value={card.value}
                    />
                  ))}
                </div>

                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {reportRows.map((row) => (
                      <tr key={row.label} className="border-b border-slate-200">
                        <td className="w-1/2 border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold">
                          {row.label}
                        </td>
                        <td
                          className={`px-4 py-3 ${
                            isRatingLabel(row.label) ? 'font-semibold text-yellow-600' : ''
                          }`}
                        >
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="space-y-2 bg-slate-50 px-4 py-4 text-sm">
                  <div className="font-bold">Medicare Care Compare Source</div>
                  <a
                    href={medicareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-blue-700 underline"
                  >
                    {medicareUrl}
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
