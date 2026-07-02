import { getServerSideConfig } from "@/app/config/server";
import {
  IFLYTEK_BASE_URL,
  ApiPath,
  Iflytek,
  ModelProvider,
  ServiceProvider,
} from "@/app/constant";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth";
import { isModelNotavailableInServer } from "@/app/utils/model";
import { createHmac, randomUUID } from "crypto";

process.env.WS_NO_BUFFER_UTIL = "true";
process.env.WS_NO_UTF_8_VALIDATE = "true";
const NodeWebSocket = require("ws");

const serverConfig = getServerSideConfig();
const IFLYTEK_IMAGE_TIMEOUT_MS = 2 * 60 * 1000;
const IFLYTEK_IMAGE_HOST = "spark-image-api-test.xf-yun.com";
const IFLYTEK_IMAGE_PATH = "/v2.1/image";

type OpenAIContentPart = {
  type?: string;
  text?: string;
  image_url?: {
    url?: string;
  };
};

type OpenAIMessage = {
  role?: string;
  content?: string | OpenAIContentPart[];
};

type OpenAIRequestPayload = {
  model?: string;
  messages?: OpenAIMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
};

type IflytekImageTextPart = {
  role: string;
  content: string;
  content_type?: "image";
  content_meta?: {
    url: boolean;
  };
};

type IflytekImageMetadata = {
  mimeType: string;
  base64Length: number;
  byteSize: number;
};

type IflytekImageEndpoint = {
  host: string;
  path: string;
};

type IflytekImageBuildResult = {
  requestId: string;
  payload: unknown;
  domain: string;
  endpoint: IflytekImageEndpoint;
  images: IflytekImageMetadata[];
};

export async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[Iflytek Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const authResult = auth(req, ModelProvider.Iflytek);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  try {
    const response = await request(req);
    return response;
  } catch (e) {
    console.error("[Iflytek] ", e);
    return NextResponse.json({
      error: true,
      message: getSafeErrorMessage(e),
    });
  }
}

async function request(req: NextRequest) {
  const path = `${req.nextUrl.pathname}`.replaceAll(ApiPath.Iflytek, "");
  const clonedBody = await req.text();
  const jsonBody = parseJsonBody(clonedBody);

  if (isIflytekImageRequest(path, jsonBody)) {
    return requestImage(jsonBody, req.signal);
  }

  return requestHttp(req, path, clonedBody, jsonBody);
}

async function requestHttp(
  req: NextRequest,
  path: string,
  clonedBody: string,
  jsonBody: OpenAIRequestPayload | undefined,
) {
  const controller = new AbortController();
  let baseUrl = serverConfig.iflytekUrl || IFLYTEK_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Iflytek Proxy] ", path);
  console.log("[Iflytek Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  const fetchUrl = `${baseUrl}${path}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization") ?? "",
    },
    method: req.method,
    body: clonedBody,
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  if (serverConfig.customModels && jsonBody?.model) {
    try {
      if (
        isModelNotavailableInServer(
          serverConfig.customModels,
          jsonBody.model,
          ServiceProvider.Iflytek as string,
        )
      ) {
        return NextResponse.json(
          {
            error: true,
            message: `you are not allowed to use ${jsonBody.model} model`,
          },
          {
            status: 403,
          },
        );
      }
    } catch (e) {
      console.error(`[Iflytek] filter`, e);
    }
  }

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    newHeaders.set("X-Accel-Buffering", "no");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestImage(
  payload: OpenAIRequestPayload | undefined,
  requestSignal: AbortSignal,
) {
  if (!payload) {
    return safeJsonError("请求体不是有效的 JSON。", 400);
  }

  const missing = getMissingImageEnvNames();
  if (missing.length > 0) {
    return safeJsonError(
      `讯飞图像理解缺少必要服务端配置：${missing.join(", ")}。`,
      500,
    );
  }

  let imageRequest: IflytekImageBuildResult;
  try {
    imageRequest = buildIflytekImagePayload(payload);
  } catch (e) {
    return safeJsonError(getSafeErrorMessage(e), 400);
  }

  logImageEvent(imageRequest.requestId, "start", {
    startedAt: new Date().toISOString(),
    host: imageRequest.endpoint.host,
    path: imageRequest.endpoint.path,
    domain: imageRequest.domain,
    stream: true,
    imageCount: imageRequest.images.length,
    images: imageRequest.images,
  });

  if (payload.stream) {
    return streamIflytekImage(imageRequest, requestSignal);
  }

  try {
    const content = await runIflytekImageSocket(imageRequest, requestSignal);
    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content,
          },
        },
      ],
    });
  } catch (e) {
    return safeJsonError(getSafeErrorMessage(e), 502);
  }
}

function streamIflytekImage(
  imageRequest: IflytekImageBuildResult,
  requestSignal: AbortSignal,
) {
  const encoder = new TextEncoder();
  let abortController: AbortController | undefined;
  let streamClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      abortController = new AbortController();
      streamClosed = false;
      let hasSentText = false;

      const enqueueRaw = (raw: string) => {
        if (!streamClosed) {
          controller.enqueue(encoder.encode(raw));
        }
      };
      const enqueueChunk = (chunk: string) => {
        hasSentText = true;
        enqueueRaw(toSseChunk(chunk));
      };
      const closeStream = () => {
        if (!streamClosed) {
          streamClosed = true;
          controller.close();
        }
      };
      const closeOnAbort = () => abortController?.abort();
      requestSignal.addEventListener("abort", closeOnAbort, { once: true });

      enqueueRaw(": connected\n\n");

      runIflytekImageSocket(imageRequest, abortController.signal, enqueueChunk)
        .then((content) => {
          if (!content && !hasSentText) {
            enqueueRaw(
              toSseErrorChunk("讯飞 imagev4 请求未返回有效内容，请稍后重试。"),
            );
          }
          enqueueRaw("data: [DONE]\n\n");
          closeStream();
        })
        .catch((e) => {
          const message = getSafeErrorMessage(e);
          if (hasSentText) {
            enqueueChunk(`\n\n${message}`);
          } else {
            enqueueRaw(
              toSseErrorChunk(
                message || "讯飞 imagev4 服务暂时不可用，请稍后重试。",
              ),
            );
          }
          enqueueRaw("data: [DONE]\n\n");
          closeStream();
        })
        .finally(() => {
          requestSignal.removeEventListener("abort", closeOnAbort);
        });
    },
    cancel() {
      streamClosed = true;
      abortController?.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function runIflytekImageSocket(
  imageRequest: IflytekImageBuildResult,
  requestSignal: AbortSignal,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const wsUrl = buildSignedImageUrl();
    const ws = new NodeWebSocket(wsUrl);
    const chunks: string[] = [];
    const startedAt = Date.now();
    let settled = false;
    let frameCount = 0;
    let hasText = false;
    let firstFrameMs: number | undefined;
    let finalHeaderStatus: number | undefined;
    let finalChoicesStatus: number | undefined;

    const timeoutId = setTimeout(() => {
      logImageEvent(imageRequest.requestId, "timeout", {
        timeoutMs: IFLYTEK_IMAGE_TIMEOUT_MS,
        frameCount,
        hasText,
      });
      finish(reject, new Error("讯飞 imagev4 服务响应超时，请稍后重试。"));
    }, IFLYTEK_IMAGE_TIMEOUT_MS);

    const abort = () => {
      logImageEvent(imageRequest.requestId, "abort", {
        frameCount,
        hasText,
      });
      finish(reject, new Error("讯飞 imagev4 请求已取消。"));
    };

    requestSignal.addEventListener("abort", abort, { once: true });

    function cleanup() {
      clearTimeout(timeoutId);
      requestSignal.removeEventListener("abort", abort);
      if (
        ws.readyState === NodeWebSocket.OPEN ||
        ws.readyState === NodeWebSocket.CONNECTING
      ) {
        ws.close();
      }
    }

    function finish<T>(done: (value: T) => void, value: T) {
      if (settled) return;
      settled = true;
      cleanup();
      logImageEvent(imageRequest.requestId, "finish", {
        elapsedMs: Date.now() - startedAt,
        frameCount,
        hasText,
        textLength: chunks.join("").length,
        finalHeaderStatus,
        finalChoicesStatus,
      });
      done(value);
    }

    ws.on("open", () => {
      logImageEvent(imageRequest.requestId, "ws-open", {
        elapsedMs: Date.now() - startedAt,
      });
      ws.send(JSON.stringify(imageRequest.payload));
    });

    ws.on("message", (data: Buffer | string) => {
      try {
        const raw = typeof data === "string" ? data : data.toString("utf8");
        const message = JSON.parse(raw);
        frameCount += 1;
        if (firstFrameMs === undefined) {
          firstFrameMs = Date.now() - startedAt;
        }

        const code = Number(message?.header?.code ?? 0);
        const headerStatus = Number(message?.header?.status);
        const choicesStatus = Number(message?.payload?.choices?.status);
        if (!Number.isNaN(headerStatus)) finalHeaderStatus = headerStatus;
        if (!Number.isNaN(choicesStatus)) finalChoicesStatus = choicesStatus;

        if (code !== 0) {
          logImageEvent(imageRequest.requestId, "upstream-error", {
            frameCount,
            firstFrameMs,
            headerCode: code,
            headerStatus: finalHeaderStatus,
            choicesStatus: finalChoicesStatus,
          });
          finish(reject, new Error(`讯飞图像理解返回错误（code ${code}）。`));
          return;
        }

        const chunk = extractIflytekImageContent(message);
        if (chunk) {
          hasText = true;
          chunks.push(chunk);
          onChunk?.(chunk);
        }

        logImageEvent(imageRequest.requestId, "frame", {
          frameCount,
          firstFrameMs,
          headerCode: code,
          headerStatus: finalHeaderStatus,
          choicesStatus: finalChoicesStatus,
          hasText: !!chunk,
          textLength: chunk.length,
        });

        if (isIflytekImageFinalFrame(message)) {
          if (chunks.length === 0) {
            finish(
              reject,
              new Error("讯飞 imagev4 请求未返回有效内容，请稍后重试。"),
            );
            return;
          }
          finish(resolve, chunks.join(""));
        }
      } catch (e) {
        logImageEvent(imageRequest.requestId, "parse-error", {
          frameCount,
          hasText,
        });
        finish(reject, new Error("讯飞图像理解响应解析失败。"));
      }
    });

    ws.on("error", () => {
      logImageEvent(imageRequest.requestId, "ws-error", {
        frameCount,
        hasText,
      });
      finish(reject, new Error("讯飞 imagev4 服务暂时不可用，请稍后重试。"));
    });

    ws.on("close", () => {
      if (!settled) {
        logImageEvent(imageRequest.requestId, "ws-close", {
          frameCount,
          hasText,
          finalHeaderStatus,
          finalChoicesStatus,
        });
        if (chunks.length > 0) {
          finish(resolve, chunks.join(""));
        } else {
          finish(
            reject,
            new Error("讯飞 imagev4 请求未返回有效内容，请稍后重试。"),
          );
        }
      }
    });
  });
}

function buildIflytekImagePayload(
  payload: OpenAIRequestPayload,
): IflytekImageBuildResult {
  const endpoint = getImageEndpoint();
  const { text, images } = buildIflytekImageText(payload.messages ?? []);
  const requestId = randomUUID();
  const domain = getImageDomain();

  return {
    requestId,
    domain,
    endpoint,
    images,
    payload: {
      header: {
        app_id: serverConfig.iflytekAppId,
        uid: "web-chat-user",
        debug: false,
      },
      parameter: {
        chat: {
          domain,
          stream: true,
          temperature: payload.temperature ?? 0.5,
          top_k: 4,
          max_tokens: payload.max_tokens ?? 1024,
          auditing: "default",
          auditing_debug: false,
          auditing_input: false,
          auditing_input_strategy: "",
          auditing_output: false,
          auditing_output_strategy: "",
          chat_id: requestId,
          mup: false,
        },
      },
      payload: {
        message: {
          text,
        },
      },
    },
  };
}

function buildIflytekImageText(messages: OpenAIMessage[]) {
  const imageParts: IflytekImageTextPart[] = [];
  const images: IflytekImageMetadata[] = [];
  const textParts: IflytekImageTextPart[] = [];

  for (const message of messages) {
    const role = normalizeIflytekRole(message.role);
    const content = message.content;

    if (typeof content === "string") {
      const trimmed = content.trim();
      if (trimmed) {
        textParts.push({ role, content: trimmed });
      }
      continue;
    }

    for (const part of content ?? []) {
      if (part.type === "image_url" && part.image_url?.url) {
        const image = parseImagePart(part.image_url.url);
        images.push(image.metadata);
        imageParts.push({
          role: "user",
          content: image.base64,
          content_type: "image",
          content_meta: {
            url: false,
          },
        });
      } else if (part.type === "text" && part.text?.trim()) {
        textParts.push({ role, content: part.text.trim() });
      }
    }
  }

  if (
    imageParts.length > 0 &&
    !textParts.some((part) => part.role === "user")
  ) {
    textParts.push({ role: "user", content: "请描述这张图片。" });
  }

  if (
    textParts.length === 0 ||
    !textParts.some((part) => part.role === "user")
  ) {
    throw new Error("请输入要发送给讯飞图像理解的问题。");
  }

  if (imageParts.length === 0) {
    return { images, text: textParts };
  }

  const lastUserIndex = findLastIndex(
    textParts,
    (part) => part.role === "user",
  );
  const insertAt = lastUserIndex >= 0 ? lastUserIndex : textParts.length;

  return {
    images,
    text: [
      ...textParts.slice(0, insertAt),
      ...imageParts,
      ...textParts.slice(insertAt),
    ],
  };
}

function buildSignedImageUrl() {
  const endpoint = getImageEndpoint();
  const imageUrl = new URL(`wss://${endpoint.host}${endpoint.path}`);
  const date = new Date().toUTCString();
  const requestLine = `GET ${endpoint.path} HTTP/1.1`;
  const signatureOrigin = `host: ${endpoint.host}\ndate: ${date}\n${requestLine}`;
  const signature = createHmac(
    "sha256",
    serverConfig.iflytekApiSecret as string,
  )
    .update(signatureOrigin)
    .digest("base64");
  const authorizationOrigin =
    `api_key="${serverConfig.iflytekApiKey}", algorithm="hmac-sha256", ` +
    `headers="host date request-line", signature="${signature}"`;

  imageUrl.searchParams.set(
    "authorization",
    Buffer.from(authorizationOrigin).toString("base64"),
  );
  imageUrl.searchParams.set("date", date);
  imageUrl.searchParams.set("host", endpoint.host);

  return imageUrl.toString();
}

function getImageEndpoint() {
  const legacyUrl = serverConfig.iflytekImageUrl;
  const hasSplitEndpoint =
    !!serverConfig.iflytekImageWsHost || !!serverConfig.iflytekImageWsPath;
  const legacyEndpoint =
    legacyUrl && !hasSplitEndpoint ? getEndpointFromUrl(legacyUrl) : undefined;
  const endpoint = {
    host:
      normalizeImageHost(serverConfig.iflytekImageWsHost) ??
      legacyEndpoint?.host ??
      IFLYTEK_IMAGE_HOST,
    path:
      normalizeImagePath(serverConfig.iflytekImageWsPath) ??
      legacyEndpoint?.path ??
      IFLYTEK_IMAGE_PATH,
  };

  if (
    endpoint.host !== IFLYTEK_IMAGE_HOST ||
    endpoint.path !== IFLYTEK_IMAGE_PATH
  ) {
    throw new Error(
      "讯飞图像理解地址配置不正确，请检查 IFLYTEK_IMAGE_WS_HOST 和 IFLYTEK_IMAGE_WS_PATH。",
    );
  }

  return endpoint;
}

function isIflytekImageRequest(
  path: string,
  payload: OpenAIRequestPayload | undefined,
) {
  return (
    path.includes(Iflytek.ImageChatPath) ||
    normalizeModelName(payload?.model) === "image"
  );
}

function getMissingImageEnvNames() {
  return [
    ["XF_API_KEY", serverConfig.iflytekApiKey],
    ["XF_API_SECRET", serverConfig.iflytekApiSecret],
    ["XF_APPID", serverConfig.iflytekAppId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}
function getImageDomain() {
  const domain = (serverConfig.iflytekImageModel || "imagev4").trim();
  if (domain !== "imagev4") {
    throw new Error(
      "讯飞图像理解模型配置不正确，IFLYTEK_IMAGE_MODEL 必须为 imagev4。",
    );
  }
  return domain;
}

function normalizeIflytekRole(role?: string) {
  if (role === "system" || role === "assistant") {
    return role;
  }
  return "user";
}

function normalizeModelName(model?: string) {
  return (model ?? "").split(/@(?!.*@)/)[0];
}

function getEndpointFromUrl(url: string): IflytekImageEndpoint | undefined {
  const raw = url.trim();
  if (!raw) return undefined;
  const parsed = new URL(raw.includes("://") ? raw : `wss://${raw}`);
  return {
    host: parsed.host,
    path: parsed.pathname || IFLYTEK_IMAGE_PATH,
  };
}

function normalizeImageHost(host?: string) {
  const raw = host?.trim();
  if (!raw) return undefined;
  if (raw.includes("://")) {
    return new URL(raw).host;
  }
  return raw.split("/")[0];
}

function normalizeImagePath(path?: string) {
  const raw = path?.trim();
  if (!raw) return undefined;
  if (raw.includes("://")) {
    return new URL(raw).pathname || IFLYTEK_IMAGE_PATH;
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i])) return i;
  }
  return -1;
}
function parseJsonBody(body: string): OpenAIRequestPayload | undefined {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function extractIflytekImageContent(message: any) {
  const text = message?.payload?.choices?.text;
  if (Array.isArray(text)) {
    return text.map((item) => item?.content ?? "").join("");
  }
  if (typeof text === "string") return text;
  if (typeof text?.content === "string") return text.content;
  if (typeof message?.payload?.message?.text === "string") {
    return message.payload.message.text;
  }
  return "";
}

function isIflytekImageFinalFrame(message: any) {
  return (
    Number(message?.header?.status) === 2 ||
    Number(message?.payload?.choices?.status) === 2
  );
}

function parseImagePart(url: string) {
  const base64 = stripDataUrlPrefix(url).replace(/\s/g, "");
  const mimeType = getDataUrlMimeType(url);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteSize = Math.max(0, Math.floor((base64.length * 3) / 4) - padding);

  return {
    base64,
    metadata: {
      mimeType,
      base64Length: base64.length,
      byteSize,
    },
  };
}

function getDataUrlMimeType(url: string) {
  const match = url.match(/^data:([^;,]+);base64,/i);
  return match?.[1] ?? "unknown";
}

function logImageEvent(
  requestId: string,
  event: string,
  details: Record<string, unknown>,
) {
  console.log(`[Iflytek Image][${requestId}] ${event}`, details);
}

function stripDataUrlPrefix(url: string) {
  const marker = "base64,";
  const index = url.indexOf(marker);
  return index >= 0 ? url.slice(index + marker.length) : url;
}

function toSseChunk(content: string) {
  return `data: ${JSON.stringify({
    choices: [
      {
        delta: {
          content,
        },
      },
    ],
  })}\n\n`;
}

function toSseErrorChunk(message: string) {
  return `data: ${JSON.stringify({
    error: true,
    message,
  })}\n\n`;
}
function safeJsonError(message: string, status: number) {
  return NextResponse.json(
    {
      error: true,
      message,
    },
    { status },
  );
}

function getSafeErrorMessage(e: unknown) {
  if (e instanceof Error && e.message) return e.message;
  return "讯飞图像理解请求失败，请稍后重试。";
}
