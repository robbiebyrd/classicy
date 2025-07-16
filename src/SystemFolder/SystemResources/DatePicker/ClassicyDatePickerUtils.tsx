const monthsAndDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export const validateDayOfMonth = (day: number, month: number): number => {
    if (day <= 0) {
        return 1
    }
    const monthInt = month - 1
    if (day > monthsAndDays[monthInt]) {
        return monthsAndDays[monthInt]
    }
    return day
}

export const validateMonth = (month: number): number => {
    if (month <= 0) {
        return 1
    }
    if (month > 12) {
        return 12
    }
    return month
}
