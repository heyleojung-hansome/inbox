/** 영어 답 비교용 정규화 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\bi'm\b/g, "i am")
    .replace(/\b(he|she|it|that|what|where)'s\b/g, "$1 is")
    .replace(/\b(you|we|they)'re\b/g, "$1 are")
    .replace(/\bi'd\b/g, "i would")
    .replace(/\bi'll\b/g, "i will")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\b(\w+)n't\b/g, "$1 not")
    .replace(/\ba\.m\./g, "am")
    .replace(/\bp\.m\./g, "pm")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(" ") : [];
}

export type DiffOp = { op: "same" | "del" | "ins"; text: string };

/** 단어 단위 LCS diff. from = 학습자 답, to = 교정 문장 */
export function wordDiff(from: string, to: string): DiffOp[] {
  const a = from.trim().split(/\s+/).filter(Boolean);
  const b = to.trim().split(/\s+/).filter(Boolean);
  const key = (w: string) => normalize(w);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = key(a[i]) === key(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) {
      out.push({ op: "same", text: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ op: "del", text: a[i++] });
    } else {
      out.push({ op: "ins", text: b[j++] });
    }
  }
  while (i < n) out.push({ op: "del", text: a[i++] });
  while (j < m) out.push({ op: "ins", text: b[j++] });
  return out;
}

/** 토큰 기준 유사도 0~1 (편집 거리) */
export function similarity(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.length && !y.length) return 1;
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...new Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return 1 - d[x.length][y.length] / Math.max(x.length, y.length);
}
