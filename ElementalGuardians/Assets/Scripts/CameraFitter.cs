using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// Sizes the orthographic camera so the whole grid (plus spawn/goal and
    /// space for the UI bars) is visible in portrait on any aspect ratio.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class CameraFitter : MonoBehaviour
    {
        [SerializeField] private float horizontalPadding = 0.4f;
        [Tooltip("Extra vertical world units for spawn/goal points and UI bars.")]
        [SerializeField] private float verticalPadding = 2.4f;

        private Camera cam;
        private float lastAspect = -1f;

        private void Awake()
        {
            cam = GetComponent<Camera>();
        }

        private void LateUpdate()
        {
            if (!Mathf.Approximately(cam.aspect, lastAspect))
            {
                Fit();
            }
        }

        private void Fit()
        {
            lastAspect = cam.aspect;

            float halfWidth = 2.5f + horizontalPadding;
            float halfHeight = 4f + verticalPadding;

            if (GridManager.Instance != null)
            {
                halfWidth = GridManager.Instance.Width * GridManager.Instance.TileSize * 0.5f + horizontalPadding;
                halfHeight = GridManager.Instance.Height * GridManager.Instance.TileSize * 0.5f + verticalPadding;
            }

            cam.orthographic = true;
            cam.orthographicSize = Mathf.Max(halfHeight, halfWidth / cam.aspect);
        }
    }
}
