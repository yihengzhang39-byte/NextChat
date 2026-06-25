import { getServerSideConfig } from "@/app/config/server";
import {
  BAIDU_BASE_URL,
  BAIDU_V2_BASE_URL,
  ApiPath,
  ModelProvider,
  ServiceProvider,
} from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth";
import { isModelNotavailableInServer } from "@/app/utils/model";
import { getAccessToken, isBaiduV2Key } from "@/app/utils/baidu";

const serverConfig = getServerSideConfig();

export async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[Baidu Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const authResult = auth(req, ModelProvider.Ernie);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  const apiKey = serverConfig.baiduApiKey;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: true,
        message: `missing BAIDU_API_KEY in server env vars`,
      },
      {
        status: 401,
      },
    );
  }

  // v2 API (bce-v3 Bearer token) — Secret Key is not required
  if (isBaiduV2Key(apiKey)) {
    try {
      const response = await requestV2(req, apiKey);
      return response;
    } catch (e) {
      console.error("[Baidu v2] ", e);
      return NextResponse.json(prettyObject(e));
    }
  }

  // v1 API (legacy OAuth2) — requires both API Key and Secret Key
  if (!serverConfig.baiduSecretKey) {
    return NextResponse.json(
      {
        error: true,
        message: `missing BAIDU_SECRET_KEY in server env vars`,
      },
      {
        status: 401,
      },
    );
  }

  try {
    const response = await requestV1(req);
    return response;
  } catch (e) {
    console.error("[Baidu v1] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

/**
 * v2 API request (OpenAI-compatible).
 * Auth: Authorization: Bearer <bce-v3-key>
 * Endpoint: https://qianfan.baidubce.com/v2/chat/completions
 */
async function requestV2(req: NextRequest, apiKey: string) {
  const controller = new AbortController();

  let path = `${req.nextUrl.pathname}`.replaceAll(ApiPath.Baidu, "");

  let baseUrl = serverConfig.baiduUrl || BAIDU_V2_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Baidu v2 Proxy] ", path);
  console.log("[Baidu v2 Base Url]", baseUrl);

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
      Authorization: `Bearer ${apiKey}`,
    },
    method: req.method,
    body: req.body,
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  // Filter restricted models
  if (serverConfig.customModels && req.body) {
    try {
      const clonedBody = await req.text();
      fetchOptions.body = clonedBody;

      const jsonBody = JSON.parse(clonedBody) as { model?: string };

      if (
        isModelNotavailableInServer(
          serverConfig.customModels,
          jsonBody?.model as string,
          ServiceProvider.Baidu as string,
        )
      ) {
        return NextResponse.json(
          {
            error: true,
            message: `you are not allowed to use ${jsonBody?.model} model`,
          },
          {
            status: 403,
          },
        );
      }
    } catch (e) {
      console.error(`[Baidu v2] filter`, e);
    }
  }

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
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

/**
 * v1 API request (legacy OAuth2).
 * Auth: ?access_token=xxx
 */
async function requestV1(req: NextRequest) {
  const controller = new AbortController();

  let path = `${req.nextUrl.pathname}`.replaceAll(ApiPath.Baidu, "");

  let baseUrl = serverConfig.baiduUrl || BAIDU_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Baidu v1 Proxy] ", path);
  console.log("[Baidu v1 Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  const { access_token } = await getAccessToken(
    serverConfig.baiduApiKey as string,
    serverConfig.baiduSecretKey as string,
  );
  const fetchUrl = `${baseUrl}${path}?access_token=${access_token}`;

  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
    method: req.method,
    body: req.body,
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  // #1815 try to refuse some request to some models
  if (serverConfig.customModels && req.body) {
    try {
      const clonedBody = await req.text();
      fetchOptions.body = clonedBody;

      const jsonBody = JSON.parse(clonedBody) as { model?: string };

      // not undefined and is false
      if (
        isModelNotavailableInServer(
          serverConfig.customModels,
          jsonBody?.model as string,
          ServiceProvider.Baidu as string,
        )
      ) {
        return NextResponse.json(
          {
            error: true,
            message: `you are not allowed to use ${jsonBody?.model} model`,
          },
          {
            status: 403,
          },
        );
      }
    } catch (e) {
      console.error(`[Baidu v1] filter`, e);
    }
  }
  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
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
