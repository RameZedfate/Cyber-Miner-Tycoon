# Auto Reel Draft Contracts

All machine-readable artifacts use UTF-8 and `schema_version: 1`.

## Artifact set

Each `projects/<slug>/` contains:

- `job.json`
- `SOURCE_ANALYSIS.md`
- `SHOTLIST.md`
- `DESIGN.md`
- `asset-selection.json`
- `ASSET_MANIFEST.csv`
- `draft-plan.json`
- `DRAFT_VALIDATION.json` after validation
- `assets/video`, `assets/photos`, and `assets/audio`

## job.json

```json
{
  "schema_version": 1,
  "project": {
    "slug": "news-reel",
    "draft_name": "news-reel-editable",
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "duration_seconds": 30.0,
    "export_mp4": false
  },
  "references": ["https://example.com/reference"],
  "source_text": null,
  "drive_inbox": null
}
```

## asset-selection.json

`acquisition` is `external` or `local`. External rows require `download_url`,
`source_page`, and `license_type`. Local rows require `local_source` under an
explicitly allowed root and `license_type: adam_owned`.

```json
{
  "schema_version": 1,
  "assets": [
    {
      "asset_id": "opening-road",
      "media_type": "video",
      "acquisition": "local",
      "local_source": "<configured-owned-media-root>/clip.mp4",
      "download_url": "",
      "source_page": "",
      "license_type": "adam_owned",
      "attribution": "",
      "query": "night road",
      "purpose": "opening hook"
    }
  ]
}
```

## ASSET_MANIFEST.csv

Required columns, in order:

```text
asset_id,purpose,media_type,origin,source_page,download_url,local_source,local_copy,license_type,attribution,query,sha256
```

`origin` is `external` or `adam_owned`. `local_copy` must resolve inside the
project and its SHA-256 must match `sha256`.

## draft-plan.json

All times are integer microseconds. Project values are fixed at 1080×1920,
30 FPS, `export_mp4: false`, and a draft name ending in `-editable`.

```json
{
  "schema_version": 1,
  "project": {
    "slug": "news-reel",
    "draft_name": "news-reel-editable",
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "duration_us": 30000000,
    "export_mp4": false
  },
  "video": [
    {
      "asset_id": "opening-road",
      "path": "assets/video/opening-road.mp4",
      "source_us": 0,
      "start_us": 0,
      "duration_us": 5000000,
      "track_name": "Main Video",
      "muted": true
    }
  ],
  "audio": [],
  "text": [
    {
      "text": "第一句字幕",
      "start_us": 0,
      "duration_us": 2500000,
      "track_name": "Captions"
    }
  ]
}
```

Every segment must start at or after zero, have positive duration, and end no
later than `project.duration_us`. All media paths must exist inside the project.

## Validation result

`DRAFT_VALIDATION.json` includes `ok`, `errors`, `counts`, `duration_us`,
`width`, `height`, `fps`, `draft_path`, `content_path`, `manifest`, and
`exported_mp4: false`.

Stable error codes include:

- Job/assets: `missing_manifest`, `missing_columns`, `missing_license`,
  `missing_source_page`, `missing_asset_file`, `asset_outside_project`,
  `sha256_mismatch`, `missing_external_provenance`,
  `local_source_outside_allowed_roots`, `missing_local_source`,
  `unsupported_download_scheme`, `unsupported_media_type`.
- Plan/build: `invalid_plan_json`, `invalid_project_contract`,
  `invalid_track_contract`, `invalid_timerange`, `segment_out_of_bounds`,
  `media_outside_project`, `missing_media_file`, `video_must_be_muted`,
  `draft_exists`, `draft_locked`, `video_import_failed`,
  `audio_import_failed`, `text_import_failed`, `draft_save_failed`.
- Saved draft: `missing_draft_content`, `missing_draft_meta`,
  `invalid_draft_json`, `manifest_invalid`, `width`, `height`, `fps`,
  `duration`, `segment_counts`, `video_timeline`, `video_not_muted`,
  `audio_timeline`, `text_timeline`.
