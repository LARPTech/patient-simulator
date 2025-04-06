import React, { useRef, useEffect, useState, useCallback } from 'react';

// Цвета графиков
const COLORS = {
  ecg: '#22FF22',    // Зеленый для ЭКГ
  resp: '#FFFF22',   // Желтый для дыхания
  spo2: '#22FFFF',   // Голубой для SpO2
  bp: '#FFFFFF',     // Белый для АД
  grid: '#333333',   // Темно-серый для сетки
  gridMajor: '#444444', // Более заметные линии основной сетки
  text: '#999999',   // Серый для текста
  background: '#000000', // Черный фон
  sweepLine: 'rgba(0, 0, 0, 0.9)', // Цвет линии развертки
};

// Константы для генерации волн (без изменений)
const ECG_WAVE_CONSTANTS = {
  Q_WIDTH: 0.02,  // 20 мс
  Q_AMP: -0.1,    // 10% от R
  R_WIDTH: 0.04,  // 40 мс
  R_AMP: 1,       // 100% (нормализованная амплитуда)
  S_WIDTH: 0.02,  // 20 мс
  S_AMP: -0.2,    // 20% от R
  P_WIDTH: 0.08,  // 80 мс
  P_AMP: 0.15,    // 15% от R
  T_WIDTH: 0.16,  // 160 мс
  T_AMP: 0.3,     // 30% от R
};

// Функция для отрисовки сетки с улучшенными метками
const drawGrid = (ctx, w, h) => {
  // Сетка из крупных квадратов (1 секунда x 0.5 мВ)
  ctx.strokeStyle = COLORS.gridMajor;
  ctx.lineWidth = 0.8;
  
  // Основная сетка по времени (1 секунда)
  const totalSeconds = 18; // всего секунд на экране
  const secondWidth = w / totalSeconds; // ширина одной секунды
  
  for (let i = 0; i <= totalSeconds; i++) {
    const x = i * secondWidth;
    
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    
    // Отметки времени
    if (i > 0 && i % 3 === 0) { // Отметки каждые 3 секунды для лучшей читаемости
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px Arial';
      ctx.fillText(`${i}s`, x - 8, 12);
    }
  }
  
  // Основная сетка по амплитуде (крупные деления)
  const majorDivHeight = h / 5; // 5 крупных делений по высоте
  for (let y = 0; y <= h; y += majorDivHeight) {
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  
  // Дополнительная сетка (малые деления)
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  
  // Малые деления по времени (0.2 секунды)
  const minorTimeDiv = secondWidth / 5;
  for (let i = 0; i < totalSeconds * 5; i++) {
    if (i % 5 !== 0) { // Пропускаем позиции основной сетки
      const x = i * minorTimeDiv;
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }
  
  // Малые деления по амплитуде
  const minorAmpDiv = majorDivHeight / 5;
  for (let y = 0; y < h; y += minorAmpDiv) {
    if (Math.abs(y % majorDivHeight) > 1) { // Пропускаем позиции основной сетки
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
  
  // Сбрасываем пунктир
  ctx.setLineDash([]);
};

// Круговой буфер для оптимизации хранения данных
class CircularBuffer {
  constructor(size) {
    this.size = size;
    this.data = new Array(size).fill(0);
    this.writePos = 0;
  }
  
  // Добавить элемент в буфер
  push(value) {
    this.data[this.writePos] = value;
    this.writePos = (this.writePos + 1) % this.size;
  }
  
  // Получить элемент из буфера с учетом смещения
  get(index) {
    const readPos = (this.writePos - index - 1 + this.size) % this.size;
    return this.data[readPos];
  }
  
  // Получить все данные в порядке от старых к новым
  getAll() {
    const result = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.get(i));
    }
    return result;
  }
  
  // Обновить определенный индекс буфера
  update(index, value) {
    const actualIndex = (this.writePos - index - 1 + this.size) % this.size;
    this.data[actualIndex] = value;
  }
}

// Компонент для отрисовки реалистичных графиков
const RealisticWaveforms = ({ 
  vitalSigns, 
  isOperating = true, 
  graphType = 'ecg',
  width,
  height = 100,
}) => {
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null); // Для двойной буферизации
  const animationRef = useRef(null);
  const [time, setTime] = useState(0);
  const dataBufferRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const sweepLineRef = useRef(0); // Позиция линии развертки
  const lastPerformanceUpdateRef = useRef(0); // Для адаптивного FPS
  
  // Определяем тип графика и цвет
  const getWaveColor = useCallback(() => {
    switch (graphType) {
      case 'resp': return COLORS.resp;
      case 'spo2': return COLORS.spo2;
      case 'bp': return COLORS.bp;
      case 'ecg':
      default: return COLORS.ecg;
    }
  }, [graphType]);
  
  // Генерация реалистичной ЭКГ волны (без изменений)
  const generateECGSignal = useCallback((t, heartRate = 72) => {
    const cycleDuration = 60 / heartRate; // Длительность цикла в секундах
    const phase = (t % cycleDuration) / cycleDuration; // Фаза в цикле (0-1)
    
    // Добавление небольшого случайного шума (физиологические вариации)
    const noise = (Math.random() - 0.5) * 0.03;
    
    // Добавляем небольшой тремор для реализма
    const tremor = Math.sin(t * 50) * 0.01;
    
    // P-волна (начало цикла)
    if (phase < 0.12) {
      const pPhase = phase / 0.12;
      return ECG_WAVE_CONSTANTS.P_AMP * Math.sin(Math.PI * pPhase) + noise + tremor;
    }
    // PQ-интервал (изолиния после P-волны)
    else if (phase < 0.2) {
      return noise + tremor;
    }
    // QRS-комплекс
    else if (phase < 0.25) {
      const qrsPhase = (phase - 0.2) / 0.05;
      if (qrsPhase < 0.2) { // Q-зубец
        return ECG_WAVE_CONSTANTS.Q_AMP * Math.sin(Math.PI * qrsPhase / 0.2) + noise + tremor;
      } else if (qrsPhase < 0.6) { // R-зубец
        return ECG_WAVE_CONSTANTS.R_AMP * Math.sin(Math.PI * (qrsPhase - 0.2) / 0.4) + noise + tremor;
      } else { // S-зубец
        return ECG_WAVE_CONSTANTS.S_AMP * Math.sin(Math.PI * (qrsPhase - 0.6) / 0.4) + noise + tremor;
      }
    }
    // ST-сегмент (изолиния после QRS)
    else if (phase < 0.4) {
      return 0.1 * Math.sin(Math.PI * (phase - 0.25) / 0.15) + noise + tremor;
    }
    // T-волна
    else if (phase < 0.6) {
      const tPhase = (phase - 0.4) / 0.2;
      return ECG_WAVE_CONSTANTS.T_AMP * Math.sin(Math.PI * tPhase) + noise + tremor;
    }
    // Диастола (оставшаяся часть цикла - изолиния)
    else {
      return noise + tremor;
    }
  }, []);
  
  // Генерация волны дыхания (без изменений)
  const generateRespSignal = useCallback((t, respRate = 14) => {
    const cycleDuration = 60 / respRate; // Длительность цикла в секундах
    const phase = (t % cycleDuration) / cycleDuration; // Фаза в цикле (0-1)
    
    // Разделяем цикл на вдох (более быстрый) и выдох
    const inspirationRatio = 0.4; // Соотношение вдоха ко всему циклу
    
    // Добавление небольшого случайного шума
    const noise = (Math.random() - 0.5) * 0.05;
    
    // Вдох (восходящая часть кривой)
    if (phase < inspirationRatio) {
      return 0.8 * Math.pow(phase / inspirationRatio, 2) + noise;
    } 
    // Выдох (нисходящая часть кривой)
    else {
      const expirationPhase = (phase - inspirationRatio) / (1 - inspirationRatio);
      return 0.8 * Math.pow(1 - expirationPhase, 2) + noise;
    }
  }, []);
  
  // Генерация пульсовой волны SpO2 (без изменений)
  const generateSpO2Signal = useCallback((t, heartRate = 72, oxygenation = 98) => {
    const cycleDuration = 60 / heartRate; // Длительность цикла в секундах
    const phase = (t % cycleDuration) / cycleDuration; // Фаза в цикле (0-1)
    
    // Добавление небольшого случайного шума
    const noise = (Math.random() - 0.5) * 0.03;
    
    // Модификация амплитуды в зависимости от уровня оксигенации
    const amplitudeModifier = oxygenation > 90 ? 1 : (oxygenation / 100);
    
    // Фаза систолического нарастания (быстрый подъем)
    if (phase < 0.15) {
      return amplitudeModifier * Math.pow(phase / 0.15, 2) + noise;
    }
    // Систолический пик и дикротическая выемка
    else if (phase < 0.3) {
      const peakPhase = (phase - 0.15) / 0.15;
      // Добавляем небольшую дикротическую выемку
      const dicroticNotch = 0.2 * Math.sin(Math.PI * 2 * peakPhase);
      return amplitudeModifier * (1 - 0.3 * peakPhase + dicroticNotch) + noise;
    }
    // Диастолический спад (медленное снижение)
    else {
      const decayPhase = (phase - 0.3) / 0.7;
      return amplitudeModifier * (0.7 * Math.exp(-3 * decayPhase)) + noise;
    }
  }, []);
  
  // Генерация точки для типа графика (без изменений)
  const generateWaveformPoint = useCallback((t, vitalData) => {
    if (!vitalData) return 0;
    
    switch (graphType) {
      case 'resp':
        return generateRespSignal(t, vitalData.rr || 14);
      case 'spo2':
        return generateSpO2Signal(t, vitalData.hr || 72, vitalData.spo2 || 98);
      case 'ecg':
      default:
        return generateECGSignal(t, vitalData.hr || 72);
    }
  }, [graphType, generateECGSignal, generateRespSignal, generateSpO2Signal]);
  
  // Функция для создания gradient afterglow эффекта
  const createAfterglow = useCallback((ctx, w, h, sweepX) => {
    // Создаем градиент послесвечения от позиции развертки влево
    const afterglowWidth = w * 0.6; // 60% ширины экрана
    const gradient = ctx.createLinearGradient(sweepX, 0, sweepX - afterglowWidth, 0);
    
    // Градиент от полной яркости до нуля
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.1, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    
    return gradient;
  }, []);
  
  // Оптимизированная функция для отрисовки линии развертки
  const drawSweepLine = useCallback((ctx, w, h) => {
    const position = sweepLineRef.current;
    
    // Основная линия развертки
    ctx.fillStyle = COLORS.sweepLine;
    ctx.fillRect(position, 0, 10, h);
    
    // Градиент затухания для плавного перехода
    const fadeWidth = 80;
    const gradient = ctx.createLinearGradient(position - fadeWidth, 0, position, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(position - fadeWidth, 0, fadeWidth, h);
    
    // Плавный переход при достижении края
    if (position > w - 100) {
      const newPosition = position - w;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(newPosition, 0, 10, h);
    }
  }, []);
  
  // Инициализация буфера данных с использованием кругового буфера
  const initializeDataBuffer = useCallback((canvasWidth) => {
    const bufferSize = Math.floor(canvasWidth);
    
    // Создаем новый круговой буфер
    if (!dataBufferRef.current || dataBufferRef.current.size !== bufferSize) {
      dataBufferRef.current = new CircularBuffer(bufferSize);
      
      // Заполняем буфер начальными данными
      for (let i = 0; i < bufferSize; i++) {
        const t = i * 0.01; // Временной шаг
        dataBufferRef.current.push(generateWaveformPoint(t, vitalSigns));
      }
    }
  }, [generateWaveformPoint, vitalSigns]);
  
  // Функция для обновления позиции линии развертки (оптимизирована)
  const updateSweepLine = useCallback((w) => {
    // Предыдущая позиция
    const prevPosition = sweepLineRef.current;
    
    // Скорость прокрутки (пройти весь экран за 18 секунд)
    const speed = w / (18 * 60); // 60fps
    
    // Новая позиция с циклическим возвратом
    const newPosition = (prevPosition + speed) % w;
    sweepLineRef.current = newPosition;
    
    // Обновляем только точки в области линии развертки
    if (dataBufferRef.current) {
      const bufferSize = dataBufferRef.current.size;
      const pixelsPerPoint = w / bufferSize;
      
      // Находим индекс, соответствующий текущей позиции
      const index = Math.floor(newPosition / pixelsPerPoint) % bufferSize;
      
      // Обновляем только одну точку для повышения производительности
      if (index >= 0 && index < bufferSize) {
        const newPoint = generateWaveformPoint(time, vitalSigns);
        dataBufferRef.current.update(bufferSize - index - 1, newPoint);
      }
    }
  }, [time, generateWaveformPoint, vitalSigns]);
  
  // Функция для отрисовки графика (оптимизирована)
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Получаем offscreen canvas для двойной буферизации
    const offscreen = offscreenCanvasRef.current;
    if (!offscreen) return;
    
    const ctx = offscreen.getContext('2d', { alpha: false });
    const w = offscreen.width;
    const h = offscreen.height;
    
    // Очищаем холст
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);
    
    // Рисуем сетку
    drawGrid(ctx, w, h);
    
    // Если не в режиме работы, рисуем только статическую линию
    if (!isOperating) {
      ctx.strokeStyle = getWaveColor();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      
      // Копируем на основной холст
      const mainCtx = canvas.getContext('2d');
      mainCtx.drawImage(offscreen, 0, 0);
      return;
    }
    
    // Создаем эффект послесвечения
    const afterglowGradient = createAfterglow(ctx, w, h, sweepLineRef.current);
    ctx.fillStyle = afterglowGradient;
    ctx.fillRect(0, 0, w, h);
    
    // Отрисовка данных из буфера
    if (dataBufferRef.current && dataBufferRef.current.size > 1) {
      const waveColor = getWaveColor();
      
      // Рисуем основную линию графика
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const dataPoints = dataBufferRef.current.getAll();
      const pointDistance = w / (dataPoints.length - 1);
      
      for (let i = 0; i < dataPoints.length; i++) {
        const x = i * pointDistance;
        const y = h / 2 - dataPoints[i] * h * 0.4;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Рисуем вертикальную линию развертки
      drawSweepLine(ctx, w, h);
    }
    
    // Копируем на основной холст для устранения мерцания
    const mainCtx = canvas.getContext('2d');
    mainCtx.drawImage(offscreen, 0, 0);
  }, [getWaveColor, isOperating, drawSweepLine, createAfterglow]);
  
  // Отрисовка статической линии (когда монитор не активен)
  const drawStaticLine = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;
    
    const ctx = offscreen.getContext('2d');
    const w = offscreen.width;
    const h = offscreen.height;
    
    // Очищаем холст
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);
    
    // Рисуем сетку
    drawGrid(ctx, w, h);
    
    // Рисуем горизонтальную базовую линию 
    ctx.strokeStyle = getWaveColor();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    
    // Копируем на основной холст
    const mainCtx = canvas.getContext('2d');
    mainCtx.drawImage(offscreen, 0, 0);
  }, [getWaveColor]);
  
  // Функция для обновления размеров canvas (оптимизирована)
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;
    
    // Получаем реальные размеры контейнера
    const container = canvas.parentElement;
    const containerWidth = container?.clientWidth || width || 400;
    const containerHeight = container?.clientHeight || height || 100;
    
    // Учитываем плотность пикселей для Retina-дисплеев
    const dpr = window.devicePixelRatio || 1;
    
    // Устанавливаем размеры основного canvas
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    
    // Масштабируем контекст для Retina
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // Устанавливаем такие же размеры для offscreen canvas
    offscreen.width = containerWidth * dpr;
    offscreen.height = containerHeight * dpr;
    
    // Масштабируем контекст offscreen canvas
    const offscreenCtx = offscreen.getContext('2d');
    offscreenCtx.scale(dpr, dpr);
    
    // Переинициализируем буфер данных при изменении размера
    initializeDataBuffer(containerWidth);
    
    // Сбрасываем позицию линии развертки
    sweepLineRef.current = 0;
    
    // Обновляем отрисовку
    if (isOperating) {
      drawWaveform();
    } else {
      drawStaticLine();
    }
  }, [width, height, isOperating, drawWaveform, drawStaticLine, initializeDataBuffer]);
  
  // Эффект для инициализации offscreen canvas и начальной настройки
  useEffect(() => {
    // Создаем offscreen canvas для двойной буферизации, если его еще нет
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    
    // Инициализация размеров и начальная отрисовка
    updateCanvasSize();
    
    // Если не в режиме операции, отрисовываем статическую линию
    if (!isOperating) {
      drawStaticLine();
    }
  }, [updateCanvasSize, isOperating, drawStaticLine]);
  
  // Эффект для запуска и остановки анимации с адаптивным FPS
  useEffect(() => {
    if (!canvasRef.current || !offscreenCanvasRef.current) return;
    
    // Функция для обновления и отрисовки с адаптивным FPS
    const updateAndDraw = (timestamp) => {
      // Адаптируем частоту кадров к производительности устройства
      const elapsed = timestamp - lastFrameTimeRef.current;
      const targetFrameTime = 16.67; // ~60 FPS
      
      // Если прошло недостаточно времени или устройство медленное, пропускаем кадр
      if (elapsed < targetFrameTime) {
        animationRef.current = requestAnimationFrame(updateAndDraw);
        return;
      }
      
      // Обновляем время последнего кадра
      lastFrameTimeRef.current = timestamp;
      
      // Плавное увеличение времени для генерации данных
      setTime(prevTime => prevTime + elapsed / 1000);
      
      // Обновляем позицию линии развертки
      const canvas = canvasRef.current;
      if (canvas) {
        const containerWidth = canvas.clientWidth || width || 400;
        updateSweepLine(containerWidth);
      }
      
      // Отрисовка
      drawWaveform();
      
      // Адаптивная настройка FPS каждые 5 секунд
      if (timestamp - lastPerformanceUpdateRef.current > 5000) {
        // Можно добавить логику для адаптации частоты обновления
        // на основе производительности устройства
        lastPerformanceUpdateRef.current = timestamp;
      }
      
      // Продолжаем анимацию
      animationRef.current = requestAnimationFrame(updateAndDraw);
    };
    
    // Инициализация или остановка анимации
    if (isOperating) {
      animationRef.current = requestAnimationFrame(updateAndDraw);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      drawStaticLine();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isOperating, vitalSigns, drawWaveform, drawStaticLine, updateSweepLine, width]);
  
  // Обработка изменения размера canvas и window resize
  useEffect(() => {
    // Обновляем размеры при изменении пропсов width или height
    updateCanvasSize();
    
    // Добавляем слушатель изменения размера окна
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [width, height, updateCanvasSize]);
  
  // Новый буфер при смене типа графика
  useEffect(() => {
    if (dataBufferRef.current) {
      initializeDataBuffer(dataBufferRef.current.size);
    }
    sweepLineRef.current = 0;
  }, [graphType, initializeDataBuffer]);
  
  return (
    <div className="w-full h-full flex justify-center items-center">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
      />
    </div>
  );
};

export default RealisticWaveforms;