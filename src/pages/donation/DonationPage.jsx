import { useEffect, useState } from "react";
import { FiHeart, FiHelpCircle, FiPieChart, FiShield, FiCheckCircle, FiCopy, FiSmartphone } from "react-icons/fi";
import { useApiResource } from "../../api/useApiResource";
import { resolveMediaUrl } from "../../utils/profile";

export default function DonationPage() {
  const { data: donationSettings, loading } = useApiResource("/api/donation-settings", { initialData: null });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = "ConnectNKT | सहयोग करें (Donation)";
  }, []);

  const handleCopyUpi = (upiId) => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEnabled = donationSettings?.donationEnabled ?? true;
  const showUpi = donationSettings?.showUpi ?? true;
  const qrImage = donationSettings?.qrImage;
  const upiId = donationSettings?.upiId;
  const accountHolderName = donationSettings?.accountHolderName;

  return (
    <div className="donation-page-container">
      <style>{`
        .donation-page-container {
          max-width: 840px;
          margin: 0 auto;
          padding: 15px 7px;
          color: var(--text);
        }

        .donation-header {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          border-radius: 16px;
          padding: 2.5rem 1.5rem;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.3);
          margin-bottom: 15px;
        }

        [data-theme="dark"] .donation-header {
          background: linear-gradient(135deg, #b91c1c 0%, #881337 100%);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }

        .donation-card {
          background: var(--bg-solid);
          border-radius: 12px;
          padding: 1.75rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.06));
          border: 1px solid var(--line);
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .donation-card-featured {
          background: var(--bg-solid);
          border-radius: 12px;
          padding: 1.75rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow, 0 4px 14px rgba(0,0,0,0.08));
          border: 2px solid rgba(239, 68, 68, 0.4);
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .donation-section-title {
          font-size: 1.4rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text);
          margin-bottom: 1.25rem;
          border-bottom: 2px solid var(--line);
          padding-bottom: 0.5rem;
        }

        .donation-text-primary {
          font-size: 1.05rem;
          line-height: 1.75;
          color: var(--text);
        }

        .donation-text-secondary {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .donation-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-left: 0;
          list-style: none;
          margin: 0;
        }

        .donation-list-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text);
        }

        .donation-grid-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 0.75rem;
          padding-left: 0;
          list-style: none;
          margin: 0;
        }

        .donation-grid-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.95rem;
          padding: 0.6rem 0.8rem;
          background: color-mix(in srgb, var(--bg-solid) 80%, transparent);
          border-radius: 8px;
          border: 1px solid var(--line);
          color: var(--text);
        }

        .donation-qr-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: color-mix(in srgb, var(--bg-solid) 70%, transparent);
          padding: 2rem 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--line);
        }

        .donation-qr-box {
          background: #ffffff !important;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          border: 1px solid #e2e8f0;
          margin-bottom: 1.25rem;
        }

        .donation-upi-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-solid);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 0.6rem 1rem;
          gap: 0.5rem;
        }

        .donation-copy-btn {
          background: #ef4444;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 0.4rem 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          transition: background 0.2s;
        }

        .donation-copy-btn.copied {
          background: #16a34a;
        }

        .donation-disabled-box {
          background: color-mix(in srgb, var(--danger, #dc2626) 12%, var(--bg-solid));
          border: 1px solid color-mix(in srgb, var(--danger, #dc2626) 30%, transparent);
          border-radius: 10px;
          padding: 1.5rem;
          text-align: center;
          color: var(--danger, #dc2626);
          font-weight: 600;
          font-size: 1.1rem;
        }

        [data-theme="dark"] .donation-disabled-box {
          color: #fca5a5;
        }

        .donation-footer-card {
          background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
          border-radius: 12px;
          padding: 2rem 1.5rem;
          text-align: center;
          border: 1px dashed #fca5a5;
        }

        [data-theme="dark"] .donation-footer-card {
          background: linear-gradient(135deg, rgba(153, 27, 27, 0.25) 0%, rgba(127, 29, 29, 0.15) 100%);
          border: 1px dashed rgba(239, 68, 68, 0.4);
        }

        .donation-footer-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #991b1b;
          margin: 0 0 0.75rem;
        }

        [data-theme="dark"] .donation-footer-title {
          color: #fca5a5;
        }

        .donation-footer-thanks {
          font-size: 1.05rem;
          font-weight: 600;
          color: #991b1b;
          margin: 0 0 1rem;
        }

        [data-theme="dark"] .donation-footer-thanks {
          color: #fca5a5;
        }
      `}</style>
      
      {/* Header Banner */}
      <div className="donation-header">
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem", display: "inline-block" }}>❤️</div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: "800", margin: "0 0 0.75rem", lineHeight: "1.2" }}>
          ConnectNKT को सहयोग करें
        </h1>
        <p style={{ fontSize: "1.15rem", opacity: 0.95, maxWidth: "600px", margin: "0 auto", fontWeight: "500" }}>
          मिलकर बनाएँ Neemkathana City का अपना डिजिटल प्लेटफ़ॉर्म
        </p>
      </div>

      {/* Main Intro Card */}
      <div className="donation-card">
        <p className="donation-text-primary" style={{ margin: 0 }}>
          ConnectNKT केवल एक सोशल मीडिया प्लेटफ़ॉर्म नहीं है, बल्कि Neemkathana City और आसपास के लोगों को एक-दूसरे से जोड़ने का एक सामुदायिक प्रयास है। हमारा उद्देश्य स्थानीय लोगों, व्यवसायों, सामाजिक कार्यों, शिक्षा, खेल, रोजगार और महत्वपूर्ण जानकारियों को एक ही स्थान पर उपलब्ध कराना है।
        </p>
        <p className="donation-text-primary" style={{ marginTop: "1rem", marginBottom: 0, fontWeight: "500" }}>
          इस प्लेटफ़ॉर्म को बेहतर बनाने, नई सुविधाएँ जोड़ने और लंबे समय तक सभी के लिए उपलब्ध रखने में आपका सहयोग महत्वपूर्ण भूमिका निभा सकता है।
        </p>
      </div>

      {/* Why Support */}
      <div className="donation-card">
        <h2 className="donation-section-title">
          <FiHelpCircle style={{ color: "#ef4444" }} /> आपका सहयोग क्यों महत्वपूर्ण है?
        </h2>
        <p className="donation-text-secondary" style={{ marginBottom: "1rem" }}>
          आपके सहयोग से हमें निम्न कार्यों में सहायता मिलेगी:
        </p>
        <ul className="donation-list">
          {[
            "प्लेटफ़ॉर्म में नई सुविधाएँ विकसित करना।",
            "सर्वर, होस्टिंग और डोमेन का खर्च वहन करना।",
            "सुरक्षा और डेटा संरक्षण को बेहतर बनाना।",
            "प्लेटफ़ॉर्म की गति और प्रदर्शन में सुधार करना।",
            "तकनीकी रखरखाव और नियमित अपडेट जारी रखना।",
            "Neemkathana City के लिए नए डिजिटल समाधान विकसित करना।",
            "लंबे समय तक इस प्लेटफ़ॉर्म को सभी के लिए निःशुल्क उपलब्ध रखना।"
          ].map((item, idx) => (
            <li key={idx} className="donation-list-item">
              <FiCheckCircle style={{ color: "#16a34a", marginTop: "0.25rem", flexShrink: 0 }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Where Support Will Be Used */}
      <div className="donation-card">
        <h2 className="donation-section-title">
          <FiPieChart style={{ color: "#ef4444" }} /> आपका सहयोग कहाँ उपयोग किया जाएगा?
        </h2>
        <p className="donation-text-secondary" style={{ marginBottom: "1rem" }}>
          प्राप्त सहयोग राशि का उपयोग निम्न कार्यों के लिए किया जा सकता है:
        </p>
        <ul className="donation-grid-list">
          {[
            "सर्वर एवं होस्टिंग",
            "डोमेन एवं इंफ्रास्ट्रक्चर",
            "सुरक्षा एवं तकनीकी सुधार",
            "नई सुविधाओं का विकास",
            "प्लेटफ़ॉर्म का रखरखाव",
            "प्रदर्शन एवं स्थिरता में सुधार",
            "भविष्य की सामुदायिक परियोजनाओं का विकास"
          ].map((item, idx) => (
            <li key={idx} className="donation-grid-item">
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }}></div>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Transparency */}
      <div className="donation-card">
        <h2 className="donation-section-title">
          <FiShield style={{ color: "#ef4444" }} /> पारदर्शिता
        </h2>
        <p className="donation-text-primary" style={{ fontWeight: "600", marginBottom: "0.75rem" }}>
          हम आपके सहयोग का सम्मान करते हैं।
        </p>
        <ul className="donation-list">
          {[
            "सहयोग करना पूरी तरह स्वैच्छिक है।",
            "सहयोग करने पर किसी प्रकार का स्वामित्व, विशेष अधिकार या निर्णय लेने का अधिकार प्राप्त नहीं होगा।",
            "प्राप्त सहयोग राशि का उपयोग केवल ConnectNKT के संचालन, रखरखाव, विकास एवं समुदाय के हित में किया जाएगा।",
            "आवश्यकता अनुसार राशि का उपयोग प्लेटफ़ॉर्म के संचालन, नई सुविधाओं के विकास, सुरक्षा, तकनीकी सुधार तथा भविष्य की सामुदायिक परियोजनाओं में किया जा सकता है।"
          ].map((item, idx) => (
            <li key={idx} className="donation-list-item" style={{ fontSize: "0.98rem" }}>
              <span style={{ color: "#ef4444", fontWeight: "bold" }}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* How to Donate / QR Code Section */}
      <div className="donation-card-featured">
        <h2 className="donation-section-title">
          <FiSmartphone style={{ color: "#ef4444" }} /> सहयोग कैसे करें?
        </h2>
        
        <p className="donation-text-primary" style={{ marginBottom: "1.5rem" }}>
          नीचे प्रदर्शित <strong>QR Code</strong> को किसी भी UPI समर्थित भुगतान ऐप (PhonePe, Google Pay, Paytm, BHIM आदि) से स्कैन करें और अपनी इच्छानुसार सहयोग राशि भेजें।
        </p>

        {/* QR Code & Dynamic Settings */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <p className="donation-text-secondary">लोड हो रहा है...</p>
          </div>
        ) : !isEnabled ? (
          <div className="donation-disabled-box">
            Donations are currently unavailable.
          </div>
        ) : (
          <div className="donation-qr-wrapper">
            {qrImage ? (
              <div className="donation-qr-box">
                <img 
                  src={resolveMediaUrl(qrImage)} 
                  alt="Donation QR Code" 
                  style={{ width: "260px", height: "285px", objectFit: "contain", display: "block" }} 
                />
              </div>
            ) : (
              <div className="donation-text-secondary" style={{ margin: "1rem 0", fontStyle: "italic" }}>
                (QR Code छवि उपलब्ध नहीं है)
              </div>
            )}

            {/* UPI ID & Account Details */}
            {showUpi && (upiId || accountHolderName) && (
              <div style={{ textAlign: "center", marginTop: "0.5rem", width: "100%", maxWidth: "360px" }}>
                {accountHolderName && (
                  <p className="donation-text-primary" style={{ fontWeight: "700", margin: "0 0 0.5rem" }}>
                    {accountHolderName}
                  </p>
                )}
                {upiId && (
                  <div className="donation-upi-box">
                    <span style={{ fontFamily: "monospace", fontSize: "1.05rem", fontWeight: "600", color: "var(--text)" }}>
                      {upiId}
                    </span>
                    <button 
                      onClick={() => handleCopyUpi(upiId)} 
                      className={`donation-copy-btn ${copied ? 'copied' : ''}`}
                    >
                      <FiCopy /> {copied ? "कॉपी हो गया!" : "कॉपी करें"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Final Note */}
      <div className="donation-footer-card">
        <h3 className="donation-footer-title">
          आपका हर सहयोग महत्वपूर्ण है
        </h3>
        <p className="donation-text-primary" style={{ margin: "0 0 1rem" }}>
          चाहे आपका सहयोग ₹10 हो या ₹10,000, प्रत्येक योगदान ConnectNKT को और बेहतर बनाने की दिशा में एक महत्वपूर्ण कदम है।
        </p>
        <p className="donation-footer-thanks">
          आपके विश्वास, सहयोग और समर्थन के लिए हृदय से धन्यवाद।
        </p>
        <p className="donation-text-primary" style={{ fontWeight: "700", margin: 0 }}>
          आइए, मिलकर Neemkathana City के लिए एक मजबूत, विश्वसनीय और उपयोगी डिजिटल समुदाय का निर्माण करें। ❤️
        </p>
      </div>

    </div>
  );
}
