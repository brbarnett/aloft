self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delayMs } = event.data;
    setTimeout(() => self.registration.showNotification(title, { body }), delayMs);
  }
});
