// Fælles script til hundesiderne: alder og "send din position".

function calculateAge(birthDate) {
    const today = new Date();
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12
        + (today.getMonth() - birthDate.getMonth());

    // Tæl ikke den indeværende måned, før fødselsdagen i måneden er nået
    if (today.getDate() < birthDate.getDate()) {
        months--;
    }

    if (months < 36) {
        return months === 1 ? '1 måned' : `${months} måneder`;
    }

    return `${Math.floor(months / 12)} år`;
}

const ageValue = document.getElementById('age-value');

if (ageValue?.dataset.birthday) {
    const [year, month, day] = ageValue.dataset.birthday.split('-').map(Number);
    ageValue.textContent = calculateAge(new Date(year, month - 1, day));
}

// Sæt finderens position ind i SMS-beskederne
const locationButton = document.getElementById('share-location');
const locationStatus = document.getElementById('location-status');
const smsLinks = document.querySelectorAll('[data-sms-body]');

if (locationButton && 'geolocation' in navigator) {
    locationButton.hidden = false;

    locationButton.addEventListener('click', () => {
        locationStatus.textContent = 'Finder din position…';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const mapLink = `https://maps.google.com/?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`;

                smsLinks.forEach((link) => {
                    const body = `${link.dataset.smsBody} Jeg er her: ${mapLink}`;
                    link.href = `sms:${link.dataset.phone}?&body=${encodeURIComponent(body)}`;
                });

                locationStatus.textContent = 'Din position er sat ind i SMS’en. Tryk på SMS ovenfor.';
            },
            () => {
                locationStatus.textContent = 'Kunne ikke finde din position. Du kan stadig ringe eller sende en SMS.';
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}
