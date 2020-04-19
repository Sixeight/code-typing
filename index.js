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
    return line === lines.length - 1;
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

    const body = await fetchCode(url)
    lines = body.split("\n");
    line  = initialLine;

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

function next(screen, code) {
    window.history.pushState({}, "", `?url=${encodeURIComponent(url)}&line=${line}`);
    updateCode(screen, code);
}

function updateCode(screen, code) {
    clear(screen);
    code.innerText = lines[line++] || "";
    code.setAttribute("data-line-number", line);
    hljs.highlightBlock(code);
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
}

function bad() {
    const bad = document.querySelector("#bad");
    bad.classList.remove('gotonext');
    setTimeout(() => {
        bad.classList.add('gotonext');
    }, 0);
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
        } else if (e.key === "w") {
            killLeft(screen);
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

    if (e.code === "Backspace") {
        e.preventDefault();
        backspace(screen);
    } else if (e.code === "Tab") {
        e.preventDefault();
        type(screen, "  ");
    }
};

function start() {
    document.addEventListener("keypress", keyPress);
    document.addEventListener("keydown", keyDown);
}

function stop() {
    document.removeEventListener("keypress", keyPress);
    document.removeEventListener("keydown", keyDown);
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
