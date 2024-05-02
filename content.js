var offsetX = 0;
var offsetY = 0;
var intervalId;
var isDrawing = false;
var hasScreenshot = !!intervalId;
var current_url = null;
if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
    switcher(false);
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    const BASE_URL = request.base_url;
    var isEnabled = request.status === 'enabled';
    var overlay = document.getElementById("fake-screenshot-overlay");
    var searchBlock = document.getElementById("fake-search-block");
    var buttons = document.getElementById("fake-screenshot-buttons");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = 'fake-screenshot-overlay';
        overlay.style.cssText = 'display: none;position: fixed;top: 0;left: 0; width: 100%;height: 100%;background-color: rgba(0, 0, 0, 0.5);z-index: 999999;cursor: crosshair;';
        document.body.appendChild(overlay);
    }
    overlay.style.display = isEnabled ? "block" : "none";
    if (!buttons) {
        buttons = document.createElement("div");
        buttons.id = "fake-screenshot-buttons";
        buttons.style.cssText = 'position: absolute;z-index: 1000000;display: none;cursor: default;';
        overlay.appendChild(buttons);
    }
    var canvas = overlay.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement("canvas");
        overlay.appendChild(canvas);
    }

    if (!searchBlock) {
        searchBlock = document.createElement("div");
        searchBlock.id = "fake-search-block";
        searchBlock.style.cssText = 'display: none;position: fixed;z-index: 1000000;right: 5px;top: 5px;background: #a4b8c1;border: 1px #646262 solid;padding: 10px;border-radius: 3px;cursor: default;width: 250px;';
        document.body.appendChild(searchBlock);
    }
    searchBlock.style.display = isEnabled ? "block" : "none";

    var searchInput = searchBlock.querySelector("input#fake-search-input");
    if (!searchInput) {
        searchInput = document.createElement("input");
        searchInput.type = "search";
        searchInput.id = "fake-search-input";
        searchInput.placeholder = "Напишите трек ид";
        searchInput.style.cssText = "width: 100%;background-color: white;color: black;border: 1px solid;padding: 5px;";
        searchBlock.appendChild(searchInput);
    }

    var fakesWaitingQrBlock = searchBlock.querySelector("#fakes-waiting-qr-block");
    if (!fakesWaitingQrBlock) {
        fakesWaitingQrBlock = document.createElement("div");
        fakesWaitingQrBlock.id = "fakes-waiting-qr-block";
        fakesWaitingQrBlock.style.cssText = "width: 100%;max-height: 150px;overflow-y: auto;margin-bottom: 15px;text-align: center;";
        searchBlock.prepend(fakesWaitingQrBlock);
    }

    var trackIdsBlock = searchBlock.querySelector("#fake-track-ids-block");
    if (!trackIdsBlock) {
        trackIdsBlock = document.createElement("div");
        trackIdsBlock.id = "fake-track-ids-block";
        trackIdsBlock.style.cssText = "width: 100%;margin-top: 15px;";
        searchBlock.appendChild(trackIdsBlock);
    }

    var screenshotBtn = buttons.querySelector("button#fake-screenshot-screenshotBtn");
    if (!screenshotBtn) {
        screenshotBtn = document.createElement("button");
        screenshotBtn.id = "fake-screenshot-screenshotBtn";
        screenshotBtn.textContent = "Сделать скриншот";
        screenshotBtn.style.cssText = "margin-right: 10px;background-color: white; color: black; border: 1px solid;text-align: center;text-decoration: none;cursor: pointer;padding: 5px;margin-bottom: 5px;";
        buttons.appendChild(screenshotBtn);
    }

    var cancelBtn = buttons.querySelector("button#fake-screenshot-cancelBtn");
    if (!cancelBtn) {
        cancelBtn = document.createElement("button");
        cancelBtn.id = "fake-screenshot-cancelBtn";
        cancelBtn.textContent = "Отменить действие";
        cancelBtn.style.cssText = "margin-right: 10px;background-color: white; color: black; border: 1px solid;text-align: center;text-decoration: none;cursor: pointer;padding: 5px;";
        buttons.appendChild(cancelBtn);
    }

    if (isEnabled) {
        var ctx = canvas.getContext("2d", {willReadFrequently: true});
        var startX, startY;

        // Назначаем размеры холста равными размерам окна браузера
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Назначаем обработчик события для начала рисования
        overlay.addEventListener("mousedown", function (e) {
            if (e.target === screenshotBtn || e.target === cancelBtn || e.target.parentNode === searchBlock || hasScreenshot) {
                return false;
            }
            e.preventDefault();
            e.stopPropagation();
            isDrawing = true;
            startX = e.clientX - offsetX;
            startY = e.clientY - offsetY;
            localStorage.removeItem("screenshotData");
        });

        // Назначаем обработчик события для перемещения мыши
        overlay.addEventListener("mousemove", function (e) {
            if (!isDrawing || hasScreenshot) return;
            var currentX = e.clientX - offsetX;
            var currentY = e.clientY - offsetY;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "red";
            ctx.shadowColor = "#000000";
            ctx.shadowBlur = 20;
            ctx.lineJoin = "round";
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
            ctx.clearRect(startX, startY, currentX - startX, currentY - startY);

            // Показываем кнопки скриншота и отмены действий
            buttons.style.display = "block";
            buttons.style.left = (Math.min(startX, currentX) + offsetX) + "px";
            buttons.style.top = (Math.max(startY, currentY) + offsetY + 10) + "px";
        });

        // Назначаем обработчик события для окончания рисования
        overlay.addEventListener("mouseup", function (e) {
            isDrawing = false;
            var endX = e.clientX - offsetX;
            var endY = e.clientY - offsetY;
            var width = endX - startX;
            var height = endY - startY;

            // Сохраняем значения отмеченной области

            var screenshotData = JSON.parse(localStorage.getItem("screenshotData"));
            if (!screenshotData) screenshotData = {
                x: Math.min(startX, endX), y: Math.min(startY, endY), width: Math.abs(width), height: Math.abs(height)
            };
            localStorage.setItem("screenshotData", JSON.stringify(screenshotData));
        });
        getFakesWaitingQr(`${BASE_URL}/screenshot`).then(function (fakes) {
            fakesWaitingQrBlock.innerHTML = fakes.length ? '<p>В ожидание QR</p>' : '<p>Ожидаемых QR нет</p>';
            fakes.forEach((fake) => {
                fakesWaitingQrBlock.innerHTML += `<div><a href="#" class="fakes-waiting-qr-item" data-track-id="${fake.track_id}">${fake.track_id}</a> - ${fake.tg_account}</div>`;
            });
            fakesWaitingQrBlock
                .querySelectorAll('.fakes-waiting-qr-item')
                .forEach(element => {
                    element.addEventListener('click', addTrackId);
                });
        });
    } else {
        document.body.removeChild(overlay);
        localStorage.removeItem("screenshotData");
        hasScreenshot = false;
    }

    searchInput.addEventListener('keypress', addTrackId);

    screenshotBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        searchInput.style.border = '1px solid';
        if (!getTrackIds().length) {
            searchInput.style.border = '1px solid red';
            return false;
        }
        hasScreenshot = true;
        var screenshotData = JSON.parse(localStorage.getItem("screenshotData"));
        if (screenshotData) {
            current_url = window.location.href;
            if (screenshotBtn) screenshotBtn.style.display = "none";
            if (intervalId) clearTimeout(intervalId);

            intervalId = setInterval(function () {
                if (overlay) overlay.style.display = "none";
                captureScreenshot(screenshotData.x, screenshotData.y, screenshotData.width, screenshotData.height);
                if (overlay) overlay.style.display = "block";
            }, 1200)
        }
        return false;
    });

    cancelBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        // Очищаем холст и скрываем кнопки
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        screenshotBtn.style.display = 'inline-block';
        buttons.style.display = "none";
        overlay.style.display = "none";
        // Очищаем данные об отмеченной области
        localStorage.removeItem("screenshotData");
        if (intervalId) clearTimeout(intervalId);
        hasScreenshot = false;
        isEnabled = false;
        switcher(isEnabled);
        return false;
    });

    // Назначаем обработчик события для перемещения холста при прокрутке страницы
    window.addEventListener("scroll", function () {
        offsetX = window.pageXOffset;
        offsetY = window.pageYOffset;
        // Обновляем положение кнопок при прокрутке страницы
        if (buttons.style.display === "block") {
            var screenshotData = JSON.parse(localStorage.getItem("screenshotData"));
            if (screenshotData && !hasScreenshot) {
                buttons.style.left = (screenshotData.x + offsetX) + "px";
                buttons.style.top = (screenshotData.y + offsetY + screenshotData.height + 10) + "px";
            }
        }
    });


    sendResponse();
});

function captureScreenshot(x, y, width, height) {
    return html2canvas(document.body, {
        x: x + offsetX, y: y + offsetY, width: width, height: height,
    }).then(function (canvas) {
        var imgURL = canvas.toDataURL("image/jpeg", 0.1);
        chrome.runtime.sendMessage({img: imgURL, current_url: current_url, track_ids: getTrackIds()});
    });
}

function getTrackIds() {
    let trackIds = [];
    let trackIdItem = document.querySelectorAll('.track-id-item');
    if (trackIdItem.length) {
        trackIdItem.forEach((node) => {
            let trackId = node.textContent;
            trackId = trackId.substring(0, trackId.length - 1);
            trackIds.push(trackId)
        });
    }
    return trackIds;//JSON.stringify(tags)
}

function switcher(enabled) {
    chrome.runtime.sendMessage({enabled: enabled});
}

function addTrackId(e) {
    if (e.type !== 'click' && (e.keyCode < 48 || e.keyCode > 57)) {
        e.preventDefault();
    }
    if (e.type === 'click' || (e.target?.id === 'fake-search-input' && (e.which === 13 || e.keyCode === 13))) {
        let trackId = e.type === 'click' ? e.target.dataset.trackId : e.target?.value;
        if (trackId) {
            trackId = trackId.replace(/\s*$/, "").toLowerCase();
            let trackIdItem = document.createElement('div');
            trackIdItem.className = 'track-id-item'
            trackIdItem.style.cssText = 'display: inline-block;\n' +
                '    height: 30px;\n' +
                '    font-size: 11px;\n' +
                '    line-height: 30px;\n' +
                '    background-color: rgb(234, 234, 234);\n' +
                '    padding: 0px 15px;\n' +
                '    border-radius: 25px;\n' +
                '    margin: 3px;';
            trackIdItem.innerHTML = `${trackId}<span class="remove-track-id" style="
                padding-left: 13px;color: rgb(136, 136, 136);
                font-weight: 100;
                float: right;
                font-size: 18px;
                cursor: pointer;">&times;</span>`;
            document.querySelectorAll('.track-id-item').forEach(function (t) {
                if (t.textContent === (trackId + '×')) {
                    t.remove();
                }
            });
            e.target.value = '';
            document.querySelector('#fake-track-ids-block').appendChild(trackIdItem);
            trackIdItem.querySelector('.remove-track-id').addEventListener('click', function (e) {
                e.target.parentNode.remove();
            });
            document.querySelector("input#fake-search-input").style.border = '1px solid';
        }
        e.preventDefault();
    }
}


async function getFakesWaitingQr(url, body = null) {
    try {
        const response = await fetch(url, {
            method: "GET",
            body: body,
            headers: {
                "Content-Type": "application/json",
            },
        });

        return response.json();
    } catch (error) {
        console.error(error);
    }
    return [];
}

