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

    "26.12.2019", // 2. Weihnachtstag
    "25.12.2019", // 1. Weihnachtstag
    "01.11.2019", // Allerheiligen
    "31.10.2019", // Reformationstag
    "03.10.2019", // Tag der Deutschen Einheit
    "15.08.2019", // Mariä Himmelfahrt
    "20.06.2019", // Fronleichnam
    "10.06.2019", // Pfingstmontag
    "30.05.2019", // Christi Himmelfahrt
    "01.05.2019", // Tag der Arbeit
    "22.04.2019", // Ostermontag
    "19.04.2019", // Karfreitag
    "06.01.2019", // Heilige Drei Könige
    "01.01.2019", // Neujahrstag
];

function isHoliday(date) {
    const formatted = toDisplayDateWithYear(date);
    return holidays.includes(formatted);
}