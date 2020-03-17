const CACHE_NAME = "netfortune-v1";
const TO_CACHE = [
    "static/scripts/index.js",
    "static/styles/styles.css",

    "https://polyfill.io/v3/polyfill.min.js?features=fetch",
];

const dbPromise = new Promise((resolve, reject) => {
    console.log("opening database");
    const dbReq = indexedDB.open("netfortune", 1);
    dbReq.addEventListener("upgradeneeded", event => {
        const db = event.target.result;
        for (let currentVersion = event.oldVersion; currentVersion < event.newVersion; currentVersion++) {
            switch (currentVersion) {
                case 0:
                    db.createObjectStore("response_fragments");
                    db.createObjectStore("fortunes", { autoIncrement: true });
            }
        }
    });
    dbReq.addEventListener("success", event => {
        console.log("database opened");
        resolve(event.target.result);
    });
    dbReq.addEventListener("error", event => {
        reject(event);
    });
    dbReq.addEventListener("blocked", event => {
        reject(event);
    });
});

function idbRequestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.addEventListener("success", event => {
            resolve(event.target.result);
        });
        request.addEventListener("error", event => {
            reject(event);
        });
    });
}

function idbTransactionToPromise(txn) {
    return new Promise((resolve, reject) => {
        txn.addEventListener("complete", _ => {
            resolve();
        });
        txn.addEventListener("abort", event => {
            reject(event);
        });
        txn.addEventListener("error", event => {
            reject(event);
        });
    });
}

async function installCache() {
    console.log("installing cache");
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(TO_CACHE);
    console.log("finished installing cache");
}

async function installDB() {
    console.log("installing database");
    const db = await dbPromise;

    async function installResponseFragments() {
        console.log("installing response fragments");
        const indexHtml = await (await fetch(".")).text();
        const before = /^[^]*<pre>/.exec(indexHtml)[0];
        const after = /<\/pre>[^]*$/.exec(indexHtml)[1];
        console.table({ before, after });
        const txn = db.transaction("response_fragments", "readwrite");
        const responseFragmentsStore = txn.objectStore("response_fragments");
        responseFragmentsStore.put(before, "index.html-before-fortune");
        responseFragmentsStore.put(after, "index.html-after-fortune");
        await idbTransactionToPromise(txn);
        console.log("finished installing response fragments");
    }

    async function installFortunes() {
        console.log("installing fortunes");
        const fortunesObj = await (await fetch("fortunes/all")).json();
        const txn = db.transaction("fortunes", "readwrite");
        const fortunesStore = txn.objectStore("fortunes");
        console.log("got " + fortunesObj.fortunes.length + " fortunes");
        fortunesObj.fortunes.forEach(fortunesStore.add);
        await idbTransactionToPromise(txn);
        console.log("finished installing fortunes");
    }

    await Promise.all([installResponseFragments(), installFortunes()]);
    console.log("finished installing database");
}

self.addEventListener("install", event => event.waitUntil(Promise.all([installCache(), installDB()])));

self.addEventListener("activate", event => event.waitUntil(caches.keys().then(cacheNames => Promise.all(cacheNames.map(name => {
    if (name.startsWith("netfortune") && name !== CACHE_NAME) {
        return caches.delete(name);
    }
})))));

async function getRandomFortune(txn) {
    const fortunesStore = (txn || (await dbFuture).transaction("fortunes", "readonly")).objectStore("fortunes");
    const allKeys = await idbRequestToPromise(fortunesStore.getAllKeys());
    return idbRequestToPromise(fortunesStore.get(allKeys[Math.floor(Math.random() * allKeys.length)]));
}

async function createMainHTML() {
    const txn = (await dbFuture).transaction(["response_fragments", "fortunes"], "readonly");
    const responseFragmentsStore = txn.objectStore("response_fragments");
    const [before, fortune, after] = await Promise.all([
        idbRequestToPromise(responseFragmentsStore.get("index.html-before-fortune")),
        getRandomFortune(txn),
        idbRequestToPromise(responseFragmentsStore.get("index.html-after-fortune")),
    ]);
    return before + fortune + after;
}

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url, "http://i.dont.care/");
    switch (url.pathname) {
        case "/":
            event.respondWith(createMainHTML().then(b => new Response(b)));
            break;
        case "/fortunes/random":
            event.respondWith(getRandomFortune().then(b => new Response(b)));
            break;
        default:
            event.respondWith(caches.match(event.request).then(response => {
                if (response) {
                    return response;
                }
                return fetch(response);
            }));
    }
});