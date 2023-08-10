var offsetX = 0;
var offsetY = 0;
var intervalId;
var isDrawing = false;
var hasScreenshot = !!intervalId;
var current_url = null;
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    var isEnabled = msg.text === 'enabled';
    var overlay = document.getElementById("fake-screenshot-overlay");
    var buttons = document.getElementById("fake-screenshot-buttons");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = 'fake-screenshot-overlay';
        overlay.style.cssText = 'position: fixed;\n' +
            '            top: 0;\n' +
            '            left: 0;\n' +
            '            width: 100%;\n' +
            '            height: 100%;\n' +
            '            background-color: rgba(0, 0, 0, 0.5);\n' +
            '            z-index: 999999;' +
            '            cursor: crosshair;';
        document.body.appendChild(overlay);
    }
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
    var screenshotBtn = buttons.querySelector("button#fake-screenshot-screenshotBtn");
    if (!screenshotBtn) {
        screenshotBtn = document.createElement("button");
        screenshotBtn.id = "fake-screenshot-screenshotBtn";
        screenshotBtn.textContent = "Сделать скриншот";
        screenshotBtn.style.cssText = "margin-right: 10px;";
        buttons.appendChild(screenshotBtn);
    }
    var cancelBtn = buttons.querySelector("button#fake-screenshot-cancelBtn");
    if (!cancelBtn) {
        cancelBtn = document.createElement("button");
        cancelBtn.id = "fake-screenshot-cancelBtn";
        cancelBtn.textContent = "Отменить действие";
        cancelBtn.style.cssText = "margin-right: 10px;";
        buttons.appendChild(cancelBtn);
    }


    // chrome.storage.sync.set({enabled: isEnabled});
    if (isEnabled) {
        var ctx = canvas.getContext("2d", {willReadFrequently: true});
        var startX, startY;

        // Назначаем размеры холста равными размерам окна браузера
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Назначаем обработчик события для начала рисования
        overlay.addEventListener("mousedown", function (e) {
            if (e.target === screenshotBtn || e.target === cancelBtn || hasScreenshot) {
                return false;
            }
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
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);

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
                x: Math.min(startX, endX),
                y: Math.min(startY, endY),
                width: Math.abs(width),
                height: Math.abs(height)
            };
            localStorage.setItem("screenshotData", JSON.stringify(screenshotData));
        });
    } else {
        document.body.removeChild(overlay);
        localStorage.removeItem("screenshotData");
        hasScreenshot = false;
    }

    screenshotBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
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
            }, 1500)
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
        // overlay.style.display = "none";
        // Очищаем данные об отмеченной области
        localStorage.removeItem("screenshotData");
        if (intervalId) clearTimeout(intervalId);
        hasScreenshot = false;
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
        x: x + offsetX,
        y: y + offsetY,
        width: width,
        height: height,
    }).then(function (canvas) {
        var imgURL = canvas.toDataURL("image/jpeg", 0.1);
        chrome.runtime.sendMessage({img: imgURL, current_url: current_url}, (captured) => {
        });
    });
}