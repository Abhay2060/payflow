import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../api/client";
import { CopyButton } from "../components/ui";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyData, setApiKeyData] = useState(null); // shown once after register

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      setApiKeyData({
        apiKey: res.data.apiKey,
        merchantId: res.data.merchant.id,
      });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ── API key reveal screen ──────────────────────────────────────────────────
  if (apiKeyData) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card w-full max-w-lg bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔑</div>
              <h2 className="text-xl font-bold">Save your API Key</h2>
              <p className="text-error font-medium text-sm mt-1">
                This is the only time it will ever be shown. Copy it now.
              </p>
            </div>

            <div className="alert alert-warning mb-4">
              <span className="text-sm">We cannot show this again. If you lose it, you must rotate your key.</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label"><span className="label-text font-medium">API Key</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1 font-mono text-xs"
                    value={apiKeyData.apiKey}
                    readOnly
                  />
                  <CopyButton text={apiKeyData.apiKey} />
                </div>
              </div>

              <div>
                <label className="label"><span className="label-text font-medium">Merchant ID</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1 font-mono text-xs"
                    value={apiKeyData.merchantId}
                    readOnly
                  />
                  <CopyButton text={apiKeyData.merchantId} />
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary w-full mt-6"
              onClick={() => navigate("/login")}
            >
              I've saved my key — Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">💰</div>
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-base-content/60 text-sm">Start accepting payments</p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Business Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Acme Corp"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Email</span></label>
              <input
                type="email"
                className="input input-bordered"
                placeholder="dev@acme.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Password</span></label>
              <input
                type="password"
                className="input input-bordered"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm mt-4 text-base-content/60">
            Already have an account?{" "}
            <Link to="/login" className="link link-primary">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
