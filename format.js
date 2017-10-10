function toIsoDate(date) {
    let day = date.getDate();
    if (day < 10)
        day = "0" + day;

    let month = date.getMonth() + 1;
    if (month < 10)
        month = "0" + month;

    let year = date.getFullYear();
    return year + "-" + month + "-" + day;
}

function toDisplayTime(date) {
    let hours = date.getHours();
    if (hours < 10)
        hours = "0" + hours;

        let minutes = date.getMinutes();
    if (minutes < 10)
        minutes = "0" + minutes;

    return hours + ":" + minutes;
}

function toDisplayDate(date) {
    let day = date.getDate();
    if (day < 10)
        day = "0" + day;

    let month = date.getMonth() + 1;
    if (month < 10)
        month = "0" + month;

    return day + "." + month;
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