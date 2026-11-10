from pathlib import Path
import csv
import hashlib
import sys
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from validate_manifest import FIELDNAMES, validate_manifest


def write_manifest(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


class ValidateManifestTests(unittest.TestCase):
    def test_valid_adam_owned_asset_passes(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            asset = project / "assets" / "video" / "clip.mp4"
            asset.parent.mkdir(parents=True)
            asset.write_bytes(b"clip")
            digest = hashlib.sha256(b"clip").hexdigest()
            manifest = project / "ASSET_MANIFEST.csv"
            write_manifest(
                manifest,
                [{
                    "asset_id": "v1", "purpose": "opening", "media_type": "video",
                    "origin": "adam_owned", "source_page": "", "download_url": "",
                    "local_source": "G:/source/clip.mp4", "local_copy": "assets/video/clip.mp4",
                    "license_type": "adam_owned", "attribution": "", "query": "night road",
                    "sha256": digest,
                }],
            )

            result = validate_manifest(manifest, project)

            self.assertTrue(result["ok"])
            self.assertEqual(result["local_assets"], 1)
            self.assertEqual(result["external_assets"], 0)

    def test_external_asset_requires_license_and_source_page(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            asset = project / "assets" / "photos" / "photo.jpg"
            asset.parent.mkdir(parents=True)
            asset.write_bytes(b"photo")
            manifest = project / "ASSET_MANIFEST.csv"
            write_manifest(
                manifest,
                [{
                    "asset_id": "p1", "purpose": "cover", "media_type": "photo",
                    "origin": "external", "source_page": "", "download_url": "https://cdn/x.jpg",
                    "local_source": "", "local_copy": "assets/photos/photo.jpg",
                    "license_type": "", "attribution": "", "query": "city",
                    "sha256": hashlib.sha256(b"photo").hexdigest(),
                }],
            )

            codes = {error["code"] for error in validate_manifest(manifest, project)["errors"]}

            self.assertIn("missing_license", codes)
            self.assertIn("missing_source_page", codes)

    def test_detects_missing_file_outside_path_and_hash_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            manifest = project / "ASSET_MANIFEST.csv"
            write_manifest(
                manifest,
                [
                    {
                        "asset_id": "missing", "purpose": "a", "media_type": "video",
                        "origin": "adam_owned", "source_page": "", "download_url": "",
                        "local_source": "G:/missing.mp4", "local_copy": "assets/video/missing.mp4",
                        "license_type": "adam_owned", "attribution": "", "query": "",
                        "sha256": "0" * 64,
                    },
                    {
                        "asset_id": "outside", "purpose": "b", "media_type": "video",
                        "origin": "adam_owned", "source_page": "", "download_url": "",
                        "local_source": "G:/outside.mp4", "local_copy": "../outside.mp4",
                        "license_type": "adam_owned", "attribution": "", "query": "",
                        "sha256": "0" * 64,
                    },
                ],
            )

            codes = {error["code"] for error in validate_manifest(manifest, project)["errors"]}

            self.assertIn("missing_asset_file", codes)
            self.assertIn("asset_outside_project", codes)

            inside = project / "assets" / "video" / "wrong.mp4"
            inside.parent.mkdir(parents=True)
            inside.write_bytes(b"wrong")
            rows = [{
                "asset_id": "wrong", "purpose": "c", "media_type": "video",
                "origin": "adam_owned", "source_page": "", "download_url": "",
                "local_source": "G:/wrong.mp4", "local_copy": "assets/video/wrong.mp4",
                "license_type": "adam_owned", "attribution": "", "query": "",
                "sha256": "0" * 64,
            }]
            write_manifest(manifest, rows)
            codes = {error["code"] for error in validate_manifest(manifest, project)["errors"]}
            self.assertIn("sha256_mismatch", codes)


if __name__ == "__main__":
    unittest.main()
