import { planChatTurn, renderGatewayBody } from './chat-client.js';

const form = document.querySelector('#chat-form');
const log = document.querySelector('#chat-log');
const endpointInput = document.querySelector('#chat-endpoint');
const keyInput = document.querySelector('#chat-key');
const messageInput = document.querySelector('#chat-message');

function append(role, text) {
  if (!log) return;
  const item = document.createElement('p');
  item.className = role === 'person' ? 'chat-line chat-person' : 'chat-line chat-eos';
  item.textContent = text;
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

if (form && endpointInput && keyInput && messageInput) {
  form.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-fill]')
      : null;
    if (!button) return;
    messageInput.value = button.getAttribute('data-fill') || '';
    messageInput.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    const apiKey = keyInput.value.trim();
    if (text) append('person', text);
    const plan = planChatTurn({ apiKey, text });
    if (!plan.ok) {
      append('eos', plan.message);
      return;
    }
    const endpoint = endpointInput.value.trim();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(plan.request)
      });
      const body = await response.json();
      append('eos', renderGatewayBody(body).text);
      messageInput.value = '';
    } catch {
      append(
        'eos',
        'No se alcanzó la puerta local. Revisa que node src/mcp-server.js --http esté en marcha. No se reintenta solo.'
      );
    }
  });
}
