# 🌞 Energy-Aware Solar Tracker

An interactive 3D web-based solar tracking simulator that compares different solar tracking methods and evaluates their performance based on **solar energy generated, motor energy consumed, and net energy produced**.

The project focuses on an important question:

> **Does tracking the Sun more aggressively always result in more useful energy?**

The simulator compares five tracking strategies:

* **Fixed**
* **Time-Based**
* **LDR**
* **Dual Axis**
* **Adaptive**

The **Adaptive** method attempts to move the solar panel only when the expected energy gained from improved alignment is greater than the energy required by the motor.

---

## 🚀 Live Demo

### Open the project here:

**https://adaptive-solar-tracker--dgboi85.replit.app/**

No installation is required.

Simply open the link in a modern web browser and the simulator will run directly in the browser.

---

## 🎯 Project Features

* Interactive 3D solar panel simulation
* Moving Sun and sunlight visualization
* Multiple solar tracking algorithms
* Fixed panel simulation
* Time-based tracking
* LDR-based tracking
* Dual-axis tracking
* Energy-aware Adaptive tracking
* Adjustable motor power
* Motor energy consumption calculation
* Solar energy calculation
* Net energy calculation
* Adjustable tracking interval
* Adjustable tracking deadband
* Interactive energy graphs
* Algorithm performance comparison
* Real-time simulation results
* Visual comparison of tracking strategies

---

## ⚡ Energy-Aware Adaptive Tracking

The main concept of this project is that a solar tracker should not simply follow the Sun continuously.

Moving the panel requires energy.

Therefore, the Adaptive algorithm evaluates whether moving the panel is actually worthwhile.

The basic concept is:

```text
Net Energy =
Solar Energy Generated
-
Motor Energy Consumed
```

The Adaptive tracker attempts to maximize **net energy**, rather than simply maximizing solar-panel alignment.

---

## 📊 Tracking Methods

### Fixed

The solar panel remains in a fixed position throughout the simulation.

### Time-Based

The panel changes its orientation according to a predefined tracking schedule.

### LDR

The system simulates light-dependent-resistor-based tracking by determining the direction of stronger light.

### Dual Axis

The panel continuously attempts to align itself with the Sun using two-axis movement.

### Adaptive

The proposed strategy considers:

* Sun position
* Panel orientation
* Expected energy gain
* Motor energy cost
* Tracking deadband
* Current solar conditions

The panel moves only when doing so is expected to provide a useful net energy benefit.

---

## 📈 Performance Comparison

The simulator allows the different tracking methods to be compared using:

* Solar Energy Generated
* Motor Energy Consumed
* Net Energy
* Number of Panel Movements
* Tracking Performance
* Energy Gain

The results are displayed through interactive graphs and visual comparisons.

---

## 🖥️ How to Use

1. Open the **Live Demo** link above.
2. Start the simulation.
3. Select one of the available tracking methods.
4. Adjust the simulation parameters if required.
5. Observe the 3D solar panel following the selected strategy.
6. Monitor solar energy and motor energy consumption.
7. Compare the resulting net energy between tracking methods.

No local installation is required for normal use.

---

## 🛠️ Technologies

The project is implemented as a web application using modern web technologies and includes 3D visualization and interactive data visualization.

The source code is available on GitHub:

**https://github.com/Slasher-dgboi85/Adaptive-Solar-Tracker**

---

## 📁 Project Repository

**GitHub:**
https://github.com/Slasher-dgboi85/Adaptive-Solar-Tracker

**Live Website:**
https://adaptive-solar-tracker--dgboi85.replit.app/

---

## ⚠️ Note

This project is a **simulation** designed to demonstrate and compare solar tracking strategies.

The calculated energy values are simulated results and should not be interpreted as direct measurements from a physical solar panel system.
