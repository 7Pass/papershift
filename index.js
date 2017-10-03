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
    const query = $.param(Object.assign({
        api_token: token,
    }, args));

    const url = "https://app.papershift.com/public_api/v1/" + resource + "?" + query;
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            type: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            error: reject,
            success: resolve,
        });
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
    for (const area of allAreas)
        area.times.sort((x, y) => x.time > y.time ? 1 : -1);
    
    return {dates, areas: allAreas};
}

function displayHorizontal(dates, areas) {
    const table = $("<table>")
        .addClass("table table-bordered");

    // Headers
    const rowDate = $("<tr>");
    rowDate.append($("<th>"));
    const rowWeekday = $("<tr>");
    rowWeekday.append($("<th>"));
    
    for (const date of dates) {
        rowDate.append($("<th>").text(toDisplayDate(date.date)));
        rowWeekday.append($("<th>").text(toDayOfWeek(date.date)));
    }
    
    table.append($("<thead>")
        .append(rowDate)
        .append(rowWeekday));

    // Body
    const colspan = dates.length + 1;
    for (const area of areas) {
        const tbody = $("<tbody>");

        // Area header
        tbody.append($("<tr>")
            .append($("<th>")
                .text(area.area)
                .attr("scope", "row"))
            .append($("<th>")
                .attr("colspan", colspan)));
        
        for (const time of area.times) {
            const row = $("<tr>");
            row.append($("<td>").text(time.time));

            for (const date of dates) {
                const users = date.times[time.key] || [];
                row.append($("<td>").text(users.join(", ")));
            }

            tbody.append(row);
        }

        table.append(tbody);
    }

    const container = $("#table");
    container.css("display", "");
    container.empty();
    container.append(table);
}

function displayVertical(dates, areas) {
    const table = $("<table>")
        .addClass("table table-bordered");

    // Headers
    const rowArea = $("<tr>");
    rowArea.append($("<th>")
        .attr("colspan", 2)
        .attr("rowspan", 2));
    const rowTime = $("<tr>");

    for (const area of areas) {
        rowArea.append($("<th>")
            .text(area.area)
            .attr("colspan", area.times.length));
        
        for (const time of area.times) {
            rowTime.append($("<th>").html(time.time.replace("-", "<br />")));
        }
    }

    table.append($("<thead>")
        .append(rowArea)
        .append(rowTime));
    
    // Rows
    const tbody = $("<tbody>");
    for (const date of dates) {
        const row = $("<tr>");

        row
            .append($("<th>")
                .text(toDisplayDate(date.date)))
            .append($("<th>")
                .text(toDayOfWeek(date.date)));

        for (const area of areas) {
            for (const time of area.times) {
                const users = date.times[time.key] || [];
                row.append($("<td>").text(users.join(", ")));
            }
        }
        
        tbody.append(row);
    }

    table.append(tbody);

    const container = $("#table");
    container.css("display", "");
    container.empty();
    container.append(table);
}

async function retrieveAndDisplay(start, weeks, display) {
    try {
        $(".progress").css("display", "");
        $("form input").attr("readonly", true);
        $("form select").attr("disabled", true);

        const users = await getUsers();
        const {areas, locations} = await getWorkingAreas();
    
        const range_start = toIsoDate(start);
        const range_end = toIsoDate(addDays(start, 7 * weeks));
    
        const shifts = await getShifts(range_start, range_end, areas);
        const assignments = await getAssignments(shifts, users);
        const {dates, areas: assignedAreas} = group(assignments);
        
        display(dates, assignedAreas);

        $("form, .progress").css("display", "none");
    } catch (error) {
        $(".alert").css("display", "");
        $("form, #table, .progress").css("display", "none");
    }
}

$(document).ready(() => {
    const startInput = $("#start");
    const tokenInput = $("#token");
    const orientation = $("select");

    startInput.val(toIsoDate(new Date()));

    if (localStorage) {
        tokenInput.val(localStorage.getItem("token"));
        orientation.val(localStorage.getItem("orientation"));
    }

    if (!orientation.val())
        orientation.val("horizontal");

    $("#retrieve").click(event => {
        event.preventDefault();

        // Reset error state
        startInput.removeClass("is-invalid");
        tokenInput.removeClass("is-invalid");
    
        // Ensure value is valid    
        const start = startInput.val();
        if (!start || !start.length) {
            startInput.focus();
            startInput.addClass("is-invalid");
    
            return;
        }
    
        // Ensure token is valid
        token = tokenInput.val();
        if (!token || !token.length) {
            tokenInput.focus();
            tokenInput.addClass("is-invalid");
    
            return;
        }

        const weeks = parseInt($("#weeks").val());
        const display = orientation.val() === "horizontal"
            ? displayHorizontal : displayVertical;

        if (localStorage) {
            localStorage.setItem("token", token);
            localStorage.setItem("orientation", orientation.val());
        }

        retrieveAndDisplay(new Date(start), weeks, display);
    });

    $("#refresh").click(event => {
        event.preventDefault();

        $("form").css("display", "");
        $("#table, .progress, .alert").css("display", "none");
    });
});