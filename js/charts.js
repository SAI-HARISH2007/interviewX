// Charts Manager - Handles real-time presence tracking chart updates.
// Degrades gracefully (chart disabled, tracking data still collected) if
// Chart.js fails to load.

class ChartsManager {
    constructor() {
        this.chart = null;
        this.presenceData = [];
        this.timestamps = [];
        this.maxDataPoints = InterviewXConfig.interview.maxChartPoints;
        this.initChart();
    }

    initChart() {
        const ctx = document.getElementById('realtimeChart');
        if (!ctx) return;

        if (typeof Chart === 'undefined') {
            console.warn('Chart.js failed to load; the live chart will be disabled.');
            return;
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.timestamps,
                datasets: [{
                    label: 'Visual Presence (%)',
                    data: this.presenceData,
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: 'rgb(102, 126, 234)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 12, weight: 'bold' },
                            color: '#333'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Real-Time Visual Presence',
                        font: { size: 14, weight: 'bold' },
                        color: '#333'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgb(102, 126, 234)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: (context) => 'Presence: ' + context.parsed.y.toFixed(1) + '%'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%',
                            color: '#666',
                            font: { size: 11 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Presence Level',
                            color: '#333',
                            font: { size: 12, weight: 'bold' }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 10,
                            color: '#666',
                            font: { size: 10 }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#333',
                            font: { size: 12, weight: 'bold' }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    addDataPoint(presence, timestamp = null) {
        if (!this.chart) return;

        const time = timestamp || new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        this.presenceData.push(presence);
        this.timestamps.push(time);

        if (this.presenceData.length > this.maxDataPoints) {
            this.presenceData.shift();
            this.timestamps.shift();
        }

        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;

        this.chart.data.labels = this.timestamps;
        this.chart.data.datasets[0].data = this.presenceData;
        this.chart.update('none'); // Fast update without animation
    }

    clearData() {
        this.presenceData = [];
        this.timestamps = [];
        this.updateChart();
    }
}

// Create global charts instance
const chartsManager = new ChartsManager();
