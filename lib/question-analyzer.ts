/**
 * Simplified Question Analyzer
 *
 * The "intelligence" now lives in the universal synthesis prompt.
 * This module only extracts options and detects if money is involved.
 */

/**
 * Extract the two options from a "X or Y" style question.
 * Returns empty array if no clear options found.
 */
export function extractOptions(question: string): string[] {
  // "Should I do X or Y?" pattern
  const orPattern = /(.+?)\s+(?:or|vs\.?)\s+(.+?)(?:\?|$)/i;
  const match = question.match(orPattern);

  if (match && match[1].length < 100 && match[2].length < 100) {
    return [
      cleanOption(match[1]),
      cleanOption(match[2])
    ];
  }

  return [];
}

/**
 * Remove common question prefixes from options.
 */
function cleanOption(text: string): string {
  return text
    .replace(/^(should i|do i|is it better to|can i|what if i|would it be better to)/i, '')
    .trim();
}

/**
 * Simple check if question involves money.
 * Used to conditionally include "Critical Numbers" section in synthesis.
 */
export function detectMoney(question: string, options: string[] = []): boolean {
  const text = (question + ' ' + options.join(' ')).toLowerCase();
  return /\$|dollar|money|income|salary|pay|cost|price|equity|bitcoin|crypto|investment/i.test(text);
}
