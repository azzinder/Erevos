import { plainNumber, sameNumber } from './sms-invite';

// SMS conversations with several numbers: a group's MMS. Android keeps one conversation for the
// group; here it is named by its numbers, comma-separated, as the native SMS module gives it and
// as app/sms.tsx takes it in its address.

/** The numbers of an address: one, or a group's. Each once, as typed numbers are kept. */
export function smsNumbers(address: string): string[] {
  const numbers: string[] = [];
  for (const part of address.split(/[,;\n]/)) {
    const number = plainNumber(part);
    if (number.replace('+', '').length >= 3 && !numbers.some((n) => sameNumber(n, number))) numbers.push(number);
  }
  return numbers;
}

/** The address for these numbers, as the SMS screen takes it. */
export function smsAddress(numbers: string[]): string {
  return numbers.join(',');
}

/** Whether two addresses are the same conversation: the same numbers, in any order. */
export function sameAddress(a: string, b: string): boolean {
  const x = smsNumbers(a);
  const y = smsNumbers(b);
  return x.length > 0 && x.length === y.length && x.every((n) => y.some((m) => sameNumber(n, m)));
}

/** A group's name: its numbers, as the phone's contacts name them when allowed. */
export function groupName(numbers: string[], names: Record<string, string> = {}): string {
  return numbers.map((n) => names[n] || n).join(', ');
}
