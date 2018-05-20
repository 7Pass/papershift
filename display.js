function getSortedAreas(areas) {
    const knowns = [
        "90486", // Rezeption
        "90489", // Housekeeping
        "90491", // Reinigung
        "90487", // Küche
        "90488", // Service
    ];
    const unknowns = Object
        .keys(areas)
        .filter(x => knowns.indexOf(x) < 0)
        .sort((x, y) => areas[x].area > areas[y].area ? 1 : -1);

    return knowns
        .concat(unknowns)
        .map(x => areas[x])
        .filter(x => x);
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

        const users = [];
        for (const user of assignment.assigned) {
            user.hasAssignment = true;
            users.push(user.abbrev || user.name);
        }

        gTime.push(...users);
    }

    // Sort
    const allAreas = getSortedAreas(areas);
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

    const service = allAreas.find(x => x.area == "Service");
    if (service) {
        service.times.sort((x, y) => {
            if (x.time !== y.time)
                return x.time > y.time ? 1 : -1;

            return Math.sign(x.duration - y.duration);
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
        row.classList.add("area-heading");

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

                if (isHoliday(date.date))
                    cell.classList.add("public-holiday");
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

    const showFooter = !state.form && !state.progress;
    const footer = document.getElementsByTagName("footer")[0];
    footer.style.display = showFooter ? "" : "none";
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

        const shifts = await getShifts(token, start, end, areas);
        const assignments = await getAssignments(token, shifts, users);
        const absences = await getAbsences(token, users, start, end);
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