import { Settings, Shield, User, Key, Sliders } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Configure profile details, defaults, and API keys.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Menu */}
        <div className="lg:col-span-3 bg-white border border-border p-4 rounded-card shadow-card space-y-1">
          {[
            { label: 'General Profile', icon: <User className="w-4 h-4" />, active: true },
            { label: 'API Keys', icon: <Key className="w-4 h-4" />, active: false },
            { label: 'Security & RLS', icon: <Shield className="w-4 h-4" />, active: false },
            { label: 'Generation Limits', icon: <Sliders className="w-4 h-4" />, active: false },
          ].map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-btn transition-colors ${
                item.active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-muted hover:text-text'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right Column: Details form */}
        <div className="lg:col-span-9 bg-white border border-border p-6 rounded-card shadow-card space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-base font-bold text-text">General Profile</h3>
            <p className="text-xs text-text-secondary mt-0.5">Update account name, notification emails, and default signatures.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">First Name</label>
              <input
                type="text"
                defaultValue="Tejas"
                className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-2 text-sm rounded-btn bg-white text-text outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Last Name</label>
              <input
                type="text"
                defaultValue="K.M."
                className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-2 text-sm rounded-btn bg-white text-text outline-none transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Reply-to Email Address</label>
              <input
                type="email"
                defaultValue="tejas@company.com"
                className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-2 text-sm rounded-btn bg-white text-text outline-none transition-all"
              />
            </div>
          </div>

          <div className="border-t border-border pt-6 flex justify-end">
            <button className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-btn transition-colors shadow-sm">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
