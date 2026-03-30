import { Chart, registerables } from 'chart.js';
import { appState, getAllHourColumnLabels } from '@/state/app-state';

Chart.register(...registerables);

let studyTrendChartInstance: Chart | null = null;
let subjectRadarChartInstance: Chart | null = null;

export function renderStudyAnalytics(): void {
  renderStudyTrendChart();
  renderSubjectRadarChart();
}

function renderStudyTrendChart(): void {
  const canvas = document.getElementById('studyTrendChart') as HTMLCanvasElement;
  if (!canvas) return;

  // Calculate today's day number based on current date vs start date
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(appState.startDate);
  start.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - start.getTime();
  const todayDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const daysToShow = 21;
  const labels: string[] = [];
  const hoursData: number[] = [];
  const problemsData: number[] = [];

  // Generate a full 21-day window ending at todayDay
  for (let i = todayDay - (daysToShow - 1); i <= todayDay; i++) {
    const dayData = appState.trackerData.find(d => d.day === i);
    
    // Label calculation
    let dateLabel = `Day ${i}`;
    const d = new Date(start);
    d.setDate(d.getDate() + (i - 1));
    dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const dayHours = dayData && Array.isArray(dayData.studyHours) 
      ? dayData.studyHours.reduce((s, n) => s + (n || 0), 0) 
      : 0;

    const dayProblems = dayData ? (dayData.problemsSolved || 0) : 0;

    labels.push(dateLabel);
    hoursData.push(dayHours);
    problemsData.push(dayProblems);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (studyTrendChartInstance) studyTrendChartInstance.destroy();

  const hoursGradient = ctx.createLinearGradient(0, 0, 0, 400);
  hoursGradient.addColorStop(0, 'rgba(108, 135, 255, 0.3)');
  hoursGradient.addColorStop(1, 'rgba(108, 135, 255, 0.01)');

  const problemsGradient = ctx.createLinearGradient(0, 0, 0, 400);
  problemsGradient.addColorStop(0, 'rgba(231, 76, 60, 0.2)');
  problemsGradient.addColorStop(1, 'rgba(231, 76, 60, 0.01)');

  studyTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Study Hours',
          data: hoursData,
          borderColor: '#6c87ff',
          backgroundColor: hoursGradient,
          borderWidth: 3,
          pointBackgroundColor: '#6c87ff',
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
          yAxisID: 'yHours'
        },
        {
          label: 'Problems Solved',
          data: problemsData,
          borderColor: '#e74c3c',
          backgroundColor: problemsGradient,
          borderWidth: 2,
          borderDash: [5, 5],
          pointBackgroundColor: '#e74c3c',
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.4,
          yAxisID: 'yProblems'
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
          displayColors: true
        }
      },
      scales: {
        yHours: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          suggestedMax: 8,
          title: { display: true, text: 'Hours', color: '#6c87ff', font: { size: 10, family: 'Tektur' } },
          ticks: { color: '#64748b' },
          grid: { color: 'rgba(255, 255, 255, 0.03)' }
        },
        yProblems: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          suggestedMax: 5,
          title: { display: true, text: 'Problems', color: '#e74c3c', font: { size: 10, family: 'Tektur' } },
          ticks: { color: '#64748b', stepSize: 1 },
          grid: { display: false }
        },
        x: {
          ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45 },
          grid: { display: false }
        }
      },
      interaction: { intersect: false, mode: 'index' }
    }
  });
}

function renderSubjectRadarChart(): void {
  const canvas = document.getElementById('subjectRadarChart') as HTMLCanvasElement;
  if (!canvas) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(appState.startDate);
  start.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - start.getTime();
  const todayDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const daysToShow = 21;
  const columnLabels = getAllHourColumnLabels(todayDay);
  
  // Initialize totals
  const totals: number[] = new Array(columnLabels.length).fill(0);

  // Accumulate data for the last 21 days ending today
  for (let i = todayDay - (daysToShow - 1); i <= todayDay; i++) {
    const dayData = appState.trackerData.find(d => d.day === i);
    if (dayData && Array.isArray(dayData.studyHours)) {
      dayData.studyHours.forEach((val, idx) => {
        if (totals.length > idx) {
          totals[idx] += (val || 0);
        }
      });
    }
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (subjectRadarChartInstance) subjectRadarChartInstance.destroy();

  subjectRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: columnLabels,
      datasets: [{
        label: 'Total Hours',
        data: totals,
        backgroundColor: 'rgba(37, 189, 132, 0.2)',
        borderColor: '#25bd84',
        borderWidth: 2,
        pointBackgroundColor: '#25bd84',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#25bd84'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 15, 30, 0.95)',
          titleFont: { family: 'Tektur', size: 13 },
          bodyFont: { family: 'Outfit', size: 12 },
          padding: 12,
          borderColor: 'rgba(37, 189, 132, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: (context) => ` ${context.parsed.r.toFixed(1)} hrs`
          }
        }
      },
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: {
            color: '#94a3b8',
            font: { family: 'Tektur', size: 10 }
          },
          ticks: {
            display: false,
            stepSize: Math.max(5, Math.ceil(Math.max(...totals) / 5))
          },
          suggestedMin: 0
        }
      }
    }
  });
}
