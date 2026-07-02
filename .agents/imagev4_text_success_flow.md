# imagev4 多模态模型纯文本测试成功流程

## 1. 目标

本次测试的目标不是 Ultra 文本模型，也不是图片上传能力，而是验证：

- 是否可以通过 WebSocket 调用 `imagev4` 多模态模型；
- `imagev4` 在**纯文本输入**场景下是否能正常返回回答；
- 当前 AppID、API Key、API Secret、Host、Path 是否配置正确。

最终验证成功：`imagev4` 可以通过纯文本消息正常返回内容。

---

## 2. 最终成功的服务组合

本次成功使用的是以下组合：

```text
Host:   spark-image-api-test.xf-yun.com
Path:   /v2.1/image
Domain: imagev4
```

完整 WebSocket 地址形式：

```text
wss://spark-image-api-test.xf-yun.com/v2.1/image
```

> `Host`、`Path`、`domain` 必须作为一组保持匹配，不能把其他接口的 Host 与 `/v2.1/image` 混用。

---

## 3. 第一次失败：HTTP 403

第一次运行日志中，实际连接的是：

```text
wss://spark-api.xf-yun.com/v2.1/image
```

服务端在 WebSocket 握手阶段直接拒绝：

```text
WebSocket 握手被拒绝：HTTP 403
```

### 原因

当前测试使用的是 `imagev4` 多模态接口，但连接 Host 被配置成：

```text
spark-api.xf-yun.com
```

而已验证可用的 `imagev4` 测试服务入口是：

```text
spark-image-api-test.xf-yun.com
```

因此，失败不是请求体字段错误，也不是 `imagev4` 不支持纯文本；请求在发送 JSON 请求体之前，就因为 Host 与图片接口路径不匹配而被拒绝。

### 修正

运行时显式指定正确的 Host、Path 和 domain：

```powershell
python .\xf_text_chat_test.py "你好！！" `
  --host spark-image-api-test.xf-yun.com `
  --path /v2.1/image `
  --domain imagev4 `
  --print-request
```

修正 Host 后，WebSocket 握手成功。

---

## 4. 第二次失败：AppID 与 API Key / API Secret 不属于同一应用

修正 Host 后，WebSocket 已经能够握手，但服务端返回：

```text
code=10005
message=InvalidParamError: app_id is not same to kong app_id
```

### 原因

请求体中的：

```json
"header": {
  "app_id": "21c7d620"
}
```

与 HMAC 签名使用的：

```text
XF_API_KEY
XF_API_SECRET
```

不属于同一个讯飞应用。

换句话说：

- `header.app_id` 是应用 A；
- `XF_API_KEY` / `XF_API_SECRET` 是应用 B；
- 服务端在验证请求时发现两者不匹配，因此拒绝业务请求。

### 修正

通过 PowerShell 检查当前终端实际读取到的 AppID：

```powershell
echo $env:XF_APPID
```

确认正确的 AppID 为：

```text
7F2A91D3
```

当请求体中的 `header.app_id` 改为 `7F2A91D3`，并与当前 `XF_API_KEY`、`XF_API_SECRET` 保持同一应用来源后，服务端正常返回内容。

---

## 5. 最终成功时的核心请求结构

本次纯文本测试实际发送的核心内容如下：

```json
{
  "header": {
    "app_id": "7F2A91D3",
    "uid": "ws-test-user",
    "debug": false
  },
  "parameter": {
    "chat": {
      "domain": "imagev4",
      "stream": true,
      "temperature": 0.5,
      "top_k": 4,
      "max_tokens": 1024,
      "auditing": "default",
      "auditing_debug": false,
      "auditing_input": false,
      "auditing_input_strategy": "",
      "auditing_output": false,
      "auditing_output_strategy": "",
      "chat_id": "chat-local-imagev4-test",
      "mup": false
    }
  },
  "payload": {
    "message": {
      "text": [
        {
          "role": "user",
          "content": "你好！！"
        }
      ]
    }
  }
}
```

该请求成功返回：

```text
你好呀！很高兴能和你聊天。今天有什么有趣的事情或者想聊的话题吗？
```

---

## 6. 成功流程总结

整个排查和成功流程如下：

1. 使用 `imagev4` 多模态模型进行纯文本测试。
2. 初始 Host 为 `spark-api.xf-yun.com`，与 `/v2.1/image` 组合后收到 `HTTP 403`。
3. 改用已验证可连接的图片接口 Host：
   `spark-image-api-test.xf-yun.com`。
4. WebSocket 握手成功，说明网络、签名算法、Host、Path 基本正确。
5. 服务端返回 `10005 app_id is not same to kong app_id`，说明请求体 AppID 与签名用 Key/Secret 不属于同一个应用。
6. 将 `XF_APPID` 修正为与当前 `XF_API_KEY`、`XF_API_SECRET` 匹配的 `7F2A91D3`。
7. 再次发送请求后，`imagev4` 正常返回文本回答，验证成功。

---

## 7. 后续配置建议

建议将默认环境变量统一为多模态命名，避免继续混用 `XF_TEXT_*` 配置：

```env
XF_APPID=7F2A91D3
XF_API_KEY=同一应用下的 API Key
XF_API_SECRET=同一应用下的 API Secret

IFLYTEK_IMAGE_WS_HOST=spark-image-api-test.xf-yun.com
IFLYTEK_IMAGE_WS_PATH=/v2.1/image
IFLYTEK_IMAGE_MODEL=imagev4
```

脚本默认配置建议：

```python
DEFAULT_HOST = os.getenv(
    "IFLYTEK_IMAGE_WS_HOST",
    "spark-image-api-test.xf-yun.com",
)
DEFAULT_PATH = os.getenv(
    "IFLYTEK_IMAGE_WS_PATH",
    "/v2.1/image",
)
DEFAULT_DOMAIN = os.getenv(
    "IFLYTEK_IMAGE_MODEL",
    "imagev4",
)
```

## 8. 结论

`imagev4` 的纯文本调用已经成功。关键不是切换到 Ultra，而是确保以下四项一致：

```text
同一个讯飞应用的 AppID + API Key + API Secret
+ 正确的 imagev4 Host
+ 正确的 /v2.1/image Path
+ domain=imagev4
```

后续如果继续测试图片理解，只需在同一套已验证成功的连接与鉴权配置上，把图片 Base64 消息加入 `payload.message.text` 即可。


这是文本成功代码，import argparse
import base64
import hashlib
import hmac
import json
import os
import ssl
import sys
from email.utils import formatdate
from urllib.parse import urlencode

import certifi
import websocket


# 使用此前已验证可用的图片理解 WebSocket 服务入口
DEFAULT_HOST = os.getenv(
    "IFLYTEK_IMAGE_WS_HOST",
    "spark-image-api-test.xf-yun.com",
)
DEFAULT_PATH = os.getenv(
    "IFLYTEK_IMAGE_WS_PATH",
    "/v2.1/image",
)
DEFAULT_DOMAIN = os.getenv(
    "IFLYTEK_IMAGE_MODEL",
    "imagev4",
)


def env_required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"缺少环境变量：{name}")
    return value


def build_auth_url(host: str, path: str, api_key: str, api_secret: str) -> str:
    """生成讯飞 WebSocket HMAC 鉴权 URL。"""
    date = formatdate(usegmt=True)

    signature_origin = (
        f"host: {host}\n"
        f"date: {date}\n"
        f"GET {path} HTTP/1.1"
    )

    signature = base64.b64encode(
        hmac.new(
            api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).digest()
    ).decode("utf-8")

    authorization_origin = (
        f'api_key="{api_key}", '
        f'algorithm="hmac-sha256", '
        f'headers="host date request-line", '
        f'signature="{signature}"'
    )

    authorization = base64.b64encode(
        authorization_origin.encode("utf-8")
    ).decode("utf-8")

    query = urlencode(
        {
            "authorization": authorization,
            "date": date,
            "host": host,
        }
    )

    return f"wss://{host}{path}?{query}"


def validate_args(args: argparse.Namespace) -> None:
    if not args.path.startswith("/"):
        raise ValueError("--path 必须以 / 开头，例如 /v2.1/image")

    if not 0 < args.temperature <= 1:
        raise ValueError("--temperature 必须大于 0 且不超过 1")

    if not 1 <= args.top_k <= 6:
        raise ValueError("--top-k 必须在 1 到 6 之间")

    if args.max_tokens < 1:
        raise ValueError("--max-tokens 必须大于 0")

    if not args.uid.strip():
        raise ValueError("--uid 不能为空")

    if len(args.uid) > 32:
        raise ValueError("--uid 最长 32 个字符")

    if not args.chat_id.strip():
        raise ValueError("--chat-id 不能为空")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="讯飞 imagev4 WebSocket 纯文本请求测试"
    )

    parser.add_argument(
        "question",
        nargs="?",
        default="你好，介绍一下你自己。",
        help='要提问的内容，默认："你好，介绍一下你自己。"',
    )
    parser.add_argument(
        "--system",
        default="",
        help="可选系统提示词；首次测试建议不传，保持与示例一致。",
    )
    parser.add_argument(
        "--domain",
        default=DEFAULT_DOMAIN,
        help=f"模型 domain，默认：{DEFAULT_DOMAIN}",
    )
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"WebSocket 域名，默认：{DEFAULT_HOST}",
    )
    parser.add_argument(
        "--path",
        default=DEFAULT_PATH,
        help=f"WebSocket 路径，默认：{DEFAULT_PATH}",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.5,
        help="随机性，范围 (0, 1]，默认 0.5",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=4,
        help="候选采样数，范围 1-6，默认 4",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=1024,
        help="最大输出 token 数，默认 1024",
    )
    parser.add_argument(
        "--uid",
        default="ws-test-user",
        help="用户标识，最长 32 个字符",
    )
    parser.add_argument(
        "--chat-id",
        default="chat-local-imagev4-test",
        help="本次请求的 chat_id",
    )
    parser.add_argument(
        "--receive-timeout",
        type=int,
        default=60,
        help="单次接收超时秒数，默认 60",
    )
    parser.add_argument(
        "--print-request",
        action="store_true",
        help="发送前打印请求体，便于核对字段。",
    )

    args = parser.parse_args()
    validate_args(args)

    appid = env_required("XF_APPID")
    api_key = env_required("XF_API_KEY")
    api_secret = env_required("XF_API_SECRET")

    messages = []

    if args.system.strip():
        messages.append(
            {
                "role": "system",
                "content": args.system.strip(),
            }
        )

    messages.append(
        {
            "role": "user",
            "content": args.question.strip(),
        }
    )

    url = build_auth_url(args.host, args.path, api_key, api_secret)

    # 与你提供的新示例对齐
    request_body = {
        "header": {
            "app_id": "7F2A91D3",
            "uid": "ws-test-user",
            "debug": False,
        },
        "parameter": {
            "chat": {
                "domain": args.domain,
                "stream": True,
                "temperature": args.temperature,
                "top_k": args.top_k,
                "max_tokens": args.max_tokens,
                "auditing": "default",
                "auditing_debug": False,
                "auditing_input": False,
                "auditing_input_strategy": "",
                "auditing_output": False,
                "auditing_output_strategy": "",
                "chat_id": args.chat_id,
                "mup": False,
            }
        },
        "payload": {
            "message": {
                "text": messages,
            }
        },
    }

    ws = None

    try:
        print(f"正在连接：wss://{args.host}{args.path}")
        print(f"模型 domain：{args.domain}")
        print(f"chat_id：{args.chat_id}")
        print("签名参数已生成，但不会在终端打印。")

        if args.print_request:
            print("\n--- 即将发送的请求体 ---")
            print(json.dumps(request_body, ensure_ascii=False, indent=2))
            print("--- 请求体结束 ---\n")

        ws = websocket.create_connection(
            url,
            timeout=15,
            sslopt={
                "cert_reqs": ssl.CERT_REQUIRED,
                "ca_certs": certifi.where(),
            },
        )
        ws.settimeout(args.receive_timeout)

        print("WebSocket 握手成功，正在发送 imagev4 文本请求...\n")

        ws.send(json.dumps(request_body, ensure_ascii=False))

        answer_parts = []

        while True:
            raw = ws.recv()

            if raw is None or raw == "":
                raise RuntimeError("服务端提前关闭了连接")

            response = json.loads(raw)

            header = response.get("header", {})
            code = header.get("code", 0)
            message = header.get("message", "")

            if code != 0:
                sid = header.get("sid", "")
                raise RuntimeError(
                    f"服务端业务错误：code={code}, "
                    f"message={message}, sid={sid}"
                )

            choices = response.get("payload", {}).get("choices", {})

            for item in choices.get("text", []):
                content = item.get("content", "")
                if content:
                    answer_parts.append(content)
                    print(content, end="", flush=True)

            if header.get("status") == 2 or choices.get("status") == 2:
                break

        print("\n\n--- imagev4 文本测试完成 ---")
        print("完整回答：")
        print("".join(answer_parts) or "服务端没有返回文本内容。")

    except websocket.WebSocketBadStatusException as exc:
        status_code = getattr(exc, "status_code", "未知")
        print(f"\nWebSocket 握手被拒绝：HTTP {status_code}")
        sys.exit(2)

    except websocket.WebSocketTimeoutException:
        print("\n测试失败：等待服务端响应超时。")
        sys.exit(3)

    except Exception as exc:
        print(f"\n测试失败：{type(exc).__name__}: {exc}")
        sys.exit(1)

    finally:
        if ws:
            try:
                ws.close()
            except Exception:
                pass


if __name__ == "__main__":
    main()

用户执行： python .\xf_text_chat_test.py "你好！！" `
>>   --host spark-image-api-test.xf-yun.com `
>>   --path /v2.1/image `
>>   --domain imagev4 `
>>   --print-requests
成功