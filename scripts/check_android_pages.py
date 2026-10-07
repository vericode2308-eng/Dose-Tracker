"""Check 64-bit ELF and uncompressed ZIP layout in a local Android APK.

Android's linker rounds GNU_RELRO protection to whole pages. An unaligned
RELRO end is safe when that rounding covers only padding, not writable data.
This is static evidence, not a substitute for a real 16 KB runtime test.
Reference: AOSP bionic/linker/linker_phdr.cpp, _phdr_table_set_gnu_relro_prot.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile

PAGE = 16384
LOAD, RELRO, WRITE = 1, 0x6474E552, 2


def headers(data):
    if data[:4] != b'\x7fELF' or data[4:6] != b'\x02\x01':
        raise ValueError('Expected little-endian ELF64')
    offset = struct.unpack_from('<Q', data, 32)[0]
    size, count = struct.unpack_from('<HH', data, 54)
    if size < 56 or offset + count * size > len(data):
        raise ValueError('Invalid program-header table')
    return [struct.unpack_from('<IIQQQQQQ', data, offset + i * size)
            for i in range(count)]


def layout_issues(phdrs):
    """Headers: type, flags, offset, vaddr, paddr, filesz, memsz, align."""
    issues = []
    loads = [p for p in phdrs if p[0] == LOAD]
    if not loads:
        return ['No LOAD segments']
    for p in loads:
        if p[7] < PAGE or p[7] & (p[7] - 1):
            issues.append('LOAD alignment below 16 KB or not a power of two')
        if (p[3] - p[2]) % PAGE:
            issues.append('LOAD file/virtual offsets not congruent modulo 16 KB')
    for relro in (p for p in phdrs if p[0] == RELRO and p[6]):
        start, end = relro[3], relro[3] + relro[6]
        protected_start = start // PAGE * PAGE
        protected_end = (end + PAGE - 1) // PAGE * PAGE
        for load in loads:
            if not load[1] & WRITE or not load[6]:
                continue
            lo = max(protected_start, load[3])
            hi = min(protected_end, load[3] + load[6])
            if lo < hi and (lo < start or hi > end):
                issues.append('Rounded RELRO protection overlaps non-RELRO writable data')
    return sorted(set(issues))


def check_apk(path):
    results = []
    with path.open('rb') as raw, zipfile.ZipFile(path) as archive:
        for entry in archive.infolist():
            if not entry.filename.endswith('.so') or not entry.filename.startswith(
                    ('lib/arm64-v8a/', 'lib/x86_64/')):
                continue
            phdrs = headers(archive.read(entry))
            issues = layout_issues(phdrs)
            if entry.compress_type == zipfile.ZIP_STORED:
                raw.seek(entry.header_offset)
                local = raw.read(30)
                if local[:4] != b'PK\x03\x04':
                    raise ValueError('Invalid ZIP local header')
                name_len, extra_len = struct.unpack_from('<HH', local, 26)
                data_offset = entry.header_offset + 30 + name_len + extra_len
                if data_offset % PAGE:
                    issues.append('Uncompressed ZIP entry is not 16 KB aligned')
            results.append({'library': entry.filename, 'issues': issues,
                            'unaligned_relro_ends': sum(
                                1 for p in phdrs if p[0] == RELRO and (p[3] + p[6]) % PAGE)})
    if not results:
        raise ValueError('No 64-bit native libraries found; cannot establish this check')
    return {'apk': str(path.resolve()), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'page_size': PAGE, 'libraries': results,
            'passed': all(not r['issues'] for r in results)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    parser.add_argument('--json', type=Path)
    args = parser.parse_args()
    report = check_apk(args.apk)
    if args.json:
        args.json.write_text(json.dumps(report, indent=2) + '\n')
    for item in report['libraries']:
        for issue in item['issues']:
            print(f"FAIL {item['library']}: {issue}")
    print(f"{'PASS' if report['passed'] else 'FAIL'}: "
          f"{len(report['libraries'])} 64-bit libraries; 16 KB LOAD/RELRO/ZIP checks")
    raise SystemExit(0 if report['passed'] else 1)
