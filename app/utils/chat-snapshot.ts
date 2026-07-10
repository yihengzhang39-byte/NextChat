const OMIT = Symbol("omit-chat-image");

function sanitize(value: unknown): unknown | typeof OMIT {
  if (typeof value === "string")
    return value.startsWith("data:image/") ? OMIT : value;
  if (Array.isArray(value))
    return value.map(sanitize).filter((item) => item !== OMIT);
  if (!value || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  const imageUrl = object.image_url as Record<string, unknown> | undefined;
  if (
    object.type === "image_url" &&
    typeof imageUrl?.url === "string" &&
    (imageUrl.url.startsWith("data:image/") ||
      imageUrl.url.startsWith("/api/cache/"))
  )
    return OMIT;
  return Object.fromEntries(
    Object.entries(object).flatMap(([key, child]) => {
      const sanitized = sanitize(child);
      return sanitized === OMIT ? [] : [[key, sanitized]];
    }),
  );
}

export function sanitizeChatSnapshot(data: unknown): Record<string, unknown> {
  if (!data || Array.isArray(data) || typeof data !== "object")
    throw new Error("invalid chat session data");
  return sanitize(data) as Record<string, unknown>;
}
