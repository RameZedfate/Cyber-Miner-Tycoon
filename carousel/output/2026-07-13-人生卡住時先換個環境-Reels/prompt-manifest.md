# 人生卡住時，先換個環境｜Reels 生成清單

## 成品設定

- 畫面比例：9:16
- 目標片長：24 秒
- 結構：6 鏡，每鏡 4 秒
- 圖像：無生成文字、Logo、浮水印或可辨識品牌
- 主角：同一位原創成年亞洲男性；短黑髮、米灰外套、素色上衣、深色長褲
- 情緒弧線：昏暗停滯 → 注意出口 → 踏出第一步 → 環境打開 → 放鬆呼吸 → 看見選擇

## 圖像來源

- 角色與視覺錨點：`hero-anchor.png`
- 分鏡：`frame-01.png` 至 `frame-06.png`
- 生成方式：OpenAI 內建 imagegen
- 風格參考：`references/carousel-visuals/reference-05-cinematic-editorial.png`，僅取用暖暗、低飽和與生活編輯感，不沿用原圖文字或版型

## Higgsfield 分鏡與運鏡提示詞

### Shot 1｜0–4 秒｜停滯

- 圖片：`frame-01.png`
- 運鏡：固定鏡位，極輕微呼吸感
- Prompt:

```text
Locked-off cinematic shot. The same seated adult Asian man remains quiet at the desk, with only subtle natural breathing, one small blink, and barely perceptible fabric movement. The warm doorway light remains steady in the background. Preserve his exact face, hair, outfit, body proportions, room geometry, camera framing, and low-key color grade. Realistic motion, no camera shake, no morphing, no extra limbs, no new people, no text, no logo, no watermark.
```

### Shot 2｜4–8 秒｜看見出口

- 圖片：`frame-02.png`
- 運鏡：緩慢推近
- Prompt:

```text
Very slow cinematic push-in toward the same man's three-quarter profile. He gently raises his gaze toward the warm doorway and his posture becomes slightly more upright, with a natural blink and restrained expression. Preserve exact identity, hair, jacket, hands, room, doorway, and warm-dark editorial lighting. No sudden head turn, no face drift, no morphing, no extra fingers, no new objects, no text, no logo, no watermark.
```

### Shot 3｜8–12 秒｜踏出第一步

- 圖片：`frame-03.png`
- 運鏡：後方緩慢跟拍
- Prompt:

```text
Gentle rear follow shot as the same man takes two slow natural steps toward the open doorway. Keep his walking pace calm and his arms moving only slightly. The warm light softly outlines his jacket while the room remains in shadow. Preserve exact outfit, body proportions, room layout, doorway perspective, and cinematic color grade. No running, no body warping, no foot sliding, no duplicate limbs, no camera jump, no text, no logo, no watermark.
```

### Shot 4｜12–16 秒｜走進新的環境

- 圖片：`frame-04.png`
- 運鏡：向前平穩追蹤
- Prompt:

```text
Smooth forward tracking shot from slightly behind as the same man crosses the threshold and walks into the quiet morning street. Let the exposure transition naturally from the darker doorway to warm outdoor daylight while the street depth opens ahead. Preserve exact identity silhouette, short dark hair, light gray-beige jacket, dark trousers, realistic anatomy, and restrained 35mm editorial look. No sudden cut, no outfit change, no new people, no vehicles entering frame, no morphing, no text, no logo, no watermark.
```

### Shot 5｜16–20 秒｜重新呼吸

- 圖片：`frame-05.png`
- 運鏡：非常緩慢的側向小幅環繞
- Prompt:

```text
Very slow subtle side orbit around the same man at the coastal railing. He takes one calm deep breath: chest rises gently, shoulders release, eyes remain softly closed, and a light sea breeze barely moves his hair and jacket. Keep the horizon level and the water movement natural and restrained. Preserve exact face, outfit, body proportions, coastal setting, and warm morning grade. No exaggerated smile, no dramatic wind, no body morphing, no extra limbs, no birds, no boats, no text, no logo, no watermark.
```

### Shot 6｜20–24 秒｜看見選擇

- 圖片：`frame-06.png`
- 運鏡：緩慢後拉
- Prompt:

```text
Slow cinematic pullback from the same man standing still and facing the open horizon. Keep his posture relaxed with only subtle natural breathing while the calm water has gentle realistic movement. Gradually reveal more open sky and negative space without changing the centered composition. Preserve exact hair silhouette, light gray-beige jacket, dark trousers, body proportions, railing geometry, level horizon, and soft morning color grade. No arms raised, no victory pose, no morphing, no extra people, no birds, no boats, no text, no logo, no watermark.
```

## 字幕時間軸

字幕在影片後製階段加入，不放入圖片生成或 Higgsfield 畫面提示詞。

| 時間 | 字幕 |
| --- | --- |
| 0.0–4.0 秒 | 人生卡住時，你不一定要立刻換一種人生。 |
| 4.0–8.0 秒 | 先離開原本的位置。 |
| 8.0–13.0 秒 | 換一條路、換一個視角、讓自己重新呼吸。 |
| 13.0–19.0 秒 | 環境改變了，你才更容易看見原本忽略的選擇。 |
| 19.0–24.0 秒 | 先走出去，下一步才會出現。 |

## 驗證標準

- 6 鏡總長 24 秒，全部維持 9:16。
- 主角臉部、髮型、服裝與身形保持一致。
- 每鏡只有一個主要動作與一個主要運鏡。
- 無變臉、手腳變形、滑步、場景跳接、忽明忽暗或多餘人物。
- 最終字幕逐字正確，保留上下安全距離。
