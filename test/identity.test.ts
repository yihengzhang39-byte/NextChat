import {
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
