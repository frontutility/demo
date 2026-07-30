import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import UserAvatar from '../components/ui/UserAvatar';
import api from '../services/api';
import { resolveMediaUrl } from '../utils/profile';
import { formatCount } from '../utils/formatters';

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 w-full max-w-md mx-auto mb-8">
      <div className="flex items-center bg-[var(--bg-solid)] border border-[var(--line)] rounded-full p-1 w-full">
        <button
          onClick={() => setLanguage('hi')}
          className={`flex-1 py-2 px-4 rounded-full font-medium text-sm transition-all duration-300 ${
            language === 'hi'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          हिन्दी
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`flex-1 py-2 px-4 rounded-full font-medium text-sm transition-all duration-300 ${
            language === 'en'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          English
        </button>
      </div>
    </div>
  );
}

function ContentSection({ title, content }) {
  return (
    <SectionCard className="mb-6">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
        <FiHeart className="text-blue-500" />
        {title}
      </h3>
      <div className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </SectionCard>
  );
}

export default function DonatePage() {
  const { t, language } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [supporters, setSupporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    donor_name: '',
    upi_name: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    transaction_id: '',
    message: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState(null);
  const [showAllSupporters, setShowAllSupporters] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, supportersRes] = await Promise.all([
          api.get('/api/donation/settings'),
          api.get('/api/donation/supporters')
        ]);
        setSettings(settingsRes.data);
        setSupporters(supportersRes.data.supporters || []);
      } catch (err) {
        console.error('Failed to load donation data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMessage(null);
    try {
      const res = await api.post('/api/donation/submit', formData);
      setFormMessage({ type: 'success', text: res.data.message });
      setFormData({
        donor_name: '',
        upi_name: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        transaction_id: '',
        message: ''
      });
      setShowForm(false);
    } catch (err) {
      setFormMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit donation'
      });
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stack">
        <div className="skeleton h-16 w-3/4 mx-auto"></div>
        <div className="skeleton h-40"></div>
        <div className="skeleton h-40"></div>
      </div>
    );
  }

  if (!settings?.enabled) {
    return (
      <div className="stack">
        <PageHeader
          title={t({ hi: 'ConnectNKT को समर्थन दें', en: 'Support ConnectNKT' })}
        />
        <SectionCard>
          <div className="text-center py-12">
            <FiHeart className="text-6xl mx-auto mb-4 text-[var(--text-secondary)] opacity-50" />
            <p className="text-[var(--text-secondary)] text-lg">
              {t({ hi: 'दान सुविधा वर्तमान में उपलब्ध नहीं है।', en: 'Donations are currently unavailable.' })}
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeader
        title={language === 'hi' ? settings?.hero_title_hi : settings?.hero_title_en}
        subtitle={language === 'hi' ? settings?.hero_description_hi : settings?.hero_description_en}
      />

      <LanguageToggle />

      {/* Content Sections */}
      {settings?.why_support_hi && (
        <ContentSection
          title={language === 'hi' ? 'हमें क्यों समर्थन करें?' : 'Why Support Us?'}
          content={language === 'hi' ? settings?.why_support_hi : settings?.why_support_en}
        />
      )}

      {settings?.how_used_hi && (
        <ContentSection
          title={language === 'hi' ? 'दान का उपयोग कैसे होता है?' : 'How Are Donations Used?'}
          content={language === 'hi' ? settings?.how_used_hi : settings?.how_used_en}
        />
      )}

      {settings?.transparency_hi && (
        <ContentSection
          title={language === 'hi' ? 'पारदर्शिता' : 'Transparency'}
          content={language === 'hi' ? settings?.transparency_hi : settings?.transparency_en}
        />
      )}

      {/* QR & Payment Section */}
      <SectionCard className="mb-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <FiHeart className="text-blue-500" />
          {language === 'hi' ? 'दान करने के लिए QR कोड' : 'QR Code for Donation'}
        </h3>

        <div className="flex flex-col items-center gap-6">
          {/* QR Image */}
          {settings?.show_qr && settings?.qr_image_url && (
            <img
              src={resolveMediaUrl(settings.qr_image_url)}
              alt="QR Code"
              className="w-64 h-64 rounded-2xl shadow-xl border-4 border-[var(--line)]"
            />
          )}

          {/* Payment Details */}
          {settings?.show_upi && (
            <div className="w-full max-w-md space-y-3 text-center">
              {settings?.upi_id && (
                <div className="p-4 bg-[var(--bg-solid)] rounded-xl border border-[var(--line)]">
                  <div className="text-sm text-[var(--text-secondary)] mb-1">
                    {language === 'hi' ? 'UPI ID' : 'UPI ID'}
                  </div>
                  <div className="text-lg font-bold">{settings.upi_id}</div>
                </div>
              )}

              {settings?.account_holder_name && (
                <div className="p-4 bg-[var(--bg-solid)] rounded-xl border border-[var(--line)]">
                  <div className="text-sm text-[var(--text-secondary)] mb-1">
                    {language === 'hi' ? 'खाताधारक का नाम' : 'Account Holder Name'}
                  </div>
                  <div className="text-lg font-bold">{settings.account_holder_name}</div>
                </div>
              )}
            </div>
          )}

          {/* I've Completed Donation Button */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiCheckCircle />
            {language === 'hi' ? 'मैंने अपना दान पूरा कर लिया है' : "I've Completed My Donation"}
          </button>
        </div>
      </SectionCard>

      {/* Donation Form */}
      {showForm && (
        <SectionCard className="mb-6">
          <h3 className="text-xl font-bold mb-6">
            {language === 'hi' ? 'दान का विवरण दर्ज करें' : 'Enter Donation Details'}
          </h3>

          {formMessage && (
            <div
              className={`p-4 rounded-xl mb-6 text-center ${
                formMessage.type === 'success'
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {formMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label block mb-2">
                  {language === 'hi' ? 'आपका नाम' : 'Your Name'}
                </label>
                <input
                  className="field"
                  value={formData.donor_name}
                  onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label block mb-2">
                  {language === 'hi' ? 'UPI ऐप में दिखाया गया नाम' : 'Name in UPI App'}
                </label>
                <input
                  className="field"
                  value={formData.upi_name}
                  onChange={(e) => setFormData({ ...formData, upi_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label block mb-2">
                  {language === 'hi' ? 'दान राशि' : 'Donation Amount'}
                </label>
                <input
                  className="field"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label block mb-2">
                  {language === 'hi' ? 'UPI लेन-देन ID' : 'UPI Transaction ID'}
                </label>
                <input
                  className="field"
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label block mb-2">
                  {language === 'hi' ? 'भुगतान तिथि' : 'Payment Date'}
                </label>
                <input
                  className="field"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label block mb-2">
                  {language === 'hi' ? 'भुगतान समय' : 'Payment Time'}
                </label>
                <input
                  className="field"
                  type="time"
                  value={formData.payment_time}
                  onChange={(e) => setFormData({ ...formData, payment_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label block mb-2">
                {language === 'hi' ? 'ConnectNKT के लिए संदेश (वैकल्पिक)' : 'Message for ConnectNKT (Optional)'}
              </label>
              <textarea
                className="textarea"
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={formLoading}
            >
              {formLoading ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              ) : null}
              {language === 'hi' ? 'दान जमा करें' : 'Submit Donation'}
            </button>
          </form>
        </SectionCard>
      )}

      {/* Thank You Section */}
      {settings?.thank_you_hi && (
        <ContentSection
          title={language === 'hi' ? 'धन्यवाद!' : 'Thank You!'}
          content={language === 'hi' ? settings?.thank_you_hi : settings?.thank_you_en}
        />
      )}

      {/* Supporters Wall */}
      {supporters.length > 0 && (
        <SectionCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FiHeart className="text-blue-500" />
              {language === 'hi' ? 'सपोर्टर्स वॉल' : 'Supporters Wall'}
            </h3>
            {supporters.length > 5 && !showAllSupporters && (
              <button
                onClick={() => setShowAllSupporters(true)}
                className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1"
              >
                {language === 'hi' ? 'सभी सपोर्टर्स देखें' : 'View All Supporters'}
                <FiArrowRight />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(showAllSupporters ? supporters : supporters.slice(0, 5)).map((supporter, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-[var(--bg-solid)] rounded-xl border border-[var(--line)] hover:border-blue-200 transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {index + 1}
                </div>
                <UserAvatar name={supporter.donor_name} size={48} />
                <div className="flex-1">
                  <div className="font-semibold">{supporter.donor_name}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {language === 'hi' ? 'कुल दान' : 'Total Donation'}:{' '}
                    <span className="font-bold text-blue-500">
                      ₹{supporter.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
                {index === 0 && (
                  <div className="flex-shrink-0">
                    <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                      {language === 'hi' ? 'टॉप सपोर्टर' : 'Top Supporter'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAllSupporters && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllSupporters(false)}
                className="text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                {language === 'hi' ? 'कम दिखाएं' : 'Show Less'}
              </button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
