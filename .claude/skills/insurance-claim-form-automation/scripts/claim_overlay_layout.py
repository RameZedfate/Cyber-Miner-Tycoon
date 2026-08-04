"""Verified first-page field boxes for supported Taiwan claim forms.

Coordinates use PDF points with a top-left origin: (left, top, right, bottom).
The module contains no customer data.
"""

from __future__ import annotations

from copy import deepcopy


LAYOUTS = {
    "shin_kong": {
        "page": (595, 842),
        "fields": {
            "name": (90, 82, 250, 105),
            "birth_year": (92, 105, 130, 126),
            "birth_month": (145, 105, 165, 126),
            "birth_day": (183, 105, 204, 126),
            "accident_year": (390, 105, 430, 126),
            "accident_month": (447, 105, 467, 126),
            "accident_day": (484, 105, 503, 126),
            "cause": (90, 154, 250, 178),
            "occupation": (355, 154, 580, 178),
            "hospital": (355, 178, 580, 194),
            "detail_year": (145, 194, 177, 214),
            "detail_month": (183, 194, 210, 214),
            "detail_day": (220, 194, 245, 214),
            "narrative": (120, 216, 560, 239),
            "account_holder": (60, 342, 200, 363),
            "bank": (88, 366, 138, 386),
            "branch": (198, 366, 230, 386),
            "mobile": (115, 624, 255, 644),
            "address": (160, 645, 555, 665),
            "signer_identity": (130, 592, 270, 612),
            "signer_birth_nationality": (130, 608, 270, 628),
        },
        "checks": {
            "original_shin_kong": (30, 69, 41, 80),
            "medical": (381, 255, 392, 267),
        },
        "segments": {
            "identity": {"rect": (355, 82, 580, 105), "count": 10},
            "account": {"rect": (300, 366, 580, 386), "count": 14},
        },
    },
    "yuanta": {
        "page": (595.32, 841.92),
        "fields": {
            "name": (112, 147, 212, 163),
            "identity": (283, 147, 390, 163),
            "birth": (470, 147, 560, 163),
            "address": (112, 164, 350, 181),
            "mobile": (112, 182, 212, 201),
            "occupation": (470, 182, 560, 201),
            "accident_date": (101, 205, 212, 223),
            "diagnosis": (132, 224, 390, 242),
            "surgery": (470, 224, 560, 242),
            "account_holder": (68, 384, 183, 402),
            "beneficiary_identity": (278, 384, 360, 402),
            "bank": (95, 407, 183, 426),
            "branch": (228, 407, 320, 426),
            "account": (365, 407, 555, 426),
        },
        "checks": {
            "medical": (114, 92, 125, 104),
            "accident_injury": (146, 92, 157, 104),
            "personal_insurance": (518, 75, 530, 87),
            "accident": (505, 207, 516, 220),
            "beneficiary_account": (54, 313, 66, 326),
        },
        "segments": {},
        "formats": {"accident_date": "roc_text_centered"},
    },
    "farglory": {
        "page": (595.32, 841.92),
        "fields": {
            "name": (110, 75, 280, 99),
            "birth_year": (365, 96, 430, 112),
            "birth_month": (460, 96, 500, 112),
            "birth_day": (525, 96, 565, 112),
            "occupation": (400, 194, 445, 211),
            "accident_year": (105, 211, 135, 230),
            "accident_month": (145, 211, 170, 230),
            "accident_day": (180, 211, 205, 230),
            "narrative": (48, 252, 560, 270),
            "account_holder": (48, 328, 108, 347),
            "bank": (145, 328, 238, 347),
            "branch": (252, 328, 337, 347),
            "mobile": (72, 635, 190, 655),
        },
        "checks": {
            "medical": (48, 132, 59, 144),
            "accident": (156, 195, 168, 207),
            "beneficiary_account": (154, 299, 166, 312),
            "same_policy_address": (55, 665, 70, 680),
        },
        "segments": {
            "identity": {"rect": (340, 75, 565, 96), "count": 10},
            "account": {"rect": (418, 328, 578, 347), "count": 14},
        },
    },
    "fubon_114_11": {
        "page": (595.32, 841.92),
        "edition": "114.11",
        "fields": {
            "name": (95, 55, 260, 78),
            "identity": (360, 55, 560, 78),
            "accident_year": (137, 191, 163, 213),
            "accident_month": (171, 191, 195, 213),
            "accident_day": (201, 191, 225, 213),
            "narrative": (246, 190, 558, 272),
            "account_holder": (95, 300, 290, 324),
            "beneficiary_identity": (366, 300, 560, 324),
            "bank": (95, 325, 220, 348),
            "branch": (271, 325, 360, 348),
            "account": (401, 325, 560, 348),
            "mobile": (95, 350, 220, 376),
            "address_city": (125, 376, 175, 400),
            "address_district": (190, 376, 250, 400),
            "address_road": (330, 376, 390, 400),
            "address_lane": (420, 376, 465, 400),
            "address_number": (480, 376, 507, 400),
        },
        "checks": {
            "medical": (115, 101, 127, 113),
            "accident": (157, 176, 169, 188),
            "bank_transfer": (150, 281, 163, 294),
        },
        "segments": {},
        "formats": {
            "city_district_full_names": True,
            "address_number": "digits_only",
        },
    },
    "kgi": {
        "page": (540, 780),
        "fields": {
            "name": (61, 73, 170, 99),
            "identity": (225, 73, 335, 99),
            "birth_year": (395, 73, 434, 99),
            "birth_month": (442, 73, 476, 99),
            "birth_day": (483, 73, 520, 99),
            "accident_year": (101, 171, 124, 191),
            "accident_month": (133, 171, 151, 191),
            "accident_day": (158, 171, 176, 191),
            "occupation": (225, 171, 300, 191),
            "narrative": (324, 171, 520, 238),
            "account_holder": (95, 257, 268, 281),
            "bank": (62, 282, 268, 301),
            "branch": (62, 302, 268, 320),
            "beneficiary_identity": (420, 588, 520, 608),
            "address": (258, 654, 520, 674),
            "mobile": (390, 677, 520, 696),
        },
        "checks": {
            "general_medical": (365, 140, 377, 152),
            "bank_transfer": (62, 242, 74, 255),
            "beneficiary_account": (126, 242, 138, 255),
        },
        "segments": {
            "account": {"rect": (270, 273, 520, 320), "count": 14},
        },
    },
    "hontai": {
        "page": (595.32, 841.92),
        "fields": {
            "name": (320, 52, 480, 80),
            "identity": (105, 80, 260, 106),
            "birth_year": (320, 80, 383, 106),
            "birth_month": (386, 80, 420, 106),
            "birth_day": (423, 80, 460, 106),
            "mobile": (192, 107, 320, 125),
            "accident_year": (360, 219, 395, 235),
            "accident_month": (390, 219, 408, 235),
            "accident_day": (425, 219, 442, 235),
            "narrative": (112, 273, 574, 299),
            "occupation": (92, 330, 190, 350),
            "work_content": (258, 330, 400, 350),
            "account_holder": (80, 406, 200, 420),
            "beneficiary_identity": (276, 406, 395, 420),
            "bank": (380, 406, 455, 420),
            "branch": (500, 406, 575, 420),
            "account": (195, 423, 575, 443),
        },
        "checks": {
            "same_policy_address": (68, 146, 80, 159),
            "accident": (150, 219, 162, 232),
            "new_accident": (259, 219, 271, 232),
            "medical": (92, 235, 104, 248),
            "bank_transfer": (29, 350, 42, 363),
        },
        "segments": {},
    },
    "prudential": {
        "page": (595.2, 841.92),
        "fields": {
            "name": (115, 61, 245, 82),
            "identity": (320, 61, 420, 82),
            "birth_year": (465, 61, 500, 82),
            "birth_month": (515, 61, 540, 82),
            "birth_day": (548, 61, 572, 82),
            "accident_year": (125, 137, 155, 160),
            "accident_month": (162, 137, 185, 160),
            "accident_day": (190, 137, 212, 160),
            "occupation": (500, 137, 580, 160),
            "narrative": (176, 174, 565, 199),
            "account_holder": (185, 275, 560, 298),
            "bank": (108, 298, 158, 322),
            "branch": (198, 298, 238, 322),
            "account": (340, 307, 560, 322),
            "mobile": (220, 648, 300, 670),
        },
        "checks": {
            "medical": (164, 86, 176, 99),
            "other_cause": (487, 163, 499, 176),
            "beneficiary_account": (88, 257, 101, 270),
            "sms_notification": (45, 357, 58, 370),
        },
        "segments": {},
    },
}


def get_layout(name: str) -> dict:
    return deepcopy(LAYOUTS[name])


def validate_layout(layout: dict) -> list[str]:
    width, height = layout["page"]
    issues: list[str] = []

    def check_rect(kind: str, name: str, rect) -> None:
        if len(rect) != 4:
            issues.append(f"{kind}.{name}: rect must have four values")
            return
        left, top, right, bottom = rect
        if not (0 <= left < right <= width and 0 <= top < bottom <= height):
            issues.append(f"{kind}.{name}: rect outside page or reversed: {rect}")

    for name, rect in layout.get("fields", {}).items():
        check_rect("fields", name, rect)
    for name, rect in layout.get("checks", {}).items():
        check_rect("checks", name, rect)
    for name, config in layout.get("segments", {}).items():
        check_rect("segments", name, config["rect"])
        if not isinstance(config.get("count"), int) or config["count"] <= 0:
            issues.append(f"segments.{name}: invalid count")
    return issues
