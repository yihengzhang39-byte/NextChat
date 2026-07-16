import base64
import hashlib
import hmac
import json
import time
import uuid
from urllib.parse import urlencode, quote

import urllib3


# ============================================================
# 基础配置：请替换成你自己的信息
# ============================================================

HOST = "https://checkone.market.alicloudapi.com"
PATH = "/communication/personal/10101"

APP_KEY = "205026533"
APP_SECRET = "L9R1fKwMySRmEXy7Tu7w5t91ysHUFIqh"

TEST_NAME = "张一恒"
TEST_IDCARD = "4108232001090101518"

# 签名失败时可改为 True。
# 注意：开启后会在控制台打印姓名和完整身份证号。
DEBUG_SIGNATURE = False


METHOD = "POST"
ACCEPT = "application/json"
CONTENT_TYPE = "application/x-www-form-urlencoded; charset=UTF-8"
SIGNATURE_METHOD = "HmacSHA256"


def check_credentials(app_key: str, app_secret: str) -> None:
    """检查密钥是否已经正确填写。"""

    if not app_key or app_key == "填写你的AppKey":
        raise RuntimeError("请先填写真实的 APP_KEY")

    if not app_secret or app_secret == "填写你的AppSecret":
        raise RuntimeError("请先填写真实的 APP_SECRET")

    try:
        app_key.encode("ascii")
        app_secret.encode("ascii")
    except UnicodeEncodeError as exc:
        raise RuntimeError(
            "APP_KEY 和 APP_SECRET 不能包含中文，请填写真实密钥"
        ) from exc


def build_path_and_parameters(
    path: str,
    form_params: dict[str, str],
) -> str:
    """
    构造参与签名的 PathAndParameters。

    注意：
    1. 参数名按字典顺序排列；
    2. 使用未进行 URL 编码的原始参数值；
    3. 表单参数也需要参与签名。
    """

    if not form_params:
        return path

    parameter_parts = []

    for key in sorted(form_params.keys()):
        value = form_params[key]

        if value is None or value == "":
            parameter_parts.append(key)
        else:
            parameter_parts.append(f"{key}={value}")

    return path + "?" + "&".join(parameter_parts)


def create_signature(
    app_key: str,
    app_secret: str,
    form_params: dict[str, str],
) -> tuple[str, dict[str, str], str]:
    """生成阿里云 API 网关签名。"""

    timestamp = str(int(time.time() * 1000))
    nonce = str(uuid.uuid4())

    # 这些 Header 会参与签名
    signing_headers = {
        "x-ca-key": app_key,
        "x-ca-nonce": nonce,
        "x-ca-signature-method": SIGNATURE_METHOD,
        "x-ca-timestamp": timestamp,
    }

    # Header 名称按字典顺序排列
    signed_header_names = sorted(signing_headers.keys())

    canonical_headers = "".join(
        f"{header_name}:{signing_headers[header_name]}\n"
        for header_name in signed_header_names
    )

    path_and_parameters = build_path_and_parameters(
        PATH,
        form_params,
    )

    # 签名结构：
    #
    # HTTPMethod
    # Accept
    # Content-MD5
    # Content-Type
    # Date
    # Headers
    # PathAndParameters
    #
    # 当前请求是 Form 表单，因此 Content-MD5 为空。
    # 当前没有使用 Date Header，因此 Date 为空。
    string_to_sign = (
        f"{METHOD}\n"
        f"{ACCEPT}\n"
        f"\n"
        f"{CONTENT_TYPE}\n"
        f"\n"
        f"{canonical_headers}"
        f"{path_and_parameters}"
    )

    digest = hmac.new(
        app_secret.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    signature = base64.b64encode(digest).decode("utf-8")

    signature_headers = {
        **signing_headers,
        "x-ca-signature-headers": ",".join(signed_header_names),
        "x-ca-signature": signature,
    }

    return signature, signature_headers, string_to_sign


def verify_identity(
    name: str,
    idcard: str,
    app_key: str,
    app_secret: str,
):
    """调用身份证二要素实名认证接口。"""

    name = name.strip()
    idcard = idcard.strip()
    app_key = app_key.strip()
    app_secret = app_secret.strip()

    check_credentials(app_key, app_secret)

    if not name:
        raise ValueError("姓名不能为空")

    if not idcard:
        raise ValueError("身份证号码不能为空")

    form_params = {
        "name": name,
        "idcard": idcard,
    }

    _, signature_headers, string_to_sign = create_signature(
        app_key=app_key,
        app_secret=app_secret,
        form_params=form_params,
    )

    headers = {
        "Accept": ACCEPT,
        "Content-Type": CONTENT_TYPE,
        **signature_headers,
    }

    # 签名时使用原始参数，签名完成后再进行 URL 编码
    post_data = urlencode(
        form_params,
        encoding="utf-8",
        quote_via=quote,
    ).encode("utf-8")

    url = HOST + PATH

    http = urllib3.PoolManager()

    try:
        response = http.request(
            METHOD,
            url,
            body=post_data,
            headers=headers,
            timeout=urllib3.Timeout(
                connect=5.0,
                read=20.0,
            ),
            retries=False,
        )
    except urllib3.exceptions.HTTPError as exc:
        raise RuntimeError(f"请求实名认证接口失败：{exc}") from exc

    content = response.data.decode("utf-8", errors="replace")

    print("=" * 60)
    print("HTTP 状态码：", response.status)
    print("X-Ca-Request-Id：", response.headers.get("X-Ca-Request-Id"))
    print("接口原始返回：")
    print(content)

    error_message = response.headers.get("X-Ca-Error-Message")

    if error_message:
        print("X-Ca-Error-Message：")
        print(error_message)

    if DEBUG_SIGNATURE:
        print("=" * 60)
        print("本地 StringToSign：")
        print(string_to_sign)

    print("=" * 60)

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {
            "http_status": response.status,
            "raw_content": content,
            "gateway_error": error_message,
        }


if __name__ == "__main__":
    result = verify_identity(
        name=TEST_NAME,
        idcard=TEST_IDCARD,
        app_key=APP_KEY,
        app_secret=APP_SECRET,
    )

    print("解析后的返回结果：")
    print(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        )
    )