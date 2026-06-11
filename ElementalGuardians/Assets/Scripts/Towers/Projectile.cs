using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// Homing projectile fired by towers. Pooled via PoolManager.
    /// </summary>
    public class Projectile : MonoBehaviour
    {
        [SerializeField] private float speed = 8f;
        [SerializeField] private float hitDistance = 0.15f;
        [Tooltip("Safety despawn if the target disappears mid-flight.")]
        [SerializeField] private float maxLifetime = 3f;

        private Enemy target;
        private float damage;
        private float slowFactor;
        private float slowDuration;
        private float lifetime;

        public void Launch(Enemy newTarget, float newDamage, float newSlowFactor, float newSlowDuration)
        {
            target = newTarget;
            damage = newDamage;
            slowFactor = newSlowFactor;
            slowDuration = newSlowDuration;
            lifetime = 0f;
        }

        private void Update()
        {
            if (GameManager.Instance != null && GameManager.Instance.State != GameState.Playing)
            {
                return;
            }

            lifetime += Time.deltaTime;
            if (lifetime > maxLifetime || target == null || !target.IsAlive)
            {
                Despawn();
                return;
            }

            Vector3 targetPosition = target.transform.position;
            transform.position = Vector3.MoveTowards(transform.position, targetPosition, speed * Time.deltaTime);

            if ((transform.position - targetPosition).sqrMagnitude <= hitDistance * hitDistance)
            {
                Hit();
            }
        }

        private void Hit()
        {
            if (target != null && target.IsAlive)
            {
                target.TakeDamage(damage);
                if (slowFactor > 0f)
                {
                    target.ApplySlow(slowFactor, slowDuration);
                }
            }

            Despawn();
        }

        private void Despawn()
        {
            target = null;
            PoolManager.Despawn(gameObject);
        }
    }
}
