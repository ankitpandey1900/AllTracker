/**
 * Handles the 'Performance' chart on the routines page.
 * 
 * We use Chart.js to show how many routines you finish compared 
 * to how many hours you study each day.
 */
import { Chart, registerables } from 'chart.js';
import { appState } from '@/state/app-state';
import { setTxt } from '@/utils/dom.utils';

Chart.register(...registerables);

let performanceChartInstance: Chart | null = null;

export function setupChartFilters(): void {
  const filterSelect = document.getElementById('chartDateFilter') as HTMLSelectElement;
  const customRangeDiv = document.getElementById('customChartRange');
  const applyBtn = document.getElementById('applyChartFilterBtn');

  if (filterSelect && customRangeDiv) {
    filterSelect.addEventListener('change', () => {
      if (filterSelect.value === 'custom') {
        customRangeDiv.style.display = 'flex';
      } else {
        customRangeDiv.style.display = 'none';
        renderPerformanceCurve();
      }
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      renderPerformanceCurve();
    });
  }
}

export function renderPerformanceCurve(): void {
  const canvas = document.getElementById('performanceChart') as HTMLCanvasElement;
  if (!canvas) return;

  const filterSelect = document.getElementById('chartDateFilter') as HTMLSelectElement;
  const startInput = document.getElementById('chartStartDay') as HTMLInputElement;
  const endInput = document.getElementById('chartEndDay') as HTMLInputElement;

  const filterValue = filterSelect ? filterSelect.value : '21';
  
  // Sort trackerData by day/date ascending
  const sortedData = [...appState.trackerData].sort((a, b) => a.day - b.day);

  // Calculate today's day number based on current date vs start date
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startDateObj = new Date(appState.startDate);
  startDateObj.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - startDateObj.getTime();
  const todayDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  let chartData: any[] = [];
  let daysToShow = parseInt(filterValue) || 21;

  if (filterValue === 'custom') {
    const startRange = parseInt(startInput?.value) || 1;
    const endRange = parseInt(endInput?.value) || 999999;
    chartData = sortedData.filter((d: any) => d.day >= startRange && d.day <= endRange);
  } else if (filterValue === 'all') {
    chartData = sortedData;
  } else {
    // Generate full contiguous range ending today
    for (let i = todayDay - (daysToShow - 1); i <= todayDay; i++) {
      const existing = sortedData.find((d: any) => d.day === i);
      if (existing) {
        chartData.push(existing);
      } else {
        const d = new Date(startDateObj);
        d.setDate(d.getDate() + (i - 1));
        chartData.push({
          day: i,
          date: d.toISOString(),
          studyHours: [],
          problemsSolved: 0,
          completed: false
        });
      }
    }
  }

  const labels: string[] = [];
  const routineData: number[] = [];
  const hoursData: number[] = [];

  let activeDays = 0;
  let completedHabits = 0;
  
  chartData.forEach((dayData) => {
    const dateStr = dayData.date.split('T')[0];
    const routineCount = appState.routineHistory[dateStr] || 0;
    if (routineCount > 0) activeDays++;
    completedHabits += routineCount;
    
    // Calculate total hours for this day
    const dayHours = Array.isArray(dayData.studyHours)
      ? dayData.studyHours.reduce((s: number, n: number) => s + (n || 0), 0)
      : 0;

    const dateObj = new Date(dayData.date);
    const dateLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    labels.push(dateLabel);
    routineData.push(routineCount);
    hoursData.push(dayHours);
  });

  const totalPossibleHabits = chartData.length * (appState.routines.length || 1);
  const consistency = totalPossibleHabits > 0 ? Math.round((completedHabits / totalPossibleHabits) * 100) : 0;

  setTxt('habitActiveDays', activeDays);
  setTxt('habitConsistency', `${consistency}%`);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (performanceChartInstance) performanceChartInstance.destroy();

  // Create Gradients
  const routineGradient = ctx.createLinearGradient(0, 0, 0, 400);
  routineGradient.addColorStop(0, 'rgba(108, 135, 255, 0.3)');
  routineGradient.addColorStop(1, 'rgba(108, 135, 255, 0.01)');

  const hoursGradient = ctx.createLinearGradient(0, 0, 0, 400);
  hoursGradient.addColorStop(0, 'rgba(37, 189, 132, 0.2)');
  hoursGradient.addColorStop(1, 'rgba(37, 189, 132, 0.01)');

  performanceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Study Hours',
          data: hoursData,
          borderColor: '#25bd84',
          backgroundColor: hoursGradient,
          borderWidth: 3,
          pointBackgroundColor: '#25bd84',
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
          yAxisID: 'yHours'
        },
        {
          label: 'Routines',
          data: routineData,
          borderColor: '#6c87ff',
          backgroundColor: routineGradient,
          borderWidth: 2,
          borderDash: [5, 5],
          pointBackgroundColor: '#6c87ff',
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.4,
          yAxisID: 'yRoutines'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: '#94a3b8',
            font: { family: 'Outfit', size: 11 },
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(10, 15, 30, 0.95)',
          titleFont: { family: 'Tektur', size: 13 },
          bodyFont: { family: 'Outfit', size: 12 },
          padding: 12,
          borderColor: 'rgba(108, 135, 255, 0.2)',
          borderWidth: 1,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const val = context.parsed.y;
              return `${label}: ${val}${label.includes('Hours') ? 'h' : ' tasks'}`;
            }
          }
        }
      },
      scales: {
        yRoutines: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          suggestedMax: Math.max(...routineData, 5),
          title: { display: true, text: 'Routines', color: '#6c87ff', font: { size: 10, family: 'Tektur' } },
          ticks: { color: '#64748b', stepSize: 1 },
          grid: { color: 'rgba(255, 255, 255, 0.03)' }
        },
        yHours: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          suggestedMax: 10,
          title: { display: true, text: 'Hours', color: '#25bd84', font: { size: 10, family: 'Tektur' } },
          ticks: { color: '#64748b' },
          grid: { display: false }
        },
        x: {
          ticks: { color: '#64748b', font: { size: 10 } },
          grid: { display: false }
        }
      },
      interaction: { intersect: false, mode: 'index' }
    }
  });
}
