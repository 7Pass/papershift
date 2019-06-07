// Retrieved from https://www.bayern.by/service/feiertage-brueckentage/

const holidays = [
    "01.01.18", // "Neujahr"
    "06.01.18", // "Heilige Drei Könige"
    "30.03.18", // "Karfreitag"
    "02.04.18", // "Ostermontag"
    "01.05.18", // "Maifeiertag oder Tag der Arbeit"
    "10.05.18", // "Christi Himmelfahrt"
    "21.05.18", // "Pfingstmontag"
    "31.05.18", // "Fronleichnam"
    "15.08.18", // "Mariä Himmelfahrt"
    "03.10.18", // "Tag der Deutschen Einheit"
    "31.10.18", // "Reformationstag"
    "01.11.18", // "Allerheiligen"
    "25.12.18", // "1. Weihnachtstag"
    "26.12.18", // "2. Weihnachtstag"

    "26.12.19", // 2. Weihnachtstag
    "25.12.19", // 1. Weihnachtstag
    "01.11.19", // Allerheiligen
    "31.10.19", // Reformationstag
    "03.10.19", // Tag der Deutschen Einheit
    "15.08.19", // Mariä Himmelfahrt
    "20.06.19", // Fronleichnam
    "10.06.19", // Pfingstmontag
    "30.05.19", // Christi Himmelfahrt
    "01.05.19", // Tag der Arbeit
    "22.04.19", // Ostermontag
    "19.04.19", // Karfreitag
    "06.01.19", // Heilige Drei Könige
    "01.01.19", // Neujahrstag
];

function isHoliday(date) {
    const formatted = toDisplayDateWithYear(date);
    return holidays.includes(formatted);
}