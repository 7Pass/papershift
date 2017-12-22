function twoDigits(value) {
    return value < 10
        ? "0" + value
        : value + "";
}

function toIsoDate(date) {
    const year = date.getFullYear();
    const day = twoDigits(date.getDate());
    const month = twoDigits(date.getMonth() + 1);

    return year + "-" + month + "-" + day;
}

function toDisplayTime(date) {
    const hours = twoDigits(date.getHours());
    const minutes = twoDigits(date.getMinutes());

    return hours + ":" + minutes;
}

function toDisplayDate(date) {
    const day = twoDigits(date.getDate());
    const month = twoDigits(date.getMonth() + 1);

    return day + "<br/>" + month;
}

function toDisplayDateWithYear(date) {
    const day = twoDigits(date.getDate());
    const month = twoDigits(date.getMonth() + 1);
    const year = twoDigits(date.getFullYear() % 100);
    
    return day + "." + month + "." + year;
}

function toDayOfWeek(date) {
    const day = date.getDay();
    return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][day];
}

function isWeekend(date)  {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function addMinutes(date, minutes) {
    const result = new Date(date.valueOf());
    result.setMinutes(date.getMinutes() + minutes);

    return result;
}

function addDays(date, days) {
    const result = new Date(date.valueOf());
    result.setDate(date.getDate() + days);

    return result;
}

function addMonths(date, months) {
    const result = new Date(date.valueOf());
    result.setMonth(date.getMonth() + months);

    return result;
}

function startOfDay(date) {
    const result = new Date(date.valueOf());
    result.setHours(0, 0, 0, 0);

    return result;
}

function startOfMonth(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        1);
}

function startOfWeek(date) {
    const diff = date.getDay() - 1;
    if (diff >= 0)
        return addDays(date, -diff);
    
    return addDays(date, -6);
}