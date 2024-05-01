const redemption = {
  curse: 0,
  bless: 0,
  total: 0,
  addCurse: () => {
    redemption.curse++;
    redemption.total++;
    document.getElementById("curseCounter").innerHTML = `<span>${redemption.curse}</span>`;
    redemption.updatePoints();
  },
  addBless: () => {
    redemption.bless++;
    redemption.total++;
    document.getElementById("blessCounter").innerHTML = `<span>${redemption.bless}</span>`;
    redemption.updatePoints();
  },
  updatePoints: () => {
    const percentCurse = (redemption.curse / redemption.total) * 100;
    const percentBless = (redemption.bless / redemption.total) * 100;
    document.querySelector(".progressBar").firstElementChild.style.width = percentCurse + "%";
    document.querySelector(".progressBar").lastElementChild.style.width = percentBless + "%";
    document.getElementById("redemption").classList.add("active");
  }
}

const twitch = {
  API: "https://api.twitch.tv/helix",
  OAUTH: "https://id.twitch.tv/oauth2",
  WEBSOCKET: "wss://eventsub.wss.twitch.tv/ws",
  registerDevice: async () => {
    return fetch(`${twitch.OAUTH}/device`, {
      method: 'POST',
      body: new URLSearchParams({
        "client_id": config.CLIENT_ID,
        "scopes": config.SCOPES,
      })
    }).then(handleResponse);
  },
  validateToken: async () => {
    return fetch(`${twitch.OAUTH}/validate`, {
      "headers": {
        "Authorization": `OAuth ${config.ACCESS_TOKEN}`,
      },
    }).then(handleResponse)
      .catch(() => false);
  },
  getToken: async () => {
    return fetch(`${(twitch.OAUTH)}/token`, {
      method: 'POST',
      body: new URLSearchParams({
        'client_id': config.CLIENT_ID,
        'scopes': config.SCOPES,
        'device_code': config.DEVICE_CODE,
        'grant_type': 'urn:ietf:params:oauth:grant-type:device_code'
      })
    }).then(handleResponse);
  },
  refreshToken: async () => {
    return fetch(`${(twitch.OAUTH)}/token`, {
      method: 'POST',
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': config.REFRESH_TOKEN,
        'client_id': config.CLIENT_ID
      })
    }).then(handleResponse)
      .then(saveConfig);
  },
  subscribe: async (sessionId) => {
    return fetch(`${twitch.API}/eventsub/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: "Bearer " + config.ACCESS_TOKEN,
        "Client-Id": config.CLIENT_ID,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "type": "channel.channel_points_custom_reward_redemption.add",
        "version": "1",
        "condition": {
          "broadcaster_user_id": config.BROADCASTER_ID,
        },
        "transport": {
          "method": "websocket",
          "session_id": sessionId
        }
      })
    }).then(handleResponse)
      .then(data => {
        if (data) {
          document.querySelector('.loader').setAttribute('hidden', 'true');
          document.querySelector('#redemption').removeAttribute('hidden');
          if (data.total > 1) {
            return twitch.getSubscription();
          }
        }
      })
  },
  unsubscribe: (id) => {
    return fetch(`${twitch.API}/eventsub/subscriptions?id=${encodeURI(id)}`, {
      method: 'DELETE',
      headers: {
        Authorization: "Bearer " + config.ACCESS_TOKEN,
        "Client-Id": config.CLIENT_ID
      },
    })
  },
  getSubscription: () => {
    return fetch(`${twitch.API}/eventsub/subscriptions`, {
      headers: {
        Authorization: "Bearer " + config.ACCESS_TOKEN,
        "Client-Id": config.CLIENT_ID
      },
    }).then(handleResponse)
      .then(({ data }) => {
        data.forEach(sub => {
          if (sub.status !== 'enabled') {
            return twitch.unsubscribe(sub.id);
          }
        })
      })
  },
  getBroadcasterId: async () => {
    const input = document.getElementById('username').value
    if (!input) return;
    return fetch(`${twitch.API}/users?login=${encodeURI(input)}`, {
      headers: {
        Authorization: "Bearer " + config.ACCESS_TOKEN,
        "Client-Id": config.CLIENT_ID,
      }
    }).then(handleResponse)
      .then(data => {
        config.BROADCASTER_ID = data['data'][0]['id'];
        document.getElementById('twitchId').innerHTML = `Twitch ID : ${data['data'][0]['id']}`;
        document.getElementById('blockCustomReward').removeAttribute('hidden');
      })
  },
  getCustomReward: async () => {
    return fetch(`${twitch.API}/channel_points/custom_rewards?broadcaster_id=${encodeURI(config.BROADCASTER_ID)}`, {
      headers: {
        Authorization: "Bearer " + config.ACCESS_TOKEN,
        "Client-Id": config.CLIENT_ID,
      }
    }).then(handleResponse)
      .then(({ data }) => {
        const dl = document.getElementById('twitchCustomReward');
        dl.replaceChildren();
        data.map(r => {
          const li = document.createElement('li');
          li.innerHTML = `<b>${r['title']} :</b> ${r['id']}`
          dl.appendChild(li);
        })
      })
  }
};

const handleResponse = (response) => {
  return response.text().then(text => {
    const data = text && JSON.parse(text.toString());

    if (response.status === 401 && data?.['message'] === "invalid access token") {
      return twitch.refreshToken();
    }

    if (!response.ok && data?.message !== 'authorization_pending') {
      const error = data?.['message'] || response.statusText;
      return Promise.reject(error);
    }

    return data;
  }).catch(reason => {
    handleError(reason);
    return false;
  });
}

const handleError = (error) => {
  console.log(error);
  const debug = document.querySelector('#log');
  document.querySelector('.loader').classList.add('error');
  debug.innerHTML = `<p>Erreur : ${error}</p>`;
  debug.innerHTML += `<details>
      <summary>CONFIG DU NAVIGATEUR</summary>
      <div><pre class="show">${JSON.stringify(config, null, 2)}</pre></div>
    </details>`;
}

const saveConfig = (payload) => {
  if (!payload['access_token']) {
    return false;
  }

  config.ACCESS_TOKEN = payload['access_token'];
  config.REFRESH_TOKEN = payload['refresh_token'];
  config.INIT = false;
  localStorage.setItem('config', JSON.stringify(config));
  return true;
}

const init = async () => {
  const payload = await twitch.registerDevice();

  if (!payload) {
    return;
  }

  config.DEVICE_CODE = payload['device_code'];

  const divDevice = document.createElement('div');
  divDevice.innerHTML = `<h3>Initialisation de l'appareil en cours...</h3>
    <p>Code de l'appareil : ${payload['user_code']}</p>
    <p>Rends-toi sur <a href="${payload['verification_uri']}" target="_blank">${payload['verification_uri'].split('?')[0]}</a> pour activer l'appareil</p>
  `;
  document.body.appendChild(divDevice)
  window.open(
    payload['verification_uri'],
    "_blank",
    `popup,width=600,height=600,left=${screenLeft + 400},top=${screenTop + 400}`
  );

  console.log('Start polling');
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + payload['expires_in']);

  const poller = setInterval(async () => {
    if (new Date() > expiresAt) {
      clearInterval(poller);
      return;
    }

    const payload = await twitch.getToken();

    if (!saveConfig(payload)) {
      return;
    }

    document.body.removeChild(divDevice)
    const divConfig = document.createElement('div');
    divConfig.innerHTML = `<h3>Initialisation de l'appareil réussi !</h3>
      <p>Ta configuration a sauvegardé (informations sensibles)</p>
      <div><pre id="spoiler">${JSON.stringify(config, null, 2)}</pre></div>
      <div>
        <h3>Besoin de ton id twitch chef ?</h3>
        <label>
          Twitch username :
          <input id='username' value="${config.BROADCASTER_USERNAME || ''}" placeholder="${config.BROADCASTER_USERNAME || ''}">
        </label>
        <button onclick="twitch.getBroadcasterId()">Chercher</button>
        <p id='twitchId'></p>
        <div id="blockCustomReward" ${!config.BROADCASTER_ID && "hidden"}>
          <h3>Besoin de l'id des recompenses de chaine ?</h3>
          <button onclick="twitch.getCustomReward()">Afficher</button>
          <ol id='twitchCustomReward'></ol>
        </div>
      </div>
    `;
    document.body.appendChild(divConfig)
    document.querySelector('.loader').setAttribute('hidden', 'true');
    const spoilerConfig = document.getElementById("spoiler");
    spoilerConfig.addEventListener('click', () => spoilerConfig.classList.add('show'));

    clearInterval(poller);
  }, (payload['interval'] * 1000));
}

const connectSocket = (reconnect) => {
  let ws = new WebSocket(twitch.WEBSOCKET);

  ws.onmessage = ({ data }) => {
    const { metadata: { message_type }, payload } = JSON.parse(data);

    switch (message_type) {
      case "session_keepalive" :
        break;
      case "session_welcome" :
        if (reconnect) {
          break;
        }
        console.log("EventSub subscription")
        return twitch.subscribe(payload['session']['id']);
      case "notification" :
        const { event: { reward } } = payload;
        if (reward['id'] === config.CURSE_REWARD) {
          return redemption.addCurse();
        }
        if (reward['id'] === config.BLESS_REWARD) {
          return redemption.addBless();
        }
        return console.log(payload);
      case "session_reconnect" :
        twitch.WEBSOCKET = payload['session']['reconnect_url'];
        return connectSocket(true);
      default :
        return console.log("message_type :", message_type, "payload :", payload);
    }
  }

  ws.onerror = function (error) {
    handleError(error);
  };

  ws.onclose = function (event) {
    if (event.wasClean) {
      console.log(`Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
      console.log('Connection died');
    }
  };
}

const main = async () => {
  if (config.DEBUG) {
    document.querySelector('.debug').removeAttribute('hidden');
  }

  if (config.INIT) {
    return init();
  }

  const storedConfig = JSON.parse(localStorage.getItem('config'));
  if (storedConfig?.['DEVICE_CODE'] === config.DEVICE_CODE) {
    Object.assign(config, storedConfig);
  }

  if (!await twitch.validateToken()) {
    return document.querySelector('.loader').classList.add('error');
  }
  return connectSocket(false);
}

window.onload = main;
