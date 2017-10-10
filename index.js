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

function displayTable(dates, areas, absences) {
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

    const tbody = table.appendChild(
        document.createElement("tbody"));
    
    // Areas
    const colspan = (dates.length + 1) + "";
    for (const area of areas) {
        // Area header
        const areaRow = tbody.appendChild(document.createElement("tr"));
        areaRow.classList.add("weekend")
        const areaName = areaRow.appendChild(document.createElement("th"));
        areaName.innerText = area.area
        areaName.setAttribute("scope", "row");

        areaRow
            .appendChild(document.createElement("td"))
            .setAttribute("colspan", colspan);
        
        for (const time of area.times) {
            const timeRow = tbody.appendChild(document.createElement("tr"));
            const timeHours = timeRow.appendChild(document.createElement("td"));
            timeHours.innerText = time.time;
            timeHours.setAttribute("scope", "row");

            for (const date of dates) {
                const users = date.times[time.key] || [];
                const cell = timeRow.appendChild(
                    document.createElement("td"));
                cell.innerText = users.join(", ");

                if (isWeekend(date.date))
                    cell.classList.add("weekend");
            }
        }
    }

    // Absences
    if (absences.length > 0) {
        const headerRow = tbody.appendChild(document.createElement("tr"));
        headerRow.classList.add("weekend");
        const headerCell = headerRow.appendChild(document.createElement("th"));
        headerCell.innerText = "Urlaub"
        headerCell.setAttribute("scope", "row");

        headerRow
            .appendChild(document.createElement("td"))
            .setAttribute("colspan", colspan);
        
        for (const item of absences) {
            const row = tbody.appendChild(document.createElement("tr"));
            const userCell = row.appendChild(document.createElement("td"));
            userCell.innerText = item.user.abbrev;

            for (const date of dates) {
                const value = date.date.valueOf();

                const cell = row.appendChild(document.createElement("td"));
                const isOnLeave = item.dates.find(x => x.valueOf() === value);

                if (isOnLeave) {
                    cell.innerText = "X";
                    cell.classList.add("holiday");
                }
            }
        }
    }

    const container = document.getElementById("table");
    container.innerHTML = "";
    container.style.display = "";
    container.appendChild(table);
}

function setUiState(state) {
    // Readonly
    const readonly = state.readonly;
    [...document.getElementsByTagName("input")]
        .forEach(x => x.readOnly = readonly);
    [...document.getElementsByTagName("select")]
        .forEach(x => x.disabled = readonly);

    [...document.getElementsByTagName("form")]
        .forEach(x => x.style.display = state.form ? "" : "none");
    [...document.getElementsByClassName("progress")]
        .forEach(x => x.style.display = state.progress ? "" : "none");
    document
        .getElementById("table")
        .style.display = state.table ? "" : "none";
        
    [...document.getElementsByClassName("alert")]
        .forEach(x => x.style.display = state.alert ? "" : "none");
}

async function retrieveAndDisplay(token, start, weeks, display) {
    try {
        // Show progress
        setUiState({
            form: true,
            readonly: true,
            progress: true,
        });

        // Retrieve data
        const users = await getUsers(token);
        const {areas, locations} = await getWorkingAreas(token);
    
        const range_start = toIsoDate(start);
        const range_end = toIsoDate(addDays(start, 7 * weeks - 1));
    
        const shifts = await getShifts(token, range_start, range_end, areas);
        const assignments = await getAssignments(token, shifts, users);
        const absences = await getAbsences(token, users, range_start, range_end);
        const {dates, areas: assignedAreas} = group(assignments);
        
        display(dates, assignedAreas, absences);

        // Update UI state
        if (display !== createPdf)
            setUiState({table: true});
        else
            setUiState({form: true});
    } catch (error) {
        setUiState({alert: true});
    }
}

function ready(fn) {
    const isReady = document.attachEvent
        ? document.readyState === "complete"
        : document.readyState !== "loading";

    if (isReady) {
      fn();
      return;
    }
    
    document.addEventListener("DOMContentLoaded", fn);
  }

ready(() => {
    const startInput = document.getElementById("start");
    const weeksInput = document.getElementById("weeks");
    const tokenInput = document.getElementById("token");
    const orientation = document.getElementById("orientation");

    start.value = toIsoDate(new Date());

    if (localStorage) {
        tokenInput.value = localStorage.getItem("token");
        weeksInput.value = localStorage.getItem("weeks") || "2";
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
        const token = tokenInput.value;
        if (!token || !token.length) {
            tokenInput.focus();
            tokenInput.classList.add("is-invalid");
    
            return;
        }

        const weeks = parseInt(weeksInput.value);
        if (localStorage) {
            localStorage.setItem("token", token);
            localStorage.setItem("weeks", weeks + "");
            localStorage.setItem("orientation", orientation.value);
        }

        let display;
        switch (orientation.value) {
            default:
            case "table":
                display = displayTable;
                break;

            case "pdf":
                display = createPdf;
                break;
        }

        retrieveAndDisplay(token, new Date(start), weeks, display);
    };

    document.getElementById("refresh").onclick = event => {
        event.preventDefault();

        setUiState({form: true});
    };
});