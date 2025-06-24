class ElevatorSystem {
    constructor() {
        this.currentFloor = 1;
        this.targetFloor = 1;
        this.isMoving = false;
        this.direction = 'stopped';
        this.queue = [];
        this.floors = 6;
        this.speed = 1000; // milliseconds per floor
        this.isEmergency = false;
        this.isMaintenance = false;
        this.stats = {
            totalTrips: 0,
            totalWaitTime: 0,
            requestCount: 0,
            startTime: Date.now(),
            energyUsage: 0
        };
        this.floorRequests = new Set();
        this.logs = [];
        this.requestTimes = new Map(); // Track when requests were made
        this.currentSpeedFPM = 0; // Current speed in floors per minute

        this.init();
        this.startStatsUpdate();
        this.startSpeedTracking();
    }

    init() {
        this.generateBuilding();
        this.generateFloorButtons();
        this.updateDisplay();
        this.log('System initialized');
    }

    generateBuilding() {
        const building = document.getElementById('building');
        building.innerHTML = '';

        for (let floor = this.floors; floor >= 1; floor--) {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'floor';
            floorDiv.innerHTML = `
                        <div class="floor-number">${floor}</div>
                        <div class="elevator-shaft">
                            ${floor === this.currentFloor ? '<div class="elevator-car">🏢</div>' : ''}
                        </div>
                        <div class="floor-buttons">
                            ${floor < this.floors ? '<button class="floor-btn up-btn" onclick="elevator.callElevator(' + floor + ', \'up\')">↑</button>' : ''}
                            ${floor > 1 ? '<button class="floor-btn down-btn" onclick="elevator.callElevator(' + floor + ', \'down\')">↓</button>' : ''}
                        </div>
                    `;
            building.appendChild(floorDiv);
        }
    }

    generateFloorButtons() {
        const container = document.getElementById('floorButtons');
        container.innerHTML = '';

        for (let floor = 1; floor <= this.floors; floor++) {
            const button = document.createElement('button');
            button.className = 'floor-select-btn';
            button.textContent = floor;
            button.onclick = () => this.requestFloor(floor);
            container.appendChild(button);
        }
    }

    callElevator(floor, direction) {
        if (this.isEmergency) {
            this.log(`Emergency mode: Call from floor ${floor} ignored`);
            return;
        }

        this.log(`Call from floor ${floor} (${direction})`);
        this.addToQueue(floor);
    }

    requestFloor(floor) {
        if (this.isEmergency) {
            this.log(`Emergency mode: Floor ${floor} request ignored`);
            return;
        }

        this.log(`Floor ${floor} requested`);
        this.addToQueue(floor);

        // Visual feedback
        const buttons = document.querySelectorAll('.floor-select-btn');
        buttons[floor - 1].classList.add('selected');
        setTimeout(() => buttons[floor - 1].classList.remove('selected'), 500);
    }

    addToQueue(floor) {
        if (!this.queue.includes(floor) && floor !== this.currentFloor) {
            this.queue.push(floor);
            this.floorRequests.add(floor);
            this.requestTimes.set(floor, Date.now()); // Track request time
            this.stats.requestCount++;
            this.processQueue();
        }
        this.updateDisplay();
    }

    processQueue() {
        if (this.isMoving || this.queue.length === 0 || this.isEmergency || this.isMaintenance) {
            return;
        }

        // Sort queue based on current direction and position
        this.queue.sort((a, b) => {
            if (this.direction === 'up' || this.direction === 'stopped') {
                return a - b;
            } else {
                return b - a;
            }
        });

        const nextFloor = this.queue[0];
        this.moveToFloor(nextFloor);
    }

    moveToFloor(targetFloor) {
        if (this.currentFloor === targetFloor) {
            return;
        }

        this.isMoving = true;
        this.targetFloor = targetFloor;
        this.direction = targetFloor > this.currentFloor ? 'up' : 'down';

        this.log(`Moving ${this.direction} to floor ${targetFloor}`);

        const floorsToMove = Math.abs(targetFloor - this.currentFloor);
        const totalTime = floorsToMove * this.speed;

        // Update energy usage
        this.stats.energyUsage += floorsToMove * 0.5;

        // Animate elevator movement
        this.animateElevator(totalTime);

        setTimeout(() => {
            this.currentFloor = targetFloor;
            this.queue = this.queue.filter(floor => floor !== targetFloor);
            this.floorRequests.delete(targetFloor);

            // Calculate wait time for this request
            if (this.requestTimes.has(targetFloor)) {
                const waitTime = Date.now() - this.requestTimes.get(targetFloor);
                this.stats.totalWaitTime += waitTime;
                this.requestTimes.delete(targetFloor);
            }

            this.isMoving = false;
            this.currentSpeedFPM = 0; // Stop speed tracking
            this.stats.totalTrips++;

            this.log(`Arrived at floor ${targetFloor}`);

            // Brief pause at floor
            setTimeout(() => {
                if (this.queue.length > 0) {
                    this.processQueue();
                } else {
                    this.direction = 'stopped';
                }
                this.updateDisplay();
            }, 1000);

            this.updateDisplay();
        }, totalTime);
    }

    animateElevator(duration) {
        const startFloor = this.currentFloor;
        const endFloor = this.targetFloor;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentPos = startFloor + (endFloor - startFloor) * progress;
            this.updateElevatorPosition(currentPos);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    updateElevatorPosition(floor) {
        const elevatorCars = document.querySelectorAll('.elevator-car');
        elevatorCars.forEach(car => car.remove());

        const floors = document.querySelectorAll('.floor');
        const floorIndex = this.floors - Math.round(floor);

        if (floors[floorIndex]) {
            const shaft = floors[floorIndex].querySelector('.elevator-shaft');
            const car = document.createElement('div');
            car.className = 'elevator-car';
            car.textContent = '🏢';
            shaft.appendChild(car);
        }
    }

    updateDisplay() {
        document.getElementById('currentFloor').textContent = this.currentFloor;
        document.getElementById('elevatorStatus').textContent =
            this.isEmergency ? 'EMERGENCY' :
                this.isMaintenance ? 'MAINTENANCE' :
                    this.isMoving ? 'Moving' : 'Idle';
        document.getElementById('direction').textContent =
            this.direction.charAt(0).toUpperCase() + this.direction.slice(1);
        document.getElementById('queueLength').textContent = this.queue.length;

        // Update current speed display
        document.getElementById('currentSpeed').textContent =
            this.isMoving ? `${this.currentSpeedFPM} floors/min` : '0 floors/min';

        // Calculate and display estimated wait time
        const estimatedWait = this.calculateEstimatedWaitTime();
        document.getElementById('waitTime').textContent = estimatedWait + 's';

        // Update queue display
        const queueList = document.getElementById('queueList');
        queueList.innerHTML = this.queue.length === 0 ?
            '<div style="color: #666; font-style: italic;">No pending requests</div>' :
            this.queue.map((floor, index) => {
                const waitingSince = this.requestTimes.has(floor) ?
                    Math.floor((Date.now() - this.requestTimes.get(floor)) / 1000) : 0;
                return `<div class="queue-item">Floor ${floor} <span style="color: #666; font-size: 12px;">(waiting ${waitingSince}s)</span></div>`;
            }).join('');

        // Update building info
        const buildingInfo = document.getElementById('buildingInfo');
        if (buildingInfo) {
            buildingInfo.innerHTML = `
                    <div style="margin-bottom: 10px;">🏢 Floors: ${this.floors}</div>
                    <div style="margin-bottom: 10px;">⚡ Speed: ${(2000 - this.speed) / 1000}x</div>
                    <div style="margin-bottom: 10px;">🎯 Active Requests: ${this.floorRequests.size}</div>
                    <div style="margin-bottom: 10px;">📊 Total Trips: ${this.stats.totalTrips}</div>
                    <div>🔋 Energy: ${this.stats.energyUsage.toFixed(1)} kW</div>
                    `;
        }


        // Update floor button states
        const floorButtons = document.querySelectorAll('.floor-btn');
        floorButtons.forEach(btn => {
            btn.classList.toggle('active',
                this.floorRequests.has(parseInt(btn.textContent)) ||
                this.queue.includes(parseInt(btn.textContent))
            );
        });
    }

    toggleEmergency() {
        this.isEmergency = !this.isEmergency;
        const emergencyText = document.getElementById('emergencyText');
        const elevatorCar = document.querySelector('.elevator-car');

        if (this.isEmergency) {
            emergencyText.textContent = 'DEACTIVATE EMERGENCY';
            this.queue = [];
            this.floorRequests.clear();
            this.isMoving = false;
            this.direction = 'stopped';
            if (elevatorCar) elevatorCar.classList.add('emergency-mode');
            this.log('EMERGENCY MODE ACTIVATED');
        } else {
            emergencyText.textContent = 'ACTIVATE EMERGENCY';
            if (elevatorCar) elevatorCar.classList.remove('emergency-mode');
            this.log('Emergency mode deactivated');
        }

        this.updateDisplay();
    }

    toggleMaintenance() {
        this.isMaintenance = !this.isMaintenance;
        const maintenanceText = document.getElementById('maintenanceText');
        const elevatorCar = document.querySelector('.elevator-car');

        if (this.isMaintenance) {
            maintenanceText.textContent = 'EXIT MAINTENANCE';
            this.queue = [];
            this.floorRequests.clear();
            this.isMoving = false;
            this.direction = 'stopped';
            if (elevatorCar) elevatorCar.classList.add('maintenance-mode');
            this.log('Maintenance mode activated');
        } else {
            maintenanceText.textContent = 'ENTER MAINTENANCE';
            if (elevatorCar) elevatorCar.classList.remove('maintenance-mode');
            this.log('Maintenance mode deactivated');
        }

        this.updateDisplay();
    }

    resetSystem() {
        this.currentFloor = 1;
        this.targetFloor = 1;
        this.isMoving = false;
        this.direction = 'stopped';
        this.queue = [];
        this.floorRequests.clear();
        this.requestTimes.clear(); // Clear request times
        this.currentSpeedFPM = 0;
        this.isEmergency = false;
        this.isMaintenance = false;
        this.stats = {
            totalTrips: 0,
            totalWaitTime: 0,
            requestCount: 0,
            startTime: Date.now(),
            energyUsage: 0
        };

        document.getElementById('emergencyText').textContent = 'ACTIVATE EMERGENCY';
        document.getElementById('maintenanceText').textContent = 'ENTER MAINTENANCE';

        this.generateBuilding();
        this.updateDisplay();
        this.generateFloorButtons();
        this.log('System reset completed');
    }

    updateSpeed(value) {
        this.speed = 3500 - parseInt(value);
        const speedMultiplier = ((3000 - parseInt(value)) / 1000).toFixed(1);
        document.getElementById('speedValue').textContent = speedMultiplier + 'x';
        this.log(`Speed updated to ${speedMultiplier}x`);
    }

    updateFloors(value) {
        const newFloors = parseInt(value);
        if (newFloors >= 5 && newFloors <= 20) {
            this.floors = newFloors;
            this.resetSystem();
            this.log(`Building updated to ${newFloors} floors`);
        }
    }

    startStatsUpdate() {
        setInterval(() => {
            const uptime = Math.floor((Date.now() - this.stats.startTime) / 60000);
            const avgWait = this.stats.requestCount > 0 ?
                Math.floor(this.stats.totalWaitTime / this.stats.requestCount / 1000) : 0;

            document.getElementById('totalTrips').textContent = this.stats.totalTrips;
            document.getElementById('avgWaitTime').textContent = avgWait + 's';
            document.getElementById('systemUptime').textContent = uptime + 'm';
            document.getElementById('energyUsage').textContent = this.stats.energyUsage.toFixed(1) + ' kW';
        }, 1000);
    }

    startSpeedTracking() {
        setInterval(() => {
            if (this.isMoving) {
                // Calculate floors per minute based on current speed setting
                this.currentSpeedFPM = Math.round(60000 / this.speed);
            } else {
                this.currentSpeedFPM = 0;
            }
            this.updateDisplay();
        }, 500); // Update every 500ms for smooth display
    }

    calculateEstimatedWaitTime() {
        if (this.queue.length === 0 || this.isEmergency || this.isMaintenance) {
            return 0;
        }

        let totalTime = 0;
        let currentPos = this.currentFloor;

        // If currently moving, add remaining time to reach target
        if (this.isMoving) {
            const remainingFloors = Math.abs(this.targetFloor - this.currentFloor);
            totalTime += remainingFloors * (this.speed / 1000);
            currentPos = this.targetFloor;
        }

        // Calculate time to serve all requests in queue
        const sortedQueue = [...this.queue].sort((a, b) => {
            if (this.direction === 'up' || this.direction === 'stopped') {
                return a - b;
            } else {
                return b - a;
            }
        });

        for (const floor of sortedQueue) {
            const distance = Math.abs(floor - currentPos);
            totalTime += distance * (this.speed / 1000);
            totalTime += 1; // 1 second stop time per floor
            currentPos = floor;
        }

        return Math.round(totalTime);
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        this.logs.unshift(logEntry);

        if (this.logs.length > 50) {
            this.logs = this.logs.slice(0, 50);
        }

        const logsContainer = document.getElementById('systemLogs');
        if (logsContainer) {
            logsContainer.innerHTML = this.logs.join('<br>');
            logsContainer.scrollTop = 0;
        }
    }
}

// Tab switching functionality
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}

// Initialize elevator system
const elevator = new ElevatorSystem();

// Configuration management
let pendingConfig = {
    speed: 1000,
    floors: 10,
    hasChanges: false
};

function updateSpeedPreview(value) {
    const speedMultiplier = ((3000 - parseInt(value)) / 1000).toFixed(1);
    document.getElementById('speedValue').textContent = speedMultiplier + 'x';

    pendingConfig.speed = 3500 - parseInt(value);
    pendingConfig.hasChanges = true;
    showConfigPreview();
}

function updateFloorsPreview(value) {
    const floors = parseInt(value);
    if (floors >= 5 && floors <= 20) {
        pendingConfig.floors = floors;
        pendingConfig.hasChanges = true;
        showConfigPreview();
    }
}

function showConfigPreview() {
    const preview = document.getElementById('configPreview');
    const applyBtn = document.getElementById('applyConfigBtn');

    if (pendingConfig.hasChanges) {
        const speedMultiplier = ((3500 - pendingConfig.speed) / 1000).toFixed(1);
        preview.innerHTML = `
                    <strong>Pending Changes:</strong><br>
                    • Speed: ${speedMultiplier}x<br>
                    • Floors: ${pendingConfig.floors}<br>
                    <em>Click Apply to confirm changes</em>
                `;
        preview.style.display = 'block';
        applyBtn.style.display = 'block';
    } else {
        preview.style.display = 'none';
        applyBtn.style.display = 'none';
    }
}

function applyConfiguration() {
    if (pendingConfig.hasChanges) {
        // Apply speed change
        elevator.speed = pendingConfig.speed;
        const speedMultiplier = ((3500 - pendingConfig.speed) / 1000).toFixed(1);
        elevator.log(`Speed updated to ${speedMultiplier}x`);

        // Apply floors change if different
        if (pendingConfig.floors !== elevator.floors) {
            elevator.floors = pendingConfig.floors;
            elevator.resetSystem();
            elevator.log(`Building updated to ${pendingConfig.floors} floors`);
        }

        // Reset pending changes
        pendingConfig.hasChanges = false;
        showConfigPreview();

        // Show confirmation
        const preview = document.getElementById('configPreview');
        preview.innerHTML = '<strong style="color: #27ae60;">✅ Configuration applied successfully!</strong>';
        preview.style.display = 'block';

        setTimeout(() => {
            preview.style.display = 'none';
        }, 3000);
    }
}