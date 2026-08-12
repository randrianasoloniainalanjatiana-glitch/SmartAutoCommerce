import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { DJANGO_API } from "../config/apiConfig";
import { useAuth } from "../contexts/AuthContext";
import intlTelInput from "intl-tel-input";
import "intl-tel-input/build/css/intlTelInput.css";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import countries from "i18n-iso-countries";
import frLocale from "i18n-iso-countries/langs/fr.json";
import { Pencil, Trash2 } from "lucide-react";

countries.registerLocale(frLocale);

const emptyForm = {
  Nom: "",
  prenom: "",
  telephoneE164: "",
  telephoneCountry: "",
  email: "",
  Adresse: "",
  date_naissance: "",
  CIN: "",
  mot_de_passe: "",
};

export default function Livreur() {
  const { user } = useAuth();

  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const phoneInputRef = useRef(null);
  const itiRef = useRef(null);

  const [defaultCountry, setDefaultCountry] = useState("fr");

  const hasLivreurs = useMemo(() => (livreurs?.length || 0) > 0, [livreurs]);

  const normalize = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const guessCountryIso2FromName = (countryName) => {
    const wanted = normalize(countryName);
    if (!wanted) return null;
    const names = countries.getNames("fr", { select: "official" });
    for (const [iso2, frName] of Object.entries(names)) {
      if (normalize(frName) === wanted) return iso2.toLowerCase();
    }
    // fallback contains
    for (const [iso2, frName] of Object.entries(names)) {
      if (normalize(frName).includes(wanted) || wanted.includes(normalize(frName))) return iso2.toLowerCase();
    }
    return null;
  };

  const supportedIso2 = useMemo(
    () => new Set((intlTelInput.getCountryData?.() || []).map((c) => c.iso2)),
    []
  );

  const safePhoneCountry = (iso2) => {
    const c = String(iso2 || "").toLowerCase();
    return supportedIso2.has(c) ? c : "fr";
  };

  const fetchDefaultCountryFromParametres = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`${DJANGO_API}/parametres/${user.id}/`);
      const iso2 = guessCountryIso2FromName(res?.data?.pays);
      if (iso2) setDefaultCountry(safePhoneCountry(iso2));
    } catch {
      // ignore
    }
  };

  const fetchLivreurs = async () => {
    if (!user?.id) {
      setLivreurs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${DJANGO_API}/livreurs/${user.id}/`);
      setLivreurs(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur lors du chargement des livreurs.");
      setLivreurs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaultCountryFromParametres();
    fetchLivreurs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openModalForCreate = () => {
    setEditingId(null);
    setFieldErrors({});
    setError("");
    setForm({
      ...emptyForm,
      telephoneCountry: safePhoneCountry(defaultCountry),
    });
    setIsOpen(true);
  };

  const openModalForEdit = (l) => {
    setEditingId(l?.id || null);
    setFieldErrors({});
    setError("");
    const phone = String(l?.telephone || "");
    const parsed = phone.startsWith("+") ? parsePhoneNumberFromString(phone) : null;
    const parsedCountry = parsed?.country ? String(parsed.country).toLowerCase() : null;
    setForm({
      Nom: l?.Nom || "",
      prenom: l?.prenom || "",
      email: l?.email || "",
      Adresse: l?.Adresse || "",
      date_naissance: l?.date_naissance || "",
      CIN: l?.CIN || "",
      telephoneE164: phone.startsWith("+") ? phone : "",
      telephoneCountry: safePhoneCountry(parsedCountry || defaultCountry),
      mot_de_passe: "",
    });
    setIsOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsOpen(false);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateAll = () => {
    const errs = {};

    if (!form.Nom?.trim()) errs.Nom = "Nom requis.";
    if (!form.CIN?.trim()) errs.CIN = "CIN requis.";
    if (!form.date_naissance) errs.date_naissance = "Date de naissance requise.";

    if (form.email?.trim()) {
      // HTML5 + regex simple (complément)
      const email = form.email.trim();
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
      if (!re.test(email)) errs.email = "Email invalide.";
    }

    // Mot de passe du livreur (optionnel)
    const pwd = form.mot_de_passe?.trim();
    if (pwd && pwd.length < 6) errs.mot_de_passe = "Mot de passe (minimum 6 caractères).";



    // Âge >= 18
    if (form.date_naissance) {
      const dob = new Date(form.date_naissance);
      if (Number.isNaN(dob.getTime())) {
        errs.date_naissance = "Date invalide.";
      } else {
        const now = new Date();
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        if (age < 18) errs.date_naissance = "Le livreur doit avoir au moins 18 ans.";
      }
    }

    const e164 = itiRef.current?.getNumber?.() || form.telephoneE164?.trim();
    if (!e164) {
      errs.telephone = "Téléphone requis.";
    } else if (!itiRef.current?.isValidNumber?.()) {
      errs.telephone = "Numéro de téléphone invalide.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!user?.id) return;
    setError("");
    if (!validateAll()) return;

    setSaving(true);
    try {
      const phoneForPayload = itiRef.current?.getNumber?.() || form.telephoneE164;

      const payload = {
        Nom: form.Nom,
        prenom: form.prenom || null,
        telephone: phoneForPayload,
        email: form.email || null,
        Adresse: form.Adresse || null,
        date_naissance: form.date_naissance,
        CIN: form.CIN,
        mot_de_passe: form.mot_de_passe?.trim() || null,
      };
      if (editingId) {
        const res = await axios.put(
          `${DJANGO_API}/livreurs/${user.id}/${editingId}/`,
          payload
        );
        setLivreurs((prev) => prev.map((x) => (x.id === editingId ? res.data : x)));
      } else {
        const res = await axios.post(`${DJANGO_API}/livreurs/${user.id}/`, payload);
        setLivreurs((prev) => [res.data, ...prev]);
      }
      setIsOpen(false);
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur lors de l'enregistrement (doublon email/téléphone/CIN ?).");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !phoneInputRef.current) return;
    try {
      if (itiRef.current) {
        itiRef.current.destroy();
        itiRef.current = null;
      }
      itiRef.current = intlTelInput(phoneInputRef.current, {
        initialCountry: safePhoneCountry(form.telephoneCountry || defaultCountry),
        preferredCountries: ["fr", "mg", "us", "gb"],
        separateDialCode: true,
        nationalMode: true,
        autoPlaceholder: "aggressive",
        strictMode: false,
        loadUtils: () => import("intl-tel-input/build/js/utils"),
      });

      if (form.telephoneE164) {
        itiRef.current.setNumber(form.telephoneE164);
      }
    } catch (e) {
      console.error("Erreur init intl-tel-input:", e);
    }

    return () => {
      if (itiRef.current) {
        itiRef.current.destroy();
        itiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const remove = async (id) => {
    if (!user?.id || !id) return;
    if (!confirm("Supprimer ce livreur ?")) return;
    try {
      await axios.delete(`${DJANGO_API}/livreurs/${user.id}/${id}/`);
      setLivreurs((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur lors de la suppression.");
    }
  };

  if (loading && !isOpen) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
              LIVREURS
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gérez vos livreurs (plusieurs livreurs par compte).
            </p>
          </div>

          <button
            type="button"
            onClick={openModalForCreate}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-md border border-cyan-400/50 text-cyan-500 hover:text-cyan-600 transition-all duration-300 hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 overflow-hidden"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Nouveau</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-100/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
              className="w-3 h-3 transition-transform duration-500 group-hover:rotate-180"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && !isOpen && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!hasLivreurs ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              Aucun livreur enregistré.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <th className="px-6 py-4">Nom</th>
                    <th className="px-6 py-4">Téléphone</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">CIN</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {livreurs.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {l.Nom} {l.prenom ? <span className="font-medium text-gray-500 dark:text-gray-400">({l.prenom})</span> : null}
                        </div>
                        <div className="text-[11px] text-gray-400 italic">
                          {l.date_naissance || "—"} {l.Adresse ? `• ${l.Adresse}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{l.telephone}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{l.email || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{l.CIN}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openModalForEdit(l)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="Modifier"
                          aria-label="Modifier le livreur"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(l.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          title="Supprimer"
                          aria-label="Supprimer le livreur"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex justify-center items-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
              <h2 className="font-black text-gray-800 dark:text-white uppercase tracking-tight">
                {editingId ? "Modifier le livreur" : "Ajouter un livreur"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
                disabled={saving}
              >
                &times;
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nom *">
                  <input
                    name="Nom"
                    value={form.Nom}
                    onChange={onChange}
                    className={`w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white ${fieldErrors.Nom ? "border-red-400" : ""}`}
                    placeholder="Nom"
                  />
                  {fieldErrors.Nom && <ErrorText>{fieldErrors.Nom}</ErrorText>}
                </Field>
                <Field label="Prénom">
                  <input
                    name="prenom"
                    value={form.prenom}
                    onChange={onChange}
                    className="w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="Prénom"
                  />
                </Field>
                <Field label="Téléphone *">
                  <div className={`rounded-xl border ${fieldErrors.telephone ? "border-red-400" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700 px-3 py-2`}>
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      className="w-full bg-transparent outline-none text-gray-900 dark:text-white"
                      placeholder="Numéro de téléphone"
                    />
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Cliquez sur le drapeau pour choisir un pays. Vous pouvez rechercher le pays dans la liste.
                  </div>
                  {fieldErrors.telephone && <ErrorText>{fieldErrors.telephone}</ErrorText>}
                </Field>
                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    className={`w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white ${fieldErrors.email ? "border-red-400" : ""}`}
                    placeholder="Email"
                  />
                  {fieldErrors.email && <ErrorText>{fieldErrors.email}</ErrorText>}
                </Field>

                <Field label="Date de naissance *">
                  <input
                    name="date_naissance"
                    type="date"
                    value={form.date_naissance}
                    onChange={onChange}
                    className={`w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white ${fieldErrors.date_naissance ? "border-red-400" : ""}`}
                  />
                  {fieldErrors.date_naissance && <ErrorText>{fieldErrors.date_naissance}</ErrorText>}
                </Field>
                <Field label="CIN *">
                  <input
                    name="CIN"
                    value={form.CIN}
                    onChange={onChange}
                    className={`w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white ${fieldErrors.CIN ? "border-red-400" : ""}`}
                    placeholder="CIN"
                  />
                  {fieldErrors.CIN && <ErrorText>{fieldErrors.CIN}</ErrorText>}
                </Field>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Adresse">
                  <input
                    name="Adresse"
                    value={form.Adresse}
                    onChange={onChange}
                    className="w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="Adresse"
                  />
                </Field>
                <Field label="Mot de passe (optionnel)">
                  <input
                    name="mot_de_passe"
                    type="password"
                    value={form.mot_de_passe}
                    onChange={onChange}
                    className={`w-full p-3 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-700 dark:text-white ${fieldErrors.mot_de_passe ? "border-red-400" : ""}`}
                    placeholder="Minimum 6 caractères"
                  />
                  {fieldErrors.mot_de_passe && <ErrorText>{fieldErrors.mot_de_passe}</ErrorText>}
                </Field>
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="w-full py-4 bg-green-600 text-white font-black rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {saving ? "SAUVEGARDE..." : "ENREGISTRER"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
      {children}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
      <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-gray-800 dark:text-white break-words">
        {value || "—"}
      </div>
    </div>
  );
}

function ErrorText({ children }) {
  return <div className="text-[11px] text-red-600 dark:text-red-400 mt-1">{children}</div>;
}

