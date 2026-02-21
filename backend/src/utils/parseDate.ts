/**
 * Supported input formats (all interpreted as UTC when no timezone is given):
 *  - YYYY-MM-DD
 *  - YYYY-MM-DDTHH:mm:ss
 *  - YYYY-MM-DDTHH:mm:ss.sss
 *  - YYYY-MM-DDTHH:mm:ssZ
 *  - YYYY-MM-DDTHH:mm:ss.sssZ
 *  - YYYY-MM-DDTHH:mm:ss+HH:MM  (any UTC offset)
 */
const SUPPORTED_FORMATS = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
];

/**
 * Parses a flexible date string into a UTC ISO-8601 string.
 *
 * - Date-only strings (YYYY-MM-DD) are treated as midnight UTC.
 * - Datetimes without a timezone offset are assumed to be UTC.
 * - Datetimes with an explicit offset are converted to UTC.
 *
 * Throws a descriptive `Error` when the input cannot be parsed.
 */
export function parseFlexibleDate(value: string): string {
    const isRecognisedFormat = SUPPORTED_FORMATS.some((re) => re.test(value));

    if (!isRecognisedFormat) {
        throw new Error(
            `Invalid date format: "${value}". ` +
            `Accepted formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ssZ, YYYY-MM-DDTHH:mm:ss+HH:MM`
        );
    }

    // Append Z for formats that have no timezone so Date() parses them as UTC
    const normalised = /Z|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
    const date = new Date(normalised);

    if (isNaN(date.getTime())) {
        throw new Error(`Date "${value}" is structurally valid but contains an out-of-range value (check month/day).`);
    }

    return date.toISOString();
}
