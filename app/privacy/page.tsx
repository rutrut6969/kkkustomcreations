export default function PrivacyPage() {
  return (
    <section className="container-page max-w-3xl py-10">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Privacy & Consent</p>
      <h1 className="mt-2 text-4xl font-black">Simple Phase 1 privacy notes</h1>
      <div className="mt-6 space-y-5 rounded-boutique border border-pink-100 bg-white p-6 leading-8 shadow-soft">
        <p>K&K Kustom Kreations collects the information needed to respond to messages, custom requests, order questions, pickup/dropoff coordination, and Square-hosted checkout.</p>
        <p>No customer accounts are required. Payment card details are handled by Square-hosted checkout and are not processed directly on this website.</p>
        <p>The required consent checkbox allows K&K Kustom Kreations to contact you about your order, custom request, pickup/dropoff, and related business updates. The optional marketing checkbox is only for updates about new products, events, and promotions.</p>
        <p>Social-proof popups in Phase 1 use sample purchase activity. Future real purchase activity should never expose private customer information.</p>
      </div>
    </section>
  );
}
