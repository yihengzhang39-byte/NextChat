import re
from datetime import datetime
from getpass import getpass


WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
CHECK_CODES = "10X98765432"


def validate_mainland_id(id_number: str) -> tuple[bool, str]:
    value = id_number.strip().upper()

    if len(value) != 18:
        return False, f"长度不是 18 位，当前长度为 {len(value)}"

    if not re.fullmatch(r"[0-9]{17}[0-9X]", value):
        return False, "格式不正确：前 17 位必须是数字，最后一位必须是数字或 X"

    birth_date = value[6:14]

    try:
        datetime.strptime(birth_date, "%Y%m%d")
    except ValueError:
        return False, "身份证中的出生日期无效"

    total = sum(int(value[index]) * WEIGHTS[index] for index in range(17))
    expected_check_code = CHECK_CODES[total % 11]

    if value[-1] != expected_check_code:
        return (
            False,
            f"校验位不正确：程序计算的末位应为 {expected_check_code}",
        )

    return True, "身份证格式、出生日期和校验位均有效"


def main() -> None:
    # 输入内容不会显示在终端中
    id_number = getpass("请输入身份证号码：")

    valid, reason = validate_mainland_id(id_number)

    print("验证结果：", "有效" if valid else "无效")
    print("原因：", reason)


if __name__ == "__main__":
    main()