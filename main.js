const { app, BrowserWindow, ipcMain, Notification, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let sendNotification = true;
let quitFromTray = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 550,
    center: true,
    icon: path.join(__dirname, 'images/volume.png'),
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false, // Disable window resizing
    minimizable: false, // Disable window minimization
    maximizable: false, // Disable window maximization
  });

  mainWindow.loadFile('index.html');
  // mainWindow.maximize();
  mainWindow.hide();

  Menu.setApplicationMenu(null);

  // Open DevTools when the window is ready
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  mainWindow.on('close', function (event) {
    if (!quitFromTray) {
      // Prevent the default behavior (quitting the application)
      event.preventDefault();
  
      // Hide the window instead
      mainWindow.hide();
    }
  });
}

function createTrayIcon() {
  // Create a system tray icon
  tray = new Tray(path.join(__dirname, 'images/volume.png'));

  // Create context menu for the tray icon
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
      },
    },
    {type: 'separator'},
    {
      label: 'Quit',
      click: () => {
        quitFromTray = true;
        app.quit();
      },
    },
  ]);

  // Set the context menu for the tray icon
  tray.setToolTip('Voice Control');
  tray.setContextMenu(contextMenu);
}

ipcMain.on('audio-devices-detected', (event, devices) => {
  updateContextMenu(devices);
});

ipcMain.on('notification-setting-save', () => {
  showNotification('Notification', 'notification Setting Saved.', true);
  mainWindow.hide();
});

function showNotification(title, message, isTesting) {
  const notification = new Notification({
    title: title || 'Loud Sound Detected',
    body: message || 'Your voice is too loud!',
    icon: path.join(__dirname, 'images/volume.png'),
  });

  if (isTesting || sendNotification) {
    notification.show();
  }
  
  if (!isTesting) {
    sendNotification = false;
    getNotificationUpdate();
  }
}

function getNotificationUpdate() {
  setTimeout(() => {
    sendNotification = true;
  }, 10000)
}

function updateContextMenu(devices) {

  const subMenus = [];

  if (devices.length === 0) {
    subMenus.push({
      label: 'No Device Found',
      type: 'checkbox',
      checked: true,
    });
  } else {
    devices.forEach(device => {
      subMenus.push({
        label: device.label,
        type: 'checkbox',
        checked: device.isSelected,
        click: () => changeAudioDevice(device.id)
      });
    });
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Choose Device',
      submenu: subMenus,
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
      },
    },
    {type: 'separator'},
    {
      label: 'Quit',
      click: () => {
        quitFromTray = true;
        app.quit();
      },
    },
  ]);

  // Set the context menu for the tray icon
  tray.setContextMenu(contextMenu);
}

function changeAudioDevice(deviceId) {
  mainWindow.webContents.send('change-audio-device', deviceId)
}

app.setAppUserModelId('Voice Control');

app.whenReady().then(() => {
  createWindow();
  createTrayIcon();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

ipcMain.on('loud-sound-detected', (event, { title, message, isTesting }) => {
  // Handle loud sound detected event as needed
  showNotification(title, message, isTesting);
});