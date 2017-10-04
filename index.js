var token;

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

async function get(resource, args) {
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

async function getUsers() {
    let page = 1;
    const result = {};

    while (true) {
        const response = await get("users", {page});

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

async function getWorkingAreas() {
    const areas = {};
    const locations = {};
    const response = await get("working_areas");

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

async function getShifts(range_start, range_end, areas) {
    const shifts = {};

    for (const working_area_id of Object.keys(areas)) {
        let page = 1;
        const area = areas[working_area_id];
        const location_id = area.location.id;

        while (true) {
            const response = await get("shifts", {
                page,
                range_start,
                range_end,
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

async function getAssignment(shift, users) {
    const response = await get("assignments", {
        shift_id: shift.id,
    });
    
    return {
        shift,
        assigned: response.users.assigned.map(x => users[x.id]),
    };
}

async function getAssignments(shifts, users) {
    const assignments = Object.keys(shifts)
        .map(x => getAssignment(shifts[x], users));
    
    return await Promise.all(assignments);
}

function group(assignments) {
    const dates = [];
    const areas = {};

    for (const assignment of assignments) {
        // Group by date
        const shift = assignment.shift;
        const date = shift.date;
        let gDate = dates.find(x => x.date.valueOf() === date.valueOf());
        if (!gDate) {
            gDate = {
                date,
                times: {},
            };

            dates.push(gDate);
        }

        // Then by areas & time
        const {area, time} = shift;
        const timeKey = area.id + shift.time;

        let gArea = areas[area.id];
        if (!gArea) {
            gArea = areas[area.id] = {
                times: [],
                area: area.name,
            };
        }

        if (!gArea.times.find(x => x.key === timeKey)) {
            gArea.times.push({
                time,
                key: timeKey,
                duration: shift.duration,
            });
        }

        const gTime = gDate.times[timeKey] ||
            (gDate.times[timeKey] = []);
        gTime.push(...assignment.assigned.map(x => x.abbrev || x.name));
    }

    // Sort
    const allAreas = Object.keys(areas).map(x => areas[x]);
    allAreas.sort((x, y) => x.area > y.area ? 1 : -1);
    dates.sort((x, y) => x.date.valueOf() - y.date.valueOf());
    for (const area of allAreas) {
        area.times.sort((x, y) => {
            var duration = Math.sign(x.duration - y.duration);
            if (duration !== 0)
                return duration;

            return x.time > y.time ? 1 : -1
        });
    }
    
    return {dates, areas: allAreas};
}

function displayHorizontal(dates, areas) {
    const table = document.createElement("table");
    table.classList.add("table", "table-bordered");

    // Headers
    const thead = table.appendChild(document.createElement("thead"));
    const rowDate = thead.appendChild(document.createElement("tr"));
    const rowWeekday = thead.appendChild(document.createElement("tr"));

    rowDate
        .appendChild(document.createElement("th"))
        .setAttribute("rowspan", "2");
    
    for (const date of dates) {
        rowDate
            .appendChild(document.createElement("th"))
            .innerText = toDisplayDate(date.date);

        rowWeekday
            .appendChild(document.createElement("th"))
            .innerText = toDayOfWeek(date.date);
    }

    // Body
    const colspan = (dates.length + 1) + "";
    for (const area of areas) {
        const tbody = table.appendChild(
            document.createElement("tbody"));

        // Area header
        const areaRow = tbody.appendChild(document.createElement("tr"));
        const areaName = areaRow.appendChild(document.createElement("th"));
        areaName.innerText = area.area
        areaName.setAttribute("scope", "row");

        areaRow
            .appendChild(document.createElement("td"))
            .setAttribute("colspan", colspan);
        
        for (const time of area.times) {
            const timeRow = tbody.appendChild(document.createElement("tr"));
            const timeHours = timeRow.appendChild(document.createElement("th"));
            timeHours.innerText = time.time;
            timeHours.setAttribute("scope", "row");

            for (const date of dates) {
                const users = date.times[time.key] || [];
                timeRow
                    .appendChild(document.createElement("td"))
                    .innerText = users.join(", ");
            }
        }
    }

    const container = document.getElementById("table");
    container.innerHTML = "";
    container.style.display = "";
    container.appendChild(table);
}

function displayVertical(dates, areas) {
    const table = document.createElement("table");
    table.classList.add("table", "table-bordered");

    // Headers
    const thead = table.appendChild(document.createElement("thead"));
    const rowArea = thead.appendChild(document.createElement("tr"));
    const rowTime = thead.appendChild(document.createElement("tr"));

    const empty = rowArea.appendChild(document.createElement("th"));
    empty.setAttribute("colspan", "2");
    empty.setAttribute("rowspan", "2");

    for (const area of areas) {
        const areaCell = rowArea.appendChild(
            document.createElement("th"));
        areaCell.innerText = area.area;
        areaCell.setAttribute("colspan", area.times.length + "");
        
        for (const time of area.times) {
            rowTime
                .appendChild(document.createElement("th"))
                .innerHTML = time.time.replace(" - ", "<br />");
        }
    }
    
    // Rows
    const tbody = table.appendChild(
        document.createElement("tbody"));
    for (const date of dates) {
        const row = tbody.appendChild(
            document.createElement("tr"));

        const dayOfMonth = row.appendChild(document.createElement("th"));
        dayOfMonth.setAttribute("scope", "row");
        dayOfMonth.innerText = toDisplayDate(date.date);

        const dayOfWeek = row.appendChild(document.createElement("th"));
        dayOfWeek.setAttribute("scope", "row");
        dayOfWeek.innerText = toDayOfWeek(date.date);

        for (const area of areas) {
            for (const time of area.times) {
                const users = date.times[time.key] || [];
                row
                    .appendChild(document.createElement("td"))
                    .innerText = users.join(", ");
            }
        }
    }

    const container = document.getElementById("table");
    container.innerHTML = "";
    container.style.display = "";
    container.appendChild(table);
}

async function retrieveAndDisplay(start, weeks, display) {
    try {
        [...document.getElementsByClassName("progress")]
            .forEach(x => x.style.display = "");
        [...document.getElementsByTagName("input")]
            .forEach(x => x.readOnly = true);
        [...document.getElementsByTagName("select")]
            .forEach(x => x.disabled = true);

        const users = await getUsers();
        const {areas, locations} = await getWorkingAreas();
    
        const range_start = toIsoDate(start);
        const range_end = toIsoDate(addDays(start, 7 * weeks));
    
        const shifts = await getShifts(range_start, range_end, areas);
        const assignments = await getAssignments(shifts, users);
        const {dates, areas: assignedAreas} = group(assignments);
        
        display(dates, assignedAreas);

        [...document.getElementsByTagName("form")]
            .forEach(x => x.style.display = "none");
        [...document.getElementsByClassName("progress")]
            .forEach(x => x.style.display = "none");
    } catch (error) {
        [...document.getElementsByTagName("form")]
            .forEach(x => x.style.display = "none");
        [...document.getElementsByClassName("progress")]
            .forEach(x => x.style.display = "none");
        document
            .getElementById("table")
            .style.display = "none";
            
        [...document.getElementsByClassName("alert")]
            .forEach(x => x.style.display = "");
    }
}

function ready(fn) {
    const isReady = document.attachEvent
        ? document.readyState === "complete"
        : document.readyState !== "loading";

    if (isReady){
      fn();
      return;
    }
    
    document.addEventListener("DOMContentLoaded", fn);
  }

ready(() => {
    const startInput = document.getElementById("start");
    const tokenInput = document.getElementById("token");
    const orientation = document.getElementById("orientation");

    start.value = toIsoDate(new Date());

    if (localStorage) {
        tokenInput.value = localStorage.getItem("token");
        orientation.value = localStorage.getItem("orientation");
    }

    if (!orientation.value)
        orientation.value = "horizontal";

    document.getElementById("retrieve").onclick = event => {
        event.preventDefault();

        // Reset error state
        startInput.classList.remove("is-invalid");
        tokenInput.classList.remove("is-invalid");
    
        // Ensure value is valid    
        const start = startInput.value;
        if (!start || !start.length) {
            startInput.focus();
            startInput.classList.add("is-invalid");
    
            return;
        }
    
        // Ensure token is valid
        token = tokenInput.value;
        if (!token || !token.length) {
            tokenInput.focus();
            tokenInput.classList.add("is-invalid");
    
            return;
        }

        const weeks = parseInt(document.getElementById("weeks").value);
        const display = orientation.value === "horizontal"
            ? displayHorizontal : displayVertical;

        if (localStorage) {
            localStorage.setItem("token", token);
            localStorage.setItem("orientation", orientation.value);
        }

        retrieveAndDisplay(new Date(start), weeks, display);
    };

    document.getElementById("refresh").onclick = event => {
        event.preventDefault();

        [...document.getElementsByTagName("form")]
            .forEach(x => x.style.display = "");

        [...document.getElementsByClassName("progress")]
            .forEach(x => x.style.display = "none");
        [...document.getElementsByClassName("alert")]
            .forEach(x => x.style.display = "none");

        document
            .getElementById("table")
            .style.display = "none";
    };
});