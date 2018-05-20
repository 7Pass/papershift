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
];

function isHoliday(date) {
    const formatted = toDisplayDateWithYear(date);
    return holidays.includes(formatted);
}