using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace ElementalGuardians
{
    [Serializable]
    public class Wave
    {
        public string waveName = "Wave";
        public int normalCount;
        public int fastCount;
        public int tankCount;
        public float spawnInterval = 0.8f;
    }

    /// <summary>
    /// Runs the 10-wave sequence. Tracks living enemies per wave and reports
    /// victory to the GameManager once the final wave is cleared.
    /// </summary>
    public class WaveManager : MonoBehaviour
    {
        public static WaveManager Instance { get; private set; }

        [Header("Enemy Prefabs")]
        [SerializeField] private GameObject normalEnemyPrefab;
        [SerializeField] private GameObject fastEnemyPrefab;
        [SerializeField] private GameObject tankEnemyPrefab;

        [Header("Timing")]
        [SerializeField] private float initialDelay = 3f;
        [SerializeField] private float timeBetweenWaves = 5f;

        [Header("Waves")]
        [SerializeField] private List<Wave> waves = new List<Wave>();

        private int aliveEnemies;

        public int CurrentWave { get; private set; }
        public int TotalWaves => waves.Count;

        /// <summary>(currentWave, totalWaves) — fired when a wave starts.</summary>
        public event Action<int, int> WaveChanged;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;

            if (waves.Count == 0)
            {
                BuildDefaultWaves();
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void OnEnable()
        {
            Enemy.AnyEnemyKilled += HandleEnemyRemoved;
            Enemy.AnyEnemyReachedGoal += HandleEnemyRemoved;
        }

        private void OnDisable()
        {
            Enemy.AnyEnemyKilled -= HandleEnemyRemoved;
            Enemy.AnyEnemyReachedGoal -= HandleEnemyRemoved;
        }

        private void Start()
        {
            StartCoroutine(RunWaves());
        }

        private void Reset()
        {
            BuildDefaultWaves();
        }

        /// <summary>Fills the wave list with the default 10-wave MVP ramp.</summary>
        public void BuildDefaultWaves()
        {
            waves.Clear();
            for (int waveNumber = 1; waveNumber <= 10; waveNumber++)
            {
                waves.Add(new Wave
                {
                    waveName = $"Wave {waveNumber}",
                    normalCount = 4 + waveNumber,
                    fastCount = waveNumber >= 3 ? (waveNumber - 2) * 2 : 0,
                    tankCount = waveNumber >= 5 ? waveNumber - 4 : 0,
                    spawnInterval = Mathf.Max(0.4f, 1f - waveNumber * 0.05f)
                });
            }
        }

        private void HandleEnemyRemoved(Enemy enemy)
        {
            aliveEnemies = Mathf.Max(0, aliveEnemies - 1);
        }

        private IEnumerator RunWaves()
        {
            yield return new WaitForSeconds(initialDelay);

            for (int i = 0; i < waves.Count; i++)
            {
                if (!IsPlaying())
                {
                    yield break;
                }

                CurrentWave = i + 1;
                WaveChanged?.Invoke(CurrentWave, TotalWaves);

                yield return SpawnWave(waves[i]);

                // Wait for the battlefield to clear before the next wave.
                while (aliveEnemies > 0)
                {
                    if (!IsPlaying())
                    {
                        yield break;
                    }
                    yield return null;
                }

                if (i < waves.Count - 1)
                {
                    yield return new WaitForSeconds(timeBetweenWaves);
                }
            }

            if (IsPlaying() && GameManager.Instance != null)
            {
                GameManager.Instance.NotifyAllWavesCleared();
            }
        }

        private IEnumerator SpawnWave(Wave wave)
        {
            Queue<GameObject> spawnQueue = BuildSpawnQueue(wave);

            while (spawnQueue.Count > 0)
            {
                if (!IsPlaying())
                {
                    yield break;
                }

                GameObject prefab = spawnQueue.Dequeue();
                if (EnemySpawner.Instance != null && EnemySpawner.Instance.Spawn(prefab) != null)
                {
                    aliveEnemies++;
                }

                yield return new WaitForSeconds(wave.spawnInterval);
            }
        }

        /// <summary>Interleaves the three enemy types so waves feel mixed.</summary>
        private Queue<GameObject> BuildSpawnQueue(Wave wave)
        {
            var queue = new Queue<GameObject>();
            int normals = wave.normalCount;
            int fasts = wave.fastCount;
            int tanks = wave.tankCount;

            while (normals > 0 || fasts > 0 || tanks > 0)
            {
                if (normals > 0 && normalEnemyPrefab != null)
                {
                    queue.Enqueue(normalEnemyPrefab);
                }
                normals = Mathf.Max(0, normals - 1);

                if (fasts > 0 && fastEnemyPrefab != null)
                {
                    queue.Enqueue(fastEnemyPrefab);
                }
                fasts = Mathf.Max(0, fasts - 1);

                if (tanks > 0 && tankEnemyPrefab != null)
                {
                    queue.Enqueue(tankEnemyPrefab);
                }
                tanks = Mathf.Max(0, tanks - 1);
            }

            return queue;
        }

        private static bool IsPlaying()
        {
            return GameManager.Instance == null || GameManager.Instance.State == GameState.Playing;
        }
    }
}
