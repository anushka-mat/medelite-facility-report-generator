# Medelite Facility Assessment Report Generator

CMS-powered facility assessment report generator built for the Medelite Healthcare Data Automation & QA Analytics technical case study.

The app allows a user to enter a nursing facility CCN, fetch public CMS facility data, combine it with manual Medelite operational inputs, preview a branded Facility Assessment Snapshot, and download a polished PDF report.

## Live Demo

Live URL: To be added after Vercel deployment

## Public Repository

https://github.com/anushka-mat/medelite-facility-report-generator

## Project Summary

This project is a lightweight web-based report generator for skilled nursing facility assessment.

A user can:

- Enter a CMS Certification Number, also called CCN
- Fetch public facility data from the CMS Provider Data Catalog
- Review CMS-driven fields such as location, bed capacity, and star ratings
- Edit Medelite-specific manual operational fields
- Override the facility name if Medelite uses a localized internal name
- View responsive CMS rating cards
- Download a polished PDF report
- Access the official Medicare Care Compare source link for the entered CCN

## Core Features Implemented

- Dynamic CCN lookup
- CMS Provider Data Catalog API fetch
- Facility name manual override
- Manual operational input fields
- Branded INFINITE / Managed by MEDELITE UI
- Branded PDF export
- Medicare Care Compare source hyperlink
- Responsive CMS rating cards
- Basic error handling for empty CCNs, invalid CCNs, failed API requests, and missing fields

## Bonus Features Implemented

- Custom high-fidelity design polish
- Complex responsive data cards / visual rating cards
- Basic boundary-case handling for invalid CCNs and missing API data

I did not implement the optional Word document export.

I did not implement the full 12 Hospitalization/ED metrics because those require a separate claims-based CMS dataset and additional state/national average mapping.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- jsPDF
- GitHub
- Vercel

## CMS API Endpoint Used

The app uses the CMS Provider Data Catalog Provider Information dataset.

Endpoint:

```text
https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0
```

The request filters by the entered CCN using:

```text
cms_certification_number_ccn
```

Example test CCN from the case study:

```text
686123
```

Additional test CCN used for validation:

```text
015009
```

## Data Mapping

| Report Field | Source Used | Notes |
|---|---|---|
| Name of Facility | CMS API with manual override | Defaults to CMS Provider Name unless the user enters a custom override |
| Location | CMS API | Pulled from CMS address/location fields |
| EMR | Manual Input | Internal Medelite operational field |
| Census Capacity | CMS API | Mapped to Number of Certified Beds |
| Current Census | Manual Input | Treated as manual based on the technical brief |
| Type of Patient | Manual Input | Internal Medelite operational field |
| Previous Coverage from Medelite | Manual Input | Yes/No selection |
| Previous Provider Performance from Medelite | Manual Input | Internal Medelite operational field |
| Medical Coverage | Manual Input | Internal Medelite operational field |
| Overall Star Rating | CMS API | Mapped to Overall Rating |
| Health Inspection | CMS API | Mapped to Health Inspection Rating |
| Staffing | CMS API | Mapped to Staffing Rating |
| Quality of Resident Care | CMS API | Mapped to QM Rating |

## Facility Name Override Logic

The app first fetches the official Provider Name from the CMS API.

If the Facility Name Override field is empty, the report uses the official CMS Provider Name.

If the user enters a custom name, the app trims that manual text and uses it in the report preview and PDF instead of the CMS Provider Name.

This keeps the raw CMS data dynamic while still allowing Medelite to use localized internal facility names when needed.

## Assumptions Made

### Current Census

The technical brief identifies Current Census as a manual operational input.

The visual snapshot template references Average Number of Residents per Day.

Because of that conflict, I treated Current Census as a manual input, following the technical brief as the controlling requirement.

### Live CMS Data vs Static Sample PDF

The app uses live CMS Provider Data Catalog data.

Because CMS data can refresh over time, some values may differ from the static Kendall Lakes reference PDF included in the case materials.

For example, the sample PDF contains fixed values, while the app fetches the current CMS values at runtime for the entered CCN.

### Hospitalization and ED Metrics

The case study lists the 12 Hospitalization/ED metrics as an optional bonus feature.

Since those metrics require separate claims-based CMS dataset mapping and state/national average mapping, the current version does not include those rows unless fully implemented.

I removed placeholder rows rather than displaying incomplete bonus data in the final report.

### Branding

The case study requires the report to preserve the static INFINITE platform name and not replace it with the facility name.

The app keeps INFINITE as the static brand header and places the facility name only inside the report body under Name of Facility.

Because no standalone official logo asset was provided, the app recreates the required INFINITE / Managed by MEDELITE branding using styled text and a lightweight vector mark.

## QA Strategy

I validated the app by:

- Testing the provided Kendall Lakes CCN 686123
- Testing an additional valid CCN
- Confirming that CMS data loads only after clicking Fetch Facility
- Confirming that manual fields update the report without triggering another API request
- Checking Chrome DevTools Network tab for the data.cms.gov request
- Verifying successful CMS API responses
- Testing empty CCN input
- Testing invalid CCN input
- Checking missing fields show as Not available
- Confirming the PDF download works
- Confirming the PDF uses numeric ratings instead of broken star characters
- Confirming the PDF includes the Medicare Care Compare source link
- Confirming the responsive rating cards update from CMS star rating fields

## Engineering Tradeoffs

### Client-side PDF Generation

I used jsPDF to generate the PDF directly in the browser.

This kept the app lightweight and avoided the need for a backend server.

### Star Ratings in PDF

Unicode star characters rendered correctly in the web UI but not consistently in the PDF export.

To avoid broken characters in the PDF, the web UI displays stars visually, while the PDF uses clean numeric ratings such as 5 / 5.

### Bonus Scope

I prioritized a complete working MVP, polished UI, responsive rating cards, GitHub repo, and deployment readiness over partially implementing the 12 Hospitalization/ED metrics.

This keeps the final submission reliable and avoids showing incomplete bonus data.

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

## Deployment

The app is intended to be deployed on Vercel after final code review.

The final Vercel URL will be added to this README and submitted in the Google Form.


## Author

Anushka Mathur