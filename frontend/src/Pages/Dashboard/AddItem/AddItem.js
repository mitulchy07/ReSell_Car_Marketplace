import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import '../../../styles/resell-sell-car.css';

const API = (
  process.env.REACT_APP_API_URL || 'https://resell-firestore-preview.vercel.app'
).replace(/\/$/, '');
const currency = process.env.REACT_APP_LISTING_CURRENCY || 'USD';
const today = new Date().toISOString().slice(0, 10);
const sections = [
  { title: 'Vehicle details', caption: 'What are you selling?' },
  { title: 'Location & contact', caption: 'Give buyers the details' },
  { title: 'Photos & review', caption: 'Make your listing shine' },
];
const groupedFields = [
  [
    'category',
    'model',
    'price',
    'condition',
    'boughtdate',
    'mileage',
    'transmission',
    'year',
    'fuel',
    'powerKw',
    'powerHp',
    'sellerType',
  ],
  ['location', 'phone', 'description'],
];
function prettyPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'Your asking price';
  try {
    return new Intl.NumberFormat(currency === 'EUR' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(number);
  } catch (_) {
    return String(number);
  }
}
function FormIcon({ name }) {
  const paths = {
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    check: (
      <>
        <path d="m4 12 5 5L20 6" />
      </>
    ),
    car: (
      <>
        <path d="M4 15 7 8h10l3 7M3 15h18v4H3zM6 19v2m12-2v2M7 16h2m6 0h2" />
      </>
    ),
    photo: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m4 18 5-5 3 3 3-4 5 5" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function AddItem() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [previewFile, setPreviewFile] = useState('');
  const [imageBroken, setImageBroken] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
    setError,
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      category: '',
      condition: 'Good',
      boughtdate: today,
      price: '',
      model: '',
      description: '',
      location: '',
      phone: '',
      imageUrl: '',
      mileage: '',
      transmission: 'Manual',
      year: '',
      fuel: 'Diesel',
      powerKw: '',
      powerHp: '',
      sellerType: 'Private',
    },
  });
  const values = watch();
  const brands = useQuery({
    queryKey: ['listing-categories'],
    retry: false,
    staleTime: 30000,
    queryFn: async () => {
      const response = await fetch(`${API}/categories`);
      if (!response.ok) throw new Error('Could not load car brands.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('The category response is invalid.');
      return data;
    },
  });
  const names = useMemo(
    () => [
      ...new Set(
        (brands.data || [])
          .map((c) =>
            String(c.name || c.category || c._id || '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    ],
    [brands.data],
  );
  useEffect(() => {
    if (!uploadFile) {
      setPreviewFile('');
      return undefined;
    }
    const url = URL.createObjectURL(uploadFile);
    setPreviewFile(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadFile]);
  useEffect(() => {
    setImageBroken(false);
  }, [previewFile, values.imageUrl]);
  const previewImage = !imageBroken && (previewFile || values.imageUrl?.trim());

  async function next() {
    setGeneralError('');
    const valid = await trigger(groupedFields[step] || []);
    if (valid && (step !== 0 || names.includes(String(values.category || '').toLowerCase())))
      setStep((current) => Math.min(2, current + 1));
    else if (step === 0 && !names.includes(String(values.category || '').toLowerCase()))
      setError('category', { type: 'validate', message: 'Select an available brand.' });
  }
  function chooseFile(event) {
    const file = event.target.files?.[0] || null;
    setGeneralError('');
    if (!file) {
      setUploadFile(null);
      return;
    }
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setUploadFile(null);
      event.target.value = '';
      setGeneralError('Choose a JPG, PNG or WebP image smaller than 5 MB.');
      return;
    }
    setUploadFile(file);
  }
  async function submitListing(form) {
    setGeneralError('');
    if (!user) {
      setGeneralError('Sign in before publishing a listing.');
      return;
    }
    if (!uploadFile && !/^https:\/\/\S+/i.test(form.imageUrl.trim())) {
      setGeneralError('Add a valid HTTPS image URL, or upload a vehicle photo.');
      return;
    }
    setBusy(true);
    try {
      let image = form.imageUrl.trim();
      if (uploadFile) {
        const apiKey = process.env.REACT_APP_imgbb_key || process.env.REACT_APP_IMGBB_API_KEY;
        if (!apiKey)
          throw new Error(
            'Photo upload is not configured yet. Paste an HTTPS image URL instead, or add REACT_APP_imgbb_key to the frontend .env.local file.',
          );
        const data = new FormData();
        data.append('image', uploadFile);
        const uploaded = await fetch(
          `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
          { method: 'POST', body: data },
        );
        const result = await uploaded.json();
        if (!uploaded.ok || !result.success || !result.data?.url)
          throw new Error('Photo upload failed. Try again or use an image URL.');
        image = result.data.url;
      }
      const token = await user.getIdToken();
      const response = await fetch(`${API}/sell`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model: form.model.trim(),
          category: form.category.toLowerCase(),
          price: String(form.price),
          condition: form.condition,
          boughtdate: form.boughtdate,
          location: form.location.trim(),
          mileage: Number(form.mileage),
          transmission: form.transmission,
          year: form.year.trim(),
          fuel: form.fuel,
          powerKw: Number(form.powerKw),
          powerHp: Number(form.powerHp),
          sellerType: form.sellerType,
          phone: form.phone.trim(),
          description: form.description.trim(),
          image,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.acknowledged) {
        if (response.status === 404)
          throw new Error(
            'The publish API is not deployed yet. Install and deploy the included Firestore backend update.',
          );
        if (response.status === 401 || response.status === 403)
          throw new Error('Your session could not be verified. Sign in again.');
        throw new Error(result.error || 'Could not publish your vehicle.');
      }
      toast.success('Your vehicle is now listed!');
      navigate(`/myitems/${encodeURIComponent(user.email)}`, { replace: true });
    } catch (error) {
      setGeneralError(error.message || 'Unable to publish. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  const validPhoto = Boolean(previewImage && !imageBroken);
  return (
    <div className="rs-sell-page">
      <div className="rs-sell-head">
        <div>
          <span className="rs-sell-eyebrow">SELL YOUR VEHICLE · NO LISTING FEE</span>
          <h1>
            Create your <em>listing.</em>
          </h1>
          <p>
            Tell buyers why your car is worth a closer look. A few details make a big difference.
          </p>
        </div>
        <Link to={`/myitems/${encodeURIComponent(user?.email || '')}`} className="rs-sell-back">
          ← My listings
        </Link>
      </div>
      <div className="rs-sell-layout">
        <section className="rs-sell-form-card" aria-labelledby="rs-sell-section-title">
          <div className="rs-sell-progress" aria-label={`Step ${step + 1} of 3`}>
            {sections.map((section, i) => (
              <div
                className={`rs-sell-step ${step === i ? 'is-current' : ''} ${step > i ? 'is-complete' : ''}`}
                key={section.title}
              >
                <span>{step > i ? '✓' : String(i + 1).padStart(2, '0')}</span>
                <strong>{section.title}</strong>
              </div>
            ))}
          </div>
          <div className="rs-sell-section-intro">
            <span>STEP {String(step + 1).padStart(2, '0')} / 03</span>
            <h2 id="rs-sell-section-title">{sections[step].title}</h2>
            <p>{sections[step].caption}</p>
          </div>
          <form onSubmit={handleSubmit(submitListing)} noValidate>
            {step === 0 && (
              <div className="rs-sell-fields">
                <div className="rs-sell-field">
                  <label htmlFor="rs-brand">
                    Vehicle brand <b>*</b>
                  </label>
                  <select
                    id="rs-brand"
                    disabled={brands.isLoading || brands.isError}
                    {...register('category', { required: 'Select your car brand.' })}
                  >
                    <option value="">Select a brand</option>
                    {names.map((name) => (
                      <option key={name} value={name}>
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </option>
                    ))}
                  </select>
                  {brands.isLoading && <small>Loading brands…</small>}
                  {brands.isError && (
                    <small className="rs-sell-error">
                      Could not load brands.{' '}
                      <button type="button" onClick={() => brands.refetch()}>
                        Retry
                      </button>
                    </small>
                  )}
                  {errors.category && (
                    <small className="rs-sell-error">{errors.category.message}</small>
                  )}
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-model">
                    Model & version <b>*</b>
                  </label>
                  <input
                    id="rs-model"
                    placeholder="e.g. BMW 320i Sport"
                    maxLength={120}
                    {...register('model', {
                      required: 'Enter the vehicle model.',
                      minLength: { value: 2, message: 'Enter at least 2 characters.' },
                    })}
                  />
                  {errors.model && <small className="rs-sell-error">{errors.model.message}</small>}
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-price">
                    Asking price ({currency}) <b>*</b>
                  </label>
                  <input
                    id="rs-price"
                    inputMode="decimal"
                    type="number"
                    min="1"
                    max="100000000"
                    placeholder="7500"
                    {...register('price', {
                      required: 'Enter an asking price.',
                      min: { value: 1, message: 'Price must be positive.' },
                      max: { value: 100000000, message: 'Price is too high.' },
                    })}
                  />
                  {errors.price && <small className="rs-sell-error">{errors.price.message}</small>}
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-condition">
                    Condition <b>*</b>
                  </label>
                  <select id="rs-condition" {...register('condition', { required: true })}>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-mileage">
                    Mileage (km) <b>*</b>
                  </label>
                  <input
                    id="rs-mileage"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="1500000"
                    placeholder="108000"
                    {...register('mileage', {
                      required: 'Enter mileage.',
                      min: { value: 0, message: 'Mileage cannot be negative.' },
                      max: { value: 1500000, message: 'Mileage is too high.' },
                    })}
                  />
                  {errors.mileage && (
                    <small className="rs-sell-error">{errors.mileage.message}</small>
                  )}
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-transmission">
                    Transmission <b>*</b>
                  </label>
                  <select id="rs-transmission" {...register('transmission', { required: true })}>
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </select>
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-year">
                    First registration (MM/YYYY) <b>*</b>
                  </label>
                  <input
                    id="rs-year"
                    type="text"
                    inputMode="numeric"
                    placeholder="04/2019"
                    maxLength={7}
                    {...register('year', {
                      required: 'Enter registration date.',
                      pattern: {
                        value: /^(0[1-9]|1[0-2])\/\d{4}$/,
                        message: 'Use MM/YYYY (e.g. 04/2019).',
                      },
                    })}
                  />
                  {errors.year && <small className="rs-sell-error">{errors.year.message}</small>}
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-fuel">
                    Fuel <b>*</b>
                  </label>
                  <select id="rs-fuel" {...register('fuel', { required: true })}>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                    <option value="LPG">LPG</option>
                  </select>
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-power-kw">
                    Power (kW) <b>*</b>
                  </label>
                  <input
                    id="rs-power-kw"
                    type="number"
                    min="1"
                    max="2000"
                    placeholder="85"
                    {...register('powerKw', { required: 'Enter power in kW.', min: 1, max: 2000 })}
                  />
                  {errors.powerKw && <small className="rs-sell-error">Enter valid kW.</small>}
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-power-hp">
                    Power (hp) <b>*</b>
                  </label>
                  <input
                    id="rs-power-hp"
                    type="number"
                    min="1"
                    max="2800"
                    placeholder="116"
                    {...register('powerHp', { required: 'Enter horsepower.', min: 1, max: 2800 })}
                  />
                  {errors.powerHp && (
                    <small className="rs-sell-error">Enter valid horsepower.</small>
                  )}
                </div>
                <div className="rs-sell-field rs-sell-wide">
                  <label htmlFor="rs-seller-type">
                    Seller type <b>*</b>
                  </label>
                  <select id="rs-seller-type" {...register('sellerType', { required: true })}>
                    <option value="Private">Private</option>
                    <option value="Professional">Professional</option>
                  </select>
                  <small>Choose accurately; this is not a verified dealer badge.</small>
                </div>
                <div className="rs-sell-field rs-sell-wide">
                  <label htmlFor="rs-purchase">
                    First purchased <b>*</b>
                  </label>
                  <input
                    id="rs-purchase"
                    type="date"
                    max={today}
                    {...register('boughtdate', {
                      required: 'Select the purchase date.',
                      validate: (v) => v <= today || 'The date cannot be in the future.',
                    })}
                  />
                  {errors.boughtdate && (
                    <small className="rs-sell-error">{errors.boughtdate.message}</small>
                  )}
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="rs-sell-fields">
                <div className="rs-sell-field">
                  <label htmlFor="rs-location">
                    City / location <b>*</b>
                  </label>
                  <input
                    id="rs-location"
                    placeholder="e.g. Mulhouse"
                    maxLength={100}
                    {...register('location', {
                      required: 'Enter a city.',
                      minLength: { value: 2, message: 'Enter at least 2 characters.' },
                    })}
                  />
                  {errors.location && (
                    <small className="rs-sell-error">{errors.location.message}</small>
                  )}
                </div>
                <div className="rs-sell-field">
                  <label htmlFor="rs-phone">
                    Contact number <b>*</b>
                  </label>
                  <input
                    id="rs-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+33 6 ..."
                    maxLength={32}
                    {...register('phone', {
                      required: 'Enter a contact number.',
                      pattern: {
                        value: /^[+0-9 ()-]{7,32}$/,
                        message: 'Enter a valid telephone number.',
                      },
                    })}
                  />
                  {errors.phone && <small className="rs-sell-error">{errors.phone.message}</small>}
                </div>
                <div className="rs-sell-field rs-sell-wide">
                  <label htmlFor="rs-description">
                    Vehicle description <b>*</b>
                  </label>
                  <textarea
                    id="rs-description"
                    rows="7"
                    placeholder="Tell buyers about the car's history, features, condition and maintenance…"
                    maxLength={1500}
                    {...register('description', {
                      required: 'Add a description.',
                      minLength: { value: 20, message: 'Write at least 20 characters.' },
                    })}
                  />
                  <div className="rs-sell-field-bottom">
                    {errors.description ? (
                      <small className="rs-sell-error">{errors.description.message}</small>
                    ) : (
                      <small>Be specific and accurate. Avoid sharing private information.</small>
                    )}
                    <small>{(values.description || '').length}/1500</small>
                  </div>
                </div>
                <div className="rs-sell-notice rs-sell-wide">
                  <FormIcon name="shield" />
                  <span>
                    Your account email ({user?.email || 'signed-in email'}) and contact phone will
                    be visible to buyers. Publishing does not charge a fee.
                  </span>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="rs-sell-fields">
                <div className="rs-sell-field rs-sell-wide">
                  <label htmlFor="rs-photo-url">Vehicle photo URL (HTTPS)</label>
                  <input
                    id="rs-photo-url"
                    type="url"
                    placeholder="https://example.com/your-car.jpg"
                    {...register('imageUrl')}
                  />
                  <small>Paste a public image link, or upload a photo below.</small>
                </div>
                <div className="rs-sell-field rs-sell-wide">
                  <label htmlFor="rs-photo-file">Upload a photo (optional)</label>
                  <div className="rs-sell-file">
                    <FormIcon name="photo" />
                    <div>
                      <strong>{uploadFile?.name || 'Select a picture from your device'}</strong>
                      <small>JPG, PNG or WebP · max 5 MB</small>
                    </div>
                    <input
                      id="rs-photo-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={chooseFile}
                    />
                  </div>
                  <small>
                    File upload requires an ImgBB API key configured in your frontend. A photo URL
                    works without ImgBB.
                  </small>
                </div>
                <div className="rs-sell-review rs-sell-wide">
                  <span>READY TO PUBLISH?</span>
                  <h3>
                    {values.model || 'Your vehicle'} · {prettyPrice(values.price)}
                  </h3>
                  <p>
                    {values.location || 'Location'} · {values.condition || 'Condition'} ·{' '}
                    {values.category || 'Brand'}
                  </p>
                  <p>You'll be able to see it under My listings immediately after publishing.</p>
                </div>
              </div>
            )}
            {generalError && (
              <div className="rs-sell-alert" role="alert">
                {generalError}
              </div>
            )}
            <div className="rs-sell-controls">
              {step > 0 ? (
                <button
                  type="button"
                  className="rs-sell-button rs-sell-secondary"
                  disabled={busy}
                  onClick={() => {
                    setGeneralError('');
                    setStep((v) => v - 1);
                  }}
                >
                  ← Previous
                </button>
              ) : (
                <span />
              )}
              {step < 2 ? (
                <button type="button" className="rs-sell-button rs-sell-primary" onClick={next}>
                  Continue <FormIcon name="arrow" />
                </button>
              ) : (
                <button type="submit" className="rs-sell-button rs-sell-primary" disabled={busy}>
                  {busy ? 'Publishing…' : 'Publish listing'} {!busy && <FormIcon name="arrow" />}
                </button>
              )}
            </div>
          </form>
        </section>
        <aside className="rs-sell-preview-panel" aria-label="Live vehicle listing preview">
          <span className="rs-sell-preview-label">LIVE PREVIEW</span>
          <div className="rs-sell-preview-card">
            <div className="rs-sell-preview-photo">
              {validPhoto ? (
                <img
                  src={previewImage}
                  alt="Your selected vehicle"
                  onError={() => setImageBroken(true)}
                />
              ) : (
                <>
                  <FormIcon name="car" />
                  <span>Your car photo appears here</span>
                </>
              )}
              <span className="rs-sell-live-tag">Preview only</span>
            </div>
            <div className="rs-sell-preview-text">
              <span className="rs-sell-preview-brand">{values.category || 'BRAND'} COLLECTION</span>
              <h3>{values.model || 'Your vehicle model'}</h3>
              <strong>{prettyPrice(values.price)}</strong>
              <div className="rs-sell-preview-meta">
                <span>⌖ {values.location || 'Location'}</span>
                <span>◉ {values.condition || 'Condition'}</span>
                <span>
                  ↗{' '}
                  {values.mileage
                    ? Number(values.mileage).toLocaleString('en-GB') + ' km'
                    : 'Mileage'}
                </span>
                <span>⚙ {values.transmission || 'Transmission'}</span>
              </div>
              <p>
                {values.description ||
                  'Your vehicle description will appear here for potential buyers.'}
              </p>
            </div>
          </div>
          <div className="rs-sell-tips">
            <FormIcon name="check" />
            <span>
              <strong>A better listing sells faster.</strong> Use a clear car photo and explain its
              condition honestly. This is a demo marketplace; publishing is not a payment.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
