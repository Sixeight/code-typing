const cursor = "<span class=\"cursor\">|</span>";

function insert(screen, key) {
    screen.innerText += key;
    hljs.highlightBlock(screen);
}

function remove(screen) {
    const current = screen.innerText;
    screen.innerText = current.substring(0, current.length - 1);
    hljs.highlightBlock(screen);
}

function type(screen, key) {
    insert(screen, key);
}

function backspace(screen) {
    remove(screen);
}

function indent(screen, code) {
    const first = code.innerText[0]
    if (first === " ") {
        type(screen, first + first);
    } else {
        type(screen, first);
    }
}

function killLeft(screen) {
    let current = screen.innerText;
    while (current[current.length - 1] === " ") {
        current = current.substring(0, current.length - 2);
    }
    const parts = current.split(/\b/);
    const lastPart = parts[parts.length - 1];
    screen.innerText = current.substring(0, current.length - lastPart.length);
    hljs.highlightBlock(screen);
}

function clear(screen) {
    screen.innerText = "";
    hljs.highlightBlock(screen);
}

async function fetchCode(url) {
    const res = await fetch(url)
    if (res.status === 200) {
        return res.text();
    }
    return "";
}

function typingMode() {
    const config = document.querySelector("#config");
    config.classList.add("is-hidden");

    const typing = document.querySelector("#typing");
    typing.classList.remove("is-hidden");

    const screen = document.querySelector("#screen");
    clear(screen);

    start();
}

function configMode() {
    stop();

    const config = document.querySelector("#config");
    config.classList.remove("is-hidden");

    const typing = document.querySelector("#typing");
    typing.classList.add("is-hidden");

    const input = document.querySelector("#url");
    input.value = "";
}

let url   = null;
let lines = [];
let line  = -1;

function isLastLine() {
    return line === lines.length;
}

const extToLang = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    rb: "ruby",
    py: "python",
    java: "java",
    swift: "swift",
    kt: "kotlin",
    sh: "shell",
    html: "html",
    css: "css",
    scss: "scss",
    c: "c",
    cpp: "cpp",
    go: "go",
};

function highlightAuto(url, body) {
    let language = "";
    const extLine = url.lastIndexOf(".");
    if (extLine !== -1) {
        const ext = url.substring(extLine + 1, url.length);
        const lang = extToLang[ext];
        if (lang !== undefined) {
            language = lang;
        }
    }
    return hljs.highlightAuto(body, [language]);
}

async function initialize(screen, code, initialURL, initialLine) {
    if (/^https:\/\/github.com/.test(initialURL)) {
        initialURL = initialURL
            .replace(/https:\/\/github.com/, "https://raw.githubusercontent.com")
            .replace(/\/blob\//, "/");
    }
    url = initialURL

    let body = await fetchCode(url)
    if (body[body.length - 1] === "\n") {
        body = body.substring(0, body.length - 1);
    }
    lines = body.split("\n");
    line  = initialLine - 0;

    const highlighted = highlightAuto(url, body);
    code.className = "";
    code.classList.add(highlighted.language);
    screen.className = "";
    screen.classList.add(highlighted.language);

    const preview = document.querySelector("#preview tbody");
    preview.innerText = "";
    const fragment = document.createDocumentFragment();
    let i = 1;
    highlighted.value.split("\n").forEach(l => {
        const tr = document.createElement('tr');
        const ln = document.createElement('td');
        {
            ln.classList.add('line-number');
            ln.innerText = i;
        }
        const cd = document.createElement('td');
        {
            cd.classList.add('source');
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.innerHTML = l;
            pre.appendChild(code);
            cd.appendChild(pre);
        }
        tr.appendChild(ln);
        tr.appendChild(cd);
        fragment.appendChild(tr);
        i++;
    });
    preview.appendChild(fragment);

    next(screen, code);

    const original = document.querySelector("#original-code");
    original.setAttribute("href", url);
    original.innerText = url;

    typingMode();
}

function previous(screen, code) {
    line = Math.max(0, line - 2);
    window.history.pushState({}, "", `?url=${encodeURIComponent(url)}&line=${line}`);
    updateCode(screen, code);
}

function next(screen, code) {
    window.history.pushState({}, "", `?url=${encodeURIComponent(url)}&line=${line}`);
    updateCode(screen, code);
}

function updateCode(screen, code) {
    clear(screen);

    if (line >= lines.length) {
        line = lines.length - 1;
    }

    document.querySelectorAll("#preview .line-number").forEach(item => {
        item.classList.remove("current");
        const num = item.innerText - 0;
        if ((line + 1) === num) {
            item.classList.add("current");
        }
    });

    code.innerText = lines[line++] || "";
    code.setAttribute("data-line-number", line);
    hljs.highlightBlock(code);

    const info = document.querySelector("#info > .line");
    info.innerText = `${line}/${lines.length}`
}

function check(screen, code) {
    const typed  = screen.innerText;
    const source = code.innerText;
    if (typed === source) {
        if (isLastLine()) {
            completed();
        } else {
            good();
            next(screen, code);
        }
    } else {
        bad();
        clear(screen);
    }
}

function good() {
    const good = document.querySelector("#good");
    good.classList.remove('gotonext');
    setTimeout(() => {
        good.classList.add('gotonext');
    }, 0);

    goodCount += 1;
    updatePoint();
}

function bad() {
    const bad = document.querySelector("#bad");
    bad.classList.remove('gotonext');
    setTimeout(() => {
        bad.classList.add('gotonext');
    }, 0);

    badCount += 1;
    updatePoint();
}

function completed() {
    const completed = document.querySelector("#completed");
    completed.classList.remove('gotonext');
    setTimeout(() => {
        completed.classList.add('gotonext');
    }, 0);

    window.history.pushState({}, "", "index.html");
    configMode();
}

const keyPress = (e) => {
    e.preventDefault();

    const screen = document.querySelector("#screen");
    const code   = document.querySelector("#code");

    if (e.ctrlKey) {
        if (e.code === "KeyH") {
            backspace(screen);
        } else if (e.code === "KeyW") {
            killLeft(screen);
        } else if (e.code === "KeyP") {
            previous(screen, code);
        } else if (e.code === "KeyN") {
            next(screen, code);
        }
        return;
    } else if (e.code === "Enter") {
        check(screen, code);
        return;
    } else if (e.code === "Space") {
        type(screen, " ");
        return;
    }
    type(screen, e.key);
};

const keyDown = (e) => {
    const screen = document.querySelector("#screen");
    const code   = document.querySelector("#code");

    if (e.code === "Backspace") {
        e.preventDefault();
        backspace(screen);
    } else if (e.code === "Tab") {
        e.preventDefault();
        indent(screen, code);
    }
};

let goodCount = 0;
let badCount  = 0;
let interval  = null;
let startTime = null;
function start() {
    document.addEventListener("keypress", keyPress);
    document.addEventListener("keydown", keyDown);

    goodCount = 0;
    badCount  = 0;
    updatePoint();

    const time = document.querySelector("#info > .time")
    time.innerText = "0";
    startTime = new Date().getTime();
    interval = setInterval(() => {
        const current = new Date().getTime();
        const diff = current - startTime;
        const seconds = Math.floor(diff / 1000);
        const s = seconds % 60;
        time.innerText = `${s}`;
    }, 1000);
}

function stop() {
    document.removeEventListener("keypress", keyPress);
    document.removeEventListener("keydown", keyDown);

    if (interval !== null) {
        clearInterval(interval);
    }
}

function updatePoint() {
    const good = document.querySelector("#info > .good");
    const bad  = document.querySelector("#info > .bad");

    good.innerText = "" + goodCount;
    bad.innerText  = "" + badCount;
}

document.addEventListener("DOMContentLoaded", () => {
    const code = document.querySelector("#code");
    const screen = document.querySelector("#screen");

    const input = document.querySelector("#url");
    input.addEventListener("input", e => {
        input.setCustomValidity("");
    });

    const form = document.querySelector("#config");
    form.addEventListener("submit", e => {
        e.preventDefault();

        const button = document.querySelector("#start-button");
        button.disabled = true;

        initialize(screen, code, input.value, 0).then(() => {
            button.disabled = false;
        }).catch(e => {
            console.log(e);
            input.setCustomValidity("Cannot fetch code by this URL.");
            input.reportValidity();
            button.disabled = false;
        });
    });

    const title = document.querySelector("#title");
    title.addEventListener("click", e => {
        e.preventDefault();
        window.history.pushState({}, "", "index.html");
        configMode();
    });

    const preview = document.querySelector("#preview");
    preview.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("line-number")) {
            line = (0 + e.target.innerText) - 1;
            next(screen, code);
        }
    });

    const currentURL = new URL(window.location.href);
    const params = currentURL.searchParams;
    const url = params.get("url");
    if (url !== null) {
        const line = params.get("line") || 0;
        initialize(screen, code, url, line).catch(e => {
            console.log(e);
            input.value = url;
            input.setCustomValidity("Cannot fetch code by this URL.")
            input.reportValidity();
        });
    }

    window.addEventListener("popstate", () => {
        const currentURL = new URL(window.location.href);
        const params = currentURL.searchParams;
        const nextURL = params.get("url");
        if (nextURL === null) {
            configMode();
            return;
        }

        const nextLine = params.get("line") || 0;

        if (url !== nextURL) {
            initialize(screen, code, nextURL, nextLine).catch(() => {
                configMode();
            });
            return;
        }

        if (line !== nextLine) {
            line = nextLine;
            updateCode(screen, code);
            typingMode();
        }
    });
});
