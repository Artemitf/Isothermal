const canvas = document.getElementById('pistonCanvas');
const ctx = canvas.getContext('2d');
const DURATION = 30000; // Уменьшил длительность анимации для плавности

let constParams = {
    m: 1,
    T: 300,
    M: 0.028
};

let maxVolume = 10;
let maxPressure = 1500;
let pressureStep = 250;
let animationId = null;
let points = [];
let pressureValues = [];
let minV = 0, maxV = 10;
let minP = 0, maxP = 0;

// Предварительная отрисовка термометра и цилиндра
function initDraw() {
    drawCylinderAndGauge(1, 0, maxVolume);
}

function getNiceMaxPressureStep(rawMaxP) {
    const base = Math.pow(10, Math.floor(Math.log10(rawMaxP)));
    const niceMultiples = [1, 1.5, 2, 2.5, 5, 10];
    let niceMax = niceMultiples.map(mult => mult * base).find(n => n >= rawMaxP);
    let step = niceMax / 6;

    const stepBase = Math.pow(10, Math.floor(Math.log10(step)));
    const niceSteps = [1, 2, 2.5, 5, 10];
    step = niceSteps.map(s => s * stepBase).find(s => s >= step);
    niceMax = step * 6;

    return { max: niceMax, step };
}

function drawCylinderAndGauge(volume, timeElapsed, maxVolume) {
    const tempC = constParams.T - 273;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем цилиндр
    const cylX = 100, cylY = 50, cylW = 100, cylH = 300;
    const filledH = cylH * (volume / maxVolume);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.strokeRect(cylX, cylY, cylW, cylH);

    const gradient = ctx.createLinearGradient(0, cylY + cylH, 0, cylY + cylH - filledH);
    gradient.addColorStop(0, "#4fc3f7");
    gradient.addColorStop(1, "#01579b");
    ctx.fillStyle = gradient;
    ctx.fillRect(cylX, cylY + cylH - filledH, cylW, filledH);

    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    for (let i = 0; i <= maxVolume; i += Math.ceil(maxVolume / 10)) {
        let y = cylY + cylH - (i / maxVolume) * cylH;
        ctx.fillText(i + " л", cylX + cylW + 10, y + 5);
    }

    // Рисуем манометр
    const gaugeX = 400, gaugeY = 200, gaugeR = 80;
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, 0, 2 * Math.PI);
    ctx.strokeStyle = "#333";
    ctx.stroke();

    for (let i = 0; i <= 6; i++) {
        const pVal = i * pressureStep;
        const ang = Math.PI + (i / 6) * Math.PI;
        const x = gaugeX + (gaugeR + 15) * Math.cos(ang);
        const y = gaugeY + (gaugeR + 15) * Math.sin(ang);
        ctx.fillText(pVal.toFixed(0), x - 10, y + 4);
    }

    const pressure = getCurrentPressure(volume);
    const clampedP = Math.min(pressure, maxPressure);
    const angle = Math.PI + (clampedP / maxPressure) * Math.PI;
    const arrowLen = gaugeR - 10;

    ctx.beginPath();
    ctx.moveTo(gaugeX, gaugeY);
    ctx.lineTo(gaugeX + arrowLen * Math.cos(angle), gaugeY + arrowLen * Math.sin(angle));
    ctx.strokeStyle = "#e53935";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.fillText(`P = ${pressure.toFixed(1)} кПа`, gaugeX - 40, gaugeY + gaugeR + 30);

    // Рисуем термометр (всегда)
    const thermoX = 750, thermoY = 20, thermoH = 400, thermoW = 30;
    const cMin = -200, cMax = 1000;

    ctx.strokeStyle = "#444";
    ctx.strokeRect(thermoX, thermoY, thermoW, thermoH);

    const percent = (tempC - cMin) / (cMax - cMin);
    const tempHeight = thermoH * percent;

    ctx.fillStyle = "red";
    ctx.fillRect(thermoX, thermoY + thermoH - tempHeight, thermoW, tempHeight);

    ctx.fillStyle = "#000";
    ctx.font = "10px Arial";

    for (let i = cMin; i <= cMax; i += 100) {
        const y = thermoY + thermoH - ((i - cMin) / (cMax - cMin)) * thermoH;
        const kelvin = (i + 273).toFixed(0);
        ctx.fillText(i + "°C", thermoX + thermoW + 5, y + 3);
        ctx.fillText(kelvin + "°K", thermoX - 38, y + 3);
    }

    document.getElementById("vVal").innerText = volume.toFixed(2) + " л";
    document.getElementById("pVal").innerText = pressure.toFixed(1) + " кПа";
    document.getElementById("timeVal").innerText = (timeElapsed / 1000).toFixed(1);
}

function getCurrentPressure(volume) {
    // Линейная интерполяция между ближайшими точками
    if (points.length === 0) return 0;

    const volumeRatio = (volume - minV) / (maxV - minV);
    const index = volumeRatio * (points.length - 1);

    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);

    if (lowerIndex === upperIndex) return points[lowerIndex][1];

    const lowerV = points[lowerIndex][0];
    const upperV = points[upperIndex][0];
    const lowerP = points[lowerIndex][1];
    const upperP = points[upperIndex][1];

    const ratio = (volume - lowerV) / (upperV - lowerV);
    return lowerP + ratio * (upperP - lowerP);
}

function animateToVolume(from, to, duration, maxVolume) {
    const start = performance.now();
    const graphCanvas = document.getElementById("graphCanvas");
    const gctx = graphCanvas.getContext("2d");

    // Очищаем и рисуем оси графика один раз
    gctx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
    drawGraphAxes(gctx, graphCanvas);

    // Массивы для хранения текущих точек анимации
    let animatedPoints = [];

    function animate(time) {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1);
        const currentV = from + (to - from) * progress;

        // Добавляем точку в массив анимации
        const currentP = getCurrentPressure(currentV);
        animatedPoints.push([currentV, currentP]);

        // Отрисовываем текущее состояние
        drawCylinderAndGauge(currentV, elapsed, maxVolume);

        // Очищаем только область графика (не оси)
        gctx.clearRect(71, 0, graphCanvas.width - 71, graphCanvas.height - 71);

        // Рисуем кривую по точкам анимации
        drawAnimatedCurve(gctx, graphCanvas, animatedPoints);

        if (progress < 1) {
            animationId = requestAnimationFrame(animate);
        } else {
            // После завершения рисуем полную кривую
            drawAnimatedCurve(gctx, graphCanvas, points);
        }
    }

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    animationId = requestAnimationFrame(animate);
}

function drawGraphAxes(gctx, graphCanvas) {
    const margin = 70;
    gctx.strokeStyle = "#000";
    gctx.lineWidth = 1;
    gctx.beginPath();
    gctx.moveTo(margin, margin);
    gctx.lineTo(margin, graphCanvas.height - margin);
    gctx.lineTo(graphCanvas.width - margin, graphCanvas.height - margin);
    gctx.stroke();

    gctx.font = "14px Arial";
    gctx.fillText("Объём (л)", graphCanvas.width / 2 - 30, graphCanvas.height - 20);
    gctx.save();
    gctx.translate(20, graphCanvas.height / 2 + 30);
    gctx.rotate(-Math.PI / 2);
    gctx.fillText("Давление (кПа)", 0, 0);
    gctx.restore();

    // Оси давления
    for (let i = 0; i <= 6; i++) {
        const y = graphCanvas.height - margin - (i / 6) * (graphCanvas.height - 2 * margin);
        const p = minP + (maxP - minP) * (i / 6);
        gctx.fillText(p.toFixed(0), margin - 40, y + 4);
        gctx.beginPath();
        gctx.moveTo(margin - 5, y);
        gctx.lineTo(margin, y);
        gctx.stroke();
    }

    // Оси объема
    for (let i = 0; i <= 6; i++) {
        const x = margin + (i / 6) * (graphCanvas.width - 2 * margin);
        const v = minV + (maxV - minV) * (i / 6);
        gctx.fillText(v.toFixed(1), x - 10, graphCanvas.height - margin + 20);
        gctx.beginPath();
        gctx.moveTo(x, graphCanvas.height - margin);
        gctx.lineTo(x, graphCanvas.height - margin + 5);
        gctx.stroke();
    }
}

function drawAnimatedCurve(gctx, graphCanvas, pointsToDraw) {
    const margin = 70;
    const width = graphCanvas.width - 2 * margin;
    const height = graphCanvas.height - 2 * margin;

    gctx.strokeStyle = "#2196f3";
    gctx.lineWidth = 2;
    gctx.beginPath();

    for (let i = 0; i < pointsToDraw.length; i++) {
        const x = margin + (pointsToDraw[i][0] - minV) / (maxV - minV) * width;
        const y = graphCanvas.height - margin - (pointsToDraw[i][1] - minP) / (maxP - minP) * height;

        if (i === 0) {
            gctx.moveTo(x, y);
        } else {
            gctx.lineTo(x, y);
        }
    }

    gctx.stroke();
}

document.getElementById("isothermalForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const jsonData = {};
    let isValid = true;

    // Проверка значений
    formData.forEach((value, key) => {
        const numValue = parseFloat(value);
        jsonData[key] = numValue;

        // Общая проверка на положительные числа
        if (numValue <= 0) {
            alert(`Значение ${key} должно быть положительным!`);
            isValid = false;
            return;
        }

        // Специальная проверка для температуры
        if (key === 'T0' && numValue < 73) {
            alert('Температура не может быть ниже 73K!');
            isValid = false;
            return;
        }
    });

    if (!isValid) return;

    if (jsonData.V0 > jsonData.V1) {
        alert('Начальный объём V₀ не может быть больше конечного объёма V₁!');
        return;
    }

    fetch('/isothermal/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(jsonData)
    }).then(response => response.json())
        .then(data => {
            console.log('Данные успешно получены с сервера', data);

            // Установка параметров
            constParams = {
                T: jsonData.T0,
                m: jsonData.m,
                M: jsonData.M
            };

            points = data.points;
            minV = Math.min(jsonData.V0, jsonData.V1);
            maxV = Math.max(jsonData.V0, jsonData.V1);

            pressureValues = points.map(p => p[1]);
            minP = Math.min(...pressureValues);
            maxP = Math.max(...pressureValues);

            maxVolume = data.maxVolume;
            const nice = getNiceMaxPressureStep(data.rawMaxP);
            maxPressure = nice.max;
            pressureStep = nice.step;

            // Запускаем анимацию сразу
            animateToVolume(jsonData.V0, jsonData.V1, DURATION, maxVolume);
        }).catch(error => {
        console.error('Ошибка:', error);
    });
});

// Инициализация при загрузке страницы
window.addEventListener('load', initDraw);