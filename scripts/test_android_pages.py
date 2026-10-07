"""Regression cases for dangerous protection overlap vs harmless ELF padding."""
import unittest
from check_android_pages import LOAD, RELRO, layout_issues


def segment(kind, start, size, flags=6, alignment=16384):
    return (kind, flags, start, start, 0, size, size, alignment)


class LayoutTests(unittest.TestCase):
    def test_unaligned_relro_suffix_with_safe_gap(self):
        self.assertEqual(layout_issues([
            segment(LOAD, 0x4000, 0x1000), segment(RELRO, 0x4000, 0x1000),
            segment(LOAD, 0x8000, 0x1000)]), [])

    def test_relro_padding_beyond_load_end_is_safe(self):
        self.assertEqual(layout_issues([
            segment(LOAD, 0x5C40, 0x390), segment(RELRO, 0x5C40, 0x3C0),
            segment(LOAD, 0x9FD0, 0x10)]), [])

    def test_relro_prefix_overprotects_writable_tail(self):
        self.assertTrue(layout_issues([
            segment(LOAD, 0x4000, 0x3000), segment(RELRO, 0x4000, 0x1000)]))

    def test_relro_start_overprotects_writable_prefix(self):
        self.assertTrue(layout_issues([
            segment(LOAD, 0x4000, 0x4000), segment(RELRO, 0x5000, 0x3000)]))

    def test_aligned_relro_prefix_allows_writable_tail(self):
        self.assertEqual(layout_issues([
            segment(LOAD, 0x4000, 0x8000), segment(RELRO, 0x4000, 0x4000)]), [])

    def test_bad_load_alignment(self):
        self.assertTrue(layout_issues([segment(LOAD, 0, 0x4000, alignment=4096)]))

    def test_incongruent_load_file_offset(self):
        self.assertTrue(layout_issues([(LOAD, 6, 0, 0x1000, 0, 0x1000, 0x1000, 16384)]))

    def test_relro_rounding_hits_a_separate_writable_segment(self):
        self.assertTrue(layout_issues([
            segment(LOAD, 0x4000, 0x1000), segment(RELRO, 0x4000, 0x1000),
            segment(LOAD, 0x6000, 0x1000)]))

    def test_missing_load_does_not_pass(self):
        self.assertTrue(layout_issues([]))


if __name__ == '__main__':
    unittest.main()
