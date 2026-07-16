import {
  getAdultEligibleAt,
  parseIdBirthDate,
  resolveAgeVerification,
  validateIdNumber,
  validateIdentityInput,
} from "../app/lib/identity";

const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const checks = "10X98765432";

function makeId(date: string, sequence = "001", region = "000000") {
  const body = region + date + sequence;
  const sum = [...body].reduce(
    (total, digit, index) => total + Number(digit) * weights[index],
    0,
  );
  return body + checks[sum % 11];
}

function makeIdWithCheck(date: string, expected: string) {
  for (let sequence = 0; sequence < 1000; sequence += 1) {
    const id = makeId(date, String(sequence).padStart(3, "0"));
    if (id.endsWith(expected)) return id;
  }
  throw new Error("test fixture not found");
}

test("accepts standard valid numbers without region allowlists", () => {
  const numeric = makeIdWithCheck("20000101", "1");
  const x = makeIdWithCheck("20000101", "X");
  const unknownRegion = makeId("20000101", "001", "999999");

  expect(validateIdNumber(numeric).success).toBe(true);
  expect(validateIdNumber(x).success).toBe(true);
  expect(validateIdNumber(x.toLowerCase()).normalized).toBe(x);
  expect(validateIdNumber("  " + numeric + "  ").normalized).toBe(numeric);
  expect(validateIdNumber(unknownRegion).success).toBe(true);
  expect(validateIdentityInput({ realName: "测试用户", idNumber: numeric })).toEqual({
    success: true,
    realName: "测试用户",
    idNumber: numeric,
  });
});

test.each([
  ["short", makeId("20000101").slice(0, 17), "invalid_length"],
  ["long", makeId("20000101") + "0", "invalid_length"],
  ["non-digit body", "A" + makeId("20000101").slice(1), "invalid_pattern"],
  ["invalid final character", makeId("20000101").slice(0, 17) + "A", "invalid_pattern"],
  ["invalid month", makeId("20001301"), "invalid_birth_date"],
  ["invalid date", makeId("20000431"), "invalid_birth_date"],
  ["non-leap February", makeId("20010229"), "invalid_birth_date"],
  ["bad checksum", makeId("20000101").slice(0, 17) + "0", "invalid_checksum"],
  ["full-width digits", "００００００２００００１０１００１X", "invalid_pattern"],
  ["empty", "", "empty"],
])("rejects %s", (_name, idNumber, failureStage) => {
  const result = validateIdNumber(idNumber);
  expect(result).toMatchObject({ success: false, failureStage });
  expect(result.regionValidationApplied).toBe(false);
});

test("accepts leap-day and preserves string identifiers", () => {
  const id = makeId("20000229");
  const result = validateIdNumber(id);
  expect(result.success).toBe(true);
  expect(result.normalized).toBe(id);
  expect(validateIdNumber(Number(id)).success).toBe(false);
});

test("uses Shanghai calendar 18th birthdays, including the Feb 29 rule", () => {
  const summerBirth = parseIdBirthDate(makeId("20080720"));
  const leapBirth = parseIdBirthDate(makeId("20080229"));
  expect(summerBirth).toEqual({ year: 2008, month: 7, day: 20 });
  expect(getAdultEligibleAt(summerBirth!)).toEqual(new Date("2026-07-19T16:00:00.000Z"));
  expect(getAdultEligibleAt(leapBirth!)).toEqual(new Date("2026-02-27T16:00:00.000Z"));
  expect(resolveAgeVerification(makeId("20080720"), new Date("2026-07-19T15:59:59.999Z")).ageVerificationStatus).toBe("MINOR");
  expect(resolveAgeVerification(makeId("20080720"), new Date("2026-07-19T16:00:00.000Z")).ageVerificationStatus).toBe("ADULT");
});

test("allows the mock placeholder only for the configured local mock profile", () => {
  const keys = [
    "NODE_ENV",
    "IDENTITY_VERIFY_PROVIDER",
    "IDENTITY_VERIFY_MOCK_MODE",
    "IDENTITY_VERIFY_MOCK_AGE_PROFILE",
    "IDENTITY_VERIFY_MOCK_BIRTH_DATE",
    "IDENTITY_VERIFY_MOCK_TEST_ID_NUMBER",
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      NODE_ENV: "test",
      IDENTITY_VERIFY_PROVIDER: "mock",
      IDENTITY_VERIFY_MOCK_MODE: "success",
      IDENTITY_VERIFY_MOCK_AGE_PROFILE: "minor",
      IDENTITY_VERIFY_MOCK_BIRTH_DATE: "2999-01-01",
      IDENTITY_VERIFY_MOCK_TEST_ID_NUMBER: "111111111111111111",
    });
    expect(validateIdentityInput({ realName: "测试用户", idNumber: "111111111111111111" })).toMatchObject({
      success: true,
      mockAge: { ageVerificationStatus: "MINOR" },
    });
    process.env.NODE_ENV = "production";
    expect(validateIdentityInput({ realName: "测试用户", idNumber: "111111111111111111" })).toMatchObject({
      success: false,
      error: "invalid_id_number",
    });
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
