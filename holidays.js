function isHoliday(date, holidays) {
    const formatted = toIsoDate(date);
    return holidays.includes(formatted);
}

async function fetchHolidays(year) {
    const url = "https://feiertage-api.de/api/?nur_land=BY&nur_daten=1&jahr=" + year;
    const payload = await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.setRequestHeader("Accept", "application/json");
        request.onerror = reject;
        request.onload = function() {
            const isSuccess = this.status >= 200 && this.status < 400;
            if (isSuccess) {
                const data = JSON.parse(this.response);
                resolve(data);

                return;
            }

            reject(this);
        };

        request.send();
    });

    const result = [];
    const keys = Object.keys(payload);
    for (let i = 0; i < keys.length; i++) {
        const date = payload[keys[i]];
        result.push(date);
    }

    return result;
}

async function getHolidays(start, end) {
    try {
        const startYear = start.getYear() + 1900;
        const endYear = end.getYear() + 1900;
        const minYear = Math.min(startYear, endYear);
        const maxYear = Math.max(startYear, endYear);

        let result = [];
        for (let year = minYear; year <= maxYear; year++) {
            const days = await fetchHolidays(year);
            result = result.concat(days);
        }

        return result;
    } catch (error) {
        console.error("Error retrieving holidays", error);
        return [];
    }
}