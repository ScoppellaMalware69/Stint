import { describe, expect, it } from 'vitest';
import { escapeCsvCell, toCsv, type CsvValue } from '@/lib/csv';

describe('escapeCsvCell', () => {
  it.each<[CsvValue, string]>([
    [null, ''],
    [undefined, ''],
    ['', ''],
    [42, '42'],
    [-5, '-5'],
    [1.5, '1.5'],
    [Number.NaN, ''],
    [Number.POSITIVE_INFINITY, ''],
    [true, 'true'],
    [false, 'false'],
    ['plain text', 'plain text'],
    ['a=b', 'a=b'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['line\nbreak', '"line\nbreak"'],
    ['crlf\r\nrow', '"crlf\r\nrow"'],
  ])('%j → %j', (value, expected) => {
    expect(escapeCsvCell(value)).toBe(expected);
  });

  it.each([
    ['=SUM(A1:A2)', "'=SUM(A1:A2)"],
    ['+1 555 0100', "'+1 555 0100"],
    ['-2+3', "'-2+3"],
    ['@user', "'@user"],
    ['\tindent', "'\tindent"],
    ['=1,2', `"'=1,2"`],
    ['\rcmd', `"'\rcmd"`],
    ['=HYPERLINK("http://x","y")', `"'=HYPERLINK(""http://x"",""y"")"`],
  ])('neutralises the formula %j', (value, expected) => {
    expect(escapeCsvCell(value)).toBe(expected);
  });
});

describe('toCsv', () => {
  const BOM = String.fromCharCode(0xfeff);

  it('writes a BOM, CRLF line endings and a trailing newline', () => {
    const csv = toCsv(
      ['Date', 'Description', 'Hours'],
      [
        ['2026-10-08', 'Design, review', 1.5],
        ['2026-10-09', '=cmd', null],
      ],
    );
    expect(csv).toBe(
      BOM + 'Date,Description,Hours\r\n2026-10-08,"Design, review",1.5\r\n2026-10-09,\'=cmd,\r\n',
    );
  });

  it('escapes header cells too and handles no rows', () => {
    expect(toCsv(['Name, full'], [])).toBe(BOM + '"Name, full"\r\n');
  });
});
