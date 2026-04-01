// IEEE Citation Formatting — structured segment output
// Follows IEEE Reference Guide patterns for all 33 reference types.

import type { TAuthor, TIEEEReference, TReferenceType } from "./references.js"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TCitationSegment {
    text: string
    role:
        | "authors"
        | "title"
        | "bookTitle"
        | "publisher"
        | "location"
        | "year"
        | "date"
        | "edition"
        | "pages"
        | "volume"
        | "issue"
        | "doi"
        | "url"
        | "isbn"
        | "accessedDate"
        | "institution"
        | "degree"
        | "organization"
        | "standardNumber"
        | "reportNumber"
        | "patentNumber"
        | "country"
        | "platform"
        | "separator"
        | "prefix"
        | "suffix"
        | "misc"
    style?: "italic" | "quoted" | "link" | "plain"
}

export interface TCitationFormatResult {
    type: TReferenceType
    segments: TCitationSegment[]
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Format a single structured author into IEEE citation style.
 * Given names are abbreviated to initials with periods: "Jane Marie" → "J. M."
 * Suffix is appended without comma: "W. P. Pratt Jr."
 */
export function formatSingleAuthor(author: TAuthor): string {
    const initials = author.givenNames
        .split(/\s+/)
        .map((name) => `${name.charAt(0)}.`)
        .join(" ")
    const name = `${initials} ${author.familyName}`
    return author.suffix ? `${name} ${author.suffix}` : name
}

/**
 * Format an array of structured author names into IEEE citation style.
 * 7+ authors → first author + " et al."
 * 2 authors → "A and B"
 * 3–6 authors → "A, B, C, and D"
 */
export function formatNamesInCitation(authors: TAuthor[]): string {
    if (authors.length === 0) return ""
    if (authors.length > 6) {
        return `${formatSingleAuthor(authors[0])} et al.`
    }
    const formatted = authors.map(formatSingleAuthor)
    if (formatted.length === 1) return formatted[0]
    if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`
    return `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`
}

/**
 * Build a structured citation for any IEEE reference type.
 * Returns an array of typed segments that consumers can render into
 * plain text, HTML, or any other format.
 */
export function formatCitationParts(
    ref: TIEEEReference
): TCitationFormatResult {
    const builder = BUILDERS[ref.type]
    return {
        type: ref.type,
        segments: builder(ref as unknown as Record<string, unknown>),
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sep(text: string): TCitationSegment {
    return { text, role: "separator" }
}

const IEEE_MONTHS = [
    "Jan.",
    "Feb.",
    "Mar.",
    "Apr.",
    "May",
    "Jun.",
    "Jul.",
    "Aug.",
    "Sep.",
    "Oct.",
    "Nov.",
    "Dec.",
]

function formatDate(d: Date): string {
    const month = IEEE_MONTHS[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    return `${month} ${day}, ${year}`
}

// ---------------------------------------------------------------------------
// Per-type segment builders
// ---------------------------------------------------------------------------

type TSegmentBuilder = (ref: Record<string, unknown>) => TCitationSegment[]

function bookSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.title as string, role: "title", style: "italic" })
    if (ref.edition !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: ref.edition as string, role: "edition" })
        segs.push({ text: " ed.", role: "suffix" })
    }
    if (ref.location !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: ref.location as string, role: "location" })
    }
    segs.push(sep(": "))
    segs.push({ text: ref.publisher as string, role: "publisher" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep("."))
    if (ref.isbn !== undefined) {
        segs.push(sep(" "))
        segs.push({ text: ref.isbn as string, role: "isbn" })
    }
    return segs
}

function websiteSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(". "))
    segs.push({
        text: ref.pageTitle as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(". "))
    segs.push({
        text: ref.websiteTitle as string,
        role: "misc",
        style: "italic",
    })
    segs.push(sep(". "))
    segs.push({ text: "Accessed: ", role: "prefix" })
    segs.push({
        text: formatDate(ref.accessedDate as Date),
        role: "accessedDate",
    })
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function bookChapterSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.chapterTitle as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", in "))
    segs.push({
        text: ref.bookTitle as string,
        role: "bookTitle",
        style: "italic",
    })
    if (ref.editors !== undefined) {
        const editors = ref.editors as TAuthor[]
        if (editors.length > 0) {
            segs.push(sep(", "))
            segs.push({
                text: formatNamesInCitation(editors),
                role: "misc",
            })
            segs.push({ text: ", Eds.", role: "suffix" })
        }
    }
    segs.push(sep(". "))
    segs.push({ text: ref.location as string, role: "location" })
    segs.push(sep(": "))
    segs.push({ text: ref.publisher as string, role: "publisher" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    if (ref.pages !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: "pp. ", role: "prefix" })
        segs.push({ text: ref.pages as string, role: "pages" })
    }
    segs.push(sep("."))
    if (ref.isbn !== undefined) {
        segs.push(sep(" "))
        segs.push({ text: ref.isbn as string, role: "isbn" })
    }
    return segs
}

function handbookSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    if (ref.edition !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: ref.edition as string, role: "edition" })
        segs.push({ text: " ed.", role: "suffix" })
    }
    segs.push(sep(". "))
    segs.push({ text: ref.location as string, role: "location" })
    segs.push(sep(": "))
    segs.push({ text: ref.publisher as string, role: "publisher" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep("."))
    if (ref.isbn !== undefined) {
        segs.push(sep(" "))
        segs.push({ text: ref.isbn as string, role: "isbn" })
    }
    return segs
}

function technicalReportSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.institution as string, role: "institution" })
    segs.push(sep(", "))
    segs.push({ text: ref.location as string, role: "location" })
    segs.push(sep(", "))
    segs.push({ text: "Rep. ", role: "prefix" })
    segs.push({ text: ref.reportNumber as string, role: "reportNumber" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep("."))
    return segs
}

function standardSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.standardNumber as string,
        role: "standardNumber",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.organization as string, role: "organization" })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function thesisSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.degree as string, role: "degree" })
    segs.push({ text: " thesis", role: "suffix" })
    segs.push(sep(", "))
    segs.push({ text: ref.institution as string, role: "institution" })
    segs.push(sep(", "))
    segs.push({ text: ref.location as string, role: "location" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep("."))
    return segs
}

function patentSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.inventors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.country as string, role: "country" })
    segs.push({ text: " Patent ", role: "prefix" })
    segs.push({ text: ref.patentNumber as string, role: "patentNumber" })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function dictionarySegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(". "))
    segs.push({ text: ref.publisher as string, role: "publisher" })
    if (ref.edition !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: ref.edition as string, role: "edition" })
        segs.push({ text: " ed.", role: "suffix" })
    }
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep("."))
    return segs
}

function encyclopediaSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(". "))
    segs.push({ text: ref.publisher as string, role: "publisher" })
    if (ref.edition !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: ref.edition as string, role: "edition" })
        segs.push({ text: " ed.", role: "suffix" })
    }
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep("."))
    return segs
}

function journalArticleSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.journalTitle as string,
        role: "misc",
        style: "italic",
    })
    if (ref.volume !== undefined) {
        segs.push(sep(", vol. "))
        segs.push({ text: ref.volume as string, role: "volume" })
    }
    if (ref.issue !== undefined) {
        segs.push(sep(", no. "))
        segs.push({ text: ref.issue as string, role: "issue" })
    }
    if (ref.pages !== undefined) {
        segs.push(sep(", pp. "))
        segs.push({ text: ref.pages as string, role: "pages" })
    }
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    if (ref.doi !== undefined) {
        segs.push(sep(", doi: "))
        segs.push({ text: ref.doi as string, role: "doi" })
    }
    segs.push(sep("."))
    return segs
}

function magazineArticleSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.magazineTitle as string,
        role: "misc",
        style: "italic",
    })
    if (ref.volume !== undefined) {
        segs.push(sep(", vol. "))
        segs.push({ text: ref.volume as string, role: "volume" })
    }
    if (ref.issue !== undefined) {
        segs.push(sep(", no. "))
        segs.push({ text: ref.issue as string, role: "issue" })
    }
    if (ref.pages !== undefined) {
        segs.push(sep(", pp. "))
        segs.push({ text: ref.pages as string, role: "pages" })
    }
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep("."))
    return segs
}

function newspaperArticleSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.newspaperTitle as string,
        role: "misc",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    if (ref.pages !== undefined) {
        segs.push(sep(", pp. "))
        segs.push({ text: ref.pages as string, role: "pages" })
    }
    segs.push(sep("."))
    return segs
}

function conferencePaperSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({ text: "presented at ", role: "prefix" })
    segs.push({
        text: ref.conferenceName as string,
        role: "misc",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.location as string, role: "location" })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    if (ref.pages !== undefined) {
        segs.push(sep(", pp. "))
        segs.push({ text: ref.pages as string, role: "pages" })
    }
    if (ref.doi !== undefined) {
        segs.push(sep(", doi: "))
        segs.push({ text: ref.doi as string, role: "doi" })
    }
    segs.push(sep("."))
    return segs
}

function conferenceProceedingsSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    if (ref.editors !== undefined) {
        const editors = ref.editors as TAuthor[]
        if (editors.length > 0) {
            segs.push({
                text: formatNamesInCitation(editors),
                role: "authors",
                style: "plain",
            })
            segs.push({ text: ", Eds.", role: "suffix" })
            segs.push(sep(", "))
        }
    }
    segs.push({
        text: ref.conferenceName as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.location as string, role: "location" })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep(". "))
    segs.push({ text: ref.publisher as string, role: "publisher" })
    if (ref.isbn !== undefined) {
        segs.push(sep(". "))
        segs.push({ text: ref.isbn as string, role: "isbn" })
    }
    segs.push(sep("."))
    return segs
}

function datasetSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    if (ref.authors !== undefined) {
        const authors = ref.authors as TAuthor[]
        if (authors.length > 0) {
            segs.push({
                text: formatNamesInCitation(authors),
                role: "authors",
                style: "plain",
            })
            segs.push(sep(", "))
        }
    }
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.repository as string, role: "misc" })
    if (ref.version !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: "ver. ", role: "prefix" })
        segs.push({ text: ref.version as string, role: "misc" })
    }
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    if (ref.doi !== undefined) {
        segs.push(sep(", doi: "))
        segs.push({ text: ref.doi as string, role: "doi" })
    }
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function softwareSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    if (ref.authors !== undefined) {
        const authors = ref.authors as TAuthor[]
        if (authors.length > 0) {
            segs.push({
                text: formatNamesInCitation(authors),
                role: "authors",
                style: "plain",
            })
            segs.push(sep(", "))
        }
    }
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    if (ref.version !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: "ver. ", role: "prefix" })
        segs.push({ text: ref.version as string, role: "misc" })
    }
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    if (ref.publisher !== undefined) {
        segs.push(sep(". "))
        segs.push({ text: ref.publisher as string, role: "publisher" })
    }
    if (ref.doi !== undefined) {
        segs.push(sep(". "))
        segs.push({ text: "doi: ", role: "prefix" })
        segs.push({ text: ref.doi as string, role: "doi" })
    }
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function onlineDocumentSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    if (ref.authors !== undefined) {
        const authors = ref.authors as TAuthor[]
        if (authors.length > 0) {
            segs.push({
                text: formatNamesInCitation(authors),
                role: "authors",
                style: "plain",
            })
            segs.push(sep(". "))
        }
    }
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    if (ref.publisher !== undefined) {
        segs.push(sep(". "))
        segs.push({ text: ref.publisher as string, role: "publisher" })
    }
    segs.push(sep(". "))
    segs.push({ text: "Accessed: ", role: "prefix" })
    segs.push({
        text: formatDate(ref.accessedDate as Date),
        role: "accessedDate",
    })
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function blogSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatSingleAuthor(ref.author as TAuthor),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.postTitle as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.blogName as string,
        role: "misc",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep(". "))
    segs.push({ text: "Accessed: ", role: "prefix" })
    segs.push({
        text: formatDate(ref.accessedDate as Date),
        role: "accessedDate",
    })
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function socialMediaSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatSingleAuthor(ref.author as TAuthor),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(". "))
    segs.push({ text: ref.platform as string, role: "platform" })
    segs.push(sep(". "))
    segs.push({
        text: formatDate(ref.postDate as Date),
        role: "date",
    })
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function preprintSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatNamesInCitation(ref.authors as TAuthor[]),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.server as string, role: "misc", style: "italic" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    if (ref.doi !== undefined) {
        segs.push(sep(", doi: "))
        segs.push({ text: ref.doi as string, role: "doi" })
    }
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function videoSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    if (ref.authors !== undefined) {
        const authors = ref.authors as TAuthor[]
        if (authors.length > 0) {
            segs.push({
                text: formatNamesInCitation(authors),
                role: "authors",
                style: "plain",
            })
            segs.push(sep(". "))
        }
    }
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(". "))
    segs.push({ text: ref.platform as string, role: "platform" })
    if (ref.releaseDate !== undefined) {
        segs.push(sep(". "))
        segs.push({
            text: formatDate(ref.releaseDate as Date),
            role: "date",
        })
    }
    segs.push(sep(". "))
    segs.push({ text: "Accessed: ", role: "prefix" })
    segs.push({
        text: formatDate(ref.accessedDate as Date),
        role: "accessedDate",
    })
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function podcastSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    if (ref.authors !== undefined) {
        const authors = ref.authors as TAuthor[]
        if (authors.length > 0) {
            segs.push({
                text: formatNamesInCitation(authors),
                role: "authors",
                style: "plain",
            })
            segs.push(sep(". "))
        }
    }
    segs.push({
        text: ref.episodeTitle as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", in "))
    segs.push({
        text: ref.seriesTitle as string,
        role: "misc",
        style: "italic",
    })
    segs.push(sep(". "))
    segs.push({ text: ref.platform as string, role: "platform" })
    segs.push(sep(". "))
    segs.push({ text: "Accessed: ", role: "prefix" })
    segs.push({
        text: formatDate(ref.accessedDate as Date),
        role: "accessedDate",
    })
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function courseSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatSingleAuthor(ref.instructor as TAuthor),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.institution as string, role: "institution" })
    if (ref.courseCode !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: ref.courseCode as string, role: "misc" })
    }
    segs.push(sep(", "))
    segs.push({ text: ref.term as string, role: "misc" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep("."))
    return segs
}

function presentationSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatSingleAuthor(ref.presenter as TAuthor),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "quoted",
    })
    segs.push(sep(", "))
    segs.push({ text: "presented at ", role: "prefix" })
    segs.push({
        text: ref.eventTitle as string,
        role: "misc",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.location as string, role: "location" })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function interviewSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatSingleAuthor(ref.interviewee as TAuthor),
        role: "authors",
        style: "plain",
    })
    if (ref.interviewer !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: "interviewed by ", role: "prefix" })
        segs.push({
            text: formatSingleAuthor(ref.interviewer as TAuthor),
            role: "misc",
        })
    }
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function personalCommunicationSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatSingleAuthor(ref.person as TAuthor),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({ text: "personal communication", role: "misc" })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function emailSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: formatSingleAuthor(ref.sender as TAuthor),
        role: "authors",
        style: "plain",
    })
    segs.push(sep(", "))
    segs.push({ text: "email to ", role: "prefix" })
    segs.push({
        text: formatSingleAuthor(ref.recipient as TAuthor),
        role: "misc",
    })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function lawSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.jurisdiction as string, role: "misc" })
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.dateEnacted as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function courtCaseSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: ref.caseName as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.court as string, role: "misc" })
    if (ref.reporter !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: ref.reporter as string, role: "misc" })
    }
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function governmentPublicationSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    if (ref.authors !== undefined) {
        const authors = ref.authors as TAuthor[]
        if (authors.length > 0) {
            segs.push({
                text: formatNamesInCitation(authors),
                role: "authors",
                style: "plain",
            })
            segs.push(sep(", "))
        }
    }
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.agency as string, role: "organization" })
    segs.push(sep(", "))
    segs.push({ text: ref.location as string, role: "location" })
    if (ref.reportNumber !== undefined) {
        segs.push(sep(", "))
        segs.push({ text: "Rep. ", role: "prefix" })
        segs.push({ text: ref.reportNumber as string, role: "reportNumber" })
    }
    segs.push(sep(", "))
    segs.push({
        text: formatDate(ref.date as Date),
        role: "date",
    })
    segs.push(sep("."))
    return segs
}

function datasheetSegments(ref: Record<string, unknown>): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.manufacturer as string, role: "publisher" })
    segs.push(sep(", "))
    segs.push({ text: ref.partNumber as string, role: "misc" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    segs.push(sep(". "))
    segs.push({ text: "[Online]. Available: ", role: "prefix" })
    segs.push({ text: ref.url as string, role: "url", style: "link" })
    return segs
}

function productManualSegments(
    ref: Record<string, unknown>
): TCitationSegment[] {
    const segs: TCitationSegment[] = []
    segs.push({
        text: ref.title as string,
        role: "title",
        style: "italic",
    })
    segs.push(sep(", "))
    segs.push({ text: ref.manufacturer as string, role: "publisher" })
    segs.push(sep(", "))
    segs.push({ text: ref.model as string, role: "misc" })
    segs.push(sep(", "))
    segs.push({ text: ref.year as string, role: "year" })
    if (ref.url !== undefined) {
        segs.push(sep(". "))
        segs.push({ text: "[Online]. Available: ", role: "prefix" })
        segs.push({ text: ref.url as string, role: "url", style: "link" })
    }
    segs.push(sep("."))
    return segs
}

// ---------------------------------------------------------------------------
// Builder dispatch map
// ---------------------------------------------------------------------------

const BUILDERS: Record<TReferenceType, TSegmentBuilder> = {
    Book: bookSegments,
    Website: websiteSegments,
    BookChapter: bookChapterSegments,
    Handbook: handbookSegments,
    TechnicalReport: technicalReportSegments,
    Standard: standardSegments,
    Thesis: thesisSegments,
    Patent: patentSegments,
    Dictionary: dictionarySegments,
    Encyclopedia: encyclopediaSegments,
    JournalArticle: journalArticleSegments,
    MagazineArticle: magazineArticleSegments,
    NewspaperArticle: newspaperArticleSegments,
    ConferencePaper: conferencePaperSegments,
    ConferenceProceedings: conferenceProceedingsSegments,
    Dataset: datasetSegments,
    Software: softwareSegments,
    OnlineDocument: onlineDocumentSegments,
    Blog: blogSegments,
    SocialMedia: socialMediaSegments,
    Preprint: preprintSegments,
    Video: videoSegments,
    Podcast: podcastSegments,
    Course: courseSegments,
    Presentation: presentationSegments,
    Interview: interviewSegments,
    PersonalCommunication: personalCommunicationSegments,
    Email: emailSegments,
    Law: lawSegments,
    CourtCase: courtCaseSegments,
    GovernmentPublication: governmentPublicationSegments,
    Datasheet: datasheetSegments,
    ProductManual: productManualSegments,
}
