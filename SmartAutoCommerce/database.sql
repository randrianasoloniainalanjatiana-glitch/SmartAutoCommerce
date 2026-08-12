-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reponse_auto boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id_contact text,
  id_utilisateur uuid,
  CONSTRAINT Contacts_pkey PRIMARY KEY (id),
  CONSTRAINT Contacts_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id)
);
CREATE TABLE public.Historique_difference_prix (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  alert_id uuid DEFAULT gen_random_uuid(),
  produit text NOT NULL,
  produit_concurent text,
  CONSTRAINT Historique_difference_prix_pkey PRIMARY KEY (id),
  CONSTRAINT Historique_difference_prix_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alerts(id)
);
CREATE TABLE public.Livreur (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  Nom text NOT NULL,
  prenom text,
  telephone text NOT NULL UNIQUE,
  email text,
  Adresse text,
  date_naissance date NOT NULL,
  CIN text NOT NULL,
  id_utilisateur uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  mot_de_passe text,
  CONSTRAINT Livreur_pkey PRIMARY KEY (id),
  CONSTRAINT Livreur_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id)
);
CREATE TABLE public.abonnements_utilisateurs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_utilisateur uuid NOT NULL UNIQUE,
  type_plan text NOT NULL CHECK (type_plan = ANY (ARRAY['essai_gratuit'::text, 'mensuel'::text, 'annuel'::text])),
  statut text NOT NULL CHECK (statut = ANY (ARRAY['actif'::text, 'expire'::text, 'annule'::text])),
  essai_utilise boolean DEFAULT false,
  debut_essai timestamp with time zone,
  fin_essai timestamp with time zone,
  debut_periode_actuelle timestamp with time zone,
  fin_periode_actuelle timestamp with time zone,
  cree_le timestamp with time zone DEFAULT now(),
  mis_a_jour_le timestamp with time zone DEFAULT now(),
  CONSTRAINT abonnements_utilisateurs_pkey PRIMARY KEY (id),
  CONSTRAINT abonnements_utilisateurs_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id)
);
CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT alerts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.boutiques (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_utilisateur uuid NOT NULL,
  nom_boutique text,
  description_boutique text,
  secteur_activite text,
  type_entreprise text,
  pays text,
  ville text,
  adresse text,
  telephone text,
  whatsapp text,
  email text,
  site_web text,
  debut_jours text,
  fin_jours text,
  heure text,
  livraison text,
  zones_livraison text,
  frais_livraison text,
  devise text,
  page_access_token text,
  page_id text,
  posts_token text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  messenger_id text,
  type_produit text,
  start_urls jsonb,
  CONSTRAINT boutiques_pkey PRIMARY KEY (id),
  CONSTRAINT boutiques_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id)
);
CREATE TABLE public.client (
  res_id text NOT NULL,
  nom text NOT NULL,
  adresse text,
  telephone text,
  created_at timestamp with time zone DEFAULT now(),
  id_utilisateur uuid,
  CONSTRAINT client_pkey PRIMARY KEY (res_id),
  CONSTRAINT client_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id)
);
CREATE TABLE public.commande_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text,
  metadata jsonb,
  embedding USER-DEFINED,
  CONSTRAINT commande_embeddings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.commandes (
  id integer NOT NULL DEFAULT nextval('commandes_id_seq'::regclass),
  id_client text,
  montant_total numeric,
  statut_livraison text DEFAULT 'en_attente'::text,
  statut_paiement text DEFAULT 'non_paye'::text,
  num_facture text,
  created_at timestamp without time zone DEFAULT now(),
  id_utilisateur uuid,
  id_livreur uuid,
  CONSTRAINT commandes_pkey PRIMARY KEY (id),
  CONSTRAINT commandes_id_client_fkey FOREIGN KEY (id_client) REFERENCES public.client(res_id),
  CONSTRAINT commandes_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id),
  CONSTRAINT commandes_id_livreur_fkey FOREIGN KEY (id_livreur) REFERENCES public.Livreur(id)
);
CREATE TABLE public.competitor_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  competitor_name text NOT NULL,
  competitor_product_name text,
  competitor_price numeric,
  url_source text,
  scraped_at timestamp with time zone DEFAULT now(),
  CONSTRAINT competitor_data_pkey PRIMARY KEY (id),
  CONSTRAINT competitor_data_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  Message_id text,
  platform text,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  id_sender text,
  page_id text,
  id_receiver text,
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.details_commandes (
  id integer NOT NULL DEFAULT nextval('details_commandes_id_seq'::regclass),
  id_commande integer,
  id_produit uuid,
  quantite_acheter integer NOT NULL,
  prix_unitaire numeric,
  CONSTRAINT details_commandes_pkey PRIMARY KEY (id),
  CONSTRAINT details_commandes_id_commande_fkey FOREIGN KEY (id_commande) REFERENCES public.commandes(id),
  CONSTRAINT details_commandes_id_produit_fkey FOREIGN KEY (id_produit) REFERENCES public.products(id)
);
CREATE TABLE public.historique_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_utilisateur uuid NOT NULL,
  id_commande_paypal text NOT NULL,
  montant numeric NOT NULL,
  devise text NOT NULL DEFAULT 'USD'::text,
  type_plan text NOT NULL CHECK (type_plan = ANY (ARRAY['mensuel'::text, 'annuel'::text])),
  statut text NOT NULL,
  cree_le timestamp with time zone DEFAULT now(),
  CONSTRAINT historique_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT historique_transactions_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id)
);
CREATE TABLE public.product_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text,
  metadata jsonb,
  embedding USER-DEFINED,
  CONSTRAINT product_embeddings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  stock_quantity integer DEFAULT 0,
  image_urls text,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_published boolean DEFAULT false,
  id_utilisateur uuid,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateurs(id)
);
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  conversation_id uuid,
  customer_name text,
  delivery_location text,
  payment_method text,
  total_amount numeric,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT sales_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.social_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  platform text NOT NULL,
  status text DEFAULT 'pending'::text,
  post_url text,
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone,
  CONSTRAINT social_posts_pkey PRIMARY KEY (id),
  CONSTRAINT social_posts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.utilisateurs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  mot_de_passe text NOT NULL,
  nom text,
  prenom text,
  telephone text,
  adresse text,
  created_at timestamp with time zone DEFAULT now(),
  update_at timestamp with time zone DEFAULT now(),
  email_verifie boolean DEFAULT false,
  code_confirmation text DEFAULT NULL::bpchar,
  code_expire_le timestamp with time zone,
  code_envoye_le timestamp with time zone,
  tentatives_code integer DEFAULT 0,
  code_type text CHECK (code_type = ANY (ARRAY['inscription'::text, 'reset'::text])),
  CONSTRAINT utilisateurs_pkey PRIMARY KEY (id)
);