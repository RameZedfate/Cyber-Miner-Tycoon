using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// Spawns pooled enemies at the grid's spawn point and hands them the path.
    /// </summary>
    public class EnemySpawner : MonoBehaviour
    {
        public static EnemySpawner Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public Enemy Spawn(GameObject enemyPrefab)
        {
            if (enemyPrefab == null || GridManager.Instance == null)
            {
                return null;
            }

            var path = GridManager.Instance.PathWaypoints;
            if (path == null || path.Count == 0)
            {
                return null;
            }

            GameObject instance = PoolManager.Spawn(enemyPrefab, path[0], Quaternion.identity);
            Enemy enemy = instance.GetComponent<Enemy>();
            if (enemy != null)
            {
                enemy.Initialize(path);
            }

            return enemy;
        }
    }
}
