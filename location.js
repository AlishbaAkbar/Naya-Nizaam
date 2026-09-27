(() => {
  const LOCATION_OPTIONS = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
  };

  function getLocationErrorMessage(error) {
    if (error.code === error.PERMISSION_DENIED) {
      return 'Location permission was denied. Allow location access in your browser settings and try again.';
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return 'Your device could not determine its location. Check that location services are enabled and try again.';
    }
    if (error.code === error.TIMEOUT) {
      return 'Finding your location took too long. Please try again.';
    }
    return 'Could not get your current location. Please try again.';
  }

  function requestLocation(button) {
    const status = button.nextElementSibling;
    const mapLabel = button.closest('.location-box, .loc-box')?.querySelector('.loc-label, .lloc');
    if (!status) {
      console.error('Live location status element is missing.');
      return;
    }

    if (!window.isSecureContext) {
      status.textContent = 'Location access requires HTTPS or localhost.';
      return;
    }

    if (!navigator.geolocation) {
      status.textContent = 'Location is not available in this browser or device.';
      return;
    }

    button.disabled = true;
    status.textContent = 'Requesting location permission…';
    if (mapLabel) mapLabel.textContent = 'Locating device…';
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date(position.timestamp).toLocaleString();
        status.textContent = `Current GPS location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)} m) • ${timestamp}`;
        if (mapLabel) mapLabel.textContent = 'GPS fix captured';
        button.disabled = false;
      },
      error => {
        status.textContent = getLocationErrorMessage(error);
        if (mapLabel) mapLabel.textContent = 'GPS location unavailable';
        button.disabled = false;
      },
      LOCATION_OPTIONS,
    );
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('.live-location-button');
    if (button && !button.disabled) requestLocation(button);
  });
})();
