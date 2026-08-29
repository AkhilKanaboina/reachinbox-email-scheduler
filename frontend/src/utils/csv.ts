import Papa from 'papaparse';
import { Lead } from '@/types';

export interface CSVParseResult {
  leads: Lead[];
  errors: string[];
  totalRows: number;
  duplicatesRemoved: number;
}

/**
 * Parses a CSV/TXT file of email leads using PapaParse.
 *
 * Supported formats:
 *   - CSV with headers: email,name  OR  email,first_name
 *   - Single-column CSV with just email addresses
 *   - Plain text with one email per line
 *
 * Processing steps:
 *   1. Parse with PapaParse (header detection)
 *   2. Validate each email address
 *   3. Deduplicate by lowercase email
 *   4. Return leads + validation errors
 *
 * All parsing runs in the browser — never sent to the server raw.
 */
export function parseLeadsFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const validationErrors: string[] = [];
    const rawLeads: Lead[] = [];

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete(results) {
        // Collect PapaParse parse errors
        if (results.errors.length > 0) {
          results.errors.slice(0, 5).forEach((e) => {
            validationErrors.push(`Parse error (row ${e.row ?? '?'}): ${e.message}`);
          });
        }

        results.data.forEach((row, idx) => {
          const rowNum = idx + 2; // +2 because row 1 = header

          // Try multiple common column names for email
          const email = (
            row['email'] ??
            row['email_address'] ??
            row['e-mail'] ??
            row['mail'] ??
            Object.values(row)[0] // fallback: first column
          )?.trim();

          if (!email) {
            validationErrors.push(`Row ${rowNum}: no email address found`);
            return;
          }

          // RFC 5322 simplified regex — catches obvious bad emails
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            validationErrors.push(`Row ${rowNum}: invalid email "${email}"`);
            return;
          }

          const name = (
            row['name'] ??
            row['first_name'] ??
            row['full_name'] ??
            row['contact_name'] ??
            ''
          ).trim() || undefined;

          rawLeads.push({ email, name });
        });

        // Deduplicate by lowercase email
        const seen = new Set<string>();
        const deduped: Lead[] = [];
        for (const lead of rawLeads) {
          const key = lead.email.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(lead);
          }
        }

        resolve({
          leads: deduped,
          errors: validationErrors,
          totalRows: results.data.length,
          duplicatesRemoved: rawLeads.length - deduped.length,
        });
      },
      error(error) {
        resolve({
          leads: [],
          errors: [`Failed to parse file: ${error.message}`],
          totalRows: 0,
          duplicatesRemoved: 0,
        });
      },
    });
  });
}
