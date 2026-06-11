using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace ElementalGuardians.EditorTools
{
    public static partial class EGSetup
    {
        private static Font UIFont => Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

        private static void CreateMainScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            CreateCamera();
            CreateManagers();
            CreateUI();

            var eventSystem = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
            eventSystem.transform.SetAsLastSibling();

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        private static void CreateCamera()
        {
            var camGo = new GameObject("Main Camera", typeof(Camera), typeof(AudioListener), typeof(CameraFitter));
            camGo.tag = "MainCamera";
            camGo.transform.position = new Vector3(0f, 0f, -10f);

            var cam = camGo.GetComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = 7f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.08f, 0.09f, 0.15f);
        }

        private static void CreateManagers()
        {
            GameObject tilePrefab = AssetDatabase.LoadAssetAtPath<GameObject>($"{PrefabsDir}/Tile.prefab");
            GameObject normalEnemy = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnemyPrefabsDir}/Enemy_Normal.prefab");
            GameObject fastEnemy = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnemyPrefabsDir}/Enemy_Fast.prefab");
            GameObject tankEnemy = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnemyPrefabsDir}/Enemy_Tank.prefab");
            GameObject fireTower = AssetDatabase.LoadAssetAtPath<GameObject>($"{TowerPrefabsDir}/FireTower.prefab");
            GameObject waterTower = AssetDatabase.LoadAssetAtPath<GameObject>($"{TowerPrefabsDir}/WaterTower.prefab");

            var managers = new GameObject("Managers",
                typeof(GameManager), typeof(PoolManager), typeof(GridManager),
                typeof(EnemySpawner), typeof(WaveManager), typeof(TowerPlacer));

            EditSerialized(managers.GetComponent<GridManager>(),
                so => so.FindProperty("tilePrefab").objectReferenceValue = tilePrefab);

            var waveManager = managers.GetComponent<WaveManager>();
            waveManager.BuildDefaultWaves();
            EditSerialized(waveManager, so =>
            {
                so.FindProperty("normalEnemyPrefab").objectReferenceValue = normalEnemy;
                so.FindProperty("fastEnemyPrefab").objectReferenceValue = fastEnemy;
                so.FindProperty("tankEnemyPrefab").objectReferenceValue = tankEnemy;
            });
            EditorUtility.SetDirty(waveManager);

            EditSerialized(managers.GetComponent<TowerPlacer>(), so =>
            {
                var options = so.FindProperty("towerOptions");
                options.arraySize = 2;
                var fire = options.GetArrayElementAtIndex(0);
                fire.FindPropertyRelative("displayName").stringValue = "Fire Tower";
                fire.FindPropertyRelative("prefab").objectReferenceValue = fireTower;
                var water = options.GetArrayElementAtIndex(1);
                water.FindPropertyRelative("displayName").stringValue = "Water Tower";
                water.FindPropertyRelative("prefab").objectReferenceValue = waterTower;
            });
        }

        private static void CreateUI()
        {
            var canvasGo = new GameObject("Canvas",
                typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster), typeof(UIManager));

            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            scaler.matchWidthOrHeight = 0.5f;

            // --- Top bar: gold / wave / lives -------------------------------
            RectTransform topBar = CreatePanel(canvasGo.transform, "TopBar", new Color(0f, 0f, 0f, 0.45f));
            SetAnchors(topBar, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0.5f, 1f));
            topBar.sizeDelta = new Vector2(0f, 140f);
            topBar.anchoredPosition = Vector2.zero;

            Text goldText = CreateText(topBar, "GoldText", "Gold: 100", 56,
                new Color(1f, 0.85f, 0.30f), TextAnchor.MiddleLeft);
            StretchWithPadding(goldText.rectTransform, 40f, 0f);

            Text waveText = CreateText(topBar, "WaveText", "Get Ready!", 48, Color.white, TextAnchor.MiddleCenter);
            StretchWithPadding(waveText.rectTransform, 0f, 0f);

            Text livesText = CreateText(topBar, "LivesText", "Lives: 1", 48,
                new Color(1f, 0.45f, 0.45f), TextAnchor.MiddleRight);
            StretchWithPadding(livesText.rectTransform, 0f, 40f);

            // --- Bottom bar: tower buttons + add gold -----------------------
            RectTransform bottomBar = CreatePanel(canvasGo.transform, "BottomBar", new Color(0f, 0f, 0f, 0.45f));
            SetAnchors(bottomBar, new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(0.5f, 0f));
            bottomBar.sizeDelta = new Vector2(0f, 260f);
            bottomBar.anchoredPosition = Vector2.zero;

            var buttonSize = new Vector2(320f, 200f);
            GameObject fireFrame = CreateFrame(bottomBar, "FireSelectedFrame", new Vector2(-360f, 0f), buttonSize);
            GameObject waterFrame = CreateFrame(bottomBar, "WaterSelectedFrame", new Vector2(0f, 0f), buttonSize);

            Button fireButton = CreateButton(bottomBar, "FireTowerButton", "Fire Tower\n50 Gold",
                new Color(0.80f, 0.25f, 0.18f), Color.white, 44, new Vector2(-360f, 0f), buttonSize);
            Button waterButton = CreateButton(bottomBar, "WaterTowerButton", "Water Tower\n50 Gold",
                new Color(0.16f, 0.45f, 0.80f), Color.white, 44, new Vector2(0f, 0f), buttonSize);
            Button addGoldButton = CreateButton(bottomBar, "AddGoldButton", "+100\nGold",
                new Color(0.95f, 0.75f, 0.10f), new Color(0.20f, 0.13f, 0f), 48, new Vector2(360f, 0f), buttonSize);

            // --- End panels -------------------------------------------------
            (GameObject victoryPanel, Button victoryRestart) = CreateEndPanel(canvasGo.transform,
                "VictoryPanel", "VICTORY!", new Color(1f, 0.85f, 0.30f), "Play Again");
            (GameObject defeatPanel, Button defeatRestart) = CreateEndPanel(canvasGo.transform,
                "DefeatPanel", "DEFEAT", new Color(0.95f, 0.30f, 0.25f), "Try Again");

            EditSerialized(canvasGo.GetComponent<UIManager>(), so =>
            {
                so.FindProperty("goldText").objectReferenceValue = goldText;
                so.FindProperty("waveText").objectReferenceValue = waveText;
                so.FindProperty("livesText").objectReferenceValue = livesText;
                so.FindProperty("addGoldButton").objectReferenceValue = addGoldButton;

                var buttons = so.FindProperty("towerButtons");
                buttons.arraySize = 2;
                buttons.GetArrayElementAtIndex(0).objectReferenceValue = fireButton;
                buttons.GetArrayElementAtIndex(1).objectReferenceValue = waterButton;

                var frames = so.FindProperty("towerSelectionFrames");
                frames.arraySize = 2;
                frames.GetArrayElementAtIndex(0).objectReferenceValue = fireFrame;
                frames.GetArrayElementAtIndex(1).objectReferenceValue = waterFrame;

                so.FindProperty("victoryPanel").objectReferenceValue = victoryPanel;
                so.FindProperty("defeatPanel").objectReferenceValue = defeatPanel;
                so.FindProperty("victoryRestartButton").objectReferenceValue = victoryRestart;
                so.FindProperty("defeatRestartButton").objectReferenceValue = defeatRestart;
            });

            victoryPanel.SetActive(false);
            defeatPanel.SetActive(false);
            waterFrame.SetActive(false);
        }

        private static (GameObject panel, Button restart) CreateEndPanel(Transform parent, string name,
            string title, Color titleColor, string buttonLabel)
        {
            RectTransform panel = CreatePanel(parent, name, new Color(0f, 0f, 0f, 0.75f));
            SetAnchors(panel, Vector2.zero, Vector2.one, new Vector2(0.5f, 0.5f));
            panel.sizeDelta = Vector2.zero;
            panel.anchoredPosition = Vector2.zero;

            Text titleText = CreateText(panel, "Title", title, 130, titleColor, TextAnchor.MiddleCenter);
            SetAnchors(titleText.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f));
            titleText.rectTransform.sizeDelta = new Vector2(1000f, 200f);
            titleText.rectTransform.anchoredPosition = new Vector2(0f, 120f);

            Button restart = CreateButton(panel, "RestartButton", buttonLabel,
                new Color(0.25f, 0.70f, 0.35f), Color.white, 52, new Vector2(0f, -160f), new Vector2(460f, 150f));

            return (panel.gameObject, restart);
        }

        // --------------------------- UI helpers ----------------------------

        private static void SetAnchors(RectTransform rt, Vector2 min, Vector2 max, Vector2 pivot)
        {
            rt.anchorMin = min;
            rt.anchorMax = max;
            rt.pivot = pivot;
        }

        private static void StretchWithPadding(RectTransform rt, float left, float right)
        {
            SetAnchors(rt, Vector2.zero, Vector2.one, new Vector2(0.5f, 0.5f));
            rt.offsetMin = new Vector2(left, 0f);
            rt.offsetMax = new Vector2(-right, 0f);
        }

        private static RectTransform CreatePanel(Transform parent, string name, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = color;
            return (RectTransform)go.transform;
        }

        private static Text CreateText(Transform parent, string name, string content, int fontSize,
            Color color, TextAnchor alignment)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Text));
            go.transform.SetParent(parent, false);

            var text = go.GetComponent<Text>();
            text.font = UIFont;
            text.text = content;
            text.fontSize = fontSize;
            text.fontStyle = FontStyle.Bold;
            text.color = color;
            text.alignment = alignment;
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            return text;
        }

        private static GameObject CreateFrame(Transform parent, string name, Vector2 position, Vector2 buttonSize)
        {
            RectTransform frame = CreatePanel(parent, name, new Color(1f, 0.92f, 0.25f));
            SetAnchors(frame, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f));
            frame.sizeDelta = buttonSize + new Vector2(24f, 24f);
            frame.anchoredPosition = position;
            return frame.gameObject;
        }

        private static Button CreateButton(Transform parent, string name, string label,
            Color buttonColor, Color labelColor, int fontSize, Vector2 position, Vector2 size)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);

            var rt = (RectTransform)go.transform;
            SetAnchors(rt, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f));
            rt.sizeDelta = size;
            rt.anchoredPosition = position;

            var image = go.GetComponent<Image>();
            image.color = buttonColor;

            var button = go.GetComponent<Button>();
            button.targetGraphic = image;

            Text text = CreateText(go.transform, "Label", label, fontSize, labelColor, TextAnchor.MiddleCenter);
            StretchWithPadding(text.rectTransform, 0f, 0f);

            return button;
        }
    }
}
