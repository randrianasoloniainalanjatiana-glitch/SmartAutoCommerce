# Guide de configuration de l'API Facebook — SmartAutoCommerce

Ce guide vous accompagne pas à pas dans la configuration de l'intégration Facebook au sein des paramètres de l'application SmartAutoCommerce.

---

## Étape 1 — Configurer Messenger (Token Messenger & Page ID)

### 1.1 Créer une page Facebook
Si ce n'est pas déjà fait, créez une page Facebook professionnelle qui représentera votre activité.

### 1.2 Créer un compte Meta for Developers
Rendez-vous sur [https://developers.facebook.com/](https://developers.facebook.com/) et connectez-vous avec votre compte Facebook.

### 1.3 Créer une application de type Entreprise
1. Depuis le tableau de bord développeur, cliquez sur **Créer une application**.
2. Sélectionnez le type **Entreprise**, puis suivez les instructions pour finaliser la création.

### 1.4 Configurer le produit Messenger
1. Dans votre application, ajoutez le produit **Messenger**.
2. Dans la section **Webhooks**, renseignez les champs suivants :
   - **URL de rappel (Callback URL)** : `https://n8n.projets-omega.net/webhook/messenger2-webhook`
   - **Token de vérification (Verify Token)** : `Botmessenger`
3. Validez et souscrivez aux événements nécessaires.

### 1.5 Générer le Token Messenger et récupérer le Page ID
1. Dans la section **Génération de token d'accès**, sélectionnez votre page Facebook.
2. Cochez **uniquement** la permission `messages`.
3. Générez le token, copiez-le et collez-le dans le champ **Token Messenger** des paramètres SmartAutoCommerce.
4. Sous le nom de votre page, un **identifiant numérique (Page ID)** est affiché. Copiez-le et collez-le dans le champ **Page ID**.

---

## Étape 2 — Obtenir le Token des Publications (Posts Token)

### 2.1 Générer un token via l'Explorateur de l'API Graph
1. Accédez à l'[Explorateur de l'API Graph](https://developers.facebook.com/tools/explorer/).
2. Dans le champ **Application Meta**, sélectionnez votre application.
3. Dans le champ **Utilisateur ou Page**, choisissez votre page Facebook.
4. Ajoutez les permissions suivantes dans le champ **Autorisations** :
   - `pages_show_list`
   - `business_management`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `pages_manage_posts`
   - `pages_manage_engagement`
5. Cliquez sur **Générer un token d'accès** et copiez le token obtenu.

### 2.2 Étendre la durée de vie du token
1. Accédez au [Débogueur de tokens d'accès](https://developers.facebook.com/tools/debug/accesstoken/).
2. Collez le token généré à l'étape précédente, puis cliquez sur **Déboguer**.
3. Faites défiler la page jusqu'en bas et cliquez sur **Étendre le token d'accès**.
4. Un nouveau token à longue durée de vie est généré. Copiez-le.
5. Collez ce token dans le champ **Posts Token** des paramètres SmartAutoCommerce.

---

## Étape 3 — Finaliser les paramètres de l'application

### 3.1 Configurer les URLs légales
1. Depuis le tableau de bord développeur, accédez à **Mes applications** et sélectionnez votre application.
2. Allez dans **Paramètres > Général**.
3. Renseignez l'URL suivante dans les deux champs ci-dessous :
   - **URL de la Politique de confidentialité**
   - **URL de Suppression des données utilisateur**

   > `https://www.termsfeed.com/live/47ff1e7d-baad-49c8-8f7c-98c879fc78d5`

4. Cliquez sur **Enregistrer les modifications**.

### 3.2 Passer l'application en mode Live
1. Toujours dans les paramètres de votre application, repérez le bouton de basculement **Mode de l'application**.
2. Passez le mode de **Développement** à **Live** afin de rendre l'intégration opérationnelle.

---

> **Astuce :** Si vous rencontrez une erreur de permission lors de la génération du token des publications, vérifiez que votre compte est bien administrateur de la page Facebook concernée.
