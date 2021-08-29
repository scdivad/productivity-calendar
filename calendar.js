/* List of shades of green for the number of hours of work done for each day */
const COLORS = ["#e6f2ee", "#cde5dc", "#9accb9", "#68b297", "#359974", "#037f51", "#025939", "#024029", "#012618", "#011910"];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* Converts numHours into an integer and returns the corresponding color */
function getColor(numHours) {
    if (numHours * 60 < 1) return "#ffffff";
    return COLORS[Math.min(Math.floor(numHours), 9)];
}

/*
 * Converts seconds into HH:MM:SS format.
 * Source: https://stackoverflow.com/a/1322771/12132980
 */
function secToHHMMSS(numSec) {
    return numSec ? new Date(numSec * 1000).toISOString().substr(11, 8) : "00:00:00";
}

/* Converts seconds into HH:MM format. */
function secToHHMM(numSec) {
    return secToHHMMSS(numSec).substring(0, "00:00:00".length - 3)
}

/* Converts number of seconds to number of full hours */
function secToHr(n) {
    return n / 60 / 60;
}

/* Gets 12 hour time in am/pm from a date object */
function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    return hours + ":" + minutes + " " + ampm;
}

/* Converts time in HH:MM:SS format into number of seconds. */
function hhmmssToSec(hhmmss) {
    return (10 * parseInt(hhmmss[0]) + parseInt(hhmmss[1])) * 60 * 60 +
        (10 * parseInt(hhmmss[3]) + parseInt(hhmmss[4])) * 60 +
        (10 * parseInt(hhmmss[6]) + parseInt(hhmmss[7]));
}

/* Checks whether inputted string is in HH:MM:SS format */
function isHHMMSS(str) {
    if (str.length !== 8) return false;
    if (str[2] !== ':' || str[5] !== ':') return false;
    if (isNaN(str[0]) || isNaN(str[1]) || isNaN(str[3]) || isNaN(str[4]) || isNaN(str[6]) || isNaN(str[7])) return false;
    if (10 * parseInt(str[0]) + parseInt(str[1]) > 24) return false;
    if (10 * parseInt(str[3]) + parseInt(str[6]) > 60) return false;
    if (10 * parseInt(str[6]) + parseInt(str[7]) > 60) return false;
    if (hhmmssToSec > 24 * 60 * 60) return false;
    return true;
}

/* Returns the key used to store the number of hours worked for a specific day in local storage. */
function getKey(year, month, date) {
    if (!year && !month && !date) return getKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    return year + ":" + month + ":" + date;
}

/*
 * Sets the state of the start work button given parameter last, which is the epoch time of the last time
 * the timer was started and -1 if the timer has not started or been stopped.
 */
function setTimerState(last) {
    if (last === -1) {
        document.getElementById("start_timer").innerText = "START WORK";
        document.getElementById("start_timer").style.cssText = "background-color: "; // is this line needed?
    } else {
        chrome.storage.local.get(getKey(), function(items) {
            document.getElementById("start_timer").innerText = "WORKING SINCE " + formatAMPM(new Date(last)) + ". CLICK TO STOP.";
            document.getElementById("start_timer").style.cssText = "background-color: " + getColor(secToHr(items[getKey()]));
        });
    }
}

// on start work buton press
document.getElementById("start_timer").onclick = function() {
    chrome.storage.local.get(["last", getKey()], function(items) {
        if (items["last"] !== -1) {
            // Turn off
            const timeElapsed = (new Date().getTime() - items["last"]) / 1000;
            alert("+" + secToHHMMSS(timeElapsed));
            chrome.storage.local.set({[getKey()]: items[getKey()] + timeElapsed, "last": -1}, function() {
                setTimerState(-1)
            });
            location.reload(); // reload to show updated time
        } else {
            // Turn on
            chrome.storage.local.set({"last": new Date().getTime()}, function() {
                setTimerState(new Date().getTime());
            });
        }
    });
}

document.getElementById("switch_mode").onclick = function() {
    chrome.storage.local.get("mode", function(items) {
        if (!items["mode"]) {
            chrome.storage.local.set({"mode": "today"}, function() {
                setMode("today");
            });
        } else {
            const other = items["mode"] === "month" ? "today" : "month";
            setMode(other);
            chrome.storage.local.set({"mode": other});
        }
    });
}

function makeHHMMShovertext(numSec, year, month, date) {
    let span = document.createElement("span");
    span.innerText = secToHHMMSS(numSec);
    span.className = "tooltiptext";

    // Make time editable for each date
    span.contentEditable = "true";
    span.onblur = function() {
        if (!isHHMMSS(span.innerHTML)) {
            alert("Invalid format. Please enter as HH:MM:SS.");
            span.innerHTML = secToHHMMSS(numSec); // Reset text if invalid edit is made
            return;
        }
        chrome.storage.local.set({[getKey(year, month, date)]: hhmmssToSec(span.innerHTML)});
        location.reload();
    };

    return span;
}

/* Empty cells for days of the previous or next month */
function makeEmptyCell() {
    let cell = document.createElement("div");
    cell.className = "tooltip";
    return cell;
}

/* Makes the first row of names of the days of the week */
function makeDayNameCell(dayName) {
    let cell = document.createElement("div");
    cell.innerText = DAY_NAMES[dayName][0];
    cell.style.cssText = "background-color: gray";
    cell.className = "grid-item";
    return cell;
}

/* Default cell for every date of the month */
function makeDateCell(date, year, month) {
    let cell = document.createElement("div");
    cell.className = "tooltip";
    
    cell.innerText = date;
    chrome.storage.local.get(getKey(year, month, cell.innerText), function(items) {
        cell.style.cssText = "background-color: " + getColor(secToHr(items[getKey(year, month, date)]));
        cell.appendChild(makeHHMMShovertext(items[getKey(year, month, date)], year, month, date));
    });

    return cell;
}

function makeCalendar(year, month) {
    /* Return the next multiple of x after and including n */
    function nextMultiple(n, x) {
        return n % x === 0 ? n : (n + (x - n % x));
    }

    // Make month title
    document.getElementById("month_year").innerHTML = MONTH_NAMES[month] + " " + year;
    
    const firstDay = new Date(year, month, 1).getDay(); // Get day of the first of the month
    const numDaysInMonth = new Date(year, month + 1, 0).getDate(); // https://stackoverflow.com/a/1184359/12132980
    
    const numRows = (numDaysInMonth + firstDay) / DAY_NAMES.length;

    const container = document.getElementById("container");
    container.style.setProperty('--grid-rows', numRows);
    container.style.setProperty('--grid-cols', DAY_NAMES.length);

    // Make first row of weekday names
    for (const dayName in DAY_NAMES) {
        container.append(makeDayNameCell(dayName));
    }

    // Make rest of calendar with each date
    for (let i = 0; i < nextMultiple(numRows * DAY_NAMES.length, DAY_NAMES.length); i++) {
        const date = i + 1 - firstDay;
        if (date >= 1 && date <= numDaysInMonth) {
            container.appendChild(makeDateCell(date, year, month));
        } else {
            container.appendChild(makeEmptyCell());
        }
    }
}

function setMode(mode) {
    if (mode === "month") {
        document.getElementById("switch_mode").innerText = "VIEW TODAY";
        document.getElementById("calendar_layout").style.display = 'block';
        document.getElementById("today_timer").style.display = 'none';
    } else {
        document.getElementById("switch_mode").innerText = "VIEW MONTH";
        document.getElementById("calendar_layout").style.display = 'none';
        document.getElementById("today_timer").style.display = 'block';
    }
}

function setTodayTime(sec) {
    document.getElementById("num_hrs_today").innerText = Math.floor(secToHr(sec));
}

function main() {
    // Initialize values for today
    chrome.storage.local.get(["last", getKey(), "mode"], function(items) {
        if (!items["last"]) chrome.storage.local.set({"last": -1});
        if (!items[getKey()]) chrome.storage.local.set({[getKey()]: 0});
        if (!items["mode"]) chrome.storage.local.set({"mode": "month"});

        setMode(items["mode"]);
        setTimerState(items["last"]);
        makeCalendar(new Date().getFullYear(), new Date().getMonth());
        setTodayTime(items[getKey()]);
    });
}

main();