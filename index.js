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

function clamp(value, min, max) {
    if (value < min)
        return min;
    
    if (value > max)
        return max;
    
    return value;
}

function parseQuery() {
    const values = {};
    const queries = location.search
        .substring(1).split("&");

    for (const query of queries) {
        const parts = query.split("=");
        if (!parts[0])
            continue;

        values[parts[0]] = parts.length > 1
            ? decodeURIComponent(parts[1])
            : true;
    }

    const result = Object.assign({
        api: "",
        weeks: "",
        months: "1",
        start: "",
        refresh: "0",
    }, values);

    for (const key of ["weeks", "months", "refresh"]) {
        if (!result[key]) {
            result[key] = 0;
            continue;
        }

        const value = parseInt(result[key]);
        result[key] = !isNaN(value) ? value : 0;
    }

    result.weeks = clamp(result.weeks, 0, 6);
    result.months = clamp(result.months, 0, 3);
    result.refresh = clamp(result.refresh, 0, 60);

    if (result.start) {
        const start = Date.parse(result.start);

        if (isNaN(start))
            result.start = "";
        else
            result.start = startOfDay(new Date(start));
    }

    return result;
}

async function useQueries(queries) {
    // Calculate start and end time
    let start = queries.start;
    if (typeof start !== "object") {
        start = new Date();
    }

    let end;
    if (queries.weeks > 0) {
        start = startOfWeek(start);
        end = addDays(start, queries.weeks * 7);
    } else {
        const months = Math.max(1, queries.months);
        start = startOfMonth(start);
        end = addMonths(start, months);
    }
    end = addDays(end, -1);

    // Retrieve
    await retrieveAndDisplay(queries.api, start, end);

    // Display timestamp of data
    const now = new Date();
    const time = toDisplayTime(now);
    const date = toDisplayDateWithYear(now);
    document
        .getElementById("scriptTime")
        .innerText = time + " " + date;
    
    // Do wee need to refresh?
    const nextRefresh = document
        .getElementById("nextRefresh");
    if (!queries.refresh) {
        nextRefresh.innerText = "never";
        return;
    }
    
    // Display count down until next refresh
    let timer;
    const next = addMinutes(new Date(), queries.refresh);

    const onTimer = () => {
        timer && clearTimeout(timer);
        const seconds = Math.floor((next.valueOf() -
            new Date().valueOf()) / 1000);
        
        if (seconds <= 0) {
            location.reload();
            return;
        }
        
        timer = setTimeout(onTimer, 1000);
        nextRefresh.innerText = `in ${seconds}s`;
    };

    onTimer();
}

ready(() => {
    const queries = parseQuery();
    if (queries.api) {
        useQueries(queries);
        return;
    }

    // Enable data entry mode
    document.body.classList.add("entry-mode");

    const startInput = document.getElementById("start");
    const weeksInput = document.getElementById("weeks");
    const tokenInput = document.getElementById("token");
    const refreshInput = document.getElementById("refresh");

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

    function tryRetrieve() {
        // Token
        const token = tokenInput.value;
        let search = "?api=" + encodeURIComponent(token);

        tokenInput.classList.remove("is-invalid");
        if (!token || !token.length) {
            tokenInput.focus();
            tokenInput.classList.add("is-invalid");
    
            return;
        }

        // Weeks
        const weeks = parseInt(weeksInput.value);
        if (isNaN(weeks)) {
            search += "&months=1";            
        } else {
            search += "&weeks=" + weeks;
        }

        // Refresh
        const refresh = parseInt(refreshInput.value);
        if (typeof refresh === "number" && refresh > 0) {
            search += "&refresh=" + refresh;
        }

        // Start
        const start = new Date(startInput.value);
        if (typeof start === "object" && !isNaN(start.valueOf())) {
            search += "&start=" + toIsoDate(start);
        }

        // Store values for user convenience
        if (localStorage) {
            localStorage.setItem("token", token);
            localStorage.setItem("weeks", weeksInput.value);
        }

        location.search = search;
    }

    document.getElementById("retrieve").onclick = event => {
        event.preventDefault();
        
        tryRetrieve();
    };
});
