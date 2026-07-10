import { sanitizeChatSnapshot } from "../app/utils/chat-snapshot";

describe("sanitizeChatSnapshot", () => {
  test("removes inline and legacy cached images but keeps protected file URLs", () => {
    const data = sanitizeChatSnapshot({
      messages: [
        {
          content: [
            { type: "text", text: "question" },
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64,x" },
            },
            { type: "image_url", image_url: { url: "/api/cache/old.png" } },
            {
              type: "image_url",
              image_url: { url: "/api/chat/files/file-id" },
            },
          ],
        },
      ],
    });

    expect(data).toEqual({
      messages: [
        {
          content: [
            { type: "text", text: "question" },
            {
              type: "image_url",
              image_url: { url: "/api/chat/files/file-id" },
            },
          ],
        },
      ],
    });
  });
});
