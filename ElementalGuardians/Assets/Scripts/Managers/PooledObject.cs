using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>Tags a pooled instance with the prefab pool it belongs to.</summary>
    public class PooledObject : MonoBehaviour
    {
        public int PrefabId { get; set; }
    }
}
