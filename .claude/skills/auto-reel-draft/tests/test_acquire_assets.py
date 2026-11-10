from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import csv
import json
import sys
import tempfile
import threading
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from acquire_assets import AssetAcquisitionError, acquire_assets
from validate_manifest import validate_manifest


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args) -> None:
        return


@contextmanager
def serve_directory(directory: Path):
    handler = partial(QuietHandler, directory=str(directory))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def write_selection(path: Path, assets: list[dict]) -> None:
    path.write_text(
        json.dumps({"schema_version": 1, "assets": assets}, ensure_ascii=False),
        encoding="utf-8",
    )


class AcquireAssetsTests(unittest.TestCase):
    def test_copies_adam_owned_asset_without_mutating_source(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source_root = root / "source"
            project = root / "project"
            source_root.mkdir()
            project.mkdir()
            source = source_root / "clip.mp4"
            source.write_bytes(b"owned-video")
            selection = project / "asset-selection.json"
            write_selection(selection, [{
                "asset_id": "opening", "media_type": "video", "acquisition": "local",
                "local_source": str(source), "download_url": "", "source_page": "",
                "license_type": "adam_owned", "attribution": "", "query": "night road",
                "purpose": "opening hook",
            }])

            result = acquire_assets(selection, project, [source_root])

            self.assertTrue(result["ok"])
            self.assertEqual(source.read_bytes(), b"owned-video")
            copied = Path(result["assets"][0]["local_copy"])
            self.assertEqual(copied.read_bytes(), b"owned-video")
            self.assertTrue(validate_manifest(project / "ASSET_MANIFEST.csv", project)["ok"])

    def test_downloads_external_asset_and_records_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            web_root = root / "web"
            project = root / "project"
            web_root.mkdir()
            project.mkdir()
            (web_root / "photo.jpg").write_bytes(b"licensed-photo")
            selection = project / "asset-selection.json"
            with serve_directory(web_root) as base_url:
                write_selection(selection, [{
                    "asset_id": "cover", "media_type": "photo", "acquisition": "external",
                    "local_source": "", "download_url": f"{base_url}/photo.jpg",
                    "source_page": "https://example.test/photo", "license_type": "cc0",
                    "attribution": "", "query": "city night", "purpose": "cover",
                }])
                result = acquire_assets(selection, project, [])

            self.assertTrue(result["ok"])
            with (project / "ASSET_MANIFEST.csv").open(
                "r", encoding="utf-8-sig", newline=""
            ) as handle:
                row = next(csv.DictReader(handle))
            self.assertEqual(row["source_page"], "https://example.test/photo")
            self.assertEqual(row["license_type"], "cc0")
            self.assertEqual(len(row["sha256"]), 64)

    def test_rejects_unsupported_url_and_external_missing_license(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            selection = project / "asset-selection.json"
            write_selection(selection, [{
                "asset_id": "bad", "media_type": "photo", "acquisition": "external",
                "local_source": "", "download_url": "file:///secret.jpg",
                "source_page": "", "license_type": "", "attribution": "",
                "query": "", "purpose": "",
            }])
            with self.assertRaises(AssetAcquisitionError) as caught:
                acquire_assets(selection, project, [])
            self.assertEqual(caught.exception.code, "missing_external_provenance")

    def test_rejects_local_source_outside_allowed_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            project = root / "project"
            allowed = root / "allowed"
            outside = root / "outside.mp4"
            project.mkdir()
            allowed.mkdir()
            outside.write_bytes(b"outside")
            selection = project / "asset-selection.json"
            write_selection(selection, [{
                "asset_id": "bad-local", "media_type": "video", "acquisition": "local",
                "local_source": str(outside), "download_url": "", "source_page": "",
                "license_type": "adam_owned", "attribution": "", "query": "",
                "purpose": "",
            }])
            with self.assertRaises(AssetAcquisitionError) as caught:
                acquire_assets(selection, project, [allowed])
            self.assertEqual(caught.exception.code, "local_source_outside_allowed_roots")

    def test_deduplicates_identical_content(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source_root = root / "source"
            project = root / "project"
            source_root.mkdir()
            project.mkdir()
            first = source_root / "first.mp4"
            second = source_root / "second.mp4"
            first.write_bytes(b"same")
            second.write_bytes(b"same")
            selection = project / "asset-selection.json"
            assets = []
            for asset_id, source in (("one", first), ("two", second)):
                assets.append({
                    "asset_id": asset_id, "media_type": "video", "acquisition": "local",
                    "local_source": str(source), "download_url": "", "source_page": "",
                    "license_type": "adam_owned", "attribution": "", "query": "",
                    "purpose": asset_id,
                })
            write_selection(selection, assets)

            result = acquire_assets(selection, project, [source_root])

            self.assertEqual(result["assets"][0]["local_copy"], result["assets"][1]["local_copy"])
            self.assertEqual(len(list((project / "assets" / "video").iterdir())), 1)


if __name__ == "__main__":
    unittest.main()
