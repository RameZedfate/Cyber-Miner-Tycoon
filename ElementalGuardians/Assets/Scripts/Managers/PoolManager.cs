using System.Collections.Generic;
using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// Simple object pool keyed by source prefab. Used for enemies and
    /// projectiles so they are recycled instead of instantiated/destroyed.
    /// </summary>
    public class PoolManager : MonoBehaviour
    {
        public static PoolManager Instance { get; private set; }

        private readonly Dictionary<int, Queue<GameObject>> pools = new Dictionary<int, Queue<GameObject>>();

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

        /// <summary>Spawns from the pool, falling back to Instantiate when no pool exists.</summary>
        public static GameObject Spawn(GameObject prefab, Vector3 position, Quaternion rotation)
        {
            if (Instance != null)
            {
                return Instance.Get(prefab, position, rotation);
            }

            return Instantiate(prefab, position, rotation);
        }

        /// <summary>Returns an instance to its pool, destroying it when unpooled.</summary>
        public static void Despawn(GameObject instance)
        {
            if (instance == null)
            {
                return;
            }

            if (Instance != null)
            {
                Instance.Release(instance);
            }
            else
            {
                Destroy(instance);
            }
        }

        public GameObject Get(GameObject prefab, Vector3 position, Quaternion rotation)
        {
            int prefabId = prefab.GetInstanceID();
            if (!pools.TryGetValue(prefabId, out Queue<GameObject> queue))
            {
                queue = new Queue<GameObject>();
                pools[prefabId] = queue;
            }

            GameObject instance = null;
            while (queue.Count > 0 && instance == null)
            {
                instance = queue.Dequeue();
            }

            if (instance == null)
            {
                instance = Instantiate(prefab, position, rotation, transform);
                PooledObject pooled = instance.GetComponent<PooledObject>();
                if (pooled == null)
                {
                    pooled = instance.AddComponent<PooledObject>();
                }
                pooled.PrefabId = prefabId;
            }
            else
            {
                instance.transform.SetPositionAndRotation(position, rotation);
            }

            instance.SetActive(true);
            return instance;
        }

        public void Release(GameObject instance)
        {
            PooledObject pooled = instance.GetComponent<PooledObject>();
            if (pooled == null)
            {
                Destroy(instance);
                return;
            }

            instance.SetActive(false);
            if (!pools.TryGetValue(pooled.PrefabId, out Queue<GameObject> queue))
            {
                queue = new Queue<GameObject>();
                pools[pooled.PrefabId] = queue;
            }

            queue.Enqueue(instance);
        }
    }
}
