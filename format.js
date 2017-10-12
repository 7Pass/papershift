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

    return day + "." + month;
}

function toDisplayDateWithYear(date) {
    const year = twoDigits(
        date.getFullYear() % 100);
    
    return toDisplayDate(date) + "." + year;
}

function toDayOfWeek(date) {
    const day = date.getDay();
    return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][day];
}

function isWeekend(date)  {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function addDays(date, days) {
    const result = new Date(date.valueOf());
    result.setDate(date.getDate() + days);

    return result;
}

function startOfDay(date) {
    const result = new Date(date.valueOf());
    result.setHours(0, 0, 0, 0);

    return result;
}