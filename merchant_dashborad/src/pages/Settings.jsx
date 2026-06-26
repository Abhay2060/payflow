import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { merchantAPI } from "../api/client";
import { PageHeader, CopyButton } from "../components/ui";

const Settings = () => {
  const { merchant, updateMerchant } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name: merchant?.name || "",
    webhookUrl: merchant?.webhook_url || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [rotateLoading, setRotateLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState(null);
  const [rotateError, setRotateError] = useState("");

  // ── Update profile ─────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await merchantAPI.updateMe({
        name: profileForm.name,
        webhookUrl: profileForm.webhookUrl || null,
      });
      updateMerchant(res.data.merchant);
      setProfileMsg({ type: "success", text: "Profile updated successfully" });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.error || "Update failed" });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Rotate API key ─────────────────────────────────────────────────────────
  const handleRotate = async () => {
    if (!window.confirm("This will immediately invalidate your current API key. Continue?")) return;
    setRotateLoading(true);
    setRotateError("");
    setNewApiKey(null);
    try {
      const res = await merchantAPI.rotateKey();
      setNewApiKey(res.data.apiKey);
    } catch (err) {
      setRotateError(err.response?.data?.error || "Rotation failed");
    } finally {
      setRotateLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage your account and API credentials" />

      {/* Profile */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <h2 className="card-title text-base">Profile</h2>

          {profileMsg && (
            <div className={`alert ${profileMsg.type === "success" ? "alert-success" : "alert-error"} py-2`}>
              <span className="text-sm">{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-4 mt-2">
            <div className="form-control">
              <label className="label"><span className="label-text">Business Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Webhook URL</span>
                <span className="label-text-alt text-base-content/50">Optional</span>
              </label>
              <input
                type="url"
                className="input input-bordered"
                placeholder="https://yourserver.com/webhook"
                value={profileForm.webhookUrl}
                onChange={(e) => setProfileForm({ ...profileForm, webhookUrl: e.target.value })}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  We'll POST payment events here after each transaction
                </span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              {profileLoading ? <span className="loading loading-spinner loading-sm" /> : "Save Changes"}
            </button>
          </form>
        </div>
      </div>

      {/* Account info */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <h2 className="card-title text-base">Account Info</h2>
          <table className="table table-sm">
            <tbody>
              <tr>
                <td className="text-base-content/60 w-32">Merchant ID</td>
                <td className="flex gap-2 items-center font-mono text-xs">
                  {merchant?.id}
                  <CopyButton text={merchant?.id} />
                </td>
              </tr>
              <tr>
                <td className="text-base-content/60">Email</td>
                <td>{merchant?.email}</td>
              </tr>
              <tr>
                <td className="text-base-content/60">Status</td>
                <td>
                  <span className={`badge badge-sm ${merchant?.status === "active" ? "badge-success" : "badge-error"}`}>
                    {merchant?.status}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Rotate API Key */}
      <div className="card bg-base-100 shadow border border-error/30">
        <div className="card-body">
          <h2 className="card-title text-base text-error">Rotate API Key</h2>
          <p className="text-sm text-base-content/60">
            Generates a new API key and immediately invalidates the old one.
            All integrations using the old key will stop working instantly.
          </p>

          {rotateError && (
            <div className="alert alert-error py-2">
              <span className="text-sm">{rotateError}</span>
            </div>
          )}

          {newApiKey ? (
            <div className="mt-3 space-y-2">
              <div className="alert alert-warning py-2">
                <span className="text-sm font-medium">Save this key now — it will not be shown again.</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1 font-mono text-xs"
                  value={newApiKey}
                  readOnly
                />
                <CopyButton text={newApiKey} />
              </div>
            </div>
          ) : (
            <button
              className="btn btn-error btn-outline mt-2"
              onClick={handleRotate}
              disabled={rotateLoading}
            >
              {rotateLoading ? <span className="loading loading-spinner loading-sm" /> : "Rotate API Key"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
