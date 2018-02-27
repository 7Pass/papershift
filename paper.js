async function get(resource, token, args) {
    const query = Object.assign({
        api_token: token,
    }, args);
    
    const q = Object.keys(query)
        .map(x => encodeURIComponent(x) + "=" + encodeURIComponent(query[x]))
        .join("&");
    
    const url = "https://app.papershift.com/public_api/v1/" + resource + "?" + q;
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("Content-Type", "application/json");
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
}

async function getLocation(token) {
    const response = await get("locations", token);
    return response.locations[0];
}

async function getUsers(token) {
    let page = 1;
    const result = {};

    while (true) {
        const response = await get("users", token, {page});

        for (const user of response.users) {
            let abbrev = user.abbrev || "";
            if (!abbrev.length && user.username) {
                abbrev = user.username
                    .split(" ")
                    .map(x => x[0])
                    .join("");
            }

            result[user.id] = {
                abbrev,
                id: user.id,
                name: user.username,
            };
        }

        if (!response.next_page)
            break;
        
        page++;
    }

    return result;
}

async function getWorkingAreas(token) {
    const location = await getLocation(token);

    const areas = {};
    const locations = {};
    const response = await get("working_areas", token, {
        location_id: location.id,
    });

    for (const area of response.working_areas) {
        const location = locations[area.location_id] ||
            (locations[area.location_id] = {
                id: area.location_id,
                name: area.location_name,
            });

        areas[area.id] = {
            location,
            id: area.id,
            name: area.name,
            active: area.status === "active",
        };
    }

    return {areas, locations};
}

async function getShifts(token, startDate, endDate, areas) {
    const shifts = {};

    for (const working_area_id of Object.keys(areas)) {
        let page = 1;
        const area = areas[working_area_id];
        const location_id = area.location.id;

        while (true) {
            const response = await get("shifts", token, {
                page,
                range_start: toIsoDate(startDate),
                range_end: toIsoDate(endDate),
                location_id,
                working_area_id: area.id,
            });

            for (const shift of response.shifts) {
                const end = new Date(shift.ends_at);
                const start = new Date(shift.starts_at);
                const time = toDisplayTime(start) + " - " + toDisplayTime(end);

                shifts[shift.id] = {
                    id: shift.id,
                    area,
                    time,
                    date: startOfDay(start),
                    duration: end.valueOf() - start.valueOf(),
                }
            }
    
            if (!response.next_page)
                break;
    
            page++;
        }
    }

    return shifts;
}

async function getAssignment(token, shift, users) {
    const response = await get("assignments", token, {
        shift_id: shift.id,
    });
    
    return {
        shift,
        assigned: response.users.assigned.map(x => users[x.id]),
    };
}

async function getAssignments(token, shifts, users) {
    const assignments = Object.keys(shifts)
        .map(x => getAssignment(token, shifts[x], users));
    
    return await Promise.all(assignments);
}

async function getAbsences(token, users, startDate, endDate) {
    const absences = {};

    let page = 1;
    while (true) {
        const response = await get("absences", token, {
            page,
            range_end: toIsoDate(endDate),
            range_start: toIsoDate(startDate),
        });

        for (const item of response.absences) {
            const start = startOfDay(new Date(item.starts_at));
            if (start > endDate)
                continue;
                
            const end = startOfDay(new Date(item.ends_at));
            if (end < startDate) {
                continue;
            }

            const user_id = item.user_id;
            let user = absences[user_id];
            if (!user) {
                user = {
                    dates: [],
                    user: users[user_id],
                };

                absences[user_id] = user;
            }

            let date = start;
            while (date <= end) {
                user.dates.push({
                    date,
                    title: item.title,
                });
                date = addDays(date, 1);
            }
        }

        if (!response.next_page)
            break;

        page++;
    }

    return Object.keys(absences)
        .map(x => absences[x])
        .sort((x, y) => x.user.abbrev > y.user.abbrev ? 1 : 0);
}