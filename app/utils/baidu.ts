import { BAIDU_OATUH_URL } from "../constant";

/**
 * Detect whether the given Baidu API key uses the new v2 Bearer-token format.
 * v2 keys start with "bce-v3/ALTAK-".
 */
export function isBaiduV2Key(apiKey: string): boolean {
  return typeof apiKey === "string" && apiKey.startsWith("bce-v3/");
}

/**
 * 使用 AK，SK 生成鉴权签名（Access Token）
 * Only used for legacy v1 API keys (non-bce-v3).
 * @return 鉴权签名信息
 */
export async function getAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<{
  access_token: string;
  expires_in: number;
  error?: number;
}> {
  const res = await fetch(
    `${BAIDU_OATUH_URL}?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
    {
      method: "POST",
      mode: "cors",
    },
  );
  const resJson = await res.json();
  return resJson;
}
