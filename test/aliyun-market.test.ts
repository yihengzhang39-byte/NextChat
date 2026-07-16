import { parseAliyunMarketResponse } from "../app/lib/identity-providers/aliyun-market";

test.each([
  [{ code: "10000", data: { result: "1" } }, "VERIFIED"],
  [{ code: "10000", data: { result: "2" } }, "MISMATCH"],
  [{ code: "10000", data: { result: "3" } }, "SERVICE_UNAVAILABLE"],
  [{ code: "SYSTEM_042", data: null }, "INVALID_ID_NUMBER"],
  [{ code: "10000" }, "SERVICE_UNAVAILABLE"],
  [{ code: "10000", data: {} }, "SERVICE_UNAVAILABLE"],
  [{ code: "10000", data: { result: true } }, "SERVICE_UNAVAILABLE"],
  [{ code: "10000", data: { result: "9" } }, "SERVICE_UNAVAILABLE"],
])("parses Aliyun result safely", (payload, result) => {
  expect(parseAliyunMarketResponse(payload).response.result).toBe(result);
});
