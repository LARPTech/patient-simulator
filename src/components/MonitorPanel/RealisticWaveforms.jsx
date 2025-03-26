import React, { useRef, useEffect, useState } from 'react';

// Класс для генерации ЭКГ сигнала
class ECGGenerator {
  constructor(heartRate = 72) {
    // Параметры волны ЭКГ
    this.P = { duration: 0.08, amplitude: 0.15 };
    this.Q = { duration: 0.06, amplitude: 0.05 };
    this.QRS = { duration: 0.08, amplitude: 1.0 };
    this.S = { duration: 0.06, amplitude: 0.2 };
    this.T = { duration: 0.16, amplitude: 0.3 };
    this.ST = { duration: 0.1, amplitude: 0 };
    this.TP = { duration: 0.2, amplitude: 0 };
    
    this.updateHeartRate(heartRate);
  }
  
  // Обновление частоты сердечных сокращений
  updateHeartRate(heartRate) {
    this.heartRate = heartRate;
    this.cycleLength = 60 / this.heartRate; // Длительность цикла в секундах
    
    // Адаптация интервалов на основе ЧСС
    const baselineFactor = 72 / this.heartRate;
    this.PQ = { duration: 0.10 * baselineFactor, amplitude: 0 };
    
    // При высокой ЧСС сокращаем ST и TP интервалы
    if (this.heartRate > 100) {
      this.ST.duration *= 0.8;
      this.TP.duration *= 0.6;
    } else if (this.heartRate < 50) {
      // При низкой ЧСС увеличиваем интервалы
      this.TP.duration *= 1.2;
    }
  }
  
  // Генерация точки сигнала в момент времени t
  getValue(t) {
    // Определяем позицию в цикле
    const position = (t % this.cycleLength) / this.cycleLength;
    
    // Общая длительность всех сегментов
    const totalDuration = this.P.duration + this.PQ.duration + this.Q.duration + 
                          this.QRS.duration + this.S.duration + this.ST.duration + 
                          this.T.duration + this.TP.duration;
    
    // Нормализуем длительности к сумме 1
    const normFactor = 1 / totalDuration;
    const normP = this.P.duration * normFactor;
    const normPQ = this.PQ.duration * normFactor;
    const normQ = this.Q.duration * normFactor;
    const normQRS = this.QRS.duration * normFactor;
    const normS = this.S.duration * normFactor;
    const normST = this.ST.duration * normFactor;
    const normT = this.T.duration * normFactor;
    
    // Определяем текущий сегмент
    if (position < normP) {
      // P волна (положительная полусинусоида)
      return this.P.amplitude * Math.sin(Math.PI * position / normP);
    } else if (position < normP + normPQ) {
      // PQ интервал (изолиния)
      return 0;
    } else if (position < normP + normPQ + normQ) {
      // Q зубец (отрицательная полусинусоида)
      const q_pos = (position - normP - normPQ) / normQ;
      return -this.Q.amplitude * Math.sin(Math.PI * q_pos);
    } else if (position < normP + normPQ + normQ + normQRS) {
      // QRS комплекс (положительная остроконечная волна)
      const qrs_pos = (position - normP - normPQ - normQ) / normQRS;
      return this.QRS.amplitude * Math.sin(Math.PI * qrs_pos);
    } else if (position < normP + normPQ + normQ + normQRS + normS) {
      // S зубец (отрицательная полусинусоида)
      const s_pos = (position - normP - normPQ - normQ - normQRS) / normS;
      return -this.S.amplitude * Math.sin(Math.PI * s_pos);
    } else if (position < normP + normPQ + normQ + normQRS + normS + normST) {
      // ST сегмент (изолиния или небольшое смещение)
      return this.ST.amplitude;
    } else if (position < normP + normPQ + normQ + normQRS + normS + normST + normT) {
      // T волна (положительная полусинусоида)
      const t_pos = (position - normP - normPQ - normQ - normQRS - normS - normST) / normT;
      return this.T.amplitude * Math.sin(Math.PI * t_pos);
    } else {
      // TP интервал (изолиния)
      return 0;
    }
  }
  
  // Генерация массива точек данных для графика
  generateDataPoints(duration, sampleRate) {
    const points = [];
    const numPoints = duration * sampleRate;
    const timeStep = duration / numPoints;
    
    for (let i = 0; i < numPoints; i++) {
      const t = i * timeStep;
      points.push({ t, value: this.getValue(t) });
    }
    
    return points;
  }
}

// Класс для генерации дыхательной кривой
class RespirationGenerator {
  constructor(respirationRate = 14) {
    this.updateRespirationRate(respirationRate);
  }
  
  updateRespirationRate(respirationRate) {
    this.respirationRate = respirationRate;
    this.cycleLength = 60 / this.respirationRate;
    
    // Длительность вдоха и выдоха (вдох обычно короче выдоха)
    this.inspirationRatio = 0.4; // Доля времени на вдох
    this.expirationRatio = 0.6; // Доля времени на выдох
  }
  
  getValue(t) {
    // Определяем позицию в цикле
    const position = (t % this.cycleLength) / this.cycleLength;
    
    if (position < this.inspirationRatio) {
      // Вдох (нарастающая синусоида)
      return Math.sin(Math.PI * position / this.inspirationRatio);
    } else {
      // Выдох (спадающая синусоида)
      const expPosition = (position - this.inspirationRatio) / this.expirationRatio;
      return Math.sin(Math.PI * (1 - expPosition));
    }
  }
  
  generateDataPoints(duration, sampleRate) {
    const points = [];
    const numPoints = duration * sampleRate;
    const timeStep = duration / numPoints;
    
    for (let i = 0; i < numPoints; i++) {
      const t = i * timeStep;
      points.push({ t, value: this.getValue(t) });
    }
    
    return points;
  }
}

// Класс для генерации сигнала SpO2 (плетизмограммы)
class SpO2Generator {
  constructor(heartRate = 72, oxygenSaturation = 98) {
    this.updateParameters(heartRate, oxygenSaturation);
  }
  
  updateParameters(heartRate, oxygenSaturation) {
    this.heartRate = heartRate;
    this.oxygenSaturation = oxygenSaturation;
    this.cycleLength = 60 / this.heartRate;
    
    // Амплитуда зависит от SpO2: ниже SpO2 -> ниже амплитуда
    this.amplitude = 0.5 + (this.oxygenSaturation - 70) / 60;
    this.amplitude = Math.max(0.2, Math.min(1.0, this.amplitude));
    
    // Отношение систолы к диастоле
    this.systolicRatio = 0.3; // Доля времени на систолу
    this.diastolicRatio = 0.7; // Доля времени на диастолу
    
    // При низком SpO2 и высоком HR уменьшается дикротический зубец
    this.dicroticNotchSize = 0.2;
    if (this.oxygenSaturation < 90 || this.heartRate > 100) {
      this.dicroticNotchSize *= 0.5;
    }
  }
  
  getValue(t) {
    // Определяем позицию в цикле
    const position = (t % this.cycleLength) / this.cycleLength;
    
    if (position < this.systolicRatio) {
      // Систола (быстрый подъем)
      return this.amplitude * Math.pow(Math.sin(Math.PI * position / this.systolicRatio / 2), 2);
    } else {
      // Диастола (медленный спуск с дикротическим зубцом)
      const diasPosition = (position - this.systolicRatio) / this.diastolicRatio;
      const baseValue = this.amplitude * (1 - diasPosition) * (1 - diasPosition);
      
      // Добавляем дикротический зубец
      if (diasPosition > 0.3 && diasPosition < 0.5) {
        const notchPos = (diasPosition - 0.3) / 0.2;
        return baseValue + this.dicroticNotchSize * Math.sin(Math.PI * notchPos);
      }
      
      return baseValue;
    }
  }
  
  generateDataPoints(duration, sampleRate) {
    const points = [];
    const numPoints = duration * sampleRate;
    const timeStep = duration / numPoints;
    
    for (let i = 0; i < numPoints; i++) {
      const t = i * timeStep;
      points.push({ t, value: this.getValue(t) });
    }
    
    return points;
  }
}

// Компонент для отображения графика ЭКГ
const ECGWaveform = ({ heartRate = 72, isOperating = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const ecgGenerator = useRef(new ECGGenerator(heartRate));
  const [time, setTime] = useState(0);
  
  // Обновляем генератор при изменении ЧСС
  useEffect(() => {
    if (typeof heartRate === 'number') {
      ecgGenerator.current.updateHeartRate(heartRate);
    }
  }, [heartRate]);
  
  // Эффект для анимации графика
  useEffect(() => {
    if (!canvasRef.current || !isOperating) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Параметры отображения
    const secondsToShow = 6; // Показываем 6 секунд графика
    const sampleRate = 100; // 100 точек на секунду
    const timeStep = 1 / sampleRate;
    
    // Функция анимации
    const animate = () => {
      // Очистка холста
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Отрисовка сетки и временных меток
      drawGrid(ctx, width, height, secondsToShow);
      
      // Если не в режиме работы, не рисуем график
      if (!isOperating) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Отрисовка графика
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Генерируем точки для отображения
      const pointsToShow = sampleRate * secondsToShow;
      const timeWindow = secondsToShow;
      
      for (let i = 0; i < pointsToShow; i++) {
        const t = time - timeWindow + (i / sampleRate);
        const value = ecgGenerator.current.getValue(t);
        
        // Преобразуем в координаты холста
        const x = (i / pointsToShow) * width;
        const y = height / 2 - (value * height / 2) * 0.8; // 80% высоты для амплитуды
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Увеличиваем время
      setTime(prevTime => prevTime + timeStep);
      
      // Продолжаем анимацию
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Запускаем анимацию
    animate();
    
    // Останавливаем анимацию при размонтировании
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasRef, time, isOperating, heartRate]);
  
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between">
        <div className="text-sm text-blue-400">ECG: II</div>
        {!isOperating && <div className="text-sm text-gray-500">DIAGNOSTIC</div>}
      </div>
      <div className="flex-1 mt-1">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          width={600}
          height={150}
        />
      </div>
    </div>
  );
};

// Компонент для отображения графика дыхания
const RespirationWaveform = ({ respirationRate = 14, isOperating = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const respGenerator = useRef(new RespirationGenerator(respirationRate));
  const [time, setTime] = useState(0);
  
  // Обновляем генератор при изменении ЧД
  useEffect(() => {
    if (typeof respirationRate === 'number') {
      respGenerator.current.updateRespirationRate(respirationRate);
    }
  }, [respirationRate]);
  
  // Эффект для анимации графика
  useEffect(() => {
    if (!canvasRef.current || !isOperating) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Параметры отображения
    const secondsToShow = 6; // Показываем 6 секунд графика
    const sampleRate = 50; // 50 точек на секунду для дыхания (медленнее чем ЭКГ)
    const timeStep = 1 / sampleRate;
    
    // Функция анимации
    const animate = () => {
      // Очистка холста
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Отрисовка сетки и временных меток
      drawGrid(ctx, width, height, secondsToShow);
      
      // Если не в режиме работы, не рисуем график
      if (!isOperating) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Отрисовка графика
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Генерируем точки для отображения
      const pointsToShow = sampleRate * secondsToShow;
      const timeWindow = secondsToShow;
      
      for (let i = 0; i < pointsToShow; i++) {
        const t = time - timeWindow + (i / sampleRate);
        const value = respGenerator.current.getValue(t);
        
        // Преобразуем в координаты холста
        const x = (i / pointsToShow) * width;
        const y = height / 2 - (value * height / 2) * 0.8; // 80% высоты для амплитуды
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Увеличиваем время
      setTime(prevTime => prevTime + timeStep);
      
      // Продолжаем анимацию
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Запускаем анимацию
    animate();
    
    // Останавливаем анимацию при размонтировании
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasRef, time, isOperating, respirationRate]);
  
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between">
        <div className="text-sm text-blue-400">RESP</div>
        {!isOperating && <div className="text-sm text-gray-500">DIAGNOSTIC</div>}
      </div>
      <div className="flex-1 mt-1">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          width={600}
          height={150}
        />
      </div>
    </div>
  );
};

// Компонент для отображения графика SpO2
const SpO2Waveform = ({ heartRate = 72, oxygenSaturation = 98, isOperating = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const spo2Generator = useRef(new SpO2Generator(heartRate, oxygenSaturation));
  const [time, setTime] = useState(0);
  
  // Обновляем генератор при изменении параметров
  useEffect(() => {
    if (typeof heartRate === 'number' && typeof oxygenSaturation === 'number') {
      spo2Generator.current.updateParameters(heartRate, oxygenSaturation);
    }
  }, [heartRate, oxygenSaturation]);
  
  // Эффект для анимации графика
  useEffect(() => {
    if (!canvasRef.current || !isOperating) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Параметры отображения
    const secondsToShow = 6; // Показываем 6 секунд графика
    const sampleRate = 60; // 60 точек на секунду
    const timeStep = 1 / sampleRate;
    
    // Функция анимации
    const animate = () => {
      // Очистка холста
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Отрисовка сетки и временных меток
      drawGrid(ctx, width, height, secondsToShow);
      
      // Если не в режиме работы, не рисуем график
      if (!isOperating) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Отрисовка графика
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Генерируем точки для отображения
      const pointsToShow = sampleRate * secondsToShow;
      const timeWindow = secondsToShow;
      
      for (let i = 0; i < pointsToShow; i++) {
        const t = time - timeWindow + (i / sampleRate);
        const value = spo2Generator.current.getValue(t);
        
        // Преобразуем в координаты холста
        const x = (i / pointsToShow) * width;
        const y = height / 2 - (value * height / 2) * 0.8; // 80% высоты для амплитуды
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Увеличиваем время
      setTime(prevTime => prevTime + timeStep);
      
      // Продолжаем анимацию
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Запускаем анимацию
    animate();
    
    // Останавливаем анимацию при размонтировании
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasRef, time, isOperating, heartRate, oxygenSaturation]);
  
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between">
        <div className="text-sm text-blue-400">SpO2</div>
        {!isOperating && <div className="text-sm text-gray-500">DIAGNOSTIC</div>}
      </div>
      <div className="flex-1 mt-1">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          width={600}
          height={150}
        />
      </div>
    </div>
  );
};

// Функция для отрисовки сетки и временных меток
function drawGrid(ctx, width, height, secondsToShow) {
  // Отрисовка сетки
  ctx.strokeStyle = '#333333';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  
  // Вертикальные линии времени
  for (let i = 1; i < secondsToShow; i++) {
    const x = i * (width / secondsToShow);
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    
    // Временные метки
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.fillText(`${i}s`, x - 8, 12);
  }
  
  // Горизонтальные линии сетки
  const hSteps = 4;
  for (let i = 1; i < hSteps; i++) {
    const y = i * (height / hSteps);
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Сброс прозрачности и пунктира
  ctx.globalAlpha = 1.0;
  ctx.setLineDash([]);
}

// Объединенный компонент для отображения всех графиков
const RealisticWaveforms = ({ vitalSigns, isOperating }) => {
  return (
    <div className="grid grid-rows-3 gap-1 h-full">
      <ECGWaveform 
        heartRate={vitalSigns.hr === '--' ? 72 : vitalSigns.hr} 
        isOperating={isOperating} 
      />
      <RespirationWaveform 
        respirationRate={vitalSigns.rr === '--' ? 14 : vitalSigns.rr} 
        isOperating={isOperating} 
      />
      <SpO2Waveform 
        heartRate={vitalSigns.hr === '--' ? 72 : vitalSigns.hr} 
        oxygenSaturation={vitalSigns.spo2 === '--' ? 98 : vitalSigns.spo2} 
        isOperating={isOperating} 
      />
    </div>
  );
};

export default RealisticWaveforms;