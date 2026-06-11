using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// Generates simple white square/circle sprites at runtime. Used only as a
    /// fallback when a prefab's sprite reference is missing, so the game never
    /// renders invisible objects.
    /// </summary>
    public static class RuntimeSpriteFactory
    {
        private const int Size = 64;

        private static Sprite square;
        private static Sprite circle;

        public static Sprite Square
        {
            get
            {
                if (square == null)
                {
                    Texture2D tex = new Texture2D(Size, Size, TextureFormat.RGBA32, false);
                    Color32[] pixels = new Color32[Size * Size];
                    for (int i = 0; i < pixels.Length; i++)
                    {
                        pixels[i] = new Color32(255, 255, 255, 255);
                    }
                    tex.SetPixels32(pixels);
                    tex.Apply();
                    square = Sprite.Create(tex, new Rect(0, 0, Size, Size), new Vector2(0.5f, 0.5f), Size);
                }
                return square;
            }
        }

        public static Sprite Circle
        {
            get
            {
                if (circle == null)
                {
                    Texture2D tex = new Texture2D(Size, Size, TextureFormat.RGBA32, false);
                    float radius = Size * 0.5f - 1f;
                    Vector2 center = new Vector2(Size * 0.5f - 0.5f, Size * 0.5f - 0.5f);
                    Color32[] pixels = new Color32[Size * Size];
                    for (int y = 0; y < Size; y++)
                    {
                        for (int x = 0; x < Size; x++)
                        {
                            float dist = Vector2.Distance(new Vector2(x, y), center);
                            byte alpha = (byte)(255f * Mathf.Clamp01(radius - dist + 0.5f));
                            pixels[y * Size + x] = new Color32(255, 255, 255, alpha);
                        }
                    }
                    tex.SetPixels32(pixels);
                    tex.Apply();
                    circle = Sprite.Create(tex, new Rect(0, 0, Size, Size), new Vector2(0.5f, 0.5f), Size);
                }
                return circle;
            }
        }
    }
}
