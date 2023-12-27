const { ipcRenderer } = require('electron');

let isDeviceFound = false;
let alertAmplitude, title, message, selectedAudioDevice = null;

document.addEventListener('DOMContentLoaded', async () => {

  getSavedInfo();
  getAudioInputs();

  ipcRenderer.on('change-audio-device', async (event, deviceId) => {
    selectedAudioDevice = deviceId;
    localStorage.setItem('selectedAudioDevice', selectedAudioDevice);
    getAudioInputs();
    startVoiceDetection();
  })

  window.sendNotification = (isTesting) => {
    ipcRenderer.send('loud-sound-detected', {title, message, isTesting});
  }

  await navigator.mediaDevices.addEventListener('devicechange', () => {
    getAudioInputs();
  });

});

async function getAudioInputs() {
  const subMenus = [];
  await navigator.mediaDevices.enumerateDevices().then((devices) => {
    if (selectedAudioDevice && devices && devices.length > 0) {
      const selectedDeviceExists = devices.find(x => x.deviceId === selectedAudioDevice)

      if (!selectedDeviceExists) {
        selectedAudioDevice = null;
      }
    }

    if (!selectedAudioDevice && devices && devices.length > 0) {
      selectedAudioDevice = devices[0].deviceId
      localStorage.setItem('selectedAudioDevice', selectedAudioDevice);
    }

    if (devices && devices.length > 0) {
      isDeviceFound = true;
      devices.forEach(async (device) => {
        if (device.kind === 'audioinput') {
          subMenus.push({
            label: device.label,
            id: device.deviceId,
            isSelected: device.deviceId === selectedAudioDevice
          });
        }
      });
    } else {
      isDeviceFound = false;
    }
  });

  ipcRenderer.send('audio-devices-detected', subMenus);
  startVoiceDetection();
}

async function startVoiceDetection() {
  if (isDeviceFound) {
    // Initialize the audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Get user media (microphone input)
    await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedAudioDevice } })
    .then((stream) => {
      
      // Connect the microphone stream to the audio context
      const source = audioContext.createMediaStreamSource(stream);
  
      // Create a ScriptProcessorNode to process the audio data
      const scriptNode = audioContext.createScriptProcessor(2048, 1, 1);
  
      // Connect the nodes
      source.connect(scriptNode);
      scriptNode.connect(audioContext.destination);
  
      // Define the onaudioprocess event handler
      scriptNode.onaudioprocess = (event) => {
  
        const inputData = event.inputBuffer.getChannelData(0);
  
        // Calculate the average amplitude of the audio data
        const amplitude = calculateAmplitude(inputData);
  
        // Check if the sound is loud based on your threshold
        const alert = alertAmplitude ? alertAmplitude : 0.4;
        const isLoud = amplitude > alert; // Adjust the threshold as needed

        const curAmplitudeRef = document.getElementById('curAmplitude');
        curAmplitudeRef.value = amplitude;
  
        // Log the amplitude and whether the sound is loud
        if (isLoud) {
          sendNotification(false);
        }
      };
    })
    .catch((error) => console.error('Error accessing microphone:', error));
  }
}

function calculateAmplitude(data) {
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += Math.abs(data[i]);
  }

  // Calculate the average amplitude
  const averageAmplitude = sum / data.length;

  return averageAmplitude;
}

function saveNotificationSettings() {
  const titleRef = document.getElementById('title');
  const titleErrorRef = document.getElementById('titleError');
  const messageRef = document.getElementById('message');
  const messageErrorRef = document.getElementById('messageError');

  if (!titleRef.value.trim()) {
    titleErrorRef.classList.add('block')
    titleErrorRef.classList.remove('hidden')
  } else {
    titleErrorRef.classList.add('hidden');
    titleErrorRef.classList.remove('block');
    title = titleRef.value;
    localStorage.setItem('title', title);
  }

  if (!messageRef.value.trim()) {
    messageErrorRef.classList.add('block')
    messageErrorRef.classList.remove('hidden')
  } else {
    messageErrorRef.classList.add('hidden');
    messageErrorRef.classList.remove('block');
    message = messageRef.value;
    localStorage.setItem('message', message);
  }

  if (titleRef.value.trim() && messageRef.value.trim()) {
    ipcRenderer.send('notification-setting-save');
  }
}

function getSavedInfo() {
  // get information from local storage.
  selectedAudioDevice = localStorage.getItem('selectedAudioDevice');
  title = localStorage.getItem('title');
  message = localStorage.getItem('message');
  alertAmplitude = localStorage.getItem('alertAmplitude');

  // set default saved information to inputs
  const titleRef = document.getElementById('title');
  const messageRef = document.getElementById('message');
  titleRef.value = title;
  messageRef.value = message;

  // hide errors
  const titleErrorRef = document.getElementById('titleError');
  const messageErrorRef = document.getElementById('messageError');

  titleErrorRef.classList.add('hidden');
  titleErrorRef.classList.remove('block');

  messageErrorRef.classList.add('hidden');
  messageErrorRef.classList.remove('block');

  // set default alert amplitude or update
  const amplitudeRef = document.getElementById('amplitude');

  const alert = localStorage.getItem('amplitude');
  if (alert) {
    alertAmplitude = Number(alert);
    amplitudeRef.value = alertAmplitude;
  } else {
    localStorage.setItem('amplitude', 0.4);
  }
}

function changeAlertAmplitude() {
  const amplitudeRef = document.getElementById('amplitude');

  alertAmplitude = Number(amplitudeRef.value);
  localStorage.setItem('amplitude', alertAmplitude);
}

function clearTexts() {
  title = null;
  message = null;

  document.getElementById('title').value = "";
  document.getElementById('message').value = "";

  localStorage.removeItem('title');
  localStorage.removeItem('message');
}