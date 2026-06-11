using System;
using System.IO;
using UnityEditor;
using UnityEngine;
using Object = UnityEngine.Object;

namespace ElementalGuardians.EditorTools
{
    /// <summary>
    /// One-shot project generator. Runs automatically the first time the
    /// project is opened (or via Tools > Elemental Guardians) and creates the
    /// sprites, prefabs and the fully wired sample scene so the game is
    /// playable immediately.
    /// </summary>
    public static partial class EGSetup
    {
        private const string SpritesDir = "Assets/Sprites";
        private const string PrefabsDir = "Assets/Prefabs";
        private const string EnemyPrefabsDir = "Assets/Prefabs/Enemies";
        private const string TowerPrefabsDir = "Assets/Prefabs/Towers";
        private const string ScenesDir = "Assets/Scenes";
        private const string ScenePath = "Assets/Scenes/Main.unity";

        [InitializeOnLoadMethod]
        private static void AutoGenerateOnFirstOpen()
        {
            EditorApplication.delayCall += () =>
            {
                if (EditorApplication.isPlayingOrWillChangePlaymode || EditorApplication.isCompiling)
                {
                    return;
                }

                if (!File.Exists(ScenePath))
                {
                    GenerateAll();
                }
            };
        }

        [MenuItem("Tools/Elemental Guardians/Generate Game Assets And Scene")]
        public static void GenerateAll()
        {
            try
            {
                CreateFolders();
                Sprite square = CreateSpriteAsset("square", circle: false);
                Sprite circle = CreateSpriteAsset("circle", circle: true);
                CreateAllPrefabs(square, circle);
                CreateMainScene();
                ConfigurePlayerSettings();
                AssetDatabase.SaveAssets();
                Debug.Log("[Elemental Guardians] Project assets and Main scene generated. Press Play!");
            }
            catch (Exception e)
            {
                Debug.LogError($"[Elemental Guardians] Setup failed: {e}");
            }
        }

        private static void CreateFolders()
        {
            foreach (string dir in new[] { SpritesDir, PrefabsDir, EnemyPrefabsDir, TowerPrefabsDir, ScenesDir })
            {
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
            }
            AssetDatabase.Refresh();
        }

        private static Sprite CreateSpriteAsset(string name, bool circle)
        {
            string path = $"{SpritesDir}/{name}.png";
            if (!File.Exists(path))
            {
                const int size = 128;
                var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
                var pixels = new Color32[size * size];
                float radius = size * 0.5f - 1f;
                var center = new Vector2(size * 0.5f - 0.5f, size * 0.5f - 0.5f);

                for (int y = 0; y < size; y++)
                {
                    for (int x = 0; x < size; x++)
                    {
                        byte alpha = 255;
                        if (circle)
                        {
                            float dist = Vector2.Distance(new Vector2(x, y), center);
                            alpha = (byte)(255f * Mathf.Clamp01(radius - dist + 0.5f));
                        }
                        pixels[y * size + x] = new Color32(255, 255, 255, alpha);
                    }
                }

                tex.SetPixels32(pixels);
                tex.Apply();
                File.WriteAllBytes(path, tex.EncodeToPNG());
                Object.DestroyImmediate(tex);
                AssetDatabase.ImportAsset(path);
            }

            var importer = (TextureImporter)AssetImporter.GetAtPath(path);
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.spritePixelsPerUnit = 128f;
            importer.mipmapEnabled = false;
            importer.alphaIsTransparency = true;
            importer.filterMode = FilterMode.Bilinear;
            importer.SaveAndReimport();

            return AssetDatabase.LoadAssetAtPath<Sprite>(path);
        }

        private static void ConfigurePlayerSettings()
        {
            PlayerSettings.productName = "Elemental Guardians";
            PlayerSettings.companyName = "ElementalGuardians";
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToPortrait = true;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false;
            PlayerSettings.allowedAutorotateToLandscapeRight = false;
        }

        /// <summary>Applies edits to a component's serialized (Inspector) fields.</summary>
        private static void EditSerialized(Object target, Action<SerializedObject> edit)
        {
            var so = new SerializedObject(target);
            edit(so);
            so.ApplyModifiedPropertiesWithoutUndo();
        }
    }
}
