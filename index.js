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
        
        const users = [];
        for (const user of assignment.assigned) {
            user.hasAssignment = true;
            users.push(user.abbrev || user.name);
        }

        gTime.push(...users);
    }

    // Sort
    const allAreas = Object.keys(areas).map(x => areas[x]);
    allAreas.sort((x, y) => x.area > y.area ? 1 : -1);
    dates.sort((x, y) => x.date.valueOf() - y.date.valueOf());
    for (const area of allAreas) {
        // Short by duration first, then start time
        area.times.sort((x, y) => {
            var duration = Math.sign(x.duration - y.duration);
            if (duration !== 0)
                return duration;

            return x.time > y.time ? 1 : -1
        });
    }
    
    return {dates, areas: allAreas};
}

function displayTable(dates, areas, absences, users) {
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
            .innerHTML = toDisplayDate(date.date);

        rowWeekday
            .appendChild(document.createElement("th"))
            .innerText = toDayOfWeek(date.date);
    }

    const tbody = table.appendChild(
        document.createElement("tbody"));
    
    function addHeading(text, subtitle) {
        const row = tbody.appendChild(document.createElement("tr"));
        row.classList.add("weekend");

        const cell = row.appendChild(document.createElement("th"));
        cell.innerText = text;
        cell.setAttribute("scope", "row");

        const subCell = row.appendChild(document.createElement("td"));
        subCell.setAttribute("colspan", colspan);
        
        if (subtitle) {
            subCell.innerHTML = subtitle;
            subCell.style.textAlign = "left";
        }
    }
    
    // Areas
    const colspan = (dates.length + 1) + "";
    for (const area of areas) {
        // Area header
        addHeading(area.area);
        
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
        
        const leaveAbbrevs = {};
        for (const item of absences) {
            for (const date of item.dates) {
                leaveAbbrevs[date.title] = date.title.substr(0, 2);
            }
        }

        const subTitle = Object
            .keys(leaveAbbrevs)
            .sort()
            .map(x => leaveAbbrevs[x] + ": " + x)
            .join(", ");
        addHeading("Abwesend", subTitle);
        
        for (const item of absences) {
            item.user.hasAssignment = true;
            
            const row = tbody.appendChild(document.createElement("tr"));
            const userCell = row.appendChild(document.createElement("td"));
            userCell.innerText = item.user.abbrev;

            for (const date of dates) {
                const value = date.date.valueOf();

                const cell = row.appendChild(document.createElement("td"));
                const leave = item.dates.find(x => x.date.valueOf() === value);

                if (!leave)
                    continue;

                cell.classList.add("holiday");
                cell.innerText = leaveAbbrevs[leave.title];
            }
        }
    }

    // Users
    addHeading("Mitarbeiter");
    const row = tbody.appendChild(document.createElement("tr"));
    
    const cell = row.appendChild(document.createElement("td"));
    cell.setAttribute("colspan", (dates.length + 2) + "");
    cell.innerHTML = Object
        .keys(users)
        .map(x => users[x])
        .filter(x => x.hasAssignment)
        .sort((x, y) => x.abbrev > y.abbrev ? 1 : -1)
        .map(x => "<strong>" + x.abbrev + "</strong>: " + x.name)
        .join(", ");

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

async function retrieveAndDisplay(token, start, end) {
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
        const range_end = toIsoDate(end);
    
        const shifts = await getShifts(token, range_start, range_end, areas);
        const assignments = await getAssignments(token, shifts, users);
        const absences = await getAbsences(token, users, range_start, range_end);
        const {dates, areas: assignedAreas} = group(assignments);
        
        displayTable(dates, assignedAreas, absences, users);

        const title = "Dienstplan " + toDisplayDateWithYear(start) +
            " - " + toDisplayDateWithYear(end);
        document.title = title;
        document.getElementsByTagName("h1")[0].innerText = title;

        // Update UI state
        setUiState({table: true});
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

    start.value = toIsoDate(new Date());

    if (localStorage) {
        tokenInput.value = localStorage.getItem("token");
        weeksInput.value = localStorage.getItem("weeks") || "2";
    }

    function checkWeeksValue() {
        if (weeksInput.value !== "month")
            return;
        
        const text = startInput.value;
        if (!text || !text.length)
            return;

        const start = new Date(startInput.value);
        if (start.getDate() === 1)
            return;
        
        start.setDate(1);
        startInput.value = toIsoDate(start);
    }
    
    checkWeeksValue();
    weeksInput.addEventListener("change", checkWeeksValue);
    startInput.addEventListener("change", checkWeeksValue);

    document.getElementById("retrieve").onclick = event => {
        event.preventDefault();

        // Reset error state
        startInput.classList.remove("is-invalid");
        tokenInput.classList.remove("is-invalid");
    
        // Ensure value is valid    
        const startText = startInput.value;
        if (!startText || !startText.length) {
            startInput.focus();
            startInput.classList.add("is-invalid");
    
            return;
        }
        const start = new Date(startText);
    
        // Ensure token is valid
        const token = tokenInput.value;
        if (!token || !token.length) {
            tokenInput.focus();
            tokenInput.classList.add("is-invalid");
    
            return;
        }

        let end;
        const weeks = parseInt(weeksInput.value);
        if (isNaN(weeks)) {
            start.setDate(1);

            const nextMonth = new Date(start);
            nextMonth.setMonth(start.getMonth() + 1);

            end = addDays(nextMonth, -1);
            
        } else {
            const weeks = parseInt(weeksInput.value);
            end = addDays(start, weeks * 7 - 1);
        }

        if (localStorage) {
            localStorage.setItem("token", token);
            localStorage.setItem("weeks", weeksInput.value);
        }

        retrieveAndDisplay(token, start, end);
    };

    document.getElementById("refresh").onclick = event => {
        event.preventDefault();

        setUiState({form: true});
    };
});
