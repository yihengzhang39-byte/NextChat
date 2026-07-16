import { randomUUID } from "crypto";
import { AliyunMarketIdentityVerificationProvider } from "./identity-providers/aliyun-market";

export type IdentityVerificationResult =
  | "VERIFIED"
  | "MISMATCH"
  | "INVALID_ID_NUMBER"
  | "SERVICE_UNAVAILABLE"
  | "RATE_LIMITED"
  | "CONFIG_ERROR";

export type IdentityVerificationResponse = {
  result: IdentityVerificationResult;
  requestId?: string;
  provider: string;
};

export interface IdentityVerificationProvider {
  verify(input: {
    realName: string;
    idNumber: string;
    userId: string;
  }): Promise<IdentityVerificationResponse>;
}

class MockIdentityVerificationProvider implements IdentityVerificationProvider {
  async verify(): Promise<IdentityVerificationResponse> {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.IDENTITY_VERIFY_ALLOW_MOCK_IN_PRODUCTION !== "true"
    ) {
      return { result: "CONFIG_ERROR", provider: "mock" };
    }

    const requestId = `mock_${randomUUID()}`;
    switch (process.env.IDENTITY_VERIFY_MOCK_MODE) {
      case "success":
      case undefined:
      case "":
        return { result: "VERIFIED", provider: "mock", requestId };
      case "mismatch":
        return { result: "MISMATCH", provider: "mock", requestId };
      case "service_error":
        return {
          result: "SERVICE_UNAVAILABLE",
          provider: "mock",
          requestId,
        };
      default:
        return { result: "CONFIG_ERROR", provider: "mock" };
    }
  }
}

export function getIdentityVerificationProvider(): IdentityVerificationProvider {
  switch (process.env.IDENTITY_VERIFY_PROVIDER) {
    case "mock":
      return new MockIdentityVerificationProvider();
    case "aliyun_market":
      return new AliyunMarketIdentityVerificationProvider();
    default:
      return {
        async verify() {
          return { result: "CONFIG_ERROR", provider: "unconfigured" };
        },
      };
  }
}
