const pre = document.querySelector("pre");

const button = document.createElement("button");
button.textContent = "Load another";
button.addEventListener("click", function () {
    button.disabled = true;
    button.textContent = "Fetching...";
    fetch("fortunes/random").then(function (response) {
        response.text().then(function (fortune) {
            pre.textContent = fortune;
            button.disabled = false;
            button.textContent = "Load another";
        });
    });
});
document.body.appendChild(button);

/*if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("static/scripts/sw.js");
}*/
