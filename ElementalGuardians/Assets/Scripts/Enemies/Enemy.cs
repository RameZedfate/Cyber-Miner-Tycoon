using System;
using System.Collections.Generic;
using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// Walks the path from spawn to goal, takes damage from projectiles,
    /// rewards gold when killed. Pooled via PoolManager.
    /// </summary>
    public class Enemy : MonoBehaviour
    {
        /// <summary>All enemies currently alive in the scene (for tower targeting).</summary>
        public static readonly List<Enemy> ActiveEnemies = new List<Enemy>();

        public static event Action<Enemy> AnyEnemyKilled;
        public static event Action<Enemy> AnyEnemyReachedGoal;

        [Header("Stats")]
        [SerializeField] private string enemyName = "Normal Enemy";
        [SerializeField] private float maxHealth = 30f;
        [SerializeField] private float moveSpeed = 1.5f;
        [SerializeField] private int goldReward = 10;

        [Header("Visuals")]
        [Tooltip("Optional health bar fill transform; its X scale shrinks with HP.")]
        [SerializeField] private Transform healthFill;

        private float currentHealth;
        private float slowFactor;
        private float slowTimer;
        private IReadOnlyList<Vector3> path;
        private int pathIndex;
        private Vector3 healthFillBaseScale = Vector3.one;

        public string EnemyName => enemyName;
        public bool IsAlive => currentHealth > 0f && gameObject.activeInHierarchy;

        private void Awake()
        {
            if (healthFill != null)
            {
                healthFillBaseScale = healthFill.localScale;
            }
        }

        private void OnEnable()
        {
            ActiveEnemies.Add(this);
        }

        private void OnDisable()
        {
            ActiveEnemies.Remove(this);
        }

        public void Initialize(IReadOnlyList<Vector3> waypoints)
        {
            path = waypoints;
            pathIndex = 1;
            currentHealth = maxHealth;
            slowFactor = 0f;
            slowTimer = 0f;

            if (path != null && path.Count > 0)
            {
                transform.position = path[0];
            }

            UpdateHealthBar();
        }

        private void Update()
        {
            if (GameManager.Instance != null && GameManager.Instance.State != GameState.Playing)
            {
                return;
            }

            TickSlow();
            Move();
        }

        public void TakeDamage(float damage)
        {
            if (!IsAlive)
            {
                return;
            }

            currentHealth -= damage;
            UpdateHealthBar();

            if (currentHealth <= 0f)
            {
                Die();
            }
        }

        public void ApplySlow(float factor, float duration)
        {
            slowFactor = Mathf.Clamp01(Mathf.Max(slowFactor, factor));
            slowTimer = Mathf.Max(slowTimer, duration);
        }

        private void TickSlow()
        {
            if (slowTimer <= 0f)
            {
                return;
            }

            slowTimer -= Time.deltaTime;
            if (slowTimer <= 0f)
            {
                slowFactor = 0f;
            }
        }

        private void Move()
        {
            if (path == null || pathIndex >= path.Count)
            {
                return;
            }

            Vector3 target = path[pathIndex];
            float step = moveSpeed * (1f - slowFactor) * Time.deltaTime;
            transform.position = Vector3.MoveTowards(transform.position, target, step);

            if ((transform.position - target).sqrMagnitude < 0.0004f)
            {
                pathIndex++;
                if (pathIndex >= path.Count)
                {
                    ReachGoal();
                }
            }
        }

        private void Die()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.AddGold(goldReward);
            }

            AnyEnemyKilled?.Invoke(this);
            PoolManager.Despawn(gameObject);
        }

        private void ReachGoal()
        {
            currentHealth = 0f;
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnEnemyReachedGoal();
            }

            AnyEnemyReachedGoal?.Invoke(this);
            PoolManager.Despawn(gameObject);
        }

        private void UpdateHealthBar()
        {
            if (healthFill == null)
            {
                return;
            }

            float pct = maxHealth > 0f ? Mathf.Clamp01(currentHealth / maxHealth) : 0f;
            Vector3 scale = healthFillBaseScale;
            scale.x *= pct;
            healthFill.localScale = scale;
        }
    }
}
