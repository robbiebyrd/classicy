const getDaysInMonth = (month: number, year?: number): number => {
    const monthsAndDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    const monthIndex = month - 1

    // Handle February leap year
    if (monthIndex === 1 && year !== undefined) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
        return isLeapYear ? 29 : 28
    }

    return monthsAndDays[monthIndex] || 31
}

export const validateDayOfMonth = (day: number, month: number, year?: number): number => {
    if (day <= 0) {
        return 1
    }
    const maxDays = getDaysInMonth(month, year)
    if (day > maxDays) {
        return maxDays
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
