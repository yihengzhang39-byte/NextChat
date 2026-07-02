"use client";
import {
  ApiPath,
  IFLYTEK_BASE_URL,
  IFLYTEK_IMAGE_REQUEST_TIMEOUT_MS,
  Iflytek,
  REQUEST_TIMEOUT_MS,
} from "@/app/constant";
import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";

import {
  ChatOptions,
  getHeaders,
  LLMApi,
  LLMModel,
  SpeechOptions,
} from "../api";
import Locale from "../../locales";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source";
import { prettyObject } from "@/app/utils/format";
import { getClientConfig } from "@/app/config/client";
import { getMessageTextContent, isVisionModel } from "@/app/utils";
import { preProcessImageContent } from "@/app/utils/chat";
import { fetch } from "@/app/utils/stream";

import { RequestPayload } from "./openai";

export class SparkApi implements LLMApi {
  private disableListModels = true;

  path(path: string): string {
    const accessStore = useAccessStore.getState();

    let baseUrl = "";

    if (accessStore.useCustomConfig) {
      baseUrl = accessStore.iflytekUrl;
    }

    if (baseUrl.length === 0) {
      const isApp = !!getClientConfig()?.isApp;
      const apiPath = ApiPath.Iflytek;
      baseUrl = isApp ? IFLYTEK_BASE_URL : apiPath;
    }

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, baseUrl.length - 1);
    }
    if (!baseUrl.startsWith("http") && !baseUrl.startsWith(ApiPath.Iflytek)) {
      baseUrl = "https://" + baseUrl;
    }

    console.log("[Proxy Endpoint] ", baseUrl, path);

    return [baseUrl, path].join("/");
  }

  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }

  speech(options: SpeechOptions): Promise<ArrayBuffer> {
    throw new Error("Method not implemented.");
  }

  async chat(options: ChatOptions) {
    const messages: ChatOptions["messages"] = [];
    const visionModel = isVisionModel(options.config.model);
    for (const v of options.messages) {
      const content = visionModel
        ? await preProcessImageContent(v.content)
        : getMessageTextContent(v);
      messages.push({ role: v.role, content });
    }

    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      ...{
        model: options.config.model,
        providerName: options.config.providerName,
      },
    };

    const requestPayload: RequestPayload = {
      messages,
      stream: options.config.stream,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      presence_penalty: modelConfig.presence_penalty,
      frequency_penalty: modelConfig.frequency_penalty,
      top_p: modelConfig.top_p,
      // max_tokens: Math.max(modelConfig.max_tokens, 1024),
      // Please do not ask me why not send max_tokens, no reason, this param is just shit, I dont want to explain anymore.
    };

    console.log("[Request] Spark payload", {
      model: requestPayload.model,
      stream: requestPayload.stream,
      messageCount: requestPayload.messages.length,
    });

    const shouldStream = !!options.config.stream;
    const isImageChat = getIflytekBaseModel(modelConfig.model) === "image";
    const requestTimeoutMs = isImageChat
      ? IFLYTEK_IMAGE_REQUEST_TIMEOUT_MS
      : REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    let clearRequestTimeout = () => {};
    options.onController?.(controller);

    try {
      const chatPath = this.path(
        isImageChat ? Iflytek.ImageChatPath : Iflytek.ChatPath,
      );
      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: getHeaders(),
      };

      // Make a fetch request
      let requestTimedOut = false;
      const requestTimeoutId = setTimeout(() => {
        requestTimedOut = true;
        controller.abort();
      }, requestTimeoutMs);
      clearRequestTimeout = () => clearTimeout(requestTimeoutId);

      if (shouldStream) {
        let responseText = "";
        let remainText = "";
        let finished = false;
        let responseRes: Response;

        // Animate response text to make it look smooth
        function animateResponseText() {
          if (finished || controller.signal.aborted) {
            responseText += remainText;
            console.log("[Response Animation] finished");
            return;
          }

          if (remainText.length > 0) {
            const fetchCount = Math.max(1, Math.round(remainText.length / 60));
            const fetchText = remainText.slice(0, fetchCount);
            responseText += fetchText;
            remainText = remainText.slice(fetchCount);
            options.onUpdate?.(responseText, fetchText);
          }

          requestAnimationFrame(animateResponseText);
        }

        // Start animation
        animateResponseText();

        const finish = () => {
          if (!finished) {
            finished = true;
            clearRequestTimeout();
            options.onFinish(responseText + remainText, responseRes);
          }
        };

        const fail = (message: string) => {
          if (finished) return;
          finished = true;
          clearRequestTimeout();
          const partialText = responseText + remainText;
          if (partialText) {
            options.onFinish(`${partialText}` + "\n\n" + message, responseRes);
          } else {
            options.onError?.(new Error(message));
          }
        };

        controller.signal.onabort = () => {
          if (requestTimedOut && isImageChat) {
            fail("讯飞 imagev4 服务响应超时，请稍后重试。");
            return;
          }
          finish();
        };

        fetchEventSource(chatPath, {
          fetch: fetch as any,
          ...chatPayload,
          async onopen(res) {
            if (!isImageChat) {
              clearRequestTimeout();
            }
            const contentType = res.headers.get("content-type");
            console.log("[Spark] request response content type: ", contentType);
            responseRes = res;
            if (contentType?.startsWith("text/plain")) {
              responseText = await res.clone().text();
              return finish();
            }

            // Handle different error scenarios
            if (
              !res.ok ||
              !res.headers
                .get("content-type")
                ?.startsWith(EventStreamContentType) ||
              res.status !== 200
            ) {
              let extraInfo = await res.clone().text();
              try {
                const resJson = await res.clone().json();
                extraInfo = prettyObject(resJson);
              } catch {}

              if (res.status === 401) {
                extraInfo = Locale.Error.Unauthorized;
              }

              options.onError?.(
                new Error(
                  `Request failed with status ${res.status}: ${extraInfo}`,
                ),
              );
              return finish();
            }
          },
          onmessage(msg) {
            if (!msg.data?.trim()) {
              return;
            }
            if (msg.data === "[DONE]" || finished) {
              return finish();
            }
            const text = msg.data;
            try {
              const json = JSON.parse(text);
              if (json?.error) {
                fail(
                  typeof json.message === "string"
                    ? json.message
                    : "讯飞 imagev4 请求未返回有效内容，请稍后重试。",
                );
                return;
              }

              const choices = json.choices as Array<{
                delta: { content: string };
              }>;
              const delta = choices[0]?.delta?.content;

              if (delta) {
                remainText += delta;
              }
            } catch (e) {
              console.error("[Request] parse error");
              if (isImageChat) {
                fail("讯飞图像理解响应解析失败。");
              } else {
                options.onError?.(
                  new Error(`Failed to parse response: ${text}`),
                );
              }
            }
          },
          onclose() {
            finish();
          },
          onerror(e) {
            const message =
              requestTimedOut && isImageChat
                ? "讯飞 imagev4 服务响应超时，请稍后重试。"
                : isImageChat
                ? "讯飞 imagev4 服务暂时不可用，请稍后重试。"
                : (e as Error).message;
            if (isImageChat) {
              fail(message);
            } else {
              clearRequestTimeout();
              options.onError?.(e);
            }
            throw e;
          },
          openWhenHidden: true,
        });
      } else {
        const res = await fetch(chatPath, chatPayload);
        clearRequestTimeout();

        if (!res.ok) {
          const errorText = await res.text();
          options.onError?.(
            new Error(`Request failed with status ${res.status}: ${errorText}`),
          );
          return;
        }

        const resJson = await res.json();
        const message = this.extractMessage(resJson);
        options.onFinish(message, res);
      }
    } catch (e) {
      console.log("[Request] failed to make a chat request", e);
      clearRequestTimeout?.();
      options.onError?.(e as Error);
    }
  }

  async usage() {
    return {
      used: 0,
      total: 0,
    };
  }

  async models(): Promise<LLMModel[]> {
    return [];
  }
}

function getIflytekBaseModel(model: string) {
  return model.split(/@(?!.*@)/)[0];
}
