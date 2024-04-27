# TWITCH WEBSOCKET CUSTOM REWARD LISTENER

![exemple](media/compteur.gif)

Ce dépôt contient des exemples utilisant l'API et le websocket (EventSub) de Twitch pour afficher un compteur entre deux
récompenses de points de chaîne dans OBS, en utilisant le système de connexion par appareil sans avoir à utiliser un
serveur web.

L'idée m'est venue d'un spectateur lors d'un stream de [KEMIST_C10H15N](https://www.twitch.tv/kemist_c10h15n), qui
aurait voulu connaître le nombre de "bénédictions" et de "malédictions" reçues lors d'une run sur DARK SOULS 3.

> [!TIP]
> Totalement libre de droits, si cet exemple peut vous être utile dans votre projet. Let's go !

## Préambule

Pour pouvoir utiliser ce projet et garder le contrôle sur vos données, vous devez créer votre propre application. Vous
devrez d'abord [vous connecter en tant que développeur](https://dev.twitch.tv/docs/authentication/register-app/) sur
Twitch et obtenir un `Client ID` pour votre application.  
Une fois connecté dans `Applications` > `Enregistrer votre application`, remplissez les informations comme ci-dessous.

![console](media/twitch-console.png)

- <b>Nom</b> : `nom de ma cool app`
- <b>URL de redirection OAuth</b> : `http://localhost`
    - Pour cette application, nous n'utilisons pas de serveur, mais une URL doit être saisie.
- <b>Catégorie</b> : `Broadcaster Suite`
- <b>Type de client</b> : `Publique`
    - Attention, il n'est plus possible de changer cela après la création de l'application. Si vous ne choisissez pas "
      Publique", comme nous n'utilisons pas de serveur, nous ne pourrons pas actualiser le token fourni par Twitch pour
      effectuer nos requêtes à l'API.

Une fois que vous avez cliqué sur le bouton `Créer`, vous pouvez récupérer votre `Client ID` (Identifiant client) et
passer à la suite.

## Installation et configuration

Téléchargez les sources du projet dans
l'onglet [Releases](https://github.com/Nyrrell/twitch-eventsub-reward/releases/latest).

Dans le fichier `config.js` à la racine du projet, remplissez les champs avec votre configuration pour identifier votre
application auprès de Twitch :

Remplissez au minimum votre `CLIENT_ID`, le `SCOPES` pour lire les récompenses de chaînes, et mettez `INIT` à `true`.

```js
const config = {
  "CLIENT_ID": "0123456789ABCDEF", // l'identifiant client du préambule
  "SCOPES": "channel:read:redemptions", // l'autorisation de lire les points de chaîne 
  "BROADCASTER_USERNAME": "kemist_c10h15n", // l'username Twitch concerné
  "INIT": true, // true pour effectuer l'initialisation de l'application
  "DEBUG": false, // true si vous voulez avoir des informations en cas de problème
  // LES CHAMPS CI-DESSOUS SERONT À REMPLIR APRÈS LA PHASE D'INITIALISATION
  "ACCESS_TOKEN": "", // le token permetant de faire des requetes à l'api Twitch
  "REFRESH_TOKEN": "", // pour obtenir un nouveau ACCESS_TOKEN lorsque le token est expiré
  "DEVICE_CODE": "", // l'identifiant de notre "appareil" pour obtenir notre token
  "BROADCASTER_ID": "", // l'ID Twitch du streamer dont nous récupérons les infos
  "CURSE_REWARD": "", // l'ID de la première récompense à suivre
  "BLESS_REWARD": "", // l'ID de la seconde récompense à suivre
}
```

Avant d'intégrer notre page web dans OBS, il est plus simple de faire la phase d'initialisation dans un navigateur
classique. Ouvrir le fichier `index.html` dans le dossier `src`, toutes les instructions sont affichées dans le
navigateur.

Une fois l'initialisation de l'appareil réussie, vous obtenez votre configuration finale pour mettre à jour votre
fichier `config.js`. Vous pouvez également récupérer votre `BROADCASTER_ID` et la liste des récompenses de chaînes pour
obtenir l'ID de votre `CURSE_REWARD` et de votre `BLESS_REWARD`.

![success](media/init-success.png)

Une fois votre fichier `config.js` mis à jour avec toutes vos informations, il ne reste plus qu'à ajouter dans OBS votre
fichier local `index.html`. L'application se connectera au websocket EventSub de Twitch et recevra les récompenses de
points de chaîne réclamées par les viewers.

> [!WARNING]
> L'application mettra à jour au fur et à mesure son `ACCESS_TOKEN` et `REFRESH_TOKEN` et les enregistrera dans le
> stockage local du navigateur. Ce qui sous-entend qu'à terme, ceux renseignés dans le fichier `config.js` ne seront
> plus utilisés par l'application pour s'authentifier auprès de Twitch.  
> Pas de panique si le `DEVICE_CODE` change entre temps, l'application utilisera à nouveau le contenu du fichier de
> configuration pour mettre à jour celui du stockage local du navigateur.
