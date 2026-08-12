import React, { useCallback, useState } from 'react';

const Copyable = ({ value, children, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Cliquer pour copier"
      className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left font-mono text-sm text-cyan-700 underline decoration-dotted underline-offset-2 transition-colors hover:bg-cyan-50 hover:text-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-200 ${className}`}
    >
      {children ?? value}
      {copied && (
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Copié
        </span>
      )}
    </button>
  );
};

const StepHeading = ({ number, title }) => (
  <h2 className="mt-10 text-xl font-bold text-gray-900 dark:text-white">
    Étape {number} — {title}
  </h2>
);

const SubHeading = ({ children }) => (
  <h3 className="mt-6 text-base font-semibold text-gray-800 dark:text-gray-100">{children}</h3>
);

const ConfigurationApiFacebookHelp = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 transition-colors dark:bg-gray-900 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <header className="border-b border-gray-200 px-6 py-6 dark:border-gray-700 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              SmartAutoCommerce
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Guide de configuration de l&apos;API Facebook
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Ce guide vous accompagne pas à pas dans la configuration de l&apos;intégration Facebook au sein des
              paramètres de l&apos;application SmartAutoCommerce.
            </p>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Astuce : cliquez sur un lien ou sur le token pour le copier dans le presse-papiers.
            </p>
          </header>

          <div className="space-y-2 px-6 py-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300 sm:px-8">
            <StepHeading number={1} title="Configurer Messenger (Token Messenger & Page ID)" />

            <SubHeading>1.1 Créer une page Facebook</SubHeading>
            <p>
              Si ce n&apos;est pas déjà fait, créez une page Facebook professionnelle qui représentera votre activité.
            </p>

            <SubHeading>1.2 Créer un compte Meta for Developers</SubHeading>
            <p>
              Rendez-vous sur{' '}
              <Copyable value="https://developers.facebook.com/">https://developers.facebook.com/</Copyable> et
              connectez-vous avec votre compte Facebook.
            </p>

            <SubHeading>1.3 Créer une application de type Entreprise</SubHeading>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Depuis le tableau de bord développeur, cliquez sur <strong>Créer une application</strong>.</li>
              <li>
                Sélectionnez le type <strong>Entreprise</strong>, puis suivez les instructions pour finaliser la
                création.
              </li>
            </ol>

            <SubHeading>1.4 Configurer le produit Messenger</SubHeading>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Dans votre application, ajoutez le produit <strong>Messenger</strong>.
              </li>
              <li>
                Dans la section <strong>Webhooks</strong>, renseignez les champs suivants :
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>
                    <strong>URL de rappel (Callback URL)</strong> :{' '}
                    <Copyable value="https://n8n.projets-omega.net/webhook/messenger2-webhook">
                      https://n8n.projets-omega.net/webhook/messenger2-webhook
                    </Copyable>
                  </li>
                  <li>
                    <strong>Token de vérification (Verify Token)</strong> :{' '}
                    <Copyable value="Botmessenger">Botmessenger</Copyable>
                  </li>
                </ul>
              </li>
              <li>Validez et souscrivez aux événements nécessaires.</li>
            </ol>

            <SubHeading>1.5 Générer le Token Messenger et récupérer le Page ID</SubHeading>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Dans la section <strong>Génération de token d&apos;accès</strong>, sélectionnez votre page Facebook.
              </li>
              <li>
                Cochez <strong>uniquement</strong> la permission <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">messages</code>.
              </li>
              <li>
                Générez le token, copiez-le et collez-le dans le champ <strong>Page Access Token</strong> des
                paramètres SmartAutoCommerce.
              </li>
              <li>
                Sous le nom de votre page, un <strong>identifiant numérique (Page ID)</strong> est affiché. Copiez-le
                et collez-le dans le champ <strong>Messenger ID</strong>.
              </li>
            </ol>

            <StepHeading number={2} title="Obtenir le Token des Publications (Posts Token)" />

            <SubHeading>2.1 Générer un token via l&apos;Explorateur de l&apos;API Graph</SubHeading>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Accédez à l&apos;
                <Copyable value="https://developers.facebook.com/tools/explorer/">
                  Explorateur de l&apos;API Graph
                </Copyable>
                .
              </li>
              <li>
                Dans le champ <strong>Application Meta</strong>, sélectionnez votre application.
              </li>
              <li>
                Dans le champ <strong>Utilisateur ou Page</strong>, choisissez votre page Facebook.
              </li>
              <li>
                Ajoutez les permissions suivantes dans le champ <strong>Autorisations</strong> :
                <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs">
                  <li>pages_show_list</li>
                  <li>business_management</li>
                  <li>pages_read_engagement</li>
                  <li>pages_read_user_content</li>
                  <li>pages_manage_posts</li>
                  <li>pages_manage_engagement</li>
                </ul>
              </li>
              <li>
                Cliquez sur <strong>Générer un token d&apos;accès</strong> et copiez le token obtenu.
              </li>
            </ol>

            <SubHeading>2.2 Étendre la durée de vie du token</SubHeading>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Accédez au{' '}
                <Copyable value="https://developers.facebook.com/tools/debug/accesstoken/">
                  Débogueur de tokens d&apos;accès
                </Copyable>
                .
              </li>
              <li>
                Collez le token généré à l&apos;étape précédente, puis cliquez sur <strong>Déboguer</strong>.
              </li>
              <li>
                Faites défiler la page jusqu&apos;en bas et cliquez sur <strong>Étendre le token d&apos;accès</strong>.
              </li>
              <li>Un nouveau token à longue durée de vie est généré. Copiez-le.</li>
              <li>
                Collez ce token dans le champ <strong>Posts Token</strong> des paramètres SmartAutoCommerce.
              </li>
            </ol>

            <StepHeading number={3} title="Finaliser les paramètres de l'application" />

            <SubHeading>3.1 Configurer les URLs légales</SubHeading>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Depuis le tableau de bord développeur, accédez à <strong>Mes applications</strong> et sélectionnez
                votre application.
              </li>
              <li>
                Allez dans <strong>Paramètres &gt; Général</strong>.
              </li>
              <li>
                Renseignez l&apos;URL suivante dans les deux champs ci-dessous :
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>
                    <strong>URL de la Politique de confidentialité</strong>
                  </li>
                  <li>
                    <strong>URL de Suppression des données utilisateur</strong>
                  </li>
                </ul>
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                  <Copyable value="https://www.termsfeed.com/live/47ff1e7d-baad-49c8-8f7c-98c879fc78d5">
                    https://www.termsfeed.com/live/47ff1e7d-baad-49c8-8f7c-98c879fc78d5
                  </Copyable>
                </div>
              </li>
              <li>
                Cliquez sur <strong>Enregistrer les modifications</strong>.
              </li>
            </ol>

            <SubHeading>3.2 Passer l&apos;application en mode Live</SubHeading>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Toujours dans les paramètres de votre application, repérez le bouton de basculement{' '}
                <strong>Mode de l&apos;application</strong>.
              </li>
              <li>
                Passez le mode de <strong>Développement</strong> à <strong>Live</strong> afin de rendre
                l&apos;intégration opérationnelle.
              </li>
            </ol>

            <blockquote className="mt-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-100">
              <strong>Astuce :</strong> Si vous rencontrez une erreur de permission lors de la génération du token des
              publications, vérifiez que votre compte est bien administrateur de la page Facebook concernée.
            </blockquote>
          </div>
        </article>
      </div>
    </div>
  );
};

export default ConfigurationApiFacebookHelp;
