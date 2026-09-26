// Terminal output ke chhote helpers. Colors pehle search aur pipeline
// dono me alag-alag likhe the — yahan ek jagah aa gaye.

export const dim = (s) => `\x1b[2m${s}\x1b[0m`;
export const bold = (s) => `\x1b[1m${s}\x1b[0m`;
export const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

// Score ko nazar se compare karne layak banata hai
export const scoreBar = (score) => '█'.repeat(Math.round(score * 20)).padEnd(20, '·');

export const pageLabel = ({ pageStart, pageEnd }) =>
  pageStart === pageEnd ? `p.${pageStart}` : `p.${pageStart}-${pageEnd}`;

// Lambi line ko terminal width me tod deta hai
export function wrap(text, indent = '  ') {
  return text.replace(/(.{1,88})(\s|$)/g, `${indent}$1\n`).trimEnd();
}
