// Tiny SSE pub/sub. Subscribers are response objects from /api/events.
// publish() serializes an AgentEvent to the SSE wire format.

const subscribers = new Set();

export function subscribe(res) {
  subscribers.add(res);
  return () => subscribers.delete(res);
}

export function publish(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of subscribers) {
    res.write(payload);
  }
}

export function subscriberCount() {
  return subscribers.size;
}
