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
  let qrDialog;
  let qrVideo;
  let qrStatus;
  let qrPicker;
  let qrStream;
  let qrDetector;
  let qrCallback;
  let qrRequest = 0;
  let qrFrame;
  let qrCanvas;
  let qrContext;

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

  function stopQrCamera() {
    qrRequest += 1;
    if (qrFrame) {
      cancelAnimationFrame(qrFrame);
      qrFrame = null;
    }
    if (qrStream) {
      qrStream.getTracks().forEach(track => track.stop());
      qrStream = null;
    }
    if (qrVideo) qrVideo.srcObject = null;
  }

  function ensureQrDialog() {
    if (qrDialog) return;

    qrDialog = document.createElement('dialog');
    qrDialog.className = 'camera-dialog qr-camera-dialog';
    qrDialog.setAttribute('aria-labelledby', 'qrCameraTitle');
    qrDialog.innerHTML = `
      <div class="camera-dialog-content">
        <div class="camera-dialog-header">
          <h2 id="qrCameraTitle">Scan a hotspot QR code</h2>
          <button type="button" class="camera-close" aria-label="Close QR scanner">×</button>
        </div>
        <video class="camera-preview qr-camera-preview" autoplay muted playsinline></video>
        <p class="camera-status qr-camera-status" role="status">Allow camera access to scan a hotspot QR code.</p>
        <div class="camera-actions">
          <button type="button" class="camera-picker">Choose QR image</button>
        </div>
      </div>`;

    qrVideo = qrDialog.querySelector('.qr-camera-preview');
    qrStatus = qrDialog.querySelector('.qr-camera-status');
    qrCanvas = document.createElement('canvas');
    qrPicker = document.createElement('input');
    qrPicker.type = 'file';
    qrPicker.accept = 'image/*';
    qrPicker.hidden = true;
    document.body.append(qrDialog, qrPicker);

    qrDialog.querySelector('.camera-close').addEventListener('click', () => qrDialog.close());
    qrDialog.addEventListener('close', stopQrCamera);
    qrDialog.querySelector('.camera-picker').addEventListener('click', () => {
      stopQrCamera();
      qrPicker.click();
    });
    qrPicker.addEventListener('change', async () => {
      const [file] = qrPicker.files || [];
      qrPicker.value = '';
      if (file) await scanQrImage(file);
    });
  }

  function scanQrValue(value) {
    const scannedValue = value.trim();
    if (!scannedValue) return;
    const callback = qrCallback;
    qrCallback = null;
    if (qrDialog.open) qrDialog.close();
    if (callback) callback(scannedValue);
  }

  async function scanQrImage(file) {
    if (typeof window.jsQR !== 'function') {
      qrStatus.textContent = 'Image QR scanning is unavailable. Allow camera access to scan live.';
      return;
    }

    qrStatus.textContent = 'Checking the selected image for a QR code…';
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Could not read the selected image.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = window.jsQR(image.data, image.width, image.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (result) {
        scanQrValue(result.data);
      } else {
        qrStatus.textContent = 'No QR code found in that image. Try another image or scan with the camera.';
      }
    } catch (error) {
      qrStatus.textContent = error.message || 'Could not read the selected image. Try another one.';
    } finally {
      if (bitmap) bitmap.close();
    }
  }

  function decodeVideoFrame(request) {
    if (request !== qrRequest || !qrDialog.open || !qrVideo.videoWidth) return;

    try {
      if (qrDetector) {
        qrDetector.detect(qrVideo).then(results => {
          if (request !== qrRequest || !qrDialog.open) return;
          if (results.length) {
            scanQrValue(results[0].rawValue);
            return;
          }
          qrFrame = requestAnimationFrame(() => decodeVideoFrame(request));
        }).catch(error => {
          if (request !== qrRequest || !qrDialog.open) return;
          stopQrCamera();
          qrStatus.textContent = error.message || 'Could not scan the camera image. Try choosing a QR image instead.';
        });
        return;
      }

      if (typeof window.jsQR === 'function') {
        const scale = Math.min(1, 960 / Math.max(qrVideo.videoWidth, qrVideo.videoHeight));
        qrCanvas.width = Math.max(1, Math.round(qrVideo.videoWidth * scale));
        qrCanvas.height = Math.max(1, Math.round(qrVideo.videoHeight * scale));
        qrContext = qrCanvas.getContext('2d', { willReadFrequently: true });
        if (!qrContext) throw new Error('Could not read the camera image.');
        qrContext.drawImage(qrVideo, 0, 0, qrCanvas.width, qrCanvas.height);
        const image = qrContext.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
        const result = window.jsQR(image.data, image.width, image.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (result) {
          scanQrValue(result.data);
          return;
        }
      } else {
        stopQrCamera();
        qrStatus.textContent = 'Live scanning is not supported in this browser. Choose an image of the QR code instead.';
        return;
      }

      qrFrame = requestAnimationFrame(() => decodeVideoFrame(request));
    } catch (error) {
      stopQrCamera();
      qrStatus.textContent = error.message || 'Could not scan the camera image. Try choosing a QR image instead.';
    }
  }

  async function startQrCamera() {
    if (!window.isSecureContext) {
      qrStatus.textContent = 'Camera access requires HTTPS or localhost. Choose an image of the QR code instead.';
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      qrStatus.textContent = 'Camera access is unavailable in this browser. Choose an image of the QR code instead.';
      return;
    }

    const request = ++qrRequest;
    qrStatus.textContent = 'Allow camera access when your browser asks.';
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      if (request !== qrRequest || !qrDialog.open) {
        cameraStream.getTracks().forEach(track => track.stop());
        return;
      }

      qrStream = cameraStream;
      qrVideo.srcObject = qrStream;
      await qrVideo.play();
      qrDetector = null;
      if ('BarcodeDetector' in window) {
        try {
          qrDetector = new BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          qrDetector = null;
        }
      }
      qrStatus.textContent = 'Point the camera at the hotspot QR code.';
      qrFrame = requestAnimationFrame(() => decodeVideoFrame(request));
    } catch (error) {
      if (request !== qrRequest || !qrDialog.open) return;
      stopQrCamera();
      qrStatus.textContent = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
        ? 'Camera permission was denied. Allow it in browser settings, or choose an image of the QR code.'
        : 'Could not open the camera. Check it is available, or choose an image of the QR code.';
    }
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

  window.openQrScanner = callback => {
    ensureQrDialog();
    qrCallback = callback;
    qrDialog.showModal();
    startQrCamera();
  };

  window.closeQrScanner = () => {
    qrCallback = null;
    if (qrDialog && qrDialog.open) qrDialog.close();
    else stopQrCamera();
  };
})();
