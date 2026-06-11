using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// Automatically attacks the nearest enemy in range by firing pooled
    /// projectiles. Fire and Water towers are prefab variants of this script
    /// with different Inspector values.
    /// </summary>
    public class Tower : MonoBehaviour
    {
        [Header("Identity")]
        [SerializeField] private string towerName = "Fire Tower";
        [SerializeField] private Element element = Element.Fire;

        [Header("Stats")]
        [SerializeField] private int cost = 50;
        [SerializeField] private float damage = 10f;
        [Tooltip("Seconds between attacks.")]
        [SerializeField] private float attackInterval = 1f;
        [Tooltip("Range in grid units.")]
        [SerializeField] private float range = 3f;

        [Header("Slow Effect (0 = none)")]
        [Range(0f, 1f)]
        [SerializeField] private float slowFactor = 0f;
        [SerializeField] private float slowDuration = 2f;

        [Header("References")]
        [SerializeField] private GameObject projectilePrefab;
        [SerializeField] private Transform firePoint;

        private float cooldown;

        public string TowerName => towerName;
        public Element Element => element;
        public int Cost => cost;
        public float Range => range;

        private void Update()
        {
            if (GameManager.Instance != null && GameManager.Instance.State != GameState.Playing)
            {
                return;
            }

            cooldown -= Time.deltaTime;
            if (cooldown > 0f)
            {
                return;
            }

            Enemy target = FindNearestEnemy();
            if (target != null)
            {
                Fire(target);
                cooldown = attackInterval;
            }
        }

        private Enemy FindNearestEnemy()
        {
            Enemy nearest = null;
            float nearestSqr = range * range;

            for (int i = 0; i < Enemy.ActiveEnemies.Count; i++)
            {
                Enemy enemy = Enemy.ActiveEnemies[i];
                if (enemy == null || !enemy.IsAlive)
                {
                    continue;
                }

                float sqrDist = (enemy.transform.position - transform.position).sqrMagnitude;
                if (sqrDist <= nearestSqr)
                {
                    nearestSqr = sqrDist;
                    nearest = enemy;
                }
            }

            return nearest;
        }

        private void Fire(Enemy target)
        {
            if (projectilePrefab == null)
            {
                // No projectile assigned: apply the hit instantly instead.
                target.TakeDamage(damage);
                if (slowFactor > 0f)
                {
                    target.ApplySlow(slowFactor, slowDuration);
                }
                return;
            }

            Vector3 origin = firePoint != null ? firePoint.position : transform.position;
            GameObject instance = PoolManager.Spawn(projectilePrefab, origin, Quaternion.identity);
            Projectile projectile = instance.GetComponent<Projectile>();
            if (projectile != null)
            {
                projectile.Launch(target, damage, slowFactor, slowDuration);
            }
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(1f, 1f, 0f, 0.5f);
            Gizmos.DrawWireSphere(transform.position, range);
        }
    }
}
