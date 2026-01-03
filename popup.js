/**
 * Popup Script for Grindr Auto Tap extension
 * Handles UI interactions and settings management
 */

// Get DOM elements
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const saveButton = document.getElementById('saveButton');
const clearLogsButton = document.getElementById('clearLogsButton');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const logsContainer = document.getElementById('logsContainer');

// Settings elements
const loginMethodSelect = document.getElementById('loginMethod');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const autoLoginCheckbox = document.getElementById('autoLogin');
const webhookURLInput = document.getElementById('webhookURL');

// Stats elements
const totalTapsSpan = document.getElementById('totalTaps');
const durationSpan = document.getElementById('duration');

let isRunning = false;
let logsPoller = null;