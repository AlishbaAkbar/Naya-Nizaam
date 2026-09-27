(() => {
  let dialog;
  let video;
  let status;
  let captureButton;
  let pickerButton;
  let picker;
  let stream;
  let photoTarget;
  let onCapture;
  let cameraRequest = 0;

  function stopCamera() {
    cameraRequest += 1;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
  }

  function renderPhoto(file) {
    if (!photoTarget) return;
    const previousUrl = photoTarget.dataset.photoUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const photoUrl = URL.createObjectURL(file);
    photoTarget.dataset.photoUrl = photoUrl;
    photoTarget.innerHTML = '';

    const image = document.createElement('img');
    image.className = 'photo-preview';
    image.src = photoUrl;
    image.alt = 'Selected photo preview';

    const label = document.createElement('div');
    label.className = 'photo-captured-label pu-text pb-txt';
    label.textContent = 'Photo added — tap to retake';

    photoTarget.append(image, label);
    if (onCapture) onCapture(file);
  }

  function ensureDialog() {
    if (dialog) return;

    dialog = document.createElement('dialog');
    dialog.className = 'camera-dialog';
    dialog.setAttribute('aria-labelledby', 'cameraDialogTitle');
    dialog.innerHTML = `
      <div class="camera-dialog-content">
        <div class="camera-dialog-header">
          <h2 id="cameraDialogTitle">Take a photo</h2>
          <button type="button" class="camera-close" aria-label="Close camera">×</button>
        </div>
        <video class="camera-preview" autoplay muted playsinline></video>
        <p class="camera-status" role="status">Allow camera access when your browser asks.</p>
        <div class="camera-actions">
          <button type="button" class="camera-capture">Capture photo</button>
          <button type="button" class="camera-picker">Choose a photo instead</button>
        </div>
      </div>`;

    video = dialog.querySelector('.camera-preview');
    status = dialog.querySelector('.camera-status');
    captureButton = dialog.querySelector('.camera-capture');
    pickerButton = dialog.querySelector('.camera-picker');
    picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.setAttribute('capture', 'environment');
    picker.hidden = true;
    document.body.append(dialog, picker);

    dialog.querySelector('.camera-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', stopCamera);
    pickerButton.addEventListener('click', () => picker.click());
    picker.addEventListener('change', () => {
      const [file] = picker.files || [];
      picker.value = '';
      if (file) renderPhoto(file);
      if (dialog.open) dialog.close();
    });
    captureButton.addEventListener('click', capturePhoto);
  }

  async function startCamera() {
    if (!window.isSecureContext) {
      status.textContent = 'Camera access requires HTTPS or localhost. You can still choose a photo.';
      captureButton.hidden = true;
      pickerButton.hidden = false;
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status.textContent = 'Camera access is not available in this browser. You can still choose a photo.';
      captureButton.hidden = true;
      pickerButton.hidden = false;
      return;
    }

    const request = ++cameraRequest;
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      if (request !== cameraRequest || !dialog.open) {
        cameraStream.getTracks().forEach(track => track.stop());
        return;
      }
      stream = cameraStream;
      video.srcObject = stream;
      await video.play();
      status.textContent = 'Camera is ready. Take a photo when you are ready.';
      captureButton.hidden = false;
      pickerButton.hidden = false;
    } catch (error) {
      if (request !== cameraRequest || !dialog.open) return;
      stopCamera();
      status.textContent = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
        ? 'Camera permission was denied. Allow camera access in browser settings, or choose a photo instead.'
        : 'Could not open the camera. Check that it is available, or choose a photo instead.';
      captureButton.hidden = true;
      pickerButton.hidden = false;
    }
  }

  async function capturePhoto() {
    if (!video.videoWidth || !video.videoHeight) {
      status.textContent = 'Camera is not ready yet. Please wait a moment and try again.';
      return;
    }

    captureButton.disabled = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('The camera image could not be captured.');
      renderPhoto(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      dialog.close();
    } catch (error) {
      status.textContent = error.message || 'The camera image could not be captured.';
    } finally {
      captureButton.disabled = false;
    }
  }

  window.openPhotoCapture = (target, callback) => {
    ensureDialog();
    photoTarget = target;
    onCapture = callback;
    status.textContent = 'Allow camera access when your browser asks.';
    captureButton.hidden = false;
    captureButton.disabled = false;
    pickerButton.hidden = false;
    dialog.showModal();
    startCamera();
  };
})();
