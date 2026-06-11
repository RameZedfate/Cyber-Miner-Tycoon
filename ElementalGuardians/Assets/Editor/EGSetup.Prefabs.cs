using UnityEditor;
using UnityEngine;

namespace ElementalGuardians.EditorTools
{
    public static partial class EGSetup
    {
        private static void CreateAllPrefabs(Sprite square, Sprite circle)
        {
            CreateTilePrefab(square);

            CreateEnemyPrefab(square, circle, "Enemy_Normal", "Normal Enemy",
                health: 30f, speed: 1.5f, reward: 10, bodyScale: 0.55f, bodyColor: new Color(0.95f, 0.55f, 0.20f));
            CreateEnemyPrefab(square, circle, "Enemy_Fast", "Fast Enemy",
                health: 20f, speed: 3.0f, reward: 15, bodyScale: 0.45f, bodyColor: new Color(0.30f, 0.85f, 0.40f));
            CreateEnemyPrefab(square, circle, "Enemy_Tank", "Tank Enemy",
                health: 100f, speed: 0.8f, reward: 30, bodyScale: 0.75f, bodyColor: new Color(0.60f, 0.30f, 0.80f));

            GameObject fireProjectile = CreateProjectilePrefab(circle, "Projectile_Fire", new Color(1f, 0.45f, 0.15f));
            GameObject waterProjectile = CreateProjectilePrefab(circle, "Projectile_Water", new Color(0.35f, 0.70f, 1f));

            CreateTowerPrefab(square, circle, "FireTower", "Fire Tower", Element.Fire,
                cost: 50, damage: 10f, attackInterval: 1f, range: 3f,
                slowFactor: 0f, slowDuration: 0f,
                turretColor: new Color(0.90f, 0.25f, 0.15f), projectilePrefab: fireProjectile);

            CreateTowerPrefab(square, circle, "WaterTower", "Water Tower", Element.Water,
                cost: 50, damage: 5f, attackInterval: 1f, range: 3f,
                slowFactor: 0.3f, slowDuration: 2f,
                turretColor: new Color(0.15f, 0.50f, 0.95f), projectilePrefab: waterProjectile);
        }

        private static GameObject SavePrefab(GameObject root, string path)
        {
            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return prefab;
        }

        private static SpriteRenderer AddSpriteChild(GameObject parent, string name, Sprite sprite,
            Color color, int sortingOrder, Vector3 localPos, Vector3 localScale)
        {
            var child = new GameObject(name, typeof(SpriteRenderer));
            child.transform.SetParent(parent.transform, false);
            child.transform.localPosition = localPos;
            child.transform.localScale = localScale;

            var sr = child.GetComponent<SpriteRenderer>();
            sr.sprite = sprite;
            sr.color = color;
            sr.sortingOrder = sortingOrder;
            return sr;
        }

        private static void CreateTilePrefab(Sprite square)
        {
            var root = new GameObject("Tile", typeof(SpriteRenderer), typeof(BoxCollider2D), typeof(Tile));

            var sr = root.GetComponent<SpriteRenderer>();
            sr.sprite = square;
            sr.sortingOrder = 0;

            var collider = root.GetComponent<BoxCollider2D>();
            collider.size = Vector2.one;

            EditSerialized(root.GetComponent<Tile>(),
                so => so.FindProperty("spriteRenderer").objectReferenceValue = sr);

            SavePrefab(root, $"{PrefabsDir}/Tile.prefab");
        }

        private static void CreateEnemyPrefab(Sprite square, Sprite circle, string prefabName, string displayName,
            float health, float speed, int reward, float bodyScale, Color bodyColor)
        {
            var root = new GameObject(prefabName, typeof(Enemy), typeof(PooledObject));

            AddSpriteChild(root, "Body", circle, bodyColor, 10, Vector3.zero, Vector3.one * bodyScale);

            var healthBar = new GameObject("HealthBar");
            healthBar.transform.SetParent(root.transform, false);
            healthBar.transform.localPosition = new Vector3(0f, 0.55f, 0f);

            AddSpriteChild(healthBar, "BG", square, new Color(0.12f, 0.12f, 0.12f), 11,
                Vector3.zero, new Vector3(0.8f, 0.12f, 1f));
            var fill = AddSpriteChild(healthBar, "Fill", square, new Color(0.25f, 0.95f, 0.30f), 12,
                Vector3.zero, new Vector3(0.74f, 0.08f, 1f));

            EditSerialized(root.GetComponent<Enemy>(), so =>
            {
                so.FindProperty("enemyName").stringValue = displayName;
                so.FindProperty("maxHealth").floatValue = health;
                so.FindProperty("moveSpeed").floatValue = speed;
                so.FindProperty("goldReward").intValue = reward;
                so.FindProperty("healthFill").objectReferenceValue = fill.transform;
            });

            SavePrefab(root, $"{EnemyPrefabsDir}/{prefabName}.prefab");
        }

        private static GameObject CreateProjectilePrefab(Sprite circle, string prefabName, Color color)
        {
            var root = new GameObject(prefabName, typeof(SpriteRenderer), typeof(Projectile), typeof(PooledObject));

            var sr = root.GetComponent<SpriteRenderer>();
            sr.sprite = circle;
            sr.color = color;
            sr.sortingOrder = 15;
            root.transform.localScale = Vector3.one * 0.2f;

            return SavePrefab(root, $"{TowerPrefabsDir}/{prefabName}.prefab");
        }

        private static void CreateTowerPrefab(Sprite square, Sprite circle, string prefabName, string displayName,
            Element element, int cost, float damage, float attackInterval, float range,
            float slowFactor, float slowDuration, Color turretColor, GameObject projectilePrefab)
        {
            var root = new GameObject(prefabName, typeof(Tower));

            AddSpriteChild(root, "Base", square, new Color(0.28f, 0.28f, 0.34f), 5,
                Vector3.zero, new Vector3(0.85f, 0.85f, 1f));
            var turret = AddSpriteChild(root, "Turret", circle, turretColor, 6,
                Vector3.zero, Vector3.one * 0.5f);

            EditSerialized(root.GetComponent<Tower>(), so =>
            {
                so.FindProperty("towerName").stringValue = displayName;
                so.FindProperty("element").enumValueIndex = (int)element;
                so.FindProperty("cost").intValue = cost;
                so.FindProperty("damage").floatValue = damage;
                so.FindProperty("attackInterval").floatValue = attackInterval;
                so.FindProperty("range").floatValue = range;
                so.FindProperty("slowFactor").floatValue = slowFactor;
                so.FindProperty("slowDuration").floatValue = slowDuration;
                so.FindProperty("projectilePrefab").objectReferenceValue = projectilePrefab;
                so.FindProperty("firePoint").objectReferenceValue = turret.transform;
            });

            SavePrefab(root, $"{TowerPrefabsDir}/{prefabName}.prefab");
        }
    }
}
